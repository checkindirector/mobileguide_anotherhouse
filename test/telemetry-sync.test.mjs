import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const journeySource=readFileSync(new URL('../assets/marketing-journey.js',import.meta.url),'utf8');
const conciergeSource=readFileSync(new URL('../assets/concierge-telemetry.js',import.meta.url),'utf8');

function twoTabs() {
  const data=new Map(), tabs=[], queue=[]; let time=1792300000000, writes=0;
  const drain=(limit=100)=>{let count=0;while(queue.length&&count<limit){queue.shift()();count++;}return {count,pending:queue.length};};
  const add=language=>{
    const sent=[],listeners={},docListeners={}; let panelOpen=false;
    const on=(map,key,fn)=>(map[key]||=[]).push(fn);
    const node=()=>({style:{},append(){},after(){},replaceChildren(){},setAttribute(){},addEventListener(){}});
    const document={readyState:'complete',visibilityState:'visible',referrer:'',body:node(),head:node(),documentElement:{lang:language,dataset:{siteLanguage:language}},
      getElementById:id=>id==='chatPanel'?{classList:{contains:()=>panelOpen}}:null,
      querySelector:selector=>selector==='.screen.active'?{dataset:{screen:'home'}}:null,querySelectorAll:()=>[],createElement:node,createTextNode:()=>({}),addEventListener:(k,f)=>on(docListeners,k,f)};
    const tab={sent,listeners,docListeners,document};tabs.push(tab);
    const window={addEventListener:(k,f)=>on(listeners,k,f)};tab.window=window;
    const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{
      if(data.get(k)===v)return;
      const oldValue=data.get(k)||null;data.set(k,v);writes++;
      for(const peer of tabs)if(peer!==tab)queue.push(()=>{for(const f of peer.listeners.storage||[])f({key:k,newValue:v,oldValue});});
    }};
    const scope={window,document,localStorage,navigator:{},location:{hostname:'anotherhouse-guide.vercel.app',pathname:'/',origin:'https://anotherhouse-guide.vercel.app'},URL,crypto:{randomUUID},
      Date:class extends Date{static now(){return ++time;}},performance:{now:()=>time},setInterval(){},setTimeout:f=>f(),MutationObserver:class{observe(){}},
      fetch:async(_u,options)=>{sent.push(JSON.parse(options.body));return {ok:true};}};
    vm.createContext(scope);vm.runInContext(journeySource,scope);vm.runInContext(conciergeSource,scope);
    tab.open=()=>{panelOpen=true;window.conciergeTelemetry.open(language);};
    tab.hidden=()=>{document.visibilityState='hidden';for(const f of docListeners.visibilitychange||[])f();};
    tab.visible=()=>{document.visibilityState='visible';for(const f of docListeners.visibilitychange||[])f();};
    tab.context=()=>window.conciergeTelemetry.context();
    return tab;
  };
  return {add,drain,data,get writes(){return writes;}};
}

test('two hidden open chat tabs do not ping-pong storage writes or multiply chat_open events',()=>{
  const b=twoTabs(),ko=b.add('ko'),zh=b.add('zh-TW');
  b.drain();ko.open();zh.open();b.drain();ko.hidden();zh.hidden();
  const settled=b.drain();
  assert.equal(settled.pending,0,'ordinary cross-tab activity must settle without a storage loop');
  assert.equal(ko.sent.filter(x=>x.kind==='chat_open').length,1);
  assert.equal(zh.sent.filter(x=>x.kind==='chat_open').length,1);
  const before=b.writes;ko.context();const after=b.drain();
  assert.equal(after.pending,0);assert.ok(b.writes-before<=2);
  ko.visible();zh.visible();b.drain();
  assert.equal(ko.sent.filter(x=>x.kind==='chat_open').length,1);
  assert.equal(zh.sent.filter(x=>x.kind==='chat_open').length,1);
});

test('original-message policy survives the marketing context delegation for all five languages',()=>{
  const b=twoTabs();
  for(const language of ['ko','en','ja','zh','zh-TW']){
    const tab=b.add(language);
    assert.equal(tab.context().messagePolicy,'internal-original-v1');
  }
  assert.equal(b.drain().pending,0);
});

test('privacy changes propagate across tabs once, without reopening opted-out chat sessions',()=>{
  const b=twoTabs(),a=b.add('ko'),z=b.add('zh-TW');b.drain();a.open();z.open();b.drain();a.hidden();z.hidden();
  a.window.conciergeTelemetry.preferences({optOut:true});
  assert.equal(b.drain().pending,0);
  const before=z.sent.length;z.context();b.drain();assert.equal(z.sent.length,before);
  assert.equal(z.context().optOut,true);
});
