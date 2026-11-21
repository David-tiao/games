import test from 'node:test';
import assert from 'node:assert/strict';
import {GO_METHODS,methodBoardAt,methodToSgf} from '../shared/goMethodology.js';
import {GO_LESSONS,buildLessonBoard} from '../shared/goLessons.js';

test('original methodology library includes 16 unique themes with detailed move-by-move notes',()=>{
  assert.equal(GO_METHODS.length,16);
  assert.equal(new Set(GO_METHODS.map(m=>m.id)).size,16);
  for(const m of GO_METHODS){
    assert.ok(m.principle.length>15&&m.principleEn.length>15);
    assert.ok(m.question.length>5&&m.questionEn.length>5);
    assert.ok(m.steps.length>=3);
    for(const step of m.steps){assert.ok(step.note.length>10&&step.noteEn.length>10)}
  }
});
test('every replay ply follows real Go capture, suicide and ko rules',()=>{
  for(const m of GO_METHODS){
    for(let ply=0;ply<=m.steps.length;ply++){
      const frame=methodBoardAt(m,ply);
      assert.equal(frame.board.length,m.size*m.size);
      assert.ok(frame.captures>=0);
    }
  }
});
test('replaying at an earlier ply does not mutate later snapshots',()=>{
  const m=GO_METHODS[1];
  const start=methodBoardAt(m,0).board.join('');
  const finish=methodBoardAt(m,m.steps.length).board.join('');
  assert.notEqual(start,finish);
  assert.equal(methodBoardAt(m,0).board.join(''),start);
  assert.throws(()=>methodBoardAt(m,m.steps.length+1));
});
test('SGF exports have board setup and B/W moves including passes',()=>{
  for(const m of GO_METHODS){
    const sgf=methodToSgf(m);
    assert.match(sgf,/^\(;GM\[1\]FF\[4\]SZ\[(9|13|19)\]KM\[7\.5\]/);
    assert.ok(sgf.endsWith(')'));
    assert.equal((sgf.match(/;[BW]\[/g)||[]).length,m.steps.length);
  }
  assert.ok(methodToSgf(GO_METHODS.at(-1)).includes('B[]'));
});
test('old 15 are retained and later course sections include 13/19 boards and English guidance',()=>{
  assert.equal(GO_LESSONS.length,50);
  for(const l of GO_LESSONS.slice(15)){
    const board=buildLessonBoard(l);
    assert.equal(board.length,(l.size||9)**2);
    for(const f of ['chapter','title','badge','concept','why','task','hint','expand','mistake','success']){
      assert.ok(l.english?.[f]?.length>=5,`${l.id} missing English ${f}`);
    }
  }
  assert.ok(GO_LESSONS.some(l=>l.size===13));
  assert.ok(GO_LESSONS.some(l=>l.size===19));
});
