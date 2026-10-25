// ==========================================================
// MODELO DE TOPOLOGIA BDGD
// POWER GRID MONITOR
// ==========================================================
//
// FONTES:
//
// SSDMT
//   -> trechos da rede MT
//
// PONNOT
//   -> pontos/conexões da rede
//
// UNSEMT
//   -> unidades 
seccionadoras/equipamentos de manobra
//
// EQSE
//   -> dados complementares associados à UNSEMT
//
// UNTRMT
//   -> unidades de transformadores MT
//
// EQTRMT
//   -> dados complementares de transformadores MT
//
// UNTRAT
//   -> unidades de transformadores AT
//
// EQTRAT
//   -> dados complementares de transformadores AT
//
// ==========================================================
// CLASSIFICAÇÃO OFICIAL
// ==========================================================
//
// UNSEMT.TIP_UNID
//
// 19 -> CHAVE_LAMINA
// 22 -> CHAVE_FUSIVEL
// 32 -> RELIGADOR
// 34 -> CHAVE_SECCIONADORA
//
// UNTRMT.TIP_UNID
//
// 38 -> TRANSFORMADOR
//
// ==========================================================
// REGRAS IMPORTANTES
// ==========================================================
//
// 1. TIP_UNID da UNSEMT é a autoridade para classificação.
// 2. EQSE é complementar e não substitui TIP_UNID.
// 3. UNTRMT.TIP_UNID=38 classifica TRANSFORMADOR.
// 4. PACs são normalizados sem criar pontos sintéticos.
// 5. PONNOT real é a referência física preferencial.
// 6. Quando houver PAC_1/PAC_2, eles são preservados.
// 7. Quando houver PONNOT associado ao PAC, suas coordenadas
//    têm prioridade sobre a geometria própria da UNSEMT.
// 8. Cada equipamento derivado da UNSEMT recebe a mesma
//    referência física da unidade:
//       PAC_1
//       PAC_2
//       ponto1
//       ponto2
//       pontoAssociado
//       coordenadas
//       latitude
//       longitude
// 9. Interligações oficiais são 
obtidas por cruzamento de PAC
//    entre circuitos/alimentadores.
// 10. Cada interligação preserva os dois lados:
//       unidadeA / equipamentoA
//       unidadeB / equipamentoB
// 11. Quando houver PONNOT e UNSEMT no mesmo PAC, a UNSEMT
//     possui prioridade para representar o equipamento do lado.
// 12. Alimentador 151..156 é convertido para CMG01C1..C6.
// 13. Circuito 151..156 é preservado separadamente.
// 14. A topologia não cria dados elétricos fictícios.
// 15. EQSE/TUC/DESCR não substituem TIP_UNID.
// 16. Não são criados PONNOT sintéticos.
//
// ==========================================================


// ==========================================================
// NORMALIZAÇÃO
// ==========================================================

function normalizarId(valor) {
  if (
    valor === null 
||
    valor === undefined
  ) {
    return null;
  }

  const id =
    String(valor).trim();

  return id || null;
}


// ==========================================================
// NORMALIZAÇÃO DE NÚMERO
// 
==========================================================

function normalizarNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  let texto =
    String(valor).trim();

  if (!texto) {
    return null;
  
}

  texto =
    texto.replace(",", ".");

  const numero =
    Number(texto);

  return Number.isFinite(numero)
    ? numero
    : null;
}


// ==========================================================
// NORMALIZAÇÃO DE TEXTO
// 
==========================================================

function normalizarTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase();
}


// 
==========================================================
// CIRCUITO
// ==========================================================

function normalizarCircuito(valor) {
  const texto =
    normalizarId(valor);

  if (!texto) {
    return null;
  }

  const match =
    texto.match(
      
/(\d{2,6})(?:[A-Z]*)$/i
    );

  return (
    match?.[1] ||
    texto
  );
}


// ==========================================================
// EXTRAIR CIRCUITO DO ID DO PAC
// ==========================================================

function 
extrairCircuitoDoIdPAC(valor) {
  const texto =
    normalizarId(valor);

  if (!texto) {
    return null;
  }

  const match =
    texto.match(
      /-(\d{2,6})[A-Z]*$/i
    );

  return (
    match?.[1] ||
    null
  );
}


// ==========================================================
// NORMALIZAR PONTO ASSOCIADO
// ==========================================================
//
// Exemplos:
//
// 10060794M
// 10060794M-154
// 10060794
//
// Resultado esperado:
//
// 10060794
//
// Não cria nenhum ponto.
// Apenas normaliza a referência.
//
// ==========================================================

function normalizarIdPontoAssociado(valor) {
  const texto =
    normalizarId(valor);

  if (!texto) {
    return null;
  
}

  const match =
    texto.match(
      /^(.*?)M(?:-[^-\s]+)?$/i
    );

  if (match?.[1]) {
    return normalizarId(
      match[1]
    );
  }

  return texto;
}


// 
==========================================================
// BASE PAC
// ==========================================================

function normalizarIdBasePAC(valor) {
  return normalizarIdPontoAssociado(
    valor
  );
}


// 
==========================================================
// CIRCUITO -> ALIMENTADOR
// ==========================================================

function mapearCircuitoParaAlimentador(
  circuito
) {
  const c =
    normalizarCircuito(
      circuito
    );

  if (!c) {
    return null;
  
}

  const mapaFixo = {
    "151": "CMG01C1",
    "152": "CMG01C2",
    "153": "CMG01C3",
    "154": "CMG01C4",
    "155": "CMG01C5",
    "156": "CMG01C6",
  };

  return (
    mapaFixo[c] ||
    null
  );
}


// 
==========================================================
// NORMALIZAR ALIMENTADOR
// ==========================================================

function normalizarAlimentador(
  valor,
  circuito = null
) {
  const texto =
    normalizarId(valor);

  if (texto) {
    const normalizado =
      normalizarTexto(
        texto
      
);

    if (
      /^CMG01C[1-6]$/.test(
        normalizado
      )
    ) {
      return normalizado;
    }

    const porCircuito =
      mapearCircuitoParaAlimentador(
        normalizado
      );

    if (porCircuito) {
      return porCircuito;
    
}
  }

  return mapearCircuitoParaAlimentador(
    circuito
  );
}


// ==========================================================
// ÍNDICE DE ALIMENTADORES
// ==========================================================

function 
criarIndiceAlimentadores(
  trechos
) {
  const indice = {};

  for (
    const trecho of
    Object.values(
      trechos || {}
    )
  ) {
    const circuito =
      normalizarCircuito(
        trecho?.circuito
      );

    const alimentador =
      normalizarAlimentador(
        
trecho?.alimentador,
        circuito
      );

    if (!alimentador) {
      continue;
    }

    if (!indice[alimentador]) {
      indice[alimentador] = {
        id:
          alimentador,

        alimentador,

        circuito:
          circuito ||
          null,

        trechos:
          [],

        pontos:
          new Set(),

        quantidadeTrechos:
          0,
      };
    }

    const item =
      indice[
        alimentador
      ];

    item.trechos.push(
      
trecho.id
    );

    item.quantidadeTrechos +=
      1;

    if (trecho.pontoInicial) {
      item.pontos.add(
        trecho.pontoInicial
      );
    }

    if (trecho.pontoFinal) {
      item.pontos.add(
        trecho.pontoFinal
      );
    }

    if 
(
      !item.circuito &&
      circuito
    ) {
      item.circuito =
        circuito;
    }
  }

  for (
    const item of
    Object.values(
      indice
    )
  ) {
    item.pontos =
      [
        ...item.pontos,
      
];

    item.quantidadePontos =
      item.pontos.length;
  }

  return indice;
}


// ==========================================================
// MAPA CIRCUITO -> ALIMENTADOR
// ==========================================================

function criarMapaCircuitoAlimentador(
  indiceAlimentadores
) {
  const mapa = {};

  for (
    const item of
    Object.values(
      indiceAlimentadores ||
      {}
    )
  ) {
    const circuito =
      normalizarCircuito(
        item?.circuito
      );

    if (!circuito) {
      continue;
    }

    mapa[circuito] =
      item.alimentador ||
      mapearCircuitoParaAlimentador(
        circuito
      ) ||
      null;
  }

  for (
    const circuito of [
      "151",
      "152",
      
"153",
      "154",
      "155",
      "156",
    ]
  ) {
    if (!mapa[circuito]) {
      mapa[circuito] =
        mapearCircuitoParaAlimentador(
          circuito
        );
    }
  }

  return mapa;
}


// ==========================================================
// ÍNDICE DE PONTOS POR ALIMENTADOR
// ==========================================================

function criarIndicePontosPorAlimentador(
  trechos
) {
  const indice = {};

  for (
    const trecho of
    
Object.values(
      trechos || {}
    )
  ) {
    const circuito =
      normalizarCircuito(
        trecho?.circuito
      );

    const alimentador =
      normalizarAlimentador(
        trecho?.alimentador,
        circuito
      );

    if (!alimentador) {
      continue;
    }

    if (!indice[alimentador]) {
      indice[alimentador] =
        new Set();
    }

    if (trecho.pontoInicial) {
      indice[
        alimentador
      ].add(
        trecho.pontoInicial
      );
    }

    if (trecho.pontoFinal) {
      indice[
        alimentador
      ].add(
        
trecho.pontoFinal
      );
    }
  }

  const resultado = {};

  for (
    const [
      alimentador,
      pontos,
    ] of Object.entries(
      indice
    )
  ) {
    resultado[
      alimentador
    ] =
      
[
        ...pontos,
      ];
  }

  return resultado;
}


// ==========================================================
// ÍNDICE DE PONTOS NORMALIZADOS
// ==========================================================

function 
criarIndicePontosNormalizados(
  pontos
) {
  const indice = {};

  for (
    const [
      idExato,
    ] of Object.entries(
      pontos || {}
    )
  ) {
    const base =
      normalizarIdBasePAC(
        idExato
      ) ||
      idExato;

    if (!indice[base]) 
{
      indice[base] =
        [];
    }

    if (
      !indice[base].includes(
        idExato
      )
    ) {
      indice[base].push(
        idExato
      );
    }
  }

  return indice;
}


// ==========================================================
// DESCOBRIR INTERLIGAÇÕES
// ==========================================================

function descobrirInterligacoes(
  unsemt,
  pontos,
  indiceAlimentadores,
  mapaCircuitoAlimentador
) {
  const registros =
    [];

  const porPontoBase =
    {};

  // ========================================================
  // PONNOT
  // ========================================================

  for (
    const ponto of
    Object.values(
      pontos || {}
    )
  ) {
    const pontoOriginal 
=
      normalizarId(
        ponto?.id
      );

    const baseId =
      normalizarIdBasePAC(
        pontoOriginal
      );

    const circuitoPAC =
      normalizarCircuito(
        ponto?.circuito
      ) ||
      extrairCircuitoDoIdPAC(
        pontoOriginal
      );

    const alimentadorPAC 
=
      normalizarAlimentador(
        ponto?.alimentador,
        circuitoPAC
      ) ||
      mapaCircuitoAlimentador?.[
        circuitoPAC
      ] ||
      null;

    if (
      !baseId ||
      !alimentadorPAC
    ) {
      continue;
    }

    const registro = {
      
unidadeId:
        null,

      lado:
        "PONNOT",

      pacOriginal:
        pontoOriginal,

      pontoId:
        baseId,

      circuito:
        circuitoPAC,

      alimentador:
        alimentadorPAC,

      
subestacao:
        normalizarId(
          ponto?.propriedades?.SUB
        ) ||
        null,

      tipoUnidade:
        null,

      feature:
        ponto,
    };

    if (
      !porPontoBase[
        baseId
      ]
    ) {
      
porPontoBase[
        baseId
      ] = [];
    }

    porPontoBase[
      baseId
    ].push(
      registro
    );
  }

  // ========================================================
  // UNSEMT
  // 
========================================================

  for (
    const feature of
    unsemt?.features ||
    []
  ) {
    const p =
      feature?.properties ||
      {};

    const unidadeId =
      normalizarId(
        p.COD_ID
      );

    if (!unidadeId) {
      
continue;
    }

    const pacs = [
      {
        lado:
          "PAC_1",

        valor:
          normalizarId(
            p.PAC_1
          ),
      },

      {
        lado:
          "PAC_2",

        
valor:
          normalizarId(
            p.PAC_2
          ),
      },
    ].filter(
      (
        item
      ) =>
        item.valor
    );

    for (
      const pac of
      pacs
    ) {
      const baseId =
        normalizarIdBasePAC(
          
pac.valor
        );

      const circuitoPAC =
        extrairCircuitoDoIdPAC(
          pac.valor
        ) ||
        normalizarCircuito(
          p.CTMT
        );

      const alimentadorPAC =
        normalizarAlimentador(
          p.ALIMENTADOR ??
          p.alimentador ??
          p.CT_COD_OP,
          circuitoPAC
        ) ||
        
mapaCircuitoAlimentador?.[
          circuitoPAC
        ] ||
        null;

      if (
        !baseId ||
        !alimentadorPAC
      ) {
        continue;
      }

      const registro = {
        unidadeId,

        lado:
          pac.lado,

        
pacOriginal:
          pac.valor,

        pontoId:
          baseId,

        circuito:
          circuitoPAC,

        alimentador:
          alimentadorPAC,

        subestacao:
          normalizarId(
            p.SUB
          ) ||
          null,

        
tipoUnidade:
          normalizarId(
            p.TIP_UNID
          ) ||
          null,

        feature,
      };

      registros.push(
        registro
      );

      if (
        !porPontoBase[
          baseId
        ]
      ) {
        
porPontoBase[
          baseId
        ] =
          [];
      }

      porPontoBase[
        baseId
      ].push(
        registro
      );
    }
  }

  // ========================================================
  // SELECIONAR MELHOR REGISTRO DO 
LADO
  // ========================================================

  function selecionarRegistroDoLado(
    lista = []
  ) {
    const candidatos =
      Array.isArray(
        lista
      )
        ? lista
        : [];

    const unsemtComUnidade =
      candidatos.find(
        
(
          registro
        ) =>
          registro?.unidadeId &&
          registro?.lado !==
            "PONNOT"
      );

    if (
      unsemtComUnidade
    ) {
      return unsemtComUnidade;
    }

    const qualquerUnidade =
      candidatos.find(
        (
          registro
        ) 
=>
          registro?.unidadeId
      );

    if (
      qualquerUnidade
    ) {
      return qualquerUnidade;
    }

    return (
      candidatos[0] ||
      null
    );
  }

  // 
========================================================
  // FORMAÇÃO DOS ELOS
  // ========================================================

  const interligacoes =
    [];

  const chaves =
    new Set();

  for (
    const [
      pontoId,
      registrosPonto,
    ] of Object.entries(
      
porPontoBase
    )
  ) {
    const grupos =
      {};

    for (
      const registro of
      registrosPonto
    ) {
      const alimentador =
        registro.alimentador;

      if (!alimentador) {
        continue;
      }

      if (
        
!grupos[
          alimentador
        ]
      ) {
        grupos[
          alimentador
        ] =
          [];
      }

      grupos[
        alimentador
      ].push(
        registro
      );
    }

    const alimentadores =
      
Object.keys(
        grupos
      );

    if (
      alimentadores.length <
      2
    ) {
      continue;
    }

    for (
      let i = 0;
      i <
      alimentadores.length;
      i += 1
    ) {
      for (
        let j 
=
          i + 1;
        j <
        alimentadores.length;
        j += 1
      ) {
        const alimentadorA =
          alimentadores[i];

        const alimentadorB =
          alimentadores[j];

        const a =
          selecionarRegistroDoLado(
            grupos[
              alimentadorA
            ]
          );

        const b =
          selecionarRegistroDoLado(
            grupos[
              alimentadorB
            ]
          );

        if (
          !a ||
          !b
        ) {
          continue;
        }

        // --------------------------------------------------
        // Não criar elo baseado somente em 
PONNOT
        // --------------------------------------------------

        if (
          !a.unidadeId &&
          !b.unidadeId
        ) {
          continue;
        }

        const chave =
          [
            pontoId,
            alimentadorA,
            alimentadorB,
          ]
            .sort()
            
.join("|");

        if (
          chaves.has(
            chave
          )
        ) {
          continue;
        }

        chaves.add(
          chave
        );

        const circuitoA =
          normalizarCircuito(
            a.circuito
          ) ||
          
null;

        const circuitoB =
          normalizarCircuito(
            b.circuito
          ) ||
          null;

        const equipamentoIdA =
          normalizarId(
            a.unidadeId
          );

        const equipamentoIdB =
          normalizarId(
            b.unidadeId
          );

        
interligacoes.push({
          id:
            `IL-${interligacoes.length + 1}`,

          tipo:
            "INTERLIGACAO_BDGD",

          pontoId,

          pontoBase:
            pontoId,

          // ------------------------------------------------
          // LADO A
          // ------------------------------------------------

          alimentadorA,

          circuitoA,

          unidadeA:
            equipamentoIdA,

          equipamentoIdA,

          pacA:
            a.pacOriginal,

          pacBaseA:
            normalizarIdBasePAC(
              a.pacOriginal
            ),

          
subestacaoA:
            a.subestacao ||
            null,

          // ------------------------------------------------
          // LADO B
          // ------------------------------------------------

          alimentadorB,

          circuitoB,

          unidadeB:
            equipamentoIdB,

          equipamentoIdB,

          pacB:
            b.pacOriginal,

          pacBaseB:
            normalizarIdBasePAC(
              b.pacOriginal
            ),

          subestacaoB:
            b.subestacao ||
            null,

          // ------------------------------------------------
          // REGISTROS ORIGINAIS
          // ------------------------------------------------

          registroA:
            a,

          registroB:
            b,

          // ------------------------------------------------
          // OBJETOS OPERACIONAIS
          // ------------------------------------------------

          equipamentoA:
            null,

          equipamentoB:
            null,

          equipamentoOrigem:
            null,

          equipamentoDestino:
            null,

          equipamentoIdOrigem:
            null,

          equipamentoIdDestino:
            null,

          tipoLadoOrigem:
            null,

          tipoLadoDestino:
            null,

          // ------------------------------------------------
          // ESTADO
          // ------------------------------------------------

          estado:
            null,

          origemEstado:
            "SEM_FONTE_DE_ESTADO",

          // ------------------------------------------------
          // ORIGEM DO REGISTRO
          // ------------------------------------------------

          origem:
            "PAC_CIRCUITO_CRUZADO",
        });
      }
    }
  }

  return interligacoes;
}


// ==========================================================
// ENRIQUECER INTERLIGAÇÕES COM UNSEMT
// 
==========================================================

