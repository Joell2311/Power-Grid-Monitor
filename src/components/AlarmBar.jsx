import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import useCoiStore from "../core/store/coiStore";

const drawerWidth = 250;

function AlarmBar() {
  const { ocorrencias, ocorrenciaAtiva, selecionarOcorrencia } = useCoiStore();

  // Prioriza a ocorrência ativa se for crítica, ou busca a primeira crítica da lista
  const ocorrenciaAlerta = ocorrenciaAtiva?.severidade === "CRITICA" || ocorrenciaAtiva?.status === "DESLIGADO"
    ? ocorrenciaAtiva
    : ocorrencias?.find((o) => o.severidade === "CRITICA" || o.status === "DESLIGADO") || ocorrencias?.[0];

  // Se não houver ocorrências críticas ou ativas, oculta a barra para não poluir a tela
  if (!ocorrenciaAlerta) {
    return null;
  }

  const alimentador = ocorrenciaAlerta.alimentador || "CMG-01C4";
  const clientes = ocorrenciaAlerta.impacto?.clientesAfetados 
    ? ocorrenciaAlerta.impacto.clientesAfetados.toLocaleString("pt-BR") 
    : "3.567";
  const horario = ocorrenciaAlerta.horario || "19:42";

  return (
    <Box
      sx={{
        ml: `${drawerWidth}px`,
        px: 2,
        py: 1,
        bgcolor: "#081420",
      }}
    >
      <Alert
        severity="error"
        icon={<WarningAmberIcon />}
        sx={{
          alignItems: "center",
          borderRadius: 2,
          bgcolor: "#8b0000",
          color: "#fff",
          "& .MuiAlert-icon": {
            color: "#fff",
          },
        }}
        action={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Chip
              icon={<AccessTimeIcon />}
              label={horario}
              size="small"
              sx={{
                bgcolor: "#ffffff22",
                color: "#fff",
                fontWeight: "bold",
              }}
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => selecionarOcorrencia(ocorrenciaAlerta)}
              sx={{
                bgcolor: "#fff",
                color: "#b00000",
                fontWeight: "bold",
                "&:hover": {
                  bgcolor: "#f2f2f2",
                },
              }}
            >
              Detalhes
            </Button>
          </Box>
        }
      >
        <AlertTitle
          sx={{
            fontWeight: "bold",
            color: "#fff",
            mb: 0.5,
          }}
        >
          {alimentador} DESLIGADO
        </AlertTitle>

        {clientes} clientes interrompidos • Prioridade Alta
      </Alert>
    </Box>
  );
}

export default AlarmBar;