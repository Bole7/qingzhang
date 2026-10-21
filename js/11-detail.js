/* ================================================================
 * 轻账 · 视图：明细
 * 切月三列汇总、按日分组列表、月历浮层
 * 依赖：04-ui.js
 * ================================================================ */

/* ==================================================================
 * 渲染：明细（切月时三列汇总、月历、列表全部跟随）
 * ================================================================== */
let curMonth=ym(TODAY);
function renderDetail(){
  const d=pd(curMonth+'-01');
  document.getElementById('d-title').textContent=`${d.getMonth()+1} 月`;
  const rs=monthRecords(curMonth);                 // 列表显示全部（含大额，打标）
  const cs=rs.filter(counted);                     // 汇总只按「计入本月统计」口径
  const inc=sumBy(cs,'income'), out=sumBy(cs,'expense');
  document.getElementById('d-in').textContent=fmt0(inc);
  document.getElementById('d-out').textContent=fmt(out);
  document.getElementById('d-net').textContent=fmt0(inc-out);

  /* 按日分组，日倒序、日内按记账先后正序 */
  const byDay={};
  rs.forEach(r=>{(byDay[r.date]=byDay[r.date]||[]).push(r);});
  const days=Object.keys(byDay).sort((a,b)=>b.localeCompare(a));
  document.getElementById('d-list').innerHTML = days.length ? days.map(day=>{
    const arr=byDay[day].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    const countedArr=arr.filter(counted);
    const o=sumBy(countedArr,'expense'), i=sumBy(countedArr,'income');
    const ex=sumBy(arr.filter(r=>!counted(r)),'expense');   // 当日不计入的大额支出
    const dd=pd(day);
    const label=day===TODAY?'今天':(day===dateKey(addDay(new Date(),-1))?'昨天':'');
    const right=(i>0?`收 ${fmt0(i)}`:`支 ${fmt(o)}`)+(ex>0?`<span style="font-size:10px;color:var(--ink3)"> 大额${fmt0(ex)}</span>`:'');
    return `<div class="day-head" id="d-${day}"><span>${dd.getMonth()+1}月${dd.getDate()}日 ${label}</span><span style="display:flex;align-items:center;gap:8px"><span>${right}</span><button class="dayadd" title="在这一天记一笔" onclick="addOnDay('${day}')">＋</button></span></div>`
      + arr.map(r=>itemHtml(r)).join('');
  }).join('') : `<div class="empty"><div class="big">◌</div>这个月还没有记录<br>点中间的 ＋ 记一笔</div>`;
  bindItems('d-list');
  renderCal();
}
function toggleCal(){
  const c=document.getElementById('cal');
  c.classList.toggle('on');
  if(c.classList.contains('on')) renderCal();
}
/* 月历浮层：每格日期 + 当日支出；今日描边；点日期收起并定位 */
function renderCal(){
  const c=document.getElementById('cal');
  if(!c.classList.contains('on')) return;
  const first=pd(curMonth+'-01');
  const start=new Date(first); start.setDate(1-first.getDay());
  let html=`<div class="cal-top"><span>${first.getFullYear()}年${first.getMonth()+1}月</span>
    <div class="ar"><button class="arrow" onclick="shiftMonth(-1)">‹</button><button class="arrow" onclick="shiftMonth(1)">›</button></div></div>
    <div class="cal-grid">${WEEK.map(w=>`<div class="w">${w}</div>`).join('')}`;
  for(let i=0;i<42;i++){
    const d=addDay(start,i), key=dateKey(d);
    const off=ym(key)!==curMonth;
    const o=sumBy(store.state.records.filter(r=>r.date===key&&counted(r)),'expense');
    const cls=['cell',off?'dim':'',key===TODAY?'today':''].join(' ');
    html+=`<div class="${cls}" onclick="pickDay('${key}',this)"><span>${d.getDate()}</span><span class="m">${o>0?fmt0(o):''}</span></div>`;
  }
  c.innerHTML=html+'</div>';
}
function pickDay(day,el){
  document.querySelectorAll('#cal .cell').forEach(x=>x.classList.remove('on'));
  if(el) el.classList.add('on');
  setTimeout(()=>{
    document.getElementById('cal').classList.remove('on');
    const t=document.getElementById('d-'+day);
    if(t){t.scrollIntoView({behavior:'smooth',block:'start'});}
    else{openRecord(null,day);toast('补记 '+day.slice(5).replace('-','月')+'日 的账');}
  },160);
}
/* 切月：明细 / 统计 / 预算全部跟随 curMonth */
function shiftMonth(n){
  const d=pd(curMonth+'-01'); d.setMonth(d.getMonth()+n);
  curMonth=dateKey(d).slice(0,7);
  drill=null;
  renderDetail();renderStat();
}
