"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "./content";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem("portfolio-language");
    if (saved === "zh" || saved === "en") {
      setLanguageState(saved);
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: Language) => {
        setLanguageState(next);
        window.localStorage.setItem("portfolio-language", next);
        document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
      },
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
