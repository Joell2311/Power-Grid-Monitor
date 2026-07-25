import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { subestacoes } from "../data/subestacoes";
import { alimentadores } from "../data/alimentadores";
import { equipamentos } from "../data/equipamentos";

// Corrige os ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapView() {
  const [alimentadorSelecionado, setAlimentadorSelecionado] = useState(null);

  const subestacao =
    subestacoes.length > 0
      ? subestacoes[0]
      : {
          nome: "Subestação",
          coordenadas: [-8.0238, -34.9781],
          status: "Normal",
          tensao: "13.8 kV",
          alimentadores: 6,
          bancoCapacitores: 2,
        };

  return (
    <MapContainer
      center={subestacao.coordenadas}
      zoom={14}
      style={{
        height: "100vh",
        width: "100%",
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors & CARTO"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* ================= SUBESTAÇÃO ================= */}

      <Marker position={subestacao.coordenadas}>
        <Popup>
          <div>
            <h3>{subestacao.nome}</h3>

            <p>
              <strong>Status:</strong> {subestacao.status}
            </p>

            <p>
              <strong>Tensão:</strong> {subestacao.tensao}
            </p>

            <p>
              <strong>Alimentadores:</strong> {subestacao.alimentadores}
            </p>

            <p>
              <strong>Banco de Capacitores:</strong>{" "}
              {subestacao.bancoCapacitores}
            </p>
          </div>
        </Popup>
      </Marker>

      {/* ================= ALIMENTADORES ================= */}

      {alimentadores.map((alimentador) => (
        <Polyline
          key={alimentador.id}
          positions={alimentador.coordenadas}
          color={
            alimentador.status === "Desligado"
              ? "#ff0000"
              : alimentador.status === "Alarme"
              ? "#ff9800"
              : "#00c853"
          }
          weight={
            alimentadorSelecionado?.id === alimentador.id ? 8 : 5
          }
          opacity={
            alimentadorSelecionado?.id === alimentador.id ? 1 : 0.7
          }
          eventHandlers={{
            click: () => setAlimentadorSelecionado(alimentador),
          }}
        >
          <Popup>
            <div>
              <h3>{alimentador.nome}</h3>

              <p>
                <strong>Status:</strong> {alimentador.status}
              </p>

              <p>
                <strong>Clientes:</strong> {alimentador.clientes}
              </p>

              <p>
                <strong>Religadores:</strong> {alimentador.religadores}
              </p>

              <p>
                <strong>Transformadores:</strong>{" "}
                {alimentador.transformadores}
              </p>

              <p>
                <strong>Tensão:</strong> {alimentador.tensao}
              </p>
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* ================= EQUIPAMENTOS ================= */}

      {equipamentos.map((equipamento) => (
        <Marker
          key={equipamento.id}
          position={equipamento.coordenadas}
        >
          <Popup>
            <div>
              <h3>{equipamento.nome}</h3>

              <p>
                <strong>Tipo:</strong> {equipamento.tipo}
              </p>

              <p>
                <strong>Status:</strong> {equipamento.status}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ================= MARCADOR DO ALIMENTADOR SELECIONADO ================= */}

      {alimentadorSelecionado && (
        <Marker position={alimentadorSelecionado.coordenadas[0]}>
          <Popup>
            <div>
              <h3>{alimentadorSelecionado.nome}</h3>

              <p>
                <strong>Status:</strong> {alimentadorSelecionado.status}
              </p>

              <p>
                <strong>Clientes:</strong>{" "}
                {alimentadorSelecionado.clientes}
              </p>

              <p>
                <strong>Religadores:</strong>{" "}
                {alimentadorSelecionado.religadores}
              </p>

              <p>
                <strong>Transformadores:</strong>{" "}
                {alimentadorSelecionado.transformadores}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

export default MapView;