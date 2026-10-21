/* ================================================================
 * 轻账 · 启动
 * 默认分类种子、时钟、金额吸顶观察器、订阅视图、初始化
 * 依赖：以上全部（必须最后加载）
 * ================================================================ */

/* ==================================================================
 * 启动：库为空时写入默认分类种子 → store.refresh() → 订阅视图
 * ================================================================== */
async function seedIfEmpty(){
  if(await db.categories.count()>0) return;
  const put=async(list,type)=>{
    for(let i=0;i<list.length;i++){
      const [name,subs]=list[i];
      const color=String(i%PALETTE.length);
      const pid=uid();
      await db.categories.add({id:pid,name,type,parentId:null,sortOrder:i,archived:false,icon:name.slice(0,1),color});
      for(let j=0;j<subs.length;j++){
        await db.categories.add({id:uid(),name:subs[j],type,parentId:pid,sortOrder:j,archived:false,icon:subs[j].slice(0,1),color});
      }
    }
  };
  await put(SEED_EXPENSE,'expense');
  await put(SEED_INCOME,'income');
}
function clock(){
  const d=new Date(),s=pad(d.getHours())+':'+pad(d.getMinutes());
  ['clock','clock2','clock3','clock4','clock5'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=s;});
}
async function init(){
  buildKeys();clock();setInterval(clock,30000);
  /* 金额吸顶：哨兵滚出视口 → 金额条切换为紧凑吸顶态（记一笔页较长时金额始终可见） */
  const amtEl=document.querySelector('.rec-amount');
  new IntersectionObserver(([e])=>amtEl.classList.toggle('stuck',!e.isIntersecting),
    {rootMargin:'-1px 0px 0px 0px'}).observe(document.getElementById('amt-sentinel'));
  store.subscribe(()=>{renderHome();renderDetail();renderStat();renderMe();});
  await seedIfEmpty();
  await store.refresh();
}
init();
