import test from "node:test";
import assert from "node:assert/strict";
import { hasFive, BLACK, WHITE, BOARD_SIZE } from "../shared/gameRules.js";

const emptyBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(0);

test("detects five horizontal stones", () => {
  const board = emptyBoard();
  for (let col = 4; col < 9; col++) board[7 * BOARD_SIZE + col] = BLACK;
  assert.equal(hasFive(board, 7 * BOARD_SIZE + 6, BLACK), true);
});

test("detects five vertical stones", () => {
  const board = emptyBoard();
  for (let row = 2; row < 7; row++) board[row * BOARD_SIZE + 5] = WHITE;
  assert.equal(hasFive(board, 5 * BOARD_SIZE + 5, WHITE), true);
});

test("detects diagonal stones", () => {
  const board = emptyBoard();
  for (let i = 0; i < 5; i++) board[(3 + i) * BOARD_SIZE + (2 + i)] = BLACK;
  assert.equal(hasFive(board, 5 * BOARD_SIZE + 4, BLACK), true);
});

test("does not report a win for four stones", () => {
  const board = emptyBoard();
  for (let col = 4; col < 8; col++) board[7 * BOARD_SIZE + col] = BLACK;
  assert.equal(hasFive(board, 7 * BOARD_SIZE + 6, BLACK), false);
});

test("does not count stones of the other color", () => {
  const board = emptyBoard();
  for (let col = 4; col < 9; col++) board[7 * BOARD_SIZE + col] = col === 6 ? WHITE : BLACK;
  assert.equal(hasFive(board, 7 * BOARD_SIZE + 5, BLACK), false);
});

test("handles five-in-a-row reaching a board edge", () => {
  const board = emptyBoard();
  for (let col = 0; col < 5; col++) board[col] = WHITE;
  assert.equal(hasFive(board, 2, WHITE), true);
});
