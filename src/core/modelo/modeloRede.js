// src/core/modelo/modeloRede.js

// ======================================================
// MODELO CENTRALIZADO DA REDE ELÉTRICA
// COI Monitor
//
// Responsável por manter:
// - Subestações
// - Alimentadores
// - Trechos
// - Equipamentos
// - Estado operacional da rede
//
// Este arquivo é a fonte única de dados
// para inteligência operacional
// ======================================================


// ===============================
// IMPORTAÇÃO DOS DADOS BASE
// ===============================


import  SubestacoesRepository  from "../repositories/subestacoesRepository";
import  AlimentadoresRepository  from "../repositories/alimentadoresRepository";
import  TrechosRepository  from "../repositories/trechosRepository";
import EquipamentosRepository from "../repositories/equipamentosRepository";


// ======================================================
// ESTADO GLOBAL DA REDE
// ======================================================

const estadoRede = {

    // ==========================
    // Estruturas físicas
    // ==========================

    subestacoes: [],
    
    alimentadores: [],

    trechos: [],

    equipamentos: [],



    // ==========================
    // Estado operacional atual
    // ==========================

    operacao: {

        ultimaAtualizacao: null,


        // Equipamentos fora de operação

        equipamentosDesligados: [],


        // Alimentadores desligados

        alimentadoresDesenergizados: [],


        // Histórico de alterações

        historico: []

    }

};



// ======================================================
// INICIALIZAÇÃO DO MODELO
// ======================================================

function inicializarRede() {

    estadoRede.subestacoes = JSON.parse(
        JSON.stringify(
            SubestacoesRepository.listar()
        )
    );

    estadoRede.alimentadores = JSON.parse(
        JSON.stringify(
            AlimentadoresRepository.listar()
        )
    );

    estadoRede.trechos = JSON.parse(
        JSON.stringify(
            TrechosRepository.listar()
        )
    );

    estadoRede.equipamentos = JSON.parse(
        JSON.stringify(
            EquipamentosRepository.listar()
        )
    );

    estadoRede.operacao.ultimaAtualizacao =
        new Date();

    return estadoRede;
}

// Inicializa automaticamente

inicializarRede();



// ======================================================
// GETTERS GERAIS
// ======================================================


export function getRede(){

    return estadoRede;

}




export function getSubestacoes(){

    return estadoRede.subestacoes;

}




export function getAlimentadores(){

    return estadoRede.alimentadores;

}




export function getTrechos(){

    return estadoRede.trechos;

}




export function getEquipamentos(){

    return estadoRede.equipamentos;

}




// ======================================================
// BUSCAS DE ELEMENTOS
// ======================================================


// Buscar subestação pelo código

export function buscarSubestacao(id){

    return estadoRede.subestacoes.find(
        se => se.id === id
    );

}




// Buscar alimentador

export function buscarAlimentador(id){

    return estadoRede.alimentadores.find(
        alimentador =>
            alimentador.id === id ||
            alimentador.codigo === id
    );

}




// Buscar trecho

export function buscarTrecho(id){

    return estadoRede.trechos.find(
        trecho =>
            trecho.id === id
    );

}




// Buscar equipamento

export function buscarEquipamento(id){

    return estadoRede.equipamentos.find(
        equipamento =>
            equipamento.id === id ||
            equipamento.plaqueta === id
    );

}




// ======================================================
// BUSCAS POR RELACIONAMENTO
// ======================================================



// Buscar todos os trechos de um alimentador

export function buscarTrechosAlimentador(
    alimentador
){

    return estadoRede.trechos.filter(
        trecho =>
            trecho.alimentador === alimentador
    );

}




// Buscar equipamentos de um alimentador

export function buscarEquipamentosAlimentador(
    alimentador
){

    return estadoRede.equipamentos.filter(
        equipamento =>
            equipamento.alimentador === alimentador
    );

}




// Buscar equipamentos telecomandados

export function buscarEquipamentosTelecomandados(
    alimentador
){

    return estadoRede.equipamentos.filter(
        equipamento =>
            equipamento.alimentador === alimentador &&
            equipamento.telecomandado === true
    );

}




// Buscar interligações disponíveis

