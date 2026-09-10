// src/core/modelo/modeloRede.js

// ==========================================================
// MODELO CENTRALIZADO DA REDE ELÉTRICA
// POWER GRID MONITOR
// ==========================================================
//
// Responsável por manter:
//
// - Subestações
// - Alimentadores
// - Trechos
// - Equipamentos
// - Estado operacional
// - Topologia BDGD
// - Manobras
// - Interligações
// - Análises operacionais
//
// IMPORTANTE:
//
// A topologia física continua sendo construída em:
//
//     topologiaBDGD.js
//
// Este módulo funciona como uma FACHADA OPERACIONAL.
//
// A BDGD representa a rede física/cadastral.
// estadoRede.operacao representa o estado atual
// utilizado pelo sistema durante a operação.
//
// ==========================================================


import SubestacoesRepository from "../repositories/subestacoesRepository";
import AlimentadoresRepository from "../repositories/alimentadoresRepository";
import TrechosRepository from "../repositories/trechosRepository";
import EquipamentosRepository from "../repositories/equipamentosRepository";

import {
    buscarRedeAMontante as buscarRedeAMontanteBDGD,
    buscarRedeAJusante as buscarRedeAJusanteBDGD,
    buscarCaminho as buscarCaminhoBDGD,
    buscarPonto as buscarPontoBDGD,
    buscarTrechoBDGD,
    buscarConexoes as buscarConexoesBDGD,
} from "./topologiaBDGD";


// ==========================================================
// ESTADO GLOBAL DA REDE
// ==========================================================

const estadoRede = {

    // ------------------------------------------------------
    // DADOS CADASTRAIS
    // ------------------------------------------------------

    subestacoes: [],

    alimentadores: [],

    trechos: [],

    equipamentos: [],


    // ------------------------------------------------------
    // TOPOLOGIA BDGD
    // ------------------------------------------------------

    topologiaBDGD: null,


    // ------------------------------------------------------
    // ESTADO OPERACIONAL
    // ------------------------------------------------------

    operacao: {

        ultimaAtualizacao: null,

        // Lista compatível com versões anteriores
        equipamentosDesligados: [],

        // Estado individual por equipamento
        equipamentos: {},

        // Alimentadores fora de serviço
        alimentadoresDesenergizados: [],

        // Histórico operacional
        historico: []
    }
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

    return String(valor)
        .trim();
}


function normalizarTexto(valor) {

    return normalizarId(valor)
        .toUpperCase();
}


function normalizarCodigo(valor) {

    return normalizarTexto(valor)
        .replace(/[^A-Z0-9]/g, "");
}


function clonarDados(dados, fallback = []) {

    if (
        dados === null ||
        dados === undefined
    ) {
        return fallback;
    }

    try {

        return JSON.parse(
            JSON.stringify(dados)
        );

    } catch (erro) {

        console.warn(
            "[modeloRede] Não foi possível clonar os dados.",
            erro
        );

        if (Array.isArray(dados)) {
            return [...dados];
        }

        if (
            typeof dados === "object" &&
            dados !== null
        ) {
            return {
                ...dados
            };
        }

        return fallback;
    }
}


// ==========================================================
// OBTENÇÃO DE IDENTIFICADORES
// ==========================================================


export function obterIdentificadoresEquipamento(
    equipamento
) {

    if (!equipamento) {
        return [];
    }

    const propriedades =
        equipamento?.properties ||
        equipamento?.propriedades ||
        {};

    const ids = [

        equipamento?.id,

        equipamento?.COD_ID,

        equipamento?.codId,

        equipamento?.codigo,

        equipamento?.plaqueta,

        equipamento?.plaquetaIPT,

        equipamento?.PLAQUETA,

        equipamento?.PLAQUETA_IPT,

        equipamento?.patrimonio,

        equipamento?.unidadeId,

        equipamento?.ID,

        propriedades?.id,

        propriedades?.COD_ID,

        propriedades?.codId,

        propriedades?.CODIGO,

        propriedades?.PLAQUETA,

        propriedades?.PLAQUETA_IPT,

        propriedades?.IPT,

        propriedades?.PATRIMONIO,

        propriedades?.UNIDADE_ID
    ];

    return [
        ...new Set(
            ids
                .filter(
                    (valor) =>
                        valor !== null &&
                        valor !== undefined &&
                        String(valor).trim() !== ""
                )
                .map(
                    (valor) =>
                        String(valor).trim()
                )
        )
    ];
}


function equipamentoCorrespondeId(
    equipamento,
    equipamentoId
) {

    const alvo =
        normalizarId(
            equipamentoId
        );

    if (!alvo) {
        return false;
    }

    const ids =
        obterIdentificadoresEquipamento(
            equipamento
        );

    return ids.some(
        (id) =>
            id === alvo
    );
}


// ==========================================================
// INICIALIZAÇÃO DO MODELO
// ==========================================================


function inicializarRede() {

    estadoRede.subestacoes =
        clonarDados(
            SubestacoesRepository.listar()
        );

    estadoRede.alimentadores =
        clonarDados(
            AlimentadoresRepository.listar()
        );

    estadoRede.trechos =
        clonarDados(
            TrechosRepository.listar()
        );

    estadoRede.equipamentos =
        clonarDados(
            EquipamentosRepository.listar()
        );

    estadoRede.operacao.ultimaAtualizacao =
        new Date();

    return estadoRede;
}


// Inicialização automática.
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
// TOPOLOGIA BDGD
// ==========================================================


export function registrarTopologiaBDGD(
    topologia
) {

    estadoRede.topologiaBDGD =
        topologia || null;

    estadoRede.operacao
        .ultimaAtualizacao =
        new Date();

    return estadoRede.topologiaBDGD;
}


