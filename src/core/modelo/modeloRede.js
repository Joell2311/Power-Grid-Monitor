// ==========================================================
// src/core/modelo/modeloRede.js
// POWER GRID MONITOR
// ==========================================================
//
// MODELO CENTRALIZADO DA REDE ELÉTRICA
//
// Responsável por:
//
// - Subestações
// - Alimentadores
// - Trechos
// - Equipamentos
// - Estado operacional
// - Correntes operacionais
// - Topologia BDGD
// - Manobras
// - Interligações
// - Descoberta automática de recomposição
//
// PRINCÍPIOS:
//
// 1. TIP_UNID é a autoridade para classificação.
// 2. Não inventar corrente.
// 3. Não transformar ausência em 0 A.
// 4. Não criar equipamento sintético.
// 5. Equipamento de desarme não é automaticamente
//    equipamento de interligação.
// 6. PAC_1/PAC_2 completos não são obrigatórios para
//    delimitar a área afetada.
// 7. A delimitação pode usar conexões reais da BDGD.
// 8. Recomposição pode atravessar alimentadores/circuitos.
// 9. Equipamentos ABERTOS podem ser candidatos a fechamento.
// 10. Equipamentos INDISPONIVEIS/BYPASSADOS não podem ser
//     candidatos.
// 11. ID/PLAQUETA dos equipamentos devem ser preservados.
// 12. A topologia deve suportar múltiplos alimentadores.
// 13. Interligações devem ser avaliadas pela BDGD real.
// 14. Nunca criar interligação artificial.
// 15. Equipamento só pode ser candidato se existir
//     fisicamente na BDGD.
// 16. Não assumir equipamento FECHADO como candidato.
// 17. Estado operacional explícito tem prioridade.
// 18. Estado da própria interligação BDGD pode complementar
//     o estado operacional quando disponível.
// 19. Ausência de estado NÃO significa FECHADO.
// 20. Ausência de estado NÃO significa ABERTO.
// ==========================================================

import SubestacoesRepository from "../repositories/subestacoesRepository";
import AlimentadoresRepository from "../repositories/alimentadoresRepository";
import TrechosRepository from "../repositories/trechosRepository";
import EquipamentosRepository from "../repositories/equipamentosRepository";

import {
    buscarPonto as buscarPontoBDGD,
    buscarTrechoBDGD,
    buscarConexoes as buscarConexoesBDGD,
} from "./topologiaBDGD";

import {
    navegarAJusante,
    navegarAMontante,
    buscarRedeConectada as buscarRedeConectadaNavegador,
    buscarCaminho as buscarCaminhoNavegador,
} from "./navegadorRede";

// ==========================================================
// ESTADO
// ==========================================================

export const estadoRede = {

    subestacoes: [],

    alimentadores: [],

    trechos: [],

    equipamentos: [],

    topologiaBDGD: null,

    operacao: {

        ultimaAtualizacao: null,

        equipamentos: {},

        equipamentosDesligados: [],

        correntesAlimentadores: {},

        correntesTrechos: {},

        alimentadoresDesenergizados: [],

        historico: [],
    },
};

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

function normalizarCodigo(valor) {

    return normalizarTexto(valor)
        .replace(/[^A-Z0-9]/g, "");
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
            String(valor)
                .replace(",", ".")
                .trim()
        );

    return Number.isFinite(n)
        ? n
        : null;
}

function clonar(
    valor,
    fallback = null
) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return fallback;
    }

    try {

        return JSON.parse(
            JSON.stringify(valor)
        );

    } catch {

        if (
            Array.isArray(valor)
        ) {
            return [
                ...valor
            ];
        }

        if (
            typeof valor === "object"
        ) {
            return {
                ...valor
            };
        }

        return fallback;
    }
}

function lista(valor) {

    if (!valor) {
        return [];
    }

    if (
        Array.isArray(valor)
    ) {
        return valor;
    }

    if (
        valor instanceof Map
    ) {
        return [
            ...valor.values()
        ];
    }

    if (
        typeof valor === "object"
    ) {
        return Object.values(
            valor
        );
    }

    return [];
}

function primeiro(
    item,
    campos
) {

    const fontes = [

        item,

        item?.properties,

        item?.propriedades,

        item?.props,

    ].filter(Boolean);

    for (
        const fonte of fontes
    ) {

        for (
            const campo of campos
        ) {

            const valor =
                fonte?.[campo];

            if (
                valor !== null &&
                valor !== undefined &&
                String(valor).trim() !== ""
            ) {
                return valor;
            }
        }
    }

    return null;
}

// ==========================================================
// NORMALIZAÇÃO DE ID DE EQUIPAMENTO
// ==========================================================

function normalizarCodigoEquipamento(
    valor
) {

    let codigo =
        normalizarCodigo(
            valor
        );

    if (!codigo) {
        return "";
    }

    codigo =
        codigo.replace(
            /M\d*$/,
            ""
        );

    return codigo;
}

// ==========================================================
// IDS DOS EQUIPAMENTOS
// ==========================================================

export function obterIdentificadoresEquipamento(
    equipamento
) {

    if (!equipamento) {
        return [];
    }

    const fontes = [

        equipamento,

        equipamento?.properties,

        equipamento?.propriedades,

        equipamento?.props,

        equipamento?.unidadeSeccionadora,

        equipamento?.unidade,

        equipamento?.transformador,

    ].filter(Boolean);

    const ids = [];

    const campos = [

        "id",
        "ID",

        "COD_ID",
        "codId",

        "codigo",
        "CODIGO",

        "plaqueta",
        "PLAQUETA",

        "idOperacional",
        "ID_OPERACIONAL",

        "plaquetaIPT",
        "PLAQUETA_IPT",

        "patrimonio",
        "PATRIMONIO",

        "idPatrimonial",
        "ID_PATRIMONIAL",

        "eqseId",
        "EQSE_ID",

        "idEQSE",
        "ID_EQSE",

        "codIdEQSE",
        "COD_ID_EQSE",

        "unidadeId",
        "UNIDADE_ID",

        "unsemtId",
        "UNSEMT_ID",

        "codIdUNSEMT",
        "COD_ID_UNSEMT",

        "untrmtId",
        "UNTRMT_ID",

        "codIdUNTRMT",
        "COD_ID_UNTRMT",

        "PON_ID",

        "UNSEMT",

        "UNTRMT",

        "UNTRAT",
    ];

    for (
        const fonte of fontes
    ) {

        for (
            const campo of campos
        ) {

            const valor =
                fonte?.[campo];

            if (
                valor !== null &&
                valor !== undefined &&
                String(valor).trim() !== ""
            ) {

                ids.push(
                    String(valor).trim()
                );
            }
        }
    }

    return [
        ...new Set(
            ids
        )
    ];
}

function equipamentoCorrespondeId(
    equipamento,
    codigo
) {

    const alvo =
        normalizarCodigoEquipamento(
            codigo
        );

    if (!alvo) {
        return false;
    }

    return obterIdentificadoresEquipamento(
        equipamento
    ).some(
        id =>
            normalizarCodigoEquipamento(
                id
            ) === alvo
    );
}

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

function inicializarRede() {

    try {

        estadoRede.subestacoes =
            clonar(
                SubestacoesRepository.listar(),
                []
            );

    } catch {

        estadoRede.subestacoes = [];

    }

    try {

        estadoRede.alimentadores =
            clonar(
                AlimentadoresRepository.listar(),
                []
            );

    } catch {

        estadoRede.alimentadores = [];

    }

    try {

        estadoRede.trechos =
            clonar(
                TrechosRepository.listar(),
                []
            );

    } catch {

        estadoRede.trechos = [];

    }

    try {

        estadoRede.equipamentos =
            clonar(
                EquipamentosRepository.listar(),
                []
            );

    } catch {

        estadoRede.equipamentos = [];

    }

    estadoRede.operacao
        .ultimaAtualizacao =
        new Date();
}

inicializarRede();

// ==========================================================
// GETTERS
// ==========================================================

export function getRede() {
    return estadoRede;
}

export function getSubestacoes() {
    return estadoRede.subestacoes;
}

export function getAlimentadores() {
    return estadoRede.alimentadores;
}

export function getTrechos() {
    return estadoRede.trechos;
}

export function getEquipamentos() {
    return estadoRede.equipamentos;
}

// ==========================================================
// AUXILIAR PARA CONSOLIDAR COLEÇÕES
// ==========================================================

function identificarChaveItem(
    item,
    indice
) {

    if (
        item === null ||
        item === undefined
    ) {
        return `IDX_${indice}`;
    }

    const id =
        primeiro(
            item,
            [
                "id",
                "ID",
                "COD_ID",
                "codId",
                "codigo",
                "CODIGO",
                "PON_ID",
                "PAC",
                "pac",
                "UNSEMT",
                "UNTRMT",
                "UNTRAT",
            ]
        );

    if (id !== null) {

        return (
            normalizarCodigo(id) ||
            `IDX_${indice}`
        );
    }

    return `IDX_${indice}`;
}

function mesclarColecao(
    existente,
    nova
) {

    const resultado = [];

    const mapa = new Map();

    for (
        const item of lista(existente)
    ) {

        const chave =
            identificarChaveItem(
                item,
                mapa.size
            );

        mapa.set(
            chave,
            item
        );
    }

    for (
        const item of lista(nova)
    ) {

        const chave =
            identificarChaveItem(
                item,
                mapa.size
            );

        if (
            !mapa.has(chave)
        ) {

            mapa.set(
                chave,
                item
            );

        } else {

            const anterior =
                mapa.get(
                    chave
                );

            if (
                anterior &&
                item &&
                typeof anterior === "object" &&
                typeof item === "object"
            ) {

                mapa.set(
                    chave,
                    {
                        ...anterior,
                        ...item,
                    }
                );
            }
        }
    }

    for (
        const valor of mapa.values()
    ) {

        resultado.push(
            valor
        );
    }

    return resultado;
}

// ==========================================================
// CONSOLIDAÇÃO DE TOPOLOGIAS
// ==========================================================

function consolidarTopologia(
    anterior,
    nova
) {

    if (!anterior) {

        return clonar(
            nova,
            null
        );
    }

    if (!nova) {
        return anterior;
    }

    const resultado = {

        ...anterior,

        ...nova,

    };

    const colecoes = [

        "pontos",

        "listaPontos",

        "trechos",

        "listaTrechos",

        "equipamentos",

        "equipamentosOperacionais",

        "unidadesSeccionadoras",

        "transformadores",

        "reguladores",

        "capacitores",

        "interligacoes",

        "terminais",

        "passagens",

        "derivacoes",

        "problemas",

    ];

    for (
        const nome of colecoes
    ) {

        if (
            anterior?.[nome] !== undefined ||
            nova?.[nome] !== undefined
        ) {

            resultado[nome] =
                mesclarColecao(
                    anterior?.[nome],
                    nova?.[nome]
                );
        }
    }

    const alimentadores =
        new Set();

    const adicionarAlimentador =
        valor => {

            if (
                valor === null ||
                valor === undefined
            ) {
                return;
            }

            const texto =
                normalizarId(
                    valor
                );

            if (texto) {

                alimentadores.add(
                    texto
                );
            }
        };

    [
        ...lista(
            anterior?.alimentadores
        ),

        ...lista(
            nova?.alimentadores
        ),

        anterior?.alimentador,

        nova?.alimentador,

    ].forEach(
        adicionarAlimentador
    );

    if (
        alimentadores.size
    ) {

        resultado.alimentadores =
            [
                ...alimentadores
            ];
    }

    const circuitos =
        new Set();

    [
        ...lista(
            anterior?.circuitos
        ),

        ...lista(
            nova?.circuitos
        ),

        anterior?.circuito,

        nova?.circuito,

    ].forEach(
        valor => {

            if (
                valor !== null &&
                valor !== undefined
            ) {

                circuitos.add(
                    normalizarId(
                        valor
                    )
                );
            }
        }
    );

    if (
        circuitos.size
    ) {

        resultado.circuitos =
            [
                ...circuitos
            ];
    }

    resultado.diagnostico =
        {

            ...(anterior?.diagnostico || {}),

            ...(nova?.diagnostico || {}),

        };

    return resultado;
}

// ==========================================================
// TOPOLOGIA
// ==========================================================

export function registrarTopologiaBDGD(
    topologia
) {

    if (!topologia) {

        estadoRede.topologiaBDGD =
            null;

        return null;
    }

    estadoRede.topologiaBDGD =
        consolidarTopologia(
            estadoRede.topologiaBDGD,
            topologia
        );

    estadoRede.operacao
        .ultimaAtualizacao =
        new Date();

    console.log(
        "🧠 [Power Grid Monitor] TOPOLOGIA BDGD CONSOLIDADA:",
        {
            alimentador:
                estadoRede.topologiaBDGD?.alimentador ??
                null,

            alimentadores:
                lista(
                    estadoRede.topologiaBDGD?.alimentadores
                ),

            pontos:
                lista(
                    estadoRede.topologiaBDGD?.pontos
                ).length,

            trechos:
                lista(
                    estadoRede.topologiaBDGD?.trechos
                ).length,

            equipamentos:
                lista(
                    estadoRede.topologiaBDGD?.equipamentos
                ).length,

            equipamentosOperacionais:
                lista(
                    estadoRede.topologiaBDGD?.equipamentosOperacionais
                ).length,

            interligacoes:
                lista(
                    estadoRede.topologiaBDGD?.interligacoes
                ).length,
        }
    );

    return estadoRede.topologiaBDGD;
}

export function limparTopologiaBDGD() {

    estadoRede.topologiaBDGD =
        null;

    return null;
}

export function getTopologiaBDGD() {

    return estadoRede.topologiaBDGD;
}

export function possuiTopologiaBDGD() {

    return Boolean(
        estadoRede.topologiaBDGD
    );
}

// ==========================================================
// BUSCA DE EQUIPAMENTOS
// ==========================================================

