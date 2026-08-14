import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import SubestacoesRepository from "../core/repositories/subestacoesRepository";
import TrechosRepository from "../core/repositories/trechosRepository";
import EquipamentosRepository from "../core/repositories/equipamentosRepository";
import useCoiStore from "../core/store/coiStore";

import CamadaBDGD from "./mapa/CamadaBDGD";


const iconeSubestacao = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconeEquipamento = new L.DivIcon({
  html: `
    <div
      style="
        width:14px;
        height:14px;
        background:#ff9800;
        border:2px solid white;
        border-radius:50%;
      "
    ></div>
  `,
  className: "",
  iconSize: [14, 14],
});

function corTrecho(trecho, estadosStore) {
  const estadoAtual = estadosStore[trecho.id] || trecho.estadoRede;

  if (estadoAtual === "DESLIGADO") return "#f44336"; // Vermelho
  if (estadoAtual === "MANOBRA") return "#ff1744";     // Laranja
  if (trecho.interligacao) return "#1976d2";         // Azul
  return "#4caf50";                                  // Verde (Normal)
}

function espessuraTrecho(trecho) {
  const estadoAtual = useCoiStore.getState().trechosEstado[trecho.id];
  if (estadoAtual === "MANOBRA") return 7;           // <--- LINHA BEM GROSSA PARA DESTACAR
  if (trecho.interligacao) return 6;
  if (trecho.telecomandado) return 5;
  return 3;
}

// Controlador do mapa com validação estrita de números
function MapController() {
  const map = useMap();
  const { coordenadasMapa, zoomMapa } = useCoiStore();

  useEffect(() => {
    if (coordenadasMapa && Array.isArray(coordenadasMapa) && coordenadasMapa.length >= 2) {
      const lat = Number(coordenadasMapa[0]);
      const lng = Number(coordenadasMapa[1]);

      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        map.setView([lat, lng], zoomMapa, {
          animate: true,
          duration: 1.0
        });
      }
    }
  }, [coordenadasMapa, zoomMapa, map]);

  return null;
}

function MapView() {

    const subestacoes =
        SubestacoesRepository.listar();

    const trechos =
        TrechosRepository.listar();

    const equipamentos =
        EquipamentosRepository.listar();

    const se = subestacoes[0];

    const { trechosEstado } = useCoiStore();     
       
// LOG DE INSPEÇÃO
   console.log(
        "🗺️ Renderizando mapa.",
        "Subestações:",
        subestacoes,
        "Trechos:",
        trechos,
        "Equipamentos:",
        equipamentos,
        "Estado dos trechos:",
        trechosEstado
    );
  if (!se) return null;

  const centroInicial = [se.localizacao.latitude, se.localizacao.longitude];

  return (
    <MapContainer
      center={centroInicial}
      zoom={15}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <MapController />

      <TileLayer
        attribution="© OpenStreetMap"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* SUBESTAÇÃO */}
      <Marker position={centroInicial} icon={iconeSubestacao}>
        <Popup>
          <strong>{se.nome}</strong>
          <br />
          {se.sigla}
          <br />
          {se.tensao.secundaria} {se.tensao.unidade}
        </Popup>
      </Marker>

{/* TRECHOS */}
      {trechos.map((trecho) => {
        const estadoAtual = trechosEstado[trecho.id] || trecho.estadoRede;

        return (
          <Polyline
            key={`${trecho.id}-${estadoAtual}`} // <--- FORÇA O RE-RENDER DO LEAFLET QUANDO O ESTADO MUDA
            positions={trecho.coordenadas}
            pathOptions={{
              color: corTrecho(trecho, trechosEstado),
              weight: espessuraTrecho(trecho),
            }}
          >
            <Popup>
              <strong>{trecho.id}</strong>
              <br />
              Alimentador: {trecho.alimentador}
              <br />
              Clientes: {trecho.clientes}
              <br />
              Estado: {estadoAtual}
            </Popup>
          </Polyline>
        );
      })}
      
      
      {/* EQUIPAMENTOS */}
      {equipamentos.map((equipamento) => {
        if (!equipamento.localizacao?.latitude || !equipamento.localizacao?.longitude) {
          return null;
        }

        return (
          <Marker
            key={equipamento.id}
            position={[equipamento.localizacao.latitude, equipamento.localizacao.longitude]}
            icon={iconeEquipamento}
          >
            <Popup>
              <strong>{equipamento.plaqueta}</strong>
              <br />
              {equipamento.nome}
            </Popup>
          </Marker>
        );
      })}
      <CamadaBDGD />
    </MapContainer>
  );
}

export default MapView;