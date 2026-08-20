// ==========================================================
// MODELO DE TOPOLOGIA BDGD
// COI MONITOR
// ==========================================================
//
// SSDMT  = trechos da rede
// PONNOT = pontos/conexões
//
// Relação:
//
// SSDMT.PN_CON_1 -> PONNOT.COD_ID
// SSDMT.PN_CON_2 -> PONNOT.COD_ID
//
// ==========================================================
// OBJETIVOS
// ==========================================================
//
// 1. Criar mapa de pontos
// 2. Criar mapa de trechos
// 3. Criar conectividade
// 4. Validar integridade
// 5. Identificar terminais
// 6. Identificar passagens
// 7. Identificar derivações
// 8. Permitir navegação pela rede
// 9. Permitir busca de rede conectada
// 10. Orientar eletricamente a rede
// 11. Buscar rede a jusante
// 12. Buscar rede a montante
// 13. Encontrar caminho entre pontos
// 14. Encontrar rede a jusante de um trecho
// 15. Identificar automaticamente a origem do alimentador
//
// ==========================================================


// ==========================================================
// NORMALIZAR ID
// ==========================================================

function normalizarId(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const id = String(valor).trim();

  return id || null;
}


// ==========================================================
// NORMALIZAR NÚMERO
// ==========================================================

function normalizarNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


// ==========================================================
// TEXTO NORMALIZADO
// ==========================================================

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
// CRIAR MAPA DE PONTOS
// ==========================================================

