import test from 'node:test';
import assert from 'node:assert/strict';
import {AirBattle, AIR_BATTLE_LIMITS, paintAirBattle, createAirBattleBackground} from '../src/air-battle.mjs';

function advance(world, seconds) { for(let elapsed=0; elapsed<seconds-1e-6; elapsed+=1/30) world.advance(1/30); }

test('continuous enemy waves and mutual fire stay bounded during a three-minute run',()=>{
  const world=new AirBattle({seed:42});
  for(let frame=0;frame<180*30;frame++){
    world.advance(1/30);
    if(frame%30===0){
      assert.ok(world.enemies.length<=AIR_BATTLE_LIMITS.enemies);
      assert.ok(world.playerShots.length<=AIR_BATTLE_LIMITS.playerShots);
      assert.ok(world.enemyShots.length<=AIR_BATTLE_LIMITS.enemyShots);
      assert.ok(world.particles.length<=AIR_BATTLE_LIMITS.particles);
      for(const entity of [...world.enemies,...world.playerShots,...world.enemyShots]) assert.ok(Number.isFinite(entity.x)&&Number.isFinite(entity.y));
    }
  }
  assert.ok(world.stats.spawned>150);
  assert.ok(world.stats.playerShots>500);
  assert.ok(world.stats.enemyShots>100);
  assert.ok(world.stats.destroyed>0);
});
test('friendly bullets destroy enemies through actual collision',()=>{
  const w=new AirBattle({seed:10});
  const x=w.player.x, y=250;
  w.enemies=[{x,baseX:x,y,speed:0,amplitude:0,frequency:1,phase:0,fireIn:10,type:0,radius:13}];
  w.playerShots=[{x,y:y+28,vx:0,vy:-510,life:2}];
  w.advance(.08);
  assert.equal(w.stats.destroyed,1);assert.equal(w.enemies.length,0);assert.ok(w.particles.length>0);
});
test('enemy bullet hits repeatedly trigger death and unlimited automatic respawn',()=>{
  const w=new AirBattle({seed:80});
  for(let cycle=0;cycle<12;cycle++){
    w.player.invulnerable=0;
    w.enemyShots=[{x:w.player.x,y:w.player.y,vx:0,vy:0,life:1}];
    w.advance(1/120);
    assert.equal(w.player.alive,false);
    advance(w,1);
    assert.equal(w.player.alive,true);
    assert.ok(w.player.invulnerable>0);
    assert.equal(w.stats.respawns,cycle+1);
  }
  assert.equal(w.stats.hits,12);
});
test('canvas resize retains world state and finite coordinates',()=>{
  const w=new AirBattle({seed:22});advance(w,3);
  const time=w.time, count=w.enemies.length, shots=w.stats.playerShots;
  w.resize(420,720);
  assert.equal(w.time,time);assert.equal(w.enemies.length,count);assert.equal(w.stats.playerShots,shots);
  advance(w,1);
  assert.ok(w.player.x>=22 && w.player.x<=398);
});
test('manual dragging overrides autopilot, clamps boundaries, keeps firing and survives respawn',()=>{
  const w=new AirBattle({seed:55});
  w.movePlayer(100,400);assert.notEqual(w.player.x,100);
  w.setManual(true);w.movePlayer(180,440);advance(w,.5);
  assert.equal(w.player.x,180);assert.equal(w.player.y,440);assert.ok(w.stats.playerShots>0);
  w.movePlayer(-200,2000);assert.equal(w.player.x,22);assert.equal(w.player.y,690);
  w.movePlayer(180,440);w.player.invulnerable=0;w.hitPlayer();advance(w,1);
  assert.equal(w.player.alive,true);assert.equal(w.manual,true);assert.equal(w.player.x,180);assert.equal(w.player.y,440);
  w.resize(240,360);assert.ok(w.player.x>=22 && w.player.x<=218);assert.ok(w.player.y>=30 && w.player.y<=330);
  w.setManual(false);const x=w.player.x;advance(w,2);
  assert.equal(w.manual,false);assert.notEqual(w.player.x,x);assert.ok(w.player.y>260);
});

