/* Original pixel sprites and sling simulation; all assets are drawn locally. */
import {createAirBattleBackground} from './air-battle.mjs';

export const PIG_SLING_RULES = Object.freeze({gravity: 650, pull: 90, gain: 9.6, minPull: 8, birds: 10, pigs: 8, particles: 220});
const slingClamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function slingSegmentDistance(x1, y1, x2, y2) {
  const dx=x2-x1, dy=y2-y1;
  const t=slingClamp(-(x1*dx+y1*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(x1+dx*t,y1+dy*t);
}

export class PigSling {
  constructor({width=960,height=720,seed=43191,night=true}={}) {
    this.width=Math.max(240,width); this.height=Math.max(360,height); this.seed=seed>>>0||1;
    this.night=night!==false;
    this.time=0; this.manual=false; this.aim=null; this.reload=0; this.spawnIn=.8;
    this.birds=[]; this.pigs=[]; this.particles=[];
    this.stats={spawned:0,fired:0,hits:0,landed:0,misses:0,turns:0};
    for(let i=0;i<7;i++)this.spawnBird(true,i);
  }
  get groundY(){return this.height-64;}
  get anchor(){return {x:this.width*.5,y:this.groundY-112};}
  get ready(){return this.reload<=0 && this.pigs.length<PIG_SLING_RULES.pigs;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  setManual(value){this.manual=Boolean(value);if(!this.manual)this.aim=null;}
  beginDrag(x,y){
    if(!this.manual || !this.ready || !Number.isFinite(x+y) || Math.hypot(x-this.anchor.x,y-this.anchor.y)>46)return false;
    this.aim={...this.anchor};this.movePlayer(x,y);return true;
  }
  movePlayer(x,y){
    if(!this.manual || !this.aim || !Number.isFinite(x+y))return;
    const a=this.anchor,dx=x-a.x,dy=y-a.y,scale=Math.min(1,PIG_SLING_RULES.pull/(Math.hypot(dx,dy)||1));
    this.aim={x:slingClamp(a.x+dx*scale,20,this.width-20),y:slingClamp(a.y+dy*scale,25,this.groundY-20)};
  }
  get power(){return this.aim?Math.hypot(this.anchor.x-this.aim.x,this.anchor.y-this.aim.y)/PIG_SLING_RULES.pull:0;}
  launchVector(){
    if(!this.aim)return null;
    return {x:this.aim.x,y:this.aim.y,vx:(this.anchor.x-this.aim.x)*PIG_SLING_RULES.gain,vy:(this.anchor.y-this.aim.y)*PIG_SLING_RULES.gain};
  }
  trajectory(){
    const shot=this.launchVector();if(!shot || this.power*PIG_SLING_RULES.pull<PIG_SLING_RULES.minPull)return [];
    const points=[];
    for(let t=.09;t<=3.6;t+=.075){
      const x=shot.x+shot.vx*t,y=shot.y+shot.vy*t+.5*PIG_SLING_RULES.gravity*t*t;
      if(y>=this.groundY-17 || x<-20 || x>this.width+20)break;
      if(y>=10)points.push({x,y,t});
    }
    return points;
  }
  endDrag(release=false){
    const shot=this.launchVector(),enough=this.power*PIG_SLING_RULES.pull>=PIG_SLING_RULES.minPull;
    this.aim=null;
    if(!release || !shot || !enough || !this.manual || !this.ready)return false;
    this.pigs.push({...shot,radius:17,life:7,trail:[],trailIn:0,dead:false});
    this.reload=.34;this.stats.fired++;return true;
  }
  resize(width,height=this.height){
    width=Math.max(240,width);height=Math.max(360,height);
    const sx=width/this.width,sy=height/this.height;
    for(const list of [this.birds,this.pigs,this.particles])for(const e of list){
      e.x*=sx;e.y*=sy;if(e.baseY!==undefined)e.baseY*=sy;
      if(e.trail)for(const p of e.trail){p.x*=sx;p.y*=sy;}
    }
    this.width=width;this.height=height;this.aim=null;
  }
  spawnBird(initial=false,index=this.stats.spawned){
    if(this.birds.length>=PIG_SLING_RULES.birds)return;
    const direction=index%2===0?1:-1;
    const baseY=105+this.random()*(this.height*.52-105);
    this.birds.push({x:initial?(index+.55)/7*this.width:direction>0?-35:this.width+35,
      y:baseY,baseY,vx:direction*(66+this.random()*67),vy:0,type:index%5,radius:21,
      phase:this.random()*Math.PI*2,amplitude:8+this.random()*16,state:'flying',angle:0,dead:false});
    this.stats.spawned++;
  }
  burst(x,y,pig,type=0,ground=false){
    const colors=pig?(this.night?['#b5f86e','#7fdb5b','#d4ffb1','#ff89d5']:['#427f39','#72b44a','#a8cf60','#e9b895'])
      :(this.night?PIG_NIGHT_BIRD_PALETTES:PIG_BIRD_PALETTES)[type].slice(1,5);
    const count=Math.min(pig?27:30,PIG_SLING_RULES.particles-this.particles.length);
    for(let i=0;i<count;i++){
      const angle=this.random()*Math.PI*2,speed=40+this.random()*155,life=.38+this.random()*.48;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:ground?-30-this.random()*145:Math.sin(angle)*speed,
        life,maxLife:life,size:2+Math.floor(this.random()*3),color:colors[i%colors.length]});
    }
  }
  advance(seconds){
    if(!Number.isFinite(seconds)||seconds<=0)return;
    let left=Math.min(seconds,.25);
    while(left>1e-8){const dt=Math.min(left,1/120);this.step(dt);left-=dt;}
  }
  step(dt){
    this.time+=dt;this.reload=Math.max(0,this.reload-dt);this.spawnIn-=dt;
    if(this.spawnIn<=0){this.spawnBird();this.spawnIn=.85+this.random()*.5;}
    for(const b of this.birds){
      b.oldX=b.x;b.oldY=b.y;
      if(b.state==='flying'){
        b.x+=b.vx*dt;b.y=b.baseY+Math.sin(this.time*1.8+b.phase)*b.amplitude;
        if((b.x>this.width+38&&b.vx>0)||(b.x<-38&&b.vx<0)){b.vx=-b.vx;this.stats.turns++;}
      }else{
        b.x+=b.vx*dt;b.y+=b.vy*dt+.5*PIG_SLING_RULES.gravity*dt*dt;b.vy+=PIG_SLING_RULES.gravity*dt;b.angle+=dt*8;
        if(b.x<b.radius){b.x=b.radius;b.vx=Math.abs(b.vx)*.2;}
        if(b.x>this.width-b.radius){b.x=this.width-b.radius;b.vx=-Math.abs(b.vx)*.2;}
        if(b.y+b.radius>=this.groundY){b.dead=true;this.stats.landed++;this.burst(b.x,this.groundY-5,false,b.type,true);}
      }
    }
    for(const p of this.pigs){
      const oldX=p.x,oldY=p.y;
      p.x+=p.vx*dt;p.y+=p.vy*dt+.5*PIG_SLING_RULES.gravity*dt*dt;p.vy+=PIG_SLING_RULES.gravity*dt;p.life-=dt;
      p.trailIn-=dt;if(p.trailIn<=0){p.trail.push({x:p.x,y:p.y});if(p.trail.length>9)p.trail.shift();p.trailIn=.045;}
      for(const b of this.birds){
        if(b.dead || b.state!=='flying')continue;
        if(slingSegmentDistance(oldX-b.oldX,oldY-b.oldY,p.x-b.x,p.y-b.y)<p.radius+b.radius){
          b.state='falling';b.vx=b.vx*.35+p.vx*.13;b.vy=Math.min(-90,p.vy*.14);b.angle=0;
          p.dead=true;this.stats.hits++;this.burst(p.x,p.y,true);break;
        }
      }
      if(!p.dead && (p.y+p.radius>=this.groundY || p.life<=0 || p.x<-80 || p.x>this.width+80)){
        p.dead=true;this.stats.misses++;this.burst(slingClamp(p.x,4,this.width-4),Math.min(p.y,this.groundY-8),true,0,true);
      }
    }
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt;}
    this.birds=this.birds.filter(b=>!b.dead);this.pigs=this.pigs.filter(p=>!p.dead);this.particles=this.particles.filter(p=>p.life>0);
  }
}

