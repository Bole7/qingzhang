/* ================================================================
 * 轻账 · 视图：首页
 * 今日 / 本月汇总、环比胶囊、预算卡、当日流水
 * 依赖：04-ui.js
 * ================================================================ */

/* ==================================================================
 * 渲染：首页
 * ================================================================== */
function renderHome(){
  const d=new Date();
  document.getElementById('h-date').textContent=`${d.getMonth()+1}月${d.getDate()}日 · 星期${WEEK[d.getDay()]}`;
  const todayOut=sumBy(store.state.records.filter(r=>r.date===TODAY&&counted(r)),'expense');
  const monthOut=sumBy(monthRecords(ym(TODAY)).filter(counted),'expense');
  document.getElementById('h-today').textContent=fmt(todayOut);
  document.getElementById('h-month').textContent=fmt(monthOut);

  /* 环比胶囊 */
  const diff=monthCompare();
  document.getElementById('h-chip').innerHTML = diff===null?'':
    `<div class="chip"><span class="d" style="background:${diff<0?'var(--green)':'var(--red)'}"></span>${diff<0?'比上月少花':'比上月多花'} ¥${fmt0(Math.abs(diff))}</div>`;

  /* 预算卡（未设预算整块隐藏） */
  const m=ym(TODAY), limit=resolveBudget(m,null), box=document.getElementById('h-budget');
  if(!limit){box.innerHTML='';}
  else{
    const pct=monthOut/limit*100;
    /* 超支提醒：0–80% 主色蓝；80–100% 黄；超 100% 红 + 超出金额 */
    const color=pct>100?'var(--red)':(pct>=80?'var(--coral)':'var(--blue)');
    const left=limit-monthOut;
    /* 剩余日均可用（含今天口径）：剩余天数 = 当月总天数 − 今天日期 + 1 */
    const days=daysInMonth(m)-d.getDate()+1;
    const note = left>=0
      ? `剩余 ¥${fmt(left)}，还有 ${days} 天，日均可用 ¥${fmt(Math.max(0,Math.round(left/days)))}`
      : `已超出 ¥${fmt(-left)}，本月还有 ${days} 天`;
    box.innerHTML=`<div class="budget"><div class="row"><span>本月预算</span><span><b>${fmt(monthOut)}</b> / ${fmt(limit)}</span></div>
      <div class="bar"><i style="width:${Math.min(pct,100)}%;background:${color}"></i></div>
      <div class="bar-note">${note}</div></div>`;
  }

  /* 只显示今天的记录，按记账先后正序 */
  const list=store.state.records.filter(r=>r.date===TODAY).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  document.getElementById('h-list').innerHTML = list.length
    ? list.map(r=>itemHtml(r)).join('')
    : `<div class="empty"><div class="big">◌</div>今天还没有记账<br>点底部的 ＋ 记下第一笔</div>`;
  bindItems('h-list');
}