function fakeDom(){
  const callbacks=new Map(), documentEvents=new Map(), windowEvents=new Map(), observers=[];
  let serial=0, paints=0;
  const element=tag=>({tag,children:[],attributes:{},events:new Map(),style:{},isConnected:true,textContent:'',
    setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
    toggleAttribute(k,on){if(on)this.setAttribute(k,'');else this.removeAttribute(k);},
    addEventListener(k,fn){this.events.set(k,fn);},removeEventListener(k){this.events.delete(k);},
    appendChild(node){this.children.push(node);node.parent=this;},
    contains(node){return node===this || this.children.some(child=>child.contains(node));},
    getBoundingClientRect(){return this.parent?.getBoundingClientRect()??{left:100,top:50,width:960,height:720};},
    focus(){doc.activeElement=this;},
    setPointerCapture(id){this.captured=id;},hasPointerCapture(id){return this.captured===id;},releasePointerCapture(){this.captured=null;},
    dispatch(name,detail={}){const event={button:0,pointerId:7,isPrimary:true,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...detail};this.events.get(name)?.(event);return event;},
    remove(){this.isConnected=false;const i=this.parent?.children.indexOf(this);if(i>=0)this.parent.children.splice(i,1);}
  });
  const host=element('div');
  const doc={hidden:false,body:{hasAttribute:()=>true},querySelectorAll:()=>[host],
    addEventListener:(name,fn)=>documentEvents.set(name,fn),removeEventListener:name=>documentEvents.delete(name),
    createElement(tag){const node=element(tag);
      if(tag==='canvas'){node.width=0;node.height=0;const ctx={canvas:node,save(){},restore(){},setTransform(){},fillRect(){paints++;},strokeRect(){}};node.getContext=()=>ctx;}
      return node;}
  };
  class Observer{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(){}unobserve(){}disconnect(){this.disconnected=true;}}
  const win={requestAnimationFrame:fn=>{const id=++serial;callbacks.set(id,fn);return id;},cancelAnimationFrame:id=>callbacks.delete(id),
    ResizeObserver:Observer,MutationObserver:Observer,addEventListener:(k,fn)=>windowEvents.set(k,fn),removeEventListener:k=>windowEvents.delete(k)};
  const frame=now=>{const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn(now);};
  return {doc,win,host,callbacks,documentEvents,windowEvents,observers,frame,paints:()=>paints};
}
test('disabled mode owns no animation; enabling, hiding, disabling and disposal release all resources',()=>{
  const d=fakeDom(), runtime=createAirBattleBackground(d);
  assert.equal(d.host.children.length,0);assert.equal(d.callbacks.size,0);assert.equal(d.observers.length,0);
  runtime.setEnabled(true);
  assert.equal(d.host.children.length,2);assert.equal(d.host.children[0].attributes['aria-hidden'],'true');
  assert.equal(d.callbacks.size,1);
  d.frame(0);d.frame(34);d.frame(68);assert.ok(d.paints()>0);assert.equal(d.callbacks.size,1);
  assert.ok(!d.documentEvents.has('keydown'));assert.ok(!d.windowEvents.has('pointermove'));
  d.doc.hidden=true;d.documentEvents.get('visibilitychange')();assert.equal(d.callbacks.size,0);
  d.doc.hidden=false;d.documentEvents.get('visibilitychange')();assert.equal(d.callbacks.size,1);
  runtime.setEnabled(false);
  assert.equal(d.host.children.length,0);assert.equal(d.callbacks.size,0);
  assert.equal(d.documentEvents.size,0);assert.equal(d.windowEvents.size,0);
  assert.ok(d.observers.every(o=>o.disconnected));
  runtime.setEnabled(true);assert.equal(d.host.children.length,2);
  runtime.dispose();runtime.setEnabled(true);
  assert.equal(d.host.children.length,0);assert.equal(d.callbacks.size,0);
});
test('participation gates pointer capture; Esc, blur and disabling restore passive mode and release listeners',()=>{
  const d=fakeDom(), runtime=createAirBattleBackground(d), editor=d.doc.createElement('textarea');d.doc.activeElement=editor;
  runtime.setEnabled(true);
  const [canvas,controls]=d.host.children, [hint,button]=controls.children;
  const ignored=canvas.dispatch('pointerdown',{clientX:300,clientY:500});assert.ok(!ignored.prevented);assert.equal(canvas.captured,undefined);
  button.dispatch('pointerdown');button.dispatch('click');
  assert.equal(d.host.attributes['data-na-playing'],'');assert.equal(button.textContent,'退出参与');assert.equal(canvas.attributes['aria-hidden'],'false');assert.equal(d.doc.activeElement,canvas);
  const down=canvas.dispatch('pointerdown',{clientX:300,clientY:500});assert.ok(down.prevented);assert.equal(canvas.captured,7);assert.equal(canvas.style.cursor,'grabbing');
  canvas.dispatch('pointermove',{clientX:700,clientY:450,buttons:1,pointerType:'mouse'});
  canvas.dispatch('pointercancel');assert.equal(canvas.captured,null);assert.equal(canvas.style.cursor,'grab');
  canvas.dispatch('keydown',{key:'Escape'});
  assert.equal(d.host.attributes['data-na-playing'],undefined);assert.equal(canvas.attributes['aria-hidden'],'true');assert.equal(button.textContent,'参与游戏');assert.equal(d.doc.activeElement,editor);
  button.dispatch('click');canvas.dispatch('blur',{relatedTarget:editor});assert.equal(button.textContent,'参与游戏');
  button.dispatch('click');canvas.dispatch('pointerdown',{clientX:300,clientY:500});
  runtime.setEnabled(false);
  assert.equal(canvas.captured,null);assert.equal(d.host.children.length,0);assert.equal(canvas.events.size,0);assert.equal(button.events.size,0);assert.equal(d.callbacks.size,0);assert.equal(d.host.attributes['data-na-playing'],undefined);
});
test('renderer supports both palettes without an external image or font',()=>{
  const d=fakeDom(), canvas=d.doc.createElement('canvas');canvas.width=960;canvas.height=720;
  const w=new AirBattle();advance(w,1);
  paintAirBattle(canvas.getContext('2d'),w,true);paintAirBattle(canvas.getContext('2d'),w,false);
  assert.ok(d.paints()>0);
});