export function buscarInterligacoes(){

    return estadoRede.equipamentos.filter(

        equipamento =>
            equipamento.interligacao === true

    );

}




// Buscar interligações de um alimentador específico

export function buscarInterligacoesAlimentador(
    alimentador
){

    return estadoRede.equipamentos.filter(

        equipamento =>

            equipamento.alimentador === alimentador &&

            equipamento.interligacao === true

    );

}




// ======================================================
// CONSULTAS OPERACIONAIS BÁSICAS
// ======================================================


// Verificar se alimentador existe

export function existeAlimentador(
    alimentador
){

    return estadoRede.alimentadores.some(

        item =>
            item.id === alimentador ||
            item.codigo === alimentador

    );

}




// Verificar se trecho existe

export function existeTrecho(id){

    return estadoRede.trechos.some(

        trecho =>
            trecho.id === id

    );

}




// Verificar se equipamento existe

export function existeEquipamento(id){

    return estadoRede.equipamentos.some(

        equipamento =>
            equipamento.id === id ||
            equipamento.plaqueta === id

    );

}



// ======================================================
// EXPORTAÇÃO DO ESTADO
// ======================================================


// ======================================================
// TOPOLOGIA DA REDE
// CONEXÕES E CAMINHOS OPERACIONAIS
// ======================================================



// ======================================================
// BUSCAR CONEXÕES DE UM EQUIPAMENTO
// ======================================================
//
// Retorna equipamentos conectados através de
// interligações ou relações origem/destino
// ======================================================


export function buscarConexoesEquipamento(
    equipamentoId
){

    const equipamento =
        buscarEquipamento(equipamentoId);


    if(!equipamento){

        return [];

    }



    return estadoRede.equipamentos.filter(

        item =>

            item.id !== equipamento.id &&

            (

                item.alimentador === equipamento.alimentador ||

                item.alimentadorDestino === equipamento.alimentador

            )

    );

}




// ======================================================
// BUSCAR CAMINHO ENTRE ALIMENTADORES
// ======================================================
//
// Utilizado para identificar possibilidade
// de transferência de carga
// ======================================================


export function buscarCaminhoAlimentadores(

    origem,

    destino

){


    const caminho = [];



    const interligacoes =
        buscarInterligacoes();



    interligacoes.forEach(

        equipamento => {


            if(

                equipamento.alimentador === origem &&

                equipamento.alimentadorDestino === destino

            ){

                caminho.push({

                    equipamento:

                        equipamento.id,


                    origem:

                        origem,


                    destino:

                        destino

                });

            }



            if(

                equipamento.alimentador === destino &&

                equipamento.alimentadorDestino === origem

            ){

                caminho.push({

                    equipamento:

                        equipamento.id,


                    origem:

                        destino,


                    destino:

                        origem

                });

            }


        }

    );



    return caminho;

}





// ======================================================
// VERIFICAR SE EXISTE INTERLIGAÇÃO
// ENTRE DOIS ALIMENTADORES
// ======================================================


export function possuiInterligacao(

    origem,

    destino

){


    return buscarCaminhoAlimentadores(

        origem,

        destino

    ).length > 0;


}

/**
 * Analisa a viabilidade da normalização de carga considerando a bitola e a corrente informada.
 * Se a corrente exceder a capacidade, bloqueia e retorna passosManobra vazio ([]).
 */
