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
// O estado é centralizado neste módulo. Os dados da BDGD são
// registrados por registrarTopologiaBDGD(); os valores operacionais
// abaixo pertencem à simulação local e não representam comando SCADA.
const estadoRede = {
    subestacoes: [],
    alimentadores: [],
    trechos: [],
    equipamentos: [],
    topologiaBDGD: null,
    operacao: {
        equipamentos: {},
        equipamentosDesligados: [],
        alimentadoresDesenergizados: {},
        correntesAlimentadores: {},
        correntesTrechos: {},
        historico: [],
        ultimaAtualizacao: null,
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
    const resultado = [];
    const adicionar = item => {
        const valor = typeof item === "object" && item !== null
            ? (primeiro(item, ["id", "codigo", "alimentador", "ALIMENTADOR", "CTMT", "ctmt"]) ?? item)
            : item;
        const chave = normalizarCodigo(valor);
        if (chave && !resultado.some(existente => normalizarCodigo(
            typeof existente === "object" && existente !== null
                ? (primeiro(existente, ["id", "codigo", "alimentador", "ALIMENTADOR", "CTMT", "ctmt"]) ?? existente)
                : existente
        ) === chave)) resultado.push(item);
    };
    for (const item of lista(estadoRede.alimentadores)) adicionar(item);
    for (const item of lista(estadoRede.topologiaBDGD?.alimentadores)) adicionar(item);
    return resultado;
}

export function getTrechos() {
    return mesclarColecao(
        estadoRede.trechos,
        lista(estadoRede.topologiaBDGD?.trechos).concat(
            lista(estadoRede.topologiaBDGD?.listaTrechos)
        )
    );
}

export function getEquipamentos() {
    const topologia = estadoRede.topologiaBDGD;
    return mesclarColecao(
        estadoRede.equipamentos,
        lista(topologia?.equipamentosOperacionais).concat(
            lista(topologia?.equipamentos),
            lista(topologia?.unidadesSeccionadoras),
            lista(topologia?.transformadores),
            lista(topologia?.reguladores),
            lista(topologia?.capacitores)
        )
    );
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

        "posicaoOperacional",
        "POSICAO_OPERACIONAL",

        "estadoChave",
        "ESTADO_CHAVE",

        "estadoEletrico",
        "ESTADO_ELETRICO",

    ];

    for (
        const fonte of
        fontes
    ) {

        for (
            const campo of
            camposEstado
        ) {

            const valor =
                fonte?.[campo];

            // 1/0 só é interpretado como posição quando o campo
            // representa explicitamente a posição do dispositivo.
            // Códigos genéricos de situação/atividade não são estados elétricos.
            let estado = normalizarEstadoEquipamento(valor);
            const campoPosicao = [
                "posicao", "POSICAO", "POS",
                "posicaoOperacional", "POSICAO_OPERACIONAL",
            ].includes(campo);
            if (!estado && campoPosicao) {
                const codigoPosicao = normalizarTexto(valor);
                if (codigoPosicao === "1") estado = "FECHADO";
                if (codigoPosicao === "0") estado = "ABERTO";
            }

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
        const fonte of
        fontes
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

    const equipamentoCadastro = buscarEquipamento(id);
    const estadoCadastro = obterEstadoExplicito(equipamentoCadastro);
    const equipamentoBDGD = buscarEquipamentoBDGD(id);
    const estadoExplicito = estadoCadastro?.estado
        ? estadoCadastro
        : obterEstadoExplicito(equipamentoBDGD ?? equipamentoCadastro);

    if (estadoExplicito?.estado) {

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
        equipamentoId: id,
        estado: null,
        conhecido: false,
        origem: "DESCONHECIDO",
        atualizadoEm: null,
        observacao: "Estado físico não informado; não é seguro presumir ABERTO ou FECHADO.",
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
        estado === "ABERTO" ||
        estado === "FECHADO"
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

    estadoRede.operacao.alimentadoresDesenergizados = {};

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
        const colecao of
        colecoes
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

    const topologia = estadoRede.topologiaBDGD;
    const trechoBDGD = topologia
        ? (buscarTrechoBDGD(topologia, alvo) || buscarNaColecao(topologia?.trechos, alvo) || buscarNaColecao(topologia?.listaTrechos, alvo))
        : null;

    return cadastro || trechoBDGD || null;
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
// TRECHOS / EQUIPAMENTOS
// ==========================================================

export function buscarTrechosAlimentador(alimentador) {
    const alvo = normalizarCodigo(alimentador);
    if (!alvo) return [];
    const topologia = estadoRede.topologiaBDGD;
    const colecao = mesclarColecao(
        estadoRede.trechos,
        lista(topologia?.trechos).concat(lista(topologia?.listaTrechos))
    );
    return colecao.filter(trecho =>
        normalizarCodigo(primeiro(trecho, [
            "alimentador", "ALIMENTADOR", "CT_COD_OP", "CT_COD_OPER",
            "CTMT", "ctmt", "circuito", "CIRCUITO",
        ])) === alvo
    );
}

export function buscarEquipamentosAlimentador(alimentador) {
    const alvo = normalizarCodigo(alimentador);
    if (!alvo) return [];
    const topologia = estadoRede.topologiaBDGD;
    const colecao = mesclarColecao(
        estadoRede.equipamentos,
        lista(topologia?.equipamentosOperacionais).concat(
            lista(topologia?.equipamentos),
            lista(topologia?.unidadesSeccionadoras),
            lista(topologia?.transformadores),
            lista(topologia?.reguladores),
            lista(topologia?.capacitores)
        )
    );
    return colecao.filter(equipamento =>
        normalizarCodigo(obterAlimentadorEquipamento(equipamento)) === alvo
    );
}

export function buscarEquipamentosTelecomandados(alimentador = null) {
    const equipamentos = alimentador
        ? buscarEquipamentosAlimentador(alimentador)
        : mesclarColecao(
            estadoRede.equipamentos,
            lista(estadoRede.topologiaBDGD?.equipamentosOperacionais).concat(
                lista(estadoRede.topologiaBDGD?.equipamentos),
                lista(estadoRede.topologiaBDGD?.unidadesSeccionadoras)
            )
        );

    const verdadeiro = valor => {
        if (valor === true || valor === 1) return true;
        const texto = normalizarTexto(valor);
        return ["1", "SIM", "S", "TRUE", "VERDADEIRO", "TELECOMANDADO", "TELECOMANDO"].includes(texto);
    };

    return equipamentos.filter(equipamento => {
        const tlcd = numero(primeiro(equipamento, ["TLCD", "tlcd"]));
        const telecomando = primeiro(equipamento, ["telecomandado", "telecomando", "TELECOMANDADO", "TELECOMANDO"]);
        return (tlcd !== null && tlcd > 0) || verdadeiro(telecomando);
    });
}

// ==========================================================
// CAPACIDADE
// ==========================================================

export function capacidadePorBitola(bitola) {
    return capacidadePorBitolaLocal(bitola);
}

export function calcularCapacidadeTrecho(trechoId) {
    const detalhes = obterDetalhesCapacidadeTrecho(trechoId);
    return detalhes?.conhecida ? detalhes.capacidade : null;
}

export function validarCargaTrecho(trechoId, corrente) {
    const correnteConvertida = numero(corrente);
    const i = correnteConvertida !== null && correnteConvertida >= 0
        ? correnteConvertida
        : null;
    const detalhes = obterDetalhesCapacidadeTrecho(trechoId);
    const capacidade = numero(detalhes?.capacidade);

    if (i === null) {
        return {
            conhecida: false,
            permitido: false,
            corrente: null,
            capacidade: capacidade && capacidade > 0 ? capacidade : null,
            limite: capacidade && capacidade > 0 ? capacidade * 0.8 : null,
            motivo: "Corrente não informada; a carga não pode ser validada.",
        };
    }

    if (!detalhes?.conhecida || capacidade === null || capacidade <= 0) {
        return {
            conhecida: false,
            permitido: false,
            corrente: i,
            capacidade: null,
            limite: null,
            carregamento: null,
            motivo: detalhes?.motivo || "Capacidade do trecho não determinada por dados técnicos válidos.",
            detalhes,
        };
    }

    const limite = capacidade * 0.8;
    const carregamento = (i / capacidade) * 100;
    const dentroDoLimite = i <= limite;
    const capacidadeConfirmada = detalhes.capacidadeEstimativa !== true;

    return {
        conhecida: true,
        confirmada: capacidadeConfirmada,
        // Uma estimativa pode apontar sobrecarga (bloquear), mas nunca
        // libera a manobra automaticamente enquanto não houver capacidade
        // técnica confirmada no cadastro/SEGCON.
        permitido: !dentroDoLimite
            ? false
            : (capacidadeConfirmada ? true : null),
        corrente: i,
        capacidade,
        limite,
        carregamento,
        origem: detalhes.origem,
        capacidadeEstimativa: detalhes.capacidadeEstimativa === true,
        avisoCapacidade: detalhes.avisoCapacidade ?? null,
        motivo: !dentroDoLimite
            ? `Corrente de ${i} A supera o limite operacional de ${limite} A.`
            : (!capacidadeConfirmada ? detalhes.avisoCapacidade : null),
        detalhes,
    };
}

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

    const equipamento = buscarEquipamentoBDGD(codigo);

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

export function filtrarRedePorAlimentador(alimentador) {
    const alvo = normalizarCodigo(alimentador);
    const topologia = estadoRede.topologiaBDGD;
    if (!alvo) return { alimentador, pontos: [], trechos: [], equipamentos: [] };

    const pontos = lista(topologia?.pontos).filter(ponto =>
        normalizarCodigo(primeiro(ponto, ["alimentador", "ALIMENTADOR", "CTMT", "ctmt", "circuito", "CIRCUITO"])) === alvo
    );
    const trechos = buscarTrechosAlimentador(alimentador);
    const equipamentos = buscarEquipamentosAlimentador(alimentador);

    return { alimentador, pontos, trechos, equipamentos };
}


// ==========================================================
// PACS DA INTERLIGAÇÃO
// ==========================================================

function obterPacsInterligacao(interligacao) {
    if (!interligacao) return [];

    const fontes = [
        interligacao,
        interligacao?.equipamento,
        interligacao?.equipamentoOperacional,
        interligacao?.equipamentoInterligacao,
        interligacao?.dispositivo,
        interligacao?.equipamentoA,
        interligacao?.equipamentoB,
        interligacao?.unidadeA,
        interligacao?.unidadeB,
    ].filter(Boolean);

    const campos = [
        "pacs", "PACS",
        "pac1", "PAC_1", "pac2", "PAC_2",
        "pacA", "PAC_A", "pacB", "PAC_B",
        "ponto1", "ponto2", "pontoBase", "pontoId",
        "pontoAssociado", "ponto",
        "PAC", "pac",
        "PN_CON_1", "PN_CON_2",
        "pontoOrigem", "pontoDestino",
        "PAC_ORIGEM", "PAC_DESTINO",
    ];

    const resultado = [];
    const chaves = new Set();

    function adicionar(valor) {
        if (valor === null || valor === undefined) return;

        if (Array.isArray(valor)) {
            for (const item of valor) adicionar(item);
            return;
        }

        if (typeof valor === "object") {
            const interno = primeiro(valor, [
                "PAC", "pac", "PAC_1", "pac1", "PAC_2", "pac2",
                "pontoId", "ponto", "pontoAssociado", "COD_ID", "codId", "id",
            ]);
            if (interno !== null) adicionar(interno);
            return;
        }

        const pac = obterPac(valor);
        const chave = normalizarCodigo(pac);
        if (!pac || !chave || chaves.has(chave)) return;

        chaves.add(chave);
        resultado.push(normalizarId(pac));
    }

    for (const fonte of fontes) {
        for (const campo of campos) {
            adicionar(fonte?.[campo]);
        }
    }

    return resultado;
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

function obterReferenciasEquipamentosInterligacao(item) {
    if (!item || typeof item !== "object") return [];

    const resultado = [];
    const chaves = new Set();
    const camposFisicos = [
        // Referências explícitas para equipamentos dos dois lados.
        "equipamentoA", "equipamentoB", "equipmentA", "equipmentB",
        "unidadeA", "unidadeB", "unidadeId", "UNIDADE_ID",
        // Referências diretas de equipamento/chave.
        "equipamentoId", "idEquipamento", "ID_EQUIPAMENTO",
        "equipamentoOperacional", "equipamentoInterligacao",
        "idEquipamentoInterligacao", "COD_EQUIPAMENTO", "COD_EQUIP",
        "codEquipamento", "PQT", "pqt", "plaqueta", "PLAQUETA",
        "idOperacional", "unsemtId", "UNSEMT_ID", "codIdUNSEMT",
        "COD_ID_UNSEMT", "untrmtId", "UNTRMT_ID", "codIdUNTRMT",
        "COD_ID_UNTRMT", "COD_ID", "codId", "UNSEMT", "UNTRMT", "UNTRAT",
        "equipamento", "dispositivo",
    ];
    const fontes = [
        item,
        item?.properties,
        item?.propriedades,
        item?.props,
    ].filter(Boolean);

    function adicionar(valor, profundidade = 0) {
        if (valor === null || valor === undefined || profundidade > 2) return;

        if (Array.isArray(valor)) {
            for (const itemArray of valor) adicionar(itemArray, profundidade + 1);
            return;
        }

        if (typeof valor === "object") {
            for (const campo of [
                "idOperacional", "id", "ID", "COD_ID", "codId", "codigo", "CODIGO",
                "plaqueta", "PLAQUETA", "unidadeId", "UNIDADE_ID", "unsemtId",
                "UNSEMT_ID", "codIdUNSEMT", "COD_ID_UNSEMT", "untrmtId",
                "UNTRMT_ID", "codIdUNTRMT", "COD_ID_UNTRMT",
                "properties", "propriedades", "props", "unidadeSeccionadora",
                "unidade", "transformador", "equipamentoOperacional", "dispositivo",
            ]) {
                const interno = valor?.[campo];
                if (interno !== null && interno !== undefined) {
                    adicionar(interno, profundidade + 1);
                }
            }
            return;
        }

        const referencia = normalizarId(valor);
        const chave = normalizarCodigoEquipamento(referencia);
        if (!referencia || !chave || chaves.has(chave)) return;

        // IL-1, IL-2 etc. identificam registros de interligação, não chaves físicas.
        if (/^IL[-_\s]?\d+$/i.test(referencia)) return;

        chaves.add(chave);
        resultado.push(referencia);
    }

    for (const fonte of fontes) {
        for (const campo of camposFisicos) {
            adicionar(fonte?.[campo]);
        }
    }

    // O identificador genérico só é usado se não for o código sintético IL-n.
    // Ele será confirmado pela busca na topologia BDGD antes de ser aceito.
    const idGenerico = item?.id ?? item?.ID;
    if (idGenerico !== null && idGenerico !== undefined && !/^IL[-_\s]?\d+$/i.test(normalizarId(idGenerico))) {
        adicionar(idGenerico);
    }

    return resultado;
}

function obterEquipamentoInterligacao(item) {
    const referencias = obterReferenciasEquipamentosInterligacao(item);
    if (referencias.length) return referencias[0];

    // Retorno para diagnóstico apenas; nunca é usado sozinho como equipamento físico.
    return normalizarId(item?.id ?? item?.ID ?? "");
}

function obterEquipamentosFisicosTopologiaBDGD() {
    const topologia = estadoRede.topologiaBDGD;
    if (!topologia) return [];

    const colecoes = [
        topologia.equipamentosOperacionais,
        topologia.equipamentos,
        topologia.unidadesSeccionadoras,
        topologia.transformadores,
        topologia.reguladores,
        topologia.capacitores,
    ];

    const mesclados = mesclarColecao([], colecoes.flatMap(colecao => lista(colecao)));
    const resultado = [];
    const vistos = new Set();

    for (const equipamento of mesclados) {
        if (!equipamento || typeof equipamento !== "object") continue;

        const id = obterIdEquipamento(equipamento) || primeiro(equipamento, [
            "COD_ID", "codId", "id", "ID", "unsemtId", "UNSEMT_ID",
            "untrmtId", "UNTRMT_ID", "plaqueta", "PLAQUETA",
        ]);
        const chave = normalizarCodigoEquipamento(id);
        if (!chave || vistos.has(chave)) continue;

        vistos.add(chave);
        resultado.push(equipamento);
    }

    return resultado;
}

function obterCodigosLadosInterligacao(interligacao) {
    const valores = [
        obterAlimentadorInterligacaoA(interligacao),
        obterAlimentadorInterligacaoB(interligacao),
        interligacao?.circuitoA,
        interligacao?.circuitoB,
        interligacao?.circuito1,
        interligacao?.circuito2,
        interligacao?.CTMT_A,
        interligacao?.CTMT_B,
        interligacao?.ctmtA,
        interligacao?.ctmtB,
        interligacao?.ctmt_1,
        interligacao?.ctmt_2,
    ];

    return new Set(valores.map(normalizarCodigo).filter(Boolean));
}

function resolverEquipamentosPorInterligacao(interligacao) {
    if (!interligacao || !estadoRede.topologiaBDGD) {
        return {
            equipamentos: [],
            metodo: null,
            motivo: "TOPOLOGIA_NAO_DISPONIVEL",
            referencias: [],
            pacs: [],
            equipamentosCompativeis: [],
        };
    }

    const referencias = obterReferenciasEquipamentosInterligacao(interligacao);
    const localizados = [];
    const idsLocalizados = new Set();

    // Preferência absoluta: códigos explicitamente associados ao registro
    // e confirmados nas coleções físicas da BDGD.
    for (const referencia of referencias) {
        const equipamento = buscarEquipamentoBDGD(referencia);
        if (!equipamento) continue;

        const id = obterIdEquipamento(equipamento);
        const chave = normalizarCodigoEquipamento(id);
        if (!chave || idsLocalizados.has(chave)) continue;

        idsLocalizados.add(chave);
        localizados.push(equipamento);
    }

    if (localizados.length) {
        return {
            equipamentos: localizados,
            metodo: "IDENTIFICADOR_FISICO_BDGD",
            motivo: null,
            referencias,
            pacs: obterPacsInterligacao(interligacao),
            equipamentosCompativeis: localizados,
        };
    }

    // O código IL-n identifica o registro da interligação, não o equipamento.
    // Busca pelo PAC só é aceita se houver exatamente uma chave/religador real
    // e compatível nas coleções carregadas da BDGD.
    const pacs = obterPacsInterligacao(interligacao);
    const pacsChave = new Set(pacs.map(pac => normalizarCodigo(obterPac(pac))).filter(Boolean));
    if (!pacsChave.size) {
        return {
            equipamentos: [],
            metodo: null,
            motivo: "INTERLIGACAO_SEM_REFERENCIA_FISICA",
            referencias,
            pacs,
            equipamentosCompativeis: [],
        };
    }

    const codigosLados = obterCodigosLadosInterligacao(interligacao);
    if (!codigosLados.size) {
        return {
            equipamentos: [],
            metodo: null,
            motivo: "INTERLIGACAO_SEM_ALIMENTADORES_OU_CIRCUITOS_CONFIRMAVEIS",
            referencias,
            pacs,
            equipamentosCompativeis: [],
        };
    }

    const tiposManobraveis = new Set([19, 22, 32, 34]);
    const equipamentosNoPAC = obterEquipamentosFisicosTopologiaBDGD().filter(equipamento => {
        if (!tiposManobraveis.has(obterTIPUNID(equipamento))) return false;

        const id = obterIdEquipamento(equipamento);
        if (!id || !buscarEquipamentoBDGD(id)) return false;

        const pacsEquipamento = obterPacsEquipamento(equipamento)
            .map(pac => normalizarCodigo(obterPac(pac)))
            .filter(Boolean);
        return pacsEquipamento.some(pac => pacsChave.has(pac));
    });

    // Não basta compartilhar PAC: o equipamento físico também precisa
    // pertencer a um dos alimentadores/circuitos registrados nos dois lados.
    // Se a BDGD não informa esse vínculo, mantemos a interligação sem resolução.
    const compativeisPorPAC = equipamentosNoPAC.filter(equipamento => {
        const alimentadorEquipamento = normalizarCodigo(obterAlimentadorEquipamento(equipamento));
        return Boolean(alimentadorEquipamento && codigosLados.has(alimentadorEquipamento));
    });

    const unicos = [];
    const idsUnicos = new Set();
    for (const equipamento of compativeisPorPAC) {
        const chave = normalizarCodigoEquipamento(obterIdEquipamento(equipamento));
        if (!chave || idsUnicos.has(chave)) continue;
        idsUnicos.add(chave);
        unicos.push(equipamento);
    }

    if (unicos.length === 1) {
        return {
            equipamentos: unicos,
            metodo: "PAC_UNICO_CONFIRMADO_NA_BDGD",
            motivo: null,
            referencias,
            pacs,
            equipamentosCompativeis: unicos,
        };
    }

    if (unicos.length > 1) {
        return {
            equipamentos: [],
            metodo: null,
            motivo: "PAC_AMBIGUO_MULTIPLOS_EQUIPAMENTOS_REAIS",
            referencias,
            pacs,
            equipamentosCompativeis: unicos.map(equipamento => ({
                id: obterIdEquipamento(equipamento),
                plaqueta: obterPlaquetaEquipamento(equipamento),
                tipUnid: obterTIPUNID(equipamento),
                alimentador: obterAlimentadorEquipamento(equipamento),
                pacs: obterPacsEquipamento(equipamento),
            })),
        };
    }

    let motivo = "NENHUM_EQUIPAMENTO_MANOBRAVEL_REAL_ENCONTRADO_NOS_PACS_DA_INTERLIGACAO";
    let equipamentosCompativeis = [];

    if (equipamentosNoPAC.length && !compativeisPorPAC.length) {
        motivo = "PAC_COM_EQUIPAMENTO_REAL_MAS_SEM_LADO_COMPATIVEL_CONFIRMADO";
        equipamentosCompativeis = equipamentosNoPAC.map(equipamento => ({
            id: obterIdEquipamento(equipamento),
            plaqueta: obterPlaquetaEquipamento(equipamento),
            tipUnid: obterTIPUNID(equipamento),
            alimentador: obterAlimentadorEquipamento(equipamento) || null,
            pacs: obterPacsEquipamento(equipamento),
        }));
    }

    return {
        equipamentos: [],
        metodo: null,
        motivo,
        referencias,
        pacs,
        equipamentosCompativeis,
    };
}

function localizarEquipamentoPorInterligacao(interligacao) {
    return resolverEquipamentosPorInterligacao(interligacao).equipamentos[0] ?? null;
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

    // "Normalmente aberta/fechada" descreve a configuração nominal,
    // não necessariamente a posição física atual. Não a usamos como
    // evidência de estado operacional presente.
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
// RESOLUÇÃO SEGURA DE PACS, REDES E ESTADO DO CANDIDATO
// ==========================================================

function obterPacsEquipamento(equipamento) {
    if (!equipamento) return [];

    const fontes = [
        equipamento,
        equipamento?.properties,
        equipamento?.propriedades,
        equipamento?.props,
        equipamento?.unidadeSeccionadora,
        equipamento?.unidade,
        equipamento?.equipamento,
        equipamento?.equipamentoOperacional,
        equipamento?.dispositivo,
    ].filter(Boolean);

    const campos = [
        "PAC_1", "pac1", "PAC_2", "pac2",
        "PAC", "pac", "PON_ID", "PONNOT",
        "ponto1", "ponto2", "pontoAssociado", "pontoId",
        "PN_CON_1", "PN_CON_2", "pontoOrigem", "pontoDestino",
        "PAC_ORIGEM", "PAC_DESTINO",
    ];
    const resultado = [];

    for (const fonte of fontes) {
        for (const campo of campos) {
            const pac = obterPac(fonte?.[campo]);
            if (!pac) continue;
            const chave = normalizarCodigo(obterPac(pac));
            if (chave && !resultado.some(item => normalizarCodigo(item) === chave)) {
                resultado.push(normalizarId(pac));
            }
        }
    }
    return resultado;
}

function obterRedeDoPonto(pontoId, opcoes = {}) {
    if (!estadoRede.topologiaBDGD || !normalizarId(pontoId)) return null;
    try {
        return buscarRedeConectada(pontoId, {
            ...opcoes,
            respeitarEstadoOperacional: opcoes?.respeitarEstadoOperacional === true,
            permitirTravessiaEntreAlimentadores: opcoes?.permitirTravessiaEntreAlimentadores !== false,
            permitirTravessiaEntreCircuitos: opcoes?.permitirTravessiaEntreCircuitos !== false,
        }) || null;
    } catch (erro) {
        console.warn("[Power Grid Monitor] Falha ao resolver rede conectada:", erro);
        return null;
    }
}

function obterAlimentadoresDaRede(rede) {
    const valores = [];
    const adicionar = valor => {
        if (valor === null || valor === undefined) return;
        if (typeof valor === "object") {
            const interno = primeiro(valor, ["alimentador", "ALIMENTADOR", "CTMT", "ctmt", "circuito", "CIRCUITO", "id", "codigo"]);
            if (interno !== null) adicionar(interno);
            return;
        }
        const item = normalizarId(valor);
        if (item && !valores.some(existente => normalizarCodigo(existente) === normalizarCodigo(item))) {
            valores.push(item);
        }
    };

    for (const valor of lista(rede?.alimentadores)) adicionar(valor);
    adicionar(rede?.alimentador);
    const grupos = [
        lista(rede?.pontos), lista(rede?.listaPontos),
        lista(rede?.trechos), lista(rede?.listaTrechos),
        lista(rede?.equipamentos), lista(rede?.equipamentosOperacionais),
    ];
    for (const grupo of grupos) {
        for (const item of grupo) {
            adicionar(primeiro(item, ["alimentador", "ALIMENTADOR", "CT_COD_OP", "CT_COD_OPER", "CTMT", "ctmt", "circuito", "CIRCUITO"]));
        }
    }
    return valores;
}

function equipamentoBloqueado(equipamento) {
    if (!equipamento) return true;
    const id = obterIdEquipamento(equipamento);
    const estadoOperacional = id ? consultarEstadoEquipamento(id) : null;
    const estadoCadastro = obterEstadoExplicito(equipamento)?.estado ?? null;
    const estado = estadoOperacional?.estado ?? estadoCadastro;

    if (estado === "INDISPONIVEL" || estado === "BYPASSADO") return true;

    const fontes = [equipamento, equipamento?.properties, equipamento?.propriedades, equipamento?.props].filter(Boolean);
    return fontes.some(fonte =>
        fonte?.indisponivel === true || fonte?.isUnavailable === true ||
        fonte?.bypassado === true || fonte?.bypass === true || fonte?.emBypass === true
    );
}

function candidatoInterligacaoEstaAberto(equipamento, interligacao) {
    const id = obterIdEquipamento(equipamento);
    const estadoEquipamento = id ? consultarEstadoEquipamento(id) : null;
    const estadoCadastro = obterEstadoExplicito(equipamento)?.estado ?? null;
    const estadoInterligacao = obterEstadoInterligacao(interligacao);

    // Estado de operação/cadastro explicitamente observado tem prioridade.
    const estado = estadoEquipamento?.estado ?? estadoCadastro ?? estadoInterligacao ?? null;
    return {
        conhecido: ESTADOS_VALIDOS.includes(estado),
        estado,
        aberto: estado === "ABERTO",
        origem: estadoEquipamento?.estado ? estadoEquipamento.origem : (estadoCadastro ? "CADASTRO_EQUIPAMENTO" : (estadoInterligacao ? "BDGD_INTERLIGACAO" : "DESCONHECIDO")),
    };
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

    const chaveFalha = obterChaveEstadoEquipamento(
        obterIdEquipamento(equipamentoFalha) ||
        primeiro(equipamentoFalha, ["COD_ID", "codId", "id", "plaqueta"])
    );
    const estadosComFalhaAberta = {
        ...obterMapaEstadosEquipamentos(),
        [chaveFalha]: {
            equipamentoId: obterIdEquipamento(equipamentoFalha),
            equipamentoIdNormalizado: chaveFalha,
            estado: "ABERTO",
            origem: "SIMULACAO_DELIMITACAO_AREA",
        },
    };

    const redes = [];

    for (const pontoId of pacs) {
        const rede = obterRedeDoPonto(pontoId, {
            estadosEquipamentos: estadosComFalhaAberta,
            respeitarEstadoOperacional: true,
            permitirTravessiaEntreAlimentadores: true,
            permitirTravessiaEntreCircuitos: true,
        });

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

function listarCandidatosRecomposicao(ocorrencia) {
    const topologia = estadoRede.topologiaBDGD;
    if (!topologia) return [];

    const interligacoes = buscarInterligacoes();
    const equipamentoDesarme = normalizarCodigoEquipamento(
        ocorrencia?.equipamentoDesarme ??
        ocorrencia?.equipamentoDesarmeId ??
        ocorrencia?.equipamento ??
        ""
    );

    const mapa = new Map();
    const diagnostico = {
        totalInterligacoes: interligacoes.length,
        localizadas: 0,
        naoLocalizadas: 0,
        resolvidasPorIdentificador: 0,
        resolvidasPorPACUnico: 0,
        ambiguasPorPAC: 0,
        semReferenciaFisica: 0,
        bloqueadas: 0,
        fechadas: 0,
        semEstado: 0,
        tipoInvalido: 0,
        desarmeIgnorado: 0,
        candidatas: 0,
        detalhesRejeitados: [],
    };

    for (const interligacao of interligacoes) {
        const resolucao = resolverEquipamentosPorInterligacao(interligacao);
        const equipamentos = resolucao.equipamentos ?? [];

        if (!equipamentos.length) {
            diagnostico.naoLocalizadas++;
            if (resolucao.motivo === "PAC_AMBIGUO_MULTIPLOS_EQUIPAMENTOS_REAIS") {
                diagnostico.ambiguasPorPAC++;
            }
            if (resolucao.motivo === "INTERLIGACAO_SEM_REFERENCIA_FISICA") {
                diagnostico.semReferenciaFisica++;
            }

            if (diagnostico.detalhesRejeitados.length < 20) {
                diagnostico.detalhesRejeitados.push({
                    motivo: resolucao.motivo ?? "EQUIPAMENTO_NAO_LOCALIZADO",
                    interligacao,
                    referenciaRegistro: normalizarId(interligacao?.id ?? interligacao?.ID ?? ""),
                    referenciasFisicasTentadas: resolucao.referencias ?? [],
                    pacs: resolucao.pacs ?? obterPacsInterligacao(interligacao),
                    equipamentosCompativeis: resolucao.equipamentosCompativeis ?? [],
                });
            }
            continue;
        }

        if (resolucao.metodo === "IDENTIFICADOR_FISICO_BDGD") {
            diagnostico.resolvidasPorIdentificador++;
        } else if (resolucao.metodo === "PAC_UNICO_CONFIRMADO_NA_BDGD") {
            diagnostico.resolvidasPorPACUnico++;
        }

        // Contabiliza a interligação uma vez, mesmo que o registro contenha
        // mais de uma referência física; cada equipamento será validado separadamente.
        diagnostico.localizadas++;
        for (const equipamento of equipamentos) {
            if (!equipamento) continue;

            const tip = obterTIPUNID(equipamento);
            if (![19, 22, 32, 34].includes(tip)) {
                diagnostico.tipoInvalido++;
                if (diagnostico.detalhesRejeitados.length < 20) {
                    diagnostico.detalhesRejeitados.push({
                        motivo: "TIP_UNID_NAO_MANOBRAVEL",
                        interligacao,
                        equipamento: obterIdEquipamento(equipamento) || null,
                        tipUnid: tip,
                    });
                }
                continue;
            }

            const id = obterIdEquipamento(equipamento);
            if (!id) continue;

            const chave = normalizarCodigoEquipamento(id);
            if (!chave) continue;

            if (equipamentoDesarme && chave === equipamentoDesarme) {
                diagnostico.desarmeIgnorado++;
                continue;
            }

            if (equipamentoBloqueado(equipamento)) {
                diagnostico.bloqueadas++;
                if (diagnostico.detalhesRejeitados.length < 20) {
                    diagnostico.detalhesRejeitados.push({
                        motivo: "EQUIPAMENTO_BLOQUEADO",
                        id,
                        estado: consultarEstadoEquipamento(id)?.estado ?? obterEstadoExplicito(equipamento)?.estado ?? null,
                    });
                }
                continue;
            }

            const estadoCandidato = candidatoInterligacaoEstaAberto(equipamento, interligacao);

            // Fechado, indisponível ou bypassado explicitamente não pode ser candidato.
            if (estadoCandidato.conhecido && !estadoCandidato.aberto) {
                if (estadoCandidato.estado === "FECHADO") diagnostico.fechadas++;
                if (diagnostico.detalhesRejeitados.length < 20) {
                    diagnostico.detalhesRejeitados.push({
                        motivo: "INTERLIGACAO_NAO_ABERTA",
                        id,
                        plaqueta: obterPlaquetaEquipamento(equipamento),
                        estadoCandidato,
                        estadoEquipamento: consultarEstadoEquipamento(id),
                        estadoInterligacao: obterEstadoInterligacao(interligacao),
                        metodoResolucao: resolucao.metodo,
                    });
                }
                continue;
            }

            if (!estadoCandidato.conhecido) diagnostico.semEstado++;

            // Deduplica por equipamento físico. Dá preferência a uma associação
            // confirmada por identificador e, em seguida, a estado ABERTO conhecido.
            const anterior = mapa.get(chave);
            const pesoResolucao = resolucao.metodo === "IDENTIFICADOR_FISICO_BDGD" ? 2 : 1;
            const pesoAnterior = anterior?.metodoResolucao === "IDENTIFICADOR_FISICO_BDGD" ? 2 : 1;
            const estadoAberto = estadoCandidato.aberto ? 1 : 0;
            const estadoAnteriorAberto = anterior?.estadoCandidato?.aberto ? 1 : 0;

            if (!anterior || (pesoResolucao + estadoAberto) >= (pesoAnterior + estadoAnteriorAberto)) {
                mapa.set(chave, {
                    equipamento,
                    interligacao,
                    estadoCandidato,
                    metodoResolucao: resolucao.metodo,
                });
            }
        }
    }

    const candidatos = [];
    for (const registro of mapa.values()) {
        candidatos.push({
            ...registro.equipamento,
            __interligacaoBDGD: registro.interligacao,
            __estadoCandidato: registro.estadoCandidato,
            __metodoResolucaoInterligacao: registro.metodoResolucao,
        });
    }

    diagnostico.candidatas = candidatos.length;
    console.log("🔎 [Power Grid Monitor] DIAGNÓSTICO DA BUSCA DE CANDIDATOS:", diagnostico);
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

    const idEquipamentoCandidato = obterIdEquipamento(candidato);
    const chaveCandidato = obterChaveEstadoEquipamento(idEquipamentoCandidato);
    const estadosComCandidatoAberto = {
        ...obterMapaEstadosEquipamentos(),
        [chaveCandidato]: {
            equipamentoId: idEquipamentoCandidato,
            equipamentoIdNormalizado: chaveCandidato,
            estado: "ABERTO",
            origem: "SIMULACAO_IDENTIFICACAO_LADO_INTERLIGACAO",
        },
    };

    const lados = pacs.map(pac => {
        const rede = obterRedeDoPonto(pac, {
            estadosEquipamentos: estadosComCandidatoAberto,
            respeitarEstadoOperacional: true,
            permitirTravessiaEntreAlimentadores: true,
            permitirTravessiaEntreCircuitos: true,
        });

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
    });

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

    if (!ladoReceptor && (possuiPACUnico || possuiPACDuplicado)) {
        // Com um único ponto físico disponível não há como separar os
        // lados pelo PAC; os alimentadores A/B oficiais continuam sendo
        // necessários e a simulação de caminho é uma condição adicional.
        ladoReceptor = {
            pac: pacInterligacao,
            rede: lados[0]?.rede ?? null,
            alimentadores: [alimentadorReceptor],
            pertenceArea: false,
            origem: "INTERLIGACAO_OFICIAL_PAC_UNICO",
        };
    }

    if (!ladoReceptor) {
        return {
            valido: false,
            motivo: "A interligação possui mais de um PAC, mas a topologia não comprovou qual PAC pertence ao alimentador receptor.",
            comprovacao: {
                alimentadorA: alimentadorInterligacaoA,
                alimentadorB: alimentadorInterligacaoB,
                alimentadorReceptor,
                pacs,
            },
        };
    }

    // ======================================================
    // DEFINIÇÃO DOS PONTOS
    // ======================================================

    const pontoAfetado =
        areaAfetada?.pontoAfetado ??
        ladoAfetado?.pac ??
        pacInterligacao ??
        null;

    const pontoReceptor =
        ladoReceptor?.pac ??
        ((possuiPACUnico || possuiPACDuplicado) ? pacInterligacao : null);

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
// DESCOBERTA E VALIDAÇÃO DOS CANDIDATOS DE RECOMPOSIÇÃO
// ==========================================================

export function descobrirCandidatosRecomposicao(ocorrencia, opcoes = {}) {
    const equipamentoDesarmeId = normalizarId(
        ocorrencia?.equipamentoDesarme ??
        ocorrencia?.equipamentoDesarmeId ??
        ocorrencia?.equipamento ??
        ""
    );
    const alimentadorOcorrencia = ocorrencia?.alimentador ?? opcoes?.alimentador ?? null;

    if (!equipamentoDesarmeId || !estadoRede.topologiaBDGD) return [];

    const equipamentoDesarme = buscarEquipamentoBDGD(equipamentoDesarmeId);
    if (!equipamentoDesarme) return [];

    const areaAfetada = identificarAreaAfetada(
        equipamentoDesarme,
        alimentadorOcorrencia
    );
    if (!areaAfetada?.sucesso) {
        console.warn("[Power Grid Monitor] Não foi possível delimitar a área afetada:", areaAfetada?.motivo);
        return [];
    }

    const brutos = listarCandidatosRecomposicao(ocorrencia);
    const resultado = [];

    for (const candidato of brutos) {
        const topologia = validarCandidatoTopologico(candidato, areaAfetada);
        if (!topologia?.valido) {
            console.info("[Power Grid Monitor] Candidato rejeitado pela topologia:", {
                equipamento: obterIdEquipamento(candidato),
                motivo: topologia?.motivo,
                comprovacao: topologia?.comprovacao ?? null,
            });
            continue;
        }

        const equipamentoId = obterIdEquipamento(candidato);
        if (!equipamentoId || !buscarEquipamentoBDGD(equipamentoId)) continue;

        const estadoCandidato = candidato?.__estadoCandidato ??
            candidatoInterligacaoEstaAberto(candidato, candidato?.__interligacaoBDGD);

        const caminhoSimulado = validarCaminhoSimulado(
            topologia.pontoAfetado,
            topologia.pontoReceptor,
            equipamentoId
        );

        resultado.push({
            ...candidato,
            id: equipamentoId,
            equipamentoId,
            plaqueta: obterPlaquetaEquipamento(candidato) || null,
            tipoEquipamento: classificarEquipamento(candidato),
            tipUnid: obterTIPUNID(candidato),
            interligacaoBDGD: topologia.interligacao,
            comprovacaoTopologica: topologia.comprovacao,
            topologiaValidada: true,
            alimentadorAfetado: areaAfetada.alimentadorAfetado ?? alimentadorOcorrencia,
            alimentadorReceptor: topologia.alimentadorReceptor,
            pontoAfetado: topologia.pontoAfetado,
            pontoReceptor: topologia.pontoReceptor,
            redeReceptor: topologia.redeReceptor,
            estado: estadoCandidato?.estado ?? null,
            estadoConhecido: estadoCandidato?.conhecido === true,
            estadoOrigem: estadoCandidato?.origem ?? "DESCONHECIDO",
            caminhoSimulado,
            caminhoEletrico: caminhoSimulado,
            caminhoComprovado: caminhoSimulado?.encontrado === true,
            motivoTopologia: caminhoSimulado?.encontrado === true
                ? null
                : (caminhoSimulado?.motivo || "O caminho elétrico não foi comprovado pela topologia BDGD."),
        });
    }

    console.log("[Power Grid Monitor] RESULTADO DA DESCOBERTA DE RECOMPOSIÇÃO:", {
        equipamentoDesarmeId,
        alimentadorOcorrencia,
        candidatosEncontrados: resultado.length,
        candidatosComCaminhoComprovado: resultado.filter(item => item.caminhoComprovado).length,
    });
    return resultado;
}

// ==========================================================
// CAPACIDADE / BITOLA DOS TRECHOS
// ==========================================================
//
// A capacidade deve ser obtida prioritariamente a partir
// da informação real da BDGD:
//
// 1. CMAX diretamente no trecho;
// 2. CMAX da SEGCON vinculada pelo TIP_CND;
// 3. campos de capacidade do trecho;
// 4. bitola real do trecho.
//
// IMPORTANTE:
//
// TIP_CND NÃO É A BITOLA.
//
// TIP_CND é o identificador do segmento de condutor,
// que pode ser resolvido em SEGCON.
//
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

function normalizarValorNumerico(
    valor
) {

    return numero(
        valor
    );
}

function obterTrechoParaCapacidade(
    trechoId
) {

    const id =
        normalizarId(
            trechoId
        );

    if (!id) {
        return null;
    }

    const topologia =
        estadoRede.topologiaBDGD;

    if (
        topologia
    ) {

        const trechoBDGD =
            buscarTrechoBDGD(topologia, id) ??
            buscarNaColecao(topologia?.trechos, id) ??
            buscarNaColecao(topologia?.listaTrechos, id) ??
            topologia?.trechos?.[id] ??
            topologia?.listaTrechos?.[id] ??
            null;

        if (
            trechoBDGD
        ) {

            return trechoBDGD;
        }
    }

    return (
        buscarTrecho(
            id
        ) ??
        null
    );
}

// ==========================================================
// LOCALIZAR SEGCON DO TRECHO
// ==========================================================

function obterSegmentoCondutorDoTrecho(
    trecho
) {

    if (
        !trecho
    ) {
        return null;
    }

    if (
        trecho?.segmentoCondutor &&
        typeof trecho.segmentoCondutor ===
            "object"
    ) {

        return trecho.segmentoCondutor;
    }

    const tipCnd =
        primeiro(
            trecho,
            [
                "segmentoCondutorId",
                "TIP_CND",
                "tipCnd",
                "condutor",
                "CONDUTOR"
            ]
        );

    if (
        tipCnd === null ||
        tipCnd === undefined ||
        String(tipCnd).trim() === ""
    ) {

        return null;
    }

    const id =
        normalizarId(
            tipCnd
        );

    const topologia =
        estadoRede.topologiaBDGD;

    if (
        !topologia
    ) {
        return null;
    }

    const segmentos =
        topologia?.segmentosCondutores;

    if (
        !segmentos
    ) {
        return null;
    }

    if (
        !Array.isArray(
            segmentos
        )
    ) {

        return (
            segmentos?.[id] ??
            Object.values(
                segmentos
            ).find(
                item => {

                    const codigo =
                        primeiro(
                            item,
                            [
                                "COD_ID",
                                "codId",
                                "id",
                                "TIP_CND"
                            ]
                        );

                    return (
                        normalizarId(
                            codigo
                        ) === id
                    );
                }
            ) ??
            null
        );
    }

    return segmentos.find(
        item => {

            const codigo =
                primeiro(
                    item,
                    [
                        "COD_ID",
                        "codId",
                        "id",
                        "TIP_CND"
                    ]
                );

            return (
                normalizarId(
                    codigo
                ) === id
            );
        }
    ) || null;
}

// ==========================================================
// CAPACIDADE POR BITOLA
// ==========================================================

function capacidadePorBitolaLocal(
    bitola
) {

    if (
        bitola === null ||
        bitola === undefined
    ) {
        return null;
    }

    const texto =
        String(
            bitola
        )
            .replace(
                /mm²|mm2/gi,
                ""
            )
            .trim();

    // Captura somente bitolas reconhecidas. O lookaround evita
    // converter separadores (por exemplo, "/240") em parte do número.
    const encontrados = [
        ...texto.matchAll(/\b(240|150|95|70|35)\b/g),
    ].map(match => Number(match[1]));

    if (encontrados.length > 0) {
        const capacidades = encontrados
            .map(valor => CAPACIDADES_BITOLA[String(valor)] ?? null)
            .filter(valor => Number.isFinite(valor) && valor > 0);

        if (capacidades.length > 0) {
            // Para uma indicação composta, adota-se o menor valor da
            // tabela como hipótese conservadora, nunca o maior.
            return Math.min(...capacidades);
        }
    }

    const valor =
        numero(
            texto
        );

    if (
        valor !== null
    ) {

        return (
            CAPACIDADES_BITOLA[
                String(
                    valor
                )
            ] ??
            null
        );
    }

    return null;
}

// ==========================================================
// DETALHAMENTO DA CAPACIDADE REAL DO TRECHO
// ==========================================================

export function obterDetalhesCapacidadeTrecho(
    trechoId
) {

    const trecho =
        obterTrechoParaCapacidade(
            trechoId
        );

    if (
        !trecho
    ) {

        return {

            conhecida:
                false,

            trecho:
                normalizarId(
                    trechoId
                ),

            motivo:
                "Trecho não encontrado no modelo/topologia BDGD.",

            capacidade:
                null,

            capacidadeNominal:
                null,

            capacidadeMaxima:
                null,

            bitolas:
                [],

            bitolasCodigoBDGD:
                [],

            condutor:
                null,

            origem:
                null,

        };
    }

    const segmentoCondutor =
        obterSegmentoCondutorDoTrecho(
            trecho
        );

    // ------------------------------------------------------
    // CNOM
    // ------------------------------------------------------

    const correnteNominalBruta = normalizarValorNumerico(
        primeiro(trecho, ["correnteNominalCondutor", "CNOM"]) ??
        primeiro(segmentoCondutor, ["correnteNominalCondutor", "CNOM"])
    );
    const correnteNominal = correnteNominalBruta !== null && correnteNominalBruta > 0
        ? correnteNominalBruta
        : null;

    // ------------------------------------------------------
    // CMAX
    // ------------------------------------------------------

    const correnteMaximaBruta = normalizarValorNumerico(
        primeiro(trecho, ["correnteMaximaCondutor", "CMAX"]) ??
        primeiro(segmentoCondutor, ["correnteMaximaCondutor", "CMAX"])
    );
    const correnteMaxima = correnteMaximaBruta !== null && correnteMaximaBruta > 0
        ? correnteMaximaBruta
        : null;

    // ------------------------------------------------------
    // CAPACIDADE EXPLÍCITA DO TRECHO
    // ------------------------------------------------------

    const capacidadeDiretaBruta = normalizarValorNumerico(
        primeiro(trecho, ["capacidade", "CAPACIDADE", "ampacidade", "AMPACIDADE", "capacidadeMaximaAmperes"])
    );
    const capacidadeDireta = capacidadeDiretaBruta !== null && capacidadeDiretaBruta > 0
        ? capacidadeDiretaBruta
        : null;

    // ------------------------------------------------------
    // BITOLAS DO TRECHO
    // ------------------------------------------------------

    const valoresBitola = [
        primeiro(trecho, ["bitola", "BITOLA", "bitolaCondutor", "BITOLA_CONDUTOR", "secao", "SECAO"]),
        primeiro(segmentoCondutor, ["BIT_FAS_1"]),
        primeiro(segmentoCondutor, ["BIT_FAS_2"]),
        primeiro(segmentoCondutor, ["BIT_FAS_3"]),
    ];

    const bitolasEncontradas = [];

    for (
        const valor of
        valoresBitola
    ) {

        if (
            valor === null ||
            valor === undefined
        ) {
            continue;
        }

        const texto =
            String(
                valor
            ).trim();

        if (!texto) {
            continue;
        }

        const matches =
            texto.match(
                /\b(?:240|150|95|70|35)\b/g
            );

        if (
            matches
        ) {

            bitolasEncontradas.push(
                ...matches
            );
        }
    }

    const bitolasUnicas =
        [
            ...new Set(
                bitolasEncontradas
            )
        ];

    // ------------------------------------------------------
    // CAPACIDADES DERIVADAS DAS BITOLAS
    // ------------------------------------------------------

    const capacidadesBitola =
        bitolasUnicas
            .map(
                bitola =>
                    CAPACIDADES_BITOLA[
                        String(
                            bitola
                        )
                    ] ??
                    null
            )
            .filter(
                capacidade =>
                    capacidade !== null &&
                    capacidade > 0
            );

    // ------------------------------------------------------
    // PRIORIDADE DA CAPACIDADE
    // ------------------------------------------------------
    //
    // CMAX da SEGCON / trecho representa a capacidade máxima
    // real informada pelo cadastro.
    //
    // Quando não existir CMAX, utiliza-se a capacidade
    // explícita ou derivada da bitola.
    //
    // Quando houver mais de uma bitola/fase, usamos a menor
    // capacidade encontrada, pois é o elemento limitante.
    //
    // ------------------------------------------------------

    const capacidadePorBitola =
        capacidadesBitola.length > 0
            ? Math.min(
                ...capacidadesBitola
            )
            : null;

    // Ordem de confiança:
    // 1. CMAX oficial do trecho/SEGCON;
    // 2. capacidade explícita cadastrada no próprio trecho;
    // 3. CNOM oficial do condutor;
    // 4. tabela estimada pela bitola, somente como último recurso.
    // Não deixar uma estimativa genérica sobrescrever um valor CNOM real.
    const capacidade =
        correnteMaxima ??
        capacidadeDireta ??
        correnteNominal ??
        capacidadePorBitola ??
        null;

    const origem =
        correnteMaxima !== null
            ? "SEGCON_CMAX"

            : capacidadeDireta !== null
                ? "CAPACIDADE_TRECHO"

                : correnteNominal !== null
                    ? "SEGCON_CNOM"

                    : capacidadePorBitola !== null
                        ? "BITOLA_TRECHO_ESTIMADA"

                        : null;

    const bitolasCodigoBDGD =
        [
            segmentoCondutor?.BIT_FAS_1,
            segmentoCondutor?.BIT_FAS_2,
            segmentoCondutor?.BIT_FAS_3,
        ]
            .filter(
                valor =>
                    valor !== null &&
                    valor !== undefined &&
                    String(
                        valor
                    ).trim() !== ""
            );

    const condutor =
        segmentoCondutor ??
        trecho?.condutor ??
        trecho?.CONDUTOR ??
        primeiro(trecho, ["TIP_CND", "tipCnd"]) ??
        null;

    return {

        conhecida:
            capacidade !== null &&
            capacidade > 0,

        trecho:
            normalizarId(

                trecho?.id ??
                trecho?.COD_ID ??
                trecho?.codId ??
                trechoId

            ),

        capacidade,

        capacidadeNominal:
            correnteNominal,

        capacidadeMaxima:
            correnteMaxima,

        capacidadeDireta,

        bitolas:
            bitolasUnicas,

        bitolasCodigoBDGD,

        correnteNominal,

        correnteMaxima,

        condutor,

        origem,

        capacidadeEstimativa: origem === "BITOLA_TRECHO_ESTIMADA",

        avisoCapacidade: origem === "BITOLA_TRECHO_ESTIMADA"
            ? "Capacidade estimada por tabela de bitola; confirmar material, construção, instalação e critério térmico antes de usar como limite operacional definitivo."
            : null,

        segmentoCondutor:
            segmentoCondutor
                ? {
                    ...segmentoCondutor
                }
                : null,

    };
}

// ==========================================================
// TRECHOS A MONTANTE DO RECEPTOR
// ==========================================================
//
// A corrente adicionada pela recomposição não permanece somente
// no trecho imediatamente próximo da interligação.
//
// Depois do fechamento da interligação, essa corrente passa a
// circular pelo alimentador receptor e atravessa a cadeia de
// trechos a montante até alcançar a fonte.
//
// Portanto, para verificar a capacidade da recomposição:
//
//    ponto receptor
//          ↓
//    trecho montante 1
//          ↓
//    ponto montante
//          ↓
//    trecho montante 2
//          ↓
//    ponto montante
//          ↓
//    ... até a origem.
//
// IMPORTANTE:
//
// Não usamos a rede conectada inteira aqui.
//
// A rede conectada pode conter derivações e ramais que não
// conduzem a corrente transferida até a fonte.
//
// Utilizamos exclusivamente a orientação elétrica:
//
//    ponto.trechoMontante
//    ponto.pontoMontante
//
// ==========================================================

function buscarRegistroMapaPorId(mapa, id) {
    if (!mapa || typeof mapa !== "object" || !id) return null;
    if (mapa[id] !== undefined) return mapa[id];
    const alvo = normalizarCodigo(id);
    for (const [chave, valor] of Object.entries(mapa)) {
        if (normalizarCodigo(chave) === alvo) return valor;
        const codigo = primeiro(valor, ["id", "ID", "COD_ID", "codId"]);
        if (codigo !== null && normalizarCodigo(codigo) === alvo) return valor;
    }
    return null;
}

function buscarRegistroOrientacaoPonto(mapa, id) {
    if (!mapa || typeof mapa !== "object" || !id) return null;
    if (mapa[id] !== undefined) return mapa[id];
    const alvo = normalizarCodigo(obterPac(id));
    for (const [chave, valor] of Object.entries(mapa)) {
        if (normalizarCodigo(obterPac(chave)) === alvo) return valor;
        const codigo = primeiro(valor, ["PAC", "pac", "PON_ID", "id", "ID", "COD_ID", "codId"]);
        if (codigo !== null && normalizarCodigo(obterPac(codigo)) === alvo) return valor;
    }
    return null;
}

// Compara alimentadores usando também o CTMT cadastrado na BDGD.
// Em muitos GeoJSON, o trecho contém apenas CTMT numérico (ex.: 153),
// enquanto a interligação usa o identificador operacional (ex.: CMG01C3).
function localizarRegistroAlimentador(valor) {
    const alvo = normalizarCodigo(valor);
    if (!alvo) return null;

    const topologia = estadoRede.topologiaBDGD;
    const colecao = [
        ...lista(estadoRede.alimentadores),
        ...lista(topologia?.alimentadores),
    ];

    return colecao.find(item => {
        if (!item || typeof item !== "object") return false;
        const identificadores = [
            item?.id, item?.codigo, item?.alimentador, item?.ALIMENTADOR,
            item?.CTMT, item?.ctmt, item?.circuito, item?.CIRCUITO,
            item?.COD_ID, item?.codId,
        ];
        return identificadores.some(id =>
            id !== null && id !== undefined && normalizarCodigo(id) === alvo
        );
    }) ?? null;
}

function mesmoAlimentadorBDGD(valorA, valorB) {
    const a = normalizarCodigo(valorA);
    const b = normalizarCodigo(valorB);
    if (!a || !b) return false;
    if (a === b) return true;

    const registroA = localizarRegistroAlimentador(valorA);
    const registroB = localizarRegistroAlimentador(valorB);
    if (!registroA || !registroB) return false;

    // Duas chaves (nome operacional e CTMT) que apontam para o mesmo
    // cadastro representam o mesmo alimentador.
    const chavePrincipal = registro => normalizarCodigo(
        primeiro(registro, [
            "alimentador", "ALIMENTADOR", "id", "codigo", "nome", "name", "COD_ID", "codId",
        ]) ?? ""
    );
    const chaveA = chavePrincipal(registroA);
    const chaveB = chavePrincipal(registroB);
    if (chaveA && chaveB && chaveA === chaveB) return true;

    // Alguns carregadores criam objetos equivalentes em coleções distintas.
    const ctmtA = normalizarCodigo(primeiro(registroA, ["CTMT", "ctmt"]));
    const ctmtB = normalizarCodigo(primeiro(registroB, ["CTMT", "ctmt"]));
    return Boolean(ctmtA && ctmtB && ctmtA === ctmtB);
}

function obterTrechosMontanteCandidato(
    candidato
) {

    const topologia =
        estadoRede.topologiaBDGD;

    const pontoReceptor =
        normalizarId(
            candidato?.pontoReceptor
        );

    const alimentadorReceptor =
        normalizarCodigo(
            candidato?.alimentadorReceptor
        );

    if (
        !topologia
    ) {

        return {

            conhecida:
                false,

            motivo:
                "Topologia BDGD não disponível para determinar os trechos a montante.",

            trechos:
                [],

        };
    }

    if (
        !pontoReceptor
    ) {

        return {

            conhecida:
                false,

            motivo:
                "Ponto receptor não identificado.",

            trechos:
                [],

        };
    }

    const orientacao =
        topologia?.orientacaoEletrica;

    if (
        !orientacao
    ) {

        return {

            conhecida:
                false,

            motivo:
                "A orientação elétrica da topologia BDGD não está disponível.",

            trechos:
                [],

        };
    }

    const pontosOrientados =
        orientacao?.pontos ?? {};

    const trechosOrientados =
        orientacao?.trechos ?? {};

    if (
        Object.keys(
            pontosOrientados
        ).length === 0
    ) {

        return {

            conhecida:
                false,

            motivo:
                "Nenhum ponto possui orientação elétrica disponível na BDGD.",

            trechos:
                [],

        };
    }

    const resultado = [];

    const visitadosPontos =
        new Set();

    const visitadosTrechos =
        new Set();

    let pontoAtual =
        pontoReceptor;

    while (
        pontoAtual
    ) {

        const chavePonto =
            normalizarId(
                pontoAtual
            );

        if (
            !chavePonto
        ) {
            break;
        }

        if (
            visitadosPontos.has(
                chavePonto
            )
        ) {

            return {

                conhecida:
                    false,

                motivo:
                    `Foi detectado ciclo na orientação a montante a partir do ponto ${chavePonto}.`,

                trechos:
                    resultado,

            };
        }

        visitadosPontos.add(
            chavePonto
        );

        const pontoOrientado = buscarRegistroOrientacaoPonto(
            pontosOrientados,
            chavePonto
        );

        if (
            !pontoOrientado
        ) {

            return {

                conhecida:
                    false,

                motivo:
                    `O ponto ${chavePonto} não possui orientação elétrica na BDGD.`,

                trechos:
                    resultado,

            };
        }

        const trechoMontanteId = normalizarId(
            primeiro(pontoOrientado, [
                "trechoMontante", "TRECHO_MONTANTE", "trechoMontanteId", "TRECHO_MONTANTE_ID",
            ])
        );

        let pontoMontanteId = normalizarId(
            primeiro(pontoOrientado, [
                "pontoMontante", "PONTO_MONTANTE", "pontoMontanteId", "PONTO_MONTANTE_ID",
            ])
        );

        // --------------------------------------------------
        // Chegamos à origem do alimentador.
        // --------------------------------------------------

        if (
            !trechoMontanteId
        ) {
            break;
        }

        if (
            visitadosTrechos.has(
                trechoMontanteId
            )
        ) {

            return {

                conhecida:
                    false,

                motivo:
                    `O trecho ${trechoMontanteId} foi encontrado novamente durante a navegação a montante.`,

                trechos:
                    resultado,

            };
        }

        visitadosTrechos.add(
            trechoMontanteId
        );

        let trecho =
            trechosOrientados?.[trechoMontanteId] ??
            buscarRegistroMapaPorId(trechosOrientados, trechoMontanteId) ??
            null;

        if (
            !trecho
        ) {

            trecho =
                buscarTrecho(
                    trechoMontanteId
                );
        }

        if (
            !trecho
        ) {

            return {

                conhecida:
                    false,

                motivo:
                    `O trecho a montante ${trechoMontanteId} não foi encontrado na BDGD.`,

                trechos:
                    resultado,

            };
        }

        if (!pontoMontanteId) {
            pontoMontanteId = normalizarId(primeiro(trecho, [
                "pontoMontante", "PONTO_MONTANTE", "pontoMontanteId", "PONTO_MONTANTE_ID",
            ]));
        }

        // --------------------------------------------------
        // Alimentador do trecho.
        // --------------------------------------------------

        const alimentadorTrecho =
            normalizarCodigo(

                primeiro(
                    trecho,
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

        // --------------------------------------------------
        // Não devemos contabilizar a capacidade de outro
        // alimentador como se fosse do alimentador receptor.
        // --------------------------------------------------

        if (
            alimentadorReceptor &&
            alimentadorTrecho &&
            !mesmoAlimentadorBDGD(
                alimentadorTrecho,
                candidato?.alimentadorReceptor
            )
        ) {

            return {

                conhecida:
                    false,

                motivo:
                    `A cadeia de trechos a montante saiu do alimentador receptor no trecho ${trechoMontanteId}. Alimentador esperado: ${candidato?.alimentadorReceptor ?? "não informado"}. Encontrado: ${primeiro(trecho, ["alimentador", "ALIMENTADOR", "CT_COD_OP", "CTMT", "ctmt", "circuito", "CIRCUITO"]) ?? "não informado"}.`,

                trechos:
                    resultado,

            };
        }

        // --------------------------------------------------
        // Preservar a orientação real.
        // --------------------------------------------------

        resultado.push({

            ...trecho,

            __trechoMontante:
                trechoMontanteId,

            __pontoJusante:
                chavePonto,

            __pontoMontante:
                pontoMontanteId ||
                trecho?.pontoMontante ||
                null,

            __sentido:
                "MONTANTE",

        });

        // --------------------------------------------------
        // Avança para o ponto imediatamente a montante.
        // A cadeia só pode terminar normalmente quando o ponto atual
        // não possui trechoMontante. Se há trecho, mas falta o ponto
        // seguinte, a orientação está incompleta e não pode ser aprovada.
        // --------------------------------------------------

        if (!pontoMontanteId) {
            return {
                conhecida: false,
                motivo: `A orientação do ponto ${chavePonto} informa o trecho a montante ${trechoMontanteId}, mas não informa o ponto montante de destino. O caminho não pode ser considerado completo.`,
                trechos: resultado,
            };
        }

        pontoAtual = pontoMontanteId;
    }

    if (
        resultado.length === 0
    ) {

        return {

            conhecida:
                false,

            motivo:
                "Nenhum trecho a montante foi identificado a partir do ponto receptor.",

            trechos:
                [],

        };
    }

    return {

        conhecida:
            true,

        pontoInicial:
            pontoReceptor,

        trechos:
            resultado,

        quantidadeTrechos:
            resultado.length,

    };
}

// ==========================================================
// VALIDAR CAPACIDADE DOS TRECHOS A MONTANTE
// ==========================================================
//
// A corrente projetada é comparada com cada trecho.
//
// Exemplo:
//
// corrente projetada = 180 A
//
// trecho 1 -> 240 mm² -> 500 A
// trecho 2 -> 150 mm² -> 300 A
// trecho 3 -> 95 mm²  -> 220 A
// trecho 4 -> 70 mm²  -> 150 A
//
// Limite operacional de 80%:
//
// trecho 1 -> 400 A -> OK
// trecho 2 -> 240 A -> OK
// trecho 3 -> 176 A -> BLOQUEADO
// trecho 4 -> 120 A -> BLOQUEADO
//
// Nesse caso a recomposição não é segura.
//
// O sistema deve informar o trecho limitante real.
//
// ==========================================================

function validarCapacidadeMontanteCandidato(
    candidato,
    correnteProjetada
) {

    const correnteConvertida = numero(correnteProjetada);
    const corrente = correnteConvertida !== null && correnteConvertida >= 0
        ? correnteConvertida
        : null;

    if (
        corrente === null
    ) {

        return {

            conhecida:
                false,

            permitido:
                false,

            motivo:
                "Corrente projetada não informada para validação dos trechos a montante.",

            trechos:
                [],

        };
    }

    const montante =
        obterTrechosMontanteCandidato(
            candidato
        );

    if (
        !montante?.conhecida
    ) {

        return {

            conhecida:
                false,

            permitido:
                false,

            motivo:
                montante?.motivo ||
                "Não foi possível determinar os trechos a montante.",

            trechos:
                [],

            detalheMontante:
                montante,

        };
    }

    const resultadoPorTrechos = [];

    for (
        const trecho of
        montante.trechos
    ) {

        const trechoId =
            normalizarId(

                trecho?.__trechoMontante ??

                trecho?.id ??

                trecho?.COD_ID ??

                trecho?.codId

            );

        if (
            !trechoId
        ) {
            continue;
        }

        const detalhes =
            obterDetalhesCapacidadeTrecho(
                trechoId
            );

        // --------------------------------------------------
        // Sem capacidade conhecida, não permitimos
        // transferência automática.
        // --------------------------------------------------

        if (
            !detalhes?.conhecida
        ) {

            const itemSemCapacidade = {

                trecho:
                    trechoId,

                alimentador:
                    primeiro(
                        trecho,
                        [
                            "alimentador",
                            "ALIMENTADOR",
                            "CT_COD_OP",
                            "CTMT",
                            "ctmt",
                            "circuito",
                            "CIRCUITO"
                        ]
                    ) ??
                    null,

                condutor:
                    detalhes?.condutor ??
                    null,

                bitolas:
                    detalhes?.bitolas ??
                    [],

                bitolasCodigoBDGD:
                    detalhes?.bitolasCodigoBDGD ??
                    [],

                capacidade:
                    null,

                limiteOperacional:
                    null,

                correnteSolicitada:
                    corrente,

                carregamento:
                    null,

                permitido:
                    false,

                origemCapacidade:
                    detalhes?.origem ??
                    null,

                motivo:
                    "Capacidade do trecho não determinada."

            };

            return {

                conhecida:
                    false,

                permitido:
                    false,

                motivo:
                    `A capacidade do trecho a montante ${trechoId} não pôde ser determinada pela BDGD/SEGCON/bitola.`,

                trechoLimitante:
                    itemSemCapacidade,

                trechos:
                    [
                        ...resultadoPorTrechos,
                        itemSemCapacidade
                    ],

                detalheMontante:
                    montante,

            };
        }

        const capacidade =
            numero(
                detalhes.capacidade
            );

        if (
            capacidade === null ||
            capacidade <= 0
        ) {

            const itemCapacidadeInvalida = {

                trecho:
                    trechoId,

                alimentador:
                    primeiro(
                        trecho,
                        [
                            "alimentador",
                            "ALIMENTADOR",
                            "CT_COD_OP",
                            "CTMT",
                            "ctmt",
                            "circuito",
                            "CIRCUITO"
                        ]
                    ) ??
                    null,

                capacidade:
                    null,

                limiteOperacional:
                    null,

                correnteSolicitada:
                    corrente,

                carregamento:
                    null,

                permitido:
                    false,

                origemCapacidade:
                    detalhes?.origem ??
                    null,

                motivo:
                    "Capacidade inválida."

            };

            return {

                conhecida:
                    false,

                permitido:
                    false,

                motivo:
                    `A capacidade determinada para o trecho a montante ${trechoId} é inválida.`,

                trechoLimitante:
                    itemCapacidadeInvalida,

                trechos:
                    [
                        ...resultadoPorTrechos,
                        itemCapacidadeInvalida
                    ],

                detalheMontante:
                    montante,

            };
        }

        const limiteOperacional =
            capacidade *
            0.8;

        const carregamento =
            (
                corrente /
                capacidade
            ) *
            100;

        const permitido =
            corrente <=
            limiteOperacional;

        const item = {

            trecho:
                trechoId,

            alimentador:
                primeiro(
                    trecho,
                    [
                        "alimentador",
                        "ALIMENTADOR",
                        "CT_COD_OP",
                        "CTMT",
                        "ctmt",
                        "circuito",
                        "CIRCUITO"
                    ]
                ) ??
                null,

            pontoMontante:
                trecho?.__pontoMontante ??
                trecho?.pontoMontante ??
                null,

            pontoJusante:
                trecho?.__pontoJusante ??
                trecho?.pontoJusante ??
                null,

            condutor:
                detalhes?.condutor ??
                null,

            segmentoCondutorId:
                trecho?.segmentoCondutorId ??
                trecho?.TIP_CND ??
                trecho?.propriedades?.TIP_CND ??
                null,

            bitolas:
                detalhes?.bitolas ??
                [],

            bitolasCodigoBDGD:
                detalhes?.bitolasCodigoBDGD ??
                [],

            correnteNominal:
                detalhes?.correnteNominal ??
                null,

            correnteMaxima:
                detalhes?.correnteMaxima ??
                null,

            capacidade:
                capacidade,

            capacidadeConfirmada:
                detalhes?.capacidadeEstimativa !== true,

            capacidadeEstimativa:
                detalhes?.capacidadeEstimativa === true,

            avisoCapacidade:
                detalhes?.avisoCapacidade ?? null,

            limiteOperacional:
                limiteOperacional,

            correnteSolicitada:
                corrente,

            carregamento:
                carregamento,

            permitido:
                permitido,

            origemCapacidade:
                detalhes?.origem ??
                null,

            motivo:
                permitido
                    ? null
                    : `Corrente projetada de ${corrente} A supera o limite operacional de ${limiteOperacional} A.`,

        };

        resultadoPorTrechos.push(
            item
        );

        // --------------------------------------------------
        // Não interrompemos imediatamente.
        //
        // Todos os trechos são analisados para que o
        // controlador consiga identificar exatamente quais
        // pontos ficaram sobrecarregados.
        // --------------------------------------------------
    }

    if (
        resultadoPorTrechos.length === 0
    ) {

        return {

            conhecida:
                false,

            permitido:
                false,

            motivo:
                "Os trechos a montante foram identificados, porém nenhum trecho pôde ser validado.",

            trechos:
                [],

            detalheMontante:
                montante,

        };
    }

    const trechosBloqueados =
        resultadoPorTrechos.filter(
            item => item.permitido === false
        );

    const capacidadesConfirmadas = resultadoPorTrechos.every(
        item => item.capacidadeConfirmada === true
    );

    // ------------------------------------------------------
    // Trecho limitante:
    //
    // o trecho com menor capacidade entre todos os trechos
    // efetivamente percorridos pela corrente transferida.
    // ------------------------------------------------------

    const trechoLimitante =
        resultadoPorTrechos.reduce(
            (
                menor,
                item
            ) => {

                if (
                    !menor
                ) {
                    return item;
                }

                const capacidadeMenor =
                    numero(
                        menor.capacidade
                    );

                const capacidadeAtual =
                    numero(
                        item.capacidade
                    );

                if (
                    capacidadeAtual ===
                    null
                ) {
                    return menor;
                }

                if (
                    capacidadeMenor ===
                    null
                ) {
                    return item;
                }

                return (
                    capacidadeAtual <
                    capacidadeMenor
                )
                    ? item
                    : menor;
            },
            null
        );

    if (
        trechosBloqueados.length > 0
    ) {

        const primeiroBloqueado =
            trechosBloqueados[0];

        return {

            conhecida:
                true,

            confirmada:
                capacidadesConfirmadas,

            permitido:
                false,

            motivo:
                `A corrente projetada de ${corrente} A não pode ser transferida com segurança. O trecho ${primeiroBloqueado.trecho} possui capacidade de ${primeiroBloqueado.capacidade} A e limite operacional de ${primeiroBloqueado.limiteOperacional} A.`,

            trechoLimitante:
                trechoLimitante,

            trechosBloqueados:

                trechosBloqueados,

            trechos:
                resultadoPorTrechos,

            quantidadeTrechos:
                resultadoPorTrechos.length,

            quantidadeTrechosBloqueados:
                trechosBloqueados.length,

            detalheMontante:
                montante,

        };
    }

    return {

        conhecida:
            true,

        confirmada:
            capacidadesConfirmadas,

        permitido:
            true,

        motivo:
            trechoLimitante
                ? `Todos os ${resultadoPorTrechos.length} trechos a montante suportam a corrente projetada. O trecho de menor capacidade é ${trechoLimitante.trecho}, com ${trechoLimitante.capacidade} A de capacidade e ${trechoLimitante.carregamento.toFixed(1)}% de carregamento.`
                : "Todos os trechos a montante suportam a corrente projetada.",

        trechoLimitante:
            trechoLimitante,

        trechosBloqueados:
            [],

        trechos:
            resultadoPorTrechos,

        quantidadeTrechos:
            resultadoPorTrechos.length,

        quantidadeTrechosBloqueados:
            0,

        detalheMontante:
            montante,

    };
}

// ==========================================================
// VALIDAR CAPACIDADE DO CANDIDATO
// ==========================================================
//
// Regra da corrente projetada:
//
//     corrente atual do alimentador receptor
//                 +
//     corrente transferida da área afetada
//
// Quando a corrente transferida não estiver informada,
// NÃO inventamos um valor.
//
// Nesse caso a análise utiliza somente a corrente conhecida
// do receptor e permanece condicionada quanto à parcela
// transferida.
//
// ==========================================================

function validarCapacidadeCandidato(
    candidato,
    correnteDestino,
    correnteDesligado
) {

    const correnteBaseConvertida = numero(correnteDestino);
    const correnteTransferidaConvertida = numero(correnteDesligado);

    const correnteBaseDestino = correnteBaseConvertida !== null && correnteBaseConvertida >= 0
        ? correnteBaseConvertida
        : null;

    const correnteTransferida = correnteTransferidaConvertida !== null && correnteTransferidaConvertida >= 0
        ? correnteTransferidaConvertida
        : null;

    // ------------------------------------------------------
    // Sem corrente do receptor:
    // não existe base para validar a carga.
    // ------------------------------------------------------

    if (
        correnteBaseDestino ===
        null
    ) {

        return {

            conhecida:
                false,

            permitido:
                false,

            correnteBaseDestino:
                null,

            correnteTransferida:
                correnteTransferida,

            correnteProjetada:
                null,

            carregamento:
                null,

            capacidade:
                null,

            limiteOperacional:
                null,

            trechoLimitante:
                null,

            trechos:
                [],

            motivo:
                "Corrente atual do trecho/alimentador receptor não informada.",

        };
    }

    // ------------------------------------------------------
    // Caso exista a corrente transferida, somamos as duas.
    //
    // Caso ela não exista, não colocamos 0 artificialmente.
    // Usamos somente a corrente conhecida do receptor.
    // ------------------------------------------------------

    const correnteProjetada = correnteTransferida !== null
        ? correnteBaseDestino + correnteTransferida
        : correnteBaseDestino;

    const validacaoMontante = validarCapacidadeMontanteCandidato(
        candidato,
        correnteProjetada
    );

    const transferenciaConhecida = correnteTransferida !== null;
    const cargaBaseJaInsegura = validacaoMontante?.conhecida === true &&
        validacaoMontante?.permitido === false;

    return {
        // Sem corrente transferida não existe validação positiva da carga
        // total. Uma sobrecarga já presente na corrente-base, porém, é
        // suficiente para bloquear a recomposição.
        conhecida: cargaBaseJaInsegura || (transferenciaConhecida && validacaoMontante?.conhecida === true),
        confirmada: validacaoMontante?.confirmada === true,
        permitido: cargaBaseJaInsegura
            ? false
            : (!transferenciaConhecida
                ? null
                : (validacaoMontante?.permitido === false
                    ? false
                    : (validacaoMontante?.conhecida === true && validacaoMontante?.confirmada === true
                        ? true
                        : null))),

        correnteBaseDestino,

        correnteTransferida,

        correnteProjetada,

        carregamento:
            validacaoMontante
                ?.trechoLimitante
                ?.carregamento ??
            null,

        capacidade:
            validacaoMontante
                ?.trechoLimitante
                ?.capacidade ??
            null,

        limiteOperacional:
            validacaoMontante
                ?.trechoLimitante
                ?.limiteOperacional ??
            null,

        trechoLimitante:
            validacaoMontante
                ?.trechoLimitante ??
            null,

        trechos:
            validacaoMontante
                ?.trechos ??
            [],

        trechosBloqueados:
            validacaoMontante
                ?.trechosBloqueados ??
            [],

        quantidadeTrechos:
            validacaoMontante
                ?.quantidadeTrechos ??
            0,

        quantidadeTrechosBloqueados:
            validacaoMontante
                ?.quantidadeTrechosBloqueados ??
            0,

        detalheMontante:
            validacaoMontante
                ?.detalheMontante ??
            null,

        motivo: !transferenciaConhecida && !cargaBaseJaInsegura
            ? "Corrente transferida da área afetada não informada; a análise de capacidade permanece condicionada."
            : (validacaoMontante?.confirmada === false && validacaoMontante?.permitido === true
                ? "A triagem de corrente está dentro das capacidades estimadas por bitola, mas a manobra permanece condicionada até confirmar a ampacidade técnica dos condutores na BDGD/SEGCON."
                : (validacaoMontante?.motivo ?? null)),

    };
}

// ==========================================================
// ANÁLISE DE RECOMPOSIÇÃO DA OCORRÊNCIA
// ==========================================================
//
// Fluxo:
//
// 1. Validar equipamento do desarme na BDGD.
// 2. Ler as correntes informadas pelo controlador.
// 3. Descobrir os candidatos reais de recomposição.
// 4. Validar a topologia de cada candidato.
// 5. Simular o caminho elétrico.
// 6. Validar TODOS os trechos a montante do receptor.
// 7. Classificar:
//
//      VIAVEL
//      BLOQUEADA
//      CONDICIONADA
//
// A capacidade não é mais determinada somente pelo trecho
// imediatamente associado ao caminho da transferência.
//
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

    // ------------------------------------------------------
    // Equipamento de desarme obrigatório.
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // Confirmar que o equipamento existe realmente na BDGD.
    // ------------------------------------------------------

    const validacaoEquipamento =
        validarEquipamentoBDGD(

            equipamentoDesarmeId,

            ocorrencia?.alimentador

        );

    if (
        !validacaoEquipamento?.valido
    ) {

        return {

            sucesso:
                false,

            status:
                "EQUIPAMENTO_DESARME_INVALIDO",

            validacao:
                validacaoEquipamento,

            candidatos:
                [],

            recomendacao:
                null,

            motivo:
                validacaoEquipamento?.motivo ??

                "Equipamento do desarme não validado na BDGD.",

        };
    }

    // ------------------------------------------------------
    // Corrente do trecho/alimentador receptor.
    //
    // Mantemos os nomes que já existem na interface.
    // ------------------------------------------------------

    const correnteDesligadoBruta = numero(
        opcoes?.correnteDesligado ??
        ocorrencia?.correnteTrechoOcorrencia ??
        ocorrencia?.manobra?.correnteDesligado ??
        null
    );
    const correnteDestinoBruta = numero(
        opcoes?.correnteDestino ??
        ocorrencia?.correnteTrechoRecuperacao ??
        ocorrencia?.manobra?.correnteDestino ??
        null
    );

    const correnteDesligado = correnteDesligadoBruta !== null && correnteDesligadoBruta >= 0
        ? correnteDesligadoBruta
        : null;
    const correnteDestino = correnteDestinoBruta !== null && correnteDestinoBruta >= 0
        ? correnteDestinoBruta
        : null;

    // ------------------------------------------------------
    // Descoberta dos candidatos.
    // ------------------------------------------------------

    const candidatosBrutos =
        descobrirCandidatosRecomposicao(

            ocorrencia,

            {
                correnteDesligado,

                correnteDestino,

            }

        );

    // ------------------------------------------------------
    // Cada candidato passa agora pela validação completa
    // dos trechos a montante.
    // ------------------------------------------------------

    const candidatos =
        candidatosBrutos.map(
            (
                candidato
            ) => {

                const capacidade =
                    validarCapacidadeCandidato(

                        candidato,

                        correnteDestino,

                        correnteDesligado

                    );

                const permitidoCarga = capacidade?.conhecida === true
                    ? (capacidade?.permitido === true
                        ? true
                        : (capacidade?.permitido === false ? false : null))
                    : null;

                // --------------------------------------------------
                // O estado operacional continua sendo obrigatório.
                // --------------------------------------------------

                const estadoAberto =
                    candidato?.estadoConhecido === true &&
                    candidato?.estado === "ABERTO";

                const caminhoComprovado =
                    candidato?.caminhoSimulado?.encontrado === true ||
                    candidato?.caminhoComprovado === true;

                let permitido =
                    null;

                // --------------------------------------------------
                // VIÁVEL
                //
                // Somente quando:
                //
                // - estado conhecido;
                // - equipamento ABERTO;
                // - capacidade conhecida;
                // - todos os trechos suportam a corrente.
                // --------------------------------------------------

                if (
                    estadoAberto &&
                    permitidoCarga === true &&
                    caminhoComprovado
                ) {

                    permitido =
                        true;
                }

                // --------------------------------------------------
                // BLOQUEADA
                //
                // Pode ocorrer por:
                //
                // - equipamento fechado;
                // - equipamento indisponível;
                // - bypass;
                // - sobrecarga;
                // - capacidade conhecida incompatível.
                //
                // Observação:
                // o estado desconhecido não é transformado em
                // bloqueio definitivo somente por ausência de
                // informação.
                // --------------------------------------------------

                else if (
                    candidato?.estadoConhecido === true &&

                    candidato?.estado !==
                        "ABERTO"
                ) {

                    permitido =
                        false;
                }

                else if (
                    permitidoCarga === false
                ) {

                    permitido =
                        false;
                }

                // --------------------------------------------------
                // CONDICIONADA
                //
                // Quando ainda não foi possível confirmar algum
                // requisito da análise.
                // --------------------------------------------------

                else {

                    permitido =
                        null;
                }

                let status =
                    "CONDICIONADA";

                if (
                    permitido ===
                    true
                ) {

                    status =
                        "VIAVEL";

                } else if (
                    permitido ===
                    false
                ) {

                    status =
                        "BLOQUEADA";
                }

                return {

                    ...candidato,

                    // ----------------------------------------------
                    // Correntes utilizadas na análise
                    // ----------------------------------------------

                    correnteDesligado:

                        correnteDesligado,

                    correnteDestino:

                        correnteDestino,

                    correnteBaseDestino:

                        capacidade?.correnteBaseDestino ??
                        null,

                    correnteTransferida:

                        capacidade?.correnteTransferida ??
                        null,

                    correnteProjetada:

                        capacidade?.correnteProjetada ??
                        null,

                    // ----------------------------------------------
                    // Resultado global da capacidade
                    // ----------------------------------------------

                    carregamento:

                        capacidade?.carregamento ??
                        null,

                    capacidade:

                        capacidade?.capacidade ??
                        null,

                    limiteOperacional:

                        capacidade?.limiteOperacional ??
                        null,

                    trechoLimitante:

                        capacidade?.trechoLimitante ??
                        null,

                    // ----------------------------------------------
                    // Detalhamento de TODOS os trechos a montante
                    // ----------------------------------------------

                    trechosCapacidade:

                        capacidade?.trechos ??
                        [],

                    trechosBloqueados:

                        capacidade?.trechosBloqueados ??
                        [],

                    quantidadeTrechos:

                        capacidade?.quantidadeTrechos ??
                        0,

                    quantidadeTrechosBloqueados:

                        capacidade?.quantidadeTrechosBloqueados ??
                        0,

                    detalheMontante:

                        capacidade?.detalheMontante ??
                        null,

                    validacaoCarga:
                        capacidade,

                    caminhoComprovado,

                    motivoCondicao: !caminhoComprovado
                        ? (candidato?.motivoTopologia || "Caminho elétrico não comprovado.")
                        : (capacidade?.motivo || null),

                    motivo: permitido === true
                        ? (candidato?.motivo ?? null)
                        : (candidato?.motivo || (!caminhoComprovado
                            ? (candidato?.motivoTopologia || "Caminho elétrico não comprovado.")
                            : (capacidade?.motivo || "A alternativa ainda não teve todos os requisitos técnicos confirmados."))),

                    capacidadeConfirmada: capacidade?.confirmada === true,

                    permitido,

                    status,

                };
            }
        );

    // ======================================================
    // ORDENAR CANDIDATOS
    // ======================================================
    //
    // A ordenação não cria preferência elétrica artificial.
    //
    // Primeiro:
    //   VIÁVEL
    //
    // Depois:
    //   CONDICIONADA
    //
    // Depois:
    //   BLOQUEADA
    //
    // Dentro do mesmo grupo utilizamos as informações
    // topológicas já calculadas.
    // ======================================================

    const pesoStatus = {

        VIAVEL:
            0,

        CONDICIONADA:
            1,

        BLOQUEADA:
            2,

    };

    candidatos.sort(
        (
            a,
            b
        ) => {

            const pesoA =
                pesoStatus[
                    a?.status
                ] ??
                99;

            const pesoB =
                pesoStatus[
                    b?.status
                ] ??
                99;

            if (
                pesoA !==
                pesoB
            ) {

                return (
                    pesoA -
                    pesoB
                );
            }

            // ----------------------------------------------
            // Entre candidatos com a mesma classificação,
            // preferimos o que possuir caminho simulado menor,
            // quando essa informação estiver disponível.
            // ----------------------------------------------

            const distanciaA =
                numero(

                    a?.caminhoSimulado
                        ?.quantidadeTrechos ??

                    a?.caminhoSimulado
                        ?.trechos
                        ?.length ??

                    a?.caminhoEletrico
                        ?.trechos
                        ?.length

                );

            const distanciaB =
                numero(

                    b?.caminhoSimulado
                        ?.quantidadeTrechos ??

                    b?.caminhoSimulado
                        ?.trechos
                        ?.length ??

                    b?.caminhoEletrico
                        ?.trechos
                        ?.length

                );

            if (
                distanciaA !== null &&
                distanciaB !== null &&
                distanciaA !== distanciaB
            ) {

                return (
                    distanciaA -
                    distanciaB
                );
            }

            return 0;
        }
    );

    // ======================================================
    // MELHOR ALTERNATIVA
    // ======================================================

    const melhorAlternativa =
        candidatos.find(

            candidato =>
                candidato?.permitido ===
                true

        ) ??
        null;

    // ======================================================
    // QUANTIDADES PARA O DIAGNÓSTICO
    // ======================================================

    const quantidadeViaveis =
        candidatos.filter(
            candidato =>
                candidato?.status ===
                "VIAVEL"
        ).length;

    const quantidadeCondicionadas =
        candidatos.filter(
            candidato =>
                candidato?.status ===
                "CONDICIONADA"
        ).length;

    const quantidadeBloqueadas =
        candidatos.filter(
            candidato =>
                candidato?.status ===
                "BLOQUEADA"
        ).length;

    // ======================================================
    // MOTIVO GERAL
    // ======================================================

    let motivo = "";

    if (
        melhorAlternativa
    ) {

        motivo =
            "Foi encontrada uma alternativa de recomposição com equipamento aberto e capacidade dos trechos a montante compatível com a corrente projetada.";

    }

    else if (
        quantidadeCondicionadas >
        0
    ) {

        motivo =
            "Existem alternativas de recomposição, porém pelo menos um requisito operacional ou de capacidade ainda não pôde ser confirmado.";

    }

    else if (
        quantidadeBloqueadas >
        0
    ) {

        motivo =
            "As alternativas encontradas não atendem aos requisitos operacionais ou de capacidade.";

    }

    else {

        motivo =
            "Nenhuma alternativa de recomposição foi encontrada.";
    }

    // ======================================================
    // RETORNO FINAL
    // ======================================================

    return {

        sucesso:
            true,

        status:
            melhorAlternativa

                ? "RECOMPOSICAO_DISPONIVEL"

                : candidatos.length > 0

                    ? "RECOMPOSICAO_CONDICIONADA"

                    : "SEM_CANDIDATOS",

        equipamentoDesarme:
            equipamentoDesarmeId,

        equipamentoBDGD:
            validacaoEquipamento?.equipamento ??
            validacaoEquipamento?.registro ??
            validacaoEquipamento ??
            null,

        alimentador:
            ocorrencia?.alimentador ??
            validacaoEquipamento?.alimentador ??
            null,

        tipoEquipamento:
            validacaoEquipamento?.tipo ??
            validacaoEquipamento?.tipoEquipamento ??
            null,

        tipUnid:
            validacaoEquipamento?.tipUnid ??
            validacaoEquipamento?.TIP_UNID ??
            null,

        correnteDesligado,

        correnteDestino,

        candidatos,

        quantidadeCandidatos:
            candidatos.length,

        quantidadeViaveis,

        quantidadeCondicionadas,

        quantidadeBloqueadas,

        recomendacao:
            melhorAlternativa,

        motivo,

    };
}

// ==========================================================
// OPERAÇÕES E ANÁLISES COMPLEMENTARES (SIMULAÇÃO LOCAL)
// ==========================================================

function registrarEstadoAlimentador(alimentador, energizado, opcoes = {}) {
    const id = normalizarId(alimentador);
    if (!id) return { sucesso: false, mensagem: "Alimentador não informado." };

    const cadastrado = buscarAlimentador(id) || lista(estadoRede.topologiaBDGD?.alimentadores).some(item => {
        const valor = typeof item === "object" ? primeiro(item, ["id", "codigo", "alimentador", "CTMT", "ctmt"]) : item;
        return normalizarCodigo(valor) === normalizarCodigo(id);
    });
    if (!cadastrado) return { sucesso: false, mensagem: `Alimentador ${id} não encontrado no cadastro/topologia carregada.` };

    if (!estadoRede.operacao.alimentadoresDesenergizados) estadoRede.operacao.alimentadoresDesenergizados = {};
    const chave = normalizarCodigo(id);
    const registro = {
        alimentador: id,
        energizado: Boolean(energizado),
        estadoAnterior: estadoRede.operacao.alimentadoresDesenergizados[chave] ? "DESENERGIZADO" : "ENERGIZADO_DESCONHECIDO",
        origem: opcoes?.origem ?? "SIMULACAO_LOCAL",
        observacao: opcoes?.observacao ?? null,
        atualizadoEm: new Date(),
    };
    if (energizado) delete estadoRede.operacao.alimentadoresDesenergizados[chave];
    else estadoRede.operacao.alimentadoresDesenergizados[chave] = registro;

    estadoRede.operacao.historico.push({ data: new Date(), acao: energizado ? "ENERGIZAR_ALIMENTADOR_SIMULADO" : "DESENERGIZAR_ALIMENTADOR_SIMULADO", dados: registro });
    estadoRede.operacao.ultimaAtualizacao = new Date();
    return { sucesso: true, ...registro, mensagem: energizado ? "Estado simulado do alimentador atualizado para energizado." : "Estado simulado do alimentador atualizado para desenergizado." };
}

export function desenergizarAlimentador(alimentador, opcoes = {}) {
    return registrarEstadoAlimentador(alimentador, false, opcoes);
}

export function energizarAlimentador(alimentador, opcoes = {}) {
    return registrarEstadoAlimentador(alimentador, true, opcoes);
}

export function analisarTransferencia(ocorrencia, opcoes = {}) {
    return { ...analisarRecomposicaoOcorrencia(ocorrencia, opcoes), tipoAnalise: "TRANSFERENCIA" };
}

export function analisarNormalizacao(ocorrencia, opcoes = {}) {
    const resultado = analisarRecomposicaoOcorrencia(ocorrencia, opcoes);
    return {
        ...resultado,
        tipoAnalise: "NORMALIZACAO",
        observacao: "Análise de alternativas de recomposição; nenhuma manobra física é executada por esta função.",
    };
}

export function analisarManobraOperacional(equipamentoOuId, acao, opcoes = {}) {
    const equipamentoId = typeof equipamentoOuId === "object"
        ? obterIdEquipamento(equipamentoOuId)
        : normalizarId(equipamentoOuId);
    const comando = normalizarTexto(acao);
    if (!equipamentoId) return { sucesso: false, permitido: false, status: "EQUIPAMENTO_NAO_INFORMADO", motivo: "Equipamento não informado." };
    if (!["ABRIR", "FECHAR"].includes(comando)) return { sucesso: false, permitido: false, status: "ACAO_INVALIDA", motivo: "Ação deve ser ABRIR ou FECHAR." };

    const validacao = validarEquipamentoBDGD(equipamentoId, opcoes?.alimentador ?? null);
    if (!validacao.valido) return { sucesso: false, permitido: false, status: "EQUIPAMENTO_NAO_VALIDADO_BDGD", validacao, motivo: validacao.motivo };

    const estado = consultarEstadoEquipamento(equipamentoId);
    if (estado?.estado === "INDISPONIVEL" || estado?.estado === "BYPASSADO") {
        return { sucesso: true, permitido: false, status: "BLOQUEADA", equipamentoId, acao: comando, estado, motivo: "Equipamento indisponível ou em bypass." };
    }
    if (!ESTADOS_VALIDOS.includes(estado?.estado)) {
        return { sucesso: true, permitido: null, status: "CONDICIONADA", equipamentoId, acao: comando, estado, motivo: "Estado físico desconhecido; confirmar a posição do equipamento antes de autorizar a manobra." };
    }
    const estadoDesejado = comando === "ABRIR" ? "ABERTO" : "FECHADO";
    return {
        sucesso: true,
        permitido: true,
        status: estado.estado === estadoDesejado ? "JA_NO_ESTADO_DESEJADO" : "VALIDADA_PARA_SIMULACAO",
        equipamentoId,
        acao: comando,
        estadoAtual: estado,
        estadoProjetado: estadoDesejado,
        motivo: "Validação local concluída. Esta função apenas analisa; não envia comando a equipamento físico.",
    };
}

export function analisarImpactoManobra(equipamentoOuId, acao, opcoes = {}) {
    const equipamentoId = typeof equipamentoOuId === "object"
        ? obterIdEquipamento(equipamentoOuId)
        : normalizarId(equipamentoOuId);
    const comando = normalizarTexto(acao);
    const equipamento = buscarEquipamentoBDGD(equipamentoId);
    if (!equipamento) return { sucesso: false, status: "EQUIPAMENTO_NAO_ENCONTRADO", equipamentoId, motivo: "Equipamento não localizado na BDGD carregada." };
    if (!["ABRIR", "FECHAR"].includes(comando)) return { sucesso: false, status: "ACAO_INVALIDA", equipamentoId, motivo: "Ação deve ser ABRIR ou FECHAR." };

    const pacs = obterPacsEquipamento(equipamento);
    const estadoAtual = consultarEstadoEquipamento(equipamentoId);
    const estadosProjetados = { ...obterMapaEstadosEquipamentos() };
    estadosProjetados[obterChaveEstadoEquipamento(equipamentoId)] = {
        equipamentoId,
        estado: comando === "ABRIR" ? "ABERTO" : "FECHADO",
        origem: "SIMULACAO_IMPACTO",
    };

    const redesAntes = pacs.map(pac => ({ ponto: pac, rede: buscarRedeConectada(pac, { respeitarEstadoOperacional: true }) }));
    const redesProjetadas = pacs.map(pac => ({ ponto: pac, rede: buscarRedeConectada(pac, { ...opcoes, estadosEquipamentos: estadosProjetados, respeitarEstadoOperacional: true }) }));
    return {
        sucesso: true,
        equipamentoId,
        acao: comando,
        estadoAtual,
        estadoProjetado: comando === "ABRIR" ? "ABERTO" : "FECHADO",
        pacs,
        redesAntes,
        redesProjetadas,
        condicionado: !ESTADOS_VALIDOS.includes(estadoAtual?.estado),
        observacao: "Impacto topológico simulado localmente; não representa telemetria nem execução física.",
    };
}

export function resumoRede() {
    const topo = estadoRede.topologiaBDGD;
    return {
        subestacoes: estadoRede.subestacoes.length,
        alimentadores: estadoRede.alimentadores.length || lista(topo?.alimentadores).length,
        trechos: estadoRede.trechos.length || lista(topo?.trechos).length,
        equipamentos: estadoRede.equipamentos.length || lista(topo?.equipamentosOperacionais ?? topo?.equipamentos).length,
        pontosBDGD: lista(topo?.pontos).length,
        trechosBDGD: lista(topo?.trechos).length,
        equipamentosBDGD: lista(topo?.equipamentosOperacionais).length || lista(topo?.equipamentos).length,
        interligacoesBDGD: lista(topo?.interligacoes).length,
        topologiaDisponivel: Boolean(topo),
        ultimaAtualizacao: estadoRede.operacao.ultimaAtualizacao,
    };
}

// ==========================================================
// OBJETO MODELO
// ==========================================================
//
// API pública do modelo de rede.
//
// As funções novas de validação de bitola e dos trechos a
// montante permanecem internas ao motor de recomposição.
//
// A tela continua consumindo:
//
//     analisarRecomposicaoOcorrencia()
//
// Dessa forma evitamos alterar desnecessariamente os imports
// existentes do sistema.
//
// ==========================================================

export const modeloRede = {

    // ------------------------------------------------------
    // REDE
    // ------------------------------------------------------

    getRede,

    getSubestacoes,

    getAlimentadores,

    getTrechos,

    getEquipamentos,

    obterIdentificadoresEquipamento,


    // ------------------------------------------------------
    // TOPOLOGIA BDGD
    // ------------------------------------------------------

    registrarTopologiaBDGD,

    limparTopologiaBDGD,

    getTopologiaBDGD,

    possuiTopologiaBDGD,


    // ------------------------------------------------------
    // VALIDAÇÃO BDGD
    // ------------------------------------------------------

    validarEquipamentoBDGD,


    // ------------------------------------------------------
    // BUSCAS
    // ------------------------------------------------------

    buscarSubestacao,

    buscarAlimentador,

    buscarTrecho,

    buscarEquipamento,

    buscarEquipamentoRede,

    buscarPontoRede,

    buscarTrechoRede,

    buscarConexoesRede,

    buscarTrechosAlimentador,

    buscarEquipamentosAlimentador,

    buscarEquipamentosTelecomandados,


    // ------------------------------------------------------
    // INTERLIGAÇÕES
    // ------------------------------------------------------

    buscarInterligacoes,

    buscarInterligacoesAlimentador,

    buscarCaminhoAlimentadores,

    possuiInterligacao,


    // ------------------------------------------------------
    // ESTADO OPERACIONAL
    // ------------------------------------------------------

    normalizarEstadoEquipamento,

    consultarEstadoEquipamento,

    listarEstadosEquipamentos,

    atualizarEstadoEquipamento,

    obterMapaEstadosEquipamentos,

    equipamentoEstaAberto,

    equipamentoEstaFechado,

    equipamentoEstaDisponivel,

    executarManobraEquipamento,

    desligarEquipamento,

    ligarEquipamento,


    // ------------------------------------------------------
    // CORRENTES
    // ------------------------------------------------------

    atualizarCorrenteAlimentador,

    consultarCorrenteAlimentador,

    obterCorrenteAlimentador,

    atualizarCorrenteTrecho,

    consultarCorrenteTrecho,

    obterCorrenteTrecho,


    // ------------------------------------------------------
    // ENERGIZAÇÃO
    // ------------------------------------------------------

    desenergizarAlimentador,

    energizarAlimentador,


    // ------------------------------------------------------
    // CAPACIDADE
    // ------------------------------------------------------

    capacidadePorBitola,

    calcularCapacidadeTrecho,

    validarCargaTrecho,


    // ------------------------------------------------------
    // ANÁLISES EXISTENTES
    // ------------------------------------------------------

    analisarNormalizacao,

    analisarTransferencia,

    analisarManobraOperacional,

    analisarImpactoManobra,


    // ------------------------------------------------------
    // ESTADO OPERACIONAL / RESTAURAÇÃO
    // ------------------------------------------------------

    consultarEstadoOperacional,

    resetarEstadosEquipamentos,

    restaurarEstadoInicial,


    // ------------------------------------------------------
    // RESUMO
    // ------------------------------------------------------

    resumoRede,


    // ------------------------------------------------------
    // NAVEGAÇÃO
    // ------------------------------------------------------

    buscarMontante,

    buscarJusante,

    buscarCaminhoEletrico,

    buscarRedeConectada,


    // ------------------------------------------------------
    // PQT / TRANSFORMADORES
    // ------------------------------------------------------

    buscarPQTDoPontoRede,

    buscarTransformadoresDoPontoRede,


    // ------------------------------------------------------
    // FILTROS
    // ------------------------------------------------------

    filtrarRedePorAlimentador,


    // ------------------------------------------------------
    // FICHAS OPERACIONAIS
    // ------------------------------------------------------

    obterFichaOperacional,

    obterFichaCompletaEquipamento,


    // ------------------------------------------------------
    // RECOMPOSIÇÃO
    // ------------------------------------------------------

    descobrirCandidatosRecomposicao,

    analisarRecomposicaoOcorrencia

};


// ==========================================================
// EXPORTAÇÃO DO ESTADO
// ==========================================================

export {
    estadoRede
};


