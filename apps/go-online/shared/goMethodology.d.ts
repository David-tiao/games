export interface MethodStep{color:1|2;at:[number,number]|null;note:string;noteEn:string}
export interface GoMethod{id:string;category:string;title:string;titleEn:string;principle:string;principleEn:string;question:string;questionEn:string;size:9|13|19;black:number[][];white:number[][];steps:MethodStep[]}
export const GO_METHODS:GoMethod[];
export function methodBoardAt(method:GoMethod,ply:number):{board:(0|1|2)[];lastMove:number|null;captures:number};
export function methodToSgf(method:GoMethod):string;
