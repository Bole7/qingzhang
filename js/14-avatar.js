/* ================================================================
 * 轻账 · 头像
 * 系统相册选图 → 拖动 / 双指缩放裁剪 → 320px 方图存 meta.avatar
 * 依赖：02-db.js（db）、03-domain.js（getMeta/setMeta）、04-ui.js（sheet/toast）
 * ================================================================ */

/* 裁剪态：源图、缩放比（原图像素→CSS 像素）、偏移、指针集合 */
const AVA={img:null,iw:0,ih:0,base:1,k:1,tx:0,ty:0,vp:0,pts:new Map(),dist:0};

/* ==================================================================
 * 渲染与入口
 * ================================================================== */
/* 「我的」页头像：meta 里有图就铺满，没有回退「轻」字 */
function renderAvatar(){
  const el=document.getElementById('m-avatar');
  if(!el)return;
  const v=getMeta('avatar');
  if(typeof v==='string'&&v){
    el.style.backgroundImage='url("'+v+'")';
    el.classList.add('has');el.textContent='';
  }else{
    el.style.backgroundImage='';el.classList.remove('has');el.textContent='轻';
  }
}
/* 点头像：没头像直接进相册，已有头像先给「更换 / 恢复默认」 */
function openAvatar(){
  const v=getMeta('avatar');
  if(!(typeof v==='string'&&v)){document.getElementById('ava-pick').click();return;}
  sheet(`<h4>头像</h4><p class="desc">从系统相册选一张，可拖动缩放裁剪</p>
    <div class="btn" onclick="avaRepick()">更换头像</div>
    <div class="btn ghost" onclick="avaRemove()">恢复默认（轻）</div>
    <div class="btn ghost" onclick="closeSheet()">取消</div>`);
}
function avaRepick(){closeSheet();document.getElementById('ava-pick').click();}
async function avaRemove(){
  await setMeta('avatar','');
  await store.refresh();notify();
  closeSheet();toast('已恢复默认头像');
}

/* ==================================================================
 * 选图：相册 → FileReader → 降采样（长边 ≤1800）→ 进裁剪层
 * ================================================================== */
function avaPick(input){
  const f=input.files&&input.files[0];
  if(!f){input.value='';return;}                 /* 用户点了取消，静默返回 */
  const rd=new FileReader();
  rd.onerror=()=>{input.value='';toast('图片读取失败，请重试');};
  rd.onload=()=>{
    const img=new Image();
    img.onload=async()=>{
      input.value='';
      const src=await avaShrink(img);
      avaStart(src);
    };
    img.onerror=()=>{input.value='';toast('这张图打不开，换一张试试');};
    img.src=rd.result;
  };
  rd.readAsDataURL(f);
  input.value='';
}
/* 超大图先等比缩到长边 1800，手机端拖动才不卡；失败就用原图 */
function avaShrink(img){
  const w0=img.naturalWidth||img.width, h0=img.naturalHeight||img.height;
  if(!w0||!h0)return Promise.resolve(img);
  if(Math.max(w0,h0)<=1800)return Promise.resolve(img);
  const s=1800/Math.max(w0,h0), w=Math.round(w0*s), h=Math.round(h0*s);
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  cv.getContext('2d').drawImage(img,0,0,w,h);
  return new Promise(res=>{
    const i=new Image();
    i.onload=()=>res(i);
    i.onerror=()=>res(img);
    i.src=cv.toDataURL('image/jpeg',.94);
  });
}
/* 打开裁剪层：短边铺满取景框并居中 */
function avaStart(img){
  AVA.img=img;AVA.iw=img.naturalWidth;AVA.ih=img.naturalHeight;
  AVA.pts.clear();AVA.dist=0;
  document.getElementById('ava-img').src=img.src;
  document.getElementById('ava-layer').classList.add('on');
  /* 等一帧，取景框才有实际宽度 */
  requestAnimationFrame(()=>{
    const vp=document.getElementById('ava-vp');
    AVA.vp=vp.clientWidth;
    AVA.base=AVA.vp/Math.min(AVA.iw,AVA.ih);
    AVA.k=AVA.base;
    AVA.tx=(AVA.vp-AVA.iw*AVA.k)/2;
    AVA.ty=(AVA.vp-AVA.ih*AVA.k)/2;
    avaPaint();
  });
}

