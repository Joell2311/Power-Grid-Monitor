export const equipamentos = [

  {
    id: "REC-001",

    plaqueta: "A5577",

    pt: "P123456",

    alimentador: "CMG-01C4",

    tipo: "Religador de Interligação",

    nome: "Religador Interligação CMG-01C4 / CMG-01C3",


    interligacao: true,

    alimentadorDestino: "CMG-01C3",


    coordenadas: [-8.0250, -34.9800],


    status: "Fechado",

    estadoOperacional: "Fechado",

    comando: "Remoto",

    bloqueado: false,

    disponivelManobra: true,


    telecomandado: true,


    corrente: 180,

    capacidade: 350
  },



  {
    id: "CHV-001",

    plaqueta: "B0412",

    pt: "P123457",

    alimentador: "CMG-01C4",


    tipo: "Chave Telecomandada",

    nome: "CH-041",


    interligacao: false,

    alimentadorDestino: null,


    coordenadas: [-8.0270, -8.9830],


    status: "Fechada",

    estadoOperacional: "Fechada",

    comando: "Remoto",

    bloqueado: false,

    disponivelManobra: true,


    telecomandada: true,


    corrente: 175,

    capacidade: 300
  },



  {
    id: "PQT-00001",

    pt: "P123458",


    alimentador: "CMG-01C4",


    tipo: "PQT",

    nome: "PQT-00001",


    interligacao: false,

    alimentadorDestino: null,


    coordenadas: [-8.0290, -34.9860],


    status: "Energizado",

    estadoOperacional: "Energizado",

    comando: "Local",

    bloqueado: false,

    disponivelManobra: false,


    telecomandado: false
  },



  {
    id: "CHV-002",

    plaqueta: "C0315",

    pt: "P123459",


    alimentador: "CMG-01C3",


    tipo: "Chave Manual",


    nome: "CH-315",


    interligacao: false,

    alimentadorDestino: null,


    coordenadas: [-8.0215, -34.9755],


    status: "Fechada",

    estadoOperacional: "Fechada",

    comando: "Local",

    bloqueado: false,

    disponivelManobra: false,


    telecomandada: false,


    corrente: 120,

    capacidade: 250
  },



  {
    id: "REC-002",

    plaqueta: "A0303",

    pt: "P123460",


    alimentador: "CMG-01C3",


    tipo: "Religador",

    nome: "Religador R03",


    interligacao: false,

    alimentadorDestino: null,


    coordenadas: [-8.0190, -34.9735],


    status: "Fechado",

    estadoOperacional: "Fechado",

    comando: "Remoto",

    bloqueado: false,

    disponivelManobra: true,


    telecomandado: true,


    corrente: 120,

    capacidade: 300
  }

];