import {
  Paper,
  Typography,
  Divider,
  Button,
  Box,
  Chip
} from "@mui/material";

import LocationOnIcon from "@mui/icons-material/LocationOn";

import ManobraForm from "./ManobraForm";


function OccurrencePanel({

  ocorrencia,
  onLocalizar,
  recomendacao,
  setRecomendacao,
  impacto

}) {

 console.log("RECOMENDACAO:", recomendacao);
  
  if(!ocorrencia) return null;



const avaliacao =
    recomendacao || {};


  const justificativas =

    avaliacao.justificativas || [];



  return (

    <Paper

      sx={{

        p:2,

        bgcolor:"#111d2d",

        color:"#fff",

        borderRadius:3,

        height:"100%",

        overflow:"auto"

      }}

    >



      <Typography

        variant="h6"

        fontWeight="bold"

      >

        🚨 Ocorrência Ativa

      </Typography>



      <Divider

        sx={{

          my:2,

          bgcolor:"#334155"

        }}

      />





      <Typography>

        <b>Alimentador:</b>{" "}

        {ocorrencia.alimentador}

      </Typography>



      <Typography>

        <b>Equipamento:</b>{" "}

        {ocorrencia.equipamento}

      </Typography>



      <Typography>

        <b>Causa:</b>{" "}

        {ocorrencia.causa}

      </Typography>




      <Typography>

        <b>Clientes afetados:</b>{" "}

        {ocorrencia.impacto?.clientesAfetados ?? 0}

      </Typography>





      {

        ocorrencia.impacto?.hospitais > 0 && (


          <Typography

            sx={{

              color:"#f87171"

            }}

          >

            🏥 Hospitais afetados:

            {" "}

            {ocorrencia.impacto.hospitais}


          </Typography>


        )

      }







      <Button

        variant="contained"

        startIcon={<LocationOnIcon />}

        sx={{mt:2}}

        onClick={()=>onLocalizar(ocorrencia.coordenadas)}

      >

        Localizar no mapa


      </Button>









{/* =================================================
IMPACTO OPERACIONAL
================================================= */}



{

impacto && (


<Box

sx={{

mt:3,

p:2,

borderRadius:2,

bgcolor:

impacto.classificacao === "CRÍTICA"

?

"#450a0a"

:

impacto.classificacao === "ALTA"

?

"#7c2d12"

:

"#172554"

}}

>



<Typography

variant="h6"

fontWeight="bold"

>

⚠️ Impacto Operacional

</Typography>




<Divider

sx={{

my:2,

bgcolor:"#475569"

}}

/>





<Chip

label={impacto.classificacao}

color={

impacto.classificacao==="CRÍTICA"

?

"error"

:

impacto.classificacao==="ALTA"

?

"warning"

:

"info"

}

sx={{mb:2}}

/>






<Typography>

<b>Pontuação:</b>{" "}

{impacto.pontuacao}/100

</Typography>




<Typography>

<b>Clientes:</b>{" "}

{impacto.dados?.clientes ?? 0}

</Typography>




<Typography>

<b>Hospitais:</b>{" "}

{impacto.dados?.hospitais ?? 0}

</Typography>




<Typography>

<b>Grupo A:</b>{" "}

{impacto.dados?.grupoA ?? 0}

</Typography>




<Typography>

<b>Escolas:</b>{" "}

{impacto.dados?.escolas ?? 0}

</Typography>




<Typography>

<b>DEC:</b>{" "}

{impacto.dados?.dec ?? 0}

min

</Typography>



</Box>


)

}









{/* =================================================
MANOBRA
================================================= */}



<Box sx={{mt:3}}>


<ManobraForm

ocorrencia={ocorrencia}

setRecomendacao={setRecomendacao}

/>


</Box>









{/* =================================================
RECOMPOSIÇÃO INTELIGENTE
================================================= */}



{

recomendacao && (


<Box

sx={{

mt:3,

p:2,

borderRadius:2,

bgcolor:

recomendacao.permitido

?

"#102a22"

:

"#3b1d1d"

}}

>



<Typography

variant="h6"

fontWeight="bold"

>

🤖 Recomposição Inteligente

</Typography>




<Divider

sx={{

my:2,

bgcolor:"#475569"

}}

/>







{

recomendacao.permitido

?

(



<>



<Chip

label={

`${

avaliacao.classificacao ||

"RECOMPOSIÇÃO"

}

-

${

avaliacao.nota || 0

}/100`

}

color={

avaliacao.classificacao === "RECOMENDADA"

?

"success"

:

"warning"

}

sx={{

mb:2,

fontWeight:"bold"

}}

/>







<Typography>

<b>Equipamento:</b>{" "}

{

recomendacao.recomposicao?.equipamento ||
"-"
}

</Typography>



<Typography>

<b>Trecho:</b>{" "}

{

recomendacao.recomposicao?.trecho ||
"-"
}

</Typography>



<Typography>

<b>Alimentador destino:</b>{" "}

{

recomendacao.recomposicao?.alimentadorDestino ||
"-"
}

</Typography>








<Divider

sx={{

my:2,

bgcolor:"#475569"

}}

/>






<Typography

fontWeight="bold"

>

📋 Análise da decisão

</Typography>






{

justificativas.map(

(item,index)=>(


<Typography

key={index}

sx={{

mt:1,

fontSize:"0.9rem"

}}

>

{item}

</Typography>



)

)

}







<Divider

sx={{

my:2,

bgcolor:"#475569"

}}

/>






<Typography

fontWeight="bold"

>

Sequência recomendada

</Typography>






{

recomendacao.sequencia?.map(

(item,index)=>(


<Typography

key={index}

sx={{mt:1}}

>

{index+1}

{" - "}

{item}

</Typography>



)

)

}



</>



)



:

(



<>



<Chip

label="NÃO RECOMENDADA"

color="error"

sx={{

mb:2,

fontWeight:"bold"

}}

/>







<Typography

sx={{

whiteSpace:"pre-line"

}}

>

{recomendacao.motivo}

</Typography>









{

recomendacao.restricoes?.length > 0 && (



<>



<Divider

sx={{

my:2,

bgcolor:"#475569"

}}

/>





<Typography

fontWeight="bold"

>

🚧 Restrições encontradas

</Typography>






{

recomendacao.restricoes.map(

(item,index)=>(


<Box

key={index}

sx={{

mt:2,

p:2,

borderRadius:2,

bgcolor:"#450a0a"

}}

>



<Typography>

<b>Trecho:</b>{" "}

{item.trecho}

</Typography>



<Typography>

<b>Cabo:</b>{" "}

{item.cabo}

</Typography>



<Typography>

<b>Capacidade:</b>{" "}

{item.capacidade} A

</Typography>



<Typography>

<b>Corrente simulada:</b>{" "}

{item.correnteSimulada} A

</Typography>



<Typography>

<b>Carregamento:</b>{" "}

{item.carregamento}%

</Typography>



<Typography

sx={{mt:1}}

>

❌ {item.mensagem}

</Typography>



</Box>



)

)



}



</>



)

}




</>

)



}



</Box>


)

}





    </Paper>

  );


}


export default OccurrencePanel;