/* ==================================================================
 * 手势：单指拖动 / 双指捏合 / 滚轮缩放（统一按「原图像素比例」算）
 * ================================================================== */
function avaDown(e){
  if(!AVA.img)return;
  e.preventDefault();
  AVA.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(AVA.pts.size===2)AVA.dist=avaDist();
}
function avaMove(e){
  const p=AVA.pts.get(e.pointerId);
  if(!p||!AVA.img)return;
  /* 用坐标差而不是 movementX：iOS Safari 上后者在 pointer 事件里不可靠 */
  const dx=e.clientX-p.x, dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(AVA.pts.size===1){
    AVA.tx+=dx;
    AVA.ty+=dy;
    avaPaint();
    return;
  }
  if(AVA.pts.size>=2){
    const d=avaDist();
    if(AVA.dist>0&&d>0){
      const c=avaCenter();
      avaZoomAt(c.x,c.y,d/AVA.dist);
    }
    AVA.dist=d;
  }
}
function avaUp(e){
  AVA.pts.delete(e.pointerId);
  if(AVA.pts.size<2)AVA.dist=0;
}
function avaWheel(e){
  if(!AVA.img)return;
  e.preventDefault();
  const vp=document.getElementById('ava-vp').getBoundingClientRect();
  avaZoomAt(e.clientX-vp.left,e.clientY-vp.top,e.deltaY<0?1.09:1/1.09);
}
function avaDist(){
  const a=[...AVA.pts.values()];
  return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
}
function avaCenter(){
  const a=[...AVA.pts.values()];
  const vp=document.getElementById('ava-vp').getBoundingClientRect();
  return{x:(a[0].x+a[1].x)/2-vp.left,y:(a[0].y+a[1].y)/2-vp.top};
}
/* 以取景框内 (ax,ay) 为锚点缩放：锚点下的那一点内容保持不动 */
function avaZoomAt(ax,ay,ratio){
  const k2=Math.min(AVA.base*6,Math.max(AVA.base,AVA.k*ratio));
  const f=k2/AVA.k;
  if(f===1)return;
  AVA.tx=ax-(ax-AVA.tx)*f;
  AVA.ty=ay-(ay-AVA.ty)*f;
  AVA.k=k2;
  avaPaint();
}
/* 落位：图片尺寸 = 原图 × k，超出取景框的部分只能拖到边界为止 */
function avaPaint(){
  const el=document.getElementById('ava-img');
  if(!el||!AVA.img)return;
  const V=AVA.vp, W=AVA.iw*AVA.k, H=AVA.ih*AVA.k;
  AVA.tx=Math.min(0,Math.max(V-W,AVA.tx));
  AVA.ty=Math.min(0,Math.max(V-H,AVA.ty));
  el.style.width=W+'px';el.style.height=H+'px';
  el.style.transform='translate('+AVA.tx+'px,'+AVA.ty+'px)';
}

/* ==================================================================
 * 输出：按取景框反推源图区域，画到 320×320 画布 → meta.avatar
 * ================================================================== */
async function avaApply(){
  if(!AVA.img)return;
  const OUT=320, k=AVA.k, V=AVA.vp;
  const cv=document.createElement('canvas');cv.width=cv.height=OUT;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,OUT,OUT);   /* 透明 PNG 转 JPEG 时垫白底 */
  const side=V/k;
  ctx.drawImage(AVA.img,-AVA.tx/k,-AVA.ty/k,side,side,0,0,OUT,OUT);
  let url;
  try{url=cv.toDataURL('image/jpeg',.9);}catch(err){toast('处理失败，换张图试试');return;}
  await setMeta('avatar',url);
  await store.refresh();notify();
  avaClose();toast('头像已保存');
}
function avaClose(){
  document.getElementById('ava-layer').classList.remove('on');
  document.getElementById('ava-img').removeAttribute('src');
  AVA.img=null;AVA.pts.clear();AVA.dist=0;
}
