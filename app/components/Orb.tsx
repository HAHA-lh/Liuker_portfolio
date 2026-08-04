"use client";

import { Mesh, Program, Renderer, Triangle, Vec3 } from "ogl";
import { useEffect, useRef } from "react";
import "./orb.css";

type OrbProps = {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  backgroundColor?: string;
};

const vertexShader = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  uniform vec3 backgroundColor;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 color) {
    return vec3(
      dot(color, vec3(0.299, 0.587, 0.114)),
      dot(color, vec3(0.596, -0.274, -0.322)),
      dot(color, vec3(0.211, -0.523, 0.312))
    );
  }

  vec3 yiq2rgb(vec3 color) {
    return vec3(
      color.x + 0.956 * color.y + 0.621 * color.z,
      color.x - 0.272 * color.y - 0.647 * color.z,
      color.x - 1.106 * color.y + 1.703 * color.z
    );
  }

  vec3 adjustHue(vec3 color, float hueDegrees) {
    float angle = hueDegrees * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(color);
    float cosine = cos(angle);
    float sine = sin(angle);
    float i = yiq.y * cosine - yiq.z * sine;
    float q = yiq.y * sine + yiq.z * cosine;
    yiq.y = i;
    yiq.z = q;
    return yiq2rgb(yiq);
  }

  vec3 hash33(vec3 value) {
    value = fract(value * vec3(0.1031, 0.11369, 0.13787));
    value += dot(value, value.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
      value.x + value.y,
      value.x + value.z,
      value.y + value.z
    ) * value.zyx);
  }

  float snoise3(vec3 point) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(point + (point.x + point.y + point.z) * K1);
    vec3 d0 = point - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(
      dot(d0, d0),
      dot(d1, d1),
      dot(d2, d2),
      dot(d3, d3)
    ), 0.0);
    vec4 noise = h * h * h * h * vec4(
      dot(d0, hash33(i)),
      dot(d1, hash33(i + i1)),
      dot(d2, hash33(i + i2)),
      dot(d3, hash33(i + 1.0))
    );
    return dot(vec4(31.316), noise);
  }

  vec4 extractAlpha(vec3 color) {
    float alpha = max(max(color.r, color.g), color.b);
    return vec4(color.rgb / (alpha + 1e-5), alpha);
  }

  const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
  const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
  const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
  const float innerRadius = 0.6;
  const float noiseScale = 0.65;

  float light1(float intensity, float attenuation, float distanceValue) {
    return intensity / (1.0 + distanceValue * attenuation);
  }

  float light2(float intensity, float attenuation, float distanceValue) {
    return intensity / (1.0 + distanceValue * distanceValue * attenuation);
  }

  vec4 drawOrb(vec2 uv) {
    vec3 color1 = adjustHue(baseColor1, hue);
    vec3 color2 = adjustHue(baseColor2, hue);
    vec3 color3 = adjustHue(baseColor3, hue);
    float angle = atan(uv.y, uv.x);
    float lengthValue = length(uv);
    float inverseLength = lengthValue > 0.0 ? 1.0 / lengthValue : 0.0;
    float backgroundLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
    float d0 = distance(uv, (r0 * inverseLength) * uv);
    float v0 = light1(1.0, 10.0, d0);
    v0 *= smoothstep(r0 * 1.05, r0, lengthValue);
    float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, lengthValue);
    v0 *= mix(innerFade, 1.0, backgroundLuminance * 0.7);
    float colorLerp = cos(angle + iTime * 2.0) * 0.5 + 0.5;
    float orbit = iTime * -1.0;
    vec2 lightPosition = vec2(cos(orbit), sin(orbit)) * r0;
    float lightDistance = distance(uv, lightPosition);
    float v1 = light2(1.5, 5.0, lightDistance);
    v1 *= light1(1.0, 50.0, d0);
    float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), lengthValue);
    float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), lengthValue);
    vec3 colorBase = mix(color1, color2, colorLerp);
    float fadeAmount = mix(1.0, 0.1, backgroundLuminance);
    vec3 darkColor = mix(color3, colorBase, v0);
    darkColor = clamp((darkColor + v1) * v2 * v3, 0.0, 1.0);
    vec3 lightColor = (colorBase + v1) * mix(1.0, v2 * v3, fadeAmount);
    lightColor = clamp(mix(backgroundColor, lightColor, v0), 0.0, 1.0);
    return extractAlpha(mix(darkColor, lightColor, backgroundLuminance));
  }

  void main() {
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (vUv * iResolution.xy - center) / size * 2.0;
    float sine = sin(rot);
    float cosine = cos(rot);
    uv = vec2(cosine * uv.x - sine * uv.y, sine * uv.x + cosine * uv.y);
    uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
    uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
    vec4 color = drawOrb(uv);
    gl_FragColor = vec4(color.rgb * color.a, color.a);
  }
`;

function colorToVector(color: string) {
  const normalized = color.replace("#", "");
  if (normalized.length === 6) {
    return new Vec3(
      Number.parseInt(normalized.slice(0, 2), 16) / 255,
      Number.parseInt(normalized.slice(2, 4), 16) / 255,
      Number.parseInt(normalized.slice(4, 6), 16) / 255,
    );
  }
  return new Vec3(0, 0, 0);
}

export default function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false,
  backgroundColor = "#000000",
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(1, 1, 1) },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
        backgroundColor: { value: colorToVector(backgroundColor) },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = `${width}px`;
      gl.canvas.style.height = `${height}px`;
      program.uniforms.iResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height,
      );
    };

    let targetHover = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const x = ((event.clientX - rect.left - rect.width / 2) / size) * 2;
      const y = ((event.clientY - rect.top - rect.height / 2) / size) * 2;
      targetHover = Math.hypot(x, y) < 0.86 ? 1 : 0;
    };
    const handlePointerLeave = () => {
      targetHover = 0;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    resize();

    let frame = 0;
    let lastTime = performance.now();
    let rotation = 0;
    let visible = true;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: "160px" },
    );
    visibilityObserver.observe(container);

    const update = (time: number) => {
      frame = window.requestAnimationFrame(update);
      if (!visible) return;
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const effectiveHover = forceHoverState ? 1 : targetHover;
      program.uniforms.iTime.value = time / 1000;
      program.uniforms.hue.value = hue;
      program.uniforms.hoverIntensity.value = hoverIntensity;
      program.uniforms.backgroundColor.value = colorToVector(backgroundColor);
      program.uniforms.hover.value +=
        (effectiveHover - program.uniforms.hover.value) * 0.1;
      if (rotateOnHover && effectiveHover > 0.5) rotation += delta * 0.3;
      program.uniforms.rot.value = rotation;
      renderer.render({ scene: mesh });
    };
    frame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      gl.canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [backgroundColor, forceHoverState, hoverIntensity, hue, rotateOnHover]);

  return <div ref={containerRef} className="orb-container" aria-hidden="true" />;
}
