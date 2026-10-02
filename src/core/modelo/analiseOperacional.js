// ============================================================
// src/core/modelo/analiseOperacional.js
// POWER GRID MONITOR
// ============================================================
//
// ANÁLISE OPERACIONAL BASEADA NA TOPOLOGIA BDGD.
//
// ARQUITETURA ATUAL:
//
// 1. A ocorrência informa o equipamento do desarme.
// 2. O equipamento é validado na BDGD.
// 3. A área afetada é determinada pela topologia.
// 4. O motor procura automaticamente equipamentos reais
//    de recomposição.
// 5. A interligação NÃO é escolhida manualmente.
// 6. O alimentador destino NÃO precisa ser informado.
// 7. O equipamento de desarme nunca é tratado como
//    equipamento de interligação.
// 8. TIP_UNID é a autoridade para classificação.
// 9. O estado operacional é respeitado.
// 10. A corrente não é inventada.
// 11. A análise não executa manobra automaticamente.
//
// COMPATIBILIDADE:
//
// Mantém campos utilizados pelos testes antigos:
//
// - protecao
// - montante
// - jusante
// - areaAfetada
// - isolamento
// - interligacoes
// - alimentadoresApoio
// - transferenciasPossiveis
// - melhorTransferencia
// - corrente
// - sequenciaManobra
// - recomendacoes
// - alertas
// - estadoAnalise
// - diagnostico
//
// ============================================================


import {
    buscarPonto,
    buscarTrechoBDGD,
    buscarConexoes,
    buscarRedeAMontante,
    buscarRedeAJusante,
} from "./topologiaBDGD";


import {
    getTopologiaBDGD,
    buscarEquipamento as buscarEquipamentoModelo,
    consultarEstadoEquipamento,
    consultarCorrenteAlimentador,
    consultarCorrenteTrecho,
    calcularCapacidadeTrecho,

    buscarMontante,
    buscarJusante,

    descobrirCandidatosRecomposicao,
    analisarRecomposicaoOcorrencia,
} from "./modeloRede";


import {
    executarMotorCOI
} from "../intelligence/motorCOI";


// ============================================================
// CONSTANTES
// ============================================================

const TIPOS_EQUIPAMENTO_MANOBRAVEIS =
    new Set([
        "CHAVE_LAMINA",
        "CHAVE_FUSIVEL",
        "CHAVE_SECCIONADORA",
        "RELIGADOR",
    ]);


const TIPOS_PROTECAO =
    new Set([
        "RELIGADOR",
    ]);


const TIPOS_ISOLAMENTO =
    new Set([
        "CHAVE_LAMINA",
        "CHAVE_FUSIVEL",
        "CHAVE_SECCIONADORA",
        "RELIGADOR",
    ]);


const CIRCUITOS_CMG = {

    "151":
        "CMG01C1",

    "152":
        "CMG01C2",

    "153":
        "CMG01C3",

    "154":
        "CMG01C4",

    "155":
        "CMG01C5",

    "156":
        "CMG01C6",

};


const ALIMENTADORES_CMG =
    Object.values(
        CIRCUITOS_CMG
    );


// ============================================================
// UTILITÁRIOS
// ============================================================

function texto(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    return String(
        valor
    ).trim();
}


function textoMaiusculo(valor) {

    return texto(
        valor
    ).toUpperCase();
}


function idNormalizado(valor) {

    const valorTexto =
        texto(
            valor
        );

    return valorTexto || null;
}


function numero(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const n =
        Number(
            String(
                valor
            )
                .replace(
                    ",",
                    "."
                )
        );

    return Number.isFinite(
        n
    )
        ? n
        : null;
}


function possuiNumeroPositivo(
    valor
) {

    const n =
        numero(
            valor
        );

    return (
        n !== null &&
        n > 0
    );
}


function semValor(valor) {

    return (
        valor === null ||
        valor === undefined ||
        texto(
            valor
        ) === ""
    );
}


function normalizarColecao(
    colecao
) {

    if (!colecao) {
        return [];
    }

    if (
        Array.isArray(
            colecao
        )
    ) {
        return colecao;
    }

    if (
        colecao instanceof Map
    ) {
        return Array.from(
            colecao.values()
        );
    }

    if (
        typeof colecao ===
        "object"
    ) {
        return Object.values(
            colecao
        );
    }

    return [];
}


function obterPrimeiro(
    item,
    campos = []
) {

    const fontes = [

        item,

        item?.propriedades,

        item?.properties,

        item?.props,

    ].filter(Boolean);

    for (
        const fonte of
        fontes
    ) {

        for (
            const campo of
            campos
        ) {

            const valor =
                fonte?.[campo];

            if (
                !semValor(
                    valor
                )
            ) {
                return valor;
            }
        }
    }

    return null;
}


function obterPropriedades(
    item
) {

    if (
        !item ||
        typeof item !==
        "object"
    ) {
        return {};
    }

    return (
        item?.propriedades ||
        item?.properties ||
        item?.props ||
        item
    );
}


// ============================================================
// NORMALIZAÇÃO DE ALIMENTADOR
// ============================================================

function normalizarAlimentador(
    valor
) {

    const v =
        textoMaiusculo(
            valor
        )
            .replace(
                /[^A-Z0-9]/g,
                ""
            );

    if (
        CIRCUITOS_CMG[v]
    ) {
        return CIRCUITOS_CMG[v];
    }

    if (
        /^CMG01C[1-6]$/.test(v)
    ) {
        return v;
    }

    const match =
        v.match(
            /(?:CMG)?01?C([1-6])$/
        );

    if (match) {

        return `CMG01C${match[1]}`;
    }

    return (
        texto(
            valor
        ) ||
        null
    );
}


// ============================================================
// CIRCUITO
// ============================================================

function obterCircuito(
    item
) {

    const valor =
        obterPrimeiro(
            item,
            [
                "circuito",
                "CIRCUITO",
                "CTMT",
                "ctmt",
                "alimentador",
                "ALIMENTADOR",
            ]
        );

    if (
        semValor(
            valor
        )
    ) {
        return null;
    }

    const t =
        texto(
            valor
        );

    if (
        CIRCUITOS_CMG[t]
    ) {
        return t;
    }

    const alimentador =
        normalizarAlimentador(
            valor
        );

    const match =
        alimentador?.match(
            /C([1-6])$/
        );

    return match
        ? String(
            150 +
            Number(
                match[1]
            )
        )
        : t;
}


// ============================================================
// ALIMENTADOR DO ITEM
// ============================================================

function obterAlimentadorItem(
    item
) {

    const direto =
        obterPrimeiro(
            item,
            [
                "alimentador",
                "ALIMENTADOR",
                "ctmt",
                "CTMT",
                "CT_COD_OP",
                "CT_COD_OPER",
            ]
        );

    const normalizado =
        normalizarAlimentador(
            direto
        );

    if (
        normalizado
    ) {
        return normalizado;
    }

    const circuito =
        obterCircuito(
            item
        );

    return circuito
        ? (
            CIRCUITOS_CMG[
                circuito
            ] ||
            normalizarAlimentador(
                circuito
            )
        )
        : null;
}


// ============================================================
// IDS
// ============================================================

function obterIdEquipamento(
    item
) {

    if (
        !item ||
        typeof item !==
        "object"
    ) {
        return idNormalizado(
            item
        );
    }

    return idNormalizado(

        obterPrimeiro(
            item,
            [
                "id",
                "COD_ID",
                "codId",
                "codigo",
                "unsemtId",
                "unidadeId",
                "plaqueta",
                "PQT",
                "pqt",
            ]
        )

    );
}


function obterIdPonto(
    item
) {

    if (
        !item ||
        typeof item !==
        "object"
    ) {

        return idNormalizado(
            item
        );
    }

    return idNormalizado(

        obterPrimeiro(
            item,
            [
                "id",
                "COD_ID",
                "codId",
                "pontoId",
                "PAC",
                "pac",
                "pontoAssociado",
            ]
        )

    );
}


function obterIdTrecho(
    item
) {

    if (
        !item ||
        typeof item !==
        "object"
    ) {

        return idNormalizado(
            item
        );
    }

    return idNormalizado(

        obterPrimeiro(
            item,
            [
                "id",
                "COD_ID",
                "codId",
            ]
        )

    );
}


// ============================================================
// PAC
// ============================================================

function normalizarPac(
    valor
) {

    const t =
        idNormalizado(
            valor
        );

    if (!t) {
        return null;
    }

    const match =
        t.match(
            /^(.*?)M(?:-[^\s-]+)?$/i
        );

    if (
        match?.[1]
    ) {

        return match[1];
    }

    return t;
}


