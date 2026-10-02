// ==========================================================
// COI STORE
// POWER GRID MONITOR
// ==========================================================
//
// Estado global da operação:
//
// - ocorrência ativa
// - validação do equipamento na BDGD
// - análise operacional
// - análise de recomposição
// - estado dos equipamentos
// - estado dos trechos
// - estado dos alimentadores
// - correntes operacionais
// - manobras
// - histórico
// - foco do mapa
//
// ==========================================================

import { create } from "zustand";

import {
    restaurarEstadoInicial,

    desligarEquipamento,
    ligarEquipamento,

    analisarNormalizacao,
    analisarRecomposicaoOcorrencia,

    executarManobraEquipamento,

    consultarEstadoEquipamento as consultarEstadoEquipamentoModelo,

    atualizarEstadoEquipamento,

    validarEquipamentoBDGD,

    obterFichaCompletaEquipamento,

    atualizarCorrenteAlimentador,
    consultarCorrenteAlimentador,

    atualizarCorrenteTrecho,
    consultarCorrenteTrecho
} from "../modelo/modeloRede";


// ==========================================================
// UTILITÁRIOS
// ==========================================================

function normalizarId(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    return String(valor).trim();
}


function normalizarTexto(valor) {

    return normalizarId(valor)
        .toUpperCase();
}


/**
 * Normaliza a chave usada pelo Zustand para representar
 * o equipamento.
 *
 * Exemplos:
 *
 * 10060794
 * 10060794M
 * 10060794M-154
 *
 * tornam-se:
 *
 * 10060794
 */
function normalizarChaveEquipamento(valor) {

    const texto =
        normalizarId(valor)
            .toUpperCase();

    if (!texto) {
        return "";
    }

    return texto
        .replace(/[^A-Z0-9_-]/g, "")
        .replace(/M-\d+$/i, "")
        .replace(/M$/i, "");
}


/**
 * Mantém também o ID original para diagnóstico.
 */
function criarRegistroEquipamento(
    equipamentoId,
    estado,
    extras = {}
) {

    const idOriginal =
        normalizarId(
            equipamentoId
        );

    const id =
        normalizarChaveEquipamento(
            equipamentoId
        ) ||
        idOriginal;

    return {

        equipamentoId:
            id,

        equipamentoIdOriginal:
            idOriginal,

        estado:
            normalizarTexto(
                estado
            ),

        atualizadoEm:
            new Date().toISOString(),

        ...extras
    };
}


/**
 * Converte valores para número somente quando existe
 * efetivamente um número informado.
 *
 * Nunca converte vazio/null para zero.
 */
function converterNumeroOuNull(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return null;
    }

    const texto =
        String(valor)
            .trim()
            .replace(",", ".");

    if (!texto) {
        return null;
    }

    const numero =
        Number(texto);

    if (
        !Number.isFinite(numero)
    ) {
        return null;
    }

    return numero;
}


// ==========================================================
// RESOLVER EQUIPAMENTO DO DESARME
// ==========================================================

function obterCodigoEquipamentoDesarme(
    ocorrencia
) {

    if (!ocorrencia) {
        return "";
    }

    return normalizarId(

        ocorrencia?.equipamentoDesarme ??

        ocorrencia?.equipamentoDesarmeId ??

        ocorrencia?.equipamentoProtecao ??

        ocorrencia?.equipamentoQueDesarmou ??

        ocorrencia?.equipamento ??

        ""
    );
}


// ==========================================================
// RESOLVER ALIMENTADOR
// ==========================================================

function obterAlimentadorOcorrencia(
    ocorrencia
) {

    if (!ocorrencia) {
        return null;
    }

    return (

        ocorrencia?.alimentadorEquipamento ??

        ocorrencia?.alimentador ??

        ocorrencia?.alimentadorOrigem ??

        null
    );
}


// ==========================================================
// CONSTRUIR OC VALIDADA
// ==========================================================

