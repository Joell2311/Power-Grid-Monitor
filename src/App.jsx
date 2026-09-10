import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Dashboard from "./pages/Dashboard";

// Configuração centralizada do tema dark para o COI
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b131d",
      paper: "#111d2d",
    },
    primary: {
      main: "#38bdf8",
    },
    text: {
      primary: "#ffffff",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;