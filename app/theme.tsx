"use client";

import { Moon, Sun } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("portfolio-theme");
    const initial = saved === "light" || saved === "dark" ? saved : "dark";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        setThemeState(next);
        applyTheme(next);
        window.localStorage.setItem("portfolio-theme", next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <label className="theme-toggle" title={isDark ? "切换到亮色模式" : "切换到暗色模式"}>
      <input
        type="checkbox"
        checked={isDark}
        onChange={(event) => setTheme(event.target.checked ? "dark" : "light")}
        aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
      />
      <span className="theme-toggle-button" aria-hidden="true" />
      <span className="theme-toggle-label" aria-hidden="true">
        {isDark ? <Moon size={15} strokeWidth={2.2} /> : <Sun size={16} strokeWidth={2.2} />}
      </span>
    </label>
  );
}
