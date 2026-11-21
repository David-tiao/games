import { randomBytes } from "node:crypto";
import { hasFive } from "../../shared/gameRules.js";

const SIZE = 15;
const emptyBoard = () => Array(SIZE * SIZE).fill(0);
const rooms = new Map();
const userRooms = new Map();

function makeCode() {
  let code;
  do { code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase(); }
  while (rooms.has(code));
  return code;
}
function findPlayer(room, userId) {
  return room.players.find((player) => player.userId === userId);
}
function publicState(room) {
  return {
    code: room.code,
    ownerId: room.ownerId,
    players: room.players.map(({ userId, username, color, connected }) => ({ userId, username, color, connected })),
    board: [...room.board],
    currentTurn: room.currentTurn,
    status: room.status,
    winner: room.winner,
    result: room.result,
    lastMove: room.lastMove,
    rematchVotes: [...room.rematchVotes]
  };
}
function getUserRoom(userId) {
  const code = userRooms.get(userId);
  return code ? rooms.get(code) : null;
}
function ensureNoOtherRoom(userId, code) {
  const existing = userRooms.get(userId);
  if (existing && existing !== code) throw new Error("你已经在另一个房间中，请先离开原房间。");
}

export function createRoom(user, socketId) {
  if (getUserRoom(user.id)) throw new Error("你已经在一个房间中。");
  const code = makeCode();
  const room = {
    code, ownerId: user.id,
    players: [{ userId: user.id, username: user.username, color: 1, connected: true, socketId, left: false }],
    board: emptyBoard(), currentTurn: 1, status: "waiting",
    winner: null, result: null, lastMove: null, rematchVotes: new Set(), createdAt: Date.now()
  };
  rooms.set(code, room);
  userRooms.set(user.id, code);
  return publicState(room);
}

export function joinRoom(codeInput, user, socketId) {
  const code = typeof codeInput === "string" ? codeInput.trim().toUpperCase() : "";
  const room = rooms.get(code);
  if (!room) throw new Error("房间不存在，请检查房间号。");
  ensureNoOtherRoom(user.id, code);
  const existing = findPlayer(room, user.id);
  if (existing) {
    if (existing.left) throw new Error("你已离开该对局，无法重新加入。");
    existing.connected = true;
    existing.socketId = socketId;
    userRooms.set(user.id, code);
    return publicState(room);
  }
  if (room.status !== "waiting" || room.players.length >= 2) throw new Error("房间已满或对局已经开始。");
  room.players.push({ userId: user.id, username: user.username, color: 2, connected: true, socketId, left: false });
  userRooms.set(user.id, code);
  room.status = "playing";
  return publicState(room);
}

export function rejoinRoom(codeInput, user, socketId) {
  const code = typeof codeInput === "string" ? codeInput.trim().toUpperCase() : "";
  const room = rooms.get(code);
  if (!room) throw new Error("房间已不存在。");
  ensureNoOtherRoom(user.id, code);
  const player = findPlayer(room, user.id);
  if (!player || player.left) throw new Error("当前账号不是这个房间的玩家。");
  player.connected = true;
  player.socketId = socketId;
  userRooms.set(user.id, code);
  return publicState(room);
}

export function makeMove(user, socketId, index) {
  const room = getUserRoom(user.id);
  if (!room) throw new Error("你当前不在对局房间中。");
  const player = findPlayer(room, user.id);
  if (!player || player.left || !player.connected || player.socketId !== socketId) {
    throw new Error("玩家连接状态无效，请重新连接房间。");
  }
  if (room.status !== "playing") throw new Error("当前对局尚未开始或已经结束。");
  if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE) throw new Error("落子位置无效。");
  if (player.color !== room.currentTurn) throw new Error("还没有轮到你落子。");
  if (room.board[index] !== 0) throw new Error("这个位置已经有棋子了。");

  room.board[index] = player.color;
  room.lastMove = index;
  if (hasFive(room.board, index, player.color, SIZE)) {
    room.status = "finished"; room.winner = player.color; room.result = "five"; room.rematchVotes.clear();
  } else if (room.board.every((stone) => stone !== 0)) {
    room.status = "finished"; room.winner = null; room.result = "draw"; room.rematchVotes.clear();
  } else {
    room.currentTurn = player.color === 1 ? 2 : 1;
  }
  return publicState(room);
}

export function resign(user, socketId) {
  const room = getUserRoom(user.id);
  if (!room) throw new Error("你当前不在对局房间中。");
  const player = findPlayer(room, user.id);
  if (!player || player.left || player.socketId !== socketId || room.status !== "playing") {
    throw new Error("当前不能认输或连接状态无效。");
  }
  room.status = "finished"; room.winner = player.color === 1 ? 2 : 1;
  room.result = "resign"; room.rematchVotes.clear();
  return publicState(room);
}

export function requestRematch(user, socketId) {
  const room = getUserRoom(user.id);
  if (!room) throw new Error("你当前不在对局房间中。");
  const player = findPlayer(room, user.id);
  if (!player || player.left || player.socketId !== socketId || room.status !== "finished") {
    throw new Error("当前不能请求再来一局或连接状态无效。");
  }
  room.rematchVotes.add(user.id);
  if (room.players.length === 2 && room.players.every((item) => room.rematchVotes.has(item.userId))) {
    room.board = emptyBoard(); room.currentTurn = 1; room.status = "playing";
    room.winner = null; room.result = null; room.lastMove = null; room.rematchVotes.clear();
  }
  return publicState(room);
}

export function leaveRoom(user, socketId) {
  const code = userRooms.get(user.id);
  const room = code ? rooms.get(code) : null;
  if (!room) { userRooms.delete(user.id); return { state: null, closed: false, code: null }; }
  const player = findPlayer(room, user.id);
  if (player && player.socketId !== socketId) throw new Error("当前连接已失效，请刷新后重试。");
  if (player) { player.connected = false; player.socketId = null; player.left = true; }
  userRooms.delete(user.id);
  if (room.status === "waiting" && room.ownerId === user.id) {
    rooms.delete(room.code);
    return { state: null, closed: true, code: room.code };
  }
  if (room.status === "playing" && player) {
    room.status = "finished"; room.winner = player.color === 1 ? 2 : 1;
    room.result = "resign"; room.rematchVotes.clear();
  }
  return { state: publicState(room), closed: false, code: room.code };
}

export function markDisconnected(userId, socketId) {
  const room = getUserRoom(userId);
  if (!room) return null;
  const player = findPlayer(room, userId);
  if (!player || player.socketId !== socketId) return null;
  player.connected = false; player.socketId = null;
  return publicState(room);
}
