// ==========================================================
// MODELO DE TOPOLOGIA BDGD
// POWER GRID MONITOR
// ==========================================================
//
// SSDMT    -> trechos da rede MT
// PONNOT   -> pontos/conexões
// UNSEMT   -> unidades de manobra
// EQSE     -> complemento das UNSEMT
// UNTRMT   -> transformadores MT
// EQTRMT   -> complemento dos transformadores MT
// UNTRAT   -> transformadores AT
// EQTRAT   -> complemento dos transformadores AT
//
// ==========================================================
// CLASSIFICAÇÃO OFICIAL
// ==========================================================
//
// UNSEMT.TIP_UNID
//
// 19 -> CHAVE_LAMINA
// 22 -> CHAVE_FUSIVEL
// 32 -> RELIGADOR
// 34 -> CHAVE_SECCIONADORA
//
// UNTRMT / UNTRAT
//
// 38 -> TRANSFORMADOR
//
// ==========================================================


// ==========================================================
// NORMALIZAÇÃO DE ID
// ==========================================================

function normalizarId(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const valorNormalizado = String(valor).trim();

  return valorNormalizado || null;
}


// ==========================================================
// NORMALIZAÇÃO DE NÚMERO
// ==========================================================

function normalizarNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    typeof valor === "string"
      ? Number(
          valor
            .trim()
            .replace(",", ".")
        )
      : Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


// ==========================================================
// NORMALIZAÇÃO DE TEXTO
// ==========================================================

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase();
}


// ==========================================================
// CHAVE DE COMPARAÇÃO
// ==========================================================

function criarChaveComparacao(valor) {
  return normalizarTexto(
    normalizarId(valor)
  );
}


// ==========================================================
// NORMALIZAÇÃO DO PONTO ASSOCIADO
// ==========================================================

function normalizarIdPontoAssociado(valor) {
  const id = normalizarId(valor);

  if (!id) {
    return null;
  }

  const match = id.match(
    /^(.*?)M(?:-[^-\s]+)?$/i
  );

  if (match?.[1]) {
    return normalizarId(match[1]);
  }

  return id;
}


// ==========================================================
// PRIMEIRO VALOR VÁLIDO
// ==========================================================

function obterPrimeiroValor(
  objeto,
  campos = []
) {
  if (
    !objeto ||
    typeof objeto !== "object"
  ) {
    return null;
  }

  for (const campo of campos) {
    const valor = objeto[campo];

    if (
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ""
    ) {
      return valor;
    }
  }

  return null;
}


// ==========================================================
// EXTRAIR PROPRIEDADES
// ==========================================================

function extrairPropriedades(item) {
  if (!item) {
    return {};
  }

  if (
    item.properties &&
    typeof item.properties === "object"
  ) {
    return item.properties;
  }

  if (
    item.propriedades &&
    typeof item.propriedades === "object"
  ) {
    return item.propriedades;
  }

  return item;
}


// ==========================================================
// VALOR ROBUSTO
// ==========================================================

function valorCampo(
  item,
  ...campos
) {
  const propriedades =
    extrairPropriedades(item);

  return (
    obterPrimeiroValor(item, campos) ??
    obterPrimeiroValor(propriedades, campos)
  );
}


// ==========================================================
// CLASSIFICAÇÃO UNSEMT
// ==========================================================

function classificarUnidadeUNSEMT(
  propriedades
) {
  const p =
    extrairPropriedades(propriedades);

  const tipo =
    normalizarTexto(
      obterPrimeiroValor(
        p,
        [
          "TIP_UNID",
          "tipUnid",
          "tipoUnidade"
        ]
      )
    );

  switch (tipo) {
    case "19":
      return "CHAVE_LAMINA";

    case "22":
      return "CHAVE_FUSIVEL";

    case "32":
      return "RELIGADOR";

    case "34":
      return "CHAVE_SECCIONADORA";

    default:
      return "OUTRO";
  }
}


// ==========================================================
// CLASSIFICAÇÃO TRANSFORMADOR
// ==========================================================

function classificarUnidadeTransformador(
  propriedades
) {
  const p =
    extrairPropriedades(propriedades);

  const tipo =
    normalizarTexto(
      obterPrimeiroValor(
        p,
        [
          "TIP_UNID",
          "tipUnid",
          "tipoUnidade"
        ]
      )
    );

  return tipo === "38"
    ? "TRANSFORMADOR"
    : "OUTRO";
}


// ==========================================================
// NOME DO TIPO
// ==========================================================

function obterNomeTipoEquipamento(
  tipo
) {
  switch (
    normalizarTexto(tipo)
  ) {
    case "CHAVE_LAMINA":
      return "Chave lâmina";

    case "CHAVE_FUSIVEL":
      return "Chave fusível";

    case "CHAVE_SECCIONADORA":
      return "Chave seccionadora";

    case "RELIGADOR":
      return "Religador";

    case "TRANSFORMADOR":
      return "Transformador";

    case "REGULADOR":
      return "Regulador de tensão";

    case "CAPACITOR":
      return "Banco de capacitores";

    case "SUBESTACAO":
      return "Subestação";

    default:
      return "Equipamento";
  }
}


// ==========================================================
// ALIMENTADOR
// ==========================================================
//
// Aceita campos diretamente e dentro de properties/
// propriedades.
//
// ==========================================================

function obterAlimentador(
  item
) {
  const p =
    extrairPropriedades(item);

  const valor =
    obterPrimeiroValor(
      item,
      [
        "alimentador",
        "ALIMENTADOR",
        "CT_COD_OP",
        "CT_COD_OPER",
        "CT_COD",
        "CT_CODIGO"
      ]
    ) ??
    obterPrimeiroValor(
      p,
      [
        "alimentador",
        "ALIMENTADOR",
        "CT_COD_OP",
        "CT_COD_OPER",
        "CT_COD",
        "CT_CODIGO"
      ]
    );

  if (valor !== null) {
    return normalizarId(valor);
  }

  return normalizarId(
    obterPrimeiroValor(
      p,
      [
        "CTMT",
        "circuito",
        "CIRCUITO"
      ]
    )
  );
}


// ==========================================================
// CIRCUITO
// ==========================================================

function obterCircuito(
  item
) {
  const p =
    extrairPropriedades(item);

  const valor =
    obterPrimeiroValor(
      item,
      [
        "circuito",
        "CIRCUITO",
        "CTMT"
      ]
    ) ??
    obterPrimeiroValor(
      p,
      [
        "circuito",
        "CIRCUITO",
        "CTMT"
      ]
    );

  return normalizarId(valor);
}


// ==========================================================
// SUBESTAÇÃO
// ==========================================================

function obterSubestacao(
  item
) {
  const p =
    extrairPropriedades(item);

  return normalizarId(
    obterPrimeiroValor(
      item,
      [
        "SUB",
        "SUBESTACAO",
        "SUBESTAÇÃO",
        "subestacao"
      ]
    ) ??
    obterPrimeiroValor(
      p,
      [
        "SUB",
        "SUBESTACAO",
        "SUBESTAÇÃO",
        "subestacao"
      ]
    )
  );
}


// ==========================================================
// CLASSIFICAÇÃO EQSE
// ==========================================================

function classificarEquipamentoEQSE(
  equipamento
) {
  const p =
    extrairPropriedades(equipamento);

  const tipInst =
    normalizarTexto(
      obterPrimeiroValor(
        p,
        [
          "TIP_INST",
          "tipInst"
        ]
      )
    );

  const descricao =
    normalizarTexto(
      obterPrimeiroValor(
        p,
        [
          "DESCR",
          "descricao"
        ]
      )
    );

  const texto =
    `${tipInst} ${descricao}`;

  if (
    texto.includes("TRANSFORMADOR") ||
    texto.includes("TRAFO")
  ) {
    return "TRANSFORMADOR";
  }

  if (
    texto.includes("REGULADOR")
  ) {
    return "REGULADOR";
  }

  if (
    texto.includes("CAPACITOR")
  ) {
    return "CAPACITOR";
  }

  if (
    texto.includes("RELIGADOR") ||
    texto.includes("RECLOSER")
  ) {
    return "RELIGADOR";
  }

  if (
    texto.includes("SECCIONADORA")
  ) {
    return "CHAVE_SECCIONADORA";
  }

  if (
    texto.includes("FUSIVEL") ||
    texto.includes("FUSÍVEL")
  ) {
    return "CHAVE_FUSIVEL";
  }

  if (
    texto.includes("LAMINA") ||
    texto.includes("LÂMINA") ||
    texto.includes("FACA")
  ) {
    return "CHAVE_LAMINA";
  }

  return "EQUIPAMENTO";
}


// ==========================================================
// MAPA EQSE
// ==========================================================

function criarMapaEquipamentosEQSE(
  eqse
) {
  const equipamentos = {};
  const porUnidade = {};

  for (
    const feature of
      eqse?.features || []
  ) {
    const p =
      feature?.properties || {};

    const id =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "COD_ID",
            "ID",
            "COD_EQUIP"
          ]
        )
      );

    const unidadeId =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "UN_SE",
            "UNSE",
            "UN_SE_ID",
            "COD_UN",
            "COD_UNIDADE"
          ]
        )
      );

    if (!id) {
      continue;
    }

    const equipamento = {
      id,

      unidadeId,

      codId: id,

      unSe: unidadeId,

      origem: "EQSE",

      tipo:
        classificarEquipamentoEQSE(p),

      tipoInstalacao:
        normalizarId(
          p.TIP_INST
        ),

      tipoOriginal:
        normalizarId(
          p.TIP_INST
        ),

      tipInst:
        normalizarId(
          p.TIP_INST
        ),

      tuc:
        normalizarId(
          p.TUC
        ),

      ti:
        normalizarId(
          p.TI
        ),

      cm:
        normalizarId(
          p.CM
        ),

      uar:
        normalizarId(
          p.UAR
        ),

      fases:
        normalizarId(
          p.FAS_CON
        ),

      classeTensao:
        normalizarId(
          p.CLAS_TEN
        ),

      grupoTensao:
        normalizarId(
          p.GRU_TEN
        ),

      corNominal:
        normalizarId(
          p.COR_NOM
        ),

      eloFSV:
        normalizarId(
          p.ELO_FSV
        ),

      situacao:
        normalizarId(
          p.SITCONT ??
          p.SIT_ATIV
        ),

      aberturaCarga:
        normalizarNumero(
          p.ABER_CRG
        ),

      dataImobilizacao:
        normalizarId(
          p.DAT_IMO
        ),

      descricao:
        obterPrimeiroValor(
          p,
          [
            "DESCR",
            "TIP_INST",
            "TUC"
          ]
        ),

      alimentador:
        obterAlimentador(p),

      circuito:
        obterCircuito(p),

      subestacao:
        obterSubestacao(p),

      propriedades: {
        ...p
      },

      feature
    };

    equipamentos[id] =
      equipamento;

    if (!unidadeId) {
      continue;
    }

    if (!porUnidade[unidadeId]) {
      porUnidade[unidadeId] = [];
    }

    porUnidade[unidadeId].push(
      equipamento
    );
  }

  return {
    equipamentos,
    porUnidade
  };
}


// ==========================================================
// MAPA UNSEMT
// ==========================================================

