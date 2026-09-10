import { useState } from "react";
import {
  Paper,
  Typography,
  Divider,
  Button,
  Box,
  Chip,
  IconButton,
  Collapse,
  Tooltip
} from "@mui/material";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import ManobraForm from "./ManobraForm";
import useCoiStore from "../core/store/coiStore";
import { calcularImpactoOperacional } from "../core/intelligence/impactoOperacionalService";
import { buscarTrechosAlimentador } from "../services/grafoRedeService";

function normalizarCoordenadas(raw) {
  if (!raw) return null;
  if (!Array.isArray(raw)) {
    const lat = raw.latitude ?? raw.lat;
    const lng = raw.longitude ?? raw.lng;
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return [Number(lat), Number(lng)];
    }
    return null;
  }
  if (Array.isArray(raw[0])) {
    const lat = raw[0][0];
    const lng = raw[0][1];
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return [Number(lat), Number(lng)];
    }
  }
  if (raw.length >= 2 && !isNaN(raw[0]) && !isNaN(raw[1])) {
    return [Number(raw[0]), Number(raw[1])];
  }
  return null;
}

function OccurrencePanel() {
  const { ocorrenciaAtiva: ocorrenciaStore, focarMapa, painelFixado, toggleFixarPainel } = useCoiStore();
  const ocorrenciaAtiva = ocorrenciaStore;

  // Estado local para recolher/expandir caso não esteja fixado
  const [expandido, setExpandido] = useState(true);

  if (!ocorrenciaAtiva) return null;

  const impacto = calcularImpactoOperacional(ocorrenciaAtiva);

  const handleLocalizarNoMapa = () => {
    let coordsNormalizadas = null;

    if (ocorrenciaAtiva.coordenadas || ocorrenciaAtiva.localizacao) {
      coordsNormalizadas = normalizarCoordenadas(
        ocorrenciaAtiva.coordenadas || ocorrenciaAtiva.localizacao
      );
    }

    if (!coordsNormalizadas && ocorrenciaAtiva.alimentador) {
      const trechosAlim = buscarTrechosAlimentador(ocorrenciaAtiva.alimentador);
      const trechoAlvo = trechosAlim?.find(t => t.interligacao) || trechosAlim?.[0];
      
      if (trechoAlvo) {
        coordsNormalizadas = normalizarCoordenadas(trechoAlvo.coordenadas);
      }
    }

    if (!coordsNormalizadas) {
      const mapasCoords = {
        "CMG-01C4": [-8.05428, -34.98131],
        "CMG-01C3": [-8.05800, -34.97500],
        "CMG-01C2": [-8.05000, -34.98500],
        "CMG-01C6": [-8.06200, -34.97000]
      };
      coordsNormalizadas = mapasCoords[ocorrenciaAtiva.alimentador] || [-8.05428, -34.98131];
    }

    focarMapa(coordsNormalizadas, 16);
  };

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: "#111d2d",
        color: "#fff",
        borderRadius: 3,
        height: "auto",
        minHeight: "auto",
        overflowY: "auto",
        boxShadow: 4,
        border: "1px solid #1e293b"
      }}
    >
      {/* CABEÇALHO DO PAINEL COM BOTÃO DE FIXAR */}
<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
  <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
    Detalhes
  </Typography>

        {/* Botão de Fixar / Desfixar */}
        <Tooltip title={painelFixado ? "Painel Fixado (Clique para soltar)" : "Painel Solto (Clique para fixar)"}>
          <IconButton 
            onClick={toggleFixarPainel} 
            sx={{ color: painelFixado ? "#38bdf8" : "#94a3b8", mr: 1 }}
          >
            {painelFixado ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Botão de Recolher/Expandir */}
        <Tooltip title={expandido ? "Recolher painel" : "Expandir painel"}>
          <IconButton 
            onClick={() => setExpandido(!expandido)} 
            sx={{ color: "#fff" }}
          >
            {expandido ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ my: 1.5, bgcolor: "#334155" }} />

      {/* CONTEÚDO QUE CONTrai/EXPANDE */}
      <Collapse in={expandido}>
        <Typography sx={{ mb: 1 }}>
          <b>Alimentador:</b> {ocorrenciaAtiva.alimentador}
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <b>Equipamento:</b> {ocorrenciaAtiva.equipamento ?? "A5577"}
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <b>Causa:</b> {ocorrenciaAtiva.causa ?? "Falha no trecho de rede"}
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <b>Clientes afetados:</b> {(impacto?.dados?.clientes ?? 0).toLocaleString("pt-BR")}
        </Typography>

        {impacto?.dados?.hospitais > 0 && (
          <Typography sx={{ color: "#f87171", mb: 1 }}>
            🏥 Hospitais afetados: {impacto.dados.hospitais}
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<LocationOnIcon />}
          sx={{ mt: 1, width: "100%" }}
          onClick={handleLocalizarNoMapa}
        >
          Localizar no mapa
        </Button>

        {/* ================= IMPACTO OPERACIONAL ================= */}
        <Box
          sx={{
            mt: 2.5,
            p: 2,
            borderRadius: 2,
            bgcolor:
              impacto?.classificacao === "CRÍTICA"
                ? "#450a0a"
                : impacto?.classificacao === "ALTA"
                ? "#7c2d12"
                : "#172554"
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            ⚠️ Impacto Operacional
          </Typography>

          <Divider sx={{ my: 1.5, bgcolor: "#475569" }} />

          <Chip
            label={impacto?.classificacao || "NORMAL"}
            color={
              impacto?.classificacao === "CRÍTICA"
                ? "error"
                : impacto?.classificacao === "ALTA"
                ? "warning"
                : "info"
            }
            sx={{ mb: 1.5 }}
          />

          <Typography variant="body2"><b>Pontuação:</b> {impacto?.pontuacao ?? 0}/100</Typography>
          <Typography variant="body2"><b>Clientes:</b> {(impacto?.dados?.clientes ?? 0).toLocaleString("pt-BR")}</Typography>
          <Typography variant="body2"><b>Hospitais:</b> {impacto?.dados?.hospitais ?? 0}</Typography>
          <Typography variant="body2"><b>Grupo A:</b> {impacto?.dados?.grupoA ?? 0}</Typography>
          <Typography variant="body2"><b>Escolas:</b> {impacto?.dados?.escolas ?? 0}</Typography>
          <Typography variant="body2"><b>DEC:</b> {impacto?.dados?.dec ?? 0} min</Typography>
        </Box>

        {/* ================= MANOBRA ================= */}
        <Box sx={{ mt: 2.5 }}>
          <ManobraForm ocorrencia={ocorrenciaAtiva} />
        </Box>
      </Collapse>
    </Paper>
  );
}

export default OccurrencePanel;