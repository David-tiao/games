import { randomBytes } from 'node:crypto';
import { areaScore, boardKey, groupAt, tryMove, SIZES, KOMI } from '../../shared/goRules.js';
import { analyzePosition } from '../../shared/goCoach.js';

const rooms = new Map();
const byUser = new Map();
const code = () => randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

function makeCode() { let id; do { id = code(); } while (rooms.has(id)); return id; }
function player(room, id) { return room.players.find(p => p.userId === id); }
function publicRoom(room) {
  return {
    code: room.code, size: room.size, komi: KOMI, ownerId: room.ownerId,
    players: room.players.map(({userId,username,color,connected}) => ({userId,username,color,connected})),
    board: room.board.slice(), status: room.status, turn: room.turn, passes: room.passes,
    captured: {...room.captured}, lastMove: room.lastMove, moveNumber: room.moveNumber,
    deadStones: [...room.deadStones].sort((a,b)=>a-b), scoreConfirmations: [...room.scoreConfirmations],
    score: room.score, previewScore: room.status==='scoring' ? areaScore(room.board,room.size,[...room.deadStones],KOMI) : null, winner: room.winner, result: room.result, rematchVotes: [...room.rematchVotes]
  };
}
function currentRoom(userId) { return rooms.get(byUser.get(userId)); }
function active(user, socketId) {
  const room = currentRoom(user.id), member = room && player(room, user.id);
  if (!room || !member || member.left || member.socketId !== socketId) throw Error('房间已失效，请重新加入。');
  return {room,member};
}
function assertIdle(userId, desiredCode=null) {
  const present=byUser.get(userId);
  if (present && present !== desiredCode) throw Error('你已经在另一个房间中，请先离开。');
}
function initGame(room) {
  room.board=Array(room.size*room.size).fill(0);
  room.turn=1;room.passes=0;room.captured={black:0,white:0};room.history=[boardKey(room.board)];
  room.lastMove=null;room.moveNumber=0;room.deadStones=new Set();room.scoreConfirmations=new Set();
  room.score=null;room.winner=null;room.result=null;room.rematchVotes=new Set();
  room.status=room.players.length===2?'playing':'waiting';
}
export function createRoom(user,socketId,size=9) {
  if (currentRoom(user.id)) throw Error('你已在房间中。');
  if (!SIZES.includes(size)) throw Error('仅支持 9、13、19 路棋盘。');
  const room={code:makeCode(),ownerId:user.id,size,
    players:[{userId:user.id,username:user.username,color:1,connected:true,socketId,left:false}]};
  initGame(room);rooms.set(room.code,room);byUser.set(user.id,room.code);
  return publicRoom(room);
}
export function joinRoom(rawCode,user,socketId,{rejoin=false}={}) {
  const id=typeof rawCode==='string'?rawCode.trim().toUpperCase():'';
  const room=rooms.get(id);
  if (!room) throw Error('房间不存在，或服务器已重新启动。');
  assertIdle(user.id,id);
  const existing=player(room,user.id);
  if (existing) {
    if (existing.left) throw Error('你已经离开了这个房间。');
    existing.connected=true;existing.socketId=socketId;byUser.set(user.id,id);
    return publicRoom(room);
  }
  if (rejoin) throw Error('当前账号不是这个房间的玩家。');
  if (room.status!=='waiting'||room.players.length!==1) throw Error('房间已经满员或开始对局。');
  room.players.push({userId:user.id,username:user.username,color:2,connected:true,socketId,left:false});
  byUser.set(user.id,id);room.status='playing';return publicRoom(room);
}
export function makeMove(user,socketId,index) {
  const {room,member}=active(user,socketId);
  if (room.status!=='playing') throw Error('当前不在落子阶段。');
  if (room.turn!==member.color) throw Error('还没轮到你落子。');
  const result=tryMove(room.board,index,member.color,room.size,room.history);
  room.board=result.board;room.history.push(result.key);room.moveNumber++;
  room.captured[member.color===1?'black':'white']+=result.captured;
  room.lastMove=index;room.passes=0;room.turn=3-member.color;
  return publicRoom(room);
}
export function pass(user,socketId) {
  const {room,member}=active(user,socketId);
  if (room.status!=='playing'||room.turn!==member.color) throw Error('现在不能虚手。');
  room.passes++;room.moveNumber++;room.lastMove=null;room.turn=3-member.color;
  if (room.passes>=2) {room.status='scoring';room.deadStones.clear();room.scoreConfirmations.clear();}
  return publicRoom(room);
}
export function markDead(user,socketId,index) {
  const {room}=active(user,socketId);
  if (room.status!=='scoring') throw Error('只有数目阶段才可以标记死子。');
  if (!Number.isInteger(index)||index<0||index>=room.board.length||room.board[index]===0) throw Error('请点击一块棋子来标记。');
  const group=groupAt(room.board,index,room.size);
  const allMarked=group.stones.every(i=>room.deadStones.has(i));
  for(const i of group.stones) if(allMarked)room.deadStones.delete(i);else room.deadStones.add(i);
  room.scoreConfirmations.clear();return publicRoom(room);
}
export function confirmScore(user,socketId) {
  const {room}=active(user,socketId);
  if (room.status!=='scoring') throw Error('当前不在数目阶段。');
  room.scoreConfirmations.add(user.id);
  if (room.players.length===2 && room.players.every(p=>!p.left&&room.scoreConfirmations.has(p.userId))) {
    room.score=areaScore(room.board,room.size,[...room.deadStones],KOMI);
    room.winner=room.score.winner;room.result='count';room.status='finished';
  }
  return publicRoom(room);
}
export function resume(user,socketId) {
  const {room}=active(user,socketId);
  if(room.status!=='scoring') throw Error('只有数目阶段才能继续下棋。');
  room.status='playing';room.passes=0;room.deadStones.clear();room.scoreConfirmations.clear();
  return publicRoom(room);
}
export function resign(user,socketId) {
  const {room,member}=active(user,socketId);
  if (!['playing','scoring'].includes(room.status)) throw Error('目前不能认输。');
  room.status='finished';room.winner=3-member.color;room.result='resign';room.rematchVotes.clear();
  return publicRoom(room);
}
export function rematch(user,socketId) {
  const {room}=active(user,socketId);
  if(room.status!=='finished') throw Error('本局还没结束。');
  room.rematchVotes.add(user.id);
  if(room.players.length===2&&room.players.every(p=>!p.left&&room.rematchVotes.has(p.userId))) initGame(room);
  return publicRoom(room);
}
export function leave(user,socketId) {
  const {room,member}=active(user,socketId);
  member.left=true;member.connected=false;member.socketId=null;byUser.delete(user.id);
  if (room.status==='waiting') { rooms.delete(room.code);return {code:room.code,closed:true,state:null}; }
  if (['playing','scoring'].includes(room.status)) {room.status='finished';room.winner=3-member.color;room.result='resign';room.rematchVotes.clear();}
  if(room.players.every(p=>p.left)) {rooms.delete(room.code);return {code:room.code,closed:true,state:null};}
  return {code:room.code,closed:false,state:publicRoom(room)};
}
export function disconnect(userId,socketId) {
  const room=currentRoom(userId),member=room&&player(room,userId);
  if(!member||member.socketId!==socketId)return null;
  member.connected=false;member.socketId=null;return publicRoom(room);
}

/** A room can be auto-converted to AI only while still waiting for a second human. */
export function leaveIfWaiting(user, socketId) {
  const {room} = active(user, socketId);
  if(room.status !== 'waiting') throw Error('好友已加入，不能自动切换成人机。');
  return leave(user, socketId);
}
export function coachForPlayer(user, socketId) {
  const {room, member} = active(user, socketId);
  if(room.status !== 'playing') throw Error('当前不在落子阶段。');
  if(room.turn !== member.color) throw Error('还没轮到你落子。');
  return analyzePosition(room.board, room.size, member.color, room.history);
}