function enriquecerInterligacoesComEquipamentos(
  interligacoes,
  unidadesSeccionadoras
) {
  const lista =
    Array.isArray(
      interligacoes
    )
      ? interligacoes
      : [];

  const unidades =
    unidadesSeccionadoras ||
    
{};

  return lista.map(
    (
      interligacao
    ) => {
      const unidadeA =
        normalizarId(
          interligacao?.unidadeA
        );

      const unidadeB =
        normalizarId(
          interligacao?.unidadeB
        );

      const equipamentoA =
        unidadeA &&
        
unidades?.[
          unidadeA
        ]
          ? unidades[
              unidadeA
            ]
          : null;

      const equipamentoB =
        unidadeB &&
        unidades?.[
          unidadeB
        ]
          ? unidades[
              unidadeB
            ]
          : null;

      const alimentadorOrigem 
=
        normalizarAlimentador(
          interligacao?.alimentadorOrigem
        );

      const alimentadorA =
        normalizarAlimentador(
          interligacao?.alimentadorA
        );

      const alimentadorB =
        normalizarAlimentador(
          interligacao?.alimentadorB
        );

      let ladoOrigem =
        null;

      if (
        alimentadorOrigem &&
        alimentadorOrigem ===
          alimentadorA
      ) {
        ladoOrigem =
          "A";
      } else if (
        alimentadorOrigem &&
        alimentadorOrigem ===
          alimentadorB
      ) {
        ladoOrigem =
          "B";
      }

      if (!ladoOrigem) {
        ladoOrigem 
=
          "A";
      }

      const equipamentoOrigem =
        ladoOrigem === "A"
          ? equipamentoA
          : equipamentoB;

      const equipamentoDestino =
        ladoOrigem === "A"
          ? equipamentoB
          : equipamentoA;

      const alimentadorOrigemFinal =
        ladoOrigem === "A"
          ? alimentadorA
          : alimentadorB;

      const alimentadorDestinoFinal =
        ladoOrigem === "A"
          ? alimentadorB
          : alimentadorA;

      const circuitoOrigem =
        ladoOrigem === "A"
          ? interligacao?.circuitoA
          : interligacao?.circuitoB;

      const circuitoDestino =
        ladoOrigem === "A"
          ? interligacao?.circuitoB
          : interligacao?.circuitoA;

      return {
        ...interligacao,

        equipamentoA,

        equipamentoB,

        equipamentoIdA:
          normalizarId(
            equipamentoA?.id
          ) ||
          unidadeA ||
          interligacao?.equipamentoIdA ||
          null,

        equipamentoIdB:
          normalizarId(
            equipamentoB?.id
          ) ||
          unidadeB 
||
          interligacao?.equipamentoIdB ||
          null,

        tipoEquipamentoA:
          equipamentoA?.tipoEquipamento ||
          equipamentoA?.tipoVisual ||
          null,

        tipoEquipamentoB:
          equipamentoB?.tipoEquipamento ||
          equipamentoB?.tipoVisual ||
          null,

        nomeTipoEquipamentoA:
          equipamentoA?.nomeTipoEquipamento ||
          null,

        nomeTipoEquipamentoB:
          equipamentoB?.nomeTipoEquipamento ||
          null,

        posicaoA:
          equipamentoA?.posicao ??
          null,

        posicaoB:
          equipamentoB?.posicao 
??
          null,

        situacaoA:
          equipamentoA?.situacao ??
          null,

        situacaoB:
          equipamentoB?.situacao ??
          null,

        telecomandadoA:
          Boolean(
            equipamentoA?.telecomandado
          ),

        telecomandadoB:
          
Boolean(
            equipamentoB?.telecomandado
          ),

        pac1A:
          equipamentoA?.pac1 ??
          null,

        pac2A:
          equipamentoA?.pac2 ??
          null,

        pac1B:
          equipamentoB?.pac1 ??
          null,

        pac2B:
          equipamentoB?.pac2 
??
          null,

        ladoOrigem,

        equipamentoOrigem,

        equipamentoDestino,

        equipamentoIdOrigem:
          normalizarId(
            equipamentoOrigem?.id
          ) ||
          null,

        equipamentoIdDestino:
          normalizarId(
            equipamentoDestino?.id
          ) 
||
          null,

        tipoLadoOrigem:
          equipamentoOrigem?.tipoEquipamento ||
          equipamentoOrigem?.tipoVisual ||
          null,

        tipoLadoDestino:
          equipamentoDestino?.tipoEquipamento ||
          equipamentoDestino?.tipoVisual ||
          null,

        alimentadorOrigem:
          alimentadorOrigemFinal ||
          null,

        alimentadorDestino:
          alimentadorDestinoFinal ||
          null,

        circuitoOrigem:
          circuitoOrigem ||
          null,

        circuitoDestino:
          circuitoDestino ||
          null,
      };
    }
  
);
}


// ==========================================================
// ÍNDICE DE INTERLIGAÇÕES
// ==========================================================

function criarIndiceInterligacoes(
  interligacoes
) {
  const porPonto =
    {};

  const porAlimentador 
=
    {};

  const entreAlimentadores =
    {};

  for (
    const interligacao of
    interligacoes || []
  ) {
    const pontoId =
      normalizarId(
        interligacao.pontoId
      );

    if (pontoId) {
      if (
        !porPonto[
          
pontoId
        ]
      ) {
        porPonto[
          pontoId
        ] =
          [];
      }

      porPonto[
        pontoId
      ].push(
        interligacao
      );
    }

    const alimentadores = [
      interligacao.alimentadorA,
      
interligacao.alimentadorB,
    ]
      .map(
        normalizarAlimentador
      )
      .filter(
        Boolean
      );

    for (
      const alimentador of
      alimentadores
    ) {
      if (
        !porAlimentador[
          alimentador
        ]
      ) {
        
porAlimentador[
          alimentador
        ] =
          [];
      }

      porAlimentador[
        alimentador
      ].push(
        interligacao
      );
    }

    const chaveAB =
      [
        interligacao.alimentadorA,
        interligacao.alimentadorB,
      ]
        
.map(
          normalizarAlimentador
        )
        .filter(
          Boolean
        )
        .sort()
        .join("|");

    if (chaveAB) {
      if (
        !entreAlimentadores[
          chaveAB
        ]
      ) {
        entreAlimentadores[
          chaveAB
        ] =
          
[];
      }

      entreAlimentadores[
        chaveAB
      ].push(
        interligacao
      );
    }
  }

  return {
    porPonto,
    porAlimentador,
    entreAlimentadores,
  };
}


// ==========================================================
// PRIMEIRO VALOR VÁLIDO
// ==========================================================

function obterPrimeiroValor(
  objeto,
  campos = []
) {
  if (
    !objeto ||
    typeof objeto !==
      "object"
  ) {
    return 
null;
  }

  for (
    const campo of
    campos
  ) {
    const valor =
      objeto?.[
        campo
      ];

    if (
      valor !== null &&
      valor !== undefined &&
      String(
        valor
      ).trim() !== ""
    ) 
{
      return valor;
    }
  }

  return null;
}


// ==========================================================
// EXTRAIR PROPRIEDADES
// ==========================================================

function extrairPropriedades(
  
item
) {
  if (!item) {
    return {};
  }

  if (
    item.properties &&
    typeof item.properties ===
      "object"
  ) {
    return item.properties;
  }

  return item;
}


// 
==========================================================
// CLASSIFICAÇÃO UNSEMT
// ==========================================================

function classificarUnidadeUNSEMT(
  propriedades
) {
  const p =
    extrairPropriedades(
      propriedades
    );

  const tipoUnidade =
    normalizarTexto(
      
p?.TIP_UNID
    );

  switch (
    tipoUnidade
  ) {
    case "19":
      return "CHAVE_LAMINA";

    case "22":
      return "CHAVE_FUSIVEL";

    case "32":
      return "RELIGADOR";

    case "34":
      return "CHAVE_SECCIONADORA";

    default:
      return "OUTRO";
  }
}


// ==========================================================
// CLASSIFICAÇÃO TRANSFORMADOR
// ==========================================================

function classificarUnidadeTransformador(
  
propriedades
) {
  const p =
    extrairPropriedades(
      propriedades
    );

  const tipoUnidade =
    normalizarTexto(
      p?.TIP_UNID
    );

  if (
    tipoUnidade ===
    "38"
  ) {
    return "TRANSFORMADOR";
  }

  return "OUTRO";
}


// ==========================================================
// NOME AMIGÁVEL
// ==========================================================

function obterNomeTipoEquipamento(
  tipo
) {
  switch (
    
normalizarTexto(
      tipo
    )
  ) {
    case "CHAVE_LAMINA":
      return "Chave lâmina";

    case "CHAVE_FUSIVEL":
      return "Chave fusível";

    case "CHAVE_SECCIONADORA":
      return "Chave seccionadora";

    case "RELIGADOR":
      return "Religador";

    case "TRANSFORMADOR":
      return "Transformador";

    case "REGULADOR":
      return "Regulador de tensão";

    case "CAPACITOR":
      return "Banco de capacitores";

    case "SUBESTACAO":
      return "Subestação";

    default:
      return "Equipamento";
  }
}


// 
==========================================================
// CLASSIFICAÇÃO EQSE
// ==========================================================
//
// IMPORTANTE:
//
// Esta função permanece apenas como informação
// complementar do EQSE.
//
// Ela NÃO deve substituir TIP_UNID.
//
// 
==========================================================

function classificarEquipamentoEQSE(
  equipamento
) {
  const p =
    extrairPropriedades(
      equipamento
    );

  const tipInst =
    normalizarTexto(
      p?.TIP_INST
    );

  const descricao =
    
normalizarTexto(
      p?.DESCR
    );

  const texto =
    `${tipInst} ${descricao}`;

  if (
    texto.includes(
      "TRANSFORMADOR"
    ) ||
    texto.includes(
      "TRAFO"
    )
  ) {
    return "TRANSFORMADOR";
  }

  if 
(
    texto.includes(
      "REGULADOR"
    )
  ) {
    return "REGULADOR";
  }

  if (
    texto.includes(
      "CAPACITOR"
    )
  ) {
    return "CAPACITOR";
  }

  if (
    texto.includes(
      
"RELIGADOR"
    ) ||
    texto.includes(
      "RECLOSER"
    )
  ) {
    return "RELIGADOR";
  }

  if (
    texto.includes(
      "SECCIONADORA"
    )
  ) {
    return "CHAVE_SECCIONADORA";
  }

  if (
    
texto.includes(
      "FUSIVEL"
    ) ||
    texto.includes(
      "FUSÍVEL"
    )
  ) {
    return "CHAVE_FUSIVEL";
  }

  if (
    texto.includes(
      "LAMINA"
    ) ||
    texto.includes(
      "LÂMINA"
    ) ||
    texto.includes(
      
"FACA"
    )
  ) {
    return "CHAVE_LAMINA";
  }

  return "EQUIPAMENTO";
}


// ==========================================================
// MAPA EQSE
// ==========================================================

function 
criarMapaEquipamentosEQSE(
  eqse
) {
  const equipamentos =
    {};

  const porUnidade =
    {};

  for (
    const feature of
    eqse?.features ||
    []
  ) {
    const p =
      feature?.properties ||
      {};

    const id 
=
      normalizarId(
        p.COD_ID
      );

    const unidadeId =
      normalizarId(
        p.UN_SE
      );

    if (!id) {
      continue;
    }

    const equipamento = {
      id,

      unidadeId,

      tipo:
        classificarEquipamentoEQSE(
          p
        ),

      tipoComplementar:
        classificarEquipamentoEQSE(
          p
        ),

      codId:
        id,

      unSe:
        unidadeId,

      tipoInstalacao:
        
normalizarId(
          p.TIP_INST
        ),

      tipoOriginal:
        normalizarId(
          p.TIP_INST
        ),

      tipInst:
        normalizarId(
          p.TIP_INST
        ),

      tuc:
        normalizarId(
          p.TUC
        ),

      ti:
        normalizarId(
          p.TI
        ),

      cm:
        normalizarId(
          p.CM
        ),

      uar:
        normalizarId(
          p.UAR
        ),

      fases:
        normalizarId(
          
p.FAS_CON
        ),

      classeTensao:
        normalizarId(
          p.CLAS_TEN
        ),

      grupoTensao:
        normalizarId(
          p.GRU_TEN
        ),

      corNominal:
        normalizarId(
          p.COR_NOM
        ),

      
eloFSV:
        normalizarId(
          p.ELO_FSV
        ),

      situacao:
        normalizarId(
          p.SITCONT
        ),

      aberturaCarga:
        normalizarNumero(
          p.ABER_CRG
        ),

      dataImobilizacao:
        normalizarId(
          p.DAT_IMO
        
),

      descricao:
        obterPrimeiroValor(
          p,
          [
            "DESCR",
            "TIP_INST",
            "TUC",
          ]
        ),

      descrOriginal:
        p.DESCR ??
        null,

      propriedades: {
        ...p,
      
},

      feature,
    };

    equipamentos[
      id
    ] =
      equipamento;

    if (!unidadeId) {
      continue;
    }

    if (
      !porUnidade[
        unidadeId
      ]
    ) 
{
      porUnidade[
        unidadeId
      ] =
        [];
    }

    porUnidade[
      unidadeId
    ].push(
      equipamento
    );
  }

  return {
    equipamentos,
    porUnidade,
  };
}


// ==========================================================
// OBTER COORDENADAS DO PONTO ASSOCIADO
// ==========================================================
//
// Prioridade:
//
// 1. PONNOT associado ao PAC_1
// 2. PONNOT associado ao PAC_2
// 3. geometria da UNSEMT
//
// Não cria ponto 
sintético.
//
// ==========================================================

function obterCoordenadasEquipamento(
  ponto1,
  ponto2,
  geometry
) {
  const candidatos = [
    {
      ponto:
        ponto1,
      origem:
        "PONNOT_PAC_1",
    
},
    {
      ponto:
        ponto2,
      origem:
        "PONNOT_PAC_2",
    },
  ];

  for (
    const candidato of
    candidatos
  ) {
    const ponto =
      candidato?.ponto;

    const latitude =
      normalizarNumero(
        
ponto?.latitude
      );

    const longitude =
      normalizarNumero(
        ponto?.longitude
      );

    if (
      latitude !== null &&
      longitude !== null
    ) {
      return {
        latitude,
        longitude,
        origem:
          candidato.origem,
        pontoId:
          
normalizarId(
            ponto?.id
          ),
        geometria:
          ponto?.geometria ??
          null,
      };
    }
  }

  // --------------------------------------------------------
  // FALLBACK PARA GEOMETRIA DA UNSEMT
  // --------------------------------------------------------

  if (
    geometry?.type 
===
      "Point" &&
    Array.isArray(
      geometry.coordinates
    )
  ) {
    const longitude =
      normalizarNumero(
        geometry.coordinates[0]
      );

    const latitude =
      normalizarNumero(
        geometry.coordinates[1]
      );

    if (
      latitude !== null &&
      longitude !== 
null
    ) {
      return {
        latitude,
        longitude,
        origem:
          "GEOMETRIA_UNSEMT",
        pontoId:
          null,
        geometria:
          geometry,
      };
    }
  }

  return {
    latitude:
      null,

    longitude:
      null,

    origem:
      "SEM_COORDENADA",

    pontoId:
      null,

    geometria:
      null,
  };
}


// 
==========================================================
// MAPA UNSEMT
// ==========================================================

function criarMapaUnidadesSeccionadoras(
  unsemt,
  pontos
) {
  const unidades =
    {};

  for (
    const feature of
    unsemt?.features ||
    
[]
  ) {
    const p =
      feature?.properties ||
      {};

    const id =
      normalizarId(
        p.COD_ID
      );

    if (!id) {
      continue;
    }

    // ------------------------------------------------------
    // PAC ORIGINAL
    // 
------------------------------------------------------

    const pac1Original =
      normalizarId(
        p.PAC_1
      );

    const pac2Original =
      normalizarId(
        p.PAC_2
      );

    // ------------------------------------------------------
    // PAC NORMALIZADO
    // ------------------------------------------------------

    const pac1 
=
      normalizarIdPontoAssociado(
        pac1Original
      );

    const pac2 =
      normalizarIdPontoAssociado(
        pac2Original
      );

    // ------------------------------------------------------
    // PONNOT REAL
    // ------------------------------------------------------

    const ponto1 =
      pac1
        ? 
pontos?.[
            pac1
          ] || null
        : null;

    const ponto2 =
      pac2
        ? pontos?.[
            pac2
          ] || null
        : null;

    // ------------------------------------------------------
    // PONTO ASSOCIADO
    // ------------------------------------------------------

    const pontoAssociado 
=
      ponto1
        ? pac1
        : ponto2
        ? pac2
        : pac1 ||
          pac2 ||
          null;

    // ------------------------------------------------------
    // GEOMETRIA ORIGINAL
    // ------------------------------------------------------

    const geometry =
      feature?.geometry ??
      null;

    // ------------------------------------------------------
    // COORDENADAS
    // ------------------------------------------------------
    //
    // Agora PONNOT tem prioridade.
    //

    const coordenadas =
      obterCoordenadasEquipamento(
        ponto1,
        ponto2,
        geometry
      );

    const latitude =
      
coordenadas.latitude;

    const longitude =
      coordenadas.longitude;

    // ------------------------------------------------------
    // CLASSIFICAÇÃO OFICIAL
    // ------------------------------------------------------

    const tipoEquipamento =
      classificarUnidadeUNSEMT(
        p
      );

    // ------------------------------------------------------
    // 
CIRCUITO
    // ------------------------------------------------------

    const circuito =
      normalizarCircuito(
        p.CTMT
      );

    // ------------------------------------------------------
    // ALIMENTADOR
    // ------------------------------------------------------

    const alimentador =
      normalizarAlimentador(
        p.ALIMENTADOR ??
        p.alimentador 
??
        p.CTMT ??
        p.CT_COD_OP,
        circuito
      ) ||
      mapearCircuitoParaAlimentador(
        circuito
      ) ||
      normalizarId(
        p.CTMT
      ) ||
      null;

    // ------------------------------------------------------
    // OBJETO FINAL DA UNSEMT
    // 
------------------------------------------------------

    unidades[
      id
    ] = {
      id,

      pqt:
        id,

      // ----------------------------------------------------
      // PAC
      // ----------------------------------------------------

      pac1Original,

      
pac2Original,

      pac1,

      pac2,

      // ----------------------------------------------------
      // PONNOT
      // ----------------------------------------------------

      pontoAssociado,

      ponto1,

      ponto2,

      // 
----------------------------------------------------
      // COORDENADAS
      // ----------------------------------------------------

      latitude,

      longitude,

      coordenadas: {
        latitude,
        longitude,
        origem:
          coordenadas.origem,
        pontoId:
          coordenadas.pontoId,
      },

      
geometria:
        coordenadas.geometria ??
        geometry ??
        null,

      geometriaUNSEMT:
        geometry ??
        null,

      // ----------------------------------------------------
      // CLASSIFICAÇÃO
      // ----------------------------------------------------

      tipoUnidade:
        normalizarId(
          p.TIP_UNID
        
),

      tipoEquipamento,

      nomeTipoEquipamento:
        obterNomeTipoEquipamento(
          tipoEquipamento
        ),

      // ----------------------------------------------------
      // DADOS OPERACIONAIS
      // ----------------------------------------------------

      descricao:
        p.DESCR ??
        null,

      fases:
        p.FAS_CON ??
        null,

      situacao:
        p.SIT_ATIV ??
        null,

      pontoOperacao:
        p.P_N_OPE ??
        null,

      capacidadeElo:
        p.CAP_ELO ??
        null,

      corNominal:
        p.COR_NOM 
??
        null,

      tlcd:
        normalizarNumero(
          p.TLCD
        ),

      telecomandado:
        normalizarNumero(
          p.TLCD
        ) === 1,

      dataConexao:
        p.DAT_CON ??
        null,

      posicao:
        p.POS 
??
        null,

      // ----------------------------------------------------
      // REDE
      // ----------------------------------------------------

      alimentador,

      circuito,

      subestacao:
        normalizarId(
          p.SUB
        ),

      // 
----------------------------------------------------
      // PROPRIEDADES
      // ----------------------------------------------------

      propriedades: {
        ...p,

        alimentador,

        circuito,

        PAC_1:
          pac1Original,

        PAC_2:
          pac2Original,

        
PAC_1_NORMALIZADO:
          pac1,

        PAC_2_NORMALIZADO:
          pac2,
      },

      // ----------------------------------------------------
      // EQUIPAMENTOS ASSOCIADOS
      // ----------------------------------------------------

      equipamentos:
        [],

      quantidadeEquipamentos:
        0,

      temEquipamento:
        false,

      // ----------------------------------------------------
      // EQUIPAMENTO PRINCIPAL
      // ----------------------------------------------------

      equipamentoPrincipal:
        tipoEquipamento !==
          "OUTRO"
          ? tipoEquipamento
          : null,

      tiposEquipamentos:
        tipoEquipamento !==
          
"OUTRO"
          ? [
              tipoEquipamento,
            ]
          : [],

      tipoVisual:
        tipoEquipamento,
    };
  }

  return unidades;
}


