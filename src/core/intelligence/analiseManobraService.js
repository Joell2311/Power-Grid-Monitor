// =====================================================
// SERVIÇO DE ANÁLISE DE MANOBRA COI
// Responsável por formatar decisão operacional
// =====================================================

import { executarMotorCOI } from "./motorCOI.js";

export function analisarManobra({
    correnteDesligado,
    correnteAtualDestino,
    alimentadorOrigem,
    alimentadorDestino,
    equipamento
}) {
    const resultado = executarMotorCOI({
        alimentador: alimentadorOrigem,
        equipamento,
        manobra: {
            correnteDesligado,
            correnteDestino: correnteAtualDestino
        }
    });

    if (!resultado) {
        return {
            permitido: false,
            motivo: "Motor COI não retornou resultado."
        };
    }

    /*
    =================================================
    MANOBRA NEGADA
    =================================================
    */
    if (!resultado.permitido) {
        return {
            permitido: false,
            motivo: resultado.motivo || "Manobra não permitida.",
            carregamento: resultado.carregamento || 0,
            correnteTotal: resultado.correnteFinal || 0,
            trechoLimitante: resultado.trechoLimitante || null,
            justificativas: resultado.justificativas || []
        };
    }

    /*
    =================================================
    MANOBRA APROVADA / EM ATENÇÃO (RN01)
    =================================================
    */
    const trecho = resultado.trechoLimitante || {};
    const equipamentoResultado = resultado.equipamento || {};
    const carregamentoAtual = resultado.carregamento || 0;
    
    // RN01: Ultrapassar 80% permite a manobra, mas exige monitoramento ativo (Nível ATENÇÃO)
    const requerAlerta = carregamentoAtual > 80;
    const nivelCalculado = requerAlerta ? "ATENÇÃO" : (resultado.nivel || "NORMAL");

    return {
        permitido: true,
        nivel: nivelCalculado,
        requerAlerta,
        carregamento: carregamentoAtual,
        correnteTotal: resultado.correnteFinal || 0,

        trechoLimitante: {
            id: trecho.id || "-",
            bitola: trecho.cabo || "-",
            capacidade: trecho.capacidade || 0,
            alimentador: trecho.alimentador || "-"
        },

        recomendacao: {
            avaliacao: {
                classificacao: nivelCalculado === "NORMAL" ? "RECOMENDADA" : "ATENÇÃO",
                nota: carregamentoAtual >= 100 ? 0 : 100 - carregamentoAtual
            },

            equipamento: equipamentoResultado.plaqueta || equipamento || "-",
            trecho: trecho.id || "-",
            alimentadorDestino: alimentadorDestino || trecho.alimentadorDestino || "-",

            justificativas: [
                ...(requerAlerta ? [`ALERTA RN01: Carregamento de ${carregamentoAtual}% ultrapassa o limite recomendado de 80%. Requer monitoramento ativo.`] : []),
                ...(resultado.justificativas || [])
            ],

            sequencia: [
                `Confirmar comando remoto do equipamento ${equipamentoResultado.plaqueta || equipamento || "-"}`,
                "Abrir trecho isolado da falta",
                `Fechar interligação ${equipamentoResultado.plaqueta || equipamento || "-"}`,
                `Transferir carga para ${alimentadorDestino || "-"}`,
                requerAlerta 
                    ? "⚠️ ATENÇÃO (RN01): Monitorar ativamente a evolução da carga pós-manobra (>80%)"
                    : "Monitorar carregamento pós-manobra"
            ]
        },

        motivo: requerAlerta
            ? `Recomposição permitida, mas requer monitoramento ativo devido ao carregamento de ${carregamentoAtual}% superior a 80% (RN01).`
            : "Recomposição calculada pelo Motor COI."
    };
}