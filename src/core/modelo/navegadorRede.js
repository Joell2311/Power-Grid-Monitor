// ==========================================================
// NAVEGADOR DA REDE BDGD
// COI MONITOR
// ==========================================================
//
// Responsável por navegar pela topologia criada em:
//
//    topologiaBDGD.js
//
// Principais funções:
//
// 1. Buscar ponto
// 2. Buscar trecho
// 3. Buscar conexões
// 4. Buscar entradas
// 5. Buscar saídas
// 6. Navegar a jusante
// 7. Navegar a montante
// 8. Buscar rede conectada
// 9. Encontrar caminho entre pontos
// 10. Identificar terminais
// 11. Identificar derivações
// 12. Identificar passagens
// 13. Analisar ponto
//
// ==========================================================


// ==========================================================
// NORMALIZAR ID
// ==========================================================

export function normalizarId(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const id = String(valor).trim();

  return id.length > 0
    ? id
    : null;
}


// ==========================================================
// RESULTADO VAZIO - NAVEGAÇÃO
// ==========================================================

function resultadoVazio() {

  return {

    encontrado: false,

    pontoInicial: null,

    pontos: [],

    trechos: [],

    terminais: [],

    derivacoes: [],

    passagens: [],

    quantidadePontos: 0,

    quantidadeTrechos: 0,

    quantidadeTerminais: 0,

    quantidadeDerivacoes: 0,

    quantidadePassagens: 0
  };
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
    normalizarId(codId);

  if (!id) {
    return null;
  }

  return (
    topologia.pontos?.[id] ??
    null
  );
}


// ==========================================================
// BUSCAR TRECHO
// ==========================================================

