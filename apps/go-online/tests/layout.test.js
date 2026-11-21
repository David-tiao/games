import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../client/src/styles.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
const academy = fs.readFileSync(new URL('../client/src/academy/Academy.tsx', import.meta.url), 'utf8');

test('desktop layout keeps the lesson teacher beside its board', () => {
  assert.match(css, /@media\s*\(min-width:1050px\)/);
  assert.match(css, /\.academy-teacher\s*\{grid-column:3;grid-row:1;position:sticky/);
  assert.match(css, /\.academy-workbench\s*\{grid-column:2;grid-row:1/);
});

test('medium width retains board and teacher columns, with horizontal lesson index', () => {
  assert.match(css, /@media\s*\(min-width:760px\) and \(max-width:1049px\)/);
  assert.match(css, /\.academy-syllabus\s*\{grid-column:1\/-1;grid-row:1/);
  assert.match(css, /\.academy-teacher\s*\{grid-column:2;grid-row:2;position:sticky/);
});

test('narrow screens offer a dismissible lesson and free-play teacher drawer', () => {
  assert.match(css, /@media\s*\(max-width:759px\)/);
  assert.match(css, /\.academy-teacher\.mobile-teacher-open,\.coach-sidebar\.mobile-teacher-open/);
  assert.match(app, /className="teacher-fab"/);
  assert.match(academy, /className="teacher-fab"/);
  assert.match(app, /onClick=\{\(\)\s*=>\s*setMobileTeacherOpen\(false\)\}/);
  assert.match(academy, /onClick=\{\(\)\s*=>\s*setMobileTeacherOpen\(false\)\}/);
});
