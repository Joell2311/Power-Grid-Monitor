import { trechos } from "../data/trechos";



export function analisarManobra({

  correnteDesligado,

  correnteAtualDestino,

  alimentadorDestino,

  equipamentoInterligacao

}) {



const correnteTotal =

Number(correnteDesligado) +

Number(correnteAtualDestino);





// ===============================
// VALIDA EQUIPAMENTO DE MANOBRA
// ===============================


if(equipamentoInterligacao){


if(equipamentoInterligacao.bloqueado){


return {

permitido:false,


motivo:

`
MANOBRA NÃO DISPONÍVEL


Equipamento:

${equipamentoInterligacao.plaqueta}


Motivo:

O equipamento encontra-se bloqueado
para operação.


Necessária atuação em campo.
`

};


}





if(!equipamentoInterligacao.disponivelManobra){


return {

permitido:false,


motivo:

`
MANOBRA NÃO DISPONÍVEL


Equipamento:

${equipamentoInterligacao.plaqueta}


O equipamento não está liberado
para execução da manobra.
`

};


}

}





// ===============================
// BUSCA TRECHOS DO ALIMENTADOR
// DESTINO
// ===============================


const trechosDestino = trechos.filter(

trecho =>

trecho.alimentador === alimentadorDestino

);






if(trechosDestino.length === 0){


return {


permitido:false,


motivo:

`
NÃO FOI POSSÍVEL ANALISAR A MANOBRA.


Não existem trechos cadastrados
para o alimentador receptor:

${alimentadorDestino}

`

};


}







// ===============================
// IDENTIFICA O TRECHO LIMITANTE
// MENOR CAPACIDADE
// ===============================


const trechoLimitante =

trechosDestino.reduce(

(menor, trecho)=>{


return trecho.capacidade < menor.capacidade

?

trecho

:

menor;


}

);








// ===============================
// CALCULO DE CARREGAMENTO
// ===============================


const carregamento = Math.round(

(

correnteTotal /

trechoLimitante.capacidade

)

*

100

);







const permitido = carregamento <= 80;








// ===============================
// MANOBRA PERMITIDA
// ===============================


if(permitido){


return {


permitido:true,


correnteTotal,


carregamento,


trechoLimitante,



motivo:

`
MANOBRA PERMITIDA


Alimentador receptor:

${alimentadorDestino}



Trecho limitante:

${trechoLimitante.id}


Condutor:

${trechoLimitante.cabo}



Capacidade do trecho:

${trechoLimitante.capacidade} A



Corrente prevista após transferência:

${correnteTotal} A



Carregamento:

${carregamento}%



Análise:

O trecho permanece dentro do limite
operacional recomendado.


Equipamento de interligação:

${equipamentoInterligacao?.plaqueta || "Não informado"}


Comando:

${equipamentoInterligacao?.comando || "Não informado"}

`

};


}









// ===============================
// MANOBRA NEGADA
// ===============================


return {


permitido:false,


correnteTotal,


carregamento,


trechoLimitante,



motivo:

`
MANOBRA NÃO PERMITIDA


Trecho limitante identificado:

${trechoLimitante.id}



Condutor:

${trechoLimitante.cabo}



Capacidade máxima do trecho:

${trechoLimitante.capacidade} A



Corrente prevista após manobra:

${correnteTotal} A



Carregamento:

${carregamento}%



Motivo técnico:

A corrente prevista ultrapassa
o limite operacional do condutor
do trecho receptor.



Risco operacional:

- Sobrecarga do condutor;
- Aquecimento do trecho;
- Atuação da proteção;
- Possível abertura de polos;
- Possíveis danos aos equipamentos
  e conexões da rede.



Recomendação:

Manter o trecho isolado e avaliar
alternativa de recomposição.

`

};



}