import { useState, useEffect } from "react";

import { Paper, Box } from "@mui/material";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";


import { subestacoes } from "../data/subestacoes";
import { alimentadores } from "../data/alimentadores";
import { equipamentos } from "../data/equipamentos";
import { trechos } from "../data/trechos";


delete L.Icon.Default.prototype._getIconUrl;


L.Icon.Default.mergeOptions({

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

});



function LocalizarMapa({ localizacao }) {

  const map = useMap();


  useEffect(()=>{

    if(!localizacao) return;


    map.flyTo(localizacao,18,{
      animate:true,
      duration:1.5
    });


  },[localizacao,map]);


  return null;

}




function MapView({ ocorrencia, localizacaoMapa }) {


const [trechoSelecionado,setTrechoSelecionado]=useState(null);



const subestacao =
subestacoes.length > 0
?
subestacoes[0]
:
{
 nome:"Subestação",
 coordenadas:[
 -8.0238,
 -34.9781
 ],
 status:"Normal",
 tensao:"13.8 kV"
};





function corTrecho(trecho){


const carregamento =
(trecho.correnteAtual / trecho.capacidade) * 100;



if(
ocorrencia?.alimentador === trecho.alimentador
)

return "#ff0000";



if(
carregamento >= 80
)

return "#ff9800";



return "#00c853";


}






return (

<Paper

elevation={3}

sx={{

height:"100%",

width:"100%",

overflow:"hidden",

borderRadius:3,

bgcolor:"#111d2d"

}}

>


<Box

sx={{

height:"100%",

width:"100%"

}}

>



<MapContainer

center={subestacao.coordenadas}

zoom={14}

style={{

height:"100%",

width:"100%"

}}

>



<LocalizarMapa

localizacao={localizacaoMapa}

/>



<TileLayer

attribution="&copy; OpenStreetMap contributors"

url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

/>





{/* SUBESTAÇÃO */}


<Marker position={subestacao.coordenadas}>


<Popup>

<h3>
{subestacao.nome}
</h3>


<p>
Status: {subestacao.status}
</p>


<p>
Tensão: {subestacao.tensao}
</p>


</Popup>


</Marker>






{/* OCORRÊNCIA */}



{ocorrencia?.localizacao &&

<Marker

position={[

ocorrencia.localizacao.latitude,

ocorrencia.localizacao.longitude

]}

>


<Popup>

<h3>
🚨 Ocorrência Ativa
</h3>


<p>

<strong>
Alimentador:
</strong>

{" "}

{ocorrencia.alimentador}

</p>



<p>

<strong>
Equipamento:
</strong>

{" "}

{ocorrencia.equipamento}

</p>



<p>

<strong>
Clientes:
</strong>

{" "}

{ocorrencia.impacto.clientesAfetados}

</p>



<p>

<strong>
Causa:
</strong>

{" "}

{ocorrencia.causa}

</p>


</Popup>


</Marker>

}







{/* TRECHOS DA REDE */}



{trechos.map((trecho)=>(


<Polyline


key={trecho.id}


positions={trecho.coordenadas}


color={corTrecho(trecho)}


weight={

trechoSelecionado?.id === trecho.id

?

9

:

5

}


opacity={0.9}



eventHandlers={{


click:()=>{

setTrechoSelecionado(trecho)

}


}}



>



<Popup>


<h3>

Trecho {trecho.id}

</h3>


<p>

<strong>
Alimentador:
</strong>

{" "}

{trecho.alimentador}

</p>


<p>

<strong>
Origem:
</strong>

{" "}

{trecho.origem}

</p>



<p>

<strong>
Destino:
</strong>

{" "}

{trecho.destino}

</p>



<hr/>


<p>

<strong>
Cabo:
</strong>

{" "}

{trecho.cabo}

</p>



<p>

<strong>
Capacidade:
</strong>

{" "}

{trecho.capacidade} A

</p>



<p>

<strong>
Corrente:
</strong>

{" "}

{trecho.correnteAtual} A

</p>



<p>


<strong>
Carregamento:
</strong>


{" "}

{

(

trecho.correnteAtual /

trecho.capacidade

)

*

100

}

%

</p>



<p>

<strong>
Clientes:
</strong>

{" "}

{trecho.clientes}

</p>





<hr/>


<strong>
Consumidores prioritários:
</strong>



<ul>

<li>
Hospitais: {trecho.consumidoresPrioritarios.hospitais}
</li>


<li>
Grupo A: {trecho.consumidoresPrioritarios.grupoA}
</li>


<li>
Escolas: {trecho.consumidoresPrioritarios.escolas}
</li>


<li>
Saneamento: {trecho.consumidoresPrioritarios.saneamento}
</li>


</ul>




{

trecho.interligacao &&

<>

<hr/>

<p>

<strong>
Interligação:
</strong>

</p>


<p>

Equipamento:

{" "}

{trecho.equipamentoInterligacao}

</p>


<p>

Destino:

{" "}

{trecho.alimentadorDestino}

</p>


</>

}




</Popup>


</Polyline>


))}








{/* EQUIPAMENTOS */}



{equipamentos.map((equipamento)=>(


<Marker

key={equipamento.id}

position={equipamento.coordenadas}

>


<Popup>


<h3>

{equipamento.nome}

</h3>



<p>

<strong>
Tipo:
</strong>

{" "}

{equipamento.tipo}

</p>




{equipamento.plaqueta &&

<p>

<strong>
Plaqueta:
</strong>

{" "}

{equipamento.plaqueta}

</p>

}




{equipamento.pt &&

<p>

<strong>
PT:
</strong>

{" "}

{equipamento.pt}

</p>

}




<p>

<strong>
Alimentador:
</strong>

{" "}

{equipamento.alimentador}

</p>



<p>

<strong>
Status:
</strong>

{" "}

{equipamento.status}

</p>



{

equipamento.interligacao &&

<>

<hr/>


<p>

<strong>
Interligação
</strong>

</p>


<p>

{equipamento.alimentador}

</p>


↓

<p>

{equipamento.alimentadorDestino}

</p>


</>

}




</Popup>


</Marker>


))}




</MapContainer>



</Box>


</Paper>


);

}



export default MapView;