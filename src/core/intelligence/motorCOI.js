// ==========================================================
// MOTOR DE INTELIGÊNCIA COI
// POWER GRID MONITOR
// ==========================================================
//
// Responsável pela inteligência operacional de recomposição.
//
// ARQUITETURA ATUAL:
//
// Controlador informa:
//   - equipamento do desarme
//   - corrente do trecho no momento do desarme
//   - corrente atual do trecho receptor/suporte
//
// O operador NÃO precisa informar:
//   - equipamento de interligação
//   - alimentador de destino
//
// O motor:
//   1. Valida o equipamento do desarme na BDGD.
//   2. Identifica a área afetada.
//   3. Descobre equipamentos reais de recuperação.
//   4. Analisa PACs e conectividade física.
//   5. Simula a manobra.
//   6. Verifica o caminho elétrico.
//   7. Verifica estado operacional.
//   8. Verifica capacidade do trecho receptor.
//   9. Classifica as alternativas.
//  10. Seleciona a melhor alternativa.
//  11. Gera recomendação operacional.
//
// PRINCÍPIOS:
//
// NÃO inventar corrente.
// NÃO transformar campo vazio em 0 A.
// NÃO criar interligação sintética.
// NÃO aceitar equipamento inexistente na BDGD.
// NÃO transformar equipamento do desarme em interligação.
// NÃO exigir que o operador descubra a interligação.
// NÃO recomendar equipamento indisponível.
// NÃO recomendar equipamento fechado como candidato de
// recuperação automática.
// ==========================================================


import {
    buscarEquipamento,
    validarEquipamentoBDGD,
    consultarEstadoEquipamento,

    // Novo motor de recomposição
    descobrirCandidatosRecomposicao,
    analisarRecomposicaoOcorrencia,

    // APIs legadas mantidas para compatibilidade
    buscarInterligacoes,
    buscarInterligacoesAlimentador
} from "../modelo/modeloRede";


import {
    clientesCriticos
} from "../database/clientesCriticos";


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

    return String(valor)
        .trim();
}


function normalizarTexto(valor) {

    return normalizarId(valor)
        .toUpperCase();
}


function normalizarCodigo(valor) {

    return normalizarTexto(valor)
        .replace(
            /[^A-Z0-9]/g,
            ""
        );
}


// ==========================================================
// NORMALIZAR CÓDIGO DE EQUIPAMENTO
// ==========================================================
//
// Exemplos:
//
// G02722
// 10060794M
// 10060794M-154
//
// A normalização preserva códigos alfanuméricos como G02722,
// mas remove o sufixo operacional M dos identificadores BDGD.
//
// ==========================================================

function normalizarCodigoEquipamento(valor) {

    let codigo =
        normalizarTexto(valor);

    if (!codigo) {
        return "";
    }

    codigo =
        codigo.replace(
            /[^A-Z0-9]/g,
            ""
        );

    const correspondencia =
        codigo.match(
            /^([0-9]+)M[0-9]*$/
        );

    if (
        correspondencia &&
        correspondencia[1]
    ) {

        return correspondencia[1];
    }

    return codigo;
}


// ==========================================================
// CONVERTER CORRENTE
// ==========================================================
//
// Regras:
//
// null / undefined / vazio -> null
// texto inválido -> null
// negativo -> null
//
// Nunca converter ausência de corrente para 0.
//
// ==========================================================

function converterCorrente(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return null;
    }

    const texto =
        String(valor)
            .trim()
            .replace(
                ",",
                "."
            );

    if (!texto) {
        return null;
    }

    const numero =
        Number(texto);

    if (
        !Number.isFinite(
            numero
        )
    ) {

        return null;
    }

    if (
        numero < 0
    ) {

        return null;
    }

    return numero;
}


// ==========================================================
// ARREDONDAR
// ==========================================================

function arredondar(
    valor,
    casas = 2
) {

    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return null;
    }

    const fator =
        10 ** casas;

    return Math.round(
        numero * fator
    ) / fator;
}


// ==========================================================
// OBTER EQUIPAMENTO
// ==========================================================

function obterIdEquipamento(
    item
) {

    if (!item) {
        return null;
    }

    return (
        item?.equipamentoInterligacao ??
        item?.equipamentoIdInterligacao ??
        item?.equipamento?.id ??
        item?.equipamento?.COD_ID ??
        item?.equipamento?.codId ??
        item?.equipamento ??
        item?.id ??
        item?.COD_ID ??
        item?.codId ??
        null
    );
}


function obterPlaquetaEquipamento(
    item
) {

    if (!item) {
        return null;
    }

    return (
        item?.plaqueta ??
        item?.PLAQUETA ??
        item?.plaquetaIPT ??
        item?.PLAQUETA_IPT ??
        item?.equipamento?.plaqueta ??
        item?.equipamento?.PLAQUETA ??
        item?.equipamento?.plaquetaIPT ??
        item?.equipamento?.PLAQUETA_IPT ??
        item?.id ??
        item?.COD_ID ??
        null
    );
}


function obterTipoEquipamento(
    item
) {

    if (!item) {
        return null;
    }

    return (
        item?.tipoEquipamento ??
        item?.tipo ??
        item?.classificacao ??
        item?.equipamento?.tipoEquipamento ??
        item?.equipamento?.tipo ??
        null
    );
}


function obterTipUnid(
    item
) {

    if (!item) {
        return null;
    }

    const candidatos = [

        item?.tipUnid,

        item?.TIP_UNID,

        item?.tip_unid,

        item?.equipamento?.tipUnid,

        item?.equipamento?.TIP_UNID,

        item?.equipamento?.tip_unid

    ];

    for (
        const valor of candidatos
    ) {

        if (
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
        ) {

            const numero =
                Number(
                    valor
                );

            if (
                Number.isFinite(
                    numero
                )
            ) {

                return numero;
            }

            return valor;
        }
    }

    return null;
}


// ==========================================================
// ALIMENTADORES
// ==========================================================

function obterAlimentador(
    item
) {

    if (!item) {
        return null;
    }

    return (
        item?.alimentador ??
        item?.alimentadorOrigem ??
        item?.origem ??
        item?.alimentadorEquipamento ??
        item?.equipamento?.alimentador ??
        item?.equipamento?.alimentadorOrigem ??
        null
    );
}


