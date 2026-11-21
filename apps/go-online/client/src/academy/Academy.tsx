import { useEffect, useMemo, useRef, useState } from 'react';
import GoBoard from '../components/GoBoard';
import { aiStep, createPractice, finishPractice, passPractice, playPracticeMove } from '../lib/localGo';
import type { PracticeGame } from '../lib/localGo';
import { analyzePosition, coordinate } from '../../../shared/goCoach.js';
import { boardKey, groupAt } from '../../../shared/goRules.js';
import { GO_LESSONS, buildLessonBoard, lessonGoalHit, lessonMoveCompleted, lessonTargetIndices } from '../../../shared/goLessons.js';
import type { GoLesson } from '../../../shared/goLessons.js';
import {useLanguage} from '../i18n';
const storageKey = (name: string) => `go_academy_50_v1_${name}`;
const legacyStorageKey = (name:string) => `go_academy_15_v1_${name}`;
function readProgress(name: string): number[] {
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey(name)) || localStorage.getItem(legacyStorageKey(name)) || '[]');
        return Array.isArray(stored) ? stored.filter(id => Number.isInteger(id) && id >= 1 && id <= GO_LESSONS.length) : [];
    }
    catch {
        return [];
    }
}
function newLessonGame(lesson: GoLesson, name: string): PracticeGame {
    const base = createPractice(lesson.size??9, 'beginner', name);
    const board = buildLessonBoard(lesson);
    return { ...base, board, history: [boardKey(board)], code: `LESSON-${lesson.id}`,
        players: [base.players[0], { ...base.players[1], username: '教学 AI（电脑）' }] };
}
type TeacherSide = 'left' | 'right';
interface Props {
    onExit: () => void;
    onOpenMethodology:()=>void;
    name: string;
    teacherSide: TeacherSide;
    onChangeTeacherSide: (side: TeacherSide | ((prev: TeacherSide) => TeacherSide)) => void;
}
export default function Academy({ onExit, onOpenMethodology, name, teacherSide, onChangeTeacherSide }: Props) {
    const {lang,setLang,tr}=useLanguage();
    const [lessonIndex, setLessonIndex] = useState(0);
    const [chapterFilter,setChapterFilter] = useState('all');
    const chapters=[...new Set(GO_LESSONS.map(item=>item.chapter))];
    const visibleLessons=chapterFilter==='all'?GO_LESSONS:GO_LESSONS.filter(item=>item.chapter===chapterFilter);
    const lesson = GO_LESSONS[lessonIndex];
    const [practice, setPractice] = useState<PracticeGame>(() => newLessonGame(GO_LESSONS[0], name));
    const [selected, setSelected] = useState<number | null>(null);
    const [inspected, setInspected] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [firstCorrect, setFirstCorrect] = useState<boolean | null>(null);
    const [feedback, setFeedback] = useState('老师：先读本课目标，再观察棋盘。每次只练一个关键方法。');
    const [completed, setCompleted] = useState<number[]>(() => readProgress(name));
    const [tipShown, setTipShown] = useState(true);
    const [mobileTeacherOpen, setMobileTeacherOpen] = useState(false);
    const moving = useRef(false);
    useEffect(() => { try {
        localStorage.setItem(storageKey(name), JSON.stringify(completed));
    }
    catch { /* private mode */ } }, [completed, name]);
    useEffect(() => {
        if (!mobileTeacherOpen)
            return;
        const close = (event: KeyboardEvent) => { if (event.key === 'Escape')
            setMobileTeacherOpen(false); };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [mobileTeacherOpen]);
    const markCompleted = () => setCompleted(old => old.includes(lesson.id) ? old : [...old, lesson.id]);
    const selectedGroup = useMemo(() => inspected !== null && practice.board[inspected]
        ? groupAt(practice.board, inspected, practice.size) : null, [practice.board, practice.size, inspected]);
    const analysis = useMemo(() => practice.status === 'playing' && practice.turn === 1
        ? analyzePosition(practice.board, practice.size, 1, practice.history) : null, [practice.board, practice.history, practice.status, practice.turn]);
    const isDone = completed.includes(lesson.id);
    const myTurn = practice.status === 'playing' && practice.turn === 1;
    const goalTargets = lessonTargetIndices(lesson);
    function openLesson(index: number) {
        if (index < 0 || index >= GO_LESSONS.length)
            return;
        setMobileTeacherOpen(false);
        setLessonIndex(index);
        setPractice(newLessonGame(GO_LESSONS[index], name));
        setSelected(null);
        setInspected(null);
        setShowAnswer(false);
        setFirstCorrect(null);
        setTipShown(true);
        setFeedback('老师：先读本课目标，再观察棋盘。你执黑棋，白棋是本地教学 AI。');
        moving.current = false;
    }
    useEffect(() => {
        if (practice.status !== 'playing' || practice.turn !== 2)
            return;
        const timer = window.setTimeout(() => {
            setPractice(current => {
                if (current.status !== 'playing' || current.turn !== 2)
                    return current;
                try {
                    return lesson.goal === 'pass' && current.passes === 1 ? passPractice(current, 2) : aiStep(current);
                }
                catch {
                    return current;
                }
            });
        }, 800);
        return () => window.clearTimeout(timer);
    }, [lesson.id, lesson.goal, practice.board, practice.moveNumber, practice.turn, practice.status, practice.passes]);
    useEffect(() => {
        if (!lessonMoveCompleted(lesson, firstCorrect, practice) || completed.includes(lesson.id))
            return;
        setCompleted(old => old.includes(lesson.id) ? old : [...old, lesson.id]);
        setFeedback(`本课完成！${lesson.success} AI 已经应了一手，你可以继续和它下，或者进入下一课。`);
    }, [firstCorrect, lesson, practice.moveNumber, practice.turn, practice.status, completed]);
    function play(index: number) {
        if (!myTurn || moving.current || practice.board[index] !== 0)
            return;
        moving.current = true;
        try {
            const next = playPracticeMove(practice, index, 1);
            const correct = lessonGoalHit(lesson, index);
            if (firstCorrect === null) {
                setFirstCorrect(correct);
                setFeedback(correct ?
                    `老师：正确！${lesson.success} 现在看白棋 AI 怎样回应。` :
                    `老师：${coordinate(index, practice.size)} 是合法的一手，但没抓住本课的核心练习点。${lesson.hint} 可以点击“重练本课”再尝试。`);
            }
            else {
                setFeedback('老师：先看看 AI 的上一手有没有制造新威胁，再数气、选方向。');
            }
            setPractice(next);
            setSelected(null);
            setInspected(null);
        }
        catch (error) {
            setFeedback(`老师：这手棋还不能下。${error instanceof Error ? error.message : '请换一个交叉点。'}`);
        }
        finally {
            moving.current = false;
        }
    }
    function clickPoint(index: number) {
        if (!myTurn || practice.board[index])
            return;
        setSelected(old => old === index ? null : index);
    }
    function pass() {
        if (!myTurn)
            return;
        try {
            setPractice(passPractice(practice, 1));
            setSelected(null);
            if (lesson.goal === 'pass') {
                if (firstCorrect === null)
                    setFirstCorrect(true);
                setFeedback(firstCorrect === false ? '老师：我们会体验数目，但你第一手没有完成虚手任务；需要重练本课才会标记完成。' : '老师：你已选择虚手。电脑 AI 也会虚手，让我们一起体验数目阶段。');
            }
            else {
                if (firstCorrect === null)
                    setFirstCorrect(false);
                setFeedback('老师：你选择虚手了。但本课的目标是实战下一手；可以重练来完成目标。');
            }
        }
        catch (error) {
            setFeedback(error instanceof Error ? error.message : '不能虚手。');
        }
    }
    function confirm() {
        if (practice.status !== 'scoring')
            return;
        try {
            const done = finishPractice(practice);
            setPractice(done);
            if (lesson.goal === 'pass' && firstCorrect === true) {
                markCompleted();
                setFeedback(`本课完成！${lesson.success} 黑棋 ${done.score?.black.toFixed(1)} 目，白棋 ${done.score?.white.toFixed(1)} 目（已含贴目）。教学棋局只用于认识流程。`);
            }
        }
        catch (error) {
            setFeedback(error instanceof Error ? error.message : '无法完成数目。');
        }
    }
    return <main className="academy-page">
    <header className="academy-header">
      <div className="academy-mark">{tr("\u68CB")}</div>
      <div className="academy-brand"><span className="eyebrow">{(lang==='en'?'50 Lessons · Classical Go':'五十课 · 古风围棋启蒙')}</span><h1>{(lang==='en'?'Go Academy · 50 Lessons':'围棋学堂 · 循序五十课')}</h1></div>
      <div className="academy-head-actions"><button type="button" className="language-switch" onClick={() => setLang(lang==='zh'?'en':'zh')} aria-label="Switch language / 切换语言">{lang==='zh'?'English / EN':'中文 / ZH'}</button><button className="secondary academy-exit" onClick={onOpenMethodology}>{lang==='en'?'Methodology & replay':'方法论 · 棋谱推演'}</button><button className="secondary academy-exit" onClick={() => onChangeTeacherSide(side => side === 'left' ? 'right' : 'left')}>{tr("\u8001\u5E08\u5728")}{tr(teacherSide === 'left' ? '左侧' : '右侧')}</button><button className="secondary academy-exit" onClick={onExit}>{tr("\u8FD4\u56DE\u539F\u6E38\u620F")}</button></div>
    </header>
    <div className="academy-intro">
      <div><span className="eyebrow">ONE SKILL AT A TIME</span><h2>{tr("\u6BCF\u65E5\u4E00\u6CD5\uFF0C\u843D\u5B50\u6709\u7406\u3002")}</h2>
        <p>{(lang==='en'?'One practical method per lesson. You play Black; ':'每节一个方法和一个关键落点。你执黑棋，')}<strong>{tr("\u5BF9\u624B\u59CB\u7EC8\u662F\u7535\u8111 AI\uFF0C\u4E0D\u662F\u771F\u4EBA\u3002")}</strong></p></div>
      <div className="academy-progress"><strong>{completed.length}<small>{(lang==='en'?' / 50 lessons':' / 50 课')}</small></strong><span>{tr("\u5DF2\u5B8C\u6210")}</span>
        <div className="academy-track"><i style={{ width: `${completed.length / GO_LESSONS.length * 100}%` }}/></div></div>
    </div>
    <button type="button" className="teacher-fab" aria-expanded={mobileTeacherOpen} aria-controls="academy-go-teacher" onClick={() => setMobileTeacherOpen(true)}>{tr("\u5E08 \u00B7 \u770B\u672C\u8BFE\u8BB2\u89E3")}</button>
    <div className={`academy-grid teacher-${teacherSide}`}>
      <nav className="academy-syllabus" aria-label={(lang==='en'?'50-lesson syllabus':'五十课课程目录')}>
        <div className="academy-syllabus-head"><strong>{lang==='en'?'50-lesson syllabus':'五十课课程目录'}</strong><span>{tr("\u6BCF\u8BFE\u53EF\u72EC\u7ACB\u91CD\u7EC3")}</span></div>
        <select className="academy-chapter-filter" aria-label={lang==='en'?'Filter by chapter':'按卷筛选课程'} value={chapterFilter} onChange={event=>setChapterFilter(event.target.value)}>
          <option value="all">{lang==='en'?'All 50 lessons':'全部 50 课'}</option>
          {chapters.map(chapter=><option key={chapter} value={chapter}>{tr(chapter)}</option>)}
        </select>
        <div className="academy-lesson-list">
          {visibleLessons.map((item) => <button key={item.id} onClick={() => openLesson(item.id-1)} className={`academy-lesson ${item.id-1 === lessonIndex ? 'current' : ''} ${completed.includes(item.id) ? 'mastered' : ''}`} aria-current={item.id-1 === lessonIndex ? 'step' : undefined}>
            <span className="academy-num">{String(item.id).padStart(2, '0')}</span>
            <span className="academy-lesson-name"><small>{tr(item.chapter)}</small><strong>{tr(item.title)}</strong></span>
            <span className="academy-check">{completed.includes(item.id) ? '✓' : '·'}</span>
          </button>)}
        </div>
      </nav>
      <section className="academy-workbench">
        <div className="academy-lesson-top"><span className="academy-seal">{tr("\u7B2C ")}{String(lesson.id).padStart(2, '0')}{tr(" \u8BFE")}</span><span className="academy-chip">{tr(lesson.badge)}</span><span className="academy-mode">{tr("\u25CF \u7535\u8111\u6559\u5B66 AI")}</span></div>
        <h2>{tr(lesson.title)}</h2>
        <p className="academy-concept">{tr(lesson.concept)}</p>
        <div className="academy-task"><span>{tr("\u672C\u8BFE\u7EC3\u4E60")}</span><strong>{tr(lesson.task)}</strong></div>
        <div className="academy-board-stat"><span>{tr(practice.status === 'scoring' ? '双方虚手 · 教学数目' : practice.status === 'finished' ? '教学数目完成' : myTurn ? '轮到你 · 黑棋' : '教学 AI 正在思考 · 白棋')}</span><span>{tr("\u7B2C ")}{practice.moveNumber + 1}{tr(" \u624B")}</span></div>
        <GoBoard size={practice.size} board={practice.board} lastMove={practice.lastMove} deadStones={[]} selected={selected} inspectedStones={selectedGroup?.stones || []} inspectedLiberties={selectedGroup?.liberties || []} onInspect={index => setInspected(old => old === index ? null : index)} hintIndex={showAnswer && myTurn && firstCorrect === null && lesson.goal !== 'pass' ? goalTargets[0] : null} mode={myTurn ? 'play' : 'readonly'} onPoint={clickPoint} onQuickPoint={play}/>
        <p className="academy-board-note">{tr("\u5355\u51FB\u7A7A\u4EA4\u53C9\u70B9\u9884\u89C8\uFF0C\u53CC\u51FB\u540C\u4E00\u70B9\u5FEB\u901F\u843D\u5B50\uFF1B\u70B9\u51FB\u5DF2\u6709\u7684\u68CB\u5B50\uFF0C\u53EF\u4EE5\u67E5\u770B\u5B83\u7684\u6C14\u3002\u9F20\u6807\u4E4B\u5916\u4E5F\u53EF\u7528\u4E0B\u65B9\u6309\u94AE\u786E\u8BA4\u3002")}</p>
        <div className="academy-controls">
          <button className="primary" disabled={!myTurn || selected === null} onClick={() => selected !== null && play(selected)}>{tr("\u786E\u8BA4\u843D\u5B50")}{selected !== null ? ` · ${coordinate(selected, practice.size)}` : ''}</button>
          <button className="secondary" disabled={!myTurn} onClick={pass}>{tr("\u865A\u624B PASS")}</button>
          <button className="secondary" onClick={() => openLesson(lessonIndex)}>{tr("\u91CD\u7EC3\u672C\u8BFE")}</button>
        </div>
        {practice.status === 'scoring' && <div className="academy-result">
          <strong>{tr("\u53CC\u65B9\u5DF2\u865A\u624B \u00B7 \u73B0\u5728\u5B66\u4E60\u6570\u76EE")}</strong>
          <p>{tr("\u9ED1\u68CB\u6682\u8BA1 ")}{practice.previewScore?.black.toFixed(1)}{tr(" \u76EE\uFF0C\u767D\u68CB\u6682\u8BA1 ")}{practice.previewScore?.white.toFixed(1)}{tr(" \u76EE\uFF08\u767D\u68CB\u542B\u8D34\u76EE 7.5\uFF09\u3002\u672C\u7EC3\u4E60\u6CA1\u6709\u81EA\u52A8\u4E89\u8BAE\u6B7B\u5B50\u5224\u5B9A\u3002")}</p>
          <button className="primary" onClick={confirm}>{tr("\u786E\u8BA4\u6559\u5B66\u6570\u76EE")}</button>
        </div>}
        {practice.status === 'finished' && <div className="academy-result"><strong>{tr('教学棋局结束')}</strong><p>{practice.score ? (lang==='en'?`Black ${practice.score.black.toFixed(1)} points, White ${practice.score.white.toFixed(1)} points.`:`黑 ${practice.score.black.toFixed(1)} 目，白 ${practice.score.white.toFixed(1)} 目。`) : tr('本局已经结束。')}</p></div>}
        {isDone && <div className="academy-congrats"><span>{tr("\u2713 \u672C\u8BFE\u5DF2\u5B8C\u6210")}</span><strong>{tr(lesson.success)}</strong>{lessonIndex < GO_LESSONS.length-1 && <button className="primary" onClick={() => openLesson(lessonIndex + 1)}>{tr("\u8FDB\u5165\u4E0B\u4E00\u8BFE \u2192")}</button>}</div>}
      </section>
      {mobileTeacherOpen && <button type="button" className="teacher-backdrop" aria-label={tr("\u5173\u95ED\u672C\u8BFE\u8001\u5E08\u9762\u677F")} onClick={() => setMobileTeacherOpen(false)}/>}
      <aside id="academy-go-teacher" className={`academy-teacher ${mobileTeacherOpen ? 'mobile-teacher-open' : ''}`} aria-label={tr("\u56F4\u68CB\u8001\u5E08\u6559\u5B66\u9762\u677F")}>
        <div className="teacher-drawer-top"><strong>{tr("\u7B2C ")}{String(lesson.id).padStart(2, '0')}{tr(" \u8BFE \u00B7 \u8001\u5E08\u8BB2\u89E3")}</strong><button type="button" className="teacher-close" onClick={() => setMobileTeacherOpen(false)}>{tr("\u6536\u8D77 \u2715")}</button></div>
        <div className="academy-teacher-heading"><span>{tr("\u5E08")}</span><div><small>YOUR PERSONAL GO TEACHER</small><h3>{tr("\u56F4\u68CB\u8001\u5E08 \u00B7 \u968F\u5C40\u8BB2\u89E3")}</h3></div></div>
        <div className="academy-section"><span className="academy-caption">{tr("\u672C\u8282\u8981\u61C2\u7684\u9053\u7406")}</span><p>{tr(lesson.why)}</p></div>
        <div className="academy-speech"><span>{tr("\u8001\u5E08\u6B63\u5728\u8BF4")}</span><p aria-live="polite">{tr(feedback)}</p></div>
        {selectedGroup && <div className="academy-section academy-inspection"><span className="academy-caption">{tr("\u70B9\u68CB\u770B\u6C14")}</span><p>{tr("\u8FD9\u5757")}{tr(selectedGroup.color === 1 ? '黑棋' : '白棋')}{tr("\u6709 ")}<strong>{selectedGroup.stones.length}</strong>{tr(" \u5B50\u3001")}<strong>{selectedGroup.liberties.length}</strong>{tr(" \u53E3\u6C14\u3002")}</p><small>{tr("\u84DD\u8272\u5706\u70B9\u662F\u5B83\u4EEC\u7684\u6C14\uFF1B\u53EA\u5269\u4E00\u53E3\u6C14\u5C31\u88AB\u53EB\u5403\u3002")}</small></div>}
        <div className="academy-section"><span className="academy-caption">{tr("\u63A8\u8350\u62DB\u5F0F\u4E0E\u539F\u56E0")}</span>
          {myTurn && firstCorrect === null ? <>
            <p>{tr("\u672C\u8BFE\u4F18\u5148\u5BFB\u627E")}<span className="academy-focus">{lang==='en'?'“':'「'}{tr(lesson.title)}{lang==='en'?'”':'」'}</span>{tr("\u7684\u5173\u952E\u4E00\u624B\uFF0C\u5B8C\u6210\u540E\u7535\u8111\u5C06\u5E94\u68CB\u3002")}</p>
            <button className="secondary academy-hint-button" onClick={() => setTipShown(old => !old)}>{tr(tipShown ? '收起思路提示' : '展开思路提示')}</button>
            {tipShown && <p className="academy-teacher-note">{tr(lesson.hint)}</p>}
            <button className="secondary academy-hint-button" onClick={() => setShowAnswer(old => !old)}>{tr(showAnswer ? '隐藏具体推荐位置' : '显示具体推荐位置')}</button>
            {showAnswer && <p className="academy-teacher-note">{lesson.goal === 'pass' ? tr('请使用棋盘下方的“虚手 PASS”。') : lang==='en'?`Try ${goalTargets.map(index=>coordinate(index,practice.size)).join(' / ')}. ${tr(lesson.why)}`:`推荐先试 ${goalTargets.map(index=>coordinate(index,practice.size)).join(' / ')}。${lesson.why}`}<br />{tr("\u68CB\u76D8\u4E0A\u7684\u7EFF\u8272\u5708\u6807\u51FA\u5176\u4E2D\u4E00\u4E2A\u5019\u9009\u70B9\u3002")}</p>}
          </> : myTurn && analysis?.moves.length ? <>
            <p>{tr(analysis.summary)}</p>
            {analysis.moves.slice(0, 2).map(item => <div className="academy-move-tip" key={item.index}><strong>{item.coordinate} · {tr(item.title)}</strong><p>{tr(item.reason)}</p><button onClick={() => setSelected(item.index)} className="secondary">{tr("\u9884\u89C8\u8FD9\u624B")}</button></div>)}
          </> : <p>{tr("\u73B0\u5728\u89C2\u5BDF\u7535\u8111 AI \u7684\u56DE\u5E94\uFF1B\u5B83\u4F1A\u9075\u5B88\u540C\u4E00\u5957\u56F4\u68CB\u843D\u5B50\u4E0E\u63D0\u5B50\u89C4\u5219\u3002")}</p>}
        </div>
        {practice.lastAiExplanation && <div className="academy-section academy-ai-comment"><span className="academy-caption">{tr("\u7535\u8111\u521A\u624D\u4E3A\u4EC0\u4E48\u8FD9\u4E48\u4E0B\uFF1F")}</span>
          <p>{tr('白棋走在 ')}<strong>{practice.lastAiExplanation.coordinate}</strong>{lang==='en'?'. ':'。'}{tr(practice.lastAiExplanation.reason)}</p></div>}
        <div className="academy-section"><span className="academy-caption">{tr("\u4ECE\u8FD9\u4E00\u5C0F\u65B9\u6CD5\u62D3\u5C55\u5F00\u6765")}</span><p>{tr(lesson.expand)}</p></div>
        <div className="academy-section academy-mistake"><span className="academy-caption">{tr("\u672C\u8BFE\u6613\u9519\u70B9")}</span><p>{tr(lesson.mistake)}</p></div>
        <p className="academy-disclaimer">{tr("\u6559\u5B66\u5EFA\u8BAE\u4F7F\u7528\u89C4\u5219\u4E0E\u5C40\u90E8\u68CB\u5F62\u542F\u53D1\u5F0F\u7B97\u6CD5\uFF0C\u4E0D\u4FDD\u8BC1\u6BCF\u624B\u4E3A\u5168\u5C40\u6700\u4F18\u3002\u5B8C\u6210\u8FDB\u5EA6\u4EC5\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668\uFF1B\u771F\u4EBA\u8054\u673A\u529F\u80FD\u4FDD\u6301\u72EC\u7ACB\u3002")}</p>
      </aside>
    </div>
    <footer>{tr("\u5341\u4E94\u8BFE\u56F4\u68CB\u8BAD\u7EC3\u8425 \u00B7 \u72EC\u7ACB\u6559\u5B66\u6A21\u5757 \u00B7 \u4E0D\u5F71\u54CD\u771F\u4EBA\u8054\u673A\u4E0E\u81EA\u7531\u4EBA\u673A\u5BF9\u5C40")}</footer>
  </main>;
}
