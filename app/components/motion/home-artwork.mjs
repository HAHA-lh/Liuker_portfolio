// Fixed paper and photographic materials: generated once, never flickering
// over the video. All coordinates belong to the existing 1600 × 900 scene.
export function createHomeArtwork({amber,perf,poster}){
 const paper=document.createElement('canvas');paper.width=1600;paper.height=900;
 const p=paper.getContext('2d');let seed=79143;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 p.fillStyle='#f4f2ed';p.fillRect(0,0,1600,900);
 for(let i=0;i<24;i++){
  const x=random()*1600,y=random()*900,r=100+random()*280;
  const cloud=p.createRadialGradient(x,y,0,x,y,r);
  cloud.addColorStop(0,i%2?'#ffffff52':'#7c716315');cloud.addColorStop(1,'#ffffff00');
  p.fillStyle=cloud;p.fillRect(x-r,y-r,r*2,r*2);
 }
 const noise=p.createImageData(1600,900);
 for(let i=0;i<noise.data.length;i+=4){
  const n=random(),ink=n<.5?255:62;
  noise.data[i]=ink;noise.data[i+1]=ink;noise.data[i+2]=ink;
  noise.data[i+3]=Math.round(Math.abs(n-.5)*27);
 }
 const grain=document.createElement('canvas');grain.width=1600;grain.height=900;
 grain.getContext('2d').putImageData(noise,0,0);p.drawImage(grain,0,0);
 for(let i=0;i<2200;i++){
  const x=random()*1600,y=random()*900,length=.5+random()*3.5;
  p.strokeStyle=i%3?'#6057490a':'#ffffff60';p.lineWidth=.45;
  p.beginPath();p.moveTo(x,y);p.lineTo(x+length,y+(random()-.5)*1.5);p.stroke();
 }
 // Sparse paper wear is confined to the perimeter rather than the text field.
 for(let i=0;i<1800;i++){
  const side=i%4,edge=random()**2*28;
  const x=side===0?edge:side===1?1600-edge:random()*1600;
  const y=side===2?edge:side===3?900-edge:random()*900;
  p.fillStyle=`rgba(74,65,53,${.025+random()*.05})`;
  p.fillRect(x,y,.5+random()*1.5,.5+random()*1.5);
 }
 const strip=document.createElement('canvas');strip.width=210;strip.height=560;
 const f=strip.getContext('2d'),tone=f.createLinearGradient(0,0,210,0);
 tone.addColorStop(0,'#555650');tone.addColorStop(.17,'#222522');tone.addColorStop(.8,'#353832');tone.addColorStop(1,'#85867c');
 f.fillStyle=tone;f.fillRect(0,0,210,560);
 f.globalAlpha=.2;f.drawImage(amber,240,180,650,1100,0,0,210,560);
 f.globalCompositeOperation='screen';f.globalAlpha=.12;f.drawImage(perf,110,85,490,1000,0,0,210,560);
 f.globalCompositeOperation='source-over';f.globalAlpha=1;
 for(let y=26;y<540;y+=174){
  f.fillStyle='#080a09';f.fillRect(30,y,150,150);
  f.save();f.filter='grayscale(1) contrast(.8)';f.globalAlpha=.32;
  f.drawImage(poster,0,0,poster.width,poster.height,31,y+14,148,120);f.restore();
  f.strokeStyle='#aba99845';f.lineWidth=.6;f.strokeRect(29.5,y-.5,151,151);
 }
 f.save();f.globalCompositeOperation='destination-out';
 for(let y=12;y<550;y+=32)for(const x of[8,190]){f.beginPath();f.roundRect(x,y,12,18,2.5);f.fill()}
 f.restore();f.fillStyle='#d6c6a070';f.font='8px monospace';
 f.save();f.translate(183,210);f.rotate(Math.PI/2);f.fillText('LIUKER / FRAME 01',0,0);f.restore();
 function surface(g,opacity){
  g.save();g.globalAlpha=opacity;g.drawImage(paper,0,0);
  g.save();g.translate(354,252);g.transform(1,0,-.14,1,0,0);
  g.fillStyle='#8b847510';g.font='900 292px "LIUKER Display", Impact, "Arial Narrow", sans-serif';
  g.textAlign='left';g.textBaseline='alphabetic';g.fillText('FRAME',0,0);g.restore();
  // Light circular registration marks belong to the paper, behind the device.
  g.strokeStyle='#5a554a19';g.lineWidth=1;
  for(let j=0;j<3;j++){
   g.beginPath();for(let i=0;i<=160;i++){
    const a=i/160*Math.PI*2,r=264+j*2+Math.sin(a*13+j)*1.8;
    const x=1033+Math.cos(a)*r,y=568+Math.sin(a)*r;
    i?g.lineTo(x,y):g.moveTo(x,y);
   }g.stroke();
  }
  g.strokeStyle='#e21b24';g.lineWidth=4;g.lineCap='round';
  g.beginPath();g.moveTo(42,634);g.bezierCurveTo(238,548,487,463,595,452);
  g.bezierCurveTo(691,443,686,477,567,536);g.stroke();
  g.strokeStyle='#34352f70';g.lineWidth=1;
  for(const [x,y,sx,sy]of[[35,34,1,1],[1565,34,-1,1],[35,866,1,-1],[1565,866,-1,-1]]){
   g.beginPath();g.moveTo(x,y+28*sy);g.lineTo(x,y);g.lineTo(x+28*sx,y);g.stroke();
  }
  g.restore();
 }
 function filmAccent(g,opacity){
  g.save();g.globalAlpha=opacity*.72;g.translate(861,509);g.rotate(.17);
  g.shadowColor='#29271d25';g.shadowBlur=15;g.shadowOffsetY=7;
  g.drawImage(strip,-105,-280);g.restore();
 }
 return{surface,filmAccent};
}
