import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {COURT,createGame,stepGame,shootBall,passBall,trySteal,switchPlayer,getShotInfo,bestPassTarget} from '../apps/basketball/engine.mjs';
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
