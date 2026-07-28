const ocorrencias = [

  {
    id:1,

    status:"ATIVA",

    prioridade:"ALTA",

    subestacao:"CMG - Camaragibe",

    alimentador:"CMG-01C4",

    equipamento:"Religador R04",

    horario:"19:42:15",

    causa:"Falha em rede de média tensão",

    impacto:{
      clientesAfetados:3567,
      hospitais:1,
      escolas:2,
      decEstimado:"12 min"
    },


    manobra:{
      alternativa:"CMG-01C3",
      correnteAtual:180,
      correnteTransferida:200,
      capacidadeTrecho:350,
      bitola:"150 mm"
    },


    equipeCampo:{
      equipe:"Equipe 04",
      status:"Deslocando",
      tempoChegada:"08 min"
    },


    localizacao:{
      latitude:-8.0235,
      longitude:-34.9782
    }

  },



  {

    id:2,

    status:"ATIVA",

    prioridade:"MÉDIA",

    subestacao:"CMG - Camaragibe",

    alimentador:"CMG-01C2",

    equipamento:"Religador R02",

    horario:"19:48:20",

    causa:"Atuação proteção sobrecorrente",


    impacto:{
      clientesAfetados:1350,
      hospitais:0,
      escolas:1,
      decEstimado:"06 min"
    },


    manobra:{
      alternativa:"CMG-01C1",
      correnteAtual:90,
      correnteTransferida:80,
      capacidadeTrecho:300,
      bitola:"95 mm"
    },


    equipeCampo:{
      equipe:"Equipe 02",
      status:"Aguardando despacho",
      tempoChegada:"15 min"
    },


    localizacao:{
      latitude:-8.0210,
      longitude:-34.9850
    }

  },



  {

    id:3,

    status:"ATIVA",

    prioridade:"CRÍTICA",

    subestacao:"CMG - Camaragibe",

    alimentador:"CMG-01C6",

    equipamento:"Chave MT",

    horario:"19:51:40",

    causa:"Defeito em cabo subterrâneo",


    impacto:{
      clientesAfetados:875,
      hospitais:1,
      escolas:0,
      decEstimado:"15 min"
    },


    manobra:{
      alternativa:"CMG-01C5",
      correnteAtual:120,
      correnteTransferida:100,
      capacidadeTrecho:250,
      bitola:"70 mm"
    },


    equipeCampo:{
      equipe:"Equipe 01",
      status:"Em atendimento",
      tempoChegada:"05 min"
    },


    localizacao:{
      latitude:-8.0260,
      longitude:-34.9800
    }

  }

];


export default ocorrencias;