function prepararOcorrencia(
    ocorrencia
) {

    if (!ocorrencia) {

        return {

            ocorrencia:
                null,

            validacao:
                null
        };
    }


    const codigoEquipamento =
        obterCodigoEquipamentoDesarme(
            ocorrencia
        );


    const alimentador =
        obterAlimentadorOcorrencia(
            ocorrencia
        );


    // ------------------------------------------------------
    // Nenhum equipamento informado
    // ------------------------------------------------------

    if (!codigoEquipamento) {

        const validacao = {

            valido:
                false,

            existeBDGD:
                false,

            inconsistente:
                true,

            inconsistenciaAlimentador:
                false,

            motivo:
                "A ocorrência não possui equipamento de desarme informado."
        };


        return {

            ocorrencia: {

                ...ocorrencia,

                equipamentoDesarme:
                    null,

                equipamentoDesarmeId:
                    null,

                equipamentoBDGD:
                    null,

                equipamentoValidacao:
                    validacao,

                fichaEquipamento:
                    null,

                alimentadorEquipamento:
                    null,

                tipoEquipamento:
                    null,

                tipUnid:
                    null
            },

            validacao
        };
    }


    // ------------------------------------------------------
    // Validar diretamente na BDGD
    // ------------------------------------------------------

    let validacao;


    try {

        validacao =
            validarEquipamentoBDGD(
                codigoEquipamento,
                alimentador
            );

    } catch (erro) {

        console.error(
            "[COI Store] Erro ao validar equipamento na BDGD:",
            erro
        );


        validacao = {

            valido:
                false,

            existeBDGD:
                false,

            inconsistente:
                true,

            inconsistenciaAlimentador:
                false,

            codigoInformado:
                codigoEquipamento,

            motivo:
                "Não foi possível validar o equipamento na BDGD."
        };
    }


    // ------------------------------------------------------
    // Equipamento não validado
    // ------------------------------------------------------

    if (
        !validacao?.valido
    ) {

        return {

            ocorrencia: {

                ...ocorrencia,

                equipamento:
                    codigoEquipamento,

                equipamentoDesarme:
                    codigoEquipamento,

                equipamentoDesarmeId:
                    codigoEquipamento,

                equipamentoBDGD:
                    validacao?.equipamento ??
                    null,

                equipamentoValidacao:
                    validacao,

                fichaEquipamento:
                    validacao?.ficha ??
                    null,

                alimentadorEquipamento:
                    validacao?.alimentadorBDGD ??
                    null,

                tipoEquipamento:
                    validacao?.ficha?.tipo ??
                    null,

                tipUnid:
                    validacao?.ficha?.tipUnid ??
                    null,

                estadoEquipamento:
                    "DADO_INDISPONIVEL",

                equipamentoValidadoBDGD:
                    false
            },

            validacao
        };
    }


    // ------------------------------------------------------
    // Equipamento real
    // ------------------------------------------------------

    const equipamentoBDGD =
        validacao.equipamento ||
        null;


    const ficha =
        validacao.ficha ||
        null;


    const estadoCadastral =

        ficha?.situacao ??

        equipamentoBDGD?.situacao ??

        equipamentoBDGD?.estado ??

        equipamentoBDGD?.status ??

        null;


    // ------------------------------------------------------
    // Ocorrência preparada
    // ------------------------------------------------------

    const ocorrenciaPreparada = {

        ...ocorrencia,

        equipamento:
            codigoEquipamento,

        equipamentoDesarme:
            codigoEquipamento,

        equipamentoDesarmeId:
            codigoEquipamento,

        equipamentoBDGD,

        equipamentoValidacao:
            validacao,

        fichaEquipamento:
            ficha,

        equipamentoValidadoBDGD:
            true,

        alimentadorEquipamento:

            validacao?.alimentadorBDGD ??

            ficha?.alimentador ??

            null,

        circuitoEquipamento:
            ficha?.circuito ??
            null,

        tipoEquipamento:
            ficha?.tipo ??
            null,

        tipUnid:
            ficha?.tipUnid ??
            null,

        plaquetaEquipamento:

            ficha?.plaqueta ??

            equipamentoBDGD?.plaqueta ??

            null,

        estadoEquipamento:
            estadoCadastral ??
            "FECHADO",

        estadoOperacionalInicial:
            "ABERTO",

        manobra: {

            ...(ocorrencia?.manobra || {}),

            equipamentoInterligacao:
                null,

            correnteDesligado:

                converterNumeroOuNull(
                    ocorrencia?.manobra?.correnteDesligado
                ),

            correnteDestino:

                converterNumeroOuNull(
                    ocorrencia?.manobra?.correnteDestino
                )
        }
    };


    return {

        ocorrencia:
            ocorrenciaPreparada,

        validacao
    };
}


// ==========================================================
// STORE
// ==========================================================

