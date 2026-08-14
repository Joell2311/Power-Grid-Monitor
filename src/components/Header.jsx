import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
} from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import CircleIcon from "@mui/icons-material/Circle";
import BoltIcon from "@mui/icons-material/Bolt";

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
          minHeight: "70px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
        }}
      >
        {/* Identificação do sistema */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItem: "center",
              justifyContent: "center",
              bgcolor: "#1e293b",
              p: 1,
              borderRadius: 2,
              color: "#38bdf8",
            }}
          >
            <BoltIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#fff", lineHeight: 1.2 }}>
              COI Monitor
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              Centro de Operações Integradas • Camaragibe/PE
            </Typography>
          </Box>
        </Box>

        {/* Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Chip
            icon={
              <CircleIcon
                sx={{
                  color: "#22c55e !important",
                  fontSize: 12,
                }}
              />
            }
            label="Sistema Online"
            sx={{
              backgroundColor: "#052e16",
              color: "#22c55e",
              fontWeight: "bold",
              borderRadius: "20px",
            }}
          />

          <Chip
            icon={<PersonIcon sx={{ color: "#38bdf8 !important" }} />}
            label="Operador COI"
            sx={{
              backgroundColor: "#1e293b",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;