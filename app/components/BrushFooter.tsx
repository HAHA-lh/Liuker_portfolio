"use client";

import { useId, type CSSProperties } from "react";

// Hand-drawn, uneven brush skeletons rather than the rounded marker font.
const glyphs: Record<string, string[]> = {
  M: ["M7 119L20 12L43 76L79 9L69 120"],
  A: ["M2 119L51 7L69 117", "M19 79L65 73"],
  K: ["M12 122L24 8", "M76 13L21 69L71 116"],
  E: ["M75 15L23 19L10 119L67 111", "M20 65L64 59"],
  I: ["M24 13L10 118"],
  T: ["M1 21L79 10", "M43 18L28 119"],
  O: ["M55 12C21 0 1 62 9 100C22 150 72 105 77 52C80 25 73 13 55 12"],
  V: ["M9 13L22 120L78 9"],
};

export function BrushFooter() {
  const id = useId().replace(/:/g, "");
  let x = 22;
  const characters = Array.from("MAKE IT MOVE").map((letter, index) => {
    const position = x;
    x += letter === " " ? 38 : letter === "I" ? 39 : 86;
    return { letter, position, index };
  });
  return <svg className="footer-drybrush pen-mark" viewBox={`0 0 ${x + 15} 170`} aria-hidden="true" focusable="false">
    <defs>
      <filter id={id} x="-5%" y="-15%" width="110%" height="135%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".65 .22" numOctaves="3" seed="19" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 9 -3.5" result="dry" />
        <feComposite in="SourceGraphic" in2="dry" operator="in" result="ink" />
        <feDisplacementMap in="ink" in2="grain" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
    <g filter={`url(#${id})`} fill="none" stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
      {characters.map(({letter,position,index}) => <g key={index} transform={`translate(${position} ${index%3===0?5:0}) rotate(${index%2 ? -2 : 1} 40 65)`}>
        {(glyphs[letter] || []).map((d, stroke) => <path className="brush-stroke" key={stroke} d={d} pathLength="1" strokeWidth={stroke ? 10 : 15} style={{"--brush-delay":`${index * .085 + stroke * .07}s`} as CSSProperties}/>) }
      </g>)}
      <path className="brush-stroke brush-swipe" d={`M18 148Q${x*.4} 132 ${x-9} 146M37 154Q${x*.6} 145 ${x-60} 151`} pathLength="1" strokeWidth="8" style={{"--brush-delay":"1s"} as CSSProperties}/>
    </g>
  </svg>;
}