function obterPacs(
    item
) {

    const pac1 =
        obterPrimeiro(
            item,
            [
                "pac1",
                "PAC_1",
                "pac1Original",
                "PAC1",
            ]
        );


    const pac2 =
        obterPrimeiro(
            item,
            [
                "pac2",
                "PAC_2",
                "pac2Original",
                "PAC2",
            ]
        );


    return {

        pac1Original:
            idNormalizado(
                pac1
            ),

        pac2Original:
            idNormalizado(
                pac2
            ),

        pac1:
            normalizarPac(
                pac1
            ),

        pac2:
            normalizarPac(
                pac2
            ),

    };
}


// ============================================================
// RELAÇÃO EQUIPAMENTO / PONTO
// ============================================================

function itemRelacionaPonto(
    item,
    pontoId
) {

    const alvo =
        normalizarPac(
            pontoId
        );

    if (!alvo) {
        return false;
    }

    const pacs =
        obterPacs(
            item
        );

    const ids = [

        obterPrimeiro(
            item,
            [
                "pontoAssociado",
                "pontoId",
                "PONTO_ID",
            ]
        ),

        pacs.pac1,

        pacs.pac2,

        obterPrimeiro(
            item,
            [
                "PN_CON_1",
                "pnCon1",
            ]
        ),

        obterPrimeiro(
            item,
            [
                "PN_CON_2",
                "pnCon2",
            ]
        ),

    ]
        .filter(
            valor =>
                !semValor(
                    valor
                )
        )
        .map(
            valor =>
                normalizarPac(
                    valor
                )
        )
        .filter(Boolean);


    return ids.includes(
        alvo
    );
}


// ============================================================
// CLASSIFICAÇÃO POR TIP_UNID
// ============================================================
//
// REGRA:
//
// TIP_UNID é a autoridade.
//
// UNSEMT:
//
// 19 -> CHAVE_LAMINA
// 22 -> CHAVE_FUSIVEL
// 32 -> RELIGADOR
// 34 -> CHAVE_SECCIONADORA
//
// UNTRMT / UNTRAT:
//
// 38 -> TRANSFORMADOR
//
// Não utilizar texto de EQSE para alterar essa classificação.
//
// ============================================================

function classificarTIPUNID(
    valor
) {

    const codigo =
        numero(
            valor
        );

    if (
        codigo === null
    ) {
        return null;
    }

    switch (
        codigo
    ) {

        case 19:
            return "CHAVE_LAMINA";

        case 22:
            return "CHAVE_FUSIVEL";

        case 32:
            return "RELIGADOR";

        case 34:
            return "CHAVE_SECCIONADORA";

        case 38:
            return "TRANSFORMADOR";

        default:
            return null;
    }
}


// ============================================================
// CLASSIFICAR EQUIPAMENTO
// ============================================================

function classificarEquipamento(
    item
) {

    const tipoUnid =
        obterPrimeiro(
            item,
            [
                "TIP_UNID",
                "tipUnid",
                "tipoUnidade",
            ]
        );


    const porTipUnid =
        classificarTIPUNID(
            tipoUnid
        );


    if (
        porTipUnid
    ) {

        return porTipUnid;
    }


    // --------------------------------------------------------
    // Sem TIP_UNID:
    //
    // somente aceitar classificação explícita já entregue
    // pela estrutura do próprio equipamento.
    //
    // NÃO utilizar EQSE/texto livre como autoridade.
    // --------------------------------------------------------

    const tipoExplicito =
        obterPrimeiro(
            item,
            [
                "tipoEquipamento",
                "tipoOperacional",
                "nomeTipoEquipamento",
            ]
        );


    const tipo =
        textoMaiusculo(
            tipoExplicito
        );


    if (
        TIPOS_EQUIPAMENTO_MANOBRAVEIS.has(
            tipo
        )
    ) {
        return tipo;
    }


    return null;
}


// ============================================================
// MANOBRÁVEL
// ============================================================

function ehManobravel(
    item
) {

    return TIPOS_EQUIPAMENTO_MANOBRAVEIS.has(

        classificarEquipamento(
            item
        )

    );
}


// ============================================================
// ESTADO
// ============================================================

function normalizarEstadoLocal(
    valor
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const bruto =
        textoMaiusculo(
            valor
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );


    const aliases = {

        FECHADO:
            "FECHADO",

        FECHADA:
            "FECHADO",

        F:
            "FECHADO",

        CLOSED:
            "FECHADO",

        CLOSE:
            "FECHADO",

        LIGADO:
            "FECHADO",

        LIGADA:
            "FECHADO",

        ON:
            "FECHADO",

        "1":
            "FECHADO",


        ABERTO:
            "ABERTO",

        ABERTA:
            "ABERTO",

        A:
            "ABERTO",

        OPEN:
            "ABERTO",

        OPENED:
            "ABERTO",

        OFF:
            "ABERTO",

        "0":
            "ABERTO",


        INDISPONIVEL:
            "INDISPONIVEL",

        FORA:
            "INDISPONIVEL",

        INOPERANTE:
            "INDISPONIVEL",


        BYPASSADO:
            "BYPASSADO",

        BYPASS:
            "BYPASSADO",

    };


    return (
        aliases[
            bruto
        ] ||
        null
    );
}


// ============================================================
// ESTADO EFETIVO
// ============================================================

function obterEstadoEfetivo(
    equipamentoId,
    equipamento,
    opcoes = {}
) {

    const id =
        idNormalizado(
            equipamentoId
        );


    if (!id) {

        return {

            estado:
                null,

            origem:
                "SEM_ID",

        };
    }


    // --------------------------------------------------------
    // MODELO
    // --------------------------------------------------------

    try {

        const resultado =
            consultarEstadoEquipamento?.(
                id
            );


        const estado =
            normalizarEstadoLocal(
                resultado?.estado ??
                resultado?.status ??
                resultado
            );


        if (
            estado
        ) {

            return {

                estado,

                origem:
                    "MODELO_REDE",

                diagnostico:
                    resultado,

            };
        }

    } catch {
        // continua
    }


    // --------------------------------------------------------
    // CADASTRO
    // --------------------------------------------------------

    const estadoCadastro =
        normalizarEstadoLocal(

            obterPrimeiro(
                equipamento,
                [
                    "estado",
                    "status",
                    "situacao",
                    "situacaoOperacional",
                    "estadoOperacional",
                    "posicao",
                    "POS",
                ]
            )

        );


    if (
        estadoCadastro
    ) {

        return {

            estado:
                estadoCadastro,

            origem:
                "CADASTRO",

        };
    }


    // --------------------------------------------------------
    // PADRÃO DO MODELO
    //
    // Equipamento manobrável comum sem estado explícito:
    // FECHADO.
    //
    // --------------------------------------------------------

    if (
        ehManobravel(
            equipamento
        ) &&
        opcoes.tratarPadraoInicial !== false
    ) {

        return {

            estado:
                "FECHADO",

            origem:
                "PADRAO_INICIAL_EQUIPAMENTO_MANOBRAVEL",

        };
    }


    return {

        estado:
            "NAO_INFORMADO",

        origem:
            "SEM_FONTE_DE_ESTADO",

    };
}


// ============================================================
// BUSCAR EQUIPAMENTO NA COLEÇÃO
// ============================================================

function buscarNaColecaoPorId(
    colecao,
    id
) {

    const alvo =
        texto(
            id
        );

    if (!alvo) {
        return null;
    }

    const lista =
        normalizarColecao(
            colecao
        );


    return (

        lista.find(
            item => {

                if (
                    !item ||
                    typeof item !==
                        "object"
                ) {
                    return false;
                }


                const ids = [

                    item?.id,

                    item?.COD_ID,

                    item?.codId,

                    item?.codigo,

                    item?.plaqueta,

                    item?.unidadeId,

                    item?.unsemtId,

                    item?.pqt,

                    item?.PQT,

                ];


                return ids.some(
                    valor =>
                        texto(
                            valor
                        ) ===
                        alvo
                );
            }
        )

    || null);
}


// ============================================================
// RESOLVER EQUIPAMENTO
// ============================================================

function resolverEquipamentoPorId(
    topologia,
    id
) {

    const alvo =
        texto(
            id
        );

    if (!alvo) {
        return null;
    }


    const fontes = [

        topologia?.unidadesSeccionadoras,

        topologia?.equipamentosOperacionais,

        topologia?.equipamentos,

        topologia?.transformadores,

    ];


    for (
        const fonte of
        fontes
    ) {

        const localizado =
            buscarNaColecaoPorId(
                fonte,
                alvo
            );

        if (
            localizado
        ) {
            return localizado;
        }
    }


    try {

        const modelo =
            buscarEquipamentoModelo?.(
                alvo
            );

        if (
            modelo
        ) {
            return modelo;
        }

    } catch {
        // continua
    }


    return null;
}


// ============================================================
// LISTAR EQUIPAMENTOS
// ============================================================

