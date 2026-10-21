/* ================================================================
 * 轻账 · 备份与设置
 * JSON 完整备份/恢复、CSV 导出、起始余额、清空数据
 * 依赖：03-domain.js、04-ui.js
 * ================================================================ */

/* ==================================================================
 * 备份与导出（JSON 完整恢复 + CSV 供 Excel）
 * ================================================================== */
function openBackup(){
  sheet(`<h4>备份与导出</h4><p class="desc">共 ${store.state.records.length} 条记录，数据只存在本机</p>
    <div class="btn" onclick="expJSON()">导出 JSON 备份</div>
    <div class="btn ghost" onclick="expCSV()">导出 CSV（Excel 可打开）</div>
    <div class="btn ghost" onclick="document.getElementById('imp').click()">导入备份恢复</div>
    <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="impJSON(this)">`);
}
function dl(name,text,type){
  const b=new Blob([type==='csv'?'\ufeff'+text:text],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function expJSON(){
  dl(`轻账备份-${TODAY}.json`,JSON.stringify({version:1,exportedAt:Date.now(),...store.state},null,2),'json');
  toast('已导出 JSON');
}
function expCSV(){
  const rows=[['日期','类型','一级分类','二级分类','备注','金额(元)','计入本月统计']];
  store.state.records.slice().sort((a,b)=>(a.date+(a.createdAt||'')).localeCompare(b.date+(b.createdAt||''))).forEach(r=>{
    const c=catById(r.categoryId), p=parentOf(c);
    rows.push([r.date,r.type==='expense'?'支出':'收入',p?p.name:'',c?c.name:'',r.note||'',(r.amount/100).toFixed(2),counted(r)?'是':'否']);
  });
  dl(`轻账账单-${TODAY}.csv`,rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'),'csv');
  toast('已导出 CSV');
}
function impJSON(input){
  const f=input.files&&input.files[0];
  if(!f){toast('没有读到文件，请重试');input.value='';return;}   // 部分手机 MIME 不匹配会静默给空文件列表
  const rd=new FileReader();
  rd.onerror=()=>{toast('文件读取失败，请重试');};
  rd.onload=async()=>{
    try{
      const d=JSON.parse(rd.result);
      if(!d||!Array.isArray(d.records)||!Array.isArray(d.categories))throw new Error('不是轻账备份文件');
      await db.transaction('rw',db.records,db.categories,db.budgets,db.meta,async()=>{
        await db.records.clear();await db.categories.clear();await db.budgets.clear();await db.meta.clear();
        await db.records.bulkAdd(d.records);
        await db.categories.bulkAdd(d.categories);
        await db.budgets.bulkAdd(d.budgets||[]);
        await db.meta.bulkAdd((d.meta||[]).map(m=>({id:m.id,value:m.value})));
      });
      await store.refresh();notify();
      closeSheet();toast(`已恢复 ${d.records.length} 条记录`);
    }catch(e){console.error('[import]',e);toast('导入失败：'+(e&&e.message?e.message:'文件格式不对'));}
  };
  rd.readAsText(f);input.value='';
}
function openSettings(){
  const sb=getMeta('startBalance')||0;
  sheet(`<h4>设置</h4><p class="desc">轻账 · 本地记账，数据只在本机 IndexedDB</p>
    <div class="field"><label>起始余额</label><input type="number" inputmode="decimal" id="sb" placeholder="0" value="${sb?sb/100:''}"></div>
    <div class="btn" onclick="saveStartBalance()">保存起始余额</div>
    <div class="btn danger" onclick="clearAll()">清空全部数据（保留默认分类）</div>
    <div class="btn ghost" onclick="closeSheet()">关闭</div>`);
}
/* 点「总余额」直接弹出的设置（与设置页共用 saveStartBalance） */
function openStartBalance(){
  const sb=getMeta('startBalance')||0;
  sheet(`<h4>总余额</h4><p class="desc">总余额 = 起始余额 + 累计收支（含大额），填 0 即从零起算</p>
    <div class="field"><label>起始余额（元）</label><input type="number" inputmode="decimal" id="sb" placeholder="0" value="${sb?sb/100:''}"></div>
    <div class="btn" onclick="saveStartBalance()">保存</div>`);
}
/* 起始余额（分）：总余额 = 起始余额 + 累计收支 */
async function saveStartBalance(){
  const v=Math.round(parseFloat(document.getElementById('sb').value||'0')*100);
  await setMeta('startBalance',v>0?v:0);
  await store.refresh();notify();
  closeSheet();toast('起始余额已保存');
}
async function clearAll(){
  if(!confirm('确定清空全部记账数据？此操作不可恢复，建议先导出备份。'))return;
  await db.records.clear();await db.budgets.clear();
  await store.refresh();notify();
  closeSheet();toast('已清空');
}
