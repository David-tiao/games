import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('both standalone modules are wired in the lobby and academy',()=>{
  const app=src('client/src/App.tsx');
  const academy=src('client/src/academy/Academy.tsx');
  assert.match(app,/import Methodology from '\.\/methodology\/Methodology'/);
  assert.match(app,/onOpenMethodology=\{\(\)=>setMethodologyOpen\(true\)\}/);
  assert.match(app,/teacherSide=\{teacherSide\} onChangeTeacherSide=\{setTeacherSide\}/);
  assert.match(app,/onClick=\{\(\)=>setMethodologyOpen\(true\)\}/);
  assert.match(academy,/onClick=\{onOpenMethodology\}/);
  assert.match(academy,/GO_LESSONS\.length/);
});
test('progress migration reads old 15-lesson storage without deleting it',()=>{
  const academy=src('client/src/academy/Academy.tsx');
  assert.match(academy,/go_academy_15_v1/);
  assert.match(academy,/go_academy_50_v1/);
  assert.match(academy,/localStorage\.getItem\(legacyStorageKey\(name\)\)/);
  assert.match(academy,/id <= GO_LESSONS\.length/);
});
test('the board demonstrates methods without an active game, with accessible replay controls',()=>{
  const methods=src('client/src/methodology/Methodology.tsx');
  assert.match(methods,/mode="readonly"/);
  assert.match(methods,/methodBoardAt\(method,ply\)/);
  assert.match(methods,/methodToSgf\(method\)/);
  assert.match(methods,/setPly\(p=>Math\.max\(0,p-1\)\)/);
  assert.match(methods,/setPly\(p=>Math\.min\(method\.steps\.length,p\+1\)\)/);
});

test('algorithm lab opens independently, preserves existing modules, and receives side toggle',()=>{
  const app=src('client/src/App.tsx');
  const lab=src('client/src/algorithm/AlgorithmLab.tsx');
  const board=src('client/src/components/GoBoard.tsx');
  assert.match(app,/import AlgorithmLab from '\.\/algorithm\/AlgorithmLab'/);
  assert.match(app,/if \(algorithmOpen\)/);
  assert.match(app,/teacherSide=\{teacherSide\} onChangeTeacherSide=\{setTeacherSide\}/);
  assert.match(app,/setAlgorithmOpen\(true\)/);
  assert.match(app,/setAcademyOpen\(true\)/);
  assert.match(app,/setMethodologyOpen\(true\)/);
  assert.match(lab,/traceAlgorithm\(game\.board,game\.size,2,game\.history,game\.aiDifficulty,game\.moveNumber\)/);
  assert.match(lab,/algorithmScores=\{heatmap\}/);
  assert.match(lab,/AI 上一步/);
  assert.match(board,/algorithmScores/);
});
