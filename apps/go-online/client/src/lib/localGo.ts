import {areaScore,boardKey,groupAt,KOMI,tryMove} from '../../../shared/goRules.js';
import {chooseAiMove,recommendMoves} from '../../../shared/goCoach.js';
import type {MoveSuggestion} from '../../../shared/goCoach.js';
import type {RoomState,Score,Stone} from '../types';

export type AiDifficulty = 'beginner' | 'standard';
export interface PracticeGame extends RoomState {
  history: string[];
  aiDifficulty: AiDifficulty;
  lastAiExplanation: MoveSuggestion | null;
}
const scoreOf = (game:PracticeGame):Score => areaScore(game.board,game.size,game.deadStones,KOMI);

export function createPractice(size:9|13|19=9,aiDifficulty:AiDifficulty='beginner',name='你'):PracticeGame {
  const board:Stone[]=Array(size*size).fill(0);
  return {
    code:'LOCAL',size,komi:KOMI,ownerId:'local-player',
    players:[
      {userId:'local-player',username:name,color:1,connected:true},
      {userId:'offline-ai',username:aiDifficulty==='beginner'?'入门教学 AI':'进阶教学 AI',color:2,connected:true}
    ],
    board,status:'playing',turn:1,passes:0,
    captured:{black:0,white:0},lastMove:null,moveNumber:0,
    deadStones:[],scoreConfirmations:[],previewScore:null,score:null,
    winner:null,result:null,rematchVotes:[],history:[boardKey(board)],aiDifficulty,lastAiExplanation:null
  };
}
export function playPracticeMove(game:PracticeGame,index:number,color:1|2):PracticeGame {
  if(game.status!=='playing'||game.turn!==color)throw Error('现在不能落子。');
  const result=tryMove(game.board,index,color,game.size,game.history);
  return {...game,board:result.board,history:[...game.history,result.key],
    captured:{...game.captured,[color===1?'black':'white']:game.captured[color===1?'black':'white']+result.captured},
    moveNumber:game.moveNumber+1,lastMove:index,turn:color===1?2:1,passes:0};
}
export function passPractice(game:PracticeGame,color:1|2):PracticeGame {
  if(game.status!=='playing'||game.turn!==color)throw Error('当前不能虚手。');
  const passes=game.passes+1;
  return {...game,passes,moveNumber:game.moveNumber+1,lastMove:null,
    turn:color===1?2:1,status:passes===2?'scoring':game.status,
    deadStones:passes===2?[]:game.deadStones,
    previewScore:passes===2?scoreOf({...game,deadStones:[]}):null};
}
export function aiStep(game:PracticeGame):PracticeGame {
  if(game.status!=='playing'||game.turn!==2)return game;
  const index=chooseAiMove(game.board,game.size,2,game.history,game.aiDifficulty,game.moveNumber);
  if(index===null)return passPractice(game,2);
  const explanation=recommendMoves(game.board,game.size,2,game.history,12).find(item=>item.index===index)||null;
  return {...playPracticeMove(game,index,2),lastAiExplanation:explanation};
}
export function togglePracticeDead(game:PracticeGame,index:number):PracticeGame {
  if(game.status!=='scoring'||!game.board[index])throw Error('请点击一块棋子进行死子标记。');
  const group=groupAt(game.board,index,game.size);
  if(!group)return game;
  const dead=new Set(game.deadStones);
  const all=group.stones.every(i=>dead.has(i));
  group.stones.forEach(i=>all?dead.delete(i):dead.add(i));
  const next={...game,deadStones:[...dead]};
  return {...next,previewScore:scoreOf(next)};
}
/** Tutorial-only: voluntarily stop a local practice and learn how scoring works. */
export function enterPracticeScoring(game:PracticeGame):PracticeGame {
  if(game.status!=='playing')throw Error('当前不是下棋阶段。');
  const next:PracticeGame={...game,status:'scoring',passes:2,deadStones:[],lastMove:null};
  return {...next,previewScore:scoreOf(next)};
}
export function finishPractice(game:PracticeGame):PracticeGame {
  if(game.status!=='scoring')throw Error('还没有进入数目阶段。');
  const score=scoreOf(game);
  return {...game,status:'finished',score,previewScore:score,winner:score.winner,result:'count'};
}
export function resumePractice(game:PracticeGame):PracticeGame {
  if(game.status!=='scoring')throw Error('当前无需继续对局。');
  return {...game,status:'playing',passes:0,deadStones:[],previewScore:null};
}
export function resignPractice(game:PracticeGame):PracticeGame {
  if(game.status==='finished')return game;
  return {...game,status:'finished',winner:2,result:'resign',score:null};
}
