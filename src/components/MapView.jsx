import { useEffect, useMemo, useState } from "react";

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
import useCoiStore from "../core/store/coiStore";

import CamadaBDGD from "./mapa/CamadaBDGD";

const ALIMENTADORES_CMG = [
  "CMG01C1",
  "CMG01C2",
  "CMG01C3",
  "CMG01C4",
  "CMG01C5",
  "CMG01C6",
];

const CIRCUITOS_CMG = {
  CMG01C1: "151",
  CMG01C2: "152",
  CMG01C3: "153",
  CMG01C4: "154",
  CMG01C5: "155",
  CMG01C6: "156",
};

const CORES_ALIMENTADORES = {
  CMG01C1: "#2563eb",
  CMG01C2: "#dc2626",
  CMG01C3: "#16a34a",
  CMG01C4: "#9333ea",
  CMG01C5: "#ea580c",
  CMG01C6: "#0891b2",
};

const iconeSubestacao = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconeEquipamento = new L.DivIcon({
  html: `
    <div style="
      width:14px;
      height:14px;
      background:#ff9800;
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.45);
    "></div>
  `,
  className: "",
  iconSize: [14, 14],
});

function corTrecho(trecho, estadosStore) {
  const estadoAtual = estadosStore[trecho.id] || trecho.estadoRede;
  if (estadoAtual === "DESLIGADO") return "#f44336";
  if (estadoAtual === "MANOBRA") return "#ff1744";
  if (trecho.interligacao) return "#1976d2";
  return "#4caf50";
}

function espessuraTrecho(trecho, estadosStore) {
  const estadoAtual = estadosStore[trecho.id] || trecho.estadoRede;
  if (estadoAtual === "MANOBRA") return 7;
  if (trecho.interligacao) return 6;
  if (trecho.telecomandado) return 5;
  return 3;
}

