"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../language";
import { PenNote } from "./Handwritten";

const names=["ORBIT","FOCUS","RHYTHM","LIGHT","CUT","WAVE"];
const initial=[0,3,1,5,2,4,3,0,4,2,5,1];
export function FrameGame(){
 const {language}=useLanguage();const zh=language==="zh";
 const [deck,setDeck]=useState(initial);const [flipped,setFlipped]=useState<number[]>([]);
 const [matched,setMatched]=useState<number[]>([]);const [moves,setMoves]=useState(0);const [started,setStarted]=useState(false);
 const lock=useRef(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [message,setMessage]=useState<"ready"|"first"|"match"|"miss">("ready");
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const start=()=>{if(timer.current)clearTimeout(timer.current);lock.current=false;const cards=Array.from({length:12},(_,i)=>i%6);for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}setDeck(cards);setFlipped([]);setMatched([]);setMoves(0);setMessage("ready");setStarted(true);};
 const flip=(index:number)=>{
  if(!started||lock.current||flipped.includes(index)||matched.includes(deck[index]))return;
  const next=[...flipped,index];setFlipped(next);setMessage("first");
  if(next.length!==2)return;
  setMoves(m=>m+1);lock.current=true;
  if(deck[next[0]]===deck[next[1]]){setMatched(m=>[...m,deck[index]]);setMessage("match");setFlipped([]);lock.current=false;}
  else{setMessage("miss");timer.current=setTimeout(()=>{setFlipped([]);lock.current=false;timer.current=null;},950);}
 };
 const won=matched.length===6;
 const status=won?(zh?`全部配对完成！用了 ${moves} 次尝试。`:`All frames matched in ${moves} moves.`):message==="match"?(zh?"配对成功，继续寻找下一组。":"A match. Find the next pair."):message==="miss"?(zh?"不是同一组，记住位置再试试。":"Not a match. Remember their positions."):message==="first"?(zh?"再翻一张，找到相同的构图。":"Choose another card to find its match."):(zh?"每次翻开两张，找到六组相同的构图。":"Turn two cards at a time. Find all six pairs.");
 return <section id="frame-notes" className="frame-notes frame-game" aria-labelledby="frame-notes-title">
  <header className="chapter-head"><div><p className="reference-eyebrow">INTERACTIVE PLAYGROUND / 02</p><h2 id="frame-notes-title">{zh?"给眼睛，一场小挑战。":"A little test for your eye."}</h2><p className="chapter-description">{zh?"暂时离开作品，玩一局镜头记忆。翻开、观察、配对——看看你能记住多少画面。":"Take a break from the portfolio. Reveal, observe and match six pairs of visual compositions."}</p></div><PenNote text="play a little" className="frame-notes-script"/></header>
  <div className="frame-game-layout"><div className={`frame-game-board ${won?"is-won":""}`} role="group" aria-label={zh?"镜头记忆卡片":"Frame memory cards"}>
   {deck.map((value,index)=>{const open=flipped.includes(index)||matched.includes(value);return <button key={index} className={`memory-card ${open?"is-open":""} ${matched.includes(value)?"is-matched":""}`} onClick={()=>flip(index)} disabled={!started||matched.includes(value)} aria-pressed={open} aria-label={`${zh?"卡片":"Card"} ${index+1}${open?`, ${names[value]}`:""}`}><span className="memory-card-back" aria-hidden="true"><span>LIUKER</span><b>+</b><small>FRAME / {String(index+1).padStart(2,"0")}</small></span><span className="memory-card-face" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none"><g stroke="currentColor" strokeWidth="2">{value===0?<><ellipse cx="80" cy="50" rx="55" ry="23" transform="rotate(-30 80 50)"/><circle cx="80" cy="50" r="14" fill="currentColor"/></>:value===1?<><circle cx="80" cy="50" r="32"/><circle cx="80" cy="50" r="18"/><path d="M80 6V94M36 50H124"/></>:value===2?<>{[35,55,75,95,115].map((x,i)=><path key={x} d={`M${x} ${20+i*5}V${80-i*5}`} strokeWidth="7"/>)}</>:value===3?<><path d="M80 8L132 86H28Z"/><path d="M80 8V86M80 8L53 86M80 8L107 86"/></>:value===4?<><path d="M28 20H99L60 80H28Z" fill="currentColor"/><path d="M132 80H67L105 20H132Z"/></>:<>{[25,40,55,70].map(y=><path key={y} d={`M20 ${y}Q50 ${y-24} 80 ${y}T140 ${y}`}/>)}</>}</g></svg><small>{names[value]}</small></span></button>})}
  </div><aside className="frame-game-info"><p className="reference-eyebrow">FRAME MATCH</p><strong className="game-score">{String(matched.length).padStart(2,"0")}<small>/ 06</small></strong><p>{zh?"配对完成":"PAIRS FOUND"}</p><div className="game-moves">{zh?"尝试次数":"MOVES"}<b>{String(moves).padStart(2,"0")}</b></div><p className="game-status" role="status" aria-live="polite">{status}</p><button className="game-start" onClick={start}>{!started?(zh?"开始挑战 ↗":"START GAME ↗"):won?(zh?"再玩一次 ↗":"PLAY AGAIN ↗"):(zh?"重新洗牌 ↗":"RESHUFFLE ↗")}</button><small className="game-help">{zh?"点击 / 轻触翻牌 · 键盘 Tab + Enter\n不限时，无需登录。":"Click / tap · Tab + Enter\nNo timer. No sign-in."}</small></aside></div>
 </section>;
}
