import { useEffect, useState } from "react";

import {
  GeoJSON,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";

import {
  criarTopologiaBDGD,
  buscarPonto,
  buscarTrechoBDGD,
  buscarConexoes,
  buscarRedeAJusante,
  buscarCaminho,
} from "../../core/modelo/topologiaBDGD";

// ==========================================================
// ARQUIVOS BDGD
// ==========================================================

const ARQUIVO_SSDMT =
  "/data/bdgd/CMG01C4.geojson";

const ARQUIVO_PONNOT =
  "/data/bdgd/CMG01C4_ponnot.geojson";

// ==========================================================
// CONFIGURAÇÃO DOS TESTES
// ==========================================================

const ID_TRECHO_TESTE = "941527";

const ID_ORIGEM_TESTE = "10060794";

const ID_DESTINO_TESTE = "1088716";

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================

function normalizarId(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  return String(valor).trim();
}

function formatarNumero(valor, casas = 2) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "-";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return String(valor);
  }

  return numero.toFixed(casas);
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function CamadaBDGD() {

  // ========================================================
  // DADOS BDGD
  // ========================================================

  const [ssdmt, setSsdmt] = useState(null);

  const [ponnot, setPonnot] = useState(null);

  // ========================================================
  // TOPOLOGIA
  // ========================================================

  const [topologia, setTopologia] = useState(null);

  // ========================================================
  // ELEMENTO SELECIONADO
  // ========================================================

  const [
    elementoSelecionado,
    setElementoSelecionado,
  ] = useState(null);

  // ========================================================
  // NAVEGAÇÃO
  // ========================================================

  const [
    redeJusante,
    setRedeJusante,
  ] = useState(null);

  const [
    caminhoEletrico,
    setCaminhoEletrico,
  ] = useState(null);

  // ========================================================
  // STATUS SSDMT
  // ========================================================

  const [
    carregandoSsdmt,
    setCarregandoSsdmt,
  ] = useState(true);

  const [
    erroSsdmt,
    setErroSsdmt,
  ] = useState(null);

  // ========================================================
  // STATUS PONNOT
  // ========================================================

  const [
    carregandoPonnot,
    setCarregandoPonnot,
  ] = useState(true);

  const [
    erroPonnot,
    setErroPonnot,
  ] = useState(null);

  // ========================================================
  // CARREGAR SSDMT
  // ========================================================

  useEffect(() => {

    let ativo = true;

    async function carregarSSDMT() {

      try {

        setCarregandoSsdmt(true);
        setErroSsdmt(null);

        console.log(
          "=================================================="
        );

        console.log(
          "🔵 CARREGANDO BDGD SSDMT"
        );

        console.log(
          "=================================================="
        );

        console.log(
          "📂 Arquivo:",
          ARQUIVO_SSDMT
        );

        const response =
          await fetch(
            ARQUIVO_SSDMT
          );

        if (!response.ok) {

          throw new Error(
            `Erro HTTP ${response.status} ao carregar SSDMT`
          );
        }

        const geojson =
          await response.json();

        if (
          !geojson ||
          geojson.type !==
            "FeatureCollection"
        ) {

          throw new Error(
            "O arquivo SSDMT não possui um GeoJSON FeatureCollection válido."
          );
        }

        if (
          !Array.isArray(
            geojson.features
          )
        ) {

          throw new Error(
            "O GeoJSON SSDMT não possui uma lista de features válida."
          );
        }

        if (!ativo) {
          return;
        }

        console.log(
          "✅ BDGD SSDMT carregada"
        );

        console.log(
          "   Trechos:",
          geojson.features.length
        );

        setSsdmt(geojson);

      } catch (error) {

        console.error(
          "❌ Erro ao carregar SSDMT:",
          error
        );

        if (ativo) {

          setErroSsdmt(
            error?.message ||
              "Erro desconhecido ao carregar SSDMT."
          );

          setSsdmt(null);
        }

      } finally {

        if (ativo) {
          setCarregandoSsdmt(false);
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

        setCarregandoPonnot(true);
        setErroPonnot(null);

        console.log(
          "=================================================="
        );

        console.log(
          "🟢 CARREGANDO BDGD PONNOT"
        );

        console.log(
          "=================================================="
        );

        console.log(
          "📂 Arquivo:",
          ARQUIVO_PONNOT
        );

        const response =
          await fetch(
            ARQUIVO_PONNOT
          );

        if (!response.ok) {

          throw new Error(
            `Erro HTTP ${response.status} ao carregar PONNOT`
          );
        }

        const geojson =
          await response.json();

        if (
          !geojson ||
          geojson.type !==
            "FeatureCollection"
        ) {

          throw new Error(
            "O arquivo PONNOT não possui um GeoJSON FeatureCollection válido."
          );
        }

        if (
          !Array.isArray(
            geojson.features
          )
        ) {

          throw new Error(
            "O GeoJSON PONNOT não possui uma lista de features válida."
          );
        }

        if (!ativo) {
          return;
        }

        console.log(
          "✅ BDGD PONNOT carregada"
        );

        console.log(
          "   Pontos:",
          geojson.features.length
        );

        setPonnot(geojson);

      } catch (error) {

        console.error(
          "❌ Erro ao carregar PONNOT:",
          error
        );

        if (ativo) {

          setErroPonnot(
            error?.message ||
              "Erro desconhecido ao carregar PONNOT."
          );

          setPonnot(null);
        }

      } finally {

        if (ativo) {
          setCarregandoPonnot(false);
        }
      }
    }

    carregarPONNOT();

    return () => {
      ativo = false;
    };

  }, []);

  // ========================================================
  // CRIAR TOPOLOGIA
  // ========================================================

  useEffect(() => {

    if (
      !ssdmt ||
      !ponnot
    ) {
      return;
    }

    console.log(
      "=================================================="
    );

    console.log(
      "🔧 SSDMT E PONNOT DISPONÍVEIS"
    );

    console.log(
      "🔧 CRIANDO TOPOLOGIA BDGD"
    );

    console.log(
      "=================================================="
    );

    try {

      const novaTopologia =
        criarTopologiaBDGD(
          ssdmt,
          ponnot
        );

      if (!novaTopologia) {

        console.error(
          "❌ A função criarTopologiaBDGD não retornou uma topologia."
        );

        setTopologia(null);

        return;
      }

      setTopologia(
        novaTopologia
      );

      console.log(
        "=================================================="
      );

      console.log(
        "🧠 TOPOLOGIA BDGD DISPONÍVEL"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "⚡ Alimentador:",
        novaTopologia.alimentador
      );

      console.log(
        "🔢 Circuito:",
        novaTopologia.circuito
      );

      console.log(
        "🏭 Subestação:",
        novaTopologia.subestacao
      );

      console.log(
        "📍 Pontos:",
        novaTopologia.resumo?.pontos
      );

      console.log(
        "🔵 Trechos:",
        novaTopologia.resumo?.trechos
      );

      console.log(
        "🔗 Terminais:",
        novaTopologia.resumo?.terminais
      );

      console.log(
        "➡️ Passagens:",
        novaTopologia.resumo?.passagens
      );

      console.log(
        "🔀 Derivações:",
        novaTopologia.resumo?.derivacoes
      );

      console.log(
        "⚠️ Problemas:",
        novaTopologia.resumo?.problemas
      );

      console.log(
        "⭕ Pontos isolados:",
        novaTopologia.resumo?.pontosIsolados
      );

      console.log(
        "❌ Trechos inválidos:",
        novaTopologia.resumo?.trechosInvalidos
      );

      // ====================================================
      // INTEGRIDADE
      // ====================================================

      if (
        novaTopologia.resumo?.problemas === 0 &&
        novaTopologia.resumo?.trechosInvalidos === 0
      ) {

        console.log(
          "✅ TOPOLOGIA SEM PROBLEMAS DE INTEGRIDADE"
        );

      } else {

        console.warn(
          "⚠️ TOPOLOGIA POSSUI PROBLEMAS"
        );
      }

      // ====================================================
      // TESTE DE CONECTIVIDADE
      // ====================================================

      const idsPontos =
        Object.keys(
          novaTopologia.pontos || {}
        );

      const idsTrechos =
        Object.keys(
          novaTopologia.trechos || {}
        );

      console.log(
        "=================================================="
      );

      console.log(
        "🧪 TESTE REAL DE CONECTIVIDADE"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "📍 Quantidade de pontos:",
        idsPontos.length
      );

      console.log(
        "🔵 Quantidade de trechos:",
        idsTrechos.length
      );

      // ====================================================
      // PRIMEIRO PONTO
      // ====================================================

      const primeiroPonto =
        idsPontos[0];

      if (primeiroPonto) {

        console.log(
          "----------------------------------------------"
        );

        console.log(
          "📍 PRIMEIRO PONTO:",
          primeiroPonto
        );

        console.log(
          "Dados:",
          buscarPonto(
            novaTopologia,
            primeiroPonto
          )
        );

        console.log(
          "Conexões:",
          buscarConexoes(
            novaTopologia,
            primeiroPonto
          )
        );
      }

      // ====================================================
      // PRIMEIRO TRECHO
      // ====================================================

      const primeiroTrecho =
        idsTrechos[0];

      if (primeiroTrecho) {

        console.log(
          "----------------------------------------------"
        );

        console.log(
          "🔵 PRIMEIRO TRECHO:",
          primeiroTrecho
        );

        console.log(
          "Dados:",
          buscarTrechoBDGD(
            novaTopologia,
            primeiroTrecho
          )
        );
      }

      // ====================================================
      // TRECHO REAL 941527
      // ====================================================

      const trechoTeste =
        buscarTrechoBDGD(
          novaTopologia,
          ID_TRECHO_TESTE
        );

      if (trechoTeste) {

        console.log(
          "=================================================="
        );

        console.log(
          `🎯 TESTE DO TRECHO REAL ${ID_TRECHO_TESTE}`
        );

        console.log(
          "=================================================="
        );

        console.log(
          "Trecho:",
          trechoTeste
        );

        console.log(
          "PN_CON_1:",
          trechoTeste.pontoInicial
        );

        console.log(
          "PN_CON_2:",
          trechoTeste.pontoFinal
        );

        console.log(
          "Ponto inicial:",
          buscarPonto(
            novaTopologia,
            trechoTeste.pontoInicial
          )
        );

        console.log(
          "Ponto final:",
          buscarPonto(
            novaTopologia,
            trechoTeste.pontoFinal
          )
        );

        console.log(
          "Conexões inicial:",
          buscarConexoes(
            novaTopologia,
            trechoTeste.pontoInicial
          )
        );

        console.log(
          "Conexões final:",
          buscarConexoes(
            novaTopologia,
            trechoTeste.pontoFinal
          )
        );

      } else {

        console.warn(
          `⚠️ Trecho ${ID_TRECHO_TESTE} não encontrado.`
        );
      }

      // ====================================================
      // AMOSTRA DOS TRECHOS
      // ====================================================

      console.log(
        "=================================================="
      );

      console.log(
        "🔎 AMOSTRA DOS PRIMEIROS 10 TRECHOS"
      );

      console.log(
        "=================================================="
      );

      idsTrechos
        .slice(0, 10)
        .forEach(
          (
            id,
            indice
          ) => {

            const trecho =
              novaTopologia.trechos[id];

            if (!trecho) {
              return;
            }

            console.log(
              `${indice + 1}.`,
              {
                id: trecho.id,
                pontoInicial:
                  trecho.pontoInicial,
                pontoFinal:
                  trecho.pontoFinal,
                alimentador:
                  trecho.alimentador,
                circuito:
                  trecho.circuito,
                comprimento:
                  trecho.comprimento,
              }
            );
          }
        );

    } catch (error) {

      console.error(
        "❌ Erro ao criar topologia BDGD:",
        error
      );

      setTopologia(null);
    }

  }, [
    ssdmt,
    ponnot,
  ]);

  // ========================================================
  // TESTAR NAVEGAÇÃO DA REDE
  // ========================================================

  useEffect(() => {

    if (!topologia) {
      return;
    }

    console.log(
      "=================================================="
    );

    console.log(
      "🧭 TESTE DO NAVEGADOR DA REDE"
    );

    console.log(
      "=================================================="
    );

    let origem =
      normalizarId(
        ID_ORIGEM_TESTE
      );

    if (
      !topologia.pontos?.[origem]
    ) {

      origem =
        Object.keys(
          topologia.pontos || {}
        )[0];
    }

    if (!origem) {

      console.warn(
        "⚠️ Nenhum ponto disponível para navegação."
      );

      return;
    }

    console.log(
      "📍 Origem utilizada na navegação:",
      origem
    );

    console.log(
      "📍 Dados da origem:",
      buscarPonto(
        topologia,
        origem
      )
    );

    const rede =
      buscarRedeAJusante(
        topologia,
        origem
      );

    setRedeJusante(
      rede
    );

    console.log(
      "=================================================="
    );

    console.log(
      "⚡ RESULTADO DA NAVEGAÇÃO A JUSANTE"
    );

    console.log(
      "=================================================="
    );

    console.log(
      "📍 Ponto inicial:",
      origem
    );

    console.log(
      "📍 Pontos encontrados:",
      rede?.quantidadePontos
    );

    console.log(
      "🔵 Trechos encontrados:",
      rede?.quantidadeTrechos
    );

    console.log(
      "🔗 Terminais encontrados:",
      rede?.quantidadeTerminais
    );

    console.log(
      "🔀 Derivações encontradas:",
      rede?.quantidadeDerivacoes
    );

    console.log(
      "📦 Rede completa:",
      rede
    );

    let destino =
      normalizarId(
        ID_DESTINO_TESTE
      );

    if (
      !topologia.pontos?.[destino]
    ) {

      const ids =
        Object.keys(
          topologia.pontos || {}
        );

      destino =
        ids.find(
          (id) =>
            id !== origem
        );
    }

    if (
      destino &&
      destino !== origem
    ) {

      const caminho =
        buscarCaminho(
          topologia,
          origem,
          destino
        );

      setCaminhoEletrico(
        caminho
      );

      console.log(
        "=================================================="
      );

      console.log(
        "🛣️ TESTE DE CAMINHO"
      );

      console.log(
        "=================================================="
      );

      console.log(
        "Origem:",
        origem
      );

      console.log(
        "Destino:",
        destino
      );

      console.log(
        "Resultado:",
        caminho
      );
    }

  }, [
    topologia,
  ]);

  // ========================================================
  // ANALISAR ELEMENTO SELECIONADO
  // ========================================================

  function analisarElementoSelecionado() {

    if (
      !topologia ||
      !elementoSelecionado
    ) {
      return;
    }

    console.log(
      "=================================================="
    );

    console.log(
      "🔎 ANALISANDO ELEMENTO SELECIONADO"
    );

    console.log(
      "=================================================="
    );

    let pontoOrigem = null;

    // ------------------------------------------------------
    // TRECHO
    // ------------------------------------------------------

    if (
      elementoSelecionado.tipo ===
      "TRECHO"
    ) {

      const trecho =
        buscarTrechoBDGD(
          topologia,
          elementoSelecionado.id
        );

      if (!trecho) {

        console.warn(
          "⚠️ Trecho não encontrado na topologia."
        );

        return;
      }

      pontoOrigem =
        normalizarId(
          trecho.pontoFinal
        );

      console.log(
        "🔵 Trecho selecionado:",
        trecho
      );

      console.log(
        "📍 Ponto utilizado como origem:",
        pontoOrigem
      );
    }

    // ------------------------------------------------------
    // PONTO
    // ------------------------------------------------------

    if (
      elementoSelecionado.tipo ===
      "PONTO"
    ) {

      pontoOrigem =
        normalizarId(
          elementoSelecionado.id
        );

      console.log(
        "📍 Ponto selecionado:",
        pontoOrigem
      );
    }

    if (!pontoOrigem) {

      console.warn(
        "⚠️ Não foi possível determinar o ponto de origem."
      );

      return;
    }

    const ponto =
      buscarPonto(
        topologia,
        pontoOrigem
      );

    if (!ponto) {

      console.warn(
        "⚠️ Ponto de origem não encontrado."
      );

      return;
    }

    const rede =
      buscarRedeAJusante(
        topologia,
        pontoOrigem
      );

    setRedeJusante(
      rede
    );

    console.log(
      "🧭 Rede a jusante encontrada:",
      rede
    );

    setCaminhoEletrico(null);
  }

  // ========================================================
  // LIMPAR ANÁLISE
  // ========================================================

  function limparAnalise() {

    console.log(
      "🧹 Limpando análise operacional."
    );

    setElementoSelecionado(null);

    setRedeJusante(null);

    setCaminhoEletrico(null);
  }

  // ========================================================
  // POPUP SSDMT
  // ========================================================

  function criarPopupSSDMT(feature) {

    const p =
      feature?.properties || {};

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
          ${p.CT_COD_OP ?? "-"}
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
  // ESTILO SSDMT
  // ========================================================

  function estiloSSDMT() {

    return {
      color: "#1565c0",
      weight: 3,
      opacity: 0.85,
      lineCap: "round",
      lineJoin: "round",
    };
  }

  // ========================================================
  // EVENTOS SSDMT
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

      mouseover: (evento) => {

        evento.target.setStyle({
          weight: 6,
          opacity: 1,
        });

        evento.target.bringToFront();
      },

      mouseout: (evento) => {

        evento.target.setStyle({
          weight: 3,
          opacity: 0.85,
        });
      },

      click: () => {

        const propriedades =
          feature?.properties || {};

        const trechoId =
          normalizarId(
            propriedades.COD_ID
          );

        console.log(
          "🗺️ TRECHO SSDMT SELECIONADO"
        );

        console.log(
          "ID:",
          trechoId
        );

        console.log(
          "Propriedades:",
          propriedades
        );

        if (
          topologia &&
          trechoId
        ) {

          const trecho =
            buscarTrechoBDGD(
              topologia,
              trechoId
            );

          console.log(
            "🧠 Trecho na topologia:",
            trecho
          );

          if (trecho) {

            console.log(
              "📍 Ponto inicial:",
              buscarPonto(
                topologia,
                trecho.pontoInicial
              )
            );

            console.log(
              "📍 Ponto final:",
              buscarPonto(
                topologia,
                trecho.pontoFinal
              )
            );

            console.log(
              "🔗 Conexões ponto inicial:",
              buscarConexoes(
                topologia,
                trecho.pontoInicial
              )
            );

            console.log(
              "🔗 Conexões ponto final:",
              buscarConexoes(
                topologia,
                trecho.pontoFinal
              )
            );
          }
        }

        setElementoSelecionado({
          tipo: "TRECHO",
          id: trechoId,
          propriedades,
        });

        setRedeJusante(null);

        setCaminhoEletrico(null);
      },
    });
  }

  // ========================================================
  // COORDENADAS DE UM PONTO
  // ========================================================

  function obterCoordenadasPonto(id) {

    if (
      !topologia ||
      !id
    ) {
      return null;
    }

    const ponto =
      buscarPonto(
        topologia,
        id
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
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return [
      latitude,
      longitude,
    ];
  }

  // ========================================================
  // DESENHAR REDE A JUSANTE
  // ========================================================

  function renderizarRedeJusante() {

    if (
      !redeJusante ||
      !Array.isArray(
        redeJusante.trechos
      )
    ) {
      return null;
    }

    return redeJusante.trechos.map(
      (trechoId) => {

        const trecho =
          buscarTrechoBDGD(
            topologia,
            trechoId
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

        return (
          <Polyline
            key={`jusante-${trechoId}`}
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color: "#00e676",
              weight: 5,
              opacity: 0.9,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // DESENHAR CAMINHO ELÉTRICO
  // ========================================================

  function renderizarCaminho() {

    if (
      !caminhoEletrico ||
      !Array.isArray(
        caminhoEletrico.trechos
      )
    ) {
      return null;
    }

    return caminhoEletrico.trechos.map(
      (trechoId) => {

        const trecho =
          buscarTrechoBDGD(
            topologia,
            trechoId
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

        return (
          <Polyline
            key={`caminho-${trechoId}`}
            positions={[
              inicio,
              fim,
            ]}
            pathOptions={{
              color: "#ff1744",
              weight: 8,
              opacity: 1,
            }}
          />
        );
      }
    );
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <>

      {/* ==================================================
          STATUS SSDMT
      ================================================== */}

      {carregandoSsdmt && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            background: "#0b131d",
            color: "#38bdf8",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          🔵 Carregando SSDMT...
        </div>
      )}

      {/* ==================================================
          ERRO SSDMT
      ================================================== */}

      {erroSsdmt && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            background: "#3b1111",
            color: "#ff6b6b",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 400,
          }}
        >
          ❌ Erro SSDMT:
          <br />
          {erroSsdmt}
        </div>
      )}

      {/* ==================================================
          STATUS PONNOT
      ================================================== */}

      {carregandoPonnot && (
        <div
          style={{
            position: "absolute",
            top: 45,
            left: 10,
            zIndex: 1000,
            background: "#0b131d",
            color: "#ff9800",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          🟢 Carregando PONNOT...
        </div>
      )}

      {/* ==================================================
          ERRO PONNOT
      ================================================== */}

      {erroPonnot && (
        <div
          style={{
            position: "absolute",
            top: 45,
            left: 10,
            zIndex: 1000,
            background: "#3b1111",
            color: "#ff9800",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 400,
          }}
        >
          ❌ Erro PONNOT:
          <br />
          {erroPonnot}
        </div>
      )}

      {/* ==================================================
          PAINEL OPERACIONAL
      ================================================== */}

      {elementoSelecionado && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 2000,
            width: 330,
            maxHeight:
              "calc(100vh - 40px)",
            overflowY: "auto",
            background: "#0b131d",
            color: "#e5e7eb",
            border: "1px solid #263241",
            borderRadius: 10,
            boxShadow:
              "0 10px 35px rgba(0,0,0,0.45)",
            fontFamily:
              "Arial, sans-serif",
          }}
        >

          {/* CABEÇALHO */}

          <div
            style={{
              padding: "14px 16px",
              borderBottom:
                "1px solid #263241",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >

            <div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color:
                    elementoSelecionado.tipo ===
                    "TRECHO"
                      ? "#38bdf8"
                      : "#ff9800",
                }}
              >
                {elementoSelecionado.tipo ===
                "TRECHO"
                  ? "⚡ Trecho selecionado"
                  : "📍 Ponto selecionado"}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                ID:{" "}
                {elementoSelecionado.id ??
                  "-"}
              </div>

            </div>

            <button
              onClick={limparAnalise}
              style={{
                border: "none",
                background:
                  "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 18,
              }}
              title="Fechar"
            >
              ✕
            </button>

          </div>

          {/* DADOS */}

          <div
            style={{
              padding: 16,
            }}
          >

            <div
              style={{
                fontSize: 13,
                fontWeight: "bold",
                color: "#f8fafc",
                marginBottom: 10,
              }}
            >
              INFORMAÇÕES
            </div>

            {elementoSelecionado.tipo ===
              "TRECHO" && (
              <>
                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Alimentador:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.CT_COD_OP ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    COD_ID:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.COD_ID ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Condutor:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.TIP_CND ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Fases:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.FAS_CON ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Comprimento:
                  </strong>{" "}
                  {formatarNumero(
                    elementoSelecionado
                      .propriedades
                      ?.COMP,
                    2
                  )}{" "}
                  m
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Situação:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.SITCONT ?? "-"}
                </div>
              </>
            )}

            {elementoSelecionado.tipo ===
              "PONTO" && (
              <>
                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Tipo:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.TIP_INST ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Estrutura:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.ESTR ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Material:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.MAT ?? "-"}
                </div>

                <div style={{ marginBottom: 7 }}>
                  <strong>
                    Situação:
                  </strong>{" "}
                  {elementoSelecionado
                    .propriedades
                    ?.SITCONT ?? "-"}
                </div>
              </>
            )}

            {/* =================================================
                CONECTIVIDADE
            ================================================= */}

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop:
                  "1px solid #263241",
              }}
            >

              <div
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#f8fafc",
                  marginBottom: 10,
                }}
              >
                🔗 CONECTIVIDADE
              </div>

              {(() => {

                let pontoId =
                  elementoSelecionado.id;

                if (
                  elementoSelecionado.tipo ===
                  "TRECHO"
                ) {

                  const trecho =
                    buscarTrechoBDGD(
                      topologia,
                      elementoSelecionado.id
                    );

                  pontoId =
                    trecho?.pontoFinal;
                }

                const conexoes =
                  pontoId
                    ? buscarConexoes(
                        topologia,
                        pontoId
                      )
                    : null;

                const quantidade =
                  Array.isArray(conexoes)
                    ? conexoes.length
                    : conexoes?.length ??
                      conexoes?.trechos
                        ?.length ??
                      0;

                return (
                  <>
                    <div
                      style={{
                        marginBottom: 7,
                      }}
                    >
                      <strong>
                        Ponto de análise:
                      </strong>{" "}
                      {pontoId ?? "-"}
                    </div>

                    <div>
                      <strong>
                        Conexões:
                      </strong>{" "}
                      {quantidade}
                    </div>
                  </>
                );

              })()}

            </div>

            {/* =================================================
                ANÁLISE DA REDE
            ================================================= */}

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop:
                  "1px solid #263241",
              }}
            >

              <div
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#f8fafc",
                  marginBottom: 10,
                }}
              >
                🧭 ANÁLISE DA REDE
              </div>

              {!redeJusante ? (

                <button
                  onClick={
                    analisarElementoSelecionado
                  }
                  disabled={!topologia}
                  style={{
                    width: "100%",
                    padding:
                      "10px 12px",
                    border: "none",
                    borderRadius: 6,
                    background:
                      "#0284c7",
                    color: "#ffffff",
                    cursor:
                      topologia
                        ? "pointer"
                        : "not-allowed",
                    fontWeight:
                      "bold",
                  }}
                >
                  🔎 Analisar rede a jusante
                </button>

              ) : (

                <>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 8,
                    }}
                  >

                    <div
                      style={{
                        background:
                          "#111c29",
                        border:
                          "1px solid #263241",
                        borderRadius: 6,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        PONTOS
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 20,
                          fontWeight:
                            "bold",
                          color:
                            "#38bdf8",
                        }}
                      >
                        {redeJusante
                          ?.quantidadePontos ??
                          0}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#111c29",
                        border:
                          "1px solid #263241",
                        borderRadius: 6,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        TRECHOS
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 20,
                          fontWeight:
                            "bold",
                          color:
                            "#00e676",
                        }}
                      >
                        {redeJusante
                          ?.quantidadeTrechos ??
                          0}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#111c29",
                        border:
                          "1px solid #263241",
                        borderRadius: 6,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        TERMINAIS
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 20,
                          fontWeight:
                            "bold",
                          color:
                            "#f59e0b",
                        }}
                      >
                        {redeJusante
                          ?.quantidadeTerminais ??
                          0}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#111c29",
                        border:
                          "1px solid #263241",
                        borderRadius: 6,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        DERIVAÇÕES
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 20,
                          fontWeight:
                            "bold",
                          color:
                            "#c084fc",
                        }}
                      >
                        {redeJusante
                          ?.quantidadeDerivacoes ??
                          0}
                      </div>
                    </div>

                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background:
                        "#082015",
                      border:
                        "1px solid #14532d",
                      borderRadius: 6,
                      color:
                        "#86efac",
                      fontSize: 12,
                    }}
                  >
                    🟢 Rede a jusante
                    destacada no mapa.
                  </div>

                  <button
                    onClick={() =>
                      setRedeJusante(null)
                    }
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding:
                        "9px 12px",
                      border:
                        "1px solid #475569",
                      borderRadius: 6,
                      background:
                        "#111827",
                      color:
                        "#e5e7eb",
                      cursor:
                        "pointer",
                    }}
                  >
                    Limpar destaque
                  </button>

                </>
              )}

            </div>

            {/* =================================================
                LIMPAR
            ================================================= */}

            <button
              onClick={limparAnalise}
              style={{
                width: "100%",
                marginTop: 14,
                padding:
                  "9px 12px",
                border:
                  "1px solid #7f1d1d",
                borderRadius: 6,
                background:
                  "#2a1010",
                color:
                  "#fca5a5",
                cursor:
                  "pointer",
              }}
            >
              ✕ Fechar análise
            </button>

          </div>

        </div>
      )}

      {/* ==================================================
          SSDMT
      ================================================== */}

      {ssdmt && (
        <GeoJSON
          key="bdgd-ssdmt"
          data={ssdmt}
          style={estiloSSDMT}
          onEachFeature={
            aoCriarTrecho
          }
        />
      )}

      {/* ==================================================
          PONNOT
      ================================================== */}

      {ponnot?.features?.map(
        (
          feature,
          indice
        ) => {

          const propriedades =
            feature?.properties || {};

          const geometry =
            feature?.geometry;

          if (
            !geometry ||
            geometry.type !== "Point"
          ) {
            return null;
          }

          const coordenadas =
            geometry.coordinates;

          if (
            !Array.isArray(
              coordenadas
            ) ||
            coordenadas.length < 2
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
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null;
          }

          const id =
            normalizarId(
              propriedades.COD_ID
            ) ||
            `ponnot-${indice}`;

          return (
            <CircleMarker
              key={`ponnot-${id}-${indice}`}
              center={[
                latitude,
                longitude,
              ]}
              radius={5}
              pathOptions={{
                color: "#ffffff",
                weight: 1,
                fillColor: "#ff9800",
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => {

                  console.log(
                    "📍 PONTO PONNOT SELECIONADO:",
                    propriedades
                  );

                  const pontoId =
                    normalizarId(
                      propriedades.COD_ID
                    );

                  if (topologia) {

                    console.log(
                      "🧠 Ponto na topologia:",
                      buscarPonto(
                        topologia,
                        pontoId
                      )
                    );

                    console.log(
                      "🔗 Conexões:",
                      buscarConexoes(
                        topologia,
                        pontoId
                      )
                    );
                  }

                  setElementoSelecionado({
                    tipo: "PONTO",
                    id: pontoId,
                    propriedades,
                  });

                  setRedeJusante(null);

                  setCaminhoEletrico(null);
                },
              }}
            >

              <Popup>

                <div
                  style={{
                    minWidth: 220,
                    fontFamily:
                      "Arial, sans-serif",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 8,
                      color: "#ef6c00",
                    }}
                  >
                    📍 Ponto PONNOT
                  </div>

                  <div>
                    <strong>
                      COD_ID:
                    </strong>{" "}
                    {propriedades.COD_ID ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Tipo:
                    </strong>{" "}
                    {propriedades.TIP_INST ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Posição:
                    </strong>{" "}
                    {propriedades.POS ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Estrutura:
                    </strong>{" "}
                    {propriedades.ESTR ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Material:
                    </strong>{" "}
                    {propriedades.MAT ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Condutor:
                    </strong>{" "}
                    {propriedades.ESF ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Situação:
                    </strong>{" "}
                    {propriedades.SITCONT ??
                      "-"}
                  </div>

                  <hr />

                  <div>
                    <strong>
                      Latitude:
                    </strong>{" "}
                    {latitude.toFixed(7)}
                  </div>

                  <div>
                    <strong>
                      Longitude:
                    </strong>{" "}
                    {longitude.toFixed(7)}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#666",
                    }}
                  >
                    BDGD • CMG01C4
                  </div>

                </div>

              </Popup>

            </CircleMarker>
          );
        }
      )}

      {/* ==================================================
          REDE A JUSANTE
      ================================================== */}

      {topologia &&
        redeJusante &&
        renderizarRedeJusante()}

      {/* ==================================================
          CAMINHO ELÉTRICO
      ================================================== */}

      {topologia &&
        caminhoEletrico &&
        renderizarCaminho()}

    </>
  );
}