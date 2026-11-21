import test from 'node:test';
import assert from 'node:assert/strict';
import {areaScore,boardKey,groupAt,neighbors,tryMove} from '../shared/goRules.js';
const empty=()=>Array(81).fill(0),idx=(r,c)=>r*9+c;

test('neighbor list stays within the board (no row wrap)',()=>{
  assert.deepEqual(neighbors(0,9).sort((a,b)=>a-b),[1,9]);
  assert.deepEqual(neighbors(8,9).sort((a,b)=>a-b),[7,17]);
  assert.deepEqual(neighbors(80,9).sort((a,b)=>a-b),[71,79]);
});
test('captures a white stone on its last liberty',()=>{
  const b=empty();b[idx(1,1)]=2;
  for(const p of [[0,1],[1,0],[1,2]])b[idx(...p)]=1;
  const result=tryMove(b,idx(2,1),1,9,[boardKey(b)]);
  assert.equal(result.captured,1);
  assert.equal(result.board[idx(1,1)],0);
  assert.equal(result.board[idx(2,1)],1);
});
test('capture removes an entire connected group',()=>{
  const b=empty();b[idx(1,1)]=2;b[idx(1,2)]=2;
  for(const p of [[0,1],[0,2],[1,0],[1,3],[2,1]])b[idx(...p)]=1;
  const result=tryMove(b,idx(2,2),1,9,[]);
  assert.equal(result.captured,2);
});
test('suicide is rejected',()=>{
  const b=empty();for(const p of [[0,1],[1,0],[1,2],[2,1]])b[idx(...p)]=1;
  assert.throws(()=>tryMove(b,idx(1,1),2,9,[]),/不能自杀/);
});
test('cannot place on an occupied point',()=>{
  const b=empty();b[0]=1;assert.throws(()=>tryMove(b,0,2,9,[]),/已有棋子/);
});
test('positional superko rejects repeated board layouts',()=>{
  const b=empty();const first=tryMove(b,idx(3,3),1,9,[]);
  assert.throws(()=>tryMove(b,idx(3,3),1,9,[first.key]),/劫争/);
});
test('calculates Chinese area scoring including 7.5 komi',()=>{
  const b=Array(81).fill(1);b[idx(4,4)]=0;
  const score=areaScore(b,9,[],7.5);
  assert.equal(score.black,81);assert.equal(score.white,7.5);
  assert.equal(score.territory.black,1);assert.equal(score.winner,1);
});
test('dead stone marking changes the area score',()=>{
  const b=Array(81).fill(1);b[idx(4,4)]=2;
  const s=areaScore(b,9,[idx(4,4)]);
  assert.equal(s.black,81);assert.equal(s.white,7.5);
});
test('groupAt calculates liberties',()=>{
  const b=empty();b[idx(3,3)]=1;b[idx(3,4)]=1;
  const g=groupAt(b,idx(3,3),9);
  assert.equal(g.stones.length,2);assert.equal(g.liberties.length,6);
});
