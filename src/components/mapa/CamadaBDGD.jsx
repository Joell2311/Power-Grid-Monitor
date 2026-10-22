import { useEffect, useMemo, useState } from "react";

import {
  GeoJSON,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  criarTopologiaBDGD,
  buscarPonto,
  buscarTrechoBDGD,
  buscarConexoes,
} from "../../core/modelo/topologiaBDGD";

import {
  registrarTopologiaBDGD,
  buscarMontante as buscarMontanteModelo,
  buscarJusante as buscarJusanteModelo,
  buscarCaminhoEletrico as buscarCaminhoModelo,
  buscarRedeConectada as buscarRedeConectadaModelo,
  obterFichaCompletaEquipamento,
  consultarEstadoEquipamento,
  executarManobraEquipamento,
} from "../../core/modelo/modeloRede";

// ==========================================================
// POWER GRID MONITOR
// CAMADA BDGD - CMG
//
// VISUALIZAÇÃO POR NÍVEL DE ZOOM
//
// < 13
//   -> somente mapa base
//
// 13 - 14
//   -> rede MT
//   -> religadores
//   -> chaves lâmina
//   -> chaves seccionadoras
//
// 15 - 16
//   -> tudo acima
//   -> chaves fusíveis
//
// >= 17
//   -> tudo acima
//   -> transformadores
//   -> reguladores
//   -> capacitores
// ==========================================================

// ==========================================================
// ARQUIVOS BDGD
// ==========================================================

const PASTA_BDGD_CMG =
  `${import.meta.env.BASE_URL}data/bdgd/CMG_COMPLETO`;

const ALIMENTADORES_CMG = [
  "CMG01C1",
  "CMG01C2",
  "CMG01C3",
  "CMG01C4",
  "CMG01C5",
  "CMG01C6",
];

function caminhosBDGDCMG(alimentador) {
  return {
    trechos:
      `${PASTA_BDGD_CMG}/${alimentador}/${alimentador}_trechos.geojson`,

    pontos:
      `${PASTA_BDGD_CMG}/${alimentador}/${alimentador}_pontos.geojson`,

    equipamentos:
      `${PASTA_BDGD_CMG}/${alimentador}/${alimentador}_equipamentos_completos.geojson`,

    diagnostico:
      `${PASTA_BDGD_CMG}/${alimentador}/${alimentador}_diagnostico.json`,
  };
}

// ==========================================================
// TESTES
// ==========================================================

const ID_TRECHO_TESTE = "941527";
const ID_ORIGEM_TESTE = "10060794";
const ID_DESTINO_TESTE = "1088716";

// ==========================================================
// ZOOM
// ==========================================================

const ZOOM_MINIMO_REDE = 13;
const ZOOM_CHAVES_FUSIVEIS = 15;
const ZOOM_DETALHADO = 17;

// ==========================================================
// NORMALIZAÇÃO
// ==========================================================

function normalizarId(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor).trim();

  return texto || null;
}

function normalizarTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase();
}

// ==========================================================
// FORMATAÇÃO
// ==========================================================

function formatarNumero(
  valor,
  casas = 2
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "-";
  }

  const numero =
    Number(valor);

  if (
    !Number.isFinite(numero)
  ) {
    return String(valor);
  }

  return numero.toFixed(casas);
}

// ==========================================================
// OBTÉM VALOR ROBUSTO
// ==========================================================

function obterValorEquipamento(
  equipamento,
  ...campos
) {
  if (!equipamento) {
    return null;
  }

  const fontes = [
    equipamento,
    equipamento.properties,
    equipamento.propriedades,
  ];

  for (
    const fonte of fontes
  ) {
    if (!fonte) {
      continue;
    }

    for (
      const campo of campos
    ) {
      const valor =
        fonte[campo];

      if (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
      ) {
        return valor;
      }
    }
  }

  return null;
}

// ==========================================================
// EQUIPAMENTOS ASSOCIADOS
// ==========================================================

function obterEquipamentosPQT(
  equipamento
) {
  if (!equipamento) {
    return [];
  }

  const propriedades =
    equipamento.properties ||
    equipamento.propriedades ||
    equipamento;

  if (
    Array.isArray(
      propriedades.eqse
    )
  ) {
    return propriedades.eqse;
  }

  if (
    Array.isArray(
      equipamento.eqse
    )
  ) {
    return equipamento.eqse;
  }

  if (
    Array.isArray(
      propriedades.equipamentos
    )
  ) {
    return propriedades.equipamentos;
  }

  if (
    Array.isArray(
      equipamento.equipamentos
    )
  ) {
    return equipamento.equipamentos;
  }

  return [];
}

// ==========================================================
// COLEÇÃO
// ==========================================================

function obterItensColecao(
  colecao
) {
  if (!colecao) {
    return [];
  }

  if (Array.isArray(colecao)) {
    return colecao;
  }

  if (
    typeof colecao ===
    "object"
  ) {
    return Object.values(
      colecao
    );
  }

  return [];
}

// ==========================================================
// CLASSIFICAÇÃO OFICIAL
// ==========================================================
//
// TIP_UNID é a autoridade.
//
// 19 -> CHAVE_LAMINA
// 22 -> CHAVE_FUSIVEL
// 32 -> RELIGADOR
// 34 -> CHAVE_SECCIONADORA
// 38 -> TRANSFORMADOR
//
// EQSE/texto não pode sobrescrever TIP_UNID.
// ==========================================================

function obterTipoEquipamento(
  equipamento
) {
  if (!equipamento) {
    return "OUTRO";
  }

  const propriedades =
    equipamento?.properties ||
    equipamento?.propriedades ||
    equipamento;

  const tipoUnidade =
    normalizarTexto(
      equipamento?.tipoUnidade ??
      propriedades?.tipoUnidade ??
      propriedades?.TIP_UNID
    );

  switch (
    tipoUnidade
  ) {
    case "19":
      return "CHAVE_LAMINA";

    case "22":
      return "CHAVE_FUSIVEL";

    case "32":
      return "RELIGADOR";

    case "34":
      return "CHAVE_SECCIONADORA";

    case "38":
      return "TRANSFORMADOR";

    default:
      break;
  }

  const tipoModelo =
    normalizarTexto(
      equipamento?.tipoEquipamento
    );

  const tiposConhecidos = [
    "RELIGADOR",
    "CHAVE_FUSIVEL",
    "CHAVE_LAMINA",
    "CHAVE_SECCIONADORA",
    "TRANSFORMADOR",
    "REGULADOR",
    "CAPACITOR",
  ];

  if (
    tiposConhecidos.includes(
      tipoModelo
    )
  ) {
    return tipoModelo;
  }

  const tipoPrincipal =
    normalizarTexto(
      equipamento?.equipamentoPrincipal ??
      propriedades?.equipamentoPrincipal
    );

  if (
    tiposConhecidos.includes(
      tipoPrincipal
    )
  ) {
    return tipoPrincipal;
  }

  const descricao =
    normalizarTexto(
      equipamento?.descricao ??
      propriedades?.DESCR ??
      propriedades?.DESCRICAO ??
      propriedades?.TIP_INST
    );

  if (
    descricao.includes(
      "RELIGADOR"
    ) ||
    descricao.includes(
      "RECLOSER"
    )
  ) {
    return "RELIGADOR";
  }

  if (
    descricao.includes(
      "FUSIVEL"
    ) ||
    descricao.includes(
      "FUSÍVEL"
    )
  ) {
    return "CHAVE_FUSIVEL";
  }

  if (
    descricao.includes(
      "CHAVE FACA"
    ) ||
    descricao.includes(
      "CHAVE LAMINA"
    ) ||
    descricao.includes(
      "CHAVE LÂMINA"
    )
  ) {
    return "CHAVE_LAMINA";
  }

  if (
    descricao.includes(
      "SECCIONADORA"
    )
  ) {
    return "CHAVE_SECCIONADORA";
  }

  if (
    descricao.includes(
      "TRANSFORMADOR"
    ) ||
    descricao.includes(
      "TRAFO"
    )
  ) {
    return "TRANSFORMADOR";
  }

  if (
    descricao.includes(
      "REGULADOR"
    )
  ) {
    return "REGULADOR";
  }

  if (
    descricao.includes(
      "CAPACITOR"
    )
  ) {
    return "CAPACITOR";
  }

  return "OUTRO";
}

// ==========================================================
// VISIBILIDADE
// ==========================================================

function obterNivelVisualPorZoom(
  zoom
) {
  const nivel =
    Number(zoom);

  if (
    !Number.isFinite(nivel)
  ) {
    return "NENHUM";
  }

  if (
    nivel <
    ZOOM_MINIMO_REDE
  ) {
    return "NENHUM";
  }

  if (
    nivel <
    ZOOM_CHAVES_FUSIVEIS
  ) {
    return "OPERACIONAL";
  }

  if (
    nivel <
    ZOOM_DETALHADO
  ) {
    return "INTERMEDIARIO";
  }

  return "DETALHADO";
}

function obterVisibilidadePorZoom(
  zoom
) {
  const nivel =
    Number(zoom);

  if (
    !Number.isFinite(nivel)
  ) {
    return {
      mostrarRede: false,
      mostrarReligadores: false,
      mostrarChaves: false,
      mostrarChavesFusiveis: false,
      mostrarDetalhamento: false,
    };
  }

  return {
    mostrarRede:
      nivel >=
      ZOOM_MINIMO_REDE,

    mostrarReligadores:
      nivel >=
      ZOOM_MINIMO_REDE,

    mostrarChaves:
      nivel >=
      ZOOM_MINIMO_REDE,

    mostrarChavesFusiveis:
      nivel >=
      ZOOM_CHAVES_FUSIVEIS,

    mostrarDetalhamento:
      nivel >=
      ZOOM_DETALHADO,
  };
}

function equipamentoPermitidoPorZoom(
  tipo,
  zoom
) {
  const tipoNormalizado =
    normalizarTexto(tipo);

  const visibilidade =
    obterVisibilidadePorZoom(
      zoom
    );

  if (
    !visibilidade.mostrarRede
  ) {
    return false;
  }

  switch (
    tipoNormalizado
  ) {
    case "RELIGADOR":
      return (
        visibilidade.mostrarReligadores
      );

    case "CHAVE_LAMINA":
    case "CHAVE_SECCIONADORA":
      return (
        visibilidade.mostrarChaves
      );

    case "CHAVE_FUSIVEL":
      return (
        visibilidade.mostrarChavesFusiveis
      );

    case "TRANSFORMADOR":
    case "REGULADOR":
    case "CAPACITOR":
      return (
        visibilidade.mostrarDetalhamento
      );

    default:
      return false;
  }
}

// ==========================================================
// ESTILOS
// ==========================================================

function obterEstiloEquipamento(
  tipo
) {
  switch (
    normalizarTexto(tipo)
  ) {
    case "RELIGADOR":
      return {
        cor: "#dc2626",
        fundo: "#fee2e2",
        titulo: "Religador",
      };

    case "CHAVE_SECCIONADORA":
      return {
        cor: "#f59e0b",
        fundo: "#fef3c7",
        titulo:
          "Chave seccionadora",
      };

    case "CHAVE_FUSIVEL":
      return {
        cor: "#eab308",
        fundo: "#fef9c3",
        titulo:
          "Chave fusível",
      };

    case "CHAVE_LAMINA":
      return {
        cor: "#f97316",
        fundo: "#ffedd5",
        titulo:
          "Chave lâmina",
      };

    case "REGULADOR":
      return {
        cor: "#2563eb",
        fundo: "#dbeafe",
        titulo:
          "Regulador de tensão",
      };

    case "CAPACITOR":
      return {
        cor: "#7c3aed",
        fundo: "#ede9fe",
        titulo:
          "Banco de capacitores",
      };

    case "TRANSFORMADOR":
      return {
        cor: "#16a34a",
        fundo: "#dcfce7",
        titulo:
          "Transformador",
      };

    case "SUBESTACAO":
      return {
        cor: "#0891b2",
        fundo: "#cffafe",
        titulo:
          "Subestação",
      };

    default:
      return {
        cor: "#64748b",
        fundo: "#e2e8f0",
        titulo:
          "Equipamento não classificado",
      };
  }
}

// ==========================================================
// ESTADO OPERACIONAL
// ==========================================================

const ESTADOS_OPERACIONAIS = [
  "FECHADO",
  "ABERTO",
  "INDISPONIVEL",
  "BYPASSADO",
];

function obterEstiloEstadoOperacional(
  estado
) {
  switch (
    normalizarTexto(estado)
  ) {
    case "FECHADO":
      return {
        cor: "#22c55e",
        fundo: "#052e16",
        rotulo: "FECHADO",
        simbolo: "●",
      };

    case "ABERTO":
      return {
        cor: "#ef4444",
        fundo: "#450a0a",
        rotulo: "ABERTO",
        simbolo: "○",
      };

    case "INDISPONIVEL":
      return {
        cor: "#f59e0b",
        fundo: "#451a03",
        rotulo:
          "INDISPONÍVEL",
        simbolo: "!",
      };

    case "BYPASSADO":
      return {
        cor: "#a78bfa",
        fundo: "#2e1065",
        rotulo: "BYPASSADO",
        simbolo: "↔",
      };

    default:
      return {
        cor: "#64748b",
        fundo: "#0f172a",
        rotulo:
          "NÃO INFORMADO",
        simbolo: "?",
      };
  }
}

// ==========================================================
// ÍCONE
// ==========================================================

function criarIconeEquipamento(
  equipamento,
  estadoOperacional = null
) {
  const tipo =
    obterTipoEquipamento(
      equipamento
    );

  const estilo =
    obterEstiloEquipamento(
      tipo
    );

  const equipamentos =
    obterEquipamentosPQT(
      equipamento
    );

  const quantidade =
    Math.max(
      equipamentos.length,
      1
    );

  const estado =
    obterEstiloEstadoOperacional(
      estadoOperacional
    );

  const html = `
    <div
      title="${estilo.titulo}"
      style="
        position:relative;
        width:42px;
        height:42px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
      "
    >
      <div
        style="
          width:31px;
          height:31px;
          border-radius:50%;
          background:${estilo.cor};
          border:3px solid white;
          box-shadow:0 2px 7px rgba(0,0,0,0.45);
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            width:9px;
            height:9px;
            border-radius:50%;
            background:white;
          "
        ></div>
      </div>

      <div
        title="Estado operacional: ${estado.rotulo}"
        style="
          position:absolute;
          left:0;
          bottom:-2px;
          min-width:18px;
          height:18px;
          padding:0 4px;
          border-radius:9px;
          background:${estado.cor};
          border:2px solid white;
          color:white;
          font-family:Arial,sans-serif;
          font-size:9px;
          font-weight:bold;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        ${estado.simbolo}
      </div>

      ${
        quantidade > 1
          ? `
            <div
              title="${quantidade} equipamentos associados"
              style="
                position:absolute;
                right:-3px;
                top:-2px;
                min-width:18px;
                height:18px;
                padding:0 4px;
                border-radius:10px;
                background:#111827;
                border:2px solid white;
                color:white;
                font-family:Arial,sans-serif;
                font-size:9px;
                font-weight:bold;
                display:flex;
                align-items:center;
                justify-content:center;
              "
            >
              ${quantidade}
            </div>
          `
          : ""
      }
    </div>
  `;

  return L.divIcon({
    className:
      "power-grid-equipment-icon",

    html,

    iconSize: [
      42,
      42,
    ],

    iconAnchor: [
      21,
      21,
    ],

    popupAnchor: [
      0,
      -21,
    ],
  });
}

