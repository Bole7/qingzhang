/* ================================================================
 * 轻账 · 预算与提醒
 * 月总预算 + 一级分类预算，含上月沿用规则
 * 依赖：03-domain.js、04-ui.js
 * ================================================================ */

/* ==================================================================
 * 预算与提醒（总预算 + 一级分类预算；二级不引导）
 * ================================================================== */
function openBudget(){
  const m=ym(TODAY), out=sumBy(monthRecords(m),'expense');
  const total=resolveBudget(m,null);
  const rows=parents('expense').map(c=>{
    const lim=resolveBudget(m,c.id);
    const spent=monthRecords(m).filter(r=>{const cc=catById(r.categoryId);return counted(r)&&r.type==='expense'&&parentOf(cc)&&parentOf(cc).id===c.id;}).reduce((a,b)=>a+b.amount,0);
    const pct=lim?Math.min(100,spent/lim*100):0;
    const color=!lim?'var(--blue)':(pct>100?'var(--red)':(pct>=80?'var(--coral)':'var(--blue)'));
    return `<div class="brow">${icoHtml(c)}<div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;font-size:12.5px"><span>${esc(c.name)}</span>
        <span style="color:${lim&&spent>lim?'var(--red)':'var(--ink3)'};font-size:11.5px">${lim?fmt(spent)+' / '+fmt(lim)+(spent>lim?' · 超 '+fmt(spent-lim):''):'未设'}</span></div>
        <div class="bar" style="margin-top:6px;height:5px"><i style="width:${lim?pct:0}%;background:${color}"></i></div></div>
      <input type="number" inputmode="decimal" placeholder="额度" data-cat="${c.id}" value="${lim?lim/100:''}"></div>`;
  }).join('');
  sheet(`<h4>预算与提醒</h4><p class="desc">本月没设的会沿用上个月；填 0 或留空即不设</p>
    <div class="field"><label>月总预算</label><input type="number" inputmode="decimal" id="bi" placeholder="0" value="${total?total/100:''}"></div>
    <div style="padding-top:8px;font-size:12px;color:var(--ink3)">分类预算（一级）</div>
    ${rows}
    <div class="btn" onclick="confirmBudget()">保存</div>`);
}
async function confirmBudget(){
  const m=ym(TODAY);
  const tv=Math.round(parseFloat(document.getElementById('bi').value||'0')*100);   // 元 → 分
  await writeBudget(m,null,tv>0?tv:0);
  const inputs=document.querySelectorAll('#sheet input[data-cat]');
  for(const el of inputs){
    const v=Math.round(parseFloat(el.value||'0')*100);
    await writeBudget(m,el.dataset.cat,v>0?v:0);
  }
  await store.refresh();notify();
  closeSheet();toast('预算已更新');
}