function buscarNaColecao(
    colecao,
    id
) {

    const alvo =
        normalizarId(
            id
        );

    if (!alvo) {
        return null;
    }

    return lista(
        colecao
    ).find(
        item =>
            equipamentoCorrespondeId(
                item,
                alvo
            )
    ) || null;
}

function buscarEquipamentoBDGD(
    id
) {

    const topologia =
        estadoRede.topologiaBDGD;

    if (!topologia) {
        return null;
    }

    const colecoes = [

        topologia.equipamentosOperacionais,

        topologia.equipamentos,

        topologia.unidadesSeccionadoras,

        topologia.transformadores,

        topologia.reguladores,

        topologia.capacitores,

    ];

    for (
        const colecao of colecoes
    ) {

        const resultado =
            buscarNaColecao(
                colecao,
                id
            );

        if (
            resultado
        ) {

            return resultado;
        }
    }

    return null;
}

export function buscarEquipamento(
    id
) {

    const alvo =
        normalizarId(
            id
        );

    if (!alvo) {
        return null;
    }

    const cadastrado =
        estadoRede
            .equipamentos
            .find(
                item =>
                    equipamentoCorrespondeId(
                        item,
                        alvo
                    )
            );

    return (
        cadastrado ||
        buscarEquipamentoBDGD(
            alvo
        ) ||
        null
    );
}

export function buscarEquipamentoRede(
    id
) {

    return buscarEquipamento(
        id
    );
}

export function existeEquipamento(
    id
) {

    return Boolean(
        buscarEquipamento(
            id
        )
    );
}

// ==========================================================
// BUSCAS BÁSICAS
// ==========================================================

export function buscarSubestacao(
    id
) {

    const alvo =
        normalizarId(
            id
        );

    return estadoRede
        .subestacoes
        .find(
            item =>
                normalizarId(
                    item?.id
                ) === alvo ||
                normalizarId(
                    item?.codigo
                ) === alvo
        ) || null;
}

export function buscarAlimentador(
    id
) {

    const alvo =
        normalizarId(
            id
        );

    return estadoRede
        .alimentadores
        .find(
            item =>
                normalizarId(
                    item?.id
                ) === alvo ||
                normalizarId(
                    item?.codigo
                ) === alvo ||
                normalizarId(
                    item?.CTMT
                ) === alvo ||
                normalizarId(
                    item?.ctmt
                ) === alvo
        ) || null;
}

export function buscarTrecho(
    id
) {

    const alvo =
        normalizarId(
            id
        );

    const cadastro =
        estadoRede
            .trechos
            .find(
                item =>
                    normalizarId(
                        item?.id
                    ) === alvo ||
                    normalizarId(
                        item?.COD_ID
                    ) === alvo ||
                    normalizarId(
                        item?.codId
                    ) === alvo
            );

    return (
        cadastro ||
        buscarTrechoBDGD(
            estadoRede.topologiaBDGD,
            alvo
        ) ||
        null
    );
}

export function existeTrecho(
    id
) {

    return Boolean(
        buscarTrecho(
            id
        )
    );
}

// ==========================================================
// TOPOLOGIA - PONTO / TRECHO
// ==========================================================

export function buscarPontoRede(
    id
) {

    if (
        !estadoRede.topologiaBDGD
    ) {
        return null;
    }

    return buscarPontoBDGD(
        estadoRede.topologiaBDGD,
        id
    );
}

export function buscarTrechoRede(
    id
) {

    return buscarTrecho(
        id
    );
}

export function buscarConexoesRede(
    id
) {

    if (
        !estadoRede.topologiaBDGD
    ) {
        return [];
    }

    return buscarConexoesBDGD(
        estadoRede.topologiaBDGD,
        id
    ) || [];
}

export function buscarConexoesEquipamento(
    id
) {

    const equipamento =
        buscarEquipamento(
            id
        );

    if (!equipamento) {
        return [];
    }

    const pac1 =
        primeiro(
            equipamento,
            [
                "pac1",
                "PAC_1"
            ]
        );

    const pac2 =
        primeiro(
            equipamento,
            [
                "pac2",
                "PAC_2"
            ]
        );

    const resultado = [];

    for (
        const ponto of [
            pac1,
            pac2
        ]
    ) {

        if (!ponto) {
            continue;
        }

        resultado.push(
            ...buscarConexoesRede(
                ponto
            )
        );
    }

    return resultado;
}

// ==========================================================
// ESTADO OPERACIONAL
// ==========================================================

const ESTADOS_VALIDOS = [

    "FECHADO",

    "ABERTO",

    "INDISPONIVEL",

    "BYPASSADO",

];

export function normalizarEstadoEquipamento(
    estado
) {

    const valor =
        normalizarTexto(
            estado
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

        "INDISPONÍVEL":
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
        aliases[valor] ||
        null
    );
}

// ==========================================================
// ESTADO EXPLÍCITO
// ==========================================================
//
// Procura somente evidência real de estado.
//
// Ausência de informação não vira FECHADO.
//
// ==========================================================

function obterEstadoExplicito(
    item
) {

    if (!item) {
        return null;
    }

    const fontes = [

        item,

        item?.properties,

        item?.propriedades,

        item?.props,

        item?.unidadeSeccionadora,

        item?.unidade,

        item?.transformador,

        item?.equipamento,

        item?.equipamentoOperacional,

        item?.equipamentoInterligacao,

        item?.dispositivo,

    ].filter(Boolean);

    const camposEstado = [

        "estado",
        "estadoOperacional",
        "estadoDispositivo",

        "status",
        "STATUS",

        "situacao",
        "SITUACAO",

        "posicao",
        "POSICAO",
        "POS",

        "SIT_ATIV",
        "SITCONT",

        "posicaoOperacional",
        "POSICAO_OPERACIONAL",

        "estadoChave",
        "ESTADO_CHAVE",

        "estadoEletrico",
        "ESTADO_ELETRICO",

    ];

    for (
        const fonte of fontes
    ) {

        for (
            const campo of camposEstado
        ) {

            const valor =
                fonte?.[campo];

            const estado =
                normalizarEstadoEquipamento(
                    valor
                );

            if (
                estado
            ) {

                return {

                    estado,

                    origemCampo:
                        campo,

                };
            }
        }
    }

    for (
        const fonte of fontes
    ) {

        if (
            fonte?.aberto === true ||
            fonte?.isOpen === true ||
            fonte?.open === true
        ) {

            return {

                estado:
                    "ABERTO",

                origemCampo:
                    "BOOLEAN_ABERTO",

            };
        }

        if (
            fonte?.fechado === true ||
            fonte?.isClosed === true ||
            fonte?.closed === true
        ) {

            return {

                estado:
                    "FECHADO",

                origemCampo:
                    "BOOLEAN_FECHADO",

            };
        }
    }

    return null;
}

function obterChaveEstadoEquipamento(
    equipamentoId
) {

    return normalizarCodigoEquipamento(
        equipamentoId
    );
}

export function consultarEstadoEquipamento(
    equipamentoId
) {

    const id =
        normalizarId(
            equipamentoId
        );

    if (!id) {
        return null;
    }

    const chave =
        obterChaveEstadoEquipamento(
            id
        );

    const operacional =
        estadoRede
            .operacao
            .equipamentos?.[
                chave
            ] ??
        estadoRede
            .operacao
            .equipamentos?.[
                id
            ];

    if (
        operacional
    ) {

        return {
            ...operacional,
        };
    }

    const equipamento =
        buscarEquipamento(
            id
        );

    const estadoExplicito =
        obterEstadoExplicito(
            equipamento
        );

    if (
        estadoExplicito?.estado
    ) {

        return {

            equipamentoId:
                id,

            estado:
                estadoExplicito.estado,

            origem:
                "CADASTRO",

            origemCampo:
                estadoExplicito
                    .origemCampo,

            atualizadoEm:
                null,

            observacao:
                null,
        };
    }

    return {

        equipamentoId:
            id,

        estado:
            "FECHADO",

        origem:
            "PADRAO",

        atualizadoEm:
            null,

        observacao:
            "Estado físico não informado explicitamente.",
    };
}

export function listarEstadosEquipamentos() {

    return {
        ...(
            estadoRede
                .operacao
                .equipamentos ||
            {}
        )
    };
}

export function atualizarEstadoEquipamento(
    equipamentoId,
    estado,
    opcoes = {}
) {

    const id =
        normalizarId(
            equipamentoId
        );

    if (!id) {

        return {

            sucesso:
                false,

            mensagem:
                "Equipamento não informado.",

        };
    }

    if (
        !buscarEquipamento(
            id
        )
    ) {

        return {

            sucesso:
                false,

            mensagem:
                `Equipamento ${id} não encontrado na rede.`,

        };
    }

    const novoEstado =
        normalizarEstadoEquipamento(
            estado
        );

    if (
        !ESTADOS_VALIDOS.includes(
            novoEstado
        )
    ) {

        return {

            sucesso:
                false,

            mensagem:
                "Estado operacional inválido.",

        };
    }

    const chave =
        obterChaveEstadoEquipamento(
            id
        );

    const anterior =
        consultarEstadoEquipamento(
            id
        );

    const registro = {

        equipamentoId:
            id,

        equipamentoIdNormalizado:
            chave,

        estado:
            novoEstado,

        estadoAnterior:
            anterior?.estado ??
            null,

        origem:
            opcoes?.origem ??
            "OPERADOR",

        observacao:
            opcoes?.observacao ??
            null,

        atualizadoEm:
            new Date(),

    };

    estadoRede
        .operacao
        .equipamentos[chave] =
        registro;

    if (
        novoEstado === "ABERTO" ||
        novoEstado === "INDISPONIVEL"
    ) {

        if (
            !estadoRede
                .operacao
                .equipamentosDesligados
                .includes(
                    chave
                )
        ) {

            estadoRede
                .operacao
                .equipamentosDesligados
                .push(
                    chave
                );
        }

    } else {

        estadoRede
            .operacao
            .equipamentosDesligados =

            estadoRede
                .operacao
                .equipamentosDesligados
                .filter(
                    item =>
                        item !== chave
                );
    }

    estadoRede
        .operacao
        .historico
        .push({

            data:
                new Date(),

            acao:
                "ALTERACAO_ESTADO_EQUIPAMENTO",

            dados:
                registro,

        });

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

        equipamentoId:
            id,

        equipamentoIdNormalizado:
            chave,

        estado:
            registro,

    };
}

export function executarManobraEquipamento(
    equipamentoId,
    acao,
    opcoes = {}
) {

    const comando =
        normalizarTexto(
            acao
        );

    if (
        comando !== "ABRIR" &&
        comando !== "FECHAR"
    ) {

        return {

            sucesso:
                false,

            mensagem:
                "Ação inválida.",

        };
    }

    const equipamento =
        buscarEquipamento(
            equipamentoId
        );

    if (!equipamento) {

        return {

            sucesso:
                false,

            mensagem:
                `Equipamento ${equipamentoId} não encontrado na rede.`,

        };
    }

    const estadoAtual =
        consultarEstadoEquipamento(
            equipamentoId
        );

    if (
        estadoAtual?.estado ===
        "INDISPONIVEL"
    ) {

        return {

            sucesso:
                false,

            bloqueada:
                true,

            mensagem:
                "Equipamento indisponível.",

        };
    }

    if (
        estadoAtual?.estado ===
        "BYPASSADO"
    ) {

        return {

            sucesso:
                false,

            bloqueada:
                true,

            mensagem:
                "Equipamento em BYPASSADO não pode ser manobrado.",

        };
    }

    const novoEstado =
        comando === "ABRIR"
            ? "ABERTO"
            : "FECHADO";

    if (
        estadoAtual?.estado ===
        novoEstado
    ) {

        return {

            sucesso:
                true,

            jaEstavaNoEstado:
                true,

            equipamentoId:
                normalizarId(
                    equipamentoId
                ),

            estado:
                estadoAtual,

            mensagem:
                `Equipamento já se encontra ${novoEstado}.`,

        };
    }

    const resultado =
        atualizarEstadoEquipamento(

            equipamentoId,

            novoEstado,

            {

                ...opcoes,

                origem:
                    opcoes?.origem ??
                    "MANOBRA_OPERADOR",

            }

        );

    if (
        !resultado?.sucesso
    ) {

        return resultado;
    }

    const estadoFinal =
        consultarEstadoEquipamento(
            equipamentoId
        );

    return {

        ...resultado,

        estadoAnterior:
            estadoAtual,

        estadoAtual:
            estadoFinal,

        estado:
            estadoFinal,

        acao:
            comando,

    };
}

export function desligarEquipamento(
    equipamentoId,
    opcoes = {}
) {

    return executarManobraEquipamento(
        equipamentoId,
        "ABRIR",
        opcoes
    );
}

export function ligarEquipamento(
    equipamentoId,
    opcoes = {}
) {

    return executarManobraEquipamento(
        equipamentoId,
        "FECHAR",
        opcoes
    );
}

export function equipamentoEstaAberto(
    equipamentoId
) {

    return (
        consultarEstadoEquipamento(
            equipamentoId
        )?.estado ===
        "ABERTO"
    );
}

export function equipamentoEstaFechado(
    equipamentoId
) {

    return (
        consultarEstadoEquipamento(
            equipamentoId
        )?.estado ===
        "FECHADO"
    );
}

export function equipamentoEstaDisponivel(
    equipamentoId
) {

    const estado =
        consultarEstadoEquipamento(
            equipamentoId
        )?.estado;

    return (
        estado !==
        "INDISPONIVEL" &&
        estado !==
        "BYPASSADO"
    );
}

export function obterMapaEstadosEquipamentos() {

    return listarEstadosEquipamentos();
}

export function consultarEstadoOperacional() {

    return {

        equipamentos:
            listarEstadosEquipamentos(),

        equipamentosDesligados:
            [
                ...(
                    estadoRede
                        .operacao
                        .equipamentosDesligados ||
                    []
                )
            ],

        ultimaAtualizacao:
            estadoRede
                .operacao
                .ultimaAtualizacao,

    };
}

