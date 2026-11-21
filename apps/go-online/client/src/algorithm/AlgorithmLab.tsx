import {useEffect,useMemo,useState} from 'react';
import GoBoard from '../components/GoBoard';
import {useLanguage} from '../i18n';
import {aiStep,createPractice,enterPracticeScoring,finishPractice,passPractice,playPracticeMove,resumePractice,togglePracticeDead} from '../lib/localGo';
import type {AiDifficulty,PracticeGame} from '../lib/localGo';
import {traceAlgorithm} from '../../../shared/goCoach.js';
import type {AlgorithmTrace,MoveSuggestion} from '../../../shared/goCoach.js';
import {groupAt} from '../../../shared/goRules.js';
import './algorithm.css';

type TeacherSide='left'|'right';
type ViewMode='current'|'opponent';
interface Props{onExit:()=>void;teacherSide:TeacherSide;onChangeTeacherSide:(side:TeacherSide)=>void}

const factorLabels:Record<string,[string,string,string,string]>={
  base:['基础分','Base score','每个合法候选点的起始值。','Every legal candidate starts here.'],
  opening:['布局位置','Opening shape','偏好角部、三四线等基础布局点。','Prefers practical corner and opening coordinates.'],
  distance:['棋形距离','Distance to stones','依据与已有棋子的距离调整发展效率。','Adjusts value by distance from existing stones.'],
  capture:['实际提子','Captures','先模拟落子，确实提掉对方棋子才加分。','Points are awarded only after an actual simulated capture.'],
  rescue:['救回棋块','Rescue','原本只剩一口气的己方棋块成功增加了气。','A threatened friendly group gains liberties.'],
  failedRescue:['救棋失败','Failed rescue','落在危险棋旁却未真正解除叫吃。','Touches a threatened group without saving it.'],
  atari:['叫吃威胁','Atari threat','对方棋块经模拟后只剩一口气。','Opponent groups are reduced to one liberty.'],
  ownNeighbor:['相邻友军','Friendly neighbors','附近有自己的棋子，增加了接应价值。','Friendly neighboring stones give local support.'],
  enemyNeighbor:['相邻敌棋','Enemy neighbors','接触对手棋子，具有局部交锋价值。','Contact with opposing stones affects local play.'],
  connect:['连接两块棋','Connect groups','该点能直接把两个或更多己方棋块连起来。','Directly links two or more separate friendly groups.'],
  dangerOneLiberty:['只剩一口气','One-liberty danger','落子后自己只有一口气，而且没有提子。','The new group has one liberty and captured nothing.'],
  dangerTwoLiberties:['两口气风险','Two-liberty risk','落子后自身气较紧，予以少量扣分。','The new group has only two liberties.'],
  selfEye:['填自己的眼','Filling own eye','简单判断为在己方棋眼落子，通常不划算。','Usually discourages filling a simple friendly eye.'],
  firstLine:['布局期一线','First-line opening','布局早期没有战术理由时避免贴边下棋。','Avoids first-line moves early without tactical urgency.'],
};
function scoreText(score:number){return `${score>0?'+':''}${score}`;}
function candidateDescription(move:MoveSuggestion|null,en:boolean){
  if(!move)return en?'No legal candidate. Consider passing.':'没有合法落点，可以考虑虚手。';
  const m=move.metrics;
  if(m.captured>0)return en?`This move captures ${m.captured} opposing stone(s).`:`这一手模拟后确实提掉对方 ${m.captured} 子，因此得到高额提子加分。`;
  if(m.rescued>0)return en?`It rescues ${m.rescued} endangered stone(s) by increasing their liberties.`:`这一手让 ${m.rescued} 颗危险棋子增加气，从叫吃中暂时逃脱。`;
  if(m.threatened>0)return en?`It puts ${m.threatened} opposing stone(s) in atari.`:`这一手使对方 ${m.threatened} 颗棋子处于叫吃状态，形成后续威胁。`;
  if(m.nearGroups>=2)return en?'It connects multiple friendly groups, helping their overall shape.':'这一手连接了多个己方棋块，有利于减少薄弱点。';
  return en?`The simulated friendly group has ${m.liberties} liberties. The total score combines position, shape and risk.`:`模拟落子后形成的棋块有 ${m.liberties} 口气。评分综合了位置、接应和风险，并不是胜率。`;
}

