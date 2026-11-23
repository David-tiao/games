import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {STICK_STATES,getStickPose,drawStickman} from '../apps/basketball/stickman.mjs';
import {createGame,shootBall,passBall,trySteal,tryBlockShot,stepGame,resolveCollisions} from '../apps/basketball/engine.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=(team=0)=>({id:team?'R1':'B1',team,n:0,x:350,y:330,vx:0,vy:0,stamina:100,action:null,impact:0});
test('V0.3 exposes a complete 10-pose stickman animation vocabulary',()=>{
 assert.deepEqual([...STICK_STATES],['idle','run','dribble','aim','shoot','pass','steal','block','rebound','stagger']);
});
test('idle and running poses are deterministic and animated by velocity/time',()=>{
 const actor=p();const idle=getStickPose(actor,{time:1});
 assert.equal(idle.state,'idle');
 assert.deepEqual(idle,getStickPose(actor,{time:1}));
 actor.vx=190;
 const moving=getStickPose(actor,{time:1}),next=getStickPose(actor,{time:1.25});
 assert.equal(moving.state,'run');assert.notDeepEqual(moving.footL,next.footL);
});
test('dribble follows the ball hand; releasing to charge raises the ball',()=>{
 const actor=p();actor.vx=150;
 const dribble=getStickPose(actor,{time:.3,hasBall:true});
 assert.equal(dribble.state,'dribble');
 assert.ok(Math.abs(dribble.handR.x-dribble.ball.x)<5);
 const next=getStickPose(actor,{time:.75,hasBall:true});
 assert.notEqual(next.ball.y,dribble.ball.y);
 const aim=getStickPose(actor,{time:.3,hasBall:true,charging:true});
 assert.equal(aim.state,'aim');assert.ok(aim.ball.y<aim.head.y);
});
test('shot, block and rebound jump while both arms rise',()=>{
 for(const kind of ['shoot','block','rebound']){
  const actor=p();actor.action={kind,elapsed:.25,duration:.5};
  const pose=getStickPose(actor,{time:2});
  assert.equal(pose.state,kind);assert.ok(pose.jump>10,kind);
  assert.ok(pose.handL.y<pose.head.y&&pose.handR.y<pose.head.y,kind);
 }
});
test('pass, steal and stagger produce different upper-body silhouettes',()=>{
 const actor=p(),poses=[];
 for(const kind of ['pass','steal','stagger']){
  actor.action={kind,elapsed:.13,duration:.4};
  const pose=getStickPose(actor,{time:1});
  assert.equal(pose.state,kind);poses.push([pose.handL,pose.handR]);
 }
 assert.notDeepEqual(poses[0],poses[1]);
 assert.notDeepEqual(poses[1],poses[2]);
});
test('red and blue face opposite attacking directions',()=>{
 assert.equal(getStickPose(p(0)).dir,1);
 assert.equal(getStickPose(p(1)).dir,-1);
});
test('rendering draws segmented limbs and a round head but does not mutate player state',()=>{
 const actor=p(),before=structuredClone(actor);
 const calls={line:0,arc:0,fill:0};
 const ctx=new Proxy({},{get(target,key){
  if(key==='lineTo')return ()=>{calls.line++};
  if(key==='arc')return ()=>{calls.arc++};
  if(key==='fill')return ()=>{calls.fill++};
  return target[key]??(()=>{});
 },set(target,key,value){target[key]=value;return true}});
 const pose=drawStickman(ctx,actor,{selected:true,hasBall:true,time:.35});
 assert.equal(pose.state,'dribble');
 assert.ok(calls.line>=12&&calls.arc>=3&&calls.fill>=3);
 assert.deepEqual(actor,before);
});
test('engine emits shoot/pass/block action cues with original gameplay decisions',()=>{
 const g=createGame(25);
 assert.ok(passBall(g,'B2'));assert.equal(g.players[0].action.kind,'pass');
 const shot=createGame(27),def=shot.players[3];def.x=shot.players[0].x+48;def.y=shot.players[0].y;
 assert.ok(shootBall(shot,'B1',.78));assert.equal(shot.players[0].action.kind,'shoot');
 assert.ok(tryBlockShot(shot,'R1'));assert.equal(def.action.kind,'block');
 assert.equal(shot.players[0].action.kind,'stagger');
 assert.equal(shot.ball.flight.made,false);
});
test('animation clock freezes while paused and action timestamps expire in real game steps',()=>{
 const g=createGame();shootBall(g,'B1');
 stepGame(g,.05);const clock=g.animClock,action=g.players[0].action.elapsed;
 g.status='paused';stepGame(g,.05);
 assert.equal(g.animClock,clock);assert.equal(g.players[0].action.elapsed,action);
 g.status='playing';for(let i=0;i<20;i++)stepGame(g,.04);
 assert.equal(g.players[0].action,null);
});
test('collision impact and rebound get visible cues',()=>{
 const g=createGame();
 g.players[0].x=g.players[3].x=500;g.players[0].y=g.players[3].y=330;
 resolveCollisions(g);assert.ok(g.players[0].impact>0);
 const reb=createGame();reb.ball.carrier=null;reb.ball.flight=null;
 reb.ball.x=reb.players[0].x;reb.ball.y=reb.players[0].y;
 stepGame(reb,.02);assert.equal(reb.players[0].action.kind,'rebound');
});
test('stickman renderer stays finite over many player speeds and action frames',()=>{
 const actor=p();
 for(let vx=-400;vx<=400;vx+=80)for(let y=-400;y<=400;y+=80){
  actor.vx=vx;actor.vy=y;
  for(const kind of STICK_STATES){
   actor.action=kind==='idle'||kind==='run'||kind==='dribble'||kind==='aim'?null:{kind,elapsed:.15,duration:.4};
   const pose=getStickPose(actor,{time:.4,hasBall:kind==='dribble',charging:kind==='aim'});
   for(const key of ['head','neck','hip','handL','handR','footL','footR','ball'])
    assert.ok(Number.isFinite(pose[key].x)&&Number.isFinite(pose[key].y),kind+' '+key);
  }
 }
});
test('basketball is still one same-origin app with the new renderer whitelisted',()=>{
 const server=readFileSync(path.join(root,'hub/server.mjs'),'utf8');
 const client=readFileSync(path.join(root,'apps/basketball/game.js'),'utf8');
 const index=readFileSync(path.join(root,'apps/basketball/index.html'),'utf8');
 assert.match(server,/\/play\/basketball\/stickman\.mjs/);
 assert.match(client,/import \{drawStickman,getStickPose\} from '\.\/stickman\.mjs'/);
 assert.match(client,/drawStickman\(ctx,p,/);
 assert.match(index,/STICKMAN HOOPS/);
});
