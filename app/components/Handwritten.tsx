"use client";
import { useEffect, type CSSProperties } from "react";
/* Marker lettering and animated pen annotations. */
const letters: Record<string,string> = {
 a:"M17 11Q9 5 5 17Q1 29 10 25L17 12L15 27L21 23",
 d:"M17 12Q7 6 4 19Q2 30 11 24L18 9L21 0L17 27L23 24",
 e:"M4 19Q22 18 16 10Q9 5 4 18Q0 31 20 24",
 f:"M6 33L13 5Q17 -3 22 3M3 14L21 12",
 g:"M18 11Q8 6 4 18Q1 29 11 24L18 12L15 34Q12 44 3 37",
 h:"M4 27L12 1M7 19Q23 1 19 19L17 27L23 24",
 i:"M11 12L8 26L15 23M13 4L13 5",
 k:"M5 27L12 1M7 21L21 10M12 18L21 27",
 l:"M7 25Q20 -1 12 1Q4 4 5 23Q5 30 15 23",
 m:"M3 27L7 12L5 22Q15 7 15 16L13 26Q23 5 23 17L21 27L27 24",
 n:"M3 27L7 12L5 22Q21 5 19 17L17 27L23 24",
 o:"M16 10Q5 7 3 20Q2 30 13 25Q23 19 16 10L21 12",
 p:"M3 38L10 12L8 22Q15 4 21 13Q24 25 7 27",
 r:"M4 27L8 12L6 22Q17 6 22 12",
 s:"M20 12Q8 5 6 13Q5 17 15 20Q23 27 3 27",
 t:"M11 3L6 22Q4 32 17 23M2 13L21 11",
 u:"M7 11Q-2 32 10 26L20 12L17 27L23 24",
 v:"M4 11L7 28Q17 20 22 10",
 y:"M5 12Q0 31 11 24L19 11L13 34Q10 42 2 36",
};

export function PenNote({text,className=""}:{text:string;className?:string}) {
  return <span className={`pen-note ${className}`} aria-hidden="true">{text.split(" ").map((word,wordIndex)=><span className="pen-word" key={wordIndex}>{Array.from(word).map((char,index)=><span className="pen-letter" key={index} style={{"--pen-order":text.split(" ").slice(0,wordIndex).join(" ").length+index+wordIndex} as CSSProperties}>{char}</span>)}{wordIndex<text.split(" ").length-1?" ":""}</span>)}</span>;
}

export function PenMotion() {
  useEffect(()=>{
    const elements=Array.from(document.querySelectorAll<HTMLElement>(".reference-home .pen-note,.reference-home .pen-mark"));
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    let observer:IntersectionObserver|undefined;
    let disposed=false;
    const start=()=>{
      observer?.disconnect();
      elements.forEach(el=>{el.classList.remove("pen-ready","pen-writing");});
      if(reduced.matches||document.documentElement.dataset.siteReady!=="true")return;
      observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        entry.target.classList.toggle("pen-writing",entry.isIntersecting);
      }),{threshold:0,rootMargin:"0px 0px -5% 0px"});
      elements.forEach(el=>{el.classList.add("pen-ready");observer?.observe(el);});
    };
    const ready=()=>{void document.fonts.ready.then(()=>{if(!disposed)start();});};
    ready();document.addEventListener("liuker:site-ready",ready);reduced.addEventListener("change",ready);
    return()=>{disposed=true;observer?.disconnect();document.removeEventListener("liuker:site-ready",ready);reduced.removeEventListener("change",ready);elements.forEach(el=>el.classList.remove("pen-ready","pen-writing"));};
  },[]);
  return null;
}

export function PenMark({kind,className=""}:{kind:"circle"|"arrow"|"underline"|"star";className?:string}) {
  const paths={
    circle:["M132 15C90 -5 13 3 5 42C-5 85 157 91 158 40C158 15 115 0 73 9","M147 20C176 64 84 90 31 68"],
    arrow:["M150 7C116 3 114 39 20 51","M35 35L13 53L42 62"],
    underline:["M5 48Q71 30 155 38L12 55Q90 48 158 46"],
    star:["M79 4L73 65M43 18L107 54M107 12L47 59M37 40L117 30","M62 7L92 64"],
  };
  return <svg className={`pen-mark ${className}`} viewBox="0 0 165 85" aria-hidden="true" focusable="false">{paths[kind].map((d,i)=><path key={i} d={d} pathLength="1" fill="none" stroke="currentColor" strokeWidth={kind==="underline"?4:2.3} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
}
