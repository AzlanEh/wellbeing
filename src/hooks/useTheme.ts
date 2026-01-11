import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export const useTheme = () => {
  const { theme, loadTheme } = useAppStore();

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty("--color-primary", theme.colors.primary);
      root.style.setProperty("--color-secondary", theme.colors.secondary);
      root.style.setProperty("--color-background", theme.colors.background);
      root.style.setProperty("--color-surface", theme.colors.surface);
      root.style.setProperty("--color-text", theme.colors.text);
      root.style.setProperty("--color-text-secondary", theme.colors.textSecondary);
      root.style.setProperty("--color-accent", theme.colors.accent);
      root.style.setProperty("--color-warning", theme.colors.warning);
      root.style.setProperty("--color-danger", theme.colors.danger);
      root.style.setProperty("--font-family", theme.fonts.family);
    }
  }, [theme]);

  return theme;
};