export function resetarEstadosEquipamentos() {

    estadoRede
        .operacao
        .equipamentos = {};

    estadoRede
        .operacao
        .equipamentosDesligados = [];

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

    };
}

export function restaurarEstadoInicial() {

    return resetarEstadosEquipamentos();
}

// ==========================================================
// CORRENTES
// ==========================================================

export function consultarCorrenteAlimentador(
    alimentador
) {

    const id =
        normalizarId(
            alimentador
        );

    const valor =
        estadoRede
            .operacao
            .correntesAlimentadores?.[
                id
            ];

    return valor !== undefined
        ? valor
        : null;
}

export function obterCorrenteAlimentador(
    alimentador
) {

    return consultarCorrenteAlimentador(
        alimentador
    );
}

export function atualizarCorrenteAlimentador(
    alimentador,
    corrente
) {

    const id =
        normalizarId(
            alimentador
        );

    const valor =
        numero(
            corrente
        );

    if (
        !id ||
        valor === null
    ) {

        return {

            sucesso:
                false,

            mensagem:
                "Alimentador ou corrente inválidos.",

        };
    }

    estadoRede
        .operacao
        .correntesAlimentadores[id] =
        valor;

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

        alimentador:
            id,

        corrente:
            valor,

    };
}

export function consultarCorrenteTrecho(
    trecho
) {

    const id =
        normalizarId(
            trecho
        );

    const valor =
        estadoRede
            .operacao
            .correntesTrechos?.[
                id
            ];

    return valor !== undefined
        ? valor
        : null;
}

export function obterCorrenteTrecho(
    trecho
) {

    return consultarCorrenteTrecho(
        trecho
    );
}

export function atualizarCorrenteTrecho(
    trecho,
    corrente
) {

    const id =
        normalizarId(
            trecho
        );

    const valor =
        numero(
            corrente
        );

    if (
        !id ||
        valor === null
    ) {

        return {

            sucesso:
                false,

            mensagem:
                "Trecho ou corrente inválidos.",

        };
    }

    estadoRede
        .operacao
        .correntesTrechos[id] =
        valor;

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

        trecho:
            id,

        corrente:
            valor,

    };
}

// ==========================================================
// TRECHOS / EQUIPAMENTOS
// ==========================================================

export function buscarTrechosAlimentador(
    alimentador
) {

    const alvo =
        normalizarCodigo(
            alimentador
        );

    return estadoRede
        .trechos
        .filter(
            trecho =>
                [
                    trecho?.alimentador,
                    trecho?.ALIMENTADOR,
                    trecho?.CTMT,
                    trecho?.ctmt,
                    trecho?.circuito,
                    trecho?.CIRCUITO,
                ]
                    .some(
                        valor =>
                            normalizarCodigo(
                                valor
                            ) === alvo
                    )
        );
}

export function buscarEquipamentosAlimentador(
    alimentador
) {

    const alvo =
        normalizarCodigo(
            alimentador
        );

    return estadoRede
        .equipamentos
        .filter(
            equipamento =>
                [
                    equipamento?.alimentador,
                    equipamento?.ALIMENTADOR,
                    equipamento?.CTMT,
                    equipamento?.ctmt,
                    equipamento?.circuito,
                    equipamento?.CIRCUITO,
                ]
                    .some(
                        valor =>
                            normalizarCodigo(
                                valor
                            ) === alvo
                    )
        );
}

export function buscarEquipamentosTelecomandados(
    alimentador = null
) {

    let equipamentos =
        estadoRede.equipamentos;

    if (
        alimentador
    ) {

        equipamentos =
            buscarEquipamentosAlimentador(
                alimentador
            );
    }

    return equipamentos.filter(
        equipamento =>

            numero(
                primeiro(
                    equipamento,
                    [
                        "TLCD",
                        "tlcd"
                    ]
                )
            ) > 0 ||

            Boolean(
                primeiro(
                    equipamento,
                    [
                        "telecomandado",
                        "telecomando"
                    ]
                )
            )
    );
}

// ==========================================================
// CAPACIDADE
// ==========================================================

const CAPACIDADES_BITOLA = {

    240:
        500,

    150:
        300,

    95:
        220,

    70:
        150,

    35:
        90,

};

export function capacidadePorBitola(
    bitola
) {

    const chave =
        String(
            bitola ?? ""
        )
            .replace(",", ".")
            .trim();

    return (
        CAPACIDADES_BITOLA[
            chave
        ] ??
        null
    );
}

export function calcularCapacidadeTrecho(
    trechoId
) {

    const trecho =
        buscarTrecho(
            trechoId
        );

    if (!trecho) {
        return null;
    }

    const direta =
        numero(
            primeiro(
                trecho,
                [
                    "capacidade",
                    "CAPACIDADE",
                    "ampacidade",
                    "AMPACIDADE",
                    "capacidadeMaximaAmperes",
                ]
            )
        );

    if (
        direta !== null &&
        direta > 0
    ) {

        return direta;
    }

    const bitola =
        primeiro(
            trecho,
            [
                "bitola",
                "BITOLA",
                "secao",
                "SECAO",
                "condutor",
                "CONDUTOR",
            ]
        );

    if (
        bitola !== null
    ) {

        const capacidade =
            capacidadePorBitola(
                bitola
            );

        if (
            capacidade !== null
        ) {

            return capacidade;
        }
    }

    return null;
}

export function validarCargaTrecho(
    trechoId,
    corrente
) {

    const i =
        numero(
            corrente
        );

    const capacidade =
        numero(
            calcularCapacidadeTrecho(
                trechoId
            )
        );

    if (
        i === null
    ) {

        return {

            conhecida:
                false,

            permitido:
                false,

            corrente:
                null,

            capacidade,

        };
    }

    if (
        capacidade === null ||
        capacidade <= 0
    ) {

        return {

            conhecida:
                true,

            permitido:
                false,

            corrente:
                i,

            capacidade:
                null,

            limite:
                null,

            motivo:
                "Capacidade não determinada.",

        };
    }

    const limite =
        capacidade *
        0.8;

    return {

        conhecida:
            true,

        permitido:
            i <= limite,

        corrente:
            i,

        capacidade,

        limite,

        carregamento:
            (
                i /
                capacidade
            ) *
            100,

    };
}

// ==========================================================
// VALIDAR EQUIPAMENTO BDGD
// ==========================================================

export function validarEquipamentoBDGD(
    codigoInformado,
    alimentadorEsperado = null
) {

    const codigo =
        normalizarId(
            codigoInformado
        );

    if (!codigo) {

        return {

            informado:
                false,

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
                "Código do equipamento não informado.",

        };
    }

    if (
        !possuiTopologiaBDGD()
    ) {

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
                "Topologia BDGD ainda não foi registrada.",

        };
    }

    const equipamento =
        buscarEquipamento(
            codigo
        );

    if (!equipamento) {

        return {

            informado:
                true,

            valido:
                false,

            existeBDGD:
                false,

            inconsistente:
                false,

            equipamento:
                null,

            ficha:
                null,

            motivo:
                `Equipamento ${codigo} não encontrado na BDGD.`,

        };
    }

    const ficha =
        obterFichaCompletaEquipamento(
            codigo
        );

    const alimentadorEquipamento =
        obterAlimentadorEquipamento(
            equipamento
        );

    const esperado =
        normalizarCodigo(
            alimentadorEsperado
        );

    const encontrado =
        normalizarCodigo(
            alimentadorEquipamento
        );

    if (
        esperado &&
        encontrado &&
        esperado !== encontrado
    ) {

        return {

            informado:
                true,

            valido:
                false,

            existeBDGD:
                true,

            inconsistente:
                true,

            equipamento,

            ficha,

            alimentadorEquipamento,

            alimentadorEsperado,

            motivo:
                `O equipamento ${codigo} existe na BDGD, mas pertence ao alimentador ${alimentadorEquipamento}, enquanto a ocorrência está no alimentador ${alimentadorEsperado}.`,

        };
    }

    return {

        informado:
            true,

        valido:
            true,

        existeBDGD:
            true,

        inconsistente:
            false,

        equipamento,

        ficha,

        alimentadorEquipamento,

        alimentadorEsperado:
            alimentadorEsperado ?? null,

        motivo:
            `Equipamento ${codigo} validado com sucesso na BDGD.`,

    };
}

// ==========================================================
// NAVEGAÇÃO
// ==========================================================

export function buscarMontante(
    pontoId,
    opcoes = {}
) {

    if (
        !estadoRede.topologiaBDGD
    ) {
        return null;
    }

    return navegarAMontante(
        estadoRede.topologiaBDGD,
        pontoId,
        {

            ...opcoes,

            estadosEquipamentos:
                opcoes?.estadosEquipamentos ??
                obterMapaEstadosEquipamentos(),

            respeitarEstadoOperacional:
                opcoes?.respeitarEstadoOperacional !== false,

        }
    );
}

export function buscarJusante(
    pontoId,
    opcoes = {}
) {

    if (
        !estadoRede.topologiaBDGD
    ) {
        return null;
    }

    return navegarAJusante(
        estadoRede.topologiaBDGD,
        pontoId,
        {

            ...opcoes,

            estadosEquipamentos:
                opcoes?.estadosEquipamentos ??
                obterMapaEstadosEquipamentos(),

            respeitarEstadoOperacional:
                opcoes?.respeitarEstadoOperacional !== false,

        }
    );
}

export function buscarCaminhoEletrico(
    origem,
    destino,
    opcoes = {}
) {

    if (
        !estadoRede.topologiaBDGD
    ) {

        return {

            encontrado:
                false,

            pontos: [],

            trechos: [],

            motivo:
                "TOPOLOGIA_NAO_DISPONIVEL",

        };
    }

    return buscarCaminhoNavegador(
        estadoRede.topologiaBDGD,
        origem,
        destino,
        {

            ...opcoes,

            estadosEquipamentos:
                opcoes?.estadosEquipamentos ??
                obterMapaEstadosEquipamentos(),

            respeitarEstadoOperacional:
                opcoes?.respeitarEstadoOperacional !== false,

        }
    );
}

export function buscarRedeConectada(
    pontoId,
    opcoes = {}
) {

    if (
        !estadoRede.topologiaBDGD
    ) {
        return null;
    }

    return buscarRedeConectadaNavegador(
        estadoRede.topologiaBDGD,
        pontoId,
        {

            ...opcoes,

            estadosEquipamentos:
                opcoes?.estadosEquipamentos ??
                obterMapaEstadosEquipamentos(),

            respeitarEstadoOperacional:
                opcoes?.respeitarEstadoOperacional !== false,

        }
    );
}

// ==========================================================
// PAC
// ==========================================================

export function buscarPQTDoPontoRede(
    pontoId
) {

    const ponto =
        buscarPontoRede(
            pontoId
        );

    if (!ponto) {
        return [];
    }

    return [
        primeiro(
            ponto,
            [
                "PAC",
                "pac",
                "COD_ID",
                "id"
            ]
        )
    ].filter(Boolean);
}

export function buscarTransformadoresDoPontoRede(
    pontoId
) {

    const alvo =
        normalizarCodigo(
            pontoId
        );

    return lista(
        estadoRede
            .topologiaBDGD
            ?.transformadores
    ).filter(
        transformador => {

            const valores = [

                transformador?.pontoAssociado,

                transformador?.pontoId,

                transformador?.PAC_1,

                transformador?.PAC_2,

            ];

            return valores.some(
                valor =>
                    normalizarCodigo(
                        valor
                    ) === alvo
            );
        }
    );
}

export function filtrarRedePorAlimentador(
    alimentador
) {

    const alvo =
        normalizarCodigo(
            alimentador
        );

    const topologia =
        estadoRede.topologiaBDGD;

    return {

        alimentador,

        pontos:
            lista(
                topologia?.pontos
            ).filter(
                ponto =>
                    normalizarCodigo(
                        primeiro(
                            ponto,
                            [
                                "alimentador",
                                "ALIMENTADOR",
                                "CTMT"
                            ]
                        )
                    ) === alvo
            ),

        trechos:
            lista(
                topologia?.trechos
            ).filter(
                trecho =>
                    normalizarCodigo(
                        primeiro(
                            trecho,
                            [
                                "alimentador",
                                "ALIMENTADOR",
                                "CTMT",
                                "ctmt",
                                "circuito",
                                "CIRCUITO"
                            ]
                        )
                    ) === alvo
            ),

        equipamentos:
            lista(
                topologia?.equipamentosOperacionais ??
                topologia?.equipamentos
            ).filter(
                equipamento =>
                    normalizarCodigo(
                        obterAlimentadorEquipamento(
                            equipamento
                        )
                    ) === alvo
            ),

    };
}

// ==========================================================
// IDENTIDADE OPERACIONAL DO EQUIPAMENTO
// ==========================================================

function obterTipoUnidadeInterno(
    equipamento
) {

    const valor =
        primeiro(
            equipamento,
            [
                "TIP_UNID",
                "tipUnid",
                "tipoUnidade"
            ]
        );

    return numero(
        valor
    );
}

function obterIdOperacionalEquipamento(
    equipamento
) {

    if (!equipamento) {
        return "";
    }

    const tipo =
        obterTipoUnidadeInterno(
            equipamento
        );

    if (
        [
            19,
            22,
            32,
            34
        ].includes(
            tipo
        )
    ) {

        return normalizarId(
            primeiro(
                equipamento,
                [
                    "idOperacional",
                    "plaqueta",
                    "unsemtId",
                    "codIdUNSEMT",
                    "COD_ID_UNSEMT",
                    "unidadeId",
                    "id",
                    "COD_ID",
                    "codId",
                ]
            )
        );
    }

    if (
        tipo === 38
    ) {

        return normalizarId(
            primeiro(
                equipamento,
                [
                    "idOperacional",
                    "plaqueta",
                    "untrmtId",
                    "codIdUNTRMT",
                    "COD_ID_UNTRMT",
                    "id",
                    "COD_ID",
                    "codId",
                ]
            )
        );
    }

    return normalizarId(
        primeiro(
            equipamento,
            [
                "idOperacional",
                "plaqueta",
                "id",
                "codigo",
                "COD_ID",
                "codId",
            ]
        )
    );
}

