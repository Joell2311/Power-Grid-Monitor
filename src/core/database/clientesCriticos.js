// =====================================================
// CLIENTES CRÍTICOS DA REDE
// Cadastro de consumidores prioritários
// =====================================================


export const clientesCriticos = [



    // =====================================================
    // CMG-01C4
    // =====================================================


    {


        id:"CC001",


        nome:"Hospital Municipal Camaragibe",


        tipo:"HOSPITAL",


        prioridade:1,


        alimentador:"CMG-01C4",


        trecho:"T002",


        poste:"P123457",


        cargaEstimada:150,


        telefoneOperacao:"N/A",


        observacao:

        "Consumidor crítico - manter energia durante manobras"



    },



    {


        id:"CC002",


        nome:"Compesa - Unidade Operacional",


        tipo:"SANEAMENTO",


        prioridade:2,


        alimentador:"CMG-01C4",


        trecho:"T004",


        poste:"P123470",


        cargaEstimada:80,


        telefoneOperacao:"N/A",


        observacao:

        "Grupo A - processo contínuo"



    },



    {


        id:"CC003",


        nome:"Escola Estadual Modelo",


        tipo:"ESCOLA",


        prioridade:4,


        alimentador:"CMG-01C4",


        trecho:"T003",


        poste:"P123458",


        cargaEstimada:40,


        telefoneOperacao:"N/A",


        observacao:

        "Prioridade operacional em horário escolar"



    },



    // =====================================================
    // CMG-01C3
    // Alimentador de apoio
    // =====================================================



    {


        id:"CC004",


        nome:"Indústria Polo Camaragibe",


        tipo:"GRUPO_A",


        prioridade:3,


        alimentador:"CMG-01C3",


        trecho:"T008",


        poste:"P223002",


        cargaEstimada:120,


        telefoneOperacao:"N/A",


        observacao:

        "Cliente especial - impacto econômico elevado"



    },



    {


        id:"CC005",


        nome:"Escola Municipal Camaragibe",


        tipo:"ESCOLA",


        prioridade:4,


        alimentador:"CMG-01C3",


        trecho:"T008",


        poste:"P223002",


        cargaEstimada:30,


        telefoneOperacao:"N/A",


        observacao:

        "Consumidor prioritário"



    }


];
