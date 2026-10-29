/* ================================================================
 * 轻账 · 视图：统计
 * 环形图（可下钻）+ 每日柱状图 + 近 6 月趋势，基于 Chart.js
 * 依赖：04-ui.js、vendor/chart.umd.min.js
 * ================================================================ */

/* ==================================================================
 * 渲染：统计（Chart.js 环形图 + 柱状图；只 update 不 destroy）
 * ================================================================== */
let drill=null, drillSub=null, donutChart=null, barChart=null, dayChart=null, donutKeys=[], recMode=false;
/* 环形图中心文字插件 */
const centerTextPlugin={
  id:'ctext',
  afterDraw(chart){
    const o=chart.config.options.plugins.ctext;
    if(!o) return;
    const {ctx}=chart, a=chart.chartArea;
    const cx=(a.left+a.right)/2, cy=(a.top+a.bottom)/2;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#3B4C5E';ctx.font='300 20px sans-serif';ctx.fillText(o.line1,cx,cy-7);
    ctx.fillStyle='#A9B7C4';ctx.font='11px sans-serif';ctx.fillText(o.line2,cx,cy+13);
    ctx.restore();
  }
};
function group(rs,fn){
  const m={};rs.forEach(r=>{const k=fn(r);if(k)m[k]=(m[k]||0)+r.amount;});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}
