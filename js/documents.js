/* documents.js — A4 ইনভয়েস/ভাউচার, মাসিক রিপোর্ট, সামারি শীট ও PDF ডাউনলোড */
const ORG1='কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি',ORG2='বাসা নং ৩/৪, ব্লক-এ, আসাদ এভিনিউ, ঢাকা-১২০৭';
const W='শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগার বার তের চৌদ্দ পনের ষোল সতের আঠার উনিশ বিশ একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছিষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টাশি ঊননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই'.split(' ');
function wd(n){if(n===0)return W[0];const o=[],c=Math.floor(n/1e7);n%=1e7;const l=Math.floor(n/1e5);n%=1e5;const h=Math.floor(n/1e3);n%=1e3;const s=Math.floor(n/100);n%=100;
 if(c)o.push(wd(c)+' কোটি');if(l)o.push(W[l]+' লক্ষ');if(h)o.push(W[h]+' হাজার');if(s)o.push(W[s]+' শত');if(n)o.push(W[n]);return o.join(' ')}
function inWords(a){const t=Math.floor(a),p=Math.round((a-t)*100);return wd(t)+' টাকা'+(p?' '+W[p]+' পয়সা':'')+' মাত্র।'}
const head=()=>`<div class="ah"><b>${ORG1}</b><span>${ORG2}</span></div>`;
function stamp(word,col){const P=[];for(let i=0;i<64;i++){const a=i*Math.PI/32,q=i%2?88:96;P.push((100+q*Math.cos(a)).toFixed(1)+' '+(100+q*Math.sin(a)).toFixed(1))}
 const big=word==='PAID',tx='font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="12" letter-spacing="1.5"';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="175" height="175"><defs><path id="ta" d="M36 100A64 64 0 0 1 164 100"/><path id="tb" d="M27 100A73 73 0 0 0 173 100"/></defs>
 <g fill="${col}" stroke="${col}"><path fill-rule="evenodd" stroke-width="2" stroke-linejoin="round" d="M${P.join('L')}ZM180 100A80 80 0 1 0 20 100A80 80 0 1 0 180 100Z"/>
 <circle cx="100" cy="100" r="76" fill="none" stroke-width="2.5"/>
 <path d="M52.9 78A52 52 0 0 1 147.1 78M147.1 122A52 52 0 0 1 52.9 122" fill="none" stroke-width="2.5"/>
 <g stroke="none"><text ${tx}><textPath href="#ta" startOffset="50%" text-anchor="middle">THANK YOU</textPath></text>
 <text ${tx}><textPath href="#tb" startOffset="50%" text-anchor="middle">THANK YOU</textPath></text>
 <circle cx="30" cy="88" r="2"/><circle cx="29" cy="112" r="2"/><circle cx="170" cy="88" r="2"/><circle cx="171" cy="112" r="2"/>
 <text x="100" y="${big?116:108}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${big?44:21}" textLength="${big?96:100}" lengthAdjust="spacingAndGlyphs" transform="rotate(-12 100 100)">${word}</text></g></g></svg>`}
function invHTML(t){const inc=t.type==='income',[y,m,d]=t.date.split('-');
 const sub=subOf(t),ms=smList(t);
 const cell=t.flat?`<b>${esc(t.owner||ownerOf(t.flat))}</b><br>ফ্ল্যাট ${esc(t.flat)} এর মাসিক সার্ভিস চার্জ${ms.length?`<br>যে মাসের সার্ভিস চার্জ গৃহীতঃ ${ms.map(ymEn).join(', ')}`:''}<br><small>${[AN(t.acct),t.note].filter(Boolean).map(esc).join(' · ')}</small>`:`<b>${esc(t.group)}</b><br><small>${sub}</small>`;
 return `<div class="a4">${head()}<div class="it ${inc?'i':'o'}">${inc?'প্রাপ্তি রসিদ':'পেমেন্ট ভাউচার'}</div>
 <div class="im"><span>নং: <b>${esc(bd(t.no))}</b></span><span>তারিখ: <b>${bd(d+'/'+m+'/'+y)}</b></span></div>
 <h3 class="sh">লেনদেনের বিবরণ</h3>
 <table class="at"><thead><tr><th style="width:70px">ক্রঃ নং</th><th>বিবরণ</th><th class="n" style="width:170px">টাকার পরিমাণ</th></tr></thead>
 <tbody><tr><td class="c">১</td><td>${cell}</td><td class="n">${tk(t.amount)}</td></tr>
 <tr class="tot"><td colspan="2">সর্বমোট টাকা</td><td class="n">${tk(t.amount)}</td></tr></tbody></table>
 <div class="wd"><b>কথায়:</b> ${inWords(t.amount)}</div>
 <div class="seal"><img class="simg" src="assets/img/${inc?'received':'paid'}.png" alt="" onerror="this.outerHTML=stamp('${inc?'RECEIVED':'PAID'}','${inc?'#059669':'#dc2626'}')"></div>
 <div class="ft">এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত, স্বাক্ষরের প্রয়োজন নেই।</div></div>`}
function rptPages(){const c=calc(),[y,mo]=c.m.split('-');
 const rows=[{k:'পূর্বের জের',a:(c.pb<0?'− '+tk(-c.pb):'+ '+tk(c.pb))}];
 [...c.cur].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>rows.push({t}));
 rows.push({k:'মোট আয়',a:'+ '+tk(c.I)},{k:'মোট ব্যয়',a:'− '+tk(c.O)},{k:'বর্তমান জের',a:tk(c.cb),b:1},...c.ac.map(a=>({k:'— '+a.n,a:tk(a.c)})));
 const N=16,pg=[];for(let i=0;i<rows.length;i+=N)pg.push(rows.slice(i,i+N));
 return pg.map((p,i)=>`<div class="a4">${head()}<div class="mt">${M[+mo-1]} ${bd(y)}</div><h3 class="sh">হিসাবের বিস্তারিত বিবরণ</h3>
 <table class="at"><thead><tr><th style="width:120px">তারিখ</th><th style="width:60px">ধরণ</th><th>খাত / বিবরণ</th><th class="n" style="width:150px">পরিমাণ</th></tr></thead><tbody>${p.map(r=>{
  if(!r.t)return `<tr class="${r.b?'tot':'sm'}"><td colspan="3">${r.k}</td><td class="n">${r.a}</td></tr>`;
  const t=r.t,inc=t.type==='income',sub=subOf(t);
  return `<tr><td>${bnDate(t.date)}</td><td>${t.type==='transfer'?'ট্রান্সফার':inc?'আয়':'ব্যয়'}</td><td><b>${esc(t.group)}</b><br><small>${sub}</small></td><td class="n ${t.type==='transfer'?'':inc?'in-c':'out-c'}">${t.type==='transfer'?'':inc?'+ ':'− '}${tk(t.amount)}</td></tr>`}).join('')}</tbody></table>
 <div class="ft">পৃষ্ঠা ${bd(i+1)}/${bd(pg.length)} · এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div></div>`)}
/* A4 PDF ডাউনলোড (html2canvas + jsPDF, cdnjs থেকে লোড হয়) */
async function pdfMake(pages){
 if(!window.html2canvas||!window.jspdf){toast('PDF লাইব্রেরি লোড হয়নি, ইন্টারনেট সংযোগ দেখুন');return null}
 toast('PDF তৈরি হচ্ছে…');const host=$('cap');let doc=null;
 try{host.innerHTML=pages.join('');await document.fonts.ready;
  await Promise.all([...host.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));await new Promise(r=>setTimeout(r,80));
  doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  for(let i=0;i<host.children.length;i++){
   const c=await html2canvas(host.children[i],{scale:2,backgroundColor:'#fff',useCORS:true});
   let w=210,h=c.height/c.width*210;if(h>297){w=210*297/h;h=297}
   if(i)doc.addPage();doc.addImage(c.toDataURL('image/jpeg',.92),'JPEG',(210-w)/2,0,w,h)}
 }catch(e){doc=null;toast('PDF তৈরি করা যায়নি')}
 host.innerHTML='';return doc}
async function pdfOut(pages,name){const doc=await pdfMake(pages);if(doc){doc.save(name);toast('ডাউনলোড হয়েছে')}}
async function pdfShare(pages,name){const doc=await pdfMake(pages);if(!doc)return;
 const file=new File([doc.output('blob')],name,{type:'application/pdf'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name})}catch(e){}}
 else{doc.save(name);toast('এই ব্রাউজারে সরাসরি শেয়ার হয় না; PDF ডাউনলোড হয়েছে, সেটি পাঠিয়ে দিন')}}
function sumPages(){const c=calc(),[y,mo]=c.m.split('-');
 const grp=ty=>{const g={};c.cur.filter(t=>t.type===ty).forEach(t=>g[t.group]=(g[t.group]||0)+t.amount);return Object.entries(g).sort((a,b)=>b[1]-a[1])};
 const tbl=(title,rows,total)=>`<h3 class="sh">${title}</h3><table class="at"><thead><tr><th style="width:70px">ক্রঃ নং</th><th>মূল খাত</th><th class="n" style="width:170px">টাকার পরিমাণ</th></tr></thead><tbody>${rows.length?rows.map(([k,v],i)=>`<tr><td class="c">${bd(i+1)}</td><td>${esc(k)}</td><td class="n">${tk(v)}</td></tr>`).join(''):'<tr><td colspan="3" class="c">কোনো এন্ট্রি নেই</td></tr>'}<tr class="tot"><td colspan="2" style="text-align:right">মোট</td><td class="n">${tk(total)}</td></tr></tbody></table>`;
 const sg=x=>x<0?'− '+tk(-x):x>0?'+ '+tk(x):tk(0);
 const bank=`<h3 class="sh">জেরের সামারি</h3><table class="at" style="font-size:13px"><thead><tr><th>হিসাব</th><th class="n">পূর্বের জের</th><th class="n">আয়</th><th class="n">ব্যয়</th><th class="n">ট্রান্সফার (নিট)</th><th class="n">বর্তমান জের</th></tr></thead><tbody>${c.ac.map(a=>`<tr><td>${a.t}</td><td class="n">${tk(a.p)}</td><td class="n">${tk(a.i)}</td><td class="n">${tk(a.o)}</td><td class="n">${sg(a.x)}</td><td class="n"><b>${tk(a.c)}</b></td></tr>`).join('')}<tr class="tot"><td style="text-align:right">মোট</td><td class="n">${tk(c.pb)}</td><td class="n">${tk(c.I)}</td><td class="n">${tk(c.O)}</td><td class="n">${tk(0)}</td><td class="n">${tk(c.cb)}</td></tr></tbody></table>`;
 return [`<div class="a4 tight">${head()}<h3 class="sh" style="margin-top:18px">সামারি শীট - ${M[+mo-1]} ${bd(y)}</h3>${tbl('আয়ের সামারি',grp('income'),c.I)}${tbl('ব্যয়ের সামারি',grp('expense'),c.O)}${bank}<div class="ft">এটি কম্পিউটার সিস্টেম দ্বারা প্রস্তুতকৃত।</div></div>`]}