export function analisarNormalizacao(trechoInterligacaoId, correnteInformada) {
  const trecho =
    buscarTrecho(trechoInterligacaoId);

if (!trecho) {
    return {
        sucesso: false,
        statusAnalise: "ERRO",
        mensagem:
            "Trecho de interligação não encontrado no modelo da rede.",
        passosManobra: []
    };
}

  const capacidadeSuportada = trecho.capacidade || trecho.capacidadeMaximaAmperes || 250;

  // VALIDAÇÃO: Se a corrente informada excede a capacidade da bitola do cabo
  if (correnteInformada > capacidadeSuportada) {
    return {
      sucesso: false,
      statusAnalise: "SOBRECARGA",
      mensagem: `Nenhuma transferência segura encontrada. A corrente informada (${correnteInformada}A) excede a capacidade máxima suportada pela bitola ${trecho.bitola || "desconhecida"} do trecho (${capacidadeSuportada}A), gerando risco de sobrecarga térmica e colapso do alimentador suporte.`,
      passosManobra: [], // IMPEDE estritamente a geração de passos de manobra se bloqueado
      detalhes: {
        correnteInformada,
        capacidadeTrecho: capacidadeSuportada,
        bitola: trecho.bitola
      }
    };
  }

  // Se estiver dentro da capacidade, libera a transferência e os passos de manobra
  return {
    sucesso: true,
    statusAnalise: "VIABILIZADO",
    mensagem: `Transferência e normalização viáveis. A bitola ${trecho.bitola || "padrão"} suporta a carga informada (${correnteInformada}A <= ${capacidadeSuportada}A).`,
    passosManobra: [
      { ordem: 1, acao: "ABRIR", elemento: "DJ_C4", descricao: "Realizar a abertura do disjuntor do alimentador afetado (CMG-01C4)" },
      { ordem: 2, acao: "FECHAR", elemento: "CH_INT_01", descricao: "Realizar o fechamento do equipamento de interligação correspondente" },
      { ordem: 3, acao: "NORMALIZAR", elemento: "TRECHO", descricao: "Transferir e normalizar a carga para o alimentador de suporte (CMG-01C3)" },
      { ordem: 4, acao: "CONFIRMAR", elemento: "GERAL", descricao: "Confirmar estabilização térmica e atendimento aos clientes" }
    ],
    detalhes: {
      correnteInformada,
      capacidadeTrecho: capacidadeSuportada,
      bitola: trecho.bitola
    }
  };
}


// ======================================================
// CAPACIDADE DE TRECHO
// BASEADA NA BITOLA
// ======================================================
//
// Regra operacional:
// A capacidade é definida pelo menor cabo
// encontrado no trecho.
//
// Exemplo:
// 150mm² -> 300A
// 95mm²  -> 220A
// 70mm²  -> 150A
// 35mm²  -> 90A
// ======================================================



const tabelaCapacidadeCabos = {


    "240": 500,


    "150": 300,


    "95": 220,


    "70": 150,


    "35": 90



};





export function capacidadePorBitola(

    bitola

){


    const valor =

        String(bitola)
            .replace("mm²","")
            .replace("mm2","")
            .trim();



    return tabelaCapacidadeCabos[valor] || 0;


}






// ======================================================
// CALCULAR LIMITE OPERACIONAL DO TRECHO
// ======================================================
//
// Sempre considera a menor capacidade
// encontrada no trecho
// ======================================================


export function calcularCapacidadeTrecho(

    trechoId

){


    const trecho =

        buscarTrecho(trechoId);



    if(!trecho){

        return 0;

    }



    const bitolas = [];



    if(trecho.bitola){

        bitolas.push(trecho.bitola);

    }



    if(Array.isArray(trecho.condutores)){


        trecho.condutores.forEach(

            cabo =>

                bitolas.push(cabo.bitola)

        );

    }




    if(bitolas.length === 0){

        return 0;

    }



    const capacidades =

        bitolas.map(

            bitola =>

                capacidadePorBitola(bitola)

        );



    return Math.min(

        ...capacidades

    );

}





// ======================================================
// VALIDAR CARREGAMENTO DO TRECHO
// ======================================================
//
// Não permitir ultrapassar 80%
// da capacidade nominal
// ======================================================


export function validarCargaTrecho(

    trechoId,

    correnteNova

){


    const capacidade =

        calcularCapacidadeTrecho(trechoId);



    if(!capacidade){

        return {

            permitido:false,

            motivo:

            "Trecho sem capacidade definida"

        };

    }




    const limite =

        capacidade * 0.8;



    return {


        permitido:

            correnteNova <= limite,



        capacidade:



            capacidade,



        limiteOperacional:



            limite,



        correnteSolicitada:

            correnteNova,



        excedido:

            correnteNova > limite


    };

}




// ======================================================
// ANALISAR TRANSFERÊNCIA ENTRE ALIMENTADORES
// ======================================================
//
// Verifica:
// - existência de interligação
// - limite do trecho destino
// ======================================================


