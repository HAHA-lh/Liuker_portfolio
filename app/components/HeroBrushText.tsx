"use client";

import {useId,type CSSProperties} from "react";

// Display the supplied PNG unchanged; clip regions only partition the reveal animation.
export function HeroBrushText({text,ready,delay=0}:{text:string;ready:boolean;delay?:number}){
 const id=`hero-png-${useId().replace(/:/g,"")}`;
 const first=text==='BEYOND';
 const top=first?0:380, height=first?380:351;
 const edges=first?[0,360,590,815,1060,1330,1640]:[0,285,510,825,1050,1310,1510,1835,2030,2152];
 const width=first?1640:2152;
 return <span className={`hero-brush-text ${ready?'is-ready':''}`} role="img" aria-label={text} style={{width:first?'3.963em':'5.2em',height:first?'.918em':'.848em'} as CSSProperties}>
  <svg viewBox={`0 ${top} ${width} ${height}`} aria-hidden="true" focusable="false">
   <defs>{edges.slice(0,-1).map((x,i)=><clipPath id={`${id}-${i}`} key={i}><rect x={x} y={top} width={edges[i+1]-x} height={height}/></clipPath>)}</defs>
   {edges.slice(0,-1).map((_,i)=><g key={i} className="hero-brush-glyph" style={{'--glyph-delay':`${delay+i*.045}s`} as CSSProperties}>
    <g clipPath={`url(#${id}-${i})`}><image href="/media/typography/beyond-the-frame-brush.png" x="0" y="0" width="2152" height="731"/></g>
   </g>)}
  </svg>
 </span>;
}
