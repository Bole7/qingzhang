/* ================================================================
 * 轻账 · 分类管理
 * 两级分类增删改，删除走 archived 软删除以保留历史流水
 * 依赖：03-domain.js、04-ui.js
 * ================================================================ */

/* ==================================================================
 * 分类管理（两级；删除用 archived 软删除，历史流水仍引用）
 * ================================================================== */
function openCats(){
  const sec=(type,label)=>`<div style="padding:14px 0 4px;font-size:12px;color:var(--ink3)">${label}</div>`+
    parents(type).map(c=>`<div class="field" onclick="editCat('${c.id}')" style="cursor:pointer">
      ${icoHtml(c)}<div style="flex:1;min-width:0"><div>${esc(c.name)}</div>
      <div style="font-size:11.5px;color:var(--ink3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${subsOf(c.id).map(s=>esc(s.name)).join(' · ')}</div></div>
      <span style="color:var(--ink3)">›</span></div>`).join('')+
    `<div class="btn ghost" onclick="addCat('${type}')">＋ 添加${label}一级分类</div>`;
  sheet(`<h4>分类管理</h4><p class="desc">点一级分类管理它的二级分类</p>${sec('expense','支出')}${sec('income','收入')}`);
}
function editCat(pid){
  const c=catById(pid), subs=subsOf(pid);
  sheet(`<h4>${esc(c.name)}</h4><p class="desc">二级分类（× 为删除，历史流水不受影响）</p>
    <div class="chips">${subs.map(s=>`<span class="chipx">${esc(s.name)}<span class="x" onclick="delSub('${s.id}','${pid}')">×</span></span>`).join('')}</div>
    <div class="field"><input id="si" placeholder="新的二级分类"></div>
    <div class="btn" onclick="addSub('${pid}')">添加二级</div>
    <div class="btn ghost" onclick="renameCat('${pid}')">重命名「${esc(c.name)}」</div>
    <div class="btn ghost" onclick="openCats()">返回</div>
    <div class="btn danger" onclick="delCat('${pid}')">删除「${esc(c.name)}」</div>`);
}
async function addSub(pid){
  const v=document.getElementById('si').value.trim();if(!v)return;
  const p=catById(pid);
  await db.categories.add({id:uid(),name:v,type:p.type,parentId:pid,sortOrder:Date.now(),archived:false,icon:v.slice(0,1),color:p.color});
  await store.refresh();notify();editCat(pid);
}
async function delSub(id,pid){
  await db.categories.update(id,{archived:true});   // 软删除
  await store.refresh();notify();editCat(pid);
}
async function renameCat(pid){
  const c=catById(pid);
  sheet(`<h4>重命名</h4><div class="field"><input id="ri" value="${esc(c.name)}"></div>
    <div class="btn" onclick="confirmRename('${pid}')">保存</div>
    <div class="btn ghost" onclick="editCat('${pid}')">返回</div>`);
}
async function confirmRename(pid){
  const v=document.getElementById('ri').value.trim();if(!v)return;
  await db.categories.update(pid,{name:v,icon:v.slice(0,1)});
  await store.refresh();notify();editCat(pid);
}
async function delCat(pid){
  if(!confirm('删除该分类？历史流水仍会保留。'))return;
  const ids=[pid,...subsOf(pid).map(s=>s.id)];
  await db.categories.where('id').anyOf(ids).modify({archived:true});   // 整棵子树软删除
  await store.refresh();notify();openCats();
}
function addCat(type){
  sheet(`<h4>新的一级分类</h4><p class="desc">图标取首字、配色自动循环，并自带「其他」二级</p>
    <div class="field"><input id="ci" placeholder="例如：宠物"></div>
    <div class="btn" onclick="confirmCat('${type}')">创建</div>
    <div class="btn ghost" onclick="openCats()">返回</div>`);
}
/* 创建一级分类（含「其他」二级兜底），返回新分类 id */
async function createParentCat(type,name){
  const list=parents(type);
  const color=String(list.length%PALETTE.length);     // 配色按顺序循环
  const pid=uid();
  await db.categories.add({id:pid,name,type,parentId:null,sortOrder:Date.now(),archived:false,icon:name.slice(0,1),color});
  await db.categories.add({id:uid(),name:'其他',type,parentId:pid,sortOrder:1,archived:false,icon:'其',color});
  return pid;
}
async function confirmCat(type){
  const v=document.getElementById('ci').value.trim();if(!v)return;
  await createParentCat(type,v);
  await store.refresh();notify();openCats();
}
/* 记一笔页宫格末尾「＋」：就地添加一级分类并自动选中 */
function addCatQuick(){
  sheet(`<h4>新的一级分类</h4><p class="desc">图标取首字、配色自动循环，并自带「其他」二级</p>
    <div class="field"><input id="ci" placeholder="例如：宠物"></div>
    <div class="btn" onclick="confirmCatQuick()">创建</div>
    <div class="btn ghost" onclick="closeSheet()">返回</div>`);
}
async function confirmCatQuick(){
  const v=document.getElementById('ci').value.trim();if(!v)return;
  const pid=await createParentCat(R.type,v);
  await store.refresh();notify();
  const s=subsOf(pid);
  R.c1=pid;R.c2=s[0]?s[0].id:'';
  closeSheet();renderRecord();toast('已添加分类');
}
