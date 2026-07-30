import { executarMotorCOI } from "./motorCOIService";


export function analisarManobra({

    correnteDesligado,

    correnteAtualDestino,

    alimentadorOrigem,

    alimentadorDestino,

    equipamento

}) {


    const resultado = executarMotorCOI({

        alimentador: alimentadorOrigem,

        equipamento,

        manobra: {

            correnteDesligado,

            correnteDestino: correnteAtualDestino

        }

    });



    if(!resultado){

        return {

            permitido:false,

            motivo:
            "Motor COI não retornou resultado."

        };

    }





    /*
    =================================================
    MANOBRA BLOQUEADA
    =================================================
    */


    if(!resultado.permitido){


        return {


            permitido:false,


            motivo:

                resultado.motivo ||

                resultado.decisaoOperacional ||


                "Manobra não permitida.",



            carregamento:

                resultado.carregamento || 0,



            correnteTotal:

                resultado.correnteFinal || 0,



            trechoLimitante:

                resultado.trechoLimitante || null,



            justificativas:

                resultado.justificativas || []


        };


    }






    /*
    =================================================
    MANOBRA APROVADA
    GERA RECOMPOSIÇÃO
    =================================================
    */


    return {


        permitido:true,



        nivel:

            resultado.nivel,



        carregamento:

            resultado.carregamento,



        correnteTotal:

            resultado.correnteFinal,





        trechoLimitante:{


            id:

                resultado.trechoLimitante.id,


            cabo:

                resultado.trechoLimitante.cabo,


            capacidade:

                resultado.trechoLimitante.capacidade,


            alimentador:

                resultado.trechoLimitante.alimentador


        },






        /*
        FORMATO QUE O OCCURRENCEPANEL ESPERA
        */


        recomendacao:{


            avaliacao:{


                classificacao:

                    resultado.nivel === "NORMAL"

                    ?

                    "RECOMENDADA"

                    :

                    "ATENÇÃO",



                nota:

                    resultado.carregamento > 100

                    ?

                    0

                    :

                    100 - resultado.carregamento


            },




            equipamento:

                resultado.equipamento?.plaqueta || "-",



            trecho:

                resultado.trechoLimitante.id,



            alimentadorDestino:

                alimentadorDestino,





            justificativas:

                resultado.justificativas || [],





            sequencia:[


                "Confirmar comando remoto do equipamento",

                "Abrir trecho isolado da falta",

                "Fechar interligação",

                "Monitorar carregamento pós-manobra"


            ]


        },





        motivo:

            "Recomposição calculada pelo Motor COI."



    };


}