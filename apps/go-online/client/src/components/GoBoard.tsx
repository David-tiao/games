import type { Stone } from '../types';
import {useLanguage} from '../i18n';
interface Props {
    size: 9 | 13 | 19;
    board: Stone[];
    lastMove: number | null;
    deadStones: number[];
    selected: number | null;
    hintIndex?: number | null;
    inspectedStones?: number[];
    inspectedLiberties?: number[];
    onInspect?: (index: number) => void;
    mode: 'play' | 'scoring' | 'readonly';
    onPoint: (index: number) => void;
    onQuickPoint?: (index: number) => void;
    algorithmScores?: Array<{index:number;score:number}>;
    algorithmFocus?: number | null;
}
const L = 28, span = 444;
function starPoints(size: number): number[] {
    const pts = size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];
    const result: number[] = [];
    for (const row of pts)
        for (const col of pts)
            result.push(row * size + col);
    return result;
}
export default function GoBoard({ size, board, lastMove, deadStones, selected, hintIndex = null, inspectedStones = [], inspectedLiberties = [], onInspect, mode, onPoint, onQuickPoint, algorithmScores = [], algorithmFocus = null }: Props) {
    const {lang}=useLanguage();
    const step = span / (size - 1), at = (i: number) => L + step * i;
    const stars = starPoints(size), dead = new Set(deadStones);
    const coords = 'ABCDEFGHJKLMNOPQRST';
    return <div className="go-board-frame">
    <svg className="go-board" viewBox="0 0 500 500" role="grid" aria-label={lang==='en'?`${size}×${size} Go board`:`${size}路围棋棋盘`}>
      <defs>
        <linearGradient id="boardwood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eed2a2"/><stop offset=".35" stopColor="#d8aa72"/><stop offset=".68" stopColor="#c8945d"/><stop offset="1" stopColor="#bb824d"/></linearGradient>
        <pattern id="woodgrain" width="180" height="180" patternUnits="userSpaceOnUse">
          <path d="M0 22 C30 10, 62 13, 96 22 S160 34, 180 25" fill="none" stroke="#8f623a" strokeOpacity=".11" strokeWidth="3"/>
          <path d="M-10 66 C20 56, 50 59, 84 68 S145 80, 188 69" fill="none" stroke="#714624" strokeOpacity=".08" strokeWidth="2.5"/>
          <path d="M0 118 C28 107, 62 111, 98 119 S160 131, 185 123" fill="none" stroke="#a97849" strokeOpacity=".08" strokeWidth="2.6"/>
          <path d="M-6 154 C26 145, 63 147, 97 156 S154 167, 186 158" fill="none" stroke="#6c4527" strokeOpacity=".08" strokeWidth="2.3"/>
        </pattern>
        <radialGradient id="boardglow" cx=".2" cy=".12" r="1"><stop stopColor="#fff8eb" stopOpacity=".55"/><stop offset="1" stopColor="#fff8eb" stopOpacity="0"/></radialGradient>
        <radialGradient id="blackstone" cx=".32" cy=".22" r=".84"><stop stopColor="#7e858d"/><stop offset=".18" stopColor="#4e545b"/><stop offset=".5" stopColor="#23272c"/><stop offset="1" stopColor="#07090c"/></radialGradient>
        <radialGradient id="blackshine" cx=".3" cy=".22" r=".5"><stop stopColor="#ffffff" stopOpacity=".55"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        <radialGradient id="whitestone" cx=".28" cy=".22" r=".86"><stop stopColor="#ffffff"/><stop offset=".5" stopColor="#f4f2ed"/><stop offset=".82" stopColor="#d9d8d0"/><stop offset="1" stopColor="#b4bbb9"/></radialGradient>
        <radialGradient id="whitegloss" cx=".3" cy=".18" r=".46"><stop stopColor="#ffffff" stopOpacity=".92"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        <filter id="stoneShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.2" dy="2" stdDeviation="1.7" floodColor="#2f1e13" floodOpacity=".28"/></filter>
      </defs>
      <rect x="0" y="0" width="500" height="500" rx="9" fill="url(#boardwood)"/><rect x="0" y="0" width="500" height="500" rx="9" fill="url(#woodgrain)" opacity=".95"/><rect x="0" y="0" width="500" height="500" rx="9" fill="url(#boardglow)"/>
      <rect x={L - 5} y={L - 5} width={span + 10} height={span + 10} rx="2" fill="none" stroke="#7e5a38" strokeWidth="1.1" opacity=".64"/><rect x={L - 1.5} y={L - 1.5} width={span + 3} height={span + 3} rx="1" fill="none" stroke="#f7e0b9" strokeWidth=".8" opacity=".32"/>
      {Array.from({ length: size }, (_, i) => <g key={`line-${i}`} stroke="#5d4026" strokeOpacity=".92" strokeWidth={size === 19 ? .88 : 1}>
        <line x1={at(i)} y1={L} x2={at(i)} y2={L + span}/>
        <line x1={L} y1={at(i)} x2={L + span} y2={at(i)}/>
      </g>)}
      {stars.map(i => <g key={`star-${i}`}><circle cx={at(i % size)} cy={at(Math.floor(i / size))} r="3.25" fill="#52361f"/><circle cx={at(i % size) - .8} cy={at(Math.floor(i / size)) - .9} r="1" fill="#8b6644" opacity=".55"/></g>)}
      {Array.from({ length: size }, (_, i) => <g key={`coord-${i}`} fill="#7a5634" fontSize="9" textAnchor="middle" fontWeight="700">
        <text x={at(i)} y="17">{coords[i]}</text>
        <text x="12" y={at(i) + 3}>{size - i}</text>
      </g>)}
      {/* Algorithm heatmap is driven by the very same score function as the AI.
          Display top candidates, not estimated win probabilities. */}
      {algorithmScores.map((candidate, rank) => {
          if (board[candidate.index] !== 0) return null;
          const x=at(candidate.index%size),y=at(Math.floor(candidate.index/size));
          const best=algorithmScores[0]?.score??0;
          const worst=algorithmScores[algorithmScores.length-1]?.score??0;
          const normalized=(candidate.score-worst)/Math.max(1,best-worst);
          const r=Math.min(step*.36,15);
          return <g key={`algo-${candidate.index}`} pointerEvents="none">
            <circle cx={x} cy={y} r={r} fill={candidate.score>=0?'#4c9a78':'#a4614c'} fillOpacity={.14+normalized*.48}
              stroke={rank<3?'#245f47':'#7e664e'} strokeOpacity={rank<3?.8:.28} strokeWidth={rank<3?1.5:.7}/>
            {rank<3&&<text x={x} y={y+Math.max(2.1,Math.min(step*.095,4))} fill="#173f2c" textAnchor="middle"
                fontWeight="800" fontSize={Math.min(step*.35,12)}>{rank+1}</text>}
          </g>;
      })}
      {algorithmFocus!==null&&board[algorithmFocus]===0&&<circle pointerEvents="none" cx={at(algorithmFocus%size)} cy={at(Math.floor(algorithmFocus/size))}
        r={Math.min(step*.47,18)} fill="none" stroke="#a64326" strokeWidth="2.8" strokeDasharray="5 3"/>}
      {board.map((stone, index) => {
            if (!stone)
                return null;
            const x = at(index % size), y = at(Math.floor(index / size)), r = Math.min(step * .48, 17.7);
            return <g key={`stone-${index}`}>
          <circle cx={x + 1} cy={y + 2} r={r} fill="#392819" opacity=".24"/>
          <circle cx={x} cy={y} r={r} fill={stone === 1 ? 'url(#blackstone)' : 'url(#whitestone)'} stroke={stone === 1 ? '#000a' : '#8e8779'} strokeWidth=".7"/>
          {dead.has(index) && <g stroke="#e94646" strokeWidth="2.5" strokeLinecap="round"><line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5}/><line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5}/></g>}
          {lastMove === index && mode !== 'scoring' && <circle cx={x} cy={y} r="3" fill={stone === 1 ? '#f7e4c7' : '#913f2a'}/>}
        </g>;
        })}
      {mode !== 'scoring' && inspectedStones.map(index => <circle key={`inspect-stone-${index}`} cx={at(index % size)} cy={at(Math.floor(index / size))} r={Math.min(step * .49, 18.5)} stroke="#ffdf7f" strokeWidth="2.5" fill="none" pointerEvents="none"/>)}
      {mode !== 'scoring' && inspectedLiberties.map(index => <g key={`inspect-liberty-${index}`} pointerEvents="none">
        <circle cx={at(index % size)} cy={at(Math.floor(index / size))} r={Math.min(step * .24, 9)} fill="#9be2f2" fillOpacity=".58" stroke="#116d83" strokeWidth="1.7"/>
        <circle cx={at(index % size)} cy={at(Math.floor(index / size))} r="2.2" fill="#09516a"/>
      </g>)}
      {mode === 'play' && hintIndex !== null && board[hintIndex] === 0 && hintIndex !== selected && <g pointerEvents="none">
        <circle cx={at(hintIndex % size)} cy={at(Math.floor(hintIndex / size))} r={Math.min(step * .34, 14)} fill="#b9e9b0" fillOpacity=".18" stroke="#2e8d62" strokeWidth="2.7" strokeDasharray="3 3"/>
        <circle cx={at(hintIndex % size)} cy={at(Math.floor(hintIndex / size))} r="2.8" fill="#28764d"/>
      </g>}
      {mode === 'play' && selected !== null && board[selected] === 0 && <g>
        <circle cx={at(selected % size)} cy={at(Math.floor(selected / size))} r={Math.min(step * .48, 17.7)} fill="#14171c" opacity=".56" stroke="#fff5e1" strokeWidth="1"/><ellipse cx={at(selected % size) - 4} cy={at(Math.floor(selected / size)) - 5} rx="6.2" ry="4" fill="#ffffff" opacity=".22"/><circle cx={at(selected % size)} cy={at(Math.floor(selected / size))} r="4" fill="#f6d28d"/>
      </g>}
      {mode !== 'scoring' && onInspect && board.map((stone, index) => {
            if (!stone)
                return null;
            return <circle key={`inspect-hit-${index}`} cx={at(index % size)} cy={at(Math.floor(index / size))} r={step * .47} fill="transparent" className="board-hit" tabIndex={0} role="button" aria-label={lang==='en'?`Inspect liberties: ${stone===1?'Black':'White'}, row ${Math.floor(index/size)+1}, column ${index%size+1}`:`查看${stone===1?'黑棋':'白棋'}第${Math.floor(index/size)+1}行第${index%size+1}列的气`} onClick={() => onInspect(index)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onInspect(index);
            } }}/>;
        })}
      {mode !== 'readonly' && board.map((stone, index) => {
            if (mode === 'play' && stone !== 0)
                return null;
            if (mode === 'scoring' && stone === 0)
                return null;
            const x = at(index % size), y = at(Math.floor(index / size));
            return <circle key={`tap-${index}`} cx={x} cy={y} r={step * .49} fill="transparent" className="board-hit" tabIndex={0} role="button" aria-label={lang==='en'?`Row ${Math.floor(index/size)+1}, column ${index%size+1}: ${mode==='scoring'?'mark dead':'preview move'}`:`${Math.floor(index/size)+1}行${index%size+1}列${mode==='scoring'?'标记死子':'选择落子'}`} onClick={() => onPoint(index)} onDoubleClick={() => onQuickPoint?.(index)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPoint(index);
            } }}/>;
        })}
    </svg>
  </div>;
}
