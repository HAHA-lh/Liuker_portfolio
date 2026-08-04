"use client";

import { motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";
import "./variable-proximity.css";

type Falloff = "linear" | "exponential" | "gaussian";

type VariableProximityProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  label: string;
  fromFontVariationSettings?: string;
  toFontVariationSettings?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
  radius?: number;
  falloff?: Falloff;
};

type Position = { x: number; y: number };

function useMousePositionRef(containerRef?: RefObject<HTMLDivElement | null>) {
  const positionRef = useRef<Position>({ x: -9999, y: -9999 });

  useEffect(() => {
    const interactionContainer = containerRef?.current;
    const updatePosition = (x: number, y: number) => {
      const container = containerRef?.current;
      if (!container) {
        positionRef.current = { x, y };
        return;
      }
      const rect = container.getBoundingClientRect();
      positionRef.current = { x: x - rect.left, y: y - rect.top };
    };

    const handleMouseMove = (event: MouseEvent) => updatePosition(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    };
    const resetPosition = () => {
      positionRef.current = { x: -9999, y: -9999 };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    interactionContainer?.addEventListener("pointerleave", resetPosition);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      interactionContainer?.removeEventListener("pointerleave", resetPosition);
    };
  }, [containerRef]);

  return positionRef;
}

const VariableProximity = forwardRef<HTMLSpanElement, VariableProximityProps>(
  (
    {
      label,
      fromFontVariationSettings = "'wght' 400, 'opsz' 9",
      toFontVariationSettings = "'wght' 800, 'opsz' 40",
      containerRef,
      radius = 50,
      falloff = "linear",
      className = "",
      style,
      ...restProps
    },
    ref,
  ) => {
    const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const mousePositionRef = useMousePositionRef(containerRef);
    const lastPositionRef = useRef<Position>({ x: Number.NaN, y: Number.NaN });
    const reducedMotion = useReducedMotion();

    const parsedSettings = useMemo(() => {
      const parseSettings = (settings: string) =>
        new Map(
          settings
            .split(",")
            .map((setting) => setting.trim())
            .map((setting) => {
              const [name, value] = setting.split(/\s+/);
              return [name.replace(/['"]/g, ""), Number.parseFloat(value)] as const;
            }),
        );

      const fromSettings = parseSettings(fromFontVariationSettings);
      const toSettings = parseSettings(toFontVariationSettings);
      return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
        axis,
        fromValue,
        toValue: toSettings.get(axis) ?? fromValue,
      }));
    }, [fromFontVariationSettings, toFontVariationSettings]);

    const baseWeight = parsedSettings.find((setting) => setting.axis === "wght")?.fromValue ?? 400;

    useAnimationFrame(() => {
      const container = containerRef?.current;
      if (!container || reducedMotion) return;

      const { x, y } = mousePositionRef.current;
      if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) return;
      lastPositionRef.current = { x, y };
      const containerRect = container.getBoundingClientRect();

      letterRefs.current.forEach((letter, index) => {
        if (!letter) return;
        const rect = letter.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 - containerRect.left;
        const centerY = rect.top + rect.height / 2 - containerRect.top;
        const distance = Math.hypot(x - centerX, y - centerY);
        const normalized = Math.min(Math.max(1 - distance / radius, 0), 1);
        const proximity =
          falloff === "exponential"
            ? normalized ** 2
            : falloff === "gaussian"
              ? Math.exp(-((distance / (radius / 2)) ** 2) / 2)
              : normalized;

        if (distance >= radius) {
          letter.style.fontVariationSettings = fromFontVariationSettings;
          letter.style.fontWeight = String(baseWeight);
          letter.style.transform = "scaleX(1)";
          return;
        }

        const settings = parsedSettings
          .map(({ axis, fromValue, toValue }) => {
            const value = fromValue + (toValue - fromValue) * proximity;
            return `'${axis}' ${value}`;
          })
          .join(", ");
        const weight = parsedSettings.find((setting) => setting.axis === "wght");
        letter.style.fontVariationSettings = settings;
        letter.style.fontWeight = String(
          weight ? weight.fromValue + (weight.toValue - weight.fromValue) * proximity : baseWeight,
        );
        letter.style.transform = `scaleX(${1 + proximity * 0.12})`;
        letter.dataset.proximityIndex = String(index);
      });
    });

    const tokens = label.split(/(\s+)/).filter(Boolean);
    let letterIndex = 0;

    return (
      <span
        ref={ref}
        className={`${className} variable-proximity`}
        style={{ display: "inline", ...(style as CSSProperties) }}
        {...restProps}
      >
        {tokens.map((token, tokenIndex) => {
          if (/^\s+$/.test(token)) {
            return <span key={`space-${tokenIndex}`} className="variable-proximity-space">{token}</span>;
          }

          const containsCjk = /[\u3400-\u9fff\uf900-\ufaff]/.test(token);
          return (
            <span
              key={`token-${tokenIndex}`}
              className={`variable-proximity-token${containsCjk ? " is-cjk" : ""}`}
            >
              {Array.from(token).map((letter) => {
                const currentIndex = letterIndex;
                letterIndex += 1;
                return (
                  <motion.span
                    key={currentIndex}
                    ref={(element) => {
                      letterRefs.current[currentIndex] = element;
                    }}
                    className="variable-proximity-letter"
                    style={{ fontVariationSettings: fromFontVariationSettings }}
                    aria-hidden="true"
                  >
                    {letter}
                  </motion.span>
                );
              })}
            </span>
          );
        })}
        <span className="sr-only">{label}</span>
      </span>
    );
  },
);

VariableProximity.displayName = "VariableProximity";

export default VariableProximity;
