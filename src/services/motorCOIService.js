import { trechos } from "../data/trechos";
import { equipamentos } from "../data/equipamentos";



function localizarEquipamento(ocorrencia){

    const identificador =

        ocorrencia?.equipamento ??

        ocorrencia?.plaqueta ??

        ocorrencia?.equipamentoSelecionado?.plaqueta;



    console.log(
        "EQUIPAMENTO BUSCADO:",
        identificador
    );



    return equipamentos.find(

        item =>

            item.plaqueta === identificador ||

            item.id === identificador

    );

}




function localizarTrechoInterligacao(
    equipamento,
    ocorrencia
){

    if(!equipamento){

        return null;

    }



    const encontrados = trechos.filter(

        trecho =>

            trecho.interligacao === true &&

            trecho.equipamentoInterligacao === equipamento.plaqueta

    );



    console.log(
        "INTERLIGACOES:",
        encontrados
    );



    if(encontrados.length === 0){

        return null;

    }



    return encontrados.find(

        trecho =>

            trecho.alimentador === ocorrencia.alimentador

    )
    ||
    encontrados[0];

}





function escolherTrechoLimitante(
    trechoInterligacao
){

    return trechoInterligacao;

}





function classificarCarregamento(valor){


    if(valor > 100){

        return {

            nivel:"BLOQUEADA",

            permitido:false

        };

    }



    if(valor > 80){

        return {

            nivel:"CONTINGÊNCIA",

            permitido:true

        };

    }



    return {

        nivel:"NORMAL",

        permitido:true

    };

}





export function executarMotorCOI(ocorrencia){


    console.log(
        "OCORRENCIA NO MOTOR:",
        ocorrencia
    );



    const equipamento =

        localizarEquipamento(
            ocorrencia
        );



    if(!equipamento){


        return {

            permitido:false,

            motivo:
            "Equipamento não encontrado."

        };

    }




    const trechoInterligacao =

        localizarTrechoInterligacao(

            equipamento,

            ocorrencia

        );



    if(!trechoInterligacao){


        return {

            permitido:false,

            motivo:
            "Trecho de interligação não encontrado."

        };

    }




    const trechoLimitante =

        escolherTrechoLimitante(

            trechoInterligacao

        );





    const correnteDesligado = Number(

        ocorrencia.manobra?.correnteDesligado ??

        ocorrencia.manobra?.correnteAtual ??

        0

    );




    const correnteDestino = Number(

        ocorrencia.manobra?.correnteDestino ??

        0

    );





    const correnteFinal =

        correnteDesligado +

        correnteDestino;





    const capacidade =

        trechoLimitante.capacidade;





    const carregamento = Math.round(

        (

            correnteFinal /

            capacidade

        )

        *

        100

    );





    const classificacao =

        classificarCarregamento(

            carregamento

        );





    return {


        permitido:

            classificacao.permitido,



        nivel:

            classificacao.nivel,



        decisaoOperacional:

            classificacao.permitido

            ?

            "MANOBRA PERMITIDA"

            :

            "MANOBRA NÃO PERMITIDA",




        equipamento,



        trechoInterligacao,



        trechoLimitante,



        correnteDesligado,



        correnteDestino,



        correnteFinal,



        carregamento,



        capacidade,



        cabo:

            trechoLimitante.cabo,



        hospitais:

            trechoLimitante.consumidoresPrioritarios?.hospitais || 0,



        grupoA:

            trechoLimitante.consumidoresPrioritarios?.grupoA || 0,



        escolas:

            trechoLimitante.consumidoresPrioritarios?.escolas || 0,



        justificativas:[


            `Equipamento: ${equipamento.plaqueta}`,

            `Trecho: ${trechoLimitante.id}`,

            `Cabo: ${trechoLimitante.cabo}`,

            `Capacidade: ${capacidade}A`,

            `Corrente final: ${correnteFinal}A`,

            `Carregamento: ${carregamento}%`

        ]


    };


}