import { trechos } from "../data/trechos";

/*
----------------------------------------------------
GRAFO DA REDE ELÉTRICA
----------------------------------------------------

Cada trecho conhece seus vizinhos.

O objetivo deste serviço é permitir que o sistema
encontre caminhos, trechos adjacentes, clientes
afetados e futuras recomposições.

----------------------------------------------------
*/

function criarGrafo() {

  const grafo = {};

  trechos.forEach((trecho) => {

    grafo[trecho.id] = {

      ...trecho,

      vizinhos: trecho.conectadoCom || []

    };

  });

  return grafo;

}

const grafo = criarGrafo();

/*
----------------------------------------------------
Retorna um trecho pelo ID
----------------------------------------------------
*/

export function buscarTrecho(id) {

  return grafo[id] || null;

}

/*
----------------------------------------------------
Retorna todos os vizinhos de um trecho
----------------------------------------------------
*/

export function buscarVizinhos(id) {

  const trecho = buscarTrecho(id);

  if (!trecho) {

    return [];

  }

  return trecho.vizinhos.map((vizinho) => buscarTrecho(vizinho));

}

/*
----------------------------------------------------
Retorna todos os trechos de um alimentador
----------------------------------------------------
*/

export function buscarTrechosAlimentador(alimentador) {

  return trechos.filter(

    trecho => trecho.alimentador === alimentador

  );

}

/*
----------------------------------------------------
Soma clientes do alimentador
----------------------------------------------------
*/

export function totalClientes(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) => total + trecho.clientes,

      0

    );

}

/*
----------------------------------------------------
Hospitais
----------------------------------------------------
*/

export function totalHospitais(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) =>

        total +

        trecho.consumidoresPrioritarios.hospitais,

      0

    );

}

/*
----------------------------------------------------
Grupo A
----------------------------------------------------
*/

export function totalGrupoA(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) =>

        total +

        trecho.consumidoresPrioritarios.grupoA,

      0

    );

}

/*
----------------------------------------------------
Telecom
----------------------------------------------------
*/

export function totalTelecom(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) =>

        total +

        trecho.consumidoresPrioritarios.telecom,

      0

    );

}

/*
----------------------------------------------------
Escolas
----------------------------------------------------
*/

export function totalEscolas(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) =>

        total +

        trecho.consumidoresPrioritarios.escolas,

      0

    );

}

/*
----------------------------------------------------
Saneamento
----------------------------------------------------
*/

export function totalSaneamento(alimentador) {

  return buscarTrechosAlimentador(alimentador)

    .reduce(

      (total, trecho) =>

        total +

        trecho.consumidoresPrioritarios.saneamento,

      0

    );

}

/*
----------------------------------------------------
Retorna todos os pontos de interligação
----------------------------------------------------
*/

export function buscarInterligacoes() {

  return trechos.filter(

    trecho => trecho.interligacao === true

  );

}

/*
----------------------------------------------------
Procura um caminho entre dois trechos
(Busca em largura - BFS)
----------------------------------------------------
*/

export function encontrarCaminho(origem, destino) {

  const fila = [[origem]];

  const visitados = new Set();

  while (fila.length > 0) {

    const caminho = fila.shift();

    const atual = caminho[caminho.length - 1];

    if (atual === destino) {

      return caminho;

    }

    if (!visitados.has(atual)) {

      visitados.add(atual);

      const vizinhos = buscarVizinhos(atual);

      vizinhos.forEach((vizinho) => {

        fila.push([

          ...caminho,

          vizinho.id

        ]);

      });

    }

  }

  return [];

}