function obterAlimentadorDestino(
    item
) {

    if (!item) {
        return null;
    }

    return (
        item?.alimentadorDestino ??
        item?.destino ??
        item?.alimentadorReceptor ??
        item?.equipamento?.alimentadorDestino ??
        item?.equipamento?.alimentadorReceptor ??
        null
    );
}


// ==========================================================
// ESTADO
// ==========================================================

function normalizarEstado(
    valor
) {

    const estado =
        normalizarTexto(
            valor
        );

    if (!estado) {
        return null;
    }

    if (
        estado === "FECHADO"
    ) {
        return "FECHADO";
    }

    if (
        estado === "ABERTO"
    ) {
        return "ABERTO";
    }

    if (
        estado === "INDISPONIVEL"
    ) {
        return "INDISPONIVEL";
    }

    if (
        estado === "BYPASSADO"
    ) {
        return "BYPASSADO";
    }

    return estado;
}


function obterEstadoEquipamento(
    item
) {

    if (!item) {
        return null;
    }

    const id =
        normalizarId(
            obterIdEquipamento(
                item
            )
        );

    if (id) {

        try {

            const resultado =
                consultarEstadoEquipamento(
                    id
                );

            if (
                resultado?.estado
            ) {

                return normalizarEstado(
                    resultado.estado
                );
            }

        } catch (erro) {

            console.warn(
                "[Motor COI] Não foi possível consultar estado operacional:",
                erro
            );
        }
    }

    return normalizarEstado(
        item?.estado ??
        item?.estadoOperacional ??
        item?.status ??
        item?.situacao ??
        item?.equipamento?.estado ??
        item?.equipamento?.estadoOperacional ??
        item?.equipamento?.status ??
        null
    );
}


// ==========================================================
// CLIENTES CRÍTICOS
// ==========================================================

export function buscarClientesAfetados(
    trecho
) {

    const alvo =
        normalizarId(
            trecho
        );

    if (!alvo) {
        return [];
    }

    return clientesCriticos.filter(
        cliente =>

            normalizarId(
                cliente?.trecho
            ) === alvo
    );
}


// ==========================================================
// IMPACTO OPERACIONAL
// ==========================================================

export function calcularImpacto(
    ocorrencia
) {

    const clientes =
        buscarClientesAfetados(
            ocorrencia?.trecho
        );

    let pontuacao =
        Number(
            ocorrencia?.clientesAfetados
        ) || 0;

    let hospitais = 0;
    let grupoA = 0;
    let escolas = 0;
    let saneamento = 0;

    clientes.forEach(
        cliente => {

            switch (
                normalizarTexto(
                    cliente?.tipo
                )
            ) {

                case "HOSPITAL":

                    hospitais++;

                    pontuacao += 40;

                    break;

                case "GRUPO_A":

                    grupoA++;

                    pontuacao += 25;

                    break;

                case "SANEAMENTO":

                    saneamento++;

                    pontuacao += 30;

                    break;

                case "ESCOLA":

                    escolas++;

                    pontuacao += 10;

                    break;

                default:

                    break;
            }
        }
    );

    let classificacao =
        "NORMAL";

    if (
        hospitais > 0 ||
        pontuacao >= 80
    ) {

        classificacao =
            "CRÍTICA";

    } else if (
        pontuacao >= 40
    ) {

        classificacao =
            "ALTA";
    }

    return {

        classificacao,

        pontuacao:
            Math.min(
                pontuacao,
                100
            ),

        dados: {

            clientes:
                Number(
                    ocorrencia?.clientesAfetados
                ) || 0,

            hospitais,

            grupoA,

            escolas,

            saneamento,

            dec:
                Number(
                    ocorrencia?.dec
                ) || 0
        }
    };
}


// ==========================================================
// VALIDAR EQUIPAMENTO DO DESARME
// ==========================================================

function validarEquipamentoDesarme(
    equipamentoDesarme,
    alimentador
) {

    const codigo =
        normalizarId(
            equipamentoDesarme
        );

    if (!codigo) {

        return {

            informado:
                false,

            valido:
                true,

            existeBDGD:
                false,

            inconsistente:
                false,

            equipamento:
                null,

            ficha:
                null,

            motivo:
                "Equipamento do desarme não informado na ocorrência."
        };
    }

    let validacao;

    try {

        validacao =
            validarEquipamentoBDGD(
                codigo,
                alimentador
            );

    } catch (erro) {

        console.error(
            "[Motor COI] Erro ao validar equipamento do desarme:",
            erro
        );

        return {

            informado:
                true,

            valido:
                false,

            existeBDGD:
                false,

            inconsistente:
                true,

            equipamento:
                null,

            ficha:
                null,

            motivo:
                "Erro ao validar o equipamento do desarme na BDGD."
        };
    }

    return {

        informado:
            true,

        ...validacao
    };
}


// ==========================================================
// FILTRAR EQUIPAMENTO DO DESARME
// ==========================================================
//
// Regra crítica:
//
// O equipamento que provocou o desarme NUNCA pode aparecer
// como equipamento de interligação da recomendação.
//
// ==========================================================

function equipamentoEhDesarme(
    candidato,
    ocorrencia
) {

    const idDesarme =
        normalizarCodigoEquipamento(

            ocorrencia?.equipamentoDesarme ??
            ocorrencia?.equipamentoDesarmeId ??
            ocorrencia?.equipamentoProtecao ??
            ocorrencia?.equipamentoQueDesarmou ??
            ocorrencia?.manobra?.equipamentoDesarme ??

            null
        );

    if (!idDesarme) {
        return false;
    }

    const ids = [

        candidato?.equipamentoInterligacao,

        candidato?.equipamentoIdInterligacao,

        candidato?.equipamentoId,

        candidato?.id,

        candidato?.plaqueta

    ]
        .filter(Boolean)
        .map(
            normalizarCodigoEquipamento
        )
        .filter(Boolean);

    return ids.includes(
        idDesarme
    );
}


// ==========================================================
// FILTRAR CANDIDATOS
// ==========================================================

