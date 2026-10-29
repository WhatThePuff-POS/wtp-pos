const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
let html=fs.readFileSync(__dirname+'/index.html','utf8').replace(/<script type="module">[\s\S]*?<\/script>/,'');
for(const f of ['register-core','register-ui'])html=html.replace(`<script src="${f}.js?v=2"></script>`,`<script>${fs.readFileSync(__dirname+'/'+f+'.js','utf8')}</script>`);
const db=new Map(),listeners=new Map(),errors=[];let serial=Promise.resolve();
const snapshot=(path)=>({exists:()=>db.has(path),data:()=>structuredClone(db.get(path)),metadata:{fromCache:false}});
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const idb=new IDBFactory();
function make(){return new JSDOM(html,{url:'https://example.com/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
 w.indexedDB=idb;w.structuredClone=structuredClone;w.confirm=()=>true;w.navigator.locks={request:(n,o,fn)=>fn({name:n})};
 w._fbReady=true;w._db={};w._doc=(d,c,id)=>c+'/'+id;
 w._runTransaction=(d,fn)=>{const p=serial.then(async()=>{const writes=new Map();const result=await fn({get:async path=>snapshot(path),set:(p,v)=>writes.set(p,structuredClone(v))});for(const [p,v] of writes)db.set(p,v);for(const [p] of writes)for(const cb of listeners.get(p)||[])queueMicrotask(()=>cb(snapshot(p)));return result;});serial=p.catch(()=>{});return p;};
 w._onSnapshot=(path,options,cb)=>{if(!listeners.has(path))listeners.set(path,new Set());listeners.get(path).add(cb);queueMicrotask(()=>cb(snapshot(path)));return ()=>listeners.get(path).delete(cb);};
}});}
const pause=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 const dom=make(),w=dom.window;await pause();await pause();
 w.requireAdmin=(title,sub,cb)=>cb();w.loadOutletSession();await pause();
 w.document.getElementById('reg-open').click();await pause();await pause();
 assert.match(w.document.getElementById('register-status').textContent,/Selling tablet/);
 w.addToCart(1);w.quickPay('paynow');await pause();await pause();
 assert.equal([...db.keys()].filter(k=>k.startsWith('transactions/')).length,1);
 assert(w.document.getElementById('order-complete').classList.contains('open'));
 await w.openXReport();assert.match(w.document.getElementById('report-content').textContent,/Business date/);
 w.document.getElementById('report-modal').classList.remove('open');
 await w.confirmZReport();await pause();
 const session=[...db.entries()].find(([k])=>k.startsWith('registerSessions/'))[1];assert.equal(session.status,'closed');assert.equal(session.summary.count,1);
 w.reopenTerminal();w.document.getElementById('reg-open').click();await pause();await pause();
 const active=[...db.values()].find(v=>v.status==='open');assert.equal(active.summary.count,0);
 const local=new w.WTPRegister.LocalStore();assert.equal((await local.pending()).length,0);assert.equal((await local.all()).length,1);
 assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
 console.log('PASS: DOM startup; IndexedDB commit; open register; complete sale; upload; X report; Z closure; reopen at zero; retained local archive');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>setTimeout(()=>process.exit(process.exitCode||0),10));
