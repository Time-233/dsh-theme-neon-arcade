import test from 'node:test';
import assert from 'node:assert/strict';
import {FruitSlice,FRUIT_SLICE_RULES,createFruitSliceBackground} from '../src/fruit-slice.mjs';
import {fakeDom} from './dom-fixture.mjs';
const item=(kind,x,y,type=0)=>({kind,x,y,type,vx:0,vy:0,radius:kind==='bomb'?30:26,age:0,angle:0,spin:0,dead:false});
function world(){const w=new FruitSlice();w.entities=[];w.spawnIn=1e6;w.setManual(true);return w;}
function advance(w,seconds){for(let t=0;t<seconds-1e-9;t+=1/60)w.advance(Math.min(1/60,seconds-t));}

test('only a held moving blade cuts; fast segments slice each fruit once',()=>{
  const w=world();w.entities=[item('fruit',300,250),item('fruit',500,250,2)];
  w.movePlayer(500,250);assert.equal(w.stats.sliced,0);
  w.beginDrag(300,250);w.movePlayer(300,250);advance(w,.02);assert.equal(w.stats.sliced,0,'clicking or holding still must not cut');
  w.endDrag();w.beginDrag(100,250);w.movePlayer(700,250);
  assert.equal(w.stats.sliced,2);assert.equal(w.entities.length,0);assert.equal(w.particles.length,56);
  w.movePlayer(100,250);assert.equal(w.stats.sliced,2);w.endDrag(true);
  w.entities=[item('fruit',400,250)];w.movePlayer(700,250);assert.equal(w.entities.length,1);
});
test('cut bomb bursts immediately and every on-screen fruit becomes colored particles',()=>{
  const w=world();let blast;w.onExplosion=value=>blast=value;
  w.entities=[item('bomb',400,260),...Array.from({length:6},(_,i)=>item('fruit',100+i*130,450,i))];
  w.beginDrag(320,260);w.movePlayer(480,260);
  assert.equal(w.entities.length,0);assert.equal(w.stats.bombs,1);assert.equal(w.stats.sliced,6);assert.equal(w.stats.chainFruit,6);
  assert.equal(blast.cleared,6);assert.equal(w.phase,'exploding');assert.equal(w.particles.length,264);
  for(let i=0;i<6;i++)assert.ok(w.particles.some(p=>p.x===100+i*130&&p.y===450),'every fruit has its own impact origin');
  assert.ok(w.particles.some(p=>p.color==='#fff4be'),'bomb spark palette');
  advance(w,.37);assert.equal(w.flash,0);assert.ok(w.particles.length>0);advance(w,1.5);assert.equal(w.particles.length,0);assert.equal(w.phase,'lost');
});
test('a bomb stops spawning and cutting, flashes exactly twice, then loses until explicit restart',()=>{
  const w=world();w.entities=[item('bomb',300,250),item('bomb',600,250),item('fruit',500,420)];
  let explosions=0,losses=0;w.onExplosion=()=>explosions++;w.onLose=()=>losses++;w.beginDrag(100,250);w.movePlayer(800,250);
  assert.equal(w.stats.bombs,1);assert.equal(explosions,1);assert.equal(w.entities.length,0);assert.equal(w.beginDrag(20,20),false);assert.equal(w.restart(),false);
  const spawned=w.stats.spawned;let peaks=0,bright=false;
  for(let t=0;t<1.2;t+=1/120){w.advance(1/120);const on=w.flash>.8;if(on&&!bright)peaks++;bright=on;}
  assert.equal(peaks,2);assert.equal(losses,1);assert.equal(w.phase,'lost');assert.equal(w.flash,0);
  w.spawnIn=0;advance(w,10);w.spawnWave();w.movePlayer(100,250);assert.equal(w.stats.spawned,spawned);assert.equal(w.entities.length,0);assert.equal(explosions,1);
  assert.equal(w.restart(),true);assert.equal(w.phase,'playing');assert.equal(w.stats.bombs,0);assert.equal(w.stats.sliced,0);assert.ok(w.entities.length>=1&&w.entities.length<=4);
  assert.ok(w.spawnIn>=2.6&&w.spawnIn<=3.8);assert.equal(w.restart(),false);assert.equal(w.beginDrag(20,20),true);
});
test('ballistic tosses rise from below and fall under gravity; missed objects are cleared',()=>{
  const w=world();w.spawn('fruit',1);const p=w.entities[0],x=p.x,y=p.y,vx=p.vx,vy=p.vy;
  assert.ok(p.y>w.height&&vy<0);advance(w,.5);
  assert.ok(Math.abs(p.x-x-vx*.5)<1e-6);assert.ok(Math.abs(p.y-y-vy*.5-.5*FRUIT_SLICE_RULES.gravity*.25)<1e-6);
  advance(w,5);assert.equal(w.entities.length,0);assert.equal(w.stats.missed,1);
});
test('each wave has one to four total objects including bombs, with a slow randomized interval',()=>{
  const w=new FruitSlice({seed:19});let previous=w.stats.spawned,last=0,waves=0;const sizes=new Set([w.entities.length]);
  for(let t=0;t<90;t+=1/60){
    w.advance(1/60);
    if(w.stats.spawned!==previous){const size=w.stats.spawned-previous;assert.ok(size>=1&&size<=4);sizes.add(size);
      assert.ok(w.time-last>=FRUIT_SLICE_RULES.waveMin-1/60&&w.time-last<=FRUIT_SLICE_RULES.waveMax+1/60);
      previous=w.stats.spawned;last=w.time;waves++;}
  }
  assert.deepEqual([...sizes].sort(),[1,2,3,4]);assert.ok(waves>=23&&waves<=35);assert.ok(w.stats.bombSpawned>0);
});
test('random waves include six fruits and bombs and stay bounded during three minutes of slicing and restarting',()=>{
  const w=new FruitSlice({seed:7});w.setManual(true);const types=new Set();
  let sliced=false,bombs=false;
  for(let frame=0;frame<180*30;frame++){
    for(const e of w.entities)if(e.kind==='fruit')types.add(e.type);
    if(frame%9===0){w.beginDrag(0,100+(frame%430));w.movePlayer(w.width,100+(frame%430));w.endDrag(true);}
    sliced ||= w.stats.sliced>0;bombs ||= w.stats.bombs>0;
    if(w.phase==='lost')w.restart();
    w.advance(1/30);assert.ok(w.entities.length<=FRUIT_SLICE_RULES.entities&&w.particles.length<=FRUIT_SLICE_RULES.particles&&w.trail.length<=FRUIT_SLICE_RULES.trail);
    for(const list of [w.entities,w.particles,w.trail])for(const p of list)assert.ok(Number.isFinite(p.x+p.y));
  }
  assert.equal(types.size,6);assert.ok(sliced&&bombs);
});
test('resize and leaving participation cancel the blade without cutting',()=>{
  const w=world();w.entities=[item('fruit',300,200)];w.beginDrag(10,200);w.resize(480,720);w.movePlayer(470,200);
  assert.equal(w.blade,null);assert.equal(w.stats.sliced,0);assert.equal(w.entities[0].x,150);
  w.beginDrag(10,200);w.setManual(false);w.movePlayer(470,200);assert.equal(w.stats.sliced,0);assert.equal(w.trail.length,0);
});
test('real controls release capture on impact, show YOU LOSE after two flashes and allow a clean restart',()=>{
  const d=fakeDom();let w;class Tracked extends FruitSlice{constructor(options){super(options);w=this;}}
  const editor=d.doc.createElement('textarea');editor.focus();
  const r=createFruitSliceBackground({...d,Game:Tracked});r.setEnabled(true);
  const [canvas,controls]=d.host.children;assert.ok(canvas.className.includes('na-fruit-slice'));assert.equal(controls.children.length,2,'fruit mode has no day/night button');
  controls.children[1].dispatch('click');assert.equal(canvas.style.cursor,'crosshair');w.spawnIn=1e6;
  w.entities=[item('bomb',400,250),item('fruit',700,400)];
  canvas.dispatch('pointerdown',{clientX:200,clientY:300});canvas.dispatch('pointermove',{clientX:800,clientY:300,buttons:1,pointerType:'mouse'});
  assert.equal(w.stats.bombs,1);assert.equal(w.entities.length,0);assert.equal(d.doc.body.children.length,1);assert.equal(canvas.captured,null);
  const flash=d.doc.body.children[0];assert.equal(flash.className,'na-fruit-bomb-flash');assert.equal(flash.attributes['aria-hidden'],'true');
  const result=d.host.children[2],restart=result.children[2];assert.equal(result.hidden,true);assert.equal(d.doc.documentElement.attributes['data-na-fruit-impact'],'');
  let bright=false,peaks=0;for(let now=0;now<=1160;now+=40){d.frame(now);const on=Number(flash.style.opacity)>.8;if(on&&!bright)peaks++;bright=on;}
  assert.equal(peaks,2);assert.equal(d.doc.body.children.length,0);assert.equal(d.doc.documentElement.attributes['data-na-fruit-impact'],undefined);
  assert.equal(result.hidden,false);assert.equal(result.children[0].textContent,'YOU LOSE');assert.equal(d.doc.activeElement,restart);
  restart.dispatch('click');assert.equal(result.hidden,true);assert.equal(w.phase,'playing');assert.equal(w.stats.bombs,0);assert.equal(d.doc.activeElement,canvas);
  w.entities=[item('bomb',400,250)];canvas.dispatch('pointerdown',{clientX:200,clientY:300});canvas.dispatch('pointermove',{clientX:800,clientY:300,buttons:1});
  assert.equal(d.doc.body.children.length,1);canvas.dispatch('keydown',{key:'Escape'});
  assert.equal(w.blade,null);assert.equal(d.doc.body.children.length,0);assert.equal(canvas.captured,null);assert.equal(result.hidden,true);assert.equal(d.doc.documentElement.attributes['data-na-fruit-impact'],undefined);
  r.dispose();assert.equal(d.host.children.length,0);assert.equal(canvas.events.size,0);assert.equal(restart.events.size,0);assert.equal(d.callbacks.size,0);assert.equal(d.documentEvents.size,0);
});

test('disabling while the loss button has focus restores the chat editor and removes result controls',()=>{
  const d=fakeDom();let w;class Tracked extends FruitSlice{constructor(options){super(options);w=this;}}
  const editor=d.doc.createElement('textarea');editor.focus();const r=createFruitSliceBackground({...d,Game:Tracked});r.setEnabled(true);
  d.host.children[1].children[1].dispatch('click');w.explode(item('bomb',300,250));advance(w,1.1);
  assert.equal(d.doc.activeElement,d.host.children[2].children[2]);r.setEnabled(false);
  assert.equal(d.doc.activeElement,editor);assert.equal(d.host.children.length,0);assert.equal(d.doc.body.children.length,0);
});