// ==========================================================
// FICHA OPERACIONAL
// ==========================================================

export function obterFichaOperacional(
    equipamentoId
) {

    const equipamento =
        buscarEquipamento(
            equipamentoId
        );

    if (!equipamento) {
        return null;
    }

    const id =
        obterIdOperacionalEquipamento(
            equipamento
        );

    const plaqueta =
        obterPlaquetaEquipamento(
            equipamento
        );

    const codId =
        normalizarId(
            primeiro(
                equipamento,
                [
                    "COD_ID",
                    "codId"
                ]
            )
        );

    return {

        id,

        plaqueta,

        COD_ID:
            codId ||
            null,

        codId:
            codId ||
            null,

        equipamentoId:
            id,

        tipo:
            classificarEquipamento(
                equipamento
            ),

        tipUnid:
            obterTIPUNID(
                equipamento
            ),

        alimentador:
            obterAlimentadorEquipamento(
                equipamento
            ),

        pac1:
            obterPac(
                primeiro(
                    equipamento,
                    [
                        "pac1",
                        "PAC_1"
                    ]
                )
            ),

        pac2:
            obterPac(
                primeiro(
                    equipamento,
                    [
                        "pac2",
                        "PAC_2"
                    ]
                )
            ),

        estado:
            consultarEstadoEquipamento(
                equipamentoId
            ),

    };
}

export function obterFichaCompletaEquipamento(
    equipamentoId
) {

    const ficha =
        obterFichaOperacional(
            equipamentoId
        );

    if (!ficha) {
        return null;
    }

    const equipamento =
        buscarEquipamento(
            equipamentoId
        );

    const id =
        obterIdOperacionalEquipamento(
            equipamento
        );

    const plaqueta =
        obterPlaquetaEquipamento(
            equipamento
        );

    const codId =
        normalizarId(
            primeiro(
                equipamento,
                [
                    "COD_ID",
                    "codId"
                ]
            )
        );

    return {

        ...ficha,

        id:
            id ||
            ficha?.id ||
            normalizarId(
                equipamentoId
            ),

        equipamentoId:
            id ||
            ficha?.equipamentoId ||
            normalizarId(
                equipamentoId
            ),

        plaqueta:
            plaqueta ||
            ficha?.plaqueta ||
            id ||
            null,

        COD_ID:
            codId ||
            ficha?.COD_ID ||
            null,

        codId:
            codId ||
            ficha?.codId ||
            ficha?.COD_ID ||
            null,

        patrimonio:
            primeiro(
                equipamento,
                [
                    "patrimonio",
                    "PATRIMONIO",
                    "idPatrimonial",
                    "ID_PATRIMONIAL"
                ]
            ),

        circuito:
            primeiro(
                equipamento,
                [
                    "circuito",
                    "CIRCUITO",
                    "CTMT"
                ]
            ),

        tipoUnidade:
            obterTIPUNID(
                equipamento
            ),

        telecomandado:
            Boolean(
                numero(
                    primeiro(
                        equipamento,
                        [
                            "TLCD",
                            "tlcd"
                        ]
                    )
                )
            ),

        equipamento,

    };
}

// ==========================================================
// AUXILIARES DE EQUIPAMENTO
// ==========================================================

function obterIdEquipamento(
    equipamento
) {

    return obterIdOperacionalEquipamento(
        equipamento
    );
}

function obterPlaquetaEquipamento(
    equipamento
) {

    if (!equipamento) {
        return "";
    }

    const operacional =
        obterIdOperacionalEquipamento(
            equipamento
        );

    if (
        operacional
    ) {

        return operacional;
    }

    const valor =
        primeiro(
            equipamento,
            [

                "plaqueta",
                "PLAQUETA",

                "plaquetaIPT",
                "PLAQUETA_IPT",

                "codigo",
                "CODIGO",

                "id",
                "ID",

                "COD_ID",
                "codId",

            ]
        );

    return normalizarId(
        valor
    );
}

function obterTIPUNID(
    equipamento
) {

    const valor =
        primeiro(
            equipamento,
            [
                "TIP_UNID",
                "tipUnid",
                "tipoUnidade"
            ]
        );

    return numero(
        valor
    );
}

function obterPac(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return null;
    }

    const texto =
        String(
            valor
        ).trim();

    if (!texto) {
        return null;
    }

    const match =
        texto.match(
            /^(.+?)M(?:-[^- ]+)?$/i
        );

    return normalizarId(
        match?.[1] ||
        texto
    );
}

function obterAlimentadorEquipamento(
    equipamento
) {

    return normalizarId(
        primeiro(
            equipamento,
            [
                "alimentador",
                "ALIMENTADOR",
                "CT_COD_OP",
                "CT_COD_OPER",
                "CTMT",
                "ctmt",
                "circuito",
                "CIRCUITO"
            ]
        )
    );
}

// ==========================================================
// CLASSIFICAÇÃO
// ==========================================================

export function classificarEquipamento(
    equipamento
) {

    const tip =
        obterTIPUNID(
            equipamento
        );

    switch (
        tip
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

// ==========================================================
// INTERLIGAÇÕES OFICIAIS
// ==========================================================

export function buscarInterligacoes() {

    return lista(
        estadoRede
            .topologiaBDGD
            ?.interligacoes
    );
}

function obterAlimentadorInterligacaoA(
    item
) {

    return normalizarId(

        item?.alimentadorA ??
        item?.alimentadorOrigem ??
        item?.origem ??
        item?.alimentador1 ??
        item?.alimentador_1 ??
        item?.CTMT_A ??
        item?.ctmtA ??
        item?.ctmt_1 ??
        item?.circuitoA ??
        item?.circuito1 ??
        null

    );
}

function obterAlimentadorInterligacaoB(
    item
) {

    return normalizarId(

        item?.alimentadorB ??
        item?.alimentadorDestino ??
        item?.destino ??
        item?.alimentador2 ??
        item?.alimentador_2 ??
        item?.CTMT_B ??
        item?.ctmtB ??
        item?.ctmt_2 ??
        item?.circuitoB ??
        item?.circuito2 ??
        null

    );
}

// ==========================================================
// EQUIPAMENTO DA INTERLIGAÇÃO
// ==========================================================

function obterEquipamentoInterligacao(
    item
) {

    if (!item) {
        return "";
    }

    const referencias = [

        item?.equipamento,

        item?.equipamentoId,

        item?.idEquipamento,

        item?.ID_EQUIPAMENTO,

        item?.equipamentoOperacional,

        item?.equipamentoInterligacao,

        item?.idEquipamentoInterligacao,

        item?.COD_EQUIPAMENTO,

        item?.COD_EQUIP,

        item?.codEquipamento,

        item?.PQT,

        item?.pqt,

        item?.plaqueta,

        item?.PLAQUETA,

        item?.unsemtId,

        item?.untrmtId,

        item?.COD_ID,

        item?.codId,

        item?.id,

    ];

    for (
        const referencia of
        referencias
    ) {

        if (
            referencia &&
            typeof referencia ===
                "object"
        ) {

            const interno =
                primeiro(
                    referencia,
                    [
                        "id",
                        "ID",
                        "COD_ID",
                        "codId",
                        "codigo",
                        "CODIGO",
                        "plaqueta",
                        "PLAQUETA",
                        "idOperacional",
                        "unsemtId",
                        "untrmtId",
                    ]
                );

            if (
                interno !== null
            ) {

                return normalizarId(
                    interno
                );
            }

            continue;
        }

        const texto =
            normalizarId(
                referencia
            );

        if (
            texto
        ) {

            return texto;
        }
    }

    return "";
}

// ==========================================================
// ESTADO DA INTERLIGAÇÃO
// ==========================================================

function obterEstadoInterligacao(
    item
) {

    if (!item) {
        return null;
    }

    const estadoDireto =
        obterEstadoExplicito(
            item
        );

    if (
        estadoDireto?.estado
    ) {

        return estadoDireto.estado;
    }

    const fontes = [

        item,

        item?.properties,

        item?.propriedades,

        item?.props,

    ].filter(Boolean);

    for (
        const fonte of fontes
    ) {

        if (
            fonte?.normalmenteAberta === true ||
            fonte?.normallyOpen === true ||
            fonte?.NA === true ||
            fonte?.N_A === true
        ) {

            return "ABERTO";
        }

        if (
            fonte?.normalmenteFechada === true ||
            fonte?.normallyClosed === true
        ) {

            return "FECHADO";
        }
    }

    return null;
}

function interligacaoExplicitamenteAberta(
    interligacao
) {

    const estado =
        obterEstadoInterligacao(
            interligacao
        );

    return (
        estado ===
        "ABERTO"
    );
}

function interligacaoExplicitamenteFechada(
    interligacao
) {

    const estado =
        obterEstadoInterligacao(
            interligacao
        );

    return (
        estado ===
        "FECHADO"
    );
}

export function buscarInterligacoesAlimentador(
    alimentador
) {

    const alvo =
        normalizarCodigo(
            alimentador
        );

    return buscarInterligacoes()
        .filter(
            item => {

                const a =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoA(
                            item
                        )
                    );

                const b =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoB(
                            item
                        )
                    );

                return (
                    a === alvo ||
                    b === alvo
                );
            }
        );
}

export function possuiInterligacao(
    origem,
    destino
) {

    const o =
        normalizarCodigo(
            origem
        );

    const d =
        normalizarCodigo(
            destino
        );

    return buscarInterligacoes()
        .some(
            item => {

                const a =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoA(
                            item
                        )
                    );

                const b =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoB(
                            item
                        )
                    );

                return (
                    (
                        a === o &&
                        b === d
                    ) ||
                    (
                        a === d &&
                        b === o
                    )
                );
            }
        );
}

export function buscarCaminhoAlimentadores(
    origem,
    destino
) {

    const o =
        normalizarCodigo(
            origem
        );

    const d =
        normalizarCodigo(
            destino
        );

    return buscarInterligacoes()
        .filter(
            item => {

                const a =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoA(
                            item
                        )
                    );

                const b =
                    normalizarCodigo(
                        obterAlimentadorInterligacaoB(
                            item
                        )
                    );

                return (
                    (
                        a === o &&
                        b === d
                    ) ||
                    (
                        a === d &&
                        b === o
                    )
                );
            }
        );
}

// ==========================================================
// PACS DA INTERLIGAÇÃO
// ==========================================================

function obterPacsInterligacao(
    interligacao
) {

    if (
        !interligacao
    ) {
        return [];
    }

    const resultado = [];

    const fontes = [

        interligacao,

        interligacao?.equipamento,

        interligacao?.equipamentoOperacional,

        interligacao?.equipamentoInterligacao,

        interligacao?.dispositivo,

    ].filter(Boolean);

    const campos = [

        "pac1",
        "PAC_1",

        "pac2",
        "PAC_2",

        "ponto1",
        "ponto2",

        "pontoAssociado",
        "pontoId",

        "PAC",

        "pac",

        "PN_CON_1",
        "PN_CON_2",

        "pontoOrigem",
        "pontoDestino",

        "PAC_ORIGEM",
        "PAC_DESTINO",

    ];

    for (
        const fonte of fontes
    ) {

        for (
            const campo of campos
        ) {

            const pac =
                obterPac(
                    fonte?.[campo]
                );

            if (
                pac &&
                !resultado.some(
                    existente =>
                        normalizarCodigo(
                            existente
                        ) ===
                        normalizarCodigo(
                            pac
                        )
                )
            ) {

                resultado.push(
                    pac
                );
            }
        }
    }

    return resultado;
}

// ==========================================================
// LOCALIZAR EQUIPAMENTO DE INTERLIGAÇÃO REAL
// ==========================================================

