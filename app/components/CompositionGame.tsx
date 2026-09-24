"use client";
import { useState } from "react";
import { useLanguage } from "../language";
import { PenNote } from "./Handwritten";

const scenes=[{x:62,y:43,size:78,angle:-12},{x:36,y:58,size:110,angle:18},{x:55,y:48,size:92,angle:-24}];
const initial={x:50,y:50,size:100,angle:0};
type Controls=typeof initial;
export function CompositionGame(){
 const {language}=useLanguage();const zh=language==="zh";
 const [level,setLevel]=useState(0);const [value,setValue]=useState<Controls>(initial);
 const [started,setStarted]=useState(false);const [locked,setLocked]=useState(false);const [attempts,setAttempts]=useState(0);const [feedback,setFeedback]=useState("");
 const target=scenes[level];
 const error=Math.abs(value.x-target.x)+Math.abs(value.y-target.y)+Math.abs(value.size-target.size)*.4+Math.abs(value.angle-target.angle)*.7;
 const score=Math.max(0,Math.round(100-error*1.4));
 const submit=()=>{setAttempts(a=>a+1);if(score>=94){setLocked(true);setFeedback(zh?"画框已对齐，镜头锁定！":"Frame aligned. Shot locked!");}else setFeedback(zh?`匹配度 ${score}%，继续微调；达到 94% 即可锁定。`:`${score}% aligned. Fine-tune to reach 94%.`);};
 const next=()=>{setLevel(l=>(l+1)%3);setValue(initial);setLocked(false);setFeedback("");setAttempts(0);};
 const reset=()=>{setLevel(0);setValue(initial);setLocked(false);setFeedback("");setAttempts(0);setStarted(true);};
 return <section id="frame-notes" className="frame-notes composition-game" aria-labelledby="frame-notes-title">
 <header className="chapter-head"><div><p className="reference-eyebrow">INTERACTIVE PLAYGROUND / 02</p><h2 id="frame-notes-title">{zh?"这一帧，由你来定。":"You frame the next shot."}</h2><p className="chapter-description">{zh?"移动、缩放、旋转。把红色取景框对齐虚线目标，找到画面刚刚好的那个瞬间。三组构图，不限时。":"Move, scale and rotate the red frame onto the dashed target. Three compositions, no time limit."}</p></div><PenNote text="find your frame" className="frame-notes-script"/></header>
 <div className="composition-layout"><div className={`composition-stage ${locked?"shot-locked":""}`}>
 <svg viewBox="0 0 800 500" role="img" aria-label={zh?"构图练习场：红框为当前构图，虚线框为目标。使用右侧滑块调整。":"Composition stage: red is your frame, dashed is the target. Adjust with the sliders."}>
 <defs><pattern id="composition-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff0d"/></pattern><linearGradient id="composition-sphere" x2="1" y2="1"><stop stopColor="#ffe1e6"/><stop offset=".35" stopColor="#ff244b"/><stop offset="1" stopColor="#280815"/></linearGradient></defs>
 <rect width="800" height="500" fill="#080e14"/><rect width="800" height="500" fill="url(#composition-grid)"/>
 <ellipse cx="460" cy="355" rx="200" ry="22" fill="#0009"/><path d="M70 360L280 160L470 360Z" fill="#23303b"/><circle cx="470" cy="222" r="105" fill="url(#composition-sphere)"/><path d="M605 140L704 185V360L605 318Z" fill="#cbd1ce"/><path d="M605 140L548 185V360L605 318Z" fill="#637680"/>
 <g transform={`translate(${target.x*8} ${target.y*5}) rotate(${target.angle}) scale(${target.size/100})`}><rect x="-145" y="-95" width="290" height="190" fill="#ffffff06" stroke="#e8eee4" strokeWidth="2" strokeDasharray="7 7"/><text x="-140" y="-108" fill="#e8eee4" fontSize="12">TARGET / 0{level+1}</text></g>
 <g className="composition-camera" transform={`translate(${value.x*8} ${value.y*5}) rotate(${value.angle}) scale(${value.size/100})`}><rect x="-145" y="-95" width="290" height="190" fill="#ff244b0d" stroke="#ff244b" strokeWidth="3"/><path d="M-48 -95V95M48 -95V95M-145 -32H145M-145 32H145" stroke="#ff244b70"/><path d="M-10 0H10M0 -10V10" stroke="#ff244b" strokeWidth="2"/></g>
 <text x="26" y="34" fill="#9da9b2" fontSize="11" letterSpacing="3">LIUKER / COMPOSITION LAB</text><text x="26" y="473" fill="#ff4567" fontSize="12">{locked?"SHOT LOCKED":"FRAME / "+String(level+1).padStart(2,"0")}</text>
 </svg><div className="composition-legend"><span>— {zh?"你的画框":"YOUR FRAME"}</span><span>┄ {zh?"目标轮廓":"TARGET"}</span></div>
 </div><aside className="composition-console"><div className="composition-meter"><span>{zh?"实时匹配":"ALIGNMENT"}</span><strong>{started?score:"—"}<small>%</small></strong></div>
 <div className="composition-progress" aria-hidden="true"><i style={{width:started?`${score}%`:0}}/></div>
 {([['x',zh?'水平位置':'Horizontal',20,80],['y',zh?'垂直位置':'Vertical',20,80],['size',zh?'画框比例':'Scale',60,120],['angle',zh?'镜头角度':'Rotation',-30,30]] as const).map(([key,label,min,max])=><label className="composition-control" key={key}><span>{label}<output>{value[key]}{key==='angle'?'°':'%'}</output></span><input type="range" min={min} max={max} step="1" value={value[key]} disabled={!started||locked} onChange={e=>{setValue(v=>({...v,[key]:Number(e.target.value)}));setFeedback("");}}/></label>)}
 <p className="composition-status" role="status">{feedback||(zh?`第 ${level+1} / 3 组 · 已校验 ${attempts} 次`:`Shot ${level+1} / 3 · ${attempts} checks`)}</p>
 {!started?<button className="game-start" onClick={reset}>{zh?"开始构图 ↗":"START FRAMING ↗"}</button>:locked?<button className="game-start" onClick={level===2?reset:next}>{level===2?(zh?"三组完成 · 再来一次 ↗":"ALL DONE · PLAY AGAIN ↗"):(zh?"下一组构图 ↗":"NEXT SHOT ↗")}</button>:<button className="game-start" onClick={submit}>{zh?"锁定这一帧 ↗":"LOCK THIS FRAME ↗"}</button>}
 {started&&<button className="composition-reset" onClick={reset}>{zh?"重新开始":"Restart"}</button>}
 <small className="game-help">{zh?"匹配度 ≥ 94% 即可过关。\n拖动滑块，或用 Tab 聚焦后按方向键。":"Reach 94% to pass.\nDrag sliders, or focus with Tab and use arrow keys."}</small>
 </aside></div></section>;
}