export function analisarTransferencia(

    origem,

    destino,

    correnteOrigem,

    correnteDestino

){


    const resultado = {


        permitido:false,


        motivo:null,


        interligacao:null,


        correnteFinal:null


    };




    const caminho =

        buscarCaminhoAlimentadores(

            origem,

            destino

        );




    if(caminho.length === 0){


        resultado.motivo =

            "Não existe interligação entre alimentadores";


        return resultado;

    }



    resultado.interligacao = caminho;




    const correnteTotal =

        correnteOrigem +

        correnteDestino;



    resultado.correnteFinal =

        correnteTotal;



    const alimentadorDestino =

        buscarAlimentador(destino);



    if(!alimentadorDestino){


        resultado.motivo =

            "Alimentador destino não encontrado";


        return resultado;

    }




    const trechosDestino =

        buscarTrechosAlimentador(

            destino

        );




    for(

        const trecho of trechosDestino

    ){


        const validacao =

            validarCargaTrecho(

                trecho.id,

                correnteTotal

            );



        if(!validacao.permitido){


            resultado.motivo =

                "Capacidade do trecho insuficiente";


            resultado.detalhe =

                validacao;



            return resultado;


        }


    }




    resultado.permitido = true;



    return resultado;


}

// ======================================================
// CONTROLE DE ESTADO OPERACIONAL
// ALTERAÇÕES DA REDE
// ======================================================



// ======================================================
// REGISTRAR HISTÓRICO
// ======================================================


function registrarHistorico(

    acao,

    dados

){


    estadoRede.operacao.historico.push({

        data:

            new Date(),


        acao,


        dados

    });



    estadoRede.operacao.ultimaAtualizacao =

        new Date();


}





// ======================================================
// ATUALIZAR CORRENTE DO ALIMENTADOR
// ======================================================
//
// A corrente é informada pelo operador
// durante a ocorrência/manobra
// ======================================================


export function atualizarCorrenteAlimentador(

    alimentadorId,

    corrente

){


    const alimentador =

        buscarAlimentador(alimentadorId);



    if(!alimentador){

        return {

            sucesso:false,

            mensagem:
            "Alimentador não encontrado"

        };

    }



    alimentador.correnteAtual = corrente;



    registrarHistorico(

        "ATUALIZACAO_CORRENTE",

        {

            alimentador:

                alimentadorId,


            corrente

        }

    );



    return {

        sucesso:true,

        alimentador,

    };


}







// ======================================================
// ATUALIZAR CORRENTE DO TRECHO
// ======================================================


export function atualizarCorrenteTrecho(

    trechoId,

    corrente

){


    const trecho =

        buscarTrecho(trechoId);



    if(!trecho){


        return {

            sucesso:false,

            mensagem:
            "Trecho não encontrado"

        };

    }



    trecho.correnteAtual = corrente;



    registrarHistorico(

        "ATUALIZACAO_CORRENTE_TRECHO",

        {

            trecho:

                trechoId,


            corrente

        }

    );



    return {


        sucesso:true,


        trecho


    };


}





// ======================================================
// DESLIGAR EQUIPAMENTO
// ======================================================


export function desligarEquipamento(

    equipamentoId

){


    const equipamento =

        buscarEquipamento(equipamentoId);



    if(!equipamento){


        return {

            sucesso:false,

            mensagem:

            "Equipamento não encontrado"

        };

    }




    equipamento.status = "DESLIGADO";




    if(

        !estadoRede.operacao.equipamentosDesligados.includes(

            equipamentoId

        )

    ){


        estadoRede.operacao.equipamentosDesligados.push(

            equipamentoId

        );

    }




    registrarHistorico(

        "EQUIPAMENTO_DESLIGADO",

        {

            equipamento:

                equipamentoId

        }

    );




    return {


        sucesso:true,


        equipamento


    };


}





// ======================================================
// LIGAR EQUIPAMENTO
// ======================================================