function criarMapaUnidadesSeccionadoras(
  unsemt,
  pontos
) {
  const unidades = {};

  for (
    const feature of
      unsemt?.features || []
  ) {
    const p =
      feature?.properties || {};

    const id =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "COD_ID",
            "ID",
            "PQT"
          ]
        )
      );

    if (!id) {
      continue;
    }

    const pac1Original =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "PAC_1",
            "PAC1"
          ]
        )
      );

    const pac2Original =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "PAC_2",
            "PAC2"
          ]
        )
      );

    const pac1 =
      normalizarIdPontoAssociado(
        pac1Original
      );

    const pac2 =
      normalizarIdPontoAssociado(
        pac2Original
      );

    const ponto1 =
      pac1
        ? pontos?.[pac1]
        : null;

    const ponto2 =
      pac2
        ? pontos?.[pac2]
        : null;

    const geometry =
      feature?.geometry;

    let latitude = null;
    let longitude = null;

    if (
      geometry?.type === "Point" &&
      Array.isArray(
        geometry.coordinates
      )
    ) {
      longitude =
        normalizarNumero(
          geometry.coordinates[0]
        );

      latitude =
        normalizarNumero(
          geometry.coordinates[1]
        );
    }

    const tipoEquipamento =
      classificarUnidadeUNSEMT(p);

    const alimentador =
      obterAlimentador(p);

    const circuito =
      obterCircuito(p);

    const subestacao =
      obterSubestacao(p);

    unidades[id] = {
      id,

      codigo:
        id,

      pqt:
        id,

      pac1Original,
      pac2Original,

      pac1,
      pac2,

      ponto1,
      ponto2,

      pontoAssociado:
        ponto1
          ? pac1
          : ponto2
          ? pac2
          : pac1 || pac2,

      latitude,
      longitude,

      tipoUnidade:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "TIP_UNID",
              "tipUnid",
              "tipoUnidade"
            ]
          )
        ),

      tipoEquipamento,

      nomeTipoEquipamento:
        obterNomeTipoEquipamento(
          tipoEquipamento
        ),

      descricao:
        p.DESCR ??
        p.descricao ??
        null,

      fases:
        p.FAS_CON ??
        p.fases ??
        null,

      situacao:
        p.SIT_ATIV ??
        p.SITCONT ??
        p.situacao ??
        null,

      pontoOperacao:
        p.P_N_OPE ??
        p.pontoOperacao ??
        null,

      capacidadeElo:
        p.CAP_ELO ??
        p.capacidadeElo ??
        null,

      corNominal:
        p.COR_NOM ??
        p.corNominal ??
        null,

      tlcd:
        normalizarNumero(
          p.TLCD ??
          p.tlcd
        ),

      telecomandado:
        normalizarNumero(
          p.TLCD ??
          p.tlcd
        ),

      dataConexao:
        p.DAT_CON ??
        p.dataConexao ??
        null,

      posicao:
        p.POS ??
        p.posicao ??
        null,

      alimentador,

      circuito,

      subestacao,

      propriedades: {
        ...p
      },

      feature,

      geometria:
        geometry ?? null,

      equipamentos: [],

      quantidadeEquipamentos:
        0,

      temEquipamento:
        false,

      equipamentoPrincipal:
        tipoEquipamento !== "OUTRO"
          ? tipoEquipamento
          : null,

      tiposEquipamentos:
        tipoEquipamento !== "OUTRO"
          ? [tipoEquipamento]
          : [],

      tipoVisual:
        tipoEquipamento
    };
  }

  return unidades;
}


// ==========================================================
// ASSOCIAR EQSE À UNSEMT
// ==========================================================

function associarEquipamentosAsUnidades(
  unidades,
  porUnidade
) {
  for (
    const unidade of
      Object.values(
        unidades || {}
      )
  ) {
    const associados =
      porUnidade?.[unidade.id] || [];

    unidade.equipamentos =
      associados;

    unidade.quantidadeEquipamentos =
      associados.length;

    unidade.temEquipamento =
      associados.length > 0;

    const tipoUNSEMT =
      unidade.tipoEquipamento;

    if (
      tipoUNSEMT &&
      tipoUNSEMT !== "OUTRO"
    ) {
      unidade.equipamentoPrincipal =
        tipoUNSEMT;

      unidade.tiposEquipamentos =
        [tipoUNSEMT];

      unidade.tipoVisual =
        tipoUNSEMT;

      continue;
    }

    const tipos = [
      ...new Set(
        associados
          .map(
            item =>
              item?.tipo
          )
          .filter(Boolean)
      )
    ];

    unidade.tiposEquipamentos =
      tipos;

    unidade.equipamentoPrincipal =
      tipos[0] || null;

    unidade.tipoVisual =
      tipos[0] || "OUTRO";
  }

  return unidades;
}


// ==========================================================
// SEPARAR ARQUIVO COMBINADO
// ==========================================================

function separarEquipamentosCombinados(
  geojson
) {
  const unsemt = [];
  const untrmt = [];

  for (
    const feature of
      geojson?.features || []
  ) {
    const p =
      feature?.properties || {};

    const tipo =
      normalizarTexto(
        p.tipoEquipamento
      );

    const tipoUnidade =
      normalizarTexto(
        p.TIP_UNID ??
        p.tipoUnidade
      );

    if (
      tipo === "TRANSFORMADOR" ||
      tipoUnidade === "38"
    ) {
      untrmt.push(feature);
      continue;
    }

    if (
      tipo === "CHAVE_LAMINA" ||
      tipo === "CHAVE_FUSIVEL" ||
      tipo === "CHAVE_SECCIONADORA" ||
      tipo === "RELIGADOR" ||
      [
        "19",
        "22",
        "32",
        "34"
      ].includes(tipoUnidade)
    ) {
      unsemt.push(feature);
    }
  }

  return {
    unsemt: {
      type: "FeatureCollection",
      features: unsemt
    },

    untrmt: {
      type: "FeatureCollection",
      features: untrmt
    }
  };
}


// ==========================================================
// MAPA DE TRANSFORMADORES
// ==========================================================

function criarMapaUnidadesTransformadores(
  unidadesTransformadores,
  pontos,
  origem = "UNTRMT"
) {
  const unidades = {};

  for (
    const feature of
      unidadesTransformadores?.features ||
      []
  ) {
    const p =
      feature?.properties || {};

    const id =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "COD_ID",
            "untrmtId",
            "UNTR_ID",
            "ID"
          ]
        )
      );

    if (!id) {
      continue;
    }

    if (
      classificarUnidadeTransformador(p) !==
      "TRANSFORMADOR"
    ) {
      continue;
    }

    const geometry =
      feature?.geometry;

    let latitude = null;
    let longitude = null;

    if (
      geometry?.type === "Point" &&
      Array.isArray(
        geometry.coordinates
      )
    ) {
      longitude =
        normalizarNumero(
          geometry.coordinates[0]
        );

      latitude =
        normalizarNumero(
          geometry.coordinates[1]
        );
    }

    const pac1Original =
      normalizarId(
        p.PAC_1 ??
        p.pac1Original ??
        p.pac1
      );

    const pac2Original =
      normalizarId(
        p.PAC_2 ??
        p.pac2Original ??
        p.pac2
      );

    const pac1 =
      normalizarIdPontoAssociado(
        pac1Original
      );

    const pac2 =
      normalizarIdPontoAssociado(
        pac2Original
      );

    const ponto1 =
      pac1
        ? pontos?.[pac1]
        : null;

    const ponto2 =
      pac2
        ? pontos?.[pac2]
        : null;

    unidades[id] = {
      id,

      codigo:
        id,

      origem,

      tipo:
        "TRANSFORMADOR",

      tipoEquipamento:
        "TRANSFORMADOR",

      nomeTipoEquipamento:
        "Transformador",

      tipoUnidade:
        normalizarId(
          p.TIP_UNID ??
          p.tipoUnidade
        ),

      pac1Original,
      pac2Original,

      pac1,
      pac2,

      ponto1,
      ponto2,

      pontoAssociado:
        ponto1
          ? pac1
          : ponto2
          ? pac2
          : pac1 || pac2,

      latitude,
      longitude,

      descricao:
        p.DESCR ??
        p.descricao ??
        null,

      alimentador:
        obterAlimentador(p),

      circuito:
        obterCircuito(p),

      subestacao:
        obterSubestacao(p),

      fases:
        normalizarId(
          p.FAS_CON ??
          p.fases ??
          p.FAS_CON_P
        ),

      posicao:
        p.POS ??
        p.posicao ??
        null,

      potenciaNominal:
        normalizarNumero(
          p.POT_NOM
        ),

      tensaoLinha:
        normalizarNumero(
          p.TEN_LIN_SE
        ),

      propriedades: {
        ...p
      },

      feature,

      geometria:
        geometry ?? null,

      equipamentos: [],

      quantidadeEquipamentos:
        0,

      temEquipamento:
        false,

      equipamentoPrincipal:
        "TRANSFORMADOR",

      tiposEquipamentos: [
        "TRANSFORMADOR"
      ],

      tipoVisual:
        "TRANSFORMADOR"
    };
  }

  return unidades;
}


// ==========================================================
// ID UNIDADE TRANSFORMADOR
// ==========================================================

function obterIdUnidadeTransformador(
  propriedades
) {
  const p =
    extrairPropriedades(
      propriedades
    );

  return normalizarId(
    obterPrimeiroValor(
      p,
      [
        "UN_TR",
        "UN_TRM",
        "UN_TR_MT",
        "UN_TR_AT",
        "UN_TRANS",
        "UNIDADE",
        "COD_UN",
        "COD_UNIDADE",
        "UN_TR_MT_ID",
        "COD_ID_UN",
        "UNSE",
        "UN_TR_ID",
        "UNTR",
        "UNTR_ID"
      ]
    )
  );
}


// ==========================================================
// MAPA EQTR
// ==========================================================

function criarMapaEquipamentosTransformadores(
  eqTransformador,
  origem
) {
  const equipamentos = {};
  const porUnidade = {};

  for (
    const feature of
      eqTransformador?.features ||
      []
  ) {
    const p =
      feature?.properties || {};

    const id =
      normalizarId(
        obterPrimeiroValor(
          p,
          [
            "COD_ID",
            "ID",
            "COD_EQUIP"
          ]
        )
      );

    if (!id) {
      continue;
    }

    const unidadeId =
      obterIdUnidadeTransformador(p);

    const equipamento = {
      id,

      unidadeId,

      origem,

      tipo:
        "TRANSFORMADOR",

      nomeTipoEquipamento:
        "Transformador",

      tipoOriginal:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "TIP_INST",
              "TIP_UNID",
              "TIP_EQUIP"
            ]
          )
        ),

      tuc:
        normalizarId(
          p.TUC
        ),

      ti:
        normalizarId(
          p.TI
        ),

      cm:
        normalizarId(
          p.CM
        ),

      uar:
        normalizarId(
          p.UAR
        ),

      tipInst:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "TIP_INST",
              "TIP_EQUIP"
            ]
          )
        ),

      fases:
        normalizarId(
          p.FAS_CON
        ),

      classeTensao:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "CLAS_TEN",
              "GRU_TEN"
            ]
          )
        ),

      grupoTensao:
        normalizarId(
          p.GRU_TEN
        ),

      corNominal:
        normalizarId(
          p.COR_NOM
        ),

      descricao:
        obterPrimeiroValor(
          p,
          [
            "DESCR",
            "TIP_INST",
            "TIP_EQUIP",
            "TUC"
          ]
        ),

      alimentador:
        obterAlimentador(p),

      circuito:
        obterCircuito(p),

      subestacao:
        obterSubestacao(p),

      propriedades: {
        ...p
      },

      feature
    };

    equipamentos[id] =
      equipamento;

    if (!unidadeId) {
      continue;
    }

    if (!porUnidade[unidadeId]) {
      porUnidade[unidadeId] = [];
    }

    porUnidade[unidadeId].push(
      equipamento
    );
  }

  return {
    equipamentos,
    porUnidade
  };
}


// ==========================================================
// ASSOCIAR EQTR
// ==========================================================

function associarEquipamentosTransformadores(
  unidades,
  porUnidade
) {
  for (
    const unidade of
      Object.values(
        unidades || {}
      )
  ) {
    const associados =
      porUnidade?.[unidade.id] || [];

    unidade.equipamentos =
      associados;

    unidade.quantidadeEquipamentos =
      associados.length;

    unidade.temEquipamento =
      associados.length > 0;

    unidade.equipamentoPrincipal =
      "TRANSFORMADOR";

    unidade.tiposEquipamentos = [
      "TRANSFORMADOR"
    ];

    unidade.tipoVisual =
      "TRANSFORMADOR";
  }

  return unidades;
}