function filtrarCandidatosValidos(
    candidatos,
    ocorrencia
) {

    if (
        !Array.isArray(
            candidatos
        )
    ) {
        return [];
    }

    const mapa =
        new Map();

    candidatos.forEach(
        candidato => {

            if (!candidato) {
                return;
            }

            if (
                equipamentoEhDesarme(
                    candidato,
                    ocorrencia
                )
            ) {

                return;
            }

            const id =
                normalizarCodigoEquipamento(

                    candidato?.equipamentoInterligacao ??

                    candidato?.equipamentoIdInterligacao ??

                    candidato?.equipamentoId ??

                    candidato?.id ??

                    candidato?.plaqueta

                );

            if (!id) {
                return;
            }

            const chave =
                `${id}|` +
                `${normalizarCodigo(obterAlimentador(candidato))}|` +
                `${normalizarCodigo(obterAlimentadorDestino(candidato))}`;

            if (
                !mapa.has(
                    chave
                )
            ) {

                mapa.set(
                    chave,
                    candidato
                );
            }
        }
    );

    return [
        ...mapa.values()
    ];
}


// ==========================================================
// BUSCAR ALTERNATIVAS - COMPATIBILIDADE
// ==========================================================
//
// Essa função permanece porque partes antigas do sistema
// podem utilizá-la.
//
// IMPORTANTE:
//
// Ela NÃO decide qual equipamento deve ser usado.
// A decisão automática é feita por:
//     descobrirCandidatosRecomposicao()
//
// Quando a ocorrência está disponível, damos prioridade ao
// novo mecanismo.
//
// ==========================================================

export function buscarAlternativas(
    alimentador,
    ocorrencia = null
) {

    const origem =
        normalizarId(
            alimentador
        );

    if (!origem) {
        return [];
    }

    // ------------------------------------------------------
    // NOVO CAMINHO
    // ------------------------------------------------------

    if (
        ocorrencia
    ) {

        try {

            const candidatos =
                descobrirCandidatosRecomposicao(
                    {
                        ...ocorrencia,
                        alimentador:
                            ocorrencia?.alimentador ??
                            origem
                    }
                );

            return filtrarCandidatosValidos(
                candidatos,
                {
                    ...ocorrencia,
                    alimentador:
                        ocorrencia?.alimentador ??
                        origem
                }
            );

        } catch (erro) {

            console.warn(
                "[Motor COI] Falha ao descobrir candidatos pela nova arquitetura:",
                erro
            );
        }
    }

    // ------------------------------------------------------
    // FALLBACK LEGADO
    // ------------------------------------------------------

    let interligacoes = [];

    try {

        const resultado =
            buscarInterligacoesAlimentador(
                origem
            );

        if (
            Array.isArray(
                resultado
            )
        ) {

            interligacoes =
                resultado;
        }

    } catch (erro) {

        console.warn(
            "[Motor COI] Não foi possível utilizar buscarInterligacoesAlimentador:",
            erro
        );
    }

    if (
        interligacoes.length === 0
    ) {

        try {

            const oficiais =
                buscarInterligacoes();

            if (
                Array.isArray(
                    oficiais
                )
            ) {

                const alvo =
                    normalizarCodigo(
                        origem
                    );

                interligacoes =
                    oficiais.filter(
                        item => {

                            const origemItem =
                                normalizarCodigo(
                                    obterAlimentador(
                                        item
                                    )
                                );

                            const destinoItem =
                                normalizarCodigo(
                                    obterAlimentadorDestino(
                                        item
                                    )
                                );

                            return (

                                origemItem === alvo ||

                                destinoItem === alvo
                            );
                        }
                    );
            }

        } catch (erro) {

            console.warn(
                "[Motor COI] Falha ao consultar interligações oficiais:",
                erro
            );
        }
    }

    return filtrarCandidatosValidos(
        interligacoes,
        ocorrencia || {}
    );
}


// ==========================================================
// RESOLVER EQUIPAMENTO DA RECOMENDAÇÃO
// ==========================================================

function resolverEquipamento(
    item
) {

    if (!item) {
        return null;
    }

    const ids = [

        item?.equipamentoInterligacao,

        item?.equipamentoIdInterligacao,

        item?.equipamentoId,

        item?.equipamento?.id,

        item?.equipamento?.COD_ID,

        item?.equipamento?.codId,

        item?.id,

        item?.plaqueta

    ]
        .filter(Boolean);

    for (
        const id
        of ids
    ) {

        const equipamento =
            buscarEquipamento(
                id
            );

        if (
            equipamento
        ) {

            return equipamento;
        }
    }

    if (
        item?.equipamento &&
        typeof item.equipamento ===
            "object"
    ) {

        return item.equipamento;
    }

    return null;
}


// ==========================================================
// CRIAR DESCRIÇÃO DO CANDIDATO
// ==========================================================

function normalizarCandidato(
    candidato
) {

    if (!candidato) {
        return null;
    }

    const equipamento =
        resolverEquipamento(
            candidato
        );

    const equipamentoId =
        normalizarId(

            candidato?.equipamentoInterligacao ??

            candidato?.equipamentoIdInterligacao ??

            candidato?.equipamentoId ??

            candidato?.id ??

            equipamento?.id ??

            equipamento?.COD_ID ??

            equipamento?.codId ??

            null
        );

    const plaqueta =
        normalizarId(

            candidato?.plaqueta ??

            candidato?.PLAQUETA ??

            equipamento?.plaqueta ??

            equipamento?.PLAQUETA ??

            equipamento?.plaquetaIPT ??

            equipamento?.PLAQUETA_IPT ??

            equipamentoId

        ) || null;

    const estado =
        obterEstadoEquipamento(
            candidato
        );

    return {

        ...candidato,

        equipamento,

        equipamentoId,

        equipamentoInterligacao:
            equipamentoId,

        equipamentoIdInterligacao:
            equipamentoId,

        plaqueta,

        tipo:
            candidato?.tipo ??
            candidato?.tipoEquipamento ??
            equipamento?.tipo ??
            equipamento?.tipoEquipamento ??
            null,

        tipUnid:
            candidato?.tipUnid ??
            obterTipUnid(
                candidato
            ),

        origem:
            candidato?.origem ??
            candidato?.alimentador ??
            null,

        destino:
            candidato?.destino ??
            candidato?.alimentadorDestino ??
            null,

        alimentador:
            candidato?.alimentador ??
            candidato?.origem ??
            null,

        alimentadorDestino:
            candidato?.alimentadorDestino ??
            candidato?.destino ??
            null,

        estado
    };
}


// ==========================================================
// CORRENTES
// ==========================================================

