const map={go:{play:'/play/go/',learn:'/play/go/',title:{zh:'围棋学堂',en:'Go Academy'},detail:'GO / 01'},gomoku:{play:'/play/gomoku/',learn:'/learn/gomoku/',title:{zh:'五子棋',en:'Gomoku'},detail:'GOMOKU / 02'},star:{play:'/play/star/',learn:'/play/star/',title:{zh:'星阵：共振计划',en:'Star Array'},detail:'STAR / 03'},mines:{play:'/play/mines/',learn:'/learn/mines/',title:{zh:'扫雷实验室',en:'Minesweeper'},detail:'MINES / 04'},balls:{play:'/play/balls/',learn:'/learn/balls/',title:{zh:'混沌光轨实验室',en:'Neon Ball Lab'},detail:'BALLS / 05'},basketball:{play:'/play/basketball/',learn:'/play/basketball/?panel=academy',title:{zh:'篮球：全场掌控',en:'Court Master Basketball'},detail:'BASKET / 06'}};
const qs=id=>document.getElementById(id);
const saved=()=>{try{return JSON.parse(localStorage.getItem('hub.preferences')||'{}')}catch{return {}}};
let prefs=saved(),lang=prefs.lang==='en'?'en':'zh',theme=prefs.theme==='light'?'light':'dark',current=null,view='play';
function translate(){document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-zh][data-en]').forEach(el=>el.innerHTML=el.dataset[lang]);qs('lang').textContent=lang==='zh'?'中文 / EN':'EN / 中文';document.body.classList.toggle('light',theme==='light');if(current)qs('currentGame').textContent=map[current].title[lang];if(typeof updateFs==='function')updateFs();try{localStorage.setItem('hub.preferences',JSON.stringify({lang,theme}))}catch{}}
function showHome(){current=null;qs('home').hidden=false;qs('player').hidden=true;document.body.classList.remove('in-game','balls-mode');qs('playerBar').classList.remove('expanded');qs('frame').src='about:blank';history.replaceState({},'',location.pathname);}
function openGame(game,mode='play'){if(!map[game])return showHome();current=game;view=mode==='learn'?'learn':'play';qs('home').hidden=true;qs('player').hidden=false;document.body.classList.add('in-game');document.body.classList.toggle('balls-mode',game==='balls');qs('playerBar').classList.remove('expanded');qs('currentGame').textContent=map[game].title[lang];qs('currentDetail').textContent=map[game].detail;qs('playBtn').classList.toggle('selected',view==='play');qs('learnBtn').classList.toggle('selected',view==='learn');qs('frameLoading').hidden=false;const link=map[game][view];if(qs('frame').getAttribute('src')!==link)qs('frame').src=link;else qs('frameLoading').hidden=true;history.replaceState({},'',`/?game=${game}&view=${view}`);}
qs('playerMenu').onclick=()=>{const show=qs('playerBar').classList.toggle('expanded');qs('playerMenu').setAttribute('aria-expanded',String(show));};
qs('brand').onclick=showHome;qs('back').onclick=showHome;
qs('lang').onclick=()=>{lang=lang==='zh'?'en':'zh';translate()};
qs('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';translate()};
document.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{openGame(button.dataset.game,button.dataset.view);if(button.dataset.view==='play')tryEnterFullscreen();});
qs('playBtn').onclick=()=>{openGame(current,'play');tryEnterFullscreen();};qs('learnBtn').onclick=()=>openGame(current,'learn');qs('reload').onclick=()=>{qs('frameLoading').hidden=false;qs('frame').src=map[current][view]+'?reload='+Date.now()};
// Browser fullscreen is deliberately opt-in: browsers require a real user gesture.
const fsButton=qs('fullscreen');
function updateFs(){const on=!!document.fullscreenElement;fsButton.textContent=on?(lang==='zh'?'⤢ 退出全屏':'⤢ Exit Fullscreen'):(lang==='zh'?'⛶ 全屏':'⛶ Fullscreen');fsButton.setAttribute('aria-pressed',String(on));}
function tryEnterFullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});}
function toggleFullscreen(){if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});}else{document.documentElement.requestFullscreen?.().catch(()=>{fsButton.title=lang==='zh'?'浏览器阻止全屏，请尝试 F11':'Fullscreen blocked; try F11';});}}
fsButton.onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',updateFs);
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)&&current){e.preventDefault();toggleFullscreen();}});
qs('frame').onload=()=>{qs('frameLoading').hidden=true};translate();updateFs();
const params=new URLSearchParams(location.search);if(map[params.get('game')])openGame(params.get('game'),params.get('view'));else showHome();
fetch('/api/services').then(r=>r.json()).then(s=>{const n=Object.values(s).filter(Boolean).length;qs('serverText').textContent=`SERVICES ${n}/3`}).catch(()=>{qs('serverText').textContent='SERVER CHECK UNAVAILABLE'});