export function ligarEquipamento(

    equipamentoId

){


    const equipamento =

        buscarEquipamento(equipamentoId);



    if(!equipamento){


        return {

            sucesso:false,

            mensagem:

            "Equipamento não encontrado"

        };

    }




    equipamento.status = "LIGADO";




    estadoRede.operacao.equipamentosDesligados =

        estadoRede.operacao.equipamentosDesligados.filter(

            id => id !== equipamentoId

        );




    registrarHistorico(

        "EQUIPAMENTO_LIGADO",

        {

            equipamento:

                equipamentoId

        }

    );




    return {


        sucesso:true,


        equipamento


    };


}







// ======================================================
// DESENERGIZAR ALIMENTADOR
// ======================================================


export function desenergizarAlimentador(

    alimentadorId

){


    const alimentador =

        buscarAlimentador(alimentadorId);



    if(!alimentador){


        return {

            sucesso:false,

            mensagem:

            "Alimentador não encontrado"

        };

    }



    alimentador.estado =

        "DESENERGIZADO";




    if(

        !estadoRede.operacao.alimentadoresDesenergizados.includes(

            alimentadorId

        )

    ){


        estadoRede.operacao.alimentadoresDesenergizados.push(

            alimentadorId

        );

    }



    registrarHistorico(

        "ALIMENTADOR_DESENERGIZADO",

        {

            alimentador:

                alimentadorId

        }

    );



    return {


        sucesso:true,


        alimentador


    };


}







// ======================================================
// ENERGIZAR ALIMENTADOR
// ======================================================


export function energizarAlimentador(

    alimentadorId

){


    const alimentador =

        buscarAlimentador(alimentadorId);



    if(!alimentador){


        return {

            sucesso:false,

            mensagem:

            "Alimentador não encontrado"

        };

    }





    alimentador.estado =

        "ENERGIZADO";




    estadoRede.operacao.alimentadoresDesenergizados =

        estadoRede.operacao.alimentadoresDesenergizados.filter(

            id => id !== alimentadorId

        );




    registrarHistorico(

        "ALIMENTADOR_ENERGIZADO",

        {

            alimentador:

                alimentadorId

        }

    );



    return {


        sucesso:true,


        alimentador


    };


}







// ======================================================
// VERIFICAR ESTADO ATUAL
// ======================================================


export function consultarEstadoOperacional(){


    return {


        equipamentosDesligados:

            estadoRede.operacao.equipamentosDesligados,



        alimentadoresDesenergizados:

            estadoRede.operacao.alimentadoresDesenergizados,



        ultimaAtualizacao:

            estadoRede.operacao.ultimaAtualizacao,



        historico:

            estadoRede.operacao.historico


    };


}







// ======================================================
// RESETAR ESTADO OPERACIONAL
// ======================================================
//
// Utilizado para testes/simulações
// ======================================================


export function restaurarEstadoInicial(){

    inicializarRede();


    estadoRede.operacao.equipamentosDesligados=[];


    estadoRede.operacao.alimentadoresDesenergizados=[];


    estadoRede.operacao.historico=[];


    registrarHistorico(
        "RESET_REDE",
        {}
    );


    return estadoRede;

} 
// ======================================================
// INTELIGÊNCIA OPERACIONAL
// ANÁLISE DE MANOBRA E TRANSFERÊNCIA
// ======================================================




// ======================================================
// ANALISAR DISPONIBILIDADE DE MANOBRA
// ======================================================
//
// Valida:
// - existência de interligação
// - estado do equipamento
// - capacidade dos trechos
// - carregamento final
// ======================================================