function obterCorrenteDesligado(
    ocorrencia,
    opcoes = {}
) {

    return converterCorrente(

        opcoes?.correnteDesligado ??

        opcoes?.correnteTrechoOcorrencia ??

        ocorrencia?.correnteTrechoOcorrencia ??

        ocorrencia?.correnteDesligado ??

        ocorrencia?.manobra?.correnteDesligado ??

        null
    );
}


function obterCorrenteDestino(
    ocorrencia,
    opcoes = {}
) {

    return converterCorrente(

        opcoes?.correnteDestino ??

        opcoes?.correnteTrechoRecuperacao ??

        opcoes?.correnteAtualDestino ??

        ocorrencia?.correnteTrechoRecuperacao ??

        ocorrencia?.correnteAtualDestino ??

        ocorrencia?.manobra?.correnteDestino ??

        null
    );
}


// ==========================================================
// NORMALIZAR RESULTADO DA ANÁLISE
// ==========================================================

function normalizarAnalise(
    resultado
) {

    if (!resultado) {

        return {

            aprovado:
                false,

            permitido:
                false,

            status:
                "ERRO_ANALISE",

            candidatos: [],

            alternativas: [],

            recomendacao:
                null,

            motivo:
                "O motor não retornou resultado de análise."
        };
    }

    const candidatosBrutos =
        Array.isArray(
            resultado?.candidatos
        )
            ? resultado.candidatos
            : (
                Array.isArray(
                    resultado?.alternativas
                )
                    ? resultado.alternativas
                    : []
            );

    const candidatos =
        candidatosBrutos
            .map(
                normalizarCandidato
            )
            .filter(Boolean);

    const recomendacao =
        resultado?.recomendacao ??
        null;

    const melhor =
        recomendacao?.equipamentoInterligacao
            ? candidatos.find(
                candidato =>
                    normalizarCodigoEquipamento(
                        candidato?.equipamentoInterligacao
                    ) ===
                    normalizarCodigoEquipamento(
                        recomendacao.equipamentoInterligacao
                    )
              ) ??
              null
            : (
                candidatos.find(
                    candidato =>
                        normalizarCodigoEquipamento(
                            candidato?.equipamentoId
                        ) ===
                        normalizarCodigoEquipamento(
                            recomendacao?.equipamentoId
                        )
                ) ??
                null
            );

    const melhorCandidato =
        resultado?.melhorAlternativa ??
        resultado?.melhorCandidato ??
        melhor ??
        (
            recomendacao?.equipamentoId
                ? normalizarCandidato(
                    recomendacao
                )
                : null
        );

    return {

        ...resultado,

        aprovado:
            resultado?.aprovado ??
            resultado?.permitido ??
            Boolean(
                recomendacao?.permitido
            ),

        permitido:
            resultado?.permitido ??
            resultado?.aprovado ??
            Boolean(
                recomendacao?.permitido
            ),

        status:
            resultado?.status ??
            (
                resultado?.aprovado
                    ? "LIBERADA"
                    : "BLOQUEADA"
            ),

        candidatos,

        alternativas:
            candidatos,

        melhorAlternativa:
            normalizarCandidato(
                melhorCandidato
            ),

        recomendacao
    };
}


// ==========================================================
// ANALISAR MANOBRA - NOVA ARQUITETURA
// ==========================================================
//
// Compatibilidade com chamadas antigas.
//
// O equipamentoInterligacao recebido por versões antigas
// NÃO é utilizado para selecionar o candidato.
//
// Isso impede que G02722 seja interpretado como interligação.
//
// ==========================================================