export function limparTopologiaBDGD() {

    estadoRede.topologiaBDGD =
        null;

    estadoRede.operacao
        .ultimaAtualizacao =
        new Date();

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
// BUSCAR EQUIPAMENTO NA TOPOLOGIA BDGD
// ==========================================================


function buscarEquipamentoBDGDLocal(
    topologia,
    equipamentoId
) {

    if (
        !topologia ||
        equipamentoId === null ||
        equipamentoId === undefined
    ) {
        return null;
    }

    const id =
        normalizarId(
            equipamentoId
        );

    if (!id) {
        return null;
    }


    // ------------------------------------------------------
    // Coleções possíveis
    // ------------------------------------------------------

    const colecoes = [

        topologia.equipamentos,

        topologia.unidadesSeccionadoras,

        topologia.transformadores,

        topologia.reguladores,

        topologia.capacitores
    ];


    for (
        const colecao of colecoes
    ) {

        if (!colecao) {
            continue;
        }


        // --------------------------------------------------
        // Caso seja objeto indexado por ID
        // --------------------------------------------------

        if (
            !Array.isArray(colecao) &&
            colecao[id]
        ) {

            return colecao[id];
        }


        // --------------------------------------------------
        // Caso seja array
        // --------------------------------------------------

        const lista =
            Array.isArray(colecao)
                ? colecao
                : Object.values(
                    colecao
                );


        const encontrado =
            lista.find(
                (item) =>
                    equipamentoCorrespondeId(
                        item,
                        id
                    )
            );


        if (encontrado) {
            return encontrado;
        }
    }


    return null;
}


// ==========================================================
// FICHA BDGD
// ==========================================================


function obterFichaBDGDLocal(
    topologia,
    equipamentoId
) {

    const equipamento =
        buscarEquipamentoBDGDLocal(
            topologia,
            equipamentoId
        );

    if (!equipamento) {
        return null;
    }

    const propriedades =
        equipamento?.properties ||
        equipamento?.propriedades ||
        {};


    const id =
        equipamento?.id ??
        equipamento?.COD_ID ??
        equipamento?.codId ??
        equipamento?.codigo ??
        equipamento?.plaqueta ??
        equipamentoId;


    const pontoAssociado =
        equipamento?.pontoAssociado ??
        equipamento?.pontoId ??
        equipamento?.unidadeId ??
        equipamento?.PON_ID ??
        propriedades?.pontoAssociado ??
        propriedades?.pontoId ??
        propriedades?.PON_ID ??
        propriedades?.PAC_1 ??
        propriedades?.PAC_2 ??
        null;


    return {

        equipamento,

        id,

        ids:
            obterIdentificadoresEquipamento(
                equipamento
            ),

        tipo:
            equipamento?.tipo ??
            equipamento?.tipoEquipamento ??
            equipamento?.TIP_UNID ??
            propriedades?.tipo ??
            propriedades?.tipoEquipamento ??
            propriedades?.TIP_UNID ??
            null,

        descricao:
            equipamento?.descricao ??
            equipamento?.DESCR ??
            equipamento?.DESCRICAO ??
            propriedades?.descricao ??
            propriedades?.DESCR ??
            propriedades?.DESCRICAO ??
            null,

        situacao:
            equipamento?.situacao ??
            equipamento?.status ??
            equipamento?.estado ??
            propriedades?.situacao ??
            propriedades?.SIT_ATIV ??
            propriedades?.STATUS ??
            null,

        pontoAssociado,

        pac1:
            equipamento?.pac1 ??
            equipamento?.PAC_1 ??
            propriedades?.PAC_1 ??
            null,

        pac2:
            equipamento?.pac2 ??
            equipamento?.PAC_2 ??
            propriedades?.PAC_2 ??
            null,

        alimentador:
            equipamento?.alimentador ??
            equipamento?.ctmt ??
            equipamento?.CTMT ??
            propriedades?.alimentador ??
            propriedades?.CTMT ??
            null,

        circuito:
            equipamento?.circuito ??
            equipamento?.CIRCUITO ??
            propriedades?.circuito ??
            propriedades?.CIRCUITO ??
            null,

        plaqueta:
            equipamento?.plaqueta ??
            equipamento?.PLAQUETA ??
            propriedades?.PLAQUETA ??
            equipamento?.plaquetaIPT ??
            equipamento?.PLAQUETA_IPT ??
            propriedades?.PLAQUETA_IPT ??
            null,

        patrimonio:
            equipamento?.patrimonio ??
            equipamento?.PATRIMONIO ??
            propriedades?.PATRIMONIO ??
            null,

        dados:
            propriedades
    };
}


// ==========================================================
// FILTRO DE TOPOLOGIA POR ALIMENTADOR
// ==========================================================


function itemPertenceAoAlimentador(
    item,
    alimentador
) {

    if (!item) {
        return false;
    }

    const alvo =
        normalizarCodigo(
            alimentador
        );

    if (!alvo) {
        return true;
    }

    const propriedades =
        item?.properties ||
        item?.propriedades ||
        {};


    const valores = [

        item?.alimentador,

        item?.alimentadorId,

        item?.alimentadorDestino,

        item?.ctmt,

        item?.CTMT,

        item?.COD_ID_ALIMENTADOR,

        item?.circuito,

        propriedades?.alimentador,

        propriedades?.alimentadorId,

        propriedades?.alimentadorDestino,

        propriedades?.CTMT,

        propriedades?.COD_ID_ALIMENTADOR,

        propriedades?.circuito
    ];


    return valores.some(
        (valor) =>
            normalizarCodigo(valor) ===
            alvo
    );
}


function filtrarColecaoPorAlimentador(
    colecao,
    alimentador
) {

    if (!colecao) {
        return [];
    }

    const lista =
        Array.isArray(colecao)
            ? colecao
            : Object.values(colecao);


    return lista.filter(
        (item) =>
            itemPertenceAoAlimentador(
                item,
                alimentador
            )
    );
}


function filtrarTopologiaPorAlimentadorLocal(
    topologia,
    alimentador
) {

    if (!topologia) {
        return null;
    }


    const pontos =
        filtrarColecaoPorAlimentador(
            topologia.pontos,
            alimentador
        );


    const trechos =
        filtrarColecaoPorAlimentador(
            topologia.trechos,
            alimentador
        );


    const unidadesSeccionadoras =
        filtrarColecaoPorAlimentador(
            topologia.unidadesSeccionadoras,
            alimentador
        );


    const transformadores =
        filtrarColecaoPorAlimentador(
            topologia.transformadores,
            alimentador
        );


    const equipamentos =
        filtrarColecaoPorAlimentador(
            topologia.equipamentos,
            alimentador
        );


    const reguladores =
        filtrarColecaoPorAlimentador(
            topologia.reguladores,
            alimentador
        );


    const capacitores =
        filtrarColecaoPorAlimentador(
            topologia.capacitores,
            alimentador
        );


    const terminais =
        filtrarColecaoPorAlimentador(
            topologia.terminais,
            alimentador
        );


    const passagens =
        filtrarColecaoPorAlimentador(
            topologia.passagens,
            alimentador
        );


    const derivacoes =
        filtrarColecaoPorAlimentador(
            topologia.derivacoes,
            alimentador
        );


    const circuito =
        topologia.circuitosPorAlimentador?.[
            alimentador
        ]?.[0] ??
        null;


    return {

        alimentador:
            alimentador || null,

        circuito,

        pontos,

        trechos,

        unidadesSeccionadoras,

        transformadores,

        equipamentos,

        reguladores,

        capacitores,

        terminais,

        passagens,

        derivacoes,

        quantidadePontos:
            pontos.length,

        quantidadeTrechos:
            trechos.length,

        quantidadeEquipamentos:
            unidadesSeccionadoras.length +
            transformadores.length +
            equipamentos.length +
            reguladores.length +
            capacitores.length
    };
}


// ==========================================================
// ESTADOS OPERACIONAIS
// ==========================================================


const ESTADOS_EQUIPAMENTO_VALIDOS = [

    "FECHADO",

    "ABERTO",

    "INDISPONIVEL",

    "BYPASSADO"
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

        CLOSED:
            "FECHADO",

        CLOSE:
            "FECHADO",


        ABERTO:
            "ABERTO",

        ABERTA:
            "ABERTO",

        OPEN:
            "ABERTO",

        OPENED:
            "ABERTO",


        INDISPONIVEL:
            "INDISPONIVEL",

        "INDISPONÍVEL":
            "INDISPONIVEL",

        FORA:
            "INDISPONIVEL",

        DESLIGADO:
            "INDISPONIVEL",


        BYPASSADO:
            "BYPASSADO",

        BYPASS:
            "BYPASSADO",

        BYPASSED:
            "BYPASSADO"
    };


    return aliases[valor] || null;
}


// ==========================================================
// ESTADO CADASTRAL DO EQUIPAMENTO
// ==========================================================


function obterEstadoCadastralEquipamento(
    equipamento
) {

    if (!equipamento) {
        return null;
    }

    return normalizarEstadoEquipamento(

        equipamento?.estado ??
        equipamento?.status ??
        equipamento?.situacao ??
        equipamento?.SIT_ATIV ??
        equipamento?.situacaoOperacional ??
        equipamento?.estadoOperacional
    );
}


// ==========================================================
// CONSULTAR ESTADO OPERACIONAL
// ==========================================================


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


    const registro =
        estadoRede.operacao
            .equipamentos?.[id];


    if (registro) {
        return {
            ...registro
        };
    }


    // ------------------------------------------------------
    // Se ainda não existe estado operacional,
    // tentar descobrir o estado cadastral.
    // ------------------------------------------------------

    const equipamento =
        buscarEquipamento(
            id
        );


    const estadoCadastral =
        obterEstadoCadastralEquipamento(
            equipamento
        );


    return {

        equipamentoId:
            id,

        estado:
            estadoCadastral ||
            "FECHADO",

        origem:
            estadoCadastral
                ? "CADASTRO"
                : "PADRAO",

        atualizadoEm:
            null,

        observacao:
            null
    };
}


// ==========================================================
// LISTAR ESTADOS
// ==========================================================


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