function listarEquipamentos(
    topologia
) {

    const fontes = [

        topologia?.unidadesSeccionadoras,

        topologia?.equipamentosOperacionais,

        topologia?.equipamentos,

        topologia?.mapaEquipamentosTotal,

        topologia?.transformadores,

    ];


    const mapa =
        new Map();


    for (
        const fonte of
        fontes
    ) {

        for (
            const item of
            normalizarColecao(
                fonte
            )
        ) {

            const id =
                obterIdEquipamento(
                    item
                );


            if (!id) {
                continue;
            }


            if (
                !mapa.has(
                    id
                )
            ) {

                mapa.set(
                    id,
                    item
                );
            }
        }
    }


    return Array.from(
        mapa.values()
    );
}


// ============================================================
// RESOLVER EQUIPAMENTO DA OCORRÊNCIA
// ============================================================

function resolverEquipamentoDaOcorrencia(
    topologia,
    ocorrencia
) {

    const equipamentoId =
        idNormalizado(

            ocorrencia?.equipamentoDesarme ??

            ocorrencia?.equipamentoDesarmeId ??

            ocorrencia?.equipamentoId ??

            ocorrencia?.equipamento ??

            null

        );


    const pontoId =
        idNormalizado(

            ocorrencia?.pontoId ??

            ocorrencia?.ponto ??

            ocorrencia?.PAC ??

            ocorrencia?.COD_ID_PONTO ??

            null

        );


    if (
        equipamentoId
    ) {

        const equipamento =
            resolverEquipamentoPorId(
                topologia,
                equipamentoId
            );


        if (
            equipamento
        ) {

            return {

                equipamento,

                metodo:
                    "ID_OCORRENCIA",

                pontoId,

            };
        }
    }


    // --------------------------------------------------------
    // Fallback por ponto
    // --------------------------------------------------------

    const equipamentos =
        listarEquipamentos(
            topologia
        );


    if (
        pontoId
    ) {

        const associados =
            equipamentos.filter(
                item =>
                    itemRelacionaPonto(
                        item,
                        pontoId
                    )
            );


        const protecao =
            associados.find(
                item =>
                    TIPOS_PROTECAO.has(
                        classificarEquipamento(
                            item
                        )
                    )
            );


        if (
            protecao
        ) {

            return {

                equipamento:
                    protecao,

                metodo:
                    "PONTO_PROTECAO",

                pontoId,

            };
        }


        const manobravels =
            associados.filter(
                ehManobravel
            );


        if (
            manobravels.length >
            0
        ) {

            return {

                equipamento:
                    manobravels[0],

                metodo:
                    "PONTO_MANOBRAVEL",

                pontoId,

            };
        }
    }


    return {

        equipamento:
            null,

        metodo:
            "NAO_IDENTIFICADO",

        pontoId,

    };
}


// ============================================================
// FORMATAR EQUIPAMENTO
// ============================================================

function formatarEquipamento(
    equipamento,
    classificacao = null
) {

    if (
        !equipamento
    ) {
        return null;
    }


    const id =
        obterIdEquipamento(
            equipamento
        );


    const tipo =
        classificarEquipamento(
            equipamento
        );


    const pacs =
        obterPacs(
            equipamento
        );


    const estado =
        id
            ? obterEstadoEfetivo(
                id,
                equipamento,
                {
                    tratarPadraoInicial:
                        true,
                }
              )
            : {
                estado:
                    null,

                origem:
                    "SEM_ID",
              };


    const resultado = {

        id,

        tipo,

        nomeTipoEquipamento:

            equipamento?.nomeTipoEquipamento ??

            tipo ??

            null,


        plaqueta:

            obterPrimeiro(
                equipamento,
                [
                    "plaqueta",
                    "plaquetaIPT",
                    "codigo",
                    "COD_ID",
                    "id",
                ]
            ),


        alimentador:

            obterAlimentadorItem(
                equipamento
            ),


        circuito:

            obterCircuito(
                equipamento
            ),


        subestacao:

            obterPrimeiro(
                equipamento,
                [
                    "subestacao",
                    "SUB",
                ]
            ),


        tipoUnidade:

            obterPrimeiro(
                equipamento,
                [
                    "TIP_UNID",
                    "tipUnid",
                    "tipoUnidade",
                ]
            ),


        pac1:
            pacs.pac1,


        pac2:
            pacs.pac2,


        pac1Original:
            pacs.pac1Original,


        pac2Original:
            pacs.pac2Original,


        pontoAssociado:

            obterPrimeiro(
                equipamento,
                [
                    "pontoAssociado",
                    "pontoId",
                ]
            ) ||

            pacs.pac1 ||

            pacs.pac2 ||

            null,


        estado:
            estado.estado,


        origemEstado:
            estado.origem,


        estadoDiagnostico:
            estado.diagnostico ??
            null,


        telecomandado:

            Boolean(

                numero(
                    obterPrimeiro(
                        equipamento,
                        [
                            "TLCD",
                            "tlcd",
                        ]
                    )
                ) ||

                obterPrimeiro(
                    equipamento,
                    [
                        "telecomandado",
                        "telecomando",
                    ]
                )

            ),


        capacidadeElo:

            obterPrimeiro(
                equipamento,
                [
                    "CAP_ELO",
                    "capacidadeElo",
                ]
            ),


        posicao:

            obterPrimeiro(
                equipamento,
                [
                    "POS",
                    "posicao",
                ]
            ),


        descricao:

            obterPrimeiro(
                equipamento,
                [
                    "DESCR",
                    "descricao",
                    "DESCRICAO",
                ]
            ),


        equipamento,

    };


    if (
        classificacao
    ) {

        resultado.classificacao =
            classificacao;
    }


    return resultado;
}


// ============================================================
// DEDUPLICAÇÃO
// ============================================================

function deduplicarPorId(
    lista
) {

    const mapa =
        new Map();


    for (
        const item of
        lista || []
    ) {

        if (!item) {
            continue;
        }


        const chave =
            texto(
                item.id
            ) ||

            JSON.stringify(
                item
            );


        if (
            !mapa.has(
                chave
            )
        ) {

            mapa.set(
                chave,
                item
            );
        }
    }


    return Array.from(
        mapa.values()
    );
}


// ============================================================
// PROTEÇÕES
// ============================================================

function identificarProtecoes(
    topologia,
    pontoId,
    alimentador,
    equipamentoPrincipal
) {

    const equipamentos =
        listarEquipamentos(
            topologia
        );


    const resultado = [];


    const principalId =
        obterIdEquipamento(
            equipamentoPrincipal
        );


    if (
        equipamentoPrincipal &&
        TIPOS_PROTECAO.has(
            classificarEquipamento(
                equipamentoPrincipal
            )
        )
    ) {

        resultado.push(

            formatarEquipamento(
                equipamentoPrincipal,
                "PROTECAO_PRINCIPAL"
            )

        );
    }


    for (
        const item of
        equipamentos
    ) {

        if (
            !TIPOS_PROTECAO.has(
                classificarEquipamento(
                    item
                )
            )
        ) {
            continue;
        }


        const id =
            obterIdEquipamento(
                item
            );


        if (
            id ===
            principalId
        ) {
            continue;
        }


        const eqAlimentador =
            obterAlimentadorItem(
                item
            );


        if (
            alimentador &&
            eqAlimentador &&
            eqAlimentador !==
                alimentador
        ) {
            continue;
        }


        const relacionado =
            pontoId
                ? itemRelacionaPonto(
                    item,
                    pontoId
                )
                : false;


        resultado.push(

            formatarEquipamento(

                item,

                relacionado

                    ? "PROTECAO_NO_PONTO"

                    : "PROTECAO_ALIMENTADOR"

            )

        );
    }


    return deduplicarPorId(
        resultado
    );
}


// ============================================================
// NAVEGAÇÃO SEGURA
// ============================================================

function buscarRedeSeguro(
    funcao,
    topologia,
    pontoId,
    opcoes = {}
) {

    if (
        !pontoId
    ) {

        return {

            encontrado:
                false,

            pontoInicial:
                null,

            pontos:
                [],

            trechos:
                [],

            quantidadePontos:
                0,

            quantidadeTrechos:
                0,

        };
    }


    try {

        const resultado =
            funcao(
                topologia,
                pontoId,
                opcoes
            );


        return {

            ...resultado,

            pontos:
                normalizarColecao(
                    resultado?.pontos
                ),

            trechos:
                normalizarColecao(
                    resultado?.trechos
                ),

            quantidadePontos:

                resultado?.quantidadePontos ??

                normalizarColecao(
                    resultado?.pontos
                ).length,


            quantidadeTrechos:

                resultado?.quantidadeTrechos ??

                normalizarColecao(
                    resultado?.trechos
                ).length,

        };

    } catch (
        erro
    ) {

        console.warn(
            "[Análise Operacional] Falha na navegação:",
            erro
        );


        return {

            encontrado:
                false,

            pontoInicial:
                pontoId,

            pontos:
                [],

            trechos:
                [],

            quantidadePontos:
                0,

            quantidadeTrechos:
                0,

            erro:

                erro?.message ??

                String(
                    erro
                ),

        };
    }
}