// ==========================================================
// ASSOCIAR EQSE ÀS UNIDADES 
UNSEMT
// ==========================================================
//
// A UNSEMT é a fonte estrutural.
//
// O EQSE recebe:
//
// - PAC_1
// - PAC_2
// - PONNOT
// - coordenadas
// - alimentador
// - circuito
// - subestação
// - classificação oficial por TIP_UNID
//
// ==========================================================

function associarEquipamentosAsUnidades(
  unidades,
  porUnidade
) {
  for (
    const unidade of
    Object.values(
      unidades ||
      {}
    )
  ) {
    const associados =
      
porUnidade?.[
        unidade.id
      ] ||
      [];

    const equipamentosEnriquecidos =
      associados.map(
        (
          equipamento
        ) => ({
          ...equipamento,

          // ------------------------------------------------
          // IDENTIDADE DA UNIDADE
          // ------------------------------------------------

          unidadeId:
            unidade.id,

          pqt:
            unidade.id,

          // ------------------------------------------------
          // PAC ORIGINAL
          // ------------------------------------------------

          pac1Original:
            unidade.pac1Original ??
            null,

          pac2Original:
            unidade.pac2Original 
??
            null,

          // ------------------------------------------------
          // PAC NORMALIZADO
          // ------------------------------------------------

          pac1:
            unidade.pac1 ??
            null,

          pac2:
            unidade.pac2 ??
            null,

          // 
------------------------------------------------
          // PONNOT
          // ------------------------------------------------

          ponto1:
            unidade.ponto1 ??
            null,

          ponto2:
            unidade.ponto2 ??
            null,

          pontoAssociado:
            unidade.pontoAssociado ??
            null,

          // 
------------------------------------------------
          // COORDENADAS
          // ------------------------------------------------

          latitude:
            unidade.latitude ??
            null,

          longitude:
            unidade.longitude ??
            null,

          coordenadas:
            unidade.coordenadas ??
            null,

          geometria:
            unidade.geometria 
??
            null,

          geometriaUNSEMT:
            unidade.geometriaUNSEMT ??
            null,

          // ------------------------------------------------
          // REDE
          // ------------------------------------------------

          alimentador:
            unidade.alimentador ??
            null,

          
circuito:
            unidade.circuito ??
            null,

          subestacao:
            unidade.subestacao ??
            null,

          // ------------------------------------------------
          // CLASSIFICAÇÃO OFICIAL
          // ------------------------------------------------
          //
          // TIP_UNID é soberano.
          //

          tipoUnidade:
            unidade.tipoUnidade 
??
            null,

          tipoEquipamento:
            unidade.tipoEquipamento ??
            equipamento.tipo ??
            "OUTRO",

          nomeTipoEquipamento:
            unidade.nomeTipoEquipamento ??
            obterNomeTipoEquipamento(
              unidade.tipoEquipamento
            ),

          tipoVisual:
            unidade.tipoEquipamento ??
            equipamento.tipo 
??
            "OUTRO",

          tipoOficialUNSEMT:
            unidade.tipoEquipamento ??
            "OUTRO",

          // ------------------------------------------------
          // INFORMAÇÕES COMPLEMENTARES EQSE
          // ------------------------------------------------

          tipoComplementarEQSE:
            equipamento.tipo ??
            null,

          // 
------------------------------------------------
          // OPERACIONAL
          // ------------------------------------------------

          situacao:
            unidade.situacao ??
            equipamento.situacao ??
            null,

          posicao:
            unidade.posicao ??
            equipamento.posicao ??
            null,

          telecomandado:
            unidade.telecomandado ??
            false,

          tlcd:
            unidade.tlcd ??
            null,

          // ------------------------------------------------
          // REFERÊNCIA COMPLETA DA UNSEMT
          // ------------------------------------------------

          unidadeSeccionadora:
            unidade,
        })
      );

    unidade.equipamentos =
      
equipamentosEnriquecidos;

    unidade.quantidadeEquipamentos =
      equipamentosEnriquecidos.length;

    unidade.temEquipamento =
      equipamentosEnriquecidos.length >
      0;

    // ------------------------------------------------------
    // CLASSIFICAÇÃO OFICIAL
    // 
------------------------------------------------------

    const tipoUNSEMT =
      unidade.tipoEquipamento;

    if (
      tipoUNSEMT &&
      tipoUNSEMT !==
        "OUTRO"
    ) {
      unidade.equipamentoPrincipal =
        tipoUNSEMT;

      unidade.tiposEquipamentos =
        [
          tipoUNSEMT,
        ];

      unidade.tipoVisual =
        tipoUNSEMT;

      continue;
    }

    // ------------------------------------------------------
    // FALLBACK
    // ------------------------------------------------------

    const tipos =
      [];

    for (
      const equipamento of
      
equipamentosEnriquecidos
    ) {
      const tipo =
        equipamento?.tipoEquipamento ||
        equipamento?.tipo;

      if (
        tipo &&
        !tipos.includes(
          tipo
        )
      ) {
        tipos.push(
          tipo
        );
      }
    }

    unidade.tiposEquipamentos =
      tipos;

    unidade.equipamentoPrincipal =
      tipos[0] ||
      null;

    unidade.tipoVisual =
      tipos[0] ||
      "OUTRO";
  }

  return unidades;
}


// 
==========================================================
// SEPARAR ARQUIVO COMBINADO
// ==========================================================

function separarEquipamentosCombinados(
  geojson
) {
  const unsemt =
    [];

  const untrmt =
    [];

  for (
    const feature 
of
    geojson?.features ||
    []
  ) {
    const p =
      feature?.properties ||
      {};

    const tipo =
      normalizarTexto(
        p.tipoEquipamento
      );

    const tipoUnidade =
      normalizarTexto(
        p.TIP_UNID ??
        p.tipoUnidade
      );

    if (
      tipo ===
        "TRANSFORMADOR" ||
      tipoUnidade ===
        "38"
    ) {
      untrmt.push(
        feature
      );

      continue;
    }

    if (
      tipo ===
        "CHAVE_LAMINA" ||
      tipo ===
        "CHAVE_FUSIVEL" 
||
      tipo ===
        "CHAVE_SECCIONADORA" ||
      tipo ===
        "RELIGADOR" ||
      [
        "19",
        "22",
        "32",
        "34",
      ].includes(
        tipoUnidade
      )
    ) {
      unsemt.push(
        feature
      );
    }
  
}

  return {
    unsemt: {
      type:
        "FeatureCollection",

      features:
        unsemt,
    },

    untrmt: {
      type:
        "FeatureCollection",

      features:
        untrmt,
    },
  
};
}


// ==========================================================
// MAPA UNIDADES TRANSFORMADORES
// ==========================================================

function criarMapaUnidadesTransformadores(
  unidadesTransformadores,
  pontos,
  origem = 
"UNTRMT"
) {
  const unidades =
    {};

  for (
    const feature of
    unidadesTransformadores?.features ||
    []
  ) {
    const p =
      feature?.properties ||
      {};

    const id =
      normalizarId(
        p.COD_ID 
??
        p.untrmtId
      );

    if (!id) {
      continue;
    }

    const tipoEquipamento =
      classificarUnidadeTransformador(
        p
      );

    if (
      tipoEquipamento !==
      "TRANSFORMADOR"
    ) {
      
continue;
    }

    const geometry =
      feature?.geometry ??
      null;

    const pac1Original =
      normalizarId(
        p.PAC_1 ??
        p.pac1Original ??
        p.pac1
      );

    const pac2Original =
      normalizarId(
        p.PAC_2 ??
        p.pac2Original ??
        
p.pac2
      );

    const pac1 =
      normalizarIdPontoAssociado(
        pac1Original
      );

    const pac2 =
      normalizarIdPontoAssociado(
        pac2Original
      );

    const ponto1 =
      pac1
        ? pontos?.[
            pac1
          ] || null
        : 
null;

    const ponto2 =
      pac2
        ? pontos?.[
            pac2
          ] || null
        : null;

    const coordenadas =
      obterCoordenadasEquipamento(
        ponto1,
        ponto2,
        geometry
      );

    const pontoAssociado =
      ponto1
        ? 
pac1
        : ponto2
        ? pac2
        : pac1 ||
          pac2 ||
          null;

    const latitude =
      coordenadas.latitude;

    const longitude =
      coordenadas.longitude;

    const circuito =
      normalizarCircuito(
        p.CTMT ??
        p.ctmt
      );

    const alimentador =
      normalizarAlimentador(
        p.CTMT ??
        p.ctmt,
        circuito
      ) ||
      mapearCircuitoParaAlimentador(
        circuito
      ) ||
      normalizarId(
        p.CTMT ??
        p.ctmt
      ) ||
      null;

    unidades[
      
id
    ] = {
      id,

      origem,

      tipo:
        "TRANSFORMADOR",

      tipoEquipamento:
        "TRANSFORMADOR",

      nomeTipoEquipamento:
        "Transformador",

      tipoUnidade:
        normalizarId(
          p.TIP_UNID ??
          
p.tipoUnidade
        ),

      // ----------------------------------------------------
      // PAC
      // ----------------------------------------------------

      pac1Original,

      pac2Original,

      pac1,

      pac2,

      // 
----------------------------------------------------
      // PONNOT
      // ----------------------------------------------------

      ponto1,

      ponto2,

      pontoAssociado,

      // ----------------------------------------------------
      // COORDENADAS
      // ----------------------------------------------------

      latitude,

      longitude,

      coordenadas: {
        latitude,
        longitude,
        origem:
          coordenadas.origem,
        pontoId:
          coordenadas.pontoId,
      },

      geometria:
        coordenadas.geometria ??
        geometry ??
        null,

      geometriaUNTRMT:
        geometry 
??
        null,

      descricao:
        p.DESCR ??
        p.descricao ??
        null,

      alimentador,

      circuito,

      subestacao:
        normalizarId(
          p.SUB ??
          p.subestacao
        ),

      
fases:
        normalizarId(
          p.FAS_CON ??
          p.fases ??
          p.FAS_CON_P
        ),

      posicao:
        p.POS ??
        p.posicao ??
        null,

      potenciaNominal:
        normalizarNumero(
          p.POT_NOM
        ),

      tensaoLinha:
        
normalizarNumero(
          p.TEN_LIN_SE
        ),

      propriedades: {
        ...p,

        alimentador,

        circuito,

        PAC_1:
          pac1Original,

        PAC_2:
          pac2Original,

        PAC_1_NORMALIZADO:
          
pac1,

        PAC_2_NORMALIZADO:
          pac2,
      },

      geometriaOriginal:
        geometry ??
        null,

      equipamentos: [],

      quantidadeEquipamentos:
        0,

      temEquipamento:
        false,

      
equipamentoPrincipal:
        "TRANSFORMADOR",

      tiposEquipamentos: [
        "TRANSFORMADOR",
      ],

      tipoVisual:
        "TRANSFORMADOR",
    };
  }

  return unidades;
}


// 
==========================================================
// ID DA UNIDADE DO TRANSFORMADOR
// ==========================================================

function obterIdUnidadeTransformador(
  propriedades
) {
  const p =
    extrairPropriedades(
      propriedades
    );

  return normalizarId(
    
obterPrimeiroValor(
      p,
      [
        "UN_TR",
        "UN_TRM",
        "UN_TR_MT",
        "UN_TR_AT",
        "UN_TRANS",
        "UNIDADE",
        "COD_UN",
        "COD_UNIDADE",
        "UN_TR_MT_ID",
        "COD_ID_UN",
        "UNSE",
        "UN_TR_ID",
      ]
    )
  );
}


// ==========================================================
// MAPA EQTR
// ==========================================================

function criarMapaEquipamentosTransformadores(
  eqTransformador,
  origem
) {
  const equipamentos =
    
{};

  const porUnidade =
    {};

  for (
    const feature of
    eqTransformador?.features ||
    []
  ) {
    const p =
      feature?.properties ||
      {};

    const id =
      normalizarId(
        obterPrimeiroValor(
          p,
          
[
            "COD_ID",
            "ID",
            "COD_EQUIP",
          ]
        )
      );

    if (!id) {
      continue;
    }

    const unidadeId =
      obterIdUnidadeTransformador(
        p
      );

    const equipamento = {
      
id,

      unidadeId,

      origem,

      tipo:
        "TRANSFORMADOR",

      tipoEquipamento:
        "TRANSFORMADOR",

      nomeTipoEquipamento:
        "Transformador",

      tipoOriginal:
        normalizarId(
          obterPrimeiroValor(
            
p,
            [
              "TIP_INST",
              "TIP_UNID",
              "TIP_EQUIP",
            ]
          )
        ),

      tuc:
        normalizarId(
          p.TUC
        ),

      ti:
        normalizarId(
          p.TI
        ),

      cm:
        normalizarId(
          p.CM
        ),

      uar:
        normalizarId(
          p.UAR
        ),

      tipInst:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "TIP_INST",
              "TIP_EQUIP",
            
]
          )
        ),

      fases:
        normalizarId(
          p.FAS_CON
        ),

      classeTensao:
        normalizarId(
          obterPrimeiroValor(
            p,
            [
              "CLAS_TEN",
              "GRU_TEN",
            ]
          )
        
),

      grupoTensao:
        normalizarId(
          p.GRU_TEN
        ),

      corNominal:
        normalizarId(
          p.COR_NOM
        ),

      descricao:
        obterPrimeiroValor(
          p,
          [
            "DESCR",
            "TIP_INST",
            
"TIP_EQUIP",
            "TUC",
          ]
        ),

      propriedades: {
        ...p,
      },

      feature,
    };

    equipamentos[
      id
    ] =
      equipamento;

    if (!unidadeId) {
      
continue;
    }

    if (
      !porUnidade[
        unidadeId
      ]
    ) {
      porUnidade[
        unidadeId
      ] =
        [];
    }

    porUnidade[
      unidadeId
    ].push(
      equipamento
    
);
  }

  return {
    equipamentos,
    porUnidade,
  };
}


// ==========================================================
// ASSOCIAR EQTR
// ==========================================================

function 
associarEquipamentosTransformadores(
  unidades,
  porUnidade
) {
  for (
    const unidade of
    Object.values(
      unidades ||
      {}
    )
  ) {
    const associados =
      porUnidade?.[
        unidade.id
      ] ||
      [];

    const 
equipamentosEnriquecidos =
      associados.map(
        (
          equipamento
        ) => ({
          ...equipamento,

          unidadeId:
            unidade.id,

          tipo:
            "TRANSFORMADOR",

          tipoEquipamento:
            "TRANSFORMADOR",

          nomeTipoEquipamento:
            "Transformador",

          tipoUnidade:
            unidade.tipoUnidade ??
            "38",

          pac1Original:
            unidade.pac1Original ??
            null,

          pac2Original:
            unidade.pac2Original ??
            null,

          pac1:
            unidade.pac1 ??
            null,

          pac2:
            unidade.pac2 
??
            null,

          ponto1:
            unidade.ponto1 ??
            null,

          ponto2:
            unidade.ponto2 ??
            null,

          pontoAssociado:
            unidade.pontoAssociado ??
            null,

          latitude:
            unidade.latitude ??
            null,

          longitude:
            unidade.longitude ??
            null,

          coordenadas:
            unidade.coordenadas ??
            null,

          geometria:
            unidade.geometria ??
            null,

          alimentador:
            unidade.alimentador ??
            null,

          circuito:
            unidade.circuito 
??
            null,

          subestacao:
            unidade.subestacao ??
            null,

          posicao:
            unidade.posicao ??
            equipamento.posicao ??
            null,

          unidadeTransformadora:
            unidade,
        })
      );

    unidade.equipamentos =
      
equipamentosEnriquecidos;

    unidade.quantidadeEquipamentos =
      equipamentosEnriquecidos.length;

    unidade.temEquipamento =
      equipamentosEnriquecidos.length >
      0;

    unidade.equipamentoPrincipal =
      "TRANSFORMADOR";

    unidade.tiposEquipamentos =
      
[
        "TRANSFORMADOR",
      ];

    unidade.tipoVisual =
      "TRANSFORMADOR";
  }

  return unidades;
}


// ==========================================================
// COMBINAR MAPAS
// 
==========================================================

function combinarMapasEquipamentos(
  mapaPrincipal,
  mapaSecundario
) {
  const equipamentos = {
    ...(
      mapaPrincipal?.equipamentos ||
      {}
    ),

    ...(
      mapaSecundario?.equipamentos ||
      
{}
    ),
  };

  const porUnidade = {
    ...(
      mapaPrincipal?.porUnidade ||
      {}
    ),
  };

  for (
    const [
      unidadeId,
      lista,
    ] of Object.entries(
      mapaSecundario?.porUnidade ||
      
{}
    )
  ) {
    if (
      !porUnidade[
        unidadeId
      ]
    ) {
      porUnidade[
        unidadeId
      ] =
        [];
    }

    porUnidade[
      unidadeId
    ].push(
      ...lista
    
);
  }

  return {
    equipamentos,
    porUnidade,
  };
}


// ==========================================================
// ÍNDICE PQT POR PONTO
// ==========================================================

function 
criarIndicePQTPorPonto(
  unidades
) {
  const indice =
    {};

  for (
    const unidade of
    Object.values(
      unidades ||
      {}
    )
  ) {
    const pontosDaUnidade =
      [
        unidade.pac1,
        unidade.pac2,
        unidade.pontoAssociado,
      
].filter(Boolean);

    for (
      const pontoId of
      new Set(
        pontosDaUnidade
      )
    ) {
      if (
        !indice[
          pontoId
        ]
      ) {
        indice[
          pontoId
        ] =
          [];
      }

      if (
        !indice[
          pontoId
        ].includes(
          unidade.id
        )
      ) {
        indice[
          pontoId
        ].push(
          unidade.id
        );
      }
    }
  }

  return indice;
}


// ==========================================================
// ÍNDICE TRANSFORMADORES POR PONTO
// ==========================================================

function criarIndiceTransformadoresPorPonto(
  unidades
) {
  const indice =
    
{};

  for (
    const unidade of
    Object.values(
      unidades ||
      {}
    )
  ) {
    const pontos =
      [
        unidade.pac1,
        unidade.pac2,
        unidade.pontoAssociado,
      ].filter(Boolean);

    for (
      const pontoId of
      new 
Set(
        pontos
      )
    ) {
      if (
        !indice[
          pontoId
        ]
      ) {
        indice[
          pontoId
        ] =
          [];
      }

      if (
        !indice[
          pontoId
        
].includes(
          unidade.id
        )
      ) {
        indice[
          pontoId
        ].push(
          unidade.id
        );
      }
    }
  }

  return indice;
}