function MapController() {
  const map = useMap();
  const { coordenadasMapa, zoomMapa } = useCoiStore();

  useEffect(() => {
    if (!Array.isArray(coordenadasMapa) || coordenadasMapa.length < 2) return;

    const lat = Number(coordenadasMapa[0]);
    const lng = Number(coordenadasMapa[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    map.setView([lat, lng], zoomMapa, {
      animate: true,
      duration: 1,
    });
  }, [coordenadasMapa, zoomMapa, map]);

  return null;
}


function LocalizadorEquipamento() {
  const map = useMap();

  useEffect(() => {
    function receberLocalizacao(evento) {
      const coordenadas = evento?.detail?.coordenadas;
      if (!Array.isArray(coordenadas) || coordenadas.length < 2) return;

      const lat = Number(coordenadas[0]);
      const lng = Number(coordenadas[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      map.flyTo([lat, lng], Math.max(map.getZoom(), 18), {
        animate: true,
        duration: 0.8,
      });
    }

    window.addEventListener("power-grid-localizar-equipamento", receberLocalizacao);
    return () => window.removeEventListener("power-grid-localizar-equipamento", receberLocalizacao);
  }, [map]);

  return null;
}

function normalizarTexto(valor) {
  return String(valor ?? "").trim().toUpperCase();
}

function obterAlimentadorItem(item) {
  const fontes = [
    item,
    item?.properties,
    item?.propriedades,
    item?.unidade,
    item?.transformador,
  ];

  const campos = [
    "__alimentadorFonte",
    "alimentadorFonte",
    "alimentador",
    "ALIMENTADOR",
    "CT_COD_OP",
    "CT_COD_OPER",
    "CT_COD",
    "CTMT",
    "ctmt",
    "codigoAlimentador",
  ];

  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;

    for (const campo of campos) {
      const valor = fonte?.[campo];
      if (valor !== null && valor !== undefined && String(valor).trim()) {
        return String(valor).trim().toUpperCase();
      }
    }
  }

  return "";
}

function converterAlimentador(valor) {
  const texto = normalizarTexto(valor);

  const mapa = {
    "151": "CMG01C1",
    "152": "CMG01C2",
    "153": "CMG01C3",
    "154": "CMG01C4",
    "155": "CMG01C5",
    "156": "CMG01C6",
  };

  return mapa[texto] || texto;
}

function itemPertenceAosAlimentadores(item, selecionados) {
  if (!Array.isArray(selecionados) || selecionados.length === 0) return false;
  if (selecionados.length === ALIMENTADORES_CMG.length) return true;

  const alimentador = converterAlimentador(obterAlimentadorItem(item));
  if (!alimentador) return true;
  return selecionados.includes(alimentador);
}

function obterTipoEquipamento(item) {
  const fontes = [item, item?.properties, item?.propriedades];
  const campos = [
    "tipo",
    "tipoEquipamento",
    "equipamentoPrincipal",
    "nome",
    "descricao",
    "DESCR",
    "TIP_UNID",
  ];

  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;
    for (const campo of campos) {
      const valor = fonte?.[campo];
      if (valor === null || valor === undefined || !String(valor).trim()) continue;

      const texto = normalizarTexto(valor);

      if (texto === "19" || texto.includes("LAMINA") || texto.includes("LÂMINA")) {
        return "CHAVE_LAMINA";
      }
      if (texto === "22" || texto.includes("FUSIV")) {
        return "CHAVE_FUSIVEL";
      }
      if (texto === "32" || texto.includes("RELIG") || texto.includes("RECLOSER")) {
        return "RELIGADOR";
      }
      if (texto === "34" || texto.includes("SECCION")) {
        return "CHAVE_SECCIONADORA";
      }
      if (texto === "38" || texto.includes("TRANSFORM") || texto.includes("TRAFO")) {
        return "TRANSFORMADOR";
      }
      if (texto.includes("REGULADOR")) return "REGULADOR";
      if (texto.includes("CAPACITOR")) return "CAPACITOR";
    }
  }

  return "OUTRO";
}

function obterIdEquipamento(item) {
  const fontes = [item, item?.properties, item?.propriedades];
  const campos = [
    "id",
    "COD_ID",
    "codId",
    "unsemtId",
    "untrmtId",
    "codigo",
    "plaqueta",
  ];

  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;
    for (const campo of campos) {
      const valor = fonte?.[campo];
      if (valor !== null && valor !== undefined && String(valor).trim()) {
        return String(valor).trim();
      }
    }
  }

  return "";
}

function obterDescricaoEquipamento(item) {
  const fontes = [item, item?.properties, item?.propriedades];
  const campos = ["nome", "descricao", "DESCR", "tipoEquipamento", "tipo"];

  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;
    for (const campo of campos) {
      const valor = fonte?.[campo];
      if (valor !== null && valor !== undefined && String(valor).trim()) {
        return String(valor).trim();
      }
    }
  }

  return "Equipamento";
}

function obterCoordenadasEquipamento(item) {
  // GeoJSON: [longitude, latitude]
  const geometryCoordinates = item?.geometry?.coordinates;
  if (
    Array.isArray(geometryCoordinates) &&
    geometryCoordinates.length >= 2
  ) {
    const longitudeGeoJSON = Number(geometryCoordinates[0]);
    const latitudeGeoJSON = Number(geometryCoordinates[1]);

    if (
      Number.isFinite(latitudeGeoJSON) &&
      Number.isFinite(longitudeGeoJSON)
    ) {
      return [latitudeGeoJSON, longitudeGeoJSON];
    }
  }

  const fontes = [item, item?.localizacao, item?.properties, item?.propriedades];

  let latitude = null;
  let longitude = null;

  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;

    if (latitude === null) {
      latitude = Number(
        fonte?.latitude ??
        fonte?.lat ??
        fonte?.y
      );
    }

    if (longitude === null) {
      longitude = Number(
        fonte?.longitude ??
        fonte?.lng ??
        fonte?.lon ??
        fonte?.x
      );
    }
  }

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [latitude, longitude];
  }

  return null;
}