function localizarEquipamentoPorInterligacao(
    interligacao
) {

    if (
        !interligacao
    ) {
        return null;
    }

    const id =
        obterEquipamentoInterligacao(
            interligacao
        );

    if (
        id
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

    const possiveis = [

        interligacao?.equipamento,

        interligacao?.equipamentoOperacional,

        interligacao?.equipamentoInterligacao,

        interligacao?.dispositivo,

        interligacao?.pqt,

        interligacao?.PQT,

    ].filter(Boolean);

    for (
        const referencia of possiveis
    ) {

        if (
            typeof referencia !==
            "object"
        ) {

            const equipamento =
                buscarEquipamento(
                    referencia
                );

            if (
                equipamento
            ) {

                return equipamento;
            }

            continue;
        }

        const referenciaId =
            primeiro(
                referencia,
                [
                    "id",
                    "ID",
                    "COD_ID",
                    "codId",
                    "codigo",
                    "CODIGO",
                    "plaqueta",
                    "PLAQUETA",
                    "idOperacional",
                    "unsemtId",
                    "untrmtId",
                ]
            );

        const equipamento =
            buscarEquipamento(
                referenciaId
            );

        if (
            equipamento
        ) {

            return equipamento;
        }
    }

    // ======================================================
    // FALLBACK POR PAC
    // ======================================================

    const pacs =
        obterPacsInterligacao(
            interligacao
        );

    if (
        pacs.length
    ) {

        const colecoes = [

            estadoRede
                .topologiaBDGD
                ?.equipamentosOperacionais,

            estadoRede
                .topologiaBDGD
                ?.equipamentos,

            estadoRede
                .topologiaBDGD
                ?.unidadesSeccionadoras,

        ];

        for (
            const colecao of colecoes
        ) {

            const encontrado =
                lista(
                    colecao
                ).find(
                    equipamento => {

                        const pacsEquipamento =
                            obterPacsEquipamento(
                                equipamento
                            );

                        return pacs.some(
                            pac =>
                                pacsEquipamento.some(
                                    pacEquip =>
                                        normalizarCodigo(
                                            pacEquip
                                        ) ===
                                        normalizarCodigo(
                                            pac
                                        )
                                )
                        );
                    }
                );

            if (
                encontrado
            ) {

                return encontrado;
            }
        }
    }

    return null;
}

// ==========================================================
// PACS DOS EQUIPAMENTOS
// ==========================================================

function obterPacsEquipamento(
    equipamento
) {

    const resultado = [];

    const fontes = [

        equipamento,

        equipamento?.properties,

        equipamento?.propriedades,

        equipamento?.props,

        equipamento?.unidadeSeccionadora,

        equipamento?.unidade,

        equipamento?.transformador,

    ].filter(Boolean);

    const campos = [

        "pac1",
        "PAC_1",

        "pac2",
        "PAC_2",

        "pontoAssociado",
        "pontoId",
        "PONTO_ID",

        "PAC",
        "pac",

        "PN_CON_1",
        "PN_CON_2",

    ];

    for (
        const fonte of fontes
    ) {

        for (
            const campo of campos
        ) {

            const valor =
                fonte?.[campo];

            const pac =
                obterPac(
                    valor
                );

            if (
                pac &&
                !resultado.some(
                    existente =>
                        normalizarCodigo(
                            existente
                        ) ===
                        normalizarCodigo(
                            pac
                        )
                )
            ) {

                resultado.push(
                    pac
                );
            }
        }
    }

    return resultado;
}

// ==========================================================
// ESTADO DO CANDIDATO
// ==========================================================

function equipamentoTemEstadoABERTO(
    equipamento
) {

    const id =
        obterIdEquipamento(
            equipamento
        );

    if (!id) {
        return false;
    }

    const estado =
        consultarEstadoEquipamento(
            id
        );

    return (
        estado?.estado ===
        "ABERTO" &&
        estado?.origem !==
        "PADRAO"
    );
}

function equipamentoBloqueado(
    equipamento
) {

    const id =
        obterIdEquipamento(
            equipamento
        );

    if (!id) {
        return true;
    }

    const estado =
        consultarEstadoEquipamento(
            id
        );

    return (
        estado?.estado === "INDISPONIVEL" ||
        estado?.estado === "BYPASSADO"
    );
}

// ==========================================================
// CANDIDATO PODE SER FECHADO?
// ==========================================================
//
// Regras:
//
// 1. Estado operacional explícito ABERTO -> sim
// 2. Estado operacional explícito FECHADO -> não
// 3. Estado operacional explícito INDISPONIVEL -> não
// 4. Estado operacional explícito BYPASSADO -> não
// 5. Estado BDGD da interligação ABERTO -> sim
// 6. Estado BDGD da interligação FECHADO -> não
// 7. Estado cadastro explicitamente ABERTO -> sim
// 8. Estado cadastro explicitamente FECHADO -> não
// 9. Ausência -> desconhecido
//
// ==========================================================

function candidatoInterligacaoEstaAberto(
    equipamento,
    interligacao
) {

    const id =
        obterIdEquipamento(
            equipamento
        );

    if (!id) {

        return {

            aberto:
                false,

            conhecido:
                false,

            origem:
                null,

            estado:
                null,

        };
    }

    // ======================================================
    // ESTADO OPERACIONAL REGISTRADO PELO SISTEMA
    // ======================================================

    const chave =
        obterChaveEstadoEquipamento(
            id
        );

    const estadoOperacionalRegistrado =
        estadoRede
            .operacao
            .equipamentos?.[
                chave
            ] ??
        estadoRede
            .operacao
            .equipamentos?.[
                id
            ] ??
        null;

    if (
        estadoOperacionalRegistrado
    ) {

        const estado =
            normalizarEstadoEquipamento(
                estadoOperacionalRegistrado.estado
            );

        if (
            estado
        ) {

            return {

                aberto:
                    estado ===
                    "ABERTO",

                conhecido:
                    true,

                origem:
                    "ESTADO_OPERACIONAL",

                estado,

            };
        }
    }

    // ======================================================
    // ESTADO FÍSICO EXPLÍCITO DO EQUIPAMENTO
    // ======================================================

    const estadoEquipamentoExplicito =
        obterEstadoExplicito(
            equipamento
        );

    if (
        estadoEquipamentoExplicito?.estado
    ) {

        const estado =
            estadoEquipamentoExplicito
                .estado;

        return {

            aberto:
                estado === "ABERTO",

            conhecido:
                true,

            origem:
                "CADASTRO_EQUIPAMENTO",

            origemCampo:
                estadoEquipamentoExplicito
                    .origemCampo,

            estado,

        };
    }

    // ======================================================
    // ESTADO DA PRÓPRIA INTERLIGAÇÃO
    // ======================================================

    const estadoInterligacao =
        obterEstadoInterligacao(
            interligacao
        );

    if (
        estadoInterligacao ===
        "ABERTO"
    ) {

        return {

            aberto:
                true,

            conhecido:
                true,

            origem:
                "BDGD_INTERLIGACAO",

            estado:
                "ABERTO",

        };
    }

    if (
        estadoInterligacao ===
        "FECHADO"
    ) {

        return {

            aberto:
                false,

            conhecido:
                true,

            origem:
                "BDGD_INTERLIGACAO",

            estado:
                "FECHADO",

        };
    }

    if (
        estadoInterligacao ===
        "INDISPONIVEL" ||
        estadoInterligacao ===
        "BYPASSADO"
    ) {

        return {

            aberto:
                false,

            conhecido:
                true,

            origem:
                "BDGD_INTERLIGACAO",

            estado:
                estadoInterligacao,

        };
    }

    // ======================================================
    // AUSÊNCIA DE ESTADO
    // ======================================================

    return {

        aberto:
            false,

        conhecido:
            false,

        origem:
            "SEM_ESTADO_EXPLICITO",

        estado:
            null,

    };
}

// ==========================================================
// REDE DO PONTO
// ==========================================================

function obterRedeDoPonto(
    pontoId,
    opcoes = {}
) {

    if (!pontoId) {
        return null;
    }

    try {

        return buscarRedeConectada(
            pontoId,
            {

                respeitarEstadoOperacional:
                    opcoes?.respeitarEstadoOperacional !== false,

                permitirTravessiaEntreAlimentadores:
                    true,

                permitirTravessiaEntreCircuitos:
                    true,

                ...(opcoes || {}),

            }
        );

    } catch (
        erro
    ) {

        console.warn(
            "[Power Grid Monitor] Falha ao navegar pela rede:",
            pontoId,
            erro
        );

        return null;
    }
}

function obterAlimentadoresDaRede(
    rede
) {

    const alimentadores =
        new Set();

    for (
        const trecho of
        lista(
            rede?.trechos
        )
    ) {

        const valor =
            primeiro(
                trecho,
                [
                    "alimentador",
                    "ALIMENTADOR",
                    "CTMT",
                    "ctmt",
                    "circuito",
                    "CIRCUITO"
                ]
            );

        if (
            valor
        ) {

            alimentadores.add(
                normalizarId(
                    valor
                )
            );
        }
    }

    for (
        const ponto of
        lista(
            rede?.pontos
        )
    ) {

        const valor =
            primeiro(
                ponto,
                [
                    "alimentador",
                    "ALIMENTADOR",
                    "CTMT",
                    "ctmt",
                    "circuito",
                    "CIRCUITO"
                ]
            );

        if (
            valor
        ) {

            alimentadores.add(
                normalizarId(
                    valor
                )
            );
        }
    }

    return [
        ...alimentadores
    ];
}

function redeContemPonto(
    rede,
    ponto
) {

    const alvo =
        normalizarCodigo(
            obterPac(
                ponto
            )
        );

    if (!alvo) {
        return false;
    }

    return lista(
        rede?.pontos
    ).some(
        item => {

            const ids = [

                item?.id,
                item?.ID,

                item?.COD_ID,
                item?.codId,

                item?.PAC,
                item?.pac,

            ];

            return ids.some(
                valor =>
                    normalizarCodigo(
                        obterPac(
                            valor
                        )
                    ) === alvo
            );
        }
    );
}

// ==========================================================
// IDENTIFICAÇÃO DA ÁREA AFETADA
// ==========================================================

function identificarAreaAfetada(
    equipamentoFalha,
    alimentadorOcorrencia
) {

    const base = {

        sucesso:
            false,

        motivo:
            null,

        pacs:
            [],

        pac1:
            null,

        pac2:
            null,

        pacsCompletos:
            false,

        lados:
            [],

        pontoAfetado:
            null,

        pontoReceptor:
            null,

        redeAfetada:
            null,

        redeReceptor:
            null,

        alimentadorAfetado:
            alimentadorOcorrencia,

        alimentadorReceptor:
            null,

        quantidadePontosAfetados:
            0,

        quantidadeTrechosAfetados:
            0,

        criterio:
            null,

        metodo:
            null,

    };

    if (
        !equipamentoFalha
    ) {

        return {

            ...base,

            motivo:
                "Equipamento do desarme não localizado.",

        };
    }

    if (
        !estadoRede.topologiaBDGD
    ) {

        return {

            ...base,

            motivo:
                "Topologia BDGD não registrada.",

        };
    }

    const pacs =
        obterPacsEquipamento(
            equipamentoFalha
        );

    if (
        pacs.length === 0
    ) {

        return {

            ...base,

            motivo:
                "Não foi possível obter referência física do equipamento do desarme na topologia BDGD.",

        };
    }

    const redes = [];

    for (
        const pontoId of pacs
    ) {

        const rede =
            obterRedeDoPonto(
                pontoId,
                {
                    respeitarEstadoOperacional:
                        false,
                }
            );

        if (!rede) {
            continue;
        }

        const alimentadores =
            obterAlimentadoresDaRede(
                rede
            );

        redes.push({

            pontoId,

            rede,

            alimentadores,

            possuiAlimentadorOcorrencia:

                Boolean(
                    alimentadorOcorrencia
                ) &&
                alimentadores.some(
                    item =>
                        normalizarCodigo(
                            item
                        ) ===
                        normalizarCodigo(
                            alimentadorOcorrencia
                        )
                ),

            quantidadePontos:
                lista(
                    rede?.pontos
                ).length,

            quantidadeTrechos:
                lista(
                    rede?.trechos
                ).length,

        });
    }

    if (
        redes.length === 0
    ) {

        return {

            ...base,

            pacs,

            pac1:
                pacs[0] ??
                null,

            pac2:
                pacs[1] ??
                null,

            pacsCompletos:
                pacs.length >= 2,

            motivo:
                "Não foi possível determinar rede conectada a partir das referências físicas do equipamento.",

        };
    }

    redes.sort(
        (
            a,
            b
        ) => {

            const origemA =
                a.possuiAlimentadorOcorrencia
                    ? 1
                    : 0;

            const origemB =
                b.possuiAlimentadorOcorrencia
                    ? 1
                    : 0;

            if (
                origemA !== origemB
            ) {

                return (
                    origemB -
                    origemA
                );
            }

            return (
                b.quantidadePontos -
                a.quantidadePontos
            );
        }
    );

    const ladoAfetado =
        redes.find(
            item =>
                item.possuiAlimentadorOcorrencia
        ) ||
        redes[0];

    const ladoReceptor =
        redes.find(
            item =>
                item !== ladoAfetado &&
                item.alimentadores.some(
                    alimentador =>
                        normalizarCodigo(
                            alimentador
                        ) !==
                        normalizarCodigo(
                            alimentadorOcorrencia
                        )
                )
        ) ||
        null;

    const receptores =
        ladoReceptor
            ? ladoReceptor.alimentadores.filter(
                alimentador =>
                    normalizarCodigo(
                        alimentador
                    ) !==
                    normalizarCodigo(
                        alimentadorOcorrencia
                    )
            )
            : [];

    return {

        sucesso:
            true,

        motivo:
            pacs.length >= 2
                ? "Área afetada delimitada por referências físicas e conectividade BDGD."
                : "Área afetada delimitada pela conectividade física BDGD.",

        pacs,

        pac1:
            pacs[0] ??
            null,

        pac2:
            pacs[1] ??
            null,

        pacsCompletos:
            pacs.length >= 2,

        lados:
            redes,

        ladoAfetado,

        ladoReceptor,

        pontoAfetado:
            ladoAfetado?.pontoId ??
            pacs[0] ??
            null,

        pontoReceptor:
            ladoReceptor?.pontoId ??
            pacs[1] ??
            null,

        redeAfetada:
            ladoAfetado?.rede ??
            null,

        redeReceptor:
            ladoReceptor?.rede ??
            null,

        quantidadePontosAfetados:
            ladoAfetado?.quantidadePontos ??
            0,

        quantidadeTrechosAfetados:
            ladoAfetado?.quantidadeTrechos ??
            0,

        alimentadorAfetado:
            alimentadorOcorrencia ??
            null,

        alimentadorReceptor:
            receptores[0] ??
            null,

        criterio:
            ladoAfetado?.possuiAlimentadorOcorrencia
                ? "ALIMENTADOR_OCORRENCIA"
                : "CONECTIVIDADE_FISICA",

        metodo:
            pacs.length >= 2
                ? "PACS_E_CONECTIVIDADE"
                : "CONECTIVIDADE_BDGD",

    };
}

// ==========================================================
// LISTAR CANDIDATOS DE RECOMPOSIÇÃO
// ==========================================================

function listarCandidatosRecomposicao(
    ocorrencia
) {

    const topologia =
        estadoRede.topologiaBDGD;

    if (!topologia) {
        return [];
    }

    const interligacoes =
        buscarInterligacoes();

    const equipamentoDesarme =
        normalizarCodigoEquipamento(

            ocorrencia?.equipamentoDesarme ??
            ocorrencia?.equipamentoDesarmeId ??
            ocorrencia?.equipamento ??
            ""

        );

    const mapa =
        new Map();

    const diagnostico = {

        totalInterligacoes:
            interligacoes.length,

        localizadas:
            0,

        naoLocalizadas:
            0,

        bloqueadas:
            0,

        fechadas:
            0,

        semEstado:
            0,

        tipoInvalido:
            0,

        desarmeIgnorado:
            0,

        candidatas:
            0,

        detalhesRejeitados:
            [],

    };

    for (
        const interligacao of
        interligacoes
    ) {

        const equipamento =
            localizarEquipamentoPorInterligacao(
                interligacao
            );

        if (
            !equipamento
        ) {

            diagnostico
                .naoLocalizadas++;

            if (
                diagnostico
                    .detalhesRejeitados
                    .length < 20
            ) {

                diagnostico
                    .detalhesRejeitados
                    .push({

                        motivo:
                            "EQUIPAMENTO_NAO_LOCALIZADO",

                        interligacao,

                        referencia:
                            obterEquipamentoInterligacao(
                                interligacao
                            ),

                        pacs:
                            obterPacsInterligacao(
                                interligacao
                            ),

                    });
            }

            continue;
        }

        diagnostico
            .localizadas++;

        const tip =
            obterTIPUNID(
                equipamento
            );

        if (
            ![
                19,
                22,
                32,
                34
            ].includes(
                tip
            )
        ) {

            diagnostico
                .tipoInvalido++;

            continue;
        }

        const id =
            obterIdEquipamento(
                equipamento
            );

        if (
            !id
        ) {
            continue;
        }

        const chave =
            normalizarCodigoEquipamento(
                id
            );

        if (
            !chave
        ) {
            continue;
        }

        if (
            equipamentoDesarme &&
            chave === equipamentoDesarme
        ) {

            diagnostico
                .desarmeIgnorado++;

            continue;
        }

        if (
            equipamentoBloqueado(
                equipamento
            )
        ) {

            diagnostico
                .bloqueadas++;

            continue;
        }

        const estadoCandidato =
            candidatoInterligacaoEstaAberto(
                equipamento,
                interligacao
            );

        // --------------------------------------------------
        // FECHADO/INDISPONÍVEL/BYPASSADO EXPLÍCITO
        // --------------------------------------------------

        if (
            estadoCandidato.conhecido &&
            !estadoCandidato.aberto
        ) {

            if (
                estadoCandidato.estado ===
                "FECHADO"
            ) {

                diagnostico
                    .fechadas++;
            }

            if (
                diagnostico
                    .detalhesRejeitados
                    .length < 20
            ) {

                diagnostico
                    .detalhesRejeitados
                    .push({

                        motivo:
                            "INTERLIGACAO_NAO_ABERTA",

                        id,

                        plaqueta:
                            obterPlaquetaEquipamento(
                                equipamento
                            ),

                        estadoCandidato,

                        estadoEquipamento:
                            consultarEstadoEquipamento(
                                id
                            ),

                        estadoInterligacao:
                            obterEstadoInterligacao(
                                interligacao
                            ),

                    });
            }

            continue;
        }

        // --------------------------------------------------
        // SEM ESTADO EXPLÍCITO
        // --------------------------------------------------

        if (
            !estadoCandidato.conhecido
        ) {

            diagnostico
                .semEstado++;
        }

        mapa.set(
            chave,
            {

                equipamento,

                interligacao,

                estadoCandidato,

            }
        );
    }

    const candidatos = [];

    for (
        const registro of
        mapa.values()
    ) {

        candidatos.push({

            ...registro.equipamento,

            __interligacaoBDGD:
                registro.interligacao,

            __estadoCandidato:
                registro.estadoCandidato,

        });
    }

    diagnostico.candidatas =
        candidatos.length;

    console.log(
        "🔎 [Power Grid Monitor] DIAGNÓSTICO DA BUSCA DE CANDIDATOS:",
        diagnostico
    );

    return candidatos;
}

// ==========================================================
// VALIDAR CANDIDATO TOPOLÓGICO
// ==========================================================
//
// IMPORTANTE:
//
// Uma interligação oficial pode ter:
//
// - PAC_1 != PAC_2
// - PAC_1 == PAC_2
// - apenas um PAC
//
// Portanto:
//
// NÃO usamos a existência de dois PACs como requisito
// para provar a existência dos dois lados.
//
// Os dois lados elétricos são determinados pela interligação
// oficial:
//
//     Alimentador A <-> Alimentador B
//
// O PAC é utilizado como referência física real da chave.
//
// ==========================================================

function validarCandidatoTopologico(
    candidato,
    areaAfetada
) {

    const pacs =
        obterPacsEquipamento(
            candidato
        );

    if (
        pacs.length === 0
    ) {

        return {

            valido:
                false,

            motivo:
                "Equipamento candidato sem referência física PAC/PONNOT.",

        };
    }

    const alimentadorOcorrencia =
        normalizarCodigo(
            areaAfetada?.alimentadorAfetado
        );

    // ======================================================
    // PRIMEIRA OPÇÃO:
    // usar a interligação já resolvida em listarCandidatos
    // ======================================================

    let interligacao =
        candidato?.__interligacaoBDGD ??
        null;

    // ======================================================
    // FALLBACK:
    // procurar pela identidade do equipamento
    // ======================================================

    if (
        !interligacao
    ) {

        const idCandidato =
            normalizarCodigoEquipamento(
                obterIdEquipamento(
                    candidato
                )
            );

        interligacao =
            buscarInterligacoes()
                .find(
                    item => {

                        const idInterligacao =
                            normalizarCodigoEquipamento(
                                obterEquipamentoInterligacao(
                                    item
                                )
                            );

                        return (
                            idInterligacao &&
                            idCandidato &&
                            idInterligacao ===
                            idCandidato
                        );
                    }
                ) ??
            null;
    }

    if (
        !interligacao
    ) {

        return {

            valido:
                false,

            motivo:
                "Interligação oficial BDGD não localizada para o equipamento candidato.",

        };
    }

    // ======================================================
    // ALIMENTADORES OFICIAIS A/B
    // ======================================================

    const alimentadorInterligacaoA =
        obterAlimentadorInterligacaoA(
            interligacao
        );

    const alimentadorInterligacaoB =
        obterAlimentadorInterligacaoB(
            interligacao
        );

    const a =
        normalizarCodigo(
            alimentadorInterligacaoA
        );

    const b =
        normalizarCodigo(
            alimentadorInterligacaoB
        );

    if (
        !a ||
        !b
    ) {

        return {

            valido:
                false,

            motivo:
                "A interligação oficial BDGD não possui os dois alimentadores definidos.",

            comprovacao:
                {

                    alimentadorA:
                        alimentadorInterligacaoA,

                    alimentadorB:
                        alimentadorInterligacaoB,

                },

        };
    }

    if (
        a === b
    ) {

        return {

            valido:
                false,

            motivo:
                "A interligação oficial aponta para o mesmo alimentador nos dois lados.",

            comprovacao:
                {

                    alimentadorA:
                        alimentadorInterligacaoA,

                    alimentadorB:
                        alimentadorInterligacaoB,

                },

        };
    }

    // ======================================================
    // A OCORRÊNCIA PRECISA ESTAR EM UM DOS LADOS
    // ======================================================

    const ocorrenciaEstaNoLadoA =
        a === alimentadorOcorrencia;

    const ocorrenciaEstaNoLadoB =
        b === alimentadorOcorrencia;

    if (
        !ocorrenciaEstaNoLadoA &&
        !ocorrenciaEstaNoLadoB
    ) {

        return {

            valido:
                false,

            motivo:
                "A interligação existe na BDGD, mas nenhum dos seus lados corresponde ao alimentador da ocorrência.",

            comprovacao:
                {

                    alimentadorA:
                        alimentadorInterligacaoA,

                    alimentadorB:
                        alimentadorInterligacaoB,

                    alimentadorOcorrencia:
                        areaAfetada
                            ?.alimentadorAfetado ??
                        null,

                },

        };
    }

    // ======================================================
    // ALIMENTADOR RECEPTOR
    // ======================================================

    const alimentadorReceptor =
        ocorrenciaEstaNoLadoA
            ? alimentadorInterligacaoB
            : alimentadorInterligacaoA;

    // ======================================================
    // PAC FÍSICO DA INTERLIGAÇÃO
    // ======================================================

    const pacInterligacao =
        pacs[0] ??
        null;

    // ======================================================
    // NAVEGAR NOS PACS
    // ======================================================

    const lados =
        pacs.map(
            pac => {

                const rede =
                    obterRedeDoPonto(
                        pac,
                        {

                            respeitarEstadoOperacional:
                                false,

                            permitirTravessiaEntreAlimentadores:
                                true,

                            permitirTravessiaEntreCircuitos:
                                true,

                        }
                    );

                const alimentadores =
                    obterAlimentadoresDaRede(
                        rede
                    );

                return {

                    pac,

                    rede,

                    alimentadores,

                    possuiAlimentadorOcorrencia:

                        alimentadores.some(
                            alimentador =>
                                normalizarCodigo(
                                    alimentador
                                ) ===
                                alimentadorOcorrencia
                        ),

                    possuiAlimentadorReceptor:

                        alimentadores.some(
                            alimentador =>
                                normalizarCodigo(
                                    alimentador
                                ) ===
                                normalizarCodigo(
                                    alimentadorReceptor
                                )
                        ),

                };

            }
        );

    // ======================================================
    // TENTAR LOCALIZAR LADO AFETADO PELA REDE
    // ======================================================

    let ladoAfetado =
        lados.find(
            lado =>
                lado.possuiAlimentadorOcorrencia
        ) ??
        null;

    // ======================================================
    // TENTAR LOCALIZAR LADO RECEPTOR PELA REDE
    // ======================================================

    let ladoReceptor =
        lados.find(
            lado =>
                lado.possuiAlimentadorReceptor
        ) ??
        null;

    // ======================================================
    // PAC ÚNICO
    // ======================================================

    const possuiPACUnico =
        pacs.length === 1;

    // ======================================================
    // PAC1 = PAC2
    // ======================================================

    const possuiPACDuplicado =
        pacs.length >= 2 &&
        normalizarCodigo(
            pacs[0]
        ) ===
        normalizarCodigo(
            pacs[1]
        );

    // ======================================================
    // CASO PAC ÚNICO OU PAC DUPLICADO
    // ======================================================
    //
    // Não exigimos dois pontos físicos.
    //
    // Os dois lados já foram determinados pelos
    // alimentadores oficiais da interligação.
    //
    // ======================================================

    if (
        possuiPACUnico ||
        possuiPACDuplicado
    ) {

        ladoAfetado = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorOcorrencia
                ],

            pertenceArea:
                true,

            origem:
                "INTERLIGACAO_OFICIAL",

        };

        ladoReceptor = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorReceptor
                ],

            pertenceArea:
                false,

            origem:
                "INTERLIGACAO_OFICIAL",

        };
    }

    // ======================================================
    // FALLBACK POR ALIMENTADOR DO EQUIPAMENTO
    // ======================================================

    const alimentadorEquipamento =
        normalizarCodigo(
            obterAlimentadorEquipamento(
                candidato
            )
        );

    if (
        !ladoAfetado &&
        alimentadorEquipamento ===
            alimentadorOcorrencia
    ) {

        ladoAfetado = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorOcorrencia
                ],

            pertenceArea:
                true,

            origem:
                "ALIMENTADOR_EQUIPAMENTO",

        };
    }

    if (
        !ladoReceptor &&
        alimentadorEquipamento ===
            normalizarCodigo(
                alimentadorReceptor
            )
    ) {

        ladoReceptor = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorReceptor
                ],

            pertenceArea:
                false,

            origem:
                "ALIMENTADOR_EQUIPAMENTO",

        };
    }

    // ======================================================
    // FALLBACK FINAL POR INTERLIGAÇÃO OFICIAL
    // ======================================================

    if (
        !ladoAfetado
    ) {

        ladoAfetado = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorOcorrencia
                ],

            pertenceArea:
                true,

            origem:
                "ALIMENTADOR_OCORRENCIA",

        };
    }

    if (
        !ladoReceptor
    ) {

        ladoReceptor = {

            pac:
                pacInterligacao,

            rede:
                lados[0]?.rede ??
                null,

            alimentadores:
                [
                    alimentadorReceptor
                ],

            pertenceArea:
                false,

            origem:
                "ALIMENTADOR_RECEPTOR",

        };
    }

    // ======================================================
    // DEFINIÇÃO DOS PONTOS
    // ======================================================
    //
    // Para interligação com PAC único:
    //
    // - ponto afetado = referência física da área afetada;
    // - ponto receptor = PAC real da interligação.
    //
    // O ponto receptor nunca é inventado.
    //
    // ======================================================

    const pontoAfetado =
        areaAfetada?.pontoAfetado ??
        pacInterligacao ??
        null;

    const pontoReceptor =
        pacInterligacao ??
        areaAfetada?.pontoReceptor ??
        null;

    if (
        !pontoAfetado ||
        !pontoReceptor
    ) {

        return {

            valido:
                false,

            motivo:
                "Ponto afetado ou ponto receptor não determinado.",

        };
    }

    // ======================================================
    // ALIMENTADOR RECEPTOR
    // ======================================================

    if (
        !alimentadorReceptor
    ) {

        return {

            valido:
                false,

            motivo:
                "Alimentador receptor não determinado.",

        };
    }

    // ======================================================
    // DIAGNÓSTICO
    // ======================================================

    console.log(
        "🔎 [Power Grid Monitor] CANDIDATO TOPOLOGICAMENTE COMPROVADO:",
        {

            equipamento:
                obterIdEquipamento(
                    candidato
                ),

            tipo:
                classificarEquipamento(
                    candidato
                ),

            pacs,

            pacUnico:
                possuiPACUnico,

            pacDuplicado:
                possuiPACDuplicado,

            alimentadorOcorrencia:
                areaAfetada
                    ?.alimentadorAfetado ??
                null,

            alimentadorA:
                alimentadorInterligacaoA,

            alimentadorB:
                alimentadorInterligacaoB,

            alimentadorReceptor,

            pontoAfetado,

            pontoReceptor,

        }
    );

    return {

        valido:
            true,

        pac1:
            pacs[0] ??
            null,

        pac2:
            pacs[1] ??
            pacs[0] ??
            null,

        pontoAfetado,

        pontoReceptor,

        alimentadorReceptor,

        redeReceptor:
            ladoReceptor?.rede ??
            lados[0]?.rede ??
            null,

        interligacao,

        comprovacao:
            {

                porInterligacaoBDGD:
                    true,

                interligacaoOficial:
                    true,

                alimentadorA:
                    alimentadorInterligacaoA,

                alimentadorB:
                    alimentadorInterligacaoB,

                alimentadorAfetado:
                    areaAfetada
                        ?.alimentadorAfetado ??
                    null,

                alimentadorReceptor,

                equipamento:
                    obterIdEquipamento(
                        candidato
                    ),

                alimentadorEquipamento:
                    alimentadorEquipamento ||
                    null,

                pacs,

                quantidadePacs:
                    pacs.length,

                pacUnico:
                    possuiPACUnico,

                pacDuplicado:
                    possuiPACDuplicado,

                redePossuiAlimentadorOcorrencia:
                    lados.some(
                        lado =>
                            lado.possuiAlimentadorOcorrencia
                    ),

                redePossuiAlimentadorReceptor:
                    lados.some(
                        lado =>
                            lado.possuiAlimentadorReceptor
                    ),

            },

    };
}

