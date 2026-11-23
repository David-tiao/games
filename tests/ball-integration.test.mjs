import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');

test('seven playable worlds include an independent kitchen game',()=>{
  const html=file('hub/public/index.html');
  const js=file('hub/public/assets/main.js');
  const css=file('hub/public/assets/style.css');
  for(const id of ['go','gomoku','star','mines','balls','basketball','kitchen'])assert.match(js,new RegExp(`${id}:\\{play:`));
  assert.match(html,/data-game="balls" data-view="play"/);
  assert.match(html,/data-game="balls" data-view="learn"/);
  assert.match(html,/七个世界/);
  assert.match(html,/07 <small/);
  assert.match(html,/data-game="basketball" data-view="play"/);
  assert.match(html,/data-game="basketball" data-view="learn"/);
  assert.equal((html.match(/class="gamecard /g)||[]).length,7);
  assert.match(html,/07 \/ PLAY/);
  assert.match(html,/原创小游戏 · 单人 \/ 同屏双人/);
  assert.match(html,/data-game="kitchen" data-view="play"/);
  assert.match(css,/body\.in-game \.frameShell\{[^}]*inset:0/);
  assert.match(css,/\.balls \.cardArt/);
});

test('the original V4.1 math, motion and MOT sources are preserved',()=>{
  const html=file('apps/neon-ball-lab/index.html');
  for(const item of ['toggleTracking','sendVisualFrame','pendingRequest','motTraces','collision','mainCanvas'])
    assert.ok(html.includes(item),`${item} absent`);
  assert.match(html,/location\.pathname\.startsWith\('\/play\/balls'\)/);
  assert.match(html,/X-Tracking-Session/);
  assert.ok(file('apps/neon-ball-lab/mot_core.py').includes('linear_sum_assignment'));
  assert.ok(file('apps/neon-ball-lab/tracker.py').includes('AccelerationKalman'));
  assert.ok(fs.existsSync(path.join(root,'apps/neon-ball-lab/train_yolo.py')));
});

test('neon ball page and 10-lesson academy scripts parse',()=>{
  for(const target of ['apps/neon-ball-lab/index.html','hub/learning/balls.html']){
    const html=file(target);
    const blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length>0,`${target} lacks scripts`);
    for(const [,source] of blocks)new vm.Script(source,{filename:target});
  }
  const academy=file('hub/learning/balls.html');
  assert.equal((academy.match(/\{zh:\[/g)||[]).length,10);
  for(const concept of ['匈牙利','卡尔曼','YOLO','α–β','MOT','碰撞'])assert.ok(academy.includes(concept),concept);
});

test('same-origin Python proxy is isolated to two controlled routes',()=>{
  const server=file('hub/server.mjs');
  assert.match(server,/p==='\/play\/balls\/frame'/);
  assert.match(server,/p==='\/play\/balls\/health'/);
  assert.match(server,/['"]127\.0\.0\.1['"]/);
  assert.match(server,/startBallTracker\(\)/);
  assert.match(server,/\/learn\/balls/);
  assert.match(server,/\/play\/balls/);
  assert.match(server,/BALL_PYTHON/);
  assert.match(server,/BALL_TRACKING_MODE/);
});