// ==========================================================
// EQUIPAMENTO OPERACIONAL
// ==========================================================
//
// IMPORTANTE:
//
// A UNSEMT/UNTRMT é a entidade operacional.
//
// EQSE/EQTR são complementos.
//
// Assim o filtro e a interface passam a enxergar o equipamento
// mesmo quando o arquivo complementar não possui correspondência.
//
// ==========================================================

function criarEquipamentoOperacional(
  unidade
) {
  if (!unidade?.id) {
    return null;
  }

  const tipo =
    unidade.tipoEquipamento ||
    unidade.tipo ||
    "OUTRO";

  return {
    id:
      unidade.id,

    unidadeId:
      unidade.id,

    codId:
      unidade.id,

    codigo:
      unidade.id,

    tipo,

    tipoEquipamento:
      tipo,

    nomeTipoEquipamento:
      unidade.nomeTipoEquipamento ||
      obterNomeTipoEquipamento(tipo),

    origem:
      unidade.origem ||
      "UNIDADE",

    alimentador:
      unidade.alimentador ||
      null,

    circuito:
      unidade.circuito ||
      null,

    subestacao:
      unidade.subestacao ||
      null,

    pontoAssociado:
      unidade.pontoAssociado ||
      unidade.pac1 ||
      unidade.pac2 ||
      null,

    pac1:
      unidade.pac1 ||
      null,

    pac2:
      unidade.pac2 ||
      null,

    latitude:
      unidade.latitude ??
      unidade.ponto1?.latitude ??
      unidade.ponto2?.latitude ??
      null,

    longitude:
      unidade.longitude ??
      unidade.ponto1?.longitude ??
      unidade.ponto2?.longitude ??
      null,

    fases:
      unidade.fases ||
      null,

    situacao:
      unidade.situacao ||
      null,

    estadoNormal:
      unidade.posicao ||
      null,

    posicao:
      unidade.posicao ||
      null,

    telecomandado:
      unidade.telecomandado ??
      null,

    potenciaNominal:
      unidade.potenciaNominal ??
      null,

    tensaoLinha:
      unidade.tensaoLinha ??
      null,

    descricao:
      unidade.descricao ||
      null,

    quantidadeEquipamentos:
      unidade.quantidadeEquipamentos ||
      0,

    temEquipamento:
      unidade.temEquipamento ||
      false,

    complementos:
      unidade.equipamentos ||
      [],

    unidade,

    propriedades:
      unidade.propriedades ||
      {},

    feature:
      unidade.feature ||
      null,

    geometria:
      unidade.geometria ||
      null
  };
}


// ==========================================================
// CATÁLOGO OPERACIONAL
// ==========================================================

function criarCatalogoEquipamentosOperacionais(
  unidadesSeccionadoras,
  transformadores
) {
  const equipamentos = {};
  const equipamentosPorUnidade = {};

  const todasUnidades = [
    ...Object.values(
      unidadesSeccionadoras || {}
    ),
    ...Object.values(
      transformadores || {}
    )
  ];

  for (
    const unidade of
      todasUnidades
  ) {
    const equipamento =
      criarEquipamentoOperacional(
        unidade
      );

    if (!equipamento) {
      continue;
    }

    equipamentos[
      equipamento.id
    ] = equipamento;

    equipamentosPorUnidade[
      unidade.id
    ] = [
      equipamento,
      ...(unidade.equipamentos || [])
    ];
  }

  return {
    equipamentos,
    porUnidade:
      equipamentosPorUnidade
  };
}


// ==========================================================
// COMBINAR MAPAS DE EQUIPAMENTOS
// ==========================================================

function combinarMapasEquipamentos(
  mapaPrincipal,
  mapaSecundario
) {
  const equipamentos = {
    ...(mapaPrincipal?.equipamentos || {}),
    ...(mapaSecundario?.equipamentos || {})
  };

  const porUnidade = {
    ...(mapaPrincipal?.porUnidade || {})
  };

  for (
    const [
      unidadeId,
      lista
    ] of Object.entries(
      mapaSecundario?.porUnidade ||
      {}
    )
  ) {
    if (!porUnidade[unidadeId]) {
      porUnidade[unidadeId] = [];
    }

    porUnidade[unidadeId].push(
      ...lista
    );
  }

  return {
    equipamentos,
    porUnidade
  };
}


// ==========================================================
// COLEÇÃO GEOJSON A PARTIR DO MODELO
// ==========================================================

