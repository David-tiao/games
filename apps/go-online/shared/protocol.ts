/** Type-only event contract shared by frontend and backend. */
export type Stone=0|1|2;
export type BoardSize=9|13|19;
export type Status='waiting'|'playing'|'scoring'|'finished';
export interface PublicPlayer {userId:string;username:string;color:1|2;connected:boolean}
export interface AreaScore {
 stones:{black:number;white:number};territory:{black:number;white:number;neutral:number};
 komi:number;black:number;white:number;winner:1|2|null;margin:number;
}
export interface RoomState {
 code:string;size:BoardSize;komi:number;ownerId:string;players:PublicPlayer[];
 board:Stone[];status:Status;turn:1|2;passes:number;captured:{black:number;white:number};
 lastMove:number|null;moveNumber:number;deadStones:number[];scoreConfirmations:string[];
 previewScore:AreaScore|null;score:AreaScore|null;winner:1|2|null;
 result:'count'|'resign'|null;rematchVotes:string[];
}
export interface Ack<T>{ok:boolean;data?:T;error?:string}
export interface ClientEvents {
 'room:create':{size:BoardSize};'room:join':{code:string};'room:rejoin':{code:string};
 'room:leave':Record<string,never>;'game:move':{index:number};'game:pass':Record<string,never>;
 'game:mark-dead':{index:number};'game:confirm-score':Record<string,never>;
 'game:resume':Record<string,never>;'game:resign':Record<string,never>;'game:rematch':Record<string,never>;
}
