"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {projects} from '../content';
import {HERO_POSTER_WEBP,SHOWREEL_VIDEO_720P_SRC} from '../hero-media';

const concepts=[
 {name:'01 / 电影刊物',title:'THE DIRECTOR’S EDIT',desc:'米白纸面 × 极大黑字 × 宽银幕。让作品与留白形成秩序，笔刷只作为签名。',ref:'https://www.awwwards.com/inspiration/next-item-agency-portfolio',source:'M2H · 排版与作品索引'},
 {name:'02 / 视觉宣言',title:'BREAK THE FRAME',desc:'红色满版 × 斜切拼贴 × 黑色笔刷。用画面之间的碰撞代替单张背景，强化个人记忆点。',ref:'https://www.awwwards.com/inspiration/desktop-no-hero-studio',source:'No Hero Studio · 创意工作室参考'},
 {name:'03 / 作品展映',title:'AFTER DARK',desc:'深色放映厅 × 巨幅项目画面 × 可切换索引。首屏直接进入作品，让标题和画面一起变化。',ref:'https://www.awwwards.com/inspiration/projects-slider-hero-the-limbo-studio',source:'The Limbo Studio · 项目滑动首屏'},
];
const featured=['afterglow','orbital-form','morning-haze','quiet-tides'].map(slug=>projects.find(p=>p.slug===slug)).filter((p):p is typeof projects[number]=>Boolean(p));
export default function HomeLab(){
 const [mode,setMode]=useState(0),[active,setActive]=useState(0),[reel,setReel]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);const project=featured[active];
 const swipe=useRef<{x:number;y:number}|null>(null);const dragged=useRef(false);
 useEffect(()=>{const restore=()=>{const n=Number(new URLSearchParams(location.search).get('concept')||1);setMode(n>=1&&n<=3&&Number.isInteger(n)?n-1:0);setActive(0)};restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[]);
 function choose(i:number){setMode(i);setActive(0);const url=new URL(location.href);url.searchParams.set('concept',String(i+1));history.pushState(null,'',url)}
 function play(){setReel(true);dialog.current?.showModal()}
 function close(){dialog.current?.close();setReel(false)}
 return <main className={`hl hl-${mode}`}>
  <div className="hl-chooser"><span>LIUKER / 首页方向样板</span><div role="group" aria-label="切换首页方案">{concepts.map((c,i)=><button key={c.name} aria-pressed={mode===i} onClick={()=>choose(i)}>{c.name}</button>)}</div><Link href="/">原版 ↗</Link></div>
  <div className="hl-canvas" key={mode}>
   <nav className="hl-nav"><Link href="/" className="hl-logo">LIUKER®</Link><span>INDEPENDENT FILM & VISUAL PRACTICE</span><div><Link href="/work">作品 ↗</Link><Link href="/contact">联系合作 ↗</Link></div></nav>
   {mode===0&&<section className="hl-editorial">
    <div className="hl-kicker"><span>PORTFOLIO / 2026</span><span>FILM. CGI. MOTION.</span><span>BASED IN IMAGINATION.</span></div>
    <h1>GOOD IDEAS.<br/><span>GREAT</span> FRAMES<span className="hl-dot">.</span></h1>
    <div className="hl-e-body"><div className="hl-margin"><span>01 — THE OPENING</span><p>创意，不止于画面。</p><p>让故事有温度，<br/>让每一帧有力量。</p><button onClick={play}>播放作品集 ↗</button><img src="/media/typography/beyond-the-frame-brush.png" alt="Beyond the frame"/></div><button className="hl-screen" onClick={play} aria-label="播放作品集"><img src={HERO_POSTER_WEBP} alt="LIUKER角色视觉"/><span className="hl-play">PLAY<br/>REEL ↗</span><span className="hl-caption">LIUKER / SELECTED MOTION</span></button></div>
   </section>}
   {mode===1&&<section className="hl-manifesto">
    <div className="hl-micro">IMAGE MAKER.<br/>STORY SHAPER.<br/>FRAME BREAKER.</div><span className="hl-edition">VOL. 2026<br/>创意，不止于画面。</span>
    <h1><img src="/media/typography/beyond-the-frame-brush.png" alt="BEYOND THE FRAME."/></h1>
    <div className="hl-collage"><Link href={`/work/${featured[0].slug}`} className="hl-fragment hl-f1"><img src={featured[0].poster} alt={featured[0].title.zh}/><span>01 / COLOUR ↗</span></Link><button className="hl-fragment hl-f2" onClick={play}><img src={HERO_POSTER_WEBP} alt="角色影像作品集"/><span>PLAY THE REEL ↗</span></button><Link href={`/work/${featured[1].slug}`} className="hl-fragment hl-f3"><img src={featured[1].poster} alt={featured[1].title.zh}/><span>02 / EXPERIMENT ↗</span></Link></div>
    <div className="hl-manifesto-bottom"><p>把想象，变成<br/>值得被看见的画面。</p><button onClick={play}>LET’S<br/>MAKE IT ↗</button><span>SCROLL TO DISCOVER ↓</span></div>
   </section>}
   {mode===2&&<section className="hl-cinema" onTouchStart={e=>{const t=e.touches[0];swipe.current={x:t.clientX,y:t.clientY};dragged.current=false}} onTouchEnd={e=>{const start=swipe.current;swipe.current=null;if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4){dragged.current=true;setActive(a=>(a+(dx<0?1:featured.length-1))%featured.length)}}} onClickCapture={e=>{if(dragged.current){e.preventDefault();e.stopPropagation();dragged.current=false}}}>
    <div className="hl-cinema-title"><span>SELECTED WORK / 0{active+1}</span><h1>IMAGES<br/><em>THAT STAY.</em></h1><p>留下画面，也留下感受。<br/>FILM / CGI / MOTION</p></div>
    <div className="hl-gallery"><Link href={`/work/${project.slug}`} className="hl-gallery-image" key={active}><img src={project.poster} alt={project.title.zh}/><span>EXPLORE PROJECT ↗</span></Link><div className="hl-gallery-meta"><div><span>0{active+1} / 0{featured.length}</span><h2>{project.title.zh}</h2><p>{project.category.zh} / {project.year}</p></div><div><button aria-label="上一个作品" onClick={()=>setActive((active+featured.length-1)%featured.length)}>←</button><button aria-label="下一个作品" onClick={()=>setActive((active+1)%featured.length)}>→</button></div></div></div>
    <div className="hl-project-tabs" role="group" aria-label="精选作品">{featured.map((p,i)=><button key={p.slug} aria-pressed={active===i} onClick={()=>setActive(i)}><span>0{i+1}</span>{p.title.zh}<span>↗</span></button>)}</div>
   </section>}
   <section className="hl-next"><div><span>SELECTED / NOT EVERYTHING.</span><h2>{mode===0?'每一帧，都有来由。':mode===1?'MAKE SOME NOISE.':'下一幕，继续。'}</h2></div><Link href="/work">浏览全部作品 ↗</Link><div className="hl-next-grid">{featured.slice(0,3).map(p=><Link key={p.slug} href={`/work/${p.slug}`}><img src={p.poster} alt={p.title.zh}/><p>{p.title.zh}<span>{p.year} ↗</span></p></Link>)}</div></section>
   <footer className="hl-end"><span>HAVE A GOOD IDEA?</span><Link href="/contact">一起创造下一帧 ↗</Link><span>LIUKER / FOR A BRIGHTER TOMORROW.</span></footer>
  </div>
  <aside className="hl-notes"><strong>{concepts[mode].title}</strong><p>{concepts[mode].desc}</p><a href={concepts[mode].ref} target="_blank" rel="noreferrer">Awwwards 参考：{concepts[mode].source} ↗</a><small>构图与交互样板 · 播放、作品和联系入口可用</small></aside>
  <dialog ref={dialog} className="hl-dialog" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close()}}><button onClick={close} aria-label="关闭作品集">关闭 ×</button>{reel&&<video src={SHOWREEL_VIDEO_720P_SRC} controls autoPlay playsInline/>}</dialog>
 </main>
}
