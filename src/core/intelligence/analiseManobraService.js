// =====================================================
// SERVIÇO DE ANÁLISE DE MANOBRA COI
// POWER GRID MONITOR
//
// Responsável por:
// - receber os dados informados pelo controlador;
// - padronizar os dados de campo;
// - encaminhar os dados ao Motor COI;
// - formatar a decisão operacional para a interface.
//
// IMPORTANTE:
//
// A corrente NÃO é calculada automaticamente aqui.
//
// Ela deve ser informada pelo controlador através da
// interface de Análise de Manobra Inteligente.
//
// O serviço apenas valida, normaliza e encaminha.
// =====================================================

import { executarMotorCOI } from "./motorCOI.js";


// =====================================================
// UTILITÁRIOS
// =====================================================

function normalizarTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor).trim();
}


function converterCorrente(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim()
      .replace(",", ".");

  if (!texto) {
    return null;
  }

  const numero =
    Number(texto);

  if (
    !Number.isFinite(numero)
  ) {
    return null;
  }

  if (
    numero < 0
  ) {
    return null;
  }

  return numero;
}


function obterValorOuNulo(valor) {
  return (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  )
    ? null
    : valor;
}


// =====================================================
// ANÁLISE DE MANOBRA
// =====================================================

export function analisarManobra({
  correnteDesligado,
  correnteAtualDestino,

  // aliases usados pela nova integração
  correnteTrechoOcorrencia,
  correnteTrechoRecuperacao,

  alimentadorOrigem,
  alimentadorDestino,

  equipamento,

  equipamentoInterligacao,
  equipamentoIdInterligacao,

  plaqueta,

  interligacao
} = {}) {

  // ===================================================
  // NORMALIZAÇÃO DOS DADOS DE CAMPO
  // ===================================================

  const correnteOcorrencia =
    converterCorrente(
      correnteTrechoOcorrencia ??
      correnteDesligado
    );


  const correnteRecuperacao =
    converterCorrente(
      correnteTrechoRecuperacao ??
      correnteAtualDestino
    );


  const origem =
    normalizarTexto(
      alimentadorOrigem
    );


  const destino =
    normalizarTexto(
      alimentadorDestino
    );


  const equipamentoFinal =
    normalizarTexto(

      equipamentoInterligacao ??
      equipamentoIdInterligacao ??
      equipamento ??
      plaqueta
    );


  const plaquetaFinal =
    normalizarTexto(
      plaqueta ??
      equipamento
    );


  // ===================================================
  // VALIDAÇÃO
  // ===================================================

  if (!origem) {

    return {

      permitido: false,

      status: "DADO_INVALIDO",

      motivo:
        "Alimentador de origem não informado.",

      correnteConhecida: false,

      dadosCampo: {

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao,

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal
      }

    };
  }


  if (!destino) {

    return {

      permitido: false,

      status: "DADO_INVALIDO",

      motivo:
        "Alimentador de destino não informado.",

      correnteConhecida: false,

      dadosCampo: {

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao,

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal
      }

    };
  }


  if (!equipamentoFinal) {

    return {

      permitido: false,

      status: "DADO_INVALIDO",

      motivo:
        "Equipamento de interligação não informado.",

      correnteConhecida:
        correnteOcorrencia !== null &&
        correnteRecuperacao !== null,

      dadosCampo: {

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao,

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino
      }

    };
  }


  if (
    correnteOcorrencia === null
  ) {

    return {

      permitido: false,

      status: "DADO_INDISPONIVEL",

      motivo:
        "Informe a corrente do trecho no momento do desarme.",

      correnteConhecida: false,

      dadosCampo: {

        correnteTrechoOcorrencia:
          null,

        correnteTrechoRecuperacao:
          correnteRecuperacao,

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal
      }

    };
  }


  if (
    correnteRecuperacao === null
  ) {

    return {

      permitido: false,

      status: "DADO_INDISPONIVEL",

      motivo:
        "Informe a corrente atual do trecho receptor/suporte.",

      correnteConhecida: false,

      dadosCampo: {

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          null,

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal
      }

    };
  }


  // ===================================================
  // OBJETO PADRONIZADO PARA O MOTOR COI
  // ===================================================

  const dadosMotor = {

    alimentador:
      origem,

    alimentadorOrigem:
      origem,

    alimentadorDestino:
      destino,


    equipamento:
      equipamentoFinal,

    equipamentoInterligacao:
      equipamentoFinal,

    equipamentoIdInterligacao:
      equipamentoFinal,

    plaqueta:
      plaquetaFinal,


    interligacao:
      interligacao || null,


    correnteDesligado:
      correnteOcorrencia,

    correnteOrigem:
      correnteOcorrencia,

    correnteTrechoOcorrencia:
      correnteOcorrencia,


    correnteAtualDestino:
      correnteRecuperacao,

    correnteDestino:
      correnteRecuperacao,

    correnteTrechoRecuperacao:
      correnteRecuperacao,


    // -----------------------------------------------
    // Estrutura de manobra
    // -----------------------------------------------

    manobra: {

      correnteDesligado:
        correnteOcorrencia,

      correnteOrigem:
        correnteOcorrencia,

      correnteTrechoOcorrencia:
        correnteOcorrencia,


      correnteDestino:
        correnteRecuperacao,

      correnteAtualDestino:
        correnteRecuperacao,

      correnteTrechoRecuperacao:
        correnteRecuperacao,


      alimentadorOrigem:
        origem,

      alimentadorDestino:
        destino,


      equipamento:
        equipamentoFinal,

      equipamentoInterligacao:
        equipamentoFinal,

      equipamentoIdInterligacao:
        equipamentoFinal

    }

  };


  // ===================================================
  // LOG OPERACIONAL
  // ===================================================

  console.log(
    "=========================================="
  );

  console.log(
    "[Power Grid Monitor] ENTRADA DO MOTOR COI"
  );

  console.log(
    dadosMotor
  );

  console.log(
    "=========================================="
  );


  // ===================================================
  // EXECUTAR MOTOR
  // ===================================================

  let resultadoMotor;


  try {

    resultadoMotor =
      executarMotorCOI(
        dadosMotor
      );

  } catch (erro) {

    console.error(
      "[Power Grid Monitor] Erro no Motor COI:",
      erro
    );


    return {

      permitido: false,

      status: "ERRO_MOTOR",

      motivo:
        erro?.message ||
        "Erro ao executar o Motor COI.",

      correnteConhecida: true,

      correnteTrechoOcorrencia:
        correnteOcorrencia,

      correnteTrechoRecuperacao:
        correnteRecuperacao,

      correnteInformada:
        correnteOcorrencia,

      dadosCampo: {

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal,

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao
      }

    };
  }


  // ===================================================
  // MOTOR NÃO RETORNOU
  // ===================================================

  if (!resultadoMotor) {

    return {

      permitido: false,

      status:
        "MOTOR_SEM_RESULTADO",

      motivo:
        "Motor COI não retornou resultado.",

      correnteConhecida:
        true,

      correnteTrechoOcorrencia:
        correnteOcorrencia,

      correnteTrechoRecuperacao:
        correnteRecuperacao,

      dadosCampo: {

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal,

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao
      }

    };
  }


  // ===================================================
  // NORMALIZAÇÃO DOS VALORES DE RETORNO
  // ===================================================

  const carregamentoMotor =
    obterValorOuNulo(
      resultadoMotor?.carregamento
    );


  const correnteFinalMotor =
    obterValorOuNulo(
      resultadoMotor?.correnteFinal
    );


  const trechoMotor =
    resultadoMotor?.trechoLimitante ||
    null;


  const equipamentoMotor =
    resultadoMotor?.equipamento ||
    null;


  const justificativasMotor =
    Array.isArray(
      resultadoMotor?.justificativas
    )
      ? resultadoMotor.justificativas
      : [];


  // ===================================================
  // MANOBRA NEGADA
  // ===================================================

  if (
    !resultadoMotor.permitido
  ) {

    return {

      ...resultadoMotor,

      permitido: false,

      status:
        resultadoMotor?.status ||
        "BLOQUEADA",

      motivo:
        resultadoMotor?.motivo ||
        "Manobra não permitida.",


      carregamento:
        carregamentoMotor,

      correnteTotal:
        correnteFinalMotor,

      trechoLimitante:
        trechoMotor,


      correnteConhecida:
        true,


      correnteTrechoOcorrencia:
        correnteOcorrencia,

      correnteTrechoRecuperacao:
        correnteRecuperacao,


      equipamentoInterligacao:
        equipamentoFinal,


      dadosCampo: {

        alimentadorOrigem:
          origem,

        alimentadorDestino:
          destino,

        equipamentoInterligacao:
          equipamentoFinal,

        correnteTrechoOcorrencia:
          correnteOcorrencia,

        correnteTrechoRecuperacao:
          correnteRecuperacao
      },


      justificativas:
        justificativasMotor
    };
  }


  // ===================================================
  // MANOBRA APROVADA
  // ===================================================

  const carregamentoNumerico =
    Number(
      carregamentoMotor
    );


  const carregamentoValido =
    Number.isFinite(
      carregamentoNumerico
    );


  const requerAlerta =
    carregamentoValido &&
    carregamentoNumerico > 80;


  const nivelCalculado =
    requerAlerta

      ? "ATENÇÃO"

      : (
        resultadoMotor?.nivel ||
        "NORMAL"
      );


  // ===================================================
  // DADOS DO TRECHO LIMITANTE
  // ===================================================

  const trechoLimitante = {

    id:
      trechoMotor?.id ||
      "-",

    bitola:
      trechoMotor?.cabo ??
      trechoMotor?.bitola ??
      "-",

    capacidade:
      trechoMotor?.capacidade ??
      0,

    alimentador:
      trechoMotor?.alimentador ||
      destino ||
      "-",

    limiteOperacional:
      trechoMotor?.limite ??
      trechoMotor?.limiteOperacional ??
      null,

    correnteSolicitada:
      trechoMotor?.correnteSolicitada ??
      correnteFinalMotor ??
      null
  };


  // ===================================================
  // EQUIPAMENTO RESULTANTE
  // ===================================================

  const equipamentoResultado =
    equipamentoMotor || {

      plaqueta:
        plaquetaFinal ||
        equipamentoFinal,

      id:
        equipamentoFinal

    };


  const equipamentoPlano =
    equipamentoResultado?.plaqueta ||
    plaquetaFinal ||
    equipamentoFinal ||
    "-";


  // ===================================================
  // JUSTIFICATIVAS
  // ===================================================

  const justificativas = [

    ...(
      requerAlerta

        ? [

            `ALERTA RN01: carregamento de ${carregamentoNumerico}% ultrapassa o limite recomendado de 80%. Requer monitoramento ativo.`

          ]

        : []

    ),

    ...justificativasMotor

  ];


  // ===================================================
  // SEQUÊNCIA OPERACIONAL
  // ===================================================

  const sequencia = [

    `Confirmar comando e disponibilidade do equipamento ${equipamentoPlano}`,

    `Isolar o trecho faltoso do alimentador ${origem}`,

    `Confirmar isolamento elétrico da área afetada`,

    `Fechar a interligação ${equipamentoPlano}`,

    `Transferir a carga para o alimentador ${destino}`,

    requerAlerta

      ?

    `⚠️ ATENÇÃO (RN01): monitorar ativamente a corrente e o carregamento pós-manobra (${carregamentoNumerico}%)`

      :

    "Confirmar estabilização da rede e normalização dos clientes"

  ];


  // ===================================================
  // RECOMENDAÇÃO
  // ===================================================

  const recomendacao = {

    avaliacao: {

      classificacao:

        nivelCalculado === "NORMAL"

          ? "RECOMENDADA"

          : "ATENÇÃO",


      nota:

        carregamentoValido

          ?

        (
          carregamentoNumerico >= 100

            ?

          0

            :

          Math.max(
            0,
            100 - carregamentoNumerico
          )
        )

          :

        null

    },


    equipamento:
      equipamentoPlano,


    equipamentoId:
      equipamentoFinal,


    trecho:
      trechoLimitante.id,


    alimentadorOrigem:
      origem,


    alimentadorDestino:
      destino,


    correnteTrechoOcorrencia:
      correnteOcorrencia,


    correnteTrechoRecuperacao:
      correnteRecuperacao,


    correnteFinal:
      correnteFinalMotor,


    carregamento:
      carregamentoValido
        ? carregamentoNumerico
        : null,


    justificativas,


    sequencia

  };


  // ===================================================
  // RESULTADO FINAL
  // ===================================================

  return {

    ...resultadoMotor,


    permitido: true,


    status:
      resultadoMotor?.status ||
      "LIBERADA",


    nivel:
      nivelCalculado,


    requerAlerta,


    carregamento:
      carregamentoValido
        ? carregamentoNumerico
        : null,


    correnteTotal:
      correnteFinalMotor,


    correnteTransferida:
      correnteFinalMotor,


    correnteConhecida:
      true,


    correnteTrechoOcorrencia:
      correnteOcorrencia,


    correnteTrechoRecuperacao:
      correnteRecuperacao,


    alimentadorOrigem:
      origem,


    alimentadorDestino:
      destino,


    equipamentoInterligacao:
      equipamentoFinal,


    equipamento:
      equipamentoResultado,


    trechoLimitante,


    justificativas,


    recomendacao,


    dadosCampo: {

      alimentadorOrigem:
        origem,

      alimentadorDestino:
        destino,

      equipamentoInterligacao:
        equipamentoFinal,

      plaqueta:
        plaquetaFinal,

      correnteTrechoOcorrencia:
        correnteOcorrencia,

      correnteTrechoRecuperacao:
        correnteRecuperacao

    },


    motivo:

      requerAlerta

        ?

      `Recomposição permitida, mas requer monitoramento ativo devido ao carregamento de ${carregamentoNumerico}% superior a 80% (RN01).`

        :

      (
        resultadoMotor?.motivo ||
        "Recomposição calculada pelo Motor COI."
      )

  };
}


// =====================================================
// EXPORTAÇÃO OPCIONAL EM OBJETO
// =====================================================

export const analiseManobraService = {

  analisarManobra

};