export function buscarTrecho(
  topologia,
  codId
) {

  if (!topologia) {
    return null;
  }

  const id =
    normalizarId(codId);

  if (!id) {
    return null;
  }

  return (
    topologia.trechos?.[id] ??
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
    normalizarId(codId);

  if (!id) {
    return [];
  }

  const conexoes =
    topologia.adjacencia?.[id];

  if (!Array.isArray(conexoes)) {
    return [];
  }

  return conexoes;
}


// ==========================================================
// BUSCAR CONEXÕES DE SAÍDA
// ==========================================================

export function buscarSaidas(
  topologia,
  codId
) {

  return buscarConexoes(
    topologia,
    codId
  ).filter(
    conexao =>
      conexao?.sentido === "SAIDA"
  );
}


// ==========================================================
// BUSCAR CONEXÕES DE ENTRADA
// ==========================================================

export function buscarEntradas(
  topologia,
  codId
) {

  return buscarConexoes(
    topologia,
    codId
  ).filter(
    conexao =>
      conexao?.sentido === "ENTRADA"
  );
}


// ==========================================================
// VERIFICAR TERMINAL
// ==========================================================

export function ehTerminal(
  topologia,
  codId
) {

  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(codId);

  if (!id) {
    return false;
  }

  return (
    Array.isArray(topologia.terminais) &&
    topologia.terminais.includes(id)
  );
}


// ==========================================================
// VERIFICAR DERIVAÇÃO
// ==========================================================

export function ehDerivacao(
  topologia,
  codId
) {

  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(codId);

  if (!id) {
    return false;
  }

  if (
    !Array.isArray(
      topologia.derivacoes
    )
  ) {
    return false;
  }

  return topologia.derivacoes.some(
    item => {

      if (
        item === null ||
        item === undefined
      ) {
        return false;
      }

      // Caso a topologia guarde apenas o ID
      if (
        typeof item !== "object"
      ) {

        return (
          normalizarId(item) === id
        );
      }

      // Caso guarde { pontoId: "..." }
      return (
        normalizarId(
          item.pontoId
        ) === id
      );
    }
  );
}


// ==========================================================
// VERIFICAR PASSAGEM
// ==========================================================

export function ehPassagem(
  topologia,
  codId
) {

  if (!topologia) {
    return false;
  }

  const id =
    normalizarId(codId);

  if (!id) {
    return false;
  }

  if (
    !Array.isArray(
      topologia.passagens
    )
  ) {
    return false;
  }

  return topologia.passagens.some(
    item => {

      if (
        item === null ||
        item === undefined
      ) {
        return false;
      }

      if (
        typeof item !== "object"
      ) {

        return (
          normalizarId(item) === id
        );
      }

      return (
        normalizarId(
          item.pontoId
        ) === id
      );
    }
  );
}


// ==========================================================
// OBTER DESTINO DE UMA CONEXÃO
// ==========================================================
//
// A topologia normalmente possui:
//
// conexao.pontoDestino
//
// Mas deixamos uma proteção para estruturas alternativas.
//

function obterPontoDestino(
  conexao
) {

  if (!conexao) {
    return null;
  }

  return normalizarId(
    conexao.pontoDestino
  );
}


// ==========================================================
// OBTER ID DO TRECHO
// ==========================================================

function obterTrechoId(
  conexao
) {

  if (!conexao) {
    return null;
  }

  return normalizarId(
    conexao.trechoId
  );
}


// ==========================================================
// ADICIONAR TRECHO
// ==========================================================

function criarTrechoNavegado(
  topologia,
  conexao,
  pontoOrigem,
  pontoDestino,
  sentido
) {

  const trechoId =
    obterTrechoId(conexao);

  if (!trechoId) {
    return null;
  }

  const trecho =
    buscarTrecho(
      topologia,
      trechoId
    );

  if (!trecho) {
    return null;
  }

  return {

    ...trecho,

    pontoOrigem:
      normalizarId(pontoOrigem),

    pontoDestino:
      normalizarId(pontoDestino),

    sentido

  };
}


// ==========================================================
// NAVEGAR A JUSANTE
// ==========================================================
//
// Percorre:
//
// PONTO
//   ↓
// TRECHO
//   ↓
// PONTO
//
// Utiliza somente conexões SAIDA.
//
// ==========================================================

export function navegarAJusante(
  topologia,
  pontoInicial,
  opcoes = {}
) {

  if (!topologia) {
    return resultadoVazio();
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return resultadoVazio();
  }

  const pontoInicio =
    buscarPonto(
      topologia,
      inicio
    );

  if (!pontoInicio) {

    return {
      ...resultadoVazio(),

      pontoInicial:
        inicio
    };
  }

  const incluirInicial =
    opcoes.incluirInicial !== false;

  const limitarProfundidade =
    Number.isFinite(
      opcoes.maxProfundidade
    )
      ? opcoes.maxProfundidade
      : Infinity;

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [

    {
      pontoId: inicio,
      profundidade: 0
    }

  ];

  const pontos = [];
  const trechos = [];
  const terminais = [];
  const derivacoes = [];
  const passagens = [];

  while (
    fila.length > 0
  ) {

    const item =
      fila.shift();

    const pontoAtual =
      normalizarId(
        item.pontoId
      );

    const profundidade =
      item.profundidade;

    if (!pontoAtual) {
      continue;
    }

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

    if (
      ponto &&
      (
        incluirInicial ||
        pontoAtual !== inicio
      )
    ) {

      pontos.push(
        ponto
      );
    }

    // ------------------------------------------------------
    // TERMINAL
    // ------------------------------------------------------

    if (
      ehTerminal(
        topologia,
        pontoAtual
      )
    ) {

      terminais.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // DERIVAÇÃO
    // ------------------------------------------------------

    if (
      ehDerivacao(
        topologia,
        pontoAtual
      )
    ) {

      derivacoes.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // PASSAGEM
    // ------------------------------------------------------

    if (
      ehPassagem(
        topologia,
        pontoAtual
      )
    ) {

      passagens.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // LIMITE DE PROFUNDIDADE
    // ------------------------------------------------------

    if (
      profundidade >=
      limitarProfundidade
    ) {
      continue;
    }

    // ------------------------------------------------------
    // SAÍDAS
    // ------------------------------------------------------

    const saidas =
      buscarSaidas(
        topologia,
        pontoAtual
      );

    for (
      const conexao of saidas
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      const destino =
        obterPontoDestino(
          conexao
        );

      if (
        !trechoId ||
        !destino
      ) {
        continue;
      }

      // ----------------------------------------------------
      // TRECHO
      // ----------------------------------------------------

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {

        trechosVisitados.add(
          trechoId
        );

        const trecho =
          criarTrechoNavegado(
            topologia,
            conexao,
            pontoAtual,
            destino,
            "SAIDA"
          );

        if (trecho) {
          trechos.push(
            trecho
          );
        }
      }

      // ----------------------------------------------------
      // DESTINO
      // ----------------------------------------------------

      if (
        !visitados.has(
          destino
        )
      ) {

        fila.push({

          pontoId:
            destino,

          profundidade:
            profundidade + 1

        });
      }
    }
  }

  return {

    encontrado: true,

    pontoInicial:
      inicio,

    pontos,

    trechos,

    terminais,

    derivacoes,

    passagens,

    quantidadePontos:
      pontos.length,

    quantidadeTrechos:
      trechos.length,

    quantidadeTerminais:
      terminais.length,

    quantidadeDerivacoes:
      derivacoes.length,

    quantidadePassagens:
      passagens.length
  };
}


// ==========================================================
// NAVEGAR A MONTANTE
// ==========================================================
//
// Percorre conexões ENTRADA.
//
// A lógica é:
//
// PONTO ATUAL
//      ↑
// TRECHO
//      ↑
// PONTO ANTERIOR
//
// ==========================================================

export function navegarAMontante(
  topologia,
  pontoInicial,
  opcoes = {}
) {

  if (!topologia) {
    return resultadoVazio();
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return resultadoVazio();
  }

  const pontoInicio =
    buscarPonto(
      topologia,
      inicio
    );

  if (!pontoInicio) {

    return {
      ...resultadoVazio(),

      pontoInicial:
        inicio
    };
  }

  const incluirInicial =
    opcoes.incluirInicial !== false;

  const limitarProfundidade =
    Number.isFinite(
      opcoes.maxProfundidade
    )
      ? opcoes.maxProfundidade
      : Infinity;

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [

    {
      pontoId: inicio,
      profundidade: 0
    }

  ];

  const pontos = [];
  const trechos = [];
  const terminais = [];
  const derivacoes = [];
  const passagens = [];

  while (
    fila.length > 0
  ) {

    const item =
      fila.shift();

    const pontoAtual =
      normalizarId(
        item.pontoId
      );

    const profundidade =
      item.profundidade;

    if (!pontoAtual) {
      continue;
    }

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

    if (
      ponto &&
      (
        incluirInicial ||
        pontoAtual !== inicio
      )
    ) {

      pontos.push(
        ponto
      );
    }

    // ------------------------------------------------------
    // TERMINAL
    // ------------------------------------------------------

    if (
      ehTerminal(
        topologia,
        pontoAtual
      )
    ) {

      terminais.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // DERIVAÇÃO
    // ------------------------------------------------------

    if (
      ehDerivacao(
        topologia,
        pontoAtual
      )
    ) {

      derivacoes.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // PASSAGEM
    // ------------------------------------------------------

    if (
      ehPassagem(
        topologia,
        pontoAtual
      )
    ) {

      passagens.push(
        pontoAtual
      );
    }

    // ------------------------------------------------------
    // LIMITE
    // ------------------------------------------------------

    if (
      profundidade >=
      limitarProfundidade
    ) {
      continue;
    }

    // ------------------------------------------------------
    // ENTRADAS
    // ------------------------------------------------------

    const entradas =
      buscarEntradas(
        topologia,
        pontoAtual
      );

    for (
      const conexao of entradas
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      const pontoAnterior =
        obterPontoDestino(
          conexao
        );

      if (
        !trechoId ||
        !pontoAnterior
      ) {
        continue;
      }

      // ----------------------------------------------------
      // TRECHO
      // ----------------------------------------------------

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {

        trechosVisitados.add(
          trechoId
        );

        const trecho =
          criarTrechoNavegado(
            topologia,
            conexao,
            pontoAtual,
            pontoAnterior,
            "ENTRADA"
          );

        if (trecho) {
          trechos.push(
            trecho
          );
        }
      }

      // ----------------------------------------------------
      // PONTO ANTERIOR
      // ----------------------------------------------------

      if (
        !visitados.has(
          pontoAnterior
        )
      ) {

        fila.push({

          pontoId:
            pontoAnterior,

          profundidade:
            profundidade + 1

        });
      }
    }
  }

  return {

    encontrado: true,

    pontoInicial:
      inicio,

    pontos,

    trechos,

    terminais,

    derivacoes,

    passagens,

    quantidadePontos:
      pontos.length,

    quantidadeTrechos:
      trechos.length,

    quantidadeTerminais:
      terminais.length,

    quantidadeDerivacoes:
      derivacoes.length,

    quantidadePassagens:
      passagens.length
  };
}


// ==========================================================
// BUSCAR REDE CONECTADA
// ==========================================================
//
// Percorre a rede nos dois sentidos.
//
// ==========================================================

export function buscarRedeConectada(
  topologia,
  pontoInicial
) {

  if (!topologia) {
    return resultadoVazio();
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return resultadoVazio();
  }

  const pontoInicio =
    buscarPonto(
      topologia,
      inicio
    );

  if (!pontoInicio) {

    return {
      ...resultadoVazio(),

      pontoInicial:
        inicio
    };
  }

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila = [
    inicio
  ];

  const pontos = [];
  const trechos = [];

  while (
    fila.length > 0
  ) {

    const atual =
      normalizarId(
        fila.shift()
      );

    if (!atual) {
      continue;
    }

    if (
      visitados.has(
        atual
      )
    ) {
      continue;
    }

    visitados.add(
      atual
    );

    const ponto =
      buscarPonto(
        topologia,
        atual
      );

    if (ponto) {
      pontos.push(
        ponto
      );
    }

    const conexoes =
      buscarConexoes(
        topologia,
        atual
      );

    for (
      const conexao of conexoes
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      const destino =
        obterPontoDestino(
          conexao
        );

      if (
        !trechoId ||
        !destino
      ) {
        continue;
      }

      // ----------------------------------------------------
      // TRECHO
      // ----------------------------------------------------

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {

        trechosVisitados.add(
          trechoId
        );

        const trecho =
          criarTrechoNavegado(
            topologia,
            conexao,
            atual,
            destino,
            conexao.sentido
          );

        if (trecho) {
          trechos.push(
            trecho
          );
        }
      }

      // ----------------------------------------------------
      // DESTINO
      // ----------------------------------------------------

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

    encontrado: true,

    pontoInicial:
      inicio,

    pontos,

    trechos,

    quantidadePontos:
      pontos.length,

    quantidadeTrechos:
      trechos.length
  };
}


// ==========================================================
// ENCONTRAR CAMINHO
// ==========================================================
//
// Busca o menor caminho entre dois pontos.
//
// Usa BFS.
//
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoOrigem,
  pontoDestino,
  opcoes = {}
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

  // --------------------------------------------------------
  // VERIFICAR EXISTÊNCIA
  // --------------------------------------------------------

  if (
    !buscarPonto(
      topologia,
      origem
    )
  ) {

    return {
      encontrado: false,
      pontos: [],
      trechos: [],
      motivo:
        "PONTO_ORIGEM_NAO_ENCONTRADO"
    };
  }

  if (
    !buscarPonto(
      topologia,
      destino
    )
  ) {

    return {
      encontrado: false,
      pontos: [],
      trechos: [],
      motivo:
        "PONTO_DESTINO_NAO_ENCONTRADO"
    };
  }

  // --------------------------------------------------------
  // MESMO PONTO
  // --------------------------------------------------------

  if (
    origem === destino
  ) {

    return {

      encontrado: true,

      pontos: [
        origem
      ],

      trechos: [],

      quantidadePontos: 1,

      quantidadeTrechos: 0
    };
  }

  // --------------------------------------------------------
  // DIREÇÃO
  // --------------------------------------------------------

  const direcao =
    opcoes.direcao ||
    "TODAS";

  const fila = [
    origem
  ];

  const visitados =
    new Set([
      origem
    ]);

  const anterior =
    new Map();

  while (
    fila.length > 0
  ) {

    const atual =
      fila.shift();

    let conexoes =
      buscarConexoes(
        topologia,
        atual
      );

    // ------------------------------------------------------
    // FILTRAR DIREÇÃO
    // ------------------------------------------------------

    if (
      direcao === "JUSANTE"
    ) {

      conexoes =
        conexoes.filter(
          conexao =>
            conexao?.sentido === "SAIDA"
        );
    }

    if (
      direcao === "MONTANTE"
    ) {

      conexoes =
        conexoes.filter(
          conexao =>
            conexao?.sentido === "ENTRADA"
        );
    }

    // ------------------------------------------------------
    // PERCORRER
    // ------------------------------------------------------

    for (
      const conexao of conexoes
    ) {

      const proximo =
        obterPontoDestino(
          conexao
        );

      const trechoId =
        obterTrechoId(
          conexao
        );

      if (
        !proximo ||
        !trechoId
      ) {
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

      anterior.set(
        proximo,
        {

          pontoAnterior:
            atual,

          trechoId:
            trechoId,

          sentido:
            conexao.sentido

        }
      );

      // ----------------------------------------------------
      // ENCONTROU
      // ----------------------------------------------------

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
            anterior.get(
              atualCaminho
            );

          if (!etapa) {
            break;
          }

          trechos.unshift({

            id:
              etapa.trechoId,

            sentido:
              etapa.sentido,

            pontoOrigem:
              etapa.pontoAnterior,

            pontoDestino:
              atualCaminho

          });

          atualCaminho =
            etapa.pontoAnterior;
        }

        pontos.unshift(
          origem
        );

        return {

          encontrado: true,

          pontos,

          trechos,

          quantidadePontos:
            pontos.length,

          quantidadeTrechos:
            trechos.length
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

    trechos: [],

    quantidadePontos: 0,

    quantidadeTrechos: 0,

    motivo:
      "CAMINHO_NAO_ENCONTRADO"
  };
}


// ==========================================================
// ANALISAR PONTO
// ==========================================================

export function analisarPonto(
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

  const id =
    normalizarId(
      ponto.id ??
      codId
    );

  const conexoes =
    buscarConexoes(
      topologia,
      id
    );

  const entradas =
    conexoes.filter(
      conexao =>
        conexao?.sentido ===
        "ENTRADA"
    );

  const saidas =
    conexoes.filter(
      conexao =>
        conexao?.sentido ===
        "SAIDA"
    );

  return {

    pontoId:
      id,

    tipo:
      ponto.tipo ??
      null,

    estrutura:
      ponto.estrutura ??
      null,

    latitude:
      ponto.latitude ??
      null,

    longitude:
      ponto.longitude ??
      null,

    conexoes:
      conexoes.length,

    entradas:
      entradas.length,

    saidas:
      saidas.length,

    terminal:
      ehTerminal(
        topologia,
        id
      ),

    passagem:
      ehPassagem(
        topologia,
        id
      ),

    derivacao:
      ehDerivacao(
        topologia,
        id
      ),

    conexoesDetalhadas:
      conexoes
  };
}


// ==========================================================
// TESTAR CAMINHO
// ==========================================================

export function testarCaminho(
  topologia,
  pontoOrigem,
  pontoDestino
) {

  console.log(
    "=================================================="
  );

  console.log(
    "🛣️ TESTANDO CAMINHO BDGD"
  );

  console.log(
    "=================================================="
  );

  console.log(
    "Origem:",
    pontoOrigem
  );

  console.log(
    "Destino:",
    pontoDestino
  );

  const resultado =
    buscarCaminho(
      topologia,
      pontoOrigem,
      pontoDestino
    );

  console.log(
    "Resultado:",
    resultado
  );

  console.log(
    "=================================================="
  );

  return resultado;
}


// ==========================================================
// TESTE COMPLETO DO NAVEGADOR
// ==========================================================

export function testarNavegadorRede(
  topologia,
  pontoInicial
) {

  console.log(
    "=================================================="
  );

  console.log(
    "🧭 TESTANDO NAVEGADOR DA REDE"
  );

  console.log(
    "=================================================="
  );

  if (!topologia) {

    console.warn(
      "⚠️ Topologia não disponível."
    );

    return null;
  }

  const ponto =
    buscarPonto(
      topologia,
      pontoInicial
    );

  if (!ponto) {

    console.warn(
      "⚠️ Ponto não encontrado:",
      pontoInicial
    );

    return null;
  }

  console.log(
    "📍 Ponto inicial:",
    ponto.id
  );

  // --------------------------------------------------------
  // ANÁLISE
  // --------------------------------------------------------

  const analise =
    analisarPonto(
      topologia,
      ponto.id
    );

  console.log(
    "📊 Análise:",
    analise
  );

  // --------------------------------------------------------
  // JUSANTE
  // --------------------------------------------------------

  const jusante =
    navegarAJusante(
      topologia,
      ponto.id
    );

  console.log(
    "⬇️ REDE A JUSANTE"
  );

  console.log(
    "Pontos:",
    jusante.quantidadePontos
  );

  console.log(
    "Trechos:",
    jusante.quantidadeTrechos
  );

  console.log(
    "Terminais:",
    jusante.quantidadeTerminais
  );

  console.log(
    "Derivações:",
    jusante.quantidadeDerivacoes
  );

  console.log(
    "Passagens:",
    jusante.quantidadePassagens
  );

  // --------------------------------------------------------
  // MONTANTE
  // --------------------------------------------------------

  const montante =
    navegarAMontante(
      topologia,
      ponto.id
    );

  console.log(
    "⬆️ REDE A MONTANTE"
  );

  console.log(
    "Pontos:",
    montante.quantidadePontos
  );

  console.log(
    "Trechos:",
    montante.quantidadeTrechos
  );

  console.log(
    "Terminais:",
    montante.quantidadeTerminais
  );

  console.log(
    "Derivações:",
    montante.quantidadeDerivacoes
  );

  console.log(
    "Passagens:",
    montante.quantidadePassagens
  );

  // --------------------------------------------------------
  // REDE CONECTADA
  // --------------------------------------------------------

  const rede =
    buscarRedeConectada(
      topologia,
      ponto.id
    );

  console.log(
    "🌐 REDE CONECTADA"
  );

  console.log(
    "Pontos:",
    rede.quantidadePontos
  );

  console.log(
    "Trechos:",
    rede.quantidadeTrechos
  );

  console.log(
    "=================================================="
  );

  return {

    ponto,

    analise,

    jusante,

    montante,

    rede
  };
}


// ==========================================================
// EXPORTAÇÃO
// ==========================================================

export default {

  normalizarId,

  buscarPonto,

  buscarTrecho,

  buscarConexoes,

  buscarSaidas,

  buscarEntradas,

  ehTerminal,

  ehDerivacao,

  ehPassagem,

  navegarAJusante,

  navegarAMontante,

  buscarRedeConectada,

  buscarCaminho,

  analisarPonto,

  testarCaminho,

  testarNavegadorRede

};