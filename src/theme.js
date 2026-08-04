import { createTheme } from "@mui/material/styles";

// iOS Apple Standard Bold & Stylish Typography Stack
const typography = {
  fontFamily:
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Outfit", sans-serif',
  h1: { fontWeight: 800, letterSpacing: "-0.035em" },
  h2: { fontWeight: 800, letterSpacing: "-0.03em" },
  h3: { fontWeight: 800, letterSpacing: "-0.03em" },
  h4: { fontWeight: 800, letterSpacing: "-0.025em" },
  h5: { fontWeight: 700, letterSpacing: "-0.02em" },
  h6: { fontWeight: 700, letterSpacing: "-0.015em" },
  subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
  subtitle2: { fontWeight: 600, letterSpacing: "-0.01em" },
  body1: { fontWeight: 500, letterSpacing: "-0.01em" },
  body2: { fontWeight: 500, letterSpacing: "-0.01em" },
  button: { fontWeight: 700, textTransform: "none", letterSpacing: "-0.01em" },
};

const shape = { borderRadius: 20 };

const getComponents = (palette) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: palette.background.default,
        background: palette.custom.pageBackground || palette.background.default,
        backgroundAttachment: "fixed",
        color: palette.text.primary,
        transition: "background 0.35s cubic-bezier(0.25, 1, 0.5, 1), color 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { width: "6px", height: "6px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { backgroundColor: palette.custom.scrollbarThumb, borderRadius: "10px" },
        "&::-webkit-scrollbar-thumb:hover": { backgroundColor: palette.custom.scrollbarHover },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
        backgroundColor: palette.background.paper,
        border: `1px solid ${palette.divider}`,
        boxShadow: palette.custom.paperShadow,
        borderRadius: 24,
        backdropFilter: "blur(30px) saturate(190%)",
        WebkitBackdropFilter: "blur(30px) saturate(190%)",
        transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.2s ease",
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 24,
        background: palette.custom.cardGradient,
        backdropFilter: "blur(30px) saturate(190%)",
        WebkitBackdropFilter: "blur(30px) saturate(190%)",
        border: `1px solid ${palette.divider}`,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 100, // Apple iOS Pill Buttons
        padding: "10px 24px",
        boxShadow: "none",
        fontWeight: 700,
        transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: palette.custom.buttonShadow,
          transform: "translateY(-1px)",
        },
        "&:active": {
          transform: "scale(0.96)",
        },
      },
      containedPrimary: {
        background: palette.custom.primaryGradient,
        "&:hover": {
          background: palette.custom.primaryHoverGradient,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 28,
        background: palette.custom.dialogGradient,
        backdropFilter: "blur(35px) saturate(200%)",
        WebkitBackdropFilter: "blur(35px) saturate(200%)",
        border: `1px solid ${palette.divider}`,
        boxShadow: palette.custom.dialogShadow,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${palette.divider}`,
        padding: "14px 16px",
      },
      head: {
        fontWeight: 700,
        color: palette.text.secondary,
        textTransform: "uppercase",
        fontSize: "0.72rem",
        letterSpacing: "0.08em",
        backgroundColor: palette.custom.tableHeaderBg,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        "& .MuiOutlinedInput-root": {
          borderRadius: 16,
          backgroundColor: palette.custom.inputBg,
          transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.custom.inputBorderHover,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.primary.main,
            borderWidth: "2px",
          },
        },
      },
    },
  },
});

// 1. iOS Dark (Midnight Emerald)
const midnightEmeraldPalette = {
  mode: "dark",
  primary: { main: "#34C759", light: "#30D158", dark: "#248A3D", contrastText: "#ffffff" },
  secondary: { main: "#007AFF", light: "#0A84FF", dark: "#0056B3", contrastText: "#ffffff" },
  background: { default: "#000000", paper: "rgba(28, 28, 30, 0.75)" },
  text: { primary: "#FFFFFF", secondary: "#8E8E93" },
  error: { main: "#FF3B30" },
  warning: { main: "#FF9500" },
  info: { main: "#5AC8FA" },
  success: { main: "#34C759" },
  divider: "rgba(255, 255, 255, 0.12)",
  custom: {
    pageBackground: "radial-gradient(circle at 50% -20%, #1C2638 0%, #0C1017 60%, #07090E 100%)",
    scrollbarThumb: "rgba(255, 255, 255, 0.2)",
    scrollbarHover: "rgba(255, 255, 255, 0.4)",
    paperShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
    cardGradient: "linear-gradient(145deg, rgba(28, 28, 30, 0.85) 0%, rgba(18, 18, 20, 0.95) 100%)",
    primaryGradient: "linear-gradient(135deg, #34C759 0%, #248A3D 100%)",
    primaryHoverGradient: "linear-gradient(135deg, #30D158 0%, #34C759 100%)",
    errorGradient: "linear-gradient(135deg, #FF3B30 0%, #C62828 100%)",
    errorHoverGradient: "linear-gradient(135deg, #FF453A 0%, #FF3B30 100%)",
    secondaryGradient: "linear-gradient(135deg, #007AFF 0%, #0056B3 100%)",
    secondaryHoverGradient: "linear-gradient(135deg, #0A84FF 0%, #007AFF 100%)",
    buttonShadow: "0 4px 14px rgba(52, 199, 89, 0.3)",
    dialogGradient: "linear-gradient(145deg, rgba(35, 35, 38, 0.92) 0%, rgba(18, 18, 20, 0.96) 100%)",
    dialogShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
    tableHeaderBg: "rgba(38, 38, 42, 0.5)",
    inputBg: "rgba(44, 44, 46, 0.6)",
    inputBorderHover: "rgba(255, 255, 255, 0.25)",
    titleGradient: "linear-gradient(135deg, #FFFFFF 0%, #8E8E93 100%)",
    successBoxBg: "rgba(52, 199, 89, 0.12)",
    successBoxBorder: "rgba(52, 199, 89, 0.28)",
    errorBoxBg: "rgba(255, 59, 48, 0.12)",
    errorBoxBorder: "rgba(255, 59, 48, 0.28)",
    secondaryBoxBg: "rgba(0, 122, 255, 0.12)",
    secondaryBoxBorder: "rgba(0, 122, 255, 0.28)",
    netPositiveBoxBg: "rgba(175, 82, 222, 0.12)",
    netPositiveBoxBorder: "rgba(175, 82, 222, 0.28)",
    netPositiveColor: "#BF5AF2",
    chartBg: "rgba(28, 28, 30, 0.6)",
    chartGrid: "rgba(255, 255, 255, 0.08)",
    tooltipBg: "rgba(20, 20, 22, 0.92)",
  }
};

// 2. iOS OLED (True Black)
const oledNeonPalette = {
  mode: "dark",
  primary: { main: "#30D158", light: "#34C759", dark: "#248A3D", contrastText: "#000000" },
  secondary: { main: "#0A84FF", light: "#5AC8FA", dark: "#0056B3", contrastText: "#ffffff" },
  background: { default: "#000000", paper: "rgba(18, 18, 18, 0.85)" },
  text: { primary: "#FFFFFF", secondary: "#98989D" },
  error: { main: "#FF453A" },
  warning: { main: "#FF9F0A" },
  info: { main: "#64D2FF" },
  success: { main: "#30D158" },
  divider: "rgba(255, 255, 255, 0.14)",
  custom: {
    pageBackground: "radial-gradient(circle at 50% -20%, #001B2E 0%, #000000 70%, #000000 100%)",
    scrollbarThumb: "rgba(255, 255, 255, 0.25)",
    scrollbarHover: "rgba(255, 255, 255, 0.45)",
    paperShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
    cardGradient: "linear-gradient(145deg, rgba(20, 20, 20, 0.9) 0%, rgba(0, 0, 0, 0.98) 100%)",
    primaryGradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)",
    primaryHoverGradient: "linear-gradient(135deg, #34C759 0%, #30D158 100%)",
    errorGradient: "linear-gradient(135deg, #FF453A 0%, #D32F2F 100%)",
    errorHoverGradient: "linear-gradient(135deg, #FF6961 0%, #FF453A 100%)",
    secondaryGradient: "linear-gradient(135deg, #0A84FF 0%, #0056B3 100%)",
    secondaryHoverGradient: "linear-gradient(135deg, #409CFF 0%, #0A84FF 100%)",
    buttonShadow: "0 4px 14px rgba(48, 209, 88, 0.35)",
    dialogGradient: "linear-gradient(145deg, rgba(24, 24, 24, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%)",
    dialogShadow: "0 25px 50px -12px rgba(0, 0, 0, 1)",
    tableHeaderBg: "rgba(30, 30, 30, 0.6)",
    inputBg: "rgba(30, 30, 30, 0.7)",
    inputBorderHover: "rgba(255, 255, 255, 0.3)",
    titleGradient: "linear-gradient(135deg, #FFFFFF 0%, #98989D 100%)",
    successBoxBg: "rgba(48, 209, 88, 0.14)",
    successBoxBorder: "rgba(48, 209, 88, 0.3)",
    errorBoxBg: "rgba(255, 69, 58, 0.14)",
    errorBoxBorder: "rgba(255, 69, 58, 0.3)",
    secondaryBoxBg: "rgba(10, 132, 255, 0.14)",
    secondaryBoxBorder: "rgba(10, 132, 255, 0.3)",
    netPositiveBoxBg: "rgba(191, 90, 242, 0.14)",
    netPositiveBoxBorder: "rgba(191, 90, 242, 0.3)",
    netPositiveColor: "#DA8FFF",
    chartBg: "rgba(15, 15, 15, 0.7)",
    chartGrid: "rgba(255, 255, 255, 0.1)",
    tooltipBg: "rgba(15, 15, 15, 0.95)",
  }
};

// 3. iOS Light (Clean White)
const cleanCorporatePalette = {
  mode: "light",
  primary: { main: "#34C759", light: "#30D158", dark: "#248A3D", contrastText: "#ffffff" },
  secondary: { main: "#007AFF", light: "#0A84FF", dark: "#0056B3", contrastText: "#ffffff" },
  background: { default: "#F2F2F7", paper: "rgba(255, 255, 255, 0.85)" },
  text: { primary: "#000000", secondary: "#6C6C70" },
  error: { main: "#FF3B30" },
  warning: { main: "#FF9500" },
  info: { main: "#007AFF" },
  success: { main: "#34C759" },
  divider: "rgba(60, 60, 67, 0.12)",
  custom: {
    pageBackground: "radial-gradient(circle at 50% -20%, #E5E5EA 0%, #F2F2F7 60%, #F2F2F7 100%)",
    scrollbarThumb: "rgba(0, 0, 0, 0.15)",
    scrollbarHover: "rgba(0, 0, 0, 0.3)",
    paperShadow: "0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04)",
    cardGradient: "linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(242, 242, 247, 0.98) 100%)",
    primaryGradient: "linear-gradient(135deg, #34C759 0%, #248A3D 100%)",
    primaryHoverGradient: "linear-gradient(135deg, #30D158 0%, #34C759 100%)",
    errorGradient: "linear-gradient(135deg, #FF3B30 0%, #D32F2F 100%)",
    errorHoverGradient: "linear-gradient(135deg, #FF453A 0%, #FF3B30 100%)",
    secondaryGradient: "linear-gradient(135deg, #007AFF 0%, #0056B3 100%)",
    secondaryHoverGradient: "linear-gradient(135deg, #0A84FF 0%, #007AFF 100%)",
    buttonShadow: "0 4px 14px rgba(52, 199, 89, 0.25)",
    dialogGradient: "linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(242, 242, 247, 0.98) 100%)",
    dialogShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
    tableHeaderBg: "rgba(235, 235, 240, 0.7)",
    inputBg: "rgba(255, 255, 255, 0.9)",
    inputBorderHover: "rgba(60, 60, 67, 0.3)",
    titleGradient: "linear-gradient(135deg, #000000 0%, #3A3A3C 100%)",
    successBoxBg: "rgba(52, 199, 89, 0.1)",
    successBoxBorder: "rgba(52, 199, 89, 0.25)",
    errorBoxBg: "rgba(255, 59, 48, 0.1)",
    errorBoxBorder: "rgba(255, 59, 48, 0.25)",
    secondaryBoxBg: "rgba(0, 122, 255, 0.1)",
    secondaryBoxBorder: "rgba(0, 122, 255, 0.25)",
    netPositiveBoxBg: "rgba(175, 82, 222, 0.1)",
    netPositiveBoxBorder: "rgba(175, 82, 222, 0.25)",
    netPositiveColor: "#AF52DE",
    chartBg: "rgba(255, 255, 255, 0.8)",
    chartGrid: "rgba(60, 60, 67, 0.12)",
    tooltipBg: "rgba(255, 255, 255, 0.95)",
  }
};

export const midnightEmerald = createTheme({ palette: midnightEmeraldPalette, typography, shape, components: getComponents(midnightEmeraldPalette) });
export const oledNeon = createTheme({ palette: oledNeonPalette, typography, shape, components: getComponents(oledNeonPalette) });
export const cleanCorporate = createTheme({ palette: cleanCorporatePalette, typography, shape, components: getComponents(cleanCorporatePalette) });

export default oledNeon;
