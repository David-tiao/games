import {
  WIDTH,HEIGHT,TICK,RECIPES,INGREDIENTS,createKitchen,startKitchen,
  togglePause,stepKitchen,itemName,stationFacing
} from './shared/engine.mjs';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const TILE=48;
const pressed=new Set();
const queued={p1:false,p2:false};
let state=createKitchen();
let lastFrame=0,accumulator=0,lastHud=0,seenEventCount=0;
const icons={crate:'🧺',plates:'🍽️',board:'🔪',stove:'🔥',counter:'📦',pass:'📮',assembly:'⭐',serve:'🔔',trash:'🗑️'};
const labels={crate:'食材',plates:'盘子',board:'砧板',stove:'灶台',counter:'台面',pass:'交接',assembly:'装盘',serve:'上菜',trash:'垃圾'};
const accents={crate:'#576f53',plates:'#697b84',board:'#a58656',stove:'#af6845',counter:'#5a7080',pass:'#68979b',assembly:'#b38951',serve:'#54a08d',trash:'#7c6469'};
const inputKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','ShiftRight','KeyP']);

function setupMode(coop){
  state=createKitchen({coop,duration:150,seed:Date.now()>>>0});
  startKitchen(state);
  accumulator=0;seenEventCount=0;
  pressed.clear();queued.p1=false;queued.p2=false;
  $('mode').textContent=coop?'本地双人合作':'单人练习';
  $('p2card').style.opacity=coop?'1':'.36';
  $('overlay').classList.add('hidden');
  $('pauseBtn').textContent='⏸ 暂停';
  renderHUD();
}
function showEnd(){
  const totalDistance=state.players.reduce((sum,p)=>sum+p.distance,0);
  const overlay=$('overlay');
  overlay.innerHTML='<div class="dialog"><div class="eyebrow">SHIFT COMPLETE · 营业结束</div>'+
    '<div class="hero">🏆 🍲</div><h1>本日结算</h1>'+
    '<div class="results"><div><b>'+state.score+'</b><span>总得分</span></div>'+
    '<div><b>'+state.delivered+'</b><span>成功送餐</span></div>'+
    '<div><b>'+state.expired+'</b><span>超时订单</span></div>'+
    '<div><b>'+state.waste+'</b><span>丢弃物品</span></div></div>'+
    '<p>厨师总移动 '+totalDistance+' 格 · 错误上菜 '+state.mistakes+' 次</p>'+
    '<div class="modes"><button class="primary" id="againSolo">再玩单人</button>'+
    '<button class="primary orange" id="againCoop">再玩双人</button></div></div>';
  $('againSolo').addEventListener('click',()=>setupMode(false));
  $('againCoop').addEventListener('click',()=>setupMode(true));
  overlay.classList.remove('hidden');
}
function showPause(){
  const overlay=$('overlay');
  overlay.innerHTML='<div class="dialog"><div class="eyebrow">PAUSED</div><div class="hero">⏸️</div>'+
    '<h1>厨房休息中</h1><p>按 P 或点击继续，订单计时已暂停。</p>'+
    '<div class="modes"><button class="primary" id="resumeBtn">▶ 继续营业</button></div></div>';
  $('resumeBtn').addEventListener('click',()=>{togglePause(state);overlay.classList.add('hidden');$('pauseBtn').textContent='⏸ 暂停';});
  overlay.classList.remove('hidden');
}
function pause(){
  if(state.phase==='running'){
    togglePause(state);showPause();$('pauseBtn').textContent='▶ 继续';
  }else if(state.phase==='paused'){
    togglePause(state);$('overlay').classList.add('hidden');$('pauseBtn').textContent='⏸ 暂停';
  }
}
$('soloBtn').addEventListener('click',()=>setupMode(false));
$('coopBtn').addEventListener('click',()=>setupMode(true));
$('pauseBtn').addEventListener('click',pause);
$('restartBtn').addEventListener('click',()=>setupMode(state.coop));
window.addEventListener('keydown',e=>{
  if(!inputKeys.has(e.code))return;
  e.preventDefault();
  if(e.code==='KeyP'&&!e.repeat){pause();return;}
  if(!e.repeat){
    if(e.code==='KeyE')queued.p1=true;
    if(e.code==='Enter')queued.p2=true;
  }
  pressed.add(e.code);
});
window.addEventListener('keyup',e=>{if(inputKeys.has(e.code)){e.preventDefault();pressed.delete(e.code);}});
window.addEventListener('blur',()=>{pressed.clear();queued.p1=false;queued.p2=false;});
for(const button of document.querySelectorAll('[data-code]')){
  const code=button.dataset.code;
  const begin=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);pressed.add(code);if(code==='KeyE')queued.p1=true;};
  const end=e=>{e.preventDefault();pressed.delete(code);};
  button.addEventListener('pointerdown',begin);
  button.addEventListener('pointerup',end);
  button.addEventListener('pointercancel',end);
  button.addEventListener('lostpointercapture',()=>pressed.delete(code));
}
function getInputs(){
  const movement=(up,down,left,right)=>{
    if(pressed.has(left))return {dx:-1,dy:0};
    if(pressed.has(right))return {dx:1,dy:0};
    if(pressed.has(up))return {dx:0,dy:-1};
    if(pressed.has(down))return {dx:0,dy:1};
    return {dx:0,dy:0};
  };
  const a=movement('KeyW','KeyS','KeyA','KeyD');
  const b=movement('ArrowUp','ArrowDown','ArrowLeft','ArrowRight');
  const result=[
    {playerId:'p1',...a,interact:queued.p1,work:pressed.has('Space')},
    {playerId:'p2',...b,interact:queued.p2,work:pressed.has('ShiftRight')},
  ];
  queued.p1=false;queued.p2=false;
  return result;
}
function emoji(item){
  if(!item)return '';
  if(item.kind==='plate')return '🍽️';
  if(item.kind==='dish')return RECIPES[item.recipeId]?.icon||'🍱';
  if(item.kind==='pot'||item.kind==='soup')return '🍲';
  return INGREDIENTS[item.kind]?.icon||'📦';
}
function rounded(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.lineWidth=1.2;ctx.strokeStyle=stroke;ctx.stroke();}
}
function centerText(text,x,y,font,color){
  ctx.save();ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function drawTile(x,y){
  const px=x*TILE,py=y*TILE;
  if(x===0||x===WIDTH-1||y===0||y===HEIGHT-1){
    ctx.fillStyle=(x+y)%2?'#3f5661':'#344952';
    ctx.fillRect(px,py,TILE,TILE);
    ctx.fillStyle='#576e78';ctx.fillRect(px,py,TILE,4);return;
  }
  ctx.fillStyle=(x+y)%2?'#29404a':'#304a52';
  ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle='#3b5760';ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
  if((x*13+y*7)%11===0){ctx.fillStyle='#64808a55';ctx.fillRect(px+20,py+20,3,3);}
}
function drawStation(st){
  const x=st.x*TILE,y=st.y*TILE;
  rounded(x+2,y+4,44,41,8,'#192c37','#62808b');
  rounded(x+4,y+2,40,35,7,accents[st.type]||'#60737f','#9bb5ba');
  if(st.type==='crate')centerText(INGREDIENTS[st.ingredient].icon,x+24,y+19,'24px sans-serif','#fff');
  else centerText(icons[st.type],x+24,y+18,'23px sans-serif','#fff');
  centerText(labels[st.type],x+24,y+42,'bold 9px system-ui','#fff6db');
  if(st.slot){
    rounded(x+27,y+2,20,20,7,'#14202ae0','#d3ecdc');
    centerText(emoji(st.slot),x+37,y+12,'15px sans-serif','#fff');
    if(st.slot.kind==='plate'&&st.slot.ingredients.length>0){
      centerText(String(st.slot.ingredients.length),x+42,y+29,'bold 10px sans-serif','#ffe5b2');
    }
  }
  if(st.type==='board'&&st.slot?.stage==='raw'&&st.progress>0){
    rounded(x+5,y+32,38,5,3,'#18212c');
    rounded(x+5,y+32,38*st.progress/2,5,3,'#ffdc7f');
  }
  if(st.type==='stove'&&st.slot?.kind==='pot'&&st.slot.ingredients.length===2){
    rounded(x+5,y+32,38,5,3,'#18212c');
    rounded(x+5,y+32,38*st.progress/6,5,3,'#a5dba0');
  }
  if(st.type==='stove'&&st.slot?.stage==='cooked'){
    rounded(x+5,y+32,38,5,3,'#18212c');
    rounded(x+5,y+32,38*st.progress/8,5,3,'#eab965');
  }
  if(st.slot?.stage==='burnt')centerText('⚠️',x+36,y+4,'19px sans-serif','#fff');
}
function drawPlayer(p,index){
  if(index===1&&!state.coop)return;
  const x=(p.x+.5)*TILE,y=(p.y+.5)*TILE;
  const color=index===0?'#57d5ee':'#f48da4';
  ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(x,y+16,16,6,0,0,Math.PI*2);ctx.fill();
  rounded(x-16,y-16,32,33,12,color,index===0?'#d8fdff':'#ffd7df');
  rounded(x-9,y+1,18,12,4,'#fff2dc');
  centerText(index===0?'👨‍🍳':'👩‍🍳',x,y-5,'25px sans-serif','#fff');
  const arrow={up:'▲',down:'▼',left:'◀',right:'▶'}[p.face];
  centerText(arrow,x,y+20,'bold 10px sans-serif','#fff9df');
  centerText('P'+(index+1),x,y-25,'bold 12px system-ui',color);
  if(p.held){
    rounded(x+13,y-25,24,24,8,'#102632','#f1e0aa');
    centerText(emoji(p.held),x+25,y-13,'18px sans-serif','#fff');
  }
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)drawTile(x,y);
  for(const st of state.stations)drawStation(st);
  const a=state.players[0],b=state.players[1];
  if(state.coop){
    const pass=state.stations.find(s=>s.id==='pass');
    ctx.save();ctx.strokeStyle='#fbda9040';ctx.setLineDash([6,8]);ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo((a.x+.5)*48,(a.y+.5)*48);
    ctx.lineTo((pass.x+.5)*48,(pass.y+.5)*48);
    ctx.lineTo((b.x+.5)*48,(b.y+.5)*48);ctx.stroke();ctx.restore();
  }
  state.players.forEach(drawPlayer);
  const facing=stationFacing(state,a);
  if(facing){
    ctx.save();ctx.strokeStyle='#f4d77f';ctx.lineWidth=3;ctx.strokeRect(facing.x*48+2,facing.y*48+2,44,44);ctx.restore();
  }
}
function formatTime(seconds){
  const t=Math.ceil(Math.max(0,seconds));
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}
function renderHUD(){
  $('time').textContent=formatTime(state.remaining);
  $('score').textContent=String(state.score);
  $('progress').textContent=state.delivered+' / '+state.expired;
  $('combo').textContent='×'+state.combo;
  $('p1hand').textContent=(state.players[0].held?emoji(state.players[0].held):'👐')+' '+itemName(state.players[0].held);
  $('p2hand').textContent=(state.players[1].held?emoji(state.players[1].held):'👐')+' '+itemName(state.players[1].held);
  $('feedback').textContent=state.messageTime>0?state.message:'面朝工作台按交互键；切菜按住工作键。';
  $('orders').innerHTML=state.orders.length?state.orders.map(o=>{
    const r=RECIPES[o.recipeId];
    const percentage=Math.max(0,Math.min(100,o.remaining/o.limit*100));
    const urgent=percentage<25?' urgent':'';
    return '<div class="ticket'+urgent+'"><header><span>'+r.icon+' '+r.name+'</span><small>#'+o.id+'</small></header>'+
      '<div><small>剩余 '+Math.ceil(Math.max(0,o.remaining))+' 秒 · '+r.base+' 基础分</small></div>'+
      '<div class="timer-track"><i style="width:'+percentage.toFixed(1)+'%"></i></div></div>';
  }).join(''):'<div class="empty">🎉 暂无待完成订单！</div>';
}
function frame(now){
  if(!lastFrame)lastFrame=now;
  const dt=Math.min(.2,(now-lastFrame)/1000);
  lastFrame=now;
  if(state.phase==='running'){
    accumulator+=dt;
    let iterations=0;
    while(accumulator>=TICK&&iterations++<5){
      stepKitchen(state,getInputs(),TICK);
      accumulator-=TICK;
    }
    if(state.phase==='finished')showEnd();
  }else accumulator=0;
  draw();
  if(now-lastHud>160){renderHUD();lastHud=now;}
  requestAnimationFrame(frame);
}
renderHUD();
requestAnimationFrame(frame);
