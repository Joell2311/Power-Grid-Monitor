// ==========================================================
// NAVEGADOR DA REDE BDGD
// POWER GRID MONITOR
// ==========================================================
//
// Responsável por:
//
// 1. Buscar ponto
// 2. Buscar trecho
// 3. Buscar conexões
// 4. Buscar entradas
// 5. Buscar saídas
// 6. Navegar a jusante
// 7. Navegar a montante
// 8. Buscar rede conectada
// 9. Encontrar caminho
// 10. Identificar terminais
// 11. Identificar derivações
// 12. Identificar passagens
// 13. Analisar ponto
// 14. Navegação operacional
//
// PRINCÍPIOS:
//
// - A direção física preferencial é:
//
//       trecho.pontoInicial -> trecho.pontoFinal
//
// - A navegação não depende exclusivamente do campo
//   "sentido" existente na adjacência.
//
// - A navegação operacional pode respeitar o estado dos
//   equipamentos.
//
// - A navegação física pode ignorar estados operacionais.
//
// - IDs são sempre normalizados antes das comparações.
//
// - A navegação normal respeita alimentador/circuito.
//
// - A navegação de recomposição pode atravessar alimentadores
//   e circuitos, quando explicitamente habilitada:
//
//      permitirTravessiaEntreAlimentadores: true
//      permitirTravessiaEntreCircuitos: true
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

  const id =
    String(valor)
      .trim();

  return id || null;
}


// ==========================================================
// NORMALIZAR TEXTO
// ==========================================================

function normalizarTexto(valor) {

  return String(
    valor ?? ""
  )
    .trim()
    .toUpperCase();
}


// ==========================================================
// NORMALIZAR PAC
// ==========================================================
//
// Exemplos:
//
// 10060794
// 10060794M
// 10060794M-154
//
// Todos resultam em:
//
// 10060794
//
// ==========================================================

function normalizarPac(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim();

  if (!texto) {
    return null;
  }

  const match =
    texto.match(
      /^(.*?)M(?:-[^-\s]+)?$/i
    );

  if (match?.[1]) {

    return normalizarId(
      match[1]
    );
  }

  return normalizarId(
    texto
  );
}


// ==========================================================
// RESULTADO VAZIO
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
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  const ponto =
    topologia.pontos?.[id];

  if (ponto) {
    return ponto;
  }

  if (
    Array.isArray(
      topologia.pontos
    )
  ) {

    return (
      topologia.pontos.find(
        item =>
          normalizarId(
            item?.id ??
            item?.COD_ID ??
            item?.codId
          ) === id
      ) ??
      null
    );
  }

  return null;
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
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  const trecho =
    topologia.trechos?.[id];

  if (trecho) {
    return trecho;
  }

  if (
    Array.isArray(
      topologia.trechos
    )
  ) {

    return (
      topologia.trechos.find(
        item =>
          normalizarId(
            item?.id ??
            item?.COD_ID ??
            item?.codId
          ) === id
      ) ??
      null
    );
  }

  return null;
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

  const conexoes =
    topologia.adjacencia?.[id];

  if (
    Array.isArray(conexoes)
  ) {

    return conexoes;
  }

  return [];
}


// ==========================================================
// OBTER ID DO TRECHO
// ==========================================================

function obterTrechoId(
  conexao
) {

  return normalizarId(
    conexao?.trechoId ??
    conexao?.idTrecho ??
    conexao?.COD_ID_TRECHO ??
    conexao?.COD_ID
  );
}


// ==========================================================
// OBTER PONTO ORIGEM DA CONEXÃO
// ==========================================================

function obterPontoOrigemConexao(
  conexao
) {

  return normalizarId(
    conexao?.pontoOrigem ??
    conexao?.pontoInicial ??
    conexao?.origem ??
    conexao?.PAC_1
  );
}


// ==========================================================
// OBTER PONTO DESTINO
// ==========================================================

function obterPontoDestino(
  conexao
) {

  return normalizarId(
    conexao?.pontoDestino ??
    conexao?.pontoFinal ??
    conexao?.destino ??
    conexao?.PAC_2
  );
}


// ==========================================================
// OBTER ALIMENTADOR DO TRECHO
// ==========================================================

function obterAlimentadorTrecho(
  trecho
) {

  if (!trecho) {
    return null;
  }

  return normalizarId(
    trecho.alimentador ??
    trecho.alimentadorCodigo ??
    trecho.codigoAlimentador ??
    trecho.ALIMENTADOR ??
    trecho.propriedades?.alimentador ??
    trecho.propriedades?.ALIMENTADOR ??
    trecho.propriedades?.COD_ALIM ??
    trecho.propriedades?.COD_ALIMENTADOR ??
    trecho.propriedades?.CT_COD_OP ??
    trecho.propriedades?.CT_COD_OPER ??
    trecho.propriedades?.CT_COD ??
    trecho.propriedades?.CT_CODIGO ??
    trecho.propriedades?.CTMT ??
    trecho.circuito
  );
}


// ==========================================================
// OBTER CIRCUITO DO TRECHO
// ==========================================================

function obterCircuitoTrecho(
  trecho
) {

  if (!trecho) {
    return null;
  }

  return normalizarId(
    trecho.circuito ??
    trecho.circuitoCodigo ??
    trecho.codigoCircuito ??
    trecho.CIRCUITO ??
    trecho.CTMT ??
    trecho.propriedades?.circuito ??
    trecho.propriedades?.CIRCUITO ??
    trecho.propriedades?.COD_CIRCUITO ??
    trecho.propriedades?.CTMT
  );
}