// 
==========================================================
// MAPA DE PONTOS
// ==========================================================

function criarMapaPontos(
  ponnot
) {
  const pontos =
    {};

  for (
    const feature of
    ponnot?.features ||
    []
  ) {
    const propriedades 
=
      feature?.properties ||
      {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    if (!codId) {
      continue;
    }

    const geometria =
      feature?.geometry;

    if (
      !geometria ||
      geometria.type 
!==
        "Point" ||
      !Array.isArray(
        geometria.coordinates
      )
    ) {
      continue;
    }

    const [
      longitude,
      latitude,
    ] =
      geometria.coordinates;

    const latitudeNormalizada =
      normalizarNumero(
        latitude
      
);

    const longitudeNormalizada =
      normalizarNumero(
        longitude
      );

    if (
      latitudeNormalizada ===
        null ||
      longitudeNormalizada ===
        null
    ) {
      continue;
    }

    // O circuito do ponto é necessário para normalizar o alimentador e
    // para diferenciar pontos com 
identificadores semelhantes em circuitos distintos.
    const circuito =
      normalizarCircuito(
        propriedades.CTMT ??
        propriedades.ctmt
      );

    const alimentador =
      normalizarAlimentador(
        propriedades.CT_COD_OP ??
        propriedades.alimentador ??
        propriedades.ALIMENTADOR ??
        propriedades.CTMT,
        circuito
      ) ||
      null;

    pontos[
      codId
    ] = {
      id:
        codId,

      latitude:
        latitudeNormalizada,

      longitude:
        longitudeNormalizada,

      tipo:
        propriedades.TIP_INST ??
        propriedades.TIP_PON ??
        propriedades.TIPO ??
        null,

      estrutura:
        propriedades.ESTR ??
        null,

      material:
        propriedades.MAT ??
        null,

      situacao:
        propriedades.SITCONT ??
        null,

      alimentador,

      circuito,

      subestacao:
        
normalizarId(
          propriedades.SUB
        ) ||
        null,

      propriedades: {
        ...propriedades,
      },

      geometria,
    };
  }

  return pontos;
}


// 
==========================================================
// EXTREMIDADE DE GEOMETRIA
// ==========================================================

function obterExtremidadeGeometria(
  geometry,
  primeira
) {
  if (!geometry) {
    return null;
  }

  let coordenadas =
    null;

  if (
    geometry.type ===
    "LineString"
  ) {
    coordenadas =
      geometry.coordinates;

  } else if (
    geometry.type ===
    "MultiLineString"
  ) {
    const linhas =
      geometry.coordinates ||
      [];

    if (
      linhas.length >
      
0
    ) {
      coordenadas =
        primeira
          ? linhas[0]
          : linhas[
              linhas.length - 1
            ];
    }
  }

  if (
    !Array.isArray(
      coordenadas
    ) ||
    coordenadas.length ===
      0
  ) {
    return 
null;
  }

  const ponto =
    primeira
      ? coordenadas[0]
      : coordenadas[
          coordenadas.length - 1
        ];

  if (
    !Array.isArray(
      ponto
    ) ||
    ponto.length <
      2
  ) {
    return null;
  
}

  const longitude =
    normalizarNumero(
      ponto[0]
    );

  const latitude =
    normalizarNumero(
      ponto[1]
    );

  if (
    longitude === null ||
    latitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}


// ==========================================================
// ENCONTRAR PONTO REAL POR COORDENADA
// ==========================================================

function 
encontrarPontoRealPorCoordenada(
  pontos,
  coordenada,
  tolerancia = 0.00002,
  circuitoTrecho = null
) {
  if (!coordenada) return null;

  const circuitoAlvo = normalizarCircuito(circuitoTrecho);
  const todos = Object.values(pontos || {});
  const doCircuito = circuitoAlvo
    ? todos.filter((ponto) => normalizarCircuito(ponto?.circuito) === circuitoAlvo)
    : [];
  // Quando há pontos do circuito 
do trecho, a busca fica restrita a eles.
  // Só usa o conjunto geral quando o cadastro não informa esse circuito.
  const candidatos = doCircuito.length ? doCircuito : todos;
  const tolerancia2 = tolerancia * tolerancia;
  let melhorId = null;
  let melhorDistancia = Infinity;
  let empatado = false;

  for (const ponto of candidatos) {
    const latitude = normalizarNumero(ponto?.latitude);
    const longitude = 
normalizarNumero(ponto?.longitude);
    if (latitude === null || longitude === null) continue;

    const dLat = latitude - coordenada.latitude;
    const dLon = longitude - coordenada.longitude;
    const distancia2 = dLat * dLat + dLon * dLon;
    if (distancia2 > tolerancia2) continue;

    if (distancia2 + 1e-14 < melhorDistancia) {
      melhorDistancia = distancia2;
      melhorId = 
normalizarId(ponto?.id);
      empatado = false;
    } else if (Math.abs(distancia2 - melhorDistancia) <= 1e-14) {
      empatado = true;
    }
  }

  // Não escolhe arbitrariamente entre dois pontos reais igualmente próximos.
  return empatado ? null : melhorId;
}


// ==========================================================
// RESOLVER PONTO DO 
TRECHO
// ==========================================================

function resolverPontoTrecho(
  idOriginal,
  coordenada,
  pontos,
  circuitoTrecho = null
) {
  const idBruto = normalizarId(idOriginal);
  const idNormalizado = normalizarIdPontoAssociado(idBruto);
  const circuitoAlvo = normalizarCircuito(circuitoTrecho);
  const valoresPontos = 
Object.values(pontos || {});

  // 1) Referência exata a um PONNOT real tem prioridade quando já existe.
  if (idBruto && pontos?.[idBruto]) {
    const pontoExato = pontos[idBruto];
    const circuitoPonto = normalizarCircuito(pontoExato?.circuito);
    if (!circuitoAlvo || !circuitoPonto || circuitoAlvo === circuitoPonto || idBruto !== idNormalizado) {
      return { id: idBruto, metodo: "ID_PONNOT_EXATO" };
    }
  }

  // 2) O SSDMT pode referenciar a base do COD_ID, enquanto o PONNOT real
  // preserva sufixo de circuito. Resolve apenas para registro existente,
  // preferindo o circuito do próprio trecho para evitar ligar alimentadores
  // diferentes só porque compartilham a mesma base de identificador.
  const porBase = idNormalizado
    ? valoresPontos.filter((ponto) =>
        normalizarIdPontoAssociado(ponto?.id) === idNormalizado
      
)
    : [];
  const porCircuito = circuitoAlvo
    ? porBase.filter((ponto) => normalizarCircuito(ponto?.circuito) === circuitoAlvo)
    : porBase;

  if (porCircuito.length === 1) {
    return { id: normalizarId(porCircuito[0]?.id), metodo: "ID_PONNOT_BASE_E_CIRCUITO" };
  }

  if (porCircuito.length > 1) {
    const idPorCoordenada = 
encontrarPontoRealPorCoordenada(
      Object.fromEntries(porCircuito.map((ponto) => [normalizarId(ponto.id), ponto])),
      coordenada,
      0.00002,
      circuitoAlvo
    );
    if (idPorCoordenada) return { id: idPorCoordenada, metodo: "BASE_CIRCUITO_COORDENADA" };
  }

  // 3) Se não há candidato por base/circuito, usa coordenada real, filtrando
  // pelo circuito quando esse dado 
está disponível.
  const idPorCoordenada = encontrarPontoRealPorCoordenada(
    pontos,
    coordenada,
    0.00002,
    circuitoAlvo
  );
  if (idPorCoordenada) {
    return { id: idPorCoordenada, metodo: "COORDENADA_PONNOT_REAL_CIRCUITO" };
  }

  // 4) Último recurso compatível com o comportamento anterior: mantém 
a
  // referência informada, mas registra que ela não foi resolvida a um PONNOT.
  return {
    id: idNormalizado || idBruto || null,
    metodo: idNormalizado || idBruto ? "ID_NAO_ENCONTRADO" : "SEM_ID",
  };
}


// ==========================================================
// MAPA DE TRECHOS
// 
==========================================================

function criarMapaTrechos(
  ssdmt,
  pontos
) {
  const trechos =
    {};

  for (
    const feature of
    ssdmt?.features ||
    []
  ) {
    const propriedades =
      feature?.properties ||
      {};

    const codId =
      normalizarId(
        propriedades.COD_ID
      );

    if (!codId) {
      continue;
    }

    const pontoInicialOriginal =
      normalizarId(
        propriedades.PN_CON_1
      );

    const pontoFinalOriginal =
      normalizarId(
        propriedades.PN_CON_2
      
);

    const coordenadaInicial =
      obterExtremidadeGeometria(
        feature?.geometry,
        true
      );

    const coordenadaFinal =
      obterExtremidadeGeometria(
        feature?.geometry,
        false
      );

    const circuito =
      normalizarCircuito(
        propriedades.CTMT ??
        propriedades.ctmt
      
);

    const resolucaoInicial =
      resolverPontoTrecho(
        pontoInicialOriginal,
        coordenadaInicial,
        pontos,
        circuito
      );

    const resolucaoFinal =
      resolverPontoTrecho(
        pontoFinalOriginal,
        coordenadaFinal,
        pontos,
        circuito
      );

    const pontoInicial 
=
      resolucaoInicial.id;

    const pontoFinal =
      resolucaoFinal.id;

    const alimentador =
      normalizarAlimentador(
        propriedades.CT_COD_OP ??
        propriedades.alimentador ??
        propriedades.ALIMENTADOR ??
        propriedades.CTMT,
        circuito
      ) ||
      null;

    trechos[
      
codId
    ] = {
      id:
        codId,

      pontoInicial,

      pontoFinal,

      pontoInicialOriginal,

      pontoFinalOriginal,

      resolucaoPontoInicial:
        resolucaoInicial.metodo,

      resolucaoPontoFinal:
        resolucaoFinal.metodo,

      alimentador,

      circuito,

      subestacao:
        normalizarId(
          propriedades.SUB
        ),

      fases:
        propriedades.FAS_CON ??
        null,

      condutor:
        propriedades.TIP_CND ??
        null,

      
comprimento:
        normalizarNumero(
          propriedades.COMP
        ),

      situacao:
        propriedades.SITCONT ??
        null,

      propriedades: {
        ...propriedades,
      },

      geometria:
        feature?.geometry ??
        null,
    };
  }

  return trechos;
}


// ==========================================================
// CADASTROS DE CONDUTORES (SEGCON / TCABOBIT)
// ==========================================================
// SSDMT.TIP_CND referencia SEGCON.COD_ID.
// SEGCON.BIT_FAS_1/_2/_3 referencia TCABOBIT.COD_ID.
// CNOM e CMAX são atributos do cadastro 
SEGCON.
// Os cadastros são opcionais; sem eles, os campos permanecem null.
// ==========================================================

function normalizarChaveCadastro(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto ? texto.toUpperCase() : null;
}

function normalizarNomeCampo(valor) {
  return String(valor ?? 
"")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function obterCampoCadastro(registro, ...campos) {
  if (!registro || typeof registro !== "object") return null;

  for (const campo of campos) {
    const valor = registro[campo];
    if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
      return valor;
    
}
  }

  const nomesDesejados = new Set(campos.map(normalizarNomeCampo));
  for (const [nome, valor] of Object.entries(registro)) {
    if (
      nomesDesejados.has(normalizarNomeCampo(nome)) &&
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ""
    ) {
      return valor;
    }
  
}

  return null;
}

function obterRegistrosCadastro(colecao) {
  if (!colecao) return [];

  if (Array.isArray(colecao)) {
    return colecao.map((item) => item?.properties || item?.propriedades || item || {});
  }

  if (colecao.type === "FeatureCollection" && Array.isArray(colecao.features)) {
    return 
colecao.features.map((feature) => feature?.properties || feature?.propriedades || {});
  }

  if (colecao.type === "Feature") {
    return [colecao.properties || colecao.propriedades || {}];
  }

  if (typeof colecao === "object") {
    for (const chave of ["features", "records", "registros", "data", "rows", "results"]) {
      if (Array.isArray(colecao[chave])) {
        return colecao[chave].map((item) => item?.properties || 
item?.propriedades || item || {});
      }
    }
    return Object.values(colecao).map((item) => item?.properties || item?.propriedades || item || {});
  }

  return [];
}

function criarIndiceCadastroPorCodigo(colecao) {
  const indice = {};
  for (const registro of obterRegistrosCadastro(colecao)) {
    const codigo = 
obterCampoCadastro(registro, "COD_ID", "CODID", "codId", "id", "ID");
    const chave = normalizarChaveCadastro(codigo);
    if (chave) indice[chave] = registro;
  }
  return indice;
}

function obterDescricaoCadastro(registro, codigoFallback = null) {
  if (!registro) return codigoFallback;

  const descricao = 
obterCampoCadastro(
    registro,
    "DESCR",
    "DESCRICAO",
    "DESC",
    "NOME",
    "NOM",
    "BITOLA",
    "BITOLA_MM2",
    "BIT_FAS_MM2",
    "SECAO",
    "SECAO_MM2",
    "AREA",
    "VALOR",
    "DESCR_DDA",
    "DDA_DESCR"
  );

  return descricao !== null ? 
String(descricao).trim() : codigoFallback;
}

function enriquecerTrechosComCondutores(trechos, segcon, tcabobit) {
  const indiceSEGCON = criarIndiceCadastroPorCodigo(segcon);
  const indiceTCABOBIT = criarIndiceCadastroPorCodigo(tcabobit);

  for (const trecho of Object.values(trechos || {})) {
    const propriedades = trecho?.propriedades || {};
    const codigoCondutor = 
normalizarId(
      obterCampoCadastro(propriedades, "TIP_CND", "TIPCND", "tip_cnd", "tipCnd") ?? trecho?.condutor
    );
    const chaveCondutor = normalizarChaveCadastro(codigoCondutor);
    const cadastroCondutor = chaveCondutor ? indiceSEGCON[chaveCondutor] || null : null;

    const buscarRefBitola = (numero) => {
      const campos = numero === 1
        ? ["BIT_FAS_1", "BITFAS1", 
"BIT_FAS"]
        : numero === 2
        ? ["BIT_FAS_2", "BITFAS2", "BIT_FAS"]
        : ["BIT_FAS_3", "BITFAS3", "BIT_FAS"];
      return normalizarId(obterCampoCadastro(cadastroCondutor, ...campos));
    };

    const referenciasBitola = cadastroCondutor
      ? [
          { fase: "Fase 1", codigo: buscarRefBitola(1) },
          { fase: "Fase 2", codigo: buscarRefBitola(2) },
          { fase: "Fase 3", codigo: 
buscarRefBitola(3) },
        ].filter((item) => item.codigo)
      : [];

    const bitolasFase = referenciasBitola.map((item) => {
      const chaveBitola = normalizarChaveCadastro(item.codigo);
      const cadastroBitola = chaveBitola ? indiceTCABOBIT[chaveBitola] || null : null;
      return {
        fase: item.fase,
        codigo: item.codigo,
        descricao: obterDescricaoCadastro(cadastroBitola, 
null),
        cadastro: cadastroBitola,
      };
    });

    const descricoesUnicas = [...new Set(
      bitolasFase.map((item) => item.descricao).filter(Boolean)
    )];

    // R_REGUL tem designações úteis na geodatabase fornecida
    // (por exemplo CUM16MM2, ALI25MM2, CUM70MM2 e AL2_0AWG).
    // Priorizamos R_REGUL sobre DESCR, pois DESCR pode ser apenas
    // um código numérico e não 
uma descrição legível.
    const designacaoRegul = obterCampoCadastro(
      cadastroCondutor,
      "R_REGUL", "RREGUL", "DESIGNACAO_CONDUTOR", "DESIGNACAO", "TIPO_CND"
    );
    const descricaoCondutorCadastro =
      designacaoRegul ?? obterDescricaoCadastro(cadastroCondutor, null);

    // Algumas designações incluem explicitamente o tamanho em mm2.
    // AWG e outras designações ficam como rótulo, sem 
conversão presumida.
    const matchMm2 = String(designacaoRegul ?? "").match(/(\d+(?:[.,]\d+)?)\s*MM(?:2|²)\b/i);
    const bitolaMm2PorDesignacao = matchMm2
      ? normalizarNumero(matchMm2[1])
      : null;

    // Algumas exportações podem conter os campos diretamente no SSDMT.
    // Só usamos valores explicitamente cadastrados; não há cálculo estimado.
    const correnteNominalDireta = 
obterCampoCadastro(
      propriedades, "CNOM", "COR_NOM", "CORRENTE_NOMINAL", "correnteNominal"
    );
    const correnteMaximaDireta = obterCampoCadastro(
      propriedades, "CMAX", "COR_MAX", "CORRENTE_MAXIMA", "CORRENTE_ADMISSIVEL", "correnteMaxima"
    );
    const correnteNominal = normalizarNumero(
      obterCampoCadastro(cadastroCondutor, "CNOM", "COR_NOM", 
"CORRENTE_NOMINAL") ?? correnteNominalDireta
    );
    const correnteMaxima = normalizarNumero(
      obterCampoCadastro(cadastroCondutor, "CMAX", "COR_MAX", "CORRENTE_MAXIMA", "CORRENTE_ADMISSIVEL") ?? correnteMaximaDireta
    );

    const bitolaDireta = obterCampoCadastro(
      propriedades, "BITOLA_MM2", "BITOLA", "SECAO_MM2", "SECCAO_MM2", "BIT_FAS_MM2"
    
);
    const bitolaDiretaTexto = bitolaDireta !== null && bitolaDireta !== undefined && String(bitolaDireta).trim() !== ""
      ? String(bitolaDireta).trim()
      : null;
    const bitolaMm2 = bitolaDiretaTexto !== null
      ? normalizarNumero(bitolaDiretaTexto)
      : bitolaMm2PorDesignacao;

    trecho.codigoCondutor = codigoCondutor;
    trecho.descricaoCondutor = descricaoCondutorCadastro !== null && descricaoCondutorCadastro 
!== undefined
      ? String(descricaoCondutorCadastro).trim()
      : null;
    trecho.designacaoCondutor = designacaoRegul !== null && designacaoRegul !== undefined
      ? String(designacaoRegul).trim()
      : null;
    trecho.cadastroCondutor = cadastroCondutor;
    trecho.bitolasFase = bitolasFase;
    trecho.referenciaBitolas = referenciasBitola.map((item) => item.codigo);
    trecho.referenciaBitola = trecho.referenciaBitolas.length
      ? 
trecho.referenciaBitolas.join(" / ")
      : null;
    trecho.bitola = descricoesUnicas.length
      ? descricoesUnicas.join(" / ")
      : bitolaDiretaTexto ?? (designacaoRegul !== null && designacaoRegul !== undefined && String(designacaoRegul).trim() !== ""
        ? String(designacaoRegul).trim()
        : null);
    trecho.bitolaMm2 = bitolaMm2;
    trecho.correnteNominal = correnteNominal;
    trecho.correnteMaxima = correnteMaxima;
    trecho.correnteAdmissivel = 
correnteMaxima;
    trecho.dadosCondutorDisponiveis = Boolean(cadastroCondutor);
    trecho.dadosBitolaDisponiveis = Boolean(trecho.bitola);
    trecho.dadosCorrenteNominalDisponiveis = correnteNominal !== null;
    trecho.dadosCorrenteMaximaDisponiveis = correnteMaxima !== null;
    trecho.propriedadesCondutor = cadastroCondutor ? { ...cadastroCondutor } : null;
  }

  const listaTrechos = Object.values(trechos || 
{});
  return {
    quantidadeSEGCON: Object.keys(indiceSEGCON).length,
    quantidadeTCABOBIT: Object.keys(indiceTCABOBIT).length,
    trechosComCadastroCondutor: listaTrechos.filter((trecho) => trecho.dadosCondutorDisponiveis).length,
    trechosComBitola: listaTrechos.filter((trecho) => trecho.dadosBitolaDisponiveis).length,
    trechosComCorrenteNominal: listaTrechos.filter((trecho) => trecho.correnteNominal !== 
null).length,
    trechosComCorrenteMaxima: listaTrechos.filter((trecho) => trecho.correnteMaxima !== null).length,
  };
}


// ==========================================================
// ADJACÊNCIA
// ==========================================================

function criarAdjacencia(
  
pontos,
  trechos
) {
  const adjacencia =
    {};

  for (
    const pontoId of
    Object.keys(
      pontos
    )
  ) {
    adjacencia[
      pontoId
    ] =
      [];
  }

  for 
(
    const trechoId of
    Object.keys(
      trechos
    )
  ) {
    const trecho =
      trechos[
        trechoId
      ];

    const inicio =
      normalizarId(
        trecho.pontoInicial
      );

    const fim =
      normalizarId(
        
trecho.pontoFinal
      );

    if (
      !inicio ||
      !fim
    ) {
      continue;
    }

    if (
      !adjacencia[
        inicio
      ]
    ) {
      adjacencia[
        inicio
      ] =
        
[];
    }

    if (
      !adjacencia[
        fim
      ]
    ) {
      adjacencia[
        fim
      ] =
        [];
    }

    adjacencia[
      inicio
    ].push({
      trechoId,

      pontoOrigem:
        inicio,

      pontoDestino:
        fim,

      sentido:
        "SAIDA",
    });

    adjacencia[
      fim
    ].push({
      trechoId,

      pontoOrigem:
        fim,

      pontoDestino:
        inicio,

      sentido:
        "ENTRADA",
    });
  }

  return adjacencia;
}


// ==========================================================
// TERMINAIS
// 
==========================================================

function identificarTerminais(
  adjacencia
) {
  const terminais =
    [];

  for (
    const pontoId of
    Object.keys(
      adjacencia
    )
  ) {
    const conexoes =
      adjacencia[
        pontoId
      ] || 
[];

    if (
      conexoes.length ===
      1
    ) {
      terminais.push(
        pontoId
      );
    }
  }

  return terminais;
}


// 
==========================================================
// DERIVAÇÕES
// ==========================================================

function identificarDerivacoes(
  adjacencia
) {
  const derivacoes =
    [];

  for (
    const pontoId of
    Object.keys(
      adjacencia
    )
  ) 
{
    const conexoes =
      adjacencia[
        pontoId
      ] || [];

    if (
      conexoes.length >
      2
    ) {
      derivacoes.push({
        pontoId,

        quantidadeConexoes:
          conexoes.length,

        conexoes,
      });
    
}
  }

  return derivacoes;
}


// ==========================================================
// PASSAGENS
// ==========================================================

function identificarPassagens(
  adjacencia
) {
  const passagens 
=
    [];

  for (
    const pontoId of
    Object.keys(
      adjacencia
    )
  ) {
    const conexoes =
      adjacencia[
        pontoId
      ] || [];

    if (
      conexoes.length ===
      2
    ) {
      
passagens.push(
        pontoId
      );
    }
  }

  return passagens;
}


// ==========================================================
// TRECHOS SEM PONTOS
// ==========================================================

function 
identificarTrechosSemPontos(
  pontos,
  trechos
) {
  const problemas =
    [];

  for (
    const trechoId of
    Object.keys(
      trechos
    )
  ) {
    const trecho =
      trechos[
        trechoId
      ];

    const pontoInicialEncontrado 
=
      !!pontos[
        trecho.pontoInicial
      ];

    const pontoFinalEncontrado =
      !!pontos[
        trecho.pontoFinal
      ];

    if (
      !pontoInicialEncontrado ||
      !pontoFinalEncontrado
    ) {
      problemas.push({
        trechoId,

        pontoInicial:
          
trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        pontoInicialEncontrado,

        pontoFinalEncontrado,
      });
    }
  }

  return problemas;
}


// 
==========================================================
// PONTOS ISOLADOS
// ==========================================================

function identificarPontosIsolados(
  pontos,
  adjacencia
) {
  const isolados =
    [];

  for (
    const pontoId of
    Object.keys(
      pontos
    
)
  ) {
    const conexoes =
      adjacencia[
        pontoId
      ] || [];

    if (
      conexoes.length ===
      0
    ) {
      isolados.push(
        pontoId
      );
    }
  }

  return isolados;
}


// ==========================================================
// TRECHOS INVÁLIDOS
// ==========================================================

function identificarTrechosInvalidos(
  trechos
) {
  const problemas =
    [];

  for 
(
    const trechoId of
    Object.keys(
      trechos
    )
  ) {
    const trecho =
      trechos[
        trechoId
      ];

    if (
      !trecho.pontoInicial ||
      !trecho.pontoFinal
    ) {
      problemas.push({
        trechoId,

        
pontoInicial:
          trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        motivo:
          "Trecho sem PN_CON_1 ou PN_CON_2",
      });

      continue;
    }

    if (
      trecho.pontoInicial ===
      trecho.pontoFinal
    ) {
      
problemas.push({
        trechoId,

        pontoInicial:
          trecho.pontoInicial,

        pontoFinal:
          trecho.pontoFinal,

        motivo:
          "Trecho conecta o ponto a ele mesmo",
      });
    }
  }

  return problemas;
}


// ==========================================================
// DESCOBRIR ALIMENTADOR
// ==========================================================

function descobrirAlimentador(
  trechos
) {
  const alimentadores =
    {};

  for (
    const trecho of
    
Object.values(
      trechos ||
      {}
    )
  ) {
    const alimentador =
      normalizarId(
        trecho.alimentador
      );

    if (!alimentador) {
      continue;
    }

    alimentadores[
      alimentador
    ] =
      (
        
alimentadores[
          alimentador
        ] ||
        0
      ) + 1;
  }

  const lista =
    Object.entries(
      alimentadores
    );

  if (
    lista.length ===
    0
  ) {
    return null;
  }

  lista.sort(
    (
      a,
      b
    ) =>
      b[1] -
      a[1]
  );

  return lista[0][0];
}


// ==========================================================
// DESCOBRIR CIRCUITO
// 
==========================================================

function descobrirCircuito(
  trechos
) {
  const circuitos =
    {};

  for (
    const trecho of
    Object.values(
      trechos ||
      {}
    )
  ) {
    const circuito =
      normalizarId(
        
trecho.circuito
      );

    if (!circuito) {
      continue;
    }

    circuitos[
      circuito
    ] =
      (
        circuitos[
          circuito
        ] ||
        0
      ) + 1;
  }

  const lista 
=
    Object.entries(
      circuitos
    );

  if (
    lista.length ===
    0
  ) {
    return null;
  }

  lista.sort(
    (
      a,
      b
    ) =>
      b[1] -
      
a[1]
  );

  return lista[0][0];
}


// ==========================================================
// ORIGENS ELÉTRICAS EXPLÍCITAS
// ==========================================================
// PSA (ponto de saída de circuito MT) e PIS (ponto interno de
// subestação) são possíveis marcadores BDGD. Não tratamos 
ALIMENTADOR,
// CTMT, SUB="CMG", coordenadas aproximadas, menor COD_ID ou terminal
// genérico como prova de origem. Se não houver marcador explícito,
// configure COD_ID(s) reais em VITE_CMG_PONTOS_ORIGEM.
// ==========================================================
function normalizarListaOrigens(valor) {
  const valores=Array.isArray(valor)?valor:[valor]; const saida=[];
  for (const item of valores) {
    if (item==null) continue;
    for (const parte of 
String(item).split(/[;,]/)) {
      const id=normalizarId(parte);
      if (id && !saida.includes(id)) saida.push(id);
    }
  }
  return saida;
}

function encontrarOrigensAutomaticas(topologia) {
  if (!topologia) return [];
  const origens=new Map();
  const campos=new Set(["TIPP N","TIP_PN","TIPOPONTO","TIPO_PONTO","TIPO","TIPOINST","TIP_INST","CLASSE_PONTO"].map(x=>x.replace(/[^A-Z0-9]/g,"")));
  const marcadores=new Set(["PSA","PIS","SUB","SE","SUBESTACAO","BARRA","BARRAMENTO","FONTE","SAIDA","ORIGEM"]);
  for (const ponto of Object.values(topologia.pontos||{})) {
    const p=ponto?.propriedades||ponto?.properties||{};
    const id=normalizarId(ponto?.id??p.COD_ID??p.codId); if (!id) continue;
    const evidencias=[];
    for (const [campo,bruto] of Object.entries(p)) {
      const 
nome=normalizarTexto(campo).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
      if (!campos.has(nome)) continue;
      const valor=normalizarTexto(bruto).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
      if (marcadores.has(valor)) evidencias.push(`${campo}=${bruto}`);
    }
    if (evidencias.length) origens.set(id,[...new Set([...(origens.get(id)||[]),...evidencias])]);
  }
  return 
[...origens.entries()].map(([pontoId,evidencias])=>({pontoId,metodo:"MARCADOR_EXPLICITO_PONNOT",evidencias}));
}

function encontrarOrigemAutomatica(topologia) {
  const origens=encontrarOrigensAutomaticas(topologia);
  return origens.length===1?origens[0]:null;
}

function obterComponentesTopologia(topologia) 
{
  const pontos=topologia?.pontos||{}, trechos=topologia?.trechos||{}, adj=topologia?.adjacencia||{};
  const ids=Object.keys(pontos), conhecidos=new Set(ids), visitados=new Set(), componentes=[];
  for (const inicio of ids) {
    if (visitados.has(inicio)) continue;
    const c={pontos:new Set(),trechos:new Set()}, fila=[inicio]; visitados.add(inicio); let i=0;
    while (i<fila.length) {
      const atual=fila[i++]; c.pontos.add(atual);
      for (const con of 
(Array.isArray(adj[atual])?adj[atual]:[])) {
        const tid=normalizarId(con?.trechoId), destino=normalizarId(con?.pontoDestino);
        if (!tid||!trechos[tid]||!destino||!conhecidos.has(destino)) continue;
        c.trechos.add(tid);
        if (!visitados.has(destino)) { visitados.add(destino); fila.push(destino); }
      }
    }
    componentes.push(c);
  }
  return componentes;
}

function orientarTopologiaPorOrigens(topologia, origensInformadas, metodoPadrao="CONFIGURADA_MANUALMENTE") {
  if (!topologia) return null;
  const pontosOficiais=topologia.pontos||{}, trechosOficiais=topologia.trechos||{};
  const idsPontos=Object.keys(pontosOficiais), idsTrechos=Object.keys(trechosOficiais), normalizadas=[], invalidas=[];
  for (const item of 
(Array.isArray(origensInformadas)?origensInformadas:[origensInformadas])) {
    const pontoId=normalizarId(typeof item==="object"&&item?item.pontoId:item); if (!pontoId) continue;
    const fonte=typeof item==="object"&&item?item:{pontoId,metodo:metodoPadrao,evidencias:[metodoPadrao]};
    if (!pontosOficiais[pontoId]) { invalidas.push(pontoId); continue; }
    if (!normalizadas.some(o=>o.pontoId===pontoId)) 
normalizadas.push({pontoId,metodo:fonte.metodo||metodoPadrao,evidencias:Array.isArray(fonte.evidencias)?fonte.evidencias:[metodoPadrao]});
  }
  const componentes=obterComponentesTopologia(topologia), compPorPonto=new Map();
  componentes.forEach((c,i)=>{for(const id of c.pontos) compPorPonto.set(id,i);});
  const fontesPorComp=new Map();
  for(const fonte of normalizadas){const i=compPorPonto.get(fonte.pontoId);if(i===undefined)continue;const 
arr=fontesPorComp.get(i)||[];arr.push(fonte);fontesPorComp.set(i,arr);}
  const pontosOrientados={}, trechosOrientados={}, confirmadas=[], bloqueados=[];
  componentes.forEach((c,i)=>{
    const fontes=fontesPorComp.get(i)||[]; if(!fontes.length)return;
    if(fontes.length>1){bloqueados.push({motivo:"MULTIPLAS_ORIGENS_NO_MESMO_COMPONENTE",pontos:[...c.pontos],trechos:[...c.trechos],origens:fontes.map(x=>x.pontoId)});return;}
    
if(c.trechos.size!==Math.max(0,c.pontos.size-1)){bloqueados.push({motivo:"COMPONENTE_NAO_RADIAL_OU_CICLO",pontos:[...c.pontos],trechos:[...c.trechos],origens:[fontes[0].pontoId]});return;}
    const fonte=fontes[0], o=orientarRedeEletrica(topologia,fonte.pontoId);
    const todosPontos=[...c.pontos].every(id=>Boolean(o?.pontos?.[id]));
    const todosTrechos=[...c.trechos].every(id=>Boolean(o?.trechos?.[id]));
    if(!todosPontos||!todosTrechos){bloqueados.push({motivo:"ORIENTACAO_INCOMPLETA",pontos:[...c.po
ntos],trechos:[...c.trechos],origens:[fonte.pontoId]});return;}
    for(const id of c.pontos)pontosOrientados[id]=o.pontos[id];
    for(const id of c.trechos)trechosOrientados[id]=o.trechos[id];
    confirmadas.push(fonte);
  });
  const pontosNaoOrientados=idsPontos.filter(id=>!pontosOrientados[id]), trechosNaoOrientados=idsTrechos.filter(id=>!trechosOrientados[id]);
  const orientacao={
    
pontoOrigem:confirmadas.length===1?confirmadas[0].pontoId:null,
    origensConfirmadas:confirmadas,origensInvalidas:invalidas,componentesBloqueados:bloqueados,
    quantidadeComponentes:componentes.length,quantidadeComponentesOrientados:confirmadas.length,
    pontos:pontosOrientados,trechos:trechosOrientados,pontosNaoOrientados,trechosNaoOrientados,
    quantidadePontos:Object.keys(pontosOrientados).length,quantidadeTrechos:Object.keys(trechosOrientados).length,
    quantidadePontosNaoOrientados:pontosNaoOrientados.length,quantidadeTrechosNaoOrientados:trechosNaoOrientados.length,
    origemConfirmada:confirmadas.length>0,
    orientacaoCompleta:confirmadas.length>0&&pontosNaoOrientados.length===0&&trechosNaoOrientados.length===0&&bloqueados.length===0,
  };
  topologia.origensConfiguradas=normalizadas; 
topologia.origensConfirmadas=confirmadas; topologia.origensInvalidas=invalidas;
  topologia.origemAutomatica=confirmadas.length===1?confirmadas[0]:(confirmadas.length>1?{metodo:"MULTIPLAS_ORIGENS",origens:confirmadas}:null);
  topologia.orientacaoEletrica=orientacao;
  console.info("🧭 [Power Grid Monitor] Orientação por componentes:",{origensConfirmadas:confirmadas.map(x=>x.pontoId),origensInvalidas:invalidas,componentes:componen
tes.length,componentesOrientados:confirmadas.length,componentesBloqueados:bloqueados.length,componentesSemOrigem:componentes.filter((c,i)=>(fontesPorComp.get(i)||[]).length===0).length,componentesComMultiplasOrigens:componentes.filter((c,i)=>(fontesPorComp.get(i)||[]).length>1).length,pontosOrientados:orientacao.quantidadePontos,pontosTotais:idsPontos.length,trechosOrientados:orientacao.quantidadeTrechos,trechosTotais:idsTrechos.length,orientacaoCompleta:orientacao.orientacaoCompleta,motivosBloqueio:bloqueados.map(x=>({motivo:x.motivo,origens:x.origens,quantidadePontos:x.pontos?.length
??0,quantidadeTrechos:x.trechos?.length??0}))});
  return orientacao;
}

// ORIENTAÇÃO DA REDE
// ==========================================================

function orientarRedeEletrica(
  topologia,
  pontoOrigem
) {
  const pontosOficiais =
    topologia?.pontos ||
    {};

  const trechosOficiais =
    topologia?.trechos ||
    {};

  const adjacencia =
    topologia?.adjacencia ||
    {};

  const idsPontosOficiais =
    Object.keys(
      pontosOficiais
    );

  const idsTrechosOficiais =
    Object.keys(
      trechosOficiais
    );

  const conjuntoPontos =
    new Set(
      idsPontosOficiais
    );

  const conjuntoTrechos =
    new Set(
      idsTrechosOficiais
    );

  const origem =
    normalizarId(
      pontoOrigem
    );

  const vazio = (
    pontoOrigemNormalizado =
      
null
  ) => ({
    pontoOrigem:
      pontoOrigemNormalizado,

    pontos:
      {},

    trechos:
      {},

    pontosNaoOrientados:
      [
        ...idsPontosOficiais,
      ],

    trechosNaoOrientados:
      [
        
...idsTrechosOficiais,
      ],

    quantidadePontos:
      0,

    quantidadeTrechos:
      0,

    quantidadePontosNaoOrientados:
      idsPontosOficiais.length,

    quantidadeTrechosNaoOrientados:
      idsTrechosOficiais.length,

    orientacaoCompleta:
      
false,
  });

  if (!origem) {
    return vazio(
      null
    );
  }

  if (
    !conjuntoPontos.has(
      origem
    )
  ) {
    console.warn(
      "⚠️ Ponto de origem não pertence aos pontos oficiais:",
      origem
    
);

    return vazio(
      origem
    );
  }

  const pontosOrientados =
    {};

  const trechosOrientados =
    {};

  const visitados =
    new Set([
      origem,
    ]);

  const trechosVisitados 
=
    new Set();

  const fila =
    [
      {
        pontoId:
          origem,

        nivel:
          0,

        pontoMontante:
          null,

        trechoMontante:
          null,
      },
    
];

  let indiceFila =
    0;

  while (
    indiceFila <
    fila.length
  ) {
    const item =
      fila[
        indiceFila++
      ];

    const pontoAtual =
      normalizarId(
        item?.pontoId
      );

    if (
      !pontoAtual ||
      !conjuntoPontos.has(
        pontoAtual
      )
    ) {
      continue;
    }

    if (
      !pontosOrientados[
        pontoAtual
      ]
    ) {
      const pontoOficial =
        pontosOficiais[
          pontoAtual
        
];

      pontosOrientados[
        pontoAtual
      ] =
        {
          ...pontoOficial,

          nivel:
            Number(
              item?.nivel
            ) || 0,

          pontoMontante:
            item?.pontoMontante ||
            null,

          trechoMontante:
            item?.trechoMontante 
||
            null,

          origem:
            pontoAtual ===
            origem,
        };
    }

    const conexoes =
      Array.isArray(
        adjacencia[
          pontoAtual
        ]
      )
        ? adjacencia[
            pontoAtual
          ]
        : 
[];

    for (
      const conexao of
      conexoes
    ) {
      const trechoId =
        normalizarId(
          conexao?.trechoId
        );

      const destino =
        normalizarId(
          conexao?.pontoDestino
        );

      if (
        !trechoId ||
        
!destino
      ) {
        continue;
      }

      if (
        !conjuntoTrechos.has(
          trechoId
        )
      ) {
        continue;
      }

      if (
        !conjuntoPontos.has(
          destino
        )
      ) {
        
continue;
      }

      const trechoOficial =
        trechosOficiais[
          trechoId
        ];

      if (!trechoOficial) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          
trechoId
        );

        trechosOrientados[
          trechoId
        ] =
          {
            ...trechoOficial,

            pontoMontante:
              pontoAtual,

            pontoJusante:
              destino,

            nivel:
              (
                Number(
                  
item?.nivel
                ) || 0
              ) + 1,
          };
      }

      if (
        !visitados.has(
          destino
        )
      ) {
        visitados.add(
          destino
        );

        fila.push({
          pontoId:
            destino,

          nivel:
            (
              Number(
                item?.nivel
              ) || 0
            ) + 1,

          pontoMontante:
            pontoAtual,

          trechoMontante:
            trechoId,
        });
      }
    }
  }

  const pontosValidos 
=
    {};

  for (
    const id of
    idsPontosOficiais
  ) {
    if (
      pontosOrientados[
        id
      ]
    ) {
      pontosValidos[
        id
      ] =
        pontosOrientados[
          id
        ];
    
}
  }

  const trechosValidos =
    {};

  for (
    const id of
    idsTrechosOficiais
  ) {
    if (
      trechosOrientados[
        id
      ]
    ) {
      const trecho =
        trechosOrientados[
          id
        
];

      const pontoMontante =
        normalizarId(
          trecho.pontoMontante
        );

      const pontoJusante =
        normalizarId(
          trecho.pontoJusante
        );

      if (
        conjuntoPontos.has(
          pontoMontante
        ) &&
        conjuntoPontos.has(
          pontoJusante
        
)
      ) {
        trechosValidos[
          id
        ] =
          trecho;
      }
    }
  }

  const pontosNaoOrientados =
    idsPontosOficiais.filter(
      (
        id
      ) =>
        !pontosValidos[
          id
        ]
    
);

  const trechosNaoOrientados =
    idsTrechosOficiais.filter(
      (
        id
      ) =>
        !trechosValidos[
          id
        ]
    );

  return {
    pontoOrigem:
      origem,

    pontos:
      pontosValidos,

    trechos:
      trechosValidos,

    pontosNaoOrientados,

    trechosNaoOrientados,

    quantidadePontos:
      Object.keys(
        pontosValidos
      ).length,

    quantidadeTrechos:
      Object.keys(
        trechosValidos
      ).length,

    
quantidadePontosNaoOrientados:
      pontosNaoOrientados.length,

    quantidadeTrechosNaoOrientados:
      trechosNaoOrientados.length,

    orientacaoCompleta:
      pontosNaoOrientados.length ===
        0 &&
      trechosNaoOrientados.length ===
        0,
  };
}


