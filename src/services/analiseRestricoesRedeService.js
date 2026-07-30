import { trechos } from "../data/trechos";



export function analisarRestricoesRede({

  alimentadorOrigem,
  alimentadorDestino,
  correnteTransferida

}){


const restricoes=[];



// Busca todos os trechos envolvidos

const caminho = trechos.filter(

trecho =>

trecho.alimentador === alimentadorDestino

);





caminho.forEach((trecho)=>{



const novaCorrente =

(trecho.correnteAtual || 0)

+

(correnteTransferida || 0);




const percentual =

(novaCorrente / trecho.capacidade) * 100;






if(percentual > 80){


restricoes.push({

tipo:

percentual > 100

?

"CAPACIDADE_EXCEDIDA"

:

"ACIMA_LIMITE_OPERACIONAL",



trecho:trecho.id,


origem:trecho.origem,


destino:trecho.destino,


cabo:trecho.cabo,


capacidade:trecho.capacidade,


correnteAtual:trecho.correnteAtual,


correnteSimulada:

novaCorrente,


carregamento:

Number(percentual.toFixed(1)),


mensagem:

percentual > 100

?

`Trecho ${trecho.id} ultrapassa a capacidade do cabo ${trecho.cabo}`

:

`Trecho ${trecho.id} acima do limite operacional recomendado`

});


}



});





return restricoes;



}