export function analisarManobra(
    parametros = {}
) {

    const {

        alimentador,

        correnteDesligado,

        correnteAtualDestino,

        correnteTransferida,

        correnteTrechoOcorrencia,

        correnteTrechoRecuperacao,

        alimentadorDestino,

        equipamento,

        equipamentoDesarme,

        equipamentoInterligacao,

        equipamentoIdInterligacao,

        plaqueta,

        interligacao

    } = parametros;


    const origem =
        normalizarId(
            alimentador
        );


    // ======================================================
    // CORRENTES
    // ======================================================

    const correnteOcorrencia =
        converterCorrente(

            correnteTrechoOcorrencia ??

            correnteDesligado ??

            correnteTransferida ??

            null

        );


    const correnteRecuperacao =
        converterCorrente(

            correnteTrechoRecuperacao ??

            correnteAtualDestino ??

            null

        );


    // ======================================================
    // EQUIPAMENTO DO DESARME
    // ======================================================
    //
    // ATENÇÃO:
    //
    // equipamentoInterligacao é deliberadamente ignorado
    // como fonte de decisão.
    //
    // O novo motor descobre a interligação.
    //
    // ======================================================

    const codigoDesarme =
        normalizarId(
            equipamentoDesarme
        );


    // ======================================================
    // VALIDAR ALIMENTADOR
    // ======================================================

    if (!origem) {

        return {

            aprovado:
                false,

            permitido:
                false,

            status:
                "DADO_INVALIDO",

            alternativas: [],

            candidatos: [],

            melhorAlternativa:
                null,

            recomendacao:
                null,

            correnteConhecida:
                false,

            motivo:
                "Alimentador da ocorrência não informado."
        };
    }


    // ======================================================
    // VALIDAR EQUIPAMENTO DO DESARME
    // ======================================================

    const validacaoDesarme =
        validarEquipamentoDesarme(
            codigoDesarme,
            origem
        );


    if (
        validacaoDesarme.informado &&
        !validacaoDesarme.valido
    ) {

        return {

            aprovado:
                false,

            permitido:
                false,

            status:

                validacaoDesarme.existeBDGD

                    ? "EQUIPAMENTO_DESARME_INCONSISTENTE"

                    : "EQUIPAMENTO_DESARME_NAO_ENCONTRADO",

            alternativas: [],

            candidatos: [],

            melhorAlternativa:
                null,

            recomendacao:
                null,

            correnteConhecida:

                correnteOcorrencia !== null &&

                correnteRecuperacao !== null,

            correnteTransferida:
                correnteOcorrencia,

            correnteBaseDestino:
                correnteRecuperacao,

            correnteProjetada:

                correnteOcorrencia !== null &&

                correnteRecuperacao !== null

                    ? correnteOcorrencia +
                      correnteRecuperacao

                    : null,

            equipamentoDesarme:
                validacaoDesarme,

            motivo:
                validacaoDesarme.motivo
        };
    }


    // ======================================================
    // VALIDAR CORRENTES
    // ======================================================

    if (
        correnteOcorrencia === null ||
        correnteRecuperacao === null
    ) {

        return {

            aprovado:
                false,

            permitido:
                false,

            status:
                "CORRENTE_INDISPONIVEL",

            alternativas: [],

            candidatos: [],

            melhorAlternativa:
                null,

            recomendacao:
                null,

            correnteConhecida:
                false,

            correnteTransferida:
                correnteOcorrencia,

            correnteBaseDestino:
                correnteRecuperacao,

            correnteProjetada:
                null,

            equipamentoDesarme:
                validacaoDesarme,

            motivo:
                "Informe a corrente do trecho no momento do desarme e a corrente atual do trecho receptor/suporte antes de analisar a recomposição."
        };
    }


    // ======================================================
    // MONTAR OCORRÊNCIA PARA O NOVO MOTOR
    // ======================================================

    const ocorrencia = {

        alimentador:
            origem,

        alimentadorOrigem:
            origem,

        equipamentoDesarme:
            codigoDesarme ||

            null,

        equipamentoDesarmeId:
            codigoDesarme ||

            null,

        // --------------------------------------------------
        // IMPORTANTE:
        //
        // Não transportar equipamentoInterligacao para a
        // ocorrência como decisão do operador.
        //
        // --------------------------------------------------

        equipamentoInterligacao:
            null,

        equipamentoIdInterligacao:
            null,

        alimentadorDestino:
            alimentadorDestino ??

            null,

        trecho:
            parametros?.trecho ??
            null,

        clientesAfetados:
            parametros?.clientesAfetados ??
            0,

        manobra: {

            correnteDesligado:
                correnteOcorrencia,

            correnteDestino:
                correnteRecuperacao,

            equipamentoInterligacao:
                null

        }

    };


    // ======================================================
    // EXECUTAR NOVA ANÁLISE
    // ======================================================

    let resultado;


    try {

        resultado =
            analisarRecomposicaoOcorrencia(

                ocorrencia,

                {

                    correnteDesligado:
                        correnteOcorrencia,

                    correnteDestino:
                        correnteRecuperacao

                }

            );

    } catch (erro) {

        console.error(
            "[Motor COI] Erro no motor de recomposição:",
            erro
        );

        return {

            aprovado:
                false,

            permitido:
                false,

            status:
                "ERRO_MOTOR",

            alternativas: [],

            candidatos: [],

            melhorAlternativa:
                null,

            recomendacao:
                null,

            correnteConhecida:
                true,

            correnteTransferida:
                correnteOcorrencia,

            correnteBaseDestino:
                correnteRecuperacao,

            correnteProjetada:
                correnteOcorrencia +
                correnteRecuperacao,

            equipamentoDesarme:
                validacaoDesarme,

            motivo:
                "O motor encontrou um erro ao executar a análise automática de recomposição."
        };
    }


    // ======================================================
    // NORMALIZAR
    // ======================================================

    const analise =
        normalizarAnalise(
            resultado
        );


    return {

        ...analise,

        equipamentoDesarme:
            validacaoDesarme,

        correnteConhecida:
            true,

        correnteTransferida:
            correnteOcorrencia,

        correnteBaseDestino:
            correnteRecuperacao,

        correnteProjetada:
            correnteOcorrencia +
            correnteRecuperacao,

        // Mantém referência apenas informativa.
        //
        // NÃO influencia a decisão.
        equipamentoInformadoAntigo:
            equipamentoInterligacao ??
            equipamentoIdInterligacao ??
            equipamento ??
            plaqueta ??
            null,

        interligacaoInformadaAntiga:
            interligacao ??
            null
    };
}


// ==========================================================
// GERAR RECOMENDAÇÃO
// ==========================================================

