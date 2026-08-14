import { Box } from "@mui/material";
import { useState, useEffect } from "react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import AlarmBar from "../components/AlarmBar";
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

import useCoiStore from "../core/store/coiStore";

function MainLayout() {


  
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] =
    useState(ocorrencias[0]);

  const [localizacaoMapa, setLocalizacaoMapa] =
    useState(null);

  const [recomendacao, setRecomendacao] =
    useState(null);

  const [impactoOperacional, setImpactoOperacional] =
    useState(null);

  /*
  =====================================
  NOVO ESTADO GLOBAL DA SIMULAÇÃO
  =====================================
  */

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
  LOCALIZA OCORRÊNCIA NO MAPA
  =====================================
  */

  function localizarOcorrencia(coordenada) {

    setLocalizacaoMapa(coordenada);

  }

  /*
  =====================================
  MOTOR DE INTELIGÊNCIA OPERACIONAL
  =====================================
  */

  useEffect(() => {

    if (ocorrenciaSelecionada) {

      const resultadoRecomposicao =
        sugerirRecomposicao(ocorrenciaSelecionada);

      setRecomendacao(resultadoRecomposicao);

      const resultadoImpacto =
        calcularImpactoOperacional(
          ocorrenciaSelecionada
        );

      setImpactoOperacional(resultadoImpacto);

    }

  }, [ocorrenciaSelecionada]);

  return (

    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#081420",
      }}
    >

      <Header />

      <Box
        sx={{
          mt: "70px",
          flexShrink: 0,
        }}
      >
       
    
        
      </Box>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >

        <Box
          sx={{
            flexShrink: 0,
          }}
        >
          <Sidebar />
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            overflow: "hidden",
          }}
        >

          <Box
            sx={{
              flexShrink: 0,
            }}
          >
            <DashboardCards />
          </Box>

          <Box
            sx={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              gap: 2,
              overflow: "hidden",
            }}
          >

            {/* MAPA */}

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >

              <MapView
                ocorrencia={ocorrenciaSelecionada}
                localizacaoMapa={localizacaoMapa}
              />

            </Box>

            {/* PAINEL DIREITO */}

            <Box
              sx={{
                width: 380,
                minWidth: 320,
                maxWidth: 420,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flexShrink: 0,
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
                setCorrenteDesligado={setCorrenteDesligado}

                correnteDestino={correnteDestino}
                setCorrenteDestino={setCorrenteDestino}

                equipamentoSelecionado={equipamentoSelecionado}
                setEquipamentoSelecionado={setEquipamentoSelecionado}

                resultadoSimulacao={resultadoSimulacao}
                setResultadoSimulacao={setResultadoSimulacao}
              />


            </Box>

          </Box>

          <Box
            sx={{
              height: 220,
              minHeight: 180,
              flexShrink: 0,
              overflow: "auto",
            }}
          >
            <EventPanel />
          </Box>

        </Box>

      </Box>

    </Box>

  );

}

export default MainLayout;