// Scanned texture stays fixed to the film, including through the curved section.
// Source-image branding is excluded; edge codes below belong to LIUKER.
export function createFilmMaterial(amber,perf){
 const tile=document.createElement('canvas');tile.width=tile.height=640;const q=tile.getContext('2d');
 q.fillStyle='#181511';q.fillRect(0,0,640,640);
 q.globalAlpha=.64;q.drawImage(amber,240,180,650,1100,0,0,640,640);
 q.globalCompositeOperation='screen';q.globalAlpha=.48;q.drawImage(perf,110,85,490,1000,0,0,640,640);
 q.globalAlpha=1;q.globalCompositeOperation='source-over';
 let seed=40031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const noise=q.createImageData(640,640);for(let i=0;i<noise.data.length;i+=4){const n=random();noise.data[i]=195;noise.data[i+1]=182;noise.data[i+2]=153;noise.data[i+3]=n>.68?Math.round((n-.68)*30):0}
 const grain=document.createElement('canvas');grain.width=grain.height=640;grain.getContext('2d').putImageData(noise,0,0);q.drawImage(grain,0,0);
 for(let i=0;i<34;i++){const x=random()*640,y=random()*640;q.strokeStyle=`rgba(228,213,177,${.025+random()*.055})`;q.lineWidth=.4+random()*.6;q.beginPath();q.moveTo(x,y);q.bezierCurveTo(x+random()*6,y+9,x-3,y+17,x+3,y+12+random()*60);q.stroke()}
 const layer=document.createElement('canvas');layer.width=1600;layer.height=900;const c=layer.getContext('2d');
 const pattern=c.createPattern(tile,'repeat');
 function railPath(w){const p=new Path2D();p.moveTo(-5000,-w/2);p.lineTo(1200,-w/2);p.arc(1200,630,630+w/2,-Math.PI/2,0);p.lineTo(1830+w/2,6000);p.lineTo(1830-w/2,6000);p.lineTo(1830-w/2,630);p.arc(1200,630,630-w/2,0,-Math.PI/2,true);p.lineTo(-5000,w/2);p.closePath();return p}
 function centerPath(){const p=new Path2D();p.moveTo(-5000,0);p.lineTo(1200,0);p.arc(1200,630,630,-Math.PI/2,0);p.lineTo(1830,6000);return p}
 const track=centerPath();
 function at(d){if(d<1200)return{x:d,y:0,angle:0};if(d<1200+630*Math.PI/2){const a=(d-1200)/630;return{x:1200+630*Math.sin(a),y:630*(1-Math.cos(a)),angle:a}}return{x:1830,y:630+d-1200-630*Math.PI/2,angle:Math.PI/2}}
 function hole(x,y){
  c.save();c.globalCompositeOperation='destination-out';c.beginPath();c.roundRect(x-21,y-17,42,34,7);c.fill();c.restore();
  c.beginPath();c.roundRect(x-21.8,y-17.8,43.6,35.6,7.5);c.lineWidth=1.6;c.strokeStyle='#574d36aa';c.stroke();
  c.beginPath();c.moveTo(x-14,y-18.6);c.lineTo(x+14,y-18.6);c.strokeStyle='#d5c39940';c.lineWidth=.8;c.stroke();
 }
 function printLabel(d,index,w){const p=at(d);c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle='#c18b4daf';c.font='500 18px "Courier New", monospace';c.textAlign='left';c.textBaseline='alphabetic';c.fillText('LIUKER 400',-290,-w/2+84);c.fillText(String(index).padStart(2,'0')+' A',245,-w/2+84);c.fillText('FRAME '+String(index).padStart(3,'0'),-290,w/2-69);c.beginPath();c.moveTo(258,w/2-82);c.lineTo(286,w/2-72);c.lineTo(258,w/2-62);c.closePath();c.fill();c.restore()}
 return function paint(g,{distance=0,z=1,width=520}){
  c.clearRect(0,0,1600,900);const p=at(distance);
  c.save();c.translate(800,450);c.scale(z,z);c.translate(-p.x,-p.y);
  c.lineWidth=width+3;c.strokeStyle='#80705566';c.stroke(track);
  c.lineWidth=width;c.strokeStyle='#292016';c.stroke(track);
  c.save();c.clip(railPath(width-8));c.fillStyle=pattern;c.fillRect(-5000,-1000,8500,7500);c.restore();
  // Darker rails flank the image area; the soft edge catches light without glowing.
  for(const side of[-1,1]){
   c.save();c.clip(railPath(width));
   const border=new Path2D(),r=630+side*(width/2-38);border.moveTo(-5000,-side*(width/2-38));border.lineTo(1200,-side*(width/2-38));border.arc(1200,630,r,-Math.PI/2,0);border.lineTo(1200+r,6000);c.lineWidth=67;c.strokeStyle='#03040380';c.stroke(border);
   c.restore();
  }
  // A single faint edge leak travels with the physical strip.
  const leak=at(1650);c.save();c.clip(railPath(width));c.translate(leak.x,leak.y);c.rotate(leak.angle);c.scale(4.2,.8);const light=c.createRadialGradient(0,width/2,0,0,width/2,80);light.addColorStop(0,'rgba(180,77,22,.14)');light.addColorStop(.55,'rgba(130,85,25,.06)');light.addColorStop(1,'rgba(95,55,12,0)');c.fillStyle=light;c.fillRect(-100,width/2-110,200,220);c.restore();
  const low=Math.floor((distance-4200)/84)*84,high=distance+4200;
  for(let d=low;d<=high;d+=84){const k=at(d);c.save();c.translate(k.x,k.y);c.rotate(k.angle);hole(0,-width/2+38);hole(0,width/2-38);c.restore()}
  const first=Math.floor((distance-4000)/660);for(let j=first;j<=first+13;j++)printLabel(j*660,((j+36)%100+100)%100,width);
  c.restore();g.drawImage(layer,0,0);
 };
}
