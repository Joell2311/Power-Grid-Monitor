// =====================================================
// MÓDULO DE CAPACIDADE DA REDE
// COI Monitor
// Responsável por consultas e validações de capacidade
// física e elétrica dos trechos e alimentadores.
// =====================================================

import { trechos } from "../database/trechos.js";
import { alimentadores } from "../database/alimentadores.js";

/**
 * Verifica a capacidade de um trecho específico considerando uma carga adicional.
 * @param {string} trechoId - ID do trecho (ex: "T002")
 * @param {number} correnteAdicional - Corrente extra a ser injetada (em Amperes)
 */
export function verificarCapacidadeTrecho(trechoId, correnteAdicional = 0) {
    const trecho = trechos.find(t => t.id === trechoId);

    if (!trecho) {
        return {
            encontrado: false,
            mensagem: `Trecho ${trechoId} não encontrado no database.`
        };
    }

    const correnteBase = trecho.correnteAtual !== undefined 
        ? trecho.correnteAtual 
        : (trecho.correnteNominal || 0);

    const correnteTotalSimulada = correnteBase + Number(correnteAdicional);
    const percentualCarregamento = (correnteTotalSimulada / trecho.capacidade) * 100;

    return {
        encontrado: true,
        trechoId: trecho.id,
        alimentador: trecho.alimentador,
        bitola: trecho.bitola,
        capacidadeNominal: trecho.capacidade,
        correnteAtual: correnteBase,
        correnteSimulada: correnteTotalSimulada,
        carregamentoPercentual: Number(percentualCarregamento.toFixed(1)),
        disponivel: percentualCarregamento <= 100,
        margemRestante: Math.max(0, trecho.capacidade - correnteTotalSimulada)
    };
}

/**
 * Obtém os dados gerais de capacidade e identifica o trecho mais crítico de um alimentador.
 * @param {string} codigoAlimentador - Código do alimentador (ex: "CMG-01C4")
 */
export function obterCapacidadeAlimentador(codigoAlimentador) {
    const alimentador = alimentadores.find(a => a.codigo === codigoAlimentador);

    if (!alimentador) {
        return null;
    }

    const trechosAlimentador = trechos.filter(t => t.alimentador === codigoAlimentador);
    
    let trechoCritico = null;
    let maiorCarregamento = 0;

    trechosAlimentador.forEach(trecho => {
        const corrente = trecho.correnteNominal || 0;
        const perc = (corrente / trecho.capacidade) * 100;
        
        if (perc > maiorCarregamento) {
            maiorCarregamento = perc;
            trechoCritico = trecho;
        }
    });

    return {
        codigo: alimentador.codigo,
        subestacao: alimentador.subestacao,
        capacidadeNominal: alimentador.capacidade.nominal,
        unidade: alimentador.capacidade.unidade,
        totalTrechos: trechosAlimentador.length,
        trechoMaisCritico: trechoCritico ? {
            id: trechoCritico.id,
            bitola: trechoCritico.bitola,
            capacidade: trechoCritico.capacidade,
            correnteNominal: trechoCritico.correnteNominal,
            carregamento: Number(maiorCarregamento.toFixed(1))
        } : null
    };
}