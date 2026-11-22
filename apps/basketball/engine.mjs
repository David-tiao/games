// Court Master V0.2: deterministic collision, defensive and basketball animation core.
export const COURT = Object.freeze({x:55,y:72,w:1010,h:516,hoopLeft:108,hoopRight:1012,cy:330});
export const PLAYER_RADIUS=19;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hoop=team=>({x:team===0?COURT.hoopRight:COURT.hoopLeft,y:COURT.cy});
function random(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
function message(s,text){s.events.unshift(text);if(s.events.length>8)s.events.pop();}
function player(s,id){return s.players.find(p=>p.id===id);}
const assign=(team,n,x,y)=>({id:(team===0?'B':'R')+(n+1),team,n,x,y,vx:0,vy:0,skill:0.75+n*0.02,stamina:100,cooldown:0});
export function createGame(seed=2026, options={}){
 const difficulty=['rookie','normal','pro'].includes(options.difficulty)?options.difficulty:'normal';
 const players=[assign(0,0,355,330),assign(0,1,310,215),assign(0,2,310,440),assign(1,0,750,330),assign(1,1,800,220),assign(1,2,800,445)];
 return {players,seed:seed>>>0,score:[0,0],time:180,shotClock:24,status:'playing',controlled:'B1',difficulty,
  ball:{x:players[0].x,y:players[0].y,carrier:'B1',flight:null},possession:0,aiClock:0,events:['欢迎来到 2D 球场：蓝队进攻。'],shots:[],lastShot:null,effects:[]};
}
export function getShotInfo(s,id,release=0.78){
 const p=player(s,id);if(!p)return null;
 const d=distance(p,hoop(p.team));
 const nearest=Math.min(...s.players.filter(q=>q.team!==p.team).map(q=>distance(q,p)));
 // Players have a nonzero physical radius; defenders within one body-length contest strongly.
 const contest=nearest<54?2:nearest<108?1:0;
 const timing=clamp(1-Math.abs(release-0.78)*1.9,0,1);
 const probability=clamp(0.69+(p.skill-.75)*0.22-d*0.00114-0.14*contest+0.15*timing,0.06,0.94);
 return {distance:d,contest,timing,probability,points:d>=285?3:2};
}
function setCarrier(s,id){
 const p=player(s,id);if(!p)return;
 s.ball.carrier=id;s.ball.flight=null;s.possession=p.team;s.ball.x=p.x;s.ball.y=p.y;
}
function inbound(s,team){
 s.possession=team;s.shotClock=24;
 for(const p of s.players){
  const home=p.team===0?335:785;
  p.x=home+(p.n===0?0:p.n===1?-25:25);
  p.y=p.n===0?330:p.n===1?222:441;
  p.cooldown=0.5;p.vx=0;p.vy=0;
 }
 setCarrier(s,(team===0?'B':'R')+'1');
 // Keep the user's selected blue player across baskets.
 if(!player(s,s.controlled)||player(s,s.controlled).team!==0)s.controlled='B1';
}
export function shootBall(s,id,release=0.78){
 if(s.status!=='playing'||s.ball.flight||s.ball.carrier!==id)return false;
 const p=player(s,id), info=getShotInfo(s,id,release),target=hoop(p.team);
 const made=random(s)<info.probability;
 s.ball.flight={kind:'shot',from:{x:p.x,y:p.y},to:target,elapsed:0,duration:0.65+info.distance/900,made,blocked:false,shooter:id,points:info.points,probability:info.probability,arcHeight:clamp(55+info.distance*0.13,60,120)};
 s.ball.carrier=null;s.lastShot={...info,shooter:id,made};
 s.shots.unshift({id,probability:info.probability,made,points:info.points});s.shots.length=Math.min(s.shots.length,12);
 message(s,id+' 投篮 '+Math.round(info.probability*100)+'% · '+info.points+' 分');
 s.effects.push({kind:'release',x:p.x,y:p.y,age:0,duration:0.45,team:p.team});return true;
}
/** A timed, local defensive action: only a nearby player can block an early release. */
export function tryBlockShot(s,defenderId){
 const f=s.ball.flight,defender=player(s,defenderId);
 if(s.status!=='playing'||!f||f.kind!=='shot'||f.blocked||!defender||defender.cooldown>0)return false;
 const shooter=player(s,f.shooter);
 if(!shooter||shooter.team===defender.team||f.elapsed>0.33||distance(defender,shooter)>66)return false;
 f.blocked=true;f.made=false;f.blocker=defenderId;
 f.to={x:clamp(defender.x+(defender.team===0?30:-30),COURT.x+30,COURT.x+COURT.w-30),y:clamp(defender.y+18,COURT.y+30,COURT.y+COURT.h-30)};
 f.duration=Math.max(f.elapsed+0.24,0.53);
 f.arcHeight=34;
 defender.cooldown=1.15;s.lastShot={...s.lastShot,made:false,blocked:true};
 const record=s.shots.find(q=>q.id===f.shooter);if(record)record.made=false;
 s.effects.push({kind:'block',x:defender.x,y:defender.y,age:0,duration:0.85,team:defender.team});
 message(s,defenderId+' 封盖了 '+f.shooter+' 的投篮！');return true;
}
function projection(point,a,b){
 const vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy;
 const t=l?clamp(((point.x-a.x)*vx+(point.y-a.y)*vy)/l,0,1):0;
 return distance(point,{x:a.x+t*vx,y:a.y+t*vy});
}
export function passBall(s,toId){
 if(s.status!=='playing'||s.ball.flight||!s.ball.carrier)return false;
 const from=player(s,s.ball.carrier),to=player(s,toId);
 if(!from||!to||from.team!==to.team||from.id===to.id)return false;
 s.ball.flight={kind:'pass',from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},receiver:to.id,elapsed:0,duration:clamp(distance(from,to)/650,.18,.8)};
 s.ball.carrier=null;message(s,from.id+' 传球给 '+to.id);s.effects.push({kind:'pass',x:from.x,y:from.y,age:0,duration:0.3,team:from.team});return true;
}
export function bestPassTarget(s,id,aim=null){
 const p=player(s,id);if(!p)return null;
 const mates=s.players.filter(q=>q.team===p.team&&q.id!==id);
 mates.sort((a,b)=>{
  const score=q=>{
   const defenders=Math.min(...s.players.filter(d=>d.team!==q.team).map(d=>distance(d,q)));
   const aimScore=aim?Math.max(0,250-distance(aim,q))*.9:0;
   return defenders*.55-distance(q,hoop(q.team))*.14+aimScore;
  };return score(b)-score(a);
 });
 return mates[0]?.id||null;
}
export function trySteal(s,id){
 const defender=player(s,id),carrier=player(s,s.ball.carrier);
 if(!defender||!carrier||defender.team===carrier.team||defender.cooldown>0||distance(defender,carrier)>55)return false;
 defender.cooldown=1.1;
 const chance=defender.team===1?(s.difficulty==='pro'?.51:s.difficulty==='rookie'?.23:.39):.44;
 if(random(s)<chance){setCarrier(s,id);s.shotClock=24;message(s,id+' 抢断成功！');s.effects.push({kind:'steal',x:defender.x,y:defender.y,age:0,duration:0.5,team:defender.team});return true;}
 message(s,id+' 抢断未成功');return false;
}
export function switchPlayer(s){
 const ids=s.players.filter(p=>p.team===0).map(p=>p.id);
 const i=ids.indexOf(s.controlled);
 // Prefer the current ball handler if blue team holds the ball.
 if(s.ball.carrier?.startsWith('B')&&s.ball.carrier!==s.controlled)s.controlled=s.ball.carrier;
 else s.controlled=ids[(i+1)%ids.length];
 return s.controlled;
}
/** Resolve overlaps after input and AI movement; preserves fair collision on all clients. */
export function resolveCollisions(s){
 const ps=s.players,r=PLAYER_RADIUS*2+1;
 for(let pass=0;pass<30;pass++)for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const a=ps[i],b=ps[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d>=r)continue;
  if(d<1e-9){dx=(i+j)%2?1:0;dy=(i+j)%2?0:1;d=1;}
  const push=(r-d)/2,ux=dx/d,uy=dy/d;
  a.x=clamp(a.x-ux*push,COURT.x+PLAYER_RADIUS,COURT.x+COURT.w-PLAYER_RADIUS);
  a.y=clamp(a.y-uy*push,COURT.y+PLAYER_RADIUS,COURT.y+COURT.h-PLAYER_RADIUS);
  b.x=clamp(b.x+ux*push,COURT.x+PLAYER_RADIUS,COURT.x+COURT.w-PLAYER_RADIUS);
  b.y=clamp(b.y+uy*push,COURT.y+PLAYER_RADIUS,COURT.y+COURT.h-PLAYER_RADIUS);
 }
}
function move(p,tx,ty,dt,speed){
 const dx=tx-p.x,dy=ty-p.y,n=Math.hypot(dx,dy)||1;
 const step=Math.min(n,speed*dt);
 p.x=clamp(p.x+dx/n*step,COURT.x+17,COURT.x+COURT.w-17);
 p.y=clamp(p.y+dy/n*step,COURT.y+17,COURT.y+COURT.h-17);
}
function aiPlayers(s,dt){
 const carrier=player(s,s.ball.carrier),flight=s.ball.flight,ball=s.ball;
 for(const p of s.players){
  // AI difficulty affects the opponent, not the player's automatic teammates.
  const difficultySpeed=p.team===1?(s.difficulty==='pro'?1.13:s.difficulty==='rookie'?.88:1):1;
  if(p.id===s.controlled)continue;
  let goal=null,speed=165*difficultySpeed;
  if(flight?.kind==='shot'){
   // Different rebound lanes, rather than all six players chasing the basket center.
   const h=hoop(player(s,flight.shooter).team);
   goal={x:h.x+(p.team===0?-1:1)*(42+p.n*17),y:h.y+(p.n-1)*75};
  }else if(flight?.kind==='pass'){
   if(p.id===flight.receiver)goal=flight.to;
   else if(p.team!==player(s,flight.receiver)?.team){
    const t=.68;const ix=flight.from.x+(flight.to.x-flight.from.x)*t;
    const iy=flight.from.y+(flight.to.y-flight.from.y)*t;
    goal=p.n===0?{x:ix,y:iy}:{x:flight.to.x+(p.n===1?-80:65),y:flight.to.y+(p.n===1?-60:55)};
   }else{
    const h=hoop(p.team);goal={x:h.x+(p.team===0?-1:1)*(165+p.n*35),y:COURT.cy+(p.n-1)*170};
   }
  }else if(!carrier){goal={x:ball.x+(p.n-1)*16,y:ball.y+(p.n-1)*10};speed=185*difficultySpeed;
  }else if(p.id===carrier.id){
   const h=hoop(p.team),d=distance(p,h);
   goal={x:h.x+(p.team===0?-135:135),y:COURT.cy+(p.n===1?-80:p.n===2?80:0)};
   if(d<135)goal={x:p.x,y:p.y};
  }else if(p.team===carrier.team){
   const lane=(p.n===1?-1:p.n===2?1:0),h=hoop(p.team);
   goal={x:h.x+(p.team===0?-1:1)*(182+p.n*27),y:COURT.cy+lane*162};
  }else{
   const rank=p.n;
   const other=s.players.filter(q=>q.team===carrier.team&&q.id!==carrier.id);
   const threat=rank===0?carrier:other[(rank-1)%Math.max(1,other.length)]||carrier;
   // The defender stays between the attack and the basket, not inside the attacker.
   const side=p.team===1?1:-1;
   goal={x:threat.x+side*48,y:threat.y+(rank===2?20:-12)};
   speed=177*difficultySpeed;
  }
  move(p,goal.x,goal.y,dt,speed);
 }
}
export function stepGame(s,dt,input={x:0,y:0,turbo:false}){
 if(s.status!=='playing')return s;
 dt=clamp(Number(dt)||0,0,0.05);if(!dt)return s;
 s.time=Math.max(0,s.time-dt);
 if(s.time===0&&s.ball.flight?.kind!=='shot'){s.status='finished';message(s,'比赛结束');return s;}
 // A shot that left the hand before the buzzer may finish in the air.
 if(s.ball.flight?.kind!=='shot')s.shotClock=Math.max(0,s.shotClock-dt);
 if(s.shotClock===0&&!s.ball.flight){message(s,'24 秒违例，交换球权');inbound(s,1-s.possession);return s;}
 for(const p of s.players)p.cooldown=Math.max(0,p.cooldown-dt);
 for(const e of s.effects)e.age+=dt;
 s.effects=s.effects.filter(e=>e.age<e.duration);
 const prior=s.players.map(p=>({x:p.x,y:p.y}));
 const me=player(s,s.controlled);
 if(me){const x=Number(input.x)||0,y=Number(input.y)||0,len=Math.hypot(x,y);
  if(len>0){const turbo=!!input.turbo&&me.stamina>4;const speed=turbo?255:185;me.x=clamp(me.x+x/len*speed*dt,COURT.x+17,COURT.x+COURT.w-17);me.y=clamp(me.y+y/len*speed*dt,COURT.y+17,COURT.y+COURT.h-17);me.stamina=clamp(me.stamina+(turbo?-34:15)*dt,0,100);}
  else me.stamina=clamp(me.stamina+22*dt,0,100);
 }
 aiPlayers(s,dt);
 resolveCollisions(s);
 s.players.forEach((p,i)=>{p.vx=(p.x-prior[i].x)/dt;p.vy=(p.y-prior[i].y)/dt;});
 if(s.ball.flight){
  const f=s.ball.flight;f.elapsed+=dt;const t=clamp(f.elapsed/f.duration,0,1);
  s.ball.x=f.from.x+(f.to.x-f.from.x)*t;s.ball.y=f.from.y+(f.to.y-f.from.y)*t;
  if(t>=1){
   s.ball.flight=null;
   if(f.kind==='shot'){
    if(f.made&&!f.blocked){const side=player(s,f.shooter).team;s.score[side]+=f.points;message(s,f.shooter+' 命中！+'+f.points);s.effects.push({kind:'score',x:f.to.x,y:f.to.y,age:0,duration:1.2,team:side,points:f.points});inbound(s,1-side);}
    else{s.ball.carrier=null;
     s.ball.x=clamp(f.to.x+(random(s)-.5)*(f.blocked?38:135),COURT.x+25,COURT.x+COURT.w-25);
     s.ball.y=clamp(f.to.y+(random(s)-.5)*(f.blocked?38:130),COURT.y+25,COURT.y+COURT.h-25);
     message(s,f.blocked?'封盖成功，争抢篮球！':'投篮未中，争抢篮板');s.shotClock=14;
     s.effects.push({kind:f.blocked?'block':'rim',x:s.ball.x,y:s.ball.y,age:0,duration:0.75,team:1-player(s,f.shooter).team});
    }
   }else{
    const receiver=player(s,f.receiver);let stolen=null;
    for(const q of s.players.filter(q=>q.team!==receiver.team)){
     if(projection(q,f.from,f.to)<24&&distance(q,receiver)<92&&random(s)<0.20){stolen=q;break;}
    }
    setCarrier(s,(stolen||receiver).id);
    if(stolen){s.shotClock=24;message(s,stolen.id+' 断球！');s.effects.push({kind:'steal',x:stolen.x,y:stolen.y,age:0,duration:0.5,team:stolen.team});}
   }
  }
 }else if(s.ball.carrier){
  const p=player(s,s.ball.carrier);s.ball.x=p.x;s.ball.y=p.y;
 }else{
  let closest=null,d=32;
  for(const p of s.players){const nd=distance(p,s.ball);if(nd<d){closest=p;d=nd;}}
  if(closest){const offensive=closest.team===s.possession;setCarrier(s,closest.id);s.shotClock=offensive?14:24;
   message(s,closest.id+(offensive?' 抢到进攻篮板（14 秒）':' 抢到防守篮板（24 秒）'));
   s.effects.push({kind:'rebound',x:closest.x,y:closest.y,age:0,duration:0.45,team:closest.team});}
 }
 // AI shooting, driving, and steal decisions; only process at discrete intervals.
 s.aiClock+=dt;
 const thinkEvery=s.difficulty==='pro'?.52:s.difficulty==='rookie'?1:.75;
 if(s.aiClock>=thinkEvery){
  s.aiClock=0;
  const c=player(s,s.ball.carrier);
  if(c&&c.id!==s.controlled){
   const info=getShotInfo(s,c.id),isAIEnemy=c.team===1;
   const threshold=s.difficulty==='pro'?.40:s.difficulty==='rookie'?.24:.31;
   if((isAIEnemy||c.team===0)&&info.distance<265&&info.probability>=threshold){
    shootBall(s,c.id,0.78);
   }else if(info.contest>=2&&random(s)<0.40){
    const target=bestPassTarget(s,c.id);if(target)passBall(s,target);
   }
  }
  // AI opponents can contest an airborne shot only when physically close and quick enough.
  const f=s.ball.flight;
  if(f?.kind==='shot'&&!f.blocked)for(const p of s.players){
   if(p.id===s.controlled||p.team===player(s,f.shooter)?.team)continue;
   if(distance(p,player(s,f.shooter))<51&&random(s)<(s.difficulty==='pro'?.52:s.difficulty==='rookie'?.08:.22)){
    tryBlockShot(s,p.id);break;
   }
  }
  if(c)for(const p of s.players){
   if(p.team!==c.team&&p.id!==s.controlled&&distance(p,c)<37&&p.cooldown<=0&&random(s)<.18){trySteal(s,p.id);break;}
  }
 }
 return s;
}
