import {createFilmMaterial} from './film-material.mjs';
import {createHomeArtwork} from './home-artwork.mjs';
import {drawMetalMonitor} from './monitor-material.mjs';

/** @typedef {'zh' | 'en'} MotionLanguage */
/**
 * @typedef {Object} MotionSceneOptions
 * @property {string} [assetBase] Base URL for the scene's image assets.
 * @property {string} [heroVideoSrc] Reuse the site's existing hero video URL.
 * @property {MotionLanguage} [language]
 * @property {boolean} [reducedMotion] Keep the hero on its poster when true.
 */
/**
 * @typedef {Object} MotionScene
 * @property {Promise<void>} ready Resolves after images/fonts are ready or have fallen back.
 * @property {(time: number) => void} setProgress Set the 0–38 second camera timeline.
 * @property {(language: MotionLanguage) => void} setLanguage
 * @property {(paused: boolean) => void} setPaused Host-controlled media pause.
 * @property {() => void} startLive Enable the looping hero video, subject to visibility.
 * @property {() => void} dispose Release callbacks, listeners and media resources.
 */
/**
 * Initialize from a client effect. Importing this module does not access the DOM.
 * Each instance owns its video, image requests, renderer and cleanup state.
 * @param {HTMLCanvasElement} canvas
 * @param {MotionSceneOptions} [options]
 * @returns {MotionScene}
 */
