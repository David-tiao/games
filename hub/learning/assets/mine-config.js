/** Mine counts and first-click-safe placement; shared by the game and tests. */
export const LEVELS = Object.freeze({
  easy: Object.freeze({rows:9,cols:9,mines:10}),
  medium: Object.freeze({rows:16,cols:16,mines:40}),
  hard: Object.freeze({rows:16,cols:30,mines:99}),
});

/** Every first click and its existing eight neighbors remain empty. */
export function maxMines(rows,cols) {
  if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(cols) || rows<3 || cols<3) {
    throw new RangeError('The mine board needs at least 3 rows and 3 columns');
  }
  return rows*cols-9;
}

export function validateMineCount(raw,rows,cols) {
  const max=maxMines(rows,cols);
  const str=String(raw??'').trim();
  const value=str===''?NaN:Number(str);
  return {ok:Number.isSafeInteger(value)&&value>=1&&value<=max,value,max,min:1};
}

export function neighborsOf(index,rows,cols) {
  const r=Math.floor(index/cols),c=index%cols,out=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<rows&&cc>=0&&cc<cols)out.push(rr*cols+cc);
  }
  return out;
}

/** Exactly N distinct mines, never on the first click or its neighborhood. */
export function generateMinePositions(rows,cols,mines,first,random=Math.random) {
  if(!validateMineCount(mines,rows,cols).ok)throw new RangeError('Invalid mine count');
  const total=rows*cols;
  if(!Number.isSafeInteger(first)||first<0||first>=total)throw new RangeError('Invalid first click');
  const safe=new Set([first,...neighborsOf(first,rows,cols)]);
  const candidates=[];
  for(let i=0;i<total;i++)if(!safe.has(i))candidates.push(i);
  for(let i=candidates.length-1;i>0;i--){
    const r=random();
    if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Random source must return [0,1)');
    const j=Math.floor(r*(i+1));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  return candidates.slice(0,mines);
}
