"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { gsap } from "gsap";
import { ArrowUpRight, Play } from "lucide-react";
import "./masonry.css";

export type MasonryItem<T> = {
  id: string;
  img: string;
  height: number;
  title: string;
  category: string;
  year: string;
  value: T;
};

type MasonryProps<T> = {
  items: MasonryItem<T>[];
  onItemClick: (value: T) => void;
  onDetails: (value: T) => void;
  playLabel: string;
  detailsLabel: string;
};

const imageVariant = (src: string, extension: "avif" | "webp") =>
  src.replace(/\.(?:avif|jpe?g|png|webp)$/i, `.${extension}`);

function MasonryPicture({ src }: { src: string }) {
  const [avifUnavailable, setAvifUnavailable] = useState(false);
  return (
    <picture className="masonry-card-picture">
      {!avifUnavailable && <source srcSet={imageVariant(src, "avif")} type="image/avif" />}
      <img
        src={imageVariant(src, "webp")}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(event) => {
          if (!avifUnavailable && event.currentTarget.currentSrc.toLowerCase().includes(".avif")) {
            setAvifUnavailable(true);
          }
        }}
      />
    </picture>
  );
}

function useColumns() {
  const [columns, setColumns] = useState(3);
  useEffect(() => {
    const update = () => setColumns(window.innerWidth >= 1450 ? 4 : window.innerWidth >= 1050 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return columns;
}

export default function Masonry<T>({
  items,
  onItemClick,
  onDetails,
  playLabel,
  detailsLabel,
}: MasonryProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Map<string, HTMLElement[]>>(new Map());
  const [width, setWidth] = useState(0);
  const columns = useColumns();
  const gap = 14;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { grid, height } = useMemo(() => {
    if (!width) return { grid: [], height: 0 };
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const heights = new Array(columns).fill(0);
    const next = items.map((item) => {
      const column = heights.indexOf(Math.min(...heights));
      const x = column * (columnWidth + gap);
      const y = heights[column];
      const scaledHeight = Math.max(260, item.height * (columnWidth / 420));
      heights[column] += scaledHeight + gap;
      return { ...item, x, y, w: columnWidth, h: scaledHeight };
    });
    return { grid: next, height: Math.max(...heights, 0) - gap };
  }, [columns, items, width]);

  useLayoutEffect(() => {
    if (!grid.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = grid.map((item) => containerRef.current?.querySelector<HTMLElement>(`[data-masonry-key="${item.id}"]`)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          const index = Number(element.dataset.masonryIndex || 0);
          const item = grid[index];
          if (!item) return;
          element.dataset.revealed = "true";
          gsap.to(element, {
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
            opacity: 1,
            filter: "blur(0px)",
            duration: reduced ? 0 : 0.78,
            ease: "power3.out",
            delay: reduced ? 0 : (index % columns) * 0.055,
            overwrite: "auto",
          });
          observer.unobserve(element);
        });
      },
      { rootMargin: "80px 0px -8%", threshold: 0.08 },
    );

    grid.forEach((item, index) => {
      const element = elements[index];
      if (!element) return;
      const target = { x: item.x, y: item.y, width: item.w, height: item.h };
      if (reduced || element.dataset.revealed === "true") {
        gsap.to(element, { ...target, opacity: 1, filter: "blur(0px)", duration: reduced ? 0 : 0.55, ease: "power3.out", overwrite: "auto" });
      } else {
        gsap.set(element, { ...target, y: item.y + 86, opacity: 0, filter: "blur(12px)" });
        observer.observe(element);
      }
    });
    return () => {
      observer.disconnect();
      gsap.killTweensOf(elements);
    };
  }, [columns, grid]);

  useEffect(() => {
    const container = containerRef.current;
    const spotlight = spotlightRef.current;
    if (!container || !spotlight) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;

    const paintSpotlight = () => {
      raf = 0;
      const containerRect = container.getBoundingClientRect();
      const localX = pointerX - containerRect.left;
      const localY = pointerY - containerRect.top;
      spotlight.style.transform = `translate3d(${localX - 360}px, ${localY - 360}px, 0)`;
      spotlight.style.opacity = "1";

      container.querySelectorAll<HTMLElement>(".masonry-card-media").forEach((card) => {
        const rect = card.getBoundingClientRect();
        const relativeX = ((pointerX - rect.left) / rect.width) * 100;
        const relativeY = ((pointerY - rect.top) / rect.height) * 100;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const edgeDistance = Math.max(0, Math.hypot(pointerX - centerX, pointerY - centerY) - Math.max(rect.width, rect.height) / 2);
        const glow = Math.max(0, 1 - edgeDistance / 260);
        card.style.setProperty("--glow-x", `${relativeX}%`);
        card.style.setProperty("--glow-y", `${relativeY}%`);
        card.style.setProperty("--glow-intensity", glow.toFixed(3));
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!raf) raf = requestAnimationFrame(paintSpotlight);
    };
    const onPointerLeave = () => {
      spotlight.style.opacity = "0";
      container.querySelectorAll<HTMLElement>(".masonry-card-media").forEach((card) => {
        card.style.setProperty("--glow-intensity", "0");
      });
    };

    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerleave", onPointerLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  useEffect(() => () => {
    particlesRef.current.forEach((particles) => {
      particles.forEach((particle) => {
        gsap.killTweensOf(particle);
        particle.remove();
      });
    });
    particlesRef.current.clear();
  }, []);

  const clearParticles = (id: string) => {
    const particles = particlesRef.current.get(id) || [];
    particles.forEach((particle) => {
      gsap.killTweensOf(particle);
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.22,
        ease: "back.in(1.7)",
        onComplete: () => particle.remove(),
      });
    });
    particlesRef.current.delete(id);
  };

  const createParticles = (id: string, card: HTMLElement) => {
    clearParticles(id);
    const rect = card.getBoundingClientRect();
    const particles = Array.from({ length: 12 }, (_, index) => {
      const particle = document.createElement("i");
      particle.className = "magic-bento-particle";
      particle.style.left = `${10 + Math.random() * Math.max(1, rect.width - 20)}px`;
      particle.style.top = `${10 + Math.random() * Math.max(1, rect.height - 20)}px`;
      card.appendChild(particle);
      gsap.fromTo(
        particle,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, delay: index * 0.035, ease: "back.out(1.7)" },
      );
      gsap.to(particle, {
        x: (Math.random() - 0.5) * 90,
        y: (Math.random() - 0.5) * 90,
        rotation: Math.random() * 360,
        opacity: 0.3,
        duration: 1.8 + Math.random() * 1.8,
        delay: index * 0.035,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      return particle;
    });
    particlesRef.current.set(id, particles);
  };

  const cardEnter = (event: ReactMouseEvent<HTMLElement>, id: string) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const card = event.currentTarget.querySelector<HTMLElement>(".masonry-card-media");
    if (!card) return;
    createParticles(id, card);
    gsap.to(card, { scale: 0.985, duration: 0.32, ease: "power3.out", transformPerspective: 1000 });
  };

  const cardMove = (event: ReactMouseEvent<HTMLElement>) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const card = event.currentTarget.querySelector<HTMLElement>(".masonry-card-media");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -7;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 7;
    const magnetX = (x - rect.width / 2) * 0.025;
    const magnetY = (y - rect.height / 2) * 0.025;
    gsap.to(card, {
      rotateX,
      rotateY,
      x: magnetX,
      y: magnetY,
      scale: 0.985,
      duration: 0.16,
      ease: "power2.out",
      transformPerspective: 1000,
      overwrite: "auto",
    });
  };

  const cardLeave = (event: ReactMouseEvent<HTMLElement>, id: string) => {
    const card = event.currentTarget.querySelector<HTMLElement>(".masonry-card-media");
    clearParticles(id);
    if (!card) return;
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.42,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  const cardClick = (event: ReactMouseEvent<HTMLElement>) => {
    const card = event.currentTarget.querySelector<HTMLElement>(".masonry-card-media");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const distance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height),
    );
    const ripple = document.createElement("i");
    ripple.className = "magic-bento-ripple";
    ripple.style.width = `${distance * 2}px`;
    ripple.style.height = `${distance * 2}px`;
    ripple.style.left = `${x - distance}px`;
    ripple.style.top = `${y - distance}px`;
    card.appendChild(ripple);
    gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.78, ease: "power2.out", onComplete: () => ripple.remove() });
  };

  return (
    <div ref={containerRef} className="masonry-list" style={{ height }}>
      <div ref={spotlightRef} className="masonry-global-spotlight" aria-hidden="true" />
      {grid.map((item, index) => (
        <article
          key={item.id}
          data-masonry-key={item.id}
          data-masonry-index={index}
          className="masonry-item"
          onMouseEnter={(event) => cardEnter(event, item.id)}
          onMouseMove={cardMove}
          onMouseLeave={(event) => cardLeave(event, item.id)}
          onClick={cardClick}
        >
          <div className="masonry-card-media magic-bento-card">
            <MasonryPicture src={item.img} />
            <div className="masonry-card-shade" />
            <span className="masonry-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="masonry-copy">
              <span>{item.category} · {item.year}</span>
              <h3>{item.title}</h3>
            </div>
            <div className="masonry-actions">
              <button type="button" onClick={() => onItemClick(item.value)} aria-label={`${playLabel}: ${item.title}`}>
                <Play size={15} fill="currentColor" /> {playLabel}
              </button>
              <button type="button" onClick={() => onDetails(item.value)} aria-label={`${detailsLabel}: ${item.title}`}>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
