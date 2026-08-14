// ==========================================================
// NAVEGADOR DA REDE ELÉTRICA
// COI MONITOR
// ==========================================================
//
// Utiliza a topologia criada por:
// src/core/modelo/topologiaBDGD.js
//
// Objetivo:
// - Navegar pela rede
// - Encontrar conexões
// - Encontrar rede a jusante
// - Encontrar rede a montante
// - Encontrar caminho entre pontos
// - Evitar loops
//
// ==========================================================


// ==========================================================
// NORMALIZAR ID
// ==========================================================

function normalizarId(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  return String(valor).trim();
}


// ==========================================================
// VALIDAR TOPOLOGIA
// ==========================================================

function validarTopologia(topologia) {
  return !!(
    topologia &&
    topologia.pontos &&
    topologia.trechos &&
    topologia.adjacencia
  );
}


// ==========================================================
// BUSCAR PONTO
// ==========================================================

export function buscarPonto(topologia, pontoId) {
  if (!validarTopologia(topologia)) {
    return null;
  }

  const id = normalizarId(pontoId);

  if (!id) {
    return null;
  }

  return topologia.pontos[id] || null;
}


// ==========================================================
// BUSCAR TRECHO
// ==========================================================

export function buscarTrecho(topologia, trechoId) {
  if (!validarTopologia(topologia)) {
    return null;
  }

  const id = normalizarId(trechoId);

  if (!id) {
    return null;
  }

  return topologia.trechos[id] || null;
}


// ==========================================================
// BUSCAR CONEXÕES DE UM PONTO
// ==========================================================

export function buscarConexoes(topologia, pontoId) {
  if (!validarTopologia(topologia)) {
    return [];
  }

  const id = normalizarId(pontoId);

  if (!id) {
    return [];
  }

  return topologia.adjacencia[id] || [];
}


// ==========================================================
// BUSCAR TRECHOS CONECTADOS AO PONTO
// ==========================================================

