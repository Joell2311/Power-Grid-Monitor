// ======================================================
// EQUIPAMENTOS DA REDE ELÉTRICA
// COI Monitor
//
// Cadastro centralizado de equipamentos
// ======================================================

export const equipamentos = [

    {
        // IDENTIFICAÇÃO

        id: "REC-001",

        codigo: "REC-001",

        plaqueta: "A25577",

        pt: "P123456",

        nome: "Religador Interligação CMG-01C4 / CMG-01C3",

        tipo: "Religador de Interligação",


        // LOCALIZAÇÃO NA REDE

        subestacao: "CMG",

        alimentador: "CMG-01C4",

        trecho: "T002",


        // ESTADO OPERACIONAL

        status: "LIGADO",


        // COMANDO

        telecomandado: true,

        comando: "Remoto",


        // CAPACIDADE

        capacidade: 350,


        // INTERLIGAÇÃO

        interligacao: true,

        alimentadorDestino: "CMG-01C3",


        // LOCALIZAÇÃO GEOGRÁFICA

        localizacao: {

            latitude: -8.0250,

            longitude: -34.9800

        }

    }

];