import test from 'node:test';
import assert from 'node:assert/strict';
import {PigSling,PIG_SLING_RULES,paintPigSling,createPigSlingBackground} from '../src/pig-sling.mjs';
import {createAirBattleBackground} from '../src/air-battle.mjs';
import {fakeDom} from './dom-fixture.mjs';

function advance(w,seconds){for(let t=0;t<seconds-1e-9;t+=1/60)w.advance(Math.min(1/60,seconds-t));}
function emptyWorld(){const w=new PigSling();w.birds=[];w.spawnIn=1e6;w.setManual(true);return w;}
function aim(w,dx,dy){const a=w.anchor;assert.ok(w.beginDrag(a.x,a.y));w.movePlayer(a.x+dx,a.y+dy);}

test('sling accepts only its loaded pig and pull distance controls launch speed',()=>{
  const w=emptyWorld(),a=w.anchor;
  assert.equal(w.beginDrag(20,20),false);assert.equal(w.beginDrag(NaN,a.y),false);
  aim(w,0,20);const weak=w.launchVector();w.endDrag(false);assert.equal(w.stats.fired,0);
  aim(w,0,80);const strong=w.launchVector();assert.equal(strong.vy,weak.vy*4);
  w.movePlayer(-10000,10000);assert.ok(w.power<=1+1e-9);assert.ok(w.aim.x>=20 && w.aim.y<=w.groundY-20);
  w.endDrag(false);aim(w,1,1);assert.equal(w.endDrag(true),false);assert.equal(w.pigs.length,0);
  aim(w,-30,70);assert.ok(w.endDrag(true));assert.equal(w.stats.fired,1);assert.equal(w.ready,false);
  advance(w,.35);assert.equal(w.ready,true);
});

test('dotted trajectory and actual projectile use identical gravity and initial velocity',()=>{
  const w=emptyWorld();aim(w,-35,76);const preview=w.trajectory(),point=preview[7];assert.ok(preview.length>15);
  const launch=w.launchVector();w.endDrag(true);advance(w,point.t);
  assert.equal(w.pigs.length,1);const p=w.pigs[0];
  assert.ok(Math.abs(p.x-point.x)<1e-6);assert.ok(Math.abs(p.y-point.y)<1e-6);
  assert.ok(Math.abs(p.vy-(launch.vy+PIG_SLING_RULES.gravity*point.t))<1e-6);
});

test('hit pig shatters immediately; struck bird falls before shattering at the ground',()=>{
  const w=emptyWorld();
  w.birds=[{x:300,y:230,baseY:230,vx:-70,vy:0,type:0,radius:17,phase:0,amplitude:0,state:'flying',angle:0,dead:false}];
  w.pigs=[{x:290,y:230,vx:800,vy:0,radius:17,life:7,trail:[],trailIn:0}];
  w.advance(1/120);assert.equal(w.stats.hits,1);assert.equal(w.pigs.length,0);
  assert.equal(w.birds.length,1);assert.equal(w.birds[0].state,'falling');assert.equal(w.stats.landed,0);assert.ok(w.particles.length>=20);
  for(let n=0;n<300&&w.stats.landed===0;n++)w.advance(1/60);
  assert.equal(w.stats.landed,1);assert.equal(w.birds.length,0);
  assert.ok(w.particles.some(p=>Math.abs(p.y-w.groundY)<12));
});

test('pigs reload indefinitely and missed shots resolve at the ground',()=>{
  const w=emptyWorld();
  for(let i=0;i<30;i++){aim(w,0,35);assert.ok(w.endDrag(true));advance(w,2);assert.ok(w.ready);assert.equal(w.pigs.length,0);}
  assert.equal(w.stats.fired,30);assert.equal(w.stats.misses,30);
});

test('five bird silhouettes fly from both sides, reverse and keep simulation resources bounded',()=>{
  const w=new PigSling({seed:18});assert.equal(new Set(w.birds.map(b=>b.type)).size,5);
  assert.ok(w.birds.some(b=>b.vx>0)&&w.birds.some(b=>b.vx<0));w.setManual(true);
  for(let frame=0;frame<180*30;frame++){
    if(frame%13===0 && w.ready){aim(w,Math.sin(frame)*60,70);w.endDrag(true);}
    w.advance(1/30);
    assert.ok(w.birds.length<=PIG_SLING_RULES.birds && w.pigs.length<=PIG_SLING_RULES.pigs && w.particles.length<=PIG_SLING_RULES.particles);
    for(const list of [w.birds,w.pigs,w.particles])for(const e of list)assert.ok(Number.isFinite(e.x+e.y));
  }
  assert.ok(w.stats.turns>20);assert.ok(w.stats.fired>100);assert.ok(w.stats.spawned>10);assert.ok(w.stats.hits>0);
});

test('resize and leaving participation cancel a loaded drag without firing',()=>{
  const w=emptyWorld();aim(w,-20,65);w.resize(360,720);assert.equal(w.aim,null);assert.equal(w.stats.fired,0);
  aim(w,0,65);w.setManual(false);assert.equal(w.aim,null);assert.equal(w.endDrag(true),false);
});