// 
==========================================================
// BUSCAR REDE A JUSANTE
// ==========================================================

export function buscarRedeAJusante(
  topologia,
  pontoInicial,
  opcoes = {}
) {
  if (!topologia) {
    return {
      pontoInicial:
        null,

      
pontos:
        {},

      trechos:
        {},

      ordemPontos:
        [],

      ordemTrechos:
        [],
    };
  }

  const origem =
    normalizarId(
      pontoInicial
    );

  if (!origem) {
    return {
      pontoInicial:
        null,

      pontos:
        {},

      trechos:
        {},

      ordemPontos:
        [],

      ordemTrechos:
        [],
    };
  
}

  const pontos =
    topologia.pontos ||
    {};

  const trechos =
    topologia.trechos ||
    {};

  const adjacencia =
    topologia.adjacencia ||
    {};

  const pontosEncontrados =
    {};

  const trechosEncontrados =
    
{};

  const ordemPontos =
    [];

  const ordemTrechos =
    [];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila =
    [
      origem,
    ];

  while (
    fila.length >
    0
  ) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (!pontoAtual) {
      continue;
    }

    if (
      visitados.has(
        pontoAtual
      )
    ) 
{
      continue;
    }

    visitados.add(
      pontoAtual
    );

    if (
      !pontos[
        pontoAtual
      ]
    ) {
      continue;
    }

    pontosEncontrados[
      pontoAtual
    ] 
=
      pontos[
        pontoAtual
      ];

    ordemPontos.push(
      pontoAtual
    );

    const conexoes =
      adjacencia[
        pontoAtual
      ] || [];

    for (
      const conexao of
      conexoes
    ) {
      const trechoId 
=
        normalizarId(
          conexao.trechoId
        );

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      if (
        !trechoId ||
        !destino
      ) {
        continue;
      }

      const trecho =
        
trechos[
          trechoId
        ];

      if (!trecho) {
        continue;
      }

      if (
        opcoes.respeitarOrientacao &&
        trecho.pontoMontante &&
        trecho.pontoJusante
      ) {
        if (
          normalizarId(
            trecho.pontoMontante
          ) !==
          pontoAtual
        ) 
{
          continue;
        }
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          trechoId
        );

        trechosEncontrados[
          trechoId
        ] =
          trecho;

        ordemTrechos.push(
          trechoId
        );
      }

      if (
        !visitados.has(
          destino
        )
      ) {
        fila.push(
          destino
        );
      }
    }
  }

  return 
{
    pontoInicial:
      origem,

    pontos:
      pontosEncontrados,

    trechos:
      trechosEncontrados,

    ordemPontos,

    ordemTrechos,

    quantidadePontos:
      ordemPontos.length,

    quantidadeTrechos:
      
ordemTrechos.length,
  };
}