// ==========================================================
// SIMULAÇÃO DE FECHAMENTO
// ==========================================================

function criarEstadosSimulados(
    equipamentoId
) {

    const estados =
        obterMapaEstadosEquipamentos();

    const chave =
        obterChaveEstadoEquipamento(
            equipamentoId
        );

    return {

        ...estados,

        [chave]: {

            equipamentoId:
                equipamentoId,

            equipamentoIdNormalizado:
                chave,

            estado:
                "FECHADO",

            origem:
                "SIMULACAO_RECOMPOSICAO",

        },

    };
}

function validarCaminhoSimulado(
    pontoOrigem,
    pontoDestino,
    equipamentoId
) {

    if (
        !pontoOrigem ||
        !pontoDestino
    ) {

        return {

            encontrado:
                false,

            pontos: [],

            trechos: [],

            motivo:
                "Pontos de origem/destino não definidos.",

        };
    }

    const caminho =
        buscarCaminhoEletrico(

            pontoOrigem,

            pontoDestino,

            {

                estadosEquipamentos:
                    criarEstadosSimulados(
                        equipamentoId
                    ),

                respeitarEstadoOperacional:
                    true,

                permitirTravessiaEntreAlimentadores:
                    true,

                permitirTravessiaEntreCircuitos:
                    true,

            }

        );

    return caminho;
}