// ==========================================================
// REGISTRAR HISTÓRICO
// ==========================================================


function registrarHistorico(
    acao,
    dados = {}
) {

    estadoRede.operacao
        .historico
        .push({

            data:
                new Date(),

            acao,

            dados:
                clonarDados(
                    dados,
                    {}
                )
        });


    estadoRede.operacao
        .ultimaAtualizacao =
        new Date();
}


// ==========================================================
// ATUALIZAR ESTADO DO EQUIPAMENTO
// ==========================================================


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

            sucesso: false,

            mensagem:
                "Código do equipamento não informado."
        };
    }


    // ------------------------------------------------------
    // Verificar se equipamento existe
    // ------------------------------------------------------

    const equipamento =
        buscarEquipamento(
            id
        );


    if (!equipamento) {

        return {

            sucesso: false,

            mensagem:
                `Equipamento ${id} não encontrado na rede.`
        };
    }


    // ------------------------------------------------------
    // Normalizar estado
    // ------------------------------------------------------

    const estadoNormalizado =
        normalizarEstadoEquipamento(
            estado
        );


    if (
        !ESTADOS_EQUIPAMENTO_VALIDOS
            .includes(
                estadoNormalizado
            )
    ) {

        return {

            sucesso: false,

            mensagem:
                "Estado inválido. Utilize FECHADO, ABERTO, INDISPONIVEL ou BYPASSADO."
        };
    }


    // ------------------------------------------------------
    // Estado anterior
    // ------------------------------------------------------

    const estadoAtual =
        consultarEstadoEquipamento(
            id
        );


    const estadoAnterior =
        estadoAtual?.estado ||
        "FECHADO";


    // ------------------------------------------------------
    // Garantir estrutura
    // ------------------------------------------------------

    if (
        !estadoRede.operacao
            .equipamentos
    ) {

        estadoRede.operacao
            .equipamentos = {};
    }


    // ------------------------------------------------------
    // Registrar novo estado
    // ------------------------------------------------------

    const registro = {

        equipamentoId:
            id,

        estado:
            estadoNormalizado,

        estadoAnterior,

        origem:
            normalizarTexto(
                opcoes.origem ||
                "OPERADOR"
            ),

        observacao:
            opcoes.observacao ||
            null,

        atualizadoEm:
            new Date()
    };


    estadoRede.operacao
        .equipamentos[id] =
        registro;


    // ------------------------------------------------------
    // Lista de equipamentos desligados
    // ------------------------------------------------------

    const desligado =
        estadoNormalizado ===
            "ABERTO" ||
        estadoNormalizado ===
            "INDISPONIVEL";


    const lista =
        Array.isArray(
            estadoRede.operacao
                .equipamentosDesligados
        )
            ? [
                ...estadoRede.operacao
                    .equipamentosDesligados
            ]
            : [];


    if (desligado) {

        if (
            !lista.includes(id)
        ) {

            lista.push(id);
        }

    } else {

        estadoRede.operacao
            .equipamentosDesligados =
            lista.filter(
                (item) =>
                    item !== id
            );
    }


    if (desligado) {

        estadoRede.operacao
            .equipamentosDesligados =
            lista;
    }


    // ------------------------------------------------------
    // Registrar histórico
    // ------------------------------------------------------

    registrarHistorico(

        "ALTERACAO_ESTADO_EQUIPAMENTO",

        {

            equipamento:
                id,

            estadoAnterior,

            estadoNovo:
                estadoNormalizado,

            origem:
                registro.origem,

            observacao:
                registro.observacao
        }
    );


    return {

        sucesso: true,

        equipamentoId:
            id,

        estado:
            registro,

        equipamento
    };
}


// ==========================================================
// EXECUTAR MANOBRA
// ==========================================================
//
// Esta é a função que deve ser chamada pela interface
// quando o operador clicar em ABRIR ou FECHAR.
//
// IMPORTANTE:
//
// A função altera o estado operacional do sistema.
//
// Ela NÃO envia comando físico para equipamento de campo.
//
// ==========================================================


export function executarManobraEquipamento(
    equipamentoId,
    acao,
    opcoes = {}
) {

    const id =
        normalizarId(
            equipamentoId
        );


    if (!id) {

        return {

            sucesso: false,

            mensagem:
                "Equipamento não informado."
        };
    }


    const comando =
        normalizarTexto(
            acao
        );


    if (
        comando !== "ABRIR" &&
        comando !== "FECHAR"
    ) {

        return {

            sucesso: false,

            mensagem:
                "Comando de manobra inválido. Utilize ABRIR ou FECHAR."
        };
    }


    // ------------------------------------------------------
    // Verificar equipamento
    // ------------------------------------------------------

    const equipamento =
        buscarEquipamento(
            id
        );


    if (!equipamento) {

        return {

            sucesso: false,

            mensagem:
                `Equipamento ${id} não encontrado na rede.`
        };
    }


    // ------------------------------------------------------
    // Estado atual
    // ------------------------------------------------------

    const estadoAtual =
        consultarEstadoEquipamento(
            id
        );


    const estadoAtualNormalizado =
        normalizarEstadoEquipamento(
            estadoAtual?.estado
        ) ||
        "FECHADO";


    const novoEstado =
        comando === "ABRIR"
            ? "ABERTO"
            : "FECHADO";


    // ------------------------------------------------------
    // Evitar comando redundante
    // ------------------------------------------------------

    if (
        estadoAtualNormalizado ===
        novoEstado
    ) {

        return {

            sucesso: false,

            repetido: true,

            equipamentoId:
                id,

            comando,

            estadoAnterior:
                estadoAtualNormalizado,

            estadoNovo:
                novoEstado,

            mensagem:
                comando === "ABRIR"
                    ? "O equipamento já está aberto."
                    : "O equipamento já está fechado."
        };
    }


    // ------------------------------------------------------
    // Equipamento indisponível
    // ------------------------------------------------------

    if (
        estadoAtualNormalizado ===
        "INDISPONIVEL"
    ) {

        return {

            sucesso: false,

            bloqueada: true,

            equipamentoId:
                id,

            mensagem:
                "Manobra bloqueada: equipamento indisponível."
        };
    }


    // ------------------------------------------------------
    // Executar alteração
    // ------------------------------------------------------

    const resultado =
        atualizarEstadoEquipamento(

            id,

            novoEstado,

            {

                ...opcoes,

                origem:
                    opcoes.origem ||
                    "MANOBRA_OPERADOR"
            }
        );


    if (
        !resultado?.sucesso
    ) {

        return resultado;
    }


    // ------------------------------------------------------
    // Registrar manobra
    // ------------------------------------------------------

    registrarHistorico(

        "MANOBRA_EQUIPAMENTO",

        {

            equipamento:
                id,

            comando,

            estadoAnterior:
                estadoAtualNormalizado,

            estadoNovo:
                novoEstado,

            observacao:
                opcoes.observacao ||
                null
        }
    );


    return {

        sucesso: true,

        equipamentoId:
            id,

        comando,

        estadoAnterior:
            estadoAtualNormalizado,

        estadoNovo:
            novoEstado,

        equipamento,

        estado:
            resultado.estado,

        mensagem:
            comando === "ABRIR"
                ? "Manobra de abertura realizada no modelo operacional."
                : "Manobra de fechamento realizada no modelo operacional."
    };
}


// ==========================================================
// RESETAR ESTADOS DOS EQUIPAMENTOS
// ==========================================================


export function resetarEstadosEquipamentos() {

    estadoRede.operacao
        .equipamentos = {};

    estadoRede.operacao
        .equipamentosDesligados = [];


    registrarHistorico(
        "RESET_ESTADOS_EQUIPAMENTOS",
        {}
    );


    return {

        sucesso: true
    };
}


// ==========================================================
// BUSCAS BÁSICAS
// ==========================================================


