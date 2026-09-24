"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CompositionGame } from "./CompositionGame";
import { useLanguage } from "../language";
import { PenNote, PenMark } from "./Handwritten";

const steps = [
  {en:"DISCOVER",cn:"先找到，要讲的故事。",english:"Find the story worth telling.",desc:"从表达目标、观看场景和核心信息开始，把分散的想法收拢成一个清晰的创意方向。",description:"Start with the purpose, audience and central message. Bring scattered ideas into one clear creative direction.",tags:"BRIEF / RESEARCH / DIRECTION"},
  {en:"SHAPE",cn:"让想法，长出画面。",english:"Give the idea a visual form.",desc:"用视觉参考、色彩与构图建立画面语言，再用分镜组织镜头之间的关系。",description:"Build a visual language through references, colour and composition. Connect shots through storyboards.",tags:"REFERENCES / STORYBOARD / LOOK"},
  {en:"MAKE",cn:"在节奏里，建立情绪。",english:"Build emotion through rhythm.",desc:"让剪辑、动态设计与三维视觉服务于同一个表达，在镜头、声音与节奏之间反复推敲。",description:"Bring editing, motion design and CGI into the same story. Refine the relationship between image, sound and rhythm.",tags:"EDIT / MOTION / CGI"},
  {en:"REFINE",cn:"把细节，留给最后一遍。",english:"Make every final detail count.",desc:"从画面衔接到色彩统一，从声音层次到输出规格，让成片完整、准确地呈现。",description:"Refine transitions, colour, sound and delivery formats so the finished film feels coherent and intentional.",tags:"COLOUR / SOUND / DELIVERY"},
];

export function CreativeChapters() {
  const {language}=useLanguage();const zh=language==="zh";
  const [step,setStep]=useState(0);
  return <>
    <section id="creative-process" className="creative-process" aria-labelledby="process-title">
      <header className="chapter-head"><div><p className="reference-eyebrow">CREATIVE PROCESS / 01</p><h2 id="process-title">{zh?<>从一个想法，<br/>到一个画面。</>:<>From an idea.<br/>To a frame.</>}</h2></div><div className="chapter-margin-note"><PenNote text="find the story"/><PenMark kind="arrow"/></div></header>
      <div className="process-layout">
        <div className="process-selector" role="group" aria-label={zh?"选择创作阶段":"Choose a creative stage"}>{steps.map((item,i)=><button key={item.en} onClick={()=>setStep(i)} aria-pressed={step===i} aria-controls="process-detail"><span>0{i+1}</span><strong>{item.en}</strong><ArrowUpRight size={22}/></button>)}</div>
        <div className="process-detail" id="process-detail" aria-live="polite" aria-atomic="true"><div key={step} className="process-detail-inner"><span className="process-ghost" aria-hidden="true">0{step+1}</span><p className="process-counter">FRAME / 0{step+1} — 04</p><h3>{zh?steps[step].cn:steps[step].english}</h3><p className="process-description">{zh?steps[step].desc:steps[step].description}</p><p className="process-tags">{steps[step].tags}</p></div></div>
      </div>
      <p className="chapter-footnote">{zh?"创意方向 / 剪辑后期 / 动态设计 / AI & CGI":"CREATIVE DIRECTION / EDITING / MOTION DESIGN / AI & CGI"}<span>EVERY FRAME HAS A REASON.</span></p>
    </section>
    <CompositionGame />
  </>;
}
