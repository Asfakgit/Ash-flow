import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#10B981", // Vibrant Emerald
      light: "#34D399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#6366F1", // Indigo
      light: "#818CF8",
      dark: "#4F46E5",
      contrastText: "#ffffff",
    },
    background: {
      default: "#0B0F19", // Deep Obsidian Slate
      paper: "#131B2E",   // Rich Dark Slate Card
    },
    text: {
      primary: "#F8FAFC",
      secondary: "#94A3B8",
    },
    error: {
      main: "#F43F5E", // Rose
    },
    warning: {
      main: "#F59E0B", // Amber
    },
    info: {
      main: "#3B82F6", // Blue
    },
    success: {
      main: "#10B981", // Emerald
    },
    divider: "rgba(148, 163, 184, 0.12)",
  },
  typography: {
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0B0F19",
          color: "#F8FAFC",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#0B0F19",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#1E293B",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#334155",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#131B2E",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: "linear-gradient(145deg, #131B2E 0%, #0F172A 100%)",
          border: "1px solid rgba(148, 163, 184, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 20px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
            transform: "translateY(-1px)",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          background: "linear-gradient(145deg, #172036 0%, #0F172A 100%)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
          padding: "16px",
        },
        head: {
          fontWeight: 600,
          color: "#94A3B8",
          textTransform: "uppercase",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          backgroundColor: "rgba(15, 23, 42, 0.5)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            transition: "all 0.2s",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(148, 163, 184, 0.3)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#10B981",
              borderWidth: "2px",
            },
          },
        },
      },
    },
  },
});

export default theme;