export function buscarSubestacao(
    id
) {

    const alvo =
        normalizarId(id);

    return estadoRede
        .subestacoes
        .find(
            (se) =>
                normalizarId(
                    se?.id
                ) === alvo ||
                normalizarId(
                    se?.codigo
                ) === alvo
        );
}


export function buscarAlimentador(
    id
) {

    const alvo =
        normalizarId(id);


    return estadoRede
        .alimentadores
        .find(
            (alimentador) =>

                normalizarId(
                    alimentador?.id
                ) === alvo ||

                normalizarId(
                    alimentador?.codigo
                ) === alvo ||

                normalizarId(
                    alimentador?.ctmt
                ) === alvo ||

                normalizarId(
                    alimentador?.CTMT
                ) === alvo
        );
}


export function buscarTrecho(
    id
) {

    const alvo =
        normalizarId(id);


    return estadoRede
        .trechos
        .find(
            (trecho) =>

                normalizarId(
                    trecho?.id
                ) === alvo ||

                normalizarId(
                    trecho?.COD_ID
                ) === alvo ||

                normalizarId(
                    trecho?.codId
                ) === alvo
        );
}


// ==========================================================
// BUSCAR EQUIPAMENTO
// ==========================================================


export function buscarEquipamento(
    id
) {

    const equipamentoId =
        normalizarId(id);


    if (!equipamentoId) {
        return null;
    }


    // ------------------------------------------------------
    // Primeiro: repository
    // ------------------------------------------------------

    const encontrado =
        estadoRede
            .equipamentos
            .find(
                (equipamento) =>
                    equipamentoCorrespondeId(
                        equipamento,
                        equipamentoId
                    )
            );


    if (encontrado) {
        return encontrado;
    }


    // ------------------------------------------------------
    // Segundo: BDGD
    // ------------------------------------------------------

    return buscarEquipamentoBDGDLocal(

        estadoRede.topologiaBDGD,

        equipamentoId
    );
}


// ==========================================================
// BUSCAS POR ALIMENTADOR
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
            (trecho) => {

                const valores = [

                    trecho?.alimentador,

                    trecho?.alimentadorId,

                    trecho?.ctmt,

                    trecho?.CTMT,

                    trecho?.COD_ID_ALIMENTADOR
                ];


                return valores.some(
                    (valor) =>
                        normalizarCodigo(
                            valor
                        ) === alvo
                );
            }
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
            (equipamento) => {

                const valores = [

                    equipamento?.alimentador,

                    equipamento?.alimentadorId,

                    equipamento?.ctmt,

                    equipamento?.CTMT,

                    equipamento?.alimentadorDestino
                ];


                return valores.some(
                    (valor) =>
                        normalizarCodigo(
                            valor
                        ) === alvo
                );
            }
        );
}


export function buscarEquipamentosTelecomandados(
    alimentador
) {

    return buscarEquipamentosAlimentador(
        alimentador
    ).filter(
        (equipamento) =>

            equipamento?.telecomandado ===
                true ||

            equipamento?.telecomando ===
                true ||

            equipamento?.telecontrolado ===
                true
    );
}


// ==========================================================
// INTERLIGAÇÕES
// ==========================================================


export function buscarInterligacoes() {

    return estadoRede
        .equipamentos
        .filter(
            (equipamento) =>

                equipamento?.interligacao ===
                    true ||

                equipamento?.interligação ===
                    true
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
            (equipamento) => {

                const origem =
                    normalizarCodigo(
                        equipamento?.alimentador
                    );

                const destino =
                    normalizarCodigo(
                        equipamento?.alimentadorDestino
                    );


                return (
                    origem === alvo ||
                    destino === alvo
                );
            }
        );
}


// ==========================================================
// CONSULTAS EXISTÊNCIA
// ==========================================================


export function existeAlimentador(
    alimentador
) {

    return Boolean(
        buscarAlimentador(
            alimentador
        )
    );
}


export function existeTrecho(
    id
) {

    return Boolean(
        buscarTrecho(id)
    );
}


export function existeEquipamento(
    id
) {

    return Boolean(
        buscarEquipamento(id)
    );
}


// ==========================================================
// CONEXÕES ENTRE EQUIPAMENTOS
// ==========================================================


export function buscarConexoesEquipamento(
    equipamentoId
) {

    const equipamento =
        buscarEquipamento(
            equipamentoId
        );


    if (!equipamento) {
        return [];
    }


    const ponto1 =
        normalizarId(
            equipamento?.pac1
        );


    const ponto2 =
        normalizarId(
            equipamento?.pac2
        );


    const unidade =
        normalizarId(
            equipamento?.unidadeId
        );


    const pontos =
        [
            ponto1,
            ponto2,
            unidade
        ].filter(Boolean);


    // ------------------------------------------------------
    // Se houver topologia BDGD, utilizar conexões reais.
    // ------------------------------------------------------

    if (
        estadoRede.topologiaBDGD &&
        pontos.length > 0
    ) {

        const resultado = [];

        for (
            const pontoId of pontos
        ) {

            const conexoes =
                buscarConexoesBDGD(
                    estadoRede.topologiaBDGD,
                    pontoId
                );


            if (
                Array.isArray(conexoes)
            ) {

                resultado.push(
                    ...conexoes
                );
            }
        }


        const mapa =
            new Map();


        resultado.forEach(
            (item) => {

                const chave =
                    normalizarId(
                        item?.id ??
                        item?.COD_ID ??
                        item?.codId
                    );


                if (chave) {
                    mapa.set(
                        chave,
                        item
                    );
                }
            }
        );


        return [
            ...mapa.values()
        ];
    }


    // ------------------------------------------------------
    // Fallback: relacionamento por alimentador
    // ------------------------------------------------------

    return estadoRede
        .equipamentos
        .filter(
            (item) => {

                if (
                    equipamentoCorrespondeId(
                        item,
                        equipamentoId
                    )
                ) {
                    return false;
                }


                return (

                    item?.alimentador ===
                        equipamento?.alimentador ||

                    item?.alimentadorDestino ===
                        equipamento?.alimentador
                );
            }
        );
}


// ==========================================================
// CAMINHO ENTRE ALIMENTADORES
// ==========================================================


export function buscarCaminhoAlimentadores(
    origem,
    destino
) {

    const origemNormalizada =
        normalizarCodigo(
            origem
        );


    const destinoNormalizado =
        normalizarCodigo(
            destino
        );


    if (
        !origemNormalizada ||
        !destinoNormalizado
    ) {
        return [];
    }


    const interligacoes =
        buscarInterligacoes();


    return interligacoes
        .filter(
            (equipamento) => {

                const a =
                    normalizarCodigo(
                        equipamento?.alimentador
                    );

                const b =
                    normalizarCodigo(
                        equipamento?.alimentadorDestino
                    );


                return (

                    (
                        a ===
                            origemNormalizada &&
                        b ===
                            destinoNormalizado
                    ) ||

                    (
                        a ===
                            destinoNormalizado &&
                        b ===
                            origemNormalizada
                    )
                );
            }
        )
        .map(
            (equipamento) => {

                const a =
                    normalizarCodigo(
                        equipamento?.alimentador
                    );

                const b =
                    normalizarCodigo(
                        equipamento?.alimentadorDestino
                    );


                if (
                    a ===
                    origemNormalizada
                ) {

                    return {

                        equipamento:
                            equipamento?.id ??
                            equipamento?.COD_ID ??
                            equipamento?.codId ??
                            equipamento?.plaqueta,

                        origem,

                        destino,

                        equipamentoDados:
                            equipamento
                    };
                }


                return {

                    equipamento:
                        equipamento?.id ??
                        equipamento?.COD_ID ??
                        equipamento?.codId ??
                        equipamento?.plaqueta,

                    origem,

                    destino,

                    equipamentoDados:
                        equipamento
                };
            }
        );
}


export function possuiInterligacao(
    origem,
    destino
) {

    return (
        buscarCaminhoAlimentadores(
            origem,
            destino
        ).length > 0
    );
}


// ==========================================================
// CAPACIDADE DE CABOS
// ==========================================================


