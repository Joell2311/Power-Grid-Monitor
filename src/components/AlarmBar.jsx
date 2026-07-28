import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";


const drawerWidth = 250;


function AlarmBar() {

  return (

    <Box
      sx={{
        ml: `${drawerWidth}px`,
        px: 2,
        py: 1,
        bgcolor: "#081420",
      }}
    >

      <Alert
        severity="error"
        icon={<WarningAmberIcon />}
        sx={{
          alignItems:"center",
          borderRadius:2,
          bgcolor:"#8b0000",
          color:"#fff",

          "& .MuiAlert-icon":{
            color:"#fff",
          },
        }}


        action={

          <Box
            sx={{
              display:"flex",
              alignItems:"center",
              gap:2,
            }}
          >

            <Chip
              icon={<AccessTimeIcon />}
              label="19:42"
              size="small"
              sx={{
                bgcolor:"#ffffff22",
                color:"#fff",
              }}
            />


            <Button
              variant="contained"
              size="small"
              sx={{
                bgcolor:"#fff",
                color:"#b00000",

                "&:hover":{
                  bgcolor:"#f2f2f2",
                },
              }}
            >
              Detalhes
            </Button>


          </Box>

        }

      >

        <AlertTitle
          sx={{
            fontWeight:"bold",
            color:"#fff",
          }}
        >
          CMG-01C4 DESLIGADO
        </AlertTitle>


        3.567 clientes interrompidos • Prioridade Alta


      </Alert>


    </Box>

  );

}


export default AlarmBar;