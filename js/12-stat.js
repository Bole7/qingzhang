/* ================================================================
 * 轻账 · 视图：统计
 * 环形图（可下钻）+ 每日柱状图 + 近 6 月趋势，基于 Chart.js
 * 依赖：04-ui.js、vendor/chart.umd.min.js
 * ================================================================ */

/* ==================================================================
 * 渲染：统计（Chart.js 环形图 + 柱状图；只 update 不 destroy）
 * ================================================================== */
let drill=null, donutChart=null, barChart=null, dayChart=null, donutKeys=[];
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
  let data,centerLabel,total;
  if(drill){
    /* 下钻：该一级的二级构成 */
    const sub=rs.filter(r=>{const c=catById(r.categoryId);return parentOf(c)&&parentOf(c).id===drill;});
    data=group(sub,r=>{const c=catById(r.categoryId);return c?c.name:'';});
    total=sub.reduce((a,b)=>a+b.amount,0);
    const pc=catById(drill);
    centerLabel=pc?pc.name:'';
    document.getElementById('s-title').textContent=`${centerLabel} · 二级构成`;
    document.getElementById('s-back').innerHTML=`<div class="back" onclick="drill=null;renderStat()">‹ 返回全部</div>`;
  }else{
    data=group(rs,r=>{const c=catById(r.categoryId);const p=parentOf(c);return p?p.name:'';});
    total=rs.reduce((a,b)=>a+b.amount,0);
    centerLabel='总支出';
    document.getElementById('s-title').textContent='本月支出构成';
    document.getElementById('s-back').innerHTML='';
  }
  donutKeys=data.map(d=>d[0]);
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
      onClick:(e,els)=>{ if(!drill&&els.length) onLegend(donutKeys[els[0].index]); }
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
  /* 图例：色点 + 分类名 + 百分比 + 金额 */
  document.getElementById('s-legend').innerHTML = data.length
    ? data.map((d,i)=>`<div class="lg" onclick="onLegend('${esc(d[0])}')">
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
}
function onLegend(name){
  if(drill) return;
  /* 图例点的是一级分类名 → 找到其 id 下钻 */
  const p=parents('expense').find(c=>c.name===name);
  if(p){drill=p.id;renderStat();}
}