// ==========================================================
// OBTER ALIMENTADOR DO PONTO
// ==========================================================

function obterAlimentadorPonto(
  ponto
) {

  if (!ponto) {
    return null;
  }

  return normalizarId(
    ponto.alimentador ??
    ponto.alimentadorCodigo ??
    ponto.ALIMENTADOR ??
    ponto.propriedades?.alimentador ??
    ponto.propriedades?.ALIMENTADOR ??
    ponto.propriedades?.COD_ALIM ??
    ponto.propriedades?.CT_COD_OP ??
    ponto.propriedades?.CTMT
  );
}


// ==========================================================
// OBTER CIRCUITO DO PONTO
// ==========================================================

function obterCircuitoPonto(
  ponto
) {

  if (!ponto) {
    return null;
  }

  return normalizarId(
    ponto.circuito ??
    ponto.circuitoCodigo ??
    ponto.CIRCUITO ??
    ponto.CTMT ??
    ponto.propriedades?.circuito ??
    ponto.propriedades?.CIRCUITO ??
    ponto.propriedades?.CTMT
  );
}


// ==========================================================
// FILTRAR ALIMENTADOR
// ==========================================================
//
// Navegação normal:
//    respeita alimentador.
//
// Recomposição:
//    pode atravessar alimentadores.
//
// ==========================================================

function trechoPertenceAoAlimentador(
  trecho,
  alimentador,
  opcoes = {}
) {

  if (
    !alimentador
  ) {
    return true;
  }

  if (
    opcoes.permitirTravessiaEntreAlimentadores === true
  ) {
    return true;
  }

  const alvo =
    normalizarTexto(
      alimentador
    );

  const valor =
    normalizarTexto(
      obterAlimentadorTrecho(
        trecho
      )
    );

  if (!valor) {
    return false;
  }

  return valor === alvo;
}


// ==========================================================
// FILTRAR CIRCUITO
// ==========================================================
//
// Navegação normal:
//    respeita circuito.
//
// Recomposição:
//    pode atravessar circuitos.
//
// ==========================================================

function trechoPertenceAoCircuito(
  trecho,
  circuito,
  opcoes = {}
) {

  if (
    !circuito
  ) {
    return true;
  }

  if (
    opcoes.permitirTravessiaEntreCircuitos === true
  ) {
    return true;
  }

  const alvo =
    normalizarTexto(
      circuito
    );

  const valor =
    normalizarTexto(
      obterCircuitoTrecho(
        trecho
      )
    );

  if (!valor) {
    return false;
  }

  return valor === alvo;
}


// ==========================================================
// CRIAR CHAVE DE ARESTA
// ==========================================================

function criarChaveAresta(
  pontoA,
  pontoB
) {

  const a =
    normalizarId(
      pontoA
    );

  const b =
    normalizarId(
      pontoB
    );

  if (
    !a ||
    !b
  ) {
    return null;
  }

  return [
    a,
    b
  ]
    .sort()
    .join("::");
}


// ==========================================================
// OBTER ESTADO DO EQUIPAMENTO
// ==========================================================

function obterEstadoEquipamento(
  equipamentoId,
  opcoes = {}
) {

  const id =
    normalizarId(
      equipamentoId
    );

  if (!id) {
    return null;
  }

  const mapa =
    opcoes.estadosEquipamentos ||
    opcoes.mapaEstadosEquipamentos ||
    {};

  const registro =
    mapa[id];

  if (
    registro &&
    typeof registro === "object"
  ) {

    return normalizarTexto(
      registro.estado ??
      registro.estadoOperacional ??
      registro.status
    );
  }

  if (
    registro !== null &&
    registro !== undefined
  ) {

    return normalizarTexto(
      registro
    );
  }

  return null;
}


// ==========================================================
// OBTER ID DO EQUIPAMENTO
// ==========================================================

function obterEquipamentoId(
  equipamento
) {

  return normalizarId(
    equipamento?.id ??
    equipamento?.COD_ID ??
    equipamento?.codId ??
    equipamento?.codigo ??
    equipamento?.unidadeId ??
    equipamento?.UNSEMT ??
    equipamento?.COD_ID_UNSEMT
  );
}


// ==========================================================
// VERIFICAR EQUIPAMENTO BLOQUEADOR
// ==========================================================
//
// BLOQUEIA:
//
// ABERTO
// INDISPONIVEL
//
// BYPASSADO não bloqueia automaticamente.
//
// ==========================================================

function equipamentoBloqueiaTrecho(
  equipamento,
  opcoes = {}
) {

  if (!equipamento) {
    return false;
  }

  const id =
    obterEquipamentoId(
      equipamento
    );

  if (!id) {
    return false;
  }

  const estado =
    obterEstadoEquipamento(
      id,
      opcoes
    );

  return (
    estado === "ABERTO" ||
    estado === "INDISPONIVEL"
  );
}


// ==========================================================
// LISTAR EQUIPAMENTOS OPERACIONAIS
// ==========================================================

