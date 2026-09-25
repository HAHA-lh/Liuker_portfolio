"use client";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {projects} from "../content";
import "./style.css";

const concepts=[
 {name:"裂隙穿越",en:"THE RIFT",label:"01 / SCROLL TO CROSS",hint:"在画面上滚动或拖动进度条，穿过空间裂隙。",description:"用于首页 → 精选作品。让一次滚动成为一次镜头穿越，而不是切换页面。"},
 {name:"身份接入",en:"BECOME PLAYER",label:"02 / HOLD TO CONNECT",hint:"按住接入按钮 2 秒；松开可取消。也可点击直接进入。",description:"用于首次访问或关于板块。角色由扫描轮廓变为真实形象，访客获得进入仪式。"},
 {name:"世界航站",en:"CHOOSE A WORLD",label:"03 / DRAG TO EXPLORE",hint:"左右拖动选择世界，点击「进入世界」飞入。",description:"用于作品分类入口。把五个分类转成可探索的空间站，不把整个网站变成游戏。"},
];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const worldNames=["品牌影像","AI / CGI","直播礼物","赛事现场","角色设计"];
const worldTags=["BRAND FILM","AI / CGI","LIVE GIFTS","ESPORTS","CHARACTERS"];
const worldPaths=["film-post","aigc","live-gifts","event-live","character-design"];
const covers=[projects[0],projects.find(p=>p.slug==="gravity-study"),projects.find(p=>p.slug==="2"),projects.find(p=>p.slug==="morning-haze"),projects.find(p=>p.slug==="silent-ad")].map(p=>(p??projects[0]).poster);

function Tunnel({progress,paused}:{progress:number;paused:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);const state=useRef({progress,paused});state.current={progress,paused};
 useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;let w=0,h=0,frame=0,last=0,shown=0;let visible=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const resize=()=>{const r=c.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,1.5);c.width=w*d;c.height=h*d;ctx.setTransform(d,0,0,d,0,0)};
 const draw=(now:number)=>{frame=0;if(document.hidden||!visible)return;
  if(now-last<30){frame=requestAnimationFrame(draw);return}last=now;
  shown=reduced.matches?state.current.progress:shown+(state.current.progress-shown)*.09;
  ctx.clearRect(0,0,w,h);const x=w*.5,y=h*.49;const base=Math.min(w,h);const advance=shown*5;
  for(let i=25;i>=0;i--){const depth=(i/26+advance)%1;const s=.04+depth*depth*1.85;
   const rw=base*s*.66,rh=base*s*.42;ctx.strokeStyle=`rgba(255,${i%3?50:140},${i%3?84:160},${.06+depth*.55})`;ctx.lineWidth=depth>.8?2:1;
   ctx.beginPath();ctx.moveTo(x-rw*.78,y-rh);ctx.lineTo(x+rw*.78,y-rh);ctx.lineTo(x+rw,y-rh*.65);ctx.lineTo(x+rw,y+rh*.65);ctx.lineTo(x+rw*.78,y+rh);ctx.lineTo(x-rw*.78,y+rh);ctx.lineTo(x-rw,y+rh*.65);ctx.lineTo(x-rw,y-rh*.65);ctx.closePath();ctx.stroke();
  }
  for(let i=0;i<105;i++){const a=i*2.39996;const d=((i*17%101)/101+shown*1.8)%1;const r=d*d*base;const px=x+Math.cos(a)*r*1.75,py=y+Math.sin(a)*r;
   ctx.strokeStyle=`rgba(238,214,221,${.1+d*.65})`;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(a)*(2+shown*20),py+Math.sin(a)*(2+shown*20));ctx.stroke();}
  if(Math.abs(shown-state.current.progress)>.002)frame=requestAnimationFrame(draw);
 };
 const wake=()=>{if(!frame)frame=requestAnimationFrame(draw)};resize();wake();const ro=new ResizeObserver(()=>{resize();wake()});ro.observe(c);const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)wake();else cancelAnimationFrame(frame),frame=0});io.observe(c);
 document.addEventListener('visibilitychange',wake);const update=()=>wake();c.addEventListener('lab-update',update);
 return()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',wake);c.removeEventListener('lab-update',update)};
 },[]);
 useEffect(()=>{ref.current?.dispatchEvent(new Event('lab-update'))},[progress,paused]);
 return <canvas ref={ref} className="lab-tunnel" aria-hidden="true"/>;
}

