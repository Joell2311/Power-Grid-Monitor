import {
  Paper,
  Typography,
  Divider,
  Chip,
  Stack,
  Alert,
} from "@mui/material";

import BoltIcon from "@mui/icons-material/Bolt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

function ManobraSimulation({
  ocorrencia,
  alimentadores = []
}) {
  // Validação defensiva robusta
  if (!ocorrencia || !ocorrencia.manobra) {
    return null;
  }

  const alternativa = alimentadores.find(
    (item) => item.nome === ocorrencia.manobra.alternativa
  );

  if (!alternativa) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          bgcolor: "#111d2d",
          color: "#fff",
          borderRadius: 3,
          border: "1px solid #1e293b"
        }}
      >
        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
          Não foi encontrada alternativa de transferência.
        </Typography>
      </Paper>
    );
  }

  // Conversão segura para números e prevenção de divisão por zero
  const correnteAtual = Number(alternativa.corrente) || 0;
  const incrementoCorrente = Number(ocorrencia.manobra.correnteAtual) || 0;
  const novaCorrente = correnteAtual + incrementoCorrente;
  
  const capacidade = Number(alternativa.capacidade) || 1; 
  const carregamento = Math.round((novaCorrente / capacidade) * 100);

  // RN01 Ajustado: A manobra é sempre permitida se não estourar 100%, 
  // mas gera um estado de alerta/atenção se ultrapassar 80%.
  const permitido = carregamento <= 100;
  const requerAlerta = carregamento > 80 && carregamento <= 100;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: "#111d2d",
        color: "#fff",
        borderRadius: 3,
        border: "1px solid #1e293b"
      }}
    >
      <Typography
        variant="h6"
        fontWeight="bold"
      >
        ⚡ Simulação de Manobra
      </Typography>

      <Divider
        sx={{
          my: 1.5,
          bgcolor: "#334155"
        }}
      />

      <Stack spacing={1}>
        <Typography variant="body2">
          <strong>Origem:</strong>{" "}
          {ocorrencia.alimentador || "N/D"}
        </Typography>

        <Typography variant="body2">
          <strong>Transferência:</strong>{" "}
          {alternativa.nome}
        </Typography>

        <Typography variant="body2">
          <strong>Corrente atual:</strong>{" "}
          {correnteAtual.toLocaleString("pt-BR")} A
        </Typography>

        <Typography variant="body2">
          <strong>Nova corrente:</strong>{" "}
          {novaCorrente.toLocaleString("pt-BR")} A
        </Typography>

        <Typography variant="body2">
          <strong>Capacidade:</strong>{" "}
          {capacidade.toLocaleString("pt-BR")} A
        </Typography>

        <Typography variant="body2">
          <strong>Carregamento:</strong>{" "}
          <span style={{ color: requerAlerta ? "#facc15" : "#4ade80", fontWeight: "bold" }}>
            {carregamento}%
          </span>
        </Typography>
      </Stack>

      {/* Alerta visual dinâmico (RN01) */}
      {requerAlerta && (
        <Alert 
          severity="warning" 
          icon={<WarningAmberIcon />}
          sx={{ mt: 2, bgcolor: "#fef08a", color: "#713f12", fontWeight: "medium" }}
        >
          <strong>ALERTA RN01:</strong> Carga acima de 80%. Manobra permitida, requer monitoramento ativo!
        </Alert>
      )}

      <Chip
        icon={<BoltIcon />}
        label={
          !permitido
            ? "MANOBRA BLOQUEADA (Sobrecarga > 100%)"
            : requerAlerta
            ? "MANOBRA PERMITIDA (Com Alerta de Carga)"
            : "MANOBRA APROVADA"
        }
        color={
          !permitido
            ? "error"
            : requerAlerta
            ? "warning"
            : "success"
        }
        sx={{
          mt: 2,
          width: "100%",
          fontWeight: "bold",
        }}
      />
    </Paper>
  );
}

export default ManobraSimulation;