import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
} from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import CircleIcon from "@mui/icons-material/Circle";


const drawerWidth = 250;


function Header() {

  return (

    <AppBar
      position="fixed"
      elevation={2}
      sx={{
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        backgroundColor: "#0f172a",
        borderBottom: "2px solid #1e293b",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >


      <Toolbar
        sx={{
          minHeight:"70px",
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
        }}
      >


        {/* Identificação do sistema */}
        <Box>



       

        </Box>



        {/* Status */}
        <Box
          sx={{
            display:"flex",
            alignItems:"center",
            gap:2,
          }}
        >


          <Chip
            icon={
              <CircleIcon
                sx={{
                  color:"#22c55e !important",
                  fontSize:12,
                }}
              />
            }
            label="Sistema Online"
            sx={{
              backgroundColor:"#052e16",
              color:"#22c55e",
              fontWeight:"bold",
              borderRadius:"20px",
            }}
          />



          <Chip
            icon={<PersonIcon />}
            label="Operador COI"
            sx={{
              backgroundColor:"#1e293b",
              color:"#ffffff",
              borderRadius:"8px",
            }}
          />


        </Box>


      </Toolbar>


    </AppBar>

  );

}


export default Header;