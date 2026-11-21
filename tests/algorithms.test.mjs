import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard,hasFive,selectAI,analyzeMove,candidates,SIZE,LESSONS} from '../hub/learning/assets/gomoku-ai.js';
import {infer} from '../hub/learning/assets/mines-ai.js';
const pos=(r,c)=>r*SIZE+c;
test('五子棋：五连判定与两端延伸',()=>{
  const b=emptyBoard();for(let c=4;c<=8;c++)b[pos(7,c)]=1;
  assert.equal(hasFive(b,pos(7,6),1),true);
  assert.equal(hasFive(b,pos(7,6),2),false);
});
test('五子棋：已有四连时 AI 会立即完成五连',()=>{
  const b=emptyBoard();for(let c=4;c<=7;c++)b[pos(7,c)]=2;
  const choice=selectAI(b,2);
  assert.ok([pos(7,3),pos(7,8)].includes(choice.index),`got ${choice.index}`);
  b[choice.index]=2;assert.ok(hasFive(b,choice.index,2));
});
test('五子棋：阻止对手的立即五连',()=>{
  const b=emptyBoard();for(let c=4;c<=7;c++)b[pos(7,c)]=1;
  b[pos(7,3)]=2;
  assert.equal(selectAI(b,2).index,pos(7,8));
});
test('五子棋：候选点不包含已占用点',()=>{
  const b=emptyBoard();b[pos(7,7)]=1;
  assert.equal(analyzeMove(b,pos(7,7),2),null);
  assert.ok(candidates(b,2).every(x=>b[x.index]===0));
});
test('五子棋：12 门课程都有双语标题与讲解',()=>{
  assert.equal(LESSONS.length,12);
  assert.ok(LESSONS.every(l=>l.length===5&&l.slice(0,4).every(Boolean)));
});
test('扫雷：旗帜已覆盖提示数时判定其余格安全',()=>{
  const v=[{flagged:true,revealed:false,count:null},{flagged:false,revealed:true,count:1},{flagged:false,revealed:false,count:null}];
  const r=infer(1,3,v);assert.deepEqual(r.safe,[2]);assert.deepEqual(r.mines,[]);
});
test('扫雷：未知邻格全部是雷时推断',()=>{
  const v=[{revealed:true,flagged:false,count:1},{revealed:false,flagged:false,count:null}];
  const r=infer(1,2,v);assert.deepEqual(r.mines,[1]);
});
test('扫雷：没有数字不冒充安全',()=>{
  const v=Array.from({length:9},()=>({revealed:false,flagged:false,count:null}));
  const r=infer(3,3,v);assert.deepEqual(r.safe,[]);assert.deepEqual(r.mines,[]);
});
test('扫雷：推导不读取隐藏地雷字段',()=>{
  const base=[{revealed:true,flagged:false,count:1},{revealed:false,flagged:false,count:null}];
  const a=infer(1,2,base.map((x,i)=>({...x,mine:i===0})))
  const b=infer(1,2,base.map((x,i)=>({...x,mine:i===1})))
  assert.deepEqual(a,b);
});
