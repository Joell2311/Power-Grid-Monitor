import { useEffect, useState } from "react";

import {
  GeoJSON,
  CircleMarker,
  Popup,
} from "react-leaflet";

import {
  criarTopologiaBDGD,
} from "../../core/modelo/topologiaBDGD";

import {
  testarNavegadorRede
} from "../../core/modelo/navegadorRede";

// ==========================================================
// ARQUIVOS BDGD
// ==========================================================

const ARQUIVO_SSDMT =
  "/data/bdgd/CMG01C4.geojson";

const ARQUIVO_PONNOT =
  "/data/bdgd/CMG01C4_ponnot.geojson";

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================

function formatarNumero(
  valor,
  casas = 2
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "-";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return String(valor);
  }

  return numero.toFixed(casas);
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function CamadaBDGD() {

  // ========================================================
  // DADOS BDGD
  // ========================================================

  const [ssdmt, setSsdmt] =
    useState(null);

  const [ponnot, setPonnot] =
    useState(null);

  // ========================================================
  // TOPOLOGIA
  // ========================================================

  const [topologia, setTopologia] =
    useState(null);

  // ========================================================
  // STATUS
  // ========================================================

  const [carregandoSsdmt, setCarregandoSsdmt] =
    useState(true);

  const [carregandoPonnot, setCarregandoPonnot] =
    useState(true);

  const [erroSsdmt, setErroSsdmt] =
    useState(null);

  const [erroPonnot, setErroPonnot] =
    useState(null);

  // ========================================================
  // CARREGAR SSDMT
  // ========================================================

  useEffect(() => {

    let ativo = true;

    async function carregarSSDMT() {

      try {

        setCarregandoSsdmt(true);
        setErroSsdmt(null);

        console.log(
          "🔵 Carregando BDGD SSDMT..."
        );

        console.log(
          "📂 Arquivo:",
          ARQUIVO_SSDMT
        );

        const response =
          await fetch(
            ARQUIVO_SSDMT
          );

        if (!response.ok) {

          throw new Error(
            `Erro HTTP ${response.status} ao carregar SSDMT`
          );
        }

        const geojson =
          await response.json();

        // --------------------------------------------------
        // VALIDAR GEOJSON
        // --------------------------------------------------

        if (
          !geojson ||
          geojson.type !==
            "FeatureCollection"
        ) {

          throw new Error(
            "O arquivo SSDMT não possui um GeoJSON FeatureCollection válido."
          );
        }

        if (!ativo) {
          return;
        }

        console.log(
          "✅ BDGD SSDMT carregada:",
          geojson.features?.length || 0,
          "trechos"
        );

        setSsdmt(
          geojson
        );

      } catch (error) {

        console.error(
          "❌ Erro ao carregar SSDMT:",
          error
        );

        if (ativo) {

          setErroSsdmt(
            error.message
          );

          setSsdmt(null);
        }

      } finally {

        if (ativo) {

          setCarregandoSsdmt(
            false
          );
        }
      }
    }

    carregarSSDMT();

    return () => {

      ativo = false;

    };

  }, []);

  // ========================================================
  // CARREGAR PONNOT
  // ========================================================

  useEffect(() => {

    let ativo = true;

    async function carregarPONNOT() {

      try {

        setCarregandoPonnot(true);
        setErroPonnot(null);

        console.log(
          "🟢 Carregando BDGD PONNOT..."
        );

        console.log(
          "📂 Arquivo:",
          ARQUIVO_PONNOT
        );

        const response =
          await fetch(
            ARQUIVO_PONNOT
          );

        if (!response.ok) {

          throw new Error(
            `Erro HTTP ${response.status} ao carregar PONNOT`
          );
        }

        const geojson =
          await response.json();

        // --------------------------------------------------
        // VALIDAR GEOJSON
        // --------------------------------------------------

        if (
          !geojson ||
          geojson.type !==
            "FeatureCollection"
        ) {

          throw new Error(
            "O arquivo PONNOT não possui um GeoJSON FeatureCollection válido."
          );
        }

        if (!ativo) {
          return;
        }

        console.log(
          "✅ BDGD PONNOT carregada:",
          geojson.features?.length || 0,
          "pontos"
        );

        setPonnot(
          geojson
        );

      } catch (error) {

        console.error(
          "❌ Erro ao carregar PONNOT:",
          error
        );

        if (ativo) {

          setErroPonnot(
            error.message
          );

          setPonnot(null);
        }

      } finally {

        if (ativo) {

          setCarregandoPonnot(
            false
          );
        }
      }
    }

    carregarPONNOT();

    return () => {

      ativo = false;

    };

  }, []);

  // ========================================================
  // CRIAR TOPOLOGIA
  // ========================================================

  useEffect(() => {

    if (
      !ssdmt ||
      !ponnot
    ) {

      return;
    }

    console.log(
      "🔧 SSDMT e PONNOT disponíveis."
    );

    console.log(
      "⚡ Iniciando criação da topologia..."
    );

    try {

      const novaTopologia =
        criarTopologiaBDGD(
          ssdmt,
          ponnot
        );

      if (!novaTopologia) {

        console.error(
          "❌ A função criarTopologiaBDGD não retornou uma topologia."
        );

        setTopologia(null);

        return;
      }

      setTopologia(
        novaTopologia
      );

      // ----------------------------------------------------
      // LOG DA TOPOLOGIA
      // ----------------------------------------------------

      console.log(
        "🧠 Topologia disponível:",
        novaTopologia
      );

      console.log(
        "📊 Resumo:",
        novaTopologia.resumo
      );

      console.log(
        "📍 Pontos:",
        novaTopologia.resumo?.pontos
      );

      console.log(
        "🔵 Trechos:",
        novaTopologia.resumo?.trechos
      );

      console.log(
        "🔗 Terminais:",
        novaTopologia.resumo?.terminais
      );

      console.log(
        "🔀 Passagens:",
        novaTopologia.resumo?.passagens
      );

      console.log(
        "🌿 Derivações:",
        novaTopologia.resumo?.derivacoes
      );

      console.log(
        "⚠️ Problemas:",
        novaTopologia.resumo?.problemas
      );

    } catch (error) {

      console.error(
        "❌ Erro ao criar topologia BDGD:",
        error
      );

      setTopologia(null);
    }

  }, [ssdmt, ponnot]);

  // ========================================================
  // TESTE DE TOPOLOGIA
  // ========================================================

  useEffect(() => {

    if (!topologia) {
      return;
    }

    console.log(
      "=============================================="
    );

    console.log(
      "🧠 TOPOLOGIA DISPONÍVEL NO CAMADABDGD"
    );

    console.log(
      "=============================================="
    );

    console.log(
      "Alimentador:",
      topologia.alimentador
    );

    console.log(
      "Circuito:",
      topologia.circuito
    );

    console.log(
      "Subestação:",
      topologia.subestacao
    );

    console.log(
      "Pontos:",
      topologia.resumo.pontos
    );

    console.log(
      "Trechos:",
      topologia.resumo.trechos
    );

    console.log(
      "Problemas:",
      topologia.resumo.problemas
    );

    console.log(
      "=============================================="
    );

  }, [topologia]);

  // ========================================================
  // POPUP SSDMT
  // ========================================================

  function criarPopupSSDMT(
    feature
  ) {

    const p =
      feature?.properties || {};

    const comprimento =
      p.COMP !== null &&
      p.COMP !== undefined &&
      p.COMP !== ""
        ? `${formatarNumero(
            p.COMP,
            2
          )} m`
        : "-";

    return `
      <div
        style="
          min-width:240px;
          font-family:Arial,sans-serif;
          font-size:13px;
          line-height:1.5;
        "
      >

        <div
          style="
            font-size:16px;
            font-weight:bold;
            margin-bottom:8px;
            color:#1565c0;
          "
        >
          ⚡ Trecho SSDMT
        </div>

        <div>
          <strong>Alimentador:</strong>
          ${p.CT_COD_OP ?? "-"}
        </div>

        <div>
          <strong>COD_ID:</strong>
          ${p.COD_ID ?? "-"}
        </div>

        <hr />

        <div>
          <strong>PN inicial:</strong>
          ${p.PN_CON_1 ?? "-"}
        </div>

        <div>
          <strong>PN final:</strong>
          ${p.PN_CON_2 ?? "-"}
        </div>

        <hr />

        <div>
          <strong>Condutor:</strong>
          ${p.TIP_CND ?? "-"}
        </div>

        <div>
          <strong>Fases:</strong>
          ${p.FAS_CON ?? "-"}
        </div>

        <div>
          <strong>Comprimento:</strong>
          ${comprimento}
        </div>

        <div>
          <strong>Situação:</strong>
          ${p.SITCONT ?? "-"}
        </div>

      </div>
    `;
  }

  // ========================================================
  // ESTILO SSDMT
  // ========================================================

  function estiloSSDMT() {

    return {

      color: "#1565c0",

      weight: 3,

      opacity: 0.85,

      lineCap: "round",

      lineJoin: "round",
    };
  }

  // ========================================================
  // EVENTOS SSDMT
  // ========================================================

  function aoCriarTrecho(
    feature,
    layer
  ) {

    layer.bindPopup(
      criarPopupSSDMT(
        feature
      )
    );

    layer.on({

      mouseover: (
        evento
      ) => {

        evento.target.setStyle({
          weight: 6,
          opacity: 1,
        });

        evento.target.bringToFront();
      },

      mouseout: (
        evento
      ) => {

        evento.target.setStyle({
          weight: 3,
          opacity: 0.85,
        });
      },

      click: () => {

        console.log(
          "🗺️ Trecho SSDMT selecionado:",
          feature?.properties
        );

      },

    });
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <>
      {/* ==================================================
          SSDMT
      ================================================== */}

      {ssdmt && (

        <GeoJSON
          key="bdgd-ssdmt"
          data={ssdmt}
          style={estiloSSDMT}
          onEachFeature={
            aoCriarTrecho
          }
        />

      )}

      {/* ==================================================
          PONNOT
      ================================================== */}

      {ponnot?.features?.map(
        (
          feature,
          indice
        ) => {

          const propriedades =
            feature?.properties || {};

          const geometry =
            feature?.geometry;

          if (!geometry) {
            return null;
          }

          if (
            geometry.type !==
            "Point"
          ) {

            return null;
          }

          const coordenadas =
            geometry.coordinates;

          if (
            !Array.isArray(
              coordenadas
            ) ||
            coordenadas.length < 2
          ) {

            return null;
          }

          const longitude =
            Number(
              coordenadas[0]
            );

          const latitude =
            Number(
              coordenadas[1]
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

          const id =
            propriedades.COD_ID ??
            `ponnot-${indice}`;

          return (

            <CircleMarker
              key={`ponnot-${id}-${indice}`}
              center={[
                latitude,
                longitude,
              ]}
              radius={5}
              pathOptions={{
                color: "#ffffff",
                weight: 1,
                fillColor: "#ff9800",
                fillOpacity: 1,
              }}
            >

              <Popup>

                <div
                  style={{
                    minWidth: 220,
                    fontFamily:
                      "Arial, sans-serif",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      marginBottom: 8,
                      color: "#ef6c00",
                    }}
                  >
                    📍 Ponto PONNOT
                  </div>

                  <div>
                    <strong>
                      COD_ID:
                    </strong>{" "}
                    {propriedades.COD_ID ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Tipo:
                    </strong>{" "}
                    {propriedades.TIP_INST ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Posição:
                    </strong>{" "}
                    {propriedades.POS ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Estrutura:
                    </strong>{" "}
                    {propriedades.ESTR ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Material:
                    </strong>{" "}
                    {propriedades.MAT ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Condutor:
                    </strong>{" "}
                    {propriedades.ESF ??
                      "-"}
                  </div>

                  <div>
                    <strong>
                      Situação:
                    </strong>{" "}
                    {propriedades.SITCONT ??
                      "-"}
                  </div>

                  <hr />

                  <div>
                    <strong>
                      Latitude:
                    </strong>{" "}
                    {latitude.toFixed(
                      7
                    )}
                  </div>

                  <div>
                    <strong>
                      Longitude:
                    </strong>{" "}
                    {longitude.toFixed(
                      7
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#666",
                    }}
                  >
                    BDGD • CMG01C4
                  </div>

                </div>

              </Popup>

            </CircleMarker>

          );
        }
      )}
    </>
  );
}