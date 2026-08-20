import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import SubestacoesRepository from "../core/repositories/subestacoesRepository";
import TrechosRepository from "../core/repositories/trechosRepository";
import EquipamentosRepository from "../core/repositories/equipamentosRepository";
import useCoiStore from "../core/store/coiStore";

import CamadaBDGD from "./mapa/CamadaBDGD";

// ==========================================================
// ÍCONE DA SUBESTAÇÃO
// ==========================================================

const iconeSubestacao = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ==========================================================
// ÍCONE DOS EQUIPAMENTOS
// ==========================================================

const iconeEquipamento = new L.DivIcon({
  html: `
    <div
      style="
        width:14px;
        height:14px;
        background:#ff9800;
        border:2px solid white;
        border-radius:50%;
        box-shadow:0 1px 4px rgba(0,0,0,0.45);
      "
    ></div>
  `,

  className: "",
  iconSize: [14, 14],
});

// ==========================================================
// COR DOS TRECHOS
// ==========================================================

function corTrecho(trecho, estadosStore) {
  const estadoAtual =
    estadosStore[trecho.id] ||
    trecho.estadoRede;

  if (estadoAtual === "DESLIGADO") {
    return "#f44336";
  }

  if (estadoAtual === "MANOBRA") {
    return "#ff1744";
  }

  if (trecho.interligacao) {
    return "#1976d2";
  }

  return "#4caf50";
}

// ==========================================================
// ESPESSURA DOS TRECHOS
// ==========================================================

function espessuraTrecho(
  trecho,
  estadosStore
) {
  const estadoAtual =
    estadosStore[trecho.id] ||
    trecho.estadoRede;

  if (estadoAtual === "MANOBRA") {
    return 7;
  }

  if (trecho.interligacao) {
    return 6;
  }

  if (trecho.telecomandado) {
    return 5;
  }

  return 3;
}

// ==========================================================
// CONTROLADOR DO MAPA
// ==========================================================

function MapController() {
  const map = useMap();

  const {
    coordenadasMapa,
    zoomMapa,
  } = useCoiStore();

  useEffect(() => {
    if (
      coordenadasMapa &&
      Array.isArray(coordenadasMapa) &&
      coordenadasMapa.length >= 2
    ) {
      const lat = Number(
        coordenadasMapa[0]
      );

      const lng = Number(
        coordenadasMapa[1]
      );

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        map.setView(
          [lat, lng],
          zoomMapa,
          {
            animate: true,
            duration: 1,
          }
        );
      }
    }
  }, [
    coordenadasMapa,
    zoomMapa,
    map,
  ]);

  return null;
}

// ==========================================================
// BOTÃO INDIVIDUAL DE CAMADA
// ==========================================================

function BotaoCamada({
  ativo,
  onClick,
  icone,
  titulo,
  descricao,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",

        background: ativo
          ? "rgba(33,150,243,0.12)"
          : "transparent",

        color: ativo
          ? "#1976d2"
          : "#455a64",

        padding: "9px 10px",

        display: "flex",
        alignItems: "center",

        gap: "9px",

        cursor: "pointer",

        borderRadius: "8px",

        textAlign: "left",

        marginBottom: "3px",

        transition:
          "background 0.15s ease",
      }}
    >
      <span
        style={{
          width: "22px",
          minWidth: "22px",

          textAlign: "center",

          fontSize: "16px",
        }}
      >
        {icone}
      </span>

      <span
        style={{
          flex: 1,

          display: "flex",
          flexDirection: "column",

          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,

            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {titulo}
        </span>

        {descricao && (
          <span
            style={{
              fontSize: "10px",

              color: "#78909c",

              marginTop: "2px",

              lineHeight: 1.2,
            }}
          >
            {descricao}
          </span>
        )}
      </span>

      <span
        style={{
          width: "8px",
          height: "8px",

          minWidth: "8px",

          borderRadius: "50%",

          background: ativo
            ? "#2196f3"
            : "#cfd8dc",
        }}
      />
    </button>
  );
}

