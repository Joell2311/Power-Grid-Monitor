import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from "@mui/material";

import useCoiStore from "../core/store/coiStore";


// ==========================================================
// POWER GRID MONITOR
// MANOBRA FORM
// ==========================================================
//
// Responsável por:
//
// - Informar correntes operacionais
// - Executar análise automática de recomposição
// - Exibir candidatos encontrados pela BDGD
// - Exibir recomendação
// - Exibir sequência de manobra
// - Executar ABRIR / FECHAR
// - Exibir estado operacional atualizado
// - Manter sincronização com COI Store
//
// ==========================================================


// ==========================================================
// UTILITÁRIOS
// ==========================================================

function normalizarId(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor).trim();
}


function normalizarChaveEquipamento(valor) {
  const id = normalizarId(valor);

  if (!id) {
    return "";
  }

  return id
    .replace(/-M-\d+$/i, "")
    .replace(/-M$/i, "")
    .replace(/M$/i, "")
    .trim();
}


function converterCorrente(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim()
      .replace(",", ".");

  if (!texto) {
    return null;
  }

  const numero =
    Number(texto);

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return null;
  }

  return numero;
}


function normalizarEstado(valor) {
  const texto =
    normalizarId(valor)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (
    texto === "ABERTO" ||
    texto === "ABERTA" ||
    texto === "OPEN" ||
    texto === "OFF" ||
    texto === "0" ||
    texto === "A"
  ) {
    return "ABERTO";
  }

  if (
    texto === "FECHADO" ||
    texto === "FECHADA" ||
    texto === "CLOSED" ||
    texto === "ON" ||
    texto === "1" ||
    texto === "F" ||
    texto === "LIGADO"
  ) {
    return "FECHADO";
  }

  if (
    texto === "INDISPONIVEL" ||
    texto === "INDISPONIVEL"
  ) {
    return "INDISPONIVEL";
  }

  if (
    texto === "BYPASSADO" ||
    texto === "BYPASS"
  ) {
    return "BYPASSADO";
  }

  return "";
}


function obterEstadoDoEquipamento(
  equipamentos,
  equipamentoId
) {
  const id =
    normalizarId(equipamentoId);

  const chave =
    normalizarChaveEquipamento(id);

  if (!id) {
    return "FECHADO";
  }

  if (
    !equipamentos ||
    typeof equipamentos !== "object"
  ) {
    return "FECHADO";
  }

  const candidatos = [
    id,
    chave,
  ].filter(Boolean);

  for (const candidato of candidatos) {
    const registro =
      equipamentos[candidato];

    if (
      typeof registro === "string"
    ) {
      const estado =
        normalizarEstado(registro);

      if (estado) {
        return estado;
      }
    }

    if (
      registro &&
      typeof registro === "object"
    ) {
      const estado =
        normalizarEstado(
          registro.estado ??
          registro.status ??
          registro.estadoOperacional
        );

      if (estado) {
        return estado;
      }
    }
  }

  return "FECHADO";
}


// ==========================================================
// COMPONENTE
// ==========================================================

