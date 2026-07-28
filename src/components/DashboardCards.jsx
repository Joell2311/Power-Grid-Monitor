import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";


import PlaceIcon from "@mui/icons-material/Place";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ScheduleIcon from "@mui/icons-material/Schedule";


const cards = [

  {
    valor:"120",
    titulo:"Pontos Monitorados",
    detalhe:"Rede elétrica supervisionada",
    icone:<PlaceIcon />,
    cor:"#2196f3",
  },


  {
    valor:"04",
    titulo:"Ocorrências Ativas",
    detalhe:"02 críticas",
    icone:<WarningAmberIcon />,
    cor:"#ef4444",
  },


  {
    valor:"08",
    titulo:"Equipes em Campo",
    detalhe:"Atendimento operacional",
    icone:<EngineeringIcon />,
    cor:"#22c55e",
  },


  {
    valor:"05 min",
    titulo:"Tempo Médio",
    detalhe:"Normalização DEC",
    icone:<ScheduleIcon />,
    cor:"#f59e0b",
  },


];



function DashboardCards(){

return (

<Grid
container
spacing={2}
>


{cards.map((card)=>(


<Grid
item
xs={12}
sm={6}
lg={3}
key={card.titulo}
>


<Card

sx={{

background:"#111d2d",

color:"#fff",

border:"1px solid #24364d",

borderRadius:3,

height:120,

transition:"0.25s",


"&:hover":{

borderColor:card.cor,

boxShadow:`0 0 20px ${card.cor}55`,

transform:"translateY(-3px)"

}

}}

>


<CardContent

sx={{

height:"100%",

display:"flex",

alignItems:"center",

justifyContent:"space-between"

}}

>


<Box>


<Typography

variant="body2"

sx={{

color:"#94a3b8"

}}

>

{card.titulo}

</Typography>



<Typography

variant="h3"

fontWeight="bold"

sx={{

mt:0.5

}}

>

{card.valor}

</Typography>



<Typography

variant="caption"

sx={{

color:"#64748b"

}}

>

{card.detalhe}

</Typography>


</Box>





<Box

sx={{

color:card.cor,

fontSize:45,

display:"flex"

}}

>

{card.icone}

</Box>



</CardContent>


</Card>


</Grid>


))}


</Grid>


);


}


export default DashboardCards;