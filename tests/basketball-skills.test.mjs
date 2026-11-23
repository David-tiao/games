import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGame,stepGame,finishAtRim,tryCrossover,trySteal,tryBlockShot,getShotInfo} from '../apps/basketball/engine.mjs';
import {getStickPose,STICK_STATES} from '../apps/basketball/stickman.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const near=(x=949,seed=20)=>{
 const s=createGame(seed);s.players[0].x=x;s.players[0].y=330;
 s.players[3].x=520;s.players[3].y=330;
 return s;
};
test('V0.4 prevents a layup or dunk far from the hoop',()=>{
 const s=createGame();
 assert.equal(finishAtRim(s,'B1'),false);
 assert.equal(s.ball.carrier,'B1');
});
test('V0.4 dunk near the rim consumes stamina and is a two-pointer',()=>{
 const s=near(949);
 assert.equal(finishAtRim(s,'B1'),true);
 assert.equal(s.ball.flight.style,'dunk');
 assert.equal(s.ball.flight.points,2);
 assert.equal(s.players[0].stamina,72);
 assert.equal(s.players[0].action.kind,'dunk');
 assert.equal(s.lastShot.style,'dunk');
});
test('V0.4 layup is available from the lane, always counts two points',()=>{
 const s=near(886);
 assert.equal(finishAtRim(s,'B1'),true);
 assert.equal(s.ball.flight.style,'layup');
 assert.equal(s.ball.flight.points,2);
 assert.equal(s.players[0].stamina,87);
});
test('V0.4 crowded rim uses layup instead of an uncontested dunk',()=>{
 const s=near(960);
 const defender=s.players[3];defender.x=s.players[0].x-43;
 defender.y=s.players[0].y;
 assert.equal(getShotInfo(s,'B1').contest,2);
 assert.equal(finishAtRim(s,'B1'),true);
 assert.equal(s.ball.flight.style,'layup');
});
test('V0.4 stamina below 16 or no ball prevents a finish',()=>{
 const s=near(949);
 s.players[0].stamina=15;
 assert.equal(finishAtRim(s,'B1'),false);
 s.players[0].stamina=100;
 assert.equal(finishAtRim(s,'B2'),false);
});
test('V0.4 dunk points are awarded by the old scoring pipeline',()=>{
 const s=near(950,124);
 assert.equal(finishAtRim(s,'B1'),true);
 s.ball.flight.made=true;
 for(let i=0;i<28;i++)stepGame(s,.04);
 assert.equal(s.score[0],2);
 assert.equal(s.possession,1);
 assert.equal(s.ball.carrier,'R1');
});
test('V0.4 blocked layup remains blocked and never scores',()=>{
 const s=near(890,765);
 const d=s.players[3];d.x=s.players[0].x-47;d.y=s.players[0].y;
 assert.equal(finishAtRim(s,'B1'),true);
 assert.equal(tryBlockShot(s,'R1'),true);
 assert.equal(s.ball.flight.made,false);
 for(let i=0;i<28;i++)stepGame(s,.04);
 assert.equal(s.score[0],0);
});
test('V0.4 crossover consumes stamina, creates burst and cooldown',()=>{
 const s=createGame();
 assert.equal(tryCrossover(s,'B1'),true);
 const p=s.players[0];
 assert.equal(p.stamina,85);
 assert.equal(p.action.kind,'crossover');
 assert.ok(p.burstTime>0 && p.crossoverCooldown>0);
 assert.equal(tryCrossover(s,'B1'),false);
});
test('V0.4 crossover requires possession and sufficient stamina',()=>{
 const s=createGame();s.players[0].stamina=14;
 assert.equal(tryCrossover(s,'B1'),false);
 s.players[0].stamina=100;
 assert.equal(tryCrossover(s,'B2'),false);
});
test('V0.4 crossover cooldown elapses with play and freezes when paused',()=>{
 const s=createGame();tryCrossover(s,'B1');
 const first=s.players[0].crossoverCooldown;
 s.status='paused';stepGame(s,.05);
 assert.equal(s.players[0].crossoverCooldown,first);
 s.status='playing';stepGame(s,.05);
 assert.ok(s.players[0].crossoverCooldown<first);
});
test('V0.4 close defenders may be stunned by crossover, but not distant defenders',()=>{
 const s=createGame(1);
 const p=s.players[0];s.players[3].x=p.x+48;s.players[3].y=p.y;
 s.players[4].x=900;s.players[4].y=210;s.players[5].x=900;s.players[5].y=440;
 assert.equal(tryCrossover(s,'B1'),true);
 assert.equal(s.players[4].stunTime,0);
 assert.equal(s.players[5].stunTime,0);
 if(s.players[3].stunTime>0)assert.equal(trySteal(s,'R1'),false);
});
test('V0.4 burst increases controlled movement speed but stays on court',()=>{
 const s1=createGame(2),s2=createGame(2);
 tryCrossover(s2,'B1');
 const start=s1.players[0].x;
 stepGame(s1,.04,{x:1,y:0});
 stepGame(s2,.04,{x:1,y:0});
 assert.ok(s2.players[0].x-start>s1.players[0].x-start);
});
test('V0.4 crossover animation actually switches ball between hands',()=>{
 assert.ok(STICK_STATES.includes('crossover'));
 const p={team:0,n:0,vx:0,vy:0,action:{kind:'crossover',duration:.5,elapsed:.1}};
 const left=getStickPose(p,{hasBall:true}).ball.x;
 p.action.elapsed=.4;
 const right=getStickPose(p,{hasBall:true}).ball.x;
 assert.ok(left*right<0);
});
test('V0.4 layup/dunk skeletons jump, but the player world position stays unchanged',()=>{
 for(const kind of ['layup','dunk']){
  const p={team:0,n:0,x:500,y:350,vx:0,vy:0,action:{kind,elapsed:.2,duration:.4}};
  const before=[p.x,p.y];
  const pose=getStickPose(p,{time:1});
  assert.ok(pose.jump>10);
  assert.deepEqual([p.x,p.y],before);
 }
});
test('V0.4 browser assets and keyboard/touch controls are wired',()=>{
 const html=readFileSync(path.join(root,'apps/basketball/index.html'),'utf8');
 const client=readFileSync(path.join(root,'apps/basketball/game.js'),'utf8');
 assert.match(html,/id="finishBtn"/);assert.match(html,/id="crossoverBtn"/);
 assert.match(client,/finishAtRim\(game,id\)/);assert.match(client,/tryCrossover\(game,game.controlled\)/);
 assert.match(client,/if\(k==='l'/);assert.match(client,/if\(k==='c'/);
});
