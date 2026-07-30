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

    cabo:"240 mm²",

    capacidade:500,

    comprimento:250,

    correnteAtual:180,

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

    status:"Energizado",

    estado:"Normal",

    coordenadas:[
      [-8.0225,-34.9770],
      [-8.0250,-34.9800]
    ],

    conectadoCom:["T002"],

    interligacao:false

  },



  {

    id:"T002",

    alimentador:"CMG-01C4",

    origem:"P123456",

    destino:"P123457",

    trechoAnterior:"T001",

    cabo:"150 mm²",

    capacidade:350,

    comprimento:420,

    correnteAtual:180,

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

    status:"Energizado",

    estado:"Normal",

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

    equipamentoInterligacao:"A5577",

    alimentadorDestino:"CMG-01C3"

  },



  {

    id:"T003",

    alimentador:"CMG-01C4",

    origem:"P123457",

    destino:"P123458",

    trechoAnterior:"T002",

    cabo:"95 mm²",

    capacidade:250,

    comprimento:310,

    correnteAtual:170,

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

    status:"Energizado",

    estado:"Normal",

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

    cabo:"70 mm²",

    capacidade:150,

    comprimento:260,

    correnteAtual:120,

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

    status:"Energizado",

    estado:"Normal",

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

    cabo:"35 mm²",

    capacidade:100,

    comprimento:180,

    correnteAtual:70,

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

    status:"Energizado",

    estado:"Normal",

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

    cabo:"35 mm²",

    capacidade:100,

    comprimento:220,

    correnteAtual:45,

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

    status:"Energizado",

    estado:"Normal",

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

    cabo:"120 mm²",

    capacidade:300,

    comprimento:350,

    correnteAtual:90,

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

    status:"Energizado",

    estado:"Normal",

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

    cabo:"150 mm²",

    capacidade:350,

    comprimento:400,

    correnteAtual:100,

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

    status:"Energizado",

    estado:"Normal",

    coordenadas:[
      [-8.0285,-34.9785],
      [-8.0300,-34.9750]
    ],

    conectadoCom:[
      "T002"
    ],

    interligacao:true,

    equipamentoInterligacao:"A5577",

    alimentadorDestino:"CMG-01C4"

  }

];