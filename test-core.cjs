const assert=require('node:assert/strict');const {Register,empty,day}=require('./register-core.js');
class Remote{
 constructor(){this.db=new Map();this.serial=Promise.resolve();this.offline=false;}
 atomic(fn){const work=this.serial.then(async()=>{if(this.offline)throw Error('offline');const next=structuredClone(this.db);const result=await fn({get:async(c,id)=>next.get(c+'/'+id),set:(c,id,v)=>next.set(c+'/'+id,structuredClone(v))});this.db=next;return result;});this.serial=work.catch(()=>{});return work;}
}
class Local{
 constructor(){this.sales=[];this.m=new Map();this.failSave=false;this.failAck=false;}
 async insert(s){if(this.failSave)throw Error('disk full');const v={...s,seq:this.sales.length+1};this.sales.push(v);return v;}
 async pending(){return this.sales.filter(s=>s.pending);}
 async ack(seq){if(this.failAck)throw Error('crash after server commit');this.sales.find(s=>s.seq===seq).pending=false;}
 async putMeta(k,v){this.m.set(k,v);}
}
const sale=n=>({id:'T'+n,date:'30 Oct 2026',time:'01:00',hour:1,outlet:'Bedok 216',items:[{name:'Original',qty:1}],subtotal:2.7,discount:0,total:2.7,payments:[{type:'cash',amount:2.7}],timestamp:new Date().toISOString()});
(async()=>{
 const remote=new Remote(),local=new Local(),r=new Register(remote,local,'tablet1'),other=new Register(remote,new Local(),'tablet2');
 const s=await r.open('Bedok 216');assert.equal(s.summary.count,0);
 await assert.rejects(()=>other.open('Bedok 216'),/Another tablet/);
 await assert.rejects(()=>r.open('Haig Road'),/other outlet/);
 local.failSave=true;await assert.rejects(()=>r.enqueue(sale(0),s),/disk full/);assert.equal(local.sales.length,0);local.failSave=false;
 remote.offline=true;await r.enqueue(sale(1),s);await r.enqueue(sale(2),s);await assert.rejects(()=>r.flush(),/offline/);assert.equal((await local.pending()).length,2);
 const restarted=new Register(remote,local,'tablet1');remote.offline=false;local.failAck=true;
 await assert.rejects(()=>restarted.flush(),/crash/);assert.equal(remote.db.get('registerSessions/'+s.id).summary.count,1);
 local.failAck=false;await restarted.flush();assert.equal(remote.db.get('registerSessions/'+s.id).summary.count,2);assert.equal(remote.db.get('registerSessions/'+s.id).summary.net,540);
 await restarted.flush();assert.equal(remote.db.get('registerSessions/'+s.id).summary.count,2);
 const released=await restarted.finish('Bedok 216',s.id,true);assert.equal(released.owner,null);assert.equal(released.status,'open');
 const resumed=await other.open('Bedok 216');assert.equal(resumed.id,s.id);
 await r.enqueue(sale(3),s);await assert.rejects(()=>r.flush(),/reassigned/);assert.equal((await local.pending()).length,1);
 const closed=await other.finish('Bedok 216',s.id);assert.equal(closed.summary.count,2);assert.equal(closed.status,'closed');
 const again=await other.finish('Bedok 216',s.id);assert.equal(again.closedAt,closed.closedAt);
 const next=await other.open('Bedok 216');assert.notEqual(next.id,s.id);assert.equal(next.summary.count,0);
 const a=new Register(remote,new Local(),'a'),b=new Register(remote,new Local(),'b');const contenders=await Promise.allSettled([a.open('Punggol Coast'),b.open('Punggol Coast')]);assert.equal(contenders.filter(x=>x.status==='fulfilled').length,1);
 const old=remote.db.get('registerSessions/'+next.id);old.businessDate='2026-10-29';remote.db.set('registerSessions/'+next.id,old);assert.equal((await other.open('Bedok 216')).businessDate,'2026-10-29');
 console.log('PASS: exclusive ownership; cross-outlet assignment; durable-save failure; offline queue; restart recovery; retry after committed upload; duplicate prevention; handover; stale-device rejection; repeat Z; new session zero; simultaneous claims; overnight session');
})().catch(e=>{console.error(e);process.exitCode=1});
