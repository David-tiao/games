// Stickman Hoops V0.4: source-code-only 2.5D pose generation and Canvas skeleton renderer.
// All coordinates are relative to the player's existing court position.
// The renderer never changes the basketball rules or collision geometry.
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const point=(x,y)=>({x,y});
export const STICK_STATES=Object.freeze(['idle','run','dribble','aim','shoot','pass','steal','block','rebound','stagger','crossover','layup','dunk']);
export function getStickPose(player,{time=0,hasBall=false,charging=false}={}){
 const speed=clamp(Math.hypot(player.vx||0,player.vy||0)/220,0,1);
 const action=player.action?.elapsed<player.action?.duration?player.action:null;
 const state=(charging&&hasBall)?'aim':action?.kind||(hasBall?'dribble':speed>.14?'run':'idle');
 const phase=(time||0)*(7+speed*6)+(player.n||0)*.72;
 const gait=Math.sin(phase),bounce=Math.abs(Math.sin(phase*1.15));
 const progress=action?clamp(action.elapsed/Math.max(.01,action.duration),0,1):0;
 const dir=Math.abs(player.vx||0)>90?Math.sign(player.vx):(player.team===0?1:-1);
 const airborne=['shoot','block','rebound','layup','dunk'].includes(state);
 const jump=airborne?(state==='dunk'?32:state==='layup'?24:state==='block'?23:state==='rebound'?19:15)*Math.sin(Math.PI*progress):0;
 const impact=clamp(player.impact||0,0,1);
 const lean=clamp((player.vx||0)*.018,-5,5)+impact*Math.sin(time*25+(player.n||0))*6;
 const idle=Math.sin((time||0)*2+(player.n||0)*1.6)*.8;
 const hip=point(lean,11-jump),neck=point(lean*.42,-6-jump),head=point(lean*.2,-23-jump);
 const shoulderL=point(neck.x-7,neck.y+2),shoulderR=point(neck.x+7,neck.y+2);
 let kneeL=point(hip.x-7+gait*5*speed,hip.y+8),kneeR=point(hip.x+7-gait*5*speed,hip.y+8);
 let footL=point(hip.x-11+gait*10*speed,26-jump-Math.max(0,gait)*6*speed);
 let footR=point(hip.x+11-gait*10*speed,26-jump-Math.max(0,-gait)*6*speed);
 let elbowL=point(shoulderL.x-7-gait*4*speed,-1-jump);
 let elbowR=point(shoulderR.x+7+gait*4*speed,-1-jump);
 let handL=point(elbowL.x-6,10-jump+gait*6*speed+idle);
 let handR=point(elbowR.x+6,10-jump-gait*6*speed-idle);
 let ball=point(dir*25,18-bounce*12-jump);
 let ballLift=4+bounce*7;
 if(state==='dribble'){
  // A bent throwing arm follows the same ball bounce that the ball renderer uses.
  const side=dir;
  if(side>0){elbowR=point(16+lean*.3,1-jump);handR=point(ball.x-1,ball.y-10);}
  else{elbowL=point(-16+lean*.3,1-jump);handL=point(ball.x+1,ball.y-10);}
 }else if(state==='aim'||state==='shoot'){
  elbowL=point(neck.x-9,-23-jump);elbowR=point(neck.x+9,-23-jump);
  handL=point(neck.x-9,-38-jump);handR=point(neck.x+9,-38-jump);
  ball=point(neck.x+dir*5,-45-jump);ballLift=12;
 }else if(state==='pass'){
  const ext=24+8*Math.sin(Math.PI*progress);
  elbowL=point(dir*ext*.5-6,-10-jump);elbowR=point(dir*ext*.5+6,-10-jump);
  handL=point(dir*ext-6,-13-jump);handR=point(dir*ext+6,-13-jump);
 }else if(state==='block'||state==='rebound'){
  elbowL=point(neck.x-12,-28-jump);elbowR=point(neck.x+12,-28-jump);
  handL=point(neck.x-16,-45-jump);handR=point(neck.x+16,-45-jump);
  kneeL=point(hip.x-9,hip.y+4);kneeR=point(hip.x+9,hip.y+4);
  footL=point(hip.x-13,25-jump);footR=point(hip.x+13,25-jump);
 }else if(state==='layup'){
  // A one-handed soft finish with a raised inside knee.
  if(dir>0){elbowR=point(neck.x+13,-24-jump);handR=point(neck.x+22,-43-jump);
   elbowL=point(neck.x-18,0-jump);handL=point(neck.x-24,5-jump);}
  else{elbowL=point(neck.x-13,-24-jump);handL=point(neck.x-22,-43-jump);
   elbowR=point(neck.x+18,0-jump);handR=point(neck.x+24,5-jump);}
  kneeL=point(hip.x-12,hip.y+1-jump);footL=point(hip.x-16,22-jump);
  kneeR=point(hip.x+12,hip.y+8-jump);footR=point(hip.x+17,26-jump);
 }else if(state==='dunk'){
  // Two hands travel above the head at the apex of the jump.
  elbowL=point(neck.x-8,-29-jump);elbowR=point(neck.x+8,-29-jump);
  handL=point(neck.x-10,-53-jump);handR=point(neck.x+10,-53-jump);
  kneeL=point(hip.x-15,hip.y+8-jump);kneeR=point(hip.x+13,hip.y+2-jump);
  footL=point(hip.x-24,26-jump);footR=point(hip.x+20,22-jump);
 }else if(state==='crossover'){
  // The ball switches hands halfway through; the lead leg steps sideways.
  const lead=progress<.5?dir:-dir;
  ball=point(lead*24,9+Math.sin(Math.PI*progress)*4-jump);
  ballLift=5;
  elbowL=point(-13,-2-jump);elbowR=point(13,-2-jump);
  handL=point(-25,7-jump);handR=point(25,7-jump);
  if(lead>0)handR=point(ball.x-2,ball.y-9);
  else handL=point(ball.x+2,ball.y-9);
  kneeL=point(hip.x-14-progress*7,hip.y+7);
  kneeR=point(hip.x+14+progress*7,hip.y+7);
  footL=point(hip.x-19-progress*8,26-jump);
  footR=point(hip.x+19+progress*8,26-jump);
 }else if(state==='steal'){
  if(dir>0){elbowR=point(20,-8-jump);handR=point(39,-16-jump);}
  else{elbowL=point(-20,-8-jump);handL=point(-39,-16-jump);}
 }else if(state==='stagger'){
  handL=point(-29,-18-jump);handR=point(29,-18-jump);
  footL=point(-16,26-jump);footR=point(16,26-jump);
 }
 if(!Number.isFinite(ball.x)||!Number.isFinite(ball.y))throw new Error('Invalid stickman pose');
 return {state,speed,dir,jump,head,neck,hip,shoulderL,shoulderR,elbowL,elbowR,handL,handR,
  kneeL,kneeR,footL,footR,ball:{x:ball.x,y:ball.y,lift:ballLift},impact};
}
function strokeSegment(ctx,a,b,color,width){
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 ctx.strokeStyle='#061825';ctx.lineWidth=width+3;ctx.stroke();
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
export function drawStickman(ctx,player,{time=0,selected=false,hasBall=false,charging=false}={}){
 const pose=getStickPose(player,{time,hasBall,charging});
 const color=player.team===0?'#62d4ff':'#ff8c82';
 const bright=player.team===0?'#d7f7ff':'#ffe0c8';
 const dark=player.team===0?'#2676b5':'#ad464d';
 ctx.save();
 ctx.translate(player.x,player.y);
 ctx.lineJoin='round';ctx.lineCap='round';
 ctx.fillStyle='#03121b66';ctx.beginPath();ctx.ellipse(0,29,18-pose.jump*.12,5-pose.jump*.05,0,0,Math.PI*2);ctx.fill();
 if(selected){
  ctx.strokeStyle='#f9df8d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,2,30,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#fce6a2';ctx.beginPath();ctx.moveTo(0,-60);ctx.lineTo(-7,-70);ctx.lineTo(7,-70);ctx.closePath();ctx.fill();
 }
 // Legs behind the torso, each with its own animated knee.
 for(const [knee,foot] of [[pose.kneeL,pose.footL],[pose.kneeR,pose.footR]]){
  strokeSegment(ctx,pose.hip,knee,dark,6);
  strokeSegment(ctx,knee,foot,color,5);
 }
 strokeSegment(ctx,pose.neck,pose.hip,color,8);
 // Athletic shoulders and animated independent arm joints.
 for(const [shoulder,elbow,hand] of [[pose.shoulderL,pose.elbowL,pose.handL],[pose.shoulderR,pose.elbowR,pose.handR]]){
  strokeSegment(ctx,shoulder,elbow,bright,5);
  strokeSegment(ctx,elbow,hand,color,5);
  ctx.fillStyle=bright;ctx.beginPath();ctx.arc(hand.x,hand.y,2.8,0,Math.PI*2);ctx.fill();
 }
 // Deliberately round stick-figure head; no circular player body.
 ctx.shadowColor=player.team===0?'#2b9fff99':'#ff6e7399';ctx.shadowBlur=9;
 ctx.beginPath();ctx.arc(pose.head.x,pose.head.y,8.8,0,Math.PI*2);
 ctx.fillStyle='#102639';ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=3.3;ctx.strokeStyle=bright;ctx.stroke();
 ctx.fillStyle=bright;ctx.beginPath();ctx.arc(pose.head.x+pose.dir*3,pose.head.y-1,1.7,0,Math.PI*2);ctx.fill();
 // Jersey number is deliberately tiny: keep the shape readable.
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 10px system-ui';
 ctx.fillStyle='#082034';ctx.fillText(String(player.n+1),pose.hip.x,pose.neck.y+9);
 ctx.textBaseline='alphabetic';ctx.font='800 11px system-ui';ctx.fillStyle='#092137';
 ctx.fillText(player.id,0,-39-pose.jump);
 if(selected){
  ctx.fillStyle='#102633';ctx.fillRect(-23,35,46,5);
  ctx.fillStyle='#b4efab';ctx.fillRect(-23,35,46*Math.max(0,Math.min(100,player.stamina))/100,5);
 }
 ctx.restore();
 return pose;
}
