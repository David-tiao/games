import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { getMe, login, register } from "./lib/api";
import { createGameSocket } from "./lib/socket";
import GomokuBoard from "./components/GomokuBoard";
import type { Ack, RoomState, User } from "./types";

const TOKEN_KEY = "gomoku_online_token";
const ROOM_KEY = "gomoku_online_room";

function emitAck<T>(socket: Socket | null, event: string, payload: unknown = {}): Promise<Ack<T>> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, error: "尚未连接到游戏服务器，请稍后重试。" });
      return;
    }
    socket.emit(event, payload, (response: Ack<T>) => resolve(response));
  });
}

function PlayerPanel({ label, player, active }: {
  label: string;
  player?: RoomState["players"][number];
  active: boolean;
}) {
  return (
    <div className={`player-panel ${active ? "is-active" : ""}`}>
      <div className={`avatar ${label === "黑棋" ? "avatar-black" : "avatar-white"}`}>
        {label === "黑棋" ? "●" : "○"}
      </div>
      <div className="player-meta">
        <span className="player-label">{label}{active ? " · 当前回合" : ""}</span>
        <strong>{player?.username || "等待玩家加入"}</strong>
        <small>{player ? (player.connected ? "在线" : "连接中断") : "房间空位"}</small>
      </div>
      {active && <span className="turn-tag">落子中</span>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    const inviteCode = new URLSearchParams(window.location.search).get("room") || "";
    return inviteCode.toUpperCase().slice(0, 6);
  });
  const [connection, setConnection] = useState<"connecting" | "online" | "offline">("connecting");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const myPlayer = useMemo(
    () => room?.players.find((player) => player.userId === user?.id),
    [room, user]
  );
  const myColor = myPlayer?.color ?? null;
  const isMyTurn = Boolean(room && myColor && room.status === "playing" && room.currentTurn === myColor);
  const blackPlayer = room?.players.find((player) => player.color === 1);
  const whitePlayer = room?.players.find((player) => player.color === 2);

  const applyRoom = useCallback((nextRoom: RoomState) => {
    setRoom(nextRoom);
    localStorage.setItem(ROOM_KEY, nextRoom.code);
  }, []);

  const clearRoom = useCallback(() => {
    setRoom(null);
    localStorage.removeItem(ROOM_KEY);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setAuthLoading(false);
      return;
    }
    getMe(savedToken)
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setToken(savedToken);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROOM_KEY);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = createGameSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnection("online");
      const savedRoom = localStorage.getItem(ROOM_KEY);
      if (savedRoom) {
        socket.emit("room:rejoin", { code: savedRoom }, (response: Ack<RoomState>) => {
          if (response?.ok && response.data) applyRoom(response.data);
          else {
            localStorage.removeItem(ROOM_KEY);
            setRoom(null);
          }
        });
      }
    });
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", (error: Error) => {
      setConnection("offline");
      setNotice(error.message.includes("UNAUTHORIZED") ? "登录状态已失效，请重新登录。" : "无法连接服务器，正在尝试重连。");
    });
    socket.on("room:state", (nextRoom: RoomState) => applyRoom(nextRoom));
    socket.on("room:closed", () => {
      clearRoom();
      setNotice("房间已关闭。");
    });

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [token, applyRoom, clearRoom]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = authMode === "register"
        ? await register(username.trim(), password)
        : await login(username.trim(), password);
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      setToken(result.token);
      setPassword("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "账号操作失败。");
    } finally {
      setBusy(false);
    }
  }

  async function createRoom() {
    setBusy(true);
    setNotice("");
    const response = await emitAck<RoomState>(socketRef.current, "room:create");
    if (response.ok && response.data) applyRoom(response.data);
    else setNotice(response.error || "创建房间失败。");
    setBusy(false);
  }

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const response = await emitAck<RoomState>(socketRef.current, "room:join", {
      code: roomCodeInput.trim().toUpperCase()
    });
    if (response.ok && response.data) applyRoom(response.data);
    else setNotice(response.error || "加入房间失败。");
    setBusy(false);
  }

  async function leaveRoom() {
    setBusy(true);
    const response = await emitAck<RoomState | null>(socketRef.current, "room:leave");
    if (response.ok) clearRoom();
    else setNotice(response.error || "离开房间失败。");
    setBusy(false);
  }

  async function makeMove(index: number) {
    if (!isMyTurn || !room || room.board[index] !== 0) return;
    const response = await emitAck<RoomState>(socketRef.current, "game:move", { index });
    if (!response.ok) setNotice(response.error || "落子失败。");
    else setNotice("");
  }

  async function resign() {
    if (!window.confirm("确定要认输吗？")) return;
    const response = await emitAck<RoomState>(socketRef.current, "game:resign");
    if (!response.ok) setNotice(response.error || "认输失败。");
  }

  async function rematch() {
    const response = await emitAck<RoomState>(socketRef.current, "game:rematch");
    if (!response.ok) setNotice(response.error || "请求再来一局失败。");
    else setNotice("已提出再来一局请求，等待对方同意。");
  }

  async function logout() {
    if (room) await emitAck(socketRef.current, "room:leave");
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROOM_KEY);
    setToken(null);
    setUser(null);
    setRoom(null);
    setConnection("offline");
    setNotice("");
  }

  async function copyRoomCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setNotice("房间号已复制。");
    } catch {
      window.prompt("复制房间号并发送给好友：", room.code);
    }
  }

  async function shareInvite() {
    if (!room) return;
    const invite = new URL(window.location.href);
    invite.searchParams.set("room", room.code);
    const inviteUrl = invite.toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "五子棋 Online 邀请",
          text: `加入我的五子棋房间，房间号：${room.code}`,
          url: inviteUrl
        });
        setNotice("邀请已分享。");
        return;
      }
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("邀请链接已复制，发给好友即可。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      window.prompt("请复制这个邀请链接发给好友：", inviteUrl);
    }
  }

  if (authLoading) {
    return <div className="loading-screen"><div className="brand-mark">五</div><p>正在载入五子棋 Online…</p></div>;
  }

  if (!user || !token) {
    return (
      <main className="auth-shell">
        <div className="auth-decoration decor-one" />
        <div className="auth-decoration decor-two" />
        <section className="auth-card">
          <div className="brand-lockup">
            <div className="brand-mark">五</div>
            <div><div className="eyebrow">GOMOKU ONLINE</div><h1>五子棋 Online</h1></div>
          </div>
          <p className="auth-intro">和朋友在线下一盘棋。创建私人房间，分享房间号，即可开始对局。</p>
          <div className="auth-tabs">
            <button className={authMode === "register" ? "selected" : ""} onClick={() => setAuthMode("register")}>注册账号</button>
            <button className={authMode === "login" ? "selected" : ""} onClick={() => setAuthMode("login")}>账号登录</button>
          </div>
          <form onSubmit={handleAuth} className="form-stack">
            <label>用户名<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="3–18 位字母、数字或下划线" minLength={3} maxLength={18} required /></label>
            <label>密码<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="至少 8 位" minLength={8} maxLength={128} required /></label>
            <button className="primary-button full-button" disabled={busy}>{busy ? "请稍候…" : authMode === "register" ? "创建账号" : "登录"}</button>
          </form>
          {notice && <div className="notice error-notice">{notice}</div>}
          <div className="auth-foot">15 × 15 棋盘 <span>·</span> 黑棋先手 <span>·</span> 不限时</div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup compact">
          <div className="brand-mark small-mark">五</div>
          <div><div className="eyebrow">GOMOKU ONLINE</div><div className="brand-title">五子棋 Online</div></div>
        </div>
        <div className="topbar-right">
          <span className={`connection ${connection}`}><i />{connection === "online" ? "服务器已连接" : connection === "connecting" ? "连接中" : "正在重连"}</span>
          <span className="user-chip">{user.username}</span>
          <button className="text-button" onClick={logout}>退出登录</button>
        </div>
      </header>

      {!room ? (
        <section className="lobby-layout">
          <div className="welcome-block">
            <div className="eyebrow">PRIVATE MATCH · REAL-TIME</div>
            <h1>下一盘，<em>见真章。</em></h1>
            <p>创建一间私人棋室，邀请朋友加入。黑棋先手，双方轮流落子，服务器负责判定每一步。</p>
            <div className="feature-row"><span>15 × 15 棋盘</span><span>无限时</span><span>实时同步</span></div>
          </div>
          <div className="lobby-cards">
            <section className="lobby-card create-card">
              <div className="card-icon">＋</div>
              <div className="eyebrow">HOST A ROOM</div>
              <h2>创建私人房间</h2>
              <p>你将执黑棋。创建成功后，把房间号分享给对手。</p>
              <button className="primary-button full-button" onClick={createRoom} disabled={busy || connection !== "online"}>{busy ? "处理中…" : "创建房间"}</button>
            </section>
            <section className="lobby-card join-card">
              <div className="card-icon join-icon">↗</div>
              <div className="eyebrow">JOIN A ROOM</div>
              <h2>加入好友房间</h2>
              <p>输入好友分享的 6 位房间号，你将执白棋。</p>
              <form onSubmit={joinRoom} className="join-form">
                <input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 6))} placeholder="输入房间号" maxLength={6} required />
                <button className="primary-button" disabled={busy || connection !== "online" || roomCodeInput.trim().length !== 6}>加入</button>
              </form>
            </section>
          </div>
          {notice && <div className="notice lobby-notice">{notice}</div>}
          <div className="lobby-foot"><span className="online-dot" /> 私人房间 · 两名玩家 · 无需计时</div>
        </section>
      ) : (
        <section className="game-layout">
          <div className="game-heading">
            <div>
              <div className="eyebrow">PRIVATE ROOM</div>
              <h1>对局进行中</h1>
              <div className="room-code-line">
                房间号 <strong>{room.code}</strong>
                <button className="copy-button" onClick={copyRoomCode}>复制号码</button>
                <button className="copy-button invite-button" onClick={shareInvite}>分享邀请</button>
              </div>
            </div>
            <button className="subtle-button" onClick={leaveRoom} disabled={busy}>离开房间</button>
          </div>

          <div className="match-grid">
            <aside className="match-sidebar">
              <PlayerPanel label="黑棋" player={blackPlayer} active={room.status === "playing" && room.currentTurn === 1} />
              <PlayerPanel label="白棋" player={whitePlayer} active={room.status === "playing" && room.currentTurn === 2} />
              <div className="status-card">
                <div className="eyebrow">GAME STATUS</div>
                {room.status === "waiting" ? (
                  <><strong>等待对手加入</strong><p>把房间号发给朋友。对手加入后自动开始。</p></>
                ) : room.status === "finished" ? (
                  <><strong>{room.result === "draw" ? "平局" : room.winner === myColor ? "恭喜，你赢了！" : "本局结束"}</strong><p>{room.result === "resign" ? "对方认输或离开。" : room.result === "draw" ? "棋盘已满。" : "已形成五子连线。"}</p></>
                ) : (
                  <><strong>{isMyTurn ? "轮到你落子" : "等待对方落子"}</strong><p>{isMyTurn ? "选择棋盘上的空位。" : "对方正在思考，不限时。"}</p></>
                )}
                <div className="turn-indicator"><span className={room.currentTurn === 1 ? "black-disc" : "white-disc"} />{room.status === "playing" ? (room.currentTurn === 1 ? "黑棋回合" : "白棋回合") : "每步不限时"}</div>
              </div>
              {room.status === "playing" && <button className="danger-button full-button" onClick={resign}>认输</button>}
              {room.status === "finished" && (
                <button className="primary-button full-button" onClick={rematch}>
                  {room.rematchVotes.includes(user.id) ? "已请求 · 等待对方" : "再来一局"}
                </button>
              )}
              {room.status === "finished" && <div className="small-note">双方都点击「再来一局」后，会以黑棋先手重新开始。</div>}
              {notice && <div className="notice">{notice}</div>}
            </aside>

            <div className="board-area">
              <div className="board-caption"><span>GOMOKU · 15 × 15</span><span>{room.status === "playing" ? (isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN") : room.status.toUpperCase()}</span></div>
              <GomokuBoard
                board={room.board}
                lastMove={room.lastMove}
                disabled={room.status !== "playing" || !isMyTurn || connection !== "online"}
                onMove={makeMove}
              />
              <div className="board-footer"><span>黑棋先手</span><span>横 · 竖 · 斜任意方向五子连线获胜</span><span>不限时</span></div>
            </div>
          </div>
        </section>
      )}
      <footer className="global-footer">GOMOKU ONLINE <span>·</span> 第一版私人房间联网对战</footer>
    </main>
  );
}