const PIG_SPRITE=[
  '0011000001100','0122100012210','0122222222210','1222222222221',
  '1221122211221','1234412144321','1234512154321','1222222222221',
  '1222666662221','0122676762210','0122666662210','0012222222100','0001111111000'
];
const PIG_COLORS=['','#355b37','#78b44d','#a3ce62','#f7efd3','#273e3c','#e9b696','#995d59'];
const PIG_NIGHT_COLORS=['','#c3ff92','#7fdb5b','#b5f86e','#f4fdff','#102039','#ff89d5','#562b61'];
const PIG_NIGHT_BIRD_PALETTES=[
  ['','#ffe8a3','#f4b854','#ca803d','#fff8e2','#11172d','#ff8b88','#ff9fd6'],
  ['','#b4f6ff','#59bada','#368db3','#f0ffff','#10192d','#ffc77a','#82e7ef'],
  ['','#e8bbff','#b379dc','#8350ac','#fff1ff','#211333','#ffc77a','#ffa6ed'],
  ['','#ffc0e9','#f077bc','#b54e90','#fff4ee','#281329','#ffc77a','#ff9cba'],
  ['','#9dffe1','#62cca7','#3c9988','#f3fff2','#112b2c','#ffe19b','#bcf7a0']
];
const PIG_BIRD_PALETTES=[
  ['','#715b3d','#f2cb68','#cf9c47','#fff1c9','#343e47','#ed8b50','#a95a46'],
  ['','#426885','#77aeca','#568cb0','#eaf5f1','#344253','#edb66b','#a9d9dc'],
  ['','#695278','#ad8ca7','#876e9f','#f8dfdc','#3c344e','#edb66b','#d7b7d2'],
  ['','#754a4b','#d78178','#af6467','#ffe5c5','#423840','#edb66b','#e5aa90'],
  ['','#3d716c','#87bc9b','#5b9c88','#edf0d3','#304b4a','#e2b36c','#b3d2a8']
];
const PIG_BIRD_SPRITES=[
  ['000000770000000','000001221000000','000012222100000','000122442210000','001222452226600','012222222226660','012333222222100','001333322221000','000122222210000','000011111100000','000000660000000'],
  ['00000001100000000','00000014410000000','00000144441000000','00001444546600000','00114444226660000','01444444222100000','00113333322111000','00001133311111100','00000011110000000'],
  ['000070700000000','000127210000000','000122221000000','001224422100000','012224522266000','012222222266600','123332222221000','012333222210000','001222222100000','000111111000000'],
  ['000000110000000','000001221000000','000012222100000','000122452210000','001222222266600','012333222221000','000133322210000','000011111100000','000000660000000'],
  ['00000000111000000','00000001444100000','00000014454100000','00000014444666000','00000012221666600','00111112221000000','01222222222100000','01233322222100000','00133332221000000','00011111110000000']
];
function slingSprite(ctx,rows,x,y,unit,colors,flip=false,neon=false){
  const width=rows[0].length*unit,height=rows.length*unit;
  if(neon){
    // A small square halo preserves crisp sprite pixels and leaves faces sharp.
    ctx.globalAlpha=.22;ctx.fillStyle=colors[1];
    for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++)if(rows[row][col]!=='0')
      ctx.fillRect(Math.round(x-width/2+(flip?rows[row].length-1-col:col)*unit)-2,Math.round(y-height/2+row*unit)-2,unit+4,unit+4);
    ctx.globalAlpha=1;
  }
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
    const color=colors[Number(rows[row][col])];if(!color)continue;ctx.fillStyle=color;
    ctx.fillRect(Math.round(x-width/2+(flip?rows[row].length-1-col:col)*unit),Math.round(y-height/2+row*unit),unit,unit);
  }
}
function slingBand(ctx,x1,y1,x2,y2,color){
  // Axis-aligned stamps preserve the pixel edge even on diagonal elastic bands.
  const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/3);ctx.fillStyle=color;
  for(let i=0;i<=n;i++){const t=i/(n||1);ctx.fillRect(Math.round(x1+(x2-x1)*t)-2,Math.round(y1+(y2-y1)*t)-2,5,5);}
}
export function paintPigSling(ctx,world){
  const w=world.width,h=world.height,g=world.groundY,a=world.anchor,night=world.night;
  const pigColors=night?PIG_NIGHT_COLORS:PIG_COLORS,birdColors=night?PIG_NIGHT_BIRD_PALETTES:PIG_BIRD_PALETTES;
  ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;
  ctx.fillStyle=night?'#0b0a18':'#87c9e8';ctx.fillRect(0,0,w,h);ctx.fillStyle=night?'#111329':'#a2d8ed';ctx.fillRect(0,h*.38,w,h*.62);
  ctx.fillStyle=night?'#1b1c3c':'#bce5ed';ctx.fillRect(0,h*.65,w,h*.35);
  if(night){
    for(let i=0;i<76;i++){
      const x=Math.round(((i*73+29)%997)/997*w),y=25+((i*47+13)%Math.max(1,Math.floor(g*.72))),size=i%9===0?3:2;
      ctx.globalAlpha=.5+.25*Math.sin(world.time*.8+i);ctx.fillStyle=i%3?'#adb5e5':'#ff9cde';ctx.fillRect(x,y,size,size);
      if(i%13===0){ctx.fillRect(x-3,y+1,8,1);ctx.fillRect(x+1,y-3,1,8);}
    }
    ctx.globalAlpha=1;ctx.fillStyle='#7b83ba';ctx.fillRect(w*.12-7,82,44,28);ctx.fillRect(w*.12+1,74,28,44);
    ctx.fillStyle='#d6e9ff';ctx.fillRect(w*.12-4,84,38,24);ctx.fillRect(w*.12+2,78,26,36);
    ctx.fillStyle='#8fa7cd';ctx.fillRect(w*.12+5,85,8,5);ctx.fillRect(w*.12+18,101,7,6);
  }else{
    ctx.fillStyle='#f6edc3';ctx.fillRect(w*.12,81,30,30);ctx.fillRect(w*.12-6,87,42,18);
  }
  for(let i=0;i<7;i++){
    const x=((i*.179*w+world.time*(3+i%3)+83)%(w+190))-95,y=64+(i%3)*78,s=i%2?1:.7;
    ctx.fillStyle=night?'#20233f':'#d7edf0';ctx.fillRect(Math.round(x-37*s),Math.round(y+12*s),110*s,21*s);
    ctx.fillStyle=night?'#303453':'#f8faf0';ctx.fillRect(Math.round(x-45*s),Math.round(y),112*s,21*s);ctx.fillRect(Math.round(x-24*s),Math.round(y-15*s),45*s,24*s);ctx.fillRect(Math.round(x+13*s),Math.round(y-8*s),36*s,21*s);
    if(night){ctx.fillStyle='#51557c';ctx.fillRect(Math.round(x-24*s),Math.round(y-15*s),45*s,3*s);}
  }
  for(let x=0;x<w;x+=12){
    ctx.fillStyle=night?'#292c52':'#91bf8c';const ridge=32+Math.sin(x*.009)*23+Math.sin(x*.024)*8;ctx.fillRect(x,Math.round(g-ridge-18),12,h);
    ctx.fillStyle=night?'#244650':'#77ad75';const near=22+Math.sin(x*.012+2)*16;ctx.fillRect(x,Math.round(g-near),12,h);
    if(night){ctx.fillStyle='#398b8c';ctx.fillRect(x,Math.round(g-near),12,2);}
  }
  ctx.fillStyle=night?'#211d39':'#af835a';ctx.fillRect(0,g,w,h-g);ctx.fillStyle=night?'#28554f':'#659b48';ctx.fillRect(0,g,w,9);ctx.fillStyle=night?'#75dfb0':'#8ac759';ctx.fillRect(0,g,w,4);
  ctx.fillStyle=night?'#4c3b65':'#8c684b';for(let x=4;x<w;x+=26)ctx.fillRect(x,g+29+(x%5)*5,6,4);
  for(let x=20;x<w;x+=63){ctx.fillStyle=night?'#4d9c88':'#477f42';ctx.fillRect(x,g-5,3,9);ctx.fillRect(x-3,g-2,9,3);if(x%3){ctx.fillStyle=night?(x%2?'#ff89d5':'#8be5ef'):(x%2?'#f3dc8e':'#efe8d8');ctx.fillRect(x-2,g-8,5,5);}}
  for(const p of world.pigs)for(let i=0;i<p.trail.length;i++){ctx.globalAlpha=(i+1)/p.trail.length*.32;ctx.fillStyle=night?'#b5f86e':'#fff9e4';ctx.fillRect(Math.round(p.trail[i].x)-2,Math.round(p.trail[i].y)-2,4,4);}ctx.globalAlpha=1;
  for(const b of world.birds){
    ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));
    if(b.state==='falling')ctx.rotate(Math.floor(b.angle/(Math.PI/2))*Math.PI/2);
    slingSprite(ctx,PIG_BIRD_SPRITES[b.type],0,0,3,birdColors[b.type],b.vx<0,night);
    if(b.state==='flying'){
      const wingUp=Math.sin(world.time*14+b.phase)>0;ctx.fillStyle=birdColors[b.type][3];
      ctx.fillRect(b.vx<0?5:-19,wingUp?-25:4,18,6);ctx.fillRect(b.vx<0?9:-24,wingUp?-30:10,12,6);
    }
    ctx.restore();
  }
  const pocket=world.aim??a;
  ctx.fillStyle=night?'#7775c3':'#4d3c2c';ctx.fillRect(a.x-9,a.y+27,18,g-a.y-18);ctx.fillRect(a.x-25,a.y-13,12,58);ctx.fillRect(a.x+13,a.y-13,12,58);
  ctx.fillStyle=night?'#b4a4e7':'#9c7147';ctx.fillRect(a.x-5,a.y+32,9,g-a.y-25);ctx.fillRect(a.x-22,a.y-10,6,52);ctx.fillRect(a.x+16,a.y-10,6,52);ctx.fillRect(a.x-16,a.y+25,32,12);
  slingBand(ctx,a.x-20,a.y-6,pocket.x,pocket.y+4,night?'#368795':'#6c4d3b');
  for(const dot of world.trajectory()){
    ctx.fillStyle=night?'#39516e':'#508696';ctx.fillRect(Math.round(dot.x)-2,Math.round(dot.y)-2,5,5);ctx.fillStyle=night?'#c6f8ff':'#fffbee';ctx.fillRect(Math.round(dot.x)-1,Math.round(dot.y)-1,3,3);
  }
  for(const p of world.pigs)slingSprite(ctx,PIG_SPRITE,p.x,p.y,3,pigColors,false,night);
  if(world.ready)slingSprite(ctx,PIG_SPRITE,pocket.x,pocket.y,3,pigColors,false,night);
  slingBand(ctx,a.x+20,a.y-6,pocket.x,pocket.y+7,night?'#80e3ed':'#a87450');
  ctx.fillStyle=night?'#e2c6ff':'#d0a474';ctx.fillRect(a.x+17,a.y-10,4,25);
  for(const p of world.particles){ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}ctx.globalAlpha=1;
  ctx.fillStyle=night?'#e6e2ff':'#294d5e';ctx.font='bold 18px "Microsoft YaHei", sans-serif';ctx.fillText('愤怒的小猪',24,35);
  ctx.font='12px "Microsoft YaHei", sans-serif';ctx.fillText(`击落 ${world.stats.hits}  ·  小猪 ∞`,24,57);
  if(world.manual){
    const power=Math.round(world.power*100);ctx.fillStyle=night?'#353b63':'#f8f4df';ctx.fillRect(19,g-50,150,33);ctx.fillStyle=night?'#15172d':'#f8f4df';ctx.fillRect(20,g-49,148,31);ctx.fillStyle=night?'#e6e2ff':'#406b4d';ctx.font='12px "Microsoft YaHei", sans-serif';ctx.fillText(`拉力 ${power}%`,29,g-29);
    for(let i=0;i<10;i++){ctx.fillStyle=i<power/10?(night?'#b5f86e':'#5c983e'):(night?'#383b59':'#d3ddbe');ctx.fillRect(91+i*6,g-39,4,14);}
    if(world.stats.fired===0&&!world.aim&&w>450){ctx.fillStyle=night?'#b9cbea':'#294d5e';ctx.font='13px "Microsoft YaHei", sans-serif';ctx.fillText('按住小猪向下或侧后拉动 · 松开发射',Math.max(180,a.x-132),g-158);}
  }
  ctx.restore();
}

