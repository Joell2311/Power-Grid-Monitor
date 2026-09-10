export const ocorrencias = [
  {
    // ==========================
    // IDENTIFICAÇÃO
    // ==========================

    id: "OC001",

    // ==========================
    // REFERÊNCIAS DA REDE
    // ==========================

    subestacao: "CMG",
    alimentador: "CMG-01C4",
    trecho: "T002",
    equipamento: "A5577",

    // ==========================
    // EVENTO
    // ==========================

    tipo: "Desarme",

    causa: "Falha no trecho de rede",

    dataHora: null,

    // ==========================
    // LOCALIZAÇÃO
    // ==========================

    localizacao: {
      latitude: -8.0250,
      longitude: -34.9800,
    },

    // ==========================
    // DADOS DA OCORRÊNCIA
    // ==========================

    manobra: {
      correnteNoMomento: 200,
    },

    // ==========================
    // SITUAÇÃO
    // ==========================

    status: "ATIVA",
  },

  {
    id: "OC002",

    subestacao: "CMG",
    alimentador: "CMG-01C3",
    trecho: "T008",
    equipamento: "REC-002",

    tipo: "Desarme",

    causa: "Atuação de proteção do religador",

    dataHora: null,

    localizacao: {
      latitude: -8.0190,
      longitude: -34.9735,
    },

    manobra: {
      correnteNoMomento: 120,
    },

    status: "ATIVA",
  },

  {
    id: "OC003",

    subestacao: "CMG",
    alimentador: "CMG-01C2",
    trecho: null,
    equipamento: "REC-003",

    tipo: "Defeito Permanente",

    causa: "Defeito permanente em rede aérea",

    dataHora: null,

    localizacao: {
      latitude: -8.0310,
      longitude: -34.9780,
    },

    manobra: {
      correnteNoMomento: 150,
    },

    status: "ATIVA",
  },

  {
    id: "OC004",

    subestacao: "CMG",
    alimentador: "CMG-01C6",
    trecho: null,
    equipamento: "CHV-006",

    tipo: "Falha de Equipamento",

    causa: "Falha de chave de proteção",

    dataHora: null,

    localizacao: {
      latitude: -8.0360,
      longitude: -34.9820,
    },

    manobra: {
      correnteNoMomento: 80,
    },

    status: "ATIVA",
  },
];

export default ocorrencias;