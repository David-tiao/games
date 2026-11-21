import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEVELS, maxMines, validateMineCount, generateMinePositions, neighborsOf } from '../hub/learning/assets/mine-config.js';

test('原三个难度和默认雷数保持不变',()=>{
  assert.deepEqual(Object.fromEntries(Object.entries(LEVELS).map(([k,v])=>[k,v.mines])),{easy:10,medium:40,hard:99});
  assert.equal(maxMines(9,9),72);
  assert.equal(maxMines(16,16),247);
  assert.equal(maxMines(16,30),471);
});

test('每个难度允许合法的整数雷数并拒绝无效值',()=>{
  for(const cfg of Object.values(LEVELS)){
    const max=maxMines(cfg.rows,cfg.cols);
    for(const n of [1,2,cfg.mines,max])assert.equal(validateMineCount(n,cfg.rows,cfg.cols).ok,true,String(n));
    for(const n of [0,-1,NaN,1.1,'','abc',max+1,'12.5'])assert.equal(validateMineCount(n,cfg.rows,cfg.cols).ok,false,String(n));
  }
});

test('精确埋下自定义数量的雷，不重复，首击及周围安全',()=>{
  for(const cfg of Object.values(LEVELS)){
    for(const count of [1,cfg.mines,maxMines(cfg.rows,cfg.cols)]){
      for(const first of [0,Math.floor(cfg.rows/2)*cfg.cols+Math.floor(cfg.cols/2),cfg.rows*cfg.cols-1]){
        const mines=generateMinePositions(cfg.rows,cfg.cols,count,first,()=>0.321);
        assert.equal(mines.length,count);
        assert.equal(new Set(mines).size,count);
        const safe=new Set([first,...neighborsOf(first,cfg.rows,cfg.cols)]);
        assert.ok(mines.every(i=>!safe.has(i)),`first click ${first} count ${count}`);
      }
    }
  }
});

test('无法用非法雷数或非法首击生成雷区',()=>{
  assert.throws(()=>generateMinePositions(9,9,73,40),RangeError);
  assert.throws(()=>generateMinePositions(9,9,1,81),RangeError);
  assert.throws(()=>generateMinePositions(9,9,1,-1),RangeError);
});

test('扫雷全屏界面包含可键入雷数的控件、应用按钮和独立本地偏好',()=>{
  const html=fs.readFileSync(new URL('../hub/learning/mines.html',import.meta.url),'utf8');
  for(const v of ['id="mine-count"','id="mine-range"','id="apply-mines"','function applyCustomMines()','game-universe-mines-counts-v1','generateMinePositions','function sizeMineBoard()'])assert.ok(html.includes(v),v);
  assert.match(html,/root\.querySelector\('#apply-mines'\)\.addEventListener\('click',applyCustomMines\)/);
});