export function analisarManobraOperacional(

    alimentadorOrigem,

    alimentadorDestino,

    correnteOrigem,

    correnteDestino

){


    const resultado = {


        permitido:false,


        status:"BLOQUEADA",


        motivo:null,


        detalhes:{}



    };





    // =================================
    // Verifica alimentadores
    // =================================


    const origem =

        buscarAlimentador(alimentadorOrigem);



    const destino =

        buscarAlimentador(alimentadorDestino);




    if(!origem || !destino){


        resultado.motivo =

            "Alimentador não encontrado";


        return resultado;

    }





    // =================================
    // Busca interligação
    // =================================


    const interligacoes =

        buscarCaminhoAlimentadores(

            alimentadorOrigem,

            alimentadorDestino

        );





    if(interligacoes.length === 0){


        resultado.motivo =

            "Não existe equipamento de interligação entre os alimentadores";


        return resultado;


    }





    resultado.detalhes.interligacao =

        interligacoes;







    // =================================
    // Verifica estado do equipamento
    // =================================



    for(

        const item of interligacoes

    ){


        const equipamento =

            buscarEquipamento(item.equipamento);




       if(
            !equipamento ||
        equipamento.status === "DESLIGADO"
    ){


            resultado.motivo =

                "Equipamento de interligação indisponível";



            resultado.detalhes.equipamento =

                equipamento;



            return resultado;


        }


    }







    // =================================
    // Soma de corrente
    // =================================


    const novaCorrente =

        correnteOrigem +

        correnteDestino;




    resultado.detalhes.correnteAtual = {


        origem:

            correnteOrigem,


        destino:

            correnteDestino,


        total:

            novaCorrente


    };








    // =================================
    // Verifica capacidade dos trechos
    // =================================



    const trechosDestino =

        buscarTrechosAlimentador(

            alimentadorDestino

        );





    for(

        const trecho of trechosDestino

    ){



        const capacidade =

            calcularCapacidadeTrecho(

                trecho.id

            );



        const limite =

            capacidade * 0.8;




        if(

            novaCorrente > limite

        ){



            resultado.motivo =

                "Transferência bloqueada: limite operacional do trecho excedido";



            resultado.detalhes.trecho = {


                id:

                    trecho.id,


                capacidade,


                limite,


                correnteSolicitada:

                    novaCorrente



            };



            return resultado;


        }



    }





    // =================================
    // APROVADO
    // =================================



    resultado.permitido = true;


    resultado.status =

        "LIBERADA";


    resultado.motivo =

        "Manobra operacionalmente possível";




    return resultado;



}







// ======================================================
// ANALISAR IMPACTO DA MANOBRA
// ======================================================
//
// Retorna informações para o operador:
// - clientes envolvidos
// - equipamentos envolvidos
// - possibilidade de normalização
// ======================================================


export function analisarImpactoManobra(

    alimentador

){



    const dados =

        buscarAlimentador(alimentador);



    if(!dados){


        return null;

    }





    const equipamentos =

        buscarEquipamentosAlimentador(

            alimentador

        );




    return {


        alimentador,


        clientes:

            dados.clientes || 0,



        hospitais:

            dados.hospitais || 0,



        equipamentos:



            equipamentos.length,



        telecomandados:



            equipamentos.filter(

                eq => eq.telecomandado === true

            ).length



    };



}








// ======================================================
// GERAR RESUMO OPERACIONAL
// ======================================================
//
// Usado para painel do COI
// ======================================================


export function resumoRede(){



    return {


        subestacoes:

            estadoRede.subestacoes.length,



        alimentadores:

            estadoRede.alimentadores.length,



        trechos:

            estadoRede.trechos.length,



        equipamentos:

            estadoRede.equipamentos.length,



        equipamentosDesligados:

            estadoRede.operacao.equipamentosDesligados.length,



        alimentadoresDesenergizados:

            estadoRede.operacao.alimentadoresDesenergizados.length,



        ultimaAtualizacao:

            estadoRede.operacao.ultimaAtualizacao



    };


}







// ======================================================
// EXPORTAÇÃO FINAL DO MODELO
// ======================================================


export const modeloRede = {


    // consultas

    getRede,

    getSubestacoes,

    getAlimentadores,

    getTrechos,

    getEquipamentos,



    // buscas

    buscarSubestacao,

    buscarAlimentador,

    buscarTrecho,

    buscarEquipamento,

    buscarInterligacoesAlimentador,



    // topologia

    possuiInterligacao,

    buscarCaminhoAlimentadores,



    // capacidade

    capacidadePorBitola,

    calcularCapacidadeTrecho,

    validarCargaTrecho,



    // operação

    atualizarCorrenteAlimentador,

    atualizarCorrenteTrecho,

    desligarEquipamento,

    ligarEquipamento,

    energizarAlimentador,

    desenergizarAlimentador,



    // inteligência

    analisarTransferencia,

    analisarManobraOperacional,

    analisarImpactoManobra,

    resumoRede,



    // controle

    consultarEstadoOperacional,

    restaurarEstadoInicial


};





export { estadoRede };