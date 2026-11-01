export function fakeDom(){
  const callbacks=new Map(),documentEvents=new Map(),windowEvents=new Map(),observers=[];
  let serial=0,paints=0;
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
    addEventListener:(k,fn)=>documentEvents.set(k,fn),removeEventListener:k=>documentEvents.delete(k),
    createElement(tag){const node=element(tag);if(tag==='canvas'){
      node.width=0;node.height=0;
      const ctx={canvas:node,save(){},restore(){},setTransform(){},fillRect(){paints++;},strokeRect(){},translate(){},rotate(){},fillText(){paints++;}};
      node.getContext=()=>ctx;
    }return node;}
  };
  class Observer{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(){}unobserve(){}disconnect(){this.disconnected=true;}}
  const win={requestAnimationFrame:fn=>{const id=++serial;callbacks.set(id,fn);return id;},cancelAnimationFrame:id=>callbacks.delete(id),
    ResizeObserver:Observer,MutationObserver:Observer,addEventListener:(k,fn)=>windowEvents.set(k,fn),removeEventListener:k=>windowEvents.delete(k)};
  const frame=now=>{const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn(now);};
  return {doc,win,host,callbacks,documentEvents,windowEvents,observers,frame,paints:()=>paints};
}
