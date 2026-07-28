import {
  Paper,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  Button,
} from "@mui/material";


import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocationOnIcon from "@mui/icons-material/LocationOn";


import ManobraForm from "./ManobraForm";





function Item({titulo, valor, destaque}) {


  return (

    <Box

      sx={{

        display:"flex",

        justifyContent:"space-between",

        gap:2,

        py:0.7

      }}

    >

      <Typography

        sx={{

          color:"#94a3b8",

          fontSize:14

        }}

      >

        {titulo}

      </Typography>



      <Typography

        fontWeight="bold"

        sx={{

          color:destaque ? "#fff" : "#e2e8f0",

          textAlign:"right"

        }}

      >

        {valor}

      </Typography>


    </Box>

  );

}









function OccurrencePanel({ocorrencia, onLocalizar}) {



if(!ocorrencia){

return null;

}






return(



<Paper

elevation={3}

sx={{

height:"100%",

minHeight:0,

p:2,

bgcolor:"#111d2d",

color:"#fff",

borderRadius:3,

display:"flex",

flexDirection:"column",

overflow:"hidden"

}}

>







<Stack

direction="row"

justifyContent="space-between"

alignItems="center"

mb={2}

>



<Typography

variant="h6"

fontWeight="bold"

>

🚨 Ocorrência Ativa

</Typography>





<Chip

color="error"

label={`Prioridade ${ocorrencia.prioridade}`}

size="small"

/>



</Stack>









<Box

sx={{

flex:1,

minHeight:0,

overflowY:"auto",

pr:1

}}

>









<Typography

variant="subtitle2"

sx={{

color:"#38bdf8",

mb:1

}}

>

LOCALIZAÇÃO

</Typography>








<Item

titulo="Subestação"

valor={ocorrencia.subestacao}

/>





<Item

titulo="Alimentador"

valor={ocorrencia.alimentador}

/>





<Item

titulo="Equipamento"

valor={ocorrencia.equipamento}

/>





<Item

titulo="Horário"

valor={ocorrencia.horario}

/>









<Chip

icon={<WarningAmberIcon/>}

label={ocorrencia.status}

color="error"

sx={{

mt:2,

mb:2,

fontWeight:"bold"

}}

/>









<Divider

sx={{

bgcolor:"#2b3b52"

}}

/>











<Typography

variant="subtitle2"

sx={{

color:"#38bdf8",

mt:2,

mb:1

}}

>

IMPACTO

</Typography>











<Item

titulo="Clientes interrompidos"

valor={

ocorrencia.impacto.clientesAfetados.toLocaleString("pt-BR")

}

/>








<Item

titulo="Hospitais"

valor={ocorrencia.impacto.hospitais}

destaque

/>








<Item

titulo="Escolas"

valor={ocorrencia.impacto.escolas}

/>








<Item

titulo="DEC estimado"

valor={ocorrencia.impacto.decEstimado}

/>













<Divider

sx={{

bgcolor:"#2b3b52",

my:2

}}

/>












<Typography

variant="subtitle2"

sx={{

color:"#38bdf8",

mb:1

}}

>

ANÁLISE DE MANOBRA

</Typography>











<ManobraForm

ocorrencia={ocorrencia}

/>









<Divider

sx={{

bgcolor:"#2b3b52",

my:2

}}

 />







<Typography

variant="subtitle2"

sx={{

color:"#38bdf8",

mb:1

}}

>

CAMPO

</Typography>










<Item

titulo="Equipe"

valor={ocorrencia.equipeCampo.equipe}

/>








<Item

titulo="Status"

valor={ocorrencia.equipeCampo.status}

/>








<Item

titulo="Chegada estimada"

valor={ocorrencia.equipeCampo.tempoChegada}

/>








</Box>












<Box

sx={{

display:"flex",

gap:1,

pt:2,

flexShrink:0

}}

>










<Button

variant="contained"

startIcon={<LocationOnIcon/>}

fullWidth

onClick={()=>{


if(onLocalizar){


const coordenada = ocorrencia.coordenadas

?

ocorrencia.coordenadas

:

[

ocorrencia.localizacao.latitude,

ocorrencia.localizacao.longitude

];



onLocalizar(coordenada);


}


}}

>

Localizar

</Button>









</Box>









</Paper>


);


}





export default OccurrencePanel;