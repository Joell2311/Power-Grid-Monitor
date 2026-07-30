/*
====================================================
IMPACTO OPERACIONAL DA OCORRÊNCIA
COI MONITOR

Calcula a criticidade da ocorrência considerando:

- Clientes afetados
- Hospitais
- Grupo A
- Escolas
- Tempo estimado (DEC)

Resultado:
Baixa
Média
Alta
Crítica

====================================================
*/


export function calcularImpactoOperacional(ocorrencia){


if(!ocorrencia){


return null;


}




const impacto = ocorrencia.impacto || {};



const clientes =

Number(
impacto.clientesAfetados || 0
);



const hospitais =

Number(
impacto.hospitais || 0
);



const escolas =

Number(
impacto.escolas || 0
);



const grupoA =

Number(
impacto.grupoA || 0
);



const dec =

Number(
(
impacto.decEstimado || "0"
)
.toString()
.replace("min","")
);





let pontos = 0;





/*
====================================
CLIENTES AFETADOS
====================================
*/


if(clientes > 3000){

pontos += 30;

}

else if(clientes > 1000){

pontos += 20;

}

else if(clientes > 300){

pontos += 10;

}






/*
====================================
HOSPITAIS
====================================
*/


if(hospitais > 0){


pontos += 30;


}







/*
====================================
GRUPO A
====================================
*/


if(grupoA >= 2){


pontos += 20;


}

else if(grupoA === 1){


pontos += 10;


}








/*
====================================
ESCOLAS
====================================
*/


if(escolas > 0){


pontos += 5;


}







/*
====================================
DEC
====================================
*/


if(dec > 10){


pontos += 15;


}

else if(dec > 5){


pontos += 10;


}

else{


pontos += 5;


}







let classificacao;





if(pontos >= 80){


classificacao = "CRÍTICA";


}

else if(pontos >= 50){


classificacao = "ALTA";


}

else if(pontos >= 30){


classificacao = "MÉDIA";


}

else{


classificacao = "BAIXA";


}








return {


pontuacao:pontos,


classificacao,



dados:{


clientes,

hospitais,

grupoA,

escolas,

dec



},




prioridades:{


hospital:

hospitais > 0,


grupoA:

grupoA > 0,


clientesCriticos:

clientes > 3000



}



};



}