export function createPigSlingBackground({doc,win,night=true,onNightChange}){
  let isNight=night!==false;
  const scenes=new Set();
  const renderNight=scene=>{
    scene.battle.night=isNight;
    scene.controls.toggleAttribute('data-na-night',isNight);
    scene.timeButton.textContent=isNight?'切换白天':'切换夜晚';
    scene.timeButton.setAttribute('aria-label',isNight?'切换到白天':'切换到夜晚');
    scene.timeButton.title=`当前${isNight?'夜晚':'白天'} · 点击${scene.timeButton.textContent}`;
    if(scene.width>0&&scene.height>0)paintPigSling(scene.ctx,scene.battle);
  };
  const setNight=value=>{isNight=Boolean(value);for(const scene of scenes)renderNight(scene);};
  const runtime=createAirBattleBackground({doc,win,Game:PigSling,paint:paintPigSling,mode:'pigs',
    passiveHint:'愤怒的小猪 · 无限弹药',playingHint:'拖住小猪拉弓 · 松开发射 · Esc 退出',
    ariaLabel:'愤怒的小猪操作区，拖住底部小猪拉动弹弓，松开发射，按 Esc 退出参与',
    configureScene(scene,listen,escape){
      const button=doc.createElement('button');button.type='button';button.className='na-pig-sling-time';
      scene.timeButton=button;scene.controls.appendChild(button);scenes.add(scene);renderNight(scene);
      listen(button,'click',()=>{setNight(!isNight);onNightChange?.(isNight);});
      listen(button,'keydown',escape);
      scene.cleanups.push(()=>scenes.delete(scene));
    }});
  return {...runtime,setNight};
}
