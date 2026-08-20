import { Box } from "@mui/material";
import { useState, useEffect } from "react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import DashboardCards from "../components/DashboardCards";
import MapView from "../components/MapView";
import OccurrencePanel from "../components/OccurrencePanel";
import EventPanel from "../components/EventPanel";
import OccurrenceSelector from "../components/OccurrenceSelector";

import { ocorrencias } from "../core/database/ocorrencias";

import { sugerirRecomposicao }
from "../core/intelligence/recomposicaoService";

import { calcularImpactoOperacional }
from "../core/intelligence/impactoOperacionalService";

function MainLayout() {

  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] =
    useState(ocorrencias[0]);

  const [localizacaoMapa, setLocalizacaoMapa] =
    useState(null);

  const [recomendacao, setRecomendacao] =
    useState(null);

  const [impactoOperacional, setImpactoOperacional] =
    useState(null);

  const [correnteDesligado, setCorrenteDesligado] =
    useState("");

  const [correnteDestino, setCorrenteDestino] =
    useState("");

  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState(null);

  const [resultadoSimulacao, setResultadoSimulacao] =
    useState(null);

  /*
  =====================================
  CONTROLE DA ANÁLISE
  =====================================
  */

  const [analiseAberta, setAnaliseAberta] =
    useState(false);

  /*
  =====================================
  LOCALIZAR OCORRÊNCIA
  =====================================
  */

  function localizarOcorrencia(coordenada) {
    setLocalizacaoMapa(coordenada);
  }

  /*
  =====================================
  INTELIGÊNCIA OPERACIONAL
  =====================================
  */

  useEffect(() => {

    if (!ocorrenciaSelecionada) {
      return;
    }

    const resultadoRecomposicao =
      sugerirRecomposicao(
        ocorrenciaSelecionada
      );

    setRecomendacao(
      resultadoRecomposicao
    );

    const resultadoImpacto =
      calcularImpactoOperacional(
        ocorrenciaSelecionada
      );

    setImpactoOperacional(
      resultadoImpacto
    );

  }, [ocorrenciaSelecionada]);

  return (

    <Box
      sx={{
        width: "100vw",
        height: "100vh",

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",

        bgcolor: "#081420",
      }}
    >

      {/* =================================
          HEADER
      ================================= */}

      <Header />

      {/* =================================
          ÁREA PRINCIPAL
      ================================= */}

      <Box
        sx={{
          display: "flex",

          flex: 1,

          minHeight: 0,

          overflow: "hidden",
        }}
      >

        {/* =================================
            SIDEBAR
        ================================= */}

        <Box
          sx={{
            flexShrink: 0,

            height: "100%",

            overflow: "hidden",
          }}
        >

          <Sidebar />

        </Box>


        {/* =================================
            CONTEÚDO
        ================================= */}

        <Box
          component="main"
          sx={{
            flex: 1,

            minWidth: 0,
            minHeight: 0,

            display: "flex",
            flexDirection: "column",

            gap: 1.5,

            p: 1.5,

            overflow: "hidden",
          }}
        >

          {/* =================================
              DASHBOARD
          ================================= */}

          <Box
            sx={{
              flexShrink: 0,
            }}
          >

            <DashboardCards />

          </Box>


          {/* =================================
              ÁREA MAPA + OCORRÊNCIAS
          ================================= */}

          <Box
            sx={{
              display: "flex",

              flex: 1,

              minHeight: 0,
              minWidth: 0,

              gap: 1.5,

              overflow: "hidden",
            }}
          >

            {/* ===============================
                MAPA
            =============================== */}

            <Box
              sx={{
                flex: 1,

                minWidth: 0,
                minHeight: 0,

                position: "relative",

                borderRadius: 2,

                overflow: "hidden",
              }}
            >

              <MapView
                ocorrencia={ocorrenciaSelecionada}
                localizacaoMapa={localizacaoMapa}
              />

            </Box>


            {/* ===============================
                PAINEL DIREITO
            =============================== */}

            <Box
              sx={{
                width: {
                  xs: 300,
                  md: 330,
                  lg: 360,
                },

                minWidth: 280,

                maxWidth: 380,

                flexShrink: 0,

                minHeight: 0,

                display: "flex",
                flexDirection: "column",

                gap: 1.5,

                overflow: "auto",
              }}
            >

              <OccurrenceSelector
                ocorrencias={ocorrencias}
                selecionada={ocorrenciaSelecionada}

                onSelect={(item) => {
                  setOcorrenciaSelecionada(item);
                }}
              />

              <OccurrencePanel
                ocorrencia={ocorrenciaSelecionada}

                onLocalizar={localizarOcorrencia}

                recomendacao={recomendacao}
                setRecomendacao={setRecomendacao}

                impacto={impactoOperacional}

                correnteDesligado={correnteDesligado}
                setCorrenteDesligado={
                  setCorrenteDesligado
                }

                correnteDestino={correnteDestino}
                setCorrenteDestino={
                  setCorrenteDestino
                }

                equipamentoSelecionado={
                  equipamentoSelecionado
                }

                setEquipamentoSelecionado={
                  setEquipamentoSelecionado
                }

                resultadoSimulacao={
                  resultadoSimulacao
                }

                setResultadoSimulacao={
                  setResultadoSimulacao
                }
              />

            </Box>

          </Box>


          {/* =================================
              ANÁLISE DA OCORRÊNCIA
          ================================= */}

          <Box
            sx={{
              flexShrink: 0,

              minHeight: 0,

              height: analiseAberta
                ? 220
                : 42,

              transition:
                "height 0.25s ease",

              overflow: "hidden",

              borderRadius: 2,
            }}
          >

            <EventPanel
              aberta={analiseAberta}
              onToggle={() =>
                setAnaliseAberta(
                  (valor) => !valor
                )
              }
            />

          </Box>

        </Box>

      </Box>

    </Box>
  );
}

export default MainLayout;