// ============================================================
// REDE MONTANTE
// ============================================================

function obterMontante(
    topologia,
    pontoId,
    alimentador
) {

    // Primeiro usa o modelo central.

    try {

        const resultado =
            buscarMontante(
                pontoId,
                {
                    alimentador,
                    respeitarEstadoOperacional:
                        true,
                }
            );


        if (
            resultado
        ) {

            return resultado;
        }

    } catch {
        // fallback
    }


    return buscarRedeSeguro(
        buscarRedeAMontante,
        topologia,
        pontoId,
        {
            alimentador,
            respeitarEstadoOperacional:
                true,
        }
    );
}


// ============================================================
// REDE JUSANTE
// ============================================================

function obterJusante(
    topologia,
    pontoId,
    alimentador
) {

    try {

        const resultado =
            buscarJusante(
                pontoId,
                {
                    alimentador,
                    respeitarEstadoOperacional:
                        true,
                }
            );


        if (
            resultado
        ) {

            return resultado;
        }

    } catch {
        // fallback
    }


    return buscarRedeSeguro(
        buscarRedeAJusante,
        topologia,
        pontoId,
        {
            alimentador,
            respeitarEstadoOperacional:
                true,
        }
    );
}


// ============================================================
// ÁREA AFETADA
// ============================================================

function construirAreaAfetada(
    topologia,
    pontoId,
    alimentador
) {

    // --------------------------------------------------------
    // Primeiro tenta navegar com o estado operacional normal.
    // --------------------------------------------------------

    const jusanteOperacional =
        obterJusante(
            topologia,
            pontoId,
            alimentador
        );


    // --------------------------------------------------------
    // Em caso de equipamento de desarme aberto, o caminho
    // operacional pode ficar bloqueado justamente no ponto
    // da ocorrência.
    //
    // Nesse caso usamos navegação física para identificação
    // estrutural da área, sem alterar o estado operacional.
    // --------------------------------------------------------

    let jusanteFisico =
        null;


    if (
        !jusanteOperacional?.pontos?.length &&
        !jusanteOperacional?.trechos?.length
    ) {

        jusanteFisico =
            buscarRedeSeguro(
                buscarRedeAJusante,
                topologia,
                pontoId,
                {
                    alimentador,

                    respeitarEstadoOperacional:
                        false,

                    permitirTravessiaEntreAlimentadores:
                        false,
                }
            );
    }


    const resultadoBase =
        (
            (
                jusanteOperacional?.pontos?.length ||
                jusanteOperacional?.trechos?.length
            )

                ? jusanteOperacional

                : jusanteFisico

        ) || {

            pontos:
                [],

            trechos:
                [],

        };


    const pontos =
        normalizarColecao(
            resultadoBase?.pontos
        );


    const trechos =
        normalizarColecao(
            resultadoBase?.trechos
        );


    const pontosIds =
        new Set(
            pontos
                .map(
                    obterIdPonto
                )
                .filter(Boolean)
                .map(
                    normalizarPac
                )
        );


    if (
        pontoId
    ) {

        pontosIds.add(
            normalizarPac(
                pontoId
            )
        );
    }


    const transformadores =
        normalizarColecao(
            topologia?.transformadores
        )
            .filter(
                item => {

                    const ponto =
                        obterPrimeiro(
                            item,
                            [
                                "pontoAssociado",
                                "pontoId",
                                "PAC_1",
                                "PAC_2",
                            ]
                        );


                    if (!ponto) {
                        return false;
                    }


                    return pontosIds.has(
                        normalizarPac(
                            ponto
                        )
                    );
                }
            );


    return {

        pontos,

        trechos,

        transformadores,

        quantidadePontos:
            pontos.length,

        quantidadeTrechos:
            trechos.length,

        quantidadeTransformadores:
            transformadores.length,

        fallback:
            pontos.length === 0 &&
            trechos.length === 0,

        modo:

            jusanteOperacional?.pontos?.length ||

            jusanteOperacional?.trechos?.length

                ? "OPERACIONAL"

                : "FISICO",

    };
}


// ============================================================
// ISOLAMENTO
// ============================================================

function identificarIsolamento(
    topologia,
    pontoId,
    areaAfetada,
    alimentador
) {

    const equipamentos =
        listarEquipamentos(
            topologia
        )
            .filter(
                item =>
                    TIPOS_ISOLAMENTO.has(
                        classificarEquipamento(
                            item
                        )
                    )
            );


    const idsArea =
        new Set(

            normalizarColecao(
                areaAfetada?.pontos
            )

                .map(
                    obterIdPonto
                )

                .filter(Boolean)

                .map(
                    normalizarPac
                )

        );


    if (
        pontoId
    ) {

        idsArea.add(
            normalizarPac(
                pontoId
            )
        );
    }


    const candidatos =
        [];


    for (
        const equipamento of
        equipamentos
    ) {

        const eqAlimentador =
            obterAlimentadorItem(
                equipamento
            );


        if (
            alimentador &&
            eqAlimentador &&
            eqAlimentador !==
                alimentador
        ) {
            continue;
        }


        const pacs =
            obterPacs(
                equipamento
            );


        const pontosEq = [

            obterPrimeiro(
                equipamento,
                [
                    "pontoAssociado",
                    "pontoId",
                ]
            ),

            pacs.pac1,

            pacs.pac2,

        ]
            .filter(Boolean)
            .map(
                normalizarPac
            );


        const dentroArea =
            pontosEq.some(
                id =>
                    idsArea.has(
                        id
                    )
            );


        if (
            !dentroArea
        ) {
            continue;
        }


        const idEquipamento =
            obterIdEquipamento(
                equipamento
            );


        const estado =
            obterEstadoEfetivo(
                idEquipamento,
                equipamento
            );


        let prioridade =
            3;


        let classificacao =
            "INTERNO_AREA";


        let fronteiraArea =
            false;


        if (
            pontoId &&
            pontosEq.includes(
                normalizarPac(
                    pontoId
                )
            )
        ) {

            prioridade =
                1;

            classificacao =
                "FRONTEIRA_OCORRENCIA";

            fronteiraArea =
                true;

        } else {

            const proximidade =
                normalizarColecao(
                    areaAfetada?.trechos
                ).some(
                    trecho => {

                        const propriedades =
                            obterPropriedades(
                                trecho
                            );


                        const pontosTrecho = [

                            obterPrimeiro(
                                trecho,
                                [
                                    "pontoInicial",
                                    "PAC_1",
                                    "PN_CON_1",
                                ]
                            ),

                            obterPrimeiro(
                                trecho,
                                [
                                    "pontoFinal",
                                    "PAC_2",
                                    "PN_CON_2",
                                ]
                            ),

                            propriedades?.PN_CON_1,

                            propriedades?.PN_CON_2,

                        ]
                            .filter(Boolean)
                            .map(
                                normalizarPac
                            );


                        return pontosTrecho.some(
                            p =>
                                pontosEq.includes(
                                    p
                                )
                        );
                    }
                );


            if (
                proximidade
            ) {

                prioridade =
                    2;

                classificacao =
                    "FRONTEIRA_REDE_AFETADA";

                fronteiraArea =
                    true;
            }
        }


        candidatos.push({

            ...formatarEquipamento(
                equipamento,
                classificacao
            ),

            estado:
                estado.estado,

            origemEstado:
                estado.origem,

            prioridadeIsolamento:
                prioridade,

            fronteiraArea,

            pontoAssociado:
                pontosEq[0] ??
                null,

        });
    }


    candidatos.sort(
        (
            a,
            b
        ) => (

            (
                a?.prioridadeIsolamento ??
                99
            ) -

            (
                b?.prioridadeIsolamento ??
                99
            )

        )
    );


    return deduplicarPorId(
        candidatos
    );
}


// ============================================================
// INTERLIGAÇÕES COMPATÍVEIS
// ============================================================
//
// O sistema antigo possui "topologia.interligacoes".
// O novo motor trabalha com candidatos reais encontrados
// pela topologia/PAC/equipamento.
//
// Aqui combinamos ambos sem deixar a estrutura antiga mandar
// na decisão.
//
// ============================================================

function obterInterligacoesOficiais(
    topologia,
    alimentador
) {

    const lista =
        normalizarColecao(
            topologia?.interligacoes
        );


    return lista.filter(
        item => {

            const valores = [

                item?.alimentadorA,

                item?.alimentadorB,

                item?.alimentadorOrigem,

                item?.alimentadorDestino,

                item?.origem,

                item?.destino,

            ]
                .map(
                    normalizarAlimentador
                )
                .filter(Boolean);


            const alvo =
                normalizarAlimentador(
                    alimentador
                );


            return (
                valores.includes(
                    alvo
                )
            );
        }
    );
}


// ============================================================
// ADAPTAR CANDIDATO DO NOVO MOTOR
// ============================================================

