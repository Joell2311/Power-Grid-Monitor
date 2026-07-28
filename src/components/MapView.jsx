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

  useEffect(() => {
    if (!localizacao) return;

    map.flyTo(localizacao, 18, {
      animate: true,
      duration: 1.5,
    });
  }, [localizacao, map]);

  return null;
}

function MapView({ ocorrencia, localizacaoMapa }) {
  const [alimentadorSelecionado, setAlimentadorSelecionado] =
    useState(null);

  const subestacao =
    subestacoes.length > 0
      ? subestacoes[0]
      : {
          nome: "Subestação",
          coordenadas: [-8.0238, -34.9781],
          status: "Normal",
          tensao: "13.8 kV",
        };

  return (
    <Paper
      elevation={3}
      sx={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        bgcolor: "#111d2d",
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: "100%",
        }}
      >
        <MapContainer
          center={subestacao.coordenadas}
          zoom={14}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <LocalizarMapa localizacao={localizacaoMapa} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* SUBESTAÇÃO */}

          <Marker position={subestacao.coordenadas}>
            <Popup>
              <h3>{subestacao.nome}</h3>

              <p>Status: {subestacao.status}</p>

              <p>Tensão: {subestacao.tensao}</p>
            </Popup>
          </Marker>

          {/* OCORRÊNCIA */}

          {ocorrencia?.localizacao && (
            <Marker
              position={[
                ocorrencia.localizacao.latitude,
                ocorrencia.localizacao.longitude,
              ]}
            >
              <Popup>
                <h3>🚨 Ocorrência Ativa</h3>

                <p>
                  <strong>Alimentador:</strong>{" "}
                  {ocorrencia.alimentador}
                </p>

                <p>
                  <strong>Equipamento:</strong>{" "}
                  {ocorrencia.equipamento}
                </p>

                <p>
                  <strong>Clientes:</strong>{" "}
                  {ocorrencia.impacto.clientesAfetados}
                </p>

                <p>
                  <strong>Causa:</strong>{" "}
                  {ocorrencia.causa}
                </p>
              </Popup>
            </Marker>
          )}

          {/* ALIMENTADORES */}

          {alimentadores.map((alimentador) => (
            <Polyline
              key={alimentador.id}
              positions={alimentador.coordenadas}
              color={
                ocorrencia?.alimentador === alimentador.nome
                  ? "#ff0000"
                  : ocorrencia?.manobra?.alternativa === alimentador.nome
                  ? "#ff9800"
                  : "#00c853"
              }
              weight={
                ocorrencia?.alimentador === alimentador.nome
                  ? 8
                  : ocorrencia?.manobra?.alternativa === alimentador.nome
                  ? 7
                  : alimentadorSelecionado?.id === alimentador.id
                  ? 8
                  : 5
              }
              opacity={0.8}
              eventHandlers={{
                click: () => setAlimentadorSelecionado(alimentador),
              }}
            >
              <Popup>
                <h3>{alimentador.nome}</h3>

                <p>Status: {alimentador.status}</p>

                <p>Clientes: {alimentador.clientes}</p>
              </Popup>
            </Polyline>
          ))}
                    {/* EQUIPAMENTOS */}

          {equipamentos.map((equipamento) => (
            <Marker
              key={equipamento.id}
              position={equipamento.coordenadas}
            >
              <Popup>
                <h3>{equipamento.nome}</h3>

                <p>
                  <strong>Tipo:</strong> {equipamento.tipo}
                </p>

                {equipamento.plaqueta && (
                  <p>
                    <strong>Plaqueta:</strong> {equipamento.plaqueta}
                  </p>
                )}

                {equipamento.pt && (
                  <p>
                    <strong>PT:</strong> {equipamento.pt}
                  </p>
                )}

                <p>
                  <strong>Alimentador:</strong>{" "}
                  {equipamento.alimentador}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {equipamento.status}
                </p>

                {equipamento.interligacao && (
                  <>
                    <hr />

                    <p>
                      <strong>Interligação:</strong>
                    </p>

                    <p>
                      {equipamento.alimentador}
                    </p>

                    <p>↓</p>

                    <p>
                      {equipamento.alimentadorDestino}
                    </p>
                  </>
                )}
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </Box>
    </Paper>
  );
}

export default MapView;