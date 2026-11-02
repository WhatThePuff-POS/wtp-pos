/* WTP owner analysis. Range reads are explicit, never a background polling query. */
(function(root){
'use strict';
const OUTLETS=['Bedok 216','Haig Road','Punggol Coast'];
const PUFFS=['Original','Sardine','Cheesy','Black Pepper','Char Siew','Otah'];
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const dateKey=t=>{const d=new Date(t);return Number.isNaN(d.getTime())?'':new Date(d.getTime()+8*3600000).toISOString().slice(0,10);};
const addDays=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
function days(from,to){if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw Error('Choose a valid date range');const n=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;if(!Number.isFinite(n)||n<1||n>366)throw Error('Choose up to 366 days per range');return Array.from({length:n},(_,i)=>addDays(from,i));}
function costAt(settings,name,date){const profile=settings.costs?.[name];if(!profile)return null;const history=(profile.history||[]).filter(x=>x.from<=date).sort((a,b)=>b.from.localeCompare(a.from));if(!history.length)return null;const p=history[0];if(p.cost==null||!Number.isFinite(Number(p.cost))||Number(p.cost)<0)return null;return Number(p.cost)*(p.includesGST===false?1+num(p.gstRate)/100:1);}
function category(settings,name){return settings.costs?.[name]?.category||(PUFFS.includes(name)?'Puffs':'Non-puffs');}
function summarize(txns,waste,range,outlet,settings={}){
 const calendar=days(range.from,range.to),daily=Object.fromEntries(calendar.map(d=>[d,0]));
 const result={net:0,gross:0,discount:0,count:0,units:0,puffNet:0,nonPuffNet:0,unclassifiedNet:0,knownCost:0,coveredNet:0,coveredGross:0,itemGross:0,missingUnits:0,missingLines:0,wastePCS:0,wasteEntries:0,products:Object.create(null),daily,days:calendar.length};
 for(const t of txns){const day=dateKey(t.timestamp);if(t.voided||!OUTLETS.includes(t.outlet)||(outlet!=='All'&&t.outlet!==outlet)||!Object.hasOwn(daily,day))continue;
  const net=num(t.total),gross=t.subtotal==null?net:num(t.subtotal);result.net+=net;result.gross+=gross;result.discount+=num(t.discount);result.count++;daily[day]+=net;
  const items=(t.items||[]).filter(i=>num(i.qty)>0),itemGross=items.reduce((n,i)=>n+(i.sub==null?num(i.qty)*num(i.price):num(i.sub)),0);
  const itemNet=Math.max(0,net-Math.max(0,num(t.sundry)));let allocated=0;
  for(const i of items){const name=String(i.name||'Unspecified item'),qty=num(i.qty),g=i.sub==null?qty*num(i.price):num(i.sub),n=itemGross>0?itemNet*g/itemGross:0,c=costAt(settings,name,day),cat=category(settings,name);
   const p=result.products[name]||(result.products[name]={name,qty:0,gross:0,net:0,cost:0,missing:0,category:cat});
   p.qty+=qty;p.gross+=g;p.net+=n;result.units+=qty;result.itemGross+=g;allocated+=n;
   if(cat==='Puffs')result.puffNet+=n;else if(cat==='Non-puffs')result.nonPuffNet+=n;else result.unclassifiedNet+=n;
   if(c===null){p.missing+=qty;result.missingUnits+=qty;result.missingLines++;}else{p.cost+=qty*c;result.knownCost+=qty*c;result.coveredNet+=n;result.coveredGross+=g;}
  }
  result.unclassifiedNet+=net-allocated;
 }
 for(const w of waste){const day=dateKey(w.timestamp);if(!OUTLETS.includes(w.outlet)||(outlet!=='All'&&w.outlet!==outlet)||!Object.hasOwn(daily,day))continue;result.wasteEntries++;if(String(w.unit).toLowerCase()==='pcs')result.wastePCS+=num(w.qty);}
 result.avg=result.count?result.net/result.count:0;result.perDay=result.net/result.days;
 result.coverage=result.itemGross?result.coveredGross/result.itemGross:null;
 result.complete=result.missingLines===0&&Math.abs(result.unclassifiedNet)<0.005;
 result.gp=result.complete?result.net-result.knownCost:null;result.margin=result.gp!==null&&result.net?result.gp/result.net:null;
 result.puffMix=result.net?result.puffNet/result.net:null;result.nonPuffMix=result.net?result.nonPuffNet/result.net:null;
 return result;
}
function change(a,b){return b===0?(a===0?'0.0%':'New / no baseline'):((a-b)/Math.abs(b)*100).toFixed(1)+'%';}
const API={OUTLETS,PUFFS,dateKey,addDays,days,costAt,category,summarize,change};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.WTPAnalytics=API;
if(!root.document)return;
const $=id=>document.getElementById(id),money=n=>n==null?'—':'$'+num(n).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2}),pct=n=>n==null?'—':(n*100).toFixed(1)+'%';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let settings={version:1,costs:{},targets:{}},loaded=null,catalog=[],busy=false,activeTab='overview';
try{const v=JSON.parse(localStorage.getItem('wtp_analysis_settings')||'null');if(v&&v.version===1&&v.costs&&v.targets)settings=v;}catch(e){}
function saveSettings(next){localStorage.setItem('wtp_analysis_settings',JSON.stringify(next));settings=next;}
function notice(text){$('analysis-status').textContent=text;}
root.showDashboardTab=function(tab){activeTab=tab;document.querySelectorAll('[data-dashboard-tab]').forEach(el=>el.hidden=el.dataset.dashboardTab!==tab);document.querySelectorAll('[data-tab-button]').forEach(b=>{b.classList.toggle('selected',b.dataset.tabButton===tab);b.setAttribute('aria-selected',b.dataset.tabButton===tab);});$('analysis-controls').hidden=tab==='overview';if(tab==='finance')renderCosts();render();};
function ranges(){const a={from:$('range-a-from').value,to:$('range-a-to').value},b={from:$('range-b-from').value,to:$('range-b-to').value};days(a.from,a.to);days(b.from,b.to);return {a,b};}
root.analysisPreset=function(p){const today=dateKey(new Date().toISOString()),dow=(new Date(today+'T00:00:00Z').getUTCDay()+6)%7;let a,b;
 if(p==='week'){a={from:addDays(today,-dow),to:today};b={from:addDays(a.from,-7),to:addDays(today,-7)};}
 else if(p==='weekday'){a={from:today,to:today};b={from:addDays(today,-7),to:addDays(today,-7)};}
 else if(p==='last7'){a={from:addDays(today,-6),to:today};b={from:addDays(today,-13),to:addDays(today,-7)};}
 else{a={from:today,to:today};b={from:addDays(today,-1),to:addDays(today,-1)};}
 $('range-a-from').value=a.from;$('range-a-to').value=a.to;$('range-b-from').value=b.from;$('range-b-to').value=b.to;invalidate();
};
function invalidate(){loaded=null;render();notice('Dates changed. Press Load analysis to fetch these ranges.');}
for(const id of ['range-a-from','range-a-to','range-b-from','range-b-to'])$(id).onchange=invalidate;
$('analysis-outlet').onchange=()=>{render();};
root.loadAnalysis=async function(){if(busy)return;try{const r=ranges();if(!root.wtpFetchAnalysis)throw Error('Firebase is still loading. Try again shortly.');busy=true;document.querySelectorAll('#analysis-controls input,#analysis-controls select,#analysis-controls button').forEach(el=>el.disabled=true);notice('Loading sales and recorded wastage…');
 const merged=r.a.from<=r.b.to&&r.b.from<=r.a.to;
 const spans=merged?[{from:r.a.from<r.b.from?r.a.from:r.b.from,to:r.a.to>r.b.to?r.a.to:r.b.to}]:[r.a,r.b];
 const data=await Promise.all(spans.map(x=>root.wtpFetchAnalysis(x,n=>notice('Loading '+n+' records…'))));
 const dedupe=key=>[...new Map(data.flatMap(d=>d[key]).map(d=>[d._firebaseId,d])).values()];
 const next={a:r.a,b:r.b,sales:dedupe('sales'),waste:dedupe('waste'),at:new Date()};
 if(root.wtpFetchProductNames){try{catalog=await root.wtpFetchProductNames();}catch(e){catalog=[];}}
 loaded=next;render();renderCosts();notice('Loaded '+next.sales.length+' sales records and '+next.waste.length+' wastage entries at '+next.at.toLocaleTimeString('en-SG')+'. Voided sales excluded from analysis.');
 }catch(e){notice('Analysis not loaded: '+e.message);}finally{busy=false;document.querySelectorAll('#analysis-controls input,#analysis-controls select,#analysis-controls button').forEach(el=>el.disabled=false);}};
