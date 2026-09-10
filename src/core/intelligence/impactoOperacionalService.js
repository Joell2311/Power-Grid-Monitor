// =====================================================
// IMPACTO OPERACIONAL DA OCORRÊNCIA
// COI Monitor
// Integrado com o Database oficial
// =====================================================

import { trechos } from "../database/trechos.js";
import { clientesCriticos } from "../database/clientesCriticos.js";

export function calcularImpactoOperacional(ocorrencia) {
  if (!ocorrencia) {
    return null;
  }

  const impacto = ocorrencia.impacto || {};
  const alimentadorAlvo = ocorrencia.alimentador;

  // Calcula ou soma automaticamente com base nos trechos e clientes críticos do alimentador no database
  let somaClientes = 0;
  let hospitaisCount = 0;
  let escolasCount = 0;
  let grupoACount = 0;
  let saneamentoCount = 0;

  if (alimentadorAlvo) {
    // Soma os clientes dos trechos daquele alimentador
    const trechosAlimentador = trechos.filter(t => t.alimentador === alimentadorAlvo);
    trechosAlimentador.forEach(t => {
      somaClientes += (t.clientes || 0);
    });

    // Filtra os clientes críticos daquele alimentador para somar as prioridades de forma exata
    const criticosAlimentador = clientesCriticos.filter(c => c.alimentador === alimentadorAlvo);
    criticosAlimentador.forEach(c => {
      const tipo = (c.tipo || "").toUpperCase();
      if (tipo === "HOSPITAL") hospitaisCount++;
      if (tipo === "ESCOLA") escolasCount++;
      if (tipo === "SANEAMENTO") saneamentoCount++;
      if (tipo === "GRUPO_A" || tipo === "INDUSTRIAL") grupoACount++;
    });
  }

  const clientes = Number(
    impacto.clientesAfetados || 
    ocorrencia.clientesAfetados || 
    somaClientes || 
    0
  );

  const hospitais = Number(impacto.hospitais || hospitaisCount);
  const escolas = Number(impacto.escolas || escolasCount);
  const grupoA = Number(impacto.grupoA || grupoACount);
  const saneamento = Number(impacto.saneamento || saneamentoCount);

  const dec = Number(
    (
      impacto.decEstimado || 
      ocorrencia.dec || 
      "15min"
    )
    .toString()
    .replace("min", "")
  );

  let pontos = 0;

  if (clientes > 3000) {
    pontos += 30;
  } else if (clientes > 1000) {
    pontos += 20;
  } else if (clientes > 300) {
    pontos += 10;
  } else if (clientes > 0) {
    pontos += 5;
  }

  if (hospitais > 0) {
    pontos += 30;
  }

  if (grupoA >= 2) {
    pontos += 20;
  } else if (grupoA === 1) {
    pontos += 10;
  }

  if (escolas > 0) {
    pontos += 5;
  }

  if (saneamento > 0) {
    pontos += 10;
  }

  if (dec > 10) {
    pontos += 15;
  } else if (dec > 5) {
    pontos += 10;
  } else {
    pontos += 5;
  }

  let classificacao;

  if (hospitais > 0 || pontos >= 80) {
    classificacao = "CRÍTICA";
  } else if (pontos >= 50) {
    classificacao = "ALTA";
  } else if (pontos >= 30) {
    classificacao = "MÉDIA";
  } else {
    classificacao = "BAIXA";
  }

  return {
    pontuacao: pontos,
    classificacao,
    dados: {
      clientes,
      hospitais,
      grupoA,
      escolas,
      saneamento,
      dec
    }
  };
}