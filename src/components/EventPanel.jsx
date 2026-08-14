import { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Divider,
  TextField,
  Button,
  Stack,
  Chip,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalculateIcon from "@mui/icons-material/Calculate";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";

import useCoiStore from "../core/store/coiStore";

function EventPanel() {
  const { ocorrenciaAtiva } = useCoiStore();

  const [correnteAtual, setCorrenteAtual] = useState("");
  const [correnteTrecho, setCorrenteTrecho] = useState("");
  const [resultado, setResultado] = useState(null);

  const capacidade = 350;

  function calcularManobra() {
    const correnteDesligadaNum = Number(correnteAtual) || 0;
    const correnteTrechoNum = Number(correnteTrecho) || 0;

    const total = correnteDesligadaNum + correnteTrechoNum;
    const percentual = Math.round((total / capacidade) * 100);

    setResultado({
      corrente: total,
      percentual,
      permitida: percentual <= 80
    });
  }

  // Dados dinâmicos da ocorrência ativa ou fallback seguro
  const alimentador = ocorrenciaAtiva?.alimentador || "CMG-01C4";
  const subestacao = ocorrenciaAtiva?.subestacao || "Camaragibe";
  const totalClientes = ocorrenciaAtiva?.impacto?.clientesAfetados || 3567;
  const hospital = ocorrenciaAtiva?.impacto?.hospitais || 1;
  const grupoA = ocorrenciaAtiva?.impacto?.grupoA || "analisar";

  return (
    <Paper
      elevation={3}
      sx={{
        height: "100%",
        p: 2.5,
        bgcolor: "#111d2d",
        color: "#fff",
        borderRadius: 3,
        border: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        ⚠️ Análise da Ocorrência
      </Typography>

      <Divider
        sx={{
          bgcolor: "#334155",
          my: 2
        }}
      />

      <Stack direction="row" spacing={1.5}>
        <Chip
          color="error"
          icon={<WarningAmberIcon />}
          label="Alimentador Desligado"
          size="small"
          sx={{ fontWeight: "bold" }}
        />
        <Chip
          color="info"
          label="13,8 kV"
          size="small"
          sx={{ fontWeight: "bold" }}
        />
      </Stack>

      <Box sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Alimentador:</strong> {alimentador}
        </Typography>
        <Typography variant="body2">
          <strong>Subestação:</strong> {subestacao}
        </Typography>
      </Box>

      <Divider
        sx={{
          bgcolor: "#334155"
        }}
      />

      <Typography
        variant="subtitle2"
        fontWeight="bold"
        sx={{ mt: 2, color: "#38bdf8" }}
      >
        Impacto em Clientes
      </Typography>
      <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="body2">👥 Total: {totalClientes.toLocaleString("pt-BR")} clientes</Typography>
        <Typography variant="body2">🏥 Hospital: {hospital}</Typography>
        <Typography variant="body2">🏢 Grupo A: {grupoA}</Typography>
      </Box>

      <Divider
        sx={{
          bgcolor: "#334155",
          my: 2
        }}
      />

      <Typography
        variant="subtitle2"
        fontWeight="bold"
        color="primary.light"
      >
        Medições do Operador
      </Typography>

      <Stack spacing={2} mt={1.5}>
        <TextField
          label="Corrente desligada (A)"
          type="number"
          value={correnteAtual}
          inputProps={{ min: 0 }}
          onChange={(e) => setCorrenteAtual(e.target.value)}
          fullWidth
          size="small"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          sx={{ input: { color: "#fff" }, label: { color: "#94a3b8" } }}
        />

        <TextField
          label="Corrente trecho destino (A)"
          type="number"
          value={correnteTrecho}
          inputProps={{ min: 0 }}
          onChange={(e) => setCorrenteTrecho(e.target.value)}
          fullWidth
          size="small"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          sx={{ input: { color: "#fff" }, label: { color: "#94a3b8" } }}
        />
      </Stack>

      <Divider
        sx={{
          bgcolor: "#334155",
          my: 2
        }}
      />

      <Typography
        variant="subtitle2"
        fontWeight="bold"
        color="primary.light"
      >
        💡 Resultado da Manobra
      </Typography>

      <Box sx={{ my: 1.5, p: 1.5, bgcolor: "#1e293b", borderRadius: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Capacidade do trecho: <strong>{capacidade} A</strong>
        </Typography>

        {resultado ? (
          <Stack spacing={1}>
            <Typography variant="body2">
              Corrente após manobra: <strong>{resultado.corrente.toLocaleString("pt-BR")} A</strong>
            </Typography>

            <Typography variant="body2">
              Utilização: <strong>{resultado.percentual}%</strong>
            </Typography>

            <Chip
              sx={{ mt: 1, fontWeight: "bold", width: "100%" }}
              color={resultado.permitida ? "success" : "error"}
              label={
                resultado.permitida
                  ? "MANOBRA PERMITIDA"
                  : "EXCEDE LIMITE OPERACIONAL"
              }
            />
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
            Informe as correntes e clique em calcular para simular.
          </Typography>
        )}
      </Box>

      <Button
        variant="contained"
        color="warning"
        startIcon={<CalculateIcon />}
        endIcon={<ElectricBoltIcon />}
        size="medium"
        sx={{
          mt: "auto",
          fontWeight: "bold",
          py: 1
        }}
        onClick={calcularManobra}
      >
        Calcular Capacidade do Trecho
      </Button>
    </Paper>
  );
}

export default EventPanel;