import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCandidates,traceAlgorithm,chooseAiMove,recommendMoves} from '../shared/goCoach.js';
import {boardKey,tryMove} from '../shared/goRules.js';

for (const size of [9,13,19]) {
  test(`${size}x${size}: displayed factors sum to actual heuristic scores`,()=>{
    const board=Array(size*size).fill(0), history=[boardKey(board)];
    for(const item of evaluateCandidates(board,size,1,history)){
      assert.equal(item.factors.reduce((sum,f)=>sum+f.delta,0),item.score);
      assert.ok(item.metrics.liberties>=1);
      assert.doesNotThrow(()=>tryMove(board,item.index,1,size,history));
    }
  });
  test(`${size}x${size}: trace selection equals real AI move for both levels`,()=>{
    const board=Array(size*size).fill(0);const history=[boardKey(board)];
    for(const level of ['beginner','standard']) for(const seed of [0,1,7]){
      const trace=traceAlgorithm(board,size,2,history,level,seed);
      assert.equal(trace.chosen?.index??null,chooseAiMove(board,size,2,history,level,seed));
      assert.deepEqual(trace.shortlist.map(m=>m.index),recommendMoves(board,size,2,history,12).map(m=>m.index));
      assert.equal(trace.legal,trace.ranked.length);
      assert.equal(trace.legal+trace.illegal,trace.considered);
    }
  });
}

test('a real capture earns +100 per captured stone in both trace and AI',()=>{
  const board=Array(81).fill(0);
  // White group at D5, black stones on three of four neighboring liberties.
  const p=(r,c)=>r*9+c;
  board[p(4,3)]=2;
  board[p(3,3)]=1;board[p(5,3)]=1;board[p(4,2)]=1;
  const history=[boardKey(board)];
  const index=p(4,4);
  const move=evaluateCandidates(board,9,1,history).find(m=>m.index===index);
  assert.ok(move);
  assert.equal(move.metrics.captured,1);
  assert.ok(move.factors.some(f=>f.key==='capture'&&f.delta===100));
  assert.equal(move.factors.reduce((total,f)=>total+f.delta,0),move.score);
});

test('illegal occupied intersections are excluded from heatmap and trace',()=>{
  const board=Array(81).fill(0);board[12]=1;board[13]=2;
  const trace=traceAlgorithm(board,9,1,[boardKey(board)]);
  assert.equal(trace.considered,79);
  assert.ok(trace.ranked.every(m=>m.index!==12&&m.index!==13));
  assert.ok(trace.chosen===null||trace.ranked.some(m=>m.index===trace.chosen.index));
});
