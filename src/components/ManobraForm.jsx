import { useState, useEffect } from "react";

import {
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Divider,
  Chip,
  Box
} from "@mui/material";


import { buscarInterligacoes } from "../services/redeService";

import { analisarManobra } from "../services/analiseManobraService";





function ManobraForm({ ocorrencia, setRecomendacao }) {



  const [interligacoes, setInterligacoes] = useState([]);


  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState(null);



  const [correnteDesligado, setCorrenteDesligado] =
    useState("");



  const [correnteDestino, setCorrenteDestino] =
    useState("");



  const [resultado, setResultado] =
    useState(null);









  useEffect(() => {


    if (ocorrencia) {


      const lista = buscarInterligacoes(
        ocorrencia.alimentador
      );


      setInterligacoes(lista);


    }


  }, [ocorrencia]);









  function calcular() {



    if (!equipamentoSelecionado) {


      setResultado({

        permitido:false,

        motivo:
        "Selecione o equipamento de interligação."

      });


      return;

    }







    if (

      correnteDesligado === "" ||

      correnteDestino === ""

    ) {


      setResultado({

        permitido:false,

        motivo:
        "Informe as correntes dos trechos antes de executar a análise."

      });


      return;

    }








    const correnteFalta =

      Number(correnteDesligado);



    const correnteAtual =

      Number(correnteDestino);









   const analise = analisarManobra({

    

    correnteDesligado:

        correnteFalta,


    correnteAtualDestino:

        correnteAtual,


    alimentadorOrigem:

        ocorrencia.alimentador,


    alimentadorDestino:

        equipamentoSelecionado.alimentadorDestino,


    equipamento:

        equipamentoSelecionado.plaqueta


        

});

if (setRecomendacao) {

    setRecomendacao({

        ...analise,

        recomposicao: {

            equipamento:
                analise.equipamento?.plaqueta ||

                equipamentoSelecionado.plaqueta,

            trecho:
                analise.trechoLimitante?.id,

            alimentadorDestino:
                equipamentoSelecionado.alimentadorDestino,

            carregamento:
                analise.carregamento

        },

        justificativas:
            analise.justificativas || [],

        sequencia: [

            `Abrir disjuntor do alimentador ${ocorrencia.alimentador}`,

            `Fechar ${equipamentoSelecionado.plaqueta}`,

            `Transferir carga para ${equipamentoSelecionado.alimentadorDestino}`,

            "Confirmar energização"

        ]

    });

}
    // ==========================================
    // ENVIA A SIMULAÇÃO PARA RECOMPOSIÇÃO
    // INTELIGENTE
    // ==========================================


    if (ocorrencia) {


      ocorrencia.manobra = {


        executada:true,


        correnteDesligado:

          correnteFalta,


        correnteDestino:

          correnteAtual,



        correnteTotal:

          correnteFalta + correnteAtual,



        equipamento:

          equipamentoSelecionado.plaqueta,



        equipamentoId:

          equipamentoSelecionado.id,



        alimentadorDestino:

          equipamentoSelecionado.alimentadorDestino,



        carregamento:

          analise.carregamento,



        trechoLimitante:

          analise.trechoLimitante,



        capacidade:

          analise.trechoLimitante?.capacidade || 0,



        cabo:

          analise.trechoLimitante?.cabo || "Não informado"



      };


    }










    setResultado({


      ...analise,


      simulacao:{


        correnteDesligado:

          correnteFalta,


        correnteDestino:

          correnteAtual,



        correnteTotal:

          correnteFalta + correnteAtual



      }



    });



  }












  return (



    <Paper


      sx={{

        p:2,

        bgcolor:"#111d2d",

        color:"#fff",

        borderRadius:3

      }}


    >




      <Typography

        variant="h6"

        fontWeight="bold"

      >

        ⚡ Simulação de Manobra

      </Typography>





      <Divider

        sx={{

          my:2,

          bgcolor:"#334155"

        }}

      />






      <Stack spacing={2}>



        <Typography

          sx={{

            color:"#38bdf8"

          }}

        >

          Interligações disponíveis

        </Typography>







        <TextField


          select


          fullWidth


          label="Equipamento"



          value={

            equipamentoSelecionado?.id || ""

          }



          onChange={(e)=>{


            const equipamento =

              interligacoes.find(

                item => item.id === e.target.value

              );



            setEquipamentoSelecionado(equipamento);



            setResultado(null);



          }}



        >



          {

            interligacoes.map((item)=>(


              <MenuItem

                key={item.id}

                value={item.id}

              >

                {item.plaqueta}

                {" → "}

                {item.alimentadorDestino}


              </MenuItem>


            ))

          }



        </TextField>

                {


          equipamentoSelecionado &&



          <Box

            sx={{

              p:1.5,

              bgcolor:"#162235",

              borderRadius:2

            }}

          >



            <Typography>

              Equipamento:

              <strong>

                {" "}

                {equipamentoSelecionado.nome}

              </strong>

            </Typography>





            <Typography>

              Plaqueta:

              <strong>

                {" "}

                {equipamentoSelecionado.plaqueta}

              </strong>

            </Typography>





            <Typography>

              PT:

              <strong>

                {" "}

                {equipamentoSelecionado.pt}

              </strong>

            </Typography>





            <Typography>

              Alimentador destino:

              <strong>

                {" "}

                {equipamentoSelecionado.alimentadorDestino}

              </strong>

            </Typography>





            <Typography>

              Estado:

              <strong>

                {" "}

                {equipamentoSelecionado.estadoOperacional}

              </strong>

            </Typography>





            <Typography>

              Comando:

              <strong>

                {" "}

                {equipamentoSelecionado.comando}

              </strong>

            </Typography>



          </Box>


        }









        <TextField


          label="Corrente antes do desarme (A)"


          type="number"


          fullWidth


          value={correnteDesligado}



          onChange={(e)=>

            setCorrenteDesligado(e.target.value)

          }


        />








        <TextField


          label="Corrente atual trecho receptor (A)"


          type="number"


          fullWidth


          value={correnteDestino}



          onChange={(e)=>

            setCorrenteDestino(e.target.value)

          }


        />









        <Button


          variant="contained"


          color="success"


          onClick={calcular}


        >

          Analisar Manobra


        </Button>









        {


          resultado &&



          <Box

            sx={{

              mt:2

            }}

          >





            <Divider

              sx={{

                mb:2,

                bgcolor:"#334155"

              }}

            />





            <Typography

              fontWeight="bold"

            >

              Resultado da Simulação

            </Typography>







            <Chip


              sx={{

                my:2,

                fontWeight:"bold"

              }}



              label={

                resultado.permitido

                ?

                "🟢 MANOBRA PERMITIDA"

                :

                "🔴 MANOBRA NÃO PERMITIDA"

              }



              color={

                resultado.permitido

                ?

                "success"

                :

                "error"

              }



            />











            <Box

              sx={{

                p:2,

                mb:2,

                bgcolor:"#162235",

                borderRadius:2

              }}

            >





              <Typography>

                📌 Corrente trecho desligado:

                {" "}

                <b>

                {resultado.simulacao?.correnteDesligado ?? 0} A

                </b>

              </Typography>





              <Typography>

                📌 Corrente receptor:

                {" "}

                <b>

                {resultado.simulacao?.correnteDestino ?? 0} A

                </b>

              </Typography>







              <Typography>

                ⚡ Corrente após transferência:

                {" "}

                <b>

                {resultado.correnteTotal ?? resultado.simulacao?.correnteTotal ?? 0} A

                </b>

              </Typography>







              <Typography>

                📊 Carregamento:

                {" "}

                <b>

                {resultado.carregamento ?? 0} %

                </b>

              </Typography>



            </Box>









            {

            resultado.trechoLimitante &&



            <Box

              sx={{

                p:2,

                mb:2,

                bgcolor:"#1e293b",

                borderRadius:2

              }}

            >





              <Typography

                fontWeight="bold"

              >

                🔎 Trecho limitante identificado

              </Typography>







              <Typography>

                Trecho:

                {" "}

                <b>

                {resultado.trechoLimitante.id}

                </b>

              </Typography>







              <Typography>

                Condutor:

                {" "}

                <b>

                {resultado.trechoLimitante.cabo}

                </b>

              </Typography>







              <Typography>

                Capacidade:

                {" "}

                <b>

                {resultado.trechoLimitante.capacidade} A

                </b>

              </Typography>





            </Box>



            }









            <Typography


              whiteSpace="pre-line"


              sx={{

                color:"#e2e8f0"

              }}


            >


              {resultado.motivo}


            </Typography>







          </Box>



        }







      </Stack>







    </Paper>



  );


}



export default ManobraForm;