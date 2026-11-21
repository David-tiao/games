export const BLACK: 1;
export const WHITE: 2;
export const EMPTY: 0;
export const SIZES: number[];
export const KOMI: number;
export interface Group {color: 1 | 2; stones: number[]; liberties: number[];}
export interface Scoring {stones:{black:number;white:number};territory:{black:number;white:number;neutral:number};komi:number;black:number;white:number;winner:1|2|null;margin:number;}
export function neighbors(index:number,size:number):number[];
export function groupAt(board:number[],index:number,size:number):Group|null;
export function boardKey(board:number[]):string;
export function tryMove(board:number[],index:number,color:1|2,size:number,history?:string[]):{board:(0|1|2)[];captured:number;key:string};
export function areaScore(board:number[],size:number,deadIndices?:number[],komi?:number):Scoring;