export default function ImmersionLab({embedded=false}:{embedded?:boolean}){
 const [engaged,setEngaged]=useState(false);
 const autoStarted=useRef(false);
 const [mode,setMode]=useState(0),[progress,setProgress]=useState(0),[holding,setHolding]=useState(false),[world,setWorld]=useState(0),[entered,setEntered]=useState(false),[paused,setPaused]=useState(false);
 const stage=useRef<HTMLDivElement>(null);const drag=useRef<number|null>(null);const dragged=useRef(false);const holdButton=useRef<HTMLButtonElement>(null);
 const arrived=mode===2?entered:progress>=.995;
 const reset=()=>{setProgress(0);setHolding(false);setEntered(false);setEngaged(embedded&&autoStarted.current);setPaused(false)};
 useEffect(()=>{
  if(!embedded)return;const el=stage.current;if(!el)return;
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.intersectionRatio>=.75&&!autoStarted.current&&document.documentElement.dataset.siteLoading!=="true"){
    autoStarted.current=true;setEngaged(true);setPaused(false);observer.disconnect();
   }
  },{threshold:[0,.75,1]});
  observer.observe(el);
  const ready=()=>{observer.unobserve(el);observer.observe(el)};
  document.addEventListener('liuker:site-ready',ready);
  return()=>{observer.disconnect();document.removeEventListener('liuker:site-ready',ready)};
 },[embedded]);
 // Keep the page stationary for the complete portal journey, including landing.
 useEffect(()=>{
  if(!embedded||!engaged)return;
  const el=stage.current;if(!el)return;
  el.scrollIntoView({block:"center",behavior:"instant"});
  const y=window.scrollY,x=window.scrollX,body=document.body,root=document.documentElement;
  const old={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow,rootOverflow:root.style.overflow,paddingRight:body.style.paddingRight};
  const gutter=window.innerWidth-root.clientWidth;
  if(gutter)body.style.paddingRight=`${parseFloat(getComputedStyle(body).paddingRight)+gutter}px`;
  Object.assign(body.style,{position:"fixed",top:`-${y}px`,left:`-${x}px`,width:"100%",overflow:"hidden"});root.style.overflow="hidden";
  const wheel=(e:WheelEvent)=>{if(e.ctrlKey)return;e.preventDefault();const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1);setProgress(p=>clamp(p+dy/1600))};
  const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setEngaged(false);return}if((e.target as HTMLElement).closest('input,button,a'))return;if(['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key)){e.preventDefault();setProgress(p=>clamp(p+(['ArrowUp','PageUp','Home'].includes(e.key)?-.08:.08)))}};
  let touchY:number|null=null;
  const start=(e:TouchEvent)=>{touchY=e.touches[0]?.clientY??null};
  const move=(e:TouchEvent)=>{if((e.target as HTMLElement).closest('input,button,a'))return;e.preventDefault();const next=e.touches[0]?.clientY;if(touchY!==null&&next!==undefined)setProgress(p=>clamp(p+(touchY!-next)/900));touchY=next??null};
  window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',move,{passive:false});
  return()=>{window.removeEventListener('wheel',wheel);window.removeEventListener('keydown',key);el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',move);Object.assign(body.style,{position:old.position,top:old.top,left:old.left,width:old.width,overflow:old.overflow,paddingRight:old.paddingRight});root.style.overflow=old.rootOverflow;window.scrollTo({left:x,top:y,behavior:"instant"})};
 },[embedded,engaged]);
 useEffect(()=>{if(!embedded||!engaged||!arrived)return;const timer=window.setTimeout(()=>setEngaged(false),1100);return()=>clearTimeout(timer)},[embedded,engaged,arrived]);
 useEffect(()=>{reset()},[mode]);
 useEffect(()=>{if(mode!==1||!holding||paused)return;let id=0,last=performance.now();const tick=(now:number)=>{const dt=Math.min(50,now-last);last=now;setProgress(p=>clamp(p+dt/2000));id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)},[holding,mode,paused]);
 useEffect(()=>{if(arrived)setHolding(false)},[arrived]);
 useEffect(()=>{const stop=()=>setHolding(false);window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);return()=>{window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop)}},[]);
 useEffect(()=>{const el=stage.current;if(!el||mode!==0||embedded)return;const wheel=(e:WheelEvent)=>{if(e.ctrlKey||paused)return;const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1);e.preventDefault();setProgress(p=>clamp(p+dy/1600))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[mode,paused,embedded]);
 const stepWorld=(direction:number)=>{setEntered(false);setWorld(w=>(w+direction+5)%5)};
 const release=()=>{setHolding(false);if(progress<.995)setProgress(0)};
 const concept=concepts[mode];
 return <div className={`immersion-lab ${embedded?'rift-embedded':''}`}>
  {!embedded&&<>
  <header className="lab-header"><a href="/" className="lab-brand">LIUKER<span> / EXPERIMENTS</span></a><span className="lab-prototype">交互概念样品 · 非正式首页</span><a href="/">返回网站 ↗</a></header>
  <div className="lab-intro"><p>BEYOND THE SCREEN / 2026</p><h1>从浏览，变成<span>进入。</span></h1><p>三种穿越感，同一套 LIUKER 视觉语言。</p></div>
  <nav className="lab-tabs" aria-label="选择交互样品">{concepts.map((c,i)=><button key={c.en} aria-pressed={mode===i} onClick={()=>setMode(i)}><span>0{i+1}</span><strong>{c.name}</strong><small>{c.en}</small></button>)}</nav>
  </>}
  <div ref={stage} className={`lab-stage lab-mode-${mode} ${arrived?'lab-arrived':''} ${holding?'lab-holding':''}`} style={{'--p':progress} as CSSProperties}
   onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',`${(e.clientX-r.left)/r.width-.5}`);e.currentTarget.style.setProperty('--my',`${(e.clientY-r.top)/r.height-.5}`)}}>
   <div className="lab-stage-top"><span>{embedded&&engaged?'穿越中 · ESC 退出 / SCROLL TO CROSS':concept.label}</span><button onClick={()=>{setPaused(v=>!v);if(embedded)setEngaged(false)}} aria-pressed={paused}>{embedded&&engaged?'退出穿越':paused?'继续动效':'暂停动效'}</button></div>
   {embedded&&autoStarted.current&&!engaged&&!arrived&&<button className="rift-activate" onClick={()=>{setEngaged(true);setPaused(false)}}>继续穿越 / RESUME ↗</button>}
   {mode===0&&<>
    <div className="lab-destination" style={{backgroundImage:'url("/media/immersion/rift-world-v1.webp")',clipPath:`circle(${4+progress**3*96}% at 50% 50%)`}}/>
    <div className="lab-tunnel-shell" style={{opacity:1-progress**6}}><Tunnel progress={progress} paused={paused}/></div>
    <div className="lab-rift-copy" style={{opacity:Math.max(0,1-progress*2.2),transform:`translateY(${-progress*60}px)`}}><p>REALITY IS ONLY THE FIRST FRAME.</p><h2>STEP<br/><em>BEYOND.</em></h2><span>让滚动成为一段空间旅行</span></div>
    <div className="lab-coordinates">X / 031<br/>Y / 120<br/>Z / {String(Math.round(progress*999)).padStart(3,'0')}</div>
    <div className="lab-cross" aria-hidden="true">+</div>
   </>}
   {mode===1&&<>
    <div className="lab-scan-grid"/><div className="lab-identity"><p>LIUKER / IDENTITY 001</p><h2>不是访客。<br/><em>是玩家。</em></h2><span>用你的角色，连接另一个世界。</span><div className="lab-scan-steps"><span>01 / 建立连接</span><span style={{opacity:progress>.3?1:.25}}>02 / 重建形象</span><span style={{opacity:progress>.7?1:.25}}>03 / 进入世界</span></div></div>
    <div className="lab-avatar"><img src="/media/contact/footer-search-character.webp" alt="LIUKER 虚拟角色"/><img className="lab-avatar-color" src="/media/contact/footer-search-character.webp" alt="" style={{clipPath:`inset(${100-progress*100}% 0 0 0)`}}/><div className="lab-scan-line" style={{bottom:`${progress*100}%`}}/><span>PLAYER / 001</span><i/><b/></div>
   </>}
   {mode===2&&<><div className="lab-world-grid"/><div className="lab-world-title"><p>FIVE WORLDS. ONE CREATOR.</p><h2>选择你的下一站。</h2></div>
    <div className="lab-orbit" onPointerDown={e=>{drag.current=e.clientX;dragged.current=false}} onPointerMove={e=>{if(drag.current!==null&&Math.abs(e.clientX-drag.current)>10){dragged.current=true;e.currentTarget.setPointerCapture(e.pointerId)}}} onPointerUp={e=>{if(drag.current!==null&&Math.abs(e.clientX-drag.current)>35)stepWorld(e.clientX<drag.current?1:-1);drag.current=null}} onClickCapture={e=>{if(dragged.current){e.preventDefault();e.stopPropagation();dragged.current=false}}} onPointerCancel={()=>drag.current=null}>
     {worldNames.map((name,i)=>{const offset=((i-world+7)%5)-2;return <button className={`lab-world-card ${offset===0?'is-current':''}`} key={name} onClick={()=>{if(offset!==0)setWorld(i)}} tabIndex={offset===0?0:-1} aria-label={`选择${name}`} style={{'--offset':offset,backgroundImage:`url("${covers[i]}")`} as CSSProperties}><small>WORLD / 0{i+1}</small><span>{name}<b>{worldTags[i]}</b></span></button>})}
    </div><div className="lab-orbit-controls"><button onClick={()=>stepWorld(-1)} aria-label="上一个世界">←</button><span>0{world+1} / 05</span><button onClick={()=>stepWorld(1)} aria-label="下一个世界">→</button></div>
   </>}
   <div className="lab-arrival" aria-hidden={!arrived} inert={!arrived} style={mode===2?{backgroundImage:`linear-gradient(0deg,#080a12ed,#080a1233),url("${covers[world]}")`}:undefined}><p>CONNECTION ESTABLISHED / 连接完成</p><h2>{mode===2?worldNames[world]:'WELCOME TO'}<br/><em>{mode===2?worldTags[world]:'YOUR NEXT FRAME.'}</em></h2><div><a href={mode===2?`/portfolio/${worldPaths[world]}`:'/work'}>浏览真实作品 ↗</a><button onClick={reset}>重新体验 ↺</button></div></div>
   {!arrived&&<div className="lab-stage-bottom"><span>{mode===1?`接入 ${Math.round(progress*100)}%`:mode===0?`穿越 ${Math.round(progress*100)}%`:'选择目的地'}</span><div>
    {mode===0?<><label className="lab-range-label">穿越进度<input aria-label="穿越进度" type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>setProgress(Number(e.target.value)/100)}/></label><button onClick={()=>setProgress(1)}>直接进入 ↗</button></>:mode===1?<><button ref={holdButton} className="lab-hold" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);if(!paused)setHolding(true)}} onPointerUp={release} onPointerCancel={release} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!paused)setHolding(true)}}} onKeyUp={release} onBlur={release}>{holding?'正在接入…':'按住接入'}</button><button onClick={()=>setProgress(1)}>直接进入 ↗</button></>:<button className="lab-enter" onClick={()=>setEntered(true)}>进入世界 ↗</button>}
   </div></div>}
  </div>
  {!embedded&&<><section className="lab-caption"><div><h3>{concept.name}</h3><p>{concept.hint}</p></div><p>{concept.description}</p><button onClick={reset}>重置样品 ↺</button></section>
  <footer className="lab-references"><p>REFERENCE NOTES / 只借鉴交互原则，不复刻视觉</p><a href="https://www.awwwards.com/sites/kpr" target="_blank" rel="noreferrer">KPR / 按住进入与世界叙事 ↗</a><a href="https://lusion.co/" target="_blank" rel="noreferrer">Lusion / 空间视觉与互动体验 ↗</a><a href="https://www.webbyawards.com/crafted-with-code/secret-sky-2021/" target="_blank" rel="noreferrer">Secret Sky / 虚拟场景体验 ↗</a><small>体验原型：空间由轻量图形模拟，不包含电影素材，不代表最终三维制作精度。默认静音，支持键盘与减少动态效果。</small></footer>
 </>}
 </div>;
}
