/* ================================================================
 * 轻账 · 视图：我的
 * 连续记账、日均支出、总余额、分类数量
 * 依赖：03-domain.js
 * ================================================================ */

/* ==================================================================
 * 渲染：我的
 * ================================================================== */
function renderMe(){
  document.getElementById('m-streak').textContent=`已连续记账 ${streak()} 天`;
  const m=ym(TODAY), out=sumBy(monthRecords(m).filter(counted),'expense');
  /* 日均支出（已过天数口径）：本月支出 ÷ 今天日期 */
  const passed=new Date().getDate();
  const limit=resolveBudget(m,null);
  /* 总余额 = 起始余额 + 累计（全部收入 − 全部支出），含大额、不计口径 */
  const bal=(getMeta('startBalance')||0)+sumBy(store.state.records,'income')-sumBy(store.state.records,'expense');
  document.getElementById('m-budget').textContent=limit?fmt0(limit):'未设置';
  document.getElementById('m-avg').textContent=fmt0(Math.round(out/passed));
  document.getElementById('m-balance').textContent=fmt0(bal);
  document.getElementById('m-cat-em').textContent=`${parents('expense').length} 个`;
}
