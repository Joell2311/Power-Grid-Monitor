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
// Objetivos:
//
// 1. Criar mapa de pontos
// 2. Criar mapa de trechos
// 3. Criar conectividade
// 4. Validar integridade
// 5. Identificar terminais
// 6. Identificar passagens
// 7. Identificar derivações
// 8. Permitir navegação pela rede
// 9. Permitir busca de rede a jusante
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
// Cada ponto conhece os trechos ligados a ele.
//
// Exemplo:
//
// PONTO A
//   |
//   └── TRECHO 1 -> PONTO B
//
// PONTO B
//   |
//   ├── TRECHO 1 -> PONTO A
//   └── TRECHO 2 -> PONTO C
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

    // ------------------------------------------
    // INÍCIO -> FIM
    // ------------------------------------------

    adjacencia[inicio].push({
      trechoId,

      pontoOrigem:
        inicio,

      pontoDestino:
        fim,

      sentido:
        "SAIDA"
    });

    // ------------------------------------------
    // FIM -> INÍCIO
    // ------------------------------------------

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
// IDENTIFICAR CICLOS SIMPLES
// ==========================================================
//
// Não considera automaticamente um ciclo como erro.
// A rede pode possuir configurações que formem malhas.
//
// Aqui apenas registramos a existência de conexões
// alternativas durante a navegação.
//
// ==========================================================


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
  // INFORMAÇÕES DO CIRCUITO
  // ------------------------------------------

  const primeiroTrecho =
    Object.values(
      trechos
    )[0] || null;

  const topologia = {
    alimentador:
      primeiroTrecho?.alimentador ||
      null,

    circuito:
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

  // ========================================================
  // LOG
  // ========================================================

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

  // ========================================================
  // INTEGRIDADE
  // ========================================================

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

  return topologia;
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
// BUSCAR CONEXÕES DE UM PONTO
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
  if (!topologia) {
    return [];
  }

  const conexoes =
    buscarConexoes(
      topologia,
      codId
    );

  return conexoes
    .map(
      (conexao) =>
        topologia.trechos?.[
          conexao.trechoId
        ]
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR TRECHOS A PARTIR DE UM PONTO
// ==========================================================
//
// IMPORTANTE:
//
// O nome correto é:
//
// buscarTrechosApartirDePonto
//
// Sem espaço.
//
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
//
// Retorna somente conexões classificadas como SAIDA.
//
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
// VERIFICAR SE É TERMINAL
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
// VERIFICAR SE É DERIVAÇÃO
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
// VERIFICAR SE É PASSAGEM
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
  if (!topologia) {
    return null;
  }

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
//
// Percorre a rede a partir de um ponto.
//
// A função:
// 
// - evita loops
// - registra pontos visitados
// - registra trechos visitados
// - encontra terminais
// - encontra derivações
//
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
      quantidadeTrechos: 0
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
      quantidadeTrechos: 0
    };
  }

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
      fila.shift();

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

    // ------------------------------------------
    // TERMINAL
    // ------------------------------------------

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

    // ------------------------------------------
    // DERIVAÇÃO
    // ------------------------------------------

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

    // ------------------------------------------
    // CONEXÕES
    // ------------------------------------------

    const conexoes =
      buscarConexoes(
        topologia,
        pontoAtual
      );

    for (
      const conexao of conexoes
    ) {
      // ----------------------------------------
      // POR PADRÃO, CAMINHAMOS PELA SAÍDA
      // ----------------------------------------

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
          trechosEncontrados.push(
            {
              ...trecho,

              pontoOrigem:
                pontoAtual,

              pontoDestino:
                destino,

              sentido:
                conexao.sentido
            }
          );
        }
      }

      // ----------------------------------------
      // ADICIONAR DESTINO À FILA
      // ----------------------------------------

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
    pontoInicial: inicio,

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
// BUSCAR REDE CONECTADA
// ==========================================================
//
// Diferente da função anterior, esta percorre em ambas
// as direções.
//
// Útil para descobrir toda a rede pertencente a uma
// determinada ilha/conjunto conectado.
//
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
      fila.shift();

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
          trechosEncontrados.push(
            {
              ...trecho,

              pontoOrigem:
                pontoAtual,

              pontoDestino:
                destino,

              sentido:
                conexao.sentido
            }
          );
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
    pontoInicial: inicio,

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
// Exemplo:
//
// buscarCaminho(
//   topologia,
//   "1140323",
//   "1140350"
// )
//
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoOrigem,
  pontoDestino
) {
  if (!topologia) {
    return null;
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
    return null;
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

    conexoesDetalhadas:
      conexoes
  };
}


// ==========================================================
// EXPORTAR NORMALIZADOR
// ==========================================================
//
// Mantemos exportado para facilitar testes futuros.
//
// ==========================================================

export {
  normalizarId
};