const tabelaCapacidadeCabos = {

    "240": 500,

    "150": 300,

    "95": 220,

    "70": 150,

    "35": 90
};


export function capacidadePorBitola(
    bitola
) {

    const valor =
        normalizarId(
            bitola
        )
            .replace(
                /mm²|mm2|MM²|MM2/g,
                ""
            )
            .replace(
                /[^0-9]/g,
                ""
            );


    return (
        tabelaCapacidadeCabos[
            valor
        ] || 0
    );
}


// ==========================================================
// CAPACIDADE DO TRECHO
// ==========================================================


export function calcularCapacidadeTrecho(
    trechoId
) {

    const trecho =
        buscarTrecho(
            trechoId
        );


    if (!trecho) {
        return 0;
    }


    const bitolas = [];


    const adicionarBitola = (
        valor
    ) => {

        if (
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
        ) {

            bitolas.push(
                valor
            );
        }
    };


    adicionarBitola(
        trecho?.bitola
    );


    adicionarBitola(
        trecho?.BITOLA
    );


    adicionarBitola(
        trecho?.bitolaCondutor
    );


    if (
        Array.isArray(
            trecho?.condutores
        )
    ) {

        trecho.condutores.forEach(
            (cabo) => {

                adicionarBitola(
                    cabo?.bitola
                );

                adicionarBitola(
                    cabo?.BITOLA
                );
            }
        );
    }


    if (
        bitolas.length === 0
    ) {
        return 0;
    }


    const capacidades =
        bitolas
            .map(
                (bitola) =>
                    capacidadePorBitola(
                        bitola
                    )
            )
            .filter(
                (capacidade) =>
                    capacidade > 0
            );


    if (
        capacidades.length === 0
    ) {
        return 0;
    }


    return Math.min(
        ...capacidades
    );
}


// ==========================================================
// VALIDAR CARGA
// ==========================================================


export function validarCargaTrecho(
    trechoId,
    correnteNova
) {

    const capacidade =
        calcularCapacidadeTrecho(
            trechoId
        );


    if (!capacidade) {

        return {

            permitido: false,

            motivo:
                "Trecho sem capacidade definida"
        };
    }


    const corrente =
        Number(
            correnteNova
        ) || 0;


    const limite =
        capacidade * 0.8;


    return {

        permitido:
            corrente <= limite,

        capacidade,

        limiteOperacional:
            limite,

        correnteSolicitada:
            corrente,

        excedido:
            corrente > limite
    };
}


// ==========================================================
// NORMALIZAÇÃO
// ==========================================================


export function analisarNormalizacao(
    trechoInterligacaoId,
    correnteInformada
) {

    const trecho =
        buscarTrecho(
            trechoInterligacaoId
        );


    if (!trecho) {

        return {

            sucesso: false,

            statusAnalise:
                "ERRO",

            mensagem:
                "Trecho de interligação não encontrado no modelo da rede.",

            passosManobra: []
        };
    }


    const capacidadeSuportada =
        trecho?.capacidade ||
        trecho?.capacidadeMaximaAmperes ||
        calcularCapacidadeTrecho(
            trechoInterligacaoId
        ) ||
        250;


    const corrente =
        Number(
            correnteInformada
        ) || 0;


    if (
        corrente >
        capacidadeSuportada
    ) {

        return {

            sucesso: false,

            statusAnalise:
                "SOBRECARGA",

            mensagem:
                `Nenhuma transferência segura encontrada. A corrente informada (${corrente}A) excede a capacidade máxima suportada pelo trecho (${capacidadeSuportada}A).`,

            passosManobra: [],

            detalhes: {

                correnteInformada:
                    corrente,

                capacidadeTrecho:
                    capacidadeSuportada,

                bitola:
                    trecho?.bitola ||
                    null
            }
        };
    }


    const alimentadorOrigem =
        trecho?.alimentador ||
        null;


    return {

        sucesso: true,

        statusAnalise:
            "VIABILIZADO",

        mensagem:
            `Transferência e normalização viáveis. A carga informada (${corrente}A) está dentro da capacidade considerada (${capacidadeSuportada}A).`,

        passosManobra: [

            {

                ordem: 1,

                acao:
                    "ABRIR",

                elemento:
                    null,

                descricao:
                    alimentadorOrigem
                        ? `Realizar a abertura do equipamento/disjuntor do alimentador afetado (${alimentadorOrigem}).`
                        : "Realizar a abertura do alimentador afetado."
            },

            {

                ordem: 2,

                acao:
                    "FECHAR",

                elemento:
                    null,

                descricao:
                    "Realizar o fechamento do equipamento de interligação correspondente."
            },

            {

                ordem: 3,

                acao:
                    "NORMALIZAR",

                elemento:
                    trecho?.id,

                descricao:
                    "Transferir e normalizar a carga pelo caminho de interligação disponível."
            },

            {

                ordem: 4,

                acao:
                    "CONFIRMAR",

                elemento:
                    null,

                descricao:
                    "Confirmar estabilização da rede e atendimento aos clientes."
            }
        ],

        detalhes: {

            correnteInformada:
                corrente,

            capacidadeTrecho:
                capacidadeSuportada,

            bitola:
                trecho?.bitola ||
                null
        }
    };
}


// ==========================================================
// TRANSFERÊNCIA ENTRE ALIMENTADORES
// ==========================================================


export function analisarTransferencia(
    origem,
    destino,
    correnteOrigem,
    correnteDestino
) {

    const resultado = {

        permitido:
            false,

        motivo:
            null,

        interligacao:
            null,

        correnteFinal:
            null
    };


    const caminho =
        buscarCaminhoAlimentadores(
            origem,
            destino
        );


    if (
        caminho.length === 0
    ) {

        resultado.motivo =
            "Não existe interligação entre alimentadores";

        return resultado;
    }


    resultado.interligacao =
        caminho;


    const correnteTotal =
        (
            Number(
                correnteOrigem
            ) || 0
        ) +
        (
            Number(
                correnteDestino
            ) || 0
        );


    resultado.correnteFinal =
        correnteTotal;


    const alimentadorDestino =
        buscarAlimentador(
            destino
        );


    if (!alimentadorDestino) {

        resultado.motivo =
            "Alimentador destino não encontrado";

        return resultado;
    }


    const trechosDestino =
        buscarTrechosAlimentador(
            destino
        );


    for (
        const trecho of
        trechosDestino
    ) {

        const validacao =
            validarCargaTrecho(
                trecho?.id,
                correnteTotal
            );


        if (
            !validacao.permitido
        ) {

            resultado.motivo =
                "Capacidade do trecho insuficiente";

            resultado.detalhe =
                validacao;

            return resultado;
        }
    }


    resultado.permitido =
        true;


    return resultado;
}


// ==========================================================
// CORRENTE DOS ALIMENTADORES
// ==========================================================


export function atualizarCorrenteAlimentador(
    alimentadorId,
    corrente
) {

    const alimentador =
        buscarAlimentador(
            alimentadorId
        );


    if (!alimentador) {

        return {

            sucesso: false,

            mensagem:
                "Alimentador não encontrado"
        };
    }


    alimentador.correnteAtual =
        Number(
            corrente
        ) || 0;


    registrarHistorico(

        "ATUALIZACAO_CORRENTE",

        {

            alimentador:
                alimentadorId,

            corrente:
                alimentador.correnteAtual
        }
    );


    return {

        sucesso: true,

        alimentador
    };
}


// ==========================================================
// CORRENTE DO TRECHO
// ==========================================================


export function atualizarCorrenteTrecho(
    trechoId,
    corrente
) {

    const trecho =
        buscarTrecho(
            trechoId
        );


    if (!trecho) {

        return {

            sucesso: false,

            mensagem:
                "Trecho não encontrado"
        };
    }


    trecho.correnteAtual =
        Number(
            corrente
        ) || 0;


    registrarHistorico(

        "ATUALIZACAO_CORRENTE_TRECHO",

        {

            trecho:
                trechoId,

            corrente:
                trecho.correnteAtual
        }
    );


    return {

        sucesso: true,

        trecho
    };
}