// ==========================================================
// GEOJSON
// ==========================================================

async function carregarGeoJSON(
  caminho,
  nome
) {
  const response =
    await fetch(
      caminho,
      {
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `${nome}: HTTP ${response.status} - ${caminho}`
    );
  }

  const geojson =
    await response.json();

  if (
    !geojson ||
    geojson.type !==
      "FeatureCollection" ||
    !Array.isArray(
      geojson.features
    )
  ) {
    throw new Error(
      `${nome}: arquivo GeoJSON inválido - ${caminho}`
    );
  }

  return geojson;
}

// ==========================================================
// CARREGAR CMG
// ==========================================================

async function carregarColecaoCMG(
  tipoArquivo,
  nomeArquivo
) {
  const features = [];
  const carregados = [];
  const erros = [];

  for (
    const alimentador of
    ALIMENTADORES_CMG
  ) {
    const caminhos =
      caminhosBDGDCMG(
        alimentador
      );

    const caminho =
      caminhos[
        tipoArquivo
      ];

    try {
      const geojson =
        await carregarGeoJSON(
          caminho,
          `${alimentador} - ${nomeArquivo}`
        );

      geojson.features.forEach(
        (
          feature
        ) => {
          const propriedades =
            feature?.properties ||
            {};

          features.push({
            ...feature,

            properties: {
              ...propriedades,

              alimentador:
                propriedades.alimentador ||
                propriedades.CT_COD_OP ||
                propriedades.CT_COD_OPER ||
                alimentador,

              subestacao:
                propriedades.subestacao ||
                propriedades.SUB ||
                "CMG",
            },
          });
        }
      );

      carregados.push({
        alimentador,

        quantidade:
          geojson.features.length,
      });

      console.log(
        `✅ ${alimentador} ${nomeArquivo}:`,
        geojson.features.length,
        "features"
      );
    } catch (
      error
    ) {
      console.error(
        `❌ ${alimentador} ${nomeArquivo}:`,
        error
      );

      erros.push({
        alimentador,

        arquivo:
          nomeArquivo,

        caminho,

        mensagem:
          error?.message ||
          String(error),
      });
    }
  }

  return {
    type:
      "FeatureCollection",

    features,

    alimentadores:
      carregados,

    erros,
  };
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function CamadaBDGD({
  mostrarRedeMT = true,

  mostrarSubestacoes = true,

  mostrarEquipamentos = true,

  mostrarPontos = false,

  mostrarTerminais = false,

  mostrarDerivacoes = false,

  mostrarReligadores = true,

  mostrarChaves = true,

  mostrarReguladores = true,

  mostrarCapacitores = true,

  mostrarTransformadores = true,

  mostrarRedeMontante = false,

  mostrarRedeJusante = false,

  mostrarCaminhoEletrico = false,

  mostrarRedeConectada = false,

  alimentadoresSelecionados = [
    "CMG01C1",
    "CMG01C2",
    "CMG01C3",
    "CMG01C4",
    "CMG01C5",
    "CMG01C6",
  ],

  onEquipamentosDisponiveisChange,
}) {
  const map =
    useMap();

  // ========================================================
  // ZOOM
  // ========================================================

  const [
    zoomAtual,
    setZoomAtual,
  ] = useState(
    () =>
      map.getZoom()
  );

  useEffect(() => {
    if (!map) {
      return undefined;
    }

    const atualizarZoom =
      () => {
        setZoomAtual(
          map.getZoom()
        );
      };

    atualizarZoom();

    map.on(
      "zoomend",
      atualizarZoom
    );

    return () => {
      map.off(
        "zoomend",
        atualizarZoom
      );
    };
  }, [map]);

  const visibilidadeZoom =
    useMemo(
      () =>
        obterVisibilidadePorZoom(
          zoomAtual
        ),
      [zoomAtual]
    );

  const nivelZoom =
    useMemo(
      () =>
        obterNivelVisualPorZoom(
          zoomAtual
        ),
      [zoomAtual]
    );

  // ========================================================
  // DADOS
  // ========================================================

  const [
    ssdmt,
    setSsdmt,
  ] = useState(null);

  const [
    ponnot,
    setPonnot,
  ] = useState(null);

  const [
    equipamentosGeoJSON,
    setEquipamentosGeoJSON,
  ] = useState(null);

  // ========================================================
  // TOPOLOGIA
  // ========================================================

  const [
    topologia,
    setTopologia,
  ] = useState(null);

  // ========================================================
  // ELEMENTO
  // ========================================================

  const [
    elementoSelecionado,
    setElementoSelecionado,
  ] = useState(null);

  const [
    fichaOperacional,
    setFichaOperacional,
  ] = useState(null);

  // ========================================================
  // OPERAÇÃO
  // ========================================================

  const [
    estadoSelecionado,
    setEstadoSelecionado,
  ] = useState(null);

  const [
    observacaoOperacional,
    setObservacaoOperacional,
  ] = useState("");

  const [
    versaoEstadoOperacional,
    setVersaoEstadoOperacional,
  ] = useState(0);

  const [
    manobraPendente,
    setManobraPendente,
  ] = useState(null);

  // ========================================================
  // ANÁLISES
  // ========================================================

  const [
    redeJusante,
    setRedeJusante,
  ] = useState(null);

  const [
    redeMontante,
    setRedeMontante,
  ] = useState(null);

  const [
    redeConectada,
    setRedeConectada,
  ] = useState(null);

  const [
    caminhoEletrico,
    setCaminhoEletrico,
  ] = useState(null);

  // ========================================================
  // STATUS
  // ========================================================

  const [
    carregandoSsdmt,
    setCarregandoSsdmt,
  ] = useState(true);

  const [
    carregandoPonnot,
    setCarregandoPonnot,
  ] = useState(true);

  const [
    carregandoEquipamentos,
    setCarregandoEquipamentos,
  ] = useState(true);

  const [
    erroSsdmt,
    setErroSsdmt,
  ] = useState(null);

  const [
    erroPonnot,
    setErroPonnot,
  ] = useState(null);

  const [
    erroEquipamentos,
    setErroEquipamentos,
  ] = useState(null);

  // ========================================================
  // CARREGAR SSDMT
  // ========================================================

  useEffect(() => {
    let ativo = true;

    async function carregarSSDMT() {
      try {
        setCarregandoSsdmt(
          true
        );

        setErroSsdmt(
          null
        );

        const resultado =
          await carregarColecaoCMG(
            "trechos",
            "SSDMT"
          );

        if (ativo) {
          setSsdmt(
            resultado
          );

          if (
            resultado.erros.length >
            0
          ) {
            setErroSsdmt(
              resultado.erros
                .map(
                  (
                    item
                  ) =>
                    `${item.alimentador}: ${item.mensagem}`
                )
                .join("\n")
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "❌ Erro SSDMT CMG:",
          error
        );

        if (ativo) {
          setErroSsdmt(
            error?.message ||
              "Erro ao carregar SSDMT da CMG."
          );

          setSsdmt(
            null
          );
        }
      } finally {
        if (ativo) {
          setCarregandoSsdmt(
            false
          );
        }
      }
    }

    carregarSSDMT();

    return () => {
      ativo = false;
    };
  }, []);

  // ========================================================
  // CARREGAR PONNOT
  // ========================================================

  useEffect(() => {
    let ativo = true;

    async function carregarPONNOT() {
      try {
        setCarregandoPonnot(
          true
        );

        setErroPonnot(
          null
        );

        const resultado =
          await carregarColecaoCMG(
            "pontos",
            "PONNOT"
          );

        if (ativo) {
          setPonnot(
            resultado
          );

          if (
            resultado.erros.length >
            0
          ) {
            setErroPonnot(
              resultado.erros
                .map(
                  (
                    item
                  ) =>
                    `${item.alimentador}: ${item.mensagem}`
                )
                .join("\n")
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "❌ Erro PONNOT CMG:",
          error
        );

        if (ativo) {
          setErroPonnot(
            error?.message ||
              "Erro ao carregar PONNOT da CMG."
          );

          setPonnot(
            null
          );
        }
      } finally {
        if (ativo) {
          setCarregandoPonnot(
            false
          );
        }
      }
    }

    carregarPONNOT();

    return () => {
      ativo = false;
    };
  }, []);

  // ========================================================
  // CARREGAR EQUIPAMENTOS
  // ========================================================

  useEffect(() => {
    let ativo = true;

    async function carregarEquipamentos() {
      try {
        setCarregandoEquipamentos(
          true
        );

        setErroEquipamentos(
          null
        );

        const resultado =
          await carregarColecaoCMG(
            "equipamentos",
            "EQUIPAMENTOS"
          );

        if (ativo) {
          setEquipamentosGeoJSON(
            resultado
          );

          if (
            resultado.erros.length >
            0
          ) {
            setErroEquipamentos(
              resultado.erros
                .map(
                  (
                    item
                  ) =>
                    `${item.alimentador}: ${item.mensagem}`
                )
                .join("\n")
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "❌ Erro equipamentos CMG:",
          error
        );

        if (ativo) {
          setErroEquipamentos(
            error?.message ||
              "Erro ao carregar equipamentos da CMG."
          );

          setEquipamentosGeoJSON(
            null
          );
        }
      } finally {
        if (ativo) {
          setCarregandoEquipamentos(
            false
          );
        }
      }
    }

    carregarEquipamentos();

    return () => {
      ativo = false;
    };
  }, []);

  // ========================================================
  // EQSE DERIVADO
  // ========================================================

  const eqseDerivado =
    useMemo(() => {
      if (
        !equipamentosGeoJSON
      ) {
        return null;
      }

      const features =
        [];

      equipamentosGeoJSON.features.forEach(
        (
          feature
        ) => {
          const propriedades =
            feature?.properties ||
            {};

          const lista =
            Array.isArray(
              propriedades.eqse
            )
              ? propriedades.eqse
              : [];

          lista.forEach(
            (
              eqse
            ) => {
              if (!eqse) {
                return;
              }

              features.push({
                type:
                  "Feature",

                geometry:
                  null,

                properties:
                  eqse,
              });
            }
          );
        }
      );

      return {
        type:
          "FeatureCollection",

        features,
      };
    }, [
      equipamentosGeoJSON,
    ]);

  // ========================================================
  // CRIAR TOPOLOGIA
  // ========================================================

  useEffect(() => {
    if (
      !ssdmt ||
      !ponnot ||
      !equipamentosGeoJSON ||
      !eqseDerivado
    ) {
      return;
    }

    try {
      const novaTopologia =
        criarTopologiaBDGD(
          ssdmt,
          ponnot,
          equipamentosGeoJSON,
          eqseDerivado
        );

      if (!novaTopologia) {
        setTopologia(
          null
        );

        return;
      }

      setTopologia(
        novaTopologia
      );

      registrarTopologiaBDGD(
        novaTopologia
      );

      setRedeJusante(
        null
      );

      setRedeMontante(
        null
      );

      setRedeConectada(
        null
      );

      setCaminhoEletrico(
        null
      );

      console.log(
        "🧠 TOPOLOGIA DISPONÍVEL:",
        novaTopologia
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Erro ao criar topologia:",
        error
      );

      setTopologia(
        null
      );

      setRedeJusante(
        null
      );

      setRedeMontante(
        null
      );

      setRedeConectada(
        null
      );

      setCaminhoEletrico(
        null
      );
    }
  }, [
    ssdmt,
    ponnot,
    equipamentosGeoJSON,
    eqseDerivado,
  ]);

  // ========================================================
  // FILTRO ALIMENTADORES
  // ========================================================

  const alimentadoresFiltro =
    useMemo(() => {
      return new Set(
        (
          Array.isArray(
            alimentadoresSelecionados
          )
            ? alimentadoresSelecionados
            : []
        )
          .map(
            (
              item
            ) =>
              normalizarTexto(
                item
              )
          )
          .filter(
            Boolean
          )
      );
    }, [
      alimentadoresSelecionados,
    ]);

  const todosAlimentadoresSelecionados =
    alimentadoresFiltro.size ===
    ALIMENTADORES_CMG.length;

  function obterAlimentadorFeature(
    feature
  ) {
    const p =
      feature?.properties ||
      {};

    return normalizarTexto(
      p.alimentador ||
        p.CT_COD_OP ||
        p.CT_COD_OPER ||
        p.ALIMENTADOR ||
        p.ctmt
    );
  }

  function itemPertenceAoAlimentador(
    item
  ) {
    if (!item) {
      return false;
    }

    if (
      todosAlimentadoresSelecionados
    ) {
      return true;
    }

    if (
      alimentadoresFiltro.size ===
      0
    ) {
      return false;
    }

    const alimentador =
      obterAlimentadorFeature(
        item
      );

    if (
      alimentador &&
      alimentadoresFiltro.has(
        alimentador
      )
    ) {
      return true;
    }

    const p =
      item?.properties ||
      item?.propriedades ||
      item;

    const valorCircuito =
      normalizarTexto(
        p?.CTMT ??
          p?.ctmt ??
          p?.circuito ??
          p?.CIRCUITO
      );

    const circuitoParaAlimentador = {
      "151":
        "CMG01C1",

      "152":
        "CMG01C2",

      "153":
        "CMG01C3",

      "154":
        "CMG01C4",

      "155":
        "CMG01C5",

      "156":
        "CMG01C6",
    };

    return Boolean(
      valorCircuito &&
        circuitoParaAlimentador[
          valorCircuito
        ] &&
        alimentadoresFiltro.has(
          circuitoParaAlimentador[
            valorCircuito
          ]
        )
    );
  }

  const ssdmtFiltrado =
    useMemo(() => {
      if (!ssdmt) {
        return null;
      }

      return {
        ...ssdmt,

        features:
          (
            ssdmt.features ||
            []
          ).filter(
            itemPertenceAoAlimentador
          ),
      };
    }, [
      ssdmt,
      alimentadoresFiltro,
      todosAlimentadoresSelecionados,
    ]);

  const equipamentosGeoJSONFiltrados =
    useMemo(() => {
      if (
        !equipamentosGeoJSON
      ) {
        return null;
      }

      return {
        ...equipamentosGeoJSON,

        features:
          (
            equipamentosGeoJSON.features ||
            []
          ).filter(
            itemPertenceAoAlimentador
          ),
      };
    }, [
      equipamentosGeoJSON,
      alimentadoresFiltro,
      todosAlimentadoresSelecionados,
    ]);

  // ========================================================
  // SINCRONIZAÇÃO COM MAPVIEW
  // ========================================================

  useEffect(() => {
    if (
      typeof onEquipamentosDisponiveisChange !==
      "function"
    ) {
      return;
    }

    onEquipamentosDisponiveisChange(
      equipamentosGeoJSONFiltrados
        ?.features || []
    );
  }, [
    equipamentosGeoJSONFiltrados,
    onEquipamentosDisponiveisChange,
  ]);

  // ========================================================
  // PONTOS PERMITIDOS
  // ========================================================

  const idsPontosPermitidos =
    useMemo(() => {
      const ids =
        new Set();

      for (
        const feature of
          ssdmtFiltrado?.features ||
          []
      ) {
        const p =
          feature?.properties ||
          {};

        [
          p.PN_CON_1,
          p.PN_CON_2,
          p.PN_CON1,
          p.PN_CON2,
          p.PN_CON_1A,
          p.PN_CON_2A,
        ].forEach(
          (
            valor
          ) => {
            const id =
              normalizarId(
                valor
              );

            if (id) {
              ids.add(
                id
              );
            }
          }
        );
      }

      for (
        const feature of
          ponnot?.features ||
          []
      ) {
        if (
          !itemPertenceAoAlimentador(
            feature
          )
        ) {
          continue;
        }

        const id =
          normalizarId(
            feature
              ?.properties
              ?.COD_ID
          );

        if (id) {
          ids.add(
            id
          );
        }
      }

      return ids;
    }, [
      ssdmtFiltrado,
      ponnot,
      alimentadoresFiltro,
      todosAlimentadoresSelecionados,
    ]);

  const ponnotFiltrado =
    useMemo(() => {
      if (!ponnot) {
        return null;
      }

      return {
        ...ponnot,

        features:
          (
            ponnot.features ||
            []
          ).filter(
            (
              feature
            ) => {
              if (
                itemPertenceAoAlimentador(
                  feature
                )
              ) {
                return true;
              }

              const id =
                normalizarId(
                  feature
                    ?.properties
                    ?.COD_ID
                );

              return Boolean(
                id &&
                  idsPontosPermitidos.has(
                    id
                  )
              );
            }
          ),
      };
    }, [
      ponnot,
      alimentadoresFiltro,
      todosAlimentadoresSelecionados,
      idsPontosPermitidos,
    ]);

  // ========================================================
  // IDENTIFICAÇÃO DO EQUIPAMENTO NA CAMADA
  // ========================================================

  function obterIdEquipamentoFeature(
    feature
  ) {
    const p =
      feature?.properties ||
      {};

    return normalizarId(
      p.unsemtId ??
        p.unsemt_id ??
        p.COD_ID_UNSEMT ??
        p.codIdUNSEMT ??
        p.untrmtId ??
        p.untrmt_id ??
        p.COD_ID_UNTRMT ??
        p.codIdUNTRMT ??
        p.COD_ID ??
        p.codId ??
        p.ID
    );
  }

  // ========================================================
  // BUSCAR EQUIPAMENTO NA TOPOLOGIA
  // ========================================================

  function buscarEquipamentoTopologia(
    id
  ) {
    const idNormalizado =
      normalizarId(id);

    if (
      !idNormalizado ||
      !topologia
    ) {
      return null;
    }

    // ------------------------------------------------------
    // 1. EQUIPAMENTOS TOTAIS
    // ------------------------------------------------------

    const equipamento =
      topologia?.equipamentos?.[
        idNormalizado
      ];

    if (
      equipamento
    ) {
      return equipamento;
    }

    // ------------------------------------------------------
    // 2. UNSEMT
    // ------------------------------------------------------

    const unidade =
      topologia?.unidadesSeccionadoras?.[
        idNormalizado
      ];

    if (
      unidade
    ) {
      return unidade;
    }

    // ------------------------------------------------------
    // 3. TRANSFORMADOR
    // ------------------------------------------------------

    const transformador =
      topologia?.transformadores?.[
        idNormalizado
      ];

    if (
      transformador
    ) {
      return transformador;
    }

    // ------------------------------------------------------
    // 4. BUSCA POR ID INTERNO
    // ------------------------------------------------------

    const equipamentos =
      obterItensColecao(
        topologia?.equipamentos
      );

    const encontradoEquipamento =
      equipamentos.find(
        (item) =>
          normalizarId(
            item?.id
          ) === idNormalizado ||
          normalizarId(
            item?.COD_ID
          ) === idNormalizado ||
          normalizarId(
            item?.codId
          ) === idNormalizado ||
          normalizarId(
            item?.eqseId
          ) === idNormalizado ||
          normalizarId(
            item?.idEQSE
          ) === idNormalizado ||
          normalizarId(
            item?.unsemtId
          ) === idNormalizado ||
          normalizarId(
            item?.codIdUNSEMT
          ) === idNormalizado ||
          normalizarId(
            item?.plaqueta
          ) === idNormalizado
      );

    if (
      encontradoEquipamento
    ) {
      return encontradoEquipamento;
    }

    // ------------------------------------------------------
    // 5. BUSCA NAS UNIDADES
    // ------------------------------------------------------

    const unidades =
      obterItensColecao(
        topologia?.unidadesSeccionadoras
      );

    const unidadeEncontrada =
      unidades.find(
        (item) => {
          if (
            normalizarId(
              item?.id
            ) === idNormalizado
          ) {
            return true;
          }

          if (
            normalizarId(
              item?.plaqueta
            ) === idNormalizado
          ) {
            return true;
          }

          if (
            normalizarId(
              item?.unsemtId
            ) === idNormalizado
          ) {
            return true;
          }

          const filhos =
            Array.isArray(
              item?.equipamentos
            )
              ? item.equipamentos
              : [];

          return filhos.some(
            (filho) =>
              normalizarId(
                filho?.id
              ) === idNormalizado ||
              normalizarId(
                filho?.COD_ID
              ) === idNormalizado ||
              normalizarId(
                filho?.codId
              ) === idNormalizado ||
              normalizarId(
                filho?.eqseId
              ) === idNormalizado ||
              normalizarId(
                filho?.plaqueta
              ) === idNormalizado ||
              normalizarId(
                filho?.unsemtId
              ) === idNormalizado
          );
        }
      );

    if (
      unidadeEncontrada
    ) {
      return unidadeEncontrada;
    }

    // ------------------------------------------------------
    // 6. TRANSFORMADORES
    // ------------------------------------------------------

    const transformadores =
      obterItensColecao(
        topologia?.transformadores
      );

    const transformadorEncontrado =
      transformadores.find(
        (item) =>
          normalizarId(
            item?.id
          ) === idNormalizado ||
          normalizarId(
            item?.plaqueta
          ) === idNormalizado ||
          normalizarId(
            item?.COD_ID
          ) === idNormalizado ||
          normalizarId(
            item?.untrmtId
          ) === idNormalizado ||
          normalizarId(
            item?.codIdUNTRMT
          ) === idNormalizado
      );

    if (
      transformadorEncontrado
    ) {
      return transformadorEncontrado;
    }

    return null;
  }

  // ========================================================
  // IDENTIDADE OPERACIONAL
  // ========================================================
  //
  // CHAVES / RELIGADORES:
  //   plaqueta = UNSEMT.COD_ID
  //
  // TRANSFORMADOR:
  //   plaqueta = UNTRMT.COD_ID
  //
  // EQSE:
  //   referência patrimonial complementar
  // ========================================================

  function obterIdentidadeOperacional(
    equipamento,
    feature = null
  ) {
    const p =
      feature?.properties ||
      {};

    const modelo =
      equipamento ||
      {};

    const propriedades =
      modelo?.propriedades ||
      modelo?.properties ||
      {};

    const tipo =
      obterTipoEquipamento(
        modelo
      );

    const unidade =
      modelo?.unidadeSeccionadora ||
      modelo?.unidade ||
      null;

    const transformadorModelo =
      modelo?.transformador ||
      null;

    const unsemtId =
      normalizarId(
        modelo?.unsemtId ??
          modelo?.codIdUNSEMT ??
          modelo?.COD_ID_UNSEMT ??
          propriedades?.unsemtId ??
          propriedades?.codIdUNSEMT ??
          propriedades?.COD_ID_UNSEMT ??
          p?.unsemtId ??
          p?.codIdUNSEMT ??
          p?.COD_ID_UNSEMT ??
          unidade?.unsemtId ??
          unidade?.id ??
          modelo?.unidadeId ??
          modelo?.codIdUnidade
      );

    const untrmtId =
      normalizarId(
        modelo?.untrmtId ??
          modelo?.codIdUNTRMT ??
          modelo?.COD_ID_UNTRMT ??
          propriedades?.untrmtId ??
          propriedades?.codIdUNTRMT ??
          propriedades?.COD_ID_UNTRMT ??
          p?.untrmtId ??
          p?.codIdUNTRMT ??
          p?.COD_ID_UNTRMT ??
          transformadorModelo?.untrmtId ??
          transformadorModelo?.id
      );

    const idModelo =
      normalizarId(
        modelo?.id
      );

    const idFeature =
      normalizarId(
        p?.COD_ID ??
          p?.codId ??
          p?.ID
      );

    const idPatrimonial =
      normalizarId(
        modelo?.idPatrimonial ??
          modelo?.eqseId ??
          modelo?.idEQSE ??
          modelo?.codIdEQSE ??
          modelo?.COD_ID_EQSE ??
          propriedades?.eqseId ??
          propriedades?.idEQSE ??
          propriedades?.codIdEQSE ??
          p?.eqseId ??
          p?.idEQSE ??
          p?.COD_ID_EQSE
      );

    let plaqueta = null;

    if (
      tipo ===
      "TRANSFORMADOR"
    ) {
      plaqueta =
        untrmtId ||
        normalizarId(
          modelo?.plaqueta
        ) ||
        normalizarId(
          modelo?.idOperacional
        ) ||
        normalizarId(
          modelo?.codIdUNTRMT
        ) ||
        idModelo ||
        idFeature;
    } else {
      plaqueta =
        unsemtId ||
        normalizarId(
          modelo?.plaqueta
        ) ||
        normalizarId(
          modelo?.idOperacional
        ) ||
        normalizarId(
          modelo?.codIdUNSEMT
        ) ||
        idModelo ||
        idFeature;
    }

    return {
      plaqueta,
      idOperacional:
        plaqueta,

      unsemtId:
        unsemtId ||
        null,

      untrmtId:
        untrmtId ||
        null,

      idPatrimonial:
        idPatrimonial ||
        null,

      idModelo:
        idModelo ||
        null,

      idFeature:
        idFeature ||
        null,
    };
  }

  // ========================================================
  // NORMALIZAR EQUIPAMENTO DA CAMADA
  // ========================================================

  function obterEquipamentoCamada(
    feature
  ) {
    if (!feature) {
      return null;
    }

    const idFeature =
      obterIdEquipamentoFeature(
        feature
      );

    const equipamentoModelo =
      buscarEquipamentoTopologia(
        idFeature
      );

    const propriedadesFeature =
      feature?.properties ||
      {};

    if (
      !equipamentoModelo
    ) {
      const equipamentoFallback = {
        ...feature,

        id:
          idFeature,

        propriedades:
          propriedadesFeature,

        properties:
          propriedadesFeature,

        tipoEquipamento:
          obterTipoEquipamento(
            feature
          ),

        featureOriginal:
          feature,
      };

      const identidade =
        obterIdentidadeOperacional(
          equipamentoFallback,
          feature
        );

      return {
        ...equipamentoFallback,

        plaqueta:
          identidade.plaqueta,

        idOperacional:
          identidade.idOperacional,

        unsemtId:
          identidade.unsemtId,

        untrmtId:
          identidade.untrmtId,

        idPatrimonial:
          identidade.idPatrimonial,

        idFeature:
          identidade.idFeature,
      };
    }

    const equipamento = {
      ...equipamentoModelo,

      propriedades: {
        ...propriedadesFeature,

        ...(equipamentoModelo.propriedades ||
          {}),
      },

      properties: {
        ...propriedadesFeature,

        ...(equipamentoModelo.properties ||
          {}),

        ...(equipamentoModelo.propriedades ||
          {}),
      },

      featureOriginal:
        feature,

      // ----------------------------------------------------
      // PAC
      // ----------------------------------------------------

      pac1Original:
        equipamentoModelo.pac1Original ??
        equipamentoModelo.PAC_1 ??
        propriedadesFeature.PAC_1 ??
        null,

      pac2Original:
        equipamentoModelo.pac2Original ??
        equipamentoModelo.PAC_2 ??
        propriedadesFeature.PAC_2 ??
        null,

      pac1:
        equipamentoModelo.pac1 ??
        equipamentoModelo.PAC_1 ??
        null,

      pac2:
        equipamentoModelo.pac2 ??
        equipamentoModelo.PAC_2 ??
        null,

      // ----------------------------------------------------
      // PONNOT
      // ----------------------------------------------------

      ponto1:
        equipamentoModelo.ponto1 ??
        null,

      ponto2:
        equipamentoModelo.ponto2 ??
        null,

      pontoAssociado:
        equipamentoModelo.pontoAssociado ??
        null,

      // ----------------------------------------------------
      // COORDENADAS
      // ----------------------------------------------------

      latitude:
        equipamentoModelo.latitude ??
        null,

      longitude:
        equipamentoModelo.longitude ??
        null,

      coordenadas:
        equipamentoModelo.coordenadas ??
        null,

      // ----------------------------------------------------
      // REDE
      // ----------------------------------------------------

      alimentador:
        equipamentoModelo.alimentador ??
        propriedadesFeature.alimentador ??
        propriedadesFeature.CT_COD_OP ??
        propriedadesFeature.CT_COD_OPER ??
        null,

      circuito:
        equipamentoModelo.circuito ??
        propriedadesFeature.CTMT ??
        null,

      // ----------------------------------------------------
      // TIPO
      // ----------------------------------------------------

      tipoEquipamento:
        equipamentoModelo.tipoEquipamento ??
        equipamentoModelo.tipoVisual ??
        obterTipoEquipamento(
          equipamentoModelo
        ),
    };

    const identidade =
      obterIdentidadeOperacional(
        equipamento,
        feature
      );

    return {
      ...equipamento,

      // ----------------------------------------------------
      // IDENTIDADE OPERACIONAL
      // ----------------------------------------------------

      plaqueta:
        identidade.plaqueta,

      idOperacional:
        identidade.idOperacional,

      unsemtId:
        identidade.unsemtId,

      untrmtId:
        identidade.untrmtId,

      idPatrimonial:
        identidade.idPatrimonial,

      idFeature:
        identidade.idFeature,

      idModelo:
        identidade.idModelo,

      // ----------------------------------------------------
      // ID CENTRAL DO OBJETO
      // ----------------------------------------------------

      id:
        identidade.idOperacional ||
        identidade.idModelo ||
        identidade.idFeature ||
        idFeature,
    };
  }

  // ========================================================
  // COORDENADAS DO EQUIPAMENTO
  // ========================================================

  function obterCoordenadasEquipamentoCamada(
    equipamento,
    feature
  ) {
    if (
      !equipamento &&
      !feature
    ) {
      return null;
    }

    // ------------------------------------------------------
    // 1. COORDENADAS DA TOPOLOGIA
    // ------------------------------------------------------

    const latitudeModelo =
      Number(
        equipamento?.coordenadas
          ?.latitude ??
        equipamento?.latitude
      );

    const longitudeModelo =
      Number(
        equipamento?.coordenadas
          ?.longitude ??
        equipamento?.longitude
      );

    if (
      Number.isFinite(
        latitudeModelo
      ) &&
      Number.isFinite(
        longitudeModelo
      )
    ) {
      return [
        latitudeModelo,
        longitudeModelo,
      ];
    }

    // ------------------------------------------------------
    // 2. PONTO ASSOCIADO
    // ------------------------------------------------------

    const pontoAssociado =
      equipamento?.pontoAssociado;

    if (
      pontoAssociado &&
      topologia
    ) {
      const ponto =
        buscarPonto(
          topologia,
          pontoAssociado
        );

      if (
        ponto
      ) {
        const latitude =
          Number(
            ponto.latitude
          );

        const longitude =
          Number(
            ponto.longitude
          );

        if (
          Number.isFinite(
            latitude
          ) &&
          Number.isFinite(
            longitude
          )
        ) {
          return [
            latitude,
            longitude,
          ];
        }
      }
    }

    // ------------------------------------------------------
    // 3. PONTO 1
    // ------------------------------------------------------

    const latitudePonto1 =
      Number(
        equipamento?.ponto1
          ?.latitude
      );

    const longitudePonto1 =
      Number(
        equipamento?.ponto1
          ?.longitude
      );

    if (
      Number.isFinite(
        latitudePonto1
      ) &&
      Number.isFinite(
        longitudePonto1
      )
    ) {
      return [
        latitudePonto1,
        longitudePonto1,
      ];
    }

    // ------------------------------------------------------
    // 4. PONTO 2
    // ------------------------------------------------------

    const latitudePonto2 =
      Number(
        equipamento?.ponto2
          ?.latitude
      );

    const longitudePonto2 =
      Number(
        equipamento?.ponto2
          ?.longitude
      );

    if (
      Number.isFinite(
        latitudePonto2
      ) &&
      Number.isFinite(
        longitudePonto2
      )
    ) {
      return [
        latitudePonto2,
        longitudePonto2,
      ];
    }

    // ------------------------------------------------------
    // 5. GEOMETRIA ORIGINAL
    // ------------------------------------------------------

    const coordinates =
      feature
        ?.geometry
        ?.coordinates;

    if (
      Array.isArray(
        coordinates
      ) &&
      coordinates.length >= 2
    ) {
      const longitude =
        Number(
          coordinates[0]
        );

      const latitude =
        Number(
          coordinates[1]
        );

      if (
        Number.isFinite(
          latitude
        ) &&
        Number.isFinite(
          longitude
        )
      ) {
        return [
          latitude,
          longitude,
        ];
      }
    }

    return null;
  }

  // ========================================================
  // SELECIONAR EQUIPAMENTO
  // ========================================================

  function selecionarEquipamentoOperacional(
    feature
  ) {
    if (!feature) {
      return;
    }

    const equipamento =
      obterEquipamentoCamada(
        feature
      );

    if (!equipamento) {
      return;
    }

    const identidade =
      obterIdentidadeOperacional(
        equipamento,
        feature
      );

    const id =
      identidade.idOperacional;

    if (!id) {
      console.warn(
        "⚠️ Equipamento sem ID operacional:",
        {
          feature,
          equipamento,
          identidade,
        }
      );

      return;
    }

    const tipo =
      obterTipoEquipamento(
        equipamento
      );

    const estado =
      consultarEstadoEquipamento(
        id
      );

    const ficha =
      obterFichaCompletaEquipamento(
        id
      );

    setElementoSelecionado({
      tipo:
        tipo ===
        "TRANSFORMADOR"
          ? "TRANSFORMADOR"
          : "UNSEMT",

      id,

      plaqueta:
        identidade.plaqueta,

      idOperacional:
        identidade.idOperacional,

      idPatrimonial:
        identidade.idPatrimonial,

      unsemtId:
        identidade.unsemtId,

      untrmtId:
        identidade.untrmtId,

      propriedades:
        equipamento?.propriedades ||
        feature?.properties ||
        {},

      pqt:
        equipamento,

      transformador:
        tipo ===
        "TRANSFORMADOR"
          ? equipamento
          : undefined,

      equipamento,

      feature,

      featureOriginal:
        feature,

      pac1:
        equipamento?.pac1 ??
        equipamento?.pac1Original ??
        null,

      pac2:
        equipamento?.pac2 ??
        equipamento?.pac2Original ??
        null,

      pontoAssociado:
        equipamento?.pontoAssociado ??
        null,

      latitude:
        equipamento?.latitude ??
        null,

      longitude:
        equipamento?.longitude ??
        null,
    });

    setEstadoSelecionado(
      ESTADOS_OPERACIONAIS.includes(
        estado?.estado
      )
        ? estado.estado
        : null
    );

    setObservacaoOperacional(
      estado?.observacao ||
        ""
    );

    setFichaOperacional(
      ficha
    );

    setRedeJusante(
      null
    );

    setRedeMontante(
      null
    );

    setRedeConectada(
      null
    );

    setCaminhoEletrico(
      null
    );

    setManobraPendente(
      null
    );

    const coordenadas =
      obterCoordenadasEquipamentoCamada(
        equipamento,
        feature
      );

    if (
      coordenadas
    ) {
      map.flyTo(
        coordenadas,
        Math.max(
          map.getZoom(),
          17
        ),
        {
          animate:
            true,

          duration:
            0.7,
        }
      );
    }

    console.log(
      "=================================================="
    );

    console.log(
      "🔎 EQUIPAMENTO SELECIONADO"
    );

    console.log(
      "ID OPERACIONAL:",
      identidade.idOperacional
    );

    console.log(
      "PLAQUETA:",
      identidade.plaqueta
    );

    console.log(
      "ID PATRIMONIAL / EQSE:",
      identidade.idPatrimonial
    );

    console.log(
      "UNSEMT:",
      identidade.unsemtId
    );

    console.log(
      "UNTRMT:",
      identidade.untrmtId
    );

    console.log(
      "TIPO:",
      tipo
    );

    console.log(
      "TIP_UNID:",
      equipamento?.tipoUnidade ??
      equipamento?.propriedades
        ?.TIP_UNID ??
      null
    );

    console.log(
      "PAC_1:",
      equipamento?.pac1 ??
      equipamento?.pac1Original ??
      null
    );

    console.log(
      "PAC_2:",
      equipamento?.pac2 ??
      equipamento?.pac2Original ??
      null
    );

    console.log(
      "Ponto 1:",
      equipamento?.ponto1 ??
      null
    );

    console.log(
      "Ponto 2:",
      equipamento?.ponto2 ??
      null
    );

    console.log(
      "Ponto associado:",
      equipamento?.pontoAssociado ??
      null
    );

    console.log(
      "Latitude:",
      equipamento?.latitude ??
      null
    );

    console.log(
      "Longitude:",
      equipamento?.longitude ??
      null
    );

    console.log(
      "Origem coordenada:",
      equipamento?.coordenadas
        ?.origem ??
      null
    );

    console.log(
      "Alimentador:",
      equipamento?.alimentador ??
      null
    );

    console.log(
      "Circuito:",
      equipamento?.circuito ??
      null
    );

    console.log(
      "Equipamento enriquecido:",
      equipamento
    );

    console.log(
      "=================================================="
    );
  }

  // ========================================================
  // MANOBRA
  // ========================================================

  function solicitarManobra(
    acao
  ) {
    const id =
      elementoSelecionado?.id;

    if (!id) {
      return;
    }

    const acaoNormalizada =
      normalizarTexto(
        acao
      );

    if (
      acaoNormalizada !==
        "ABRIR" &&
      acaoNormalizada !==
        "FECHAR"
    ) {
      return;
    }

    setManobraPendente({
      acao:
        acaoNormalizada,

      id,

      estadoAtual:
        estadoSelecionado ||
        consultarEstadoEquipamento(
          id
        )?.estado ||
        "NAO_INFORMADO",
    });
  }

  function cancelarManobra() {
    setManobraPendente(
      null
    );
  }

  function executarManobra(
    acao
  ) {
    const id =
      elementoSelecionado?.id;

    if (!id) {
      return;
    }

    const acaoNormalizada =
      normalizarTexto(
        acao
      );

    if (
      acaoNormalizada !==
        "ABRIR" &&
      acaoNormalizada !==
        "FECHAR"
    ) {
      return;
    }

    const resultado =
      executarManobraEquipamento(
        id,
        acaoNormalizada,
        {
          origem:
            "MANOBRA_OPERADOR",

          observacao:
            observacaoOperacional.trim() ||
            `Manobra ${acaoNormalizada.toLowerCase()} executada pelo operador.`,
        }
      );

    if (!resultado?.sucesso) {
      console.error(
        "Falha na manobra do equipamento:",
        resultado?.mensagem
      );

      return;
    }

    const novoEstado =
      resultado.estadoNovo ||
      (
        acaoNormalizada ===
        "ABRIR"
          ? "ABERTO"
          : "FECHADO"
      );

    setEstadoSelecionado(
      novoEstado
    );

    setVersaoEstadoOperacional(
      (
        valor
      ) =>
        valor + 1
    );

    setManobraPendente(
      null
    );

    setFichaOperacional(
      obterFichaCompletaEquipamento(
        id
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "power-grid-estado-equipamento-alterado",
        {
          detail: {
            id,

            estado:
              novoEstado,

            equipamento:
              elementoSelecionado,

            resultado,
          },
        }
      )
    );
  }

  function estadoDoEquipamento(
    id
  ) {
    return consultarEstadoEquipamento(
      id
    );
  }

  // ========================================================
  // BUSCAR UNIDADE DA TOPOLOGIA
  // ========================================================

  function buscarUnidadeTopologia(
    id
  ) {
    if (
      !topologia ||
      !id
    ) {
      return null;
    }

    const unidades =
      topologia
        .unidadesSeccionadoras ||
      {};

    const idNormalizado =
      normalizarId(id);

    if (
      idNormalizado &&
      unidades[
        idNormalizado
      ]
    ) {
      return unidades[
        idNormalizado
      ];
    }

    const encontrada =
      Object.values(
        unidades
      ).find(
        (
          unidade
        ) =>
          normalizarId(
            unidade?.id ??
              unidade?.codId ??
              unidade?.COD_ID ??
              unidade?.plaqueta
          ) ===
          idNormalizado
      );

    return encontrada ||
      null;
  }

  // ========================================================
  // ITEM TOPOLOGIA PERMITIDO
  // ========================================================

  function itemTopologiaPermitido(
    item
  ) {
    if (
      todosAlimentadoresSelecionados
    ) {
      return true;
    }

    if (
      alimentadoresFiltro.size ===
      0
    ) {
      return false;
    }

    if (
      itemPertenceAoAlimentador(
        item
      )
    ) {
      return true;
    }

    const id =
      normalizarId(
        typeof item ===
          "object"
          ? item?.pontoId ??
              item?.id ??
              item?.COD_ID
          : item
      );

    return Boolean(
      id &&
        idsPontosPermitidos.has(
          id
        )
    );
  }

  // ========================================================
  // NAVEGAÇÃO TESTE
  // ========================================================

  useEffect(() => {
    if (!topologia) {
      return;
    }

    let origem =
      normalizarId(
        ID_ORIGEM_TESTE
      );

    if (
      !topologia.pontos?.[
        origem
      ]
    ) {
      origem =
        Object.keys(
          topologia.pontos ||
            {}
        )[0];
    }

    if (!origem) {
      return;
    }

    const rede =
      buscarJusanteModelo(
        origem,
        {
          respeitarOrientacao:
            true,
        }
      );

    if (rede) {
      setRedeJusante(
        rede
      );
    }

    let destino =
      normalizarId(
        ID_DESTINO_TESTE
      );

    if (
      !topologia.pontos?.[
        destino
      ]
    ) {
      const ids =
        Object.keys(
          topologia.pontos ||
            {}
        );

      destino =
        ids.find(
          (
            id
          ) =>
            id !==
            origem
        );
    }

    if (
      destino &&
      destino !== origem
    ) {
      const caminho =
        buscarCaminhoModelo(
          origem,
          destino
        );

      if (caminho) {
        setCaminhoEletrico(
          caminho
        );
      }
    }
  }, [
    topologia,
  ]);

  // ========================================================
  // PONTO DE ANÁLISE
  // ========================================================

  function obterPontoAnaliseElemento() {
    if (
      !topologia ||
      !elementoSelecionado
    ) {
      return null;
    }

    if (
      elementoSelecionado.tipo ===
      "TRECHO"
    ) {
      const trecho =
        buscarTrechoBDGD(
          topologia,
          elementoSelecionado.id
        );

      return (
        normalizarId(
          trecho?.pontoFinal
        ) ||
        normalizarId(
          trecho?.pontoInicial
        )
      );
    }

    if (
      elementoSelecionado.tipo ===
      "UNSEMT"
    ) {
      const unidade =
        buscarUnidadeTopologia(
          elementoSelecionado.id
        );

      return (
        normalizarId(
          unidade?.pontoAssociado
        ) ||
        normalizarId(
          unidade?.ponto1
        ) ||
        normalizarId(
          unidade?.pac1
        ) ||
        normalizarId(
          unidade?.pontoId
        )
      );
    }

    if (
      elementoSelecionado.tipo ===
      "TRANSFORMADOR"
    ) {
      return (
        normalizarId(
          elementoSelecionado
            ?.equipamento
            ?.pontoAssociado
        ) ||
        normalizarId(
          elementoSelecionado
            ?.transformador
            ?.pontoAssociado
        ) ||
        normalizarId(
          elementoSelecionado
            ?.equipamento
            ?.pac1
        ) ||
        normalizarId(
          elementoSelecionado
            ?.transformador
            ?.pac1
        ) ||
        normalizarId(
          elementoSelecionado
            ?.transformador
            ?.pontoId
        )
      );
    }

    if (
      elementoSelecionado.tipo ===
      "PONTO"
    ) {
      return normalizarId(
        elementoSelecionado.id
      );
    }

    return null;
  }

  // ========================================================
  // ANÁLISE
  // ========================================================

  function analisarElementoSelecionado(
    modo = "JUSANTE"
  ) {
    if (
      !topologia ||
      !elementoSelecionado
    ) {
      return;
    }

    const pontoOrigem =
      obterPontoAnaliseElemento();

    if (
      !pontoOrigem ||
      !buscarPonto(
        topologia,
        pontoOrigem
      )
    ) {
      return;
    }

    if (
      modo ===
      "MONTANTE"
    ) {
      setRedeMontante(
        buscarMontanteModelo(
          pontoOrigem
        )
      );

      setRedeJusante(
        null
      );

      setRedeConectada(
        null
      );

      return;
    }

    if (
      modo ===
      "CONECTADA"
    ) {
      setRedeConectada(
        buscarRedeConectadaModelo(
          pontoOrigem
        )
      );

      setRedeJusante(
        null
      );

      setRedeMontante(
        null
      );

      return;
    }

    setRedeJusante(
      buscarJusanteModelo(
        pontoOrigem,
        {
          respeitarOrientacao:
            true,
        }
      )
    );

    setRedeMontante(
      null
    );

    setRedeConectada(
      null
    );
  }

  // ========================================================
  // LIMPAR
  // ========================================================

  function limparAnalise() {
    setElementoSelecionado(
      null
    );

    setFichaOperacional(
      null
    );

    setRedeJusante(
      null
    );

    setRedeMontante(
      null
    );

    setRedeConectada(
      null
    );

    setCaminhoEletrico(
      null
    );

    setManobraPendente(
      null
    );

    setEstadoSelecionado(
      null
    );

    setObservacaoOperacional(
      ""
    );
  }

  // ========================================================
  // POPUP SSDMT
  // ========================================================

  function criarPopupSSDMT(
    feature
  ) {
    const p =
      feature?.properties ||
      {};

    const comprimento =
      p.COMP !== null &&
      p.COMP !== undefined &&
      p.COMP !== ""
        ? `${formatarNumero(
            p.COMP,
            2
          )} m`
        : "-";

    return `
      <div
        style="
          min-width:240px;
          font-family:Arial,sans-serif;
          font-size:13px;
          line-height:1.5;
        "
      >
        <div
          style="
            font-size:16px;
            font-weight:bold;
            margin-bottom:8px;
            color:#1565c0;
          "
        >
          ⚡ Trecho SSDMT
        </div>

        <div>
          <strong>Alimentador:</strong>
          ${p.CT_COD_OP ??
          p.alimentador ??
          "-"}
        </div>

        <div>
          <strong>COD_ID:</strong>
          ${p.COD_ID ?? "-"}
        </div>

        <hr />

        <div>
          <strong>PN inicial:</strong>
          ${p.PN_CON_1 ?? "-"}
        </div>

        <div>
          <strong>PN final:</strong>
          ${p.PN_CON_2 ?? "-"}
        </div>

        <hr />

        <div>
          <strong>Condutor:</strong>
          ${p.TIP_CND ?? "-"}
        </div>

        <div>
          <strong>Fases:</strong>
          ${p.FAS_CON ?? "-"}
        </div>

        <div>
          <strong>Comprimento:</strong>
          ${comprimento}
        </div>

        <div>
          <strong>Situação:</strong>
          ${p.SITCONT ?? "-"}
        </div>
      </div>
    `;
  }

  // ========================================================
  // CORES DOS ALIMENTADORES
  // ========================================================

  const CORES_ALIMENTADORES_CMG = {
    CMG01C1:
      "#2563eb",

    CMG01C2:
      "#dc2626",

    CMG01C3:
      "#16a34a",

    CMG01C4:
      "#9333ea",

    CMG01C5:
      "#ea580c",

    CMG01C6:
      "#0891b2",
  };

  function obterCorAlimentador(
    alimentador
  ) {
    return (
      CORES_ALIMENTADORES_CMG[
        normalizarTexto(
          alimentador
        )
      ] ||
      "#64748b"
    );
  }

  function estiloSSDMT(
    feature,
    destacado = false
  ) {
    const cor =
      obterCorAlimentador(
        obterAlimentadorFeature(
          feature
        )
      );

    return {
      color:
        cor,

      weight:
        destacado
          ? 6
          : 3,

      opacity:
        destacado
          ? 1
          : 0.88,

      lineCap:
        "round",

      lineJoin:
        "round",
    };
  }

  // ========================================================
  // EVENTO SSDMT
  // ========================================================

  function aoCriarTrecho(
    feature,
    layer
  ) {
    layer.bindPopup(
      criarPopupSSDMT(
        feature
      )
    );

    layer.on({
      mouseover:
        (
          evento
        ) => {
          evento.target.setStyle(
            estiloSSDMT(
              feature,
              true
            )
          );

          evento.target.bringToFront();
        },

      mouseout:
        (
          evento
        ) => {
          evento.target.setStyle(
            estiloSSDMT(
              feature,
              false
            )
          );
        },

      click:
        () => {
          const propriedades =
            feature?.properties ||
            {};

          const trechoId =
            normalizarId(
              propriedades.COD_ID
            );

          if (!trechoId) {
            return;
          }

          setElementoSelecionado({
            tipo:
              "TRECHO",

            id:
              trechoId,

            propriedades,
          });

          setFichaOperacional(
            null
          );

          setRedeJusante(
            null
          );

          setRedeMontante(
            null
          );

          setRedeConectada(
            null
          );

          setCaminhoEletrico(
            null
          );
        },
    });
  }

  // ========================================================
  // COORDENADAS PONTO
  // ========================================================

  function obterCoordenadasPonto(
    id
  ) {
    const pontoId =
      normalizarId(id);

    if (
      !topologia ||
      !pontoId
    ) {
      return null;
    }

    const ponto =
      buscarPonto(
        topologia,
        pontoId
      );

    if (!ponto) {
      return null;
    }

    const latitude =
      Number(
        ponto.latitude
      );

    const longitude =
      Number(
        ponto.longitude
      );

    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {
      return null;
    }

    return [
      latitude,
      longitude,
    ];
  }

  function obterCoordenadasItem(
    item
  ) {
    if (
      item === null ||
      item === undefined
    ) {
      return null;
    }

    if (
      typeof item ===
        "string" ||
      typeof item ===
        "number"
    ) {
      return obterCoordenadasPonto(
        item
      );
    }

    const latitude =
      Number(
        item.latitude ??
          item.lat ??
          item.y ??
          item.properties
            ?.latitude ??
          item.properties
            ?.lat
      );

    const longitude =
      Number(
        item.longitude ??
          item.lng ??
          item.lon ??
          item.x ??
          item.properties
            ?.longitude ??
          item.properties
            ?.lng
      );

    if (
      Number.isFinite(
        latitude
      ) &&
      Number.isFinite(
        longitude
      )
    ) {
      return [
        latitude,
        longitude,
      ];
    }

    const pontoId =
      normalizarId(
        item.pontoId ??
          item.pontoAssociado ??
          item.PN_CON_1 ??
          item.PN_CON_2 ??
          item.properties
            ?.pontoId ??
          item.properties
            ?.pontoAssociado
      );

    if (pontoId) {
      return obterCoordenadasPonto(
        pontoId
      );
    }

    return null;
  }

  function obterTrechoDoResultado(
    item
  ) {
    if (!item) {
      return null;
    }

    if (
      typeof item ===
      "object"
    ) {
      if (
        item.trechoId
      ) {
        return {
          ...item,

          id:
            item.trechoId,
        };
      }

      return item;
    }

    return buscarTrechoBDGD(
      topologia,
      item
    );
  }

  // ========================================================
  // RENDER JUSANTE
  // ========================================================

  function renderizarRedeJusante() {
    if (
      zoomAtual <
      ZOOM_MINIMO_REDE
    ) {
      return null;
    }

    if (
      !mostrarRedeJusante ||
      !redeJusante
    ) {
      return null;
    }

    const ids =
      Array.isArray(
        redeJusante.ordemTrechos
      )
        ? redeJusante.ordemTrechos
        : Object.keys(
            redeJusante.trechos ||
              {}
          );

    return ids.map(
      (
        item,
        indice
      ) => {
        const trecho =
          obterTrechoDoResultado(
            item
          );

        if (!trecho) {
          return null;
        }

        const inicio =
          obterCoordenadasPonto(
            trecho.pontoInicial
          );

        const fim =
          obterCoordenadasPonto(
            trecho.pontoFinal
          );

        if (
          !inicio ||
          !fim
        ) {
          return null;
        }

        const id =
          trecho.id ||
          trecho.trechoId ||
          `jusante-${indice}`;

        return (
          <Polyline
            key={
              `jusante-${id}`
            }
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color:
                "#00e676",

              weight:
                5,

              opacity:
                0.9,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // RENDER CAMINHO
  // ========================================================

  function renderizarCaminho() {
    if (
      zoomAtual <
      ZOOM_MINIMO_REDE
    ) {
      return null;
    }

    if (
      !mostrarCaminhoEletrico ||
      !caminhoEletrico
    ) {
      return null;
    }

    const ids =
      Array.isArray(
        caminhoEletrico.ordemTrechos
      )
        ? caminhoEletrico.ordemTrechos
        : Object.keys(
            caminhoEletrico.trechos ||
              {}
          );

    return ids.map(
      (
        item,
        indice
      ) => {
        const trecho =
          obterTrechoDoResultado(
            item
          );

        if (!trecho) {
          return null;
        }

        const inicio =
          obterCoordenadasPonto(
            trecho.pontoInicial
          );

        const fim =
          obterCoordenadasPonto(
            trecho.pontoFinal
          );

        if (
          !inicio ||
          !fim
        ) {
          return null;
        }

        const id =
          trecho.id ||
          trecho.trechoId ||
          `caminho-${indice}`;

        return (
          <Polyline
            key={
              `caminho-${id}`
            }
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color:
                "#ff1744",

              weight:
                8,

              opacity:
                1,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // RENDER MONTANTE
  // ========================================================

  function renderizarRedeMontante() {
    if (
      zoomAtual <
      ZOOM_MINIMO_REDE
    ) {
      return null;
    }

    if (
      !mostrarRedeMontante ||
      !redeMontante
    ) {
      return null;
    }

    const ids =
      Array.isArray(
        redeMontante.ordemTrechos
      )
        ? redeMontante.ordemTrechos
        : Object.keys(
            redeMontante.trechos ||
              {}
          );

    return ids.map(
      (
        item,
        indice
      ) => {
        const trecho =
          obterTrechoDoResultado(
            item
          );

        if (!trecho) {
          return null;
        }

        const inicio =
          obterCoordenadasPonto(
            trecho.pontoInicial
          );

        const fim =
          obterCoordenadasPonto(
            trecho.pontoFinal
          );

        if (
          !inicio ||
          !fim
        ) {
          return null;
        }

        const id =
          trecho.id ||
          trecho.trechoId ||
          `montante-${indice}`;

        return (
          <Polyline
            key={
              `montante-${id}`
            }
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color:
                "#f59e0b",

              weight:
                5,

              opacity:
                0.95,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // RENDER CONECTADA
  // ========================================================

  function renderizarRedeConectada() {
    if (
      zoomAtual <
      ZOOM_MINIMO_REDE
    ) {
      return null;
    }

    if (
      !mostrarRedeConectada ||
      !redeConectada
    ) {
      return null;
    }

    const ids =
      Array.isArray(
        redeConectada.ordemTrechos
      )
        ? redeConectada.ordemTrechos
        : Object.keys(
            redeConectada.trechos ||
              {}
          );

    return ids.map(
      (
        item,
        indice
      ) => {
        const trecho =
          obterTrechoDoResultado(
            item
          );

        if (!trecho) {
          return null;
        }

        const inicio =
          obterCoordenadasPonto(
            trecho.pontoInicial
          );

        const fim =
          obterCoordenadasPonto(
            trecho.pontoFinal
          );

        if (
          !inicio ||
          !fim
        ) {
          return null;
        }

        const id =
          trecho.id ||
          trecho.trechoId ||
          `conectada-${indice}`;

        return (
          <Polyline
            key={
              `conectada-${id}`
            }
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color:
                "#a855f7",

              weight:
                4,

              opacity:
                0.8,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // FILTRO DE EQUIPAMENTO
  // ========================================================

  function equipamentoPermitido(
    equipamento
  ) {
    const tipo =
      obterTipoEquipamento(
        equipamento
      );

    if (
      !equipamentoPermitidoPorZoom(
        tipo,
        zoomAtual
      )
    ) {
      return false;
    }

    if (
      tipo ===
        "RELIGADOR" &&
      !mostrarReligadores
    ) {
      return false;
    }

    if (
      (
        tipo ===
          "CHAVE_FUSIVEL" ||
        tipo ===
          "CHAVE_LAMINA" ||
        tipo ===
          "CHAVE_SECCIONADORA"
      ) &&
      !mostrarChaves
    ) {
      return false;
    }

    if (
      tipo ===
        "REGULADOR" &&
      !mostrarReguladores
    ) {
      return false;
    }

    if (
      tipo ===
        "CAPACITOR" &&
      !mostrarCapacitores
    ) {
      return false;
    }

    if (
      tipo ===
        "TRANSFORMADOR" &&
      !mostrarTransformadores
    ) {
      return false;
    }

    return true;
  }

  // ========================================================
  // RENDER EQUIPAMENTOS
  // ========================================================

  function renderizarEquipamentos() {
    if (
      !mostrarEquipamentos ||
      !visibilidadeZoom.mostrarRede ||
      !equipamentosGeoJSONFiltrados ||
      !topologia
    ) {
      return null;
    }

    return (
      equipamentosGeoJSONFiltrados.features.map(
        (
          feature,
          indice
        ) => {
          const equipamento =
            obterEquipamentoCamada(
              feature
            );

          if (!equipamento) {
            return null;
          }

          const identidade =
            obterIdentidadeOperacional(
              equipamento,
              feature
            );

          const id =
            identidade.idOperacional ||
            obterIdEquipamentoFeature(
              feature
            );

          if (!id) {
            return null;
          }

          const tipo =
            obterTipoEquipamento(
              equipamento
            );

          if (
            !equipamentoPermitidoPorZoom(
              tipo,
              zoomAtual
            )
          ) {
            return null;
          }

          if (
            tipo ===
              "RELIGADOR" &&
            !mostrarReligadores
          ) {
            return null;
          }

          if (
            (
              tipo ===
                "CHAVE_FUSIVEL" ||
              tipo ===
                "CHAVE_LAMINA" ||
              tipo ===
                "CHAVE_SECCIONADORA"
            ) &&
            !mostrarChaves
          ) {
            return null;
          }

          if (
            tipo ===
              "REGULADOR" &&
            !mostrarReguladores
          ) {
            return null;
          }

          if (
            tipo ===
              "CAPACITOR" &&
            !mostrarCapacitores
          ) {
            return null;
          }

          if (
            tipo ===
              "TRANSFORMADOR" &&
            !mostrarTransformadores
          ) {
            return null;
          }

          const coordenadas =
            obterCoordenadasEquipamentoCamada(
              equipamento,
              feature
            );

          if (!coordenadas) {
            console.warn(
              "⚠️ Equipamento sem coordenada:",
              {
                id,
                tipo,
                equipamento,
              }
            );

            return null;
          }

          const estadoAtual =
            estadoDoEquipamento(
              id
            )?.estado ||
            "FECHADO";

          const equipamentoVisual =
            {
              ...equipamento,

              id,

              plaqueta:
                identidade.plaqueta,

              idOperacional:
                identidade.idOperacional,

              idPatrimonial:
                identidade.idPatrimonial,

              unsemtId:
                identidade.unsemtId,

              untrmtId:
                identidade.untrmtId,

              properties:
                equipamento.properties ||
                {},

              propriedades:
                equipamento.propriedades ||
                {},

              featureOriginal:
                feature,
            };

          return (
            <Marker
              key={
                `bdgd-equipamento-${id}-${indice}`
              }
              position={
                coordenadas
              }
              icon={
                criarIconeEquipamento(
                  equipamentoVisual,
                  estadoAtual
                )
              }
              eventHandlers={{
                click:
                  () =>
                    selecionarEquipamentoOperacional(
                      feature
                    ),
              }}
            />
          );
        }
      )
    );
  }

  // ========================================================
  // STATUS ZOOM
  // ========================================================

  function obterDescricaoZoom() {
    switch (
      nivelZoom
    ) {
      case "NENHUM":
        return "Mapa base";

      case "OPERACIONAL":
        return "Rede + manobra";

      case "INTERMEDIARIO":
        return "Rede + chaves fusíveis";

      case "DETALHADO":
        return "Visualização detalhada";

      default:
        return "Mapa base";
    }
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <>
      {/* ================================================== */}
      {/* INDICADOR DE ZOOM */}
      {/* ================================================== */}

      <div
        style={{
          position:
            "absolute",

          top:
            10,

          right:
            elementoSelecionado
              ? 426
              : 12,

          zIndex:
            2500,

          background:
            "#0b131d",

          color:
            visibilidadeZoom.mostrarRede
              ? "#e2e8f0"
              : "#64748b",

          border:
            "1px solid #263241",

          borderRadius:
            8,

          padding:
            "6px 9px",

          fontFamily:
            "Arial,sans-serif",

          fontSize:
            10,

          boxShadow:
            "0 4px 14px rgba(0,0,0,0.28)",

          pointerEvents:
            "none",
        }}
      >
        <div
          style={{
            fontWeight:
              700,

            color:
              visibilidadeZoom.mostrarRede
                ? "#38bdf8"
                : "#64748b",
          }}
        >
          ZOOM{" "}
          {Number(
            zoomAtual
          ).toFixed(
            1
          )}
        </div>

        <div
          style={{
            marginTop:
              2,
          }}
        >
          {
            obterDescricaoZoom()
          }
        </div>
      </div>

      {/* ================================================== */}
      {/* STATUS */}
      {/* ================================================== */}

      {carregandoSsdmt && (
        <div
          style={{
            position:
              "absolute",

            top:
              10,

            left:
              10,

            zIndex:
              3000,

            background:
              "#0b131d",

            color:
              "#38bdf8",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            pointerEvents:
              "none",
          }}
        >
          🔵 Carregando SSDMT...
        </div>
      )}

      {carregandoPonnot && (
        <div
          style={{
            position:
              "absolute",

            top:
              45,

            left:
              10,

            zIndex:
              3000,

            background:
              "#0b131d",

            color:
              "#4ade80",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            pointerEvents:
              "none",
          }}
        >
          🟢 Carregando PONNOT...
        </div>
      )}

      {carregandoEquipamentos && (
        <div
          style={{
            position:
              "absolute",

            top:
              80,

            left:
              10,

            zIndex:
              3000,

            background:
              "#0b131d",

            color:
              "#fbbf24",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            pointerEvents:
              "none",
          }}
        >
          🟠 Carregando equipamentos BDGD...
        </div>
      )}

      {erroSsdmt && (
        <div
          style={{
            position:
              "absolute",

            top:
              10,

            left:
              10,

            zIndex:
              3001,

            background:
              "#3b1111",

            color:
              "#ff6b6b",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            maxWidth:
              400,
          }}
        >
          ❌ SSDMT:
          <br />
          {erroSsdmt}
        </div>
      )}

      {erroPonnot && (
        <div
          style={{
            position:
              "absolute",

            top:
              45,

            left:
              10,

            zIndex:
              3001,

            background:
              "#3b1111",

            color:
              "#4ade80",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            maxWidth:
              400,
          }}
        >
          ❌ PONNOT:
          <br />
          {erroPonnot}
        </div>
      )}

      {erroEquipamentos && (
        <div
          style={{
            position:
              "absolute",

            top:
              80,

            left:
              10,

            zIndex:
              3001,

            background:
              "#3b1111",

            color:
              "#fbbf24",

            padding:
              "8px 12px",

            borderRadius:
              6,

            fontSize:
              12,

            maxWidth:
              400,
          }}
        >
          ❌ EQUIPAMENTOS:
          <br />
          {erroEquipamentos}
        </div>
      )}

      {/* ================================================== */}
      {/* FICHA OPERACIONAL */}
      {/* ================================================== */}

      {elementoSelecionado && (
        <div
          style={{
            position:
              "absolute",

            top:
              18,

            right:
              18,

            zIndex:
              4000,

            width:
              390,

            maxWidth:
              "calc(100vw - 36px)",

            maxHeight:
              "calc(100vh - 36px)",

            overflowY:
              "auto",

            background:
              "#0b131d",

            color:
              "#e5e7eb",

            border:
              "1px solid #263241",

            borderRadius:
              12,

            boxShadow:
              "0 12px 40px rgba(0,0,0,0.5)",

            fontFamily:
              "Arial,sans-serif",
          }}
        >
          {(() => {
            const feature =
              elementoSelecionado.feature ||
              null;

            const dadosFicha =
              fichaOperacional ||
              null;

            const equipamentoSelecionado =
              elementoSelecionado
                ?.equipamento ||
              null;

            const dadosEquipamento =
              dadosFicha?.equipamento ||
              dadosFicha?.modelo ||
              equipamentoSelecionado ||
              null;

            const dadosUnidade =
              dadosFicha?.unidade ||
              dadosEquipamento
                ?.unidadeSeccionadora ||
              null;

            const equipamentoFonte =
              dadosEquipamento ||
              equipamentoSelecionado ||
              dadosUnidade ||
              null;

            const p =
              {
                ...(
                  feature?.properties ||
                  {}
                ),

                ...(
                  dadosUnidade?.propriedades ||
                  {}
                ),

                ...(
                  dadosEquipamento?.propriedades ||
                  {}
                ),

                ...(
                  equipamentoSelecionado?.propriedades ||
                  {}
                ),
              };

            const tipo =
              elementoSelecionado.tipo ===
              "TRECHO"
                ? "TRECHO"
                : (
                    dadosFicha?.tipo ||
                    dadosEquipamento?.tipoEquipamento ||
                    equipamentoSelecionado?.tipoEquipamento ||
                    obterTipoEquipamento(
                      equipamentoFonte ||
                        feature ||
                        elementoSelecionado
                    )
                  );

            const estilo =
              tipo ===
              "TRECHO"
                ? {
                    cor:
                      "#38bdf8",

                    fundo:
                      "#082f49",

                    titulo:
                      "Trecho de rede MT",
                  }
                : obterEstiloEquipamento(
                    tipo
                  );

            // ------------------------------------------------
            // IDENTIDADE
            // ------------------------------------------------

            const identidadeFicha =
              tipo === "TRECHO"
                ? null
                : obterIdentidadeOperacional(
                    equipamentoFonte,
                    feature
                  );

            const id =
              tipo === "TRECHO"
                ? (
                    elementoSelecionado?.id ||
                    p?.COD_ID ||
                    "-"
                  )
                : (
                    identidadeFicha?.plaqueta ??
                    elementoSelecionado?.plaqueta ??
                    elementoSelecionado?.idOperacional ??
                    elementoSelecionado?.id ??
                    "-"
                  );

            const idPatrimonial =
              identidadeFicha?.idPatrimonial ??
              elementoSelecionado?.idPatrimonial ??
              equipamentoFonte?.idPatrimonial ??
              "-";

            const alimentador =
              dadosFicha?.alimentador ??
              equipamentoFonte?.alimentador ??
              dadosUnidade?.alimentador ??
              p.alimentador ??
              p.CT_COD_OP ??
              p.CT_COD_OPER ??
              obterAlimentadorFeature(
                feature
              ) ??
              "-";

            const circuito =
              dadosFicha?.circuito ??
              equipamentoFonte?.circuito ??
              dadosUnidade?.circuito ??
              p.CTMT ??
              p.ctmt ??
              "-";

            // ------------------------------------------------
            // COORDENADAS
            // ------------------------------------------------

            const coordenadasMapa =
              obterCoordenadasEquipamentoCamada(
                equipamentoFonte,
                feature
              );

            const longitude =
              coordenadasMapa
                ? Number(
                    coordenadasMapa[1]
                  )
                : Number(
                    dadosFicha?.ponto
                      ?.longitude ??
                      dadosUnidade?.longitude ??
                      equipamentoFonte?.longitude
                  );

            const latitude =
              coordenadasMapa
                ? Number(
                    coordenadasMapa[0]
                  )
                : Number(
                    dadosFicha?.ponto
                      ?.latitude ??
                      dadosUnidade?.latitude ??
                      equipamentoFonte?.latitude
                  );

            const latitudeOk =
              Number.isFinite(
                latitude
              );

            const longitudeOk =
              Number.isFinite(
                longitude
              );

            // ------------------------------------------------
            // VALORES
            // ------------------------------------------------

            const valor = (
              ...campos
            ) => {
              for (
                const campo of
                  campos
              ) {
                const valorCampo =
                  p?.[campo];

                if (
                  valorCampo !==
                    undefined &&
                  valorCampo !==
                    null &&
                  String(
                    valorCampo
                  ).trim() !==
                    ""
                ) {
                  return valorCampo;
                }

                const valorEquip =
                  equipamentoFonte?.[
                    campo
                  ];

                if (
                  valorEquip !==
                    undefined &&
                  valorEquip !==
                    null &&
                  String(
                    valorEquip
                  ).trim() !==
                    ""
                ) {
                  return valorEquip;
                }
              }

              return "-";
            };

            const posicao =
              equipamentoFonte?.posicao ??
              valor(
                "POS",
                "posicao"
              );

            const fases =
              equipamentoFonte?.fases ??
              valor(
                "FAS_CON",
                "FAS_CON_P",
                "fases"
              );

            // ------------------------------------------------
            // PAC
            // ------------------------------------------------

            const pac1 =
              equipamentoFonte?.pac1Original ??
              equipamentoFonte?.pac1 ??
              dadosUnidade?.pac1Original ??
              dadosUnidade?.pac1 ??
              p?.PAC_1 ??
              p?.pac1Original ??
              p?.PAC1 ??
              "-";

            const pac2 =
              equipamentoFonte?.pac2Original ??
              equipamentoFonte?.pac2 ??
              dadosUnidade?.pac2Original ??
              dadosUnidade?.pac2 ??
              p?.PAC_2 ??
              p?.pac2Original ??
              p?.PAC2 ??
              "-";

            // ------------------------------------------------
            // PONTO ASSOCIADO
            // ------------------------------------------------

            let pontoAssociado =
              normalizarId(
                equipamentoFonte?.pontoAssociado
              ) ||
              normalizarId(
                dadosUnidade?.pontoAssociado
              ) ||
              normalizarId(
                elementoSelecionado?.pontoAssociado
              );

            if (
              !pontoAssociado &&
              elementoSelecionado.tipo ===
                "UNSEMT"
            ) {
              const unidade =
                buscarUnidadeTopologia(
                  elementoSelecionado.id
                );

              pontoAssociado =
                normalizarId(
                  unidade?.pontoAssociado
                ) ||
                normalizarId(
                  unidade?.pac1
                ) ||
                normalizarId(
                  unidade?.ponto1
                );
            }

            if (
              !pontoAssociado &&
              elementoSelecionado.tipo ===
                "TRANSFORMADOR"
            ) {
              pontoAssociado =
                normalizarId(
                  equipamentoFonte
                    ?.pontoAssociado
                ) ||
                normalizarId(
                  equipamentoFonte
                    ?.pac1
                );
            }

            if (
              !pontoAssociado &&
              elementoSelecionado.tipo ===
                "PONTO"
            ) {
              pontoAssociado =
                normalizarId(
                  elementoSelecionado.id
                );
            }

            if (
              !pontoAssociado &&
              elementoSelecionado.tipo ===
                "TRECHO"
            ) {
              const trecho =
                buscarTrechoBDGD(
                  topologia,
                  elementoSelecionado.id
                );

              pontoAssociado =
                normalizarId(
                  trecho?.pontoFinal
                ) ||
                normalizarId(
                  trecho?.pontoInicial
                );
            }

            const ponto1 =
              equipamentoFonte?.ponto1 ||
              null;

            const ponto2 =
              equipamentoFonte?.ponto2 ||
              null;

            const conexoes =
              Array.isArray(
                dadosFicha?.conexoes
              )
                ? dadosFicha.conexoes
                : pontoAssociado
                  ? buscarConexoes(
                      topologia,
                      pontoAssociado
                    )
                  : [];

            const estadoModelo =
              versaoEstadoOperacional >=
              0
                ? consultarEstadoEquipamento(
                    id
                  )
                : null;

            const estadoOperacional =
              estadoModelo?.estado &&
              estadoModelo.estado !==
                "NAO_INFORMADO"
                ? estadoModelo.estado
                : (
                    dadosFicha?.estadoOperacional ??
                    "NAO_INFORMADO"
                  );

            const estadoVisual =
              obterEstiloEstadoOperacional(
                estadoOperacional
              );

            const equipamentoManobravel =
              tipo ===
                "RELIGADOR" ||
              normalizarTexto(
                tipo
              ).startsWith(
                "CHAVE_"
              );

            const correnteAtual =
              dadosFicha?.correnteAtual ??
              null;

            const potencia =
              valor(
                "POT_NOM",
                "potNom",
                "POTENCIA",
                "potencia",
                "POT_TRAFO"
              );

            const tensaoPrimaria =
              valor(
                "TEN_LIN_SE",
                "TEN_PRIM",
                "TEN_PRI",
                "TEN_PRI_NOM",
                "tensaoPrimaria"
              );

            const tensaoSecundaria =
              valor(
                "TEN_SEC",
                "TEN_SEC_NOM",
                "tensaoSecundaria",
                "TEN_LIN_SEC"
              );

            const telecomandadoModelo =
              dadosFicha?.telecomandado ??
              equipamentoFonte?.telecomandado ??
              dadosUnidade?.telecomandado ??
              p.telecomandado ??
              null;

            const corSecao =
              "#263241";

            const estiloLabel = {
              fontSize:
                10,

              color:
                "#94a3b8",

              textTransform:
                "uppercase",

              letterSpacing:
                "0.08em",

              fontWeight:
                700,

              marginBottom:
                4,
            };

            const estiloValor = {
              fontSize:
                13,

              color:
                "#f8fafc",

              fontWeight:
                600,

              lineHeight:
                1.35,

              wordBreak:
                "break-word",
            };

            const card = {
              border:
                `1px solid ${corSecao}`,

              borderRadius:
                8,

              padding:
                "9px 10px",

              background:
                "#101b27",
            };

            return (
              <>
                {/* CABEÇALHO */}

                <div
                  style={{
                    padding:
                      "14px 16px",

                    borderBottom:
                      `1px solid ${corSecao}`,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      11,
                  }}
                >
                  <div
                    style={{
                      width:
                        42,

                      height:
                        42,

                      flexShrink:
                        0,

                      borderRadius:
                        10,

                      background:
                        estilo.fundo,

                      border:
                        `1px solid ${estilo.cor}`,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      color:
                        estilo.cor,

                      fontSize:
                        19,
                    }}
                  >
                    {tipo ===
                    "TRECHO"
                      ? "⚡"
                      : "●"}
                  </div>

                  <div
                    style={{
                      flex:
                        1,

                      minWidth:
                        0,
                    }}
                  >
                    <div
                      style={{
                        color:
                          estilo.cor,

                        fontSize:
                          16,

                        fontWeight:
                          700,
                      }}
                    >
                      {
                        estilo.titulo
                      }
                    </div>

                    <div
                      style={{
                        marginTop:
                          3,

                        color:
                          "#94a3b8",

                        fontSize:
                          11,
                      }}
                    >
                      ID / Plaqueta:{" "}
                      {id}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      limparAnalise
                    }
                    aria-label="Fechar ficha"
                    style={{
                      width:
                        30,

                      height:
                        30,

                      border:
                        `1px solid ${corSecao}`,

                      borderRadius:
                        7,

                      background:
                        "#101b27",

                      color:
                        "#94a3b8",

                      cursor:
                        "pointer",

                      fontSize:
                        16,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    padding:
                      14,
                  }}
                >
                  {/* IDENTIFICAÇÃO */}

                  <div
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <div
                      style={
                        estiloLabel
                      }
                    >
                      IDENTIFICAÇÃO
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "1fr 1fr",

                        gap:
                          7,
                      }}
                    >
                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Tipo
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            estilo.titulo
                          }
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          ID / Plaqueta
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {id}
                        </div>
                      </div>

                      {tipo !==
                        "TRECHO" && (
                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            ID Patrimonial / EQSE
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              idPatrimonial
                            }
                          </div>
                        </div>
                      )}

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Alimentador
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            alimentador
                          }
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          CTMT
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            circuito
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ESTADO OPERACIONAL */}

                  <div
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <div
                      style={
                        estiloLabel
                      }
                    >
                      ESTADO OPERACIONAL
                    </div>

                    <div
                      style={{
                        ...card,

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              14,

                            fontWeight:
                              700,

                            color:
                              estadoVisual.cor,
                          }}
                        >
                          {
                            estadoVisual.rotulo
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              3,

                            fontSize:
                              10,

                            color:
                              "#64748b",
                          }}
                        >
                          Posição BDGD:{" "}
                          {posicao}
                        </div>
                      </div>

                      <span
                        style={{
                          width:
                            32,

                          height:
                            32,

                          borderRadius:
                            "50%",

                          background:
                            estadoVisual.fundo,

                          border:
                            `1px solid ${estadoVisual.cor}`,

                          color:
                            estadoVisual.cor,

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          fontSize:
                            16,

                          fontWeight:
                            800,
                        }}
                      >
                        {
                          estadoVisual.simbolo
                        }
                      </span>
                    </div>

                    {correnteAtual !==
                      null && (
                      <div
                        style={{
                          ...card,

                          marginTop:
                            7,
                        }}
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Corrente atual
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {formatarNumero(
                            correnteAtual,
                            2
                          )}{" "}
                          A
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LOCALIZAÇÃO ELÉTRICA */}

                  <div
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <div
                      style={
                        estiloLabel
                      }
                    >
                      LOCALIZAÇÃO ELÉTRICA
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "1fr 1fr",

                        gap:
                          7,
                      }}
                    >
                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Ponto associado
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            pontoAssociado ??
                            "-"
                          }
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Conexões
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            Array.isArray(
                              conexoes
                            )
                              ? conexoes.length
                              : 0
                          }
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          PAC 1
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {pac1}
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          PAC 2
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {pac2}
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Fases
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {fases}
                        </div>
                      </div>

                      <div
                        style={
                          card
                        }
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Telecomandado
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            telecomandadoModelo ===
                            true
                              ? "SIM"
                              : telecomandadoModelo ===
                                  false
                                ? "NÃO"
                                : "-"
                          }
                        </div>
                      </div>
                    </div>

                    {/* PONTOS */}

                    {(ponto1 ||
                      ponto2) && (
                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "1fr 1fr",

                          gap:
                            7,

                          marginTop:
                            7,
                        }}
                      >
                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            PONNOT PAC 1
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              ponto1
                                ?.id ??
                              pac1 ??
                              "-"
                            }
                          </div>
                        </div>

                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            PONNOT PAC 2
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              ponto2
                                ?.id ??
                              pac2 ??
                              "-"
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ORIGEM DA COORDENADA */}

                    {equipamentoFonte
                      ?.coordenadas
                      ?.origem && (
                      <div
                        style={{
                          ...card,

                          marginTop:
                            7,
                        }}
                      >
                        <div
                          style={
                            estiloLabel
                          }
                        >
                          Referência espacial
                        </div>

                        <div
                          style={
                            estiloValor
                          }
                        >
                          {
                            equipamentoFonte
                              .coordenadas
                              .origem
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TRANSFORMADOR */}

                  {tipo ===
                    "TRANSFORMADOR" && (
                    <div
                      style={{
                        marginBottom:
                          14,
                      }}
                    >
                      <div
                        style={
                          estiloLabel
                        }
                      >
                        DADOS DO TRANSFORMADOR
                      </div>

                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "1fr 1fr",

                          gap:
                            7,
                        }}
                      >
                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            Potência
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              potencia
                            }
                          </div>
                        </div>

                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            Tensão primária
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              tensaoPrimaria
                            }
                          </div>
                        </div>

                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            Tensão secundária
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {
                              tensaoSecundaria
                            }
                          </div>
                        </div>

                        <div
                          style={
                            card
                          }
                        >
                          <div
                            style={
                              estiloLabel
                            }
                          >
                            Fases
                          </div>

                          <div
                            style={
                              estiloValor
                            }
                          >
                            {fases}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ANÁLISES */}

                  <div
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <div
                      style={
                        estiloLabel
                      }
                    >
                      ANÁLISE DE REDE
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "1fr 1fr",

                        gap:
                          7,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          analisarElementoSelecionado(
                            "MONTANTE"
                          )
                        }
                        disabled={
                          !topologia
                        }
                        style={{
                          padding:
                            "9px 8px",

                          border:
                            "1px solid #92400e",

                          borderRadius:
                            7,

                          background:
                            topologia
                              ? "#2a1b05"
                              : "#17212c",

                          color:
                            topologia
                              ? "#fbbf24"
                              : "#64748b",

                          cursor:
                            topologia
                              ? "pointer"
                              : "not-allowed",

                          fontWeight:
                            700,

                          fontSize:
                            11,
                        }}
                      >
                        ↖ Montante
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          analisarElementoSelecionado(
                            "JUSANTE"
                          )
                        }
                        disabled={
                          !topologia
                        }
                        style={{
                          padding:
                            "9px 8px",

                          border:
                            "1px solid #0369a1",

                          borderRadius:
                            7,

                          background:
                            topologia
                              ? "#082f49"
                              : "#17212c",

                          color:
                            topologia
                              ? "#7dd3fc"
                              : "#64748b",

                          cursor:
                            topologia
                              ? "pointer"
                              : "not-allowed",

                          fontWeight:
                            700,

                          fontSize:
                            11,
                        }}
                      >
                        ↘ Jusante
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          analisarElementoSelecionado(
                            "CONECTADA"
                          )
                        }
                        disabled={
                          !topologia
                        }
                        style={{
                          padding:
                            "9px 8px",

                          border:
                            "1px solid #7e22ce",

                          borderRadius:
                            7,

                          background:
                            topologia
                              ? "#241032"
                              : "#17212c",

                          color:
                            topologia
                              ? "#d8b4fe"
                              : "#64748b",

                          cursor:
                            topologia
                              ? "pointer"
                              : "not-allowed",

                          fontWeight:
                            700,

                          fontSize:
                            11,
                        }}
                      >
                        ◎ Conectada
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !latitudeOk ||
                            !longitudeOk
                          ) {
                            return;
                          }

                          map.flyTo(
                            [
                              latitude,
                              longitude,
                            ],
                            Math.max(
                              map.getZoom(),
                              18
                            ),
                            {
                              animate:
                                true,

                              duration:
                                0.8,
                            }
                          );
                        }}
                        disabled={
                          !latitudeOk ||
                          !longitudeOk
                        }
                        style={{
                          padding:
                            "9px 8px",

                          border:
                            "1px solid #334155",

                          borderRadius:
                            7,

                          background:
                            "#101b27",

                          color:
                            "#cbd5e1",

                          cursor:
                            latitudeOk &&
                            longitudeOk
                              ? "pointer"
                              : "not-allowed",

                          fontWeight:
                            700,

                          fontSize:
                            11,
                        }}
                      >
                        📍 Localizar
                      </button>
                    </div>
                  </div>

                  {/* MANOBRA */}

                  <div
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <div
                      style={
                        estiloLabel
                      }
                    >
                      COMANDO DE MANOBRA
                    </div>

                    <div
                      style={
                        card
                      }
                    >
                      {!equipamentoManobravel && (
                        <div
                          style={{
                            padding:
                              8,

                            borderRadius:
                              7,

                            background:
                              "#1e293b",

                            border:
                              "1px solid #334155",

                            color:
                              "#94a3b8",

                            fontSize:
                              10,

                            lineHeight:
                              1.4,

                            marginBottom:
                              8,
                          }}
                        >
                          Este equipamento não possui comando de abertura/fechamento no modelo operacional.
                        </div>
                      )}

                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "1fr 1fr",

                          gap:
                            7,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            solicitarManobra(
                              "ABRIR"
                            )
                          }
                          disabled={
                            !equipamentoManobravel ||
                            estadoOperacional ===
                              "ABERTO" ||
                            estadoOperacional ===
                              "INDISPONIVEL" ||
                            estadoOperacional ===
                              "BYPASSADO"
                          }
                          style={{
                            padding:
                              "10px 8px",

                            border:
                              "1px solid #991b1b",

                            borderRadius:
                              7,

                            background:
                              "#3b0a0a",

                            color:
                              estadoOperacional ===
                              "ABERTO"
                                ? "#64748b"
                                : "#fca5a5",

                            cursor:
                              equipamentoManobravel &&
                              estadoOperacional !==
                                "ABERTO"
                                ? "pointer"
                                : "not-allowed",

                            fontWeight:
                              800,

                            fontSize:
                              11,
                          }}
                        >
                          ⛔ ABRIR
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            solicitarManobra(
                              "FECHAR"
                            )
                          }
                          disabled={
                            !equipamentoManobravel ||
                            estadoOperacional ===
                              "FECHADO" ||
                            estadoOperacional ===
                              "INDISPONIVEL" ||
                            estadoOperacional ===
                              "BYPASSADO"
                          }
                          style={{
                            padding:
                              "10px 8px",

                            border:
                              "1px solid #166534",

                            borderRadius:
                              7,

                            background:
                              "#052e16",

                            color:
                              estadoOperacional ===
                              "FECHADO"
                                ? "#64748b"
                                : "#86efac",

                            cursor:
                              equipamentoManobravel &&
                              estadoOperacional !==
                                "FECHADO"
                                ? "pointer"
                                : "not-allowed",

                            fontWeight:
                              800,

                            fontSize:
                              11,
                          }}
                        >
                          ✅ FECHAR
                        </button>
                      </div>

                      {manobraPendente && (
                        <div
                          style={{
                            marginTop:
                              9,

                            padding:
                              10,

                            borderRadius:
                              8,

                            background:
                              "#2b1c05",

                            border:
                              "1px solid #a16207",

                            color:
                              "#fde68a",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                10,

                              fontWeight:
                                800,
                            }}
                          >
                            CONFIRMAR MANOBRA
                          </div>

                          <div
                            style={{
                              marginTop:
                                5,

                              fontSize:
                                11,

                              lineHeight:
                                1.45,
                            }}
                          >
                            Executar{" "}
                            <strong>
                              {
                                manobraPendente.acao
                              }
                            </strong>{" "}
                            no equipamento{" "}
                            <strong>
                              {
                                manobraPendente.id
                              }
                            </strong>
                            ?
                          </div>

                          <div
                            style={{
                              marginTop:
                                4,

                              fontSize:
                                9,

                              opacity:
                                0.9,
                            }}
                          >
                            Estado:{" "}
                            {
                              manobraPendente.estadoAtual
                            }{" "}
                            →{" "}
                            {
                              manobraPendente.acao ===
                              "ABRIR"
                                ? "ABERTO"
                                : "FECHADO"
                            }
                          </div>

                          <div
                            style={{
                              display:
                                "grid",

                              gridTemplateColumns:
                                "1fr 1fr",

                              gap:
                                7,

                              marginTop:
                                9,
                            }}
                          >
                            <button
                              type="button"
                              onClick={
                                cancelarManobra
                              }
                              style={{
                                padding:
                                  "8px 7px",

                                border:
                                  "1px solid #475569",

                                borderRadius:
                                  7,

                                background:
                                  "#17202b",

                                color:
                                  "#cbd5e1",

                                cursor:
                                  "pointer",

                                fontWeight:
                                  700,

                                fontSize:
                                  10,
                              }}
                            >
                              CANCELAR
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                executarManobra(
                                  manobraPendente.acao
                                )
                              }
                              style={{
                                padding:
                                  "8px 7px",

                                border:
                                  "1px solid #16a34a",

                                borderRadius:
                                  7,

                                background:
                                  "#052e16",

                                color:
                                  "#86efac",

                                cursor:
                                  "pointer",

                                fontWeight:
                                  800,

                                fontSize:
                                  10,
                              }}
                            >
                              CONFIRMAR
                            </button>
                          </div>
                        </div>
                      )}

                      <textarea
                        value={
                          observacaoOperacional
                        }
                        onChange={(
                          event
                        ) =>
                          setObservacaoOperacional(
                            event.target
                              .value
                          )
                        }
                        placeholder="Observação da manobra..."
                        rows={2}
                        style={{
                          width:
                            "100%",

                          boxSizing:
                            "border-box",

                          marginTop:
                            8,

                          padding:
                            "7px 8px",

                          border:
                            "1px solid #334155",

                          borderRadius:
                            7,

                          resize:
                            "vertical",

                          background:
                            "#101b27",

                          color:
                            "#e2e8f0",

                          outline:
                            "none",

                          fontFamily:
                            "Arial,sans-serif",

                          fontSize:
                            10,
                        }}
                      />

                      <div
                        style={{
                          marginTop:
                            7,

                          color:
                            "#64748b",

                          fontSize:
                            9,

                          lineHeight:
                            1.4,
                        }}
                      >
                        A manobra altera somente o estado operacional simulado do equipamento no Power Grid Monitor. Nenhum comando físico é enviado à rede.
                      </div>
                    </div>
                  </div>

                  {/* RESULTADOS */}

                  {redeMontante && (
                    <div
                      style={{
                        marginTop:
                          10,

                        padding:
                          9,

                        borderRadius:
                          7,

                        border:
                          "1px solid #92400e",

                        background:
                          "#2a1b05",

                        color:
                          "#fbbf24",

                        fontSize:
                          11,

                        fontWeight:
                          600,
                      }}
                    >
                      ↖ Rede a montante:{" "}
                      {
                        redeMontante.quantidadeTrechos ??
                        0
                      }{" "}
                      trecho(s),{" "}
                      {
                        redeMontante.quantidadePontos ??
                        0
                      }{" "}
                      ponto(s).
                    </div>
                  )}

                  {redeConectada && (
                    <div
                      style={{
                        marginTop:
                          10,

                        padding:
                          9,

                        borderRadius:
                          7,

                        border:
                          "1px solid #7e22ce",

                        background:
                          "#241032",

                        color:
                          "#d8b4fe",

                        fontSize:
                          11,

                        fontWeight:
                          600,
                      }}
                    >
                      ◎ Rede conectada:{" "}
                      {
                        redeConectada.quantidadeTrechos ??
                        0
                      }{" "}
                      trecho(s),{" "}
                      {
                        redeConectada.quantidadePontos ??
                        0
                      }{" "}
                      ponto(s).
                    </div>
                  )}

                  {redeJusante && (
                    <div
                      style={{
                        marginTop:
                          10,

                        padding:
                          9,

                        borderRadius:
                          7,

                        border:
                          "1px solid #14532d",

                        background:
                          "#082015",

                        color:
                          "#86efac",

                        fontSize:
                          11,

                        fontWeight:
                          600,
                      }}
                    >
                      ✓ Rede a jusante analisada e destacada no mapa.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      limparAnalise
                    }
                    style={{
                      width:
                        "100%",

                      marginTop:
                        10,

                      padding:
                        "9px 12px",

                      border:
                        "1px solid #7f1d1d",

                      borderRadius:
                        7,

                      background:
                        "#2a1010",

                      color:
                        "#fca5a5",

                      cursor:
                        "pointer",

                      fontWeight:
                        700,
                    }}
                  >
                    Fechar ficha
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ================================================== */}
      {/* MAPA */}
      {/* ================================================== */}

      {visibilidadeZoom.mostrarRede && (
        <>
          {/* SSDMT */}

          {mostrarRedeMT &&
            ssdmtFiltrado && (
              <GeoJSON
                key={
                  `bdgd-ssdmt-${Array.from(
                    alimentadoresFiltro
                  )
                    .sort()
                    .join("-")}`
                }
                data={
                  ssdmtFiltrado
                }
                style={(feature) =>
                  estiloSSDMT(
                    feature,
                    false
                  )
                }
                onEachFeature={
                  aoCriarTrecho
                }
              />
            )}

          {/* SUBESTAÇÕES */}

          {mostrarSubestacoes &&
            topologia &&
            obterItensColecao(
              topologia.subestacoes
            ).map(
              (
                subestacao,
                indice
              ) => {
                const coordenadas =
                  obterCoordenadasItem(
                    subestacao
                  );

                if (
                  !coordenadas
                ) {
                  return null;
                }

                const id =
                  normalizarId(
                    subestacao.id ??
                      subestacao.COD_ID ??
                      subestacao.codigo
                  ) ??
                  `subestacao-${indice}`;

                return (
                  <CircleMarker
                    key={
                      `subestacao-${id}`
                    }
                    center={
                      coordenadas
                    }
                    radius={
                      8
                    }
                    pathOptions={{
                      color:
                        "#ffffff",

                      weight:
                        2,

                      fillColor:
                        "#0891b2",

                      fillOpacity:
                        1,
                    }}
                  >
                    <Popup>
                      <div
                        style={{
                          fontFamily:
                            "Arial,sans-serif",

                          fontSize:
                            12,
                        }}
                      >
                        <strong>
                          🔷 Subestação
                        </strong>

                        <div>
                          <strong>
                            ID:
                          </strong>{" "}
                          {id}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              }
            )}

          {/* EQUIPAMENTOS */}

          {renderizarEquipamentos()}

          {/* PONNOT */}

          {mostrarPontos &&
            ponnotFiltrado
              ?.features
              ?.map(
                (
                  feature,
                  indice
                ) => {
                  const propriedades =
                    feature?.properties ||
                    {};

                  const geometry =
                    feature?.geometry;

                  if (
                    !geometry ||
                    geometry.type !==
                      "Point"
                  ) {
                    return null;
                  }

                  const coordenadas =
                    geometry.coordinates;

                  if (
                    !Array.isArray(
                      coordenadas
                    ) ||
                    coordenadas.length <
                      2
                  ) {
                    return null;
                  }

                  const longitude =
                    Number(
                      coordenadas[0]
                    );

                  const latitude =
                    Number(
                      coordenadas[1]
                    );

                  if (
                    !Number.isFinite(
                      latitude
                    ) ||
                    !Number.isFinite(
                      longitude
                    )
                  ) {
                    return null;
                  }

                  const id =
                    normalizarId(
                      propriedades.COD_ID
                    ) ??
                    `ponnot-${indice}`;

                  return (
                    <CircleMarker
                      key={
                        `ponnot-${id}-${indice}`
                      }
                      center={[
                        latitude,
                        longitude,
                      ]}
                      radius={
                        5
                      }
                      pathOptions={{
                        color:
                          "#ffffff",

                        weight:
                          1,

                        fillColor:
                          "#ff9800",

                        fillOpacity:
                          1,
                      }}
                      eventHandlers={{
                        click:
                          () => {
                            setElementoSelecionado({
                              tipo:
                                "PONTO",

                              id,

                              propriedades,
                            });

                            setFichaOperacional(
                              null
                            );

                            setRedeJusante(
                              null
                            );

                            setRedeMontante(
                              null
                            );

                            setRedeConectada(
                              null
                            );

                            setCaminhoEletrico(
                              null
                            );
                          },
                      }}
                    >
                      <Popup>
                        <div
                          style={{
                            minWidth:
                              220,

                            fontFamily:
                              "Arial,sans-serif",

                            fontSize:
                              13,

                            lineHeight:
                              1.5,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                16,

                              fontWeight:
                                "bold",

                              marginBottom:
                                8,

                              color:
                                "#ef6c00",
                            }}
                          >
                            📍 Ponto PONNOT
                          </div>

                          <div>
                            <strong>
                              COD_ID:
                            </strong>{" "}
                            {
                              propriedades.COD_ID ??
                              "-"
                            }
                          </div>

                          <div>
                            <strong>
                              Tipo:
                            </strong>{" "}
                            {
                              propriedades.TIP_INST ??
                              "-"
                            }
                          </div>

                          <div>
                            <strong>
                              Posição:
                            </strong>{" "}
                            {
                              propriedades.POS ??
                              "-"
                            }
                          </div>

                          <div>
                            <strong>
                              Estrutura:
                            </strong>{" "}
                            {
                              propriedades.ESTR ??
                              "-"
                            }
                          </div>

                          <div>
                            <strong>
                              Material:
                            </strong>{" "}
                            {
                              propriedades.MAT ??
                              "-"
                            }
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                }
              )}

          {/* TERMINAIS */}

          {mostrarTerminais &&
            topologia &&
            obterItensColecao(
              topologia.terminais
            )
              .filter(
                itemTopologiaPermitido
              )
              .map(
                (
                  terminal,
                  indice
                ) => {
                  const coordenadas =
                    obterCoordenadasItem(
                      terminal
                    );

                  if (
                    !coordenadas
                  ) {
                    return null;
                  }

                  const id =
                    normalizarId(
                      typeof terminal ===
                        "object"
                        ? terminal.id ??
                          terminal.pontoId ??
                          terminal.COD_ID
                        : terminal
                    ) ??
                    `terminal-${indice}`;

                  return (
                    <CircleMarker
                      key={
                        `terminal-${id}`
                      }
                      center={
                        coordenadas
                      }
                      radius={
                        4
                      }
                      pathOptions={{
                        color:
                          "#ffffff",

                        weight:
                          1,

                        fillColor:
                          "#f59e0b",

                        fillOpacity:
                          1,
                      }}
                    >
                      <Popup>
                        <div
                          style={{
                            fontFamily:
                              "Arial,sans-serif",

                            fontSize:
                              12,
                          }}
                        >
                          <strong>
                            🔗 Terminal
                          </strong>

                          <div>
                            <strong>
                              ID:
                            </strong>{" "}
                            {id}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                }
              )}

          {/* DERIVAÇÕES */}

          {mostrarDerivacoes &&
            topologia &&
            obterItensColecao(
              topologia.derivacoes
            )
              .filter(
                itemTopologiaPermitido
              )
              .map(
                (
                  derivacao,
                  indice
                ) => {
                  const pontoId =
                    typeof derivacao ===
                      "object"
                      ? derivacao.pontoId
                      : derivacao;

                  const coordenadas =
                    obterCoordenadasPonto(
                      pontoId
                    );

                  if (
                    !coordenadas
                  ) {
                    return null;
                  }

                  const id =
                    normalizarId(
                      pontoId
                    ) ??
                    `derivacao-${indice}`;

                  return (
                    <CircleMarker
                      key={
                        `derivacao-${id}`
                      }
                      center={
                        coordenadas
                      }
                      radius={
                        5
                      }
                      pathOptions={{
                        color:
                          "#ffffff",

                        weight:
                          1,

                        fillColor:
                          "#c084fc",

                        fillOpacity:
                          1,
                      }}
                    >
                      <Popup>
                        <div
                          style={{
                            fontFamily:
                              "Arial,sans-serif",

                            fontSize:
                              12,
                          }}
                        >
                          <strong>
                            🔀 Derivação
                          </strong>

                          <div>
                            <strong>
                              Ponto:
                            </strong>{" "}
                            {id}
                          </div>

                          <div>
                            <strong>
                              Conexões:
                            </strong>{" "}
                            {
                              derivacao?.quantidadeConexoes ??
                              "-"
                            }
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                }
              )}

          {/* ANÁLISES */}

          {renderizarRedeMontante()}

          {renderizarRedeJusante()}

          {renderizarRedeConectada()}

          {renderizarCaminho()}
        </>
      )}

      {/* ================================================== */}
      {/* AVISO DE ZOOM */}
      {/* ================================================== */}

      {zoomAtual <
        ZOOM_MINIMO_REDE && (
        <div
          style={{
            position:
              "absolute",

            bottom:
              18,

            left:
              "50%",

            transform:
              "translateX(-50%)",

            zIndex:
              2500,

            background:
              "rgba(11,19,29,0.92)",

            border:
              "1px solid #263241",

            borderRadius:
              999,

            padding:
              "7px 13px",

            color:
              "#94a3b8",

            fontFamily:
              "Arial,sans-serif",

            fontSize:
              10,

            boxShadow:
              "0 5px 18px rgba(0,0,0,0.35)",

            pointerEvents:
              "none",
          }}
        >
          🔎 Aproxime o mapa para visualizar a rede elétrica
        </div>
      )}
    </>
  );
}
