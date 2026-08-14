/**
 * Motor de Cálculos e Análises Técnicas da Rede Elétrica
 * Contém exclusivamente regras de negócio, limites térmicos e algoritmos de viabilidade.
 * Integrado com a camada de Database oficial.
 */

export const motorCalculos = {

    /**
     * Analisa a viabilidade térmica de normalização comparando a corrente informada com a capacidade da bitola.
     * @param {Object} dadosTrecho - Contém { bitola, capacidade } (Mapeado do Database)
     * @param {number} correnteInformada - Corrente informada pelo operador no momento do desarme
     * @returns {Object} Resultado detalhado da análise e os passos de manobra se viável.
     */
    avaliarNormalizacaoCarga: (dadosTrecho, correnteInformada) => {
        if (!dadosTrecho) {
            return {
                sucesso: false,
                statusAnalise: "ERRO",
                mensagem: "Parâmetros técnicos do trecho ausentes para o cálculo.",
                passosManobra: []
            };
        }

        const { bitola, capacidade } = dadosTrecho;
        // Compatibilidade com propriedades antigas caso venham de mock externo
        const capacidadeMaximaAmperes = capacidade !== undefined ? capacidade : (dadosTrecho.capacidadeMaximaAmperes || 0);

        // Validação estrita de limite térmico da bitola do cabo
        if (correnteInformada > capacidadeMaximaAmperes) {
            return {
                sucesso: false,
                statusAnalise: "SOBRECARGA",
                mensagem: `Nenhuma transferência segura encontrada. A corrente informada (${correnteInformada}A) excede a capacidade máxima suportada pela bitola ${bitola || "desconhecida"} do trecho (${capacidadeMaximaAmperes}A), gerando risco de colapso térmico.`,
                passosManobra: [], // Bloqueia estritamente a geração de passos
                detalhes: {
                    correnteInformada,
                    capacidadeTrecho: capacidadeMaximaAmperes,
                    bitola
                }
            };
        }

        // Se estiver dentro da capacidade, retorna o cálculo viável e o plano de manobra
        return {
            sucesso: true,
            statusAnalise: "VIABILIZADO",
            mensagem: `Transferência e normalização viáveis. A bitola ${bitola || "padrão"} suporta a carga informada (${correnteInformada}A <= ${capacidadeMaximaAmperes}A).`,
            passosManobra: [
                { ordem: 1, acao: "ABRIR", elemento: "DJ_C4", descricao: "Realizar a abertura do disjuntor do alimentador afetado (CMG-01C4)" },
                { ordem: 2, acao: "FECHAR", elemento: "CH_INT_01", descricao: "Realizar o fechamento do equipamento de interligação correspondente" },
                { ordem: 3, acao: "NORMALIZAR", elemento: "TRECHO", descricao: "Transferir e normalizar a carga para o alimentador de suporte (CMG-01C3)" },
                { ordem: 4, acao: "CONFIRMAR", elemento: "GERAL", descricao: "Confirmar estabilização térmica e atendimento aos clientes" }
            ],
            detalhes: {
                correnteInformada,
                capacidadeTrecho: capacidadeMaximaAmperes,
                bitola
            }
        };
    }

};