function formatarCandidatoRecomposicao(
    candidato
) {

    if (
        !candidato
    ) {
        return null;
    }


    const equipamentoId =
        idNormalizado(

            candidato?.equipamentoInterligacao ??

            candidato?.equipamentoIdInterligacao ??

            candidato?.equipamentoId ??

            candidato?.id ??

            null

        );


    const plaqueta =
        idNormalizado(

            candidato?.plaqueta ??

            candidato?.equipamento?.plaqueta ??

            equipamentoId ??

            null

        );


    const estado =
        normalizarEstadoLocal(

            candidato?.estado ??

            candidato?.estadoOperacional ??

            candidato?.equipamento?.estado ??

            null

        );


    const alimentadorOrigem =
        normalizarAlimentador(

            candidato?.origem ??

            candidato?.alimentador ??

            candidato?.alimentadorOrigem ??

            null

        );


    const alimentadorDestino =
        normalizarAlimentador(

            candidato?.destino ??

            candidato?.alimentadorDestino ??

            null

        );


    const caminho =
        candidato?.caminho ??

        candidato?.caminhoEletrico ??

        candidato?.path ??

        null;


    const manobra =
        candidato?.manobra ??

        {

            equipamento:
                equipamentoId,

            acao:
                "FECHAR",

        };


    return {

        ...candidato,

        id:
            candidato?.id ??
            equipamentoId,

        interligacaoId:
            candidato?.interligacaoId ??
            null,

        equipamentoId,

        equipamentoInterligacao:
            equipamentoId,

        equipamentoIdInterligacao:
            equipamentoId,

        equipamento:
            candidato?.equipamento ??
            null,

        plaqueta,

        tipoEquipamento:

            candidato?.tipoEquipamento ??

            candidato?.tipo ??

            null,

        tipo:
            candidato?.tipo ??
            null,

        tipUnid:
            candidato?.tipUnid ??
            candidato?.TIP_UNID ??
            null,

        estado,

        alimentadorOrigem,

        alimentadorDestino,

        alimentador:
            alimentadorOrigem,

        destino:
            alimentadorDestino,

        caminho,

        manobra,

        acao:
            "FECHAR",

        quantidadeManobras:
            1,

        status:
            candidato?.status ??
            "CANDIDATO",

        clientesRecuperados:
            candidato?.clientesRecuperados ??
            null,

        clientesConhecidos:
            Number.isFinite(
                Number(
                    candidato?.clientesRecuperados
                )
            ),

    };
}


// ============================================================
// CORRENTES
// ============================================================

function obterCorrenteTrecho(
    trechoId
) {

    if (!trechoId) {
        return null;
    }


    try {

        return numero(

            consultarCorrenteTrecho?.(
                trechoId
            )

        );

    } catch {
        return null;
    }
}


function obterCorrenteAlimentador(
    alimentador
) {

    if (
        !alimentador
    ) {
        return null;
    }


    try {

        return numero(

            consultarCorrenteAlimentador?.(
                alimentador
            )

        );

    } catch {
        return null;
    }
}


function resolverCorrente(
    ocorrencia,
    areaAfetada
) {

    const correnteInformada =
        numero(

            ocorrencia?.correnteTrechoOcorrencia ??

            ocorrencia?.correnteDesligado ??

            ocorrencia?.manobra?.correnteDesligado ??

            null

        );


    if (
        correnteInformada !==
        null
    ) {

        return {

            corrente:
                correnteInformada,

            conhecida:
                true,

            origem:
                "OCORRENCIA",

            trechoId:
                null,

            candidatos:
                [],

        };
    }


    const trechoAtual =
        normalizarColecao(
            areaAfetada?.trechos
        )[0];


    const trechoId =
        obterIdTrecho(
            trechoAtual
        );


    const correnteTrecho =
        obterCorrenteTrecho(
            trechoId
        );


    if (
        possuiNumeroPositivo(
            correnteTrecho
        )
    ) {

        return {

            corrente:
                correnteTrecho,

            conhecida:
                true,

            origem:
                "MODELO_REDE_TRECHO",

            trechoId,

            candidatos:
                [
                    {
                        corrente:
                            correnteTrecho,

                        trechoId,

                        origem:
                            "MODELO_REDE_TRECHO",
                    }
                ],

        };
    }


    const correnteAlimentador =
        obterCorrenteAlimentador(

            normalizarAlimentador(
                ocorrencia?.alimentador
            )

        );


    if (
        possuiNumeroPositivo(
            correnteAlimentador
        )
    ) {

        return {

            corrente:
                correnteAlimentador,

            conhecida:
                true,

            origem:
                "MODELO_REDE_ALIMENTADOR",

            trechoId:
                null,

            candidatos:
                [
                    {
                        corrente:
                            correnteAlimentador,

                        origem:
                            "MODELO_REDE_ALIMENTADOR",

                    }
                ],

        };
    }


    return {

        corrente:
            null,

        conhecida:
            false,

        origem:
            null,

        trechoId:
            null,

        candidatos:
            [],

    };
}


// ============================================================
// CAPACIDADE
// ============================================================

function obterCapacidadeTrecho(
    trecho
) {

    const direta =
        numero(

            obterPrimeiro(
                trecho,
                [
                    "capacidade",
                    "capacidadeMaximaAmperes",
                    "CAPACIDADE",
                    "ampacidade",
                ]
            )

        );


    if (
        possuiNumeroPositivo(
            direta
        )
    ) {

        return direta;
    }


    const id =
        obterIdTrecho(
            trecho
        );


    if (!id) {
        return null;
    }


    try {

        const calculada =
            numero(

                calcularCapacidadeTrecho?.(
                    id
                )

            );


        if (
            possuiNumeroPositivo(
                calculada
            )
        ) {

            return calculada;
        }

    } catch {
        // continua
    }


    return null;
}


function analisarCapacidadeArea(
    areaAfetada,
    corrente
) {

    if (
        !possuiNumeroPositivo(
            corrente
        )
    ) {

        return {

            conhecida:
                false,

            aprovada:
                false,

            motivo:
                "Corrente não informada.",

            trechos:
                [],

        };
    }


    const trechos =
        normalizarColecao(
            areaAfetada?.trechos
        );


    if (
        trechos.length ===
        0
    ) {

        return {

            conhecida:
                false,

            aprovada:
                false,

            motivo:
                "Nenhum trecho disponível para validação de capacidade.",

            trechos:
                [],

        };
    }


    const verificacoes =
        trechos.map(
            trecho => {

                const capacidade =
                    obterCapacidadeTrecho(
                        trecho
                    );


                if (
                    !possuiNumeroPositivo(
                        capacidade
                    )
                ) {

                    return {

                        trechoId:
                            obterIdTrecho(
                                trecho
                            ),

                        capacidade:
                            null,

                        limiteOperacional:
                            null,

                        corrente,

                        carregamento:
                            null,

                        status:
                            "SEM_CAPACIDADE",

                    };
                }


                const limite =
                    capacidade *
                    0.8;


                const carregamento =
                    (
                        corrente /
                        capacidade
                    ) *
                    100;


                return {

                    trechoId:
                        obterIdTrecho(
                            trecho
                        ),

                    capacidade,

                    limiteOperacional:
                        limite,

                    corrente,

                    carregamento,

                    status:

                        corrente <=
                        limite

                            ? "APROVADO"

                            : "SOBRECARGA",

                };
            }
        );


    const sobrecarga =
        verificacoes.some(
            item =>
                item?.status ===
                "SOBRECARGA"
        );


    const semCapacidade =
        verificacoes.some(
            item =>
                item?.status ===
                "SEM_CAPACIDADE"
        );


    const conhecidos =
        verificacoes.filter(
            item =>
                Number.isFinite(
                    item?.capacidade
                )
        );


    const limitante =
        conhecidos.length
            ? conhecidos.reduce(
                (
                    atual,
                    candidato
                ) =>

                    candidato.capacidade <
                    atual.capacidade

                        ? candidato

                        : atual
              )
            : null;


    return {

        conhecida:
            !semCapacidade,

        aprovada:
            !sobrecarga &&
            !semCapacidade,

        motivo:

            sobrecarga

                ? "Pelo menos um trecho excede o limite operacional de 80%."

                : semCapacidade

                ? "Um ou mais trechos não possuem capacidade definida."

                : "Capacidade validada.",

        trechos:
            verificacoes,

        limitante,

    };
}


// ============================================================
// CONSTRUIR CORRENTE DA RECOMPOSIÇÃO
// ============================================================

function obterCorrentesRecomposicao(
    ocorrencia
) {

    const correnteDesligado =
        numero(

            ocorrencia?.correnteTrechoOcorrencia ??

            ocorrencia?.correnteDesligado ??

            ocorrencia?.manobra?.correnteDesligado ??

            null

        );


    const correnteDestino =
        numero(

            ocorrencia?.correnteTrechoRecuperacao ??

            ocorrencia?.correnteAtualDestino ??

            ocorrencia?.manobra?.correnteDestino ??

            null

        );


    return {

        correnteDesligado,

        correnteDestino,

        conhecida:

            correnteDesligado !==
                null &&

            correnteDestino !==
                null,

        correnteProjetada:

            correnteDesligado !==
                null &&

            correnteDestino !==
                null

                ? correnteDesligado +
                  correnteDestino

                : null,

    };
}


