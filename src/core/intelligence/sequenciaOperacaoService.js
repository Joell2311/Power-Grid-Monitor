// =====================================================
// SERVIÇO DE SEQUÊNCIA DE OPERAÇÃO
// COI Monitor
// Gera o plano de manobras / folha de manobra passo a passo
// =====================================================

export function gerarSequenciaOperacao(dadosManobra) {
    if (!dadosManobra) {
        return {
            sucesso: false,
            mensagem: "Dados de manobra ausentes para a geração da sequência.",
            passos: []
        };
    }

    const {
        equipamento,
        alimentadorOrigem,
        alimentadorDestino,
        trechoIsolado
    } = dadosManobra;

    const passos = [];
    let ordem = 1;

    // Passo 1: Confirmação e verificação do equipamento
    passos.push({
        ordem: ordem++,
        acao: "VERIFICAR",
        elemento: equipamento || "Equipamento de Interligação",
        descricao: `Confirmar status e comando remoto do equipamento ${equipamento || "de manobra"}.`
    });

    // Passo 2: Isolamento do trecho com defeito
    if (trechoIsolado) {
        passos.push({
            ordem: ordem++,
            acao: "ABRIR",
            elemento: `Trecho ${trechoIsolado}`,
            descricao: `Abrir o trecho ou chave seccionadora para isolar a falha no alimentador ${alimentadorOrigem || "de origem"}.`
        });
    } else {
        passos.push({
            ordem: ordem++,
            acao: "ABRIR",
            elemento: alimentadorOrigem || "Disjuntor de Origem",
            descricao: `Abrir o trecho ou disjuntor do alimentador afetado (${alimentadorOrigem || "Origem"}).`
        });
    }

    // Passo 3: Fechamento do religador/chave de interligação
    passos.push({
        ordem: ordem++,
        acao: "FECHAR",
        elemento: equipamento || "Chave/Religador de Interligação",
        descricao: `Realizar o fechamento do equipamento de interligação para permitir a transferência de carga.`
    });

    // Passo 4: Normalização da carga no alimentador de destino
    passos.push({
        ordem: ordem++,
        acao: "NORMALIZAR",
        elemento: alimentadorDestino || "Alimentador de Suporte",
        descricao: `Confirmar a transferência e a estabilização da carga no alimentador de suporte (${alimentadorDestino || "Destino"}).`
    });

    // Passo 5: Acompanhamento de carregamento
    passos.push({
        ordem: ordem++,
        acao: "MONITORAR",
        elemento: "GERAL",
        descricao: "Acompanhar os patamares de corrente e restrições térmicas pós-manobra na tela do COI."
    });

    return {
        sucesso: true,
        totalPassos: passos.length,
        passos
    };
}