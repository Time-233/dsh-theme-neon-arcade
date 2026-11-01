/* Original neon pixel fruit sprites, ballistic tosses and swept blade hits. */
import {createAirBattleBackground} from './air-battle.mjs';

export const FRUIT_SLICE_RULES=Object.freeze({gravity:780,entities:8,particles:600,trail:24,waveMin:2.6,waveMax:3.8,shakeDuration:.85,impactDuration:1.05});
export function fruitImpactFlash(age){
  for(const start of [0,.42]){
    const t=age-start;
    if(t>=0&&t<.2)return t<.04?t/.04:t<.12?1:(.2-t)/.08;
  }
  return 0;
}
const fruitClamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function fruitSegmentDistance(x1,y1,x2,y2,x,y){
  const dx=x2-x1,dy=y2-y1,t=fruitClamp(((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(x1+dx*t-x,y1+dy*t-y);
}
export class FruitSlice {
  constructor({width=960,height=720,seed=67391}={}){
    this.width=Math.max(240,width);this.height=Math.max(360,height);this.seed=seed>>>0||1;
    this.time=0;this.manual=false;this.resetRound();
  }
  resetRound(){
    this.blade=null;this.trail=[];this.entities=[];this.particles=[];this.rings=[];
    this.flash=0;this.impactAge=0;this.phase='playing';this.message=0;this.lastClear=0;
    this.stats={spawned:0,fruitSpawned:0,bombSpawned:0,sliced:0,bombs:0,chainFruit:0,missed:0};
    this.spawnWave();this.spawnIn=this.waveDelay();
  }
  restart(){if(this.phase!=='lost')return false;this.onCancel?.();this.resetRound();this.onParticipation?.();return true;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  waveDelay(){return FRUIT_SLICE_RULES.waveMin+this.random()*(FRUIT_SLICE_RULES.waveMax-FRUIT_SLICE_RULES.waveMin);}
  setManual(value){
    this.manual=Boolean(value);
    if(!this.manual){
      this.endDrag(false);this.flash=0;
      if(this.phase==='exploding'){this.phase='lost';this.impactAge=FRUIT_SLICE_RULES.impactDuration;}
      this.onCancel?.();
    }
    this.onParticipation?.();
  }
  beginDrag(x,y){
    if(!this.manual||this.phase!=='playing'||!Number.isFinite(x+y))return false;
    this.blade={x:fruitClamp(x,0,this.width),y:fruitClamp(y,0,this.height)};this.trail=[];
    this.addTrail(this.blade.x,this.blade.y);return true;
  }
  addTrail(x,y){this.trail.push({x,y,life:.2});if(this.trail.length>FRUIT_SLICE_RULES.trail)this.trail.shift();}
  movePlayer(x,y){
    if(!this.manual||this.phase!=='playing'||!this.blade||!Number.isFinite(x+y))return;
    x=fruitClamp(x,0,this.width);y=fruitClamp(y,0,this.height);
    const from=this.blade;if(Math.hypot(x-from.x,y-from.y)<3)return;
    this.blade={x,y};this.addTrail(x,y);
    const hits=this.entities.filter(e=>!e.dead&&fruitSegmentDistance(from.x,from.y,x,y,e.x,e.y)<=e.radius+3);
    const bomb=hits.find(e=>e.kind==='bomb');
    if(bomb)this.explode(bomb);
    else for(const fruit of hits){fruit.dead=true;this.stats.sliced++;this.burst(fruit,false);}
    this.entities=this.entities.filter(e=>!e.dead);
  }
  endDrag(release=false){this.blade=null;if(!release)this.trail=[];}
  resize(width,height=this.height){
    width=Math.max(240,width);height=Math.max(360,height);const sx=width/this.width,sy=height/this.height;
    for(const list of [this.entities,this.particles,this.rings])for(const e of list){e.x*=sx;e.y*=sy;}
    this.width=width;this.height=height;this.endDrag(false);
  }
  spawn(kind='fruit',type=Math.floor(this.random()*6)){
    if(this.phase!=='playing'||this.entities.length>=FRUIT_SLICE_RULES.entities)return;
    const radius=kind==='bomb'?34:26,x=38+this.random()*Math.max(1,this.width-76);
    this.entities.push({kind,type,x,y:this.height+radius+8,vx:(this.width*.5-x)*(.35+this.random()*.25)+(this.random()-.5)*90,
      vy:-(740+this.random()*215),radius,age:0,angle:this.random()*6.28,spin:(this.random()-.5)*3,dead:false});
    this.stats.spawned++;this.stats[kind==='bomb'?'bombSpawned':'fruitSpawned']++;
  }
  spawnWave(){
    if(this.phase!=='playing')return;
    const count=1+Math.floor(this.random()*4),bombSlot=count>1&&this.random()<.55?Math.floor(this.random()*count):-1;
    for(let i=0;i<count;i++)this.spawn(i===bombSlot?'bomb':'fruit');
  }
  burst(entity,bomb=false){
    const colors=bomb?['#fff4be','#ffb354','#ff658a','#ff8b49','#df9bff']:FRUIT_PALETTES[entity.type].slice(1,5);
    const count=bomb?96:28,overflow=this.particles.length+count-FRUIT_SLICE_RULES.particles;
    if(overflow>0)this.particles.splice(0,overflow);
    for(let i=0;i<count;i++){
      const angle=this.random()*Math.PI*2,speed=(bomb?100:55)+this.random()*(bomb?360:200),life=.48+this.random()*.55;
      this.particles.push({x:entity.x,y:entity.y,vx:Math.cos(angle)*speed+entity.vx*.12,
        vy:Math.sin(angle)*speed-50,life,maxLife:life,size:2+Math.floor(this.random()*(bomb?6:5)),color:colors[i%colors.length]});
    }
  }
  explode(bomb){
    if(this.phase!=='playing')return;
    this.phase='exploding';this.impactAge=0;this.endDrag(false);
    bomb.dead=true;this.stats.bombs++;let cleared=0;
    for(const fruit of this.entities)if(fruit.kind==='fruit'&&!fruit.dead){fruit.dead=true;cleared++;this.burst(fruit);}
    this.burst(bomb,true);this.lastClear=cleared;this.stats.sliced+=cleared;this.stats.chainFruit+=cleared;
    this.entities=[];this.flash=0;this.message=FRUIT_SLICE_RULES.impactDuration;
    this.rings.push({x:bomb.x,y:bomb.y,life:.5});
    if(this.rings.length>3)this.rings.shift();this.onExplosion?.({x:bomb.x,y:bomb.y,cleared});
  }
  advance(seconds){
    if(!Number.isFinite(seconds)||seconds<=0)return;
    let left=Math.min(seconds,.25);while(left>1e-8){const dt=Math.min(left,1/120);this.step(dt);left-=dt;}
  }
  step(dt){
    this.time+=dt;this.message=Math.max(0,this.message-dt);
    if(this.phase==='exploding'){
      this.impactAge+=dt;this.flash=fruitImpactFlash(this.impactAge);
      if(this.impactAge+1e-8>=FRUIT_SLICE_RULES.impactDuration){this.phase='lost';this.flash=0;this.onLose?.();}
    }
    if(this.phase==='playing'){
      this.spawnIn-=dt;if(this.spawnIn<=0){this.spawnWave();this.spawnIn=this.waveDelay();}
    }
    for(const e of this.entities){
      e.age+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt+.5*FRUIT_SLICE_RULES.gravity*dt*dt;e.vy+=FRUIT_SLICE_RULES.gravity*dt;e.angle+=e.spin*dt;
      if(e.age>6||(e.y>this.height+85&&e.vy>0)||e.x<-110||e.x>this.width+110){e.dead=true;if(this.manual&&e.kind==='fruit')this.stats.missed++;}
    }
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=430*dt;p.life-=dt;}
    for(const p of this.trail)p.life-=dt;for(const r of this.rings)r.life-=dt;
    this.entities=this.entities.filter(e=>!e.dead);this.particles=this.particles.filter(p=>p.life>0);
    this.trail=this.trail.filter(p=>p.life>0);this.rings=this.rings.filter(r=>r.life>0);
  }
}

const FRUIT_PALETTES=[
  ['','#ffb9da','#ff4f94','#b72467','#fff0f3','#65f7b0','#48274b'],
  ['','#ffe7a4','#ffa83e','#df6830','#fff8cf','#69e5a5','#6e3d48'],
  ['','#b7ffb2','#48dc94','#218e76','#e3ffdf','#285f5f','#ff80b8'],
  ['','#efffa8','#bbec56','#74ae47','#fffbd4','#64e8ba','#5a5f3e'],
  ['','#f2c4ff','#b478f4','#7145bc','#fff0ff','#69ecb3','#482354'],
  ['','#ffbfd9','#ff638e','#c52f68','#fff4c9','#75efa9','#6d234c']
];
const FRUIT_SPRITES=[
  ['000005500000000','000055556000000','000000660000000','000111611110000','001222122221000','012442222222100','012422222222100','122222222222210','122222222222210','123322222233210','012333223332100','001233333321000','000112221110000'],
  ['000000550000000','000005555000000','000011111110000','001122222221100','012244222222210','122442222222221','122222222222221','122222222222221','123322222223321','012332222233210','001233333332100','000112222211000','000001111100000'],
  ['000001111100000','000112222211000','001225225222100','012225225222210','122225225222221','122225225222221','122225225222221','122225225222221','122225225222221','012225225222210','001223333322100','000112222211000','000001111100000'],
  ['000000556000000','000005555000000','000000660000000','000001221000000','000012442100000','000012442100000','000122222210000','001222222221000','012222222222100','122222222222210','123322222233210','012333333332100','001122222211000','000011111100000'],
  ['000005555000000','000055556600000','000000660000000','000011011000000','000122122100000','001442244210000','000122122100000','001221221210000','012242242221000','001221221210000','000122122100000','000012221000000','000001110000000'],
  ['000055555550000','000005555500000','000111511111000','001222222222100','012242242242210','012222222222210','001224224224100','001222222222100','000122422421000','000012222210000','000001224100000','000000121000000','000000010000000']
];
const FRUIT_BOMB_SPRITE=[
  '00000003300000000','00000003430000000','00000033500000000','00000016610000000','00001111111110000',
  '00012222222221000','00122222222222100','01222222222222210','01222222222222210','12222222222222221',
  '12222222222222221','12222222222222221','01222222222222210','01222222222222210','00122222222222100','00012222222221000','00001111111110000'
];
function fruitSprite(ctx,rows,x,y,unit,colors){
  const left=x-rows[0].length*unit/2,top=y-rows.length*unit/2;
  ctx.globalAlpha=.16;ctx.fillStyle=colors[1];
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++)if(rows[row][col]!=='0')
    ctx.fillRect(Math.round(left+col*unit)-2,Math.round(top+row*unit)-2,unit+4,unit+4);
  ctx.globalAlpha=1;
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
    const color=colors[Number(rows[row][col])];if(!color)continue;ctx.fillStyle=color;ctx.fillRect(Math.round(left+col*unit),Math.round(top+row*unit),unit,unit);
  }
}
function fruitBladeStamp(ctx,a,b,width,color){
  const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/3));ctx.fillStyle=color;
  for(let i=0;i<=steps;i++){const t=i/steps;ctx.fillRect(Math.round(a.x+(b.x-a.x)*t-width/2),Math.round(a.y+(b.y-a.y)*t-width/2),width,width);}
}
export function paintFruitSlice(ctx,world){
  const w=world.width,h=world.height;
  ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;
  ctx.fillStyle='#090b1c';ctx.fillRect(0,0,w,h);ctx.fillStyle='#12132c';ctx.fillRect(0,h*.65,w,h*.35);
  ctx.fillStyle='#242443';for(let x=0;x<w;x+=56)ctx.fillRect(x,90,1,h-90);for(let y=100;y<h;y+=56)ctx.fillRect(0,y,w,1);
  for(let i=0;i<52;i++){ctx.fillStyle=i%3?'#54618c':'#9a6398';ctx.fillRect((i*139+29)%Math.ceil(w),70+(i*83)%Math.ceil(h-120),i%7===0?3:2,2);}
  ctx.fillStyle='#201a3b';for(let x=0;x<w;x+=24)ctx.fillRect(x,h-54-((x*13)%37),22,h);
  ctx.fillStyle='#16404d';ctx.fillRect(0,h-29,w,29);ctx.fillStyle='#77dce7';ctx.fillRect(0,h-30,w,2);
  for(let x=12;x<w;x+=50){ctx.fillStyle=x%3?'#b36ba7':'#6e85bd';ctx.fillRect(x,h-16,18,3);}
  ctx.fillStyle='#75d8eb';for(const x of [12,w-22]){ctx.fillRect(x,76,10,3);ctx.fillRect(x,h-95,10,3);ctx.fillRect(x,76,3,18);ctx.fillRect(x,h-110,3,18);}
  for(const e of world.entities){
    ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));
    if(e.kind==='bomb'){
      ctx.globalAlpha=.55+.25*Math.sin(world.time*5);ctx.strokeStyle='#ff9b55';ctx.lineWidth=2;ctx.strokeRect(-44,-45,88,90);ctx.globalAlpha=1;
      fruitSprite(ctx,FRUIT_BOMB_SPRITE,0,0,4,['','#ffc46b','#24182f','#ff7d52','#fff4be','#ff5c96','#9c5075']);
      ctx.fillStyle='#ff5c96';ctx.fillRect(-15,-3,30,22);ctx.fillStyle='#fff4be';ctx.fillRect(-2,-3,5,12);ctx.fillRect(-2,13,5,5);
      ctx.fillRect(-5,-43,3,6);ctx.fillRect(-12,-40,5,3);ctx.fillRect(4,-42,5,3);
      ctx.fillStyle='#ffd08a';ctx.font='10px "Neon Arcade Pixel", monospace';ctx.fillText('BOMB',-16,58);
    }else{ctx.rotate(Math.floor(e.angle/(Math.PI/2))*Math.PI/2);fruitSprite(ctx,FRUIT_SPRITES[e.type],0,0,4,FRUIT_PALETTES[e.type]);}
    ctx.restore();
  }
  for(const ring of world.rings){
    const radius=28+(1-ring.life/.5)*170;ctx.globalAlpha=ring.life/.5*.75;ctx.strokeStyle='#ffb354';ctx.lineWidth=4;
    ctx.strokeRect(Math.round(ring.x-radius),Math.round(ring.y-radius),radius*2,radius*2);
  }
  for(const p of world.particles){
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
  }
  for(let i=1;i<world.trail.length;i++){
    const a=world.trail[i-1],b=world.trail[i];ctx.globalAlpha=Math.min(a.life,b.life)/.2;
    fruitBladeStamp(ctx,a,b,9,'#36557f');fruitBladeStamp(ctx,a,b,4,'#b9faff');fruitBladeStamp(ctx,a,b,2,'#f5ffff');
  }
  ctx.globalAlpha=1;
  ctx.fillStyle='#e8e4ff';ctx.font='bold 18px "Microsoft YaHei", sans-serif';ctx.fillText('霓虹切水果',24,35);
  ctx.fillStyle='#b8c9df';ctx.font='12px "Microsoft YaHei", sans-serif';ctx.fillText(`切碎 ${world.stats.sliced}  ·  引爆 ${world.stats.bombs}`,24,57);
  if(world.message>0){ctx.fillStyle='#ffd08a';ctx.font='bold 20px "Microsoft YaHei", sans-serif';ctx.fillText(`BOOM!  清场 ${world.lastClear} 个水果`,Math.max(24,w/2-130),104);}
  if(world.manual){ctx.fillStyle='#b8c9df';ctx.font='12px "Microsoft YaHei", sans-serif';ctx.fillText('按住左键滑动切割 · 避开橙红警示炸弹',24,h-53);}
  if(world.phase==='lost'){ctx.globalAlpha=.65;ctx.fillStyle='#090b1c';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;}
  ctx.restore();
}
export function createFruitSliceBackground({doc,win,Game=FruitSlice}){
  let layer,owner;
  const clearFlash=()=>{layer?.remove();layer=undefined;owner=undefined;doc.documentElement.removeAttribute('data-na-fruit-impact');};
  return createAirBattleBackground({doc,win,Game,mode:'fruit',idleCursor:'crosshair',activeCursor:'crosshair',
    passiveHint:'霓虹切水果 · 避开炸弹',playingHint:'按住左键滑动切割 · Esc 退出',
    ariaLabel:'霓虹切水果操作区，按住鼠标左键滑动切水果，避开带警示框的炸弹，按 Esc 退出',
    paint(ctx,world){
      paintFruitSlice(ctx,world);
      if(owner===world){
        if(world.phase!=='exploding')clearFlash();
        else{
          layer.style.opacity=String(world.flash);
          doc.documentElement.toggleAttribute('data-na-fruit-impact',world.impactAge<FRUIT_SLICE_RULES.shakeDuration);
        }
      }
    },
    configureScene(scene,listen,escape){
      const result=doc.createElement('section');result.className='na-fruit-result';result.hidden=true;result.setAttribute('aria-label','本局结束');
      const title=doc.createElement('h2');title.textContent='YOU LOSE';
      const note=doc.createElement('p');note.textContent='切中炸弹 · 本局结束';
      const restart=doc.createElement('button');restart.type='button';restart.className='na-fruit-restart';restart.textContent='再来一局';
      result.appendChild(title);result.appendChild(note);result.appendChild(restart);scene.host.appendChild(result);scene.additionalControls=result;
      const syncResult=()=>{result.hidden=!(scene.playing&&scene.battle.phase==='lost');};
      scene.battle.onParticipation=syncResult;
      scene.battle.onLose=()=>{clearFlash();syncResult();if(scene.playing)restart.focus({preventScroll:true});};
      listen(restart,'keydown',escape);
      listen(restart,'click',()=>{if(scene.battle.restart()){syncResult();scene.canvas.focus({preventScroll:true});}});
      scene.battle.onExplosion=()=>{
        scene.cancelDrag();
        clearFlash();owner=scene.battle;layer=doc.createElement('div');layer.className='na-fruit-bomb-flash';
        layer.setAttribute('aria-hidden','true');layer.style.opacity='0';doc.body.appendChild(layer);
        doc.documentElement.setAttribute('data-na-fruit-impact','');
      };
      scene.battle.onCancel=()=>{if(owner===scene.battle)clearFlash();};
      scene.cleanups.push(()=>{if(owner===scene.battle)clearFlash();result.remove();scene.battle.onExplosion=undefined;scene.battle.onCancel=undefined;scene.battle.onLose=undefined;scene.battle.onParticipation=undefined;});
    }});
}
