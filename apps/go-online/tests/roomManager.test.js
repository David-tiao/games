import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,makeMove,pass,markDead,confirmScore,resume,resign,rematch,disconnect,leave} from '../server/src/roomManager.js';
const players=(id)=>[{id:`b-${id}`,username:`black_${id}`},{id:`w-${id}`,username:`white_${id}`}];
function setup(id,size=9){
 const [b,w]=players(id);const room=createRoom(b,`bSock-${id}`,size);
 return {b,w,room:joinRoom(room.code,w,`wSock-${id}`),code:room.code,bSock:`bSock-${id}`,wSock:`wSock-${id}`};
}
test('9/13/19-board rooms and owner color',()=>{
 for(const size of [9,13,19]){const {room}=setup(`s${size}`,size);assert.equal(room.board.length,size*size);assert.equal(room.players[0].color,1);assert.equal(room.players[1].color,2);}
});
test('cannot move out of turn, over existing stones, or using wrong socket',()=>{
 const {b,w,bSock,wSock}=setup('turn');
 assert.throws(()=>makeMove(w,wSock,0),/还没轮到你/);
 const state=makeMove(b,bSock,0);assert.equal(state.board[0],1);assert.equal(state.turn,2);
 assert.throws(()=>makeMove(w,wSock,0),/已有棋子/);
 assert.throws(()=>makeMove(w,'another-socket',1),/房间已失效/);
});
test('two consecutive passes enter scoring; both must confirm',()=>{
 const {b,w,bSock,wSock}=setup('pass');
 makeMove(b,bSock,40);makeMove(w,wSock,0);
 const first=pass(b,bSock);assert.equal(first.status,'playing');
 const second=pass(w,wSock);assert.equal(second.status,'scoring');
 assert.equal(second.passes,2);
 const withDead=markDead(b,bSock,0);assert.deepEqual(withDead.deadStones,[0]);
 const confirmed=confirmScore(b,bSock);assert.equal(confirmed.status,'scoring');
 assert.equal(confirmed.scoreConfirmations.length,1);
 const altered=markDead(w,wSock,0);assert.equal(altered.scoreConfirmations.length,0);
 confirmScore(b,bSock);
 const done=confirmScore(w,wSock);assert.equal(done.status,'finished');assert.equal(done.result,'count');
 assert.ok(done.score);
});
test('can resume after scoring dispute',()=>{
 const {b,w,bSock,wSock}=setup('resume');
 pass(b,bSock);pass(w,wSock);
 const active=resume(b,bSock);
 assert.equal(active.status,'playing');assert.equal(active.passes,0);
});
test('resignation ends game and both must rematch',()=>{
 const {b,w,bSock,wSock}=setup('resign');
 const done=resign(b,bSock);assert.equal(done.winner,2);
 const one=rematch(b,bSock);assert.equal(one.status,'finished');
 const again=rematch(w,wSock);assert.equal(again.status,'playing');assert.equal(again.moveNumber,0);
});
test('reconnecting restores the match and old socket loses authority',()=>{
 const {b,w,bSock,wSock,code}=setup('reconnect');
 disconnect(b.id,bSock);
 const fresh=joinRoom(code,b,'bSock-new',{rejoin:true});
 assert.equal(fresh.players[0].connected,true);
 assert.throws(()=>makeMove(b,bSock,1),/房间已失效/);
 assert.equal(makeMove(b,'bSock-new',1).board[1],1);
 leave(w,wSock);
});