// ==========================================================
// CAPACIDADE DO CANDIDATO
// ==========================================================

function validarCapacidadeCandidato(
    candidato,
    correnteDestino,
    correnteDesligado
) {

    const base =
        numero(
            correnteDestino
        );

    const transferencia =
        numero(
            correnteDesligado
        );

    if (
        base === null ||
        transferencia === null
    ) {

        return {

            conhecida:
                false,

            permitido:
                null,

            correnteBaseDestino:
                base,

            correnteTransferida:
                transferencia,

            correnteProjetada:
                null,

            carregamento:
                null,

            motivo:
                "Corrente do trecho receptor ou corrente do trecho desenergizado não informada.",

        };
    }

    const correnteProjetada =
        base +
        transferencia;

    const caminho =
        candidato?.caminhoSimulado ??
        candidato?.caminho ??
        null;

    const trechos =
        lista(
            caminho?.trechos
        );

    if (
        trechos.length === 0
    ) {

        return {

            conhecida:
                false,

            permitido:
                null,

            correnteBaseDestino:
                base,

            correnteTransferida:
                transferencia,

            correnteProjetada,

            carregamento:
                null,

            motivo:
                "Caminho de transferência não possui trechos para validação de capacidade.",

        };
    }

    const verificacoes =
        trechos.map(
            trecho => {

                const id =
                    normalizarId(

                        trecho?.id ??
                        trecho?.COD_ID ??
                        trecho?.codId

                    );

                const capacidade =
                    numero(
                        calcularCapacidadeTrecho(
                            id
                        )
                    );

                if (
                    capacidade === null ||
                    capacidade <= 0
                ) {

                    return {

                        id,

                        capacidade:
                            null,

                        limite:
                            null,

                        carregamento:
                            null,

                        permitido:
                            false,

                        motivo:
                            "Capacidade não determinada.",

                    };
                }

                const limite =
                    capacidade *
                    0.8;

                const carregamento =
                    (
                        correnteProjetada /
                        capacidade
                    ) *
                    100;

                return {

                    id,

                    capacidade,

                    limite,

                    carregamento,

                    permitido:
                        correnteProjetada <=
                        limite,

                    motivo:
                        correnteProjetada <=
                        limite
                            ? null
                            : "Corrente projetada acima do limite operacional de 80%.",

                };
            }
        );

    const bloqueado =
        verificacoes.some(
            item =>
                item.permitido !==
                true
        );

    const limitante =
        verificacoes
            .filter(
                item =>
                    item.capacidade !==
                    null
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.capacidade -
                    b.capacidade
            )[0] ||
        null;

    return {

        conhecida:
            !bloqueado,

        permitido:
            !bloqueado,

        correnteBaseDestino:
            base,

        correnteTransferida:
            transferencia,

        correnteProjetada,

        carregamento:
            limitante
                ?.carregamento ??
            null,

        capacidade:
            limitante
                ?.capacidade ??
            null,

        limiteOperacional:
            limitante
                ?.limite ??
            null,

        trechoLimitante:
            limitante
                ? {

                    id:
                        limitante.id,

                    capacidade:
                        limitante.capacidade,

                    limite:
                        limitante.limite,

                    carregamento:
                        limitante.carregamento,

                }
                : null,

        verificacoes,

        motivo:
            bloqueado
                ? "Um ou mais trechos não suportam a corrente projetada."
                : "Capacidade validada.",

    };
}

// ==========================================================
// DESCOBRIR CANDIDATOS
// ==========================================================

export function descobrirCandidatosRecomposicao(
    ocorrencia,
    opcoes = {}
) {

    const topologia =
        estadoRede.topologiaBDGD;

    if (!topologia) {
        return [];
    }

    const equipamentoDesarmeId =
        normalizarId(

            ocorrencia?.equipamentoDesarme ??
            ocorrencia?.equipamentoDesarmeId ??
            ocorrencia?.equipamento ??
            null

        );

    if (
        !equipamentoDesarmeId
    ) {

        return [];
    }

    const equipamentoDesarme =
        buscarEquipamento(
            equipamentoDesarmeId
        );

    if (
        !equipamentoDesarme
    ) {

        console.warn(
            "[Power Grid Monitor] Equipamento de desarme não localizado:",
            equipamentoDesarmeId
        );

        return [];
    }

    const alimentadorOcorrencia =
        normalizarId(

            ocorrencia?.alimentador ??
            ocorrencia?.alimentadorOrigem ??
            null

        );

    const areaAfetada =
        identificarAreaAfetada(

            equipamentoDesarme,

            alimentadorOcorrencia

        );

    if (
        !areaAfetada.sucesso
    ) {

        console.warn(
            "[Power Grid Monitor] Área afetada não determinada:",
            areaAfetada
        );

        return [];
    }

    const candidatos =
        listarCandidatosRecomposicao(
            ocorrencia
        );

    console.log(
        "🔎 [Power Grid Monitor] CANDIDATOS BRUTOS:",
        {

            quantidade:
                candidatos.length,

            interligacoes:
                buscarInterligacoes().length,

            alimentadorOcorrencia,

            equipamentoDesarme:
                equipamentoDesarmeId,

            areaAfetada:
                {

                    pacs:
                        areaAfetada.pacs,

                    pontoAfetado:
                        areaAfetada.pontoAfetado,

                    pontoReceptor:
                        areaAfetada.pontoReceptor,

                    alimentadorAfetado:
                        areaAfetada.alimentadorAfetado,

                    alimentadorReceptor:
                        areaAfetada.alimentadorReceptor,

                },

            candidatosDetectados:
                candidatos.map(
                    candidato => ({

                        id:
                            obterIdEquipamento(
                                candidato
                            ),

                        plaqueta:
                            obterPlaquetaEquipamento(
                                candidato
                            ),

                        tipo:
                            classificarEquipamento(
                                candidato
                            ),

                        estado:
                            candidato
                                ?.__estadoCandidato,

                        interligacao:
                            candidato
                                ?.__interligacaoBDGD,

                    })
                ),

        }
    );

    const resultado = [];

    for (
        const candidato of
        candidatos
    ) {

        const equipamentoId =
            obterIdEquipamento(
                candidato
            );

        if (!equipamentoId) {
            continue;
        }

        const tipo =
            classificarEquipamento(
                candidato
            );

        const estadoCandidato =
            candidato?.__estadoCandidato;

        const estadoNaoComprovado =
            !estadoCandidato?.conhecido;

        const validacaoTopologica =
            validarCandidatoTopologico(

                candidato,

                areaAfetada

            );

        if (
            !validacaoTopologica.valido
        ) {

            console.warn(
                "[Power Grid Monitor] Candidato rejeitado na topologia:",
                {

                    equipamento:
                        equipamentoId,

                    motivo:
                        validacaoTopologica.motivo,

                    pacs:
                        obterPacsEquipamento(
                            candidato
                        ),

                }
            );

            continue;
        }

        const pontoAfetado =
            validacaoTopologica
                .pontoAfetado;

        const pontoReceptor =
            validacaoTopologica
                .pontoReceptor;

        const caminho =
            validarCaminhoSimulado(

                pontoAfetado,

                pontoReceptor,

                equipamentoId

            );

        if (
            caminho?.encontrado !==
            true
        ) {

            console.warn(
                "[Power Grid Monitor] Candidato rejeitado por caminho:",
                {

                    equipamento:
                        equipamentoId,

                    pontoAfetado,

                    pontoReceptor,

                    motivo:
                        caminho?.motivo ??
                        "CAMINHO_NAO_ENCONTRADO",

                }
            );

            continue;
        }

        const plaqueta =
            obterPlaquetaEquipamento(
                candidato
            );

        const codId =
            normalizarId(
                primeiro(
                    candidato,
                    [
                        "COD_ID",
                        "codId"
                    ]
                )
            );

        resultado.push({

            equipamentoId,

            equipamentoInterligacao:
                equipamentoId,

            equipamento:
                candidato,

            id:
                equipamentoId,

            plaqueta:
                plaqueta ||
                equipamentoId,

            COD_ID:
                codId ||
                null,

            codId:
                codId ||
                null,

            tipo,

            tipUnid:
                obterTIPUNID(
                    candidato
                ),

            estadoAtual:
                estadoCandidato?.conhecido
                    ? estadoCandidato.estado
                    : null,

            estado:
                estadoCandidato?.conhecido
                    ? estadoCandidato.estado
                    : null,

            estadoConhecido:
                estadoCandidato?.conhecido === true,

            estadoOrigem:
                estadoCandidato?.origem ??
                null,

            estadoNaoComprovado,

            pac1:
                validacaoTopologica.pac1,

            pac2:
                validacaoTopologica.pac2,

            pontoAfetado,

            pontoReceptor,

            alimentadorAfetado:
                alimentadorOcorrencia,

            alimentadorReceptor:
                validacaoTopologica
                    .alimentadorReceptor,

            interligacaoBDGD:
                validacaoTopologica
                    .interligacao ??
                candidato
                    ?.__interligacaoBDGD ??
                null,

            comprovacaoTopologica:
                validacaoTopologica
                    .comprovacao ??
                null,

            caminhoSimulado:
                caminho,

            caminhoEletrico:
                caminho,

            quantidadeManobras:
                1,

            manobra: {

                ordem:
                    1,

                acao:
                    "FECHAR",

                equipamento:
                    equipamentoId,

            },

        });
    }

    console.log(
        "⚡ [Power Grid Monitor] CANDIDATOS VÁLIDOS:",
        resultado.map(
            candidato => ({

                equipamento:
                    candidato.equipamentoId,

                plaqueta:
                    candidato.plaqueta,

                tipo:
                    candidato.tipo,

                estado:
                    candidato.estado,

                estadoConhecido:
                    candidato.estadoConhecido,

                estadoOrigem:
                    candidato.estadoOrigem,

                alimentadorAfetado:
                    candidato.alimentadorAfetado,

                alimentadorReceptor:
                    candidato.alimentadorReceptor,

                pac1:
                    candidato.pac1,

                pac2:
                    candidato.pac2,

            })
        )
    );

    return resultado;
}

// ==========================================================
// ANÁLISE DE RECOMPOSIÇÃO
// ==========================================================

