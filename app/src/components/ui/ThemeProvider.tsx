"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "system" | "dark" | "light";

const ThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}>({ theme: "system", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.removeAttribute("data-theme");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.setAttribute("data-theme", "dark") : root.removeAttribute("data-theme");
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("dica-theme") as AppTheme) ?? "system";
    setThemeState(stored);
    applyTheme(stored);

    // Listen for system preference changes when mode is "system"
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem("dica-theme") as AppTheme) ?? "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = (t: AppTheme) => {
    localStorage.setItem("dica-theme", t);
    setThemeState(t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
