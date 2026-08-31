"use client";

import Link from "next/link";
import { useLanguage } from "../language";
import { ThemeToggle, useTheme } from "../theme";
import StaggeredMenu from "./StaggeredMenu";

function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="editorial-language" aria-label="Language / 语言">
      <button
        type="button"
        className={language === "zh" ? "is-active" : ""}
        onClick={() => setLanguage("zh")}
        aria-pressed={language === "zh"}
      >
        中
      </button>
      <button
        type="button"
        className={language === "en" ? "is-active" : ""}
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}

export function EditorialHeader({ stretchMenuButton = false }: { stretchMenuButton?: boolean }) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const menuItems = [
    {
      label: language === "zh" ? "首页" : "Home",
      ariaLabel: language === "zh" ? "返回首页" : "Return home",
      link: "/",
    },
    {
      label: language === "zh" ? "作品" : "Work",
      ariaLabel: language === "zh" ? "浏览全部作品" : "Browse all work",
      link: "/work",
    },
    {
      label: language === "zh" ? "服务" : "What I do",
      ariaLabel: language === "zh" ? "查看服务方向" : "View services",
      link: "/#services",
    },
    {
      label: language === "zh" ? "关于" : "About",
      ariaLabel: language === "zh" ? "查看关于" : "View about",
      link: "/#about",
    },
    {
      label: language === "zh" ? "经历" : "Experience",
      ariaLabel: language === "zh" ? "查看经历" : "View experience",
      link: "/#experience",
    },
    {
      label: language === "zh" ? "联系" : "Contact",
      ariaLabel: language === "zh" ? "前往联系" : "Go to contact",
      link: "/#contact",
    },
  ];

  return (
    <>
      <header className="editorial-header">
        <Link className="editorial-brand" href="/" aria-label="LIUKER home">
          LIUKER
        </Link>
      </header>
      <StaggeredMenu
        glassButton
        scrollStretchButton={stretchMenuButton}
        items={menuItems}
        position="right"
        colors={["#ff5c7c", "#7b4dff"]}
        accentColor="#ff5c7c"
        menuButtonColor={theme === "light" ? "#111111" : "#f5f3ef"}
        openMenuButtonColor="#111111"
        footer={
          <div className="editorial-menu-controls">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        }
      />
    </>
  );
}