// ==========================================================
// DESLIGAR EQUIPAMENTO
// ==========================================================


export function desligarEquipamento(
    equipamentoId
) {

    return atualizarEstadoEquipamento(

        equipamentoId,

        "INDISPONIVEL",

        {
            origem:
                "OPERADOR"
        }
    );
}


// ==========================================================
// LIGAR EQUIPAMENTO
// ==========================================================


export function ligarEquipamento(
    equipamentoId
) {

    return atualizarEstadoEquipamento(

        equipamentoId,

        "FECHADO",

        {
            origem:
                "OPERADOR"
        }
    );
}


// ==========================================================
// DESENERGIZAR ALIMENTADOR
// ==========================================================


export function desenergizarAlimentador(
    alimentadorId
) {

    const alimentador =
        buscarAlimentador(
            alimentadorId
        );


    if (!alimentador) {

        return {

            sucesso: false,

            mensagem:
                "Alimentador não encontrado"
        };
    }


    alimentador.estado =
        "DESENERGIZADO";


    const lista =
        Array.isArray(
            estadoRede.operacao
                .alimentadoresDesenergizados
        )
            ? [
                ...estadoRede.operacao
                    .alimentadoresDesenergizados
            ]
            : [];


    if (
        !lista.includes(
            alimentadorId
        )
    ) {

        lista.push(
            alimentadorId
        );
    }


    estadoRede.operacao
        .alimentadoresDesenergizados =
        lista;


    registrarHistorico(

        "ALIMENTADOR_DESENERGIZADO",

        {

            alimentador:
                alimentadorId
        }
    );


    return {

        sucesso: true,

        alimentador
    };
}


// ==========================================================
// ENERGIZAR ALIMENTADOR
// ==========================================================


export function energizarAlimentador(
    alimentadorId
) {

    const alimentador =
        buscarAlimentador(
            alimentadorId
        );


    if (!alimentador) {

        return {

            sucesso: false,

            mensagem:
                "Alimentador não encontrado"
        };
    }


    alimentador.estado =
        "ENERGIZADO";


    estadoRede.operacao
        .alimentadoresDesenergizados =

        estadoRede.operacao
            .alimentadoresDesenergizados
            .filter(
                (id) =>
                    id !==
                    alimentadorId
            );


    registrarHistorico(

        "ALIMENTADOR_ENERGIZADO",

        {

            alimentador:
                alimentadorId
        }
    );


    return {

        sucesso: true,

        alimentador
    };
}


// ==========================================================
// ESTADO OPERACIONAL GERAL
// ==========================================================


export function consultarEstadoOperacional() {

    return {

        equipamentosDesligados:

            [
                ...estadoRede
                    .operacao
                    .equipamentosDesligados
            ],


        equipamentos:

            {
                ...estadoRede
                    .operacao
                    .equipamentos
            },


        alimentadoresDesenergizados:

            [
                ...estadoRede
                    .operacao
                    .alimentadoresDesenergizados
            ],


        ultimaAtualizacao:

            estadoRede
                .operacao
                .ultimaAtualizacao,


        historico:

            [
                ...estadoRede
                    .operacao
                    .historico
            ]
    };
}


// ==========================================================
// RESET COMPLETO
// ==========================================================


export function restaurarEstadoInicial() {

    inicializarRede();


    estadoRede.operacao
        .equipamentosDesligados =
        [];


    estadoRede.operacao
        .equipamentos =
        {};


    estadoRede.operacao
        .alimentadoresDesenergizados =
        [];


    estadoRede.operacao
        .historico =
        [];


    registrarHistorico(
        "RESET_REDE",
        {}
    );


    return estadoRede;
}


// ==========================================================
// ANÁLISE DE MANOBRA OPERACIONAL
// ==========================================================


export function analisarManobraOperacional(
    alimentadorOrigem,
    alimentadorDestino,
    correnteOrigem,
    correnteDestino
) {

    const resultado = {

        permitido:
            false,

        status:
            "BLOQUEADA",

        motivo:
            null,

        detalhes:
            {}
    };


    const origem =
        buscarAlimentador(
            alimentadorOrigem
        );


    const destino =
        buscarAlimentador(
            alimentadorDestino
        );


    if (
        !origem ||
        !destino
    ) {

        resultado.motivo =
            "Alimentador não encontrado";

        return resultado;
    }


    // ------------------------------------------------------
    // Verificar se origem está energizada
    // ------------------------------------------------------

    if (
        origem?.estado ===
        "DESENERGIZADO"
    ) {

        resultado.motivo =
            "Alimentador origem está desenergizado.";

        return resultado;
    }


    // ------------------------------------------------------
    // Verificar destino
    // ------------------------------------------------------

    if (
        destino?.estado ===
        "DESENERGIZADO"
    ) {

        resultado.motivo =
            "Alimentador destino está desenergizado.";

        return resultado;
    }


    // ------------------------------------------------------
    // Interligação
    // ------------------------------------------------------

    const interligacoes =
        buscarCaminhoAlimentadores(
            alimentadorOrigem,
            alimentadorDestino
        );


    if (
        interligacoes.length === 0
    ) {

        resultado.motivo =
            "Não existe equipamento de interligação entre os alimentadores.";

        return resultado;
    }


    resultado.detalhes
        .interligacao =
        interligacoes;


    // ------------------------------------------------------
    // Verificar equipamentos da interligação
    // ------------------------------------------------------

    for (
        const item of
        interligacoes
    ) {

        const equipamento =
            buscarEquipamento(
                item?.equipamento
            );


        if (!equipamento) {

            resultado.motivo =
                "Equipamento de interligação não encontrado.";

            resultado.detalhes
                .equipamento =
                item;

            return resultado;
        }


        const estado =
            consultarEstadoEquipamento(
                item?.equipamento
            );


        if (
            estado?.estado ===
                "INDISPONIVEL"
        ) {

            resultado.motivo =
                "Equipamento de interligação indisponível.";

            resultado.detalhes
                .equipamento =
                equipamento;

            return resultado;
        }
    }


    // ------------------------------------------------------
    // Corrente
    // ------------------------------------------------------

    const correnteOrigemNumero =
        Number(
            correnteOrigem
        ) || 0;


    const correnteDestinoNumero =
        Number(
            correnteDestino
        ) || 0;


    const novaCorrente =
        correnteOrigemNumero +
        correnteDestinoNumero;


    resultado.detalhes
        .correnteAtual = {

            origem:
                correnteOrigemNumero,

            destino:
                correnteDestinoNumero,

            total:
                novaCorrente
        };


    // ------------------------------------------------------
    // Validar trechos do destino
    // ------------------------------------------------------

    const trechosDestino =
        buscarTrechosAlimentador(
            alimentadorDestino
        );


    for (
        const trecho of
        trechosDestino
    ) {

        const capacidade =
            calcularCapacidadeTrecho(
                trecho?.id
            );


        if (!capacidade) {
            continue;
        }


        const limite =
            capacidade * 0.8;


        if (
            novaCorrente >
            limite
        ) {

            resultado.motivo =
                "Transferência bloqueada: limite operacional do trecho excedido.";

            resultado.detalhes
                .trecho = {

                    id:
                        trecho?.id,

                    capacidade,

                    limite,

                    correnteSolicitada:
                        novaCorrente
                };


            return resultado;
        }
    }


    resultado.permitido =
        true;


    resultado.status =
        "LIBERADA";


    resultado.motivo =
        "Manobra operacionalmente possível.";


    return resultado;
}


// ==========================================================
// IMPACTO DA MANOBRA
// ==========================================================


