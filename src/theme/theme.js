import { createTheme } from "@mui/material/styles";

const theme = createTheme({

  palette: {
    mode: "dark",

    background: {
      default: "#0b1117",
      paper: "#151c24"
    },

    primary: {
      main: "#1976d2"
    },

    error: {
      main: "#d32f2f"
    },

    warning: {
      main: "#f9a825"
    },

    success: {
      main: "#2e7d32"
    }
  },

  typography: {
    fontFamily: "Roboto, Arial, sans-serif"
  }

});


export default theme;