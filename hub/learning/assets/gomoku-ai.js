export const SIZE=15;
export const DIRS=[[1,0],[0,1],[1,1],[1,-1]];
export const emptyBoard=()=>Array(SIZE*SIZE).fill(0);
export function hasFive(board,index,color){
  const y=Math.floor(index/SIZE),x=index%SIZE;
  if(board[index]!==color)return false;
  for(const [dy,dx] of DIRS){let n=1;for(const sign of [-1,1]){
    let yy=y+dy*sign,xx=x+dx*sign;
    while(yy>=0&&yy<SIZE&&xx>=0&&xx<SIZE&&board[yy*SIZE+xx]===color){n++;yy+=dy*sign;xx+=dx*sign;}
  }if(n>=5)return true;}
  return false;
}
export function analyzeMove(board,index,color){
  if(!Number.isInteger(index)||index<0||index>=SIZE*SIZE||board[index]!==0)return null;
  const b=board.slice();b[index]=color;let total=0;const patterns=[];
  const row=Math.floor(index/SIZE),col=index%SIZE;
  for(const [dy,dx] of DIRS){
    let length=1,open=0;
    for(const s of [-1,1]){
      let y=row+dy*s,x=col+dx*s;
      while(y>=0&&y<SIZE&&x>=0&&x<SIZE&&b[y*SIZE+x]===color){length++;y+=dy*s;x+=dx*s;}
      if(y>=0&&y<SIZE&&x>=0&&x<SIZE&&b[y*SIZE+x]===0)open++;
    }
    let value=0,key='single';
    if(length>=5){value=1e8;key='five';}
    else if(length===4&&open===2){value=900000;key='openFour';}
    else if(length===4&&open===1){value=80000;key='four';}
    else if(length===3&&open===2){value=18000;key='openThree';}
    else if(length===3&&open===1){value=1800;key='three';}
    else if(length===2&&open===2){value=420;key='openTwo';}
    else if(length===2&&open===1){value=55;key='two';}
    total+=value;patterns.push({key,length,open,value});
  }
  return {score:total,patterns};
}
export function candidates(board,color){
  const filled=[];for(let i=0;i<board.length;i++)if(board[i])filled.push(i);
  let near=new Set();
  if(!filled.length) near.add(112);
  else for(const i of filled){const y=Math.floor(i/SIZE),x=i%SIZE;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const yy=y+dy,xx=x+dx;
    if(yy>=0&&yy<SIZE&&xx>=0&&xx<SIZE&&!board[yy*SIZE+xx]) near.add(yy*SIZE+xx);
  }}
  const enemy=color===1?2:1;
  return [...near].map(index=>{
    const attack=analyzeMove(board,index,color),defend=analyzeMove(board,index,enemy);
    if(!attack||!defend)return null;
    const pos=14-(Math.abs(Math.floor(index/SIZE)-7)+Math.abs(index%SIZE-7));
    const score=attack.score+defend.score*.94+pos*1.2;
    return {index,score,attack,defend,reason:attack.score>=defend.score?'attack':'defend'};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index);
}
export function selectAI(board,color=2){return candidates(board,color)[0]||null;}
export const LESSONS=[
  ['第一手：争夺中心','Opening Center','首手尽量靠近中心，让棋形向多个方向扩展。','Start near the center to create future options.',[]],
  ['连成活二','Open Two','争取两端都能延伸的二连。','Create two with two open ends.',[[7,7,1],[6,7,2]]],
  ['活三的威胁','Open Three','活三有两个延伸方向，对手必须认真应对。','An open three can extend from either end.',[[7,6,1],[7,7,1],[6,6,2],[8,8,2]]],
  ['冲四与封堵','Straight Four','一端封堵的四连通常需要马上处理。','A four with one open end is an urgent threat.',[[7,5,2],[7,6,2],[7,7,2],[7,8,2],[7,4,1],[6,6,1]]],
  ['活四与必胜','Open Four','活四有两个立即成五的方向。','An open four has two winning continuations.',[[7,5,1],[7,6,1],[7,7,1],[8,8,2],[6,5,2]]],
  ['防守优先级','Urgent Defense','当对手即将五连时，防守通常优于一般扩张。','Block immediate wins before routine expansion.',[[7,6,2],[7,7,2],[7,8,2],[6,7,2],[8,6,1],[8,7,1]]],
  ['斜线与交叉','Diagonal Threat','斜线也是五连路线，尤其注意交叉攻击。','Diagonal lines count; crossing threats are powerful.',[[5,5,1],[6,6,1],[7,7,1],[8,7,2],[6,7,2]]],
  ['多线评分','Multi-line Value','一个点能同时形成多条威胁时，价值可能比单线更高。','Evaluate a move in all four directions.',[[7,6,1],[7,8,1],[6,7,1],[8,7,1],[5,5,2],[9,9,2]]],
  ['先手与节奏','Initiative','迫使对方回应的威胁可以夺取主动权。','Forcing moves can seize the initiative.',[[7,7,1],[7,8,1],[8,8,2],[9,8,2]]],
  ['组合防守','Defense Combinations','利用多个方向的威胁决定防守先后顺序。','Compare several threats to choose a defense.',[[7,4,2],[7,5,2],[7,6,2],[7,8,1],[8,7,1],[9,7,1]]],
  ['评估函数','Heuristic Scores','根据连子长度、开放端和对手威胁进行加权评分。','Score length, open ends and defensive urgency.',[[7,7,1],[7,6,1],[8,8,2]]],
  ['算法不等于最优','AI Limitations','本实验室是启发式 AI，不是经证明的最强策略。','Heuristic AI is not a proven optimal solver.',[[7,7,1],[7,8,2],[8,7,1]]]
];
export const notation=index=>`${String.fromCharCode(65+index%SIZE)}${Math.floor(index/SIZE)+1}`;