// ==========================================================
// BUSCAR REDE A MONTANTE
// ==========================================================

export function buscarRedeAMontante(
  topologia,
  pontoInicial
) {
  if (!topologia) 
{
    return {
      pontoInicial:
        null,

      pontos:
        {},

      trechos:
        {},

      ordemPontos:
        [],

      ordemTrechos:
        [],
    };
  }

  const origem =
    normalizarId(
      pontoInicial
    );

  if (!origem) {
    return {
      pontoInicial:
        null,

      pontos:
        {},

      trechos:
        {},

      ordemPontos:
        
[],

      ordemTrechos:
        [],
    };
  }

  const pontos =
    topologia.pontos ||
    {};

  const trechos =
    topologia.trechos ||
    {};

  const adjacencia =
    topologia.adjacencia ||
    {};

  const pontosEncontrados =
    {};

  const trechosEncontrados =
    {};

  const ordemPontos =
    [];

  const ordemTrechos =
    [];

  const visitados =
    new Set();

  const trechosVisitados =
    new Set();

  const fila =
    [
      origem,
    ];

  while (
    fila.length >
    0
  ) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (!pontoAtual) {
      continue;
    }

    if (
      visitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    visitados.add(
      pontoAtual
    );

    if (
      !pontos[
        pontoAtual
      ]
    ) {
      
continue;
    }

    pontosEncontrados[
      pontoAtual
    ] =
      pontos[
        pontoAtual
      ];

    ordemPontos.push(
      pontoAtual
    );

    const conexoes =
      adjacencia[
        pontoAtual
      ] || [];

    for (
      const conexao of
      conexoes
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      if (!trechoId) {
        continue;
      }

      const trecho =
        trechos[
          trechoId
        ];

      if (!trecho) {
        continue;
      }

      let pontoMontante =
        null;

      let podeSubir =
        true;

      if (
        trecho.pontoMontante &&
        trecho.pontoJusante
      ) {
        const jusante =
          normalizarId(
            trecho.pontoJusante
          
);

        pontoMontante =
          normalizarId(
            trecho.pontoMontante
          );

        if (
          jusante !==
          pontoAtual
        ) {
          podeSubir =
            false;
        }
      } else {
        pontoMontante =
          normalizarId(
            conexao.pontoDestino
          
);
      }

      if (!podeSubir) {
        continue;
      }

      if (
        !pontoMontante ||
        pontoMontante ===
          pontoAtual
      ) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        
)
      ) {
        trechosVisitados.add(
          trechoId
        );

        trechosEncontrados[
          trechoId
        ] =
          trecho;

        ordemTrechos.push(
          trechoId
        );
      }

      if (
        !visitados.has(
          
pontoMontante
        )
      ) {
        fila.push(
          pontoMontante
        );
      }
    }
  }

  return {
    pontoInicial:
      origem,

    pontos:
      pontosEncontrados,

    trechos:
      
trechosEncontrados,

    ordemPontos,

    ordemTrechos,

    quantidadePontos:
      ordemPontos.length,

    quantidadeTrechos:
      ordemTrechos.length,
  };
}


// ==========================================================
// BUSCAR 
CAMINHO
// ==========================================================

export function buscarCaminho(
  topologia,
  pontoInicial,
  pontoFinal
) {
  if (!topologia) {
    return {
      encontrado:
        false,

      pontoInicial:
        null,

      
pontoFinal:
        null,

      pontos:
        [],

      trechos:
        [],

      distancia:
        0,

      motivo:
        "Topologia não informada",
    };
  }

  const inicio =
    
normalizarId(
      pontoInicial
    );

  const fim =
    normalizarId(
      pontoFinal
    );

  if (!inicio || !fim) {
    return {
      encontrado:
        false,

      pontoInicial:
        inicio,

      pontoFinal:
        
fim,

      pontos:
        [],

      trechos:
        [],

      distancia:
        0,

      motivo:
        "Ponto inicial ou final inválido",
    };
  }

  const pontos =
    topologia.pontos 
||
    {};

  const trechos =
    topologia.trechos ||
    {};

  const adjacencia =
    topologia.adjacencia ||
    {};

  if (!pontos[inicio]) {
    return {
      encontrado:
        false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos:
        [],

      trechos:
        [],

      distancia:
        0,

      motivo:
        "Ponto inicial não encontrado",
    };
  }

  if (!pontos[fim]) 
{
    return {
      encontrado:
        false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos:
        [],

      trechos:
        [],

      distancia:
        
0,

      motivo:
        "Ponto final não encontrado",
    };
  }

  if (
    inicio ===
    fim
  ) {
    return {
      encontrado:
        true,

      pontoInicial:
        inicio,

      
pontoFinal:
        fim,

      pontos:
        [
          inicio,
        ],

      trechos:
        [],

      distancia:
        0,

      motivo:
        null,
    };
  }

  const fila =
    [
      inicio,
    ];

  const visitados =
    new Set([
      inicio,
    ]);

  const pontoAnterior =
    {};

  const trechoAnterior =
    {};

  let encontrado =
    
false;

  while (
    fila.length >
    0
  ) {
    const atual =
      fila.shift();

    const conexoes =
      adjacencia[
        atual
      ] || [];

    for (
      const conexao of
      conexoes
    ) {
      const destino 
=
        normalizarId(
          conexao.pontoDestino
        );

      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      if (
        !destino ||
        !trechoId
      ) {
        continue;
      }

      if (
        
!trechos[
          trechoId
        ]
      ) {
        continue;
      }

      if (
        visitados.has(
          destino
        )
      ) {
        continue;
      }

      visitados.add(
        destino
      );

      pontoAnterior[
        destino
      ] =
        atual;

      trechoAnterior[
        destino
      ] =
        trechoId;

      if (
        destino ===
        fim
      ) {
        encontrado =
          true;

        
break;
      }

      fila.push(
        destino
      );
    }

    if (
      encontrado
    ) {
      break;
    }
  }

  if (!encontrado) {
    return {
      encontrado:
        
false,

      pontoInicial:
        inicio,

      pontoFinal:
        fim,

      pontos:
        [],

      trechos:
        [],

      distancia:
        0,

      motivo:
        "Não existe caminho entre os 
pontos informados",
    };
  }

  const caminhoPontos =
    [];

  const caminhoTrechos =
    [];

  let atual =
    fim;

  while (
    atual !==
    inicio
  ) {
    caminhoPontos.push(
      
atual
    );

    const trechoId =
      trechoAnterior[
        atual
      ];

    if (trechoId) {
      caminhoTrechos.push(
        trechoId
      );
    }

    atual =
      pontoAnterior[
        atual
      ];

    if (!atual) {
      return {
        encontrado:
          false,

        pontoInicial:
          inicio,

        pontoFinal:
          fim,

        pontos:
          [],

        trechos:
          [],

        
distancia:
          0,

        motivo:
          "Falha ao reconstruir o caminho",
      };
    }
  }

  caminhoPontos.push(
    inicio
  );

  caminhoPontos.reverse();

  caminhoTrechos.reverse();

  let distancia 
=
    0;

  for (
    const trechoId of
    caminhoTrechos
  ) {
    const comprimento =
      normalizarNumero(
        trechos[
          trechoId
        ]?.comprimento
      );

    if (
      comprimento !==
      null
    ) {
      distancia 
+=
        comprimento;
    }
  }

  return {
    encontrado:
      true,

    pontoInicial:
      inicio,

    pontoFinal:
      fim,

    pontos:
      caminhoPontos,

    
trechos:
      caminhoTrechos,

    distancia,

    quantidadePontos:
      caminhoPontos.length,

    quantidadeTrechos:
      caminhoTrechos.length,

    motivo:
      null,
  };
}


// 
==========================================================
// BUSCAR REDE A JUSANTE DE UM TRECHO
// ==========================================================

export function buscarRedeAJusanteDoTrecho(
  topologia,
  trechoId
) {
  const trecho =
    buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return {
      encontrado:
        false,

      pontos:
        {},

      trechos:
        {},

      ordemPontos:
        [],

      ordemTrechos:
        [],
    };
  
}

  const pontoInicial =
    normalizarId(
      trecho.pontoFinal
    );

  return buscarRedeAJusante(
    topologia,
    pontoInicial,
    {
      respeitarOrientacao:
        true,
    }
  );
}


// 
==========================================================
// RESUMO DE PONTO
// ==========================================================

export function obterResumoPonto(
  topologia,
  pontoId
) {
  const ponto =
    buscarPonto(
      topologia,
      pontoId
    );

  if (!ponto) 
{
    return null;
  }

  const conexoes =
    buscarConexoes(
      topologia,
      ponto.id
    );

  const pqts =
    buscarPQTDoPonto(
      topologia,
      ponto.id
    );

  const transformadores =
    buscarTransformadoresDoPonto(
      
topologia,
      ponto.id
    );

  const equipamentos =
    [];

  for (
    const pqt of
    pqts
  ) {
    for (
      const equipamento of
      pqt?.equipamentos ||
      []
    ) {
      equipamentos.push(
        equipamento
      
);
    }
  }

  for (
    const transformador of
    transformadores
  ) {
    for (
      const equipamento of
      transformador?.equipamentos ||
      []
    ) {
      equipamentos.push(
        equipamento
      );
    }
  
}

  return {
    ponto,

    quantidadeConexoes:
      conexoes.length,

    conexoes,

    quantidadePQT:
      pqts.length,

    pqts,

    quantidadeTransformadores:
      transformadores.length,

    
transformadores,

    quantidadeEquipamentos:
      equipamentos.length,

    equipamentos,
  };
}


// ==========================================================
// RESUMO DE TRECHO
// ==========================================================

export function 
obterResumoTrecho(
  topologia,
  trechoId
) {
  const trecho =
    buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return null;
  }

  const pontoInicial =
    buscarPonto(
      topologia,
      trecho.pontoInicial
    
);

  const pontoFinal =
    buscarPonto(
      topologia,
      trecho.pontoFinal
    );

  return {
    trecho,

    pontoInicial,

    pontoFinal,

    comprimento:
      trecho.comprimento,

    
alimentador:
      trecho.alimentador,

    circuito:
      trecho.circuito,

    subestacao:
      trecho.subestacao,

    fases:
      trecho.fases,

    condutor:
      trecho.condutor,

    codigoCondutor:
      trecho.codigoCondutor ?? trecho.condutor ?? null,

    bitola:
      trecho.bitola ?? null,

    bitolasFase:
      trecho.bitolasFase ?? [],

    correnteNominal:
      trecho.correnteNominal ?? null,

    correnteMaxima:
      trecho.correnteMaxima ?? null,

    correnteAdmissivel:
      trecho.correnteAdmissivel ?? null,

    dadosCondutorDisponiveis:
      
Boolean(trecho.dadosCondutorDisponiveis),

    situacao:
      trecho.situacao,
  };
}


// ==========================================================
// CRIAR TOPOLOGIA
// ==========================================================

