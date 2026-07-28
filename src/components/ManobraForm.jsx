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





function ManobraForm({ ocorrencia }) {



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

      return;

    }



    if (!correnteDesligado || !correnteDestino) {

      return;

    }







    const analise = analisarManobra({


      correnteDesligado,


      correnteAtualDestino: correnteDestino,


      alimentadorDestino:

        equipamentoSelecionado.alimentadorDestino,



      // ENVIA O EQUIPAMENTO COMPLETO
      // PARA VALIDAR BLOQUEIO E DISPONIBILIDADE

      equipamentoInterligacao:

        equipamentoSelecionado


    });




    setResultado(analise);



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

              Destino:

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

              Resultado

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