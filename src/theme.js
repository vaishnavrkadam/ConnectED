// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" },
    secondary: { main: "#ec4899" },
    background: {
      default: "#050816",
      paper: "#0f172a"
    },
    text: {
      primary: "#e5e7eb",
      secondary: "#9ca3af"
    }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: [
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "sans-serif"
    ].join(","),
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 }
  }
});

export default theme;
