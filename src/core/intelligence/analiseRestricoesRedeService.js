// =====================================================
// SERVIÇO DE ANÁLISE DE RESTRIÇÕES DA REDE
// Integrado com a camada de Database oficial
// =====================================================

import { trechos } from "../database/trechos.js";

export function analisarRestricoesRede({
    alimentadorOrigem,
    alimentadorDestino,
    correnteTransferida
}) {
    const restricoes = [];

    // Busca todos os trechos envolvidos no alimentador de destino no Database
    const caminho = trechos.filter(
        trecho => trecho.alimentador === alimentadorDestino
    );

    caminho.forEach((trecho) => {
        // Usa a corrente atual dinâmica se existir, caso contrário usa a corrente nominal do database
        const correnteBase = trecho.correnteAtual !== undefined 
            ? trecho.correnteAtual 
            : (trecho.correnteNominal || 0);

        const novaCorrente = correnteBase + (correnteTransferida || 0);

        const percentual = (novaCorrente / trecho.capacidade) * 100;

        if (percentual > 80) {
            restricoes.push({
                tipo: percentual > 100 ? "CAPACIDADE_EXCEDIDA" : "ACIMA_LIMITE_OPERACIONAL",
                trecho: trecho.id,
                origem: trecho.origem,
                destino: trecho.destino,
                bitola: trecho.bitola, // Corrigido de trecho.cabo para trecho.bitola (conforme trechos.js)
                capacidade: trecho.capacidade,
                correnteAtual: correnteBase,
                correnteSimulada: novaCorrente,
                carregamento: Number(percentual.toFixed(1)),
                mensagem: percentual > 100
                    ? `Trecho ${trecho.id} ultrapassa a capacidade do cabo ${trecho.bitola}`
                    : `Trecho ${trecho.id} acima do limite operacional recomendado`
            });
        }
    });

    return restricoes;
}