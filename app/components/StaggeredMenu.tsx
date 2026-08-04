"use client";

import { gsap } from "gsap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./staggered-menu.css";

export type StaggeredMenuItem = {
  label: string;
  ariaLabel: string;
  link: string;
};

type StaggeredMenuProps = {
  position?: "left" | "right";
  colors?: string[];
  items: StaggeredMenuItem[];
  displayItemNumbering?: boolean;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  closeOnClickAway?: boolean;
  footer?: ReactNode;
};

export default function StaggeredMenu({
  position = "right",
  colors = ["#ff6a00", "#b600a8"],
  items,
  displayItemNumbering = true,
  menuButtonColor = "#d7e2ea",
  openMenuButtonColor = "#111214",
  accentColor = "#b600a8",
  closeOnClickAway = true,
  footer,
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const busyRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);

  const offscreen = position === "left" ? -100 : 100;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const layers = layersRef.current
      ? Array.from(layersRef.current.querySelectorAll<HTMLElement>(".sm-prelayer"))
      : [];
    if (!panel) return;

    const context = gsap.context(() => {
      gsap.set([panel, ...layers], { xPercent: offscreen, opacity: 1 });
      gsap.set(panel.querySelectorAll(".sm-panel-itemLabel"), {
        yPercent: 140,
        rotate: 9,
      });
      gsap.set(panel.querySelectorAll(".sm-panel-item"), {
        "--sm-num-opacity": 0,
      });
      gsap.set(panel.querySelectorAll(".sm-panel-footer > *"), {
        opacity: 0,
        y: 24,
      });
    });
    return () => context.revert();
  }, [offscreen]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return null;
    const layers = layersRef.current
      ? Array.from(layersRef.current.querySelectorAll<HTMLElement>(".sm-prelayer"))
      : [];
    const labels = Array.from(
      panel.querySelectorAll<HTMLElement>(".sm-panel-itemLabel"),
    );
    const numberedItems = Array.from(
      panel.querySelectorAll<HTMLElement>(".sm-panel-item"),
    );
    const footerItems = Array.from(
      panel.querySelectorAll<HTMLElement>(".sm-panel-footer > *"),
    );

    timelineRef.current?.kill();
    closeTweenRef.current?.kill();
    gsap.set(labels, { yPercent: 140, rotate: 9 });
    gsap.set(numberedItems, { "--sm-num-opacity": 0 });
    gsap.set(footerItems, { opacity: 0, y: 24 });

    const timeline = gsap.timeline({ paused: true });
    layers.forEach((layer, index) => {
      timeline.fromTo(
        layer,
        { xPercent: offscreen },
        { xPercent: 0, duration: 0.5, ease: "power4.out" },
        index * 0.07,
      );
    });
    const panelStart = Math.max(0.08, layers.length * 0.07);
    timeline.fromTo(
      panel,
      { xPercent: offscreen },
      { xPercent: 0, duration: 0.68, ease: "power4.out" },
      panelStart,
    );
    timeline.to(
      labels,
      {
        yPercent: 0,
        rotate: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.09,
      },
      panelStart + 0.12,
    );
    timeline.to(
      numberedItems,
      {
        "--sm-num-opacity": 1,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.07,
      },
      panelStart + 0.2,
    );
    timeline.to(
      footerItems,
      {
        opacity: 1,
        y: 0,
        duration: 0.52,
        ease: "power3.out",
        stagger: 0.06,
      },
      panelStart + 0.32,
    );
    timeline.eventCallback("onComplete", () => {
      busyRef.current = false;
    });
    timelineRef.current = timeline;
    return timeline;
  }, [offscreen]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    busyRef.current = false;
    openRef.current = false;
    setOpen(false);
    timelineRef.current?.kill();
    const panel = panelRef.current;
    const layers = layersRef.current
      ? Array.from(layersRef.current.querySelectorAll<HTMLElement>(".sm-prelayer"))
      : [];
    if (panel) {
      closeTweenRef.current = gsap.to([...layers, panel], {
        xPercent: offscreen,
        duration: 0.36,
        ease: "power3.in",
        overwrite: "auto",
        onComplete: () => {
          busyRef.current = false;
        },
      });
    }
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotate: 0,
        duration: 0.35,
        ease: "power3.inOut",
      });
    }
  }, [offscreen]);

  const toggleMenu = () => {
    if (openRef.current) {
      closeMenu();
      return;
    }

    timelineRef.current?.kill();
    closeTweenRef.current?.kill();
    busyRef.current = true;
    openRef.current = true;
    setOpen(true);
    buildOpenTimeline()?.play(0);
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotate: 225,
        duration: 0.8,
        ease: "power4.out",
      });
    }
  };

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  return (
    <div
      className="staggered-menu-wrapper"
      data-position={position}
      data-open={open || undefined}
      style={{ "--sm-accent": accentColor } as React.CSSProperties}
    >
      {closeOnClickAway ? (
        <button
          type="button"
          className="sm-menu-backdrop"
          aria-label="Close menu backdrop"
          tabIndex={open ? 0 : -1}
          onClick={closeMenu}
        />
      ) : null}

      <div ref={layersRef} className="sm-prelayers" aria-hidden="true">
        {colors.slice(0, 3).map((color, index) => (
          <div
            key={`${color}-${index}`}
            className="sm-prelayer"
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="staggered-menu-header">
        <button
          ref={buttonRef}
          type="button"
          className="sm-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          style={{ color: open ? openMenuButtonColor : menuButtonColor }}
        >
          <span className="sm-toggle-text">{open ? "Close" : "Menu"}</span>
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span className="sm-icon-line" />
            <span className="sm-icon-line sm-icon-line-v" />
          </span>
        </button>
      </div>

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="staggered-menu-panel"
        aria-hidden={!open}
      >
        <div className="sm-panel-inner">
          <p className="sm-panel-kicker">LIUKER / PORTFOLIO</p>
          <ul
            className="sm-panel-list"
            role="list"
            data-numbering={displayItemNumbering || undefined}
          >
            {items.map((item, index) => (
              <li className="sm-panel-item-wrap" key={`${item.label}-${index}`}>
                <a
                  className="sm-panel-item"
                  href={item.link}
                  aria-label={item.ariaLabel}
                  data-index={index + 1}
                  onClick={closeMenu}
                >
                  <span className="sm-panel-itemLabel">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
          {footer ? <div className="sm-panel-footer">{footer}</div> : null}
        </div>
      </aside>
    </div>
  );
}
