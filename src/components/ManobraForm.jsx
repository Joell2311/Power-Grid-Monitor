import { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert
} from "@mui/material";

import { buscarInterligacoes } from "../core/modelo/modeloRede";
import { analisarManobra } from "../core/intelligence/analiseManobraService";
import { trechos } from "../core/database/trechos";
import useCoiStore from "../core/store/coiStore";

function ManobraForm({ ocorrencia }) {
  const {
    analiseCOI,
    salvarAnalise,
    registrarManobra,
    atualizarEstadoTrecho
  } = useCoiStore();

  const [interligacoes, setInterligacoes] = useState([]);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [correnteDesligado, setCorrenteDesligado] = useState("");
  const [correnteDestino, setCorrenteDestino] = useState("");
  const [resultado, setResultado] = useState(null);
  
  // Controle de erros de validação visual dos campos
  const [errosValidacao, setErrosValidacao] = useState({
    equipamento: false,
    correnteDesligado: false,
    correnteDestino: false
  });

  // Ao selecionar a Ocorrência: reseta a rede, pinta o trecho afetado e carrega interligações
  useEffect(() => {
    if (ocorrencia) {
      trechos.forEach((t) => {
        atualizarEstadoTrecho(t.id, t.estadoRede || "NORMAL");
      });

      const trechoAfetado = trechos.find(
        (t) => t.alimentador === ocorrencia.alimentador
      );

      if (trechoAfetado) {
        atualizarEstadoTrecho(trechoAfetado.id, "DESLIGADO");
      }

      const lista = buscarInterligacoes(ocorrencia.alimentador);
      setInterligacoes(lista);

      setEquipamentoSelecionado(null);
      setCorrenteDesligado("");
      setCorrenteDestino("");
      setResultado(null);
      setErrosValidacao({ equipamento: false, correnteDesligado: false, correnteDestino: false });
    }
  }, [ocorrencia, atualizarEstadoTrecho]);

  function calcular() {
    const faltaEqp = !equipamentoSelecionado;
    const faltaDesligado = correnteDesligado === "";
    const faltaDestino = correnteDestino === "";

    if (faltaEqp || faltaDesligado || faltaDestino) {
      setErrosValidacao({
        equipamento: faltaEqp,
        correnteDesligado: faltaDesligado,
        correnteDestino: faltaDestino
      });
      setResultado({
        permitido: false,
        motivo: "Preencha todos os campos obrigatórios (equipamento e correntes) para realizar a análise."
      });
      return;
    }

    setErrosValidacao({ equipamento: false, correnteDesligado: false, correnteDestino: false });

    const correnteFalta = Number(correnteDesligado);
    const correnteAtual = Number(correnteDestino);

    const analise = analisarManobra({
      correnteDesligado: correnteFalta,
      correnteAtualDestino: correnteAtual,
      alimentadorOrigem: ocorrencia.alimentador,
      alimentadorDestino: equipamentoSelecionado.alimentadorDestino,
      equipamento: equipamentoSelecionado.plaqueta
    });

    if (analise.permitido) {
      const trechosDoAlimentador = trechos.filter(
        (t) => t.alimentador === ocorrencia.alimentador
      );

      trechosDoAlimentador.forEach((t) => {
        atualizarEstadoTrecho(t.id, "MANOBRA");
      });
    }

    const carregamentoFinal = analise.carregamento || 0;
    const requerAlertaRN01 = carregamentoFinal > 80 && carregamentoFinal <= 100;

    const recomendacao = {
      permitido: analise.permitido,
      classificacao: !analise.permitido ? "NÃO RECOMENDADA" : requerAlertaRN01 ? "ATENÇÃO" : "RECOMENDADA",
      carregamento: carregamentoFinal,
      trechoLimitante: analise.trechoLimitante?.id || "-",
      recomposicao: {
        equipamento: equipamentoSelecionado.plaqueta,
        alimentadorDestino: equipamentoSelecionado.alimentadorDestino
      },
      justificativas: analise.justificativas || [],
      sequencia: [
        `1. Isolar o trecho faltoso no alimentador ${ocorrencia.alimentador}`,
        `2. Fechar o equipamento de interligação ${equipamentoSelecionado.plaqueta}`,
        `3. Transferir a carga para o alimentador ${equipamentoSelecionado.alimentadorDestino}`,
        requerAlertaRN01 ? "4. ⚠️ Monitorar evolução da carga pós-manobra (RN01)" : "4. Confirmar estabilização térmica e normalização dos clientes"
      ],
      motivo: analise.motivo,
      restricoes: analise.restricoes || []
    };

    salvarAnalise({
      impacto: analiseCOI?.impacto || {},
      analise,
      recomendacao
    });

    registrarManobra({
      origem: ocorrencia.alimentador,
      destino: equipamentoSelecionado.alimentadorDestino,
      equipamento: equipamentoSelecionado.plaqueta,
      correnteOrigem: correnteFalta,
      correnteDestino: correnteAtual,
      resultado: analise.permitido ? (requerAlertaRN01 ? "APROVADA COM ALERTA" : "APROVADA") : "BLOQUEADA"
    });

    setResultado({
      ...analise,
      recomendacao,
      requerAlertaRN01
    });
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        bgcolor: "#111d2d",
        color: "#fff",
        borderRadius: 3,
        boxShadow: 4,
        border: "1px solid #1e293b"
      }}
    >
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        ⚡ Análise de Manobra Inteligente
      </Typography>
      <Typography variant="body2" color="grey.400" sx={{ mb: 2 }}>
        Informe os dados de campo para validação da capacidade e bitola dos cabos.
      </Typography>

      <Divider sx={{ mb: 2, bgcolor: "#334155" }} />

      <Stack spacing={2.5}>
        <TextField
          select
          fullWidth
          label="Equipamento de Interligação"
          value={equipamentoSelecionado?.id || ""}
          error={errosValidacao.equipamento}
          onChange={(e) => {
            const eqp = interligacoes.find((item) => item.id === e.target.value);
            setEquipamentoSelecionado(eqp);
            setErrosValidacao((prev) => ({ ...prev, equipamento: false }));
            setResultado(null);
          }}
          sx={{ input: { color: "#fff" }, label: { color: "#94a3b8" } }}
        >
          {interligacoes.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.plaqueta} (Destino: {item.alimentadorDestino})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Corrente do trecho no momento do desarme (A)"
          type="number"
          fullWidth
          value={correnteDesligado}
          error={errosValidacao.correnteDesligado}
          inputProps={{ min: 0 }}
          onChange={(e) => {
            setCorrenteDesligado(e.target.value);
            setErrosValidacao((prev) => ({ ...prev, correnteDesligado: false }));
          }}
          placeholder="Ex: 120"
        />

        <TextField
          label="Corrente atual do trecho receptor/suporte (A)"
          type="number"
          fullWidth
          value={correnteDestino}
          error={errosValidacao.correnteDestino}
          inputProps={{ min: 0 }}
          onChange={(e) => {
            setCorrenteDestino(e.target.value);
            setErrosValidacao((prev) => ({ ...prev, correnteDestino: false }));
          }}
          placeholder="Ex: 150"
        />

        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={calcular}
          sx={{ fontWeight: "bold", py: 1.2 }}
        >
          Analisar Capacidade e Bitola
        </Button>

        {resultado && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "#1e293b", borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Chip
                label={
                  !resultado.permitido 
                    ? "🔴 BLOQUEADA (Excede Limite / Bitola)" 
                    : resultado.requerAlertaRN01 
                    ? "⚠️ PERMITIDA (Alerta > 80%)" 
                    : "🟢 MANOBRA PERMITIDA"
                }
                color={
                  !resultado.permitido 
                    ? "error" 
                    : resultado.requerAlertaRN01 
                    ? "warning" 
                    : "success"
                }
              />
              {resultado.carregamento !== undefined && (
                <Typography variant="body2" color="grey.300">
                  Carga Final: <strong style={{ color: resultado.requerAlertaRN01 ? "#facc15" : "#4ade80" }}>{resultado.carregamento}%</strong>
                </Typography>
              )}
            </Box>

            <Alert 
              severity={!resultado.permitido ? "error" : resultado.requerAlertaRN01 ? "warning" : "success"} 
              sx={{ mb: 2, bgcolor: "transparent", color: "#fff" }}
            >
              {resultado.motivo}
            </Alert>

            {resultado.recomendacao?.sequencia && (
              <>
                <Typography variant="subtitle2" fontWeight="bold" color="primary.light" gutterBottom>
                  📋 Plano de Recomposição Operacional:
                </Typography>
                <List dense sx={{ bgcolor: "#0f172a", borderRadius: 1, p: 1 }}>
                  {resultado.recomendacao.sequencia.map((passo, index) => (
                    <ListItem key={index}>
                      <ListItemText 
                        primary={passo} 
                        slotProps={{
                          primary: { style: { fontSize: "0.85rem", color: "#e2e8f0" } }
                        }} 
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default ManobraForm;