function criarMapaPontos(ponnot) {
  const pontos = {};

  const features =
    ponnot?.features || [];

  for (const feature of features) {
    const propriedades =
      feature?.properties || {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    if (!codId) {
      continue;
    }

    const geometria =
      feature?.geometry;

    if (
      !geometria ||
      geometria.type !== "Point" ||
      !Array.isArray(
        geometria.coordinates
      )
    ) {
      continue;
    }

    const [
      longitude,
      latitude
    ] = geometria.coordinates;

    const latitudeNormalizada =
      normalizarNumero(latitude);

    const longitudeNormalizada =
      normalizarNumero(longitude);

    if (
      latitudeNormalizada === null ||
      longitudeNormalizada === null
    ) {
      continue;
    }

    pontos[codId] = {
      id: codId,

      latitude:
        latitudeNormalizada,

      longitude:
        longitudeNormalizada,

      tipo:
        propriedades.TIP_INST ||
        propriedades.TIP_PON ||
        propriedades.TIPO ||
        null,

      estrutura:
        propriedades.ESTR ||
        null,

      material:
        propriedades.MAT ||
        null,

      situacao:
        propriedades.SITCONT ||
        null,

      propriedades,

      geometria
    };
  }

  return pontos;
}


// ==========================================================
// CRIAR MAPA DE TRECHOS
// ==========================================================

function criarMapaTrechos(ssdmt) {
  const trechos = {};

  const features =
    ssdmt?.features || [];

  for (const feature of features) {
    const propriedades =
      feature?.properties || {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    if (!codId) {
      continue;
    }

    const pontoInicial =
      normalizarId(
        propriedades.PN_CON_1
      );

    const pontoFinal =
      normalizarId(
        propriedades.PN_CON_2
      );

    trechos[codId] = {
      id: codId,

      pontoInicial,

      pontoFinal,

      alimentador:
        propriedades.CT_COD_OP ||
        null,

      circuito:
        propriedades.CTMT ||
        null,

      subestacao:
        propriedades.SUB ||
        null,

      fases:
        propriedades.FAS_CON ||
        null,

      condutor:
        propriedades.TIP_CND ||
        null,

      comprimento:
        normalizarNumero(
          propriedades.COMP
        ),

      situacao:
        propriedades.SITCONT ||
        null,

      propriedades,

      geometria:
        feature?.geometry ||
        null
    };
  }

  return trechos;
}


// ==========================================================
// CRIAR ADJACÊNCIA
// ==========================================================
//
// A adjacência representa apenas conectividade.
//
// NÃO representa o sentido elétrico.
//
// Cada trecho é registrado nos dois sentidos.
//
// ==========================================================

function criarAdjacencia(
  pontos,
  trechos
) {
  const adjacencia = {};

  for (
    const pontoId of Object.keys(pontos)
  ) {
    adjacencia[pontoId] = [];
  }

  for (
    const trechoId of Object.keys(trechos)
  ) {
    const trecho =
      trechos[trechoId];

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
// IDENTIFICAR PONTOS TERMINAIS
// ==========================================================

function identificarTerminais(
  adjacencia
) {
  const terminais = [];

  for (
    const pontoId of Object.keys(
      adjacencia
    )
  ) {
    const conexoes =
      adjacencia[pontoId] || [];

    if (
      conexoes.length === 1
    ) {
      terminais.push(
        pontoId
      );
    }
  }

  return terminais;
}


// ==========================================================
// IDENTIFICAR DERIVAÇÕES
// ==========================================================

function identificarDerivacoes(
  adjacencia
) {
  const derivacoes = [];

  for (
    const pontoId of Object.keys(
      adjacencia
    )
  ) {
    const conexoes =
      adjacencia[pontoId] || [];

    if (
      conexoes.length > 2
    ) {
      derivacoes.push({
        pontoId,

        quantidadeConexoes:
          conexoes.length,

        conexoes
      });
    }
  }

  return derivacoes;
}


// ==========================================================
// IDENTIFICAR PASSAGENS
// ==========================================================

function identificarPassagens(
  adjacencia
) {
  const passagens = [];

  for (
    const pontoId of Object.keys(
      adjacencia
    )
  ) {
    const conexoes =
      adjacencia[pontoId] || [];

    if (
      conexoes.length === 2
    ) {
      passagens.push(
        pontoId
      );
    }
  }

  return passagens;
}


// ==========================================================
// IDENTIFICAR TRECHOS SEM PONTOS
// ==========================================================

function identificarTrechosSemPontos(
  pontos,
  trechos
) {
  const problemas = [];

  for (
    const trechoId of Object.keys(
      trechos
    )
  ) {
    const trecho =
      trechos[trechoId];

    const pontoInicialEncontrado =
      !!pontos[
        trecho.pontoInicial
      ];

    const pontoFinalEncontrado =
      !!pontos[
        trecho.pontoFinal
      ];

    if (
      !pontoInicialEncontrado ||
      !pontoFinalEncontrado
    ) {
      problemas.push({
        trechoId,

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
// IDENTIFICAR PONTOS ISOLADOS
// ==========================================================

function identificarPontosIsolados(
  pontos,
  adjacencia
) {
  const isolados = [];

  for (
    const pontoId of Object.keys(
      pontos
    )
  ) {
    const conexoes =
      adjacencia[pontoId] || [];

    if (
      conexoes.length === 0
    ) {
      isolados.push(
        pontoId
      );
    }
  }

  return isolados;
}


// ==========================================================
// IDENTIFICAR TRECHOS INVÁLIDOS
// ==========================================================

function identificarTrechosInvalidos(
  trechos
) {
  const problemas = [];

  for (
    const trechoId of Object.keys(
      trechos
    )
  ) {
    const trecho =
      trechos[trechoId];

    if (
      !trecho.pontoInicial ||
      !trecho.pontoFinal
    ) {
      problemas.push({
        trechoId,

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
        trechoId,

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
// DESCOBRIR ALIMENTADOR
// ==========================================================

function descobrirAlimentador(
  trechos
) {
  const alimentadores = {};

  for (
    const trecho of Object.values(
      trechos || {}
    )
  ) {
    const alimentador =
      normalizarId(
        trecho.alimentador
      );

    if (!alimentador) {
      continue;
    }

    alimentadores[alimentador] =
      (alimentadores[alimentador] || 0) + 1;
  }

  const lista =
    Object.entries(
      alimentadores
    );

  if (
    lista.length === 0
  ) {
    return null;
  }

  lista.sort(
    (a, b) =>
      b[1] - a[1]
  );

  return lista[0][0];
}


// ==========================================================
// DESCOBRIR CIRCUITO
// ==========================================================

function descobrirCircuito(
  trechos
) {
  const circuitos = {};

  for (
    const trecho of Object.values(
      trechos || {}
    )
  ) {
    const circuito =
      normalizarId(
        trecho.circuito
      );

    if (!circuito) {
      continue;
    }

    circuitos[circuito] =
      (circuitos[circuito] || 0) + 1;
  }

  const lista =
    Object.entries(
      circuitos
    );

  if (
    lista.length === 0
  ) {
    return null;
  }

  lista.sort(
    (a, b) =>
      b[1] - a[1]
  );

  return lista[0][0];
}


// ==========================================================
// IDENTIFICAR ORIGEM AUTOMÁTICA
// ==========================================================
//
// IMPORTANTE:
//
// Não assumimos que PN_CON_1 seja montante.
//
// Procuramos primeiro propriedades que indiquem:
//
// - subestação
// - saída
// - alimentador
// - barra
// - fonte
//
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

  const pontos =
    topologia.pontos || {};

  // ========================================================
  // 1. MAPA DE TERMOS DE ORIGEM
  // ========================================================

  const termosFortes = [
    "SUBESTACAO",
    "SUBESTAÇÃO",
    "SE",
    "BARRA",
    "FONTE",
    "SAIDA",
    "SAÍDA",
    "ORIGEM",
    "ALIMENTADOR"
  ];

  const candidatos = [];

  for (
    const ponto of Object.values(
      pontos
    )
  ) {
    const propriedades =
      ponto.propriedades || {};

    let pontuacao = 0;

    for (
      const [campo, valor]
      of Object.entries(
        propriedades
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

      // ----------------------------------------------
      // ALIMENTADOR
      // ----------------------------------------------

      if (
        alimentador &&
        valorTexto === alimentador
      ) {
        pontuacao += 5;
      }

      // ----------------------------------------------
      // TERMOS FORTES
      // ----------------------------------------------

      for (
        const termo
        of termosFortes
      ) {
        if (
          valorTexto.includes(
            termo
          ) ||
          campoTexto.includes(
            termo
          )
        ) {
          pontuacao += 3;
        }
      }

      // ----------------------------------------------
      // CAMPOS DE INSTALAÇÃO
      // ----------------------------------------------

      if (
        campoTexto.includes(
          "TIP_INST"
        ) ||
        campoTexto.includes(
          "TIP_PON"
        ) ||
        campoTexto.includes(
          "TIPO"
        )
      ) {
        if (
          valorTexto.includes(
            "SUB"
          ) ||
          valorTexto.includes(
            "BARR"
          ) ||
          valorTexto.includes(
            "SAID"
          )
        ) {
          pontuacao += 8;
        }
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

  if (
    candidatos.length > 0
  ) {
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

  // ========================================================
  // 2. PROCURAR PONTO DE MENOR GRAU
  // ========================================================
  //
  // Só usamos isso como fallback.
  //
  // Em uma rede radial, a origem frequentemente está
  // próxima de um terminal estrutural.
  //
  // NÃO consideramos isso verdade elétrica.
  //
  // ========================================================

  const graus =
    Object.keys(
      pontos
    ).map(
      (pontoId) => ({
        pontoId,

        grau:
          (
            topologia.adjacencia?.[
              pontoId
            ] || []
          ).length
      })
    );

  const grauUm =
    graus.filter(
      (item) =>
        item.grau === 1
    );

  if (
    grauUm.length === 1
  ) {
    return {
      pontoId:
        grauUm[0].pontoId,

      metodo:
        "FALLBACK_TERMINAL_UNICO",

      pontuacao:
        0,

      candidatos:
        grauUm
    };
  }

  // ========================================================
  // 3. FALLBACK DETERMINÍSTICO
  // ========================================================
  //
  // Último recurso.
  //
  // NÃO é uma garantia de origem elétrica.
  //
  // ========================================================

  const ids =
    Object.keys(
      pontos
    ).sort();

  if (
    ids.length > 0
  ) {
    return {
      pontoId:
        ids[0],

      metodo:
        "FALLBACK_ID",

      pontuacao:
        0,

      candidatos: []
    };
  }

  return null;
}


// ==========================================================
// ORIENTAR REDE ELÉTRICA
// ==========================================================
//
// A orientação começa em uma origem conhecida.
//
// A partir dela:
//
// pontoMontante -> pontoJusante
//
// O PN_CON_1 / PN_CON_2 não define o sentido elétrico.
//
// ==========================================================

function orientarRedeEletrica(
  topologia,
  pontoOrigem
) {
  if (!topologia) {
    return {
      pontoOrigem: null,
      pontos: {},
      trechos: {},
      pontosNaoOrientados: [],
      trechosNaoOrientados: []
    };
  }

  const origem =
    normalizarId(
      pontoOrigem
    );

  if (!origem) {
    return {
      pontoOrigem: null,
      pontos: {},
      trechos: {},
      pontosNaoOrientados:
        Object.keys(
          topologia.pontos || {}
        ),
      trechosNaoOrientados:
        Object.keys(
          topologia.trechos || {}
        )
    };
  }

  if (
    !topologia.pontos?.[origem]
  ) {
    console.warn(
      "⚠️ Ponto de origem elétrica não encontrado:",
      origem
    );

    return {
      pontoOrigem:
        origem,

      pontos: {},

      trechos: {},

      pontosNaoOrientados:
        Object.keys(
          topologia.pontos || {}
        ),

      trechosNaoOrientados:
        Object.keys(
          topologia.trechos || {}
        )
    };
  }

  const pontosOrientados = {};
  const trechosOrientados = {};

  const pontosVisitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [
    {
      pontoId:
        origem,

      nivel:
        0,

      pontoMontante:
        null,

      trechoMontante:
        null
    }
  ];

  while (
    fila.length > 0
  ) {
    const item =
      fila.shift();

    const pontoAtual =
      normalizarId(
        item.pontoId
      );

    if (!pontoAtual) {
      continue;
    }

    if (
      pontosVisitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    pontosVisitados.add(
      pontoAtual
    );

    const ponto =
      topologia.pontos?.[
        pontoAtual
      ];

    if (!ponto) {
      continue;
    }

    // ------------------------------------------
    // REGISTRAR PONTO
    // ------------------------------------------

    pontosOrientados[pontoAtual] = {
      ...ponto,

      nivel:
        item.nivel,

      pontoMontante:
        item.pontoMontante,

      trechoMontante:
        item.trechoMontante,

      origem:
        pontoAtual === origem
    };

    // ------------------------------------------
    // CONEXÕES
    // ------------------------------------------

    const conexoes =
      topologia.adjacencia?.[
        pontoAtual
      ] || [];

    for (
      const conexao of conexoes
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      if (
        !trechoId ||
        !destino
      ) {
        continue;
      }

      if (
        pontosVisitados.has(
          destino
        )
      ) {
        continue;
      }

      const trecho =
        topologia.trechos?.[
          trechoId
        ];

      if (!trecho) {
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

        trechosOrientados[trechoId] = {
          ...trecho,

          pontoMontante:
            pontoAtual,

          pontoJusante:
            destino,

          nivel:
            item.nivel + 1
        };
      }

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

  const pontosNaoOrientados =
    Object.keys(
      topologia.pontos || {}
    ).filter(
      (id) =>
        !pontosOrientados[id]
    );

  const trechosNaoOrientados =
    Object.keys(
      topologia.trechos || {}
    ).filter(
      (id) =>
        !trechosOrientados[id]
    );

  return {
    pontoOrigem:
      origem,

    pontos:
      pontosOrientados,

    trechos:
      trechosOrientados,

    pontosNaoOrientados,

    trechosNaoOrientados,

    quantidadePontos:
      Object.keys(
        pontosOrientados
      ).length,

    quantidadeTrechos:
      Object.keys(
        trechosOrientados
      ).length,

    quantidadePontosNaoOrientados:
      pontosNaoOrientados.length,

    quantidadeTrechosNaoOrientados:
      trechosNaoOrientados.length
  };
}


// ==========================================================
// CRIAR TOPOLOGIA
// ==========================================================

export function criarTopologiaBDGD(
  ssdmt,
  ponnot
) {
  console.log(
    "⚡ Criando topologia BDGD..."
  );

  // ------------------------------------------
  // MAPAS
  // ------------------------------------------

  const pontos =
    criarMapaPontos(
      ponnot
    );

  const trechos =
    criarMapaTrechos(
      ssdmt
    );

  // ------------------------------------------
  // ADJACÊNCIA
  // ------------------------------------------

  const adjacencia =
    criarAdjacencia(
      pontos,
      trechos
    );

  // ------------------------------------------
  // CLASSIFICAÇÃO
  // ------------------------------------------

  const terminais =
    identificarTerminais(
      adjacencia
    );

  const derivacoes =
    identificarDerivacoes(
      adjacencia
    );

  const passagens =
    identificarPassagens(
      adjacencia
    );

  // ------------------------------------------
  // VALIDAÇÕES
  // ------------------------------------------

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

  // ------------------------------------------
  // INFORMAÇÕES
  // ------------------------------------------

  const alimentador =
    descobrirAlimentador(
      trechos
    );

  const circuito =
    descobrirCircuito(
      trechos
    );

  const primeiroTrecho =
    Object.values(
      trechos
    )[0] || null;

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

    pontos,

    trechos,

    adjacencia,

    terminais,

    passagens,

    derivacoes,

    problemas,

    pontosIsolados,

    trechosInvalidos,

    orientacaoEletrica:
      null,

    resumo: {
      pontos:
        Object.keys(
          pontos
        ).length,

      trechos:
        Object.keys(
          trechos
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

  console.log(
    "=================================================="
  );

  console.log(
    "⚡ TOPOLOGIA BDGD CRIADA"
  );

  console.log(
    "=================================================="
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
    "Terminais:",
    topologia.resumo.terminais
  );

  console.log(
    "Passagens:",
    topologia.resumo.passagens
  );

  console.log(
    "Derivações:",
    topologia.resumo.derivacoes
  );

  console.log(
    "Problemas:",
    topologia.resumo.problemas
  );

  console.log(
    "Pontos isolados:",
    topologia.resumo.pontosIsolados
  );

  console.log(
    "Trechos inválidos:",
    topologia.resumo.trechosInvalidos
  );

  console.log(
    "=================================================="
  );

  if (
    problemas.length === 0 &&
    trechosInvalidos.length === 0
  ) {
    console.log(
      "✅ Integridade da topologia: OK"
    );
  } else {
    console.warn(
      "⚠️ Existem problemas na topologia."
    );
  }

  // ========================================================
  // ORIENTAÇÃO AUTOMÁTICA
  // ========================================================

  console.log(
    "=================================================="
  );

  console.log(
    "🧭 BUSCANDO ORIGEM AUTOMÁTICA"
  );

  console.log(
    "=================================================="
  );

  const origemAutomatica =
    encontrarOrigemAutomatica(
      topologia
    );

  if (
    origemAutomatica
  ) {
    console.log(
      "📍 Origem encontrada:",
      origemAutomatica.pontoId
    );

    console.log(
      "🔎 Método:",
      origemAutomatica.metodo
    );

    console.log(
      "⭐ Pontuação:",
      origemAutomatica.pontuacao
    );

    const orientacao =
      orientarRedeEletrica(
        topologia,
        origemAutomatica.pontoId
      );

    orientacao.origemAutomatica =
      origemAutomatica;

    topologia.orientacaoEletrica =
      orientacao;

    console.log(
      "⚡ Orientação elétrica concluída"
    );

    console.log(
      "📍 Pontos orientados:",
      orientacao.quantidadePontos
    );

    console.log(
      "🔵 Trechos orientados:",
      orientacao.quantidadeTrechos
    );

    console.log(
      "⚠️ Pontos não orientados:",
      orientacao.quantidadePontosNaoOrientados
    );

    console.log(
      "⚠️ Trechos não orientados:",
      orientacao.quantidadeTrechosNaoOrientados
    );
  } else {
    console.warn(
      "⚠️ Não foi possível determinar automaticamente a origem elétrica."
    );
  }

  console.log(
    "=================================================="
  );

  return topologia;
}


// ==========================================================
// ORIENTAR TOPOLOGIA MANUALMENTE
// ==========================================================

export function orientarTopologia(
  topologia,
  pontoOrigem
) {
  if (!topologia) {
    return null;
  }

  console.log(
    "⚡ Orientando rede eletricamente..."
  );

  const orientacao =
    orientarRedeEletrica(
      topologia,
      pontoOrigem
    );

  topologia.orientacaoEletrica =
    orientacao;

  console.log(
    "=================================================="
  );

  console.log(
    "⚡ ORIENTAÇÃO ELÉTRICA"
  );

  console.log(
    "=================================================="
  );

  console.log(
    "Ponto origem:",
    orientacao.pontoOrigem
  );

  console.log(
    "Pontos orientados:",
    orientacao.quantidadePontos
  );

  console.log(
    "Trechos orientados:",
    orientacao.quantidadeTrechos
  );

  console.log(
    "Pontos não orientados:",
    orientacao.quantidadePontosNaoOrientados
  );

  console.log(
    "Trechos não orientados:",
    orientacao.quantidadeTrechosNaoOrientados
  );

  console.log(
    "=================================================="
  );

  return orientacao;
}


// ==========================================================
// ORIENTAR AUTOMATICAMENTE
// ==========================================================

export function orientarTopologiaAutomaticamente(
  topologia
) {
  if (!topologia) {
    return null;
  }

  const origem =
    encontrarOrigemAutomatica(
      topologia
    );

  if (!origem) {
    console.warn(
      "⚠️ Origem automática não encontrada."
    );

    return null;
  }

  console.log(
    "🧭 Origem automática:",
    origem.pontoId
  );

  const orientacao =
    orientarRedeEletrica(
      topologia,
      origem.pontoId
    );

  orientacao.origemAutomatica =
    origem;

  topologia.orientacaoEletrica =
    orientacao;

  return orientacao;
}


// ==========================================================
// BUSCAR PONTO
// ==========================================================

export function buscarPonto(
  topologia,
  codId
) {
  if (!topologia) {
    return null;
  }

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  return (
    topologia.pontos?.[id] ||
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
  if (!topologia) {
    return null;
  }

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  return (
    topologia.trechos?.[id] ||
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
  if (!topologia) {
    return [];
  }

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return [];
  }

  return (
    topologia.adjacencia?.[id] ||
    []
  );
}


// ==========================================================
// BUSCAR TRECHOS CONECTADOS
// ==========================================================

export function buscarTrechosConectados(
  topologia,
  codId
) {
  const conexoes =
    buscarConexoes(
      topologia,
      codId
    );

  return conexoes
    .map(
      (conexao) =>
        topologia?.trechos?.[
          conexao.trechoId
        ]
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR TRECHOS A PARTIR DE UM PONTO
// ==========================================================

export function buscarTrechosApartirDePonto(
  topologia,
  codId
) {
  if (!topologia) {
    return [];
  }

  const pontoId =
    normalizarId(
      codId
    );

  if (!pontoId) {
    return [];
  }

  const conexoes =
    topologia.adjacencia?.[
      pontoId
    ] || [];

  return conexoes
    .map(
      (conexao) => {
        const trecho =
          topologia.trechos?.[
            conexao.trechoId
          ];

        if (!trecho) {
          return null;
        }

        return {
          ...trecho,

          trechoId:
            conexao.trechoId,

          pontoOrigem:
            pontoId,

          pontoDestino:
            conexao.pontoDestino,

          sentido:
            conexao.sentido
        };
      }
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR TRECHOS DE SAÍDA
// ==========================================================

export function buscarTrechosDeSaida(
  topologia,
  codId
) {
  return buscarTrechosApartirDePonto(
    topologia,
    codId
  ).filter(
    (item) =>
      item.sentido === "SAIDA"
  );
}


// ==========================================================
// BUSCAR TRECHOS DE ENTRADA
// ==========================================================

export function buscarTrechosDeEntrada(
  topologia,
  codId
) {
  return buscarTrechosApartirDePonto(
    topologia,
    codId
  ).filter(
    (item) =>
      item.sentido === "ENTRADA"
  );
}


// ==========================================================
// VERIFICAR TERMINAL
// ==========================================================

export function pontoEhTerminal(
  topologia,
  codId
) {
  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(
      codId
    );

  return (
    topologia.terminais?.includes(
      id
    ) || false
  );
}


// ==========================================================
// VERIFICAR DERIVAÇÃO
// ==========================================================

export function pontoEhDerivacao(
  topologia,
  codId
) {
  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(
      codId
    );

  return (
    topologia.derivacoes?.some(
      (item) =>
        item.pontoId === id
    ) || false
  );
}


// ==========================================================
// VERIFICAR PASSAGEM
// ==========================================================

export function pontoEhPassagem(
  topologia,
  codId
) {
  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(
      codId
    );

  return (
    topologia.passagens?.includes(
      id
    ) || false
  );
}


// ==========================================================
// BUSCAR PONTO DESTINO DE UM TRECHO
// ==========================================================

export function buscarPontoDestino(
  topologia,
  trechoId,
  pontoOrigem
) {
  const trecho =
    buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return null;
  }

  const origem =
    normalizarId(
      pontoOrigem
    );

  if (!origem) {
    return null;
  }

  if (
    normalizarId(
      trecho.pontoInicial
    ) === origem
  ) {
    return buscarPonto(
      topologia,
      trecho.pontoFinal
    );
  }

  if (
    normalizarId(
      trecho.pontoFinal
    ) === origem
  ) {
    return buscarPonto(
      topologia,
      trecho.pontoInicial
    );
  }

  return null;
}


// ==========================================================
// BUSCAR REDE A JUSANTE
// ==========================================================

export function buscarRedeAJusante(
  topologia,
  pontoInicial,
  opcoes = {}
) {
  if (!topologia) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: [],
      terminais: [],
      derivacoes: [],
      quantidadePontos: 0,
      quantidadeTrechos: 0,
      quantidadeTerminais: 0,
      quantidadeDerivacoes: 0
    };
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: [],
      terminais: [],
      derivacoes: [],
      quantidadePontos: 0,
      quantidadeTrechos: 0,
      quantidadeTerminais: 0,
      quantidadeDerivacoes: 0
    };
  }

  const orientacao =
    topologia.orientacaoEletrica;

  // ========================================================
  // REDE ORIENTADA
  // ========================================================

  if (
    orientacao?.pontos
  ) {
    const pontosVisitados =
      new Set();

    const trechosVisitados =
      new Set();

    const fila = [
      inicio
    ];

    const pontosEncontrados = [];

    const trechosEncontrados = [];

    const terminaisEncontrados = [];

    const derivacoesEncontradas = [];

    while (
      fila.length > 0
    ) {
      const pontoAtual =
        normalizarId(
          fila.shift()
        );

      if (!pontoAtual) {
        continue;
      }

      if (
        pontosVisitados.has(
          pontoAtual
        )
      ) {
        continue;
      }

      pontosVisitados.add(
        pontoAtual
      );

      const ponto =
        buscarPonto(
          topologia,
          pontoAtual
        );

      if (ponto) {
        pontosEncontrados.push(
          ponto
        );
      }

      if (
        pontoEhTerminal(
          topologia,
          pontoAtual
        )
      ) {
        terminaisEncontrados.push(
          pontoAtual
        );
      }

      if (
        pontoEhDerivacao(
          topologia,
          pontoAtual
        )
      ) {
        derivacoesEncontradas.push(
          pontoAtual
        );
      }

      for (
        const trechoId of Object.keys(
          orientacao.trechos || {}
        )
      ) {
        const trechoOrientado =
          orientacao.trechos[
            trechoId
          ];

        if (
          trechoOrientado.pontoMontante !==
          pontoAtual
        ) {
          continue;
        }

        const destino =
          normalizarId(
            trechoOrientado.pontoJusante
          );

        if (!destino) {
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

          trechosEncontrados.push({
            ...trechoOrientado,

            trechoId,

            pontoOrigem:
              pontoAtual,

            pontoDestino:
              destino,

            sentido:
              "JUSANTE"
          });
        }

        if (
          !pontosVisitados.has(
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
        inicio,

      pontos:
        pontosEncontrados,

      trechos:
        trechosEncontrados,

      terminais:
        terminaisEncontrados,

      derivacoes:
        derivacoesEncontradas,

      quantidadePontos:
        pontosEncontrados.length,

      quantidadeTrechos:
        trechosEncontrados.length,

      quantidadeTerminais:
        terminaisEncontrados.length,

      quantidadeDerivacoes:
        derivacoesEncontradas.length
    };
  }

  // ========================================================
  // FALLBACK SEM ORIENTAÇÃO
  // ========================================================

  const incluirEntrada =
    opcoes.incluirEntrada === true;

  const pontosVisitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [
    inicio
  ];

  const pontosEncontrados = [];

  const trechosEncontrados = [];

  const terminaisEncontrados = [];

  const derivacoesEncontradas = [];

  while (
    fila.length > 0
  ) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (
      pontosVisitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    pontosVisitados.add(
      pontoAtual
    );

    const ponto =
      buscarPonto(
        topologia,
        pontoAtual
      );

    if (ponto) {
      pontosEncontrados.push(
        ponto
      );
    }

    if (
      pontoEhTerminal(
        topologia,
        pontoAtual
      )
    ) {
      terminaisEncontrados.push(
        pontoAtual
      );
    }

    if (
      pontoEhDerivacao(
        topologia,
        pontoAtual
      )
    ) {
      derivacoesEncontradas.push(
        pontoAtual
      );
    }

    const conexoes =
      buscarConexoes(
        topologia,
        pontoAtual
      );

    for (
      const conexao of conexoes
    ) {
      if (
        !incluirEntrada &&
        conexao.sentido !== "SAIDA"
      ) {
        continue;
      }

      const trechoId =
        conexao.trechoId;

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      if (!trechoId) {
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

        const trecho =
          buscarTrechoBDGD(
            topologia,
            trechoId
          );

        if (trecho) {
          trechosEncontrados.push({
            ...trecho,

            trechoId,

            pontoOrigem:
              pontoAtual,

            pontoDestino:
              destino,

            sentido:
              conexao.sentido
          });
        }
      }

      if (
        destino &&
        !pontosVisitados.has(
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
      inicio,

    pontos:
      pontosEncontrados,

    trechos:
      trechosEncontrados,

    terminais:
      terminaisEncontrados,

    derivacoes:
      derivacoesEncontradas,

    quantidadePontos:
      pontosEncontrados.length,

    quantidadeTrechos:
      trechosEncontrados.length,

    quantidadeTerminais:
      terminaisEncontrados.length,

    quantidadeDerivacoes:
      derivacoesEncontradas.length
  };
}


// ==========================================================
// BUSCAR REDE A MONTANTE
// ==========================================================

export function buscarRedeAMontante(
  topologia,
  pontoInicial
) {
  if (!topologia) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: []
    };
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: []
    };
  }

  const orientacao =
    topologia.orientacaoEletrica;

  if (
    !orientacao?.pontos?.[inicio]
  ) {
    return {
      pontoInicial:
        inicio,

      pontos: [],

      trechos: [],

      erro:
        "Ponto ainda não possui orientação elétrica."
    };
  }

  const pontosEncontrados = [];

  const trechosEncontrados = [];

  const visitados =
    new Set();

  let pontoAtual =
    inicio;

  while (
    pontoAtual &&
    !visitados.has(
      pontoAtual
    )
  ) {
    visitados.add(
      pontoAtual
    );

    const ponto =
      orientacao.pontos[
        pontoAtual
      ];

    if (!ponto) {
      break;
    }

    pontosEncontrados.push(
      ponto
    );

    const trechoMontante =
      ponto.trechoMontante;

    const pontoMontante =
      ponto.pontoMontante;

    if (
      !trechoMontante ||
      !pontoMontante
    ) {
      break;
    }

    const trecho =
      orientacao.trechos?.[
        trechoMontante
      ];

    if (trecho) {
      trechosEncontrados.push({
        ...trecho,

        trechoId:
          trechoMontante,

        pontoOrigem:
          pontoMontante,

        pontoDestino:
          pontoAtual,

        sentido:
          "MONTANTE"
      });
    }

    pontoAtual =
      pontoMontante;
  }

  return {
    pontoInicial:
      inicio,

    pontos:
      pontosEncontrados,

    trechos:
      trechosEncontrados,

    quantidadePontos:
      pontosEncontrados.length,

    quantidadeTrechos:
      trechosEncontrados.length
  };
}


// ==========================================================
// BUSCAR REDE CONECTADA
// ==========================================================

export function buscarRedeConectada(
  topologia,
  pontoInicial
) {
  if (!topologia) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: []
    };
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: []
    };
  }

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [
    inicio
  ];

  const pontosEncontrados = [];

  const trechosEncontrados = [];

  while (
    fila.length > 0
  ) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (
      visitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    visitados.add(
      pontoAtual
    );

    const ponto =
      buscarPonto(
        topologia,
        pontoAtual
      );

    if (ponto) {
      pontosEncontrados.push(
        ponto
      );
    }

    const conexoes =
      buscarConexoes(
        topologia,
        pontoAtual
      );

    for (
      const conexao of conexoes
    ) {
      const trechoId =
        conexao.trechoId;

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      if (
        trechoId &&
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          trechoId
        );

        const trecho =
          buscarTrechoBDGD(
            topologia,
            trechoId
          );

        if (trecho) {
          trechosEncontrados.push({
            ...trecho,

            trechoId,

            pontoOrigem:
              pontoAtual,

            pontoDestino:
              destino,

            sentido:
              conexao.sentido
          });
        }
      }

      if (
        destino &&
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
      inicio,

    pontos:
      pontosEncontrados,

    trechos:
      trechosEncontrados,

    quantidadePontos:
      pontosEncontrados.length,

    quantidadeTrechos:
      trechosEncontrados.length
  };
}


// ==========================================================
// ENCONTRAR CAMINHO ENTRE DOIS PONTOS
// ==========================================================
//
// IMPORTANTE:
//
// Esta função é de conectividade física.
//
// Não considera montante/jusante.
//
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoOrigem,
  pontoDestino
) {
  if (!topologia) {
    return {
      encontrado: false,
      pontos: [],
      trechos: []
    };
  }

  const origem =
    normalizarId(
      pontoOrigem
    );

  const destino =
    normalizarId(
      pontoDestino
    );

  if (
    !origem ||
    !destino
  ) {
    return {
      encontrado: false,
      pontos: [],
      trechos: []
    };
  }

  if (
    origem === destino
  ) {
    return {
      encontrado: true,

      pontos: [
        origem
      ],

      trechos: []
    };
  }

  const fila = [
    origem
  ];

  const visitados =
    new Set([
      origem
    ]);

  const anterior = {};

  while (
    fila.length > 0
  ) {
    const atual =
      fila.shift();

    const conexoes =
      buscarConexoes(
        topologia,
        atual
      );

    for (
      const conexao of conexoes
    ) {
      const proximo =
        normalizarId(
          conexao.pontoDestino
        );

      if (!proximo) {
        continue;
      }

      if (
        visitados.has(
          proximo
        )
      ) {
        continue;
      }

      visitados.add(
        proximo
      );

      anterior[proximo] = {
        pontoAnterior:
          atual,

        trechoId:
          conexao.trechoId
      };

      if (
        proximo === destino
      ) {
        const pontos = [];

        const trechos = [];

        let atualCaminho =
          destino;

        while (
          atualCaminho !==
          origem
        ) {
          pontos.unshift(
            atualCaminho
          );

          const etapa =
            anterior[
              atualCaminho
            ];

          if (!etapa) {
            break;
          }

          trechos.unshift(
            etapa.trechoId
          );

          atualCaminho =
            etapa.pontoAnterior;
        }

        pontos.unshift(
          origem
        );

        return {
          encontrado: true,

          pontos,

          trechos
        };
      }

      fila.push(
        proximo
      );
    }
  }

  return {
    encontrado: false,

    pontos: [],

    trechos: []
  };
}


// ==========================================================
// ENCONTRAR CAMINHO ELÉTRICO
// ==========================================================

export function buscarCaminhoEletrico(
  topologia,
  pontoOrigem,
  pontoDestino
) {
  if (!topologia) {
    return {
      encontrado: false,
      pontos: [],
      trechos: []
    };
  }

  const origem =
    normalizarId(
      pontoOrigem
    );

  const destino =
    normalizarId(
      pontoDestino
    );

  if (
    !origem ||
    !destino
  ) {
    return {
      encontrado: false,
      pontos: [],
      trechos: []
    };
  }

  if (
    origem === destino
  ) {
    return {
      encontrado: true,

      pontos: [
        origem
      ],

      trechos: []
    };
  }

  const orientacao =
    topologia.orientacaoEletrica;

  if (!orientacao) {
    return {
      encontrado: false,

      pontos: [],

      trechos: [],

      erro:
        "A topologia ainda não foi orientada eletricamente."
    };
  }

  const fila = [
    origem
  ];

  const visitados =
    new Set([
      origem
    ]);

  const anterior = {};

  while (
    fila.length > 0
  ) {
    const atual =
      fila.shift();

    for (
      const trechoId of Object.keys(
        orientacao.trechos || {}
      )
    ) {
      const trecho =
        orientacao.trechos[
          trechoId
        ];

      if (
        trecho.pontoMontante !==
        atual
      ) {
        continue;
      }

      const proximo =
        normalizarId(
          trecho.pontoJusante
        );

      if (!proximo) {
        continue;
      }

      if (
        visitados.has(
          proximo
        )
      ) {
        continue;
      }

      visitados.add(
        proximo
      );

      anterior[proximo] = {
        pontoAnterior:
          atual,

        trechoId
      };

      if (
        proximo === destino
      ) {
        const pontos = [];

        const trechos = [];

        let atualCaminho =
          destino;

        while (
          atualCaminho !==
          origem
        ) {
          pontos.unshift(
            atualCaminho
          );

          const etapa =
            anterior[
              atualCaminho
            ];

          if (!etapa) {
            break;
          }

          trechos.unshift(
            etapa.trechoId
          );

          atualCaminho =
            etapa.pontoAnterior;
        }

        pontos.unshift(
          origem
        );

        return {
          encontrado: true,

          pontos,

          trechos
        };
      }

      fila.push(
        proximo
      );
    }
  }

  return {
    encontrado: false,

    pontos: [],

    trechos: []
  };
}


// ==========================================================
// BUSCAR REDE A JUSANTE DE UM TRECHO
// ==========================================================

export function buscarRedeAJusanteDoTrecho(
  topologia,
  trechoId
) {
  if (!topologia) {
    return {
      trechoInicial: null,
      pontoJusante: null,
      pontos: [],
      trechos: []
    };
  }

  const id =
    normalizarId(
      trechoId
    );

  if (!id) {
    return {
      trechoInicial: null,
      pontoJusante: null,
      pontos: [],
      trechos: []
    };
  }

  const orientacao =
    topologia.orientacaoEletrica;

  const trecho =
    orientacao?.trechos?.[
      id
    ];

  if (!trecho) {
    return {
      trechoInicial:
        id,

      pontoJusante:
        null,

      pontos: [],

      trechos: [],

      erro:
        "Trecho não possui orientação elétrica."
    };
  }

  const pontoJusante =
    normalizarId(
      trecho.pontoJusante
    );

  if (!pontoJusante) {
    return {
      trechoInicial:
        id,

      pontoJusante:
        null,

      pontos: [],

      trechos: []
    };
  }

  const resultado =
    buscarRedeAJusante(
      topologia,
      pontoJusante
    );

  return {
    trechoInicial:
      id,

    pontoJusante,

    pontos:
      resultado.pontos,

    trechos: [
      trecho,
      ...resultado.trechos
    ],

    terminais:
      resultado.terminais,

    derivacoes:
      resultado.derivacoes,

    quantidadePontos:
      resultado.quantidadePontos,

    quantidadeTrechos:
      resultado.quantidadeTrechos + 1,

    quantidadeTerminais:
      resultado.quantidadeTerminais,

    quantidadeDerivacoes:
      resultado.quantidadeDerivacoes
  };
}


// ==========================================================
// RESUMO DE UM PONTO
// ==========================================================

export function obterResumoPonto(
  topologia,
  codId
) {
  const ponto =
    buscarPonto(
      topologia,
      codId
    );

  if (!ponto) {
    return null;
  }

  const conexoes =
    buscarConexoes(
      topologia,
      codId
    );

  const orientacao =
    topologia
      ?.orientacaoEletrica
      ?.pontos?.[
        ponto.id
      ] || null;

  return {
    pontoId:
      ponto.id,

    tipo:
      ponto.tipo,

    latitude:
      ponto.latitude,

    longitude:
      ponto.longitude,

    conexoes:
      conexoes.length,

    terminal:
      pontoEhTerminal(
        topologia,
        codId
      ),

    passagem:
      pontoEhPassagem(
        topologia,
        codId
      ),

    derivacao:
      pontoEhDerivacao(
        topologia,
        codId
      ),

    nivel:
      orientacao?.nivel ??
      null,

    pontoMontante:
      orientacao?.pontoMontante ??
      null,

    trechoMontante:
      orientacao?.trechoMontante ??
      null,

    origem:
      orientacao?.origem ??
      false,

    conexoesDetalhadas:
      conexoes
  };
}


// ==========================================================
// RESUMO DE UM TRECHO
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

  const orientacao =
    topologia
      ?.orientacaoEletrica
      ?.trechos?.[
        trecho.id
      ] || null;

  return {
    trechoId:
      trecho.id,

    pontoInicial:
      trecho.pontoInicial,

    pontoFinal:
      trecho.pontoFinal,

    alimentador:
      trecho.alimentador,

    circuito:
      trecho.circuito,

    subestacao:
      trecho.subestacao,

    comprimento:
      trecho.comprimento,

    pontoMontante:
      orientacao?.pontoMontante ??
      null,

    pontoJusante:
      orientacao?.pontoJusante ??
      null,

    nivel:
      orientacao?.nivel ??
      null,

    orientado:
      !!orientacao
  };
}


// ==========================================================
// EXPORTAR NORMALIZADOR
// ==========================================================

export {
  normalizarId
};