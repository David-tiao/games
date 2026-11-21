/** Explainable beginner Go coach. Rules-based only; NOT a professional life-and-death engine. */
import { BLACK, WHITE, EMPTY, neighbors, groupAt, tryMove } from './goRules.js';

const letters = 'ABCDEFGHJKLMNOPQRST';
export function coordinate(index, size) {
  return `${letters[index % size]}${size - Math.floor(index / size)}`;
}

function collectGroups(board, size, color) {
  const visited = new Set(), result = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== color || visited.has(i)) continue;
    const group = groupAt(board, i, size);
    group.stones.forEach(stone => visited.add(stone));
    result.push(group);
  }
  return result;
}

function isSimpleEye(board, size, index, color) {
  return neighbors(index, size).every(adjacent => board[adjacent] === color);
}

function openingValue(index, size, occupied) {
  const row = Math.floor(index / size), col = index % size;
  const edge = Math.min(row, col, size - 1 - row, size - 1 - col);
  const target = size === 9 ? 2 : 3;
  const preferred = [target, size - 1 - target];
  const isStar = preferred.includes(row) && preferred.includes(col);
  let value = isStar ? 12 : 0;
  if (edge === 0) value -= 13;
  else if (edge === 1) value -= 6;
  else if (edge === target) value += 5;
  if (occupied === 0) value += isStar ? 12 : -Math.abs(edge - target) * 2;
  return value;
}

/** Returns move analyses in descending heuristic order; illegals excluded. */
export function evaluateCandidates(board, size, color, history = []) {
  if (![9, 13, 19].includes(size) || board.length !== size * size || ![BLACK, WHITE].includes(color)) return [];
  const enemy = color === BLACK ? WHITE : BLACK;
  const occupied = board.reduce((sum, stone) => sum + (stone ? 1 : 0), 0);
  const ownBefore = collectGroups(board, size, color);
  const weakOwn = ownBefore.filter(group => group.liberties.length === 1);
  const nearbyOccupied = board.flatMap((stone, index) => stone ? [index] : []);
  const candidates = [];
  for (let index = 0; index < board.length; index++) {
    if (board[index] !== EMPTY) continue;
    let result;
    try { result = tryMove(board, index, color, size, history); }
    catch { continue; }
    const ownAfter = groupAt(result.board, index, size);
    const liberties = ownAfter.liberties.length;
    const rescue = weakOwn.filter(group => group.liberties.includes(index)).reduce((count, group) => count + group.stones.length, 0);
    const rescueSucceeded = rescue > 0 && liberties > 1;
    const adjacent = neighbors(index, size);
    const friendAdjacent = adjacent.filter(i => board[i] === color).length;
    const enemyAdjacent = adjacent.filter(i => board[i] === enemy).length;
    const threatened = new Set();
    for (const near of adjacent) {
      if (result.board[near] !== enemy) continue;
      const group = groupAt(result.board, near, size);
      if (group?.liberties.length === 1) group.stones.forEach(s => threatened.add(s));
    }
    const ownGroupsNear = new Set();
    for (const near of adjacent) {
      if (board[near] !== color) continue;
      const group = groupAt(board, near, size);
      if (group) ownGroupsNear.add(Math.min(...group.stones));
    }
    const closest = nearbyOccupied.reduce((min, p) => {
      const d = Math.max(Math.abs(Math.floor(p / size) - Math.floor(index / size)), Math.abs(p % size - index % size));
      return Math.min(min, d);
    }, size);
    // One authoritative score ledger: the UI visualizes these EXACT deltas,
    // so the explanation cannot drift away from the move-selection algorithm.
    let score = 0;
    const factors = [];
    const add = (key, delta) => { score += delta; if (delta || key === 'base') factors.push({ key, delta }); };
    add('base', 8);
    add('opening', openingValue(index, size, occupied));
    if (occupied > 0) add('distance', closest === 1 ? 7 : closest === 2 ? 8 : closest === 3 ? 2 : -Math.min(10, closest * 2));
    add('capture', result.captured * 100);
    if (rescueSucceeded) add('rescue', rescue * 75 + 25);
    else if (rescue > 0) add('failedRescue', -30);
    add('atari', threatened.size * 17);
    add('ownNeighbor', friendAdjacent * 3);
    add('enemyNeighbor', enemyAdjacent * 2);
    if (ownGroupsNear.size >= 2) add('connect', 15);
    if (liberties === 1 && result.captured === 0) add('dangerOneLiberty', -70);
    else if (liberties === 2) add('dangerTwoLiberties', -10);
    if (isSimpleEye(board, size, index, color)) add('selfEye', -100);
    // Avoid a first-line move when no tactical reason exists.
    if (occupied < 14 && result.captured === 0 && !rescueSucceeded && Math.min(
      Math.floor(index / size),index % size,size-1-Math.floor(index / size),size-1-index%size) === 0) add('firstLine', -20);

    let title, reason, topic;
    if (result.captured > 0) {
      title = `提走 ${result.captured} 颗棋子`;
      reason = `落在 ${coordinate(index, size)}，会让相邻的对方棋块失去最后一口气，从棋盘上提走 ${result.captured} 子。围棋里先检查能否提子，是很好的习惯。`;
      topic = '提子';
    } else if (rescueSucceeded) {
      title = `救活自己的 ${rescue} 颗棋子`;
      reason = `你的棋块原本只剩一口气（叫作“被叫吃”），下在 ${coordinate(index, size)} 能增加气，暂时脱离危险。先救急再扩张。`;
      topic = '逃脱叫吃';
    } else if (threatened.size > 0) {
      title = `叫吃对手 ${threatened.size} 子`;
      reason = `下在 ${coordinate(index, size)}，可使对手相邻棋块只剩一口气。下一手可能提子，但对方有机会先逃走或反击。`;
      topic = '叫吃';
    } else if (ownGroupsNear.size >= 2) {
      title = '连接自己的棋块';
      reason = `${coordinate(index, size)} 可把相邻的己方棋块连成更大的整体，减少被分别围困的风险。不过连接并不保证完全安全，还要数一数气。`;
      topic = '连接';
    } else if (occupied < Math.max(8, Math.round(size * size * .07))) {
      title = '先从角部布局';
      reason = `${coordinate(index, size)} 靠近棋盘角部。初学者可以记住“金角银边草肚皮”：角部利用两条边界，通常更容易围地。`;
      topic = '布局';
    } else if (enemyAdjacent || friendAdjacent) {
      title = '靠近已有棋形发展';
      reason = `${coordinate(index, size)} 在已有棋子附近，便于连接或施压。落子后这块棋有 ${liberties} 口气，注意是否容易被叫吃。`;
      topic = '发展';
    } else {
      title = '发展棋形与地盘';
      reason = `${coordinate(index, size)} 是一个候选落点，可以尝试控制附近空间。但还需要观察对方下一手的应对。`;
      topic = '方向';
    }
    candidates.push({ index, coordinate: coordinate(index, size), score, title, reason, topic, factors, metrics: { captured: result.captured, rescued: rescueSucceeded ? rescue : 0, threatened: threatened.size, liberties, friendAdjacent, enemyAdjacent, nearGroups: ownGroupsNear.size } });
  }
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates;
}

