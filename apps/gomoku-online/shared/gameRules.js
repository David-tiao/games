export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function hasFive(board, index, color, size = BOARD_SIZE) {
  if (!Array.isArray(board) || !Number.isInteger(index) || index < 0 || index >= size * size) return false;
  if (color !== BLACK && color !== WHITE) return false;
  if (board[index] !== color) return false;

  const row = Math.floor(index / size);
  const col = index % size;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === color) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}
