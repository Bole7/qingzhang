/* ================================================================
 * 轻账 · 领域逻辑
 * 分类解析与配色、统计口径、连续天数、预算读写 —— 不碰 DOM
 * 依赖：02-db.js、01-utils.js
 * ================================================================ */

/* ---------- 分类读取辅助（archived 的不进选择器，但历史流水仍可解析） ---------- */
const catById=id=>store.state.categories.find(c=>c.id===id);
const parents=type=>store.state.categories.filter(c=>c.type===type&&!c.parentId&&!c.archived).sort((a,b)=>a.sortOrder-b.sortOrder);
const subsOf=pid=>store.state.categories.filter(c=>c.parentId===pid&&!c.archived).sort((a,b)=>a.sortOrder-b.sortOrder);
const parentOf=c=>c&&c.parentId?catById(c.parentId):c;
/* 分类色：color 存 PALETTE 下标（字符串），新增时按顺序循环取用 */
function catColor(c){const p=PALETTE[(parseInt(c&&c.color)||0)%PALETTE.length];return{bg:p[0],fg:p[1]};}
function icoHtml(c,cls){
  if(!c) c={name:'?',color:'7'};
  const s=catColor(c);
  return `<div class="ico ${cls||''}" style="background:${s.bg};color:${s.fg}">${esc((c.name||'?').slice(0,1))}</div>`;
}

/* ---------- 统计计算（全部以「分」为单位） ---------- */
const sumBy=(rs,t)=>rs.filter(r=>r.type===t).reduce((a,b)=>a+b.amount,0);
const monthRecords=m=>store.state.records.filter(r=>ym(r.date)===m);
/* 计入本月统计口径：大额特殊支出可标记 inMonth=false；旧记录无此字段，默认计入 */
const counted=r=>r.inMonth!==false;
/* meta 键值读取/写入（起始余额等） */
const getMeta=k=>{const m=store.state.meta.find(x=>x.id===k);return m?m.value:0;};
async function setMeta(k,v){await db.meta.put({id:k,value:v});}
/* 连续记账天数：今天未记不算断，从昨天往前数 */
function streak(){
  let d=new Date(),n=0;
  const has=s=>store.state.records.some(r=>r.date===s);
  if(!has(dateKey(d))) d=addDay(d,-1);
  while(has(dateKey(d))){n++;d=addDay(d,-1);}
  return n;
}
/* 环比：本月截至今天 vs 上月同期；上月无数据返回 null（不显示胶囊） */
function monthCompare(){
  const m=ym(TODAY), day=new Date().getDate();
  const cur=monthRecords(m).filter(r=>counted(r)&&r.type==='expense'&&pd(r.date).getDate()<=day).reduce((a,b)=>a+b.amount,0);
  const pm=dateKey(addDay(pd(m+'-01'),-1)).slice(0,7);
  const prev=monthRecords(pm).filter(r=>counted(r)&&r.type==='expense'&&pd(r.date).getDate()<=day).reduce((a,b)=>a+b.amount,0);
  if(prev<=0) return null;
  return cur-prev;
}
/* 预算继承：本月没设 → 往前找最近有设置的月份沿用；limit<=0 视为「不设」（并阻断继承） */
function resolveBudget(m,categoryId){
  const list=store.state.budgets.filter(b=>b.month<=m&&String(b.categoryId)===String(categoryId));
  if(!list.length) return 0;
  list.sort((a,b)=>b.month.localeCompare(a.month));
  return list[0].limit>0?list[0].limit:0;
}
async function writeBudget(m,categoryId,limit){
  const ex=await db.budgets.where('month').equals(m).toArray();
  const hit=ex.find(b=>String(b.categoryId)===String(categoryId));
  if(hit) await db.budgets.update(hit.id,{limit});
  else await db.budgets.add({id:uid(),month:m,categoryId:categoryId||null,limit});
}
