export const subestacoes = [
  {
    id: 1,

    // ==========================
    // IDENTIFICAÇÃO
    // ==========================

    codigo: "CMG",
    nome: "Subestação Camaragibe",
    sigla: "CMG",

    concessionaria: "Neoenergia Pernambuco",
    regional: "Metropolitana",

    // ==========================
    // LOCALIZAÇÃO
    // ==========================

    localizacao: {
      latitude: -8.0238,
      longitude: -34.9781,
      municipio: "Camaragibe",
      estado: "PE",
    },

    // ==========================
    // DADOS ELÉTRICOS
    // ==========================

    tensao: {
      primaria: 69,
      secundaria: 13.8,
      unidade: "kV",
    },

    // ==========================
    // INFRAESTRUTURA
    // ==========================

    infraestrutura: {
      transformadoresPotencia: 2,
      barramentos: 2,
      bancosCapacitores: 2,
      reguladores: 1,
    },
  },
];