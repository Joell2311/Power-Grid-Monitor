/*
====================================================
AVALIAÇÃO DE ALTERNATIVAS DE RECOMPOSIÇÃO
COI MONITOR

Avalia uma alternativa considerando:

- Segurança elétrica
- Capacidade da rede
- Impacto aos clientes
- Prioridades operacionais
- Telecomando
- Quantidade de operações
- DEC estimado

Gera:
- Nota
- Classificação
- Justificativas operacionais

Pontuação máxima: 100 pontos

====================================================
*/


export function avaliarAlternativa(alternativa) {


  if(!alternativa){


    return {

      nota:0,

      classificacao:"NÃO AVALIADA",

      detalhes:{},

      justificativas:[

        "Alternativa inexistente para avaliação."

      ]

    };

  }



  let pontos = {


    carregamento:0,

    hospitais:0,

    grupoA:0,

    clientes:0,

    telecomando:0,

    manobras:0,

    dec:0


  };



  const justificativas = [];





/*
====================================================
1 - SEGURANÇA ELÉTRICA
====================================================
*/


const carregamento =

Number(alternativa.carregamento || 100);



if(carregamento > 100){


  pontos.carregamento = 0;


  justificativas.push(

    `❌ Sobrecarga prevista: ${carregamento}% da capacidade.`

  );


}

else if(carregamento > 80){


  pontos.carregamento = 5;


  justificativas.push(

    `⚠️ Operação em contingência: carregamento de ${carregamento}%.`

  );


}

else if(carregamento <= 50){


  pontos.carregamento = 30;


  justificativas.push(

    `✅ Baixo carregamento após transferência: ${carregamento}%.`

  );


}

else if(carregamento <=65){


  pontos.carregamento = 25;


  justificativas.push(

    `✅ Carregamento adequado após transferência: ${carregamento}%.`

  );


}

else{


  pontos.carregamento = 15;


  justificativas.push(

    `✅ Carregamento dentro do limite operacional: ${carregamento}%.`

  );


}





/*
====================================================
2 - RESTRIÇÕES DE REDE
====================================================
*/


if(

  alternativa.restricoes &&

  alternativa.restricoes.length > 0

){


  alternativa.restricoes.forEach((restricao)=>{


    justificativas.push(


      `❌ Restrição encontrada no trecho ${restricao.trecho}.
      
bitola: ${restricao.bitola}

Capacidade: ${restricao.capacidade}A

Corrente simulada: ${restricao.correnteSimulada}A

Carregamento: ${restricao.carregamento}%`

    );


  });



}

else{


  justificativas.push(

    "✅ Nenhuma restrição de capacidade encontrada nos trechos analisados."

  );


}







/*
====================================================
3 - HOSPITAIS
====================================================
*/


const hospitais =

Number(alternativa.hospitais || 0);



if(hospitais >=1){


  pontos.hospitais = 25;


  justificativas.push(

    `🏥 Hospital preservado ou atendido pela alternativa.`

  );


}

else{


  pontos.hospitais = 5;


  justificativas.push(

    "✅ Nenhum hospital afetado."

  );


}






/*
====================================================
4 - GRUPO A
====================================================
*/


const grupoA =

Number(alternativa.grupoA || 0);



if(grupoA >=2){


pontos.grupoA = 15;


justificativas.push(

`⚡ Preserva ${grupoA} consumidores Grupo A.`

);


}

else if(grupoA===1){


pontos.grupoA = 10;


justificativas.push(

"⚡ Preserva consumidor Grupo A."

);


}

else{


pontos.grupoA = 3;


}






/*
====================================================
5 - CLIENTES
====================================================
*/


const clientes =

Number(alternativa.clientes || 0);



if(clientes >=3000){


pontos.clientes = 15;


justificativas.push(

`✅ Redução significativa de clientes interrompidos: ${clientes}.`

);


}

else if(clientes >=1000){


pontos.clientes = 10;


justificativas.push(

`✅ Impacto reduzido para ${clientes} clientes.`

);


}

else{


pontos.clientes = 5;


}







/*
====================================================
6 - TELECOMANDO
====================================================
*/


if(alternativa.telecomandado === true){


pontos.telecomando = 5;


justificativas.push(

"✅ Equipamento telecomandado permite atuação remota."

);


}

else{


justificativas.push(

"⚠️ Equipamento necessita operação local."

);


}







/*
====================================================
7 - QUANTIDADE DE MANOBRAS
====================================================
*/


const quantidadeManobras =

Number(alternativa.quantidadeManobras || 3);



if(quantidadeManobras <=1){


pontos.manobras = 5;


}

else if(quantidadeManobras===2){


pontos.manobras = 3;


}

else{


pontos.manobras = 1;


}







/*
====================================================
8 - DEC ESTIMADO
====================================================
*/


const dec =

Number(alternativa.decEstimado || 10);



if(dec <5){


pontos.dec = 5;


justificativas.push(

"✅ Baixa expectativa de impacto no DEC."

);


}

else if(dec <=10){


pontos.dec = 3;


}

else{


justificativas.push(

"⚠️ DEC estimado elevado."

);


}






/*
====================================================
SOMA FINAL
====================================================
*/


const nota =

pontos.carregamento +

pontos.hospitais +

pontos.grupoA +

pontos.clientes +

pontos.telecomando +

pontos.manobras +

pontos.dec;







/*
====================================================
CLASSIFICAÇÃO
====================================================
*/


let classificacao;



if(nota >=85){


classificacao = "RECOMENDADA";


}

else if(nota >=65){


classificacao = "RECOMENDADA COM RESSALVAS";


}

else if(nota >=50){


classificacao = "ATENÇÃO OPERACIONAL";


}

else{


classificacao = "NÃO RECOMENDADA";


}







return {


nota,


classificacao,


detalhes:pontos,


justificativas,



resumo:{


carregamento,


hospitais,


grupoA,


clientes,


telecomandado:

alternativa.telecomandado || false,


quantidadeManobras,


decEstimado:dec



}


};



}









/*
====================================================
SELECIONA MELHOR ALTERNATIVA

Recebe várias possibilidades e retorna
a solução mais adequada.

====================================================
*/


export function selecionarMelhorAlternativa(alternativas){



if(

!alternativas ||

alternativas.length===0

){


return null;


}





const avaliadas =


alternativas.map(alternativa => ({


...alternativa,


avaliacao:

avaliarAlternativa(alternativa)


}));





avaliadas.sort(

(a,b)=>

b.avaliacao.nota -

a.avaliacao.nota

);





return avaliadas[0];


}