function listarEquipamentosOperacionais(
  topologia
) {

  const resultado = [];

  const colecoes = [

    topologia?.equipamentosOperacionais,

    topologia?.equipamentos,

    topologia?.unidadesSeccionadoras,

    topologia?.transformadores,

    topologia?.reguladores,

    topologia?.capacitores

  ];

  for (
    const colecao
    of colecoes
  ) {

    if (!colecao) {
      continue;
    }

    const itens =
      Array.isArray(
        colecao
      )
        ? colecao
        : Object.values(
            colecao
          );

    for (
      const item
      of itens
    ) {

      if (!item) {
        continue;
      }

      const id =
        obterEquipamentoId(
          item
        );

      if (!id) {
        continue;
      }

      if (
        resultado.some(
          existente =>
            existente.id === id
        )
      ) {
        continue;
      }

      resultado.push({

        ...item,

        id

      });
    }
  }

  return resultado;
}


// ==========================================================
// CRIAR MAPA DE BARREIRAS OPERACIONAIS
// ==========================================================

function criarMapaBarreirasOperacionais(
  topologia,
  opcoes = {}
) {

  const barreiras =
    new Set();

  if (
    opcoes.respeitarEstadoOperacional ===
    false
  ) {

    return barreiras;
  }

  const equipamentos =
    listarEquipamentosOperacionais(
      topologia
    );

  for (
    const equipamento
    of equipamentos
  ) {

    if (
      !equipamentoBloqueiaTrecho(
        equipamento,
        opcoes
      )
    ) {
      continue;
    }

    const p =
      equipamento.propriedades ||
      equipamento.properties ||
      equipamento;

    const pac1 =
      normalizarPac(
        equipamento.pac1 ??
        equipamento.PAC_1 ??
        equipamento.unidade?.pac1 ??
        equipamento.unidade?.pac1Original ??
        p.PAC_1 ??
        p.PAC1 ??
        p.pac1
      );

    const pac2 =
      normalizarPac(
        equipamento.pac2 ??
        equipamento.PAC_2 ??
        equipamento.unidade?.pac2 ??
        equipamento.unidade?.pac2Original ??
        p.PAC_2 ??
        p.PAC1 ??
        p.pac2
      );

    if (
      !pac1 ||
      !pac2
    ) {
      continue;
    }

    const chave =
      criarChaveAresta(
        pac1,
        pac2
      );

    if (chave) {
      barreiras.add(
        chave
      );
    }
  }

  return barreiras;
}


// ==========================================================
// VERIFICAR BARREIRA
// ==========================================================

function existeBarreira(
  barreiras,
  pontoA,
  pontoB
) {

  if (!barreiras) {
    return false;
  }

  const chave =
    criarChaveAresta(
      pontoA,
      pontoB
    );

  if (!chave) {
    return false;
  }

  return barreiras.has(
    chave
  );
}


// ==========================================================
// CRIAR TRECHO NAVEGADO
// ==========================================================

function criarTrechoNavegado(
  topologia,
  trechoId,
  pontoOrigem,
  pontoDestino,
  sentido
) {

  const id =
    normalizarId(
      trechoId
    );

  if (!id) {
    return null;
  }

  const trecho =
    buscarTrecho(
      topologia,
      id
    );

  if (!trecho) {
    return null;
  }

  return {

    ...trecho,

    id:
      normalizarId(
        trecho.id ??
        trecho.COD_ID ??
        id
      ),

    pontoOrigem:
      normalizarId(
        pontoOrigem
      ),

    pontoDestino:
      normalizarId(
        pontoDestino
      ),

    sentido:
      sentido ??
      null

  };
}


// ==========================================================
// OBTER SAÍDAS FÍSICAS
// ==========================================================

function obterSaidasFisicas(
  topologia,
  pontoAtual,
  opcoes = {}
) {

  const resultado = [];

  const atual =
    normalizarId(
      pontoAtual
    );

  if (!atual) {
    return resultado;
  }

  const conexoes =
    buscarConexoes(
      topologia,
      atual
    );

  const alimentador =
    opcoes.alimentador ??
    null;

  const circuito =
    opcoes.circuito ??
    null;

  const barreiras =
    opcoes._barreiras ||
    new Set();

  for (
    const conexao
    of conexoes
  ) {

    const trechoId =
      obterTrechoId(
        conexao
      );

    if (!trechoId) {
      continue;
    }

    const trecho =
      buscarTrecho(
        topologia,
        trechoId
      );

    if (!trecho) {
      continue;
    }

    if (
      !trechoPertenceAoAlimentador(
        trecho,
        alimentador,
        opcoes
      )
    ) {
      continue;
    }

    if (
      !trechoPertenceAoCircuito(
        trecho,
        circuito,
        opcoes
      )
    ) {
      continue;
    }

    const inicio =
      normalizarId(
        trecho.pontoInicial ??
        trecho.PAC_1 ??
        trecho.pontoOrigem
      );

    const fim =
      normalizarId(
        trecho.pontoFinal ??
        trecho.PAC_2 ??
        trecho.pontoDestino
      );

    if (
      !inicio ||
      !fim
    ) {
      continue;
    }

    if (
      inicio !== atual
    ) {
      continue;
    }

    if (
      existeBarreira(
        barreiras,
        inicio,
        fim
      )
    ) {
      continue;
    }

    resultado.push({

      ...conexao,

      trechoId,

      pontoOrigem:
        inicio,

      pontoDestino:
        fim,

      sentido:
        "SAIDA",

      trecho

    });
  }

  return resultado;
}


// ==========================================================
// OBTER ENTRADAS FÍSICAS
// ==========================================================

