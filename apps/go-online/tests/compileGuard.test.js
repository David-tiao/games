import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
test('methodology list uses no unused callback index parameter', () => {
  const source=read('client/src/methodology/Methodology.tsx');
  assert.doesNotMatch(source, /displayed\.map\(\(m,i\)=>/);
  assert.match(source, /displayed\.map\(\(m\)=>/);
});
test('algorithm lab remains connected to home screen with correct props', () => {
  const app=read('client/src/App.tsx');
  assert.match(app, /return <AlgorithmLab onExit=\{\(\)=>setAlgorithmOpen\(false\)\} teacherSide=\{teacherSide\} onChangeTeacherSide=\{setTeacherSide\}\/>/);
});
