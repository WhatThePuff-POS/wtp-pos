/* Bridges shared registers to the existing POS. Version 1 data is never deleted. */
'use strict';
const regLocal=new WTPRegister.LocalStore();
let regDevice,regEngine,regSession=null,regUnsub=null,regSessionUnsub=null,regGeneration=0;
let regBusy=false,regLock=false,regError='',regReady=false,regViewOutlet=null,regSeenServer=false,regLastClosed=null;
const regRemote={atomic:fn=>window._runTransaction(window._db,async tx=>fn({
 get:async(c,id)=>{const s=await tx.get(window._doc(window._db,c,id));return s.exists()?s.data():null;},
 set:(c,id,value)=>tx.set(window._doc(window._db,c,id),value)
}))};
const regStatus=document.createElement('div');regStatus.id='register-status';
regStatus.style.cssText='padding:8px 12px;background:#29251c;color:#f5c060;font-size:13px;line-height:1.5;flex-shrink:0;overflow-wrap:anywhere';
document.querySelector('.topbar').after(regStatus);
const regActions=document.createElement('div');regActions.className='nav-btns';
regActions.innerHTML='<button class="nav-btn" id="reg-open">Open / resume register</button><button class="nav-btn" id="reg-view">View outlet X</button><button class="nav-btn" id="reg-release">Release tablet</button><button class="nav-btn" id="reg-retry">Retry sync</button><button class="nav-btn" id="reg-backup">Export saved sales</button>';
document.querySelector('.topbar').append(regActions);
function regNotice(e){regError=e.message||String(e);showToast('⚠️',regError);void regRender();}
async function regRender(){
 const pending=(await regLocal.pending()).length;
 const s=regSession,old=s?.status==='open'&&s.businessDate!==WTPRegister.day();
 regStatus.textContent='Version 2 · Tablet '+(regDevice||'starting').slice(0,8)+' · '+(regViewOutlet||currentOutlet)+' · '+
 (s?s.businessDate+' · '+s.status+(s.owner===regDevice?' · Selling tablet':' · View only'):'No shared session')+
 (old?' · Previous business day still open':'')+' · '+(pending?pending+' sales waiting to sync':'All Version 2 sales synced')+
 (!navigator.onLine?' · Offline':'')+(!regSeenServer?' · Cached status':'')+(regLastClosed||s?.closedAt?' · Last closed '+new Date(regLastClosed||s.closedAt).toLocaleString('en-SG',{timeZone:'Asia/Singapore'}):'')+(regError?' · '+regError:'');
 document.getElementById('reg-open').disabled=regBusy||!regReady||!regLock;
 document.getElementById('reg-release').disabled=regBusy||s?.owner!==regDevice;
}
function regCanSell(){
 if(!regReady||!regLock||regBusy||regViewOutlet||!regSession||regSession.outlet!==currentOutlet||regSession.status!=='open'||regSession.owner!==regDevice){showToast('⚠️','Open this outlet on its assigned tablet before selling.');return false;}
 return true;
}
async function regSync(){
 if(!regEngine||!window._fbReady||!navigator.onLine)return;
 try{await regEngine.flush();regError='';}catch(e){regError=e.message||String(e);}
 await regRender();
}
async function regLoad(outlet){
 const gen=++regGeneration;
 if(regUnsub)regUnsub();if(regSessionUnsub)regSessionUnsub();
 regSession=null;regSeenServer=false;regLastClosed=null;regError='';transactions=[];lastReceipt=null;reportPrintSnapshot=null;
 await regInit;
 if(gen!==regGeneration)return;
 regSession=await regLocal.meta('session:'+outlet)||null;
 transactions=(await regLocal.all()).filter(t=>t.outlet===outlet&&t.sessionId===regSession?.id);
 await regRender();
 if(!window._fbReady){regError='Waiting for connection to register service';await regRender();return;}
 regUnsub=window._onSnapshot(window._doc(window._db,'registers',WTPRegister.key(outlet)),{includeMetadataChanges:true},snap=>{
  if(gen!==regGeneration)return;
  if(!snap.exists()){if(!snap.metadata.fromCache){regSession=null;regSeenServer=true;void regRender();}return;}
  const r=snap.data();regLastClosed=r.lastClosedAt||null;
  if(regSessionUnsub)regSessionUnsub();
  regSessionUnsub=window._onSnapshot(window._doc(window._db,'registerSessions',r.sessionId),{includeMetadataChanges:true},async ss=>{
   if(gen!==regGeneration||!ss.exists())return;
   regSession=ss.data();regSeenServer=!ss.metadata.fromCache;
   await regLocal.putMeta('session:'+outlet,regSession);
   transactions=(await regLocal.all()).filter(t=>t.outlet===outlet&&t.sessionId===regSession.id);
   await regRender();updateTopbarStats();
  },regNotice);
 },regNotice);
}
const regInit=(async()=>{
 try{
  regDevice=await regLocal.meta('device');
  if(!regDevice){regDevice=crypto.randomUUID();await regLocal.putMeta('device',regDevice);}
  regEngine=new WTPRegister.Register(regRemote,regLocal,regDevice);
  if(!navigator.locks)throw Error('This browser does not support safe tablet locking. Use an updated Chrome browser.');
  navigator.locks.request('wtp-selling-tab',{ifAvailable:true},async lock=>{regLock=!!lock;if(!lock)regError='Another POS tab is open. Close it and reload this tab to sell.';await regRender();if(lock)await new Promise(()=>{});});
  const assigned=await regLocal.meta('assignedOutlet');
  if(assigned)document.getElementById('login-outlet').value=assigned;
  regReady=true;await regRender();void regSync();
 }catch(e){regNotice(e);}
})();
loadOutletSession=function(){regViewOutlet=null;void regLoad(currentOutlet);};
const originalQuickPay=quickPay;
quickPay=function(method){if(regCanSell())originalQuickPay(method);};
async function regPersist(txn){
 if(!regCanSell())throw Error('Register is not ready for sales.');
 const saved=await regEngine.enqueue(txn,regSession);
 transactions.push(saved);void regRender();void regSync();return saved;
}
async function regSummary(){
 const s=regSession;if(!s)throw Error('No shared session. Open a register first.');
 let summary=s.summary;
 for(const sale of (await regLocal.pending()).filter(t=>t.sessionId===s.id).sort((a,b)=>a.seq-b.seq)){
  if(sale.seq>(summary.applied[sale.deviceId]||0))summary=WTPRegister.add(summary,sale);
 }
 return {outlet:s.outlet,skuQty:summary.sku,payTotals:Object.fromEntries(Object.entries(summary.pay).map(([k,v])=>[k,v/100])),payCount:summary.payCount,grossRev:summary.gross/100,discountTotal:summary.discount/100,netRev:summary.net/100,hourlyRev:Object.fromEntries(Object.entries(summary.hours).map(([k,v])=>[k,v/100])),hourlyCount:summary.hourCount,txnCount:summary.count};
}
openXReport=async function(){try{
 const d=await regSummary();document.getElementById('report-content').innerHTML=buildReportHTML('X',new Date(),false,d);
 const note=document.createElement('p');note.textContent='Business date: '+regSession.businessDate+' · '+regSession.status+(!regSeenServer?' · Cached / offline totals':'');
 document.getElementById('report-content').prepend(note);document.getElementById('report-modal').classList.add('open');
}catch(e){regNotice(e);}};
openZReport=function(){
 if(!regCanSell())return;
 if(!navigator.onLine){showToast('⚠️','Reconnect before closing the register.');return;}
 const label=regSession.businessDate;
 requireAdmin('Close register','Enter admin PIN to close '+currentOutlet,async()=>{
  if(confirm('Close '+currentOutlet+' for '+label+'? All pending sales must sync first.'))await confirmZReport();
 },'callback');
};
confirmZReport=async function(){
 if(regBusy||paymentInFlight||!regCanSell())return;
 if(Object.keys(cart).length){showToast('⚠️','Complete or clear the current order before closing.');return;}
 regBusy=true;await regRender();
 try{
  if(!navigator.onLine)throw Error('Reconnect before closing.');
  regSession=await regEngine.finish(currentOutlet,regSession.id);
  const d=await regSummary();document.getElementById('report-content').innerHTML=buildReportHTML('Z',new Date(regSession.closedAt),true,d);
  document.getElementById('report-modal').classList.add('open');
 }catch(e){regNotice(e);}finally{regBusy=false;await regRender();}
};
reopenTerminal=function(){
 document.getElementById('terminal-closed').classList.remove('open');
 showToast('ℹ️','Use Open / resume register to start the next session.');
};
document.getElementById('reg-open').onclick=()=>requireAdmin('Open register','Assign this tablet to '+currentOutlet,async()=>{
 if(regBusy||!regLock||regViewOutlet)return;
 if(Object.keys(cart).length){showToast('⚠️','Clear the unfinished order first.');return;}
 regBusy=true;
 try{
  if(!navigator.onLine||!window._fbReady)throw Error('Connect to the internet to open or take over a register.');
  const legacy=JSON.parse(localStorage.getItem('wtp_txns')||'[]');
  if(legacy.length)throw Error('Version 1 has pending sales. Export saved sales and reconcile them before activating Version 2.');
  if(!await regLocal.meta('cutover:'+currentOutlet)){
   if(!confirm('Start Version 2 for '+currentOutlet+'? Finish and sync Version 1 on its selling tablet first. Previous sales stay in the dashboard and are not included in the new session.'))return;
   await regLocal.putMeta('cutover:'+currentOutlet,true);
  }
  regSession=await regEngine.open(currentOutlet);await regLocal.putMeta('assignedOutlet',currentOutlet);regSeenServer=true;regError='';
  await regLoad(currentOutlet);
 }catch(e){regNotice(e);}finally{regBusy=false;await regRender();}
},'callback');
document.getElementById('reg-release').onclick=()=>requireAdmin('Release tablet','Enter admin PIN for tablet handover',async()=>{
 if(regBusy||paymentInFlight)return;
 if(Object.keys(cart).length){showToast('⚠️','Finish or clear the order before handover.');return;}
 if(!confirm('Release this register? This tablet will stop selling. The replacement tablet can resume the same session.'))return;
 regBusy=true;
 try{if(!navigator.onLine)throw Error('Reconnect before handover.');regSession=await regEngine.finish(currentOutlet,regSession.id,true);await regLocal.putMeta('assignedOutlet',null);}
 catch(e){regNotice(e);}finally{regBusy=false;await regRender();}
},'callback');
changeOutlet=function(){
 requireAdmin('Change selling outlet','Enter admin PIN to change outlet',async()=>{
  if(regBusy||paymentInFlight)return;
  if(regSession?.owner===regDevice&&regSession.status==='open'){showToast('⚠️','Release this tablet before changing its selling outlet. Use View outlet X for reports.');return;}
  if(Object.keys(cart).length&&!confirm('Discard the unfinished cart to change outlet?'))return;
  clearCart();closePayment();document.getElementById('login-screen').classList.remove('hidden');pinEntry='';updatePinDisplay();
 },'callback');
};
document.getElementById('reg-view').onclick=()=>requireAdmin('View outlet report','Enter admin PIN to view another outlet',()=>{
 if(regBusy||paymentInFlight||Object.keys(cart).length){showToast('⚠️','Finish the current order first.');return;}
 const modal=document.createElement('div');modal.className='modal-overlay open';
 const box=document.createElement('div');box.className='report-modal';
 const title=document.createElement('p');title.textContent='View X report (selling outlet stays '+currentOutlet+')';box.append(title);
 for(const outlet of ['Bedok 216','Haig Road','Punggol Coast']){const b=document.createElement('button');b.className='btn-secondary';b.textContent=outlet;b.onclick=async()=>{modal.remove();regViewOutlet=outlet;await regLoad(outlet);};box.append(b);}
 const back=document.createElement('button');back.className='btn-primary';back.textContent='Return to selling outlet';back.onclick=()=>{modal.remove();regViewOutlet=null;void regLoad(currentOutlet);};box.append(back);modal.append(box);document.body.append(modal);
},'callback');
document.getElementById('reg-retry').onclick=()=>void regSync();
document.getElementById('reg-backup').onclick=()=>requireAdmin('Export saved sales','Enter admin PIN to download recovery data',async()=>{
 const data={version:2,device:regDevice,sales:await regLocal.all(),legacy:{}};
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k==='wtp_txns'||k==='wtp_session'||k.startsWith('wtp_session_outlet_'))data.legacy[k]=localStorage.getItem(k);}
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wtp-saved-sales-'+WTPRegister.day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
},'callback');
window.addEventListener('online',()=>{void regSync();void regLoad(regViewOutlet||currentOutlet);});
window.addEventListener('wtp-firebase-ready',()=>{void regSync();if(document.getElementById('login-screen').classList.contains('hidden'))void regLoad(regViewOutlet||currentOutlet);});
setInterval(()=>void regSync(),30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void regSync();});

updateTopbarStats=async function(){
 const el=document.getElementById('topbar-stats');
 if(!statsUnlocked){el.textContent='🔒 Sales';return;}
 try{const d=await regSummary();el.textContent=d.txnCount+'txn · '+fmt(d.netRev);}catch(e){el.textContent='No open session';}
};