function BotaoPainel({ aberto, onClick, icone, titulo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={aberto ? `Fechar ${titulo.toLowerCase()}` : `Abrir ${titulo.toLowerCase()}`}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        width: 154,
        height: 42,
        border: "1px solid #d7dee7",
        borderRadius: 10,
        background: aberto ? "#eaf4ff" : "rgba(255,255,255,0.97)",
        color: aberto ? "#1565c0" : "#263238",
        boxShadow: "0 5px 18px rgba(0,0,0,0.18)",
        cursor: "pointer",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 9,
        padding: "0 12px",
        fontFamily: "Arial,sans-serif",
        fontWeight: 700,
        fontSize: 11,
      }}
    >
      <span style={{ fontSize: 17, width: 21, textAlign: "center" }}>{icone}</span>
      <span style={{ flex: 1, textAlign: "left" }}>{titulo}</span>
      <span style={{ fontSize: 13 }}>{aberto ? "▲" : "▼"}</span>
    </button>
  );
}

function PainelCamadas({
  camadas,
  alterarCamada,
  aberto,
  fechar,
  alimentadoresSelecionados,
  alterarAlimentador,
  selecionarTodosAlimentadores,
  limparAlimentadores,
  buscaAlimentador,
  setBuscaAlimentador,
  equipamentosVisiveis,
  equipamentosFiltrados,
  buscaEquipamento,
  setBuscaEquipamento,
  tipoEquipamentoFiltro,
  setTipoEquipamentoFiltro,
  equipamentoSelecionadoId,
  localizarEquipamento,
}) {
  if (!aberto) return null;

  const alimentadoresVisiveis = ALIMENTADORES_CMG.filter((item) => {
    const filtro = normalizarTexto(buscaAlimentador);
    return !filtro || item.includes(filtro) || `CIRCUITO ${CIRCUITOS_CMG[item]}`.includes(filtro);
  });

  const todosSelecionados = alimentadoresSelecionados.length === ALIMENTADORES_CMG.length;
  const nenhumSelecionado = alimentadoresSelecionados.length === 0;

  const BotaoCamada = ({ ativo, onClick, icone, titulo, descricao }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        background: ativo ? "rgba(33,150,243,0.12)" : "transparent",
        color: ativo ? "#1976d2" : "#455a64",
        padding: "8px 9px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        borderRadius: 8,
        textAlign: "left",
        marginBottom: 2,
      }}
    >
      <span style={{ width: 20, minWidth: 20, textAlign: "center", fontSize: 15 }}>{icone}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{titulo}</span>
        {descricao && <span style={{ display: "block", fontSize: 9, color: "#78909c", marginTop: 1 }}>{descricao}</span>}
      </span>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: ativo ? "#2196f3" : "#cfd8dc" }} />
    </button>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        right: 14,
        width: 340,
        maxWidth: "calc(100% - 28px)",
        maxHeight: "calc(100% - 190px)",
        overflowY: "auto",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid #d7dee7",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.24)",
        zIndex: 4900,
        padding: 12,
        boxSizing: "border-box",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e3f2fd", color: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>☰</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#263238" }}>Camadas do mapa</div>
          <div style={{ fontSize: 10, color: "#78909c" }}>Visualização e filtros operacionais</div>
        </div>
        <button type="button" onClick={fechar} style={{ width: 28, height: 28, border: "none", borderRadius: 7, background: "#eceff1", color: "#455a64", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>

      <div style={{ border: "1px solid #dfe6ec", borderRadius: 9, padding: 9, background: "#f8fafc", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#607d8b", letterSpacing: 0.7 }}>ALIMENTADORES</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#263238", marginTop: 2 }}>{alimentadoresSelecionados.length} de {ALIMENTADORES_CMG.length}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={selecionarTodosAlimentadores} style={{ border: "1px solid #cbd5e1", background: todosSelecionados ? "#e3f2fd" : "#fff", color: "#1565c0", borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>Todos</button>
            <button type="button" onClick={limparAlimentadores} style={{ border: "1px solid #cbd5e1", background: nenhumSelecionado ? "#ffebee" : "#fff", color: "#b71c1c", borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>Nenhum</button>
          </div>
        </div>

        <input
          value={buscaAlimentador}
          onChange={(event) => setBuscaAlimentador(event.target.value)}
          placeholder="Filtrar alimentador ou circuito..."
          style={{ width: "100%", boxSizing: "border-box", marginTop: 8, border: "1px solid #cfd8dc", borderRadius: 7, padding: "7px 8px", fontSize: 10, outline: "none" }}
        />

        <div style={{ marginTop: 7 }}>
          {alimentadoresVisiveis.map((alimentador) => {
            const ativo = alimentadoresSelecionados.includes(alimentador);
            return (
              <label key={alimentador} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 7px", borderRadius: 7, cursor: "pointer", background: ativo ? "#eef6ff" : "#fff", marginBottom: 3 }}>
                <input type="checkbox" checked={ativo} onChange={() => alterarAlimentador(alimentador)} style={{ width: 14, height: 14, accentColor: CORES_ALIMENTADORES[alimentador] }} />
                <span style={{ width: 20, height: 4, borderRadius: 3, background: CORES_ALIMENTADORES[alimentador] }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700 }}>{alimentador}</span>
                  <span style={{ display: "block", fontSize: 9, color: "#78909c" }}>Circuito {CIRCUITOS_CMG[alimentador]}</span>
                </span>
                <span style={{ fontSize: 8, fontWeight: 800, color: ativo ? CORES_ALIMENTADORES[alimentador] : "#90a4ae" }}>{ativo ? "ATIVO" : "OFF"}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, color: "#78909c", letterSpacing: 0.8, marginBottom: 5 }}>CAMADAS</div>
      <BotaoCamada ativo={camadas.redeMT} onClick={() => alterarCamada("redeMT")} icone="〰️" titulo="Rede MT" descricao="Trechos da rede de média tensão" />
      <BotaoCamada ativo={camadas.subestacoes} onClick={() => alterarCamada("subestacoes")} icone="🏭" titulo="Subestações" descricao="Subestações da rede" />
      <BotaoCamada ativo={camadas.equipamentos} onClick={() => alterarCamada("equipamentos")} icone="⚙️" titulo="Equipamentos" descricao="Exibição dos equipamentos no mapa" />

      {camadas.equipamentos && (
        <div
          style={{
            margin: "-1px 0 5px 37px",
            padding: "6px 7px 5px",
            borderLeft: "2px solid #dbeafe",
            background: "#f8fbff",
            borderRadius: "0 7px 7px 0",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 800, color: "#78909c", letterSpacing: 0.7, marginBottom: 4 }}>
            TIPOS DE EQUIPAMENTOS
          </div>

          {[
            ["religadores", "🔴", "Religadores"],
            ["chaves", "🟠", "Chaves"],
            ["reguladores", "🔵", "Reguladores"],
            ["capacitores", "🟣", "Capacitores"],
            ["transformadores", "🟢", "Transformadores"],
          ].map(([nome, iconeFilho, tituloFilho]) => (
            <button
              key={nome}
              type="button"
              onClick={() => alterarCamada(nome)}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: camadas[nome] ? "#1565c0" : "#90a4ae",
                padding: "5px 6px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                borderRadius: 6,
                textAlign: "left",
              }}
            >
              <span style={{ width: 18, textAlign: "center", fontSize: 12 }}>{iconeFilho}</span>
              <span style={{ flex: 1, fontSize: 10, fontWeight: 600 }}>{tituloFilho}</span>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: camadas[nome] ? "#2196f3" : "#cfd8dc",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {camadas.equipamentos && (
        <div
          style={{
            margin: "2px 0 7px 37px",
            padding: 9,
            borderLeft: "2px solid #dbeafe",
            background: "#f8fbff",
            borderRadius: "0 8px 8px 0",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 800, color: "#78909c", letterSpacing: 0.7, marginBottom: 6 }}>
            CONTROLE DE EQUIPAMENTOS
          </div>

          <div style={{ position: "relative", marginBottom: 7 }}>
            <span style={{ position: "absolute", left: 8, top: 6, color: "#78909c", pointerEvents: "none", fontSize: 11 }}>🔎</span>
            <input
              value={buscaEquipamento}
              onChange={(event) => setBuscaEquipamento(event.target.value)}
              placeholder="ID, plaqueta, tipo ou alimentador..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cfd8dc", borderRadius: 7, padding: "7px 8px 7px 27px", fontSize: 10, outline: "none", background: "#fff" }}
            />
          </div>

          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 3 }}>
            {[["TODOS", "Todos"], ["RELIGADOR", "Religadores"], ["CHAVE", "Chaves"], ["REGULADOR", "Reguladores"], ["CAPACITOR", "Capacitores"], ["TRANSFORMADOR", "Transformadores"]].map(([valor, titulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipoEquipamentoFiltro(valor)}
                style={{ flexShrink: 0, border: `1px solid ${tipoEquipamentoFiltro === valor ? "#90caf9" : "#d7dee7"}`, background: tipoEquipamentoFiltro === valor ? "#e3f2fd" : "#fff", color: tipoEquipamentoFiltro === valor ? "#1565c0" : "#455a64", borderRadius: 999, padding: "4px 7px", fontSize: 8, fontWeight: 700, cursor: "pointer" }}
              >
                {titulo}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 7, maxHeight: 250, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: "#78909c", marginBottom: 6 }}>
              {equipamentosFiltrados.length} resultado(s) de {equipamentosVisiveis.length}
            </div>

            {equipamentosFiltrados.map((equipamento, indice) => {
              const id = obterIdEquipamento(equipamento) || `equipamento-${indice}`;
              const tipo = obterTipoEquipamento(equipamento);
              const descricao = obterDescricaoEquipamento(equipamento);
              const alimentador = converterAlimentador(obterAlimentadorItem(equipamento)) || "-";
              const ativo = equipamentoSelecionadoId === id;

              return (
                <button
                  key={`${id}-${indice}`}
                  type="button"
                  onClick={() => localizarEquipamento(equipamento)}
                  style={{ width: "100%", border: ativo ? "1px solid #90caf9" : "1px solid #e5e7eb", background: ativo ? "#eef7ff" : "#fff", borderRadius: 8, padding: "7px 8px", marginBottom: 5, textAlign: "left", cursor: "pointer", fontFamily: "Arial,sans-serif" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ff9800", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.22)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#263238", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{descricao}</div>
                      <div style={{ fontSize: 9, color: "#607d8b", marginTop: 2 }}>ID: {id} · {alimentador}</div>
                    </div>
                    <div style={{ fontSize: 8, color: "#1976d2", fontWeight: 700 }}>{tipo}</div>
                  </div>
                </button>
              );
            })}

            {equipamentosFiltrados.length === 0 && (
              <div style={{ padding: 10, textAlign: "center", color: "#78909c", fontSize: 10, background: "#fff", borderRadius: 7, border: "1px solid #e5e7eb" }}>
                Nenhum equipamento encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      <BotaoCamada ativo={camadas.pontos} onClick={() => alterarCamada("pontos")} icone="📍" titulo="Pontos BDGD" />
      <BotaoCamada ativo={camadas.terminais} onClick={() => alterarCamada("terminais")} icone="🔵" titulo="Terminais" />
      <BotaoCamada ativo={camadas.derivacoes} onClick={() => alterarCamada("derivacoes")} icone="🔀" titulo="Derivações" />

      <div style={{ height: 1, background: "#eceff1", margin: "10px 0" }} />
      <div style={{ fontSize: 10, fontWeight: 800, color: "#78909c", letterSpacing: 0.8, marginBottom: 5 }}>ANÁLISES</div>
      <BotaoCamada ativo={camadas.redeMontante} onClick={() => alterarCamada("redeMontante")} icone="⬆️" titulo="Rede a montante" />
      <BotaoCamada ativo={camadas.redeJusante} onClick={() => alterarCamada("redeJusante")} icone="⬇️" titulo="Rede a jusante" />
      <BotaoCamada ativo={camadas.caminhoEletrico} onClick={() => alterarCamada("caminhoEletrico")} icone="🧭" titulo="Caminho elétrico" />
      <BotaoCamada ativo={camadas.redeConectada} onClick={() => alterarCamada("redeConectada")} icone="🔗" titulo="Rede conectada" />
    </div>
  );
}

function BarraInformacoes({ subestacao, alimentadoresSelecionados, quantidadeTrechos, quantidadeEquipamentos }) {
  return (
    <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, minHeight: 52, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: 12, boxShadow: "0 5px 20px rgba(0,0,0,0.18)", zIndex: 1000, display: "flex", alignItems: "center", padding: "8px 16px", gap: 26, boxSizing: "border-box", overflow: "hidden" }}>
      <div>
        <div style={{ fontSize: 10, color: "#78909c", textTransform: "uppercase" }}>Subestação</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#263238" }}>{subestacao?.sigla || subestacao?.nome || "-"}</div>
      </div>
      <div style={{ minWidth: 120, maxWidth: 360 }}>
        <div style={{ fontSize: 10, color: "#78909c", textTransform: "uppercase" }}>Alimentadores</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#263238", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={(alimentadoresSelecionados || []).join(", ")}>{(alimentadoresSelecionados || []).length === ALIMENTADORES_CMG.length ? "Todos (C1–C6)" : (alimentadoresSelecionados || []).length === 0 ? "Nenhum" : (alimentadoresSelecionados || []).join(", ")}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#78909c", textTransform: "uppercase" }}>Circuitos</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#263238" }}>{(alimentadoresSelecionados || []).length === ALIMENTADORES_CMG.length ? "151–156" : (alimentadoresSelecionados || []).map((a) => CIRCUITOS_CMG[a] || a).join(", ")}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#78909c", textTransform: "uppercase" }}>Trechos</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#263238" }}>{quantidadeTrechos}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#78909c", textTransform: "uppercase" }}>Equipamentos</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#263238" }}>{quantidadeEquipamentos}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 20, background: "rgba(76,175,80,0.12)", color: "#2e7d32", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}><span style={{ width: 8, height: 8, background: "#4caf50", borderRadius: "50%" }} />REDE OPERACIONAL</div>
    </div>
  );
}

function MapView() {
  const subestacoes = SubestacoesRepository.listar();
  const trechos = TrechosRepository.listar();
  const se = subestacoes[0];
  const { trechosEstado } = useCoiStore();

  const [painelCamadasAberto, setPainelCamadasAberto] = useState(false);
  const [buscaAlimentador, setBuscaAlimentador] = useState("");
  const [buscaEquipamento, setBuscaEquipamento] = useState("");
  const [tipoEquipamentoFiltro, setTipoEquipamentoFiltro] = useState("TODOS");
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState(null);
  const [equipamentosBDGD, setEquipamentosBDGD] = useState([]);
  const [alimentadoresSelecionados, setAlimentadoresSelecionados] = useState([...ALIMENTADORES_CMG]);

  const [camadas, setCamadas] = useState({
    redeMT: true,
    subestacoes: true,
    equipamentos: true,
    pontos: false,
    terminais: false,
    derivacoes: false,
    religadores: true,
    chaves: false,
    reguladores: false,
    capacitores: false,
    transformadores: true,
    redeMontante: false,
    redeJusante: false,
    caminhoEletrico: false,
    redeConectada: false,
  });

  function alterarCamada(nome) {
    setCamadas((estadoAnterior) => ({
      ...estadoAnterior,
      [nome]: !estadoAnterior[nome],
    }));
  }

  function alterarAlimentador(alimentador) {
    setAlimentadoresSelecionados((atual) => {
      if (atual.includes(alimentador)) {
        return atual.filter((item) => item !== alimentador);
      }
      return [...atual, alimentador].filter((item, indice, lista) => lista.indexOf(item) === indice);
    });
  }

  function selecionarTodosAlimentadores() {
    setAlimentadoresSelecionados([...ALIMENTADORES_CMG]);
  }

  function limparAlimentadores() {
    setAlimentadoresSelecionados([]);
  }

  const trechosVisiveis = useMemo(
    () => trechos.filter((item) => itemPertenceAosAlimentadores(item, alimentadoresSelecionados)),
    [trechos, alimentadoresSelecionados]
  );

  /*
   * A CamadaBDGD entrega aqui exatamente a coleção de
   * equipamentos que está sendo usada no mapa, já filtrada
   * pelos alimentadores selecionados.
   *
   * Não filtramos uma segunda vez para evitar divergência
   * entre o mapa e a lista de equipamentos.
   */
  const equipamentosVisiveis = equipamentosBDGD;

  const equipamentosFiltrados = useMemo(() => {
    const filtro = normalizarTexto(buscaEquipamento);

    return equipamentosVisiveis.filter((item) => {
      const tipo = obterTipoEquipamento(item);
      const id = normalizarTexto(obterIdEquipamento(item));
      const descricao = normalizarTexto(obterDescricaoEquipamento(item));
      const alimentador = normalizarTexto(converterAlimentador(obterAlimentadorItem(item)));

      const tipoPermitido =
        tipoEquipamentoFiltro === "TODOS" ||
        (tipoEquipamentoFiltro === "CHAVE" && tipo.startsWith("CHAVE_")) ||
        tipo === tipoEquipamentoFiltro;

      if (!tipoPermitido) return false;
      if (!filtro) return true;

      return (
        id.includes(filtro) ||
        descricao.includes(filtro) ||
        alimentador.includes(filtro) ||
        tipo.includes(filtro)
      );
    });
  }, [equipamentosVisiveis, buscaEquipamento, tipoEquipamentoFiltro]);

  const subestacoesVisiveis = subestacoes.filter((item) => {
    if (alimentadoresSelecionados.length === ALIMENTADORES_CMG.length) return true;
    return itemPertenceAosAlimentadores(item, alimentadoresSelecionados);
  });

  const centroBase = subestacoesVisiveis[0] || se;

  if (!centroBase) return null;

  const centroInicial = [
    Number(centroBase.localizacao?.latitude),
    Number(centroBase.localizacao?.longitude),
  ];

  if (!Number.isFinite(centroInicial[0]) || !Number.isFinite(centroInicial[1])) return null;

  function alternarPainelCamadas() {
    setPainelCamadasAberto((atual) => !atual);
  }



  function localizarEquipamento(equipamento) {
    const coordenadas = obterCoordenadasEquipamento(equipamento);
    const id = obterIdEquipamento(equipamento);

    if (!coordenadas) return;

    setEquipamentoSelecionadoId(id || null);

    window.dispatchEvent(
      new CustomEvent("power-grid-localizar-equipamento", {
        detail: { id, coordenadas, equipamento },
      })
    );

    window.dispatchEvent(
      new CustomEvent("power-grid-selecionar-equipamento", {
        detail: { id, equipamento },
      })
    );
  }

  console.log("🗺️ Power Grid Monitor - Camadas:", camadas, "Alimentadores:", alimentadoresSelecionados);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minWidth: 0, minHeight: 0, overflow: "hidden", background: "#eceff1", borderRadius: "12px" }}>
      <MapContainer center={centroInicial} zoom={15} minZoom={5} maxZoom={22} zoomControl={true} style={{ width: "100%", height: "100%", minHeight: 0 }}>
        <MapController />
        <LocalizadorEquipamento />

        <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={22} maxNativeZoom={19} />

        {camadas.subestacoes && (
          <Marker position={centroInicial} icon={iconeSubestacao}>
            <Popup>
              <strong>{centroBase.nome}</strong><br />
              {centroBase.sigla}<br />
              {centroBase.tensao?.secundaria} {centroBase.tensao?.unidade}<br />
              <small>{alimentadoresSelecionados.length} alimentador(es) selecionado(s)</small>
            </Popup>
          </Marker>
        )}

        {camadas.redeMT && trechosVisiveis.map((trecho) => {
          if (!Array.isArray(trecho.coordenadas) || trecho.coordenadas.length < 2) return null;
          const estadoAtual = trechosEstado[trecho.id] || trecho.estadoRede;

          return (
            <Polyline key={`${trecho.id}-${trecho.alimentador}-${estadoAtual}`} positions={trecho.coordenadas} pathOptions={{ color: corTrecho(trecho, trechosEstado), weight: espessuraTrecho(trecho, trechosEstado), opacity: 0.9 }}>
              <Popup>
                <strong>{trecho.id}</strong><br />
                Alimentador: {trecho.alimentador || "-"}<br />
                Clientes: {trecho.clientes ?? "-"}<br />
                Estado: {estadoAtual || "-"}
              </Popup>
            </Polyline>
          );
        })}

        {/*
          IMPORTANTE:
          Os equipamentos continuam sendo renderizados pela CamadaBDGD.
          Não duplicamos os markers aqui.
        */}

        <CamadaBDGD
          mostrarRedeMT={camadas.redeMT}
          mostrarSubestacoes={camadas.subestacoes}
          mostrarEquipamentos={camadas.equipamentos}
          mostrarPontos={camadas.pontos}
          mostrarTerminais={camadas.terminais}
          mostrarDerivacoes={camadas.derivacoes}
          mostrarReligadores={camadas.religadores}
          mostrarChaves={camadas.chaves}
          mostrarReguladores={camadas.reguladores}
          mostrarCapacitores={camadas.capacitores}
          mostrarTransformadores={camadas.transformadores}
          mostrarRedeMontante={camadas.redeMontante}
          mostrarRedeJusante={camadas.redeJusante}
          mostrarCaminhoEletrico={camadas.caminhoEletrico}
          mostrarRedeConectada={camadas.redeConectada}
          alimentadoresSelecionados={alimentadoresSelecionados}
          onEquipamentosDisponiveisChange={setEquipamentosBDGD}
        />
      </MapContainer>

      <BotaoPainel aberto={painelCamadasAberto} onClick={alternarPainelCamadas} icone="☰" titulo="CAMADAS" />

      <PainelCamadas
        camadas={camadas}
        alterarCamada={alterarCamada}
        aberto={painelCamadasAberto}
        fechar={() => setPainelCamadasAberto(false)}
        alimentadoresSelecionados={alimentadoresSelecionados}
        alterarAlimentador={alterarAlimentador}
        selecionarTodosAlimentadores={selecionarTodosAlimentadores}
        limparAlimentadores={limparAlimentadores}
        buscaAlimentador={buscaAlimentador}
        setBuscaAlimentador={setBuscaAlimentador}
        equipamentosVisiveis={equipamentosVisiveis}
        equipamentosFiltrados={equipamentosFiltrados}
        buscaEquipamento={buscaEquipamento}
        setBuscaEquipamento={setBuscaEquipamento}
        tipoEquipamentoFiltro={tipoEquipamentoFiltro}
        setTipoEquipamentoFiltro={setTipoEquipamentoFiltro}
        equipamentoSelecionadoId={equipamentoSelecionadoId}
        localizarEquipamento={localizarEquipamento}
      />

      <BarraInformacoes
        subestacao={centroBase}
        alimentadoresSelecionados={alimentadoresSelecionados}
        quantidadeTrechos={trechosVisiveis.length}
        quantidadeEquipamentos={equipamentosVisiveis.length}
      />
    </div>
  );
}

export default MapView;
