/* Version 2 register state. No Firebase or UI dependencies. Money is accumulated in cents. */
(function(root){
'use strict';
const cents=n=>Math.round(Number(n)*100);
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const key=o=>encodeURIComponent(o);
function empty(){return {count:0,gross:0,discount:0,net:0,sku:{},pay:{},payCount:{},hours:{},hourCount:{},applied:{}};}
function add(summary,sale){
 const s=JSON.parse(JSON.stringify(summary));
 if(!Number.isFinite(sale.total)||sale.total<0)throw Error('Invalid sale total');
 s.count++;s.gross+=cents(sale.subtotal);s.discount+=cents(sale.discount);s.net+=cents(sale.total);
 for(const i of sale.items)s.sku[i.name]=(s.sku[i.name]||0)+i.qty;
 for(const p of sale.payments){s.pay[p.type]=(s.pay[p.type]||0)+cents(p.amount);s.payCount[p.type]=(s.payCount[p.type]||0)+1;}
 s.hours[sale.hour]=(s.hours[sale.hour]||0)+cents(sale.total);s.hourCount[sale.hour]=(s.hourCount[sale.hour]||0)+1;
 s.applied[sale.deviceId]=sale.seq;return s;
}
class Register{
 constructor(remote,local,device){this.remote=remote;this.local=local;this.device=device;this.flushing=null;}
 async open(outlet){
  const id=crypto.randomUUID(),date=day();
  const session=await this.remote.atomic(async t=>{
   const r=await t.get('registers',key(outlet));
   const d=await t.get('registerDevices',this.device);
   if(d?.outlet&&d.outlet!==outlet)throw Error('Release this tablet’s other outlet before assigning it here.');
   const old=r?.sessionId?await t.get('registerSessions',r.sessionId):null;
   if(old?.status==='open'&&old.owner&&old.owner!==this.device)throw Error('Another tablet owns this register. Release it on that tablet first.');
   const next=old?.status==='open'?{...old,owner:this.device}:{id,outlet,businessDate:date,status:'open',owner:this.device,openedAt:new Date().toISOString(),summary:empty()};
   t.set('registerSessions',next.id,next);t.set('registers',key(outlet),{...r,outlet,sessionId:next.id,owner:this.device});
   t.set('registerDevices',this.device,{outlet});return next;
  });
  await this.local.putMeta('session:'+outlet,session);return session;
 }
 async enqueue(sale,session){
  if(!session||session.status!=='open'||session.owner!==this.device)throw Error('This tablet is not the active register.');
  return this.local.insert({...sale,uid:crypto.randomUUID(),sessionId:session.id,deviceId:this.device,businessDate:session.businessDate,voided:false,pending:true});
 }
 async flush(){
  if(this.flushing)return this.flushing;
  this.flushing=this._flush().finally(()=>this.flushing=null);return this.flushing;
 }
 async _flush(){
  const queued=(await this.local.pending()).sort((a,b)=>a.seq-b.seq);
  for(const sale of queued){
   await this.remote.atomic(async t=>{
    const existing=await t.get('transactions',sale.uid);
    if(existing)return;
    const s=await t.get('registerSessions',sale.sessionId);
    if(!s||s.status!=='open'||s.owner!==sale.deviceId)throw Error('A pending sale belongs to a closed or reassigned register. It is saved locally; contact the manager.');
    if((s.summary.applied[sale.deviceId]||0)>=sale.seq)throw Error('Sale sequence conflict. Sale retained for recovery.');
    const {pending,...data}=sale;
    t.set('transactions',sale.uid,{...data,txnId:sale.id});
    t.set('registerSessions',s.id,{...s,summary:add(s.summary,sale)});
   });
   await this.local.ack(sale.seq);
  }
 }
 async finish(outlet,sessionId,release=false){
  await this.flush();
  if((await this.local.pending()).length)throw Error('Sync all pending sales first.');
  const closed=await this.remote.atomic(async t=>{
   const r=await t.get('registers',key(outlet));
   const s=await t.get('registerSessions',sessionId);
   if(!s||r?.sessionId!==sessionId)throw Error('Register changed. Reload its status.');
   if(s.status==='closed'&&!release)return s;
   if(s.owner!==this.device)throw Error('Only the active selling tablet can close or release.');
   const next={...s,owner:null,...(release?{}:{status:'closed',closedAt:new Date().toISOString(),closedByDevice:this.device})};
   t.set('registerSessions',s.id,next);
   t.set('registers',key(outlet),{...r,owner:null,...(release?{}:{lastClosedAt:next.closedAt,lastClosedSession:s.id})});
   t.set('registerDevices',this.device,{outlet:null});return next;
  });
  await this.local.putMeta('session:'+outlet,closed);return closed;
 }
}
class LocalStore{
 constructor(){this.ready=new Promise((resolve,reject)=>{const req=indexedDB.open('wtp-register-v2',1);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('sales',{keyPath:'seq',autoIncrement:true});db.createObjectStore('meta');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async tx(store,mode,fn){const db=await this.ready;return new Promise((resolve,reject)=>{const t=db.transaction(store,mode);let result;const request=fn(t.objectStore(store));request.onsuccess=()=>result=request.result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Local save aborted'));});}
 async insert(sale){const seq=await this.tx('sales','readwrite',s=>s.add(sale));return {...sale,seq};}
 async all(){return this.tx('sales','readonly',s=>s.getAll());}
 async pending(){return (await this.all()).filter(s=>s.pending);}
 async ack(seq){const db=await this.ready;return new Promise((resolve,reject)=>{const t=db.transaction('sales','readwrite'),s=t.objectStore('sales'),r=s.get(seq);r.onsuccess=()=>{if(r.result)s.put({...r.result,pending:false});};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
 async putMeta(k,v){return this.tx('meta','readwrite',s=>s.put(v,k));}
 async meta(k){return this.tx('meta','readonly',s=>s.get(k));}
}
root.WTPRegister={Register,LocalStore,empty,add,day,key};
if(typeof module!=='undefined')module.exports=root.WTPRegister;
})(globalThis);