export function gerarRecomendacao(
    analise,
    ocorrencia
) {

    if (!analise) {

        return {

            permitido:
                false,

            classificacao:
                "NÃO RECOMENDADA",

            motivo:
                "Análise COI não disponível.",

            justificativas: [],

            recomposicao:
                null,

            sequencia: []
        };
    }


    const melhor =
        normalizarCandidato(

            analise?.melhorAlternativa ??

            analise?.melhorCandidato ??

            analise?.recomendacao ??

            null

        );


    const recomendacaoModelo =
        analise?.recomendacao ??
        null;


    const permitido =
        Boolean(

            analise?.permitido ??

            analise?.aprovado ??

            recomendacaoModelo?.permitido

        );


    // ======================================================
    // SEM ALTERNATIVA
    // ======================================================

    if (
        !permitido ||
        !melhor
    ) {

        const candidatos =
            Array.isArray(
                analise?.candidatos
            )
                ? analise.candidatos
                : (
                    Array.isArray(
                        analise?.alternativas
                    )
                        ? analise.alternativas
                        : []
                );


        const bloqueada =
            candidatos.find(
                candidato =>

                    candidato?.permitido === false

            ) ||

            candidatos[0] ||

            null;


        const alimentador =
            ocorrencia?.alimentador ||

            analise?.alimentador ||

            "NÃO INFORMADO";


        const motivo =
            bloqueada?.motivo ||

            recomendacaoModelo?.motivo ||

            analise?.motivo ||

            "Nenhuma alternativa de recomposição atende aos critérios operacionais.";


        return {

            permitido:
                false,

            classificacao:
                "NÃO RECOMENDADA",

            motivo:
                `Nenhuma recomposição automática foi aprovada para ${alimentador}. ${motivo}`,

            nota:
                0,

            justificativas: [

                `Alimentador da ocorrência: ${alimentador}.`,

                ocorrencia?.equipamentoDesarme

                    ? `Equipamento do desarme: ${ocorrencia.equipamentoDesarme}.`

                    : "Equipamento do desarme não informado.",

                "Nenhum equipamento de interligação foi selecionado manualmente.",

                "A busca de alternativas foi realizada pela topologia BDGD e pelo estado operacional dos equipamentos.",

                motivo

            ],

            recomposicao:
                null,

            sequencia: [],

            restricoes:
                candidatos

        };
    }


    // ======================================================
    // DADOS DA ALTERNATIVA
    // ======================================================

    const equipamentoId =
        normalizarId(

            melhor?.equipamentoId ??

            melhor?.equipamentoInterligacao ??

            melhor?.id ??

            null

        );


    const plaqueta =
        normalizarId(

            melhor?.plaqueta ??

            melhor?.PLAQUETA ??

            obterPlaquetaEquipamento(
                melhor
            ) ??

            equipamentoId ??

            "-"

        );


    const origem =
        melhor?.origem ??

        melhor?.alimentador ??

        ocorrencia?.alimentador ??

        null;


    const destino =
        melhor?.destino ??

        melhor?.alimentadorDestino ??

        recomendacaoModelo?.alimentadorDestino ??

        null;


    const estado =
        obterEstadoEquipamento(
            melhor
        );


    const correnteTransferida =
        converterCorrente(

            melhor?.correnteTransferida ??

            analise?.correnteTransferida ??

            null

        );


    const correnteBaseDestino =
        converterCorrente(

            melhor?.correnteBaseDestino ??

            analise?.correnteBaseDestino ??

            null

        );


    const correnteProjetada =
        converterCorrente(

            melhor?.correnteProjetada ??

            analise?.correnteProjetada ??

            null

        );


    const carregamento =
        Number.isFinite(
            Number(
                melhor?.carregamento
            )
        )
            ? arredondar(
                melhor.carregamento,
                0
            )
            : null;


    const capacidade =
        Number.isFinite(
            Number(
                melhor?.capacidade
            )
        )
            ? Number(
                melhor.capacidade
            )
            : null;


    const limiteOperacional =
        Number.isFinite(
            Number(
                melhor?.limiteOperacional
            )
        )
            ? Number(
                melhor.limiteOperacional
            )
            : null;


    const trechoLimitante =
        melhor?.trechoLimitante ??
        null;


    const emAtencao =
        melhor?.requerAlerta === true ||

        normalizarTexto(
            melhor?.status
        ) === "ATENCAO";


    // ======================================================
    // CLASSIFICAÇÃO
    // ======================================================

    let classificacao =
        "RECOMENDADA";


    if (
        emAtencao
    ) {

        classificacao =
            "ATENÇÃO";
    }


    // ======================================================
    // NOTA
    // ======================================================

    let nota =
        null;


    if (
        carregamento !== null
    ) {

        nota =
            carregamento >= 100

                ? 0

                : Math.max(
                    0,
                    100 -
                    carregamento
                );
    }


    // ======================================================
    // JUSTIFICATIVAS
    // ======================================================

    const justificativas = [];


    justificativas.push(
        `Equipamento de interligação ${plaqueta} identificado automaticamente pela topologia BDGD.`
    );


    if (
        equipamentoId &&
        equipamentoId !== plaqueta
    ) {

        justificativas.push(
            `Código operacional/BDGD da interligação: ${equipamentoId}.`
        );
    }


    if (
        estado
    ) {

        justificativas.push(
            `Estado operacional atual: ${estado}.`
        );
    }


    if (
        origem
    ) {

        justificativas.push(
            `Alimentador da ocorrência: ${origem}.`
        );
    }


    if (
        destino
    ) {

        justificativas.push(
            `Alimentador de apoio identificado: ${destino}.`
        );
    }


    if (
        correnteTransferida !== null
    ) {

        justificativas.push(
            `Corrente transferida considerada: ${correnteTransferida} A.`
        );
    }


    if (
        correnteBaseDestino !== null
    ) {

        justificativas.push(
            `Corrente existente no trecho receptor: ${correnteBaseDestino} A.`
        );
    }


    if (
        correnteProjetada !== null
    ) {

        justificativas.push(
            `Corrente projetada após a manobra: ${correnteProjetada} A.`
        );
    }


    if (
        carregamento !== null
    ) {

        justificativas.push(
            `Carregamento projetado do trecho limitante: ${carregamento}%.`
        );
    }


    if (
        capacidade !== null
    ) {

        justificativas.push(
            `Capacidade do trecho limitante: ${capacidade} A.`
        );
    }


    if (
        limiteOperacional !== null
    ) {

        justificativas.push(
            `Limite operacional considerado: ${limiteOperacional} A.`
        );
    }


    if (
        trechoLimitante?.id
    ) {

        justificativas.push(
            `Trecho limitante identificado: ${trechoLimitante.id}.`
        );
    }


    if (
        emAtencao
    ) {

        justificativas.push(
            "RN01: carregamento acima do limite recomendado de 80%, exigindo monitoramento ativo."
        );

    } else {

        justificativas.push(
            "Transferência dentro do limite operacional recomendado."
        );
    }


    // ======================================================
    // SEQUÊNCIA
    // ======================================================

    const sequencia = [];


    sequencia.push(
        `1. Confirmar o isolamento do trecho faltoso no alimentador ${origem || ocorrencia?.alimentador || "-"}.`
    );


    sequencia.push(
        `2. Confirmar a disponibilidade do equipamento de interligação ${plaqueta}.`
    );


    sequencia.push(
        `3. Fechar a interligação ${plaqueta}.`
    );


    if (
        destino
    ) {

        sequencia.push(
            `4. Confirmar a transferência da carga para o alimentador ${destino}.`
        );

    } else {

        sequencia.push(
            "4. Confirmar a estabilização da rede após a manobra."
        );
    }


    if (
        emAtencao
    ) {

        sequencia.push(
            "5. Monitorar continuamente a corrente e o carregamento pós-manobra."
        );

    } else {

        sequencia.push(
            "5. Confirmar estabilização da rede e normalização dos clientes."
        );
    }


    // ======================================================
    // RESULTADO
    // ======================================================

    return {

        permitido:
            true,

        classificacao,

        nota,

        motivo:

            emAtencao

                ? `Manobra ${plaqueta} permitida, mas exige monitoramento ativo devido ao carregamento projetado de ${carregamento ?? "-"}%.`

                : `Manobra ${plaqueta} operacionalmente recomendada.`,

        recomposicao: {

            equipamento:
                plaqueta,

            equipamentoId:
                equipamentoId ||

                null,

            tipo:
                obterTipoEquipamento(
                    melhor
                ),

            tipUnid:
                obterTipUnid(
                    melhor
                ),

            estado,

            alimentadorOrigem:
                origem,

            alimentadorDestino:
                destino,

            correnteTransferida,

            correnteBaseDestino,

            correnteProjetada,

            carregamento,

            capacidade,

            limiteOperacional,

            trechoLimitante,

            caminho:
                melhor?.caminho ??
                melhor?.caminhoEletrico ??
                melhor?.path ??
                null,

            manobra:
                melhor?.manobra ??
                {

                    equipamento:
                        equipamentoId,

                    acao:
                        "FECHAR"

                }

        },

        justificativas,

        sequencia
    };
}


