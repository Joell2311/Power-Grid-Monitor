import { useState } from "react";

import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Tooltip,
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

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const drawerWidth = 250;
const collapsedWidth = 64;


// ============================================================
// MENU
// ============================================================

const menuItems = [
  {
    text: "Dashboard",
    icon: <DashboardIcon />,
    active: true,
  },
  {
    text: "Mapa Operacional",
    icon: <MapIcon />,
  },
  {
    text: "Ocorrências",
    icon: <WarningAmberIcon />,
  },
  {
    text: "Alimentadores",
    icon: <ElectricBoltIcon />,
  },
  {
    text: "Equipamentos",
    icon: <PowerIcon />,
  },
  {
    text: "Equipes",
    icon: <EngineeringIcon />,
  },
  {
    text: "Indicadores",
    icon: <QueryStatsIcon />,
  },
  {
    text: "Relatórios",
    icon: <DescriptionIcon />,
  },
  {
    text: "Configurações",
    icon: <SettingsIcon />,
  },
];


// ============================================================
// SIDEBAR
// ============================================================

function Sidebar() {

  // Estado visual do menu
  const [open, setOpen] = useState(false);

  // Quando o mouse entra
  const handleMouseEnter = () => {
    setOpen(true);
  };

  // Quando o mouse sai
  const handleMouseLeave = () => {
    setOpen(false);
  };

  // Botão manual
  const toggleDrawer = () => {
    setOpen((prev) => !prev);
  };


  return (
    <Drawer
      variant="permanent"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,

        transition: "width 0.2s ease",

        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : collapsedWidth,

          boxSizing: "border-box",

          backgroundColor: "#0d1b2a",

          color: "#fff",

          borderRight: "1px solid #1e3a5f",

          overflowX: "hidden",

          transition: "width 0.2s ease",

          position: "fixed",

          height: "100vh",

          top: 0,

          left: 0,

          zIndex: 1200,
        },
      }}
    >

      {/* ====================================================== */}
      {/* CONTAINER PRINCIPAL */}
      {/* ====================================================== */}

      <Box
        sx={{
          display: "flex",

          flexDirection: "column",

          height: "100%",

          width: "100%",
        }}
      >


        {/* ================================================== */}
        {/* LOGO */}
        {/* ================================================== */}

        <Box
          sx={{
            height: 70,

            display: "flex",

            alignItems: "center",

            justifyContent: open
              ? "center"
              : "center",

            flexDirection: open
              ? "column"
              : "row",

            borderBottom: "1px solid #1e3a5f",

            position: "relative",

            px: 1,
          }}
        >

          {/* Logo compacto */}

          {!open && (
            <Tooltip
              title="Power Grid Monitor"
              placement="right"
              arrow
            >
              <Typography
                sx={{
                  color: "#4fc3f7",

                  fontSize: "25px",

                  fontWeight: "bold",

                  cursor: "default",
                }}
              >
                ⚡
              </Typography>
            </Tooltip>
          )}


          {/* Logo completo */}

          {open && (
            <>
              <Typography
                sx={{
                  color: "#4fc3f7",

                  fontSize: "20px",

                  fontWeight: "bold",

                  lineHeight: 1.1,
                }}
              >
                ⚡ 
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "#8aa4bf",

                  fontSize: "10px",

                  letterSpacing: "0.4px",

                  mt: 0.3,
                }}
              >
                
              </Typography>
            </>
          )}

        </Box>


        {/* ================================================== */}
        {/* BOTÃO DA SETA */}
        {/* ================================================== */}

        <Box
          sx={{
            display: "flex",

            justifyContent: open
              ? "flex-end"
              : "center",

            px: open ? 1 : 0,

            py: 0.5,
          }}
        >

          <IconButton
            onClick={toggleDrawer}
            size="small"
            sx={{
              color: "#8aa4bf",

              width: 34,

              height: 34,

              borderRadius: 1.5,

              "&:hover": {
                backgroundColor: "#16324f",

                color: "#4fc3f7",
              },
            }}
          >

            {open ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}

          </IconButton>

        </Box>


        {/* ================================================== */}
        {/* MENU */}
        {/* ================================================== */}

        <List
          sx={{
            flex: 1,

            px: open ? 1 : 0.5,

            pt: 0.5,
          }}
        >

          {menuItems.map((item) => {

            const button = (
              <ListItemButton
                key={item.text}
                selected={item.active}
                sx={{
                  minHeight: 46,

                  justifyContent: open
                    ? "initial"
                    : "center",

                  px: open
                    ? 1.5
                    : 1,

                  mx: open
                    ? 0
                    : 0.3,

                  my: 0.4,

                  borderRadius: 2,

                  transition:
                    "background-color 0.15s ease",

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

                {/* ÍCONE */}

                <ListItemIcon
                  sx={{
                    minWidth: open
                      ? 40
                      : "auto",

                    mr: open
                      ? 1
                      : 0,

                    color: item.active
                      ? "#fff"
                      : "#c7d5e3",

                    justifyContent: "center",

                    transition: "0.2s",
                  }}
                >
                  {item.icon}
                </ListItemIcon>


                {/* TEXTO */}

                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "14px",

                      fontWeight: item.active
                        ? 600
                        : 400,

                      whiteSpace: "nowrap",
                    }}
                  />
                )}

              </ListItemButton>
            );


            // Tooltip somente quando fechado

            if (!open) {
              return (
                <Tooltip
                  key={item.text}
                  title={item.text}
                  placement="right"
                  arrow
                >
                  {button}
                </Tooltip>
              );
            }

            return button;
          })}

        </List>


        {/* ================================================== */}
        {/* RODAPÉ */}
        {/* ================================================== */}

        <Box
          sx={{
            textAlign: "center",

            py: open ? 1.5 : 1,

            borderTop: "1px solid #1e3a5f",

            color: "#8aa4bf",

            minHeight: open ? 50 : 40,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            overflow: "hidden",
          }}
        >

          {open ? (
            <Typography
              variant="caption"
              sx={{
                fontSize: "10px",

                whiteSpace: "nowrap",
              }}
            >
              COI Monitor v1.0
            </Typography>
          ) : (
            <Typography
              sx={{
                fontSize: "9px",

                color: "#52708d",

                writingMode: "vertical-rl",

                transform: "rotate(180deg)",
              }}
            >
              v1.0
            </Typography>
          )}

        </Box>

      </Box>

    </Drawer>
  );
}

export default Sidebar;