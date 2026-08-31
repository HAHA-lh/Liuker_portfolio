"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Mesh,
  Program,
  Renderer,
  Texture,
  Triangle,
  type OGLRenderingContext,
} from "ogl";
import "./WarpText.css";

type WarpTextProps = {
  text: string;
  color?: string;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
  className?: string;
  style?: CSSProperties;
};

type RuntimeProps = Required<Omit<WarpTextProps, "className" | "style">>;

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);
  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);
  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);
  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const cssValue = (value: string | number) =>
  typeof value === "number" ? `${value}px` : value;

function measureLine(
  context: CanvasRenderingContext2D,
  line: string,
  letterSpacing: number,
) {
  const characters = Array.from(line);
  const textWidth = characters.reduce(
    (width, character) => width + context.measureText(character).width,
    0,
  );
  return textWidth + Math.max(0, characters.length - 1) * letterSpacing;
}

function drawLine(
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  const characters = Array.from(line);
  let cursor = x - measureLine(context, line, letterSpacing) / 2;

  characters.forEach((character, index) => {
    context.fillText(character, cursor, y);
    cursor +=
      context.measureText(character).width +
      (index === characters.length - 1 ? 0 : letterSpacing);
  });
}

function buildTextCanvas(
  container: HTMLElement,
  width: number,
  height: number,
  dpr: number,
  props: RuntimeProps,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const probe = document.createElement("span");
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    inset: "0 auto auto 0",
    fontFamily: props.fontFamily,
    fontSize: cssValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: cssValue(props.letterSpacing),
    lineHeight:
      typeof props.lineHeight === "number"
        ? String(props.lineHeight)
        : props.lineHeight,
  });
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  let fontSize = Number.parseFloat(computed.fontSize) || 96;
  const fontFamily = computed.fontFamily || props.fontFamily;
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  let letterSpacing =
    computed.letterSpacing === "normal"
      ? 0
      : Number.parseFloat(computed.letterSpacing) || 0;
  let lineHeight = Number.parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight =
      fontSize * (typeof props.lineHeight === "number" ? props.lineHeight : 0.9);
  }
  probe.remove();

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = props.color;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const lines = props.text.split("\n");
  const applyFont = () => {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  };
  applyFont();

  const widest = Math.max(
    ...lines.map((line) => measureLine(context, line, letterSpacing)),
    1,
  );
  const blockHeight = Math.max(lineHeight * lines.length, 1);
  const fit = Math.min(1, (width * 0.9) / widest, (height * 0.76) / blockHeight);
  if (fit < 1) {
    fontSize *= fit;
    letterSpacing *= fit;
    lineHeight *= fit;
    applyFont();
  }

  const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) =>
    drawLine(context, line, width / 2, startY + index * lineHeight, letterSpacing),
  );
  return canvas;
}

export default function WarpText({
  text,
  color = "#f2f4f8",
  warpStrength = 0.1,
  warpScale = 1.7,
  speed = 0.5,
  pointerInfluence = 0.4,
  pointerStrength = 0.44,
  refraction = 0.018,
  ripple = true,
  fontSize = "clamp(4rem, 10vw, 10rem)",
  fontWeight = 900,
  fontFamily = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
  letterSpacing = "-0.065em",
  lineHeight = 0.9,
  className = "",
  style,
}: WarpTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<{ program: Program; rasterize: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const propsRef = useRef<RuntimeProps>({
    text,
    color,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
  });

  useEffect(() => {
    propsRef.current = {
      text,
      color,
      warpStrength,
      warpScale,
      speed,
      pointerInfluence,
      pointerStrength,
      refraction,
      ripple,
      fontSize,
      fontWeight,
      fontFamily,
      letterSpacing,
      lineHeight,
    };
    const context = contextRef.current;
    if (context) {
      context.program.uniforms.uWarpStrength.value = warpStrength;
      context.program.uniforms.uWarpScale.value = warpScale;
      context.program.uniforms.uSpeed.value = speed;
      context.program.uniforms.uPointerInfluence.value = pointerInfluence;
      context.program.uniforms.uPointerStrength.value = pointerStrength;
      context.program.uniforms.uRefraction.value = refraction;
      context.program.uniforms.uRipple.value = ripple ? 1 : 0;
      context.rasterize();
    }
  }, [
    text,
    color,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    let renderer: Renderer;
    let gl: OGLRenderingContext;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      gl = renderer.gl;
    } catch {
      return;
    }

    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    const geometry = new Triangle(gl);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: propsRef.current.warpStrength },
        uWarpScale: { value: propsRef.current.warpScale },
        uSpeed: { value: propsRef.current.speed },
        uPointerInfluence: { value: propsRef.current.pointerInfluence },
        uPointerStrength: { value: propsRef.current.pointerStrength },
        uRefraction: { value: propsRef.current.refraction },
        uRipple: { value: propsRef.current.ripple ? 1 : 0 },
        uMotion: { value: reduceMotion ? 0 : 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    let disposed = false;
    let visible = true;
    let raf = 0;
    let rasterVersion = 0;
    const startTime = performance.now();
    const pointer = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      active: 0,
      activeTarget: 0,
    };

    const render = () => renderer.render({ scene: mesh });
    const rasterize = async () => {
      const version = ++rasterVersion;
      try {
        await document.fonts?.ready;
      } catch {}
      if (disposed || version !== rasterVersion) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      texture.image = buildTextCanvas(
        container,
        rect.width,
        rect.height,
        Math.min(window.devicePixelRatio || 1, 2),
        propsRef.current,
      );
      texture.needsUpdate = true;
      render();
      setReady(true);
    };

    const resize = () => {
      if (disposed) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      rasterize();
    };

    const loop = (now: number) => {
      if (disposed) return;
      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget ? pointer.targetX : idleX;
      const targetY = pointer.activeTarget ? pointer.targetY : idleY;
      const damping = pointer.activeTarget ? 0.12 : 0.035;
      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget ? 1 : 0.18) - pointer.active) * 0.06;
      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uPointerActive.value = reduceMotion ? pointer.active * 0.2 : pointer.active;
      program.uniforms.uTime.value = reduceMotion ? 0 : elapsed;
      render();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = (event.clientX - rect.left) / rect.width;
      pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
      pointer.activeTarget = 1;
    };
    const onPointerLeave = () => {
      pointer.activeTarget = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    });
    intersectionObserver.observe(container);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    contextRef.current = { program, rasterize };
    resize();
    start();

    return () => {
      disposed = true;
      contextRef.current = null;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (canvas.parentNode === container) container.removeChild(canvas);
      try {
        if (texture.texture) gl.deleteTexture(texture.texture);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {}
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`warp-text${ready ? " is-ready" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      role="img"
      aria-label={text}
    >
      <span className="warp-text__fallback" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}