// ==========================================================
// EXECUTAR ANÁLISE COMPLETA DO COI
// ==========================================================

export function executarAnaliseCOI(
    ocorrencia,
    opcoes = {}
) {

    const ocorrenciaNormalizada = {

        ...(
            ocorrencia ||
            {}
        ),

        alimentador:
            ocorrencia?.alimentador ??

            ocorrencia?.alimentadorOrigem ??

            null,

        equipamentoDesarme:

            ocorrencia?.equipamentoDesarme ??

            ocorrencia?.equipamentoDesarmeId ??

            ocorrencia?.equipamentoProtecao ??

            ocorrencia?.equipamentoQueDesarmou ??

            ocorrencia?.manobra?.equipamentoDesarme ??

            null,

        // --------------------------------------------------
        // NÃO CARREGAR EQUIPAMENTO DE INTERLIGAÇÃO
        // --------------------------------------------------

        equipamentoInterligacao:
            null,

        equipamentoIdInterligacao:
            null,

        alimentadorDestino:
            null,

        manobra: {

            ...(
                ocorrencia?.manobra ||
                {}
            ),

            equipamentoInterligacao:
                null,

            correnteDesligado:

                opcoes?.correnteDesligado ??

                ocorrencia?.correnteTrechoOcorrencia ??

                ocorrencia?.manobra?.correnteDesligado ??

                null,

            correnteDestino:

                opcoes?.correnteDestino ??

                ocorrencia?.correnteTrechoRecuperacao ??

                ocorrencia?.manobra?.correnteDestino ??

                null

        }

    };


    // ======================================================
    // IMPACTO
    // ======================================================

    const impacto =
        calcularImpacto(
            ocorrenciaNormalizada
        );


    // ======================================================
    // ANÁLISE
    // ======================================================

    const analise =
        analisarManobra({

            alimentador:
                ocorrenciaNormalizada.alimentador,

            correnteDesligado:

                ocorrenciaNormalizada
                    ?.manobra
                    ?.correnteDesligado,

            correnteAtualDestino:

                ocorrenciaNormalizada
                    ?.manobra
                    ?.correnteDestino,

            correnteTrechoOcorrencia:

                ocorrenciaNormalizada
                    ?.manobra
                    ?.correnteDesligado,

            correnteTrechoRecuperacao:

                ocorrenciaNormalizada
                    ?.manobra
                    ?.correnteDestino,

            alimentadorDestino:
                null,

            equipamento:
                null,

            equipamentoInterligacao:
                null,

            equipamentoIdInterligacao:
                null,

            plaqueta:
                null,

            equipamentoDesarme:

                ocorrenciaNormalizada
                    .equipamentoDesarme,

            trecho:
                ocorrenciaNormalizada.trecho,

            clientesAfetados:
                ocorrenciaNormalizada.clientesAfetados

        });


    // ======================================================
    // RECOMENDAÇÃO
    // ======================================================

    const recomendacao =
        gerarRecomendacao(
            analise,
            ocorrenciaNormalizada
        );


    return {

        impacto,

        analise,

        recomendacao,

        ocorrencia:
            ocorrenciaNormalizada
    };
}


// ==========================================================
// MOTOR PRINCIPAL
// ==========================================================
//
// Entrada:
//
// ocorrência + correntes.
//
// O operador NÃO precisa informar a interligação.
//
// ==========================================================

