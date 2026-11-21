import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>fs.readFileSync(path.join(project,p),'utf8');
test('full viewport host offers a real user-triggered fullscreen control',()=>{
  const html=file('hub/public/index.html');
  const css=file('hub/public/assets/style.css');
  const js=file('hub/public/assets/main.js');
  assert.match(html,/id="fullscreen"/);
  assert.match(js,/requestFullscreen\?\.\(\)/);
  assert.match(js,/document\.fullscreenElement/);
  assert.match(css,/body\.in-game \.shell\{[^}]*max-width:none/);
  assert.match(css,/body\.in-game \.frameShell\{[^}]*inset:0/);
});
test('star field uses collapsible course and lab drawers and responsive square board',()=>{
  const html=file('apps/star-array/client/index.html');
  const css=file('apps/star-array/client/style.css');
  const js=file('apps/star-array/client/app.js');
  for(const id of ['levelsToggle','labToggle','levelsClose','labClose','drawerShade'])assert.ok(html.includes(`id="${id}"`));
  assert.match(js,/function closeDrawers\(\)/);
  assert.match(js,/function showDrawer\(which\)/);
  assert.match(css,/\.board\{width:min\(92vw,calc\(100dvh - 355px\)/);
  assert.match(css,/\.left-sidebar\.panel-open/);
});
test('minesweeper preserves the original game and exposes a collapsible logic assistant',()=>{
  const html=file('hub/learning/mines.html');
  for(const phrase of ['id="mine-lab-open"','id="mine-lab-close"','function sizeMineBoard()','const mineLabPanel','boardEl.addEventListener'])assert.ok(html.includes(phrase));
});