function renderStat(){
  const rs=monthRecords(curMonth).filter(r=>counted(r)&&r.type==='expense');
  /* 分类被删/改动后兜底，别停在已失效的下钻层级 */
  if(drill&&!catById(drill)){drill=null;drillSub=null;}
  if(drillSub&&(!catById(drillSub)||catById(drillSub).parentId!==drill)) drillSub=null;
  const pc=drill?catById(drill):null;      // 一级分类
  const sc=drillSub?catById(drillSub):null; // 二级分类（第三级视图）
  const subRs=pc?rs.filter(r=>{const p=parentOf(catById(r.categoryId));return p&&p.id===pc.id;}):[];
  let data,centerLabel,total;
  if(pc){
    data=group(subRs,r=>{const c=catById(r.categoryId);return c?c.name:'';});
    total=subRs.reduce((a,b)=>a+b.amount,0);
    centerLabel=pc.name;
    /* 标题只显示分类名：一级视图 = 一级分类名，三级视图 = 一级 · 二级 */
    document.getElementById('s-title').textContent=sc?`${pc.name} · ${sc.name}`:pc.name;
  }else{
    data=group(rs,r=>{const c=catById(r.categoryId);const p=parentOf(c);return p?p.name:'';});
    total=rs.reduce((a,b)=>a+b.amount,0);
    centerLabel='总支出';
    document.getElementById('s-title').textContent='本月支出构成';
  }
  /* 返回按钮：三级 → 二级 → 全部 */
  document.getElementById('s-back').innerHTML = pc
    ? `<div class="back" onclick="backStat()">‹ 返回${esc(sc?pc.name:'全部')}</div>`
    : '';
  donutKeys=data.map(d=>d[0]);
  /* 三级时只在高亮图例上做标记，扇区颜色保持原样（调淡会让大占比扇区几乎看不见） */
  const selIdx=sc?data.findIndex(d=>d[0]===sc.name):-1;
  const labels=data.length?data.map(d=>d[0]):['暂无支出'];
  const values=data.length?data.map(d=>d[1]/100):[1];
  const colors=data.length?data.map((_,i)=>PIE[i%PIE.length]):['#EAF1F8'];
  const cfg={
    type:'doughnut',
    data:{labels,datasets:[{data:values,backgroundColor:colors,borderWidth:0,hoverOffset:4}]},
    options:{
      cutout:'72%',maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{enabled:!!data.length,callbacks:{label:c=>` ${c.label} ¥${fmt(Math.round(c.parsed*100))}`}},
        ctext:{line1:fmt0(total),line2:centerLabel}},
      onClick:(e,els)=>{ if(data.length&&els.length) onLegendIdx(els[0].index); }
    },
    plugins:[centerTextPlugin]
  };
  if(!donutChart){ donutChart=new Chart(document.getElementById('donutCv'),cfg); }
  else{
    /* 只更新数据，不销毁重建，避免每记一笔闪一下 */
    donutChart.data=cfg.data;
    donutChart.options.plugins.ctext=cfg.options.plugins.ctext;
    donutChart.options.plugins.tooltip.enabled=cfg.options.plugins.tooltip.enabled;
    donutChart.update();
  }
  /* 图例：色点 + 分类名 + 百分比 + 金额（一级点进二级，二级点进三级明细） */
  document.getElementById('s-legend').innerHTML = data.length
    ? data.map((d,i)=>`<div class="lg ${selIdx===i?'on':''}" onclick="onLegendIdx(${i})">
        <i class="dot" style="background:${PIE[i%PIE.length]}"></i>${esc(d[0])} ${Math.round(d[1]/total*100)}%<b>${fmt0(d[1])}</b></div>`).join('')
    : `<div style="color:var(--ink3);font-size:12.5px">本月还没有支出记录</div>`;

  /* 当月每日支出柱状图：只算「计入本月统计」的支出；查看本月时只画到今天，今天高亮 */
  const dim=pd(curMonth+'-01');
  const daysInMonth=new Date(dim.getFullYear(),dim.getMonth()+1,0).getDate();
  const isCur=curMonth===ym(TODAY);
  const lastDay=isCur?new Date().getDate():daysInMonth;
  const byDate={};
  rs.forEach(r=>{byDate[r.date]=(byDate[r.date]||0)+r.amount;});
  const days=[];for(let i=1;i<=lastDay;i++)days.push(i);
  const dvals=days.map(d=>(byDate[curMonth+'-'+pad(d)]||0)/100);
  const todayD=new Date().getDate();
  document.getElementById('s-daytitle').textContent=`${dim.getMonth()+1}月每日支出`;
  const dcfg={
    type:'bar',
    data:{labels:days.map(String),
      datasets:[{data:dvals,borderRadius:{topLeft:4,topRight:4},borderSkipped:'bottom',maxBarThickness:12,
        backgroundColor:days.map(d=>(isCur&&d===todayD)?'#7FA8D4':'#C9DFF2')}]},
    options:{maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{
        title:items=>`${dim.getMonth()+1}月${items[0].label}日`,
        label:c=>` ¥${fmt(Math.round(c.parsed.y*100))}`}}},
      scales:{x:{grid:{display:false},border:{display:false},
                ticks:{color:'#A9B7C4',font:{size:10},autoSkip:false,maxRotation:0,
                  callback:function(v){const l=+this.getLabelForValue(v);return (l===1||l%5===0)?l:'';}}},
              y:{display:false,beginAtZero:true}}}
  };
  if(!dayChart){ dayChart=new Chart(document.getElementById('dayCv'),dcfg); }
  else{ dayChart.data=dcfg.data; dayChart.update(); }

  /* 近 6 个月趋势：当前月主色 #7FA8D4，其余 #C9DFF2 */
  const months=[];
  for(let i=5;i>=0;i--){const d=pd(curMonth+'-01');d.setMonth(d.getMonth()-i);months.push(dateKey(d).slice(0,7));}
  const vals=months.map(mm=>sumBy(monthRecords(mm).filter(counted),'expense')/100);
  const bcfg={
    type:'bar',
    data:{labels:months.map(mm=>pd(mm+'-01').getMonth()+1+'月'),
      datasets:[{data:vals,borderRadius:{topLeft:8,topRight:8},borderSkipped:'bottom',maxBarThickness:30,
        backgroundColor:months.map(mm=>mm===curMonth?'#7FA8D4':'#C9DFF2')}]},
    options:{maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ¥${fmt(Math.round(c.parsed.y*100))}`}}},
      scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#A9B7C4',font:{size:11}}},
              y:{display:false,beginAtZero:true}}}
  };
  if(!barChart){ barChart=new Chart(document.getElementById('barCv'),bcfg); }
  else{ barChart.data=bcfg.data; barChart.update(); }

  /* 三级视图：藏起两个图表，换成该二级分类的当月逐笔明细 */
  const wasRec=recMode; recMode=!!sc;
  document.getElementById('s-charts').style.display=sc?'none':'';
  document.getElementById('s-rec').style.display=sc?'':'none';
  if(sc) renderSubList(sc);
  else if(wasRec) requestAnimationFrame(()=>{dayChart&&dayChart.resize();barChart&&barChart.resize();});
}
/* 三级明细：某个二级分类当月的每一条消费 */
function renderSubList(sc){
  const dim=pd(curMonth+'-01'), m=dim.getMonth()+1;
  const rs=monthRecords(curMonth)
    .filter(r=>counted(r)&&r.type==='expense'&&r.categoryId===sc.id)
    .sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0));
  const total=rs.reduce((a,b)=>a+b.amount,0);
  document.getElementById('s-dtitle').textContent=`${m}月明细`;
  document.getElementById('s-dsum').textContent=rs.length?`共 ${rs.length} 笔 · 合计 ¥${fmt(total)}`:'';
  document.getElementById('s-rlist').innerHTML=rs.length
    ? rs.map(r=>{
        const d=pd(r.date), wd='日一二三四五六'[d.getDay()];
        return `<div class="item" data-id="${r.id}">
          <div class="ico" style="background:#EAF2FA;color:#5C87B8;font-size:14px">${d.getDate()}</div>
          <div class="t"><p>${esc(r.note||sc.name)}</p><span>${d.getMonth()+1}月${d.getDate()}日 周${wd}</span></div>
          <div class="v minus">-${fmt(r.amount)}</div>
        </div>`;
      }).join('')
    : `<div class="empty"><div class="big">◌</div>${m}月还没有「${esc(sc.name)}」的消费</div>`;
  bindItems('s-rlist');
}
function backStat(){
  if(drillSub) drillSub=null; else drill=null;
  renderStat();
}
function onLegendIdx(i){
  const name=donutKeys[i];
  if(!name) return;
  if(!drill){
    /* 一级图例 → 下钻到该一级分类的二级构成 */
    const p=parents('expense').find(c=>c.name===name);
    if(p){drill=p.id;drillSub=null;renderStat();}
    return;
  }
  /* 二级图例 → 展示该二级分类的当月逐笔明细；再点一次退回二级构成 */
  const s=subsOf(drill).find(c=>c.name===name);
  if(!s) return;
  drillSub=(drillSub===s.id)?null:s.id;
  renderStat();
}
