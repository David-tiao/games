import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {COURT,createGame,stepGame,shootBall,passBall,trySteal,tryBlockShot,resolveCollisions,switchPlayer,getShotInfo,bestPassTarget} from '../apps/basketball/engine.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('six players begin a 3v3 game with shared ball possession',()=>{
 const s=createGame();assert.equal(s.players.length,6);
 assert.deepEqual(s.players.map(p=>p.team),[0,0,0,1,1,1]);
 assert.equal(s.ball.carrier,'B1');assert.equal(s.time,180);assert.equal(s.shotClock,24);
});
test('only teammates may receive passes and player switching stays on blue',()=>{
 const s=createGame();assert.equal(passBall(s,'R1'),false);
 assert.equal(passBall(s,'B2'),true);
 for(let i=0;i<35;i++)stepGame(s,.04);
 assert.equal(s.ball.carrier,'B2');
 assert.equal(switchPlayer(s),'B2');
 assert.equal(bestPassTarget(s,'B2')?.startsWith('B'),true);
});
test('shot success probability responds to distance and nearby defenders',()=>{
 const s=createGame();const blue=s.players[0];
 blue.x=850;const close=getShotInfo(s,'B1').probability;
 blue.x=220;const far=getShotInfo(s,'B1').probability;
 assert.ok(close>far);
 blue.x=850;const open=getShotInfo(s,'B1').probability;
 const red=s.players[3];red.x=blue.x+15;red.y=blue.y;
 const contested=getShotInfo(s,'B1').probability;assert.ok(contested<open);
});
test('arcade court 3 point threshold is consistent',()=>{
 const s=createGame();s.players[0].x=500;
 assert.equal(getShotInfo(s,'B1').points,3);
 s.players[0].x=830;
 assert.equal(getShotInfo(s,'B1').points,2);
});
test('successful shot counts points, resets possession and shot clock',()=>{
 const s=createGame();s.players[0].x=920;
 assert.equal(shootBall(s,'B1',.78),true);
 assert.equal(shootBall(s,'B1',.78),false);
 s.ball.flight.made=true;
 for(let i=0;i<50;i++)stepGame(s,.04);
 assert.equal(s.score[0],2);
 assert.equal(s.possession,1);assert.equal(s.ball.carrier,'R1');
 assert.ok(s.shotClock>22);
});
test('24 second violation gives ball to other team',()=>{
 const s=createGame();s.shotClock=.01;
 stepGame(s,.02);assert.equal(s.possession,1);assert.equal(s.ball.carrier,'R1');
});
test('game clock reaches final state without underflow',()=>{
 const s=createGame();s.time=.01;stepGame(s,.04);
 assert.equal(s.status,'finished');assert.equal(s.time,0);
});
test('controlled movement remains within court bounds',()=>{
 const s=createGame();for(let i=0;i<2400;i++)stepGame(s,.05,{x:-1,y:-1,turbo:true});
 const p=s.players.find(p=>p.id===s.controlled);
 assert.ok(p.x>=COURT.x+17);assert.ok(p.y>=COURT.y+17);
});
test('hub exposes basketball route, scripts and sixth card without changing other games',()=>{
 const server=readFileSync(path.join(root,'hub/server.mjs'),'utf8');
 const hub=readFileSync(path.join(root,'hub/public/index.html'),'utf8');
 const map=readFileSync(path.join(root,'hub/public/assets/main.js'),'utf8');
 const html=readFileSync(path.join(root,'apps/basketball/index.html'),'utf8');
 assert.match(server,/\/play\/basketball/);
 assert.match(map,/basketball:\{play:'\/play\/basketball\//);
 assert.match(hub,/data-game="basketball"/);
 assert.match(html,/id="court"/);
 assert.match(html,/\/play\/basketball\/game\.js/);
});


test('V0.2 players separate if they collide even at exactly the same point',()=>{
 const s=createGame();
 s.players[0].x=s.players[3].x=500;
 s.players[0].y=s.players[3].y=335;
 resolveCollisions(s);
 assert.ok(Math.hypot(s.players[0].x-s.players[3].x,s.players[0].y-s.players[3].y)>=38.9);
 for(const p of s.players){
  assert.ok(p.x>=COURT.x+17 && p.x<=COURT.x+COURT.w-17);
  assert.ok(p.y>=COURT.y+17 && p.y<=COURT.y+COURT.h-17);
 }
});
test('V0.2 accurate timed blocks work only for a close opposing defender',()=>{
 const s=createGame();
 const defender=s.players.find(p=>p.id==='R1');
 defender.x=s.players[0].x+48;defender.y=s.players[0].y;
 assert.equal(shootBall(s,'B1'),true);
 assert.equal(tryBlockShot(s,'B2'),false);
 assert.equal(tryBlockShot(s,'R1'),true);
 assert.equal(tryBlockShot(s,'R1'),false);
 assert.equal(s.ball.flight.made,false);
 assert.equal(s.lastShot.blocked,true);
 assert.ok(s.effects.some(e=>e.kind==='block'));
});
test('V0.2 late blocks and out-of-range blocks are rejected',()=>{
 const s=createGame();
 const defender=s.players.find(p=>p.id==='R1');
 defender.x=s.players[0].x+180;defender.y=s.players[0].y;
 shootBall(s,'B1');
 assert.equal(tryBlockShot(s,'R1'),false);
 defender.x=s.players[0].x+45;
 s.ball.flight.elapsed=.40;
 assert.equal(tryBlockShot(s,'R1'),false);
});
test('V0.2 airborne shot does not suffer 24-second violation',()=>{
 const s=createGame();
 s.shotClock=.03;
 assert.equal(shootBall(s,'B1'),true);
 s.ball.flight.made=true;
 for(let i=0;i<9;i++)stepGame(s,.04);
 assert.equal(s.possession,0);
 assert.equal(s.ball.flight.kind,'shot');
 assert.ok(s.shotClock>0);
});
test('V0.2 offensive rebound resets to 14, defensive to 24',()=>{
 const offense=createGame();
 offense.ball.carrier=null;offense.ball.flight=null;
 offense.ball.x=offense.players[0].x;offense.ball.y=offense.players[0].y;
 stepGame(offense,.02);
 assert.equal(offense.ball.carrier,'B1');
 assert.equal(offense.shotClock,14);
 const defense=createGame();
 defense.possession=1;defense.ball.carrier=null;defense.ball.flight=null;
 defense.ball.x=defense.players[0].x;defense.ball.y=defense.players[0].y;
 stepGame(defense,.02);
 assert.equal(defense.ball.carrier,'B1');
 assert.equal(defense.shotClock,24);
});
test('V0.2 AI difficulty is validated and selected player persists after a basket',()=>{
 const s=createGame(10,{difficulty:'pro'});
 assert.equal(s.difficulty,'pro');
 s.controlled='B2';s.players[0].x=950;
 shootBall(s,'B1');s.ball.flight.made=true;
 for(let i=0;i<40;i++)stepGame(s,.04);
 assert.equal(s.controlled,'B2');
 assert.equal(createGame(20,{difficulty:'unknown'}).difficulty,'normal');
});
test('V0.2 finite movement under repeated AI collisions',()=>{
 const s=createGame(330,{difficulty:'pro'});
 for(let i=0;i<1600;i++)stepGame(s,.04,{x:Math.cos(i/30),y:Math.sin(i/30),turbo:i%3===0});
 for(const p of s.players){
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  assert.ok(Number.isFinite(p.vx)&&Number.isFinite(p.vy));
  assert.ok(p.x>=COURT.x+16.9&&p.x<=COURT.x+COURT.w-16.9);
 }
});
test('V0.2 fullscreen UI exposes difficulty, pause and score feedback',()=>{
 const html=readFileSync(path.join(root,'apps/basketball/index.html'),'utf8');
 const game=readFileSync(path.join(root,'apps/basketball/game.js'),'utf8');
 assert.match(html,/id="difficulty"/);assert.match(html,/id="pause"/);
 assert.match(html,/id="pausedBadge"/);
 assert.match(game,/tryBlockShot/);assert.match(game,/e.kind==='score'/);
 assert.match(game,/function togglePause/);
});

test('V0.2 release before final whistle is allowed to finish scoring',()=>{
 const s=createGame();
 s.time=.02;s.players[0].x=950;
 assert.equal(shootBall(s,'B1',.78),true);
 s.ball.flight.made=true;
 stepGame(s,.04);
 assert.equal(s.status,'playing');
 for(let i=0;i<50;i++)stepGame(s,.04);
 assert.equal(s.score[0],2);
 assert.equal(s.status,'finished');
});

test('V0.2 six overlapping players separate to almost full body diameter',()=>{
 const s=createGame();
 for(const p of s.players){p.x=540;p.y=320;}
 resolveCollisions(s);
 for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){
  const d=Math.hypot(s.players[i].x-s.players[j].x,s.players[i].y-s.players[j].y);
  assert.ok(d>=38.9,`overlapping players ${i} ${j}: ${d}`);
 }
});