// ============================================================
// ANALISAR OCORRÊNCIA
// ============================================================

export function analisarOcorrencia(
    ocorrencia = {}
) {

    // ========================================================
    // TOPOLOGIA
    // ========================================================

    const topologia =
        getTopologiaBDGD?.();


    if (!topologia) {

        return {

            status:
                "SEM_TOPOLOGIA",

            ocorrencia,

            equipamento:
                null,

            equipamentoOcorrencia:
                null,

            trecho:
                null,

            protecao:
                [],

            montante:
                null,

            jusante:
                null,

            areaAfetada: {

                pontos:
                    [],

                trechos:
                    [],

                transformadores:
                    [],

                quantidadePontos:
                    0,

                quantidadeTrechos:
                    0,

                quantidadeTransformadores:
                    0,

                fallback:
                    true,

            },

            isolamento:
                [],

            interligacoes:
                [],

            alimentadoresApoio:
                [],

            transferenciasPossiveis:
                [],

            melhorTransferencia:
                null,

            corrente: {

                corrente:
                    null,

                conhecida:
                    false,

            },

            sequenciaManobra:
                [],

            recomendacoes: [

                "Aguardar carregamento da topologia BDGD."

            ],

            alertas: [

                "TOPOLOGIA_NAO_DISPONIVEL"

            ],

            estadoAnalise: {

                topologiaDisponivel:
                    false,

                correnteTransferida:
                    null,

                correnteConhecida:
                    false,

                possuiProtecao:
                    false,

                possuiIsolamento:
                    false,

                possuiInterligacao:
                    false,

                possuiTransferencia:
                    false,

                transferenciaViavel:
                    false,

                transferenciaCondicionada:
                    false,

                transferenciaBloqueada:
                    false,

                transferenciaNaoValidada:
                    false,

                clientesConhecidos:
                    false,

                areaAfetadaConhecida:
                    false,

            },

            diagnostico: {

                topologiaDisponivel:
                    false,

            },

        };
    }


    // ========================================================
    // ALIMENTADOR
    // ========================================================

    const alimentadorInformado =
        normalizarAlimentador(

            ocorrencia?.alimentador ??

            ocorrencia?.alimentadorOrigem ??

            ocorrencia?.feed ??

            ocorrencia?.CT_COD_OP ??

            ocorrencia?.CTMT ??

            null

        );


    // ========================================================
    // EQUIPAMENTO DO DESARME
    // ========================================================

    const resolucaoEquipamento =
        resolverEquipamentoDaOcorrencia(
            topologia,
            ocorrencia
        );


    const equipamentoPrincipal =
        resolucaoEquipamento.equipamento;


    const alimentador =
        alimentadorInformado ||

        obterAlimentadorItem(
            equipamentoPrincipal
        ) ||

        null;


    const equipamentoFicha =
        equipamentoPrincipal

            ? formatarEquipamento(
                equipamentoPrincipal,
                "OCORRENCIA"
              )

            : null;


    // ========================================================
    // PONTO DA OCORRÊNCIA
    // ========================================================

    const pontoOcorrencia =

        idNormalizado(
            ocorrencia?.pontoId ??
            ocorrencia?.ponto ??
            ocorrencia?.PAC ??
            ocorrencia?.COD_ID_PONTO
        ) ||

        normalizarPac(
            obterPrimeiro(
                equipamentoPrincipal,
                [
                    "pontoAssociado",
                    "pontoId",
                    "PAC_1",
                    "PAC_2",
                ]
            )
        ) ||

        null;


    // ========================================================
    // PROTEÇÕES
    // ========================================================

    const protecoes =
        identificarProtecoes(
            topologia,
            pontoOcorrencia,
            alimentador,
            equipamentoPrincipal
        );


    // ========================================================
    // MONTANTE
    // ========================================================

    const montante =
        obterMontante(
            topologia,
            pontoOcorrencia,
            alimentador
        );


    // ========================================================
    // JUSANTE
    // ========================================================

    const jusante =
        obterJusante(
            topologia,
            pontoOcorrencia,
            alimentador
        );


    // ========================================================
    // ÁREA AFETADA
    // ========================================================

    const areaAfetada =
        construirAreaAfetada(
            topologia,
            pontoOcorrencia,
            alimentador
        );


    // ========================================================
    // ISOLAMENTO
    // ========================================================

    const isolamento =
        identificarIsolamento(
            topologia,
            pontoOcorrencia,
            areaAfetada,
            alimentador
        );


    // ========================================================
    // CORRENTES
    // ========================================================

    const correntes =
        obterCorrentesRecomposicao(
            ocorrencia
        );


    const correnteBase =
        correntes.correnteDesligado;


    const correnteOperacional =
        correnteBase ??
        resolverCorrente(
            ocorrencia,
            areaAfetada
        ).corrente;


    const correnteInfo = {

        corrente:
            correnteOperacional,

        conhecida:
            correnteOperacional !==
            null,

        origem:

            correnteBase !==
                null

                ? "OCORRENCIA"

                : resolverCorrente(
                    ocorrencia,
                    areaAfetada
                  ).origem,

        trechoId:
            resolverCorrente(
                ocorrencia,
                areaAfetada
            ).trechoId,

        candidatos:
            resolverCorrente(
                ocorrencia,
                areaAfetada
            ).candidatos,

    };


    // ========================================================
    // CANDIDATOS AUTOMÁTICOS
    // ========================================================

    let candidatosAutomaticos =
        [];


    const ocorrenciaParaMotor = {

        ...ocorrencia,

        alimentador,

        equipamentoDesarme:

            ocorrencia?.equipamentoDesarme ??

            ocorrencia?.equipamentoDesarmeId ??

            ocorrencia?.equipamentoProtecao ??

            ocorrencia?.equipamentoQueDesarmou ??

            null,

        equipamentoDesarmeId:

            ocorrencia?.equipamentoDesarmeId ??

            ocorrencia?.equipamentoDesarme ??

            null,

        equipamentoInterligacao:
            null,

        equipamentoIdInterligacao:
            null,

        alimentadorDestino:
            null,

        trecho:
            ocorrencia?.trecho ??
            null,

        manobra: {

            ...(
                ocorrencia?.manobra ||
                {}
            ),

            equipamentoInterligacao:
                null,

            alimentadorDestino:
                null,

            correnteDesligado:

                ocorrencia?.manobra?.correnteDesligado ??
                ocorrencia?.correnteTrechoOcorrencia ??
                null,

            correnteDestino:

                ocorrencia?.manobra?.correnteDestino ??
                ocorrencia?.correnteTrechoRecuperacao ??
                null,

        },

    };


    try {

        candidatosAutomaticos =
            descobrirCandidatosRecomposicao(
                ocorrenciaParaMotor
            ) || [];

    } catch (
        erro
    ) {

        console.warn(
            "[Análise Operacional] Não foi possível descobrir candidatos automáticos:",
            erro
        );

        candidatosAutomaticos =
            [];
    }


    const transferenciasAutomaticas =
        candidatosAutomaticos
            .map(
                formatarCandidatoRecomposicao
            )
            .filter(Boolean);


    // ========================================================
    // INTERLIGAÇÕES OFICIAIS
    // ========================================================

    const interligacoesOficiais =
        obterInterligacoesOficiais(
            topologia,
            alimentador
        );


    // ========================================================
    // UNIFICAR INTERLIGAÇÕES
    // ========================================================
    //
    // O novo candidato BDGD tem prioridade.
    //
    // A interligação oficial antiga é somente complemento
    // de compatibilidade/diagnóstico.
    //
    // ========================================================

    const interligacoesMap =
        new Map();


    for (
        const candidato of
        transferenciasAutomaticas
    ) {

        const chave =
            idNormalizado(
                candidato?.equipamentoId
            );


        if (
            chave
        ) {

            interligacoesMap.set(
                chave,
                candidato
            );
        }
    }


    for (
        const oficial of
        interligacoesOficiais
    ) {

        const equipamentoId =
            idNormalizado(

                oficial?.equipamentoInterligacao ??

                oficial?.equipamentoIdInterligacao ??

                oficial?.equipamentoId ??

                oficial?.equipamento ??

                null

            );


        if (
            !equipamentoId
        ) {
            continue;
        }


        const chave =
            equipamentoId;


        if (
            interligacoesMap.has(
                chave
            )
        ) {
            continue;
        }


        const equipamento =
            resolverEquipamentoPorId(
                topologia,
                equipamentoId
            );


        interligacoesMap.set(

            chave,

            {

                ...oficial,

                equipamentoId,

                equipamentoInterligacao:
                    equipamentoId,

                equipamento:
                    equipamento,

                estado:

                    obterEstadoEfetivo(
                        equipamentoId,
                        equipamento,
                        {
                            tratarPadraoInicial:
                                false,
                        }
                    ).estado,

            }

        );
    }


    const interligacoes =
        Array.from(
            interligacoesMap.values()
        );


    // ========================================================
    // ALIMENTADORES DE APOIO
    // ========================================================

    const alimentadoresApoio =
        Array.from(

            new Set(

                interligacoes

                    .map(
                        item =>
                            normalizarAlimentador(

                                item?.alimentadorDestino ??

                                item?.destino ??

                                null

                            )
                    )

                    .filter(Boolean)

                    .filter(
                        item =>
                            item !==
                            alimentador
                    )

            )

        );


    // ========================================================
    // MOTOR COMPLETO
    // ========================================================

    let resultadoMotor =
        null;


    let motorExecutado =
        false;


    try {

        resultadoMotor =
            executarMotorCOI({

                ...ocorrenciaParaMotor,

                alimentador,

                equipamentoDesarme:

                    ocorrenciaParaMotor
                        ?.equipamentoDesarme,

                correnteTrechoOcorrencia:

                    ocorrenciaParaMotor
                        ?.manobra
                        ?.correnteDesligado,

                correnteTrechoRecuperacao:

                    ocorrenciaParaMotor
                        ?.manobra
                        ?.correnteDestino,

                correnteDesligado:

                    ocorrenciaParaMotor
                        ?.manobra
                        ?.correnteDesligado,

                correnteAtualDestino:

                    ocorrenciaParaMotor
                        ?.manobra
                        ?.correnteDestino,

            });


        motorExecutado =
            true;

    } catch (
        erro
    ) {

        console.warn(
            "[Análise Operacional] Falha ao executar motor COI:",
            erro
        );
    }


    // ========================================================
    // TRANSFERÊNCIAS FINAIS
    // ========================================================

    let transferenciasPossiveis =
        transferenciasAutomaticas;


    // Se o motor retornou alternativas, elas passam a ser
    // prioridade.

    if (
        Array.isArray(
            resultadoMotor?.alternativas
        ) &&
        resultadoMotor.alternativas.length >
        0
    ) {

        transferenciasPossiveis =

            resultadoMotor.alternativas
                .map(
                    formatarCandidatoRecomposicao
                )
                .filter(Boolean);
    }


    // ========================================================
    // CAPACIDADE
    // ========================================================

    const capacidadeArea =
        analisarCapacidadeArea(
            areaAfetada,
            correnteInfo.corrente
        );


    // ========================================================
    // MELHOR TRANSFERÊNCIA
    // ========================================================

    const melhorMotor =
        formatarCandidatoRecomposicao(

            resultadoMotor
                ?.melhorAlternativa ??

            resultadoMotor
                ?.melhorCandidato ??

            null

        );


    const melhorTransferencia =

        melhorMotor &&

        (
            resultadoMotor?.permitido ||
            resultadoMotor?.aprovado
        )

            ? melhorMotor

            : (

                transferenciasPossiveis.find(
                    item => {

                        const status =
                            textoMaiusculo(
                                item?.status
                            );

                        return (

                            status ===
                            "VIAVEL" ||

                            item?.permitido ===
                            true

                        );
                    }
                ) ||

                null

              );


    // ========================================================
    // CLIENTES
    // ========================================================

    const clientesInformados =
        numero(
            ocorrencia?.clientesAfetados
        );


    const clientesRecuperados =
        numero(

            melhorTransferencia
                ?.clientesRecuperados ??

            resultadoMotor
                ?.clientesRecuperados ??

            resultadoMotor
                ?.recomendacao
                ?.recomposicao
                ?.clientesRecuperados ??

            null

        );


    const clientesConhecidos =
        clientesRecuperados !==
        null;


    // ========================================================
    // TRECHO DA OCORRÊNCIA
    // ========================================================

    let trechoOcorrencia =
        null;


    try {

        const conexoes =
            pontoOcorrencia
                ? buscarConexoes(
                    topologia,
                    pontoOcorrencia
                )
                : [];


        const primeiroTrecho =
            conexoes?.[0]?.trechoId;


        if (
            primeiroTrecho
        ) {

            trechoOcorrencia =
                buscarTrechoBDGD(
                    topologia,
                    primeiroTrecho
                ) ||
                null;
        }

    } catch {
        trechoOcorrencia =
            null;
    }


    // ========================================================
    // ALERTAS
    // ========================================================

    const alertas =
        [];


    const recomendacoes =
        [];


    if (
        !pontoOcorrencia
    ) {

        alertas.push(
            "PONTO_OCORRENCIA_NAO_IDENTIFICADO"
        );
    }


    if (
        !equipamentoPrincipal
    ) {

        alertas.push(
            "EQUIPAMENTO_OCORRENCIA_NAO_IDENTIFICADO"
        );
    }


    if (
        protecoes.length ===
        0
    ) {

        alertas.push(
            "PROTECAO_NAO_IDENTIFICADA"
        );
    }


    if (
        isolamento.length ===
        0
    ) {

        alertas.push(
            "ISOLAMENTO_NAO_IDENTIFICADO"
        );
    }


    if (
        !correnteInfo.conhecida
    ) {

        alertas.push(
            "CORRENTE_TRANSFERENCIA_NAO_INFORMADA"
        );
    }


    if (
        transferenciasPossiveis.length ===
        0
    ) {

        alertas.push(
            "CANDIDATO_RECOMPOSICAO_NAO_IDENTIFICADO"
        );
    }


    if (
        resultadoMotor?.status ===
        "CORRENTE_INDISPONIVEL"
    ) {

        alertas.push(
            "ANALISE_CONDICIONADA_A_CORRENTE"
        );
    }


    if (
        resultadoMotor?.status ===
        "SEM_ALTERNATIVA"
    ) {

        alertas.push(
            "SEM_ALTERNATIVA_RECOMPOSICAO"
        );
    }


    if (
        resultadoMotor?.status ===
        "ERRO_MOTOR"
    ) {

        alertas.push(
            "ERRO_EXECUCAO_MOTOR_COI"
        );
    }


    if (
        capacidadeArea?.aprovar ===
        false
    ) {
        // campo mantido apenas por compatibilidade
    }


    // ========================================================
    // RECOMENDAÇÕES
    // ========================================================

    if (
        melhorTransferencia
    ) {

        recomendacoes.push(

            `Existe uma alternativa de recomposição identificada automaticamente pelo equipamento ${melhorTransferencia.plaqueta || melhorTransferencia.equipamentoId}.`

        );


        if (
            melhorTransferencia
                ?.alimentadorDestino
        ) {

            recomendacoes.push(

                `Alimentador de apoio identificado: ${melhorTransferencia.alimentadorDestino}.`

            );
        }


    } else if (
        transferenciasPossiveis.length >
        0
    ) {

        recomendacoes.push(

            "Existem candidatos de recomposição, mas nenhum foi aprovado ainda com todos os dados operacionais disponíveis."

        );

    } else {

        recomendacoes.push(

            "Nenhum candidato de recomposição automática foi identificado pela topologia atual."

        );
    }


    if (
        isolamento.length >
        0
    ) {

        recomendacoes.push(

            `Priorizar a avaliação do isolamento pelo equipamento ${isolamento[0].id}.`

        );
    }


    if (
        correnteInfo.conhecida
    ) {

        recomendacoes.push(

            `Corrente utilizada na análise: ${correnteInfo.corrente} A.`

        );

    } else {

        recomendacoes.push(

            "Atualizar a corrente operacional antes de autorizar qualquer transferência."

        );
    }


    // ========================================================
    // SEQUÊNCIA
    // ========================================================

    const sequenciaManobra =
        gerarSequenciaManobraAtual(
            melhorTransferencia,
            isolamento,
            resultadoMotor
        );


    // ========================================================
    // ESTADO DA ANÁLISE
    // ========================================================

    const possuiTransferencias =
        transferenciasPossiveis.length >
        0;


    const transferenciaViavel =
        Boolean(
            melhorTransferencia
        );


    const transferenciaCondicionada =

        possuiTransferencias &&

        !transferenciaViavel &&

        (
            resultadoMotor?.status ===
                "CORRENTE_INDISPONIVEL" ||

            resultadoMotor?.status ===
                "BLOQUEADA" ||

            resultadoMotor?.status ===
                "SEM_ALTERNATIVA"
        );


    const transferenciaBloqueada =

        possuiTransferencias &&

        transferenciasPossiveis.every(
            item =>

                normalizarEstadoLocal(
                    item?.estado
                ) ===
                "INDISPONIVEL"

        );


    const transferenciaNaoValidada =

        possuiTransferencias &&

        !transferenciaViavel;


    const estadoAnalise = {

        topologiaDisponivel:
            true,


        correnteTransferida:
            correnteInfo.corrente,


        correnteConhecida:
            correnteInfo.conhecida,


        possuiProtecao:
            protecoes.length >
            0,


        possuiIsolamento:
            isolamento.length >
            0,


        possuiInterligacao:
            interligacoes.length >
            0,


        possuiTransferencia:
            possuiTransferencias,


        transferenciaViavel:
            transferenciaViavel,


        transferenciaCondicionada:
            transferenciaCondicionada,


        transferenciaBloqueada:
            transferenciaBloqueada,


        transferenciaNaoValidada:
            transferenciaNaoValidada,


        clientesConhecidos:
            clientesConhecidos,


        areaAfetadaConhecida:
            !areaAfetada.fallback,

    };


    // ========================================================
    // MOTIVO DA ANÁLISE
    // ========================================================

    let statusFinal =
        "ANALISADA";


    if (
        melhorTransferencia
    ) {

        statusFinal =
            "RECOMPOSICAO_DISPONIVEL";

    } else if (
        transferenciasPossiveis.length >
        0
    ) {

        statusFinal =
            "RECOMPOSICAO_CONDICIONADA";

    } else {

        statusFinal =
            "SEM_RECOMPOSICAO_AUTOMATICA";
    }


    // ========================================================
    // DIAGNÓSTICO
    // ========================================================

    const diagnostico = {

        topologiaDisponivel:
            true,


        equipamentoResolucao:
            resolucaoEquipamento,


        equipamentoDesarme:

            ocorrenciaParaMotor
                ?.equipamentoDesarme ??

            null,


        equipamentoDesarmeId:

            obterIdEquipamento(
                equipamentoPrincipal
            ),


        equipamentoDesarmeClassificado:

            classificarEquipamento(
                equipamentoPrincipal
            ),


        pontoOcorrencia,


        alimentador,


        circuito:

            obterCircuito(
                equipamentoPrincipal
            ),


        quantidadeEquipamentosTopologia:

            listarEquipamentos(
                topologia
            ).length,


        quantidadeInterligacoesOficiais:

            interligacoesOficiais.length,


        quantidadeCandidatosAutomaticos:

            transferenciasAutomaticas.length,


        quantidadeInterligacoesUnificadas:

            interligacoes.length,


        quantidadeTransferenciasPossiveis:

            transferenciasPossiveis.length,


        quantidadeCandidatosViaveis:

            transferenciasPossiveis.filter(
                item =>
                    item?.permitido ===
                    true ||
                    textoMaiusculo(
                        item?.status
                    ) ===
                    "VIAVEL"
            ).length,


        motorExecutado,


        resultadoMotorStatus:

            resultadoMotor?.status ??
            null,


        capacidadeArea,


        correnteInfo,


        classificacaoEquipamentoDesarme:

            classificarEquipamento(
                equipamentoPrincipal
            ),

    };


    // ========================================================
    // RESULTADO
    // ========================================================

    return {

        status:
            statusFinal,


        ocorrencia: {

            ...ocorrencia,

            alimentador,

            pontoId:
                pontoOcorrencia,

            equipamentoDesarme:

                ocorrencia?.equipamentoDesarme ??

                ocorrencia?.equipamentoDesarmeId ??

                null,

        },


        equipamento:
            equipamentoFicha,


        equipamentoOcorrencia: {

            ...resolucaoEquipamento,

            estado:

                equipamentoPrincipal

                    ? obterEstadoEfetivo(
                        obterIdEquipamento(
                            equipamentoPrincipal
                        ),
                        equipamentoPrincipal
                      ).estado

                    : null,

            origemEstado:

                equipamentoPrincipal

                    ? obterEstadoEfetivo(
                        obterIdEquipamento(
                            equipamentoPrincipal
                        ),
                        equipamentoPrincipal
                      ).origem

                    : null,

        },


        trecho:
            trechoOcorrencia,


        protecao:
            protecoes,


        montante:
            montante,


        jusante:
            jusante,


        areaAfetada: {

            ...areaAfetada,

            clientes: {

                total:
                    clientesInformados,

                conhecidos:
                    clientesInformados !==
                    null,

                recuperados:
                    clientesRecuperados,

                recuperadosConhecidos:
                    clientesConhecidos,

            },

        },


        isolamento:
            isolamento,


        // Interligações reais descobertas.
        interligacoes:
            interligacoes,


        alimentadoresApoio:
            alimentadoresApoio,


        // Candidatos automáticos do novo motor.
        transferenciasPossiveis:
            transferenciasPossiveis,


        // Melhor alternativa aprovada.
        melhorTransferencia:
            melhorTransferencia,


        corrente:
            correnteInfo,


        capacidade:
            capacidadeArea,


        // Resultado completo do novo motor.
        motorCOI:
            resultadoMotor,


        sequenciaManobra:
            sequenciaManobra,


        recomendacoes:
            recomendacoes,


        alertas:
            Array.from(
                new Set(
                    alertas
                )
            ),


        estadoAnalise:
            estadoAnalise,


        diagnostico:
            diagnostico,

    };
}


