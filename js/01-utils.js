/* ================================================================
 * 轻账 · 通用工具
 * 日期 / 时间 / 金额 / 转义等纯函数
 * 依赖：02 之前
 * ================================================================ */

/* ---------- 工具函数 ---------- */
const pad=n=>String(n).padStart(2,'0');
/* 本地日期键 'YYYY-MM-DD'，绝不用 toISOString()（东八区会差一天） */
function dateKey(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
/* 时间键 'HH:mm'，与日期分开存 */
function timeKey(d=new Date()){return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}
const pd=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c);};          // 'YYYY-MM-DD' → Date（本地）
const addDay=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x;};
const ym=s=>s.slice(0,7);                                                                // 取 'YYYY-MM'
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* 金额展示：分 → 元，两位小数 + 千分位；数字字重 300 由 CSS 控制 */
const fmt=c=>(c/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt0=c=>Math.round(c/100).toLocaleString('zh-CN');
const TODAY=dateKey();
function daysInMonth(m){const d=pd(m+'-01');return new Date(d.getFullYear(),d.getMonth()+1,0).getDate();}