function obterEntradasFisicas(
  topologia,
  pontoAtual,
  opcoes = {}
) {

  const resultado = [];

  const atual =
    normalizarId(
      pontoAtual
    );

  if (!atual) {
    return resultado;
  }

  const conexoes =
    buscarConexoes(
      topologia,
      atual
    );

  const alimentador =
    opcoes.alimentador ??
    null;

  const circuito =
    opcoes.circuito ??
    null;

  const barreiras =
    opcoes._barreiras ||
    new Set();

  for (
    const conexao
    of conexoes
  ) {

    const trechoId =
      obterTrechoId(
        conexao
      );

    if (!trechoId) {
      continue;
    }

    const trecho =
      buscarTrecho(
        topologia,
        trechoId
      );

    if (!trecho) {
      continue;
    }

    if (
      !trechoPertenceAoAlimentador(
        trecho,
        alimentador,
        opcoes
      )
    ) {
      continue;
    }

    if (
      !trechoPertenceAoCircuito(
        trecho,
        circuito,
        opcoes
      )
    ) {
      continue;
    }

    const inicio =
      normalizarId(
        trecho.pontoInicial ??
        trecho.PAC_1 ??
        trecho.pontoOrigem
      );

    const fim =
      normalizarId(
        trecho.pontoFinal ??
        trecho.PAC_2 ??
        trecho.pontoDestino
      );

    if (
      !inicio ||
      !fim
    ) {
      continue;
    }

    if (
      fim !== atual
    ) {
      continue;
    }

    if (
      existeBarreira(
        barreiras,
        inicio,
        fim
      )
    ) {
      continue;
    }

    resultado.push({

      ...conexao,

      trechoId,

      pontoOrigem:
        fim,

      pontoDestino:
        inicio,

      sentido:
        "ENTRADA",

      trecho

    });
  }

  return resultado;
}


// ==========================================================
// BUSCAR SAÍDAS
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
      normalizarTexto(
        conexao?.sentido
      ) === "SAIDA"
  );
}


// ==========================================================
// BUSCAR ENTRADAS
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
      normalizarTexto(
        conexao?.sentido
      ) === "ENTRADA"
  );
}


// ==========================================================
// TERMINAL
// ==========================================================

export function ehTerminal(
  topologia,
  codId
) {

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  }

  if (
    Array.isArray(
      topologia?.terminais
    )
  ) {

    return topologia.terminais.some(
      item =>
        normalizarId(
          typeof item === "object"
            ? item?.pontoId ??
              item?.id
            : item
        ) === id
    );
  }

  return false;
}


// ==========================================================
// DERIVAÇÃO
// ==========================================================

export function ehDerivacao(
  topologia,
  codId
) {

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  }

  if (
    !Array.isArray(
      topologia?.derivacoes
    )
  ) {
    return false;
  }

  return topologia.derivacoes.some(
    item =>
      normalizarId(
        typeof item === "object"
          ? item?.pontoId ??
            item?.id
          : item
      ) === id
  );
}


// ==========================================================
// PASSAGEM
// ==========================================================

export function ehPassagem(
  topologia,
  codId
) {

  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  }

  if (
    !Array.isArray(
      topologia?.passagens
    )
  ) {
    return false;
  }

  return topologia.passagens.some(
    item =>
      normalizarId(
        typeof item === "object"
          ? item?.pontoId ??
            item?.id
          : item
      ) === id
  );
}