// ============================================================
// GERAR SEQUÊNCIA DE MANOBRA ATUAL
// ============================================================

function gerarSequenciaManobraAtual(
    melhorTransferencia,
    isolamento,
    resultadoMotor
) {

    const passos =
        [];


    let ordem =
        1;


    // --------------------------------------------------------
    // ISOLAMENTO
    // --------------------------------------------------------

    const isolamentoPrincipal =

        isolamento?.find(
            item =>
                item?.fronteiraArea
        ) ||

        isolamento?.[0] ||

        null;


    if (
        isolamentoPrincipal?.id
    ) {

        passos.push({

            ordem:
                ordem++,

            acao:
                "ABRIR",

            elemento:
                isolamentoPrincipal.id,

            tipo:
                isolamentoPrincipal.tipo,

            descricao:

                `Abrir o equipamento de isolamento ${isolamentoPrincipal.id} e confirmar o isolamento da área afetada.`,

            requisito:

                "Executar somente após confirmação das condições de segurança e do estado da rede.",

        });


        passos.push({

            ordem:
                ordem++,

            acao:
                "CONFIRMAR_ISOLAMENTO",

            elemento:
                isolamentoPrincipal.id,

            descricao:

                `Confirmar eletricamente o isolamento da área atingida pelo desarme.`,

        });
    }


    // --------------------------------------------------------
    // SEM CANDIDATO
    // --------------------------------------------------------

    if (
        !melhorTransferencia
    ) {

        passos.push({

            ordem:
                ordem++,

            acao:
                "AGUARDAR_ANALISE",

            elemento:
                null,

            descricao:

                "Aguardar identificação de uma alternativa de recomposição válida antes de executar qualquer fechamento.",

            requisito:

                resultadoMotor?.motivo ||

                "Nenhuma alternativa foi aprovada com os dados disponíveis.",

        });


        return passos;
    }


    // --------------------------------------------------------
    // FECHAR INTERLIGAÇÃO
    // --------------------------------------------------------

    const equipamento =
        melhorTransferencia?.plaqueta ||

        melhorTransferencia?.equipamentoId ||

        "-";


    passos.push({

        ordem:
            ordem++,

        acao:
            "FECHAR",

        elemento:
            melhorTransferencia?.equipamentoId ??
            equipamento,

        tipo:
            melhorTransferencia?.tipo ??
            melhorTransferencia?.tipoEquipamento ??
            null,

        descricao:

            `Fechar a interligação pelo equipamento ${equipamento}.`,

        alimentadorDestino:

            melhorTransferencia?.alimentadorDestino ??
            melhorTransferencia?.destino ??
            null,

        caminho:

            melhorTransferencia?.caminho ??
            null,

    });


    // --------------------------------------------------------
    // MONITORAR
    // --------------------------------------------------------

    passos.push({

        ordem:
            ordem++,

        acao:
            "MONITORAR",

        elemento:

            melhorTransferencia?.alimentadorDestino ??
            melhorTransferencia?.destino ??
            null,

        descricao:

            `Monitorar corrente, tensão, carregamento e comportamento da rede no alimentador de apoio ${melhorTransferencia?.alimentadorDestino || melhorTransferencia?.destino || ""}.`,

    });


    // --------------------------------------------------------
    // CONFIRMAR NORMALIZAÇÃO
    // --------------------------------------------------------

    passos.push({

        ordem:
            ordem++,

        acao:
            "CONFIRMAR_NORMALIZACAO",

        elemento:
            null,

        descricao:

            "Confirmar a normalização da área afetada e o atendimento dos clientes recuperáveis.",

    });


    return passos;
}


// ============================================================
// ALIAS
// ============================================================

export function analisarRede(
    ocorrencia = {}
) {

    return analisarOcorrencia(
        ocorrencia
    );
}


export function analisarOcorrenciaOperacional(
    ocorrencia = {}
) {

    return analisarOcorrencia(
        ocorrencia
    );
}


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default analisarOcorrencia;