const useCoiStore =
    create(
        (set, get) => ({

            // ==================================================
            // OCORRÊNCIA
            // ==================================================

            ocorrenciaAtiva:
                null,


            // ==================================================
            // RESULTADO DA ANÁLISE
            // ==================================================

            analiseCOI:
                null,


            // ==================================================
            // STATUS
            // ==================================================

            statusOperacao:
                "NORMAL",


            // ==================================================
            // HISTÓRICO
            // ==================================================

            historicoOcorrencias:
                [],


            // ==================================================
            // ESTADO OPERACIONAL LOCAL
            // ==================================================

            alimentadores:
                {},

            equipamentos:
                {},

            trechosEstado:
                {},


            // ==================================================
            // MAPA
            // ==================================================

            coordenadasMapa:
                null,

            zoomMapa:
                15,

            painelFixado:
                true,


            // ==================================================
            // MANOBRAS
            // ==================================================

            manobras:
                [],


            // ==================================================
            // CONTROLES
            // ==================================================

            toggleFixarPainel:
                () =>

                    set(
                        (state) => ({

                            painelFixado:
                                !state.painelFixado
                        })
                    ),


            // ==================================================
            // INICIAR OCORRÊNCIA
            // ==================================================

            iniciarOcorrencia:
                (ocorrencia) => {

                    if (!ocorrencia) {

                        set({

                            ocorrenciaAtiva:
                                null,

                            analiseCOI:
                                null,

                            statusOperacao:
                                "NORMAL",

                            manobras:
                                []
                        });


                        return {

                            sucesso:
                                false,

                            motivo:
                                "Ocorrência não informada."
                        };
                    }


                    const preparado =
                        prepararOcorrencia(
                            ocorrencia
                        );


                    const ocorrenciaPreparada =
                        preparado.ocorrencia;


                    const validacao =
                        preparado.validacao;


                    const equipamentoId =
                        normalizarChaveEquipamento(

                            ocorrenciaPreparada
                                ?.equipamentoDesarmeId
                        );


                    const estadoInicial =
                        normalizarTexto(

                            ocorrenciaPreparada
                                ?.estadoOperacionalInicial ||

                            "ABERTO"
                        );


                    // ------------------------------------------------
                    // Equipamento não validado
                    // ------------------------------------------------

                    if (
                        !validacao?.valido
                    ) {

                        set(
                            (state) => ({

                                ocorrenciaAtiva:
                                    ocorrenciaPreparada,

                                analiseCOI:
                                    null,

                                statusOperacao:

                                    validacao?.existeBDGD

                                        ? "ERRO_CADASTRO"

                                        : "EQUIPAMENTO_NAO_VALIDADO",

                                equipamentos:

                                    equipamentoId

                                        ? {

                                            ...state.equipamentos,

                                            [equipamentoId]:
                                                estadoInicial

                                        }

                                        : state.equipamentos,

                                manobras:
                                    []
                            })
                        );


                        return {

                            sucesso:
                                false,

                            ocorrencia:
                                ocorrenciaPreparada,

                            validacao,

                            mensagem:

                                validacao?.motivo ||

                                "Equipamento da ocorrência não foi validado na BDGD."
                        };
                    }


                    // ------------------------------------------------
                    // Equipamento validado
                    // ------------------------------------------------

                    set(
                        (state) => ({

                            ocorrenciaAtiva:
                                ocorrenciaPreparada,

                            analiseCOI:
                                null,

                            statusOperacao:
                                "OCORRENCIA",

                            equipamentos:

                                equipamentoId

                                    ? {

                                        ...state.equipamentos,

                                        [equipamentoId]:
                                            "ABERTO"

                                    }

                                    : state.equipamentos,

                            manobras:
                                []
                        })
                    );


                    // ------------------------------------------------
                    // Histórico
                    // ------------------------------------------------

                    set(
                        (state) => ({

                            historicoOcorrencias: [

                                ...state.historicoOcorrencias,

                                {

                                    tipo:
                                        "OC_INICIADA",

                                    ocorrenciaId:
                                        ocorrenciaPreparada?.id ??
                                        null,

                                    equipamento:
                                        equipamentoId ||
                                        null,

                                    equipamentoValidadoBDGD:
                                        true,

                                    timestamp:
                                        new Date().toISOString(),

                                    ocorrencia:
                                        ocorrenciaPreparada
                                }
                            ]
                        })
                    );


                    return {

                        sucesso:
                            true,

                        ocorrencia:
                            ocorrenciaPreparada,

                        validacao,

                        mensagem:
                            "Ocorrência iniciada e equipamento validado na BDGD."
                    };
                },


            // ==================================================
            // ANALISAR RECOMPOSIÇÃO
            // ==================================================

            analisarRecomposicao:
                (opcoes = {}) => {

                    const state =
                        get();


                    const ocorrencia =
                        state.ocorrenciaAtiva;


                    if (!ocorrencia) {

                        const resultado = {

                            sucesso:
                                false,

                            status:
                                "SEM_OCORRENCIA",

                            mensagem:
                                "Não existe ocorrência ativa para analisar.",

                            candidatos:
                                []
                        };


                        set({

                            analiseCOI:
                                resultado
                        });


                        return resultado;
                    }


                    const correnteDesligado =
                        converterNumeroOuNull(

                            opcoes?.correnteDesligado ??

                            ocorrencia?.manobra
                                ?.correnteDesligado
                        );


                    const correnteDestino =
                        converterNumeroOuNull(

                            opcoes?.correnteDestino ??

                            ocorrencia?.manobra
                                ?.correnteDestino
                        );


                    const ocorrenciaParaAnalise = {

                        ...ocorrencia,

                        manobra: {

                            ...(ocorrencia?.manobra || {}),

                            equipamentoInterligacao:
                                null,

                            correnteDesligado,

                            correnteDestino
                        }
                    };


                    let resultado;


                    try {

                        resultado =
                            analisarRecomposicaoOcorrencia(

                                ocorrenciaParaAnalise,

                                {

                                    ...opcoes,

                                    correnteDesligado,

                                    correnteDestino
                                }
                            );

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro no motor de recomposição:",

                            erro
                        );


                        resultado = {

                            sucesso:
                                false,

                            status:
                                "ERRO_MOTOR",

                            mensagem:
                                "Ocorreu um erro durante a análise de recomposição.",

                            erro:
                                erro?.message ??
                                String(erro),

                            candidatos:
                                []
                        };
                    }


                    set({

                        ocorrenciaAtiva:
                            ocorrenciaParaAnalise,

                        analiseCOI:
                            resultado
                    });


                    set(
                        (current) => ({

                            historicoOcorrencias: [

                                ...current.historicoOcorrencias,

                                {

                                    tipo:
                                        "ANALISE_RECOMPOSICAO",

                                    ocorrenciaId:
                                        ocorrenciaParaAnalise?.id ??
                                        null,

                                    equipamentoDesarme:

                                        ocorrenciaParaAnalise
                                            ?.equipamentoDesarme ??
                                        null,

                                    correnteDesligado,

                                    correnteDestino,

                                    status:
                                        resultado?.status ??
                                        null,

                                    quantidadeCandidatos:

                                        resultado
                                            ?.quantidadeCandidatos ??
                                        0,

                                    timestamp:
                                        new Date().toISOString()
                                }
                            ]
                        })
                    );


                    return resultado;
                },


            // ==================================================
            // SALVAR ANÁLISE
            // ==================================================

            salvarAnalise:
                (analise) => {

                    set({

                        analiseCOI:
                            analise ||
                            null
                    });
                },


            // ==================================================
            // ATUALIZAR STATUS
            // ==================================================

            atualizarStatus:
                (status) => {

                    set({

                        statusOperacao:
                            status ||
                            "NORMAL"
                    });
                },


            // ==================================================
            // FOCO MAPA
            // ==================================================

            focarMapa:
                (
                    coordenadas,
                    zoom = 17
                ) => {

                    if (!coordenadas) {
                        return;
                    }

                    set({

                        coordenadasMapa:
                            coordenadas,

                        zoomMapa:
                            zoom
                    });
                },


            // ==================================================
            // TRECHO
            // ==================================================

            atualizarEstadoTrecho:
                (
                    trechoId,
                    estado
                ) => {

                    if (
                        trechoId ===
                            undefined ||
                        trechoId ===
                            null
                    ) {
                        return;
                    }


                    set(
                        (state) => ({

                            trechosEstado: {

                                ...state.trechosEstado,

                                [String(
                                    trechoId
                                )]:
                                    estado
                            }
                        })
                    );
                },


            // ==================================================
            // ALIMENTADOR
            // ==================================================

            atualizarAlimentador:
                (
                    alimentadorId,
                    estado
                ) => {

                    if (!alimentadorId) {
                        return;
                    }


                    const id =
                        String(
                            alimentadorId
                        )
                            .trim()
                            .toUpperCase();


                    set(
                        (state) => ({

                            alimentadores: {

                                ...state.alimentadores,

                                [id]:
                                    estado
                            }
                        })
                    );
                },


            // ==================================================
            // EQUIPAMENTO
            // ==================================================
            //
            // Atualização manual/externa.
            //
            // Para uma manobra real, utilizar
            // executarManobra().
            //
            // ==================================================

            atualizarEquipamento:
                (
                    equipamentoId,
                    estado
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {
                        return null;
                    }


                    const id =
                        normalizarChaveEquipamento(
                            equipamentoId
                        );


                    if (!id) {
                        return null;
                    }


                    const estadoNormalizado =
                        normalizarTexto(
                            estado
                        );


                    try {

                        atualizarEstadoEquipamento(

                            equipamentoId,

                            estadoNormalizado,

                            {

                                origem:
                                    "COI_STORE"
                            }
                        );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Não foi possível atualizar o modelo operacional:",

                            erro
                        );
                    }


                    set(
                        (state) => ({

                            equipamentos: {

                                ...state.equipamentos,

                                [id]:
                                    estadoNormalizado
                            }
                        })
                    );


                    return {

                        sucesso:
                            true,

                        equipamentoId:
                            id,

                        estado:
                            estadoNormalizado
                    };
                },


            // ==================================================
            // CONSULTAR EQUIPAMENTO
            // ==================================================

            consultarEstadoEquipamento:
                (
                    equipamentoId
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {
                        return null;
                    }


                    try {

                        return consultarEstadoEquipamentoModelo(
                            equipamentoId
                        );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Erro ao consultar estado do equipamento:",

                            erro
                        );


                        return null;
                    }
                },


            // ==================================================
            // CONSULTAR FICHA
            // ==================================================

            consultarFichaEquipamento:
                (
                    equipamentoId
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {
                        return null;
                    }


                    try {

                        return obterFichaCompletaEquipamento(
                            equipamentoId
                        );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Erro ao consultar ficha do equipamento:",

                            erro
                        );


                        return null;
                    }
                },


            // ==================================================
            // VALIDAR EQUIPAMENTO BDGD
            // ==================================================

            validarEquipamentoBDGD:
                (
                    equipamentoId,
                    alimentador = null
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {

                        return {

                            valido:
                                false,

                            existeBDGD:
                                false,

                            inconsistente:
                                true,

                            motivo:
                                "Equipamento não informado."
                        };
                    }


                    try {

                        return validarEquipamentoBDGD(

                            equipamentoId,

                            alimentador
                        );

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro na validação BDGD:",

                            erro
                        );


                        return {

                            valido:
                                false,

                            existeBDGD:
                                false,

                            inconsistente:
                                true,

                            motivo:
                                "Erro durante a validação do equipamento na BDGD."
                        };
                    }
                },


            // ==================================================
            // CORRENTE DO ALIMENTADOR
            // ==================================================

            atualizarCorrenteAlimentador:
                (
                    alimentadorId,
                    corrente
                ) => {

                    try {

                        const resultado =
                            atualizarCorrenteAlimentador(

                                alimentadorId,

                                corrente
                            );


                        if (
                            resultado?.sucesso
                        ) {

                            const id =
                                String(
                                    alimentadorId
                                )
                                    .trim()
                                    .toUpperCase();


                            set(
                                (state) => ({

                                    alimentadores: {

                                        ...state.alimentadores,

                                        [id]:
                                            resultado.corrente
                                    }
                                })
                            );
                        }


                        return resultado;

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao atualizar corrente do alimentador:",

                            erro
                        );


                        return null;
                    }
                },


            consultarCorrenteAlimentador:
                (
                    alimentadorId
                ) => {

                    try {

                        return consultarCorrenteAlimentador(
                            alimentadorId
                        );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Erro ao consultar corrente do alimentador:",

                            erro
                        );


                        return null;
                    }
                },


            // ==================================================
            // CORRENTE DO TRECHO
            // ==================================================

            atualizarCorrenteTrecho:
                (
                    trechoId,
                    corrente
                ) => {

                    try {

                        const resultado =
                            atualizarCorrenteTrecho(

                                trechoId,

                                corrente
                            );


                        if (
                            resultado?.sucesso
                        ) {

                            set(
                                (state) => ({

                                    trechosEstado: {

                                        ...state.trechosEstado,

                                        [String(
                                            trechoId
                                        )]:
                                            resultado.corrente
                                    }
                                })
                            );
                        }


                        return resultado;

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao atualizar corrente do trecho:",

                            erro
                        );


                        return null;
                    }
                },


            consultarCorrenteTrecho:
                (
                    trechoId
                ) => {

                    try {

                        return consultarCorrenteTrecho(
                            trechoId
                        );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Erro ao consultar corrente do trecho:",

                            erro
                        );


                        return null;
                    }
                },


            // ==================================================
            // DESLIGAR EQUIPAMENTO
            // ==================================================

            desligarEquipamento:
                (
                    equipamentoId,
                    contexto = {}
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {
                        return null;
                    }


                    try {

                        const resultado =
                            desligarEquipamento(

                                equipamentoId,

                                contexto
                            );


                        if (
                            resultado?.sucesso
                        ) {

                            const id =
                                normalizarChaveEquipamento(
                                    equipamentoId
                                );


                            const estadoModelo =
                                consultarEstadoEquipamentoModelo(
                                    equipamentoId
                                );


                            const estadoFinal =
                                estadoModelo ||
                                resultado?.estado ||
                                "INDISPONIVEL";


                            set(
                                (state) => ({

                                    equipamentos: {

                                        ...state.equipamentos,

                                        [id]:
                                            estadoFinal
                                    }
                                })
                            );
                        }


                        return resultado;

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao desligar equipamento:",

                            erro
                        );


                        return {

                            sucesso:
                                false,

                            equipamentoId:
                                normalizarId(
                                    equipamentoId
                                ),

                            mensagem:
                                erro?.message ??
                                "Não foi possível desligar o equipamento."
                        };
                    }
                },


            // ==================================================
            // LIGAR EQUIPAMENTO
            // ==================================================

            ligarEquipamento:
                (
                    equipamentoId,
                    contexto = {}
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {
                        return null;
                    }


                    try {

                        const resultado =
                            ligarEquipamento(

                                equipamentoId,

                                contexto
                            );


                        if (
                            resultado?.sucesso
                        ) {

                            const id =
                                normalizarChaveEquipamento(
                                    equipamentoId
                                );


                            const estadoModelo =
                                consultarEstadoEquipamentoModelo(
                                    equipamentoId
                                );


                            const estadoFinal =
                                estadoModelo ||
                                resultado?.estado ||
                                "FECHADO";


                            set(
                                (state) => ({

                                    equipamentos: {

                                        ...state.equipamentos,

                                        [id]:
                                            estadoFinal
                                    }
                                })
                            );
                        }


                        return resultado;

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao ligar equipamento:",

                            erro
                        );


                        return {

                            sucesso:
                                false,

                            equipamentoId:
                                normalizarId(
                                    equipamentoId
                                ),

                            mensagem:
                                erro?.message ??
                                "Não foi possível ligar o equipamento."
                        };
                    }
                },


            // ==================================================
            // EXECUTAR MANOBRA
            // ==================================================
            //
            // ESTA É A FUNÇÃO PRINCIPAL UTILIZADA PELO PAINEL
            // DE MANOBRA.
            //
            // ==================================================

            executarManobra:
                (
                    equipamentoId,
                    acao,
                    contexto = {}
                ) => {

                    if (
                        equipamentoId ===
                            undefined ||
                        equipamentoId ===
                            null
                    ) {

                        return {

                            sucesso:
                                false,

                            status:
                                "EQUIPAMENTO_NAO_INFORMADO",

                            mensagem:
                                "Equipamento não informado."
                        };
                    }


                    const acaoNormalizada =
                        normalizarTexto(
                            acao
                        );


                    if (
                        ![
                            "ABRIR",
                            "FECHAR"
                        ].includes(
                            acaoNormalizada
                        )
                    ) {

                        return {

                            sucesso:
                                false,

                            status:
                                "ACAO_INVALIDA",

                            mensagem:
                                `Ação de manobra inválida: ${acao}.`
                        };
                    }


                    const id =
                        normalizarChaveEquipamento(
                            equipamentoId
                        );


                    if (!id) {

                        return {

                            sucesso:
                                false,

                            status:
                                "EQUIPAMENTO_INVALIDO",

                            mensagem:
                                "Não foi possível identificar o equipamento."
                        };
                    }


                    // ------------------------------------------------
                    // Estado ANTES da manobra
                    // ------------------------------------------------

                    let estadoAntes =
                        null;


                    try {

                        estadoAntes =
                            consultarEstadoEquipamentoModelo(
                                equipamentoId
                            );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Não foi possível consultar estado anterior:",

                            erro
                        );
                    }


                    console.log(
                        "[COI Store] EXECUTAR MANOBRA",
                        {
                            equipamentoId,
                            idNormalizado: id,
                            acao: acaoNormalizada,
                            estadoAntes
                        }
                    );


                    // ------------------------------------------------
                    // Executar no modelo central
                    // ------------------------------------------------

                    let resultado;


                    try {

                        resultado =
                            executarManobraEquipamento(

                                equipamentoId,

                                acaoNormalizada,

                                {

                                    ...contexto,

                                    origem:
                                        contexto?.origem ??
                                        "COI_STORE"
                                }
                            );

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao executar manobra:",

                            erro
                        );


                        resultado = {

                            sucesso:
                                false,

                            status:
                                "ERRO_MANOBRA",

                            equipamentoId:
                                equipamentoId,

                            mensagem:
                                erro?.message ??
                                "Erro ao executar manobra."
                        };
                    }


                    // ------------------------------------------------
                    // Manobra rejeitada
                    // ------------------------------------------------

                    if (
                        !resultado?.sucesso
                    ) {

                        console.warn(

                            "[COI Store] Manobra não executada:",

                            resultado
                        );


                        return resultado;
                    }


                    // ------------------------------------------------
                    // Estado DEPOIS da manobra
                    //
                    // Não assumimos mais simplesmente que
                    // ABRIR = ABERTO / FECHAR = FECHADO.
                    // Consultamos o modelo.
                    // ------------------------------------------------

                    let estadoDepois =
                        null;


                    try {

                        estadoDepois =
                            consultarEstadoEquipamentoModelo(
                                equipamentoId
                            );

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Não foi possível consultar estado após manobra:",

                            erro
                        );
                    }


                    if (!estadoDepois) {

                        estadoDepois =

                            resultado?.estado ??

                            resultado?.estadoResultante ??

                            (
                                acaoNormalizada ===
                                "ABRIR"

                                    ? "ABERTO"

                                    : "FECHADO"
                            );
                    }


                    estadoDepois =
                        normalizarTexto(
                            estadoDepois
                        );


                    // ------------------------------------------------
                    // Atualizar Zustand
                    // ------------------------------------------------

                    set(
                        (state) => ({

                            equipamentos: {

                                ...state.equipamentos,

                                [id]:
                                    estadoDepois
                            },

                            manobras: [

                                ...state.manobras,

                                {

                                    equipamentoId:
                                        id,

                                    equipamentoIdOriginal:
                                        normalizarId(
                                            equipamentoId
                                        ),

                                    acao:
                                        acaoNormalizada,

                                    estadoAnterior:
                                        estadoAntes,

                                    estadoResultante:
                                        estadoDepois,

                                    contexto,

                                    timestamp:
                                        new Date().toISOString(),

                                    resultado
                                }
                            ]
                        })
                    );


                    // ------------------------------------------------
                    // Atualizar ocorrência
                    // ------------------------------------------------

                    const ocorrenciaAtual =
                        get()
                            .ocorrenciaAtiva;


                    const equipamentoRecomendado =

                        get()
                            .analiseCOI
                            ?.recomendacao
                            ?.equipamentoInterligacao;


                    const recomendadoNormalizado =

                        normalizarChaveEquipamento(
                            equipamentoRecomendado
                        );


                    if (
                        ocorrenciaAtual &&

                        recomendadoNormalizado &&

                        recomendadoNormalizado === id
                    ) {

                        set(
                            (state) => ({

                                ocorrenciaAtiva: {

                                    ...state.ocorrenciaAtiva,

                                    manobra: {

                                        ...(state
                                            .ocorrenciaAtiva
                                            ?.manobra || {}),

                                        equipamentoInterligacao:
                                            id,

                                        equipamentoInterligacaoOriginal:
                                            normalizarId(
                                                equipamentoId
                                            ),

                                        ultimaAcao:
                                            acaoNormalizada,

                                        ultimoEstado:
                                            estadoDepois
                                    }
                                }
                            })
                        );
                    }


                    // ------------------------------------------------
                    // Histórico
                    // ------------------------------------------------

                    set(
                        (state) => ({

                            historicoOcorrencias: [

                                ...state
                                    .historicoOcorrencias,

                                {

                                    tipo:
                                        "MANOBRA_EQUIPAMENTO",

                                    equipamento:
                                        id,

                                    equipamentoOriginal:
                                        normalizarId(
                                            equipamentoId
                                        ),

                                    acao:
                                        acaoNormalizada,

                                    estadoAnterior:
                                        estadoAntes,

                                    estadoResultante:
                                        estadoDepois,

                                    sucesso:
                                        true,

                                    contexto,

                                    resultado,

                                    timestamp:
                                        new Date().toISOString()
                                }
                            ]
                        })
                    );


                    console.log(
                        "[COI Store] MANOBRA CONCLUÍDA",
                        {
                            equipamentoId,
                            idNormalizado: id,
                            acao: acaoNormalizada,
                            estadoAntes,
                            estadoDepois
                        }
                    );


                    return {

                        ...resultado,

                        sucesso:
                            true,

                        equipamentoId:
                            id,

                        equipamentoIdOriginal:
                            normalizarId(
                                equipamentoId
                            ),

                        acao:
                            acaoNormalizada,

                        estadoAnterior:
                            estadoAntes,

                        estadoResultante:
                            estadoDepois
                    };
                },


            // ==================================================
            // VERIFICAR NORMALIZAÇÃO
            // ==================================================

            verificarNormalizacaoRede:
                (
                    alimentadorId,
                    contexto = {}
                ) => {

                    try {

                        return analisarNormalizacao(

                            alimentadorId,

                            contexto
                        );

                    } catch (erro) {

                        console.error(

                            "[COI Store] Erro ao analisar normalização:",

                            erro
                        );


                        return null;
                    }
                },


            // ==================================================
            // REGISTRAR MANOBRA
            // ==================================================

            registrarManobra:
                (
                    manobra
                ) => {

                    if (!manobra) {
                        return;
                    }


                    set(
                        (state) => ({

                            manobras: [

                                ...state.manobras,

                                {

                                    ...manobra,

                                    timestamp:

                                        manobra.timestamp ||

                                        new Date()
                                            .toISOString()
                                }
                            ]
                        })
                    );
                },


            // ==================================================
            // REGISTRAR HISTÓRICO
            // ==================================================

            registrarHistorico:
                (
                    evento
                ) => {

                    if (!evento) {
                        return;
                    }


                    const registro = {

                        ...evento,

                        timestamp:

                            evento.timestamp ||

                            new Date()
                                .toISOString()
                    };


                    set(
                        (state) => ({

                            historicoOcorrencias: [

                                ...state
                                    .historicoOcorrencias,

                                registro
                            ]
                        })
                    );
                },


            // ==================================================
            // LIMPAR ANÁLISE
            // ==================================================

            limparAnalise:
                () => {

                    set({

                        analiseCOI:
                            null
                    });
                },


            // ==================================================
            // FINALIZAR OCORRÊNCIA
            // ==================================================

            finalizarOcorrencia:
                () => {

                    const state =
                        get();


                    if (
                        state.ocorrenciaAtiva
                    ) {

                        set(
                            (current) => ({

                                historicoOcorrencias: [

                                    ...current
                                        .historicoOcorrencias,

                                    {

                                        ...current
                                            .ocorrenciaAtiva,

                                        analise:
                                            current
                                                .analiseCOI,

                                        manobras:
                                            current
                                                .manobras,

                                        finalizadaEm:
                                            new Date()
                                                .toISOString()
                                    }
                                ],

                                ocorrenciaAtiva:
                                    null,

                                analiseCOI:
                                    null,

                                statusOperacao:
                                    "NORMAL",

                                manobras:
                                    []
                            })
                        );

                    } else {

                        set({

                            ocorrenciaAtiva:
                                null,

                            analiseCOI:
                                null,

                            statusOperacao:
                                "NORMAL",

                            manobras:
                                []
                        });
                    }
                },


            // ==================================================
            // RESET COMPLETO
            // ==================================================

            resetarRedeCompleta:
                () => {

                    try {

                        restaurarEstadoInicial();

                    } catch (erro) {

                        console.warn(

                            "[COI Store] Erro ao restaurar estado inicial do modelo:",

                            erro
                        );
                    }


                    set({

                        ocorrenciaAtiva:
                            null,

                        analiseCOI:
                            null,

                        statusOperacao:
                            "NORMAL",

                        alimentadores:
                            {},

                        equipamentos:
                            {},

                        trechosEstado:
                            {},

                        coordenadasMapa:
                            null,

                        zoomMapa:
                            15,

                        manobras:
                            []
                    });
                }
        })
    );


// ==========================================================
// EXPORTS
// ==========================================================

export {
    useCoiStore
};

export default useCoiStore;