/* ================================================================
 * 轻账 · 记一笔
 * 独立全屏页：自定义数字键盘、金额校验、日期选择、保存与删除
 * 依赖：03-domain.js、04-ui.js
 * ================================================================ */

/* ==================================================================
 * 记一笔（独立全屏页，自定义数字键盘，不唤起系统键盘）
 * ================================================================== */
let R={id:null,type:'expense',amt:'0',date:TODAY,time:timeKey(),note:'',c1:'',c2:'',inMonth:true};
let FROM='v-home',FROM_I=0;
function openRecord(id,presetDate){
  const on=document.querySelector('.view.on');
  if(on&&on.id!=='v-record'){FROM=on.id;const t={ 'v-home':0,'v-detail':1,'v-stat':2,'v-me':3 };FROM_I=t[on.id]||0;}
  const r=id?store.state.records.find(x=>x.id===id):null;
  if(r){
    const c=catById(r.categoryId), p=parentOf(c);
    R={id:r.id,type:r.type,amt:(r.amount/100).toString(),date:r.date,time:r.time,note:r.note||'',c1:p?p.id:'',c2:r.categoryId,inMonth:r.inMonth!==false};
    document.getElementById('r-title').textContent='编辑';
    document.getElementById('r-cancel').textContent='删除这一笔';
  }else{
    const lp=parents('expense')[0], ls=lp?subsOf(lp.id):[];
    R={id:null,type:'expense',amt:'0',date:presetDate||TODAY,time:timeKey(),note:'',c1:lp?lp.id:'',c2:ls[0]?ls[0].id:'',inMonth:true};
    document.getElementById('r-title').textContent='记一笔';
    document.getElementById('r-cancel').textContent='取消';
  }
  document.getElementById('seg-e').classList.toggle('on',R.type==='expense');
  document.getElementById('seg-i').classList.toggle('on',R.type==='income');
  updateDatePill();
  renderRecord();
  go('v-record',null);
}
function labelOf(d){return d===TODAY?'今天':(d===dateKey(addDay(new Date(),-1))?'昨天':d.slice(5).replace('-','月')+'日');}
function setType(t){
  if(R.type===t)return;
  R.type=t;
  const lp=parents(t)[0], ls=lp?subsOf(lp.id):[];
  R.c1=lp?lp.id:'';R.c2=ls[0]?ls[0].id:'';
  document.getElementById('seg-e').classList.toggle('on',t==='expense');
  document.getElementById('seg-i').classList.toggle('on',t==='income');
  renderRecord();
}
function renderRecord(){
  const lp=parents(R.type);
  renderAmt();
  document.getElementById('r-inmonth').classList.toggle('on',R.inMonth);
  document.getElementById('r-imhint').textContent=R.inMonth?'大额支出可关闭，不碰生活费预算与统计':'不计入本月统计、预算与趋势，只计入总余额';
  const n=document.getElementById('r-note');
  n.textContent=R.note?`备注：${R.note}`:'备注：点这里写点什么';
  n.classList.toggle('has',!!R.note);
  document.getElementById('r-cats').innerHTML=lp.map(c=>
    `<button class="cat ${c.id===R.c1?'on':''}" onclick="pickC1('${c.id}')">${icoHtml(c)}<span>${esc(c.name)}</span></button>`).join('')
    +`<button class="cat" onclick="addCatQuick()"><div class="ico" style="background:rgba(217,232,246,.5);color:var(--blue-d);border:1px dashed rgba(127,168,212,.55);font-size:18px">＋</div><span>添加</span></button>`;
  const cur=lp.find(c=>c.id===R.c1)||lp[0];
  const subs=cur?subsOf(cur.id):[];
  document.getElementById('r-sublabel').textContent=cur?`${cur.name} · 二级分类`:'请先创建分类';
  document.getElementById('r-subs').innerHTML=subs.map(s=>
    `<button class="sub ${s.id===R.c2?'on':''}" onclick="pickC2('${s.id}')">${icoHtml(cur)}<span>${esc(s.name)}</span></button>`).join('');
  updateSaveBtn();
}
function updateSaveBtn(){
  /* 必须选到二级且金额 > 0 才可保存 */
  const ok=!!R.c2&&amtValue(R.amt)>0;
  const sv=document.getElementById('r-save');
  sv.classList.toggle('off',!ok);
  sv.textContent=R.id?'保存修改':'保存这一笔';
}
function pickC1(id){R.c1=id;const s=subsOf(id);R.c2=s[0]?s[0].id:'';renderRecord();}  /* 切一级自动选中第一个二级 */
function pickC2(id){R.c2=id;renderRecord();}
/* 「计入本月统计」开关：关闭 = 大额特殊支出，不碰生活费口径，只计入总余额 */
function toggleInMonth(){R.inMonth=!R.inMonth;renderRecord();}
function buildKeys(){
  const num=ks=>ks.map(k=>`<button onclick="keyPress('${k}')">${k}</button>`).join('');
  document.getElementById('r-keys').innerHTML=
    num(['1','2','3'])+
    `<button class="kplus" onclick="keyPress('+')">+</button>`+
    num(['4','5','6','7','8','9'])+
    `<button class="fn kdel" onclick="keyPress('del')"><svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 4H8l-5 8 5 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M18 9l-6 6M12 9l6 6"/></svg></button>`+
    `<button onclick="keyPress('.')">.</button>`+
    `<button class="k0" onclick="keyPress('0')">0</button>`;
}
/* 金额算式求值：12.5+8 → 20.5（仅加法，最多 3 个加数） */
function amtValue(expr){
  if(!expr)return 0;
  return expr.split('+').reduce((s,seg)=>{const n=parseFloat(seg);return s+(isFinite(n)?n:0);},0);
}
function renderAmt(){
  const hasAdd=R.amt.indexOf('+')>-1;
  document.getElementById('r-amt').textContent=R.amt;
  document.getElementById('r-amthint').textContent=hasAdd?`= ¥${fmt(Math.round(amtValue(R.amt)*100))}`:'';
  document.querySelector('.rec-amount').classList.toggle('long',R.amt.length>10);
}
/* 键盘规则：支持加法；每段小数点只能一次、小数最多两位、段首 0 替换；删除逐字符退格 */
function keyPress(k){
  let a=R.amt;
  const segs=a.split('+'), seg=segs[segs.length-1];
  if(k==='del'){a=a.length>1?a.slice(0,-1):'0';}
  else if(k==='+'){
    if(a==='0'||a.endsWith('+')||a.endsWith('.'))return;   // 加号前必须是完整数字
    if(segs.length>=3)return;                              // 最多三个加数
    a+='+';
  }
  else if(k==='.'){
    if(seg===''||seg.indexOf('.')>-1)return;
    a+='.';
  }
  else{
    if(seg==='0')a=a.slice(0,-1)+k;
    else if(seg.indexOf('.')>-1&&seg.split('.')[1].length>=2)return;
    else if(seg.replace('.','').length>=6)return;          // 每段最多 6 位数字
    else a+=k;
  }
  R.amt=a;
  renderAmt();
  updateSaveBtn();
}
function editNote(){
  sheet(`<h4>备注</h4><p class="desc">写清楚一点，以后翻账更明白</p>
    <div class="field"><input id="ni" placeholder="例如：和同事的下午茶" value="${esc(R.note)}"></div>
    <div class="btn" onclick="confirmNote()">好了</div>`);
}
function confirmNote(){R.note=document.getElementById('ni').value.trim();closeSheet();renderRecord();}
/* ==================================================================
 * 自定义日期选择（月历 Sheet，风格与明细页月历统一；只选日期，不选时间）
 * ================================================================== */
