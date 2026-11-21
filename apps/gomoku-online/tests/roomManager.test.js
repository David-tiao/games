import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom, joinRoom, makeMove, requestRematch, resign
} from "../server/src/roomManager.js";

function users(suffix) {
  return [
    { id: `black-${suffix}`, username: `black${suffix}` },
    { id: `white-${suffix}`, username: `white${suffix}` }
  ];
}

test("private room assigns black to host and white to the joining player", () => {
  const [black, white] = users("room");
  const created = createRoom(black, "socket-black-room");
  assert.equal(created.status, "waiting");
  assert.equal(created.players[0].color, 1);

  const joined = joinRoom(created.code, white, "socket-white-room");
  assert.equal(joined.status, "playing");
  assert.equal(joined.players.length, 2);
  assert.equal(joined.players[1].color, 2);
});

test("server rejects wrong-turn and occupied-cell moves", () => {
  const [black, white] = users("turn");
  const created = createRoom(black, "socket-black-turn");
  joinRoom(created.code, white, "socket-white-turn");

  assert.throws(() => makeMove(white, "socket-white-turn", 112), /还没有轮到你/);
  const first = makeMove(black, "socket-black-turn", 112);
  assert.equal(first.board[112], 1);
  assert.equal(first.currentTurn, 2);
  assert.throws(() => makeMove(white, "socket-white-turn", 112), /已经有棋子/);
});

test("server declares a five-in-a-row winner and rematch requires both players", () => {
  const [black, white] = users("win");
  const created = createRoom(black, "socket-black-win");
  joinRoom(created.code, white, "socket-white-win");

  let finished;
  for (let col = 5; col <= 9; col++) {
    finished = makeMove(black, "socket-black-win", 7 * 15 + col);
    if (col < 9) makeMove(white, "socket-white-win", col);
  }
  assert.equal(finished.status, "finished");
  assert.equal(finished.winner, 1);
  assert.equal(finished.result, "five");

  const oneVote = requestRematch(black, "socket-black-win");
  assert.equal(oneVote.status, "finished");
  const restarted = requestRematch(white, "socket-white-win");
  assert.equal(restarted.status, "playing");
  assert.equal(restarted.currentTurn, 1);
  assert.equal(restarted.board.every((stone) => stone === 0), true);
});

test("resignation awards the win to the other player", () => {
  const [black, white] = users("resign");
  const created = createRoom(black, "socket-black-resign");
  joinRoom(created.code, white, "socket-white-resign");
  const result = resign(black, "socket-black-resign");
  assert.equal(result.status, "finished");
  assert.equal(result.winner, 2);
  assert.equal(result.result, "resign");
});
