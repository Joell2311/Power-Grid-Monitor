import { useState } from "react";

import {
  Paper,
  Typography,
  Box,
  Divider,
  TextField,
  Button,
  Stack,
  Chip,
} from "@mui/material";


import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalculateIcon from "@mui/icons-material/Calculate";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";



function EventPanel(){


const [correnteAtual,setCorrenteAtual] = useState("");

const [correnteTrecho,setCorrenteTrecho] = useState("");

const [resultado,setResultado] = useState(null);



const capacidade = 350;



function calcularManobra(){


const total =
Number(correnteAtual || 0) +
Number(correnteTrecho || 0);



const percentual =
Math.round((total / capacidade) * 100);



setResultado({

corrente: total,

percentual,

permitida: percentual <= 80

});


}





return(


<Paper

elevation={3}

sx={{

height:"100%",

p:2,

bgcolor:"#111d2d",

color:"#fff",

borderRadius:3,

display:"flex",

flexDirection:"column",

overflow:"hidden"

}}

>



<Typography
variant="h6"
fontWeight="bold"
>

⚠️ Análise da Ocorrência

</Typography>



<Divider
sx={{
bgcolor:"#2b3b52",
my:2
}}
/>





<Stack
direction="row"
spacing={2}
>

<Chip

color="error"

icon={<WarningAmberIcon/>}

label="Alimentador Desligado"

/>



<Chip

color="info"

label="13,8 kV"

/>


</Stack>





<Box sx={{my:2}}>

<Typography>
<strong>Alimentador:</strong> CMG-01C4
</Typography>


<Typography>
<strong>Subestação:</strong> Camaragibe
</Typography>


</Box>





<Divider
sx={{
bgcolor:"#2b3b52"
}}
/>






<Typography

variant="subtitle1"

fontWeight="bold"

sx={{mt:2}}

>

Clientes Afetados

</Typography>


<Typography>
👥 Total: 3567 clientes
</Typography>


<Typography>
🏥 Hospital: 1
</Typography>


<Typography>
🏢 Grupo A: analisar
</Typography>






<Divider

sx={{

bgcolor:"#2b3b52",

my:2

}}

/>






<Typography

variant="subtitle1"

fontWeight="bold"

>

Medições do Operador

</Typography>




<Stack spacing={2} mt={2}>


<TextField

label="Corrente desligada (A)"

type="number"

value={correnteAtual}

onChange={(e)=>setCorrenteAtual(e.target.value)}

fullWidth

InputLabelProps={{
shrink:true
}}


/>


<TextField

label="Corrente trecho destino (A)"

type="number"

value={correnteTrecho}

onChange={(e)=>setCorrenteTrecho(e.target.value)}

fullWidth

InputLabelProps={{
shrink:true
}}


/>


</Stack>






<Divider

sx={{

bgcolor:"#2b3b52",

my:2

}}








/>





<Typography

variant="subtitle1"

fontWeight="bold"

>

💡 Resultado da Manobra

</Typography>





<Box sx={{mt:2}}>


<Typography>
Capacidade do trecho: <strong>{capacidade} A</strong>
</Typography>




{resultado && (

<>


<Typography>

Corrente após manobra:
<strong> {resultado.corrente} A</strong>

</Typography>



<Typography>

Utilização:
<strong> {resultado.percentual}%</strong>

</Typography>



<Chip

sx={{mt:2}}

color={
resultado.permitida
?"success"
:"error"
}

label={
resultado.permitida
?
"MANOBRA PERMITIDA"
:
"EXCEDE LIMITE OPERACIONAL"
}


/>


</>

)}



</Box>





<Button

variant="contained"

color="warning"

startIcon={<CalculateIcon/>}

endIcon={<ElectricBoltIcon/>}

size="large"

sx={{

mt:"auto"

}}

onClick={calcularManobra}

>

Calcular Capacidade do Trecho

</Button>






</Paper>


);


}


export default EventPanel;