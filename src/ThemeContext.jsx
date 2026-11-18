/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { midnightEmerald, oledNeon, cleanCorporate } from "./theme";

export const ThemeContext = createContext({
  activeTheme: "oledNeon",
  setTheme: () => {},
  animationsOn: true,
  setAnimationsOn: () => {},
});

export const ThemeContextProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(() => {
    const saved = localStorage.getItem("app_theme");
    return saved === "softPastel" ? "oledNeon" : saved || "oledNeon";
  });

  // In-app animation switch (Settings → Appearance). On by default, whatever the
  // operating system's "reduce animations" setting says.
  const [animationsOn, setAnimationsOn] = useState(
    () => localStorage.getItem("app_animations") !== "off"
  );

  useEffect(() => {
    localStorage.setItem("app_theme", activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem("app_animations", animationsOn ? "on" : "off");
  }, [animationsOn]);

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
    <ThemeContext.Provider
      value={{ activeTheme, setTheme: setActiveTheme, animationsOn, setAnimationsOn }}
    >
      <ThemeProvider theme={currentThemeObj}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
