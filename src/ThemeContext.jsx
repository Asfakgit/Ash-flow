/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { midnightEmerald, oledNeon, cleanCorporate } from "./theme";

export const ThemeContext = createContext({
  activeTheme: "oledNeon",
  setTheme: () => {},
});

export const ThemeContextProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(() => {
    const saved = localStorage.getItem("app_theme");
    return saved === "softPastel" ? "oledNeon" : saved || "oledNeon";
  });

  useEffect(() => {
    localStorage.setItem("app_theme", activeTheme);
  }, [activeTheme]);

  const currentThemeObj = useMemo(() => {
    switch (activeTheme) {
      case "midnightEmerald": return midnightEmerald;
      case "cleanCorporate": return cleanCorporate;
      case "oledNeon":
      default:
        return oledNeon;
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme: setActiveTheme }}>
      <ThemeProvider theme={currentThemeObj}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
