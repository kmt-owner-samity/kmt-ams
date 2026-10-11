/* reports.js — রিপোর্ট বাছাই (চুজার), রিপোর্ট বিল্ডার ও সার্ভিস চার্জ সেটআপ */
const prevOf=ym=>{const d=new Date(+ym.slice(0,4),+ym.slice(5)-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const expAmt=f=>{const v=scCfg.per&&scCfg.per[f];return(v!==undefined&&v!==''&&v!==null)?+v:(+scCfg.def||0)};
const monthTitle=ym=>M[+ym.slice(5)-1]+' '+bd(ym.slice(0,4));
const sumA=l=>l.reduce((s,t)=>s+t.amount,0);
const byDate=(a,b)=>a.date.localeCompare(b.date)||String(a.no).localeCompare(String(b.no));
const descOf=t=>{const o=[];if(t.flat)o.push('ফ্ল্যাট '+t.flat+(t.owner?' — '+t.owner:''));const m=smList(t);if(m.length)o.push('সার্ভিস চার্জ: '+m.map(ymEn).join(', '));if(t.note)o.push(t.note);o.push('নং '+bd(t.no||''));return `${esc(t.item)}<br><small>${o.map(esc).join(' · ')}</small>`};
/* সাধারণ রিপোর্ট: সারি মেপে নিজে নিজে A4 পাতায় ভাগ হয় (পাতা কখনও ১১২৩px-এর বেশি হবে না) */
function paged(title,sub,thead,trs,o={}){const host=$('cap'),H=1123,cls=o.cls?' '+o.cls:'';
 const mk=(rows,last,n)=>`<div class="a4 tight${cls}">${head()}${sub?`<div class="mt">${sub}</div>`:''}<h3 class="sh">${title}</h3>${o._first?(o.pre||''):''}<table class="at${cls}"><thead>${thead}</thead><tbody>${rows.join('')}</tbody></table>${last?(o.post||''):''}${n>1?'<div class="pgn">পৃষ্ঠা</div>':''}<div class="ft">এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div></div>`;
 const pages=[];let i=0;
 do{o._first=!pages.length;let best=0;
  for(let k=1;k<=trs.length-i;k++){host.innerHTML=mk(trs.slice(i,i+k),i+k>=trs.length,2);if(host.firstChild.offsetHeight>H)break;best=k}
  if(!best)best=Math.min(1,trs.length-i);pages.push(trs.slice(i,i+best));i+=best}while(i<trs.length);
 host.innerHTML='';const n=pages.length;
 return pages.map((r,idx)=>{o._first=idx===0;return mk(r,idx===n-1,n).replace('<div class="pgn">পৃষ্ঠা</div>',n>1?`<div class="pgn">পৃষ্ঠা ${bd(idx+1)}/${bd(n)}</div>`:'')})}

/* লেনদেনের লগ */
function logReport(){const c=calc(),trs=[];
 [...c.cur].sort(byDate).forEach(t=>{const inc=t.type==='income',tr=t.type==='transfer';
  trs.push(`<tr><td>${bnDate(t.date)}</td><td>${tr?'ট্রান্সফার':inc?'আয়':'ব্যয়'}</td><td>${esc(t.group)}<br><small>${subOf(t)}${t.owner?' · '+esc(t.owner):''}</small></td><td class="n">${tr?'':inc?'+ ':'− '}${tk(t.amount)}</td></tr>`)});
 if(!trs.length)trs.push('<tr><td colspan="4" class="c">এই মাসে কোনো লেনদেন নেই</td></tr>');
 return paged('লেনদেনের বিস্তারিত',monthTitle(c.m),'<tr><th style="width:105px">তারিখ</th><th style="width:70px">ধরণ</th><th>খাত / বিবরণ</th><th class="n" style="width:140px">পরিমাণ</th></tr>',trs)}

/* ১) আয় / ব্যয়ের রিপোর্ট: খাত → এন্ট্রি, উপমোটসহ */
function kindReport(ty){const c=calc(),L=ty==='income',col=L?'#059669':'#dc2626';
 const tx=c.cur.filter(t=>t.type===ty).sort(byDate),g={};tx.forEach(t=>(g[t.group]??=[]).push(t));
 const order=Object.keys(CATS[ty]).filter(k=>g[k]).concat(Object.keys(g).filter(k=>!CATS[ty][k])),trs=[];
 order.forEach(k=>{trs.push(`<tr class="gh"><td colspan="4">${esc(k)}</td></tr>`);
  g[k].forEach(t=>trs.push(`<tr><td>${bnDate(t.date)}</td><td>${descOf(t)}</td><td>${AN(t.acct)}</td><td class="n">${tk(t.amount)}</td></tr>`));
  trs.push(`<tr class="sm"><td colspan="3" style="text-align:right">${esc(k)} — উপমোট</td><td class="n">${tk(sumA(g[k]))}</td></tr>`)});
 if(!trs.length)trs.push('<tr><td colspan="4" class="c">এই মাসে কোনো এন্ট্রি নেই</td></tr>');
 trs.push(`<tr class="tot"><td colspan="3" style="text-align:right">সর্বমোট ${L?'আয়':'ব্যয়'}</td><td class="n" style="color:${col}">${tk(L?c.I:c.O)}</td></tr>`);
 return paged(L?'আয়ের রিপোর্ট':'ব্যয়ের রিপোর্ট',monthTitle(c.m),'<tr><th style="width:105px">তারিখ</th><th>বিবরণ</th><th style="width:125px">হিসাব</th><th class="n" style="width:125px">টাকা</th></tr>',trs,{sizes:[22,28]})}

/* ২) সার্ভিস চার্জ রিপোর্ট (নির্বাচিত মাস): কে পরিশোধ করেছে / করেনি */
function scMonthReport(){const c=calc(),ym=prevOf(c.m),pay={};
 all.filter(t=>t.type==='income'&&t.flat).forEach(t=>{const ms=smList(t);if(!ms.includes(ym))return;const o=pay[t.flat]??={amt:0,last:'',acct:''};o.amt+=t.amount/ms.length;if(t.date>=o.last){o.last=t.date;o.acct=t.acct}});
 let np=0,nh=0,nd=0,col=0,due=0;const hasExp=FLATS.some(x=>expAmt(x.f)>0),LB={p:'পরিশোধিত',h:'আংশিক',d:'বাকি'};
 const trs=FLATS.map((x,i)=>{const p=pay[x.f],e=expAmt(x.f),paid=p?p.amt:0;
  const st=e>0?(paid>=e-0.005?'p':paid>0?'h':'d'):(paid>0?'p':'d');
  if(st==='p')np++;else nd++;col+=paid;const dv=e>0?Math.max(e-paid,0):0;due+=dv;
  return `<tr><td class="c">${bd(i+1)}</td><td>${x.f}</td><td>${esc(x.o)}</td><td class="c"><span class="stt ${st}">${LB[st]}</span></td><td class="n">${paid?tk(paid):'—'}</td><td class="n">${e>0?(dv?tk(dv):'—'):'—'}</td><td>${p?bnDate(p.last).replace(' ইং','')+' · '+AN(p.acct).replace(' ব্যাংক',''):''}</td></tr>`});
 const pre=`<div class="strip"><div><span>মোট ফ্ল্যাট</span><b>${bd(FLATS.length)}</b></div><div><span>পরিশোধিত</span><b class="g">${bd(np)}</b></div><div><span>বাকি</span><b class="r">${bd(nd)}</b></div><div><span>মোট আদায়</span><b class="g">${tk(col)}</b></div>${hasExp?`<div><span>মোট বাকি</span><b class="r">${tk(due)}</b></div>`:''}</div>${hasExp?'':'<p class="note">মাসিক সার্ভিস চার্জের অঙ্ক সেটআপ করা নেই, তাই বাকির টাকা দেখানো হয়নি।</p>'}`;
 return paged(monthTitle(ym)+' মাসের সার্ভিস চার্জ','','<tr><th style="width:42px">ক্রঃ</th><th style="width:52px">ফ্ল্যাট</th><th>মালিক</th><th style="width:78px">অবস্থা</th><th class="n" style="width:90px">পরিশোধ</th><th class="n" style="width:80px">বাকি</th><th style="width:150px">সর্বশেষ পেমেন্ট</th></tr>',trs,{pre,sizes:[20,30],cls:'sc'})}

/* ৩) সার্ভিস চার্জের বার্ষিক ছক: ফ্ল্যাট × ১২ মাস */
const TICK='<svg class="tk" viewBox="0 0 12 12" width="12" height="12"><path d="M2 6.5l2.6 2.6L10 3.2" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',CROSS='<svg class="tk" viewBox="0 0 12 12" width="12" height="12"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>';
function scYearReport(){const c=calc(),sm=prevOf(c.m),y=sm.slice(0,4),upto=+sm.slice(5),paid={};
 all.filter(t=>t.type==='income'&&t.flat).forEach(t=>smList(t).forEach(m=>{(paid[t.flat]??=new Set()).add(m)}));
 const trs=FLATS.map((x,i)=>{let due=0;
  const cells=MON.map((_,k)=>{const ym=y+'-'+String(k+1).padStart(2,'0');if(paid[x.f]&&paid[x.f].has(ym))return `<td class="c">${TICK}</td>`;if(k+1<=upto){due++;return `<td class="c">${CROSS}</td>`}return '<td class="c"></td>'});
  return `<tr><td class="c">${bd(i+1)}</td><td>${x.f}</td><td>${esc(x.o)}</td>${cells.join('')}<td class="c"><b>${bd(due)}</b></td></tr>`});
 const th='<tr><th>ক্রঃ</th><th>ফ্ল্যাট</th><th>মালিক</th>'+MON.map(m=>`<th>${m}</th>`).join('')+'<th>বাকি</th></tr>';
 return paged('সার্ভিস চার্জের বার্ষিক ছক',bd(y)+' সাল — '+monthTitle(sm)+' পর্যন্ত',th,trs,{sizes:[24,24],cls:'mx',post:`<div class="legend">${TICK} পরিশোধিত &nbsp; ${CROSS} বাকি (নির্বাচিত মাস পর্যন্ত) &nbsp; ফাঁকা = ভবিষ্যৎ মাস</div>`})}

/* ৪) অ্যাকাউন্ট স্টেটমেন্ট: নগদ / ন্যাশনাল / পূবালী, চলমান জেরসহ */
function acctReport(){const c=calc(),out=[];
 c.ac.forEach(a=>{const ev=[];
  c.cur.forEach(t=>{if(t.type==='transfer'){if(t.to===a.k)ev.push({d:t.date,no:t.no,desc:'ট্রান্সফার ← '+AN(t.from),cr:t.amount,dr:0});if(t.from===a.k)ev.push({d:t.date,no:t.no,desc:'ট্রান্সফার → '+AN(t.to),cr:0,dr:t.amount})}
   else if(t.acct===a.k)ev.push({d:t.date,no:t.no,desc:t.group+' — '+t.item,cr:t.type==='income'?t.amount:0,dr:t.type==='expense'?t.amount:0})});
  ev.sort((x,y)=>x.d.localeCompare(y.d)||String(x.no).localeCompare(String(y.no)));
  let bal=a.p,scr=0,sdr=0;const trs=[`<tr class="sm"><td colspan="4">মাসের শুরুর জের</td><td class="n">${tk(bal)}</td></tr>`];
  ev.forEach(e=>{bal+=e.cr-e.dr;scr+=e.cr;sdr+=e.dr;trs.push(`<tr><td>${bnDate(e.d)}</td><td>${esc(e.desc)}</td><td class="n in-c">${e.cr?tk(e.cr):''}</td><td class="n out-c">${e.dr?tk(e.dr):''}</td><td class="n">${tk(bal)}</td></tr>`)});
  trs.push(`<tr class="tot"><td colspan="2" style="text-align:right">মাসের শেষের জের</td><td class="n">${tk(scr)}</td><td class="n">${tk(sdr)}</td><td class="n">${tk(bal)}</td></tr>`);
  out.push(...paged('অ্যাকাউন্ট স্টেটমেন্ট — '+a.n,monthTitle(c.m),'<tr><th style="width:105px">তারিখ</th><th>বিবরণ</th><th class="n" style="width:105px">জমা</th><th class="n" style="width:105px">খরচ</th><th class="n" style="width:115px">জের</th></tr>',trs,{sizes:[26,32]}))});
 return out}

/* ৫) বার্ষিক রিপোর্ট: মাসওয়ারি + খাতভিত্তিক বছরের মোট */
function yearReport(){const c=calc(),y=c.m.slice(0,4),t0=ACCTS.reduce((s,a)=>s+open0[a.k],0);
 const sm=(a,ty)=>a.filter(t=>t.type===ty).reduce((s,t)=>s+t.amount,0),ie=all.filter(t=>t.type==='income'||t.type==='expense');
 let TI=0,TO=0,first=null,last=0;
 const rows=M.map((nm,k)=>{const ym=y+'-'+String(k+1).padStart(2,'0'),b=ie.filter(t=>t.date.slice(0,7)<ym),cu=ie.filter(t=>t.date.slice(0,7)===ym),p=t0+sm(b,'income')-sm(b,'expense'),i=sm(cu,'income'),o=sm(cu,'expense');
  TI+=i;TO+=o;if(first===null)first=p;last=p+i-o;return `<tr><td>${nm}</td><td class="n">${tk(p)}</td><td class="n in-c">${tk(i)}</td><td class="n out-c">${tk(o)}</td><td class="n"><b>${tk(p+i-o)}</b></td></tr>`});
 const yr=all.filter(t=>t.date.slice(0,4)===y);
 const grp=ty=>{const g={};yr.filter(t=>t.type===ty).forEach(t=>g[t.group]=(g[t.group]||0)+t.amount);return Object.entries(g).sort((a,b)=>b[1]-a[1])};
 const tbl=(title,rs,total,col)=>`<h3 class="sh">${title}</h3><table class="at"><thead><tr><th style="width:70px">ক্রঃ নং</th><th>মূল খাত</th><th class="n" style="width:170px">টাকা</th></tr></thead><tbody>${rs.length?rs.map(([k,v],i)=>`<tr><td class="c">${bd(i+1)}</td><td>${esc(k)}</td><td class="n">${tk(v)}</td></tr>`).join(''):'<tr><td colspan="3" class="c">কোনো এন্ট্রি নেই</td></tr>'}<tr class="tot"><td colspan="2" style="text-align:right">মোট</td><td class="n">${tk(total)}</td></tr></tbody></table>`;
 const trn=(l,k)=>l.filter(t=>t.type==='transfer').reduce((s,t)=>s+(t.to===k?t.amount:0)-(t.from===k?t.amount:0),0),sk=(l,ty,k)=>l.filter(t=>t.type===ty&&t.acct===k).reduce((s,t)=>s+t.amount,0),pre=all.filter(t=>t.date.slice(0,4)<y);
 const acs=ACCTS.map(a=>{const p=open0[a.k]+sk(pre,'income',a.k)-sk(pre,'expense',a.k)+trn(pre,a.k),i=sk(yr,'income',a.k),o=sk(yr,'expense',a.k),x=trn(yr,a.k);return{a,p,i,o,x,c:p+i-o+x}});
 const sg=v=>v<0?'− '+tk(-v):v>0?'+ '+tk(v):tk(0);
 const bank=`<h3 class="sh">জেরের সামারি</h3><table class="at" style="font-size:13px"><thead><tr><th>হিসাব</th><th class="n">বছরের শুরুর জের</th><th class="n">আয়</th><th class="n">ব্যয়</th><th class="n">ট্রান্সফার (নিট)</th><th class="n">বছরের শেষের জের</th></tr></thead><tbody>${acs.map(z=>`<tr><td>${z.a.t}</td><td class="n">${tk(z.p)}</td><td class="n">${tk(z.i)}</td><td class="n">${tk(z.o)}</td><td class="n">${sg(z.x)}</td><td class="n"><b>${tk(z.c)}</b></td></tr>`).join('')}<tr class="tot"><td style="text-align:right">মোট</td><td class="n">${tk(acs.reduce((s,z)=>s+z.p,0))}</td><td class="n">${tk(TI)}</td><td class="n">${tk(TO)}</td><td class="n">${tk(0)}</td><td class="n">${tk(acs.reduce((s,z)=>s+z.c,0))}</td></tr></tbody></table>`;
 const ft='<div class="ft">এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div>';
 return [`<div class="a4 tight">${head()}<div class="mt">${bd(y)} সাল</div><h3 class="sh">বার্ষিক রিপোর্ট</h3>${tbl('আয়ের সামারি',grp('income'),TI,'#059669')}${tbl('ব্যয়ের সামারি',grp('expense'),TO,'#dc2626')}${bank}${ft}</div>`]}

/* লেনদেন পেজের রিপোর্ট বাটন */
const REPS=[
 {k:'log',t:'লেনদেন রিপোর্ট',c:'#0369a1',b:'#e0f2fe',i:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h6',f:logReport},
 {k:'income',t:'আয়ের রিপোর্ট',c:'#059669',b:'#ecfdf5',i:'M12 4v12m0 0l-5-5m5 5l5-5M5 20h14',f:()=>kindReport('income')},
 {k:'expense',t:'ব্যয়ের রিপোর্ট',c:'#dc2626',b:'#fef2f2',i:'M12 20V8m0 0l-5 5m5-5l5 5M5 4h14',f:()=>kindReport('expense')},
 {k:'service-charge',t:'সার্ভিস চার্জ রিপোর্ট',c:'#b45309',b:'#fef3c7',i:'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',f:()=>[...scMonthReport(),...scYearReport()]},
 {k:'year',t:'বার্ষিক রিপোর্ট',c:'#4338ca',b:'#e0e7ff',i:'M4 20V10M10 20V4M16 20v-8M22 20H2',f:yearReport}];

/* সার্ভিস চার্জ সেটআপ (অ্যাডমিন) */
function scTot(){const d=+$('scDef').value||0;let t=0;document.querySelectorAll('#scRows input').forEach(i=>{t+=i.value!==''?+i.value:d});$('scTot').textContent='মোট মাসিক প্রত্যাশিত আদায়: '+tk(t)}
function scSetup(){$('scDef').value=scCfg.def||'';
 $('scRows').innerHTML=FLATS.map(x=>`<label class="scr"><span>${x.f} (${esc(x.o)})</span><input type="number" min="0" step="any" data-f="${x.f}" placeholder="ডিফল্ট" value="${scCfg.per&&scCfg.per[x.f]!==undefined?scCfg.per[x.f]:''}"></label>`).join('');
 scTot();$('scOv').hidden=false;document.querySelector('#scOv .invbox').scrollTop=0}
async function scSave(){const per={};document.querySelectorAll('#scRows input').forEach(i=>{if(i.value!=='')per[i.dataset.f]=+i.value});
 try{await DB.setSc({def:+$('scDef').value||0,per})}catch(e){return dbFail(e)}
 scCfg=await DB.sc();$('scOv').hidden=true;toast('Supabase-এ সার্ভিস চার্জ সেটআপ সংরক্ষিত ✓');render()}
function initReports(){
 $('repBar').innerHTML=REPS.map((r,i)=>`<button type="button" class="rbtn" data-i="${i}"><em style="background:${r.b};color:${r.c}">${svg('<path d="'+r.i+'"/>',18)}</em>${r.t}</button>`).join('');
 $('repBar').addEventListener('click',e=>{const b=e.target.closest('.rbtn');if(!b)return;const r=REPS[+b.dataset.i];openPrev(r.f(),r.k+'-'+$('month').value+'.pdf')});
 $('scX').onclick=()=>$('scOv').hidden=true;$('scS').onclick=scSave;
 $('scDef').addEventListener('input',scTot);$('scRows').addEventListener('input',scTot)}
