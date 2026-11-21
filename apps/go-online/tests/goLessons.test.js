import test from 'node:test';
import assert from 'node:assert/strict';
import {GO_LESSONS,buildLessonBoard,lessonGoalHit,lessonMoveCompleted,lessonTargetIndices} from '../shared/goLessons.js';
import {boardKey,groupAt,tryMove} from '../shared/goRules.js';
import {chooseAiMove} from '../shared/goCoach.js';

test('academy contains exactly fifty unique, separately explained lessons',()=>{
  assert.equal(GO_LESSONS.length,50);
  assert.deepEqual(GO_LESSONS.map(item=>item.id),Array.from({length:50},(_,i)=>i+1));
  for(const lesson of GO_LESSONS){
    for(const key of ['chapter','title','concept','why','task','hint','expand','mistake','success']){
      assert.ok(typeof lesson[key]==='string'&&lesson[key].length>=(key==='title'?3:6),`${lesson.id}:${key}`);
    }
  }
});

test('each opening position has valid, non-overlapping live groups',()=>{
  for(const lesson of GO_LESSONS){
    const board=buildLessonBoard(lesson);
    const size=lesson.size||9;
    assert.equal(board.length,size*size);
    for(let i=0;i<board.length;i++)if(board[i])assert.ok(groupAt(board,i,size)?.liberties.length>0,`Lesson ${lesson.id} stone ${i} zero liberties`);
  }
});

test('all target moves are legal and match the lesson pass/move goal',()=>{
  for(const lesson of GO_LESSONS){
    const board=buildLessonBoard(lesson),history=[boardKey(board)],size=lesson.size||9;
    if(lesson.goal==='pass'){
      assert.equal(lessonTargetIndices(lesson).length,0);
      assert.equal(lessonGoalHit(lesson,null),true);
      continue;
    }
    assert.ok(lessonTargetIndices(lesson).length>=1,`Lesson ${lesson.id} missing target`);
    for(const index of lessonTargetIndices(lesson)){
      const result=tryMove(board,index,1,size,history);
      assert.ok(result.board[index]===1,`Lesson ${lesson.id} incorrect target`);
      assert.equal(lessonGoalHit(lesson,index),true);
    }
    assert.equal(lessonGoalHit(lesson,null),false);
  }
});

test('a rule-driven white AI may respond to all placement lesson solutions',()=>{
  for(const lesson of GO_LESSONS.filter(x=>x.goal!=='pass')){
    const board=buildLessonBoard(lesson),size=lesson.size||9;
    const target=lessonTargetIndices(lesson)[0];
    const result=tryMove(board,target,1,size,[boardKey(board)]);
    const ai=chooseAiMove(result.board,size,2,[boardKey(board),result.key],'beginner',1);
    assert.ok(ai===null||Number.isInteger(ai));
    if(ai!==null){
      assert.doesNotThrow(()=>tryMove(result.board,ai,2,size,[boardKey(board),result.key]));
    }
  }
});

test('lesson three captures one stone and lesson eight captures two',()=>{
  for(const [id,count] of [[3,1],[8,2]]){
    const lesson=GO_LESSONS.find(x=>x.id===id);
    const board=buildLessonBoard(lesson);
    const result=tryMove(board,lessonTargetIndices(lesson)[0],1,9,[boardKey(board)]);
    assert.equal(result.captured,count);
  }
});

test('last lesson finishes by human pass then AI pass (scoring starts)',()=>{
  const last=GO_LESSONS.find(lesson=>lesson.id===15);
  assert.equal(last.goal,'pass');
  assert.equal(lessonGoalHit(last,null),true);
  assert.equal(lessonGoalHit(last,40),false);
});


test('lesson is NOT completed after a wrong opening move or before AI answers',()=>{
  const lesson=GO_LESSONS[2];
  assert.equal(lessonMoveCompleted(lesson,false,{moveNumber:2,turn:1,status:'playing'}),false);
  assert.equal(lessonMoveCompleted(lesson,true,{moveNumber:1,turn:2,status:'playing'}),false);
  assert.equal(lessonMoveCompleted(lesson,true,{moveNumber:2,turn:1,status:'playing'}),true);
  assert.equal(lessonMoveCompleted(lesson,true,{moveNumber:2,turn:1,status:'finished'}),false);
});

test('passing the final lesson requires separate scoring confirmation',()=>{
  const lesson=GO_LESSONS.find(lesson=>lesson.id===15);
  assert.equal(lessonMoveCompleted(lesson,true,{moveNumber:2,turn:1,status:'scoring'}),false);
});