// ==========================================================
// NAVEGAR A JUSANTE
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

  if (
    !buscarPonto(
      topologia,
      inicio
    )
  ) {

    return {

      ...resultadoVazio(),

      pontoInicial:
        inicio

    };
  }

  const pontoInicialObj =
    buscarPonto(
      topologia,
      inicio
    );

  const alimentador =
    opcoes.alimentador ??
    obterAlimentadorPonto(
      pontoInicialObj
    );

  const circuito =
    opcoes.circuito ??
    obterCircuitoPonto(
      pontoInicialObj
    );

  const maxProfundidade =
    Number.isFinite(
      opcoes.maxProfundidade
    )
      ? Math.max(
          0,
          opcoes.maxProfundidade
        )
      : Infinity;

  const incluirInicial =
    opcoes.incluirInicial !== false;

  const barreiras =
    opcoes._barreiras ??
    (
      opcoes.respeitarEstadoOperacional ===
      false
        ? new Set()
        : criarMapaBarreirasOperacionais(
            topologia,
            opcoes
          )
    );

  const fila = [

    {
      pontoId:
        inicio,

      profundidade:
        0

    }

  ];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

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
        item?.pontoId
      );

    const profundidade =
      Number(
        item?.profundidade ??
        0
      );

    if (
      !pontoAtual ||
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

    if (
      profundidade >=
      maxProfundidade
    ) {
      continue;
    }

    const saidas =
      obterSaidasFisicas(
        topologia,
        pontoAtual,
        {

          ...opcoes,

          alimentador,

          circuito,

          _barreiras:
            barreiras

        }
      );

    for (
      const conexao
      of saidas
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      const destino =
        normalizarId(
          conexao?.pontoDestino
        );

      if (
        !trechoId ||
        !destino
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

        const trecho =
          criarTrechoNavegado(
            topologia,
            trechoId,
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

    encontrado:
      true,

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

  if (
    !buscarPonto(
      topologia,
      inicio
    )
  ) {

    return {

      ...resultadoVazio(),

      pontoInicial:
        inicio

    };
  }

  const pontoInicialObj =
    buscarPonto(
      topologia,
      inicio
    );

  const alimentador =
    opcoes.alimentador ??
    obterAlimentadorPonto(
      pontoInicialObj
    );

  const circuito =
    opcoes.circuito ??
    obterCircuitoPonto(
      pontoInicialObj
    );

  const maxProfundidade =
    Number.isFinite(
      opcoes.maxProfundidade
    )
      ? Math.max(
          0,
          opcoes.maxProfundidade
        )
      : Infinity;

  const incluirInicial =
    opcoes.incluirInicial !== false;

  const barreiras =
    opcoes._barreiras ??
    (
      opcoes.respeitarEstadoOperacional ===
      false
        ? new Set()
        : criarMapaBarreirasOperacionais(
            topologia,
            opcoes
          )
    );

  const fila = [

    {
      pontoId:
        inicio,

      profundidade:
        0

    }

  ];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

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
        item?.pontoId
      );

    const profundidade =
      Number(
        item?.profundidade ??
        0
      );

    if (
      !pontoAtual ||
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

    if (
      profundidade >=
      maxProfundidade
    ) {
      continue;
    }

    const entradas =
      obterEntradasFisicas(
        topologia,
        pontoAtual,
        {

          ...opcoes,

          alimentador,

          circuito,

          _barreiras:
            barreiras

        }
      );

    for (
      const conexao
      of entradas
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      const destino =
        normalizarId(
          conexao?.pontoDestino
        );

      if (
        !trechoId ||
        !destino
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

        const trecho =
          criarTrechoNavegado(
            topologia,
            trechoId,
            pontoAtual,
            destino,
            "ENTRADA"
          );

        if (trecho) {

          trechos.push(
            trecho
          );
        }
      }

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

    encontrado:
      true,

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
// NAVEGAÇÃO OPERACIONAL - JUSANTE
// ==========================================================

export function navegarJusanteOperacional(
  topologia,
  pontoInicial,
  opcoes = {}
) {

  return navegarAJusante(

    topologia,

    pontoInicial,

    {

      ...opcoes,

      respeitarEstadoOperacional:
        opcoes.respeitarEstadoOperacional !==
        false

    }

  );
}


// ==========================================================
// NAVEGAÇÃO OPERACIONAL - MONTANTE
// ==========================================================

export function navegarMontanteOperacional(
  topologia,
  pontoInicial,
  opcoes = {}
) {

  return navegarAMontante(

    topologia,

    pontoInicial,

    {

      ...opcoes,

      respeitarEstadoOperacional:
        opcoes.respeitarEstadoOperacional !==
        false

    }

  );
}


// ==========================================================
// BUSCAR REDE CONECTADA
// ==========================================================
//
// Descobre tudo fisicamente conectado ao ponto.
//
// Por padrão:
//
//   respeita alimentador/circuito.
//
// Para recomposição:
//
//   permitirTravessiaEntreAlimentadores: true
//   permitirTravessiaEntreCircuitos: true
//
// ==========================================================

export function buscarRedeConectada(
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

  const pontoInicialObj =
    buscarPonto(
      topologia,
      inicio
    );

  if (!pontoInicialObj) {

    return {

      ...resultadoVazio(),

      pontoInicial:
        inicio

    };
  }

  const alimentador =
    opcoes.alimentador ??
    obterAlimentadorPonto(
      pontoInicialObj
    );

  const circuito =
    opcoes.circuito ??
    obterCircuitoPonto(
      pontoInicialObj
    );

  const barreiras =
    opcoes._barreiras ??
    (
      opcoes.respeitarEstadoOperacional ===
      false
        ? new Set()
        : criarMapaBarreirasOperacionais(
            topologia,
            opcoes
          )
    );

  const fila = [
    inicio
  ];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const pontos = [];
  const trechos = [];

  while (
    fila.length > 0
  ) {

    const atual =
      normalizarId(
        fila.shift()
      );

    if (
      !atual ||
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

    // ------------------------------------------------------
    // ADJACÊNCIA PRINCIPAL
    // ------------------------------------------------------

    const conexoes =
      buscarConexoes(
        topologia,
        atual
      );

    // ------------------------------------------------------
    // CONEXÕES DIRETAS
    // ------------------------------------------------------

    const conexoesDiretas = [];

    const todosTrechos =
      Array.isArray(
        topologia.trechos
      )
        ? topologia.trechos
        : Object.values(
            topologia.trechos || {}
          );

    for (
      const trecho
      of todosTrechos
    ) {

      const trechoId =
        normalizarId(
          trecho?.id ??
          trecho?.COD_ID ??
          trecho?.codId
        );

      if (!trechoId) {
        continue;
      }

      const inicioTrecho =
        normalizarId(
          trecho?.pontoInicial ??
          trecho?.PAC_1
        );

      const fimTrecho =
        normalizarId(
          trecho?.pontoFinal ??
          trecho?.PAC_2
        );

      if (
        inicioTrecho === atual ||
        fimTrecho === atual
      ) {

        conexoesDiretas.push({

          trechoId,

          pontoOrigem:
            atual,

          pontoDestino:
            inicioTrecho === atual
              ? fimTrecho
              : inicioTrecho,

          sentido:
            inicioTrecho === atual
              ? "SAIDA"
              : "ENTRADA",

          trecho

        });
      }
    }

    const conexoesNormalizadas = [];

    // ------------------------------------------------------
    // NORMALIZAR ADJACÊNCIA
    // ------------------------------------------------------

    for (
      const conexao
      of conexoes
    ) {

      const trechoId =
        obterTrechoId(
          conexao
        );

      if (!trechoId) {
        continue;
      }

      const trecho =
        buscarTrecho(
          topologia,
          trechoId
        );

      if (!trecho) {
        continue;
      }

      const inicioTrecho =
        normalizarId(
          trecho.pontoInicial ??
          trecho.PAC_1
        );

      const fimTrecho =
        normalizarId(
          trecho.pontoFinal ??
          trecho.PAC_2
        );

      let destino =
        obterPontoDestino(
          conexao
        );

      if (
        !destino ||
        destino === atual
      ) {

        if (
          inicioTrecho === atual
        ) {

          destino =
            fimTrecho;

        } else if (
          fimTrecho === atual
        ) {

          destino =
            inicioTrecho;
        }
      }

      if (!destino) {
        continue;
      }

      conexoesNormalizadas.push({

        ...conexao,

        trechoId,

        pontoOrigem:
          atual,

        pontoDestino:
          destino,

        trecho

      });
    }

    const todasConexoes = [

      ...conexoesNormalizadas,

      ...conexoesDiretas

    ];

    const conexoesUnicas =
      new Map();

    for (
      const conexao
      of todasConexoes
    ) {

      const trechoId =
        normalizarId(
          conexao?.trechoId
        );

      const destino =
        normalizarId(
          conexao?.pontoDestino
        );

      if (
        !trechoId ||
        !destino
      ) {
        continue;
      }

      const chave =
        `${trechoId}::${destino}`;

      if (
        !conexoesUnicas.has(
          chave
        )
      ) {

        conexoesUnicas.set(
          chave,
          conexao
        );
      }
    }

    // ------------------------------------------------------
    // PROCESSAR CONEXÕES
    // ------------------------------------------------------

    for (
      const conexao
      of conexoesUnicas.values()
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
        conexao.trecho ||
        buscarTrecho(
          topologia,
          trechoId
        );

      if (
        !trecho ||
        !destino
      ) {
        continue;
      }

      if (
        !trechoPertenceAoAlimentador(
          trecho,
          alimentador,
          opcoes
        )
      ) {
        continue;
      }

      if (
        !trechoPertenceAoCircuito(
          trecho,
          circuito,
          opcoes
        )
      ) {
        continue;
      }

      const trechoInicio =
        normalizarId(
          trecho.pontoInicial ??
          trecho.PAC_1
        );

      const trechoFim =
        normalizarId(
          trecho.pontoFinal ??
          trecho.PAC_2
        );

      if (
        existeBarreira(
          barreiras,
          trechoInicio,
          trechoFim
        )
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

        const trechoNavegado =
          criarTrechoNavegado(

            topologia,

            trechoId,

            atual,

            destino,

            conexao.sentido ??
            (
              trechoInicio === atual
                ? "SAIDA"
                : "ENTRADA"
            )

          );

        if (trechoNavegado) {

          trechos.push(
            trechoNavegado
          );
        }
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

    encontrado:
      true,

    pontoInicial:
      inicio,

    pontos:
      pontos.filter(Boolean),

    trechos:
      trechos.filter(Boolean),

    quantidadePontos:
      pontos.filter(Boolean).length,

    quantidadeTrechos:
      trechos.filter(Boolean).length

  };
}


// ==========================================================
// BUSCAR CAMINHO
// ==========================================================
//
// direcao:
//
// TODAS
// JUSANTE
// MONTANTE
//
// Recomposição:
//
// permitirTravessiaEntreAlimentadores: true
// permitirTravessiaEntreCircuitos: true
//
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoInicial,
  pontoFinal,
  opcoes = {}
) {

  const origem =
    normalizarId(
      pontoInicial
    );

  const destino =
    normalizarId(
      pontoFinal
    );

  if (
    !origem ||
    !destino
  ) {

    return {

      encontrado:
        false,

      pontos: [],

      trechos: [],

      distancia: 0,

      quantidadePontos: 0,

      quantidadeTrechos: 0,

      motivo:
        "PONTO_ORIGEM_OU_DESTINO_INVALIDO"

    };
  }

  if (
    !buscarPonto(
      topologia,
      origem
    )
  ) {

    return {

      encontrado:
        false,

      pontoInicial:
        origem,

      pontoFinal:
        destino,

      pontos: [],

      trechos: [],

      distancia: 0,

      quantidadePontos: 0,

      quantidadeTrechos: 0,

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

      encontrado:
        false,

      pontoInicial:
        origem,

      pontoFinal:
        destino,

      pontos: [],

      trechos: [],

      distancia: 0,

      quantidadePontos: 0,

      quantidadeTrechos: 0,

      motivo:
        "PONTO_DESTINO_NAO_ENCONTRADO"

    };
  }

  if (
    origem === destino
  ) {

    return {

      encontrado:
        true,

      pontoInicial:
        origem,

      pontoFinal:
        destino,

      pontos: [
        origem
      ],

      trechos: [],

      distancia: 0,

      quantidadePontos: 1,

      quantidadeTrechos: 0,

      motivo:
        null

    };
  }

  const direcao =
    normalizarTexto(
      opcoes.direcao ||
      "TODAS"
    );

  const pontoOrigemObj =
    buscarPonto(
      topologia,
      origem
    );

  const alimentador =
    opcoes.alimentador ??
    obterAlimentadorPonto(
      pontoOrigemObj
    );

  const circuito =
    opcoes.circuito ??
    obterCircuitoPonto(
      pontoOrigemObj
    );

  const barreiras =
    opcoes._barreiras ??
    (
      opcoes.respeitarEstadoOperacional ===
      false
        ? new Set()
        : criarMapaBarreirasOperacionais(
            topologia,
            opcoes
          )
    );

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
      normalizarId(
        fila.shift()
      );

    if (!atual) {
      continue;
    }

    let conexoes = [];

    // ------------------------------------------------------
    // JUSANTE
    // ------------------------------------------------------

    if (
      direcao ===
      "JUSANTE"
    ) {

      conexoes =
        obterSaidasFisicas(

          topologia,

          atual,

          {

            ...opcoes,

            alimentador,

            circuito,

            _barreiras:
              barreiras

          }

        );

    // ------------------------------------------------------
    // MONTANTE
    // ------------------------------------------------------

    } else if (
      direcao ===
      "MONTANTE"
    ) {

      conexoes =
        obterEntradasFisicas(

          topologia,

          atual,

          {

            ...opcoes,

            alimentador,

            circuito,

            _barreiras:
              barreiras

          }

        );

    // ------------------------------------------------------
    // TODAS
    // ------------------------------------------------------

    } else {

      const saidas =
        obterSaidasFisicas(

          topologia,

          atual,

          {

            ...opcoes,

            alimentador,

            circuito,

            _barreiras:
              barreiras

          }

        );

      const entradas =
        obterEntradasFisicas(

          topologia,

          atual,

          {

            ...opcoes,

            alimentador,

            circuito,

            _barreiras:
              barreiras

          }

        );

      conexoes = [

        ...saidas,

        ...entradas

      ];
    }

    // ------------------------------------------------------
    // PROCESSAR CONEXÕES
    // ------------------------------------------------------

    for (
      const conexao
      of conexoes
    ) {

      const proximo =
        normalizarId(
          conexao?.pontoDestino
        );

      const trechoId =
        normalizarId(
          conexao?.trechoId
        );

      if (
        !proximo ||
        !trechoId ||
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

          trechoId,

          sentido:
            conexao.sentido

        }

      );

      if (
        proximo ===
        destino
      ) {

        const pontos = [];
        const trechos = [];

        let atualCaminho =
          destino;

        let distancia =
          0;

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

            return {

              encontrado:
                false,

              pontoInicial:
                origem,

              pontoFinal:
                destino,

              pontos: [],

              trechos: [],

              distancia: 0,

              quantidadePontos: 0,

              quantidadeTrechos: 0,

              motivo:
                "CAMINHO_INCONSISTENTE"

            };
          }

          trechos.unshift(
            etapa.trechoId
          );

          const trecho =
            buscarTrecho(
              topologia,
              etapa.trechoId
            );

          distancia +=
            obterComprimentoTrecho(
              trecho
            );

          atualCaminho =
            etapa.pontoAnterior;
        }

        pontos.unshift(
          origem
        );

        return {

          encontrado:
            true,

          pontoInicial:
            origem,

          pontoFinal:
            destino,

          pontos,

          trechos,

          distancia,

          quantidadePontos:
            pontos.length,

          quantidadeTrechos:
            trechos.length,

          motivo:
            null

        };
      }

      fila.push(
        proximo
      );
    }
  }

  return {

    encontrado:
      false,

    pontoInicial:
      origem,

    pontoFinal:
      destino,

    pontos: [],

    trechos: [],

    distancia: 0,

    quantidadePontos: 0,

    quantidadeTrechos: 0,

    motivo:
      "CAMINHO_NAO_ENCONTRADO"

  };
}


// ==========================================================
// COMPRIMENTO DO TRECHO
// ==========================================================

function obterComprimentoTrecho(
  trecho
) {

  if (!trecho) {
    return 0;
  }

  const candidatos = [

    trecho.comprimento,

    trecho.COMPRIMENTO,

    trecho.extensao,

    trecho.EXTENSAO,

    trecho.comp,

    trecho.COMP,

    trecho.propriedades?.comprimento,

    trecho.propriedades?.COMPRIMENTO,

    trecho.propriedades?.COMP,

    trecho.properties?.comprimento,

    trecho.properties?.COMPRIMENTO,

    trecho.properties?.COMP

  ];

  for (
    const valor
    of candidatos
  ) {

    const numero =
      Number(
        String(
          valor ?? ""
        )
          .replace(",", ".")
      );

    if (
      Number.isFinite(
        numero
      )
    ) {

      return numero;
    }
  }

  return 0;
}


// ==========================================================
// REDE A JUSANTE DO TRECHO
// ==========================================================

export function buscarRedeAJusanteDoTrecho(
  topologia,
  trechoId,
  opcoes = {}
) {

  const trecho =
    buscarTrecho(
      topologia,
      trechoId
    );

  if (!trecho) {

    return {

      encontrado:
        false,

      pontos: {},

      trechos: {},

      ordemPontos: [],

      ordemTrechos: [],

      quantidadePontos: 0,

      quantidadeTrechos: 0

    };
  }

  const pontoFinal =
    normalizarId(
      trecho.pontoFinal ??
      trecho.PAC_2
    );

  if (!pontoFinal) {

    return {

      encontrado:
        false,

      pontos: {},

      trechos: {},

      ordemPontos: [],

      ordemTrechos: [],

      quantidadePontos: 0,

      quantidadeTrechos: 0

    };
  }

  const resultado =
    navegarAJusante(

      topologia,

      pontoFinal,

      {

        ...opcoes,

        alimentador:
          opcoes.alimentador ??
          obterAlimentadorTrecho(
            trecho
          ),

        circuito:
          opcoes.circuito ??
          obterCircuitoTrecho(
            trecho
          ),

        incluirInicial:
          opcoes.incluirInicial !==
          false

      }

    );

  const pontosArray =
    resultado.pontos ||
    [];

  const trechosArray =
    resultado.trechos ||
    [];

  return {

    encontrado:
      resultado.encontrado,

    pontos:
      Object.fromEntries(

        pontosArray.map(
          ponto => [

            normalizarId(
              ponto?.id ??
              ponto?.COD_ID ??
              ponto?.codId
            ),

            ponto

          ]
        )
        .filter(
          ([id]) =>
            Boolean(id)
        )

      ),

    trechos:
      Object.fromEntries(

        trechosArray.map(
          item => [

            normalizarId(
              item?.id ??
              item?.COD_ID ??
              item?.codId
            ),

            item

          ]
        )
        .filter(
          ([id]) =>
            Boolean(id)
        )

      ),

    ordemPontos:
      pontosArray
        .map(
          ponto =>
            normalizarId(
              ponto?.id ??
              ponto?.COD_ID ??
              ponto?.codId
            )
        )
        .filter(Boolean),

    ordemTrechos:
      trechosArray
        .map(
          trecho =>
            normalizarId(
              trecho?.id ??
              trecho?.COD_ID ??
              trecho?.codId
            )
        )
        .filter(Boolean),

    quantidadePontos:
      pontosArray.length,

    quantidadeTrechos:
      trechosArray.length

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
      ponto.COD_ID ??
      ponto.codId ??
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
        normalizarTexto(
          conexao?.sentido
        ) ===
        "ENTRADA"
    );

  const saidas =
    conexoes.filter(
      conexao =>
        normalizarTexto(
          conexao?.sentido
        ) ===
        "SAIDA"
    );

  const trechoEntrada =
    entradas
      .map(
        conexao =>
          buscarTrecho(
            topologia,
            obterTrechoId(
              conexao
            )
          )
      )
      .filter(Boolean);

  const trechoSaida =
    saidas
      .map(
        conexao =>
          buscarTrecho(
            topologia,
            obterTrechoId(
              conexao
            )
          )
      )
      .filter(Boolean);

  return {

    pontoId:
      id,

    tipo:
      ponto.tipo ??
      ponto.tipoPonto ??
      ponto.TIP_PONTO ??
      null,

    estrutura:
      ponto.estrutura ??
      ponto.ESTRUTURA ??
      null,

    latitude:
      ponto.latitude ??
      ponto.lat ??
      null,

    longitude:
      ponto.longitude ??
      ponto.lng ??
      ponto.lon ??
      null,

    alimentador:
      obterAlimentadorPonto(
        ponto
      ),

    circuito:
      obterCircuitoPonto(
        ponto
      ),

    conexoes:
      conexoes.length,

    entradas:
      entradas.length,

    saidas:
      saidas.length,

    trechosEntrada:
      trechoEntrada.length,

    trechosSaida:
      trechoSaida.length,

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
  pontoDestino,
  opcoes = {}
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

  console.log(
    "Opções:",
    opcoes
  );

  const resultado =
    buscarCaminho(

      topologia,

      pontoOrigem,

      pontoDestino,

      opcoes

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
// TESTE COMPLETO
// ==========================================================

export function testarNavegadorRede(
  topologia,
  pontoInicial,
  opcoes = {}
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

  const idPonto =
    normalizarId(
      ponto.id ??
      ponto.COD_ID ??
      ponto.codId ??
      pontoInicial
    );

  console.log(
    "📍 Ponto inicial:",
    idPonto
  );

  const alimentador =
    opcoes.alimentador ??
    obterAlimentadorPonto(
      ponto
    );

  const circuito =
    opcoes.circuito ??
    obterCircuitoPonto(
      ponto
    );

  const analise =
    analisarPonto(
      topologia,
      idPonto
    );

  const jusante =
    navegarAJusante(

      topologia,

      idPonto,

      {

        ...opcoes,

        alimentador,

        circuito

      }

    );

  const montante =
    navegarAMontante(

      topologia,

      idPonto,

      {

        ...opcoes,

        alimentador,

        circuito

      }

    );

  const rede =
    buscarRedeConectada(

      topologia,

      idPonto,

      {

        ...opcoes,

        alimentador,

        circuito

      }

    );

  console.log(
    "📊 ANÁLISE:",
    analise
  );

  console.log(
    "⬇️ JUSANTE:",
    {

      pontos:
        jusante.quantidadePontos,

      trechos:
        jusante.quantidadeTrechos

    }
  );

  console.log(
    "⬆️ MONTANTE:",
    {

      pontos:
        montante.quantidadePontos,

      trechos:
        montante.quantidadeTrechos

    }
  );

  console.log(
    "🌐 REDE CONECTADA:",
    {

      pontos:
        rede.quantidadePontos,

      trechos:
        rede.quantidadeTrechos

    }
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
// EXPORTAÇÃO DEFAULT
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

  navegarJusanteOperacional,

  navegarMontanteOperacional,

  buscarRedeConectada,

  buscarCaminho,

  buscarRedeAJusanteDoTrecho,

  analisarPonto,

  testarCaminho,

  testarNavegadorRede

};