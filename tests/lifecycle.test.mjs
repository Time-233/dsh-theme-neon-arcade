import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {tokens, dark} from '../src/palette.mjs';

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
function boot({runtime='desktop', stored=null, storageError=false}={}) {
  let plugin, saved=stored;
  const attrs=new Set(), styles=[], cleanups=[], slots=new Map(), layers=new Map();
  const React={createElement:(type,props,...children)=>({type,props:props??{},children}),useSyncExternalStore:(_s,get)=>get()};
  const root={toggleAttribute:(k,on)=>on?attrs.add(k):attrs.delete(k),removeAttribute:k=>attrs.delete(k)};
  const sandbox={window:{__ModuleLoader__:{load: d=>{plugin=d.factory(name=>{
    if(name==='react') return React;
    if(name==='@deepseek-ai/dsh-client-ui-primitives') return {FishLogo:()=>null};
    throw Error(name);
  });}}},document:{documentElement:root,querySelectorAll:()=>[],createElement:()=>({dataset:{},remove(){styles.splice(styles.indexOf(this),1);}}),head:{appendChild:t=>styles.push(t)}},
  localStorage:{getItem:()=>{if(storageError)throw Error('denied');return saved;},setItem:(_k,v)=>{if(storageError)throw Error('denied');saved=v;}}};
  vm.runInNewContext(source,sandbox);
  const ctx={shortcuts:{runtime},theme:{overrideTokens:(id,value)=>{
    assert.equal(layers.size,0,'theme activation must not leak stacked layers');
    layers.set(id,value); return ()=>layers.delete(id);
  }},effect:fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);},slots:{
    inject:(_name,fn)=>fn(),register:(meta,component)=>{slots.set(meta.name,component);return ()=>slots.delete(meta.name);}
  }};
  plugin.apply(ctx);
  const switches=()=>slots.get('settings.general.item')().children[1].children;
  const control=label=>switches().find(row=>row.children[1].props['aria-label']===label).children[1];
  return {attrs,styles,slots,layers,saved:()=>saved,switches,control,dispose:()=>cleanups.reverse().forEach(f=>f())};
}

