import { create } from "zustand";
import { 
  modeloRede, 
  restaurarEstadoInicial 
} from "../modelo/modeloRede";

const useCoiStore = create((set, get) => ({

    // =========================
    // OCORRÊNCIA ATIVA
    // =========================
    ocorrenciaAtiva: null,

    // =========================
    // RESULTADO DO MOTOR COI
    // =========================
    analiseCOI: null,

    // =========================
    // STATUS OPERACIONAL
    // =========================
    statusOperacao: "NORMAL",

    // =========================
    // ESTADO DA REDE
    // =========================
    alimentadores: {},
    equipamentos: {},
    trechosEstado: {}, // Guarda estados customizados dos trechos (ex: "DESLIGADO", "NORMAL", "DEFEITO")

    // =========================
    // MAPA (CONTROLE DE ZOOM E FOCO)
    // =========================
    coordenadasMapa: null,
    zoomMapa: 15,

    // =========================
    // CONTROLE DO PAINEL LATERAL
    // =========================
    painelFixado: true,
    toggleFixarPainel: () => set((state) => ({ painelFixado: !state.painelFixado })),

    // =========================
    // MANOBRAS EXECUTADAS
    // =========================
    manobras: [],

    // =========================
    // HISTÓRICO OPERACIONAL
    // =========================
    historicoOcorrencias: [],

    // =========================
    // INICIAR OCORRÊNCIA (Foca o mapa e marca o trecho em vermelho/DEFEITO)
    // =========================
    iniciarOcorrencia: (ocorrencia) => {
        const trechosAtuais = get().trechosEstado;
        const novosTrechos = { ...trechosAtuais };

        if (ocorrencia.trechoId) {
            novosTrechos[ocorrencia.trechoId] = "DEFEITO";
        }

        set({
            ocorrenciaAtiva: ocorrencia,
            analiseCOI: null,
            statusOperacao: "ATENÇÃO",
            trechosEstado: novosTrechos,
            coordenadasMapa: ocorrencia.coordenadas || ocorrencia.posicao || null,
            zoomMapa: 16
        });
    },

    // =========================
    // SALVAR ANÁLISE DO MOTOR COI
    // =========================
    salvarAnalise: (resultado) => {
        set({
            analiseCOI: resultado
        });
    },

    // =========================
    // ATUALIZAR STATUS OPERACIONAL
    // =========================
    atualizarStatus: (status) => {
        set({
            statusOperacao: status
        });
    },

    // =========================
    // FOCAR MAPA (LOCALIZAR NO MAPA)
    // =========================
    focarMapa: (coordenadas, zoom = 16) => {
        set({
            coordenadasMapa: coordenadas,
            zoomMapa: zoom
        });
    },

    // =========================
    // ATUALIZAR ESTADO DO TRECHO
    // =========================
    atualizarEstadoTrecho: (trechoId, estado) => set((state) => ({
        trechosEstado: {
            ...state.trechosEstado,
            [trechoId]: estado
        }
    })),

    // =========================
    // ATUALIZAR ALIMENTADOR
    // =========================
    atualizarAlimentador: (id, dados) => {
        set((state) => ({
            alimentadores: {
                ...state.alimentadores,
                [id]: {
                    ...state.alimentadores[id],
                    ...dados
                }
            }
        }));
    },

    // =========================
    // ATUALIZAR EQUIPAMENTO (Sincronizado com o modeloRede)
    // =========================
    atualizarEquipamento: (id, dados) => {
        if (dados.status === "DESLIGADO") {
            modeloRede.desligarEquipamento(id);
        } else if (dados.status === "LIGADO") {
            modeloRede.ligarEquipamento(id);
        }

        set((state) => ({
            equipamentos: {
                ...state.equipamentos,
                [id]: {
                    ...state.equipamentos[id],
                    ...dados
                }
            }
        }));
    },

    // =========================
    // VALIDAR NORMALIZAÇÃO USANDO O MOTOR CENTRAL
    // =========================
    verificarNormalizacaoRede: (trechoId, corrente) => {
        const resultado = modeloRede.analisarNormalizacao(trechoId, corrente);
        set({ analiseCOI: resultado });
        return resultado;
    },

    // =========================
    // REGISTRAR MANOBRA
    // =========================
    registrarManobra: (manobra) => {
        set((state) => ({
            manobras: [
                ...state.manobras,
                {
                    ...manobra,
                    horario: new Date()
                }
            ]
        }));
    },

    // =========================
    // REGISTRAR HISTÓRICO
    // =========================
    registrarHistorico: (ocorrencia) => {
        set((state) => ({
            historicoOcorrencias: [
                ...state.historicoOcorrencias,
                {
                    ...ocorrencia,
                    horario: new Date()
                }
            ]
        }));
    },

    // =========================
    // LIMPAR ANÁLISE
    // =========================
    limparAnalise: () => {
        set({
            analiseCOI: null
        });
    },

    // =========================
    // FINALIZAR OCORRÊNCIA
    // =========================
    finalizarOcorrencia: () => {
        set({
            ocorrenciaAtiva: null,
            analiseCOI: null,
            statusOperacao: "NORMAL",
            trechosEstado: {}
        });
    },

    // =========================
    // RESETAR REDE (INTEGRAÇÃO COMPLETA)
    // =========================
    resetarRedeCompleta: () => {
        restaurarEstadoInicial();
        set({
            ocorrenciaAtiva: null,
            analiseCOI: null,
            statusOperacao: "NORMAL",
            trechosEstado: {},
            manobras: [],
            coordenadasMapa: null
        });
    }

}));

export default useCoiStore;