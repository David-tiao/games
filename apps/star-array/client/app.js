import { LEVELS, newPuzzle } from '../shared/levels.js';
import { solve, togglePoint, influenceRows, moveIndices } from '../shared/math.js';
const $ = id => document.getElementById(id);
const dict = {
  zh: {name:'星阵<span>·</span>共振计划',prototype:'V0.1 · 核心原型',settings:'⚙ 设置',expedition:'EXPEDITION / 星域探索',explore:'探索未知星阵',intro:'控制脉冲，研究共振。用最少的步骤让所有星体安静下来。',chapterList:'航行日志 · 十二星域',freeOrbit:'自由星域',freeOrbitSub:'随机生成 · 保证有解',offline:'本地可玩 · 无需账号',sector:'SECTOR / 星域编号',missionDesc:'所有星体恢复休眠状态，即可完成此次共振。',mission:'MISSION',synchronizing:'STARFIELD ONLINE',moves:'已用脉冲',starsLeft:'活跃星体',best:'理论最少',undo:'撤销',redo:'重做',reset:'重置',hint:'提示一手',mathNote:'同一点点击两次会抵消。点击顺序不影响最终结果。',lab:'数学实验室',matrixTab:'矩阵视图',tutorEyebrow:'YOUR MATHEMATICAL GUIDE',tutor:'共振研究员',equation:'核心方程',formulaDesc:'A 是共振关系，x 是点击方案，b 是当前星体状态。',rank:'矩阵秩',nullity:'零空间维数',solutions:'潜在解数量',optimal:'最优性',algorithm:'算法决策过程',live:'LIVE ANALYSIS',step1:'读取二进制棋盘',step2:'建立影响矩阵',step3:'GF(2) 高斯消元',step4:'搜索最短点击方案',showSolution:'查看一组解法',hideSolution:'收起解法',matrixTitle:'共振矩阵',matrixDesc:'每行对应受影响的星体，每列对应一次点击，1 表示会翻转。大棋盘可以横向滚动。',elimination:'行消元记录',teacherFooter:'数学不是奖励，而是这个宇宙的运行规则。',footer:'单人核心原型 · 十人协作将在后续版本加入',openLab:'∑ 数学老师',closeLab:'✕ 收起老师',settingsTitle:'游戏设置',language:'语言 / Language',theme:'主题',spaceTheme:'深空蓝',violetTheme:'星云紫',panelSide:'数学面板位置（电脑端）',right:'右边',left:'左边',motion:'动画效果',fullMotion:'开启',reducedMotion:'减少',settingsNote:'设置会保存在当前浏览器。V0.1 尚未包含账号及联网协作。',stabilized:'RESONANCE STABILIZED',victory:'星阵重归寂静',next:'下一星域 →',stay:'继续研究当前星域',proven:'已证明最优',feasible:'仅可行解',unsolvable:'无解',rankDesc:'当前局面满足 GF(2) 方程组。',steps:'步',click:'点击',solved:'已解决',challenge:'挑战中',random:'自由星域',hintDetail:'提示：建议点击 {point}。该建议由 GF(2) 求解器实际算出。',tutorial:'观察脉冲：点击一个星体时，它与上下左右的星体都会翻转。这就是模 2 加法。',progress:'完成',winDesc:'你使用了 {moves} 次脉冲，数学最优为 {optimal} 次。',winDescUnproven:'你使用了 {moves} 次脉冲。算法找到了可行方案，但未证明最优。',swaps:'换行',xors:'异或行运算',basis:'解空间候选数',noTrace:'无需行变换',solutionSteps:'按顺序点击这些位置，即可让当前局面全部休眠。',resetConfirm:'重置后，当前操作会清零。',optimalYes:'严格最优',optimalNo:'可行解',noSolutions:'没有可行方案',nextLast:'重新开始',chapter:'章节'},
  en: {name:'STAR<span>·</span>ARRAY',prototype:'V0.1 · CORE PROTOTYPE',settings:'⚙ Settings',expedition:'EXPEDITION / MISSIONS',explore:'Explore the Unknown',intro:'Control pulses. Study resonance. Restore the starfield in as few moves as possible.',chapterList:'MISSION LOG · 12 SECTORS',freeOrbit:'Free Orbit',freeOrbitSub:'Random · always solvable',offline:'Local play · no account needed',sector:'SECTOR / MISSION',missionDesc:'Return every star to dormancy to stabilize the array.',mission:'MISSION',synchronizing:'STARFIELD ONLINE',moves:'Pulses used',starsLeft:'Active stars',best:'Minimum moves',undo:'Undo',redo:'Redo',reset:'Reset',hint:'Hint',mathNote:'Click twice to cancel a pulse. Order does not change the outcome.',lab:'Math Lab',matrixTab:'Matrix',tutorEyebrow:'YOUR MATHEMATICAL GUIDE',tutor:'Resonance Researcher',equation:'Core equation',formulaDesc:'A describes pulse influence; x is the click plan; b is the current state.',rank:'Matrix rank',nullity:'Nullity',solutions:'Possible solutions',optimal:'Optimality',algorithm:'Algorithm pipeline',live:'LIVE ANALYSIS',step1:'Encode binary board',step2:'Build influence matrix',step3:'GF(2) elimination',step4:'Find minimum-weight plan',showSolution:'Show a solution',hideSolution:'Hide solution',matrixTitle:'Influence matrix',matrixDesc:'Rows represent affected stars and columns represent clicks; 1 means toggled. Scroll horizontally for larger boards.',elimination:'Elimination trace',teacherFooter:'Mathematics is not a reward. It is how this universe works.',footer:'Single-player prototype · ten-player co-op is planned for a later release',openLab:'∑ Math Guide',closeLab:'✕ Close Guide',settingsTitle:'Preferences',language:'Language',theme:'Theme',spaceTheme:'Deep Space',violetTheme:'Violet Nebula',panelSide:'Math panel position (desktop)',right:'Right',left:'Left',motion:'Motion',fullMotion:'Full',reducedMotion:'Reduced',settingsNote:'Preferences persist in this browser. V0.1 does not yet include accounts or online co-op.',stabilized:'RESONANCE STABILIZED',victory:'The Stars Fall Silent',next:'Next Sector →',stay:'Stay and explore',proven:'Proven optimal',feasible:'Feasible only',unsolvable:'No solution',rankDesc:'This board is represented by equations over GF(2).',steps:'moves',click:'Click',solved:'Completed',challenge:'In progress',random:'Free Orbit',hintDetail:'Hint: try {point}. This recommendation comes from the actual GF(2) solver.',tutorial:'A pulse flips the clicked star and its four orthogonal neighbors. This is addition modulo two.',progress:'Completed',winDesc:'You used {moves} pulses. The proven minimum is {optimal}.',winDescUnproven:'You used {moves} pulses. A feasible solution exists, but optimality is not proved.',swaps:'row swaps',xors:'row XORs',basis:'solution candidates',noTrace:'No row operations needed',solutionSteps:'Click these points to turn every remaining star off.',resetConfirm:'Reset clears the current moves.',optimalYes:'Proven minimum',optimalNo:'Feasible solution',noSolutions:'No feasible solution',nextLast:'Play from start',chapter:'Chapter'}
};
const KEY='star-array-v01-progress', SETTINGS_KEY='star-array-v01-settings';
function read(key, fallback) {try {const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch{return fallback;}}
const settings = {...{lang:'zh',theme:'space',side:'right',motion:'full'},...read(SETTINGS_KEY,{})};
const progressSaved=read(KEY, null);
let progress = progressSaved?.expiresAt > Date.now() && progressSaved?.values && typeof progressSaved.values==='object'
  ? progressSaved.values : {};
let level = LEVELS[0], board=[...level.initial], past=[],future=[],moves=0, hint=-1, result=null, showSolution=false, activeTab='overview';
const locale=()=>dict[settings.lang];
const tr=k=>locale()[k]??k;
const coordinate=(index,size)=>`${'ABCDEFGHJKLMNOPQRSTUVWXYZ'[index%size]}${size-Math.floor(index/size)}`;
const store=(saveProgress=false)=>{try{if(saveProgress)localStorage.setItem(KEY,JSON.stringify({expiresAt:Date.now()+168*3600*1000,values:progress}));localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}};
function translate() {
  document.documentElement.lang = settings.lang==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const value=tr(el.dataset.i18n);if(['name'].includes(el.dataset.i18n))el.innerHTML=value;else el.textContent=value;
  });
  document.body.classList.toggle('theme-violet',settings.theme==='violet');
  $('layout').classList.toggle('side-left',settings.side==='left');
  document.body.classList.toggle('reduce-motion',settings.motion==='reduced');
  $('board').classList.toggle('reduced-motion',settings.motion==='reduced');
  $('langBtn').textContent=settings.lang==='zh'?'中 / EN':'EN / 中';$('levelsToggle').textContent=settings.lang==='zh'?'☰ 关卡':'☰ Levels';$('labToggle').textContent=settings.lang==='zh'?'∑ 算法':'∑ Lab';
  document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===settings.theme));
  document.querySelectorAll('[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===settings.side));
  document.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===settings.motion));
  $('zhBtn').classList.toggle('active',settings.lang==='zh');$('enBtn').classList.toggle('active',settings.lang==='en');
  renderLevels(); renderGame();
}
function renderLevels() {
  $('progressLabel').textContent=`${Object.keys(progress).filter(k=>Number(k)>=1&&Number(k)<=12).length} / 12`;
  $('levels').replaceChildren(...LEVELS.map((l,i)=>{
    const btn=document.createElement('button');btn.className='level-item'+(level.id===l.id?' current':'');
    btn.type='button';btn.setAttribute('aria-current',level.id===l.id?'step':'false');
    const number=document.createElement('span');number.className='level-num';number.textContent=String(i+1).padStart(2,'0');
    const info=document.createElement('span');info.className='level-info';
    const strong=document.createElement('strong');strong.textContent=settings.lang==='zh'?l.title:l.english;
    const sub=document.createElement('small');sub.textContent=`${l.size} × ${l.size} · ${settings.lang==='zh'?l.chapterZh:l.chapterEn}`;
    info.append(strong,sub);
    const status=document.createElement('span');status.className='level-status';status.textContent=progress[l.id]?'✦':'›';
    btn.append(number,info,status);btn.onclick=()=>selectLevel(l);return btn;
  }));
}
function selectLevel(l){level=l;board=[...l.initial];past=[];future=[];moves=0;hint=-1;showSolution=false;$('solutionDisplay').hidden=true;$('victory').hidden=true;result=null;renderLevels();renderGame();}
function createNode(i) {
  const btn=document.createElement('button');btn.type='button';btn.className='node'+(board[i]?' active':'')+(hint===i?' hinted':'');btn.setAttribute('aria-label',`${coordinate(i,level.size)} ${board[i]?'on':'off'}`);btn.title=coordinate(i,level.size);
  const core=document.createElement('span');core.className='node-core';btn.append(core);
  btn.onclick=()=>pulse(i);return btn;
}
function renderBoard(pulseIndex=-1) {
  const n=level.size, grid=$('board');grid.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`;
  const nodes=board.map((_,i)=>createNode(i));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${n*100} ${n*100}`);svg.setAttribute('class','board-lines');svg.setAttribute('preserveAspectRatio','none');
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const a=y*n+x;
    for(const b of [x<n-1?a+1:-1,y<n-1?a+n:-1]) {
      if(b<0)continue;
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',String((x+.5)*100));line.setAttribute('y1',String((y+.5)*100));
      line.setAttribute('x2',String(((b%n)+.5)*100));line.setAttribute('y2',String((Math.floor(b/n)+.5)*100));
      line.setAttribute('stroke','#6b9dc8');line.setAttribute('stroke-opacity','.26');line.setAttribute('stroke-width','1.5');svg.append(line);
    }
  }
  grid.replaceChildren(svg,...nodes);
  if(pulseIndex>=0&&settings.motion==='full')for(const i of moveIndices(n,pulseIndex))nodes[i].classList.add('pulsing');
}
function updateLab(){result=solve(board,level.size);$('rankValue').textContent=result.rank;$('nullityValue').textContent=result.nullity;$('solutionsValue').textContent=result.solvable?result.solutionCount:'0';$('optimalValue').textContent=result.minProven?tr('optimalYes'):tr('optimalNo');$('minCount').textContent=level.minClicks??(result.minProven?result.minClicks:'—');$('algoDetails').replaceChildren();
  const details=[`${tr('swaps')}: ${result.swaps}`,`${tr('xors')}: ${result.eliminations}`,`${tr('basis')}: ${result.candidateCount}`];
  details.forEach(v=>{const d=document.createElement('div');d.textContent=v;$('algoDetails').append(d);});
  $('tutorText').textContent=hint>=0?tr('hintDetail').replace('{point}',coordinate(hint,level.size)):
    (settings.lang==='zh'?`当前 ${board.filter(Boolean).length} 个节点活跃。${result.minProven?`算法已证明剩余局面的最少点击次数是 ${result.minClicks}。`:`已找到一组 ${result.minClicks} 步的方案。`}尝试分析哪几次脉冲可以相互抵消。`:
    `${board.filter(Boolean).length} active stars. ${result.minProven?`The solver proves ${result.minClicks} more clicks are sufficient and minimal.`:`A feasible plan uses ${result.minClicks} clicks.`} Look for pulses that cancel.`);
  renderSolution();if(activeTab==='matrix')renderMatrix();
}
function renderMatrix() {
  const n=level.size*level.size,mat=$('matrixView');mat.replaceChildren();const grid=document.createElement('div');grid.className='matrix-cells';grid.style.gridTemplateColumns=`repeat(${n},16px)`;
  const rows=influenceRows(level.size);for(const row of rows)for(let col=0;col<n;col++){
    const on=Number((row>>BigInt(col))&1n);const cell=document.createElement('span');cell.className='matrix-cell'+(on?' one':'');cell.textContent=String(on);grid.append(cell);
  }mat.append(grid);
  const list=$('traceList');list.replaceChildren();const operations=result.trace.slice(0,35);if(!operations.length){const e=document.createElement('div');e.className='trace-line';e.textContent=tr('noTrace');list.append(e);}
  for(const op of operations){const e=document.createElement('div');e.className='trace-line';e.textContent=op.type==='swap'?`R${op.a+1} ↔ R${op.b+1}`:`R${op.a+1} ← R${op.a+1} ⊕ R${op.b+1}`;list.append(e);}
}
function renderSolution() {
  $('solutionBtn').textContent=showSolution?tr('hideSolution'):tr('showSolution');$('solutionDisplay').hidden=!showSolution;
  if(showSolution){const txt=tr('solutionSteps');const positions=result.clicks.map(i=>coordinate(i,level.size)).join(' · ');$('solutionDisplay').textContent=`${txt}\n${positions||'∅'}\n${result.minProven?tr('optimalYes'):tr('optimalNo')}`;}
}
function renderGame(pulseIndex=-1) {
  $('missionIndex').textContent=level.id==='random'?'∞ / ∞':`${String(level.id).padStart(2,'0')} / 12`;
  $('missionTitle').textContent=settings.lang==='zh'?level.title:level.english;
  $('boardState').textContent=board.every(x=>!x)?'RESONANCE STABILIZED':'STARFIELD ONLINE';
  $('boardState').style.color=board.every(x=>!x)?'var(--gold)':'';
  $('sizeTag').textContent=`${level.size} × ${level.size}`;
  $('moveCount').textContent=String(moves);$('activeCount').textContent=String(board.filter(Boolean).length);
  $('undoBtn').disabled=past.length===0;$('redoBtn').disabled=future.length===0;
  renderBoard(pulseIndex);updateLab();
}
function pulse(index){if(board.every(v=>!v))return;past.push({board:[...board],moves});future=[];board=togglePoint(board,level.size,index);moves++;hint=-1;showSolution=false;$('solutionDisplay').hidden=true;renderGame(index);
  if(board.every(v=>!v))win();
}
function undo(){if(!past.length)return;future.push({board:[...board],moves});const prev=past.pop();board=prev.board;moves=prev.moves;hint=-1;$('victory').hidden=true;renderGame();}
function redo(){if(!future.length)return;past.push({board:[...board],moves});const next=future.pop();board=next.board;moves=next.moves;hint=-1;renderGame();if(board.every(v=>!v))win();}
function win(){if(level.id!=='random'){
    const best=progress[level.id];if(best===undefined||moves<best)progress[level.id]=moves;store(true);renderLevels();}
  const optimal=level.minClicks;
  $('victorySub').textContent=optimal!==null?tr('winDesc').replace('{moves}',moves).replace('{optimal}',optimal):tr('winDescUnproven').replace('{moves}',moves);
  $('victoryStars').textContent=optimal!==null&&moves===optimal?'✦ ✦ ✦':(optimal!==null&&moves<=optimal+2?'✦ ✦ ☆':'✦ ☆ ☆');
  $('victory').hidden=false;
  $('nextBtn').textContent=level.id===12||level.id==='random'?tr('nextLast'):tr('next');
}
function hintMove(){if(!result.solvable||!result.clicks.length)return;hint=result.clicks[0];renderBoard();$('tutorText').textContent=tr('hintDetail').replace('{point}',coordinate(hint,level.size));}
function toggleSettings(open){$('modalBackdrop').hidden=!open;}
function setLanguage(lang){settings.lang=lang;store();translate();}
function changeSettings(name,value){settings[name]=value;store();translate();}
function showTab(tab){activeTab=tab;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('overviewTab').hidden=tab!=='overview';$('matrixTab').hidden=tab!=='matrix';if(tab==='matrix')renderMatrix();}
$('langBtn').onclick=()=>setLanguage(settings.lang==='zh'?'en':'zh');$('zhBtn').onclick=()=>setLanguage('zh');$('enBtn').onclick=()=>setLanguage('en');
$('settingsBtn').onclick=()=>toggleSettings(true);$('closeSettings').onclick=()=>toggleSettings(false);$('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))toggleSettings(false);};
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>changeSettings('theme',b.dataset.theme));
document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>changeSettings('side',b.dataset.side));
document.querySelectorAll('[data-motion]').forEach(b=>b.onclick=()=>changeSettings('motion',b.dataset.motion));
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('resetBtn').onclick=()=>selectLevel(level);$('hintBtn').onclick=hintMove;
$('solutionBtn').onclick=()=>{showSolution=!showSolution;renderSolution();};
$('randomBtn').onclick=()=>{const size=level.size;selectLevel(newPuzzle(size));};
$('nextBtn').onclick=()=>{if(level.id==='random'||level.id===12)selectLevel(LEVELS[0]);else selectLevel(LEVELS[level.id]);};
$('victoryClose').onclick=()=>{$('victory').hidden=true;};
function closeDrawers(){
  $('levelsPane').classList.remove('panel-open');$('analysisPane').classList.remove('lab-open');
  $('drawerShade').hidden=true;$('levelsToggle').setAttribute('aria-expanded','false');$('labToggle').setAttribute('aria-expanded','false');
}
function showDrawer(which){const id=which==='levels'?'levelsPane':'analysisPane', cls=which==='levels'?'panel-open':'lab-open';
  const willOpen=!$(id).classList.contains(cls);closeDrawers();if(willOpen){$(id).classList.add(cls);$('drawerShade').hidden=false;$(which==='levels'?'levelsToggle':'labToggle').setAttribute('aria-expanded','true');}
}
$('levelsToggle').onclick=()=>showDrawer('levels');$('labToggle').onclick=()=>showDrawer('lab');
$('levelsClose').onclick=closeDrawers;$('labClose').onclick=closeDrawers;$('drawerShade').onclick=closeDrawers;
$('mobileLabBtn').onclick=()=>showDrawer('lab');
document.querySelector('#levels').addEventListener('click',e=>{if(e.target.closest('.level-item'))closeDrawers();});
$('randomBtn').addEventListener('click',closeDrawers);

document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('victory').hidden=true;toggleSettings(false);closeDrawers();}if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();undo();}if(e.key.toLowerCase()==='y'){e.preventDefault();redo();}}});
translate();
