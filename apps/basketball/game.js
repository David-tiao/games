import {COURT,createGame,stepGame,shootBall,passBall,trySteal,tryBlockShot,switchPlayer,bestPassTarget,getShotInfo,distance} from './engine.mjs';
const canvas=document.getElementById('court'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let difficulty='normal';let game=createGame(2026,{difficulty}),last=performance.now(),charge=0,charging=false,aim={x:870,y:330},drawMode='lab',lang='zh',theme='wood',lastUi=0,hasGesture=false;
const keys=new Set();let joy={x:0,y:0};
try{const prefs=JSON.parse(localStorage.getItem('court-master.preferences')||'{}');lang=prefs.lang==='en'?'en':'zh';theme=prefs.theme==='night'?'night':'wood';difficulty=['rookie','normal','pro'].includes(prefs.difficulty)?prefs.difficulty:'normal';game.difficulty=difficulty;}catch{}
const L=(zh,en)=>lang==='zh'?zh:en;
const lessons=[
 ['移动与空间','Moving and spacing','WASD 控制球员，与队友保持合理距离；太拥挤会影响进攻空间。','Move with WASD. Spacing creates room for passes and drives.'],
 ['传球与出球时机','Passing lanes','持球按 K 传给队友；移动鼠标可影响传球目标。防守者靠近传球线路时有可能抢断。','Press K with the ball to pass. Aim with the pointer; defended lanes may be intercepted.'],
 ['投篮时机','Shot timing','按住 J 蓄力，在接近 78% 时松开。球员距离越远、防守越近，游戏模型的命中概率越低。','Hold J and release near 78%. Long range and close defenders reduce modeled shot probability.'],
 ['两分与三分','Two and three points','靠近三分距离阈值时切换得分类型。虚线弧外的投篮记 3 分。','Shots beyond the dashed arc count for three points.'],
 ['防守与抢断','Steals and defense','没有球权时靠近持球对手按 K 尝试抢断。防守队友会自动贴近进攻球员。','Without the ball, press K near the carrier to attempt a steal. Teammates defend automatically.'],
 ['加速与体力','Sprint and stamina','按住 Shift 加速消耗体力，松开后逐渐恢复。不要整场无脑加速。','Hold Shift to sprint at the cost of stamina. Recover by moving normally.'],
 ['AI 无球跑位','AI spacing','队友会根据球权站到不同进攻区域；防守者根据持球威胁与队友位置回防。','Teammates spread on offense; defenders match threats and contest the ball.'],
 ['命中率模型','Shot probability model','模型考虑投篮距离、干扰等级、蓄力时机及球员能力。显示数值是游戏内预测，不是现实 NBA 统计。','The model combines range, contest, timing and skill. It is an in-game estimate, not an NBA statistic.']
];
function savePrefs(){try{localStorage.setItem('court-master.preferences',JSON.stringify({lang,theme,difficulty}));}catch{}}
function translate(){document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-zh][data-en]').forEach(el=>{el.textContent=el.dataset[lang];});$('lang').textContent=lang==='zh'?'中 / EN':'EN / 中';$('difficulty').textContent='AI · '+({rookie:L('新手','Easy'),normal:L('标准','Normal'),pro:L('高手','Hard')}[difficulty]);$('pause').textContent=game.status==='paused'?L('▶ 继续','▶ Resume'):L('⏸ 暂停','⏸ Pause');document.body.classList.toggle('theme-night',theme==='night');if(!$('drawer').hidden)updateDrawer();savePrefs();}
function openDrawer(which){drawMode=which;$('drawer').hidden=false;$('shade').hidden=false;updateDrawer();}
function closeDrawer(){$('drawer').hidden=true;$('shade').hidden=true;}
function updateDrawer(){
 const body=$('drawerBody');
 $('drawerTitle').textContent=drawMode==='lab'?L('篮球算法实验室','Basketball Algorithm Lab'):L('篮球学院 · 8 张战术卡','Basketball Academy · 8 Lessons');
 if(drawMode==='academy'){
  body.innerHTML='<p>'+L('本阶段提供战术与数学知识卡；正式互动课程将在后续扩展。','V0.1 offers strategy cards; interactive drills arrive in a later release.')+'</p>'+lessons.map((v,i)=>'<button class="lesson"><b>'+(i+1)+'. '+(lang==='zh'?v[0]:v[1])+'</b><small>'+(lang==='zh'?v[2]:v[3])+'</small></button>').join('');
  return;
 }
 const me=game.players.find(p=>p.id===game.controlled),info=getShotInfo(game,me.id);
 body.innerHTML='<p>'+L('显示当前受控球员的预测。如果你不持球，也可以提前评估接球后的出手条件。','Shot estimate for the selected player, including off-ball positioning.')+'</p>'+
 '<div class="stat"><span>'+L('控制球员','Player')+'</span><b>'+me.id+'</b></div>'+
 '<div class="stat"><span>'+L('距篮筐','Distance to hoop')+'</span><b>'+Math.round(info.distance)+' px</b></div>'+
 '<div class="stat"><span>'+L('防守干扰等级','Contest level')+'</span><b>'+info.contest+' / 2</b></div>'+
 '<div class="stat"><span>'+L('蓄力时机分','Timing score')+'</span><b>'+Math.round(info.timing*100)+'%</b></div>'+
 '<div class="stat"><span>'+L('AI 难度','AI difficulty')+'</span><b>'+({rookie:L('新手','Easy'),normal:L('标准','Normal'),pro:L('高手','Hard')}[game.difficulty])+'</b></div>'+
 '<div class="stat"><span>'+L('投篮价值','Shot value')+'</span><b>'+info.points+' '+L('分','pt')+'</b></div>'+
 '<div class="stat"><span>'+L('游戏命中率预测','Game shot probability')+'</span><b>'+Math.round(info.probability*100)+'%</b></div>'+
 '<div class="hint">'+L('概率使用距离、投篮能力、防守干扰和操作时机共同计算；这不是现实比赛数据，也不保证每球命中。','Probability is derived from distance, player skill, defenders and release timing. This is not real-world data or a guarantee.')+'</div>'+
 '<p><code>P = clamp(0.69 + skill + timing - distance - contest)</code></p>'+
 '<p>'+L('演示模式：3v3 人机。5v5 十人联网与统一账号仍未接入。','Prototype: 3v3 vs AI. Ten-player multiplayer and shared accounts are not yet implemented.')+'</p>';
}
function startShot(){if(charging||game.status!=='playing')return;
 const me=game.players.find(p=>p.id===game.controlled);
 if(game.ball.carrier!==me.id){
  if(tryBlockShot(game,me.id))game.events.unshift(L('封盖成功！','BLOCK!'));
  else if(game.ball.flight?.kind==='shot')game.events.unshift(L('封盖失败：要靠近投篮人并及时起跳','Block missed: get close and jump early'));
  return;
 }
 charging=true;charge=0;
}
function releaseShot(){if(!charging)return;charging=false;const p=game.players.find(x=>x.id===game.controlled);if(game.ball.carrier===p.id)shootBall(game,p.id,charge);charge=0;}
function passOrSteal(){
 if(game.status!=='playing')return;
 const me=game.players.find(p=>p.id===game.controlled);
 if(game.ball.carrier===me.id){const to=bestPassTarget(game,me.id,aim);if(to)passBall(game,to);}
 else if(game.ball.carrier)trySteal(game,me.id);
}
function reset(){game=createGame(Math.floor(Math.random()*1e9),{difficulty});charging=false;charge=0;keys.clear();$('result').hidden=true;closeDrawer();last=performance.now();}
function down(e){if(['INPUT','TEXTAREA','BUTTON'].includes(e.target?.tagName))return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='j'&&!keys.has('j'))startShot();if(k==='k'&&!keys.has('k'))passOrSteal();if(k===' '&&!keys.has(' '))switchPlayer(game);if(k==='p'&&!keys.has('p'))togglePause();keys.add(k);}
function up(e){const k=e.key.toLowerCase();if(k==='j')releaseShot();keys.delete(k);}
document.addEventListener('keydown',down);document.addEventListener('keyup',up);window.addEventListener('blur',()=>{keys.clear();if(charging)releaseShot();});
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();aim={x:(e.clientX-r.left)/r.width*1120,y:(e.clientY-r.top)/r.height*660};});
function togglePause(){if(game.status==='finished')return;game.status=game.status==='paused'?'playing':'paused';$('pausedBadge').hidden=game.status!=='paused';$('pause').textContent=game.status==='paused'?L('▶ 继续','▶ Resume'):L('⏸ 暂停','⏸ Pause');keys.clear();if(charging){charging=false;charge=0;}}
$('difficulty').onclick=()=>{difficulty=({rookie:'normal',normal:'pro',pro:'rookie'})[difficulty];game.difficulty=difficulty;game.events.unshift(L('AI 难度切换为 ','AI difficulty: ')+({rookie:L('新手','Easy'),normal:L('标准','Normal'),pro:L('高手','Hard')}[difficulty]));translate();};
$('pause').onclick=togglePause;
$('lang').onclick=()=>{lang=lang==='zh'?'en':'zh';translate();};
$('theme').onclick=()=>{theme=theme==='wood'?'night':'wood';translate();};
$('restart').onclick=reset;$('again').onclick=reset;
$('switchBtn').onclick=()=>switchPlayer(game);$('passBtn').onclick=passOrSteal;
const shoot=$('shootBtn');shoot.addEventListener('pointerdown',e=>{e.preventDefault();shoot.setPointerCapture?.(e.pointerId);startShot();});shoot.addEventListener('pointerup',releaseShot);shoot.addEventListener('pointercancel',()=>{charging=false;charge=0;});
$('labBtn').onclick=()=>openDrawer('lab');$('academyBtn').onclick=()=>openDrawer('academy');$('closeDrawer').onclick=closeDrawer;$('shade').onclick=closeDrawer;
const joystick=$('joystick'),hat=$('joyHat');
function joyMove(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,n=Math.hypot(dx,dy)||1,amt=Math.min(1,n/(r.width*.32));joy={x:dx/n*amt,y:dy/n*amt};hat.style.transform='translate('+joy.x*31+'px,'+joy.y*31+'px)';}
joystick.addEventListener('pointerdown',e=>{joystick.setPointerCapture(e.pointerId);joyMove(e);});joystick.addEventListener('pointermove',e=>{if(e.buttons)joyMove(e);});function joyEnd(){joy={x:0,y:0};hat.style.transform='';}joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
function hoopShape(x){
 ctx.save();ctx.strokeStyle='#f5f4ea';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+(x<560?-19:19),297);ctx.lineTo(x+(x<560?-19:19),363);ctx.stroke();
 ctx.fillStyle='#fff2ce';ctx.fillRect(x-4,315,8,30);ctx.strokeStyle='#ff6237';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,330,15,11,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function court(){
 ctx.fillStyle='#061627';ctx.fillRect(0,0,1120,660);
 ctx.shadowColor='#000b';ctx.shadowBlur=20;ctx.fillStyle=theme==='wood'?'#d4a36a':'#9d8c74';ctx.fillRect(COURT.x,COURT.y,COURT.w,COURT.h);ctx.shadowBlur=0;
 for(let y=COURT.y;y<COURT.y+COURT.h;y+=26){ctx.fillStyle=((y-COURT.y)/26)%2===0?'#ffffff0d':'#48271113';ctx.fillRect(COURT.x,y,COURT.w,26);ctx.strokeStyle='#3d2b1e22';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(COURT.x,y);ctx.lineTo(COURT.x+COURT.w,y);ctx.stroke();}
 ctx.strokeStyle='#fff6dc';ctx.lineWidth=3;ctx.strokeRect(COURT.x,COURT.y,COURT.w,COURT.h);
 ctx.beginPath();ctx.moveTo(560,72);ctx.lineTo(560,588);ctx.stroke();ctx.beginPath();ctx.arc(560,330,70,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#f6e9d41a';ctx.fillRect(55,218,152,224);ctx.fillRect(913,218,152,224);
 ctx.strokeRect(55,218,152,224);ctx.strokeRect(913,218,152,224);
 for(const x of [207,913]){ctx.beginPath();ctx.arc(x,330,70,-Math.PI/2,Math.PI/2,x===207);ctx.stroke();}
 ctx.setLineDash([8,7]);ctx.strokeStyle='#fff5dc95';ctx.beginPath();ctx.arc(108,330,285,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.beginPath();ctx.arc(1012,330,285,Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.setLineDash([]);
 hoopShape(108);hoopShape(1012);
 ctx.fillStyle='#ffffff28';ctx.font='900 40px system-ui';ctx.textAlign='center';ctx.fillText('COURT MASTER',560,125);
 ctx.font='600 13px system-ui';ctx.fillText('HOME / 3v3',560,563);
}
function playerSprite(p){
 const selected=p.id===game.controlled,r=19;
 ctx.save();ctx.translate(p.x,p.y);
 ctx.shadowColor='#000b';ctx.shadowBlur=9;ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,12,20,9,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 if(selected){ctx.strokeStyle='#e7ff9d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r+9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-r-20);ctx.lineTo(-6,-r-32);ctx.lineTo(6,-r-32);ctx.closePath();ctx.fillStyle='#fffbb2';ctx.fill();}
 ctx.fillStyle=p.team===0?'#278dd5':'#d25453';ctx.strokeStyle=p.team===0?'#d8f6ff':'#ffdcd5';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 13px system-ui';ctx.fillText(String(p.n+1),0,1);
 ctx.textBaseline='alphabetic';ctx.fillStyle='#20313c';ctx.font='900 11px system-ui';ctx.fillText(p.id,0,-27);
 // Small movement sparks and body tilt communicate direction and contact.
 const v=Math.min(1,Math.hypot(p.vx,p.vy)/190);ctx.strokeStyle=p.team===0?'#70cfff':'#ffc0ad';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(-7,14);ctx.lineTo(-7-(p.vx/300)*v*9,22);ctx.moveTo(7,14);ctx.lineTo(7-(p.vx/300)*v*9,22);ctx.stroke();
 if(selected){ctx.fillStyle='#182c37';ctx.fillRect(-23,29,46,5);ctx.fillStyle='#a9ecba';ctx.fillRect(-23,29,46*p.stamina/100,5);}
 ctx.restore();
}
function ballSprite(){
 const b=game.ball,f=b.flight;let x=b.x,y=b.y,arc=0;
 if(b.carrier){const p=game.players.find(p=>p.id===b.carrier);const moving=Math.min(1,Math.hypot(p.vx,p.vy)/185);
  const phase=performance.now()*.014;
  x=p.x+18+Math.cos(phase)*4;y=p.y+13+Math.sin(phase)*3;
  arc=Math.abs(Math.sin(phase))*moving*10;
 }else if(f){const t=Math.min(1,f.elapsed/f.duration);arc=Math.sin(Math.PI*t)*(f.arcHeight||28);}
 if(f){ctx.save();ctx.globalAlpha=.33;ctx.setLineDash([5,8]);ctx.lineWidth=3;ctx.strokeStyle=f.kind==='shot'?'#f9dba0':'#a0dcff';ctx.beginPath();ctx.moveTo(f.from.x,f.from.y);ctx.lineTo(x,y);ctx.stroke();ctx.restore();}
 ctx.save();ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(x,y+6,clampBall(12-arc*.025,5,13),clampBall(5-arc*.016,2,5),0,0,Math.PI*2);ctx.fill();
 ctx.translate(x,y-arc);ctx.shadowColor='#ffc37a';ctx.shadowBlur=f?19:8;ctx.fillStyle='#ea7f37';ctx.strokeStyle='#66331d';ctx.lineWidth=2;
 const radius=10+(arc*.024);ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 ctx.beginPath();ctx.moveTo(-radius,0);ctx.lineTo(radius,0);ctx.moveTo(0,-radius);ctx.lineTo(0,radius);ctx.stroke();
 ctx.restore();
}
function clampBall(v,min,max){return Math.max(min,Math.min(max,v));}

function gameCanvas(){
 ctx.clearRect(0,0,1120,660);court();
 if(game.ball.carrier){const p=game.players.find(x=>x.id===game.ball.carrier);if(p&&p.id===game.controlled){const h={x:game.possession===0?1012:108,y:330};const info=getShotInfo(game,p.id,charging?charge:.78);
 ctx.strokeStyle='#f9f4b7a8';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(h.x,h.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#112233a9';ctx.fillRect(720,88,310,54);ctx.fillStyle='#fff8df';ctx.font='700 17px system-ui';ctx.textAlign='center';ctx.fillText(L('预计命中率 ','Shot estimate ')+Math.round(info.probability*100)+'% · '+info.points+L(' 分',' pts'),875,123);}}
 for(const p of game.players)playerSprite(p);ballSprite();
 for(const e of game.effects){
  const t=Math.min(1,e.age/e.duration);
  ctx.save();ctx.globalAlpha=(1-t)*.92;ctx.strokeStyle=e.kind==='block'?'#8ee4ff':e.kind==='score'?'#ffe39a':e.kind==='steal'?'#b0f0d0':'#f9c889';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(e.x,e.y,22+t*64,0,Math.PI*2);ctx.stroke();
  if(e.kind==='score'){ctx.fillStyle='#fff3b1';ctx.font='900 33px system-ui';ctx.textAlign='center';ctx.fillText('+'+e.points,e.x,e.y-30-t*60);}
  if(e.kind==='block'){ctx.fillStyle='#e4faff';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText(L('封盖','BLOCK'),e.x,e.y-33-t*38);}
  ctx.restore();
 }
}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function ui(ts){
 if(ts-lastUi<120)return;lastUi=ts;
 $('blueScore').textContent=game.score[0];$('redScore').textContent=game.score[1];$('clock').textContent=formatTime(game.time);$('shotClock').textContent=Math.ceil(game.shotClock);
 $('eventText').textContent=game.events[0]||'';$('pausedBadge').hidden=game.status!=='paused';$('chargeBar').style.width=Math.round(charge*100)+'%';$('chargeNum').textContent=Math.round(charge*100)+'%';
 if(!$('drawer').hidden&&drawMode==='lab')updateDrawer();
 if(game.status==='finished'&&$('result').hidden){$('result').hidden=false;$('resultTitle').textContent=game.score[0]===game.score[1]?L('平局！','Draw!'):game.score[0]>game.score[1]?L('蓝队胜利！','Blue Wins!'):L('红队胜利','Red Wins');
 $('resultScore').textContent=game.score[0]+' : '+game.score[1];}
}
function frame(ts){
 const dt=Math.min(0.05,(ts-last)/1000||0);last=ts;
 const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
 const y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
 if(charging)charge=Math.min(1,charge+dt*.82);
 stepGame(game,dt,{x,y,turbo:keys.has('shift')});
 gameCanvas();ui(ts);requestAnimationFrame(frame);
}
translate();if(new URLSearchParams(location.search).get('panel')==='academy')openDrawer('academy');requestAnimationFrame(frame);
