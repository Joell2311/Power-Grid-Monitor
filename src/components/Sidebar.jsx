import {
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import MapIcon from "@mui/icons-material/Map";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import PowerIcon from "@mui/icons-material/Power";
import EngineeringIcon from "@mui/icons-material/Engineering";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";

const drawerWidth = 250;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, active: true },
  { text: "Mapa Operacional", icon: <MapIcon /> },
  { text: "Ocorrências", icon: <WarningAmberIcon /> },
  { text: "Alimentadores", icon: <ElectricBoltIcon /> },
  { text: "Equipamentos", icon: <PowerIcon /> },
  { text: "Equipes", icon: <EngineeringIcon /> },
  { text: "Indicadores", icon: <QueryStatsIcon /> },
  { text: "Relatórios", icon: <DescriptionIcon /> },
  { text: "Configurações", icon: <SettingsIcon /> },
];

function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#0d1b2a",
          color: "#fff",
          borderRight: "1px solid #1e3a5f",
        },
      }}
    >
 
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >{/* Logo */}
<Box sx={{ textAlign: "center", py: 2 }}>
  <Typography
    variant="h5"
    sx={{
      color: "#4fc3f7",
      fontWeight: "bold",
      lineHeight: 1.2,
    }}
  >
    ⚡ COI
  </Typography>
  <Typography
    variant="caption"
    sx={{
      color: "#8aa4bf",
      fontSize: "13px",
      letterSpacing: "0.5px",
    }}
  >
    Centro Operacional
  </Typography>
</Box>
        {/* Menu */}
        <List sx={{ flex: 1 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.text}
              selected={item.active}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,

                "&.Mui-selected": {
                  backgroundColor: "#1f6feb",
                },

                "&.Mui-selected:hover": {
                  backgroundColor: "#2d7df7",
                },

                "&:hover": {
                  backgroundColor: "#16324f",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>

              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>

        {/* Rodapé */}
        <Box
          sx={{
            textAlign: "center",
            py: 2,
            borderTop: "1px solid #1e3a5f",
            color: "#8aa4bf",
          }}
        >
          COI Monitor v1.0
        </Box>
      </Box>
    </Drawer>
  );
}

export default Sidebar;