const ocorrencias = [

{
    id:"OC001",

    alimentador:"CMG-01C4",

    equipamento:"A5577",

    causa:"Falha no trecho de rede",

    prioridade:"ALTA",

    coordenadas:[
        -8.0250,
        -34.9800
    ],


    manobra:{

        correnteAtual:200

    },


    impacto:{

        clientesAfetados:3567,

        consumidoresPrioritarios:{

            hospitais:1,

            grupoA:2,

            escolas:2

        },

        hospitais:1,

        grupoA:2,

        escolas:2,

        decEstimado:"8 min"

    },


    status:"Ativa"

},



{
    id:"OC002",

    alimentador:"CMG-01C3",

    equipamento:"REC-002",

    causa:"Atuação de proteção do religador",

    prioridade:"MÉDIA",

    coordenadas:[
        -8.0190,
        -34.9735
    ],


    manobra:{

        correnteAtual:120

    },


    impacto:{


        clientesAfetados:820,


        consumidoresPrioritarios:{

            hospitais:0,

            grupoA:1,

            escolas:1

        },


        hospitais:0,

        grupoA:1,

        escolas:1,


        decEstimado:"5 min"

    },


    status:"Ativa"

},




{
    id:"OC003",

    alimentador:"CMG-01C2",

    equipamento:"REC-003",

    causa:"Defeito permanente em rede aérea",

    prioridade:"BAIXA",

    coordenadas:[
        -8.0310,
        -34.9780
    ],


    manobra:{

        correnteAtual:150

    },


    impacto:{


        clientesAfetados:1350,


        consumidoresPrioritarios:{

            hospitais:0,

            grupoA:0,

            escolas:2

        },


        hospitais:0,

        grupoA:0,

        escolas:2,


        decEstimado:"12 min"

    },


    status:"Ativa"

},




{
    id:"OC004",

    alimentador:"CMG-01C6",

    equipamento:"CHV-006",

    causa:"Falha de chave de proteção",

    prioridade:"CRÍTICA",

    coordenadas:[
        -8.0360,
        -34.9820
    ],


    manobra:{

        correnteAtual:80

    },


    impacto:{


        clientesAfetados:875,


        consumidoresPrioritarios:{

            hospitais:1,

            grupoA:0,

            escolas:0

        },


        hospitais:1,

        grupoA:0,

        escolas:0,


        decEstimado:"15 min"

    },


    status:"Ativa"

}


];


export default ocorrencias;