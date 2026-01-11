import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "wellbeing-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    getStoredTheme() === "system" ? getSystemTheme() : getStoredTheme() as "light" | "dark"
  );

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
    
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
    setResolvedTheme(effectiveTheme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      const effectiveTheme = getSystemTheme();
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
      setResolvedTheme(effectiveTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === "dark",
  };
}
