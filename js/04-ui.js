/* ================================================================
 * 轻账 · UI 基础件
 * 弹层（Sheet / Mask / Toast）与明细条目渲染 —— 各视图共用
 * 依赖：03-domain.js
 * ================================================================ */

/* ==================================================================
 * 弹层基础
 * ================================================================== */
function sheet(html){
  document.getElementById('sheet').innerHTML=html;
  document.getElementById('sheet').classList.add('on');
  document.getElementById('mask').classList.add('on');
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('on');
  document.getElementById('mask').classList.remove('on');
}
document.getElementById('mask').onclick=closeSheet;
let toastT;
function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('on');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1600);
}

/* 明细条：主标题=备注（无则回退分类名）；副标题=一级 · 二级；支出 ink、收入 green；不计入本月的加「大额」标 */
function itemHtml(r){
  const c=catById(r.categoryId), p=parentOf(c);
  const title=r.note||(c?c.name:'未分类');
  const catPath=(p?p.name:'未分类')+(c&&c.parentId?' · '+c.name:'');
  const sign=r.type==='expense'?'-':'+';
  return `<div class="item" data-id="${r.id}">
    ${icoHtml(p)}
    <div class="t"><p>${esc(title)}${counted(r)?'':'<i class="tagx">大额</i>'}</p><span>${esc(catPath)}</span></div>
    <div class="v ${r.type==='expense'?'minus':'plus'}">${sign}${fmt(r.amount)}</div>
  </div>`;
}
function bindItems(id){
  document.getElementById(id).querySelectorAll('.item').forEach(el=>{
    el.onclick=()=>openRecord(el.dataset.id);
  });
}
