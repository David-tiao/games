export interface GoLesson {
  id:number;chapter:string;title:string;badge:string;
  concept:string;why:string;task:string;hint:string;expand:string;mistake:string;success:string;
  black:number[][];white:number[][];targets:number[][];size?:9|13|19;goal?:'pass';
  english?:{chapter:string;title:string;badge:string;concept:string;why:string;task:string;hint:string;expand:string;mistake:string;success:string};
}
export const GO_LESSONS:GoLesson[];
export function buildLessonBoard(lesson:GoLesson):(0|1|2)[];
export function lessonTargetIndices(lesson:GoLesson):number[];
export function lessonGoalHit(lesson:GoLesson,index:number|null):boolean;
export function lessonMoveCompleted(lesson:GoLesson,firstCorrect:boolean|null,game:{moveNumber:number;turn:1|2;status:string}):boolean;
