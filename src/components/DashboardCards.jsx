import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";

import PlaceIcon from "@mui/icons-material/Place";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ScheduleIcon from "@mui/icons-material/Schedule";

import useCoiStore from "../core/store/coiStore";

function DashboardCards() {
  const { ocorrencias } = useCoiStore();

  // Calcula dinamicamente as ocorrências ativas e críticas com base no store
  const totalOcorrencias = ocorrencias ? ocorrencias.length : 4;
  const ocorrenciasCriticas = ocorrencias
    ? ocorrencias.filter((o) => o.severidade === "CRITICA" || o.impacto?.hospitais > 0).length
    : 2;

  const cards = [
    {
      valor: "120",
      titulo: "Pontos Monitorados",
      detalhe: "Rede elétrica supervisionada",
      icone: <PlaceIcon fontSize="inherit" />,
      cor: "#2196f3",
    },
    {
      valor: String(totalOcorrencias).padStart(2, "0"),
      titulo: "Ocorrências Ativas",
      detalhe: `${String(ocorrenciasCriticas).padStart(2, "0")} críticas`,
      icone: <WarningAmberIcon fontSize="inherit" />,
      cor: "#ef4444",
    },
    {
      valor: "08",
      titulo: "Equipes em Campo",
      detalhe: "Atendimento operacional",
      icone: <EngineeringIcon fontSize="inherit" />,
      cor: "#22c55e",
    },
    {
      valor: "05 min",
      titulo: "Tempo Médio",
      detalhe: "Normalização DEC",
      icone: <ScheduleIcon fontSize="inherit" />,
      cor: "#f59e0b",
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid
          key={card.titulo}
          size={{
            xs: 12,
            sm: 6,
            lg: 3,
          }}
        >
          <Card
            sx={{
              background: "#111d2d",
              color: "#fff",
              border: "1px solid #24364d",
              borderRadius: 3,
              height: 120,
              transition: "0.25s",
              "&:hover": {
                borderColor: card.cor,
                boxShadow: `0 0 20px ${card.cor}55`,
                transform: "translateY(-3px)",
              },
            }}
          >
            <CardContent
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                "&:last-child": { pb: 2 }, // Evita padding excessivo padrão do MUI CardContent
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}
                >
                  {card.titulo}
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{ my: 0.5 }}
                >
                  {card.valor}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748b",
                  }}
                >
                  {card.detalhe}
                </Typography>
              </Box>

              <Box
                sx={{
                  color: card.cor,
                  fontSize: 45,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {card.icone}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default DashboardCards;