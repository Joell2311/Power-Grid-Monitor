import {
  Paper,
  Typography,
  Stack,
  Chip,
  Box,
} from "@mui/material";


import WarningAmberIcon from "@mui/icons-material/WarningAmber";



function OccurrenceSelector({

  ocorrencias,

  selecionada,

  onSelect

}) {



  function corPrioridade(prioridade){


    if(prioridade === "CRÍTICA"){
      return "error";
    }


    if(prioridade === "ALTA"){
      return "warning";
    }


    return "info";

  }




return (

<Paper

elevation={3}

sx={{

p:2,

bgcolor:"#111d2d",

color:"#fff",

borderRadius:3,

height:"100%"

}}

>


<Typography

variant="h6"

fontWeight="bold"

sx={{

mb:2

}}

>

🚨 Ocorrências Ativas

</Typography>





<Stack

spacing={1.5}

>


{

ocorrencias.map((item)=>(


<Box

key={item.id}

onClick={()=>onSelect(item)}

sx={{

cursor:"pointer",

p:1.5,

borderRadius:2,


backgroundColor:

selecionada?.id === item.id

?

"#1e3a5f"

:

"#0f1b2a",



border:

selecionada?.id === item.id

?

"1px solid #38bdf8"

:

"1px solid transparent",



"&:hover":{

backgroundColor:"#162b43"

}


}}

>



<Stack

direction="row"

justifyContent="space-between"

alignItems="center"

spacing={1}

>


<Box>


<Typography

fontWeight="bold"

>

{item.alimentador}

</Typography>



<Typography

variant="body2"

sx={{

color:"#94a3b8"

}}

>

{item.impacto.clientesAfetados.toLocaleString("pt-BR")}

{" "}clientes afetados

</Typography>


</Box>





<Chip

icon={<WarningAmberIcon/>}

label={item.prioridade}

size="small"

color={corPrioridade(item.prioridade)}

/>



</Stack>




</Box>


))


}



</Stack>



</Paper>


);


}



export default OccurrenceSelector;