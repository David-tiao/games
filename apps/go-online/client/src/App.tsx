import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { getMe, getServerUrl, login, register } from './lib/api';
import { createGameSocket } from './lib/socket';
import GoBoard from './components/GoBoard';
import Academy from './academy/Academy';
import Methodology from './methodology/Methodology';
import AlgorithmLab from './algorithm/AlgorithmLab';
import { analyzePosition } from '../../shared/goCoach.js';
import { groupAt } from '../../shared/goRules.js';
import type { CoachAnalysis, MoveSuggestion } from '../../shared/goCoach.js';
import { aiStep, createPractice, enterPracticeScoring, finishPractice, passPractice, playPracticeMove, resignPractice, resumePractice, togglePracticeDead } from './lib/localGo';
import type { AiDifficulty, PracticeGame } from './lib/localGo';
import type { Ack, RoomState, User } from './types';
import {useLanguage} from './i18n';
const TOKEN = 'go_online_token', ROOM = 'go_online_room';
const WAIT_SECONDS = 35;
const TEACHER_SIDE_KEY = 'go_teacher_side_v1';
type Connection = 'checking' | 'online' | 'offline';
type PlayMode = 'ai' | 'online' | null;
type TeacherSide = 'left' | 'right';
const colorName = (color: 1 | 2) => color === 1 ? '黑棋' : '白棋';
const initialInvite = () => new URLSearchParams(window.location.search).get('room')?.toUpperCase().slice(0, 6) || '';
const initialTeacherSide = (): TeacherSide => {
    try {
        const saved = localStorage.getItem(TEACHER_SIDE_KEY);
        return saved === 'right' ? 'right' : 'left';
    }
    catch {
        return 'left';
    }
};
function rpc<T>(socket: Socket | null, event: string, payload: unknown = {}): Promise<Ack<T>> {
    return new Promise(resolve => {
        if (!socket?.connected) {
            resolve({ ok: false, error: '尚未连接服务器。' });
            return;
        }
        socket.timeout(8000).emit(event, payload, (error: Error | null, result: Ack<T>) => {
            resolve(error ? { ok: false, error: '服务器响应超时，请检查连接。' } : result);
        });
    });
}
export default function App() {
    const {lang,setLang,tr}=useLanguage();
    const [network, setNetwork] = useState<Connection>('checking');
    const [academyOpen, setAcademyOpen] = useState(false);
    const [methodologyOpen,setMethodologyOpen] = useState(false);
    const [algorithmOpen,setAlgorithmOpen] = useState(false);
    const [mobileTeacherOpen, setMobileTeacherOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null), [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
    const [username, setUsername] = useState(''), [password, setPassword] = useState('');
    const [mode, setMode] = useState<PlayMode>(null), [room, setRoom] = useState<RoomState | null>(null);
    const [practice, setPractice] = useState<PracticeGame | null>(null);
    const [size, setSize] = useState<9 | 13 | 19>(9), [difficulty, setDifficulty] = useState<AiDifficulty>('beginner');
    const [code, setCode] = useState(initialInvite), [notice, setNotice] = useState('');
    const [connected, setConnected] = useState(false), [selected, setSelected] = useState<number | null>(null);
    const [coach, setCoach] = useState<CoachAnalysis | null>(null);
    const [showCoach, setShowCoach] = useState(true), [hintMarker, setHintMarker] = useState(true);
    const [teacherSide, setTeacherSide] = useState<TeacherSide>(initialTeacherSide);
    const [inspected, setInspected] = useState<number | null>(null);
    const [aiAnnouncement, setAiAnnouncement] = useState<string | null>(null);
    const [waitSeconds, setWaitSeconds] = useState(WAIT_SECONDS), [autoFallback, setAutoFallback] = useState(true);
    const sock = useRef<Socket | null>(null), swapping = useRef(false), didOfflineAuto = useRef(false), quickPlacing = useRef(false);
    const game = mode === 'ai' ? practice : mode === 'online' ? room : null;
    const isAi = mode === 'ai';
    const me = game?.players.find(p => isAi ? p.color === 1 : p.userId === user?.id);
    const myTurn = !!(game?.status === 'playing' && me?.color === game.turn && (isAi || connected));
    const black = game?.players.find(p => p.color === 1), white = game?.players.find(p => p.color === 2);
    const localCoach = useMemo(() => practice && practice.status === 'playing' && practice.turn === 1 ?
        analyzePosition(practice.board, practice.size, 1, practice.history) : null, [practice?.board, practice?.size, practice?.turn, practice?.status, practice?.history]);
    const analysis = isAi ? localCoach : coach;
    const suggested = showCoach && myTurn ? analysis?.moves ?? [] : [];
    const groupInfo = useMemo(() => game && inspected !== null && game.board[inspected]
        ? groupAt(game.board, inspected, game.size) : null, [game?.board, game?.size, inspected]);
    useEffect(() => {
        if (!mobileTeacherOpen)
            return;
        const close = (event: KeyboardEvent) => { if (event.key === 'Escape')
            setMobileTeacherOpen(false); };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [mobileTeacherOpen]);
    useEffect(() => { try {
        localStorage.setItem(TEACHER_SIDE_KEY, teacherSide);
    }
    catch { /* ignore */ } }, [teacherSide]);
    const setRoomState = useCallback((r: RoomState) => {
        setRoom(r);
        localStorage.setItem(ROOM, r.code);
        setSelected(null);
        setInspected(null);
    }, []);
    const clearRoom = useCallback(() => {
        setRoom(null);
        localStorage.removeItem(ROOM);
        setSelected(null);
        setInspected(null);
    }, []);
    const launchAi = useCallback((chosenSize: 9 | 13 | 19, why: string, level: AiDifficulty = difficulty) => {
        setRoom(null);
        localStorage.removeItem(ROOM);
        setSelected(null);
        setInspected(null);
        setCoach(null);
        setPractice(createPractice(chosenSize, level, user?.username || '你'));
        setMode('ai');
        setNotice('');
        setAiAnnouncement(why);
    }, [difficulty, user?.username]);
    useEffect(() => {
        let alive = true;
        async function ping() {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            try {
                const response = await fetch(`${getServerUrl()}/api/health`, { signal: controller.signal, cache: 'no-store' });
                if (alive)
                    setNetwork(response.ok ? 'online' : 'offline');
            }
            catch {
                if (alive)
                    setNetwork('offline');
            }
            finally {
                clearTimeout(timeout);
            }
        }
        void ping();
        const interval = setInterval(() => { void ping(); }, 10000);
        return () => { alive = false; clearInterval(interval); };
    }, []);
    useEffect(() => {
        const saved = localStorage.getItem(TOKEN);
        if (!saved) {
            setLoading(false);
            return;
        }
        let active = true;
        const loadTimeout = setTimeout(() => { if (active)
            setLoading(false); }, 4500);
        getMe(saved).then(value => {
            if (active) {
                setToken(saved);
                setUser(value.user);
            }
        }).catch(() => {
            // Do not wipe a session on a temporary network error.
        }).finally(() => { clearTimeout(loadTimeout); if (active)
            setLoading(false); });
        return () => { active = false; clearTimeout(loadTimeout); };
    }, []);
    useEffect(() => {
        if (network !== 'online' || user || token)
            return;
        const saved = localStorage.getItem(TOKEN);
        if (!saved)
            return;
        let active = true;
        getMe(saved).then(value => { if (active) {
            setToken(saved);
            setUser(value.user);
        } }).catch(() => { });
        return () => { active = false; };
    }, [network, user, token]);
    useEffect(() => {
        if (network === 'offline' && !didOfflineAuto.current && mode === null && !academyOpen && !methodologyOpen && !algorithmOpen) {
            didOfflineAuto.current = true;
            launchAi(size, '没有连接到围棋服务器，已自动创建一盘离线人机练习。你的对手是本地电脑 AI，不是真人。');
        }
        if (network === 'online')
            didOfflineAuto.current = false;
    }, [network, mode, size, launchAi, academyOpen, methodologyOpen, algorithmOpen]);
    useEffect(() => {
        if (!token)
            return;
        const socket = createGameSocket(token);
        sock.current = socket;
        socket.on('connect', () => {
            setConnected(true);
            const saved = localStorage.getItem(ROOM);
            if (saved)
                socket.emit('room:rejoin', { code: saved }, (res: Ack<RoomState>) => {
                    if (res?.ok && res.data) {
                        setRoomState(res.data);
                        setMode(current => current === 'ai' ? 'ai' : 'online');
                    }
                    else
                        clearRoom();
                });
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (error: Error) => {
            setConnected(false);
            setNotice(error.message.includes('UNAUTHORIZED') ? '登录会话已失效，请重新登录。' : '真人服务器连接中断；目前的真人棋局已暂停，不会偷偷换成 AI。');
        });
        socket.on('room:state', (state: RoomState) => setRoomState(state));
        socket.on('room:closed', () => { clearRoom(); setNotice('房间已关闭。'); });
        socket.connect();
        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            if (sock.current === socket)
                sock.current = null;
        };
    }, [token, setRoomState, clearRoom]);
    useEffect(() => {
        if (mode !== 'online' || !room || room.status !== 'playing' || !myTurn || !connected) {
            setCoach(null);
            return;
        }
        let active = true;
        void rpc<CoachAnalysis>(sock.current, 'coach:analyze').then(result => {
            if (active)
                setCoach(result.ok && result.data ? result.data : null);
        });
        return () => { active = false; };
    }, [mode, room?.code, room?.moveNumber, room?.turn, room?.status, myTurn, connected]);
    useEffect(() => {
        if (mode !== 'online' || room?.status !== 'waiting' || !autoFallback) {
            setWaitSeconds(WAIT_SECONDS);
            return;
        }
        setWaitSeconds(WAIT_SECONDS);
        const interval = setInterval(() => setWaitSeconds(sec => Math.max(0, sec - 1)), 1000);
        return () => clearInterval(interval);
    }, [mode, room?.code, room?.status, autoFallback]);
    useEffect(() => {
        if (mode !== 'online' || room?.status !== 'waiting' || !autoFallback || waitSeconds > 0 || swapping.current)
            return;
        swapping.current = true;
        const chosenSize = room.size;
        void (async () => {
            if (connected) {
                const response = await rpc<{
                    code: string;
                    closed: boolean;
                }>(sock.current, 'room:leave-if-waiting');
                if (!response.ok) {
                    setNotice(response.error || '好友可能已进入，已取消自动人机切换。');
                    setAutoFallback(false);
                    swapping.current = false;
                    return;
                }
            }
            launchAi(chosenSize, connected ?
                '等待 35 秒仍无人加入真人房间，因此已自动创建一盘新的人机练习。现在与你下棋的是电脑 AI，不是真人。' :
                '与真人服务器断开了连接，已另开一盘本地 AI 练习。原真人房间不会同步进这盘棋。');
            swapping.current = false;
        })();
    }, [mode, room?.status, room?.code, room?.size, autoFallback, waitSeconds, connected, launchAi]);
    useEffect(() => {
        if (mode !== 'ai' || !practice || practice.status !== 'playing' || practice.turn !== 2 || aiAnnouncement)
            return;
        const timer = setTimeout(() => {
            setPractice(current => {
                if (!current || current.status !== 'playing' || current.turn !== 2)
                    return current;
                try {
                    return aiStep(current);
                }
                catch {
                    return current;
                }
            });
        }, 750);
        return () => clearTimeout(timer);
    }, [mode, practice, aiAnnouncement]);
    async function auth(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setNotice('');
        try {
            const response = authMode === 'register' ? await register(username.trim(), password) : await login(username.trim(), password);
            localStorage.setItem(TOKEN, response.token);
            setToken(response.token);
            setUser(response.user);
            setPassword('');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : '登录失败。');
        }
        finally {
            setBusy(false);
        }
    }
    async function logout() {
        if (mode === 'online' && room && connected)
            await rpc(sock.current, 'room:leave');
        sock.current?.disconnect();
        localStorage.removeItem(TOKEN);
        localStorage.removeItem(ROOM);
        setToken(null);
        setUser(null);
        setRoom(null);
        setMode(null);
        setNotice('');
        setPractice(null);
    }
    async function send(event: string, payload: unknown = {}) {
        setBusy(true);
        setNotice('');
        const response = await rpc<RoomState>(sock.current, event, payload);
        if (response.ok && response.data)
            setRoomState(response.data);
        else
            setNotice(response.error || '操作失败。');
        setBusy(false);
        return response.ok;
    }
    async function createRoom() {
        const ok = await send('room:create', { size });
        if (ok) {
            setAutoFallback(true);
            setMode('online');
            setPractice(null);
        }
    }
    async function joinRoom(event: FormEvent) {
        event.preventDefault();
        const ok = await send('room:join', { code: code.trim().toUpperCase() });
        if (ok) {
            setMode('online');
            setPractice(null);
            setAutoFallback(false);
        }
    }
    async function leaveGame() {
        if (mode === 'ai') {
            setPractice(null);
            setMode(null);
            setSelected(null);
            setAiAnnouncement(null);
            return;
        }
        if (room && !connected) {
            // Preserve the live game for reconnect; do not silently forfeit or convert it.
            setNotice('网络已断开。请等待重连，或明确选择“另开人机练习”。');
            return;
        }
        if (room) {
            const ok = await send('room:leave');
            if (!ok)
                return;
        }
        clearRoom();
        setMode(null);
    }
    async function startAiManually() {
        if (mode === 'online' && room) {
            if (!window.confirm(tr('离开当前真人房间并另外开始一盘人机练习？已经进行的真人对局不会继续同步。')))
                return;
            if (connected) {
                const ok = await send('room:leave');
                if (!ok)
                    return;
            }
            clearRoom();
        }
        launchAi(size, '你已选择人机教学模式。对手是本地规则型电脑 AI，不是真人玩家。');
    }
    function inspectStone(index: number) {
        if (!game || game.status === 'scoring' || !game.board[index])
            return;
        setInspected(previous => previous === index ? null : index);
    }
    function place(index: number) {
        if (!game)
            return;
        if (game.status === 'scoring') {
            if (isAi) {
                try {
                    if (practice)
                        setPractice(togglePracticeDead(practice, index));
                }
                catch (error) {
                    setNotice(String(error));
                }
            }
            else if (connected)
                void send('game:mark-dead', { index });
            return;
        }
        if (myTurn && game.board[index] === 0)
            setSelected(prev => prev === index ? null : index);
    }
    async function quickPlace(index: number) {
        if (!game || game.status !== 'playing' || !myTurn || game.board[index] !== 0 || busy || quickPlacing.current)
            return;
        quickPlacing.current = true;
        setSelected(index);
        try {
            if (isAi) {
                if (practice)
                    setPractice(playPracticeMove(practice, index, 1));
                setSelected(null);
                setInspected(null);
                setNotice('已通过双击快速落子。');
            }
            else {
                const response = await rpc<RoomState>(sock.current, 'game:move', { index });
                if (response.ok && response.data) {
                    setRoomState(response.data);
                    setNotice('已通过双击快速落子。');
                }
                else
                    setNotice(response.error || '快速落子失败。');
            }
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : '快速落子失败。');
        }
        finally {
            quickPlacing.current = false;
        }
    }
    async function move() {
        if (!game || !myTurn || selected === null)
            return;
        if (isAi) {
            try {
                if (practice)
                    setPractice(playPracticeMove(practice, selected, 1));
                setSelected(null);
                setInspected(null);
                setNotice('');
            }
            catch (error) {
                setNotice(error instanceof Error ? error.message : '落子无效。');
            }
        }
        else
            await send('game:move', { index: selected });
    }
    async function pass() {
        if (isAi) {
            try {
                if (practice)
                    setPractice(passPractice(practice, 1));
                setSelected(null);
            }
            catch (error) {
                setNotice(String(error));
            }
        }
        else
            await send('game:pass');
    }
    function learnScoring() {
        if (!isAi || !practice || practice.status !== 'playing')
            return;
        if (!window.confirm(tr('提前结束本地练习并进入数目教学？这是学习功能，不代表双方已经同意正常终局。')))
            return;
        setPractice(enterPracticeScoring(practice));
        setSelected(null);
        setInspected(null);
        setNotice('已进入教学数目：请标记你认为已死亡的棋块，再确认结算。');
    }
    async function resign() {
        if (!window.confirm(tr('确定认输并结束这盘棋吗？')))
            return;
        if (isAi)
            setPractice(g => g ? resignPractice(g) : g);
        else
            await send('game:resign');
    }
    async function confirmScore() {
        if (isAi) {
            try {
                if (practice)
                    setPractice(finishPractice(practice));
            }
            catch (error) {
                setNotice(String(error));
            }
        }
        else
            await send('game:confirm-score');
    }
    async function resume() {
        if (isAi) {
            try {
                if (practice)
                    setPractice(resumePractice(practice));
            }
            catch (error) {
                setNotice(String(error));
            }
        }
        else
            await send('game:resume');
    }
    async function rematch() {
        if (isAi) {
            setPractice(createPractice(game?.size || 9, difficulty, user?.username || '你'));
            setSelected(null);
        }
        else
            await send('game:rematch');
    }
    async function share() {
        if (!room)
            return;
        const url = new URL(window.location.href);
        url.searchParams.set('room', room.code);
        try {
            if (navigator.share) {
                await navigator.share({ title: '围棋 Online 邀请', text: `房间号 ${room.code}`, url: url.toString() });
                return;
            }
            await navigator.clipboard.writeText(url.toString());
            setNotice('真人房间邀请已复制，发给朋友即可。');
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError')
                return;
            window.prompt(tr('复制邀请链接：'), url.toString());
        }
    }
    function statusText() {
        if (!game)
            return '';
        if (game.status === 'waiting')
            return '正在等待真人好友加入';
        if (game.status === 'scoring')
            return '双方虚手后进入数目阶段';
        if (game.status === 'finished') {
            if (game.result === 'resign')
                return `${colorName(game.winner || 2)}胜 · 认输结束`;
            return `${game.winner ? colorName(game.winner) + '获胜' : '平局'} · ${game.score?.margin.toFixed(1) || '0'} 目`;
        }
        if (isAi)
            return myTurn ? '轮到你（黑棋）落子' : '电脑 AI 正在思考（白棋）';
        return myTurn ? '轮到你落子' : `等待${colorName(game.turn)}落子`;
    }
    if (algorithmOpen)
        return <AlgorithmLab onExit={()=>setAlgorithmOpen(false)} teacherSide={teacherSide} onChangeTeacherSide={setTeacherSide}/>;
    // Keep the lesson component mounted while a learner temporarily visits the
    // methodology library, so an unfinished exercise is not reset on return.
    if (academyOpen)
        return <>
          <div hidden={methodologyOpen}><Academy onExit={() => setAcademyOpen(false)} name={user?.username || '游客'} teacherSide={teacherSide} onChangeTeacherSide={setTeacherSide} onOpenMethodology={()=>setMethodologyOpen(true)}/></div>
          {methodologyOpen&&<Methodology onExit={()=>setMethodologyOpen(false)} teacherSide={teacherSide} onChangeTeacherSide={setTeacherSide}/>}
        </>;
    if (methodologyOpen)
        return <Methodology onExit={()=>setMethodologyOpen(false)} teacherSide={teacherSide} onChangeTeacherSide={setTeacherSide}/>;
    if (loading || network === 'checking' && mode === null)
        return <div className="loading">{tr("\u6B63\u5728\u68C0\u67E5\u56F4\u68CB\u670D\u52A1\u5668\u2026")}</div>;
    const loginScreen = mode === null && network === 'online' && (!user || !token);
    if (loginScreen)
        return <main className="login-page"><section className="auth-card">
    <div className="language-top"><button type="button" className="language-switch" onClick={() => setLang(lang==='zh'?'en':'zh')} aria-label="Switch language / 切换语言">{lang==='zh'?'English / EN':'中文 / ZH'}</button></div>
    <div className="brand"><div className="brand-mark">{tr("\u7881")}</div><div><span className="eyebrow">LEARN · PLAY · UNDERSTAND</span><h1>{tr("\u56F4\u68CB\u5B66\u5802 Online")}</h1></div></div>
    <p className="muted">{tr("\u548C\u597D\u53CB\u771F\u4EBA\u8054\u7F51\uFF0C\u6216\u9009\u62E9\u89C4\u5219\u578B AI \u81EA\u5DF1\u7EC3\u4E60\u3002\u6BCF\u624B\u90FD\u6709\u65C1\u8FB9\u7684\u56F4\u68CB\u8001\u5E08\u89E3\u91CA\u3002")}</p>
    <div className="tabs"><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>{tr("\u6CE8\u518C")}</button><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>{tr("\u767B\u5F55")}</button></div>
    <form className="stack" onSubmit={auth}>
      <label>{tr("\u7528\u6237\u540D ")}<input value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={18} placeholder={tr("3\uFF5E18 \u4F4D\u82F1\u6587\u3001\u6570\u5B57\u6216\u4E0B\u5212\u7EBF")} autoComplete="username" required/></label>
      <label>{tr("\u5BC6\u7801 ")}<input value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={128} placeholder={tr("\u81F3\u5C11 8 \u4F4D")} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} type="password" required/></label>
      <button className="primary wide" disabled={busy}>{tr(busy ? '正在处理…' : authMode === 'register' ? '注册并进入' : '登录')}</button>
    </form>
    <div className="separate">{tr("\u6216\u8005\u65E0\u9700\u8D26\u53F7")}</div>
    <button className="secondary wide" onClick={() => launchAi(size, '你正在进入人机教学模式。对手是电脑 AI，不是真人玩家。')}>{tr("\u76F4\u63A5\u5F00\u59CB\u4EBA\u673A\u56F4\u68CB\u6559\u5B66")}</button>
    <button className="secondary wide" style={{ marginTop: 10 }} onClick={() => setAcademyOpen(true)}>{lang==='en'?'Enter 50 guided lessons (no sign-in)':'进入五十课围棋训练营（无需登录）'}</button>
    <button className="secondary wide" style={{marginTop:10}} onClick={()=>setMethodologyOpen(true)}>{lang==='en'?'Explore Go methodology & replay records (no sign-in)':'直接学习围棋方法论 · 棋谱演示（无需登录）'}</button>
    <button className="secondary wide" style={{marginTop:10}} onClick={()=>setAlgorithmOpen(true)}>{lang==='en'?'Try Algorithm Lab (offline AI, no sign-in)':'进入围棋算法实验室 · 边下边看算法（无需登录）'}</button>
    {notice && <p className="alert" role="alert">{tr(notice)}</p>}
    <p className="tiny">{tr("\u521D\u5B66\u8005\u63A8\u8350 9 \u8DEF\u68CB\u76D8 \u00B7 \u6559\u5B66\u63D0\u793A\u53EF\u81EA\u884C\u5F00\u5173")}</p>
  </section></main>;
    return <main className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark small">{tr("\u7881")}</div><div><span className="eyebrow">GO CLASSROOM</span><h2>{tr("\u56F4\u68CB\u5B66\u5802")}</h2></div></div>
      <div className="headright"><button type="button" className="language-switch" onClick={() => setLang(lang==='zh'?'en':'zh')} aria-label="Switch language / 切换语言">{lang==='zh'?'English / EN':'中文 / ZH'}</button><span className={`connected ${network === 'online' ? 'yes' : 'no'}`}><i />{tr(network === 'online' ? '服务器在线' : '离线')}</span><span className="username">{user?.username || tr('游客')}</span>{user && <button className="plain" onClick={logout}>{tr("\u9000\u51FA\u767B\u5F55")}</button>}</div>
    </header>

    {!game ? <section className="lobby">
      <div className="welcome"><span className="eyebrow">START HERE · BEGINNER FRIENDLY</span><h1>{tr("\u4E00\u8FB9\u4E0B\u68CB\uFF0C")}<em>{tr("\u4E00\u8FB9\u5B66\u56F4\u68CB\u3002")}</em></h1>
        <p>{tr("\u5DE6\u8FB9\u4E0B\u68CB\uFF0C\u53F3\u8FB9\u8001\u5E08\u770B\u5C40\u52BF\u7ED9\u51FA\u53EF\u89E3\u91CA\u7684\u63A8\u8350\u3002\u63A8\u8350\u4E0D\u4FDD\u8BC1\u6700\u4F18\uFF0C\u4F46\u4F1A\u6559\u4F60\u5224\u65AD\u201C\u6C14\u201D\u3001\u63D0\u5B50\u3001\u8FDE\u63A5\u548C\u56F4\u5730\u3002")}</p></div>
      <div className="lesson-banner"><strong>{tr("\u5165\u95E8\u987A\u5E8F")}</strong><span>{tr("\u2460 \u8BA4\u8BC6\u6C14\u4E0E\u63D0\u5B50")}</span><span>{tr("\u2461 \u5B66\u4F1A\u89D2\u8FB9\u5E03\u5C40")}</span><span>{tr("\u2462 \u7EC3\u4E60\u53EB\u5403\u4E0E\u9003\u8DD1")}</span><span>{tr("\u2463 \u53CC\u65B9\u865A\u624B\u540E\u6570\u76EE")}</span></div>
      <div className="setup-row"><div><strong>{tr("\u68CB\u76D8\u5927\u5C0F")}</strong><small>{tr("\u65B0\u624B\u4ECE 9 \u8DEF\u5F00\u59CB")}</small></div>
        <div className="sizes">{([9, 13, 19] as const).map(n => <button key={n} className={size === n ? 'active' : ''} onClick={() => setSize(n)}>{n}{tr(" \u8DEF")}</button>)}</div>
      </div>
      <div className="academy-entry">
        <div className="academy-entry-seal">{tr("\u8BFE")}</div>
        <div><span className="eyebrow">NEW · FIFTY GUIDED LESSONS</span><h2>{(lang==='en'?'50 Go Lessons · From Basics to Endgame':'围棋五十课 · 从数气到主流棋形')}</h2>
          <p>{(lang==='en'?'50 focused positions on 9×9, 13×13 and 19×19 boards, each with a clear first-move task against a teaching AI. Previous progress is preserved.':'50 个专题练习，涵盖 9、13、19 路棋盘。每课和电脑 AI 练习关键第一手，原十五课进度保留。')}</p></div>
        <button className="primary" onClick={() => setAcademyOpen(true)}>{(lang==='en'?'Start 50 lessons →':'开始五十课 →')}</button>
      </div>
      <div className="academy-entry methodology-entry">
        <div className="academy-entry-seal">法</div>
        <div><span className="eyebrow">GO METHODOLOGY · REPLAY LIBRARY</span><h2>{lang==='en'?'Go Methodology · Move-by-move Replay':'围棋方法论 · 一步一步看棋谱'}</h2>
          <p>{lang==='en'?'16 original visual study sequences with explanations: from atari, ladders and eyes to opening direction and endgame. No lessons or sign-in required.':'独立学习模块，16 套原创示范棋谱，包含征子、枷吃、眼形、布局、收官等方法。可逐手播放、回退和复制 SGF。'}</p></div>
        <button className="primary" onClick={()=>setMethodologyOpen(true)}>{lang==='en'?'Explore methods →':'直接查看方法论 →'}</button>
      </div>
      <div className="academy-entry algorithm-entry">
        <div className="academy-entry-seal">算</div>
        <div><span className="eyebrow">EXPLAINABLE GO · LIVE TRACE</span><h2>{lang==='en'?'Go Algorithm Lab · See how AI picks moves':'围棋算法实验室 · 看懂 AI 每一步'}</h2>
          <p>{lang==='en'?'Play the actual local Go AI while inspecting legal candidates, score heatmaps, weight breakdowns and the exact chosen reply. No account or internet required.':'独立的人机练习。实时显示合法落点、启发式分数热力图、提子与救棋等加减分，以及 AI 实际选择落点的过程。无需登录或联网。'}</p></div>
        <button className="primary" onClick={()=>setAlgorithmOpen(true)}>{lang==='en'?'Open Algorithm Lab →':'进入算法实验室 →'}</button>
      </div>
      <div className="lobbycards">
        <article className="panel"><span className="eyebrow">PRACTICE WITH AI</span><h2>{tr("\u8DDF\u7535\u8111 AI \u5B66\u4E60")}</h2>
          <p className="muted">{tr("\u4E0D\u9700\u8981\u8054\u7F51\u3001\u4E0D\u9700\u8981\u5176\u4ED6\u73A9\u5BB6\u3002\u4F60\u6267\u9ED1\u68CB\uFF1B\u8001\u5E08\u8FB9\u63A8\u8350\u8FB9\u8BB2\u539F\u56E0\u3002")}</p>
          <label className="small-label">{tr("\u7535\u8111\u96BE\u5EA6 ")}<select value={difficulty} onChange={e => setDifficulty(e.target.value as AiDifficulty)}><option value="beginner">{tr("\u5165\u95E8 AI \u00B7 \u66F4\u9002\u5408\u7EC3\u4E60")}</option><option value="standard">{tr("\u6807\u51C6 AI \u00B7 \u7A0D\u5F3A\u4E00\u4E9B")}</option></select>
          </label>
          <button className="primary wide" onClick={startAiManually}>{tr("\u5F00\u59CB\u4EBA\u673A\u6559\u5B66\u5BF9\u5C40")}</button>
          <p className="tiny">{tr("\u660E\u786E\u8BF4\u660E\uFF1A\u8FD9\u662F\u89C4\u5219\u578B\u7535\u8111\u7A0B\u5E8F\uFF0C\u4E0D\u662F\u771F\u4EBA\uFF0C\u4E5F\u4E0D\u662F\u804C\u4E1A\u7EA7\u56F4\u68CB\u5F15\u64CE\u3002")}</p>
        </article>
        <article className="panel"><span className="eyebrow">PLAY WITH A FRIEND</span><h2>{tr("\u771F\u4EBA\u8054\u7F51\u5BF9\u5F08")}</h2>
          <p className="muted">{tr("\u4E24\u4F4D\u771F\u4EBA\u4F7F\u7528\u4E0D\u540C\u8D26\u53F7\uFF0C\u8FDE\u63A5\u540C\u4E00\u670D\u52A1\u5668\u3002\u7B49\u5F85 35 \u79D2\u65E0\u4EBA\u52A0\u5165\uFF0C\u4F1A\u660E\u786E\u63D0\u793A\u5E76\u5F00\u59CB\u4E00\u76D8\u65B0\u7684\u4EBA\u673A\u7EC3\u4E60\u3002")}</p>
          <button className="primary wide" onClick={createRoom} disabled={!connected || busy}>{tr("\u521B\u5EFA\u771F\u4EBA\u79C1\u4EBA\u623F\u95F4")}</button>
          <form onSubmit={joinRoom} className="join-form"><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={tr("\u8F93\u5165 6 \u4F4D\u623F\u95F4\u53F7")} maxLength={6} required/>
            <button className="secondary" disabled={!connected || busy || code.length !== 6}>{tr("\u52A0\u5165\u597D\u53CB")}</button></form>
          {!connected && <p className="tiny">{tr(user ? '正在等待联网登录连接。' : '需要先注册或登录才能与真人对弈。')}</p>}
        </article>
      </div>
      {notice && <p className="alert" role="alert">{tr(notice)}</p>}
    </section> : <section className="match">
      <div className="match-header"><div><span className="eyebrow">{game.size}×{game.size} · BEGINNER GO LESSON</span><h1>{tr("\u56F4\u68CB\u6559\u5B66\u5BF9\u5C40")}</h1>
        <div className="match-sub"><span className={`mode-pill ${isAi ? 'ai' : 'human'}`}>{tr(isAi ? '电脑 AI 对手 · 不是人类玩家' : '双人真人联网 · LIVE')}</span>
          {!isAi && <span className="roomcode">{tr("\u623F\u95F4\u53F7 ")}<strong>{game.code}</strong><button className="chip" onClick={share}>{tr("\u5206\u4EAB\u9080\u8BF7")}</button></span>}
        </div></div>
        <div className="academy-match-tools">{isAi && <button className="secondary" onClick={() => setAcademyOpen(true)}>{lang==='en'?'50 lessons':'去五十课学堂'}</button>}<button className="secondary" onClick={()=>setMethodologyOpen(true)}>{lang==='en'?'Methodology':'方法论棋谱'}</button><button className="secondary" onClick={()=>setAlgorithmOpen(true)}>{lang==='en'?'Algorithm Lab':'算法实验室'}</button>
        <button className="secondary" onClick={() => setTeacherSide(side => side === 'left' ? 'right' : 'left')}>{tr("\u8001\u5E08\u5728")}{tr(teacherSide === 'left' ? '左侧' : '右侧')}</button>
        <button className="secondary" onClick={() => void leaveGame()}>{tr("\u9000\u51FA\u68CB\u76D8")}</button></div>
      </div>
      {mode === 'online' && game.status === 'waiting' && <div className="notice-panel">
        <strong>{tr("\u6B63\u5728\u7B49\u5F85\u7B2C\u4E8C\u4F4D\u771F\u4EBA\u73A9\u5BB6")}</strong>
        <span>{tr("\u628A\u623F\u95F4\u53F7\u5206\u4EAB\u7ED9\u670B\u53CB\u3002")}{tr(autoFallback ? `如果 ${waitSeconds} 秒内没人加入，将自动开始一盘全新的人机练习，并在开始前说明对手身份。` : '你已选择一直等待真人。')}</span>
        {autoFallback ? <button className="secondary" onClick={() => setAutoFallback(false)}>{tr("\u4E00\u76F4\u7B49\u5F85\u771F\u4EBA")}</button> : <button className="secondary" onClick={() => setAutoFallback(true)}>{tr("\u6062\u590D\u81EA\u52A8\u4EBA\u673A\u5019\u8865")}</button>}
        <button className="secondary" onClick={() => void startAiManually()}>{tr("\u73B0\u5728\u8F6C\u4E3A\u4EBA\u673A")}</button>
      </div>}
      {mode === 'online' && !connected && <div className="notice-panel disconnected-warning"><strong>{tr("\u771F\u4EBA\u670D\u52A1\u5668\u6682\u65F6\u65AD\u5F00")}</strong>
        <span>{tr("\u771F\u4EBA\u68CB\u5C40\u5DF2\u6682\u505C\uFF0C\u7CFB\u7EDF\u4E0D\u4F1A\u5192\u5145\u5BF9\u624B\u3002\u53EF\u7B49\u5F85\u91CD\u8FDE\uFF0C\u6216\u53E6\u5F00\u4E00\u76D8\u660E\u786E\u6807\u8BB0\u7684\u4EBA\u673A\u7EC3\u4E60\u3002")}</span>
        <button className="secondary" onClick={() => void startAiManually()}>{tr("\u53E6\u5F00\u4EBA\u673A\u7EC3\u4E60")}</button></div>}
      {isAi && network === 'online' && <div className="practice-online"><span>{tr("\u771F\u4EBA\u670D\u52A1\u5668\u5728\u7EBF\u3002\u5982\u60F3\u548C\u670B\u53CB\u4E0B\u68CB\uFF0C\u53EF\u4EE5\u9000\u51FA\u672C\u76D8\u5E76\u767B\u5F55\u3001\u521B\u5EFA\u771F\u4EBA\u623F\u95F4\u3002")}</span></div>}
      <button type="button" className="teacher-fab" aria-expanded={mobileTeacherOpen} aria-controls="free-go-teacher" onClick={() => setMobileTeacherOpen(true)}>{tr("\u5E08 \u00B7 \u770B\u8001\u5E08\u8BB2\u89E3")}</button>
      <div className={`game-layout teacher-${teacherSide}`}>
        <div className="board-area">
          <div className="board-top"><span>{tr(statusText())}</span><span>{game.moveNumber}{tr(" \u624B \u00B7 ")}{game.size}{tr(" \u8DEF")}</span></div>
          <GoBoard size={game.size} board={game.board} selected={selected} lastMove={game.lastMove} deadStones={game.deadStones} hintIndex={hintMarker && suggested.length ? suggested[0].index : null} inspectedStones={groupInfo?.stones || []} inspectedLiberties={groupInfo?.liberties || []} onInspect={inspectStone} mode={game.status === 'scoring' ? (isAi || connected ? 'scoring' : 'readonly') : myTurn ? 'play' : 'readonly'} onPoint={place} onQuickPoint={quickPlace}/>
          <p className="board-bottom">{tr(game.status === 'scoring' ? '数目阶段：点击整块死子来标记或取消；可以恢复对局。' : '单击空交叉点可预览下法，双击同一点可直接快速落子；点已有的棋子可查看它的“气”。淡绿色圆环是推荐位置，蓝色圆点表示棋块的气。')}</p>
          {game.status === 'playing' && <div className="mobile-hint">{tr(myTurn ? '轮到你：先观察老师推荐，再决定是否采纳。' : isAi ? '电脑 AI 走棋中…' : '等待对方落子…')}</div>}
          <div className="players">
            {([black, white] as const).map((p, i) => <div key={i} className={`player ${game.status === 'playing' && game.turn === i + 1 ? 'turn' : ''}`}>
              <span className={`disc ${i === 0 ? 'black' : 'white'}`}/><div><span className="eyebrow">{tr(i === 0 ? '黑棋 · BLACK' : '白棋 · WHITE')}</span>
                <strong>{p?.username ? tr(p.username) : tr('等待真人')}</strong><small>{tr(isAi && i === 1 ? '电脑程序 · 非真人' : p ? (p.connected ? '在线' : '暂时离线') : '尚未加入')}</small></div>
              <span className="prisoners">{tr("\u63D0\u5B50 ")}{i === 0 ? game.captured.black : game.captured.white}</span>
            </div>)}
          </div>
          {game.status === 'playing' && <div className="actions board-actions">
            <button className="primary wide" disabled={!myTurn || selected === null || busy} onClick={() => void move()}>{tr(" \u786E\u8BA4\u843D\u5B50")}{selected !== null ? (lang==='en' ? ` · row ${Math.floor(selected/game.size)+1}, col ${selected%game.size+1}` : ` · 第${Math.floor(selected/game.size)+1}行第${selected%game.size+1}列`) : ''}</button>
            <div className="split"><button className="secondary" disabled={!myTurn || busy} onClick={() => void pass()}>{tr("\u865A\u624B PASS")}</button>
              <button className="danger" disabled={busy || !isAi && !connected} onClick={() => void resign()}>{tr("\u8BA4\u8F93")}</button></div>
            {isAi && <button className="secondary wide" onClick={learnScoring}>{tr("\u63D0\u524D\u7ED3\u675F\u672C\u5730\u7EC3\u4E60\uFF0C\u5B66\u4E60\u6570\u76EE\uFF08\u6559\u5B66\u529F\u80FD\uFF09")}</button>}
          </div>}
          {game.status === 'scoring' && <div className="actions board-actions">
            <div className="preview">{tr("\u6682\u8BA1\uFF1A\u9ED1 ")}{game.previewScore?.black.toFixed(1)}{tr(" \u76EE \u00B7 \u767D ")}{game.previewScore?.white.toFixed(1)}{tr(" \u76EE\uFF08\u8D34\u76EE ")}{game.komi}）</div>
            <button className="primary wide" disabled={busy || !isAi && !connected || !isAi && game.scoreConfirmations.includes(user?.id || '')} onClick={() => void confirmScore()}>
              {tr(isAi ? '我已核对死子，确认数目' : game.scoreConfirmations.includes(user?.id || '') ? '已确认，等待另一位真人' : '确认数目（双方都确认后结束）')}</button>
            <button className="secondary wide" disabled={busy || !isAi && !connected} onClick={() => void resume()}>{tr("\u7EE7\u7EED\u4E0B\u68CB")}</button>
            {isAi && <p className="tiny">{tr("\u6559\u5B66\u5C40\u7531\u4F60\u624B\u52A8\u6807\u8BB0\u6B7B\u5B50\u5E76\u786E\u8BA4\u7ED3\u679C\uFF1B\u7535\u8111\u4E0D\u4F1A\u66FF\u4F60\u5224\u65AD\u4E89\u8BAE\u6B7B\u6D3B\u3002")}</p>}
          </div>}
          {game.status === 'finished' && <div className="actions board-actions">
            <div className="preview"><strong>{tr(statusText())}</strong>{game.score && <p>{tr("\u9ED1\u68CB ")}{game.score.black.toFixed(1)}{tr(" \u76EE \u00B7 \u767D\u68CB ")}{game.score.white.toFixed(1)}{tr(" \u76EE\uFF08\u542B\u8D34\u76EE ")}{game.score.komi}）</p>}</div>
            <button className="primary wide" disabled={busy || !isAi && !connected} onClick={() => void rematch()}>{tr(isAi ? '重新开始人机练习' : '请求再来一局')}</button>
          </div>}
          {notice && <p className="alert" role="alert">{tr(notice)}</p>}
        </div>
        {mobileTeacherOpen && <button type="button" className="teacher-backdrop" aria-label={tr("\u5173\u95ED\u8001\u5E08\u8BB2\u89E3\u9762\u677F")} onClick={() => setMobileTeacherOpen(false)}/>}
        <aside id="free-go-teacher" className={`sidebar coach-sidebar ${mobileTeacherOpen ? 'mobile-teacher-open' : ''}`} aria-label={tr("\u56F4\u68CB\u8001\u5E08\u6559\u5B66\u9762\u677F")}>
          <div className="teacher-drawer-top"><strong>{tr("\u56F4\u68CB\u8001\u5E08 \u00B7 \u968F\u5C40\u8BB2\u89E3")}</strong><button type="button" className="teacher-close" onClick={() => setMobileTeacherOpen(false)}>{tr("\u6536\u8D77 \u2715")}</button></div>
          <section className="coach-card">
            <div className="coach-title"><div className="teacher-icon">{tr("\u5E08")}</div><div><span className="eyebrow">YOUR GO TEACHER</span><h2>{tr("\u56F4\u68CB\u8001\u5E08 \u00B7 \u5C40\u52BF\u8BB2\u89E3")}</h2></div></div>
            <div className="coach-tools"><label><input type="checkbox" checked={showCoach} onChange={e => setShowCoach(e.target.checked)}/>{tr(" \u542F\u7528\u6559\u5B66\u5EFA\u8BAE")}</label>
              <label><input type="checkbox" checked={hintMarker} onChange={e => setHintMarker(e.target.checked)} disabled={!showCoach}/>{tr(" \u68CB\u76D8\u6807\u8BB0\u63A8\u8350\u843D\u70B9")}</label></div>
            {showCoach ? <>
              <p className="coach-summary">{tr(game.status === 'waiting' ? '先记住：棋子下在交叉点，不是方格中央。' :
                    game.status === 'scoring' ? '现在学习终局数目：黑棋和白棋需要共同确认哪些棋块已经死亡。' :
                        game.status === 'finished' ? '复盘时优先回想：哪一手挽救了危险棋块？哪一手忽视了气？' :
                            myTurn ? analysis?.summary || '老师正在分析当前棋形…' : isAi ? '现在轮到 AI。观察它的落点，并想一想它在保护什么。' : '现在轮到对方。你可以先观察对手的棋形。')}</p>
              {groupInfo && <div className="liberties-card">
                <div className="sectionline"><strong>{tr("\u4F60\u70B9\u9009\u7684\u68CB\u5757")}</strong><button className="coach-clear" onClick={() => setInspected(null)}>{tr("\u53D6\u6D88\u67E5\u770B")}</button></div>
                <p>{tr("\u8FD9\u5757")}{tr(groupInfo.color === 1 ? '黑棋' : '白棋')}{tr("\u5171\u6709 ")}<strong>{groupInfo.stones.length}</strong>{tr(" \u9897\uFF0C\u62E5\u6709 ")}<strong>{groupInfo.liberties.length}</strong>{tr(" \u53E3\u6C14\u3002")}</p>
                <p>{tr(groupInfo.liberties.length === 1 ? '只剩一口气，已经被叫吃！优先考虑补气或反提。' : groupInfo.liberties.length === 2 ? '只有两口气，要小心对方连续紧气。' : '蓝色圆点是这些气的具体位置。你可以数一数它们。')}</p>
              </div>}
              {isAi && practice?.lastAiExplanation && <div className="ai-move-review">
                <strong>{tr("\u7535\u8111\u4E0A\u4E00\u624B\u4E3A\u4EC0\u4E48\u8FD9\u6837\u4E0B\uFF1F")}</strong>
                <p>{tr("AI \u8D70\u5728 ")}<b>{practice.lastAiExplanation.coordinate}</b>：{tr(practice.lastAiExplanation.reason)}</p>
                <small>{tr("\u8FD9\u662F\u7B97\u6CD5\u4ECE\u7535\u8111\u89C6\u89D2\u7ED9\u51FA\u7684\u89E3\u91CA\uFF0C\u4EC5\u4F9B\u5B66\u4E60\u3002")}</small>
              </div>}
              {game.status === 'playing' && myTurn && suggested.length > 0 && <div className="suggestions">
                <div className="sectionline"><strong>{tr("\u6839\u636E\u5F53\u524D\u5C40\u9762\u63A8\u8350")}</strong><span>{tr("\u4EC5\u4F9B\u5B66\u4E60\uFF0C\u4E0D\u4FDD\u8BC1\u6700\u4F18")}</span></div>
                {suggested.map((item: MoveSuggestion, i) => <div className={`suggestion ${selected === item.index ? 'selected' : ''}`} key={item.index}>
                  <div className="suggest-top"><span className="rank">{i + 1}</span><strong>{tr(item.title)}</strong><span className="coord">{item.coordinate}</span></div>
                  <p>{tr(item.reason)}</p>
                  <button className="suggest-use" onClick={() => setSelected(item.index)}>{tr("\u5728\u68CB\u76D8\u4E0A\u9884\u89C8\u8FD9\u624B")}</button>
                </div>)}
              </div>}
              {game.status === 'playing' && myTurn && analysis?.lesson && <div className="coach-lesson"><strong>{tr("\u672C\u56DE\u5408\u77E5\u8BC6\u70B9")}</strong><p>{tr(analysis.lesson)}</p></div>}
              {mode === 'online' && <p className="tiny">{tr("\u771F\u4EBA\u5BF9\u5C40\u4E2D\u4F7F\u7528\u6559\u5B66\u63D0\u793A\u53EF\u80FD\u5F71\u54CD\u516C\u5E73\u6027\uFF0C\u5EFA\u8BAE\u4E0E\u597D\u53CB\u5148\u5546\u91CF\u3002")}</p>}
              {isAi && <p className="tiny">{tr("\u63D0\u793A\u7531\u89C4\u5219\u548C\u5C40\u90E8\u68CB\u5F62\u542F\u53D1\u5F0F\u7B97\u6CD5\u751F\u6210\uFF1B\u4E0D\u4F1A\u8FDB\u884C\u6DF1\u5EA6\u6B7B\u6D3B\u8BA1\u7B97\u6216\u804C\u4E1A\u68CB\u8C31\u5206\u6790\u3002")}</p>}
            </> : <p className="muted">{tr("\u5DF2\u5173\u95ED\u63A8\u8350\uFF0C\u9002\u5408\u72EC\u7ACB\u601D\u8003\u3002\u53EF\u4EE5\u968F\u65F6\u91CD\u65B0\u6253\u5F00\u3002")}</p>}
          </section>
          <section className="panel lessons"><span className="eyebrow">BEGINNER LESSONS · 0 → 1</span><h3>{tr("\u56F4\u68CB\u5165\u95E8\u5C0F\u8BFE\u5802")}</h3>
            <details open><summary>{tr("\u7B2C\u4E00\u8BFE \u00B7 \u4EC0\u4E48\u662F\u201C\u6C14\u201D\uFF1F")}</summary><p>{tr("\u68CB\u5B50\u4E0A\u4E0B\u5DE6\u53F3\u7D27\u6328\u7684\u7A7A\u4EA4\u53C9\u70B9\u53EB\u201C\u6C14\u201D\u3002\u5BF9\u89D2\u7EBF\u4E0D\u7B97\u6C14\u3002\u4E00\u6574\u5757\u76F8\u8FDE\u7684\u540C\u8272\u68CB\u5B50\u5171\u7528\u6C14\uFF1B\u6C14\u53D8\u6210\u96F6\u5C31\u4F1A\u88AB\u63D0\u8D70\u3002\u8BD5\u7740\u70B9\u51FB\u68CB\u76D8\u4E0A\u7684\u4EFB\u610F\u4E00\u9897\u68CB\u5B50\uFF0C\u770B\u84DD\u8272\u6C14\u70B9\u3002")}</p></details>
            <details><summary>{tr("\u7B2C\u4E8C\u8BFE \u00B7 \u53EB\u5403\u4E0E\u63D0\u5B50")}</summary><p>{tr("\u5BF9\u65B9\u68CB\u5757\u53EA\u5269\u4E00\u53E3\u6C14\u65F6\u53EB\u201C\u53EB\u5403\u201D\u3002\u5835\u4F4F\u6700\u540E\u4E00\u53E3\u6C14\u5C31\u80FD\u63D0\u5B50\uFF1B\u4F46\u8981\u5148\u786E\u8BA4\u81EA\u5DF1\u843D\u5B50\u540E\u8FD8\u6709\u6C14\u3002")}</p></details>
            <details><summary>{tr("\u7B2C\u4E09\u8BFE \u00B7 \u89D2\u3001\u8FB9\u548C\u4E2D\u592E")}</summary><p>{tr("\u521D\u5B66\u5E38\u7528\u201C\u91D1\u89D2\u94F6\u8FB9\u8349\u809A\u76AE\u201D\u8BB0\u5FC6\u65B9\u5411\uFF1A\u89D2\u5229\u7528\u4E24\u8FB9\u66F4\u5BB9\u6613\u56F4\u5730\uFF0C\u63A5\u4E0B\u6765\u662F\u8FB9\uFF0C\u4E2D\u592E\u8F83\u96BE\u76F4\u63A5\u56F4\u4F4F\u3002")}</p></details>
            <details><summary>{tr("\u7B2C\u56DB\u8BFE \u00B7 \u52AB\u4E0E\u7981\u81EA\u6740")}</summary><p>{tr("\u4E0D\u80FD\u4E0B\u8BA9\u81EA\u5DF1\u68CB\u5757\u6CA1\u6709\u6C14\u7684\u68CB\uFF08\u9664\u975E\u540C\u65F6\u63D0\u8D70\u5BF9\u65B9\u83B7\u5F97\u6C14\uFF09\u3002\u4E5F\u4E0D\u80FD\u7ACB\u5373\u6216\u95F4\u63A5\u91CD\u590D\u5DF2\u7ECF\u51FA\u73B0\u8FC7\u7684\u5B8C\u6574\u68CB\u76D8\u5C40\u9762\u3002")}</p></details>
            <details><summary>{tr("\u7B2C\u4E94\u8BFE \u00B7 \u4EC0\u4E48\u65F6\u5019\u7ED3\u675F\uFF1F")}</summary><p>{tr("\u53CC\u65B9\u8FDE\u7EED\u865A\u624B\u540E\u8FDB\u5165\u6570\u76EE\u3002\u9700\u8981\u6807\u8BB0\u6B7B\u5B50\uFF1B\u771F\u4EBA\u53CC\u65B9\u540C\u610F\u7ED3\u7B97\uFF0CAI \u6559\u5B66\u5C40\u7531\u4F60\u786E\u8BA4\u3002\u5F53\u524D\u91C7\u7528\u4E2D\u5F0F\u6570\u5B50\u3001\u767D\u8D34 7.5 \u76EE\u3002")}</p></details>
          </section>
        </aside>
      </div>
    </section>}
    {aiAnnouncement && <div className="announcement-overlay" role="dialog" aria-modal="true" aria-label={tr("\u4EBA\u673A\u5BF9\u5C40\u901A\u77E5")}>
      <div className="announcement"><div className="announcement-icon">AI</div><span className="eyebrow">{tr("OPPONENT IDENTITY \u00B7 \u8BF7\u5148\u786E\u8BA4")}</span>
        <h2>{tr("\u4F60\u73B0\u5728\u6253\u7684\u662F\u7535\u8111 AI")}</h2><p>{tr(aiAnnouncement)}</p><p>{tr("\u4F60\u6267\u9ED1\u68CB\uFF0C\u7535\u8111\u6267\u767D\u68CB\u3002\u8001\u5E08\u4F1A\u5728\u65C1\u8FB9\u7ED9\u4F60\u63A8\u8350\u62DB\u5F0F\u5E76\u89E3\u91CA\u539F\u56E0\u3002")}</p>
        <button className="primary wide" onClick={() => setAiAnnouncement(null)}>{tr("\u6211\u77E5\u9053\u4E86\uFF0C\u5F00\u59CB\u8DDF AI \u5B66\u56F4\u68CB")}</button></div>
    </div>}
    <footer>{tr("\u56F4\u68CB\u5B66\u5802 \u00B7 \u771F\u4EBA\u623F\u95F4\u4E0E\u79BB\u7EBF AI \u4E25\u683C\u533A\u5206 \u00B7 \u89C4\u5219\u578B\u6559\u5B66\u5EFA\u8BAE\u4EC5\u4F9B\u5165\u95E8\u53C2\u8003")}</footer>
  </main>;
}