// ==========================================================
// PAINEL DE CAMADAS
// ==========================================================

function PainelCamadas({
  camadas,
  alterarCamada,
  aberto,
  fechar,
}) {
  if (!aberto) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",

        top: "14px",
        left: "14px",

        width: "290px",

        maxWidth:
          "calc(100% - 28px)",

        maxHeight:
          "calc(100% - 95px)",

        overflowY: "auto",

        background:
          "rgba(255,255,255,0.97)",

        backdropFilter:
          "blur(10px)",

        borderRadius: "14px",

        boxShadow:
          "0 8px 30px rgba(0,0,0,0.25)",

        zIndex: 1000,

        padding: "14px",

        boxSizing: "border-box",
      }}
    >
      {/* CABEÇALHO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",

          gap: "10px",

          marginBottom: "14px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",

            borderRadius: "10px",

            background: "#1976d2",

            color: "white",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            fontSize: "19px",

            flexShrink: 0,
          }}
        >
          ⚡
        </div>

        <div
          style={{
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#263238",
            }}
          >
            Camadas do mapa
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#78909c",
            }}
          >
            Visualização operacional
          </div>
        </div>

        <button
          type="button"
          onClick={fechar}
          title="Fechar camadas"
          style={{
            width: "32px",
            height: "32px",

            border: "none",

            borderRadius: "8px",

            background: "#eceff1",

            color: "#455a64",

            cursor: "pointer",

            fontSize: "18px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* CAMADAS */}

      <div
        style={{
          fontSize: "11px",

          fontWeight: 700,

          color: "#78909c",

          letterSpacing: "0.8px",

          marginBottom: "7px",
        }}
      >
        CAMADAS
      </div>

      <BotaoCamada
        ativo={camadas.redeMT}
        onClick={() =>
          alterarCamada("redeMT")
        }
        icone="〰️"
        titulo="Rede MT"
        descricao="Trechos da rede de média tensão"
      />

      <BotaoCamada
        ativo={camadas.subestacoes}
        onClick={() =>
          alterarCamada("subestacoes")
        }
        icone="🏭"
        titulo="Subestações"
        descricao="Subestações da rede"
      />

      <BotaoCamada
        ativo={camadas.equipamentos}
        onClick={() =>
          alterarCamada("equipamentos")
        }
        icone="⚙️"
        titulo="Equipamentos"
        descricao="Equipamentos operacionais"
      />

      {/* SUBCAMADAS */}

      {camadas.equipamentos && (
        <div
          style={{
            marginLeft: "25px",

            marginTop: "2px",

            marginBottom: "8px",

            borderLeft:
              "1px solid #e0e0e0",

            paddingLeft: "7px",
          }}
        >
          <BotaoCamada
            ativo={camadas.religadores}
            onClick={() =>
              alterarCamada(
                "religadores"
              )
            }
            icone="🔴"
            titulo="Religadores"
          />

          <BotaoCamada
            ativo={camadas.chaves}
            onClick={() =>
              alterarCamada("chaves")
            }
            icone="🔀"
            titulo="Chaves"
          />

          <BotaoCamada
            ativo={camadas.reguladores}
            onClick={() =>
              alterarCamada(
                "reguladores"
              )
            }
            icone="📐"
            titulo="Reguladores"
          />

          <BotaoCamada
            ativo={camadas.capacitores}
            onClick={() =>
              alterarCamada(
                "capacitores"
              )
            }
            icone="⚡"
            titulo="Capacitores"
          />
        </div>
      )}

      <BotaoCamada
        ativo={camadas.pontos}
        onClick={() =>
          alterarCamada("pontos")
        }
        icone="📍"
        titulo="Pontos BDGD"
        descricao="Pontos de conexão da BDGD"
      />

      <BotaoCamada
        ativo={camadas.terminais}
        onClick={() =>
          alterarCamada("terminais")
        }
        icone="🔵"
        titulo="Terminais"
        descricao="Extremidades da rede"
      />

      <BotaoCamada
        ativo={camadas.derivacoes}
        onClick={() =>
          alterarCamada("derivacoes")
        }
        icone="🔀"
        titulo="Derivações"
        descricao="Pontos com múltiplas conexões"
      />

      {/* SEPARADOR */}

      <div
        style={{
          height: "1px",

          background: "#eceff1",

          margin: "12px 0",
        }}
      />

      {/* ANÁLISES */}

      <div
        style={{
          fontSize: "11px",

          fontWeight: 700,

          color: "#78909c",

          letterSpacing: "0.8px",

          marginBottom: "7px",
        }}
      >
        ANÁLISES
      </div>

      <BotaoCamada
        ativo={camadas.redeMontante}
        onClick={() =>
          alterarCamada(
            "redeMontante"
          )
        }
        icone="⬆️"
        titulo="Rede a montante"
        descricao="Rede em direção à subestação"
      />

      <BotaoCamada
        ativo={camadas.redeJusante}
        onClick={() =>
          alterarCamada(
            "redeJusante"
          )
        }
        icone="⬇️"
        titulo="Rede a jusante"
        descricao="Rede após o ponto selecionado"
      />

      <BotaoCamada
        ativo={camadas.caminhoEletrico}
        onClick={() =>
          alterarCamada(
            "caminhoEletrico"
          )
        }
        icone="🧭"
        titulo="Caminho elétrico"
        descricao="Caminho entre dois pontos"
      />

      <BotaoCamada
        ativo={camadas.redeConectada}
        onClick={() =>
          alterarCamada(
            "redeConectada"
          )
        }
        icone="🔗"
        titulo="Rede conectada"
        descricao="Toda rede conectada ao ponto"
      />
    </div>
  );
}