export function buscarTrechosConectados(
  topologia,
  pontoId
) {
  const conexoes =
    buscarConexoes(
      topologia,
      pontoId
    );

  return conexoes
    .map(
      conexao =>
        topologia.trechos[
          conexao.trechoId
        ]
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR PONTOS CONECTADOS
// ==========================================================

export function buscarPontosConectados(
  topologia,
  pontoId
) {
  const conexoes =
    buscarConexoes(
      topologia,
      pontoId
    );

  return conexoes
    .map(
      conexao =>
        topologia.pontos[
          conexao.pontoDestino
        ]
    )
    .filter(Boolean);
}


// ==========================================================
// BUSCAR REDE A JUSANTE DE UM PONTO
// ==========================================================
//
// A navegação começa em um ponto.
//
// A partir dele percorremos os trechos conectados
// seguindo a direção:
// ponto atual → ponto destino.
//
// O algoritmo possui proteção contra loops.
//
// ==========================================================

export function buscarRedeAJusante(
  topologia,
  pontoInicial
) {
  if (!validarTopologia(topologia)) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }

  const inicio =
    normalizarId(pontoInicial);

  if (!inicio || !topologia.pontos[inicio]) {
    return {
      pontoInicial: inicio,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }


  // --------------------------------------------------------
  // CONTROLE DE VISITADOS
  // --------------------------------------------------------

  const pontosVisitados =
    new Set();

  const trechosVisitados =
    new Set();


  // --------------------------------------------------------
  // RESULTADOS
  // --------------------------------------------------------

  const pontosEncontrados = [];

  const trechosEncontrados = [];

  const caminhos = [];

  const niveis = {};


  // --------------------------------------------------------
  // FILA DE NAVEGAÇÃO
  // --------------------------------------------------------

  const fila = [
    {
      pontoId: inicio,
      nivel: 0,
      caminhoPontos: [inicio],
      caminhoTrechos: []
    }
  ];


  pontosVisitados.add(inicio);

  niveis[inicio] = 0;


  // --------------------------------------------------------
  // NAVEGAÇÃO
  // --------------------------------------------------------

  while (fila.length > 0) {
    const atual =
      fila.shift();

    const pontoId =
      atual.pontoId;

    const nivel =
      atual.nivel;


    // ------------------------------------------------------
    // REGISTRAR PONTO
    // ------------------------------------------------------

    if (
      !pontosEncontrados.includes(
        pontoId
      )
    ) {
      pontosEncontrados.push(
        pontoId
      );
    }


    // ------------------------------------------------------
    // BUSCAR CONEXÕES
    // ------------------------------------------------------

    const conexoes =
      buscarConexoes(
        topologia,
        pontoId
      );


    // ------------------------------------------------------
    // PERCORRER CONEXÕES
    // ------------------------------------------------------

    for (
      const conexao
      of conexoes
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


      // ----------------------------------------------------
      // EVITAR VOLTAR PELO MESMO TRECHO
      // ----------------------------------------------------

      if (
        trechosVisitados.has(
          trechoId
        )
      ) {
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


      // ----------------------------------------------------
      // REGISTRAR TRECHO
      // ----------------------------------------------------

      trechosVisitados.add(
        trechoId
      );

      trechosEncontrados.push(
        trechoId
      );


      // ----------------------------------------------------
      // REGISTRAR CAMINHO
      // ----------------------------------------------------

      const novoCaminho = {
        nivel: nivel + 1,

        trechoId,

        pontoOrigem:
          pontoId,

        pontoDestino:
          destino,

        caminhoPontos: [
          ...atual.caminhoPontos,
          destino
        ],

        caminhoTrechos: [
          ...atual.caminhoTrechos,
          trechoId
        ]
      };

      caminhos.push(
        novoCaminho
      );


      // ----------------------------------------------------
      // REGISTRAR NÍVEL DO DESTINO
      // ----------------------------------------------------

      if (
        niveis[destino] === undefined
      ) {
        niveis[destino] =
          nivel + 1;
      }


      // ----------------------------------------------------
      // CONTINUAR NAVEGAÇÃO
      // ----------------------------------------------------

      if (
        !pontosVisitados.has(
          destino
        )
      ) {

        pontosVisitados.add(
          destino
        );

        fila.push({
          pontoId: destino,

          nivel:
            nivel + 1,

          caminhoPontos: [
            ...atual.caminhoPontos,
            destino
          ],

          caminhoTrechos: [
            ...atual.caminhoTrechos,
            trechoId
          ]
        });
      }
    }
  }


  // --------------------------------------------------------
  // CONVERTER PONTOS
  // --------------------------------------------------------

  const pontos =
    pontosEncontrados
      .map(
        id =>
          topologia.pontos[id]
      )
      .filter(Boolean);


  // --------------------------------------------------------
  // CONVERTER TRECHOS
  // --------------------------------------------------------

  const trechos =
    trechosEncontrados
      .map(
        id =>
          topologia.trechos[id]
      )
      .filter(Boolean);


  return {
    pontoInicial: inicio,

    pontos,

    trechos,

    caminhos,

    niveis,

    resumo: {
      pontos:
        pontos.length,

      trechos:
        trechos.length,

      caminhos:
        caminhos.length
    }
  };
}


// ==========================================================
// BUSCAR TRECHOS A JUSANTE DE UM TRECHO
// ==========================================================
//
// Primeiro identificamos o ponto final do trecho.
//
// Depois percorremos a rede a partir desse ponto.
//
// O trecho inicial é excluído do resultado.
//
// ==========================================================

export function buscarTrechosAJusante(
  topologia,
  trechoId
) {
  if (!validarTopologia(topologia)) {
    return {
      trechoInicial: null,
      pontoInicial: null,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }


  const id =
    normalizarId(
      trechoId
    );


  const trecho =
    buscarTrecho(
      topologia,
      id
    );


  if (!trecho) {
    return {
      trechoInicial: id,
      pontoInicial: null,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }


  const pontoInicial =
    normalizarId(
      trecho.pontoFinal
    );


  const resultado =
    buscarRedeAJusante(
      topologia,
      pontoInicial
    );


  // --------------------------------------------------------
  // REMOVER O PRÓPRIO TRECHO
  // --------------------------------------------------------

  const trechos =
    resultado.trechos.filter(
      item =>
        item.id !== id
    );


  const caminhos =
    resultado.caminhos.filter(
      caminho =>
        caminho.trechoId !== id
    );


  return {
    trechoInicial: id,

    pontoInicial,

    pontos:
      resultado.pontos,

    trechos,

    caminhos,

    niveis:
      resultado.niveis,

    resumo: {
      pontos:
        resultado.pontos.length,

      trechos:
        trechos.length,

      caminhos:
        caminhos.length
    }
  };
}


// ==========================================================
// BUSCAR REDE A MONTANTE
// ==========================================================
//
// Aqui fazemos a navegação no sentido inverso.
//
// Para cada ponto encontramos os trechos conectados
// e seguimos para o ponto de origem da conexão.
//
// ==========================================================

export function buscarRedeAMontante(
  topologia,
  pontoInicial
) {
  if (!validarTopologia(topologia)) {
    return {
      pontoInicial: null,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }


  const inicio =
    normalizarId(
      pontoInicial
    );


  if (
    !inicio ||
    !topologia.pontos[inicio]
  ) {
    return {
      pontoInicial: inicio,
      pontos: [],
      trechos: [],
      caminhos: [],
      niveis: {}
    };
  }


  const pontosVisitados =
    new Set();

  const trechosVisitados =
    new Set();

  const pontosEncontrados = [];

  const trechosEncontrados = [];

  const caminhos = [];

  const niveis = {};


  const fila = [
    {
      pontoId: inicio,
      nivel: 0,
      caminhoPontos: [inicio],
      caminhoTrechos: []
    }
  ];


  pontosVisitados.add(
    inicio
  );

  niveis[inicio] = 0;


  while (
    fila.length > 0
  ) {

    const atual =
      fila.shift();


    const pontoId =
      atual.pontoId;

    const nivel =
      atual.nivel;


    if (
      !pontosEncontrados.includes(
        pontoId
      )
    ) {
      pontosEncontrados.push(
        pontoId
      );
    }


    const conexoes =
      buscarConexoes(
        topologia,
        pontoId
      );


    for (
      const conexao
      of conexoes
    ) {

      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const origem =
        normalizarId(
          conexao.pontoDestino
        );


      if (
        !trechoId ||
        !origem
      ) {
        continue;
      }


      if (
        trechosVisitados.has(
          trechoId
        )
      ) {
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


      trechosVisitados.add(
        trechoId
      );

      trechosEncontrados.push(
        trechoId
      );


      const novoCaminho = {
        nivel: nivel + 1,

        trechoId,

        pontoOrigem:
          pontoId,

        pontoDestino:
          origem,

        caminhoPontos: [
          ...atual.caminhoPontos,
          origem
        ],

        caminhoTrechos: [
          ...atual.caminhoTrechos,
          trechoId
        ]
      };


      caminhos.push(
        novoCaminho
      );


      if (
        niveis[origem] === undefined
      ) {
        niveis[origem] =
          nivel + 1;
      }


      if (
        !pontosVisitados.has(
          origem
        )
      ) {

        pontosVisitados.add(
          origem
        );

        fila.push({
          pontoId: origem,

          nivel:
            nivel + 1,

          caminhoPontos: [
            ...atual.caminhoPontos,
            origem
          ],

          caminhoTrechos: [
            ...atual.caminhoTrechos,
            trechoId
          ]
        });
      }
    }
  }


  const pontos =
    pontosEncontrados
      .map(
        id =>
          topologia.pontos[id]
      )
      .filter(Boolean);


  const trechos =
    trechosEncontrados
      .map(
        id =>
          topologia.trechos[id]
      )
      .filter(Boolean);


  return {
    pontoInicial: inicio,

    pontos,

    trechos,

    caminhos,

    niveis,

    resumo: {
      pontos:
        pontos.length,

      trechos:
        trechos.length,

      caminhos:
        caminhos.length
    }
  };
}


// ==========================================================
// BUSCAR CAMINHO ENTRE DOIS PONTOS
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoOrigem,
  pontoDestino
) {
  if (!validarTopologia(topologia)) {
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
    !topologia.pontos[origem] ||
    !topologia.pontos[destino]
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
    {
      pontoId: origem,

      pontos: [
        origem
      ],

      trechos: []
    }
  ];


  const visitados =
    new Set();

  visitados.add(
    origem
  );


  while (
    fila.length > 0
  ) {

    const atual =
      fila.shift();


    const conexoes =
      buscarConexoes(
        topologia,
        atual.pontoId
      );


    for (
      const conexao
      of conexoes
    ) {

      const proximo =
        normalizarId(
          conexao.pontoDestino
        );

      const trechoId =
        normalizarId(
          conexao.trechoId
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


      const novosPontos = [
        ...atual.pontos,
        proximo
      ];


      const novosTrechos = [
        ...atual.trechos,
        trechoId
      ];


      if (
        proximo === destino
      ) {
        return {
          encontrado: true,

          pontos:
            novosPontos,

          trechos:
            novosTrechos
        };
      }


      visitados.add(
        proximo
      );


      fila.push({
        pontoId: proximo,

        pontos:
          novosPontos,

        trechos:
          novosTrechos
      });
    }
  }


  return {
    encontrado: false,

    pontos: [],

    trechos: []
  };
}


// ==========================================================
// ANALISAR PONTO
// ==========================================================
//
// Função auxiliar para termos uma visão rápida do ponto.
//
// ==========================================================

export function analisarPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarId(
      pontoId
    );


  const ponto =
    buscarPonto(
      topologia,
      id
    );


  if (!ponto) {
    return null;
  }


  const conexoes =
    buscarConexoes(
      topologia,
      id
    );


  const trechos =
    buscarTrechosConectados(
      topologia,
      id
    );


  const terminal =
    topologia.terminais?.includes(
      id
    ) || false;


  const derivacao =
    topologia.derivacoes?.some(
      item =>
        item.pontoId === id
    ) || false;


  return {
    ponto,

    conexoes,

    trechos,

    terminal,

    derivacao,

    quantidadeConexoes:
      conexoes.length
  };
}


// ==========================================================
// TESTE DO NAVEGADOR
// ==========================================================
//
// Função opcional.
//
// Não executa automaticamente.
//
// Pode ser chamada pelo CamadaBDGD.
//
// ==========================================================

export function testarNavegadorRede(
  topologia,
  pontoId
) {
  console.log(
    "=================================================="
  );

  console.log(
    "🧭 TESTE DO NAVEGADOR ELÉTRICO"
  );

  console.log(
    "=================================================="
  );

  console.log(
    "Ponto inicial:",
    pontoId
  );


  const analise =
    analisarPonto(
      topologia,
      pontoId
    );


  if (!analise) {

    console.warn(
      "⚠️ Ponto não encontrado:",
      pontoId
    );

    return null;
  }


  console.log(
    "📍 Ponto:",
    analise.ponto
  );

  console.log(
    "🔗 Conexões:",
    analise.conexoes
  );

  console.log(
    "🔵 Quantidade de conexões:",
    analise.quantidadeConexoes
  );

  console.log(
    "🔚 É terminal:",
    analise.terminal
  );

  console.log(
    "🌿 É derivação:",
    analise.derivacao
  );


  const jusante =
    buscarRedeAJusante(
      topologia,
      pontoId
    );


  console.log(
    "⬇️ REDE A JUSANTE"
  );

  console.log(
    "Pontos:",
    jusante.resumo.pontos
  );

  console.log(
    "Trechos:",
    jusante.resumo.trechos
  );


  const montante =
    buscarRedeAMontante(
      topologia,
      pontoId
    );


  console.log(
    "⬆️ REDE A MONTANTE"
  );

  console.log(
    "Pontos:",
    montante.resumo.pontos
  );

  console.log(
    "Trechos:",
    montante.resumo.trechos
  );


  console.log(
    "=================================================="
  );


  return {
    analise,
    jusante,
    montante
  };
}