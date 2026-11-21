export type Stone = 0 | 1 | 2;
export type RoomStatus = 'waiting'|'playing'|'scoring'|'finished';
export type EndReason = 'count'|'resign'|null;
export interface User {id:string; username:string}
export interface Player {userId:string; username:string; color:1|2;connected:boolean}
export interface Score {
  stones:{black:number;white:number};
  territory:{black:number;white:number;neutral:number};
  komi:number; black:number;white:number;winner:1|2|null;margin:number;
}
export interface RoomState {
  code:string;size:9|13|19;komi:number;ownerId:string;
  players:Player[];board:Stone[];status:RoomStatus;turn:1|2;passes:number;
  captured:{black:number;white:number};lastMove:number|null;moveNumber:number;
  deadStones:number[];scoreConfirmations:string[];previewScore:Score|null;
  score:Score|null;winner:1|2|null;result:EndReason;rematchVotes:string[];
}
export interface Ack<T=unknown> {ok:boolean;data?:T;error?:string}
