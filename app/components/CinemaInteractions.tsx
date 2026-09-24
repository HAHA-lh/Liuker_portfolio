"use client";

import { useEffect, useState } from "react";

/** Pointer work is batched; no render loop runs while the page is idle. */
export function CinemaInteractions() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".reference-home");
    if (!root) return;
    const allowed = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const targets = Array.from(root.querySelectorAll<HTMLElement>(".reference-feature-media,.reference-small-project,.cinema-portrait,.reference-footer-title>a,.reference-wordmark"));
    const cleanup = targets.map(el => {
      let frame = 0, px = 50, py = 50;
      const move = (event: PointerEvent) => {
        if (!allowed.matches || document.hidden) return;
        const r = el.getBoundingClientRect();
        px = Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100));
        py = Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100));
        if (!frame) frame = requestAnimationFrame(()=>{
          frame=0;
          el.style.setProperty("--pointer-x",`${px}%`); el.style.setProperty("--pointer-y",`${py}%`);
          el.style.setProperty("--pointer-dx",`${(px-50)*.12}px`); el.style.setProperty("--pointer-dy",`${(py-50)*.12}px`);
          el.classList.add("cinema-hover");
        });
      };
      const reset = () => { cancelAnimationFrame(frame); frame=0; el.classList.remove("cinema-hover"); ["--pointer-x","--pointer-y","--pointer-dx","--pointer-dy"].forEach(key=>el.style.removeProperty(key)); };
      const visibility = () => { if(document.hidden) reset(); };
      el.addEventListener("pointermove",move);el.addEventListener("pointerleave",reset);
      allowed.addEventListener("change",reset);document.addEventListener("visibilitychange",visibility);
      return ()=>{reset();el.removeEventListener("pointermove",move);el.removeEventListener("pointerleave",reset);allowed.removeEventListener("change",reset);document.removeEventListener("visibilitychange",visibility);};
    });
    return ()=>cleanup.forEach(fn=>fn());
  },[]);
  return null;
}

const scenes = [
  ["top","01 / 首屏 · 取景","移动鼠标探索局部色彩；向下滚动，视频画面随滚动推进。标题在首次加载后逐字入场。"],
  ["selected-work","02 / 作品 · 银幕","缓慢上下滚动，体验两部作品可逆的画框展开。悬停画面查看跟随圆标，点击仍进入项目。"],
  ["cinema-cards","03 / 作品 · 接触印相","四张卡片错峰显影；移动鼠标，画面轻微偏移，红色底线展开。"],
  ["services","04 / 能力 · 切镜","悬停或用键盘聚焦不同服务，在左侧同一个画框里切换案例。点击行标题展开详情。"],
  ["creative-process","05 / 创作路径","点击四个阶段，查看从创意方向到成片交付的内容；右侧说明随切换揭幕。"],
  ["frame-notes","06 / 构图校准","调整位置、比例和角度，将红色画框对齐虚线目标。匹配度达到 94% 后点击锁定，挑战三组构图。"],
  ["about","07 / 关于 · 揭幕后","在头像上移动鼠标，局部揭开作品图层；手机或键盘可用切换按钮。不是原片／制作过程对比。"],
  ["experience","08 / 经历与工具","点击折叠栏，内容分拍入场；再次点击收起。展开后仍可正常阅读和滚动。"],
  ["contact","09 / 结尾 · 落幕","滚动到结尾，大标题分行内词组落定，红色背景逐渐展开。联系按钮随鼠标微移、按下回弹。"],
];

export function CinemaGuide() {
  const [enabled,setEnabled]=useState(false);
  const [open,setOpen]=useState(true);
  const [scene,setScene]=useState(0);
  useEffect(()=>{setEnabled(new URLSearchParams(location.search).get("motion")==="preview");},[]);
  const jump=(index:number)=>{
    setScene(index);
    document.getElementById(scenes[index][0])?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
  };
  if(!enabled)return null;
  return <aside className="cinema-guide" aria-label="动效样片导览">
    <button className="cinema-guide-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="cinema-guide-body">MOTION STUDY <span>{open?"收起 −":"动效导览 +"}</span></button>
    {open&&<div id="cinema-guide-body"><p className="cinema-guide-index">{scenes[scene][1]}</p><p>{scenes[scene][2]}</p>
      <nav aria-label="预览章节">{scenes.map((item,index)=><button key={item[0]} onClick={()=>jump(index)} aria-label={item[1]} aria-pressed={index===scene}>{String(index+1).padStart(2,"0")}</button>)}</nav>
      <div className="cinema-guide-actions"><button disabled={scene===0} onClick={()=>jump(scene-1)}>← 上一区</button><button disabled={scene===scenes.length-1} onClick={()=>jump(scene+1)}>下一区 →</button></div>
      <small>仅此预览链接显示导览 · 无自动滚动接管</small></div>}
  </aside>;
}
