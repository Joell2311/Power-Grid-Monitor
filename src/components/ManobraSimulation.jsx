import {
  Paper,
  Typography,
  Divider,
  Chip,
  Stack,
} from "@mui/material";


import BoltIcon from "@mui/icons-material/Bolt";



function ManobraSimulation({

  ocorrencia,

  alimentadores

}) {



if(!ocorrencia){

return null;

}




const alternativa = alimentadores.find(

(item)=>

item.nome === ocorrencia.manobra.alternativa

);





if(!alternativa){

return (

<Paper

sx={{

p:2,

bgcolor:"#111d2d",

color:"#fff"

}}

>

<Typography>

Não foi encontrada alternativa de transferência.

</Typography>


</Paper>

);

}





const correnteAtual = alternativa.corrente;


const novaCorrente =

correnteAtual +

ocorrencia.manobra.correnteAtual;





const carregamento = Math.round(

(

novaCorrente /

alternativa.capacidade

)

*

100

);





const permitido = carregamento <= 80;





return(


<Paper

elevation={3}

sx={{

p:2,

bgcolor:"#111d2d",

color:"#fff",

borderRadius:3

}}

>



<Typography

variant="h6"

fontWeight="bold"

>

⚡ Simulação de Manobra

</Typography>





<Divider

sx={{

my:2,

bgcolor:"#2b3b52"

}}

/>





<Stack spacing={1}>


<Typography>

<strong>Origem:</strong>{" "}

{ocorrencia.alimentador}

</Typography>



<Typography>

<strong>Transferência:</strong>{" "}

{alternativa.nome}

</Typography>



<Typography>

<strong>Corrente atual:</strong>{" "}

{correnteAtual} A

</Typography>



<Typography>

<strong>Nova corrente:</strong>{" "}

{novaCorrente} A

</Typography>



<Typography>

<strong>Capacidade:</strong>{" "}

{alternativa.capacidade} A

</Typography>



<Typography>

<strong>Carregamento:</strong>{" "}

{carregamento}%

</Typography>



</Stack>







<Chip

icon={<BoltIcon/>}

label={

permitido

?

"MANOBRA APROVADA"

:

"MANOBRA NÃO RECOMENDADA"

}


color={

permitido

?

"success"

:

"error"

}


sx={{

mt:2,

fontWeight:"bold"

}}


/>





</Paper>


);


}


export default ManobraSimulation;