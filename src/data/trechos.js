export const trechos = [

  {
    id: "T001",

    alimentador: "CMG-01C3",

    origem: "P123460",

    destino: "P123461",

    cabo: "150 mm²",

    capacidade: 350,

    comprimento: 420,

    correnteAtual: 120,

    clientes: 820,

    hospitais: 0,

    escolas: 1,

    grupoA: 1,

    telecomandado: true,

    status: "Energizado",

    proximoTrecho: "T002",

    trechoAnterior: null,

    interligacao: false
  },

  {
    id: "T002",

    alimentador: "CMG-01C3",

    origem: "P123461",

    destino: "P123462",

    cabo: "70 mm²",

    capacidade: 150,

    comprimento: 310,

    correnteAtual: 95,

    clientes: 650,

    hospitais: 1,

    escolas: 0,

    grupoA: 0,

    telecomandado: false,

    status: "Energizado",

    trechoAnterior: "T001",

    proximoTrecho: "T003",

    interligacao: true,

    equipamentoInterligacao: "A5577",

    alimentadorDestino: "CMG-01C4"
  },

  {
    id: "T003",

    alimentador: "CMG-01C3",

    origem: "P123462",

    destino: "P123463",

    cabo: "35 mm²",

    capacidade: 100,

    comprimento: 180,

    correnteAtual: 70,

    clientes: 210,

    hospitais: 0,

    escolas: 0,

    grupoA: 0,

    telecomandado: false,

    status: "Energizado",

    trechoAnterior: "T002",

    proximoTrecho: null,

    interligacao: false
  },

  {
    id: "T004",

    alimentador: "CMG-01C4",

    origem: "P123456",

    destino: "P123457",

    cabo: "150 mm²",

    capacidade: 350,

    comprimento: 500,

    correnteAtual: 180,

    clientes: 3567,

    hospitais: 1,

    escolas: 2,

    grupoA: 2,

    telecomandado: true,

    status: "Energizado",

    trechoAnterior: null,

    proximoTrecho: null,

    interligacao: true,

    equipamentoInterligacao: "A5577",

    alimentadorDestino: "CMG-01C3"
  }

];