export function analisarRecomposicaoOcorrencia(
    ocorrencia,
    opcoes = {}
) {

    const equipamentoDesarmeId =
        normalizarId(

            ocorrencia?.equipamentoDesarme ??
            ocorrencia?.equipamentoDesarmeId ??
            ocorrencia?.equipamento ??
            null

        );

    if (
        !equipamentoDesarmeId
    ) {

        return {

            sucesso:
                false,

            status:
                "EQUIPAMENTO_DESARME_NAO_INFORMADO",

            candidatos:
                [],

            recomendacao:
                null,

            motivo:
                "Equipamento do desarme não informado.",

        };
    }

    const validacao =
        validarEquipamentoBDGD(

            equipamentoDesarmeId,

            ocorrencia?.alimentador

        );

    if (
        !validacao?.valido
    ) {

        return {

            sucesso:
                false,

            status:
                "EQUIPAMENTO_DESARME_INVALIDO",

            validacao,

            candidatos:
                [],

            recomendacao:
                null,

            motivo:
                validacao?.motivo ??
                "Equipamento do desarme não validado na BDGD.",

        };
    }

    const correnteDesligado =
        numero(

            opcoes?.correnteDesligado ??

            ocorrencia?.correnteTrechoOcorrencia ??

            ocorrencia?.manobra?.correnteDesligado ??

            null

        );

    const correnteDestino =
        numero(

            opcoes?.correnteDestino ??

            ocorrencia?.correnteTrechoRecuperacao ??

            ocorrencia?.manobra?.correnteDestino ??

            null

        );

    const candidatosBrutos =
        descobrirCandidatosRecomposicao(

            ocorrencia,

            {

                correnteDesligado,

                correnteDestino,

            }

        );

    const candidatos =
        candidatosBrutos.map(
            candidato => {

                const capacidade =
                    validarCapacidadeCandidato(

                        candidato,

                        correnteDestino,

                        correnteDesligado

                    );

                const permitidoCarga =
                    capacidade
                        .conhecida
                        ? capacidade.permitido
                        : null;

                // ==================================================
                // REGRA FINAL DE VIABILIDADE
                // ==================================================
                //
                // Para recomendar fechamento automaticamente,
                // precisamos ter:
                //
                // 1. estado conhecido;
                // 2. estado atual ABERTO;
                // 3. capacidade validada;
                //
                // Caso o estado não esteja comprovado,
                // permanece CONDICIONADA.
                //
                // ==================================================

                const permitido =
                    candidato.estadoConhecido &&
                    candidato.estado ===
                        "ABERTO" &&
                    permitidoCarga ===
                        true

                        ? true

                        : candidato.estadoConhecido &&
                            candidato.estado ===
                                "ABERTO" &&
                            permitidoCarga ===
                                false

                            ? false

                            : null;

                let status =
                    "CONDICIONADA";

                if (
                    permitido === true
                ) {

                    status =
                        "VIAVEL";

                } else if (
                    permitido === false
                ) {

                    status =
                        "BLOQUEADA";
                }

                return {

                    ...candidato,

                    correnteDesligado,

                    correnteDestino,

                    correnteBaseDestino:
                        capacidade
                            .correnteBaseDestino,

                    correnteTransferida:
                        capacidade
                            .correnteTransferida,

                    correnteProjetada:
                        capacidade
                            .correnteProjetada,

                    carregamento:
                        capacidade
                            .carregamento,

                    capacidade:
                        capacidade
                            .capacidade,

                    limiteOperacional:
                        capacidade
                            .limiteOperacional,

                    trechoLimitante:
                        capacidade
                            .trechoLimitante,

                    validacaoCarga:
                        capacidade,

                    permitido,

                    status,

                };
            }
        );

    candidatos.sort(
        (
            a,
            b
        ) => {

            const prioridadeStatus = {

                VIAVEL:
                    0,

                CONDICIONADA:
                    1,

                BLOQUEADA:
                    2,

            };

            const aStatus =
                prioridadeStatus[
                    a?.status
                ] ??
                99;

            const bStatus =
                prioridadeStatus[
                    b?.status
                ] ??
                99;

            if (
                aStatus !==
                bStatus
            ) {

                return (
                    aStatus -
                    bStatus
                );
            }

            const aCarga =
                numero(
                    a?.carregamento
                );

            const bCarga =
                numero(
                    b?.carregamento
                );

            if (
                aCarga !== null &&
                bCarga !== null
            ) {

                return (
                    aCarga -
                    bCarga
                );
            }

            return (

                Number(
                    a?.quantidadeManobras ??
                    1
                ) -

                Number(
                    b?.quantidadeManobras ??
                    1
                )

            );
        }
    );

    const melhorAlternativa =
        candidatos.find(
            candidato =>
                candidato?.permitido ===
                true
        ) || null;

    if (
        !melhorAlternativa
    ) {

        const candidatosTopologicos =
            candidatos.length;

        const candidatosSemEstado =
            candidatos.filter(
                candidato =>
                    candidato?.estadoConhecido !==
                    true
            ).length;

        let status =
            "SEM_CANDIDATO";

        let motivo =
            "Nenhum equipamento de interligação atende aos critérios.";

        if (
            candidatosTopologicos > 0 &&
            candidatosSemEstado ===
                candidatosTopologicos
        ) {

            status =
                "ESTADO_NAO_COMPROVADO";

            motivo =
                "Foram encontradas interligações reais e topologicamente compatíveis, porém a BDGD não forneceu estado explícito de abertura/fechamento para confirmar uma manobra segura.";

        } else if (
            candidatosTopologicos > 0
        ) {

            status =
                "SEM_ALTERNATIVA";

            motivo =
                "Existem candidatos topológicos, mas nenhum atende simultaneamente ao estado operacional e à capacidade de transferência.";
        }

        return {

            sucesso:
                true,

            status,

            validacao,

            equipamentoDesarme:
                equipamentoDesarmeId,

            alimentadorOcorrencia:
                ocorrencia?.alimentador ??
                null,

            correnteDesligado,

            correnteDestino,

            candidatos,

            quantidadeCandidatos:
                candidatos.length,

            recomendacao:
                null,

            motivo,

        };
    }

    const recomendacao = {

        equipamentoInterligacao:
            melhorAlternativa
                .equipamentoInterligacao,

        equipamentoId:
            melhorAlternativa
                .equipamentoId,

        id:
            melhorAlternativa
                .id,

        plaqueta:
            melhorAlternativa
                .plaqueta,

        COD_ID:
            melhorAlternativa
                .COD_ID ??
            null,

        codId:
            melhorAlternativa
                .codId ??
            null,

        tipo:
            melhorAlternativa
                .tipo,

        tipUnid:
            melhorAlternativa
                .tipUnid,

        estadoAntes:
            melhorAlternativa
                .estadoAtual,

        estadoDepois:
            "FECHADO",

        pac1:
            melhorAlternativa
                .pac1,

        pac2:
            melhorAlternativa
                .pac2,

        pontoAfetado:
            melhorAlternativa
                .pontoAfetado,

        pontoReceptor:
            melhorAlternativa
                .pontoReceptor,

        alimentadorAfetado:
            melhorAlternativa
                .alimentadorAfetado,

        alimentadorReceptor:
            melhorAlternativa
                .alimentadorReceptor,

        correnteDesligado:
            melhorAlternativa
                .correnteDesligado,

        correnteDestino:
            melhorAlternativa
                .correnteDestino,

        correnteBaseDestino:
            melhorAlternativa
                .correnteBaseDestino,

        correnteTransferida:
            melhorAlternativa
                .correnteTransferida,

        correnteProjetada:
            melhorAlternativa
                .correnteProjetada,

        carregamento:
            melhorAlternativa
                .carregamento,

        capacidade:
            melhorAlternativa
                .capacidade,

        limiteOperacional:
            melhorAlternativa
                .limiteOperacional,

        trechoLimitante:
            melhorAlternativa
                .trechoLimitante,

        caminhoEletrico:
            melhorAlternativa
                .caminhoSimulado,

        interligacaoBDGD:
            melhorAlternativa
                .interligacaoBDGD ??
            null,

        comprovacaoTopologica:
            melhorAlternativa
                .comprovacaoTopologica ??
            null,

        quantidadeManobras:
            1,

        sequenciaManobra: [

            {

                ordem:
                    1,

                acao:
                    "FECHAR",

                equipamento:
                    melhorAlternativa
                        .equipamentoInterligacao,

                descricao:

                    `Fechar ${melhorAlternativa.plaqueta || melhorAlternativa.equipamentoId} após confirmação das condições operacionais.`,

            }

        ],

    };

    return {

        sucesso:
            true,

        status:
            "ALTERNATIVA_ENCONTRADA",

        mensagem:
            "Alternativa de recomposição encontrada pela topologia BDGD.",

        validacao,

        equipamentoDesarme:
            equipamentoDesarmeId,

        alimentadorOcorrencia:
            ocorrencia?.alimentador ??
            null,

        correnteDesligado,

        correnteDestino,

        candidatos,

        quantidadeCandidatos:
            candidatos.length,

        melhorAlternativa,

        recomendacao,

    };
}

// ==========================================================
// ANÁLISES LEGADAS
// ==========================================================

export function analisarNormalizacao(
    dados = {}
) {

    return {

        permitido:
            true,

        status:
            "ANALISE",

        dados,

    };
}

export function analisarTransferencia(
    dados = {}
) {

    const origem =
        dados?.alimentadorOrigem ??
        dados?.alimentador ??
        null;

    const destino =
        dados?.alimentadorDestino ??
        null;

    const corrente =
        numero(
            dados?.correnteTransferida ??
            dados?.corrente ??
            null
        );

    if (
        !origem ||
        !destino
    ) {

        return {

            permitido:
                false,

            status:
                "DADO_INDISPONIVEL",

            motivo:
                "Origem e destino não determinados.",

        };
    }

    return {

        permitido:
            corrente !== null,

        status:
            corrente !== null
                ? "ANALISADA"
                : "DADO_INDISPONIVEL",

        alimentadorOrigem:
            origem,

        alimentadorDestino:
            destino,

        corrente,

    };
}

export function analisarManobraOperacional(
    dados = {}
) {

    return analisarTransferencia(
        dados
    );
}

export function analisarImpactoManobra(
    dados = {}
) {

    return {

        impacto:
            null,

        dados,

    };
}

// ==========================================================
// DESENERGIZAÇÃO
// ==========================================================

export function desenergizarAlimentador(
    alimentador
) {

    const id =
        normalizarId(
            alimentador
        );

    if (!id) {

        return {

            sucesso:
                false,

        };
    }

    if (
        !estadoRede
            .operacao
            .alimentadoresDesenergizados
            .includes(
                id
            )
    ) {

        estadoRede
            .operacao
            .alimentadoresDesenergizados
            .push(
                id
            );
    }

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

        alimentador:
            id,

    };
}

export function energizarAlimentador(
    alimentador
) {

    const id =
        normalizarId(
            alimentador
        );

    estadoRede
        .operacao
        .alimentadoresDesenergizados =

        estadoRede
            .operacao
            .alimentadoresDesenergizados
            .filter(
                item =>
                    item !== id
            );

    estadoRede
        .operacao
        .ultimaAtualizacao =
        new Date();

    return {

        sucesso:
            true,

        alimentador:
            id,

    };
}

// ==========================================================
// RESUMO
// ==========================================================

export function resumoRede() {

    const topologia =
        estadoRede.topologiaBDGD;

    return {

        subestacoes:
            estadoRede
                .subestacoes
                .length,

        alimentadores:
            estadoRede
                .alimentadores
                .length,

        trechos:
            estadoRede
                .trechos
                .length,

        equipamentos:
            estadoRede
                .equipamentos
                .length,

        topologiaBDGD:
            Boolean(
                topologia
            ),

        topologiaAlimentador:
            topologia?.alimentador ??
            null,

        topologiaAlimentadores:
            lista(
                topologia?.alimentadores
            ),

        pontosBDGD:
            lista(
                topologia?.pontos
            ).length,

        trechosBDGD:
            lista(
                topologia?.trechos
            ).length,

        equipamentosBDGD:
            lista(
                topologia?.equipamentos
            ).length,

        interligacoesBDGD:
            lista(
                topologia?.interligacoes
            ).length,

        equipamentosDesligados:
            estadoRede
                .operacao
                .equipamentosDesligados
                .length,

    };
}

// ==========================================================
// EXPORTAÇÃO
// ==========================================================

export const modeloRede = {

    getRede,

    getSubestacoes,

    getAlimentadores,

    getTrechos,

    getEquipamentos,

    obterIdentificadoresEquipamento,

    registrarTopologiaBDGD,

    limparTopologiaBDGD,

    getTopologiaBDGD,

    possuiTopologiaBDGD,

    validarEquipamentoBDGD,

    buscarSubestacao,

    buscarAlimentador,

    buscarTrecho,

    buscarEquipamento,

    buscarEquipamentoRede,

    existeEquipamento,

    buscarPontoRede,

    buscarTrechoRede,

    buscarConexoesRede,

    buscarConexoesEquipamento,

    buscarTrechosAlimentador,

    buscarEquipamentosAlimentador,

    buscarEquipamentosTelecomandados,

    normalizarEstadoEquipamento,

    consultarEstadoEquipamento,

    listarEstadosEquipamentos,

    atualizarEstadoEquipamento,

    executarManobraEquipamento,

    desligarEquipamento,

    ligarEquipamento,

    equipamentoEstaAberto,

    equipamentoEstaFechado,

    equipamentoEstaDisponivel,

    obterMapaEstadosEquipamentos,

    consultarEstadoOperacional,

    resetarEstadosEquipamentos,

    restaurarEstadoInicial,

    consultarCorrenteAlimentador,

    obterCorrenteAlimentador,

    atualizarCorrenteAlimentador,

    consultarCorrenteTrecho,

    obterCorrenteTrecho,

    atualizarCorrenteTrecho,

    buscarInterligacoes,

    buscarInterligacoesAlimentador,

    possuiInterligacao,

    buscarCaminhoAlimentadores,

    capacidadePorBitola,

    calcularCapacidadeTrecho,

    validarCargaTrecho,

    buscarMontante,

    buscarJusante,

    buscarCaminhoEletrico,

    buscarRedeConectada,

    buscarPQTDoPontoRede,

    buscarTransformadoresDoPontoRede,

    filtrarRedePorAlimentador,

    obterFichaOperacional,

    obterFichaCompletaEquipamento,

    classificarEquipamento,

    descobrirCandidatosRecomposicao,

    analisarRecomposicaoOcorrencia,

    analisarNormalizacao,

    analisarTransferencia,

    analisarManobraOperacional,

    analisarImpactoManobra,

    desenergizarAlimentador,

    energizarAlimentador,

    resumoRede,

};

export default modeloRede;