/** The normal teaching shortlist retains spacing/diversity, exactly as before. */
export function recommendMoves(board, size, color, history = [], limit = 3) {
  if (limit <= 0) return [];
  const candidates = evaluateCandidates(board, size, color, history);
  const seen = new Set();
  const spread = [];
  // Provide a few distinct teaching directions rather than 3 nearly identical adjacent points.
  for (const candidate of candidates) {
    if (spread.length >= limit) break;
    const nearSelected = spread.some(p => Math.max(
      Math.abs(Math.floor(p.index / size) - Math.floor(candidate.index / size)),
      Math.abs(p.index % size - candidate.index % size)) <= 1);
    if (!nearSelected || candidate.score > 120) {spread.push(candidate); seen.add(candidate.index);}
  }
  for (const candidate of candidates) {
    if (spread.length >= limit) break;
    if (!seen.has(candidate.index)) spread.push(candidate);
  }
  return spread;
}

export function analyzePosition(board, size, color, history = []) {
  const own = collectGroups(board, size, color);
  const enemy = collectGroups(board, size, color === BLACK ? WHITE : BLACK);
  const atariOwn = own.filter(group => group.liberties.length === 1);
  const atariEnemy = enemy.filter(group => group.liberties.length === 1);
  const moves = recommendMoves(board, size, color, history, 3);
  let summary, lesson;
  if (atariOwn.length) {
    const count = atariOwn.reduce((sum, g) => sum + g.stones.length, 0);
    summary = `注意！你有 ${count} 颗棋子处于“叫吃”危险中。`;
    lesson = '气：与一块棋相邻的空交叉点，就是这块棋的气。相连的同色棋子共同拥有这些气；失去全部气就会被提走。';
  } else if (atariEnemy.length) {
    summary = '对方有棋块只剩一口气，寻找提子的机会。';
    lesson = '提子：当一块棋的最后一口气被堵住时，整块棋会被从棋盘上移除。';
  } else if (board.filter(Boolean).length < 10) {
    summary = '现在是布局阶段：先从角部、边上建立基础。';
    lesson = '金角银边草肚皮：在同样的棋子数量下，角一般比边容易围地，边又比中央容易。但这不是必须遵守的死规则。';
  } else {
    summary = '观察双方棋块的气，优先处理危险，然后考虑连接和围地。';
    lesson = '每走一步前可以问自己：会不会被吃？有没有棋块需要救？这一手帮助我围地还是让对方更强？';
  }
  return { moves, summary, lesson };
}

/** Tiny, local, rule-based opponent. No cloud model or hidden human player. */
export function chooseAiMove(board, size, color, history = [], difficulty = 'beginner', seed = 0) {
  const ranked = recommendMoves(board, size, color, history, 12);
  if (!ranked.length) return null;
  const top = difficulty === 'beginner' ? Math.min(5, ranked.length) : Math.min(2, ranked.length);
  const pick = Math.abs((seed * 17 + board.reduce((n, v, i) => n + v * (i + 1), 0))) % top;
  return ranked[pick].index;
}

/** Pure, deterministic inspectable trace of the same heuristic used by the AI. */
export function traceAlgorithm(board, size, color, history = [], difficulty = 'beginner', seed = 0) {
  const ranked = evaluateCandidates(board, size, color, history);
  const shortlist = recommendMoves(board, size, color, history, 12);
  const poolSize = Math.min(difficulty === 'beginner' ? 5 : 2, shortlist.length);
  const weightedSeed = seed * 17 + board.reduce((n, v, i) => n + v * (i + 1), 0);
  const selectedPoolIndex = poolSize ? Math.abs(weightedSeed) % poolSize : -1;
  const chosen = selectedPoolIndex === -1 ? null : shortlist[selectedPoolIndex];
  return {
    considered: board.filter(stone => stone === EMPTY).length,
    legal: ranked.length,
    illegal: board.filter(stone => stone === EMPTY).length - ranked.length,
    ranked,
    shortlist,
    pool: shortlist.slice(0, poolSize),
    chosen,
    chosenPoolIndex: selectedPoolIndex,
    weightedSeed,
    difficulty,
  };
}
