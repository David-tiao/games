import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePosition,chooseAiMove,coordinate,recommendMoves} from '../shared/goCoach.js';
import {tryMove} from '../shared/goRules.js';
import {createRoom,joinRoom,leaveIfWaiting,coachForPlayer} from '../server/src/roomManager.js';

const empty=size=>Array(size*size).fill(0);

test('opening teacher recommends legal moves on empty 9, 13, 19 boards',()=>{
  for(const size of [9,13,19]){
    const board=empty(size);
    const analysis=analyzePosition(board,size,1,[board.join('')]);
    assert.equal(analysis.moves.length,3);
    assert.match(analysis.summary,/布局/);
    for(const hint of analysis.moves){
      assert.ok(Number.isInteger(hint.index));
      assert.equal(tryMove(board,hint.index,1,size).captured,0);
      assert.ok(hint.reason.includes(hint.coordinate));
    }
  }
});
test('coordinate labels match the board: no I column',()=>{
  assert.equal(coordinate(0,9),'A9');
  assert.equal(coordinate(8,9),'J9');
  assert.equal(coordinate(80,9),'J1');
});
test('coach identifies an immediate capture and explains why',()=>{
  const board=empty(9), center=4*9+4;
  board[center]=2;
  for(const point of [3*9+4,5*9+4,4*9+3])board[point]=1;
  const tips=recommendMoves(board,9,1,[],3);
  assert.equal(tips[0].index,4*9+5);
  assert.match(tips[0].title,/提走/);
  assert.match(tips[0].reason,/最后一口气/);
  assert.equal(tryMove(board,tips[0].index,1,9).captured,1);
});
test('coach notices own group in atari and suggests escape',()=>{
  const board=empty(9), center=4*9+4;
  board[center]=1;
  for(const point of [3*9+4,5*9+4,4*9+3])board[point]=2;
  const analysis=analyzePosition(board,9,1,[]);
  assert.match(analysis.summary,/危险/);
  assert.ok(analysis.moves.some(move=>move.index===4*9+5));
});
test('coach does not recommend repeated-position moves',()=>{
  const board=empty(9);
  const illegalFuture=tryMove(board,2*9+2,1,9).key;
  const suggestions=recommendMoves(board,9,1,[illegalFuture],40);
  assert.ok(!suggestions.some(move=>move.index===2*9+2));
});
test('computer opponent only chooses legal placements',()=>{
  for(const difficulty of ['beginner','standard']){
    const size=9,board=empty(size);
    board[40]=1;
    const point=chooseAiMove(board,size,2,[empty(size).join(''),board.join('')],difficulty,7);
    assert.ok(point!==null);
    assert.ok(tryMove(board,point,2,size));
  }
});
test('waiting room can safely switch to AI; active human room refuses switch',()=>{
  const first={id:'teacher-switch-owner',username:'teacher_switch_owner'};
  const second={id:'teacher-switch-friend',username:'teacher_switch_friend'};
  const code=createRoom(first,'owner-socket-1',9).code;
  assert.equal(leaveIfWaiting(first,'owner-socket-1').closed,true);
  const live=createRoom(first,'owner-socket-2',9);
  const joined=joinRoom(live.code,second,'friend-socket');
  assert.equal(joined.status,'playing');
  assert.throws(()=>leaveIfWaiting(first,'owner-socket-2'),/好友已加入/);
  const tips=coachForPlayer(first,'owner-socket-2');
  assert.equal(tips.moves.length,3);
  assert.throws(()=>coachForPlayer(second,'friend-socket'),/还没轮到你/);
});

test('AI heuristic repeatedly chooses legal turns during a short practice simulation',()=>{
  for(const size of [9,13,19]){
    let board=empty(size),history=[board.join('')],moves=0;
    for(let i=0;i<Math.min(44,size*size);i++){
      const color=i%2===0?1:2;
      const index=chooseAiMove(board,size,color,history,i%3?'standard':'beginner',i);
      if(index===null)break;
      const result=tryMove(board,index,color,size,history);
      board=result.board;history.push(result.key);moves++;
    }
    assert.ok(moves>=20,`unexpectedly short AI simulation on ${size}x${size}: ${moves}`);
    assert.equal(board.length,size*size);
  }
});
