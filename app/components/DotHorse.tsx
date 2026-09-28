"use client";
import { useEffect, useRef } from "react";

// Sample an animated silhouette onto a fixed dot grid, like a printed halftone.
export default function DotHorse() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const mask = document.createElement("canvas"); mask.width = 360; mask.height = 240;
    const ink = mask.getContext("2d", { willReadFrequently: true });
    if (!ctx || !ink) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = 0;
    function draw(ms: number) {
      if (!ctx || !ink) return;
      const t = motion.matches ? 0.8 : ms / 180;
      const lift = Math.sin(t * 2) * 4;
      ink.clearRect(0, 0, 360, 240); ink.fillStyle = "black"; ink.strokeStyle = "black";
      ink.lineCap = "round"; ink.lineJoin = "round";
      const line = (points: number[][], width: number) => { ink.beginPath(); ink.lineWidth = width; points.forEach(([x,y],i)=>i?ink.lineTo(x,y+lift):ink.moveTo(x,y+lift)); ink.stroke(); };
      const oval = (x:number,y:number,rx:number,ry:number,angle=0) => { ink.beginPath(); ink.ellipse(x,y+lift,rx,ry,angle,0,Math.PI*2); ink.fill(); };
      // Four articulated legs, alternating between extension and gathered stride.
      for(let i=0;i<4;i++) {
        const front=i>1, phase=t+(i%2)*Math.PI+(front?1.2:0), hip=front?218:139;
        const kneeX=hip+Math.sin(phase)*24, kneeY=157+Math.cos(phase)*9;
        const hoofX=kneeX+Math.sin(phase+.9)*34, hoofY=185-Math.max(0,Math.cos(phase))*29;
        line([[hip,125],[kneeX,kneeY],[hoofX,hoofY]],i%2?7:10);
        line([[hoofX,hoofY],[hoofX+9,hoofY+2]],5);
      }
      oval(173,118,56,24,-.04); oval(133,115,22,22); oval(220,115,22,26);
      line([[218,116],[235,82],[249,74]],23); oval(261,77,24,11,.3);
      line([[271,81],[284,98]],11); line([[247,73],[245,58]],6); line([[254,71],[259,58]],5);
      line([[124,108],[100,112],[76,102+Math.sin(t)*7],[56,104+Math.sin(t)*8]],8);
      // Rider and reins.
      oval(195,48,8,9); line([[190,61],[179,85],[199,98]],12);
      line([[188,67],[210,82],[239,79]],7); line([[188,91],[175,110],[191,133]],8);
      line([[210,82],[258,89]],2);
      const pixels=ink.getImageData(0,0,360,240).data;
      ctx.clearRect(0,0,720,480); ctx.fillStyle="#1736ba";
      for(let y=30;y<209;y+=7) for(let x=40;x<306;x+=7) {
        if(pixels[(y*360+x)*4+3]<80) continue;
        const grain=.78+.22*Math.sin(x*.8+y*.3+t*.6);
        ctx.beginPath(); ctx.arc(x*2,y*2,5.2*grain,0,Math.PI*2);ctx.fill();
      }
    }
    function tick(ms:number){if(ms-previous>42){draw(ms);previous=ms}frame=requestAnimationFrame(tick)}
    const start=()=>{cancelAnimationFrame(frame);draw(140);if(!motion.matches&&!document.hidden)frame=requestAnimationFrame(tick)};
    start(); motion.addEventListener("change",start);document.addEventListener("visibilitychange",start);
    return()=>{cancelAnimationFrame(frame);motion.removeEventListener("change",start);document.removeEventListener("visibilitychange",start)};
  }, []);
  return <canvas ref={ref} width={720} height={480} className="liuker-dot-horse" aria-hidden="true"/>;
}
