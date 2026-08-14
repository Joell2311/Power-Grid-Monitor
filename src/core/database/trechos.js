export const trechos = [


  // =====================================================
  // ALIMENTADOR CMG-01C4
  // =====================================================


  

  {

    id:"T001",

    alimentador:"CMG-01C4",

    origem:"SE-CMG",

    destino:"P123456",

    trechoAnterior:null,


    bitola:"240 mm²",

    capacidade:500,

    comprimento:250,


    correnteNominal:180,

    correnteEmergencia:null,


    clientes:3567,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:0,
      grupoA:0,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:true,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0225,-34.9770],
      [-8.0250,-34.9800]

    ],


    conectadoCom:[

      "T002"

    ],


    interligacao:false


  },



  {


    id:"T002",

    alimentador:"CMG-01C4",

    origem:"P123456",

    destino:"P123457",

    trechoAnterior:"T001",


    bitola:"150 mm²",

    capacidade:350,

    comprimento:420,


    correnteNominal:180,

    correnteEmergencia:null,


    clientes:2200,


    consumidoresPrioritarios:{

      hospitais:1,
      escolas:0,
      grupoA:1,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:true,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0250,-34.9800],
      [-8.0270,-34.9830]

    ],


    conectadoCom:[

      "T001",
      "T003",
      "T008"

    ],


    interligacao:true,


    equipamentoInterligacao:"A25577",

    tipoEquipamento:"RELIGADOR",


    alimentadorDestino:"CMG-01C3"


  },



  {


    id:"T003",

    alimentador:"CMG-01C4",

    origem:"P123457",

    destino:"P123458",

    trechoAnterior:"T002",


    bitola:"95 mm²",

    capacidade:250,

    comprimento:310,


    correnteNominal:170,

    correnteEmergencia:null,


    clientes:980,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:2,
      grupoA:0,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:false,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0270,-34.9830],
      [-8.0290,-34.9860]

    ],


    conectadoCom:[

      "T002",
      "T004"

    ],


    interligacao:false


  },



  {


    id:"T004",

    alimentador:"CMG-01C4",

    origem:"P123458",

    destino:"P123470",

    trechoAnterior:"T003",


    bitola:"70 mm²",

    capacidade:150,

    comprimento:260,


    correnteNominal:120,

    correnteEmergencia:null,


    clientes:387,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:0,
      grupoA:1,
      saneamento:0,
      telecom:1,
      bombeiros:0

    },


    telecomandado:false,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0290,-34.9860],
      [-8.0310,-34.9880]

    ],


    conectadoCom:[

      "T003",
      "T005"

    ],


    interligacao:false


  },



  {


    id:"T005",

    alimentador:"CMG-01C4",

    origem:"P123470",

    destino:"P123471",

    trechoAnterior:"T004",


    bitola:"35 mm²",

    capacidade:100,

    comprimento:180,


    correnteNominal:70,

    correnteEmergencia:null,


    clientes:120,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:0,
      grupoA:0,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:false,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0310,-34.9880],
      [-8.0330,-34.9895]

    ],


    conectadoCom:[

      "T004"

    ],


    interligacao:false


  },



  {


    id:"T006",

    alimentador:"CMG-01C4",

    origem:"P123471",

    destino:"P123472",

    trechoAnterior:"T005",


    bitola:"35 mm²",

    capacidade:100,

    comprimento:220,


    correnteNominal:45,

    correnteEmergencia:null,


    clientes:80,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:0,
      grupoA:0,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:false,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0330,-34.9895],
      [-8.0350,-34.9910]

    ],


    conectadoCom:[

      "T005"

    ],


    interligacao:false


  },



  {


    id:"T007",

    alimentador:"CMG-01C4",

    origem:"P123457",

    destino:"P223001",

    trechoAnterior:"T002",


    bitola:"120 mm²",

    capacidade:300,

    comprimento:350,


    correnteNominal:90,

    correnteEmergencia:null,


    clientes:650,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:0,
      grupoA:1,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:true,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0270,-34.9830],
      [-8.0285,-34.9785]

    ],


    conectadoCom:[

      "T002"

    ],


    interligacao:false


  },



  // =====================================================
  // INTERLIGAÇÃO CMG-01C4 x CMG-01C3
  // =====================================================



  {


    id:"T008",

    alimentador:"CMG-01C3",

    origem:"P223001",

    destino:"P223002",

    trechoAnterior:null,


    bitola:"150 mm²",

    capacidade:350,

    comprimento:400,


    correnteNominal:100,

    correnteEmergencia:null,


    clientes:1500,


    consumidoresPrioritarios:{

      hospitais:0,
      escolas:1,
      grupoA:1,
      saneamento:0,
      telecom:0,
      bombeiros:0

    },


    telecomandado:true,


    estadoRede:"NORMAL",


    coordenadas:[

      [-8.0285,-34.9785],
      [-8.0300,-34.9750]

    ],


    conectadoCom:[

      "T002"

    ],


    interligacao:true,


    equipamentoInterligacao:"A25577",

    tipoEquipamento:"RELIGADOR",


    alimentadorDestino:"CMG-01C4"


  }


];