// ==========================================================
// BOTÃO FLUTUANTE
// ==========================================================

function BotaoAbrirCamadas({
  aberto,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        aberto
          ? "Fechar camadas"
          : "Abrir camadas"
      }
      style={{
        position: "absolute",

        top: "78px",
        left: "14px",

        width: "46px",
        height: "46px",

        border: "none",

        borderRadius: "12px",

        background: "#ffffff",

        color: "#1976d2",

        boxShadow:
          "0 4px 16px rgba(0,0,0,0.22)",

        cursor: "pointer",

        zIndex: 1100,

        display: aberto
          ? "none"
          : "flex",

        alignItems: "center",
        justifyContent: "center",

        fontSize: "22px",
      }}
    >
      ☰
    </button>
  );
}

// ==========================================================
// BARRA DE INFORMAÇÕES
// ==========================================================

function BarraInformacoes({
  subestacao,
  quantidadeTrechos,
  quantidadeEquipamentos,
}) {
  return (
    <div
      style={{
        position: "absolute",

        bottom: "14px",
        left: "14px",
        right: "14px",

        minHeight: "52px",

        background:
          "rgba(255,255,255,0.95)",

        backdropFilter:
          "blur(8px)",

        borderRadius: "12px",

        boxShadow:
          "0 5px 20px rgba(0,0,0,0.18)",

        zIndex: 1000,

        display: "flex",

        alignItems: "center",

        padding: "8px 16px",

        gap: "26px",

        boxSizing: "border-box",

        overflow: "hidden",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "10px",
            color: "#78909c",
            textTransform: "uppercase",
          }}
        >
          Subestação
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#263238",
          }}
        >
          {subestacao?.sigla ||
            subestacao?.nome ||
            "-"}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "10px",
            color: "#78909c",
            textTransform: "uppercase",
          }}
        >
          Alimentador
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#263238",
          }}
        >
          CMG01C4
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "10px",
            color: "#78909c",
            textTransform: "uppercase",
          }}
        >
          Circuito
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#263238",
          }}
        >
          154
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "10px",
            color: "#78909c",
            textTransform: "uppercase",
          }}
        >
          Trechos
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#263238",
          }}
        >
          {quantidadeTrechos}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "10px",
            color: "#78909c",
            textTransform: "uppercase",
          }}
        >
          Equipamentos
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#263238",
          }}
        >
          {quantidadeEquipamentos}
        </div>
      </div>

      <div
        style={{
          marginLeft: "auto",

          display: "flex",
          alignItems: "center",

          gap: "7px",

          padding: "7px 12px",

          borderRadius: "20px",

          background:
            "rgba(76,175,80,0.12)",

          color: "#2e7d32",

          fontSize: "11px",

          fontWeight: 700,

          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",

            background: "#4caf50",

            borderRadius: "50%",
          }}
        />

        REDE OPERACIONAL
      </div>
    </div>
  );
}

