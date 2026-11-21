/** Chinese-area-scoring Go: capture, suicide check, and positional superko. */
export const BLACK = 1;
export const WHITE = 2;
export const EMPTY = 0;
export const SIZES = [9, 13, 19];
export const KOMI = 7.5;

export function neighbors(index, size) {
  const row = Math.floor(index / size), col = index % size;
  const result = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

export function groupAt(board, start, size) {
  if (!Number.isInteger(start) || start < 0 || start >= board.length || !board[start]) return null;
  const color = board[start], stones = new Set([start]), liberties = new Set(), stack = [start];
  while (stack.length) {
    const current = stack.pop();
    for (const neighbor of neighbors(current, size)) {
      if (board[neighbor] === EMPTY) liberties.add(neighbor);
      else if (board[neighbor] === color && !stones.has(neighbor)) {
        stones.add(neighbor); stack.push(neighbor);
      }
    }
  }
  return { color, stones: [...stones], liberties: [...liberties] };
}

export function boardKey(board) { return board.join(''); }

export function tryMove(board, index, color, size, history = []) {
  if (!SIZES.includes(size) || board.length !== size * size) throw Error('棋盘状态无效。');
  if (!Number.isInteger(index) || index < 0 || index >= board.length) throw Error('落子位置无效。');
  if (color !== BLACK && color !== WHITE) throw Error('落子颜色无效。');
  if (board[index] !== EMPTY) throw Error('这个交叉点已有棋子。');
  const next = board.slice();
  next[index] = color;
  const opponent = color === BLACK ? WHITE : BLACK;
  let captured = 0;
  for (const adjacent of neighbors(index, size)) {
    if (next[adjacent] !== opponent) continue;
    const group = groupAt(next, adjacent, size);
    if (group && group.liberties.length === 0) {
      for (const stone of group.stones) next[stone] = EMPTY;
      captured += group.stones.length;
    }
  }
  const own = groupAt(next, index, size);
  if (!own || own.liberties.length === 0) throw Error('不能自杀：落子后己方棋块没有气。');
  const key = boardKey(next);
  if (history.includes(key)) throw Error('劫争：此步会重复之前的棋盘局面。');
  return { board: next, captured, key };
}

/** Chinese area scoring: occupied stones + surrounded vacant points. */
export function areaScore(board, size, deadIndices = [], komi = KOMI) {
  if (!SIZES.includes(size) || board.length !== size * size) throw Error('棋盘状态无效。');
  const position = board.slice();
  const dead = new Set(deadIndices);
  for (const index of dead) {
    if (!Number.isInteger(index) || index < 0 || index >= position.length || position[index] === EMPTY) throw Error('无效的死子标记。');
    position[index] = EMPTY;
  }
  const stones = { black: 0, white: 0 }, territory = { black: 0, white: 0, neutral: 0 };
  for (const point of position) {
    if (point === BLACK) stones.black++;
    if (point === WHITE) stones.white++;
  }
  const visited = new Set();
  for (let index = 0; index < position.length; index++) {
    if (position[index] !== EMPTY || visited.has(index)) continue;
    const stack = [index], borders = new Set();
    let count = 0;
    visited.add(index);
    while (stack.length) {
      const current = stack.pop(); count++;
      for (const near of neighbors(current, size)) {
        if (position[near] !== EMPTY) borders.add(position[near]);
        else if (!visited.has(near)) { visited.add(near); stack.push(near); }
      }
    }
    if (borders.size === 1 && borders.has(BLACK)) territory.black += count;
    else if (borders.size === 1 && borders.has(WHITE)) territory.white += count;
    else territory.neutral += count;
  }
  const black = stones.black + territory.black;
  const white = stones.white + territory.white + komi;
  return {
    stones, territory, komi, black, white,
    winner: black > white ? BLACK : white > black ? WHITE : null,
    margin: Math.abs(black - white)
  };
}
