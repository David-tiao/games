import {useEffect,useMemo,useState} from 'react';
import GoBoard from '../components/GoBoard';
import {useLanguage} from '../i18n';
import {GO_METHODS,methodBoardAt,methodToSgf} from '../../../shared/goMethodology.js';

interface Props {onExit:()=>void;teacherSide:'left'|'right';onChangeTeacherSide:(side:'left'|'right')=>void}
export default function Methodology({onExit,teacherSide,onChangeTeacherSide}:Props){
  const {lang,setLang}=useLanguage();
  const en=lang==='en';
  const [methodId,setMethodId]=useState(GO_METHODS[0].id);
  const [ply,setPly]=useState(0);
  const [auto,setAuto]=useState(false);
  const [category,setCategory]=useState('all');
  const [copyStatus,setCopyStatus]=useState('');
  const method=GO_METHODS.find(m=>m.id===methodId)??GO_METHODS[0];
  const board=useMemo(()=>methodBoardAt(method,ply),[method,ply]);
  const categories=useMemo(()=>[...new Set(GO_METHODS.map(m=>m.category))],[]);
  const displayed=category==='all'?GO_METHODS:GO_METHODS.filter(m=>m.category===category);
  const currentStep=ply>0?method.steps[ply-1]:null;
  const progress=(ply/method.steps.length)*100;
  useEffect(()=>{
    if(!auto)return;
    if(ply>=method.steps.length){setAuto(false);return}
    const timer=setTimeout(()=>setPly(old=>Math.min(method.steps.length,old+1)),1350);
    return ()=>clearTimeout(timer);
  },[auto,ply,method.steps.length]);
  useEffect(()=>{setAuto(false);setPly(0);setCopyStatus('')},[methodId]);
  async function copySgf(){
    const sgf=methodToSgf(method);
    try{await navigator.clipboard.writeText(sgf);setCopyStatus(en?'SGF copied':'SGF 棋谱已复制')}
    catch{window.prompt(en?'Copy SGF content':'复制 SGF 棋谱内容：',sgf)}
  }
  return <main className="academy-page method-page">
    <header className="academy-header">
      <div className="academy-mark">法</div>
      <div className="academy-brand"><span className="eyebrow">GO METHODOLOGY · REPLAY</span><h1>{en?'Go Methodology · Interactive Guide':'围棋方法论 · 棋谱推演'}</h1></div>
      <div className="academy-head-actions">
        <button className="language-switch" onClick={()=>setLang(en?'zh':'en')}>{en?'中文 / ZH':'English / EN'}</button>
        <button className="secondary" onClick={()=>onChangeTeacherSide(teacherSide==='left'?'right':'left')}>{en?`Explanations: ${teacherSide}`:`讲解在${teacherSide==='left'?'左':'右'}侧`}</button>
        <button className="secondary" onClick={onExit}>{en?'Back to game':'返回游戏'}</button>
      </div>
    </header>
    <div className="academy-intro method-intro">
      <div><span className="eyebrow">STUDY WITHOUT LESSONS</span>
        <h2>{en?'Learn the principles before memorizing moves':'先懂棋理，再记招式。'}</h2>
        <p>{en?'A standalone reference with 16 original illustrative replay sequences. Each move includes a short explanation. No account or lesson completion is required.':'独立学习模块，16 组原创教学变化。每一步有原因解释，不用上课、无需账号也能直接看。'}</p>
      </div><div className="method-count"><strong>{GO_METHODS.length}</strong><span>{en?'study patterns':'套可回放方法'}</span></div>
    </div>
    <div className="method-filter" role="group" aria-label={en?'Filter by topic':'按主题筛选'}>
      <button className={category==='all'?'active':''} onClick={()=>setCategory('all')}>{en?'All':'全部'}</button>
      {categories.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(cat)}>{en?({"思考框架":"Thinking","攻防基础":"Basics","棋形效率":"Shape","手筋攻杀":"Tactics","死活眼形":"Life & death","中盘取舍":"Middlegame","布局方向":"Opening","官子与终局":"Endgame"} as Record<string,string>)[cat]||cat:cat}</button>)}
    </div>
    <div className={`method-grid teacher-${teacherSide}`}>
      <aside className="method-menu" aria-label={en?'Method list':'方法目录'}>
        <div className="method-menu-title">{en?'Method index':'方法目录'} <small>{displayed.length} / {GO_METHODS.length}</small></div>
        <div className="method-menu-list">
        {displayed.map((m)=><button key={m.id} className={`method-option ${method.id===m.id?'active':''}`} onClick={()=>setMethodId(m.id)} aria-current={method.id===m.id?'true':undefined}>
          <span className="method-number">{String(GO_METHODS.indexOf(m)+1).padStart(2,'0')}</span>
          <span><small>{en?m.category==='攻防基础'?'Basics':m.category==='棋形效率'?'Shape':m.category==='布局方向'?'Opening':m.category==='手筋攻杀'?'Tactics':m.category==='死活眼形'?'Life & death':m.category==='中盘取舍'?'Middlegame':m.category==='官子与终局'?'Endgame':'Thinking':m.category}</small><strong>{en?m.titleEn:m.title}</strong></span>
        </button>)}
        </div>
      </aside>
      <section className="method-reader">
        <span className="academy-caption">{en?'METHOD · STEP-BY-STEP':'围棋方法 · 逐手演示'}</span>
        <h2>{en?method.titleEn:method.title}</h2>
        <p className="method-principle">{en?method.principleEn:method.principle}</p>
        <div className="method-board-stat"><strong>{method.size} × {method.size}</strong><span>{en?'Move':'第'} {ply} / {method.steps.length} {en?'':'手'}</span><span>{en?'Captures in replay':'已提棋子'} {board.captures}</span></div>
        <p className="method-mobile-note" aria-live="polite">{currentStep?(en?currentStep.noteEn:currentStep.note):(en?'Watch the setup and tap Next for the first move.':'先看预设局面，点击“下一手”观看演示。')}</p>
        <GoBoard size={method.size} board={board.board} lastMove={board.lastMove} deadStones={[]} selected={null} mode="readonly" onPoint={()=>{}}/>
        <div className="method-replay-bar" aria-hidden="true"><i style={{width:`${progress}%`}}/></div>
        <div className="method-controls">
          <button className="secondary" onClick={()=>{setAuto(false);setPly(0)}} disabled={ply===0}>{en?'↺ Reset':'↺ 重头'}</button>
          <button className="secondary" onClick={()=>{setAuto(false);setPly(p=>Math.max(0,p-1))}} disabled={ply===0}>{en?'← Back':'← 上一手'}</button>
          <button className="primary" onClick={()=>{setAuto(false);setPly(p=>Math.min(method.steps.length,p+1))}} disabled={ply===method.steps.length}>{en?'Next →':'下一手 →'}</button>
          <button className="secondary" onClick={()=>{if(ply===method.steps.length)setPly(0);setAuto(!auto)}}>{auto?(en?'Pause':'暂停'):(en?'▶ Autoplay':'▶ 自动播放')}</button>
        </div>
        <div className="method-extra-actions"><button className="secondary" onClick={()=>void copySgf()}>{en?'Copy SGF record':'复制 SGF 棋谱'}</button>{copyStatus&&<small role="status">{copyStatus}</small>}</div>
      </section>
      <aside className="method-explainer">
        <span className="method-seal">师</span><span className="academy-caption">{en?'EXPLAIN EVERY MOVE':'围棋老师 · 逐手讲解'}</span>
        <h3>{en?'What is the idea?':'这手棋在想什么？'}</h3>
        <div className="method-current-note" aria-live="polite"><small>{en?`Step ${ply} / ${method.steps.length}`:`第 ${ply} / ${method.steps.length} 手`}</small>
          <p>{currentStep?(en?currentStep.noteEn:currentStep.note):(en?'Start with the setup, then use Next to see the move and explanation.':'先观察预设棋形，再点击“下一手”，看老师为什么这样下。')}</p>
        </div>
        <h4>{en?'The central principle':'核心方法论'}</h4><p>{en?method.principleEn:method.principle}</p>
        <h4>{en?'Think about this':'思考一下'}</h4><p>{en?method.questionEn:method.question}</p>
        <div className="method-move-ledger"><strong>{en?'Move list':'教学棋谱手顺'}</strong>
          <div>{method.steps.map((step,i)=><button key={i} className={i+1===ply?'active':''} onClick={()=>{setAuto(false);setPly(i+1)}}>
            <span className={`method-stone ${step.color===1?'black':'white'}`}/><b>{i+1}</b><span>{step.at===null?(en?'Pass':'虚手'):`${'ABCDEFGHJKLMNOPQRST'[step.at[0]]}${method.size-step.at[1]}`}</span>
          </button>)}</div>
        </div>
        <p className="method-caveat">{en?'These are original teaching examples, not copied professional game records or guaranteed best variations. Practice with real games to learn when a pattern applies.':'这些是原创教学示范，不是职业棋谱，也不保证每步都是最优变化。掌握棋理还需要配合实战与复盘。'}</p>
      </aside>
    </div>
    <footer>{en?'Methodology library · Independently accessible · No game state changed':'围棋方法论 · 独立学习入口 · 不影响正在进行的棋局'}</footer>
  </main>;
}