// ==========================================================
// MAP VIEW
// ==========================================================

function MapView() {

  // ========================================================
  // DADOS
  // ========================================================

  const subestacoes =
    SubestacoesRepository.listar();

  const trechos =
    TrechosRepository.listar();

  const equipamentos =
    EquipamentosRepository.listar();

  const se =
    subestacoes[0];

  const {
    trechosEstado,
  } = useCoiStore();

  // ========================================================
  // PAINEL
  // ========================================================

  const [
    painelCamadasAberto,
    setPainelCamadasAberto,
  ] = useState(false);

  // ========================================================
  // CAMADAS
  // ========================================================

  const [
    camadas,
    setCamadas,
  ] = useState({

    // REDE
    redeMT: true,

    subestacoes: true,

    equipamentos: true,

    pontos: false,

    terminais: false,

    derivacoes: false,

    // EQUIPAMENTOS
    religadores: true,

    chaves: false,

    reguladores: false,

    capacitores: false,

    // ANÁLISES
    redeMontante: false,

    redeJusante: false,

    caminhoEletrico: false,

    redeConectada: false,
  });

  // ========================================================
  // ALTERAR CAMADA
  // ========================================================

  function alterarCamada(nome) {
    setCamadas(
      (estadoAnterior) => ({
        ...estadoAnterior,

        [nome]:
          !estadoAnterior[nome],
      })
    );
  }

  // ========================================================
  // LOG
  // ========================================================

  console.log(
    "🗺️ Renderizando mapa.",
    "Subestações:",
    subestacoes,
    "Trechos:",
    trechos,
    "Equipamentos:",
    equipamentos,
    "Estado dos trechos:",
    trechosEstado,
    "Camadas:",
    camadas,
    "Painel:",
    painelCamadasAberto
  );

  // ========================================================
  // VALIDAÇÃO
  // ========================================================

  if (!se) {
    return null;
  }

  // ========================================================
  // CENTRO
  // ========================================================

  const centroInicial = [
    Number(
      se.localizacao?.latitude
    ),

    Number(
      se.localizacao?.longitude
    ),
  ];

  if (
    !Number.isFinite(
      centroInicial[0]
    ) ||
    !Number.isFinite(
      centroInicial[1]
    )
  ) {
    return null;
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <div
      style={{
        position: "relative",

        width: "100%",
        height: "100%",

        minWidth: 0,
        minHeight: 0,

        overflow: "hidden",

        background: "#eceff1",

        borderRadius: "12px",
      }}
    >

      {/* ================================================== */}
      {/* MAPA */}
      {/* ================================================== */}

      <MapContainer
        center={centroInicial}
        zoom={15}

        /*
         * Permite aproximar muito mais o mapa.
         * O zoom inicial continua sendo 15.
         */
        minZoom={5}
        maxZoom={22}

        zoomControl={true}

        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
        }}
      >

        <MapController />

        {/* ================================================== */}
        {/* MAPA BASE */}
        {/* ================================================== */}

        <TileLayer
          attribution="© OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"

          /*
           * Permite zoom até 22.
           * Os tiles nativos do OpenStreetMap chegam
           * normalmente até aproximadamente o nível 19.
           * Acima disso o Leaflet amplia o tile disponível.
           */
          maxZoom={22}
          maxNativeZoom={19}
        />

        {/* ================================================== */}
        {/* SUBESTAÇÃO */}
        {/* ================================================== */}

        {camadas.subestacoes && (
          <Marker
            position={centroInicial}
            icon={iconeSubestacao}
          >
            <Popup>
              <strong>
                {se.nome}
              </strong>

              <br />

              {se.sigla}

              <br />

              {se.tensao?.secundaria}{" "}
              {se.tensao?.unidade}
            </Popup>
          </Marker>
        )}

        {/* ================================================== */}
        {/* REDE MT DO SISTEMA */}
        {/* ================================================== */}

        {camadas.redeMT &&
          trechos.map(
            (trecho) => {

              if (
                !Array.isArray(
                  trecho.coordenadas
                ) ||
                trecho.coordenadas.length < 2
              ) {
                return null;
              }

              const estadoAtual =
                trechosEstado[
                  trecho.id
                ] ||
                trecho.estadoRede;

              return (
                <Polyline
                  key={`${trecho.id}-${estadoAtual}`}
                  positions={
                    trecho.coordenadas
                  }
                  pathOptions={{
                    color:
                      corTrecho(
                        trecho,
                        trechosEstado
                      ),

                    weight:
                      espessuraTrecho(
                        trecho,
                        trechosEstado
                      ),

                    opacity: 0.9,
                  }}
                >
                  <Popup>

                    <strong>
                      {trecho.id}
                    </strong>

                    <br />

                    Alimentador:{" "}
                    {trecho.alimentador}

                    <br />

                    Clientes:{" "}
                    {trecho.clientes}

                    <br />

                    Estado:{" "}
                    {estadoAtual}

                  </Popup>
                </Polyline>
              );
            }
          )}

        {/* ================================================== */}
        {/* EQUIPAMENTOS */}
        {/* ================================================== */}

        {camadas.equipamentos &&
          equipamentos.map(
            (equipamento) => {

              const latitude =
                Number(
                  equipamento
                    .localizacao
                    ?.latitude
                );

              const longitude =
                Number(
                  equipamento
                    .localizacao
                    ?.longitude
                );

              if (
                !Number.isFinite(
                  latitude
                ) ||
                !Number.isFinite(
                  longitude
                )
              ) {
                return null;
              }

              return (
                <Marker
                  key={
                    equipamento.id
                  }
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={
                    iconeEquipamento
                  }
                >
                  <Popup>

                    <strong>
                      {
                        equipamento.plaqueta
                      }
                    </strong>

                    <br />

                    {
                      equipamento.nome
                    }

                  </Popup>
                </Marker>
              );
            }
          )}

        {/* ================================================== */}
        {/* BDGD */}
        {/* ================================================== */}

        <CamadaBDGD
          camadas={camadas}
        />

      </MapContainer>

      {/* ================================================== */}
      {/* BOTÃO CAMADAS */}
      {/* ================================================== */}

      <BotaoAbrirCamadas
        aberto={
          painelCamadasAberto
        }
        onClick={() =>
          setPainelCamadasAberto(
            true
          )
        }
      />

      {/* ================================================== */}
      {/* PAINEL */}
      {/* ================================================== */}

      <PainelCamadas
        camadas={camadas}
        alterarCamada={
          alterarCamada
        }
        aberto={
          painelCamadasAberto
        }
        fechar={() =>
          setPainelCamadasAberto(
            false
          )
        }
      />

      {/* ================================================== */}
      {/* BARRA INFERIOR */}
      {/* ================================================== */}

      <BarraInformacoes
        subestacao={se}
        quantidadeTrechos={
          trechos.length
        }
        quantidadeEquipamentos={
          equipamentos.length
        }
      />

    </div>
  );
}

export default MapView;