export function analisarImpactoManobra(
    alimentador
) {

    const dados =
        buscarAlimentador(
            alimentador
        );


    if (!dados) {
        return null;
    }


    const equipamentos =
        buscarEquipamentosAlimentador(
            alimentador
        );


    const telecomandados =
        equipamentos.filter(
            (eq) =>

                eq?.telecomandado ===
                    true ||

                eq?.telecomando ===
                    true ||

                eq?.telecontrolado ===
                    true
        );


    const desligados =
        equipamentos.filter(
            (eq) => {

                const id =
                    normalizarId(
                        eq?.id ??
                        eq?.COD_ID ??
                        eq?.codId ??
                        eq?.plaqueta
                    );


                const estado =
                    consultarEstadoEquipamento(
                        id
                    );


                return (

                    estado?.estado ===
                        "ABERTO" ||

                    estado?.estado ===
                        "INDISPONIVEL"
                );
            }
        );


    return {

        alimentador,

        clientes:
            Number(
                dados?.clientes
            ) || 0,

        hospitais:
            Number(
                dados?.hospitais
            ) || 0,

        equipamentos:
            equipamentos.length,

        telecomandados:
            telecomandados.length,

        equipamentosDesligados:
            desligados.length
    };
}


// ==========================================================
// RESUMO DA REDE
// ==========================================================


export function resumoRede() {

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

        equipamentosDesligados:
            estadoRede
                .operacao
                .equipamentosDesligados
                .length,

        alimentadoresDesenergizados:
            estadoRede
                .operacao
                .alimentadoresDesenergizados
                .length,

        possuiTopologiaBDGD:
            possuiTopologiaBDGD(),

        ultimaAtualizacao:
            estadoRede
                .operacao
                .ultimaAtualizacao
    };
}


// ==========================================================
// FACHADA DA TOPOLOGIA BDGD
// ==========================================================


function obterTopologiaOuNulo() {

    return (
        estadoRede.topologiaBDGD ||
        null
    );
}


// ==========================================================
// FICHA OPERACIONAL
// ==========================================================


export function obterFichaOperacional(
    equipamentoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return null;
    }


    return obterFichaBDGDLocal(

        topologia,

        equipamentoId
    );
}


// ==========================================================
// BUSCAR EQUIPAMENTO NA REDE
// ==========================================================


export function buscarEquipamentoRede(
    equipamentoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (topologia) {

        const bdgd =
            buscarEquipamentoBDGDLocal(

                topologia,

                equipamentoId
            );


        if (bdgd) {
            return bdgd;
        }
    }


    return (
        buscarEquipamento(
            equipamentoId
        ) ||
        null
    );
}


// ==========================================================
// BUSCAR PONTO
// ==========================================================


export function buscarPontoRede(
    pontoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return null;
    }


    return buscarPontoBDGD(

        topologia,

        pontoId
    );
}


// ==========================================================
// BUSCAR TRECHO
// ==========================================================


export function buscarTrechoRede(
    trechoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (topologia) {

        const trecho =
            buscarTrechoBDGD(

                topologia,

                trechoId
            );


        if (trecho) {
            return trecho;
        }
    }


    return (
        buscarTrecho(
            trechoId
        ) ||
        null
    );
}


// ==========================================================
// BUSCAR CONEXÕES BDGD
// ==========================================================


export function buscarConexoesRede(
    pontoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return [];
    }


    return buscarConexoesBDGD(

        topologia,

        pontoId
    );
}


// ==========================================================
// MONTANTE
// ==========================================================


export function buscarMontante(
    pontoId,
    opcoes = {}
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {

        return {

            pontoInicial:
                pontoId ||
                null,

            pontos:
                {},

            trechos:
                {},

            ordemPontos:
                [],

            ordemTrechos:
                [],

            quantidadePontos:
                0,

            quantidadeTrechos:
                0,

            motivo:
                "Topologia BDGD não registrada"
        };
    }


    return buscarRedeAMontanteBDGD(

        topologia,

        pontoId,

        opcoes
    );
}


// ==========================================================
// JUSANTE
// ==========================================================


export function buscarJusante(
    pontoId,
    opcoes = {}
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {

        return {

            pontoInicial:
                pontoId ||
                null,

            pontos:
                {},

            trechos:
                {},

            ordemPontos:
                [],

            ordemTrechos:
                [],

            quantidadePontos:
                0,

            quantidadeTrechos:
                0,

            motivo:
                "Topologia BDGD não registrada"
        };
    }


    return buscarRedeAJusanteBDGD(

        topologia,

        pontoId,

        opcoes
    );
}


// ==========================================================
// CAMINHO ELÉTRICO
// ==========================================================


export function buscarCaminhoEletrico(
    pontoInicial,
    pontoFinal
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {

        return {

            encontrado:
                false,

            pontoInicial:
                pontoInicial ||
                null,

            pontoFinal:
                pontoFinal ||
                null,

            pontos:
                [],

            trechos:
                [],

            distancia:
                0,

            motivo:
                "Topologia BDGD não registrada"
        };
    }


    return buscarCaminhoBDGD(

        topologia,

        pontoInicial,

        pontoFinal
    );
}


// ==========================================================
// REDE CONECTADA
// ==========================================================


export function buscarRedeConectada(
    pontoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {

        return {

            pontoInicial:
                pontoId ||
                null,

            pontos:
                {},

            trechos:
                {},

            ordemPontos:
                [],

            ordemTrechos:
                [],

            quantidadePontos:
                0,

            quantidadeTrechos:
                0,

            motivo:
                "Topologia BDGD não registrada"
        };
    }


    const montante =
        buscarRedeAMontanteBDGD(

            topologia,

            pontoId
        );


    const jusante =
        buscarRedeAJusanteBDGD(

            topologia,

            pontoId,

            {
                respeitarOrientacao:
                    true
            }
        );


    const pontos = {

        ...(montante?.pontos || {}),

        ...(jusante?.pontos || {})
    };


    const trechos = {

        ...(montante?.trechos || {}),

        ...(jusante?.trechos || {})
    };


    const ordemPontos = [

        ...(montante?.ordemPontos || []),

        ...(jusante?.ordemPontos || [])

    ].filter(

        (
            id,
            index,
            lista
        ) =>

            lista.indexOf(id) ===
            index
    );


    const ordemTrechos = [

        ...(montante?.ordemTrechos || []),

        ...(jusante?.ordemTrechos || [])

    ].filter(

        (
            id,
            index,
            lista
        ) =>

            lista.indexOf(id) ===
            index
    );


    return {

        pontoInicial:
            pontoId ||
            null,

        pontos,

        trechos,

        ordemPontos,

        ordemTrechos,

        quantidadePontos:
            ordemPontos.length,

        quantidadeTrechos:
            ordemTrechos.length,

        montante,

        jusante
    };
}


// ==========================================================
// PQT DO PONTO
// ==========================================================


export function buscarPQTDoPontoRede(
    pontoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return [];
    }


    const ponto =
        buscarPontoBDGD(

            topologia,

            pontoId
        );


    if (!ponto) {
        return [];
    }


    const colecao =
        topologia
            .unidadesSeccionadoras ||
        {};


    const lista =
        Array.isArray(
            colecao
        )
            ? colecao
            : Object.values(
                colecao
            );


    const alvo =
        normalizarId(
            pontoId
        );


    return lista.filter(
        (pqt) => {

            const pac1 =
                normalizarId(
                    pqt?.pac1 ??
                    pqt?.PAC_1
                );


            const pac2 =
                normalizarId(
                    pqt?.pac2 ??
                    pqt?.PAC_2
                );


            const associado =
                normalizarId(
                    pqt?.pontoAssociado
                );


            return (

                pac1 === alvo ||

                pac2 === alvo ||

                associado === alvo
            );
        }
    );
}


// ==========================================================
// TRANSFORMADORES DO PONTO
// ==========================================================


