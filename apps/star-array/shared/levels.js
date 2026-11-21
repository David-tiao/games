import { applyClicks, solve } from './math.js';

const CHAPTERS = [
  ['初始星火','First Sparks'], ['能量轨道','Energy Orbits'], ['对称星域','Symmetry Field'],
  ['矩阵之谜','Matrix Enigma'], ['深空回响','Deep-space Echoes'], ['终极共振','Final Resonance']
];
const specs = [
  [3,[4],0],[3,[0,2],0],[3,[0,4,8],0],[3,[1,3,5,7],0],
  [5,[12,7],1],[5,[0,4,20,24],1],[5,[6,8,16,18],2],[5,[2,10,12,14,22],2],
  [5,[1,5,11,13,19,23],3],[7,[24,17,31],4],[7,[0,6,42,48,24,3,45],4],[7,[8,12,16,24,32,36,40,3,45],5]
];
export const LEVELS = specs.map(([size, clicks, chapter], idx) => {
  const start = applyClicks(Array(size*size).fill(0), size, clicks);
  const info = solve(start, size);
  return {
    id: idx + 1, size, initial: start, chapter,
    title: [
      '第一道脉冲','边界的回声','三点共鸣','交错的轨道',
      '中心引力','四角之谜','镜像星火','星际折线',
      '隐形方程','深空信号','七维星图','最终方阵'
    ][idx],
    english: [
      'First Pulse','Edge Echoes','Triple Resonance','Interlaced Orbits',
      'Central Gravity','Four Corners','Mirror Sparks','Stellar Zigzag',
      'Hidden Equation','Deep-Space Signal','Sevenfold Chart','Final Array'
    ][idx],
    minClicks: info.minProven ? info.minClicks : null,
    chapterZh: CHAPTERS[chapter][0], chapterEn: CHAPTERS[chapter][1]
  };
});
export function newPuzzle(size, seed = Date.now()) {
  let x = (seed >>> 0) || 1;
  function rand() { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }
  const n = size*size;
  const taps = new Set();
  const target = Math.max(2, Math.min(Math.floor(n*.27), size+5));
  for(let attempts=0;taps.size<target && attempts<500;attempts++) taps.add(Math.floor(rand()*n));
  const initial = applyClicks(Array(n).fill(0), size, [...taps]);
  const answer=solve(initial,size);
  return { id:'random', size, initial, minClicks:answer.minProven?answer.minClicks:null, title:'自由星域', english:'Free Orbit', chapterZh:'自由研究',chapterEn:'Free Research' };
}
