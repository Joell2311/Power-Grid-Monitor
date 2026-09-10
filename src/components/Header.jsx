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

function Header() {
  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        flexShrink: 0,
        backgroundColor: "#0f172a",
        borderBottom: "2px solid #1e293b",
        zIndex: 1200,
      }}
    >
      <Toolbar
        sx={{
          minHeight: "64px !important",
          height: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
        }}
      >

        {/* IDENTIFICAÇÃO */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#1e293b",
              p: 0.8,
              borderRadius: 2,
              color: "#38bdf8",
            }}
          >
            <BoltIcon />
          </Box>

          <Box>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              COI Monitor
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "#94a3b8",
              }}
            >
              Centro de Operações Integradas • Camaragibe/PE
            </Typography>
          </Box>

        </Box>

        {/* STATUS */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >

          <Chip
            size="small"
            icon={
              <CircleIcon
                sx={{
                  color: "#22c55e !important",
                  fontSize: 10,
                }}
              />
            }
            label="Sistema Online"
            sx={{
              backgroundColor: "#052e16",
              color: "#22c55e",
              fontWeight: "bold",
            }}
          />

          <Chip
            size="small"
            icon={
              <PersonIcon
                sx={{
                  color: "#38bdf8 !important",
                }}
              />
            }
            label="Operador COI"
            sx={{
              backgroundColor: "#1e293b",
              color: "#fff",
              fontWeight: 500,
            }}
          />

        </Box>

      </Toolbar>
    </AppBar>
  );
}

export default Header;