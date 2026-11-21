// Star Array / 星阵 GF(2) engine. All state transitions share this implementation.
export function assertSize(size) {
  if (!Number.isInteger(size) || size < 2 || size > 9) throw new RangeError('Board size must be 2..9');
}
export function moveIndices(size, index) {
  assertSize(size);
  if (!Number.isInteger(index) || index < 0 || index >= size * size) throw new RangeError('Invalid point');
  const x = index % size, y = Math.floor(index / size);
  const out = [index];
  if (x > 0) out.push(index - 1);
  if (x < size - 1) out.push(index + 1);
  if (y > 0) out.push(index - size);
  if (y < size - 1) out.push(index + size);
  return out;
}
export function togglePoint(board, size, index) {
  if (!Array.isArray(board) || board.length !== size * size || board.some(v => v !== 0 && v !== 1)) throw new TypeError('Invalid binary board');
  const next = [...board];
  for (const i of moveIndices(size, index)) next[i] ^= 1;
  return next;
}
export function applyClicks(board, size, points) {
  return points.reduce((b, i) => togglePoint(b, size, i), [...board]);
}
export function toMask(bits) {
  return bits.reduce((m, b, i) => b ? m | (1n << BigInt(i)) : m, 0n);
}
export function fromMask(mask, count) {
  return Array.from({ length: count }, (_, i) => Number((mask >> BigInt(i)) & 1n));
}
export function hamming(mask) {
  let m = mask, n = 0;
  while (m) { m &= m - 1n; n++; }
  return n;
}
export function influenceRows(size) {
  assertSize(size);
  const count = size * size;
  return Array.from({ length: count }, (_, row) => {
    let mask = 0n;
    for (let col = 0; col < count; col++) if (moveIndices(size, col).includes(row)) mask |= 1n << BigInt(col);
    return mask;
  });
}
// Solves A x = initial XOR target. RREF with a recorded, inspectable elimination trace.
export function solve(board, size, target = null, { exactNullityLimit = 18 } = {}) {
  assertSize(size);
  const count = size * size;
  if (!Array.isArray(board) || board.length !== count || board.some(v => v !== 0 && v !== 1)) throw new TypeError('Invalid board');
  const goal = target ?? Array(count).fill(0);
  if (!Array.isArray(goal) || goal.length !== count || goal.some(v => v !== 0 && v !== 1)) throw new TypeError('Invalid target');
  const rhs = board.map((v, i) => v ^ goal[i]);
  const rows = influenceRows(size).map((bits, i) => bits | (BigInt(rhs[i]) << BigInt(count)));
  const pivots = [];
  const trace = [];
  let pivotRow = 0, swaps = 0, eliminations = 0;
  for (let col = 0; col < count && pivotRow < count; col++) {
    const bit = 1n << BigInt(col);
    let candidate = pivotRow;
    while (candidate < count && !(rows[candidate] & bit)) candidate++;
    if (candidate === count) continue;
    if (candidate !== pivotRow) {
      [rows[candidate], rows[pivotRow]] = [rows[pivotRow], rows[candidate]];
      swaps++;
      if (trace.length < 90) trace.push({ type: 'swap', a: pivotRow, b: candidate });
    }
    for (let other = 0; other < count; other++) {
      if (other !== pivotRow && (rows[other] & bit)) {
        rows[other] ^= rows[pivotRow];
        eliminations++;
        if (trace.length < 90) trace.push({ type: 'xor', a: other, b: pivotRow, col });
      }
    }
    pivots.push(col);
    pivotRow++;
  }
  const coefficientMask = (1n << BigInt(count)) - 1n;
  const inconsistent = rows.some(r => (r & coefficientMask) === 0n && ((r >> BigInt(count)) & 1n) === 1n);
  const free = Array.from({ length: count }, (_, i) => i).filter(i => !pivots.includes(i));
  if (inconsistent) return { solvable: false, size, rank: pivots.length, nullity: free.length, trace, swaps, eliminations, minProven: false, clicks: [], candidateCount: 0 };
  let base = 0n;
  for (let k = 0; k < pivots.length; k++) if ((rows[k] >> BigInt(count)) & 1n) base |= 1n << BigInt(pivots[k]);
  const basis = free.map(f => {
    let vector = 1n << BigInt(f);
    for (let k = 0; k < pivots.length; k++) if ((rows[k] >> BigInt(f)) & 1n) vector ^= 1n << BigInt(pivots[k]);
    return vector;
  });
  let best = base, bestWeight = hamming(best), candidateCount = 1;
  // Enumerate a Gray-code path, allowing each candidate to differ by a single nullspace vector.
  const exact = free.length <= exactNullityLimit;
  if (exact) {
    let current = base, priorGray = 0;
    for (let i = 1; i < 2 ** free.length; i++) {
      const gray = i ^ (i >>> 1), change = priorGray ^ gray;
      const basisIndex = 31 - Math.clz32(change);
      current ^= basis[basisIndex];
      const weight = hamming(current);
      if (weight < bestWeight || (weight === bestWeight && current < best)) { best = current; bestWeight = weight; }
      priorGray = gray;
      candidateCount++;
    }
  } else {
    // For unusually large nullspaces, report a feasible solution, not a guaranteed optimum.
    for (const vector of basis) {
      const candidate = best ^ vector;
      if (hamming(candidate) < bestWeight) { best = candidate; bestWeight = hamming(candidate); }
      candidateCount++;
    }
  }
  const clicks = fromMask(best, count).flatMap((v, i) => v ? [i] : []);
  return { solvable: true, size, rank: pivots.length, nullity: free.length, pivots, free,
    minProven: exact, minClicks: clicks.length, clicks, candidateCount, trace, swaps, eliminations,
    solutionCount: `2^${free.length}` };
}