export function 
criarTopologiaBDGD(
  ssdmt,
  ponnot,
  unsemt = null,
  eqse = null,
  untrmt = null,
  eqtrmt = null,
  untrat = null,
  eqtrat = null,
  segcon = null,
  tcabobit = null
) {
  console.log(
    "⚡ Criando topologia BDGD..."
  );

  // 
========================================================
  // PONTOS
  // ========================================================

  const pontos =
    criarMapaPontos(
      ponnot
    );

  // ========================================================
  // TRECHOS
  // 
========================================================

  const trechos =
    criarMapaTrechos(
      ssdmt,
      pontos
    );

  // ========================================================
  // DADOS TÉCNICOS DOS CONDUTORES
  // ========================================================
  // Os argumentos segcon e tcabobit são opcionais e mantêm 
a
  // compatibilidade com as chamadas existentes. Para preencher
  // bitola/CNOM/CMAX no sistema, o componente de carga da BDGD
  // também precisa carregar e passar esses dois cadastros.

  const diagnosticoCondutores =
    enriquecerTrechosComCondutores(
      trechos,
      segcon,
      tcabobit
    );

  console.log(
    "🔌 Diagnóstico de condutores 
BDGD:",
    diagnosticoCondutores
  );

  // ========================================================
  // ARQUIVO COMBINADO
  // ========================================================

  let unsemtReal =
    unsemt;

  let untrmtReal =
    untrmt;

  const 
temTransformadoresNoMesmoArquivo =
    (
      unsemt?.features ||
      []
    ).some(
      (
        feature
      ) => {
        const p =
          feature?.properties ||
          {};

        const tipo =
          normalizarTexto(
            p.tipoEquipamento
          );

        const tipUnid 
=
          normalizarTexto(
            p.TIP_UNID ??
            p.tipoUnidade
          );

        return (
          tipo ===
            "TRANSFORMADOR" ||
          tipUnid ===
            "38"
        );
      }
    );

  if (
    
temTransformadoresNoMesmoArquivo
  ) {
    const separados =
      separarEquipamentosCombinados(
        unsemt
      );

    unsemtReal =
      separados.unsemt;

    untrmtReal =
      separados.untrmt;

    console.log(
      "📦 Arquivo combinado detectado."
    
);

    console.log(
      "UNSEMT no arquivo:",
      separados
        .unsemt
        .features
        .length
    );

    console.log(
      "UNTRMT no arquivo:",
      separados
        .untrmt
        .features
        .length
    );
  }

  // ========================================================
  // EQSE
  // ========================================================

  const mapaEqse =
    criarMapaEquipamentosEQSE(
      eqse
    );

  // ========================================================
  // UNSEMT
  // 
========================================================

  const unidadesSeccionadoras =
    criarMapaUnidadesSeccionadoras(
      unsemtReal,
      pontos
    );

  associarEquipamentosAsUnidades(
    unidadesSeccionadoras,
    mapaEqse.porUnidade
  );

  // 
========================================================
  // UNTRMT
  // ========================================================

  const mapaUnidadesTRMT =
    criarMapaUnidadesTransformadores(
      untrmtReal,
      pontos,
      "UNTRMT"
    );

  // 
========================================================
  // EQTRMT
  // ========================================================

  const mapaEqTRMT =
    criarMapaEquipamentosTransformadores(
      eqtrmt,
      "EQTRMT"
    );

  associarEquipamentosTransformadores(
    
mapaUnidadesTRMT,
    mapaEqTRMT.porUnidade
  );

  // ========================================================
  // UNTRAT
  // ========================================================

  const mapaUnidadesTRAT =
    criarMapaUnidadesTransformadores(
      untrat,
      pontos,
      
"UNTRAT"
    );

  // ========================================================
  // EQTRAT
  // ========================================================

  const mapaEqTRAT =
    criarMapaEquipamentosTransformadores(
      eqtrat,
      "EQTRAT"
    );

  associarEquipamentosTransformadores(
    mapaUnidadesTRAT,
    mapaEqTRAT.porUnidade
  );

  // ========================================================
  // TRANSFORMADORES
  // ========================================================

  const transformadores =
    {
      
...mapaUnidadesTRMT,
      ...mapaUnidadesTRAT,
    };

  // ========================================================
  // EQUIPAMENTOS TRANSFORMADORES
  // ========================================================

  const equipamentosTransformadores =
    combinarMapasEquipamentos(
      mapaEqTRMT,
      mapaEqTRAT
    
);

  // ========================================================
  // EQUIPAMENTOS TOTAIS
  // ========================================================

  const mapaEquipamentosTotal =
    combinarMapasEquipamentos(
      mapaEqse,
      equipamentosTransformadores
    );

  // 
========================================================
  // IMPORTANTE:
  // SUBSTITUIR OBJETOS EQSE PELOS OBJETOS FÍSICOS
  // ENRIQUECIDOS DAS UNIDADES QUANDO EXISTIREM.
  //
  // Isso garante que:
  //
  // topologia.equipamentos["G02722"]
  //
  // tenha PAC, PONNOT e coordenadas.
  // ========================================================

  for (
    const unidade of
    Object.values(
      unidadesSeccionadoras
    )
  ) {
    const equipamentosDaUnidade =
      Array.isArray(
        unidade.equipamentos
      )
        ? unidade.equipamentos
        : [];

    for (
      const equipamento of
      equipamentosDaUnidade
    ) {
      const equipamentoId 
=
        normalizarId(
          equipamento?.id
        );

      if (!equipamentoId) {
        continue;
      }

      mapaEquipamentosTotal
        .equipamentos[
          equipamentoId
        ] =
        equipamento;
    }
  }

  // 
========================================================
  // ÍNDICES
  // ========================================================

  const pqtPorPonto =
    criarIndicePQTPorPonto(
      unidadesSeccionadoras
    );

  const transformadoresPorPonto =
    criarIndiceTransformadoresPorPonto(
      transformadores
    );

  // ========================================================
  // ADJACÊNCIA
  // ========================================================

  const adjacencia =
    criarAdjacencia(
      pontos,
      trechos
    );

  // ========================================================
  // DIAGNÓSTICO DE 
CONECTIVIDADE
  // ========================================================

  const diagnosticoConectividade =
    {
      trechosComPontoInicial:
        Object.values(
          trechos
        ).filter(
          (
            trecho
          ) =>
            !!trecho.pontoInicial
        ).length,

      trechosComPontoFinal:
        
Object.values(
          trechos
        ).filter(
          (
            trecho
          ) =>
            !!trecho.pontoFinal
        ).length,

      pontosResolvidosPorCoordenada:
        Object.values(
          trechos
        ).filter(
          (
            trecho
          ) =>
            trecho
              .resolucaoPontoInicial 
===
              "COORDENADA_PONNOT_REAL" ||
            trecho
              .resolucaoPontoFinal ===
              "COORDENADA_PONNOT_REAL"
        ).length,

      trechosComExtremosNaoEncontrados:
        Object.values(trechos).filter((trecho) =>
          !trecho.pontoInicial ||
          !trecho.pontoFinal ||
          !pontos[trecho.pontoInicial] 
||
          !pontos[trecho.pontoFinal]
        ).length,

      trechosComPontoInicialAusente:
        Object.values(trechos).filter((trecho) =>
          !trecho.pontoInicial || !pontos[trecho.pontoInicial]
        ).length,

      trechosComPontoFinalAusente:
        Object.values(trechos).filter((trecho) =>
          !trecho.pontoFinal || !pontos[trecho.pontoFinal]
        
).length,

      quantidadePontosReferenciadosAusentes:
        new Set(
          Object.values(trechos)
            .flatMap((trecho) => [trecho.pontoInicial, trecho.pontoFinal])
            .filter((id) => id && !pontos[id])
        ).size,

      pontosReferenciadosAusentes:
        [...new Set(
          Object.values(trechos)
            .flatMap((trecho) => [trecho.pontoInicial, 
trecho.pontoFinal])
            .filter((id) => id && !pontos[id])
        )].slice(0, 100),

      trechosComExtremosNaoEncontradosDetalhes:
        Object.values(trechos)
          .filter((trecho) =>
            !trecho.pontoInicial ||
            !trecho.pontoFinal ||
            !pontos[trecho.pontoInicial] ||
            !pontos[trecho.pontoFinal]
          )
          .slice(0, 100)
          .map((trecho) => ({
            trechoId: 
trecho.id,
            pontoInicial: trecho.pontoInicial ?? null,
            pontoFinal: trecho.pontoFinal ?? null,
            pontoInicialOriginal: trecho.pontoInicialOriginal ?? null,
            pontoFinalOriginal: trecho.pontoFinalOriginal ?? null,
            pontoInicialEncontrado: Boolean(trecho.pontoInicial && pontos[trecho.pontoInicial]),
            pontoFinalEncontrado: Boolean(trecho.pontoFinal && pontos[trecho.pontoFinal]),
            resolucaoPontoInicial: trecho.resolucaoPontoInicial ?? null,
            resolucaoPontoFinal: 
trecho.resolucaoPontoFinal ?? null,
            alimentador: trecho.alimentador ?? null,
            circuito: trecho.circuito ?? null,
          })),
    };

  // ========================================================
  // CLASSIFICAÇÃO
  // ========================================================

  const terminais =
    identificarTerminais(
      
adjacencia
    );

  const derivacoes =
    identificarDerivacoes(
      adjacencia
    );

  const passagens =
    identificarPassagens(
      adjacencia
    );

  // ========================================================
  // VALIDAÇÃO
  // 
========================================================

  const problemas =
    identificarTrechosSemPontos(
      pontos,
      trechos
    );

  const pontosIsolados =
    identificarPontosIsolados(
      pontos,
      adjacencia
    );

  const trechosInvalidos =
    identificarTrechosInvalidos(
      trechos
    
);

  // ========================================================
  // INFORMAÇÕES
  // ========================================================

  const alimentador =
    descobrirAlimentador(
      trechos
    );

  const circuito =
    descobrirCircuito(
      trechos
    
);

  const primeiroTrecho =
    Object.values(
      trechos
    )[0] ||
    null;

  // ========================================================
  // ÍNDICES OPERACIONAIS
  // ========================================================

  const indicePontosNormalizados =
    criarIndicePontosNormalizados(
      
pontos
    );

  const indiceAlimentadores =
    criarIndiceAlimentadores(
      trechos
    );

  const mapaCircuitoAlimentador =
    criarMapaCircuitoAlimentador(
      indiceAlimentadores
    );

  const indicePontosPorAlimentador =
    criarIndicePontosPorAlimentador(
      trechos
    
);

  // ========================================================
  // INTERLIGAÇÕES
  // ========================================================

  let interligacoes =
    descobrirInterligacoes(
      unsemtReal,
      pontos,
      indiceAlimentadores,
      mapaCircuitoAlimentador
    );

  // 
========================================================
  // ENRIQUECER INTERLIGAÇÕES
  // ========================================================

  interligacoes =
    enriquecerInterligacoesComEquipamentos(
      interligacoes,
      unidadesSeccionadoras
    );

  const indiceInterligacoes =
    criarIndiceInterligacoes(
      interligacoes
    
);

  // ========================================================
  // LISTAS
  // ========================================================

  const unidadesLista =
    Object.values(
      unidadesSeccionadoras
    );

  // ========================================================
  // 
CONTAGEM
  // ========================================================

  const quantidadeChavesLamina =
    unidadesLista.filter(
      (
        unidade
      ) =>
        unidade.tipoEquipamento ===
        "CHAVE_LAMINA"
    ).length;

  const quantidadeChavesFusiveis =
    unidadesLista.filter(
      (
        unidade
      ) 
=>
        unidade.tipoEquipamento ===
        "CHAVE_FUSIVEL"
    ).length;

  const quantidadeChavesSeccionadoras =
    unidadesLista.filter(
      (
        unidade
      ) =>
        unidade.tipoEquipamento ===
        "CHAVE_SECCIONADORA"
    ).length;

  const quantidadeReligadores =
    unidadesLista.filter(
      (
        
unidade
      ) =>
        unidade.tipoEquipamento ===
        "RELIGADOR"
    ).length;

  const quantidadeOutros =
    unidadesLista.filter(
      (
        unidade
      ) =>
        unidade.tipoEquipamento ===
        "OUTRO"
    ).length;

  const quantidadeTransformadores =
    Object.keys(
      
transformadores
    ).length;

  // ========================================================
  // DIAGNÓSTICO EQUIPAMENTOS
  // ========================================================

  const equipamentosComPAC =
    Object.values(
      mapaEquipamentosTotal.equipamentos
    ).filter(
      (
        
equipamento
      ) =>
        !!(
          equipamento?.pac1 ||
          equipamento?.pac2
        )
    );

  const equipamentosComCoordenadas =
    Object.values(
      mapaEquipamentosTotal.equipamentos
    ).filter(
      (
        equipamento
      ) =>
        
normalizarNumero(
          equipamento?.latitude
        ) !== null &&
        normalizarNumero(
          equipamento?.longitude
        ) !== null
    );

  const unidadesUNSEMTSemPAC =
    unidadesLista.filter(
      (
        unidade
      ) =>
        !unidade.pac1 &&
        !unidade.pac2
    );

  // 
========================================================
  // TOPOLOGIA FINAL
  // ========================================================

  const topologia = {
    diagnosticoCondutores,
    alimentador:
      alimentador ||
      primeiroTrecho?.alimentador ||
      null,

    circuito:
      circuito ||
      primeiroTrecho?.circuito ||
      
null,

    subestacao:
      primeiroTrecho?.subestacao ||
      null,

    // ------------------------------------------------------
    // PONTOS
    // ------------------------------------------------------

    pontos,

    listaPontos:
      Object.values(
        pontos
      ),

    // ------------------------------------------------------
    // TRECHOS
    // ------------------------------------------------------

    trechos,

    listaTrechos:
      Object.values(
        trechos
      ),

    // ------------------------------------------------------
    // UNSEMT
    // 
------------------------------------------------------

    unsemt:
      unsemtReal,

    unidadesSeccionadoras,

    pqt:
      unidadesSeccionadoras,

    // ------------------------------------------------------
    // EQSE
    // ------------------------------------------------------

    eqse,

    
equipamentos:
      mapaEquipamentosTotal.equipamentos,

    listaEquipamentos:
      Object.values(
        mapaEquipamentosTotal.equipamentos
      ),

    equipamentosPorUnidade:
      mapaEquipamentosTotal.porUnidade,

    // 
------------------------------------------------------
    // ÍNDICES
    // ------------------------------------------------------

    pqtPorPonto,

    indicePontosNormalizados,

    indiceAlimentadores,

    mapaCircuitoAlimentador,

    indicePontosPorAlimentador,

    // ------------------------------------------------------
    // TRANSFORMADORES
    // 
------------------------------------------------------

    transformadores,

    listaTransformadores:
      Object.values(
        transformadores
      ),

    transformadoresMT:
      mapaUnidadesTRMT,

    transformadoresAT:
      mapaUnidadesTRAT,

    equipamentosTransformadores:
      
equipamentosTransformadores.equipamentos,

    equipamentosTransformadoresPorUnidade:
      equipamentosTransformadores.porUnidade,

    transformadoresPorPonto,

    // ------------------------------------------------------
    // INTERLIGAÇÕES
    // ------------------------------------------------------

    
interligacoes,

    indiceInterligacoes,

    // ------------------------------------------------------
    // ALIMENTADORES
    // ------------------------------------------------------

    alimentadores:
      Object.keys(
        indiceAlimentadores
      ),

    listaAlimentadores:
      Object.values(
        indiceAlimentadores
      
),

    // ------------------------------------------------------
    // REDE
    // ------------------------------------------------------

    adjacencia,

    terminais,

    passagens,

    derivacoes,

    problemas,

    
pontosIsolados,

    trechosInvalidos,

    // ------------------------------------------------------
    // ORIENTAÇÃO
    // ------------------------------------------------------

    orientacaoEletrica:
      null,

    origemAutomatica:
      null,

    // ------------------------------------------------------
    // 
DIAGNÓSTICO
    // ------------------------------------------------------

    diagnosticoConectividade,

    diagnosticoEquipamentos: {
      total:
        Object.keys(
          mapaEquipamentosTotal.equipamentos
        ).length,

      comPAC:
        equipamentosComPAC.length,

      semPAC:
        
Object.keys(
          mapaEquipamentosTotal.equipamentos
        ).length -
        equipamentosComPAC.length,

      comCoordenadas:
        equipamentosComCoordenadas.length,

      semCoordenadas:
        Object.keys(
          mapaEquipamentosTotal.equipamentos
        ).length -
        
equipamentosComCoordenadas.length,

      unidadesUNSEMT:
        unidadesLista.length,

      unidadesUNSEMTComPAC:
        unidadesLista.filter(
          (
            unidade
          ) =>
            !!(
              unidade.pac1 ||
              unidade.pac2
            )
        ).length,

      unidadesUNSEMTSemPAC:
        
unidadesUNSEMTSemPAC.length,

      amostrasSemPAC:
        unidadesUNSEMTSemPAC
          .slice(
            0,
            20
          )
          .map(
            (
              unidade
            ) => ({
              id:
                unidade.id,

              tipoUnidade:
                unidade.tipoUnidade,

              
tipoEquipamento:
                unidade.tipoEquipamento,

              propriedades:
                {
                  PAC_1:
                    unidade.pac1Original,

                  PAC_2:
                    unidade.pac2Original,

                  CTMT:
                    unidade.circuito,

                  alimentador:
                    unidade.alimentador,
                },
            })
          
),
    },

    // ------------------------------------------------------
    // RESUMO
    // ------------------------------------------------------

    resumo: {
      pontos:
        Object.keys(
          pontos
        ).length,

      trechos:
        Object.keys(
          trechos
        
).length,

      trechosComCadastroCondutor:
        diagnosticoCondutores.trechosComCadastroCondutor,

      trechosComBitola:
        diagnosticoCondutores.trechosComBitola,

      trechosComCorrenteNominal:
        diagnosticoCondutores.trechosComCorrenteNominal,

      trechosComCorrenteMaxima:
        
diagnosticoCondutores.trechosComCorrenteMaxima,

      unidades:
        unidadesLista.length,

      pqt:
        unidadesLista.length,

      unidadesComEquipamento:
        unidadesLista.filter(
          (
            unidade
          ) =>
            unidade.temEquipamento
        ).length,

      equipamentos:
        
Object.keys(
          mapaEquipamentosTotal.equipamentos
        ).length,

      equipamentosEQSE:
        Object.keys(
          mapaEqse.equipamentos
        ).length,

      equipamentosTransformadores:
        Object.keys(
          equipamentosTransformadores.equipamentos
        ).length,

      
transformadores:
        quantidadeTransformadores,

      transformadoresMT:
        Object.keys(
          mapaUnidadesTRMT
        ).length,

      transformadoresAT:
        Object.keys(
          mapaUnidadesTRAT
        ).length,

      interligacoes:
        interligacoes.length,

      equipamentosTotais:
        Object.keys(
          
mapaEquipamentosTotal.equipamentos
        ).length,

      equipamentosComPAC:
        equipamentosComPAC.length,

      equipamentosComCoordenadas:
        equipamentosComCoordenadas.length,

      chavesLamina:
        quantidadeChavesLamina,

      chavesFusiveis:
        quantidadeChavesFusiveis,

      
chavesSeccionadoras:
        quantidadeChavesSeccionadoras,

      religadores:
        quantidadeReligadores,

      outros:
        quantidadeOutros,

      terminais:
        terminais.length,

      passagens:
        passagens.length,

      derivacoes:
        derivacoes.length,

      problemas:
        problemas.length,

      pontosIsolados:
        pontosIsolados.length,

      trechosInvalidos:
        trechosInvalidos.length,
    },
  };

  // ========================================================
  // ORIGEM AUTOMÁTICA
  // 
========================================================

  // Orientar automaticamente somente componentes que tenham uma origem explícita e uma cadeia radial inequívoca.
  orientarTopologiaAutomaticamente(topologia);

  // ========================================================
  // LOG PRINCIPAL
  // ========================================================

  console.log(
    "=================================================="
  );

  console.log(
    "⚡ TOPOLOGIA BDGD CRIADA"
  );

  console.log(
    "=================================================="
  );

  console.log(
    
"Alimentador:",
    topologia.alimentador
  );

  console.log(
    "Circuito:",
    topologia.circuito
  );

  console.log(
    "Subestação:",
    topologia.subestacao
  );

  console.log(
    "Pontos:",
    topologia.resumo.pontos
  );

  console.log(
    "Trechos:",
    topologia.resumo.trechos
  );

  console.log(
    "UNSEMT:",
    topologia.resumo.unidades
  );

  console.log(
    "UNSEMT com EQSE:",
    topologia.resumo.unidadesComEquipamento
  );

  
console.log(
    "--------------------------------------------------"
  );

  console.log(
    "CHAVES LÂMINA:",
    topologia.resumo.chavesLamina
  );

  console.log(
    "CHAVES FUSÍVEIS:",
    topologia.resumo.chavesFusiveis
  );

  console.log(
    "CHAVES SECCIONADORAS:",
    
topologia.resumo.chavesSeccionadoras
  );

  console.log(
    "RELIGADORES:",
    topologia.resumo.religadores
  );

  console.log(
    "OUTROS:",
    topologia.resumo.outros
  );

  console.log(
    "--------------------------------------------------"
  );

  console.log(
    "TRANSFORMADORES:",
    topologia.resumo.transformadores
  );

  console.log(
    "TRANSFORMADORES MT:",
    topologia.resumo.transformadoresMT
  );

  console.log(
    "TRANSFORMADORES AT:",
    
topologia.resumo.transformadoresAT
  );

  console.log(
    "EQ TRANSFORMADORES:",
    topologia.resumo.equipamentosTransformadores
  );

  console.log(
    "--------------------------------------------------"
  );

  console.log(
    "INTERLIGAÇÕES:",
    
topologia.resumo.interligacoes
  );

  console.log(
    "ALIMENTADORES:",
    topologia.alimentadores
  );

  console.log(
    "--------------------------------------------------"
  );

  console.log(
    "EQUIPAMENTOS COM PAC:",
    topologia.diagnosticoEquipamentos.comPAC
  
);

  console.log(
    "EQUIPAMENTOS SEM PAC:",
    topologia.diagnosticoEquipamentos.semPAC
  );

  console.log(
    "EQUIPAMENTOS COM COORDENADAS:",
    topologia.diagnosticoEquipamentos
      .comCoordenadas
  );

  console.log(
    "EQUIPAMENTOS SEM 
COORDENADAS:",
    topologia.diagnosticoEquipamentos
      .semCoordenadas
  );

  console.log(
    "UNSEMT SEM PAC:",
    topologia.diagnosticoEquipamentos
      .unidadesUNSEMTSemPAC
  );

  console.log(
    "--------------------------------------------------"
  );

  
console.log(
    "TERMINAIS:",
    topologia.resumo.terminais
  );

  console.log(
    "PASSAGENS:",
    topologia.resumo.passagens
  );

  console.log(
    "DERIVAÇÕES:",
    topologia.resumo.derivacoes
  );

  console.log(
    "PROBLEMAS:",
    topologia.resumo.problemas
  
);

  console.log(
    "PONTOS ISOLADOS:",
    topologia.resumo.pontosIsolados
  );

  console.log(
    "TRECHOS INVÁLIDOS:",
    topologia.resumo.trechosInvalidos
  );

  console.log(
    "--------------------------------------------------"
  );

  
console.log(
    "DIAGNÓSTICO CONECTIVIDADE:",
    diagnosticoConectividade
  );

  if (
    topologia.origemAutomatica
  ) {
    console.log(
      "ORIGEM AUTOMÁTICA:",
      topologia.origemAutomatica
    );
  }

  if (
    topologia.orientacaoEletrica
  ) {
    
console.log(
      "PONTOS ORIENTADOS:",
      topologia.orientacaoEletrica
        .quantidadePontos
    );

    console.log(
      "TRECHOS ORIENTADOS:",
      topologia.orientacaoEletrica
        .quantidadeTrechos
    );

    console.log(
      "PONTOS NÃO ORIENTADOS:",
      topologia.orientacaoEletrica
        .quantidadePontosNaoOrientados
    );

    console.log(
      "TRECHOS NÃO ORIENTADOS:",
      topologia.orientacaoEletrica
        .quantidadeTrechosNaoOrientados
    );

    console.log(
      "ORIENTAÇÃO COMPLETA:",
      topologia.orientacaoEletrica
        .orientacaoCompleta
    );
  }

  console.log(
    
"=================================================="
  );

  // ========================================================
  // DIAGNÓSTICO ESPECÍFICO G02722
  // ========================================================

  const equipamentoG02722 =
    topologia.equipamentos?.[
      "G02722"
    ] ||
    
topologia.unidadesSeccionadoras?.[
      "G02722"
    ] ||
    null;

  if (
    equipamentoG02722
  ) {
    console.log(
      "=================================================="
    );

    console.log(
      "🔎 DIAGNÓSTICO G02722"
    );

    
console.log(
      "=================================================="
    );

    console.log(
      "ID:",
      equipamentoG02722.id
    );

    console.log(
      "Tipo:",
      equipamentoG02722.tipoEquipamento
    );

    
console.log(
      "TIP_UNID:",
      equipamentoG02722.tipoUnidade
    );

    console.log(
      "PAC_1:",
      equipamentoG02722.pac1
    );

    console.log(
      "PAC_2:",
      equipamentoG02722.pac2
    );

    console.log(
      "Ponto associado:",
      
equipamentoG02722.pontoAssociado
    );

    console.log(
      "Latitude:",
      equipamentoG02722.latitude
    );

    console.log(
      "Longitude:",
      equipamentoG02722.longitude
    );

    console.log(
      "Origem coordenada:",
      equipamentoG02722
        .coordenadas
        
?.origem
    );

    console.log(
      "Alimentador:",
      equipamentoG02722.alimentador
    );

    console.log(
      "Circuito:",
      equipamentoG02722.circuito
    );

    console.log(
      "=================================================="
    
);
  }

  return topologia;
}


