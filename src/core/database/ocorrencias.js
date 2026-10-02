// ==========================================================
// OCORRÊNCIAS DE TESTE
// POWER GRID MONITOR
// ==========================================================
//
// CENÁRIO DE TESTE
//
// Equipamento em falha:
//   G02722
//
// Tipo:
//   CHAVE FACA
//
// Situação:
//   ABERTA
//
// Alimentador:
//   CMG01C5
//
// Clientes interrompidos no momento do desarme:
//   3200
//
// IMPORTANTE:
//
// As correntes NÃO ficam cadastradas neste arquivo.
// Elas serão informadas pelo operador na análise.
//
// O sistema deverá utilizar a topologia BDGD para:
//   - localizar o G02722;
//   - confirmar seu cadastro;
//   - identificar os pontos PAC_1/PAC_2;
//   - identificar a rede afetada;
//   - localizar interligações disponíveis;
//   - analisar possíveis manobras;
//   - calcular o impacto de cada alternativa.
//
// ==========================================================


export const ocorrencias = [

    {
        // ==================================================
        // IDENTIFICAÇÃO DA OC
        // ==================================================

        id: "OC001",


        // ==================================================
        // REFERÊNCIA DA REDE
        // ==================================================

        subestacao: "CMG",

        alimentador: "CMG01C5",

        trecho: null,


        // ==================================================
        // EQUIPAMENTO EM FALHA
        // ==================================================
        //
        // G02722 = chave faca de interligação
        // pertencente ao CMG01C5.
        //
        // O sistema deverá validar este equipamento
        // diretamente na BDGD.
        //

        equipamento: "G02722",

        equipamentoDesarme: "G02722",

        equipamentoDesarmeId: "G02722",


        // ==================================================
        // ESTADO DO EQUIPAMENTO
        // ==================================================

        estadoEquipamento:
            "ABERTO",


        // ==================================================
        // EVENTO
        // ==================================================

        tipo:
            "Falha de Equipamento",

        causa:
            "Falha em chave faca de interligação",

        dataHora:
            null,


        // ==================================================
        // IMPACTO NO MOMENTO DO DESARME
        // ==================================================
        //
        // Este é um dado da ocorrência.
        //
        // Não é corrente e não será calculado pelo motor.
        //

        clientesAfetados:
            3200,


        clientesInterrompidos:
            3200,


        clientesRecuperados:
            0,


        clientesRemanescentes:
            3200,


        // ==================================================
        // LOCALIZAÇÃO
        // ==================================================
        //
        // A localização definitiva poderá ser obtida
        // pela posição do equipamento na BDGD.
        //
        // Estes valores podem ser substituídos depois
        // pela localização real calculada da BDGD.
        //

        localizacao: {

            latitude:
                null,

            longitude:
                null
        },


        // ==================================================
        // DADOS DE MANOBRA
        // ==================================================
        //
        // NÃO informar correntes aqui.
        //
        // O operador fornecerá:
        //
        // - corrente do trecho no momento do desarme;
        // - corrente atual do trecho receptor.
        //
        // O sistema preencherá esses valores durante
        // a análise.
        //

        manobra: {

            equipamentoInterligacao:
                null,

            correnteDesligado:
                null,

            correnteDestino:
                null
        },


        // ==================================================
        // SITUAÇÃO DA OC
        // ==================================================

        status:
            "ATIVA"
    }

];


// ==========================================================
// EXPORT DEFAULT
// ==========================================================

export default ocorrencias;