function criarColecaoFeatures(
  itens
) {
  const features = [];

  for (
    const item of
      Object.values(itens || {})
  ) {
    if (item?.feature) {
      features.push(
        item.feature
      );

      continue;
    }

    if (!item?.geometria) {
      continue;
    }

    features.push({
      type: "Feature",

      properties: {
        ...(item.propriedades || {}),

        COD_ID:
          item.id,

        tipoEquipamento:
          item.tipoEquipamento ||
          item.tipo ||
          null
      },

      geometry:
        item.geometria
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}


// ==========================================================
// FILTRAR FEATURE COLLECTION POR UNIDADE
// ==========================================================

function filtrarColecaoPorUnidade(
  geojson,
  idsUnidades,
  campos = [
    "UN_SE",
    "UNSE",
    "UN_TR",
    "UN_TRM",
    "UN_TR_MT",
    "UN_TR_AT",
    "COD_UN",
    "COD_UNIDADE"
  ]
) {
  if (!geojson) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  const ids =
    new Set(
      [...idsUnidades].map(
        criarChaveComparacao
      )
    );

  const features =
    (geojson.features || [])
      .filter(
        feature => {
          const p =
            feature?.properties || {};

          return campos.some(
            campo => {
              const valor =
                normalizarId(
                  p[campo]
                );

              return (
                valor &&
                ids.has(
                  criarChaveComparacao(
                    valor
                  )
                )
              );
            }
          );
        }
      );

  return {
    ...geojson,
    features
  };
}


// ==========================================================
// ÍNDICE PQT POR PONTO
// ==========================================================

function criarIndicePQTPorPonto(
  unidades
) {
  const indice = {};

  for (
    const unidade of
      Object.values(
        unidades || {}
      )
  ) {
    const pontos = [
      unidade.pac1,
      unidade.pac2,
      unidade.pontoAssociado
    ]
      .map(normalizarId)
      .filter(Boolean);

    for (
      const pontoId of
        new Set(pontos)
    ) {
      if (!indice[pontoId]) {
        indice[pontoId] = [];
      }

      if (
        !indice[pontoId].includes(
          unidade.id
        )
      ) {
        indice[pontoId].push(
          unidade.id
        );
      }
    }
  }

  return indice;
}


// ==========================================================
// ÍNDICE TRANSFORMADORES POR PONTO
// ==========================================================

function criarIndiceTransformadoresPorPonto(
  unidades
) {
  const indice = {};

  for (
    const unidade of
      Object.values(
        unidades || {}
      )
  ) {
    const pontos = [
      unidade.pac1,
      unidade.pac2,
      unidade.pontoAssociado
    ]
      .map(normalizarId)
      .filter(Boolean);

    for (
      const pontoId of
        new Set(pontos)
    ) {
      if (!indice[pontoId]) {
        indice[pontoId] = [];
      }

      if (
        !indice[pontoId].includes(
          unidade.id
        )
      ) {
        indice[pontoId].push(
          unidade.id
        );
      }
    }
  }

  return indice;
}


// ==========================================================
// MAPA DE PONTOS
// ==========================================================

function criarMapaPontos(
  ponnot
) {
  const pontos = {};

  for (
    const feature of
      ponnot?.features || []
  ) {
    const propriedades =
      feature?.properties || {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    const geometria =
      feature?.geometry;

    if (
      !codId ||
      !geometria ||
      geometria.type !== "Point" ||
      !Array.isArray(
        geometria.coordinates
      )
    ) {
      continue;
    }

    const longitude =
      normalizarNumero(
        geometria.coordinates[0]
      );

    const latitude =
      normalizarNumero(
        geometria.coordinates[1]
      );

    if (
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    pontos[codId] = {
      id: codId,

      latitude,

      longitude,

      tipo:
        propriedades.TIP_INST ??
        propriedades.TIP_PON ??
        propriedades.TIPO ??
        null,

      estrutura:
        propriedades.ESTR ??
        null,

      material:
        propriedades.MAT ??
        null,

      situacao:
        propriedades.SITCONT ??
        null,

      alimentador:
        obterAlimentador(
          propriedades
        ),

      circuito:
        obterCircuito(
          propriedades
        ),

      subestacao:
        obterSubestacao(
          propriedades
        ),

      propriedades: {
        ...propriedades
      },

      geometria
    };
  }

  return pontos;
}


// ==========================================================
// EXTREMIDADE DA GEOMETRIA
// ==========================================================

function obterExtremidadeGeometria(
  geometry,
  primeira
) {
  if (!geometry) {
    return null;
  }

  let coordenadas = null;

  if (
    geometry.type === "LineString"
  ) {
    coordenadas =
      geometry.coordinates;
  } else if (
    geometry.type === "MultiLineString"
  ) {
    const linhas =
      geometry.coordinates || [];

    if (linhas.length > 0) {
      coordenadas =
        primeira
          ? linhas[0]
          : linhas[
              linhas.length - 1
            ];
    }
  }

  if (
    !Array.isArray(coordenadas) ||
    coordenadas.length === 0
  ) {
    return null;
  }

  const ponto =
    primeira
      ? coordenadas[0]
      : coordenadas[
          coordenadas.length - 1
        ];

  if (
    !Array.isArray(ponto) ||
    ponto.length < 2
  ) {
    return null;
  }

  const longitude =
    normalizarNumero(
      ponto[0]
    );

  const latitude =
    normalizarNumero(
      ponto[1]
    );

  if (
    longitude === null ||
    latitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}


// ==========================================================
// ENCONTRAR PONTO REAL POR COORDENADA
// ==========================================================

function encontrarPontoRealPorCoordenada(
  pontos,
  coordenada,
  tolerancia = 0.00002
) {
  if (!coordenada) {
    return null;
  }

  let melhorId = null;
  let melhorDistancia = Infinity;

  const limite =
    tolerancia *
    tolerancia;

  for (
    const ponto of
      Object.values(
        pontos || {}
      )
  ) {
    const latitude =
      normalizarNumero(
        ponto?.latitude
      );

    const longitude =
      normalizarNumero(
        ponto?.longitude
      );

    if (
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    const dLat =
      latitude -
      coordenada.latitude;

    const dLon =
      longitude -
      coordenada.longitude;

    const distancia =
      dLat * dLat +
      dLon * dLon;

    if (
      distancia <
        melhorDistancia &&
      distancia <= limite
    ) {
      melhorDistancia =
        distancia;

      melhorId =
        normalizarId(
          ponto.id
        );
    }
  }

  return melhorId;
}


// ==========================================================
// RESOLVER PONTO DO TRECHO
// ==========================================================

function resolverPontoTrecho(
  idOriginal,
  coordenada,
  pontos
) {
  const id =
    normalizarIdPontoAssociado(
      idOriginal
    );

  if (
    id &&
    pontos?.[id]
  ) {
    return {
      id,
      metodo: "ID_PONNOT"
    };
  }

  const idPorCoordenada =
    encontrarPontoRealPorCoordenada(
      pontos,
      coordenada
    );

  if (idPorCoordenada) {
    return {
      id: idPorCoordenada,
      metodo:
        "COORDENADA_PONNOT_REAL"
    };
  }

  return {
    id:
      id || null,

    metodo:
      id
        ? "ID_NAO_ENCONTRADO"
        : "SEM_ID"
  };
}


// ==========================================================
// MAPA DE TRECHOS
// ==========================================================

function criarMapaTrechos(
  ssdmt,
  pontos
) {
  const trechos = {};

  for (
    const feature of
      ssdmt?.features || []
  ) {
    const propriedades =
      feature?.properties || {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    if (!codId) {
      continue;
    }

    const pontoInicialOriginal =
      normalizarId(
        propriedades.PN_CON_1
      );

    const pontoFinalOriginal =
      normalizarId(
        propriedades.PN_CON_2
      );

    const coordenadaInicial =
      obterExtremidadeGeometria(
        feature?.geometry,
        true
      );

    const coordenadaFinal =
      obterExtremidadeGeometria(
        feature?.geometry,
        false
      );

    const resolucaoInicial =
      resolverPontoTrecho(
        pontoInicialOriginal,
        coordenadaInicial,
        pontos
      );

    const resolucaoFinal =
      resolverPontoTrecho(
        pontoFinalOriginal,
        coordenadaFinal,
        pontos
      );

    const alimentador =
      normalizarId(
        obterPrimeiroValor(
          propriedades,
          [
            "alimentador",
            "ALIMENTADOR",
            "CT_COD_OP",
            "CT_COD_OPER",
            "CT_COD"
          ]
        )
      );

    const circuito =
      normalizarId(
        obterPrimeiroValor(
          propriedades,
          [
            "circuito",
            "CIRCUITO",
            "CTMT"
          ]
        )
      );

    trechos[codId] = {
      id: codId,

      pontoInicial:
        resolucaoInicial.id,

      pontoFinal:
        resolucaoFinal.id,

      pontoInicialOriginal,

      pontoFinalOriginal,

      resolucaoPontoInicial:
        resolucaoInicial.metodo,

      resolucaoPontoFinal:
        resolucaoFinal.metodo,

      alimentador,

      alimentadorCodigo:
        alimentador,

      circuito,

      circuitoCodigo:
        circuito,

      subestacao:
        normalizarId(
          propriedades.SUB
        ),

      fases:
        propriedades.FAS_CON ??
        null,

      condutor:
        propriedades.TIP_CND ??
        null,

      comprimento:
        normalizarNumero(
          propriedades.COMP
        ),

      situacao:
        propriedades.SITCONT ??
        null,

      propriedades: {
        ...propriedades
      },

      feature,

      geometria:
        feature?.geometry ??
        null
    };
  }

  return trechos;
}


// ==========================================================
// ADJACÊNCIA
// ==========================================================

function criarAdjacencia(
  pontos,
  trechos
) {
  const adjacencia = {};

  for (
    const pontoId of
      Object.keys(
        pontos || {}
      )
  ) {
    adjacencia[pontoId] = [];
  }

  for (
    const [
      trechoId,
      trecho
    ] of Object.entries(
      trechos || {}
    )
  ) {
    const inicio =
      normalizarId(
        trecho.pontoInicial
      );

    const fim =
      normalizarId(
        trecho.pontoFinal
      );

    if (
      !inicio ||
      !fim
    ) {
      continue;
    }

    if (!adjacencia[inicio]) {
      adjacencia[inicio] = [];
    }

    if (!adjacencia[fim]) {
      adjacencia[fim] = [];
    }

    adjacencia[inicio].push({
      trechoId,

      pontoOrigem:
        inicio,

      pontoDestino:
        fim,

      sentido:
        "SAIDA"
    });

    adjacencia[fim].push({
      trechoId,

      pontoOrigem:
        fim,

      pontoDestino:
        inicio,

      sentido:
        "ENTRADA"
    });
  }

  return adjacencia;
}


// ==========================================================
// TERMINAIS
// ==========================================================

function identificarTerminais(
  adjacencia
) {
  return Object.keys(
    adjacencia || {}
  ).filter(
    id =>
      (
        adjacencia[id] || []
      ).length === 1
  );
}


// ==========================================================
// PASSAGENS
// ==========================================================

function identificarPassagens(
  adjacencia
) {
  return Object.keys(
    adjacencia || {}
  ).filter(
    id =>
      (
        adjacencia[id] || []
      ).length === 2
  );
}


// ==========================================================
// DERIVAÇÕES
// ==========================================================

function identificarDerivacoes(
  adjacencia
) {
  return Object.entries(
    adjacencia || {}
  )
    .filter(
      ([, conexoes]) =>
        conexoes.length > 2
    )
    .map(
      ([
        pontoId,
        conexoes
      ]) => ({
        pontoId,

        quantidadeConexoes:
          conexoes.length,

        conexoes
      })
    );
}


// ==========================================================
// TRECHOS SEM PONTOS
// ==========================================================

function identificarTrechosSemPontos(
  pontos,
  trechos
) {
  const problemas = [];

  for (
    const trecho of
      Object.values(
        trechos || {}
      )
  ) {
    const pontoInicialEncontrado =
      !!pontos?.[
        trecho.pontoInicial
      ];

    const pontoFinalEncontrado =
      !!pontos?.[
        trecho.pontoFinal
      ];

    if (
      !pontoInicialEncontrado ||
      !pontoFinalEncontrado
    ) {
      problemas.push({
        trechoId:
          trecho.id,

        pontoInicial:
          trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        pontoInicialEncontrado,

        pontoFinalEncontrado
      });
    }
  }

  return problemas;
}


// ==========================================================
// PONTOS ISOLADOS
// ==========================================================

function identificarPontosIsolados(
  pontos,
  adjacencia
) {
  return Object.keys(
    pontos || {}
  ).filter(
    id =>
      (
        adjacencia?.[id] ||
        []
      ).length === 0
  );
}


// ==========================================================
// TRECHOS INVÁLIDOS
// ==========================================================

function identificarTrechosInvalidos(
  trechos
) {
  const problemas = [];

  for (
    const trecho of
      Object.values(
        trechos || {}
      )
  ) {
    if (
      !trecho.pontoInicial ||
      !trecho.pontoFinal
    ) {
      problemas.push({
        trechoId:
          trecho.id,

        pontoInicial:
          trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        motivo:
          "Trecho sem PN_CON_1 ou PN_CON_2"
      });

      continue;
    }

    if (
      trecho.pontoInicial ===
      trecho.pontoFinal
    ) {
      problemas.push({
        trechoId:
          trecho.id,

        pontoInicial:
          trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        motivo:
          "Trecho conecta o ponto a ele mesmo"
      });
    }
  }

  return problemas;
}


// ==========================================================
// ÍNDICE ALIMENTADORES
// ==========================================================

function criarIndiceAlimentadores(
  trechos
) {
  const indice = {};

  for (
    const trecho of
      Object.values(
        trechos || {}
      )
  ) {
    const alimentador =
      normalizarId(
        trecho.alimentador
      );

    const circuito =
      normalizarId(
        trecho.circuito
      );

    const subestacao =
      normalizarId(
        trecho.subestacao
      );

    if (!alimentador) {
      continue;
    }

    if (!indice[alimentador]) {
      indice[alimentador] = {
        id:
          alimentador,

        alimentador,

        circuitos: [],

        subestacoes: [],

        quantidadeTrechos:
          0
      };
    }

    const registro =
      indice[alimentador];

    registro.quantidadeTrechos += 1;

    if (
      circuito &&
      !registro.circuitos.includes(
        circuito
      )
    ) {
      registro.circuitos.push(
        circuito
      );
    }

    if (
      subestacao &&
      !registro.subestacoes.includes(
        subestacao
      )
    ) {
      registro.subestacoes.push(
        subestacao
      );
    }
  }

  for (
    const registro of
      Object.values(indice)
  ) {
    registro.circuitos.sort();
    registro.subestacoes.sort();
  }

  return indice;
}


// ==========================================================
// MAIS FREQUENTE
// ==========================================================

function descobrirMaisFrequente(
  objeto,
  campo
) {
  const contagem = {};

  for (
    const item of
      Object.values(
        objeto || {}
      )
  ) {
    const valor =
      normalizarId(
        item?.[campo]
      );

    if (!valor) {
      continue;
    }

    contagem[valor] =
      (
        contagem[valor] ||
        0
      ) + 1;
  }

  const lista =
    Object.entries(
      contagem
    ).sort(
      (a, b) =>
        b[1] - a[1]
    );

  return (
    lista[0]?.[0] ||
    null
  );
}


// ==========================================================
// ORIGEM AUTOMÁTICA
// ==========================================================

function encontrarOrigemAutomatica(
  topologia
) {
  if (!topologia) {
    return null;
  }

  const alimentador =
    normalizarTexto(
      topologia.alimentador
    );

  const candidatos = [];

  for (
    const ponto of
      Object.values(
        topologia.pontos || {}
      )
  ) {
    let pontuacao = 0;

    for (
      const [
        campo,
        valor
      ] of Object.entries(
        ponto.propriedades || {}
      )
    ) {
      const campoTexto =
        normalizarTexto(
          campo
        );

      const valorTexto =
        normalizarTexto(
          valor
        );

      if (!valorTexto) {
        continue;
      }

      if (
        alimentador &&
        valorTexto ===
          alimentador
      ) {
        pontuacao += 5;
      }

      for (
        const termo of [
          "SUBESTACAO",
          "SUBESTAÇÃO",
          "BARRA",
          "FONTE",
          "SAIDA",
          "SAÍDA",
          "ORIGEM"
        ]
      ) {
        if (
          valorTexto.includes(termo) ||
          campoTexto.includes(termo)
        ) {
          pontuacao += 3;
        }
      }

      if (
        (
          campoTexto.includes(
            "TIP_INST"
          ) ||
          campoTexto.includes(
            "TIP_PON"
          ) ||
          campoTexto.includes(
            "TIPO"
          )
        ) &&
        (
          valorTexto.includes("SUB") ||
          valorTexto.includes("BARR") ||
          valorTexto.includes("SAID")
        )
      ) {
        pontuacao += 8;
      }
    }

    if (pontuacao > 0) {
      candidatos.push({
        pontoId:
          ponto.id,

        pontuacao,

        tipo:
          ponto.tipo,

        propriedades:
          ponto.propriedades
      });
    }
  }

  if (candidatos.length > 0) {
    candidatos.sort(
      (a, b) =>
        b.pontuacao -
        a.pontuacao
    );

    return {
      pontoId:
        candidatos[0].pontoId,

      metodo:
        "PROPRIEDADES_PONNOT",

      pontuacao:
        candidatos[0].pontuacao,

      candidatos
    };
  }

  return null;
}


// ==========================================================
// ORIENTAÇÃO DA REDE
// ==========================================================

function orientarRedeEletrica(
  topologia,
  pontoOrigem
) {
  const origem =
    normalizarId(
      pontoOrigem
    );

  if (
    !origem ||
    !topologia?.pontos?.[origem]
  ) {
    return {
      pontoOrigem:
        origem,

      pontos: {},

      trechos: {},

      pontosNaoOrientados:
        Object.keys(
          topologia?.pontos || {}
        ),

      trechosNaoOrientados:
        Object.keys(
          topologia?.trechos || {}
        )
    };
  }

  const pontos = {};
  const trechos = {};

  const pontosVisitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [
    {
      pontoId:
        origem,

      nivel: 0,

      pontoMontante:
        null,

      trechoMontante:
        null
    }
  ];

  while (fila.length > 0) {
    const item =
      fila.shift();

    const pontoAtual =
      normalizarId(
        item.pontoId
      );

    if (
      !pontoAtual ||
      pontosVisitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    const ponto =
      topologia.pontos?.[
        pontoAtual
      ];

    if (!ponto) {
      continue;
    }

    pontosVisitados.add(
      pontoAtual
    );

    pontos[pontoAtual] = {
      ...ponto,

      nivel:
        item.nivel,

      pontoMontante:
        item.pontoMontante,

      trechoMontante:
        item.trechoMontante,

      origem:
        pontoAtual ===
        origem
    };

    const conexoes =
      topologia.adjacencia?.[
        pontoAtual
      ] || [];

    for (
      const conexao of
        conexoes
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      const trecho =
        topologia.trechos?.[
          trechoId
        ];

      if (
        !trechoId ||
        !destino ||
        !trecho
      ) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          trechoId
        );

        trechos[trechoId] = {
          ...trecho,

          pontoMontante:
            pontoAtual,

          pontoJusante:
            destino,

          nivel:
            item.nivel + 1
        };
      }

      if (
        !pontosVisitados.has(
          destino
        )
      ) {
        fila.push({
          pontoId:
            destino,

          nivel:
            item.nivel + 1,

          pontoMontante:
            pontoAtual,

          trechoMontante:
            trechoId
        });
      }
    }
  }

  const pontosNaoOrientados =
    Object.keys(
      topologia.pontos || {}
    ).filter(
      id =>
        !pontos[id]
    );

  const trechosNaoOrientados =
    Object.keys(
      topologia.trechos || {}
    ).filter(
      id =>
        !trechos[id]
    );

  return {
    pontoOrigem:
      origem,

    pontos,

    trechos,

    pontosNaoOrientados,

    trechosNaoOrientados,

    quantidadePontos:
      Object.keys(pontos).length,

    quantidadeTrechos:
      Object.keys(trechos).length,

    quantidadePontosNaoOrientados:
      pontosNaoOrientados.length,

    quantidadeTrechosNaoOrientados:
      trechosNaoOrientados.length
  };
}


// ==========================================================
// REDE A JUSANTE
// ==========================================================

export function buscarRedeAJusante(
  topologia,
  pontoInicial,
  opcoes = {}
) {
  const origem =
    normalizarId(
      pontoInicial
    );

  if (!origem) {
    return {
      pontoInicial:
        null,

      pontos: {},

      trechos: {},

      ordemPontos: [],

      ordemTrechos: [],

      quantidadePontos: 0,

      quantidadeTrechos: 0
    };
  }

  const pontos = {};
  const trechos = {};

  const ordemPontos = [];
  const ordemTrechos = [];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [origem];

  while (fila.length > 0) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (
      !pontoAtual ||
      visitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    if (
      !topologia?.pontos?.[
        pontoAtual
      ]
    ) {
      continue;
    }

    visitados.add(
      pontoAtual
    );

    pontos[pontoAtual] =
      topologia.pontos[
        pontoAtual
      ];

    ordemPontos.push(
      pontoAtual
    );

    for (
      const conexao of
        topologia.adjacencia?.[
          pontoAtual
        ] || []
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      const trecho =
        topologia.trechos?.[
          trechoId
        ];

      if (
        !trechoId ||
        !destino ||
        !trecho
      ) {
        continue;
      }

      if (
        opcoes.respeitarOrientacao &&
        trecho.pontoMontante &&
        trecho.pontoJusante &&
        normalizarId(
          trecho.pontoMontante
        ) !==
          pontoAtual
      ) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          trechoId
        );

        trechos[trechoId] =
          trecho;

        ordemTrechos.push(
          trechoId
        );
      }

      if (
        !visitados.has(
          destino
        )
      ) {
        fila.push(
          destino
        );
      }
    }
  }

  return {
    pontoInicial:
      origem,

    pontos,

    trechos,

    ordemPontos,

    ordemTrechos,

    quantidadePontos:
      ordemPontos.length,

    quantidadeTrechos:
      ordemTrechos.length
  };
}


// ==========================================================
// REDE A MONTANTE
// ==========================================================

export function buscarRedeAMontante(
  topologia,
  pontoInicial
) {
  const origem =
    normalizarId(
      pontoInicial
    );

  if (!origem) {
    return {
      pontoInicial:
        null,

      pontos: {},

      trechos: {},

      ordemPontos: [],

      ordemTrechos: [],

      quantidadePontos: 0,

      quantidadeTrechos: 0
    };
  }

  const pontos = {};
  const trechos = {};

  const ordemPontos = [];
  const ordemTrechos = [];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [origem];

  while (fila.length > 0) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (
      !pontoAtual ||
      visitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    if (
      !topologia?.pontos?.[
        pontoAtual
      ]
    ) {
      continue;
    }

    visitados.add(
      pontoAtual
    );

    pontos[pontoAtual] =
      topologia.pontos[
        pontoAtual
      ];

    ordemPontos.push(
      pontoAtual
    );

    for (
      const conexao of
        topologia.adjacencia?.[
          pontoAtual
        ] || []
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const trecho =
        topologia.trechos?.[
          trechoId
        ];

      if (
        !trechoId ||
        !trecho
      ) {
        continue;
      }

      let pontoMontante =
        null;

      if (
        trecho.pontoMontante &&
        trecho.pontoJusante
      ) {
        if (
          normalizarId(
            trecho.pontoJusante
          ) !==
            pontoAtual
        ) {
          continue;
        }

        pontoMontante =
          normalizarId(
            trecho.pontoMontante
          );
      } else {
        pontoMontante =
          normalizarId(
            conexao.pontoDestino
          );
      }

      if (
        !pontoMontante ||
        pontoMontante ===
          pontoAtual
      ) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          trechoId
        );

        trechos[trechoId] =
          trecho;

        ordemTrechos.push(
          trechoId
        );
      }

      if (
        !visitados.has(
          pontoMontante
        )
      ) {
        fila.push(
          pontoMontante
        );
      }
    }
  }

  return {
    pontoInicial:
      origem,

    pontos,

    trechos,

    ordemPontos,

    ordemTrechos,

    quantidadePontos:
      ordemPontos.length,

    quantidadeTrechos:
      ordemTrechos.length
  };
}


// ==========================================================
// BUSCAR CAMINHO
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoInicial,
  pontoFinal
) {
  const inicio =
    normalizarId(
      pontoInicial
    );

  const fim =
    normalizarId(
      pontoFinal
    );

  if (!inicio || !fim) {
    return {
      encontrado: false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos: [],

      trechos: [],

      distancia: 0,

      motivo:
        "Ponto inicial ou final inválido"
    };
  }

  if (
    !topologia?.pontos?.[
      inicio
    ]
  ) {
    return {
      encontrado: false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos: [],

      trechos: [],

      distancia: 0,

      motivo:
        "Ponto inicial não encontrado"
    };
  }

  if (
    !topologia?.pontos?.[
      fim
    ]
  ) {
    return {
      encontrado: false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos: [],

      trechos: [],

      distancia: 0,

      motivo:
        "Ponto final não encontrado"
    };
  }

  if (inicio === fim) {
    return {
      encontrado: true,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos: [inicio],

      trechos: [],

      distancia: 0,

      motivo: null
    };
  }

  const fila = [inicio];

  const visitados =
    new Set([inicio]);

  const pontoAnterior = {};
  const trechoAnterior = {};

  let encontrado = false;

  while (
    fila.length > 0 &&
    !encontrado
  ) {
    const atual =
      fila.shift();

    for (
      const conexao of
        topologia.adjacencia?.[
          atual
        ] || []
    ) {
      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      if (
        !destino ||
        !trechoId ||
        !topologia.trechos?.[
          trechoId
        ] ||
        visitados.has(
          destino
        )
      ) {
        continue;
      }

      visitados.add(
        destino
      );

      pontoAnterior[destino] =
        atual;

      trechoAnterior[destino] =
        trechoId;

      if (
        destino === fim
      ) {
        encontrado = true;
        break;
      }

      fila.push(
        destino
      );
    }
  }

  if (!encontrado) {
    return {
      encontrado: false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos: [],

      trechos: [],

      distancia: 0,

      motivo:
        "Não existe caminho entre os pontos informados"
    };
  }

  const pontos = [];
  const trechos = [];

  let atual = fim;
  let distancia = 0;

  while (
    atual !== inicio
  ) {
    pontos.push(atual);

    const trechoId =
      trechoAnterior[atual];

    if (trechoId) {
      trechos.push(
        trechoId
      );

      distancia +=
        normalizarNumero(
          topologia.trechos[
            trechoId
          ]?.comprimento
        ) ?? 0;
    }

    atual =
      pontoAnterior[
        atual
      ];

    if (!atual) {
      return {
        encontrado: false,

        pontoInicial:
          inicio,

        pontoFinal:
          fim,

        pontos: [],

        trechos: [],

        distancia: 0,

        motivo:
          "Falha ao reconstruir o caminho"
      };
    }
  }

  pontos.push(inicio);

  pontos.reverse();
  trechos.reverse();

  return {
    encontrado: true,

    pontoInicial:
      inicio,

    pontoFinal:
      fim,

    pontos,

    trechos,

    distancia,

    quantidadePontos:
      pontos.length,

    quantidadeTrechos:
      trechos.length,

    motivo: null
  };
}


// ==========================================================
// REDE A JUSANTE DO TRECHO
// ==========================================================

export function buscarRedeAJusanteDoTrecho(
  topologia,
  trechoId
) {
  const trecho =
    buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return {
      encontrado: false,

      pontos: {},

      trechos: {},

      ordemPontos: [],

      ordemTrechos: []
    };
  }

  return buscarRedeAJusante(
    topologia,
    trecho.pontoFinal,
    {
      respeitarOrientacao:
        true
    }
  );
}


// ==========================================================
// CRIAR TOPOLOGIA
// ==========================================================

export function criarTopologiaBDGD(
  ssdmt,
  ponnot,
  unsemt = null,
  eqse = null,
  untrmt = null,
  eqtrmt = null,
  untrat = null,
  eqtrat = null
) {
  console.log(
    "⚡ Criando topologia BDGD..."
  );

  // ========================================================
  // PONTOS
  // ========================================================

  const pontos =
    criarMapaPontos(
      ponnot
    );

  // ========================================================
  // TRECHOS
  // ========================================================

  const trechos =
    criarMapaTrechos(
      ssdmt,
      pontos
    );

  // ========================================================
  // DETECTAR ARQUIVO COMBINADO
  // ========================================================

  let unsemtReal =
    unsemt;

  let untrmtReal =
    untrmt;

  const arquivoCombinado =
    (
      unsemt?.features || []
    ).some(
      feature => {
        const p =
          feature?.properties ||
          {};

        const tipo =
          normalizarTexto(
            p.tipoEquipamento
          );

        const tipoUnidade =
          normalizarTexto(
            p.TIP_UNID ??
            p.tipoUnidade
          );

        return (
          tipo ===
            "TRANSFORMADOR" ||
          tipoUnidade ===
            "38"
        );
      }
    );

  if (arquivoCombinado) {
    const separados =
      separarEquipamentosCombinados(
        unsemt
      );

    unsemtReal =
      separados.unsemt;

    untrmtReal =
      separados.untrmt;

    console.log(
      "📦 Arquivo combinado detectado."
    );

    console.log(
      "UNSEMT:",
      separados.unsemt.features.length
    );

    console.log(
      "UNTRMT:",
      separados.untrmt.features.length
    );
  }

  // ========================================================
  // EQSE
  // ========================================================

  const mapaEqse =
    criarMapaEquipamentosEQSE(
      eqse
    );

  // ========================================================
  // UNSEMT
  // ========================================================

  const unidadesSeccionadoras =
    criarMapaUnidadesSeccionadoras(
      unsemtReal,
      pontos
    );

  associarEquipamentosAsUnidades(
    unidadesSeccionadoras,
    mapaEqse.porUnidade
  );

  // ========================================================
  // UNTRMT
  // ========================================================

  const transformadoresMT =
    criarMapaUnidadesTransformadores(
      untrmtReal,
      pontos,
      "UNTRMT"
    );

  const mapaEqTRMT =
    criarMapaEquipamentosTransformadores(
      eqtrmt,
      "EQTRMT"
    );

  associarEquipamentosTransformadores(
    transformadoresMT,
    mapaEqTRMT.porUnidade
  );

  // ========================================================
  // UNTRAT
  // ========================================================

  const transformadoresAT =
    criarMapaUnidadesTransformadores(
      untrat,
      pontos,
      "UNTRAT"
    );

  const mapaEqTRAT =
    criarMapaEquipamentosTransformadores(
      eqtrat,
      "EQTRAT"
    );

  associarEquipamentosTransformadores(
    transformadoresAT,
    mapaEqTRAT.porUnidade
  );

  // ========================================================
  // TRANSFORMADORES
  // ========================================================

  const transformadores = {
    ...transformadoresMT,
    ...transformadoresAT
  };

  // ========================================================
  // EQUIPAMENTOS COMPLEMENTARES
  // ========================================================

  const equipamentosTransformadores =
    combinarMapasEquipamentos(
      mapaEqTRMT,
      mapaEqTRAT
    );

  const mapaEquipamentosComplementares =
    combinarMapasEquipamentos(
      mapaEqse,
      equipamentosTransformadores
    );

  // ========================================================
  // CATÁLOGO OPERACIONAL
  // ========================================================
  //
  // ESTA É A CORREÇÃO PRINCIPAL.
  //
  // Agora o catálogo `equipamentos` é construído a partir
  // das unidades operacionais.
  //
  // Assim uma UNSEMT continua sendo encontrada mesmo quando
  // seu EQSE complementar não foi carregado ou associado.
  //
  // ========================================================

  const catalogoEquipamentosOperacionais =
    criarCatalogoEquipamentosOperacionais(
      unidadesSeccionadoras,
      transformadores
    );

  // ========================================================
  // EQUIPAMENTOS TOTAIS
  // ========================================================

  const equipamentos =
    {
      ...catalogoEquipamentosOperacionais.equipamentos,

      ...mapaEquipamentosComplementares.equipamentos
    };

  // ========================================================
  // POR UNIDADE
  // ========================================================

  const equipamentosPorUnidade =
    {
      ...catalogoEquipamentosOperacionais.porUnidade
    };

  // Adiciona complementos mesmo quando não houve catálogo
  // operacional correspondente.

  for (
    const [
      unidadeId,
      lista
    ] of Object.entries(
      mapaEquipamentosComplementares.porUnidade ||
      {}
    )
  ) {
    if (
      !equipamentosPorUnidade[
        unidadeId
      ]
    ) {
      equipamentosPorUnidade[
        unidadeId
      ] = [];
    }

    const idsExistentes =
      new Set(
        equipamentosPorUnidade[
          unidadeId
        ].map(
          equipamento =>
            equipamento?.id
        )
      );

    for (
      const equipamento of
        lista
    ) {
      if (
        !idsExistentes.has(
          equipamento.id
        )
      ) {
        equipamentosPorUnidade[
          unidadeId
        ].push(
          equipamento
        );
      }
    }
  }

  // ========================================================
  // ÍNDICES
  // ========================================================

  const pqtPorPonto =
    criarIndicePQTPorPonto(
      unidadesSeccionadoras
    );

  const transformadoresPorPonto =
    criarIndiceTransformadoresPorPonto(
      transformadores
    );

  const indiceAlimentadores =
    criarIndiceAlimentadores(
      trechos
    );

  // ========================================================
  // ADJACÊNCIA
  // ========================================================

  const adjacencia =
    criarAdjacencia(
      pontos,
      trechos
    );

  // ========================================================
  // DIAGNÓSTICOS
  // ========================================================

  const terminais =
    identificarTerminais(
      adjacencia
    );

  const passagens =
    identificarPassagens(
      adjacencia
    );

  const derivacoes =
    identificarDerivacoes(
      adjacencia
    );

  const problemas =
    identificarTrechosSemPontos(
      pontos,
      trechos
    );

  const pontosIsolados =
    identificarPontosIsolados(
      pontos,
      adjacencia
    );

  const trechosInvalidos =
    identificarTrechosInvalidos(
      trechos
    );

  // ========================================================
  // INFORMAÇÕES DO CIRCUITO
  // ========================================================

  const alimentador =
    descobrirMaisFrequente(
      trechos,
      "alimentador"
    );

  const circuito =
    descobrirMaisFrequente(
      trechos,
      "circuito"
    );

  const primeiroTrecho =
    Object.values(
      trechos
    )[0] || null;

  // ========================================================
  // LISTA UNSEMT
  // ========================================================

  const unidadesLista =
    Object.values(
      unidadesSeccionadoras
    );

  // ========================================================
  // CONTAGEM
  // ========================================================

  const contagem = {
    CHAVE_LAMINA: 0,

    CHAVE_FUSIVEL: 0,

    CHAVE_SECCIONADORA: 0,

    RELIGADOR: 0,

    OUTRO: 0
  };

  for (
    const unidade of
      unidadesLista
  ) {
    if (
      contagem[
        unidade.tipoEquipamento
      ] !== undefined
    ) {
      contagem[
        unidade.tipoEquipamento
      ] += 1;
    } else {
      contagem.OUTRO += 1;
    }
  }

  // ========================================================
  // TOPOLOGIA FINAL
  // ========================================================

  const topologia = {
    alimentador:
      alimentador ||
      primeiroTrecho?.alimentador ||
      null,

    circuito:
      circuito ||
      primeiroTrecho?.circuito ||
      null,

    subestacao:
      primeiroTrecho?.subestacao ||
      null,

    // ------------------------------------------------------
    // ÍNDICES
    // ------------------------------------------------------

    indiceAlimentadores,

    alimentadores:
      Object.values(
        indiceAlimentadores
      ),

    // ------------------------------------------------------
    // DADOS PRINCIPAIS
    // ------------------------------------------------------

    pontos,

    trechos,

    // ------------------------------------------------------
    // UNSEMT
    // ------------------------------------------------------

    unsemt:
      unsemtReal,

    unidadesSeccionadoras,

    pqt:
      unidadesSeccionadoras,

    // ------------------------------------------------------
    // EQSE ORIGINAL
    // ------------------------------------------------------

    eqse:

      eqse || {
        type:
          "FeatureCollection",

        features: []
      },

    equipamentosEQSE:
      mapaEqse.equipamentos,

    equipamentosEQSEPorUnidade:
      mapaEqse.porUnidade,

    // ------------------------------------------------------
    // EQUIPAMENTOS
    // ------------------------------------------------------
    //
    // `equipamentos` agora contém:
    //
    // 1. equipamento operacional da UNSEMT/UNTRMT/UNTRAT
    // 2. registros complementares EQSE/EQTR
    //
    // ------------------------------------------------------

    equipamentos,

    equipamentosPorUnidade,

    equipamentosOperacionais:
      catalogoEquipamentosOperacionais
        .equipamentos,

    equipamentosOperacionaisPorUnidade:
      catalogoEquipamentosOperacionais
        .porUnidade,

    equipamentosComplementares:
      mapaEquipamentosComplementares
        .equipamentos,

    equipamentosComplementaresPorUnidade:
      mapaEquipamentosComplementares
        .porUnidade,

    // ------------------------------------------------------
    // ÍNDICES
    // ------------------------------------------------------

    pqtPorPonto,

    // ------------------------------------------------------
    // TRANSFORMADORES
    // ------------------------------------------------------

    transformadores,

    transformadoresMT,

    transformadoresAT,

    equipamentosTransformadores:
      equipamentosTransformadores
        .equipamentos,

    equipamentosTransformadoresPorUnidade:
      equipamentosTransformadores
        .porUnidade,

    // ------------------------------------------------------
    // ARQUIVOS ORIGINAIS
    // ------------------------------------------------------

    untrmt:
      untrmtReal,

    untrat:
      untrat,

    eqtrmt:
      eqtrmt || {
        type:
          "FeatureCollection",
        features: []
      },

    eqtrat:
      eqtrat || {
        type:
          "FeatureCollection",
        features: []
      },

    transformadoresPorPonto,

    // ------------------------------------------------------
    // REDE
    // ------------------------------------------------------

    adjacencia,

    terminais,

    passagens,

    derivacoes,

    problemas,

    pontosIsolados,

    trechosInvalidos,

    // ------------------------------------------------------
    // ORIENTAÇÃO
    // ------------------------------------------------------

    orientacaoEletrica:
      null,

    origemAutomatica:
      null,

    // ------------------------------------------------------
    // RESUMO
    // ------------------------------------------------------

    resumo: {
      pontos:
        Object.keys(
          pontos
        ).length,

      trechos:
        Object.keys(
          trechos
        ).length,

      unidades:
        unidadesLista.length,

      pqt:
        unidadesLista.length,

      unidadesComEquipamento:
        unidadesLista.filter(
          unidade =>
            unidade.temEquipamento
        ).length,

      equipamentos:
        Object.keys(
          catalogoEquipamentosOperacionais
            .equipamentos
        ).length,

      equipamentosTotais:
        Object.keys(
          equipamentos
        ).length,

      equipamentosComplementares:
        Object.keys(
          mapaEquipamentosComplementares
            .equipamentos
        ).length,

      equipamentosTransformadores:
        Object.keys(
          equipamentosTransformadores
            .equipamentos
        ).length,

      transformadores:
        Object.keys(
          transformadores
        ).length,

      transformadoresMT:
        Object.keys(
          transformadoresMT
        ).length,

      transformadoresAT:
        Object.keys(
          transformadoresAT
        ).length,

      chavesLamina:
        contagem.CHAVE_LAMINA,

      chavesFusiveis:
        contagem.CHAVE_FUSIVEL,

      chavesSeccionadoras:
        contagem.CHAVE_SECCIONADORA,

      religadores:
        contagem.RELIGADOR,

      outros:
        contagem.OUTRO,

      terminais:
        terminais.length,

      passagens:
        passagens.length,

      derivacoes:
        derivacoes.length,

      problemas:
        problemas.length,

      pontosIsolados:
        pontosIsolados.length,

      trechosInvalidos:
        trechosInvalidos.length
    }
  };

  // ========================================================
  // ORIGEM
  // ========================================================

  const origem =
    encontrarOrigemAutomatica(
      topologia
    );

  if (origem?.pontoId) {
    topologia.origemAutomatica =
      origem;

    topologia.orientacaoEletrica =
      orientarRedeEletrica(
        topologia,
        origem.pontoId
      );
  }

  // ========================================================
  // LOGS
  // ========================================================

  console.log(
    "⚡ TOPOLOGIA BDGD CRIADA"
  );

  console.log(
    "Alimentador:",
    topologia.alimentador
  );

  console.log(
    "Circuito:",
    topologia.circuito
  );

  console.log(
    "Subestação:",
    topologia.subestacao
  );

  console.log(
    "Pontos:",
    topologia.resumo.pontos
  );

  console.log(
    "Trechos:",
    topologia.resumo.trechos
  );

  console.log(
    "UNSEMT:",
    topologia.resumo.unidades
  );

  console.log(
    "Equipamentos operacionais:",
    topologia.resumo.equipamentos
  );

  console.log(
    "Equipamentos totais:",
    topologia.resumo.equipamentosTotais
  );

  console.log(
    "EQSE:",
    Object.keys(
      mapaEqse.equipamentos
    ).length
  );

  console.log(
    "Transformadores:",
    topologia.resumo.transformadores
  );

  console.log(
    "Alimentadores:",
    Object.keys(
      indiceAlimentadores
    )
  );

  return topologia;
}


// ==========================================================
// BUSCAR PONTO
// ==========================================================

export function buscarPonto(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  return (
    topologia?.pontos?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR TRECHO
// ==========================================================

export function buscarTrechoBDGD(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  return (
    topologia?.trechos?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR CONEXÕES
// ==========================================================

export function buscarConexoes(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return [];
  }

  return (
    topologia?.adjacencia?.[id] ||
    []
  );
}


// ==========================================================
// BUSCAR PQT
// ==========================================================

export function buscarPQT(
  topologia,
  pqtId
) {
  const id =
    normalizarId(
      pqtId
    );

  if (!id) {
    return null;
  }

  return (
    topologia
      ?.unidadesSeccionadoras?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR EQUIPAMENTOS DA PQT
// ==========================================================
//
// Retorna primeiro o equipamento operacional da UNSEMT e,
// depois, seus complementos EQSE.
//
// ==========================================================

export function buscarEquipamentosDaPQT(
  topologia,
  pqtId
) {
  const id =
    normalizarId(
      pqtId
    );

  if (!id) {
    return [];
  }

  return (
    topologia
      ?.equipamentosPorUnidade?.[id] ||
    topologia
      ?.unidadesSeccionadoras?.[id]
      ?.equipamentos ||
    []
  );
}


// ==========================================================
// BUSCAR PQT DO PONTO
// ==========================================================

export function buscarPQTDoPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarId(
      pontoId
    );

  if (!id) {
    return [];
  }

  return (
    topologia
      ?.pqtPorPonto?.[id] ||
    []
  )
    .map(
      pqtId =>
        buscarPQT(
          topologia,
          pqtId
        )
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR TRANSFORMADOR
// ==========================================================

export function buscarTransformador(
  topologia,
  transformadorId
) {
  const id =
    normalizarId(
      transformadorId
    );

  if (!id) {
    return null;
  }

  return (
    topologia
      ?.transformadores?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR TRANSFORMADORES DO PONTO
// ==========================================================

export function buscarTransformadoresDoPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarId(
      pontoId
    );

  if (!id) {
    return [];
  }

  return (
    topologia
      ?.transformadoresPorPonto?.[id] ||
    []
  )
    .map(
      transformadorId =>
        buscarTransformador(
          topologia,
          transformadorId
        )
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR EQUIPAMENTOS DO TRANSFORMADOR
// ==========================================================

export function buscarEquipamentosDoTransformador(
  topologia,
  transformadorId
) {
  const id =
    normalizarId(
      transformadorId
    );

  if (!id) {
    return [];
  }

  return (
    topologia
      ?.equipamentosPorUnidade?.[id] ||
    topologia
      ?.transformadores?.[id]
      ?.equipamentos ||
    []
  );
}


// ==========================================================
// EQUIPAMENTO PRINCIPAL
// ==========================================================

export function buscarEquipamentoPrincipalPQT(
  topologia,
  pqtId
) {
  return (
    buscarPQT(
      topologia,
      pqtId
    )?.equipamentoPrincipal ||
    null
  );
}


// ==========================================================
// TIPO DE EQUIPAMENTO
// ==========================================================

export function buscarTipoEquipamentoPQT(
  topologia,
  pqtId
) {
  return (
    buscarPQT(
      topologia,
      pqtId
    )?.tipoEquipamento ||
    null
  );
}


// ==========================================================
// BUSCAR EQUIPAMENTO GLOBAL
// ==========================================================
//
// Procura:
// 1. equipamento operacional
// 2. equipamento complementar
// 3. PQT
// 4. transformador
//
// ==========================================================

export function buscarEquipamentoBDGD(
  topologia,
  id
) {
  const codigo =
    normalizarId(id);

  if (!codigo) {
    return null;
  }

  return (
    topologia
      ?.equipamentos?.[codigo] ||

    topologia
      ?.equipamentosOperacionais?.[codigo] ||

    topologia
      ?.equipamentosComplementares?.[codigo] ||

    topologia
      ?.unidadesSeccionadoras?.[codigo] ||

    topologia
      ?.transformadores?.[codigo] ||

    null
  );
}


// ==========================================================
// LISTAR ALIMENTADORES
// ==========================================================

export function listarAlimentadores(
  topologia
) {
  return Object.values(
    topologia?.indiceAlimentadores ||
    {}
  ).sort(
    (a, b) =>
      String(a.id).localeCompare(
        String(b.id)
      )
  );
}


// ==========================================================
// FILTRAR TOPOLOGIA POR ALIMENTADOR
// ==========================================================

export function filtrarTopologiaPorAlimentador(
  topologia,
  alimentador
) {
  if (!topologia) {
    return null;
  }

  const alvo =
    normalizarId(
      alimentador
    );

  if (
    !alvo ||
    normalizarTexto(alvo) === "TODOS"
  ) {
    return topologia;
  }

  const chaveAlvo =
    criarChaveComparacao(
      alvo
    );

  const registro =
    Object.values(
      topologia?.indiceAlimentadores ||
      {}
    ).find(
      item =>
        criarChaveComparacao(
          item?.id
        ) === chaveAlvo
    ) || null;

  const circuitos =
    new Set(
      (
        registro?.circuitos || []
      )
        .map(
          criarChaveComparacao
        )
        .filter(Boolean)
    );

  function pertence(
    item
  ) {
    if (!item) {
      return false;
    }

    const p =
      item.propriedades ||
      item.properties ||
      {};

    const candidatos = [
      item.alimentador,
      item.ALIMENTADOR,
      item.CT_COD_OP,
      item.CT_COD_OPER,
      item.CT_COD,
      item.CT_CODIGO,

      p.alimentador,
      p.ALIMENTADOR,
      p.CT_COD_OP,
      p.CT_COD_OPER,
      p.CT_COD,
      p.CT_CODIGO
    ]
      .map(normalizarId)
      .filter(Boolean);

    if (
      candidatos.some(
        valor =>
          criarChaveComparacao(
            valor
          ) === chaveAlvo
      )
    ) {
      return true;
    }

    const circuito =
      normalizarId(
        item.circuito ??
        item.CIRCUITO ??
        item.CTMT ??
        p.circuito ??
        p.CIRCUITO ??
        p.CTMT
      );

    return (
      !!circuito &&
      circuitos.has(
        criarChaveComparacao(
          circuito
        )
      )
    );
  }

  // --------------------------------------------------------
  // TRECHOS
  // --------------------------------------------------------

  const trechos = {};

  for (
    const [
      id,
      trecho
    ] of Object.entries(
      topologia.trechos || {}
    )
  ) {
    if (pertence(trecho)) {
      trechos[id] =
        trecho;
    }
  }

  // --------------------------------------------------------
  // PONTOS UTILIZADOS
  // --------------------------------------------------------

  const pontosUsados =
    new Set();

  for (
    const trecho of
      Object.values(trechos)
  ) {
    if (trecho.pontoInicial) {
      pontosUsados.add(
        normalizarId(
          trecho.pontoInicial
        )
      );
    }

    if (trecho.pontoFinal) {
      pontosUsados.add(
        normalizarId(
          trecho.pontoFinal
        )
      );
    }
  }

  // --------------------------------------------------------
  // PONTOS
  // --------------------------------------------------------

  const pontos = {};

  for (
    const [
      id,
      ponto
    ] of Object.entries(
      topologia.pontos || {}
    )
  ) {
    if (
      pertence(ponto) ||
      pontosUsados.has(
        normalizarId(id)
      )
    ) {
      pontos[id] = ponto;
    }
  }

  // --------------------------------------------------------
  // FUNÇÃO DE CONEXÃO AO ALIMENTADOR
  // --------------------------------------------------------

  function estaConectadoAosPontosDoAlimentador(
    unidade
  ) {
    if (!unidade) {
      return false;
    }

    const ids = [
      unidade.pac1,
      unidade.pac2,
      unidade.pontoAssociado
    ]
      .map(normalizarId)
      .filter(Boolean);

    return ids.some(
      pontoId =>
        pontosUsados.has(
          pontoId
        )
    );
  }

  // --------------------------------------------------------
  // UNSEMT
  // --------------------------------------------------------

  const unidadesSeccionadoras =
    {};

  for (
    const [
      id,
      unidade
    ] of Object.entries(
      topologia
        .unidadesSeccionadoras ||
      {}
    )
  ) {
    if (
      pertence(unidade) ||
      estaConectadoAosPontosDoAlimentador(
        unidade
      )
    ) {
      unidadesSeccionadoras[
        id
      ] =
        unidade;
    }
  }

  // --------------------------------------------------------
  // TRANSFORMADORES
  // --------------------------------------------------------

  const transformadores =
    {};

  for (
    const [
      id,
      transformador
    ] of Object.entries(
      topologia
        .transformadores ||
      {}
    )
  ) {
    if (
      pertence(transformador) ||
      estaConectadoAosPontosDoAlimentador(
        transformador
      )
    ) {
      transformadores[
        id
      ] =
        transformador;
    }
  }

  // --------------------------------------------------------
  // ÍNDICES
  // --------------------------------------------------------

  const pqtPorPonto =
    criarIndicePQTPorPonto(
      unidadesSeccionadoras
    );

  const transformadoresPorPonto =
    criarIndiceTransformadoresPorPonto(
      transformadores
    );

  const adjacencia =
    criarAdjacencia(
      pontos,
      trechos
    );

  // --------------------------------------------------------
  // CATÁLOGO OPERACIONAL FILTRADO
  // --------------------------------------------------------

  const catalogoOperacionalFiltrado =
    criarCatalogoEquipamentosOperacionais(
      unidadesSeccionadoras,
      transformadores
    );

  // --------------------------------------------------------
  // IDs DAS UNIDADES FILTRADAS
  // --------------------------------------------------------

  const idsUnidadesFiltradas =
    new Set([
      ...Object.keys(
        unidadesSeccionadoras
      ),
      ...Object.keys(
        transformadores
      )
    ]);

  // --------------------------------------------------------
  // EQUIPAMENTOS COMPLEMENTARES FILTRADOS
  // --------------------------------------------------------

  const equipamentosComplementares =
    {};

  const equipamentosPorUnidade =
    {};

  // Primeiro: equipamento operacional.

  for (
    const [
      unidadeId,
      lista
    ] of Object.entries(
      catalogoOperacionalFiltrado.porUnidade ||
      {}
    )
  ) {
    equipamentosPorUnidade[
      unidadeId
    ] = [
      ...lista
    ];

    for (
      const equipamento of
        lista
    ) {
      if (
        equipamento?.id
      ) {
        equipamentosComplementares[
          equipamento.id
        ] =
          equipamento;
      }
    }
  }

  // Depois: complementos EQSE/EQTR.

  for (
    const [
      unidadeId,
      lista
    ] of Object.entries(
      topologia
        .equipamentosComplementaresPorUnidade ||
      {}
    )
  ) {
    if (
      !idsUnidadesFiltradas.has(
        unidadeId
      )
    ) {
      continue;
    }

    if (
      !equipamentosPorUnidade[
        unidadeId
      ]
    ) {
      equipamentosPorUnidade[
        unidadeId
      ] = [];
    }

    const idsExistentes =
      new Set(
        equipamentosPorUnidade[
          unidadeId
        ].map(
          equipamento =>
            equipamento?.id
        )
      );

    for (
      const equipamento of
        lista
    ) {
      if (!equipamento?.id) {
        continue;
      }

      if (
        !idsExistentes.has(
          equipamento.id
        )
      ) {
        equipamentosPorUnidade[
          unidadeId
        ].push(
          equipamento
        );

        idsExistentes.add(
          equipamento.id
        );
      }

      equipamentosComplementares[
        equipamento.id
      ] =
        equipamento;
    }
  }

  // --------------------------------------------------------
  // EQUIPAMENTOS GLOBAIS FILTRADOS
  // --------------------------------------------------------

  const equipamentos =
    {};

  for (
    const [
      unidadeId,
      lista
    ] of Object.entries(
      equipamentosPorUnidade
    )
  ) {
    for (
      const equipamento of
        lista
    ) {
      if (!equipamento?.id) {
        continue;
      }

      // Evita que um complemento substitua o equipamento
      // operacional que usa o COD_ID da unidade.

      if (
        !equipamentos[
          equipamento.id
        ] ||
        equipamento.origem === "UNIDADE"
      ) {
        equipamentos[
          equipamento.id
        ] =
          equipamento;
      }
    }
  }

  // --------------------------------------------------------
  // TIPOS
  // --------------------------------------------------------

  const equipamentosEQSE =
    {};

  for (
    const [
      id,
      equipamento
    ] of Object.entries(
      equipamentos
    )
  ) {
    if (
      equipamento?.origem ===
      "EQSE"
    ) {
      equipamentosEQSE[
        id
      ] =
        equipamento;
    }
  }

  // --------------------------------------------------------
  // TRANSFORMADORES MT/AT
  // --------------------------------------------------------

  const transformadoresMT =
    Object.fromEntries(
      Object.entries(
        transformadores
      ).filter(
        ([, transformador]) =>
          transformador?.origem ===
          "UNTRMT"
      )
    );

  const transformadoresAT =
    Object.fromEntries(
      Object.entries(
        transformadores
      ).filter(
        ([, transformador]) =>
          transformador?.origem ===
          "UNTRAT"
      )
    );

  // --------------------------------------------------------
  // COLEÇÕES FILTRADAS
  // --------------------------------------------------------

  const eqseFiltrado =
    filtrarColecaoPorUnidade(
      topologia.eqse,
      Object.keys(
        unidadesSeccionadoras
      ),
      [
        "UN_SE",
        "UNSE",
        "UN_SE_ID",
        "COD_UN",
        "COD_UNIDADE"
      ]
    );

  const eqtrmtFiltrado =
    filtrarColecaoPorUnidade(
      topologia.eqtrmt,
      Object.keys(
        transformadoresMT
      ),
      [
        "UN_TR",
        "UN_TRM",
        "UN_TR_MT",
        "COD_UN",
        "COD_UNIDADE"
      ]
    );

  const eqtratFiltrado =
    filtrarColecaoPorUnidade(
      topologia.eqtrat,
      Object.keys(
        transformadoresAT
      ),
      [
        "UN_TR",
        "UN_TR_AT",
        "COD_UN",
        "COD_UNIDADE"
      ]
    );

  // --------------------------------------------------------
  // DIAGNÓSTICOS
  // --------------------------------------------------------

  const terminais =
    identificarTerminais(
      adjacencia
    );

  const passagens =
    identificarPassagens(
      adjacencia
    );

  const derivacoes =
    identificarDerivacoes(
      adjacencia
    );

  const problemas =
    identificarTrechosSemPontos(
      pontos,
      trechos
    );

  const pontosIsolados =
    identificarPontosIsolados(
      pontos,
      adjacencia
    );

  const trechosInvalidos =
    identificarTrechosInvalidos(
      trechos
    );

  // --------------------------------------------------------
  // CIRCULOS / ALIMENTADOR
  // --------------------------------------------------------

  const primeiroTrecho =
    Object.values(
      trechos
    )[0] || null;

  // --------------------------------------------------------
  // MAPA FILTRADO
  // --------------------------------------------------------

  return {
    ...topologia,

    alimentador:
      alvo,

    circuito:
      registro?.circuitos?.[0] ||
      primeiroTrecho?.circuito ||
      null,

    subestacao:
      registro?.subestacoes?.[0] ||
      primeiroTrecho?.subestacao ||
      null,

    pontos,

    trechos,

    // ------------------------------------------------------
    // UNSEMT
    // ------------------------------------------------------

    unsemt:
      criarColecaoFeatures(
        unidadesSeccionadoras
      ),

    unidadesSeccionadoras,

    pqt:
      unidadesSeccionadoras,

    // ------------------------------------------------------
    // EQSE
    // ------------------------------------------------------

    eqse:
      eqseFiltrado,

    equipamentosEQSE:
      equipamentosEQSE,

    // ------------------------------------------------------
    // EQUIPAMENTOS
    // ------------------------------------------------------

    equipamentos,

    equipamentosPorUnidade,

    equipamentosOperacionais:
      catalogoOperacionalFiltrado
        .equipamentos,

    equipamentosOperacionaisPorUnidade:
      catalogoOperacionalFiltrado
        .porUnidade,

    equipamentosComplementares:
      equipamentosComplementares,

    equipamentosComplementaresPorUnidade:
      topologia
        .equipamentosComplementaresPorUnidade,

    // ------------------------------------------------------
    // ÍNDICES
    // ------------------------------------------------------

    pqtPorPonto,

    // ------------------------------------------------------
    // TRANSFORMADORES
    // ------------------------------------------------------

    transformadores,

    transformadoresMT,

    transformadoresAT,

    transformadoresPorPonto,

    equipamentosTransformadores:
      Object.fromEntries(
        Object.entries(
          equipamentos
        ).filter(
          ([, equipamento]) =>
            equipamento?.tipo ===
            "TRANSFORMADOR"
        )
      ),

    equipamentosTransformadoresPorUnidade:
      Object.fromEntries(
        Object.entries(
          equipamentosPorUnidade
        ).filter(
          ([unidadeId]) =>
            !!transformadores[
              unidadeId
            ]
        )
      ),

    untrmt:
      criarColecaoFeatures(
        transformadoresMT
      ),

    untrat:
      criarColecaoFeatures(
        transformadoresAT
      ),

    eqtrmt:
      eqtrmtFiltrado,

    eqtrat:
      eqtratFiltrado,

    // ------------------------------------------------------
    // REDE
    // ------------------------------------------------------

    adjacencia,

    terminais,

    passagens,

    derivacoes,

    problemas,

    pontosIsolados,

    trechosInvalidos,

    // ------------------------------------------------------
    // RESUMO
    // ------------------------------------------------------

    resumo: {
      ...(topologia.resumo || {}),

      pontos:
        Object.keys(
          pontos
        ).length,

      trechos:
        Object.keys(
          trechos
        ).length,

      unidades:
        Object.keys(
          unidadesSeccionadoras
        ).length,

      pqt:
        Object.keys(
          unidadesSeccionadoras
        ).length,

      transformadores:
        Object.keys(
          transformadores
        ).length,

      equipamentos:
        Object.keys(
          equipamentos
        ).length,

      equipamentosOperacionais:
        Object.keys(
          catalogoOperacionalFiltrado
            .equipamentos
        ).length,

      equipamentosComplementares:
        Object.keys(
          equipamentosComplementares
        ).length,

      terminais:
        terminais.length,

      passagens:
        passagens.length,

      derivacoes:
        derivacoes.length,

      problemas:
        problemas.length,

      pontosIsolados:
        pontosIsolados.length,

      trechosInvalidos:
        trechosInvalidos.length
    }
  };
}


// ==========================================================
// FICHA OPERACIONAL DO EQUIPAMENTO
// ==========================================================

export function obterFichaOperacionalEquipamento(
  topologia,
  equipamentoId
) {
  const id =
    normalizarId(
      equipamentoId
    );

  if (!id) {
    return null;
  }

  let equipamento =
    buscarEquipamentoBDGD(
      topologia,
      id
    );

  let unidade = null;

  // --------------------------------------------------------
  // PRIMEIRA TENTATIVA
  // --------------------------------------------------------

  if (
    equipamento?.unidadeId
  ) {
    unidade =
      buscarPQT(
        topologia,
        equipamento.unidadeId
      );

    if (!unidade) {
      unidade =
        buscarTransformador(
          topologia,
          equipamento.unidadeId
        );
    }
  }

  // --------------------------------------------------------
  // O PRÓPRIO ID PODE SER A UNIDADE
  // --------------------------------------------------------

  if (!unidade) {
    unidade =
      buscarPQT(
        topologia,
        id
      ) ||
      buscarTransformador(
        topologia,
        id
      );
  }

  // --------------------------------------------------------
  // EQUIPAMENTO COMPLEMENTAR
  // --------------------------------------------------------

  if (
    !equipamento &&
    topologia?.equipamentosComplementares?.[id]
  ) {
    equipamento =
      topologia
        .equipamentosComplementares[id];
  }

  const base =
    unidade ||
    equipamento;

  if (!base) {
    return null;
  }

  const tipo =
    equipamento?.tipo ||
    equipamento?.tipoEquipamento ||
    base.tipoEquipamento ||
    base.tipo ||
    "OUTRO";

  return {
    id,

    tipo,

    nomeTipo:
      obterNomeTipoEquipamento(
        tipo
      ),

    alimentador:
      equipamento?.alimentador ||
      base.alimentador ||
      null,

    circuito:
      equipamento?.circuito ||
      base.circuito ||
      null,

    subestacao:
      equipamento?.subestacao ||
      base.subestacao ||
      null,

    pontoAssociado:
      base.pontoAssociado ||
      base.pac1 ||
      base.pac2 ||
      null,

    pac1:
      base.pac1 ||
      null,

    pac2:
      base.pac2 ||
      null,

    latitude:
      equipamento?.latitude ??
      base.latitude ??
      null,

    longitude:
      equipamento?.longitude ??
      base.longitude ??
      null,

    fases:
      equipamento?.fases ||
      base.fases ||
      null,

    situacao:
      equipamento?.situacao ||
      base.situacao ||
      null,

    estadoNormal:
      base.posicao ||
      equipamento?.posicao ||
      null,

    potenciaNominal:
      base.potenciaNominal ??
      equipamento?.potenciaNominal ??
      null,

    tensaoLinha:
      base.tensaoLinha ??
      equipamento?.tensaoLinha ??
      null,

    telecomandado:
      base.telecomandado ??
      equipamento?.telecomandado ??
      null,

    descricao:
      equipamento?.descricao ||
      base.descricao ||
      null,

    propriedades:
      equipamento?.propriedades ||
      base.propriedades ||
      {},

    equipamentosComplementares:
      base.equipamentos ||
      [],

    equipamento:
      equipamento ||
      null,

    unidade:
      unidade ||
      null
  };
}


// ==========================================================
// RESUMO DO PONTO
// ==========================================================

export function obterResumoPonto(
  topologia,
  pontoId
) {
  const ponto =
    buscarPonto(
      topologia,
      pontoId
    );

  if (!ponto) {
    return null;
  }

  const conexoes =
    buscarConexoes(
      topologia,
      ponto.id
    );

  const pqts =
    buscarPQTDoPonto(
      topologia,
      ponto.id
    );

  const transformadores =
    buscarTransformadoresDoPonto(
      topologia,
      ponto.id
    );

  const equipamentos = [];

  for (
    const pqt of pqts
  ) {
    equipamentos.push(
      ...(
        buscarEquipamentosDaPQT(
          topologia,
          pqt.id
        ) || []
      )
    );
  }

  for (
    const transformador of
      transformadores
  ) {
    equipamentos.push(
      ...(
        buscarEquipamentosDoTransformador(
          topologia,
          transformador.id
        ) || []
      )
    );
  }

  return {
    ponto,

    quantidadeConexoes:
      conexoes.length,

    conexoes,

    quantidadePQT:
      pqts.length,

    pqts,

    quantidadeTransformadores:
      transformadores.length,

    transformadores,

    quantidadeEquipamentos:
      equipamentos.length,

    equipamentos
  };
}


// ==========================================================
// RESUMO DO TRECHO
// ==========================================================

export function obterResumoTrecho(
  topologia,
  trechoId
) {
  const trecho =
    buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return null;
  }

  return {
    trecho,

    pontoInicial:
      buscarPonto(
        topologia,
        trecho.pontoInicial
      ),

    pontoFinal:
      buscarPonto(
        topologia,
        trecho.pontoFinal
      ),

    comprimento:
      trecho.comprimento,

    alimentador:
      trecho.alimentador,

    circuito:
      trecho.circuito,

    subestacao:
      trecho.subestacao,

    fases:
      trecho.fases,

    condutor:
      trecho.condutor,

    situacao:
      trecho.situacao
  };
}


// ==========================================================
// CONTAGEM POR TIPO
// ==========================================================

export function obterContagemEquipamentos(
  topologia
) {
  const resultado = {
    CHAVE_LAMINA: 0,

    CHAVE_FUSIVEL: 0,

    CHAVE_SECCIONADORA: 0,

    RELIGADOR: 0,

    TRANSFORMADOR: 0,

    OUTRO: 0
  };

  if (!topologia) {
    return resultado;
  }

  for (
    const unidade of
      Object.values(
        topologia
          .unidadesSeccionadoras ||
        {}
      )
  ) {
    const tipo =
      unidade.tipoEquipamento;

    if (
      Object.prototype.hasOwnProperty.call(
        resultado,
        tipo
      )
    ) {
      resultado[tipo] += 1;
    } else {
      resultado.OUTRO += 1;
    }
  }

  for (
    const transformador of
      Object.values(
        topologia
          .transformadores ||
        {}
      )
  ) {
    if (
      transformador
        .tipoEquipamento ===
      "TRANSFORMADOR"
    ) {
      resultado.TRANSFORMADOR +=
        1;
    }
  }

  return resultado;
}


// ==========================================================
// EXPORTS AUXILIARES
// ==========================================================

export {
  normalizarId,

  normalizarNumero,

  normalizarTexto,

  normalizarIdPontoAssociado,

  classificarEquipamentoEQSE,

  classificarUnidadeUNSEMT,

  classificarUnidadeTransformador,

  obterNomeTipoEquipamento,

  obterAlimentador,

  obterCircuito,

  obterSubestacao,

  criarMapaEquipamentosEQSE,

  criarMapaUnidadesSeccionadoras,

  criarMapaUnidadesTransformadores,

  criarCatalogoEquipamentosOperacionais
};