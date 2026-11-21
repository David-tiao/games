// This solver is intentionally blind to hidden mine locations. It uses only revealed clues and flags.
export function infer(rows,cols,visible){
  if(!Number.isInteger(rows)||!Number.isInteger(cols)||visible.length!==rows*cols)throw Error('Invalid board');
  const neighbors=i=>{const r=Math.floor(i/cols),c=i%cols,out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dy&&!dx)continue;const y=r+dy,x=c+dx;if(y>=0&&y<rows&&x>=0&&x<cols)out.push(y*cols+x);
  }return out;};
  const eq=[];
  for(let i=0;i<visible.length;i++){
    const cell=visible[i];if(!cell.revealed||!Number.isInteger(cell.count)||cell.count<=0)continue;
    const around=neighbors(i);
    const unknown=around.filter(j=>!visible[j].revealed&&!visible[j].flagged);
    const flags=around.filter(j=>visible[j].flagged).length;
    const need=cell.count-flags;
    eq.push({at:i,unknown,need,clue:cell.count,flags});
  }
  let equations=eq.map(e=>({vars:new Set(e.unknown),need:e.need,from:e.at}));
  let safe=new Set(),mines=new Set(),messages=[];
  for(let pass=0;pass<10;pass++){
    let changed=false;
    for(const e of equations){
      const remaining=[...e.vars].filter(i=>!safe.has(i)&&!mines.has(i));
      const required=e.need-[...e.vars].filter(i=>mines.has(i)).length;
      if(required<0||required>remaining.length)continue; // inconsistent flags: do not advise
      const values=required===0?safe:required===remaining.length?mines:null;
      if(!values)continue;
      for(const i of remaining)if(!values.has(i)){
        values.add(i);changed=true;
        if(messages.length<15)messages.push(`${required===0?'SAFE':'MINE'} @ ${Math.floor(i/cols)+1},${i%cols+1} (clue ${Math.floor(e.from/cols)+1},${e.from%cols+1})`);
      }
    }
    // Subset constraints: if A is subset of B, B\A has need(B)-need(A).
    const sizeBefore=equations.length;
    const additions=[];
    for(let a=0;a<sizeBefore;a++)for(let b=0;b<sizeBefore;b++){
      if(a===b)continue;const A=equations[a],B=equations[b];
      if(A.vars.size>=B.vars.size)continue;
      if([...A.vars].some(v=>!B.vars.has(v)))continue;
      const diff=[...B.vars].filter(v=>!A.vars.has(v)),need=B.need-A.need;
      if(diff.length&&need>=0&&need<=diff.length&&!equations.some(e=>e.need===need&&e.vars.size===diff.length&&diff.every(v=>e.vars.has(v)))&&!additions.some(e=>e.need===need&&e.vars.size===diff.length&&diff.every(v=>e.vars.has(v))))
        additions.push({vars:new Set(diff),need,from:B.from});
    }
    if(additions.length){equations.push(...additions);changed=true;}
    if(!changed)break;
  }
  return {safe:[...safe].sort((a,b)=>a-b),mines:[...mines].sort((a,b)=>a-b),equations:eq,derived:equations.length-eq.length,messages,complete:safe.size+mines.size>0};
}
