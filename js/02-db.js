/* ================================================================
 * 轻账 · 数据层
 * Dexie 实例与表结构；集中 store + 订阅 + 多标签页广播
 * 依赖：vendor/dexie.min.js
 * ================================================================ */

/* ---------- Dexie 数据层 ---------- */
const db=new Dexie('qingzhang');
db.version(1).stores({
  records:'id, date, categoryId',      // 流水：amount 为整数分
  categories:'id, type, parentId',     // 分类：parentId 为 null 表示一级；archived 软删除
  budgets:'id, month'                  // 预算：categoryId 为 null 表示总预算
});
/* v2：新增 meta 表（起始余额等键值设置），旧库自动升级，已有数据不受影响 */
db.version(2).stores({
  records:'id, date, categoryId',
  categories:'id, type, parentId',
  budgets:'id, month',
  meta:'id'
});

/* ---------- 集中 store + 订阅 ---------- */
const store={
  state:{records:[],categories:[],budgets:[],meta:[]},
  subs:new Set(),
  subscribe(fn){this.subs.add(fn);},
  async refresh(){
    const [records,categories,budgets,meta]=await Promise.all([
      db.records.toArray(),db.categories.toArray(),db.budgets.toArray(),db.meta.toArray()
    ]);
    Object.assign(this.state,{records,categories,budgets,meta});
    /* 逐个隔离调用：任一视图渲染抛错都不影响其他视图和后续写流程（否则界面表现为"没反应"） */
    this.subs.forEach(fn=>{try{fn(this.state);}catch(e){console.error('[render]',e);}});
  }
};
/* 多标签页同步：写操作后广播；收到消息只 refresh，不再广播（避免死循环） */
const bc=('BroadcastChannel' in window)?new BroadcastChannel('qingzhang'):null;
if(bc) bc.onmessage=()=>store.refresh();
function notify(){if(bc)bc.postMessage('changed');}
