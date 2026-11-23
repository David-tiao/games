import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const vendor='apps/kitchen-chaos/vendor/taste-from-another-place/';

test('upstream MIT copyright text is bundled unchanged',()=>{
 const license=read(vendor+'LICENSE');
 assert.match(license,/MIT License/);
 assert.match(license,/Copyright \(c\) 2026 Art3mis/);
 assert.match(license,/THE SOFTWARE IS PROVIDED "AS IS"/);
});
test('existing raylib C++ gameplay is imported, not a fake reimplementation',()=>{
 for(const p of ['src/main.cpp','src/kitchen.cpp','src/player.cpp','src/orders.cpp',
  'src/inventory.cpp','src/customer.cpp','src/station.cpp','src/cutting_minigame.cpp',
  'src/drink_minigame.cpp','src/audio.cpp','Makefile','shell.html','README.md']){
  assert.ok(fs.statSync(path.join(root,vendor,p)).size>80,p);
 }
});
test('pin and upstream attribution are explicit',()=>{
 const doc=read('apps/kitchen-chaos/README.md');
 assert.match(doc,/mikegiannako\/taste-from-another-place/);
 assert.match(doc,/b1f262c951ce57a5af252b059557c0db0a6ef839/);
 assert.match(doc,/single-player/);
 assert.match(doc,/MIT/);
});
test('asset downloader verifies exact source revision and never rewrites rules',()=>{
 const s=read('scripts/build-kitchen-open-source.sh');
 assert.match(s,/git -C "\$TEMP" fetch --depth 1 origin "\$PIN"/);
 assert.match(s,/ACTUAL.*PIN/);
 assert.match(s,/make -C "\$UP" build-web/);
 assert.match(s,/EMCC=/);
 assert.match(s,/raylib/);
 const check=spawnSync('bash',['-n',path.join(root,'scripts/build-kitchen-open-source.sh')]);
 assert.equal(check.status,0,check.stderr?.toString());
});
test('binary assets and native toolchain cache are intentionally untracked',()=>{
 const ignore=read('apps/kitchen-chaos/.gitignore');
 assert.match(ignore,/vendor\/taste-from-another-place\/assets\//);
 assert.match(ignore,/obj-web\//);
 assert.match(ignore,/\.cache\//);
});
test('gateway only opens the real WebAssembly build or truthful setup page',()=>{
 const server=read('hub/server.mjs');
 assert.match(server,/p==='\/play\/kitchen'/);
 assert.match(server,/existsSync\(path\.join\(kitchenWeb,'index\.html'\)\)/);
 assert.match(server,/\/setup\.html/);
 assert.match(server,/\.wasm':'application\/wasm'/);
 assert.match(server,/p\.startsWith\('\/play\/kitchen\/'\)/);
});
test('lobby has six playable cards plus an accurately labelled seventh preview',()=>{
 const html=read('hub/public/index.html'),js=read('hub/public/assets/main.js');
 assert.equal((html.match(/class="gamecard /g)||[]).length,7);
 assert.match(html,/07 \/ PREVIEW/);
 assert.match(html,/MIT 原版源码 · 需先构建/);
 assert.match(js,/kitchen:\{play:'\/play\/kitchen\/'/);
});
test('design documentation and source integration are clearly distinguished',()=>{
 const doc=read('apps/kitchen-chaos/README.md');
 assert.match(doc,/WebAssembly and assets need building/);
 assert.match(doc,/not a reimplementation/);
 assert.match(read('apps/kitchen-chaos/setup.html'),/尚未构建/);
});
