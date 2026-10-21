/* ================================================================
 * 轻账 · 路由
 * 视图切换与底部标签栏绑定
 * 依赖：各视图文件
 * ================================================================ */

/* ==================================================================
 * 路由
 * ================================================================== */
function go(v,i){
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id===v));
  if(i!==null&&i!==undefined){
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',+t.dataset.i===i));
  }
  document.getElementById('tabbar').style.display = v==='v-record'?'none':'flex';
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  if(t.dataset.v==='v-detail'){curMonth=ym(TODAY);}
  go(t.dataset.v,+t.dataset.i);
});