test('native pointer release launches once; cancellation, Esc and hidden windows cancel aim and clean up',()=>{
  const d=fakeDom();let world;
  class TrackedPig extends PigSling{constructor(options){super(options);world=this;}}
  const runtime=createAirBattleBackground({...d,Game:TrackedPig,paint:paintPigSling,mode:'pigs'});runtime.setEnabled(true);
  const [canvas,controls]=d.host.children,button=controls.children[1];button.dispatch('click');
  const at=(x,y)=>({clientX:x+100,clientY:y+50}),a=world.anchor;
  canvas.dispatch('pointerdown',at(a.x,a.y));canvas.dispatch('pointermove',{...at(a.x-28,a.y+70),buttons:1,pointerType:'mouse'});
  assert.ok(world.trajectory().length>0);assert.equal(canvas.captured,7);
  canvas.dispatch('pointerup',at(a.x-28,a.y+70));assert.equal(world.stats.fired,1);assert.equal(canvas.captured,null);
  advance(world,.4);canvas.dispatch('pointerdown',at(a.x,a.y));canvas.dispatch('pointermove',{...at(a.x,a.y+70),buttons:1});canvas.dispatch('pointercancel');
  assert.equal(world.aim,null);assert.equal(world.stats.fired,1);
  canvas.dispatch('pointerdown',at(a.x,a.y));canvas.dispatch('pointermove',{...at(a.x,a.y+60),buttons:1});canvas.dispatch('keydown',{key:'Escape'});
  assert.equal(world.aim,null);assert.equal(world.stats.fired,1);assert.equal(world.manual,false);
  button.dispatch('click');canvas.dispatch('pointerdown',at(a.x,a.y));d.doc.hidden=true;d.documentEvents.get('visibilitychange')();
  assert.equal(world.aim,null);assert.equal(canvas.captured,null);assert.equal(d.callbacks.size,0);
  runtime.dispose();assert.equal(d.host.children.length,0);assert.equal(canvas.events.size,0);assert.equal(d.documentEvents.size,0);
});

test('pig-game factory mounts its canvas and removes all animation resources when disabled',()=>{
  const d=fakeDom(),r=createPigSlingBackground(d);r.setEnabled(true);
  assert.ok(d.host.children[0].className.includes('na-pig-sling'));assert.ok(d.host.children[0].attributes['aria-label'].includes('弹弓'));
  d.frame(0);d.frame(40);assert.ok(d.paints()>50);r.setEnabled(false);
  assert.equal(d.host.children.length,0);assert.equal(d.callbacks.size,0);assert.ok(d.observers.every(o=>o.disconnected));
});

test('day/night button defaults to neon night, preserves gameplay and releases all listeners',()=>{
  const d=fakeDom(),changes=[],r=createPigSlingBackground({...d,onNightChange:value=>changes.push(value)});r.setEnabled(true);
  const [canvas,controls]=d.host.children,join=controls.children[1],time=controls.children[2];
  assert.equal(time.textContent,'切换白天');assert.equal(controls.attributes['data-na-night'],'');
  join.dispatch('click');canvas.dispatch('pointerdown',{clientX:580,clientY:594});
  canvas.dispatch('pointermove',{clientX:550,clientY:660,buttons:1});
  time.dispatch('click');assert.deepEqual(changes,[false]);assert.equal(time.textContent,'切换夜晚');
  assert.equal(controls.attributes['data-na-night'],undefined);assert.equal(d.host.attributes['data-na-playing'],'');
  assert.equal(canvas.captured,7);assert.equal(d.host.children[0],canvas,'switch must not replace the simulation');
  r.setNight(true);assert.equal(time.textContent,'切换白天');assert.deepEqual(changes,[false],'external preference sync must not notify recursively');
  time.dispatch('keydown',{key:'Escape'});assert.equal(canvas.captured,null);assert.equal(d.host.attributes['data-na-playing'],undefined);
  r.setEnabled(false);assert.equal(time.events.size,0);r.setNight(false);r.setEnabled(true);
  assert.equal(d.host.children[1].children[2].textContent,'切换夜晚');r.dispose();assert.equal(d.host.children.length,0);
});

test('night palette keeps every bird silhouette and pig readable against sky and clouds',()=>{
  const colorsFor=(night,type,pig=false)=>{
    const w=emptyWorld();w.night=night;w.manual=false;w.birds=[];w.pigs=[];
    if(!pig){w.reload=10;w.birds=[{x:300,y:200,type,vx:1,phase:0,state:'flying'}];}
    const fills=[];let color,origin={x:0,y:0};
    const ctx={canvas:{width:960,height:720},save(){},restore(){},setTransform(){},rotate(){},translate(x,y){origin={x,y};},
      set fillStyle(value){color=value;},fillText(){},fillRect(x,y,width,height){fills.push({color,x:x+origin.x,y:y+origin.y,width,height});}};
    paintPigSling(ctx,w);return fills;
  };
  function luminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
  for(let type=0;type<5;type++){
    const fills=colorsFor(true,type),sprite=fills.filter(p=>p.width===3&&p.height===3&&p.x>270&&p.x<330&&p.y>170&&p.y<230);
    assert.ok(sprite.length>50);
    const outlines=['#ffe8a3','#b4f6ff','#e8bbff','#ffc0e9','#9dffe1'];assert.ok(sprite.some(p=>p.color===outlines[type]));
    assert.ok((luminance(outlines[type])+.05)/(luminance('#303453')+.05)>7,'bird edge must contrast even against night clouds');
  }
  const night=colorsFor(true,0,true),day=colorsFor(false,0,true);
  assert.equal(night[0].color,'#0b0a18');assert.equal(day[0].color,'#87c9e8');
  assert.ok(night.some(p=>p.color==='#c3ff92'&&p.width===3&&p.height===3));
  assert.ok(night.some(p=>p.color==='#102039'),'pig eyes remain dark and distinct');
});