function card(label,value,detail=''){return '<div class="stat-card"><div class="stat-label">'+esc(label)+'</div><div class="stat-value">'+esc(value)+'</div><div class="analysis-note">'+esc(detail)+'</div></div>';}
function table(headers,rows){return '<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function dailyChart(summary,range){const max=Math.max(1,...Object.values(summary.daily));return '<div class="daily-bars" role="img" aria-label="Daily net sales from '+range.from+' to '+range.to+'">'+Object.entries(summary.daily).map(([d,n])=>'<div class="daily-column" title="'+d+': '+money(n)+'"><span>'+esc(money(n))+'</span><div class="daily-track"><div class="daily-fill" style="height:'+Math.max(n>0?1:0,n/max*100)+'%"></div></div><small>'+d.slice(5)+'</small></div>').join('')+'</div>';}
function render(){for(const id of ['finance-results','performance-results','comparison-results'])if(!loaded)$(id).innerHTML='<p class="analysis-note">Choose your dates and press Load analysis.</p>';if(!loaded)return;
 const outlet=$('analysis-outlet').value,a=summarize(loaded.sales,loaded.waste,loaded.a,outlet,settings),b=summarize(loaded.sales,loaded.waste,loaded.b,outlet,settings);
 $('finance-results').innerHTML='<div class="stat-grid">'+card('Net sales',money(a.net))+card('Known product COGS',money(a.knownCost),'Only items with an applicable cost')+card('Estimated gross profit',a.gp===null?'Incomplete':money(a.gp),a.gp===null?'Enter missing costs / classify other revenue':'Before wastage, rent, wages and overheads')+card('Estimated gross margin',pct(a.margin))+card('Cost coverage',pct(a.coverage),'Share of item gross sales with known costs')+card('Missing-cost units',a.missingUnits)+'</div>'+table(['SKU','Category','Units','Allocated net sales','Estimated COGS','Estimated GP'],Object.values(a.products).sort((x,y)=>y.net-x.net).map(p=>[p.name,p.category,p.qty,money(p.net),p.missing?'Missing cost':money(p.cost),p.missing?'—':money(p.net-p.cost)]))+'<p class="analysis-note">Period A: '+loaded.a.from+' to '+loaded.a.to+'. Discounts are allocated across items in proportion to their recorded gross sales. Cost profiles include non-recoverable supplier GST. Wastage, rent, wages and other operating costs are excluded. Unclassified/custom revenue: '+money(a.unclassifiedNet)+'. Estimates use the cost profile effective on the sale date; they are not inventory-matched accounting COGS.</p>';
 const outlets=outlet==='All'?OUTLETS:[outlet];
 $('performance-results').innerHTML=table(['Outlet','Net sales A','Change vs B','Transactions','Avg basket','Sales/day','Puff revenue mix','Non-puff revenue mix','Logged wastage (pcs)','Sales target','Target achieved'],outlets.map(o=>{const x=summarize(loaded.sales,loaded.waste,loaded.a,o,settings),y=summarize(loaded.sales,loaded.waste,loaded.b,o,settings),target=num(settings.targets[o])*x.days;return [o,money(x.net),change(x.net,y.net),x.count,money(x.avg),money(x.perDay),pct(x.puffMix),pct(x.nonPuffMix),x.wastePCS,target?money(target):'Not set',target?pct(x.net/target):'—'];}))+'<p class="analysis-note">Target = daily net-sales target × calendar days in A, including closed/no-sale days. Only logged wastage with unit “pcs” is counted; other units are excluded. Mix uses net sales. Historical data availability may differ by outlet.</p>';
 const metrics=[['Net sales',a.net,b.net,money],['Transactions',a.count,b.count,String],['Average basket',a.avg,b.avg,money],['Sales per calendar day',a.perDay,b.perDay,money],['Units sold',a.units,b.units,String]];
 $('comparison-results').innerHTML='<h3 class="analysis-heading">A: '+loaded.a.from+' → '+loaded.a.to+' &nbsp; B: '+loaded.b.from+' → '+loaded.b.to+'</h3>'+table(['Metric','Period A','Period B','Change A vs B'],metrics.map(([n,x,y,f])=>[n,f(x),f(y),change(x,y)]))+(a.days!==b.days?'<p class="analysis-note">These ranges have different lengths ('+a.days+' vs '+b.days+' days). Use sales/day for a fairer comparison.</p>':'')+'<h3 class="analysis-heading">Daily net sales · Period A</h3>'+dailyChart(a,loaded.a)+table(['Date','Net sales A'],Object.entries(a.daily).map(([d,n])=>[d,money(n)]))+'<details><summary>Period B daily sales</summary>'+dailyChart(b,loaded.b)+table(['Date','Net sales B'],Object.entries(b.daily).map(([d,n])=>[d,money(n)]))+'</details>';
 renderTargets();
}
function names(){return [...new Set([...catalog,...Object.keys(settings.costs),...(loaded?loaded.sales.flatMap(t=>(t.items||[]).map(i=>i.name).filter(Boolean)):[])])].sort();}
function renderCosts(){const values=names(),select=$('cost-sku'),current=select.value;select.replaceChildren();for(const name of values){const o=document.createElement('option');o.textContent=name;o.value=name;select.appendChild(o);}if(values.includes(current))select.value=current;root.chooseCostSku?.();
 $('cost-history').innerHTML=table(['SKU','Category','Effective from','Entered unit cost','GST included?','Applied unit cost'],Object.entries(settings.costs).flatMap(([n,p])=>(p.history||[]).map(h=>[n,p.category,h.from,money(h.cost),h.includesGST?'Yes':'No · '+h.gstRate+'%',money(h.cost*(h.includesGST?1:1+num(h.gstRate)/100))])));
}
root.chooseCostSku=function(){const p=settings.costs[$('cost-sku').value];$('cost-category').value=p?.category||category(settings,$('cost-sku').value);};
root.saveCostProfile=function(){try{const name=$('cost-sku').value,from=$('cost-from').value,costText=$('cost-unit').value.trim(),cost=Number(costText),gstRate=Number($('cost-gst-rate').value);if(!name||['__proto__','prototype','constructor'].includes(name)||!from||!costText||!Number.isFinite(cost)||cost<0||!Number.isFinite(gstRate)||gstRate<0||gstRate>100)throw Error('Choose a SKU, effective date and valid non-negative unit cost / GST rate');const next=structuredClone(settings),profile=next.costs[name]||{history:[]};profile.category=$('cost-category').value;profile.history=profile.history.filter(h=>h.from!==from);profile.history.push({from,cost,includesGST:$('cost-gst-included').checked,gstRate});next.costs[name]=profile;saveSettings(next);renderCosts();render();notice('Cost saved on this browser. Export settings for backup.');}catch(e){notice('Cost not saved: '+e.message);}};
function renderTargets(){if($('target-inputs').children.length)return;$('target-inputs').innerHTML=OUTLETS.map((o,i)=>'<label>'+esc(o)+' <input class="filter-input" type="number" min="0" step="0.01" id="target-'+i+'" value="'+num(settings.targets[o])+'"></label>').join('');}
root.saveAnalysisTargets=function(){try{const next=structuredClone(settings);OUTLETS.forEach((o,i)=>{const n=Number($('target-'+i).value);if(!Number.isFinite(n)||n<0)throw Error('Enter non-negative targets');next.targets[o]=n;});saveSettings(next);render();notice('Targets saved on this browser.');}catch(e){notice('Targets not saved: '+e.message);}};
root.exportAnalysisSettings=function(){const url=URL.createObjectURL(new Blob([JSON.stringify(settings,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='wtp-analysis-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
root.importAnalysisSettings=async function(file){if(!file)return;try{if(file.size>1000000)throw Error('Settings file is too large');const v=JSON.parse(await file.text());if(v.version!==1||!v.costs||typeof v.costs!=='object'||Array.isArray(v.costs)||!v.targets||typeof v.targets!=='object')throw Error('Invalid WTP settings file');const clean={version:1,costs:{},targets:{}};for(const [name,p] of Object.entries(v.costs)){if(!name||['__proto__','constructor','prototype'].includes(name)||!Array.isArray(p.history)||!['Puffs','Non-puffs','Other'].includes(p.category))throw Error('Invalid cost profile');clean.costs[name]={category:p.category,history:p.history.map(h=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(h.from)||!Number.isFinite(h.cost)||h.cost<0||typeof h.includesGST!=='boolean'||!Number.isFinite(h.gstRate)||h.gstRate<0||h.gstRate>100)throw Error('Invalid cost history');return {from:h.from,cost:h.cost,includesGST:h.includesGST,gstRate:h.gstRate};})};}for(const o of OUTLETS){const n=v.targets[o]??0;if(!Number.isFinite(n)||n<0)throw Error('Invalid target');clean.targets[o]=n;}if(!confirm('Replace analysis costs and targets saved on this browser?'))return;saveSettings(clean);$('target-inputs').replaceChildren();renderTargets();renderCosts();render();notice('Analysis settings imported.');}catch(e){notice('Import failed: '+e.message);}};
$('cost-from').value=dateKey(new Date().toISOString());renderTargets();root.analysisPreset('last7');
function health(){const el=$('dashboard-health');el.textContent='v33 · '+(navigator.onLine?'Online':'Offline')+' · '+(loaded?'Analysis loaded '+loaded.at.toLocaleTimeString('en-SG'):'Analysis not loaded');}
root.addEventListener('online',health);root.addEventListener('offline',health);setInterval(health,10000);health();
})(typeof window!=='undefined'?window:globalThis);