test('HTTP/Web runtime is untouched',()=>{
  const a=boot({runtime:'web'});
  assert.equal(a.attrs.size,0);assert.equal(a.layers.size,0);assert.equal(a.styles.length,0);assert.equal(a.slots.size,0);
});
test('desktop activation, controls, persistence, complete teardown',()=>{
  const a=boot();
  assert.equal(a.layers.size,1);assert.equal(a.styles.length,1);
  assert.ok(a.attrs.has('data-neon-arcade-grid'));assert.ok(!a.attrs.has('data-neon-arcade-scanlines'));
  a.control('CRT 扫描线').props.onClick();
  assert.ok(a.attrs.has('data-neon-arcade-scanlines'));
  a.control('启用霓虹像素主题').props.onClick();
  assert.equal(a.layers.size,0);assert.equal(a.attrs.size,0);
  assert.ok(a.control('霓虹辉光').props.disabled);
  assert.equal(JSON.parse(a.saved()).enabled,false);
  a.control('启用霓虹像素主题').props.onClick();
  assert.equal(a.layers.size,1);assert.ok(a.attrs.has('data-neon-arcade-scanlines'));
  a.dispose();assert.equal(a.layers.size,0);assert.equal(a.attrs.size,0);assert.equal(a.styles.length,0);
});
test('reload restores options; malformed or blocked storage is tolerated',()=>{
  const a=boot({stored:JSON.stringify({enabled:true,glow:false,grid:false,scanlines:true})});
  assert.ok(!a.attrs.has('data-neon-arcade-glow'));assert.ok(!a.attrs.has('data-neon-arcade-grid'));assert.ok(a.attrs.has('data-neon-arcade-scanlines'));
  a.dispose();
  for(const opts of [{stored:'{broken'},{stored:JSON.stringify({enabled:'false',grid:[]})},{storageError:true}]){
    const b=boot(opts);assert.equal(b.layers.size,1);b.control('启用霓虹像素主题').props.onClick();assert.equal(b.layers.size,0);b.dispose();
  }
});
test('game is opt-in, restores original scene preferences, and follows the theme master switch',()=>{
  const original={enabled:true,glow:false,grid:true,scanlines:true,decorations:true};
  const a=boot({stored:JSON.stringify(original)});
  assert.ok(!a.attrs.has('data-neon-arcade-game'));
  a.control('启用小游戏背景').props.onClick();
  assert.ok(a.attrs.has('data-neon-arcade-game'));
  for(const [key,value] of Object.entries(original)) assert.equal(JSON.parse(a.saved())[key],value);
  a.control('启用霓虹像素主题').props.onClick();
  assert.equal(a.attrs.size,0);
  a.control('启用霓虹像素主题').props.onClick();
  assert.ok(a.attrs.has('data-neon-arcade-game'));
  a.control('启用小游戏背景').props.onClick();
  assert.ok(!a.attrs.has('data-neon-arcade-game'));
  assert.ok(a.attrs.has('data-neon-arcade-decorations'));
  assert.ok(a.attrs.has('data-neon-arcade-grid'));
  assert.ok(a.attrs.has('data-neon-arcade-scanlines'));
  a.dispose();assert.equal(a.attrs.size,0);
});
test('1.0 preferences gain independent arcade decorations without losing existing choices',()=>{
  const oldPreferences={enabled:true,glow:false,grid:false,scanlines:false};
  const a=boot({stored:JSON.stringify(oldPreferences)});
  assert.ok(a.attrs.has('data-neon-arcade-decorations'));
  assert.ok(!a.attrs.has('data-neon-arcade-grid'));
  assert.ok(!a.attrs.has('data-neon-arcade-glow'));
  const decorationSwitch=a.switches().find(row=>row.children[1].props['aria-label']==='像素街机点缀');
  decorationSwitch.children[1].props.onClick();
  assert.ok(!a.attrs.has('data-neon-arcade-decorations'));
  assert.ok(a.attrs.has('data-neon-arcade'));
  const saved=JSON.parse(a.saved());
  assert.equal(saved.decorations,false);
  for(const [key,value] of Object.entries(oldPreferences)) assert.equal(saved[key],value);
  const b=boot({stored:a.saved()});
  assert.ok(!b.attrs.has('data-neon-arcade-decorations'));
  a.dispose();b.dispose();assert.equal(a.attrs.size,0);assert.equal(b.attrs.size,0);
});
test('game picker migrates old preferences, persists pig mode and rejects unknown games',()=>{
  const a=boot({stored:JSON.stringify({enabled:true,game:true,glow:false})});
  assert.equal(a.control('游戏选择').props.value,'air');
  a.control('游戏选择').props.onChange({target:{value:'pigs'}});
  assert.equal(a.control('游戏选择').props.value,'pigs');
  assert.equal(JSON.parse(a.saved()).gameKind,'pigs');assert.equal(JSON.parse(a.saved()).game,true);
  assert.equal(JSON.parse(a.saved()).glow,false);
  a.control('游戏选择').props.onChange({target:{value:'unknown'}});assert.equal(JSON.parse(a.saved()).gameKind,'pigs');
  const b=boot({stored:a.saved()});assert.equal(b.control('游戏选择').props.value,'pigs');
  b.control('启用霓虹像素主题').props.onClick();assert.equal(b.attrs.size,0);assert.equal(b.control('游戏选择').props.disabled,true);
  const c=boot({stored:JSON.stringify({gameKind:{invalid:true}})});assert.equal(c.control('游戏选择').props.value,'air');
  a.dispose();b.dispose();c.dispose();
});
test('old preferences default to night while an explicit saved daytime choice survives reload',()=>{
  for(const [stored,expected] of [[{gameKind:'pigs'},true],[{pigNight:'invalid'},true],[{pigNight:false,gameKind:'pigs'},false]]){
    const a=boot({stored:JSON.stringify(stored)});a.control('霓虹辉光').props.onClick();
    assert.equal(JSON.parse(a.saved()).pigNight,expected);const b=boot({stored:a.saved()});b.control('像素网格').props.onClick();
    assert.equal(JSON.parse(b.saved()).pigNight,expected);a.dispose();b.dispose();
  }
});
test('fruit game choice persists independently of pig daytime preference',()=>{
  const a=boot({stored:JSON.stringify({gameKind:'pigs',pigNight:false,game:true})});
  a.control('游戏选择').props.onChange({target:{value:'fruit'}});
  assert.equal(a.control('游戏选择').props.value,'fruit');assert.equal(JSON.parse(a.saved()).pigNight,false);
  const b=boot({stored:a.saved()});assert.equal(b.control('游戏选择').props.value,'fruit');
  assert.equal(b.control('游戏选择').children.filter(o=>o.props.value==='fruit').length,1);
  a.dispose();b.dispose();
});
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
test('dark text contrasts meet WCAG AA for small text',()=>{
  const bg=luminance(dark['--dsw-alias-bg-base']);
  for(const key of ['--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-label-tertiary','--dsw-alias-link']) assert.ok((luminance(dark[key])+.05)/(bg+.05)>=4.5,key);
  assert.ok((luminance('#35f1ff')+.05)/(luminance('#090817')+.05)>=4.5,'send button');
  for(const pair of Object.values(tokens)) assert.ok(typeof pair.light==='string' && typeof pair.dark==='string');
});