let pickMonth=ym(TODAY),pickDate=TODAY;
function updateDatePill(){
  document.getElementById('r-datelabel').textContent=labelOf(R.date);
  /* 补记历史账时胶囊加深提示 */
  document.getElementById('r-datepill').classList.toggle('past',R.date!==TODAY);
}
function openDate(){
  pickMonth=ym(R.date);pickDate=R.date;
  renderDateSheet();
}
function renderDateSheet(){
  /* 快捷日期 chips：今天 / 昨天 / 前天，点选即生效并收起 */
  const offs=[['今天',0],['昨天',-1],['前天',-2]];
  const quick=offs.map(([t,o])=>{
    const k=dateKey(addDay(new Date(),o));
    return `<span class="qchip ${pickDate===k?'on':''}" onclick="setQuickDay(${o})">${t}</span>`;
  }).join('');
  /* 月历网格：每格日期 + 当日支出（复用明细月历视觉） */
  const first=pd(pickMonth+'-01');
  const start=new Date(first);start.setDate(1-first.getDay());
  let cells=WEEK.map(w=>`<div class="w">${w}</div>`).join('');
  for(let i=0;i<42;i++){
    const d=addDay(start,i),key=dateKey(d);
    const off=ym(key)!==pickMonth;
    const o=sumBy(store.state.records.filter(r=>r.date===key&&counted(r)),'expense');
    const cls=['cell',off?'dim':'',key===TODAY?'today':'',key===pickDate?'on':''].join(' ');
    cells+=`<div class="${cls}" onclick="pickCell('${key}')"><span>${d.getDate()}</span><span class="m">${o>0?fmt0(o):''}</span></div>`;
  }
  sheet(`<h4>选择日期</h4><p class="desc">补记以前的账，点日期即可</p>
    <div class="chips" style="margin-bottom:10px">${quick}</div>
    <div class="cal-top" style="padding:0 2px 10px"><span>${first.getFullYear()}年${first.getMonth()+1}月</span>
      <div class="ar"><button class="arrow" onclick="shiftPick(-1)">‹</button><button class="arrow" onclick="shiftPick(1)">›</button></div></div>
    <div class="cal-grid cal-mini">${cells}</div>`);
}
/* 点选即确认：写入日期并收起浮层 */
function setQuickDay(o){applyPickDate(dateKey(addDay(new Date(),o)));}
function pickCell(k){applyPickDate(k);}
function applyPickDate(k){
  R.date=k;
  updateDatePill();
  closeSheet();
}
function shiftPick(n){const d=pd(pickMonth+'-01');d.setMonth(d.getMonth()+n);pickMonth=dateKey(d).slice(0,7);renderDateSheet();}
/* 明细页日分组头「＋」：带日期直接打开记一笔 */
function addOnDay(day){openRecord(null,day);}
/* 写操作统一入口：写库 → store.refresh() → 广播 */
async function saveRecord(){
  const yuan=amtValue(R.amt);
  if(!(yuan>0)){toast('先输入金额');return;}
  if(!R.c2){toast('选一个二级分类');return;}
  const amount=Math.round(yuan*100);          // 元 → 分，入库前转换
  if(R.id){
    await db.records.update(R.id,{type:R.type,amount,categoryId:R.c2,date:R.date,time:R.time,note:R.note,inMonth:R.inMonth});
    toast('已更新');
  }else{
    await db.records.add({id:uid(),type:R.type,amount,categoryId:R.c2,date:R.date,time:R.time,note:R.note,inMonth:R.inMonth,createdAt:Date.now()});
    toast('记好了');
  }
  await store.refresh();notify();
  closeRecord();
}
function closeRecord(){go(FROM,FROM_I);}
document.getElementById('r-cancel').onclick=async function(){
  if(R.id){
    if(!confirm('删除这一笔记录？'))return;
    await db.records.delete(R.id);
    await store.refresh();notify();
    toast('已删除');
  }
  closeRecord();
};