export function createMotionScene(canvas, options={}) {
const g=canvas.getContext('2d');
if(!g)throw new Error('LIUKER motion canvas is unavailable');
const doc=canvas.ownerDocument;
const assetBase=(options.assetBase||'/motion/assets').replace(/\/$/,'');
let language=options.language==='en'?'en':'zh';
const reducedMotion=Boolean(options.reducedMotion);
let disposed=false,paused=false,visible=true,playPending=false,videoFrameId=null,rafId=null;
const pendingLoads=new Set();
const W=1600,H=900,BLACK='#101112',WHITE='#fafaf8',RED='#ff294f';
canvas.width=W;canvas.height=H;
const imgs={};
const names=['ballantines','hero','honor','broadcast','how','character','shanhaijing','avatar'];
const fallbackImages=new Map();
function fallbackImage(name){
 const kind=name==='filmAmber'?'amber':name==='filmPerf'?'perf':'project';
 if(fallbackImages.has(kind))return fallbackImages.get(kind);
 const im=doc.createElement('canvas');im.width=kind==='amber'?1080:kind==='perf'?720:1920;im.height=kind==='amber'?1920:kind==='perf'?1280:1080;
 const c=im.getContext('2d');c.fillStyle=kind==='project'?'#1d201d':'#171611';c.fillRect(0,0,im.width,im.height);
 if(kind==='project'){c.fillStyle='#b8bbb2';c.font='600 72px Arial, sans-serif';c.textAlign='center';c.fillText('LIUKER',im.width/2,im.height/2)}
 fallbackImages.set(kind,im);return im;
}
const imageLoad=(name,url)=>new Promise(resolve=>{
 const im=doc.createElement('img');let settled=false;
 const finish=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);pendingLoads.delete(cancel);im.onload=null;im.onerror=null;if(!disposed)imgs[name]=ok?im:fallbackImage(name);if(!ok)im.removeAttribute('src');resolve()};
 const cancel=()=>finish(false);const timer=setTimeout(()=>finish(false),8000);pendingLoads.add(cancel);
 im.onload=()=>finish(true);im.onerror=()=>finish(false);im.decoding='async';im.src=url;
});
let paintFilm,homeArt,sceneTime=0,live=false,sceneReady=false;
const video=doc.createElement('video');video.src=options.heroVideoSrc||`${assetBase}/hero.mp4`;video.poster=`${assetBase}/hero.webp`;video.muted=true;video.loop=true;video.playsInline=true;video.preload=reducedMotion?'metadata':'auto';video.setAttribute('playsinline','');
const fontsReady=new Promise(resolve=>{
 let settled=false;const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);pendingLoads.delete(finish);resolve()};
 const timer=setTimeout(finish,3000);pendingLoads.add(finish);
 if(doc.fonts)doc.fonts.load('156px "LIUKER Display"').then(finish,finish);else finish();
});
const ready=Promise.all([...names.map(n=>imageLoad(n,`${assetBase}/${n}.webp`)),imageLoad('filmAmber',`${assetBase}/film-scan-amber.jpg`),imageLoad('filmPerf',`${assetBase}/film-scan-perf.jpg`),fontsReady]).then(()=>{
 if(disposed)return;
 paintFilm=createFilmMaterial(imgs.filmAmber,imgs.filmPerf);homeArt=createHomeArtwork({amber:imgs.filmAmber,perf:imgs.filmPerf,poster:imgs.hero});sceneReady=true;render(sceneTime);manageVideo();
});
const C=n=>Math.max(0,Math.min(1,n)),M=(a,b,t)=>a+(b-a)*t,S=n=>{n=C(n);return n*n*(3-2*n)},Q=(t,a,b)=>S((t-a)/(b-a));
const A=(t,a,b,c,d)=>Q(t,a,b)*(1-Q(t,c,d));
function rect(x,y,w,h,fill){g.fillStyle=fill;g.fillRect(x,y,w,h)}
function round(x,y,w,h,r,fill){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill()}
const english={
 '联系合作 ↗':'LET’S TALK ↗',
 '百龄坛 / 品牌影片':'Ballantine’s / Brand film',
 '创意，不止于画面。':'Ideas beyond the frame.',
 '影像 · AI / CGI · 动态设计':'Film · AI / CGI · Motion design',
 '探索作品 ↗':'EXPLORE WORK ↗',
 '从一个想法开始':'It starts with an idea',
 '同一画面，进入创作流程':'One frame. A creative journey.',
 '01 / LIUKER 人物影像':'01 / LIUKER CHARACTER FILM',
 '从想法':'FROM IDEAS',
 '到每一帧。':'TO EVERY FRAME.',
 '品牌影片':'Brand films',
 '让品牌成为被记住的画面。':'Make a brand unforgettable.',
 '拓展现实之外的视觉可能。':'Visual possibilities beyond reality.',
 '动态设计':'Motion design',
 '用节奏、形态与运动表达。':'Expression through rhythm and motion.',
 '影像作品':'Film',
 '角色设计':'Character design',
 'LIUKER / 人物影像':'LIUKER / Character film',
 'HONOR / 视觉设计':'HONOR / Visual design',
 '动态影像':'Motion graphics',
 '不同的世界，同一种好奇心。':'Different worlds. The same curiosity.',
 '原有作品素材 · 作品内容保持独立':'Film · AI / CGI · Motion design',
 '用视觉讲述真实的故事，':'Telling real stories through visuals.',
 '连接品牌、人与更大的世界。':'Connecting brands, people and the world.',
 '每一帧背后，都有一个创作者。':'A creator behind every frame.',
 '下一个值得被看见的画面，从这里开始。':'Your next frame starts here.'
};
const englishWidths={'从想法':530,'到每一帧。':540,'让品牌成为被记住的画面。':400,'拓展现实之外的视觉可能。':400,'用节奏、形态与运动表达。':400,'从一个想法开始':190};
function text(s,x,y,size=20,color=BLACK,weight=400,align='left'){g.fillStyle=color;g.font=`${weight} ${size}px Arial, "Microsoft YaHei", sans-serif`;g.textAlign=align;g.textBaseline='alphabetic';const value=language==='en'?(english[s]||s):(s==='原有作品素材 · 作品内容保持独立'?'影像 · AI / CGI · 动态设计':s),max=language==='en'?englishWidths[s]:undefined;if(max)g.fillText(value,x,y,max);else g.fillText(value,x,y)}
function line(x,y,x2,y2,color='#ddd',width=1){g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.lineWidth=width;g.strokeStyle=color;g.stroke()}
function img(n,x,y,w,h){const im=n==='heroMotion'?(video.readyState>=2?video:imgs.hero):imgs[n];if(!im)return;const r=n==='ballantines'?{x:0,y:182,w:1920,h:716}:{x:0,y:0,w:im.videoWidth||im.width,h:im.videoHeight||im.height};const a=Math.max(w/r.w,h/r.h),sw=w/a,sh=h/a;g.drawImage(im,r.x+(r.w-sw)/2,r.y+(r.h-sh)/2,sw,sh,x,y,w,h)}
function pill(s,x,y,w=155,fill=BLACK,color=WHITE){round(x,y,w,49,25,fill);text(s,x+w/2,y+31,16,color,600,'center')}
function header(dark=false){const ink=dark?WHITE:BLACK;text('LIUKER',65,62,32,ink,900);text('WORK',660,57,15,ink,600);text('STUDIO',770,57,15,ink,600);pill('联系合作 ↗',1360,23,175,dark?WHITE:BLACK,dark?BLACK:WHITE);line(65,87,1535,87,dark?'#ffffff25':'#10111218')}
function footer(n,s,dark=false){text(n,65,858,15,dark?'#bbb':'#666',500);text(s,1535,858,14,dark?'#bbb':'#666',400,'right')}
function key(x,y,s=1,press=0){g.save();g.translate(x,y);g.scale(s,s);round(-55,9,110,59,11,'#a8112d');round(-55,-press*7,110,58,11,RED);line(-44,7-press*7,44,7-press*7,'#ff8ba0',1);text('ENTER ↵',0,33-press*7,17,'#fff',700,'center');g.restore()}
function card(n,x,y,w,h,angle=0,meta=false){g.save();g.translate(x,y);g.rotate(angle);img(n,-w/2,-h/2,w,h);if(meta){rect(-w/2,h/2,w,42,BLACK);text(n==='ballantines'?'百龄坛 / 品牌影片':'LIUKER / SELECTED WORK',-w/2+12,h/2+26,15,'#ddd',500)}g.restore()}
function monitor(x,y,w,stand=1){drawMetalMonitor(g,{x,y,w,stand,drawScreen:(sx,sy,sw,sh)=>img('heroMotion',sx,sy,sw,sh)})}
function homeHeadline(s,x,y,width){g.save();g.translate(x,y);g.transform(1,0,-.17,1,0,0);g.font='156px "LIUKER Display", Impact, "Arial Narrow", "Arial Black", sans-serif';g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle='#080909';g.scale(width/g.measureText(s).width,1);g.fillText(s,0,0);g.restore()}
function homePill(s,x,y,w,h,red=false){const ink=g.createLinearGradient(x,y,x,y+h);ink.addColorStop(0,red?'#f12029':'#171916');ink.addColorStop(1,red?'#db101b':'#050605');round(x,y,w,h,h/2,ink);g.save();g.strokeStyle='#ffffff75';g.lineWidth=1;g.beginPath();g.roundRect(x+.5,y+.5,w-1,h-1,h/2);g.stroke();g.restore();text(s,x+w/2,y+h/2+7,19,'#fff',600,'center')}
function intro(t){rect(0,0,W,H,WHITE);
 const q=Q(t,3.8,7.1),x=M(1165,800,q),y=M(435,450,q),w=M(680,1680,q);
 const a=1-Q(t,3.4,4.8);homeArt.surface(g,a);homeArt.filmAccent(g,a);g.save();g.globalAlpha=a;
 rect(72,195,38,6,'#e21b24');text('INDEPENDENT VISUAL CREATOR',126,206,17,'#292b27',600);
 homeHeadline('BEYOND',70,352,447);homeHeadline('THE',70,486,232);homeHeadline('FRAME',70,620,426);
 g.save();g.translate(508,598);g.transform(1,0,-.17,1,0,0);rect(0,0,20,22,'#e21b24');g.restore();
 text('创意，不止于画面。',72,686,32,BLACK,600);text('影像 · AI / CGI · 动态设计',74,729,20,'#53554e',400);homePill('探索作品 ↗',72,772,224,58);
 g.restore();monitor(x,y,w,1-q);
 if(a>0){g.save();g.globalAlpha=a;g.save();g.translate(1060,197);g.transform(1,0,-.14,1,0,0);text('01 /',0,0,37,'#e21b24',800);text('LIUKER IN MOTION',90,-5,17,'#252824',600);g.restore();line(875,810,954,810,'#5a5d5270');text('从一个想法开始',1120,817,17,'#33372f',500,'right');line(1144,810,1220,810,'#5a5d5270');homePill('ENTER ↵',1290,782,198,58,true);g.restore()}
 if(t<5.6){g.save();g.globalAlpha=1-Q(t,4.8,5.6);text('LIUKER',72,72,42,BLACK,900);text('WORK',671,62,19,BLACK,700);text('STUDIO',802,62,19,BLACK,700);homePill('联系合作 ↗',1325,28,209,54);g.restore()}
}
// A single project image is preserved through the entire screen / timeline hand-off.
function filmstrip(t){rect(0,0,W,H,WHITE);const z=M(1680/610,1,Q(t,7.1,11)),w=610*z,h=343.125*z;
 paintFilm(g,{distance:0,z,width:1100});
 const projects=['broadcast','character','heroMotion','honor','how'];
 for(let j=-2;j<=2;j++){const x=800+j*660*z;card(projects[j+2],x,450,w,h,0,false)}
 const a=A(t,9.2,10.2,10.5,11);g.save();g.globalAlpha=a;
 text('THE FRAME',65,158,54,WHITE,900);text('BECOMES A STORY.',65,218,54,WHITE,900);
 line(0,686,W,686,'#ffffff30');
 for(let x=0;x<1600;x+=32){line(x,685,x,685+(x%128===0?20:9),'#777');if(x%128===0)text(`${String(x/128).padStart(2,'0')}:00`,x+7,728,12,'#888')}
 rect(797,650,4,120,RED);text('同一画面，进入创作流程',65,803,21,'#eee');text('01 / LIUKER 人物影像',1535,803,15,'#888',400,'right');g.restore();
}
function pathPose(d){
 if(d<1200)return{x:d,y:0,angle:0};
 if(d<1200+630*Math.PI/2){const a=(d-1200)/630;return{x:1200+630*Math.sin(a),y:630*(1-Math.cos(a)),angle:a}}
 return{x:1830,y:630+d-1200-630*Math.PI/2,angle:Math.PI/2};
}
const filmTextures=new Map();
function frameTexture(n){
 let entry=filmTextures.get(n);if(!entry){const c=document.createElement('canvas');c.width=610;c.height=344;entry={canvas:c,time:-1};filmTextures.set(n,entry)}
 const moving=n==='heroMotion',stamp=moving?video.currentTime:0;
 if(entry.time!==stamp){const im=moving?(video.readyState>=2?video:imgs.hero):imgs[n],iw=im.videoWidth||im.width,ih=im.videoHeight||im.height;const source=n==='ballantines'?{x:0,y:182,w:1920,h:716}:{x:0,y:0,w:iw,h:ih};const scale=Math.max(610/source.w,344/source.h),sw=610/scale,sh=344/scale;entry.canvas.getContext('2d').drawImage(im,source.x+(source.w-sw)/2,source.y+(source.h-sh)/2,sw,sh,0,0,610,344);entry.time=stamp}
 return entry.canvas;
}
function filmCard(n,d){
 const a=pathPose(d-305),b=pathPose(d+305),p=pathPose(d);
 if(Math.abs(a.angle-b.angle)<.00001){card(n,p.x,p.y,610,343.125,p.angle);return}
 const texture=frameTexture(n),point=(u,v)=>{const p=pathPose(d+u-305);return{x:p.x-Math.sin(p.angle)*v,y:p.y+Math.cos(p.angle)*v}};
 g.save();g.beginPath();for(let i=0;i<=28;i++){const p=point(610*i/28,-171.5625);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)}for(let i=28;i>=0;i--){const p=point(610*i/28,171.5625);g.lineTo(p.x,p.y)}g.closePath();g.clip();
 const triangle=(pts,ax,ay,cx,cy,tx,ty)=>{g.save();g.beginPath();pts.forEach((p,i)=>{const prev=pts[(i+2)%3],next=pts[(i+1)%3],dx1=p.x-prev.x,dy1=p.y-prev.y,dx2=next.x-p.x,dy2=next.y-p.y,l1=Math.hypot(dx1,dy1),l2=Math.hypot(dx2,dy2),nx1=dy1/l1,ny1=-dx1/l1,nx2=dy2/l2,ny2=-dx2/l2,k=1.8/Math.max(.0001,1+nx1*nx2+ny1*ny2),x=p.x+(nx1+nx2)*k,y=p.y+(ny1+ny2)*k;i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath();g.clip();g.transform(ax,ay,cx,cy,tx,ty);g.drawImage(texture,0,0);g.restore()};
 for(let i=0;i<28;i++){const x0=610*i/28,x1=610*(i+1)/28,dx=x1-x0,tl=point(x0,-171.5625),tr=point(x1,-171.5625),br=point(x1,171.5625),bl=point(x0,171.5625);let ax=(tr.x-tl.x)/dx,ay=(tr.y-tl.y)/dx,cx=(br.x-tr.x)/344,cy=(br.y-tr.y)/344;triangle([tl,tr,br],ax,ay,cx,cy,tl.x-ax*x0,tl.y-ay*x0);ax=(br.x-bl.x)/dx;ay=(br.y-bl.y)/dx;cx=(bl.x-tl.x)/344;cy=(bl.y-tl.y)/344;triangle([tl,br,bl],ax,ay,cx,cy,tl.x-ax*x0,tl.y-ay*x0)}
 g.restore();
}
function timeline(t,drawMain=true){rect(0,0,W,H,WHITE);const p=Q(t,11,18),distance=3300*p,pose=pathPose(distance),z=M(1,.48,Q(t,11,15)),rw=M(1100,520,Q(t,11,13));
 paintFilm(g,{distance,z,width:rw});
 g.save();g.translate(800,450);g.scale(z,z);g.translate(-pose.x,-pose.y);
 const related=[[-1320,'broadcast'],[-660,'character'],[660,'honor'],[1320,'how']];
 for(const [dx,n] of related)filmCard(n,distance+dx);
 if(drawMain)filmCard('heroMotion',distance);
 g.restore();
 const a=A(t,14.8,15.8,18,19.2);g.save();g.globalAlpha=a;
 text('从想法',70,292,73,BLACK,700);text('到每一帧。',70,385,73,BLACK,700);text('CREATIVE / FROM START TO FINISH',73,445,14,'#777',500);
 [['01','品牌影片','让品牌成为被记住的画面。'],['02','AI / CGI','拓展现实之外的视觉可能。'],['03','动态设计','用节奏、形态与运动表达。']].forEach((r,i)=>{const y=270+i*162;text(r[0],1130,y,14,'#777');text(r[1],1130,y+48,34,BLACK,600);text(r[2],1130,y+82,17,'#777');line(1130,y+111,1530,y+111,'#ddd')});
 header();footer('03 / CREATIVE PROCESS','SCROLL TO FOLLOW THE FRAME');g.restore();
 return{z,pose};
}
const grid=[[-1,-1,'broadcast','影像作品'],[0,-1,'ballantines','百龄坛 / 品牌影片'],[1,-1,'character','角色设计'],[-1,0,'shanhaijing','AI / CGI'],[0,0,'heroMotion','LIUKER / 人物影像'],[1,0,'honor','HONOR / 视觉设计'],[-1,1,'how','动态影像'],[0,1,'character','角色设计'],[1,1,'broadcast','影像作品']];
function gallery(t,mask=true){const transition=Q(t,18,21),z=M(.48,.46,Q(t,18,24)),ang=M(Math.PI/2,0,Q(t,18,21)),top=M(900,0,transition),cy=M(450,510,Q(t,18,22));
 if(t<21)timeline(Math.min(t,18),false);else rect(0,0,W,H,BLACK);
 g.save();if(mask){g.beginPath();g.rect(0,top,1600,900-top);g.clip()}rect(0,0,W,H,BLACK);
 for(const [col,row,n,label] of grid){if(col===0&&row===0)continue;const dx=col*660*z,dy=row*435*z,x=800+dx*Math.cos(ang)-dy*Math.sin(ang),y=cy+dx*Math.sin(ang)+dy*Math.cos(ang);card(n,x,y,610*z,343.125*z,ang,false);if(ang<.01)text(label,x-305*z,y+195*z,12,'#929697')}
 g.restore();card('heroMotion',800,cy,610*z,343.125*z,ang,false);
 const a=Q(t,21,22);g.save();g.globalAlpha=a;header(true);text('SELECTED WORK',65,176,58,WHITE,900);text('不同的世界，同一种好奇心。',1530,168,20,'#bbb',400,'right');footer('04 / SELECTED WORK','原有作品素材 · 作品内容保持独立');g.restore();
}
function about(t){rect(0,0,W,H,WHITE);header();text('THE PERSON',65,270,116,BLACK,900);text('BEHIND',65,390,116,BLACK,900);text('THE FRAME.',65,510,116,BLACK,900);
 text('用视觉讲述真实的故事，',72,623,27,BLACK);text('连接品牌、人与更大的世界。',72,667,27,BLACK);text('FILMMAKER / CREATIVE DIRECTOR',72,742,15,'#666',500);
 const im=imgs.avatar;g.drawImage(im,395,0,880,941,960,185,555,594);line(960,780,1515,780,'#bbb');text('LIUKER',960,816,21,BLACK,800);text('ALWAYS CURIOUS.',1515,816,13,'#666',400,'right');footer('05 / ABOUT','每一帧背后，都有一个创作者。');
}
// Stylus tip and the white artboard boundary share one coordinate.
function stylusWipe(t){gallery(25,false);const q=Q(t,25,29),x=M(-500,2200,q),edge=y=>x+(y-600)*.28;
 g.save();g.beginPath();g.moveTo(0,0);g.lineTo(edge(0),0);g.lineTo(edge(900),900);g.lineTo(0,900);g.closePath();g.clip();about(t);g.restore();
 g.save();g.translate(x,600);g.rotate(-Math.atan(.28));
 g.shadowColor='#00000038';g.shadowBlur=35;g.shadowOffsetX=20;
 const grad=g.createLinearGradient(-38,0,38,0);grad.addColorStop(0,'#181a1d');grad.addColorStop(.28,'#5b6066');grad.addColorStop(.45,'#31353b');grad.addColorStop(1,'#0b0c0f');
 round(-38,-840,76,1110,38,grad);g.shadowBlur=0;g.beginPath();g.moveTo(-34,240);g.lineTo(0,345);g.lineTo(34,240);g.closePath();g.fillStyle='#282b30';g.fill();g.beginPath();g.moveTo(-7,324);g.lineTo(0,348);g.lineTo(7,324);g.fillStyle='#111';g.fill();round(-33,-720,66,7,3,RED);line(-24,-680,-24,200,'#777',1);g.restore();
}
function contact(t){about(t);const y=M(900,0,Q(t,32,35));g.save();g.beginPath();g.rect(0,y,W,H-y);g.clip();g.translate(0,y);rect(0,0,W,H,BLACK);
 text('LET’S MAKE',65,360,136,WHITE,900);text('THE NEXT FRAME.',65,511,136,WHITE,900);text('下一个值得被看见的画面，从这里开始。',73,604,26,'#bbb');
 key(1470,670,1.2,0);text('541067143@qq.com',72,736,32,WHITE,400);text('WECHAT  a541067143',72,787,18,'#888');text('150 7205 9913',1535,787,18,'#888',400,'right');footer('06 / START SOMETHING','LIUKER — BEYOND THE FRAME.',true);g.restore();rect(0,0,1600,100,WHITE);header();
}
function render(time){if(disposed||!sceneReady)return;const t=sceneTime=Math.max(0,Math.min(38,time));g.clearRect(0,0,W,H);if(t<7.1)intro(t);else if(t<11)filmstrip(t);else if(t<18)timeline(t);else if(t<25)gallery(t);else if(t<29)stylusWipe(t);else if(t<32)about(t);else contact(t)}
function shouldPlay(){return !disposed&&live&&!paused&&!reducedMotion&&visible&&!doc.hidden&&!video.error&&sceneTime<29}
function stopTicks(){
 if(videoFrameId!==null){video.cancelVideoFrameCallback?.(videoFrameId);videoFrameId=null}
 if(rafId!==null){cancelAnimationFrame(rafId);rafId=null}
}
let lastRaf=0;
function scheduleTick(){
 if(!shouldPlay()||video.paused||!sceneReady||videoFrameId!==null||rafId!==null)return;
 if('requestVideoFrameCallback'in video){videoFrameId=video.requestVideoFrameCallback(()=>{videoFrameId=null;if(shouldPlay()&&!video.paused){render(sceneTime);scheduleTick()}})}
 else rafId=requestAnimationFrame(now=>{rafId=null;if(shouldPlay()&&!video.paused){if(now-lastRaf>=32){lastRaf=now;render(sceneTime)}scheduleTick()}});
}
function manageVideo(){
 if(!shouldPlay()){video.pause();stopTicks();return}
 if(video.paused&&!playPending){
  playPending=true;
  video.play().then(()=>{if(shouldPlay())scheduleTick();else{video.pause();stopTicks()}},()=>stopTicks()).finally(()=>{playPending=false});
 }else scheduleTick();
}
function onVideoReady(){if(disposed)return;render(sceneTime);manageVideo()}
function onVideoError(){if(disposed)return;video.pause();stopTicks();render(sceneTime)}
function onVideoPause(){stopTicks()}
video.addEventListener('loadeddata',onVideoReady);
video.addEventListener('error',onVideoError);
video.addEventListener('pause',onVideoPause);
doc.addEventListener('visibilitychange',manageVideo);
let observer=null;
if(typeof IntersectionObserver!=='undefined'){
 const box=canvas.getBoundingClientRect();const view=doc.defaultView;
 visible=canvas.isConnected&&box.bottom>0&&box.right>0&&box.top<(view?.innerHeight||900)&&box.left<(view?.innerWidth||1600);
 observer=new IntersectionObserver(entries=>{if(disposed)return;visible=entries.some(entry=>entry.isIntersecting);manageVideo()},{threshold:0});
 observer.observe(canvas);
}
video.load();
return {
 ready,
 setProgress(time){if(disposed)return;sceneTime=Math.max(0,Math.min(38,Number.isFinite(time)?time:0));render(sceneTime);manageVideo()},
 setLanguage(nextLanguage){if(disposed)return;language=nextLanguage==='en'?'en':'zh';render(sceneTime)},
 setPaused(nextPaused){if(disposed)return;paused=Boolean(nextPaused);manageVideo()},
 startLive(){if(disposed)return;live=true;manageVideo()},
 dispose(){
  if(disposed)return;disposed=true;live=false;stopTicks();observer?.disconnect();
  doc.removeEventListener('visibilitychange',manageVideo);
  video.removeEventListener('loadeddata',onVideoReady);video.removeEventListener('error',onVideoError);video.removeEventListener('pause',onVideoPause);
  video.pause();video.removeAttribute('src');video.removeAttribute('poster');video.load();
  for(const cancel of [...pendingLoads])cancel();pendingLoads.clear();
  for(const im of Object.values(imgs)){if(im instanceof HTMLImageElement){im.onload=null;im.onerror=null;im.removeAttribute('src')}}
  for(const name of Object.keys(imgs))delete imgs[name];
  filmTextures.clear();fallbackImages.clear();paintFilm=null;homeArt=null;
 }
};
}