export function buscarTransformadoresDoPontoRede(
    pontoId
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return [];
    }


    const colecao =
        topologia
            .transformadores ||
        {};


    const lista =
        Array.isArray(
            colecao
        )
            ? colecao
            : Object.values(
                colecao
            );


    const alvo =
        normalizarId(
            pontoId
        );


    return lista.filter(
        (transformador) => {

            const pac1 =
                normalizarId(
                    transformador?.pac1 ??
                    transformador?.PAC_1
                );


            const pac2 =
                normalizarId(
                    transformador?.pac2 ??
                    transformador?.PAC_2
                );


            const associado =
                normalizarId(
                    transformador?.pontoAssociado
                );


            return (

                pac1 === alvo ||

                pac2 === alvo ||

                associado === alvo
            );
        }
    );
}


// ==========================================================
// FILTRAR REDE POR ALIMENTADOR
// ==========================================================


export function filtrarRedePorAlimentador(
    alimentador
) {

    const topologia =
        obterTopologiaOuNulo();


    if (!topologia) {
        return null;
    }


    return filtrarTopologiaPorAlimentadorLocal(

        topologia,

        alimentador
    );
}


// ==========================================================
// FICHA COMPLETA DO EQUIPAMENTO
// ==========================================================


export function obterFichaCompletaEquipamento(
    equipamentoId
) {

    const topologia =
        obterTopologiaOuNulo();


    const equipamento =
        buscarEquipamentoRede(
            equipamentoId
        );


    if (!equipamento) {
        return null;
    }


    const ficha =
        topologia
            ? obterFichaBDGDLocal(
                topologia,
                equipamentoId
            )
            : null;


    const equipamentoModelo =
        buscarEquipamento(
            equipamentoId
        );


    const pontoId =

        ficha?.pontoAssociado ||

        ficha?.pac1 ||

        ficha?.pac2 ||

        equipamento?.pontoAssociado ||

        equipamento?.pontoId ||

        equipamento?.unidadeId ||

        equipamento?.PAC_1 ||

        equipamento?.PAC_2 ||

        null;


    const ponto =
        topologia &&
        pontoId
            ? buscarPontoBDGD(
                topologia,
                pontoId
            )
            : null;


    const conexoes =
        topologia &&
        pontoId
            ? buscarConexoesBDGD(
                topologia,
                pontoId
            )
            : [];


    const estadoOperacional =
        consultarEstadoEquipamento(
            equipamentoId
        );


    const estadoCadastro =
        obterEstadoCadastralEquipamento(
            equipamentoModelo ||
            equipamento
        );


    const estadoConsolidado =
        estadoOperacional?.estado &&
        estadoOperacional.estado !==
            "NAO_INFORMADO"

            ? estadoOperacional.estado

            : estadoCadastro ||
              ficha?.situacao ||
              "FECHADO";


    return {

        ...(ficha || {}),

        equipamento,

        estadoOperacional:
            estadoConsolidado,

        estadoOrigem:
            estadoOperacional?.origem ||
            null,

        correnteAtual:
            equipamentoModelo
                ?.correnteAtual ??
            equipamento
                ?.correnteAtual ??
            null,

        observacaoOperacional:
            estadoOperacional
                ?.observacao ??
            null,

        atualizadoEm:
            estadoOperacional
                ?.atualizadoEm ??
            null,

        ponto,

        conexoes,

        modelo:
            equipamentoModelo ||
            null
    };
}


// ==========================================================
// FUNÇÕES AUXILIARES DE OPERAÇÃO
// ==========================================================


// ----------------------------------------------------------
// Verificar se equipamento está aberto
// ----------------------------------------------------------

export function equipamentoEstaAberto(
    equipamentoId
) {

    const estado =
        consultarEstadoEquipamento(
            equipamentoId
        );


    return (
        estado?.estado ===
        "ABERTO"
    );
}


// ----------------------------------------------------------
// Verificar se equipamento está fechado
// ----------------------------------------------------------

export function equipamentoEstaFechado(
    equipamentoId
) {

    const estado =
        consultarEstadoEquipamento(
            equipamentoId
        );


    return (
        estado?.estado ===
        "FECHADO"
    );
}


// ----------------------------------------------------------
// Verificar se equipamento está disponível
// ----------------------------------------------------------

export function equipamentoEstaDisponivel(
    equipamentoId
) {

    const estado =
        consultarEstadoEquipamento(
            equipamentoId
        );


    return (
        estado?.estado !==
        "INDISPONIVEL"
    );
}


// ----------------------------------------------------------
// Obter estado de todos os equipamentos
// ----------------------------------------------------------

export function obterMapaEstadosEquipamentos() {

    const resultado = {};


    estadoRede
        .equipamentos
        .forEach(
            (equipamento) => {

                const ids =
                    obterIdentificadoresEquipamento(
                        equipamento
                    );


                if (
                    ids.length === 0
                ) {
                    return;
                }


                const estado =
                    consultarEstadoEquipamento(
                        ids[0]
                    );


                ids.forEach(
                    (id) => {

                        resultado[id] =
                            estado;
                    }
                );
            }
        );


    return resultado;
}


// ==========================================================
// OBJETO MODELO
// ==========================================================


export const modeloRede = {

    // ------------------------------------------------------
    // DADOS
    // ------------------------------------------------------

    getRede,

    getSubestacoes,

    getAlimentadores,

    getTrechos,

    getEquipamentos,


    // ------------------------------------------------------
    // IDENTIFICAÇÃO
    // ------------------------------------------------------

    obterIdentificadoresEquipamento,


    // ------------------------------------------------------
    // TOPOLOGIA
    // ------------------------------------------------------

    registrarTopologiaBDGD,

    limparTopologiaBDGD,

    getTopologiaBDGD,

    possuiTopologiaBDGD,


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


    // ------------------------------------------------------
    // ALIMENTADORES
    // ------------------------------------------------------

    buscarTrechosAlimentador,

    buscarEquipamentosAlimentador,

    buscarEquipamentosTelecomandados,

    buscarInterligacoes,

    buscarInterligacoesAlimentador,

    buscarCaminhoAlimentadores,

    possuiInterligacao,


    // ------------------------------------------------------
    // ESTADOS
    // ------------------------------------------------------

    normalizarEstadoEquipamento,

    consultarEstadoEquipamento,

    listarEstadosEquipamentos,

    atualizarEstadoEquipamento,

    obterMapaEstadosEquipamentos,

    equipamentoEstaAberto,

    equipamentoEstaFechado,

    equipamentoEstaDisponivel,


    // ------------------------------------------------------
    // MANOBRAS
    // ------------------------------------------------------

    executarManobraEquipamento,

    desligarEquipamento,

    ligarEquipamento,


    // ------------------------------------------------------
    // ALIMENTADORES
    // ------------------------------------------------------

    atualizarCorrenteAlimentador,

    atualizarCorrenteTrecho,

    desenergizarAlimentador,

    energizarAlimentador,


    // ------------------------------------------------------
    // CAPACIDADE
    // ------------------------------------------------------

    capacidadePorBitola,

    calcularCapacidadeTrecho,

    validarCargaTrecho,


    // ------------------------------------------------------
    // ANÁLISES
    // ------------------------------------------------------

    analisarNormalizacao,

    analisarTransferencia,

    analisarManobraOperacional,

    analisarImpactoManobra,


    // ------------------------------------------------------
    // ESTADO GERAL
    // ------------------------------------------------------

    consultarEstadoOperacional,

    resetarEstadosEquipamentos,

    restaurarEstadoInicial,

    resumoRede,


    // ------------------------------------------------------
    // TOPOLOGIA OPERACIONAL
    // ------------------------------------------------------

    buscarMontante,

    buscarJusante,

    buscarCaminhoEletrico,

    buscarRedeConectada,

    buscarPQTDoPontoRede,

    buscarTransformadoresDoPontoRede,

    filtrarRedePorAlimentador,


    // ------------------------------------------------------
    // FICHAS
    // ------------------------------------------------------

    obterFichaOperacional,

    obterFichaCompletaEquipamento
};


// ==========================================================
// EXPORTAÇÃO DO ESTADO
// ==========================================================


export {
    estadoRede
};