export default function AlgorithmLab({onExit,teacherSide,onChangeTeacherSide}:Props){
  const {lang,setLang}=useLanguage();
  const en=lang==='en';
  const [size,setSize]=useState<9|13|19>(9);
  const [difficulty,setDifficulty]=useState<AiDifficulty>('beginner');
  const [game,setGame]=useState<PracticeGame>(()=>createPractice(9,'beginner','你'));
  const [selected,setSelected]=useState<number|null>(null);
  const [inspected,setInspected]=useState<number|null>(null);
  const [showHeatmap,setShowHeatmap]=useState(true);
  const [phase,setPhase]=useState(4);
  const [autoStep,setAutoStep]=useState(false);
  const [view,setView]=useState<ViewMode>('current');
  const [lastAi,setLastAi]=useState<{trace:AlgorithmTrace;index:number|null;moveNo:number}|null>(null);
  const [lastHuman,setLastHuman]=useState<{trace:AlgorithmTrace;index:number}|null>(null);
  const [inspectedAiIndex,setInspectedAiIndex]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [teacherOpen,setTeacherOpen]=useState(false);
  const humanTurn=game.status==='playing'&&game.turn===1;
  const currentTrace=useMemo(()=>humanTurn?traceAlgorithm(game.board,game.size,1,game.history,game.aiDifficulty,game.moveNumber):null,
    [humanTurn,game.board,game.size,game.history,game.aiDifficulty,game.moveNumber]);
  const selectedMove=useMemo(()=>currentTrace?.ranked.find(move=>move.index===selected)??null,[currentTrace,selected]);
  const tracingOpponent=view==='opponent'&&!!lastAi;
  const trace=tracingOpponent?lastAi?.trace??null:currentTrace;
  const focusMove=tracingOpponent?(trace?.ranked.find(move=>move.index===inspectedAiIndex)??trace?.chosen??null):selectedMove??trace?.chosen??null;
  const displayedMoves=trace?.ranked.slice(0,6)??[];
  const inspector=useMemo(()=>inspected!==null&&game.board[inspected]?groupAt(game.board,inspected,game.size):null,
    [inspected,game.board,game.size]);

  useEffect(()=>{
    if(game.status!=='playing'||game.turn!==2)return;
    const timer=setTimeout(()=>{
      const algorithm=traceAlgorithm(game.board,game.size,2,game.history,game.aiDifficulty,game.moveNumber);
      try{
        const next=aiStep(game);
        setLastAi({trace:algorithm,index:next.lastMove,moveNo:next.moveNumber});setInspectedAiIndex(null);
        setGame(next);setSelected(null);setInspected(null);setView('opponent');setPhase(4);setAutoStep(false);
        setMessage(en?'The computer responded. Inspect the move selection and weighted scores.':'电脑已经应棋。左侧能看到它刚才怎样评分、挑选落点。');
      }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    },850);
    return ()=>clearTimeout(timer);
  },[game,en]);
  useEffect(()=>{
    if(!autoStep)return;
    if(phase>=4){setAutoStep(false);return;}
    const timer=setTimeout(()=>setPhase(previous=>Math.min(4,previous+1)),950);
    return ()=>clearTimeout(timer);
  },[autoStep,phase]);
  useEffect(()=>{
    if(!teacherOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setTeacherOpen(false)};
    window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close);
  },[teacherOpen]);

  function reset(){
    setGame(createPractice(size,difficulty,'你'));setSelected(null);setInspected(null);
    setLastAi(null);setLastHuman(null);setInspectedAiIndex(null);setView('current');setMessage('');setPhase(4);setAutoStep(false);
  }
  function boardClick(index:number){
    if(game.status==='scoring'){
      try{setGame(togglePracticeDead(game,index))}
      catch(error){setMessage(error instanceof Error?error.message:String(error))}
      return;
    }
    if(humanTurn)setSelected(old=>old===index?null:index);
  }
  function play(index:number){
    if(!humanTurn||game.board[index])return;
    try{
      const trace=traceAlgorithm(game.board,game.size,1,game.history,game.aiDifficulty,game.moveNumber);
      const next=playPracticeMove(game,index,1);
      setLastHuman({trace,index});setGame(next);setSelected(null);setInspected(null);setView('current');
      setMessage(en?'Your move is placed. The computer will calculate its reply.':'你已落子，电脑即将根据同一套评分规则选择应手。');
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
  }
  function pass(){
    if(!humanTurn)return;
    try{setGame(passPractice(game,1));setSelected(null);setView('current');setMessage(en?'You passed. The AI will reply.':'你选择了虚手，AI 接下来会应棋。')}
    catch(error){setMessage(error instanceof Error?error.message:String(error))}
  }
  function tutorialScoring(){
    if(game.status!=='playing')return;
    if(!window.confirm(en?'End this practice and enter the scoring tutorial?':'提前结束本局，进入教学数目吗？'))return;
    setGame(enterPracticeScoring(game));setView('current');setSelected(null);setMessage('');
  }
  function finish(){
    try{setGame(finishPractice(game));setMessage(en?'Scoring completed.':'教学数目已确认。')}
    catch(error){setMessage(error instanceof Error?error.message:String(error))}
  }
  function resume(){
    try{setGame(resumePractice(game));setMessage('')}
    catch(error){setMessage(error instanceof Error?error.message:String(error))}
  }
  const heatmap=humanTurn&&view==='current'&&showHeatmap&&phase>=3?(currentTrace?.ranked.slice(0,22).map(item=>({index:item.index,score:item.score}))??[]):[];
  const stat=game.status==='finished'?(en?'Practice finished':'练习已结束'):game.status==='scoring'?(en?'Scoring lesson':'教学数目'):
    humanTurn?(en?'Your turn · Black':'轮到你 · 黑棋'):(en?'Computer thinking · White':'电脑 AI 思考中 · 白棋');

  return <main className="academy-page algorithm-page">
    <header className="academy-header">
      <div className="academy-mark">算</div><div className="academy-brand"><span className="eyebrow">EXPLAINABLE GO ENGINE</span><h1>{en?'Go Algorithm Lab':'围棋算法实验室'}</h1></div>
      <div className="academy-head-actions">
        <button className="language-switch" onClick={()=>setLang(en?'zh':'en')}>{en?'中文 / ZH':'English / EN'}</button>
        <button className="secondary" onClick={()=>onChangeTeacherSide(teacherSide==='left'?'right':'left')}>{en?`Coach: ${teacherSide}`:`讲解在${teacherSide==='left'?'左':'右'}侧`}</button>
        <button className="secondary" onClick={onExit}>{en?'Return to game':'返回游戏'}</button>
      </div>
    </header>
    <div className="academy-intro algorithm-intro"><div>
      <span className="eyebrow">OBSERVE · SCORE · LEARN</span>
      <h2>{en?'See how the algorithm thinks':'看得见的落子推理。'}</h2>
      <p>{en?'Play against the actual rule-based AI. Candidate scores, point filters and weighted reasons are derived from the same function used to select its moves.':'你执黑棋、电脑执白棋。棋盘热力图、候选分数和加减分原因都来自实际运行的规则型 AI，而不是虚构的胜率动画。'}</p>
    </div><div className="algorithm-stamp"><strong>AI</strong><span>{en?'computer opponent':'明确为电脑对手'}</span></div></div>
    <div className="algorithm-setup">
      <label>{en?'Board size':'棋盘大小'}<select value={size} onChange={e=>setSize(Number(e.target.value) as 9|13|19)}>
        <option value={9}>9 × 9</option><option value={13}>13 × 13</option><option value={19}>19 × 19</option></select></label>
      <label>{en?'AI difficulty':'电脑难度'}<select value={difficulty} onChange={e=>setDifficulty(e.target.value as AiDifficulty)}>
        <option value="beginner">{en?'Beginner (5-move pool)':'入门 AI（前五候选抽取）'}</option>
        <option value="standard">{en?'Standard (2-move pool)':'标准 AI（前二候选抽取）'}</option></select></label>
      <button className="primary" onClick={reset}>{en?'Start / Reset game':'按所选设置重新开局'}</button>
      <label className="algorithm-check"><input type="checkbox" checked={showHeatmap} onChange={e=>setShowHeatmap(e.target.checked)}/>{en?'Show score heatmap':'显示候选点热力图'}</label>
    </div>
    <button className="teacher-fab algorithm-teacher-fab" onClick={()=>setTeacherOpen(true)}>{en?'算法讲解':'算 · 看算法讲解'}</button>
    {teacherOpen&&<button className="teacher-backdrop" aria-label={en?'Close panel':'关闭算法面板'} onClick={()=>setTeacherOpen(false)}/>}
    <div className={`algorithm-layout teacher-${teacherSide}`}>
      <aside className={`algorithm-teacher ${teacherOpen?'mobile-teacher-open':''}`} aria-label={en?'Algorithm explanation':'算法老师讲解'}>
        <div className="teacher-drawer-top"><strong>{en?'AI explanation':'围棋算法老师'}</strong><button className="teacher-close" onClick={()=>setTeacherOpen(false)}>{en?'Close':'收起 ✕'}</button></div>
        <div className="algorithm-teacher-heading"><span className="algorithm-icon">算</span><div><small>HEURISTIC ENGINE · TRACE</small><h3>{en?'Why this move?':'这一步为什么这样走？'}</h3></div></div>
        <div className="algorithm-view-switch">
          <button className={view==='current'?'active':''} disabled={!currentTrace} onClick={()=>setView('current')}>{en?'Your candidates':'我的候选点'}</button>
          <button className={view==='opponent'?'active':''} disabled={!lastAi} onClick={()=>setView('opponent')}>{en?'Last AI decision':'AI 上一步'}</button>
        </div>
        {trace?<>
          <div className="algorithm-phase-controls"><span>{en?'Decision replay':'分步观察算法决策'}</span><button className="secondary" disabled={autoStep} onClick={()=>{setPhase(1);setAutoStep(true)}}>{en?'▶ Replay 4 steps':'▶ 四步演示'}</button></div>
        <div className="algorithm-stage-note" role="status"><strong>{en?`Stage ${phase} / 4`:`阶段 ${phase} / 4`}</strong><p>{(en?["Enumerate empty intersections and collect possible candidates.","Simulate each candidate with the Go rules, excluding illegal moves.","Evaluate each legal move using actual tactical and positional weights.","Show the shortlist, the AI's deterministic choice and every score contribution."]:["扫描棋盘所有空交叉点，建立初始候选集合。","用真实围棋规则逐点试下，排除禁手、禁自杀和重复棋形。","把提子、救棋、连接、布局与风险换算成真实加减分。","展示分散候选池、AI 实际选点以及该点的完整分数账本。"])[phase-1]}</p></div>
        <div className="algorithm-pipeline">
            <div className={phase===1?'current':''}><b>01</b><span>{en?'Find empty intersections':'扫描空交叉点'}</span><strong>{trace.considered}</strong></div>
            <div className={phase===2?'current':''}><b>02</b><span>{en?'Apply Go rules; remove illegal':'模拟围棋规则，过滤禁手'}</span><strong>{trace.legal} <small>/{trace.illegal}{en?' rejected':' 被排除'}</small></strong></div>
            <div className={phase===3?'current':''}><b>03</b><span>{en?'Score capture, shape & danger':'给提子、棋形和风险加减分'}</span><strong>{trace.legal}</strong></div>
            <div className={phase===4?'current':''}><b>04</b><span>{en?'Select from diversified shortlist':'从分散候选池中选一手'}</span><strong>{trace.pool.length}</strong></div>
          </div>
          <div className="algorithm-featured">
            <small>{tracingOpponent?(inspectedAiIndex!==null?(en?'Compare another candidate':'比较另一候选点'):(en?'Computer actually picked':'电脑实际选择')):(selectedMove?(en?'Your selected point':'你预览的位置'):(en?'AI would suggest':'算法当前推荐'))}</small>
            <div><strong>{focusMove?.coordinate??'PASS'}</strong><b>{focusMove?`${focusMove.score} ${en?'pts':'分'}`:'—'}</b></div>
            <p>{candidateDescription(focusMove??null,en)}</p>
          </div>
          {focusMove&&<div className="algorithm-factors"><h4>{en?'Exact weighted score breakdown':'真实加减分明细'}</h4>
            {focusMove.factors.map(factor=>{
              const label=factorLabels[factor.key];const width=Math.max(4,Math.min(100,Math.abs(factor.delta)/100*100));
              return <div className="algorithm-factor" key={factor.key} title={label?(en?label[3]:label[2]):factor.key}>
                <div><span>{label?(en?label[1]:label[0]):factor.key}</span><strong className={factor.delta<0?'negative':'positive'}>{scoreText(factor.delta)}</strong></div>
                <div className="algorithm-factor-track"><i className={factor.delta<0?'negative':''} style={{width:`${width}%`}}/></div>
              </div>;
            })}
            <div className="algorithm-total"><span>{en?'Total heuristic score':'启发式总分'}</span><strong>{focusMove.score}</strong></div>
          </div>}
          <div className="algorithm-ranking"><h4>{en?'Highest-scored legal points':'全局高分合法候选点'}</h4>
            {displayedMoves.map((move,i)=><button key={move.index} className={focusMove?.index===move.index?'active':''}
              onClick={()=>{if(tracingOpponent)setInspectedAiIndex(move.index);else{setSelected(move.index);setView('current')}}}>
              <b>{String(i+1).padStart(2,'0')}</b><strong>{move.coordinate}</strong><span className="algorithm-rankbar"><i style={{width:`${Math.max(5,(move.score-(trace.ranked[trace.ranked.length-1]?.score??0))/Math.max(1,(trace.ranked[0]?.score??0)-(trace.ranked[trace.ranked.length-1]?.score??0))*100)}%`}}/></span><em>{move.score}</em>
            </button>)}
          </div>
          {tracingOpponent&&inspectedAiIndex!==null&&<button className="secondary algorithm-back-choice" onClick={()=>setInspectedAiIndex(null)}>{en?'Show actual AI choice':'返回 AI 实际落点'}</button>}
          {tracingOpponent&&<div className="algorithm-detail">
            <h4>{en?'How the AI chose':'为什么不是每次都下最高分？'}</h4>
            <p>{en?`The AI chose position ${trace.chosenPoolIndex+1} from a ${trace.pool.length}-move pool. Its deterministic selector uses the move number and current board; beginner mode can choose from five options, standard mode from two.`:`本次 AI 从 ${trace.pool.length} 个候选点中选择第 ${trace.chosenPoolIndex+1} 个。选点依据当前棋盘数值和回合数计算，不是随机宣传的“深度思考”；入门难度最多选五手，标准难度最多选两手。`}</p>
          </div>}
        </>:<div className="algorithm-empty"><p>{game.status==='scoring'?(en?'You are in scoring mode.':'现在是数目阶段。'):lastAi?(en?'Open “Last AI decision” to inspect the previous move.':'可以切换“AI 上一步”查看刚才的决策过程。'):(en?'Wait for a legal turn to inspect the search.':'等待轮到你落子，就能看到实时算法评分。')}</p></div>}
        {lastHuman&&<details className="algorithm-history"><summary>{en?'Review your previous move':'回看你上一手的算法分数'}</summary><p>{en?'Your move':'你走在'} {lastHuman.trace.ranked.find(m=>m.index===lastHuman.index)?.coordinate??'—'} · {en?'score':'分数'} {lastHuman.trace.ranked.find(m=>m.index===lastHuman.index)?.score??'—'}</p></details>}
        <p className="algorithm-disclaimer">{en?'Scores are heuristic weights, NOT win rates. This local AI uses move simulation and pattern rules, not neural networks, Monte Carlo tree search or full-board professional analysis.':'重要说明：这里展示的是启发式加减分，不是胜率。当前 AI 会模拟合法落子和局部棋形，但没有神经网络、蒙特卡洛树搜索，也不是职业围棋引擎。'}</p>
      </aside>
      <section className="algorithm-board-area">
        <div className="algorithm-board-status"><strong>{stat}</strong><span>{en?'Move':'手数'} {game.moveNumber} · {game.size} × {game.size}</span></div>
        <GoBoard size={game.size} board={game.board} lastMove={game.lastMove} selected={selected} deadStones={game.deadStones}
          inspectedStones={inspector?.stones??[]} inspectedLiberties={inspector?.liberties??[]} onInspect={index=>setInspected(old=>old===index?null:index)}
          mode={game.status==='scoring'?'scoring':humanTurn?'play':'readonly'} onPoint={boardClick} onQuickPoint={play}
          algorithmScores={heatmap} algorithmFocus={humanTurn&&view==='current'?(selected??currentTrace?.chosen?.index??null):null}/>
        <div className="algorithm-legend"><span><i className="heat"/>{en?'Color = relative heuristic score':'颜色深浅＝相对评分'}</span><span><i className="ring"/>{en?'Ring = selected point':'红圈＝关注的落点'}</span></div>
        <p className="algorithm-board-note">{en?'Click once to preview. Double-click to play. Top circles indicate the highest heuristic scores, not win probabilities.':'单击预览、双击快速落子。热力图前 3 个数字表示评分排名（非胜率）。老师会拆解每一项加分与扣分。'}</p>
        {inspector&&<p className="algorithm-inspection">{en?`Selected group: ${inspector.stones.length} stones, ${inspector.liberties.length} liberties.`:`选中的棋块：${inspector.stones.length} 子，共 ${inspector.liberties.length} 口气。`}</p>}
        <div className="algorithm-actions">
          {game.status==='playing'&&<>
            <button className="primary" disabled={!humanTurn||selected===null} onClick={()=>selected!==null&&play(selected)}>{en?`Play ${selectedMove?.coordinate??'move'}`:`确认落子 · ${selectedMove?.coordinate??'请选落点'}`}</button>
            <button className="secondary" disabled={!humanTurn} onClick={pass}>{en?'Pass':'虚手 PASS'}</button>
            <button className="secondary" onClick={tutorialScoring}>{en?'Scoring tutorial':'提前学习数目'}</button>
          </>}
          {game.status==='scoring'&&<><button className="primary" onClick={finish}>{en?'Confirm scoring':'确认教学数目'}</button><button className="secondary" onClick={resume}>{en?'Continue playing':'继续下棋'}</button></>}
          {game.status==='finished'&&<button className="primary" onClick={reset}>{en?'New practice':'重新开始练习'}</button>}
        </div>
        {game.status==='scoring'&&<p className="algorithm-inspection">{en?'Tap stones to mark dead groups before confirming.':'点击棋盘上的棋块标记死子，再确认数目。'} · {en?'Black':'黑'} {game.previewScore?.black.toFixed(1)} · {en?'White incl. komi':'白（含贴目）'} {game.previewScore?.white.toFixed(1)}</p>}
        {message&&<p className="algorithm-message" role="status">{message}</p>}
        <div className="algorithm-identity"><span className="algorithm-b-stone"/>{en?'You · Black':'你 · 黑棋'}<span className="algorithm-w-stone"/>{en?'Computer AI · White':'电脑 AI · 白棋（非真人）'}</div>
      </section>
    </div>
    <footer>{en?'Algorithm Lab is independent from lessons and multiplayer rooms.':'围棋算法实验室为独立练习模块，不会改变五十课进度或真人房间。'}</footer>
  </main>;
}