function ManobraForm({
  ocorrencia,
}) {

  const {
    analiseCOI,

    analisarRecomposicao,

    executarManobra,

    equipamentos,
  } = useCoiStore();


  // ========================================================
  // ESTADOS LOCAIS
  // ========================================================

  const [
    correnteDesligado,
    setCorrenteDesligado,
  ] = useState("");


  const [
    correnteDestino,
    setCorrenteDestino,
  ] = useState("");


  const [
    resultadoLocal,
    setResultadoLocal,
  ] = useState(null);


  const [
    errosValidacao,
    setErrosValidacao,
  ] = useState({
    correnteDesligado: false,
    correnteDestino: false,
  });


  const [
    executandoManobra,
    setExecutandoManobra,
  ] = useState(false);


  const [
    mensagemManobra,
    setMensagemManobra,
  ] = useState(null);


  // ========================================================
  // CARREGAR OCORRÊNCIA
  // ========================================================

  useEffect(() => {

    if (!ocorrencia) {

      setCorrenteDesligado("");

      setCorrenteDestino("");

      setResultadoLocal(null);

      setMensagemManobra(null);

      setErrosValidacao({
        correnteDesligado: false,
        correnteDestino: false,
      });

      return;
    }


    const correnteInicialDesligado =
      ocorrencia?.manobra?.correnteDesligado;


    const correnteInicialDestino =
      ocorrencia?.manobra?.correnteDestino;


    setCorrenteDesligado(

      correnteInicialDesligado !== null &&
      correnteInicialDesligado !== undefined

        ? String(
            correnteInicialDesligado
          )

        : ""
    );


    setCorrenteDestino(

      correnteInicialDestino !== null &&
      correnteInicialDestino !== undefined

        ? String(
            correnteInicialDestino
          )

        : ""
    );


    setResultadoLocal(null);

    setMensagemManobra(null);

    setErrosValidacao({
      correnteDesligado: false,
      correnteDestino: false,
    });

  }, [
    ocorrencia,
  ]);


  // ========================================================
  // CANDIDATOS
  // ========================================================

  const candidatos =
    useMemo(
      () => {

        if (
          !Array.isArray(
            analiseCOI?.candidatos
          )
        ) {
          return [];
        }

        return analiseCOI.candidatos;

      },
      [
        analiseCOI,
      ]
    );


  // ========================================================
  // RECOMENDAÇÃO
  // ========================================================

  const recomendacao =
    analiseCOI?.recomendacao ||
    resultadoLocal?.recomendacao ||
    null;


  // ========================================================
  // EQUIPAMENTO RECOMENDADO
  // ========================================================

  const equipamentoRecomendado =
    normalizarId(
      recomendacao?.equipamentoInterligacao
    );


  const chaveEquipamentoRecomendado =
    normalizarChaveEquipamento(
      equipamentoRecomendado
    );


  // ========================================================
  // ESTADO ATUAL DO EQUIPAMENTO
  // ========================================================

  const estadoEquipamento =
    useMemo(
      () => {

        if (
          !equipamentoRecomendado
        ) {
          return "";
        }

        return obterEstadoDoEquipamento(
          equipamentos,
          equipamentoRecomendado
        );

      },
      [
        equipamentos,
        equipamentoRecomendado,
      ]
    );


  // ========================================================
  // AÇÃO RECOMENDADA
  // ========================================================

  const acaoRecomendada =
    useMemo(
      () => {

        const sequencia =
          recomendacao?.sequenciaManobra;

        if (
          Array.isArray(sequencia) &&
          sequencia.length > 0
        ) {

          const passo =
            sequencia.find(
              (item) => {

                const acao =
                  normalizarId(
                    item?.acao
                  ).toUpperCase();

                return (
                  acao === "ABRIR" ||
                  acao === "FECHAR"
                );
              }
            );

          if (passo) {

            const acao =
              normalizarId(
                passo?.acao
              ).toUpperCase();

            if (
              acao === "ABRIR" ||
              acao === "FECHAR"
            ) {
              return acao;
            }
          }
        }


        // --------------------------------------------------
        // Pela lógica atual do motor:
        //
        // candidato de recomposição deve estar ABERTO
        // e a manobra de recomposição é FECHAR.
        // --------------------------------------------------

        if (
          estadoEquipamento === "ABERTO"
        ) {
          return "FECHAR";
        }


        return "FECHAR";

      },
      [
        recomendacao,
        estadoEquipamento,
      ]
    );


  // ========================================================
  // EQUIPAMENTO JÁ MANOBRADO
  // ========================================================

  const manobraExecutada =
    resultadoLocal?.manobraExecutada === true;


  // ========================================================
  // ANALISAR
  // ========================================================

  function calcular() {

    const correnteFalta =
      converterCorrente(
        correnteDesligado
      );


    const correnteAtual =
      converterCorrente(
        correnteDestino
      );


    const faltaDesligado =
      correnteFalta === null;


    const faltaDestino =
      correnteAtual === null;


    // ------------------------------------------------------
    // VALIDAR CORRENTES
    // ------------------------------------------------------

    if (
      faltaDesligado ||
      faltaDestino
    ) {

      setErrosValidacao({
        correnteDesligado:
          faltaDesligado,

        correnteDestino:
          faltaDestino,
      });


      setResultadoLocal({

        sucesso:
          false,

        status:
          "DADOS_INCOMPLETOS",

        mensagem:
          "Informe a corrente do trecho no momento do desarme e a corrente atual do trecho receptor.",

      });

      setMensagemManobra(null);

      return;
    }


    setErrosValidacao({
      correnteDesligado: false,
      correnteDestino: false,
    });


    // ------------------------------------------------------
    // GARANTIR OCORRÊNCIA
    // ------------------------------------------------------

    if (!ocorrencia) {

      const resultado = {

        sucesso:
          false,

        status:
          "SEM_OCORRENCIA",

        mensagem:
          "Não existe ocorrência ativa para realizar a análise.",
      };


      setResultadoLocal(
        resultado
      );

      return;
    }


    // ------------------------------------------------------
    // EXECUTAR MOTOR
    // ------------------------------------------------------

    let resultado;


    try {

      resultado =
        analisarRecomposicao({

          correnteDesligado:
            correnteFalta,

          correnteDestino:
            correnteAtual,
        });


    } catch (erro) {

      console.error(
        "[Power Grid Monitor] Erro ao analisar recomposição:",
        erro
      );


      resultado = {

        sucesso:
          false,

        status:
          "ERRO_MOTOR",

        mensagem:
          erro?.message ||
          "Erro ao executar o motor de recomposição.",
      };
    }


    setResultadoLocal(
      resultado
    );


    setMensagemManobra(null);


    // ------------------------------------------------------
    // LOG OPERACIONAL
    // ------------------------------------------------------

    console.log(
      "=========================================="
    );

    console.log(
      "[Power Grid Monitor] ANÁLISE AUTOMÁTICA DE RECOMPOSIÇÃO"
    );

    console.log({

      ocorrencia:
        ocorrencia?.id,

      equipamentoDesarme:
        ocorrencia?.equipamentoDesarme,

      alimentador:
        ocorrencia?.alimentador,

      correnteDesligado:
        correnteFalta,

      correnteDestino:
        correnteAtual,

      equipamentoInterligacao:
        resultado
          ?.recomendacao
          ?.equipamentoInterligacao
        ||
        null,

      quantidadeCandidatos:
        resultado
          ?.quantidadeCandidatos
        ??
        0,

    });

    console.log(
      "=========================================="
    );
  }


  // ========================================================
  // EXECUTAR MANOBRA
  // ========================================================

  function executarAcaoManobra(
    acao
  ) {

    const acaoNormalizada =
      normalizarId(
        acao
      ).toUpperCase();


    if (
      acaoNormalizada !== "ABRIR" &&
      acaoNormalizada !== "FECHAR"
    ) {

      setMensagemManobra({

        sucesso:
          false,

        mensagem:
          `Ação de manobra inválida: ${acao}.`,
      });

      return;
    }


    if (
      !equipamentoRecomendado
    ) {

      setMensagemManobra({

        sucesso:
          false,

        mensagem:
          "Nenhum equipamento de interligação foi selecionado para a manobra.",
      });

      return;
    }


    // ------------------------------------------------------
    // BLOQUEIO OPERACIONAL
    // ------------------------------------------------------

    if (
      estadoEquipamento ===
      "INDISPONIVEL"
    ) {

      setMensagemManobra({

        sucesso:
          false,

        mensagem:
          `O equipamento ${equipamentoRecomendado} está indisponível e não pode ser manobrado.`,
      });

      return;
    }


    // ------------------------------------------------------
    // EVITAR COMANDO REDUNDANTE
    // ------------------------------------------------------

    if (
      acaoNormalizada === "FECHAR" &&
      estadoEquipamento === "FECHADO"
    ) {

      setMensagemManobra({

        sucesso:
          true,

        mensagem:
          `O equipamento ${equipamentoRecomendado} já está FECHADO.`,

        estado:
          "FECHADO",
      });

      return;
    }


    if (
      acaoNormalizada === "ABRIR" &&
      estadoEquipamento === "ABERTO"
    ) {

      setMensagemManobra({

        sucesso:
          true,

        mensagem:
          `O equipamento ${equipamentoRecomendado} já está ABERTO.`,

        estado:
          "ABERTO",
      });

      return;
    }


    // ------------------------------------------------------
    // EXECUTAR
    // ------------------------------------------------------

    setExecutandoManobra(
      true
    );

    setMensagemManobra(null);


    console.log(
      "=========================================="
    );

    console.log(
      "[Power Grid Monitor] EXECUTANDO MANOBRA"
    );

    console.log({

      equipamento:
        equipamentoRecomendado,

      chaveNormalizada:
        chaveEquipamentoRecomendado,

      acao:
        acaoNormalizada,

      estadoAntes:
        estadoEquipamento,

      ocorrencia:
        ocorrencia?.id,

    });

    console.log(
      "=========================================="
    );


    let resultado;


    try {

      resultado =
        executarManobra(

          equipamentoRecomendado,

          acaoNormalizada,

          {

            origem:
              "RECOMPOSICAO_AUTOMATICA",

            ocorrenciaId:
              ocorrencia?.id ??
              null,

            equipamentoDesarme:
              ocorrencia?.equipamentoDesarme ??
              null,

          }
        );


    } catch (erro) {

      console.error(
        "[Power Grid Monitor] Erro ao executar manobra:",
        erro
      );


      resultado = {

        sucesso:
          false,

        mensagem:
          erro?.message ||
          "Erro ao executar a manobra.",
      };
    }


    setExecutandoManobra(
      false
    );


    // ------------------------------------------------------
    // RESULTADO
    // ------------------------------------------------------

    if (
      resultado?.sucesso
    ) {

      const estadoEsperado =
        acaoNormalizada === "ABRIR"
          ? "ABERTO"
          : "FECHADO";


      console.log(
        "[Power Grid Monitor] MANOBRA EXECUTADA COM SUCESSO"
      );


      console.log({

        equipamento:
          equipamentoRecomendado,

        acao:
          acaoNormalizada,

        estadoEsperado,

        resultado,

      });


      setMensagemManobra({

        sucesso:
          true,

        mensagem:
          resultado?.mensagem ||
          `Manobra ${acaoNormalizada} executada com sucesso.`,

        estado:
          resultado?.estado ||
          resultado?.estadoNovo ||
          estadoEsperado,

      });


      setResultadoLocal(
        (anterior) => ({

          ...(anterior || {}),

          manobraExecutada:
            true,

          resultadoManobra:
            resultado,

          equipamentoManobrado:
            equipamentoRecomendado,

          acaoManobra:
            acaoNormalizada,

          estadoEquipamento:
            resultado?.estado ||
            resultado?.estadoNovo ||
            estadoEsperado,

        })
      );


    } else {

      console.error(
        "[Power Grid Monitor] MANOBRA REJEITADA"
      );

      console.error(
        resultado
      );


      setMensagemManobra({

        sucesso:
          false,

        mensagem:
          resultado?.mensagem ||
          resultado?.motivo ||
          "A manobra não foi executada.",
      });
    }
  }


  // ========================================================
  // EXECUTAR RECOMENDAÇÃO
  // ========================================================

  function executarRecomendacao() {

    executarAcaoManobra(
      acaoRecomendada
    );
  }


  // ========================================================
  // RESULTADO EFETIVO
  // ========================================================

  const resultadoExibido =
    resultadoLocal ||
    analiseCOI ||
    null;


  // ========================================================
  // LABEL DO ESTADO
  // ========================================================

  function obterLabelEstado(
    estado
  ) {

    switch (
      estado
    ) {

      case "ABERTO":
        return "ABERTO";

      case "FECHADO":
        return "FECHADO";

      case "INDISPONIVEL":
        return "INDISPONÍVEL";

      case "BYPASSADO":
        return "BYPASSADO";

      default:
        return "DESCONHECIDO";
    }
  }


  // ========================================================
  // COR DO ESTADO
  // ========================================================

  function obterCorEstado(
    estado
  ) {

    switch (
      estado
    ) {

      case "ABERTO":
        return "warning";

      case "FECHADO":
        return "success";

      case "INDISPONIVEL":
        return "error";

      case "BYPASSADO":
        return "warning";

      default:
        return "default";
    }
  }


  // ========================================================
  // RENDER
  // ========================================================

  return (

    <Paper

      sx={{

        p: 2.5,

        bgcolor:
          "#111d2d",

        color:
          "#fff",

        borderRadius:
          3,

        boxShadow:
          4,

        border:
          "1px solid #1e293b",

      }}

    >

      {/* ================================================= */}
      {/* TÍTULO */}
      {/* ================================================= */}

      <Typography

        variant="h6"

        fontWeight="bold"

        gutterBottom

      >

        ⚡ Análise de Manobra Inteligente

      </Typography>


      <Typography

        variant="body2"

        color="grey.400"

        sx={{
          mb: 2
        }}

      >

        Informe as correntes operacionais. O sistema localizará
        automaticamente as alternativas de recomposição na BDGD.

      </Typography>


      <Divider

        sx={{
          mb: 2,
          bgcolor: "#334155"
        }}

      />


      <Stack
        spacing={2.5}
      >


        {/* ================================================= */}
        {/* OCORRÊNCIA */}
        {/* ================================================= */}

        {ocorrencia && (

          <Box

            sx={{

              p: 1.5,

              bgcolor:
                "#0f172a",

              borderRadius:
                1.5,

              border:
                "1px solid #1e293b",

            }}

          >

            <Typography

              variant="body2"

              color="grey.400"

            >

              Ocorrência

            </Typography>


            <Typography

              variant="subtitle1"

              fontWeight="bold"

            >

              {
                normalizarId(
                  ocorrencia?.id
                ) ||
                "-"
              }

            </Typography>


            <Typography

              variant="body2"

              color="grey.300"

            >

              Alimentador:

              {" "}

              <strong>

                {
                  normalizarId(
                    ocorrencia?.alimentadorEquipamento ||
                    ocorrencia?.alimentador
                  ) ||
                  "-"
                }

              </strong>

            </Typography>


            <Typography

              variant="body2"

              color="grey.300"

            >

              Equipamento em falha:

              {" "}

              <strong>

                {
                  normalizarId(
                    ocorrencia?.equipamentoDesarme ||
                    ocorrencia?.equipamento
                  ) ||
                  "-"
                }

              </strong>

            </Typography>


            <Typography

              variant="body2"

              color="grey.300"

            >

              Clientes afetados:

              {" "}

              <strong>

                {
                  Number(
                    ocorrencia?.clientesAfetados ??
                    ocorrencia?.clientesInterrompidos ??
                    0
                  )
                }

              </strong>

            </Typography>

          </Box>

        )}


        {/* ================================================= */}
        {/* CORRENTE DESARME */}
        {/* ================================================= */}

        <TextField

          label="Corrente do trecho no momento do desarme (A)"

          type="number"

          fullWidth

          value={
            correnteDesligado
          }

          error={
            errosValidacao.correnteDesligado
          }

          helperText={

            errosValidacao.correnteDesligado

              ? "Informe uma corrente válida."

              : ""
          }

          /*
           * MUI atual:
           * evita o warning:
           *
           * React does not recognize the `inputProps`
           * prop on a DOM element.
           */
          slotProps={{

            htmlInput: {

              min: 0,

              step: "any",

            },

          }}

          onChange={(
            event
          ) => {

            setCorrenteDesligado(
              event.target.value
            );


            setResultadoLocal(
              null
            );


            setMensagemManobra(
              null
            );


            setErrosValidacao(
              (anterior) => ({

                ...anterior,

                correnteDesligado:
                  false,

              })
            );

          }}

          placeholder="Ex.: 120"

        />


        {/* ================================================= */}
        {/* CORRENTE RECEPTOR */}
        {/* ================================================= */}

        <TextField

          label="Corrente atual do trecho receptor/suporte (A)"

          type="number"

          fullWidth

          value={
            correnteDestino
          }

          error={
            errosValidacao.correnteDestino
          }

          helperText={

            errosValidacao.correnteDestino

              ? "Informe uma corrente válida."

              : ""
          }

          /*
           * Corrigido para MUI atual.
           */
          slotProps={{

            htmlInput: {

              min: 0,

              step: "any",

            },

          }}

          onChange={(
            event
          ) => {

            setCorrenteDestino(
              event.target.value
            );


            setResultadoLocal(
              null
            );


            setMensagemManobra(
              null
            );


            setErrosValidacao(
              (anterior) => ({

                ...anterior,

                correnteDestino:
                  false,

              })
            );

          }}

          placeholder="Ex.: 150"

        />


        {/* ================================================= */}
        {/* BOTÃO ANALISAR */}
        {/* ================================================= */}

        <Button

          variant="contained"

          color="success"

          size="large"

          onClick={
            calcular
          }

          disabled={
            !ocorrencia
          }

          sx={{

            fontWeight:
              "bold",

            py:
              1.2,

          }}

        >

          🔎 Analisar Recomposição Automática

        </Button>


        {/* ================================================= */}
        {/* RESULTADO */}
        {/* ================================================= */}

        {resultadoExibido && (

          <Box

            sx={{

              mt: 2,

              p: 2,

              bgcolor:
                "#1e293b",

              borderRadius:
                2,

            }}

          >

            {/* ============================================= */}
            {/* CABEÇALHO */}
            {/* ============================================= */}

            <Box

              sx={{

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap:
                  1,

                mb:
                  1.5,

                flexWrap:
                  "wrap",

              }}

            >

              <Chip

                label={

                  resultadoExibido?.status ===
                  "ALTERNATIVA_ENCONTRADA"

                    ? "🟢 ALTERNATIVA ENCONTRADA"

                    : resultadoExibido?.status ===
                      "DADOS_INCOMPLETOS"

                    ? "🟡 DADOS INCOMPLETOS"

                    : resultadoExibido?.status ===
                      "SEM_ALTERNATIVA"

                    ? "🔴 SEM ALTERNATIVA"

                    : "⚠️ ANÁLISE"

                }

                color={

                  resultadoExibido?.status ===
                  "ALTERNATIVA_ENCONTRADA"

                    ? "success"

                    : resultadoExibido?.status ===
                      "SEM_ALTERNATIVA"

                    ? "error"

                    : "warning"

                }

              />


              {resultadoExibido?.quantidadeCandidatos !==
                undefined && (

                <Typography

                  variant="body2"

                  color="grey.300"

                >

                  Candidatos encontrados:

                  {" "}

                  <strong>

                    {
                      resultadoExibido
                        .quantidadeCandidatos
                    }

                  </strong>

                </Typography>

              )}

            </Box>


            {/* ============================================= */}
            {/* MENSAGEM */}
            {/* ============================================= */}

            <Alert

              severity={

                resultadoExibido?.status ===
                "ALTERNATIVA_ENCONTRADA"

                  ? "success"

                  : resultadoExibido?.status ===
                    "SEM_ALTERNATIVA"

                  ? "error"

                  : "warning"

              }

              sx={{

                mb:
                  2,

                bgcolor:
                  "transparent",

                color:
                  "#fff",

              }}

            >

              {
                resultadoExibido?.mensagem ||
                resultadoExibido?.motivo ||
                "Nenhuma mensagem retornada."
              }

            </Alert>


            {/* ============================================= */}
            {/* EQUIPAMENTO DA FALHA */}
            {/* ============================================= */}

            {resultadoExibido?.equipamentoDesarme && (

              <Box

                sx={{

                  mb:
                    2,

                  p:
                    1.5,

                  bgcolor:
                    "#0f172a",

                  borderRadius:
                    1.5,

                }}

              >

                <Typography

                  variant="body2"

                  color="grey.400"

                >

                  Equipamento em falha

                </Typography>


                <Typography

                  variant="h6"

                  fontWeight="bold"

                >

                  {
                    resultadoExibido
                      .equipamentoDesarme
                  }

                </Typography>

              </Box>

            )}


            {/* ============================================= */}
            {/* RECOMENDAÇÃO */}
            {/* ============================================= */}

            {recomendacao && (

              <Box

                sx={{

                  mb:
                    2,

                  p:
                    2,

                  bgcolor:
                    "#0f172a",

                  borderRadius:
                    1.5,

                  border:
                    "1px solid #334155",

                }}

              >

                <Box

                  sx={{

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      1,

                    flexWrap:
                      "wrap",

                    mb:
                      1.5,

                  }}

                >

                  <Typography

                    variant="subtitle1"

                    fontWeight="bold"

                    color="success.light"

                  >

                    ✅ Recomposição recomendada

                  </Typography>


                  {estadoEquipamento && (

                    <Chip

                      size="small"

                      label={
                        obterLabelEstado(
                          estadoEquipamento
                        )
                      }

                      color={
                        obterCorEstado(
                          estadoEquipamento
                        )
                      }

                    />

                  )}

                </Box>


                <Typography

                  variant="body2"

                  color="grey.300"

                  sx={{
                    mb: 0.5
                  }}

                >

                  Equipamento de interligação encontrado:

                </Typography>


                <Typography

                  variant="h6"

                  fontWeight="bold"

                  sx={{
                    mb: 1
                  }}

                >

                  {
                    recomendacao
                      .equipamentoInterligacao
                  }

                </Typography>


                {recomendacao.tipo && (

                  <Typography

                    variant="body2"

                    color="grey.400"

                  >

                    Tipo:

                    {" "}

                    <strong>

                      {
                        recomendacao.tipo
                      }

                    </strong>

                  </Typography>

                )}


                {recomendacao.tipUnid !==
                  undefined &&
                  recomendacao.tipUnid !==
                  null && (

                  <Typography

                    variant="body2"

                    color="grey.400"

                  >

                    TIP_UNID:

                    {" "}

                    <strong>

                      {
                        recomendacao.tipUnid
                      }

                    </strong>

                  </Typography>

                )}


                {recomendacao.alimentadorReceptor && (

                  <Typography

                    variant="body2"

                    color="grey.400"

                  >

                    Alimentador receptor:

                    {" "}

                    <strong>

                      {
                        recomendacao
                          .alimentadorReceptor
                      }

                    </strong>

                  </Typography>

                )}


                {recomendacao.pontoAfetado && (

                  <Typography

                    variant="body2"

                    color="grey.400"

                  >

                    PAC área afetada:

                    {" "}

                    <strong>

                      {
                        recomendacao
                          .pontoAfetado
                      }

                    </strong>

                  </Typography>

                )}


                {recomendacao.pontoReceptor && (

                  <Typography

                    variant="body2"

                    color="grey.400"

                  >

                    PAC receptor:

                    {" "}

                    <strong>

                      {
                        recomendacao
                          .pontoReceptor
                      }

                    </strong>

                  </Typography>

                )}

              </Box>

            )}


            {/* ============================================= */}
            {/* CORRENTES */}
            {/* ============================================= */}

            {(resultadoExibido?.correnteDesligado !==
              undefined ||
              resultadoExibido?.correnteDestino !==
              undefined) && (

              <Box

                sx={{

                  mb:
                    2,

                  p:
                    1.5,

                  bgcolor:
                    "#0f172a",

                  borderRadius:
                    1.5,

                }}

              >

                <Typography

                  variant="body2"

                  color="grey.300"

                >

                  Corrente no desarme:

                  {" "}

                  <strong>

                    {
                      resultadoExibido
                        .correnteDesligado ??
                      correnteDesligado
                    }

                    A

                  </strong>

                </Typography>


                <Typography

                  variant="body2"

                  color="grey.300"

                >

                  Corrente do trecho receptor:

                  {" "}

                  <strong>

                    {
                      resultadoExibido
                        .correnteDestino ??
                      correnteDestino
                    }

                    A

                  </strong>

                </Typography>

              </Box>

            )}


            {/* ============================================= */}
            {/* CANDIDATOS */}
            {/* ============================================= */}

            {candidatos.length > 0 && (

              <Box
                sx={{
                  mb: 2
                }}
              >

                <Typography

                  variant="subtitle2"

                  fontWeight="bold"

                  color="primary.light"

                  gutterBottom

                >

                  🔎 Alternativas descobertas pela BDGD

                </Typography>


                <List

                  dense

                  sx={{

                    bgcolor:
                      "#0f172a",

                    borderRadius:
                      1,

                    p:
                      1,

                  }}

                >

                  {candidatos.map(

                    (
                      candidato,
                      index
                    ) => {

                      const idCandidato =
                        normalizarId(
                          candidato
                            ?.equipamentoInterligacao
                        );


                      const estadoCandidato =
                        obterEstadoDoEquipamento(
                          equipamentos,
                          idCandidato
                        );


                      return (

                        <ListItem

                          key={
                            idCandidato ||
                            index
                          }

                          sx={{

                            borderBottom:

                              index <
                              candidatos.length - 1

                                ? "1px solid #1e293b"

                                : "none",

                            display:
                              "block",

                          }}

                        >

                          <ListItemText

                            primary={

                              <Box

                                sx={{

                                  display:
                                    "flex",

                                  justifyContent:
                                    "space-between",

                                  alignItems:
                                    "center",

                                  gap:
                                    1,

                                }}

                              >

                                <Typography

                                  fontWeight="bold"

                                >

                                  {index + 1}.
                                  {" "}
                                  {
                                    idCandidato ||
                                    "-"
                                  }

                                </Typography>


                                {estadoCandidato && (

                                  <Chip

                                    size="small"

                                    label={
                                      obterLabelEstado(
                                        estadoCandidato
                                      )
                                    }

                                    color={
                                      obterCorEstado(
                                        estadoCandidato
                                      )
                                    }

                                  />

                                )}

                              </Box>

                            }

                            secondary={

                              <Box>

                                <Typography

                                  variant="caption"

                                  color="grey.400"

                                  component="span"

                                >

                                  Tipo:

                                  {" "}

                                  {
                                    candidato
                                      ?.tipo ||
                                    "-"
                                  }

                                  {" • "}

                                  TIP_UNID:

                                  {" "}

                                  {
                                    candidato
                                      ?.tipUnid ??
                                    "-"
                                  }

                                </Typography>


                                <br />


                                <Typography

                                  variant="caption"

                                  color="grey.400"

                                  component="span"

                                >

                                  PAC afetado:

                                  {" "}

                                  {
                                    candidato
                                      ?.pontoAfetado ||
                                    "-"
                                  }

                                  {" • "}

                                  PAC receptor:

                                  {" "}

                                  {
                                    candidato
                                      ?.pontoReceptor ||
                                    "-"
                                  }

                                </Typography>


                                <br />


                                <Typography

                                  variant="caption"

                                  color={
                                    candidato
                                      ?.validacaoCarga
                                      ?.permitido === false
                                      ? "error.light"
                                      : "grey.400"
                                  }

                                  component="span"

                                >

                                  Capacidade:

                                  {" "}

                                  {
                                    candidato
                                      ?.validacaoCarga
                                      ?.conhecida

                                      ? (

                                        candidato
                                          ?.validacaoCarga
                                          ?.permitido

                                          ? "OK"

                                          : "BLOQUEADA"

                                      )

                                      : "Aguardando corrente"
                                  }

                                </Typography>

                              </Box>

                            }

                          />

                        </ListItem>

                      );

                    }

                  )}

                </List>

              </Box>

            )}


            {/* ============================================= */}
            {/* PLANO DE MANOBRA */}
            {/* ============================================= */}

            {recomendacao?.sequenciaManobra &&
              Array.isArray(
                recomendacao.sequenciaManobra
              ) && (

              <>

                <Typography

                  variant="subtitle2"

                  fontWeight="bold"

                  color="primary.light"

                  gutterBottom

                >

                  📋 Sequência de manobra

                </Typography>


                <List

                  dense

                  sx={{

                    bgcolor:
                      "#0f172a",

                    borderRadius:
                      1,

                    p:
                      1,

                  }}

                >

                  {recomendacao
                    .sequenciaManobra
                    .map(

                      (
                        passo,
                        index
                      ) => (

                        <ListItem

                          key={
                            index
                          }

                        >

                          <ListItemText

                            primary={

                              `${passo?.ordem ?? index + 1}. ${
                                passo?.acao || ""
                              } ${
                                passo?.equipamento || ""
                              }`
                            }

                            secondary={
                              passo?.descricao ||
                              ""
                            }

                            slotProps={{

                              primary: {

                                sx: {

                                  fontWeight:
                                    "bold",

                                  fontSize:
                                    "0.88rem",

                                  color:
                                    "#e2e8f0",

                                },

                              },

                              secondary: {

                                sx: {

                                  fontSize:
                                    "0.78rem",

                                  color:
                                    "#94a3b8",

                                },

                              },

                            }}

                          />

                        </ListItem>

                      )

                    )}

                </List>


                {/* ======================================= */}
                {/* PAINEL OPERACIONAL */}
                {/* ======================================= */}

                {equipamentoRecomendado && (

                  <Box

                    sx={{

                      mt:
                        2,

                      p:
                        2,

                      bgcolor:
                        "#0f172a",

                      borderRadius:
                        2,

                      border:
                        "1px solid #334155",

                    }}

                  >

                    <Typography

                      variant="subtitle2"

                      fontWeight="bold"

                      color="grey.300"

                      gutterBottom

                    >

                      ⚙️ Controle operacional

                    </Typography>


                    <Typography

                      variant="body2"

                      color="grey.400"

                      sx={{
                        mb: 1
                      }}

                    >

                      Equipamento:

                      {" "}

                      <strong>

                        {
                          equipamentoRecomendado
                        }

                      </strong>

                    </Typography>


                    <Typography

                      variant="body2"

                      color="grey.400"

                      sx={{
                        mb: 1.5
                      }}

                    >

                      Estado atual:

                      {" "}

                      <Chip

                        size="small"

                        label={
                          obterLabelEstado(
                            estadoEquipamento
                          )
                        }

                        color={
                          obterCorEstado(
                            estadoEquipamento
                          )
                        }

                        sx={{
                          ml: 1
                        }}

                      />

                    </Typography>


                    {/* ================================= */}
                    {/* EXECUTAR RECOMENDAÇÃO */}
                    {/* ================================= */}

                    <Button

                      fullWidth

                      variant="contained"

                      color={
                        acaoRecomendada ===
                        "FECHAR"

                          ? "success"

                          : "warning"
                      }

                      disabled={
                        executandoManobra ||
                        estadoEquipamento ===
                        "INDISPONIVEL" ||
                        (
                          acaoRecomendada ===
                          "FECHAR" &&
                          estadoEquipamento ===
                          "FECHADO"
                        ) ||
                        (
                          acaoRecomendada ===
                          "ABRIR" &&
                          estadoEquipamento ===
                          "ABERTO"
                        )
                      }

                      onClick={
                        executarRecomendacao
                      }

                      sx={{

                        fontWeight:
                          "bold",

                        py:
                          1.2,

                      }}

                    >

                      {executandoManobra ? (

                        <>

                          <CircularProgress

                            size={20}

                            sx={{
                              mr: 1
                            }}

                          />

                          Executando...

                        </>

                      ) : (

                        <>
                          ⚡ Executar {
                            acaoRecomendada
                          } {
                            equipamentoRecomendado
                          }
                        </>

                      )}

                    </Button>


                    {/* ================================= */}
                    {/* ABRIR MANUALMENTE */}
                    {/* ================================= */}

                    {acaoRecomendada ===
                      "FECHAR" &&

                      estadoEquipamento ===
                      "FECHADO" && (

                      <Button

                        fullWidth

                        variant="outlined"

                        color="warning"

                        disabled={
                          executandoManobra
                        }

                        onClick={() =>
                          executarAcaoManobra(
                            "ABRIR"
                          )
                        }

                        sx={{

                          mt:
                            1,

                          fontWeight:
                            "bold",

                        }}

                      >

                        🔓 Executar ABRIR {
                          equipamentoRecomendado
                        }

                      </Button>

                    )}


                    {/* ================================= */}
                    {/* ABRIR / FECHAR DIRETO */}
                    {/* ================================= */}

                    {estadoEquipamento ===
                      "ABERTO" &&

                      acaoRecomendada !==
                      "FECHAR" && (

                      <Button

                        fullWidth

                        variant="outlined"

                        color="success"

                        disabled={
                          executandoManobra
                        }

                        onClick={() =>
                          executarAcaoManobra(
                            "FECHAR"
                          )
                        }

                        sx={{

                          mt:
                            1,

                          fontWeight:
                            "bold",

                        }}

                      >

                        🔒 Executar FECHAR {
                          equipamentoRecomendado
                        }

                      </Button>

                    )}


                    {/* ================================= */}
                    {/* RESULTADO DA MANOBRA */}
                    {/* ================================= */}

                    {mensagemManobra && (

                      <Alert

                        severity={
                          mensagemManobra.sucesso
                            ? "success"
                            : "error"
                        }

                        sx={{
                          mt: 1.5
                        }}

                      >

                        {
                          mensagemManobra
                            .mensagem
                        }

                      </Alert>

                    )}

                  </Box>

                )}

              </>

            )}

          </Box>

        )}

      </Stack>

    </Paper>

  );
}


export default ManobraForm;