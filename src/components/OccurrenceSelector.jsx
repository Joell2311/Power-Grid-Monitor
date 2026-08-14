import useCoiStore from "../core/store/coiStore";

import {
  Paper,
  Typography,
  Chip,
  Box,
  Stack,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { calcularImpactoOperacional } from "../core/intelligence/impactoOperacionalService";

function OccurrenceSelector({

  ocorrencias = []

}) {

  const iniciarOcorrencia =
    useCoiStore(
      state => state.iniciarOcorrencia
    );

  const ocorrenciaAtiva =
    useCoiStore(
      state => state.ocorrenciaAtiva
    );

  function corPrioridade(prioridade){

    if(prioridade === "CRÍTICA"){
      return "error";
    }

    if(prioridade === "ALTA"){
      return "warning";
    }

    return "info";

  }

  return (

    <Paper

      elevation={3}

      sx={{

        p:2,

        bgcolor:"#111d2d",

        color:"#fff",

        borderRadius:3,

        height:"100%"

      }}

    >

      <Typography

        variant="h6"

        fontWeight="bold"

        sx={{

          mb:2

        }}

      >

        🚨 Ocorrências Ativas

      </Typography>

      <Stack

        spacing={1.5}

      >

      {

        ocorrencias.map((item) => {

          // Calcula dinamicamente o impacto e os clientes do alimentador
          const impactoCalculado = calcularImpactoOperacional(item);
          const totalClientes = impactoCalculado?.dados?.clientes ?? 0;
          const classificacao = impactoCalculado?.classificacao ?? "NORMAL";

          return (

            <Box

              key={item.id}

              onClick={()=>{

                iniciarOcorrencia(item)

              }}

              sx={{

                cursor:"pointer",

                p:1.5,

                borderRadius:2,

                backgroundColor:

                  ocorrenciaAtiva?.id === item.id

                  ?

                  "#1e3a5f"

                  :

                  "#0f1b2a",

                border:

                  ocorrenciaAtiva?.id === item.id

                  ?

                  "1px solid #38bdf8"

                  :

                  "1px solid transparent",

                "&:hover":{

                  backgroundColor:"#162b43"

                }

              }}

            >

              <Box

                sx={{

                  display:"flex",

                  alignItems:"center",

                  justifyContent:"space-between",

                  gap:1

                }}

              >

                <Box>

                  <Typography

                    fontWeight="bold"

                  >

                    {item.alimentador ?? "Sem alimentador"}

                  </Typography>

                  <Typography

                    variant="body2"

                    sx={{

                      color:"#94a3b8"

                    }}

                  >

                  {

                    totalClientes
                    .toLocaleString("pt-BR")

                  }

                  {" "}clientes afetados

                  </Typography>

                </Box>

                <Chip

                  icon={<WarningAmberIcon/>}

                  label={classificacao}

                  size="small"

                  color={corPrioridade(classificacao)}

                />

              </Box>

            </Box>

          );

        })

      }

      </Stack>

    </Paper>

  );

}

export default OccurrenceSelector;