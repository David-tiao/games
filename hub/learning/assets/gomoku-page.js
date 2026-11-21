import {SIZE,emptyBoard,hasFive,candidates,selectAI,LESSONS,notation} from './gomoku-ai.js';
const $=id=>document.getElementById(id);
const KEY='hub.gomoku.learn.v1',TTL=168*3600*1000;
let lang='zh',lesson=0,board=emptyBoard(),history=[],moves=0,finished=false,hint=null,message='',lastAI=null,learned={};
const text=(zh,en)=>lang==='zh'?zh:en;
function store(){try{localStorage.setItem(KEY,JSON.stringify({updatedAt:Date.now(),learned}))}catch{}}
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&Date.now()-s.updatedAt<TTL)learned=s.learned||{}}catch{}
function setup(n){lesson=n;board=emptyBoard();history=[];moves=0;finished=false;hint=null;lastAI=null;message='';for(const [r,c,color] of LESSONS[n][4])board[r*SIZE+c]=color;render();}
function render(){
  $('title').textContent=text('五子棋 · 人机与算法学院','Gomoku · AI Academy');$('subtitle').textContent=text('真实运行的启发式 AI · 你执黑，电脑执白','Real heuristic AI · You are black, AI is white');
  $('lessonHeading').textContent=text('系统课程 · 12 节','Twelve Strategy Lessons');$('labHeading').textContent=text('AI 算法实验室','Algorithm Laboratory');$('formulaDesc').textContent=text('A 攻击分 + 0.94 × D 防守分 + P 位置分。数值不是胜率。','Attack + 0.94 × Defense + Position. These numbers are NOT win probabilities.');
  $('topMoves').textContent=text('候选落点评分','Ranked Candidate Moves');$('lastHeading').textContent=text('AI 决策依据','AI Decision Trace');$('limitNote').textContent=text('这是入门教学的规则型启发式 AI，不能保证全局最优。','Rule-based teaching AI, not proven optimal.');
  $('resetBtn').textContent=text('↻ 重开练习','↻ Reset');$('undoBtn').textContent=text('↶ 撤销一回合','↶ Undo round');$('newBtn').textContent=text('↻ 重新开始','↻ New board');$('hintBtn').textContent=text('✧ 推荐一手','✧ Hint');$('aiBtn').textContent=text('◈ AI 代走一步','◈ Auto-play');
  $('trainingNote').textContent=text('课程场景仅用于教学，不代表真实对局已经合法轮流形成。','Lesson setups are teaching positions, not a legal game history.');
  $('courseList').replaceChildren(...LESSONS.map((l,i)=>{const b=document.createElement('button');b.className='lesson'+(i===lesson?' active':'');b.textContent=`${String(i+1).padStart(2,'0')} · ${l[lang==='zh'?0:1]}${learned[i]?' ✦':''}`;b.onclick=()=>setup(i);return b}));
  $('chapter').textContent=`LESSON ${String(lesson+1).padStart(2,'0')} / 12`;
  $('lessonTitle').textContent=LESSONS[lesson][lang==='zh'?0:1];$('lessonText').textContent=LESSONS[lesson][lang==='zh'?2:3];
  $('status').textContent=message||text('你执黑棋 · 轮到你落子','You play black · Your turn');$('moveCount').textContent=text(`${moves} 手`,`Moves: ${moves}`);
  $('undoBtn').disabled=history.length===0;
  const cells=document.createDocumentFragment();for(let i=0;i<board.length;i++){
    const b=document.createElement('button');b.type='button';b.className='intersection'+(hint===i?' hint':'');b.title=notation(i);b.setAttribute('aria-label',`${notation(i)} ${board[i]===1?'black':board[i]===2?'white':'empty'}`);if(board[i]){const s=document.createElement('span');s.className=board[i]===1?'stone black':'stone white';b.append(s);}b.onclick=()=>move(i);cells.append(b);
  }$('gomokuBoard').replaceChildren(cells);
  const ranked=candidates(board,1).slice(0,6);$('candidates').replaceChildren(...ranked.map((m,i)=>{const div=document.createElement('div');div.className='candidate'+(m.index===hint?' spotlight':'');const span=document.createElement('span');span.textContent=`${i+1}. ${notation(m.index)}`;const strong=document.createElement('strong');strong.textContent=Math.round(m.score).toLocaleString();div.append(span,strong);return div}));
  $('explanation').textContent=lastAI?text(`电脑选择 ${notation(lastAI.index)}，综合分 ${Math.round(lastAI.score)}；自身棋形 ${lastAI.attack.score}，阻挡你 ${lastAI.defend.score}。`,`AI selected ${notation(lastAI.index)}: total ${Math.round(lastAI.score)}, attack ${lastAI.attack.score}, defense ${lastAI.defend.score}.`):text('候选列表由当前棋盘实时计算，数字越大表示启发式算法越优先考虑。','Candidate scores are computed from the live board; higher means preferred by the heuristic.');
}
function move(index){if(finished||board[index])return;history.push({board:board.slice(),moves,finished,message,lastAI});board[index]=1;moves++;hint=null;
  if(hasFive(board,index,1)){finished=true;learned[lesson]=true;store();message=text('🎉 你完成了五连！','🎉 Five in a row!');return render();}
  const ai=selectAI(board,2);
  if(ai){board[ai.index]=2;lastAI=ai;moves++;if(hasFive(board,ai.index,2)){finished=true;message=text('电脑连成五子。本回合结束。','AI got five in a row.');}else message=text(`电脑下在 ${notation(ai.index)}，继续思考！`,`AI played ${notation(ai.index)}.`);}else{finished=true;message=text('棋盘已满','Board full');}
  render();
}
$('undoBtn').onclick=()=>{if(!history.length)return;const prev=history.pop();({board,moves,finished,message,lastAI}=prev);hint=null;render()};
$('resetBtn').onclick=$('newBtn').onclick=()=>setup(lesson);
$('hintBtn').onclick=()=>{const best=selectAI(board,1);if(!best)return;hint=best.index;message=text(`建议你考虑 ${notation(best.index)}，分数 ${Math.round(best.score)}。`,`Try ${notation(best.index)}; score ${Math.round(best.score)}.`);render()};
$('aiBtn').onclick=()=>{const best=selectAI(board,1);if(best)move(best.index)};
$('langBtn').onclick=()=>{lang=lang==='zh'?'en':'zh';render()};setup(0);