export function executarMotorCOI(
    entrada = {}
) {

    const alimentador =
        normalizarId(

            entrada?.alimentador ??

            entrada?.alimentadorOrigem ??

            null

        );


    const equipamentoDesarme =
        normalizarId(

            entrada?.equipamentoDesarme ??

            entrada?.equipamentoDesarmeId ??

            entrada?.equipamentoProtecao ??

            entrada?.equipamentoQueDesarmou ??

            entrada?.manobra?.equipamentoDesarme ??

            null

        );


    const correnteDesligado =
        converterCorrente(

            entrada?.correnteTrechoOcorrencia ??

            entrada?.correnteDesligado ??

            entrada?.manobra?.correnteDesligado ??

            null

        );


    const correnteDestino =
        converterCorrente(

            entrada?.correnteTrechoRecuperacao ??

            entrada?.correnteAtualDestino ??

            entrada?.manobra?.correnteDestino ??

            null

        );


    // ======================================================
    // OCORRÊNCIA NORMALIZADA
    // ======================================================

    const ocorrencia = {

        ...entrada,

        alimentador,

        alimentadorOrigem:
            alimentador,

        equipamentoDesarme,

        equipamentoDesarmeId:
            equipamentoDesarme,

        // --------------------------------------------------
        // CRÍTICO:
        //
        // Nenhum campo antigo pode transformar G02722 em
        // equipamento de interligação.
        // --------------------------------------------------

        equipamentoInterligacao:
            null,

        equipamentoIdInterligacao:
            null,

        alimentadorDestino:
            null,

        trecho:
            entrada?.trecho ??
            null,

        clientesAfetados:
            entrada?.clientesAfetados ??
            0,

        clientesInterrompidos:
            entrada?.clientesInterrompidos ??
            entrada?.clientesAfetados ??
            0,

        clientesRecuperados:
            0,

        clientesRemanescentes:
            entrada?.clientesRemanescentes ??
            entrada?.clientesAfetados ??
            0,

        manobra: {

            ...(
                entrada?.manobra ||
                {}
            ),

            equipamentoInterligacao:
                null,

            correnteDesligado,

            correnteDestino,

            alimentadorDestino:
                null,

            equipamentoDesarme

        }

    };


    // ======================================================
    // EXECUTAR
    // ======================================================

    const resultado =
        executarAnaliseCOI(
            ocorrencia
        );


    const analise =
        resultado?.analise ??
        null;


    const recomendacao =
        resultado?.recomendacao ??
        null;


    const melhor =
        normalizarCandidato(

            analise?.melhorAlternativa ??

            analise?.melhorCandidato ??

            recomendacao?.recomposicao ??

            null

        );


    // ======================================================
    // CORRENTE PROJETADA
    // ======================================================

    const correnteProjetada =
        correnteDesligado !== null &&

        correnteDestino !== null

            ? correnteDesligado +
              correnteDestino

            : null;


    const correnteFinal =
        converterCorrente(

            melhor?.correnteProjetada ??

            recomendacao
                ?.recomposicao
                ?.correnteProjetada ??

            analise?.correnteProjetada ??

            null

        );


    // ======================================================
    // EQUIPAMENTO DA INTERLIGAÇÃO
    // ======================================================

    const equipamentoInterligacaoId =
        normalizarId(

            melhor?.equipamentoId ??

            melhor?.equipamentoInterligacao ??

            recomendacao
                ?.recomposicao
                ?.equipamentoId ??

            null

        );


    const equipamentoInterligacaoPlaqueta =
        normalizarId(

            melhor?.plaqueta ??

            recomendacao
                ?.recomposicao
                ?.equipamento ??

            equipamentoInterligacaoId ??

            null

        );


    // ======================================================
    // ALIMENTADOR DESTINO
    // ======================================================

    const alimentadorDestino =
        normalizarId(

            melhor?.alimentadorDestino ??

            melhor?.destino ??

            recomendacao
                ?.recomposicao
                ?.alimentadorDestino ??

            null

        );


    // ======================================================
    // CLIENTES
    // ======================================================

    const clientesAfetados =
        Number(
            entrada?.clientesAfetados
        ) || 0;


    const clientesRecuperados =
        Number.isFinite(
            Number(
                analise?.clientesRecuperados
            )
        )
            ? Number(
                analise.clientesRecuperados
            )
            : (
                Number.isFinite(
                    Number(
                        recomendacao
                            ?.recomposicao
                            ?.clientesRecuperados
                    )
                )
                    ? Number(
                        recomendacao
                            .recomposicao
                            .clientesRecuperados
                    )
                    : null
            );


    const clientesRemanescentes =
        clientesRecuperados !== null

            ? Math.max(
                0,
                clientesAfetados -
                clientesRecuperados
            )

            : null;


    // ======================================================
    // RETORNO UNIFICADO
    // ======================================================

    return {

        permitido:

            Boolean(
                recomendacao?.permitido ??
                analise?.permitido ??
                analise?.aprovado
            ),


        aprovado:

            Boolean(
                analise?.aprovado ??
                analise?.permitido ??
                recomendacao?.permitido
            ),


        nivel:

            recomendacao?.classificacao ??

            "NÃO RECOMENDADA",


        status:

            analise?.status ??

            (
                recomendacao?.permitido
                    ? "LIBERADA"
                    : "BLOQUEADA"
            ),


        carregamento:

            melhor?.carregamento ??

            recomendacao
                ?.recomposicao
                ?.carregamento ??

            null,


        motivo:

            recomendacao?.motivo ??

            analise?.motivo ??

            "Motor COI não retornou justificativa.",


        justificativas:

            recomendacao?.justificativas ??

            analise?.justificativas ??

            [],


        // --------------------------------------------------
        // EQUIPAMENTO DE INTERLIGAÇÃO
        // --------------------------------------------------

        equipamento: {

            id:
                equipamentoInterligacaoId,

            plaqueta:
                equipamentoInterligacaoPlaqueta,

            tipo:

                melhor?.tipo ??

                melhor?.tipoEquipamento ??

                recomendacao
                    ?.recomposicao
                    ?.tipo ??

                null,

            tipUnid:

                melhor?.tipUnid ??

                obterTipUnid(
                    melhor
                ),

            estado:

                melhor?.estado ??

                null

        },


        // --------------------------------------------------
        // EQUIPAMENTO DO DESARME
        // --------------------------------------------------

        equipamentoDesarme:

            analise?.equipamentoDesarme ??

            validarEquipamentoDesarme(
                equipamentoDesarme,
                alimentador
            ),


        // --------------------------------------------------
        // CORRENTES
        // --------------------------------------------------

        correnteTransferida:
            correnteDesligado,

        correnteBaseDestino:
            correnteDestino,

        correnteTotal:
            correnteProjetada,

        correnteFinal:
            correnteFinal,

        correnteProjetada:

            correnteFinal ??

            correnteProjetada ??

            null,

        correnteConhecida:

            correnteDesligado !== null &&

            correnteDestino !== null,


        // --------------------------------------------------
        // ALIMENTADORES
        // --------------------------------------------------

        alimentadorOrigem:
            alimentador,

        alimentadorDestino:
            alimentadorDestino,


        // --------------------------------------------------
        // TRECHO LIMITANTE
        // --------------------------------------------------

        trechoLimitante:

            melhor?.trechoLimitante ??

            recomendacao
                ?.recomposicao
                ?.trechoLimitante ??

            null,


        // --------------------------------------------------
        // CAMINHO
        // --------------------------------------------------

        caminho:

            melhor?.caminho ??

            melhor?.caminhoEletrico ??

            recomendacao
                ?.recomposicao
                ?.caminho ??

            null,


        // --------------------------------------------------
        // RECOMENDAÇÃO
        // --------------------------------------------------

        recomendacao,


        // --------------------------------------------------
        // ALTERNATIVAS
        // --------------------------------------------------

        alternativas:

            analise?.candidatos ??

            analise?.alternativas ??

            [],


        candidatos:

            analise?.candidatos ??

            analise?.alternativas ??

            [],


        melhorAlternativa:
            melhor,


        // --------------------------------------------------
        // IMPACTO
        // --------------------------------------------------

        impacto:
            resultado?.impacto ??
            null,


        // --------------------------------------------------
        // CLIENTES
        // --------------------------------------------------

        clientesAfetados,

        clientesRecuperados,

        clientesRemanescentes,


        // --------------------------------------------------
        // OCORRÊNCIA
        // --------------------------------------------------

        ocorrencia
    };
}


// ==========================================================
// EXPORTAÇÃO
// ==========================================================

export const motorCOI = {

    buscarClientesAfetados,

    calcularImpacto,

    buscarAlternativas,

    analisarManobra,

    gerarRecomendacao,

    executarAnaliseCOI,

    executarMotorCOI

};


export default motorCOI;