// ==========================================================
// ORIENTAR TOPOLOGIA MANUALMENTE
// ==========================================================

export function orientarTopologia(
  topologia,
  
pontoOrigem
) {
  if (!topologia) return null;
  const origensConfiguradas = normalizarListaOrigens(pontoOrigem).map(pontoId => ({
    pontoId,
    metodo: "CONFIGURADA_MANUALMENTE",
    evidencias: ["VITE_CMG_PONTOS_ORIGEM / operador"],
  }));
  const orientacao = orientarTopologiaPorOrigens(topologia, origensConfiguradas, "CONFIGURADA_MANUALMENTE");
  console.log("🧭 [Power Grid 
Monitor] Orientação configurada:", {
    origensSolicitadas: origensConfiguradas.map(item => item.pontoId),
    origensConfirmadas: orientacao?.origensConfirmadas?.map(item => item.pontoId) ?? [],
    origensInvalidas: orientacao?.origensInvalidas ?? [],
    pontosOrientados: orientacao?.quantidadePontos ?? 0,
    trechosOrientados: orientacao?.quantidadeTrechos ?? 0,
    pontosNaoOrientados: orientacao?.quantidadePontosNaoOrientados ?? 0,
    trechosNaoOrientados: 
orientacao?.quantidadeTrechosNaoOrientados ?? 0,
    componentesBloqueados: orientacao?.componentesBloqueados?.length ?? 0,
  });
  return orientacao;
}


// ==========================================================
// ORIENTAR AUTOMATICAMENTE
// ==========================================================

export function 
orientarTopologiaAutomaticamente(
  topologia
) {
  if (!topologia) return null;
  const origens = encontrarOrigensAutomaticas(topologia);
  const orientacao = orientarTopologiaPorOrigens(topologia, origens, "MARCADOR_EXPLICITO_PONNOT");
  topologia.origensAutomaticasDetectadas = origens;
  if (origens.length === 0) {
    console.warn("⚠️ Nenhuma origem elétrica explícita 
encontrada nos pontos BDGD. Configure VITE_CMG_PONTOS_ORIGEM com COD_ID reais dos pontos-fonte verificados; a análise permanecerá condicionada.");
  } else if ((orientacao?.origensConfirmadas?.length ?? 0) === 0) {
    console.warn("⚠️ Marcadores de origem foram encontrados, mas nenhum componente pôde ser orientado sem ambiguidade. Confira múltiplas fontes, ciclos e conectividade.", {
      origensDetectadas: origens.map(item => item.pontoId),
      componentesBloqueados: 
orientacao?.componentesBloqueados ?? [],
    });
  }
  return orientacao;
}


// ==========================================================
// BUSCAR PONTO
// ==========================================================

export function buscarPonto(
  topologia,
  
codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return null;
  }

  return (
    topologia?.pontos?.[
      id
    ] ||
    null
  );
}


// ==========================================================
// BUSCAR TRECHO
// ==========================================================

export function buscarTrechoBDGD(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    
);

  if (!id) {
    return null;
  }

  return (
    topologia?.trechos?.[
      id
    ] ||
    null
  );
}


// ==========================================================
// BUSCAR 
CONEXÕES
// ==========================================================

export function buscarConexoes(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return [];
  }

  return 
(
    topologia
      ?.adjacencia
      ?.[id] ||
    []
  );
}


// ==========================================================
// BUSCAR TRECHOS CONECTADOS
// ==========================================================

export function 
buscarTrechosConectados(
  topologia,
  codId
) {
  const conexoes =
    buscarConexoes(
      topologia,
      codId
    );

  return conexoes
    .map(
      (
        conexao
      ) =>
        topologia?.trechos?.[
          conexao.trechoId
        ]
    
)
    .filter(
      Boolean
    );
}


// ==========================================================
// BUSCAR TRECHOS A PARTIR DO PONTO
// ==========================================================

export function buscarTrechosApartirDePonto(
  
topologia,
  codId
) {
  const pontoId =
    normalizarId(
      codId
    );

  if (!pontoId) {
    return [];
  }

  return buscarConexoes(
    topologia,
    pontoId
  )
    .map(
      (
        
conexao
      ) => {
        const trecho =
          topologia?.trechos?.[
            conexao.trechoId
          ];

        if (!trecho) {
          return null;
        }

        return {
          ...trecho,

          trechoId:
            conexao.trechoId,

          pontoOrigem:
            
pontoId,

          pontoDestino:
            conexao.pontoDestino,

          sentido:
            conexao.sentido,
        };
      }
    )
    .filter(
      Boolean
    );
}


// 
==========================================================
// BUSCAR TRECHOS DE SAÍDA
// ==========================================================

export function buscarTrechosDeSaida(
  topologia,
  codId
) {
  return buscarTrechosApartirDePonto(
    topologia,
    codId
  ).filter(
    (
      
item
    ) =>
      item.sentido ===
      "SAIDA"
  );
}


// ==========================================================
// BUSCAR TRECHOS DE ENTRADA
// ==========================================================

export function buscarTrechosDeEntrada(
  
topologia,
  codId
) {
  return buscarTrechosApartirDePonto(
    topologia,
    codId
  ).filter(
    (
      item
    ) =>
      item.sentido ===
      "ENTRADA"
  );
}


// 
==========================================================
// PONTO TERMINAL
// ==========================================================

export function pontoEhTerminal(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  
}

  return (
    topologia?.terminais?.includes(
      id
    ) ||
    false
  );
}


// ==========================================================
// PONTO DERIVAÇÃO
// ==========================================================

export function pontoEhDerivacao(
  topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  }

  return (
    topologia?.derivacoes?.some(
      (
        item
      ) 
=>
        item?.pontoId ===
        id
    ) ||
    false
  );
}


// ==========================================================
// PONTO PASSAGEM
// ==========================================================

export function pontoEhPassagem(
  
topologia,
  codId
) {
  const id =
    normalizarId(
      codId
    );

  if (!id) {
    return false;
  }

  return (
    topologia?.passagens?.includes(
      id
    ) ||
    false
  );
}


// ==========================================================
// BUSCAR PONTO DESTINO
// ==========================================================

export function buscarPontoDestino(
  topologia,
  trechoId,
  pontoOrigem
) {
  const trecho =
    
buscarTrechoBDGD(
      topologia,
      trechoId
    );

  if (!trecho) {
    return null;
  }

  const origem =
    normalizarId(
      pontoOrigem
    );

  if (!origem) {
    return null;
  }

  if 
(
    normalizarId(
      trecho.pontoInicial
    ) ===
    origem
  ) {
    return buscarPonto(
      topologia,
      trecho.pontoFinal
    );
  }

  if (
    normalizarId(
      trecho.pontoFinal
    ) ===
    origem
  ) {
    return 
buscarPonto(
      topologia,
      trecho.pontoInicial
    );
  }

  return null;
}


// ==========================================================
// BUSCAR REDE CONECTADA
// ==========================================================

export function 
buscarRedeConectada(
  topologia,
  pontoInicial
) {
  if (!topologia) {
    return {
      pontoInicial:
        null,

      pontos:
        {},

      trechos:
        {},

      ordemPontos:
        [],

      
ordemTrechos:
        [],
    };
  }

  const inicio =
    normalizarId(
      pontoInicial
    );

  if (!inicio) {
    return {
      pontoInicial:
        null,

      pontos:
        {},

      
trechos:
        {},

      ordemPontos:
        [],

      ordemTrechos:
        [],
    };
  }

  const pontos =
    topologia.pontos ||
    {};

  const trechos =
    topologia.trechos ||
    {};

  const adjacencia =
    topologia.adjacencia ||
    {};

  const pontosEncontrados =
    {};

  const trechosEncontrados =
    {};

  const ordemPontos =
    [];

  const ordemTrechos =
    [];

  const visitados =
    new 
Set();

  const trechosVisitados =
    new Set();

  const fila =
    [
      inicio,
    ];

  while (
    fila.length >
    0
  ) {
    const pontoAtual =
      normalizarId(
        fila.shift()
      );

    if (
      !pontoAtual ||
      visitados.has(
        pontoAtual
      )
    ) {
      continue;
    }

    visitados.add(
      pontoAtual
    );

    const ponto =
      pontos[
        pontoAtual
      ];

    if (!ponto) {
      continue;
    }

    pontosEncontrados[
      pontoAtual
    ] =
      ponto;

    ordemPontos.push(
      pontoAtual
    );

    const conexoes =
      adjacencia[
        pontoAtual
      ] || [];

    for (
      const conexao of
      conexoes
    ) {
      const trechoId =
        normalizarId(
          conexao.trechoId
        );

      const destino =
        normalizarId(
          conexao.pontoDestino
        );

      if (
        !trechoId ||
        !destino
      ) 
{
        continue;
      }

      if (
        !trechos[
          trechoId
        ]
      ) {
        continue;
      }

      if (
        !trechosVisitados.has(
          trechoId
        )
      ) {
        trechosVisitados.add(
          
trechoId
        );

        trechosEncontrados[
          trechoId
        ] =
          trechos[
            trechoId
          ];

        ordemTrechos.push(
          trechoId
        );
      }

      if (
        !visitados.has(
          destino
        
)
      ) {
        fila.push(
          destino
        );
      }
    }
  }

  return {
    pontoInicial:
      inicio,

    pontos:
      pontosEncontrados,

    trechos:
      trechosEncontrados,

    ordemPontos,

    ordemTrechos,

    quantidadePontos:
      ordemPontos.length,

    quantidadeTrechos:
      ordemTrechos.length,
  };
}


// ==========================================================
// BUSCAR PQT
// 
==========================================================

export function buscarPQT(
  topologia,
  pqtId
) {
  const id =
    normalizarId(
      pqtId
    );

  if (!id) {
    return null;
  }

  return (
    topologia
      
?.unidadesSeccionadoras
      ?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR EQUIPAMENTOS DA PQT
// ==========================================================

export function buscarEquipamentosDaPQT(
  topologia,
  
pqtId
) {
  return (
    buscarPQT(
      topologia,
      pqtId
    )?.equipamentos ||
    []
  );
}


// ==========================================================
// BUSCAR PQT DO PONTO
// 
==========================================================

export function buscarPQTDoPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarId(
      pontoId
    );

  if (!id) {
    return [];
  }

  return (
    
topologia
      ?.pqtPorPonto
      ?.[id] ||
    []
  )
    .map(
      (
        pqtId
      ) =>
        buscarPQT(
          topologia,
          pqtId
        )
    )
    .filter(
      Boolean
    );
}


// ==========================================================
// BUSCAR TRANSFORMADOR
// ==========================================================

export function buscarTransformador(
  topologia,
  transformadorId
) {
  const id =
    normalizarId(
      transformadorId
    
);

  if (!id) {
    return null;
  }

  return (
    topologia
      ?.transformadores
      ?.[id] ||
    null
  );
}


// ==========================================================
// BUSCAR TRANSFORMADORES 
DO PONTO
// ==========================================================

export function buscarTransformadoresDoPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarId(
      pontoId
    );

  if (!id) {
    return [];
  }

  const ids =
    topologia
      ?.transformadoresPorPonto
      ?.[id] ||
    [];

  return ids
    .map(
      (
        transformadorId
      ) =>
        buscarTransformador(
          topologia,
          transformadorId
        )
    )
    .filter(
      
Boolean
    );
}


// ==========================================================
// BUSCAR EQUIPAMENTOS DO TRANSFORMADOR
// ==========================================================

export function buscarEquipamentosDoTransformador(
  topologia,
  
transformadorId
) {
  return (
    buscarTransformador(
      topologia,
      transformadorId
    )?.equipamentos ||
    []
  );
}


// ==========================================================
// BUSCAR EQUIPAMENTO PRINCIPAL DA PQT
// 
==========================================================

export function buscarEquipamentoPrincipalPQT(
  topologia,
  pqtId
) {
  return (
    buscarPQT(
      topologia,
      pqtId
    )?.equipamentoPrincipal ||
    null
  );
}


// 
==========================================================
// BUSCAR TIPO DE EQUIPAMENTO
// ==========================================================

export function buscarTipoEquipamentoPQT(
  topologia,
  pqtId
) {
  return (
    buscarPQT(
      topologia,
      pqtId
    )?.tipoEquipamento ||
    null
  
);
}


// ==========================================================
// BUSCAR INTERLIGAÇÕES
// ==========================================================

export function buscarInterligacoes(
  topologia
) {
  return Array.isArray(
    topologia?.interligacoes
  
)
    ? topologia.interligacoes
    : [];
}


export function buscarInterligacoesDoPonto(
  topologia,
  pontoId
) {
  const id =
    normalizarIdBasePAC(
      pontoId
    );

  if (!id) {
    return [];
  
}

  return (
    topologia
      ?.indiceInterligacoes
      ?.porPonto?.[
        id
      ] ||
    []
  );
}


export function buscarInterligacoesAlimentador(
  topologia,
  alimentador
) {
  const id 
=
    normalizarAlimentador(
      alimentador,
      alimentador
    );

  if (!id) {
    return [];
  }

  return (
    topologia
      ?.indiceInterligacoes
      ?.porAlimentador?.[
        id
      ] ||
    []
  );
}


export function buscarInterligacoesEntreAlimentadores(
  topologia,
  alimentadorA,
  alimentadorB
) {
  const a =
    normalizarAlimentador(
      alimentadorA,
      alimentadorA
    );

  const b =
    normalizarAlimentador(
      
alimentadorB,
      alimentadorB
    );

  if (
    !a ||
    !b
  ) {
    return [];
  }

  return buscarInterligacoes(
    topologia
  ).filter(
    (
      item
    ) =>
      (
        item.alimentadorA 
===
          a &&
        item.alimentadorB ===
          b
      ) ||
      (
        item.alimentadorA ===
          b &&
        item.alimentadorB ===
          a
      )
  );
}


// ==========================================================
// CONTAGEM POR 
TIPO
// ==========================================================

export function obterContagemEquipamentos(
  topologia
) {
  const resultado = {
    CHAVE_LAMINA:
      0,

    CHAVE_FUSIVEL:
      0,

    CHAVE_SECCIONADORA:
      0,

    RELIGADOR:
      0,

    TRANSFORMADOR:
      0,

    OUTRO:
      0,
  };

  if (!topologia) {
    return resultado;
  }

  for (
    const unidade of
    Object.values(
      
topologia
        .unidadesSeccionadoras ||
      {}
    )
  ) {
    const tipo =
      unidade.tipoEquipamento;

    if (
      Object.prototype.hasOwnProperty.call(
        resultado,
        tipo
      )
    ) {
      resultado[
        tipo
      ] 
+=
        1;
    } else {
      resultado.OUTRO +=
        1;
    }
  }

  for (
    const transformador of
    Object.values(
      topologia
        .transformadores ||
      {}
    )
  ) {
    if (
      transformador.tipoEquipamento 
===
      "TRANSFORMADOR"
    ) {
      resultado.TRANSFORMADOR +=
        1;
    }
  }

  return resultado;
}


// ==========================================================
// EXPORTS AUXILIARES
// 
==========================================================

export {
  normalizarId,

  normalizarNumero,

  normalizarTexto,

  normalizarIdPontoAssociado,

  classificarEquipamentoEQSE,

  classificarUnidadeUNSEMT,

  classificarUnidadeTransformador,

  
obterNomeTipoEquipamento,

  criarMapaEquipamentosEQSE,

  criarMapaUnidadesSeccionadoras,

  criarMapaUnidadesTransformadores,

  criarMapaEquipamentosTransformadores,

  criarIndiceTransformadoresPorPonto,

  
criarIndicePQTPorPonto,

  criarIndiceAlimentadores,

  criarMapaCircuitoAlimentador,

  criarIndicePontosPorAlimentador,

  criarIndicePontosNormalizados,

  descobrirInterligacoes,

  enriquecerInterligacoesComEquipamentos,

  normalizarCircuito,

  
extrairCircuitoDoIdPAC,

  normalizarIdBasePAC,

  normalizarAlimentador,

  obterCoordenadasEquipamento,

  obterRegistrosCadastro,

  criarIndiceCadastroPorCodigo,

  enriquecerTrechosComCondutores,
};