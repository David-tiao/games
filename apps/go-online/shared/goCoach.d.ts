export interface MoveSuggestion {
  index: number;
  coordinate: string;
  score: number;
  title: string;
  reason: string;
  topic: string;
  factors: Array<{key: string; delta: number}>;
  metrics: {captured:number; rescued:number; threatened:number; liberties:number; friendAdjacent:number; enemyAdjacent:number; nearGroups:number};
}
export interface CoachAnalysis {
  moves: MoveSuggestion[];
  summary: string;
  lesson: string;
}
export function coordinate(index: number, size: number): string;
export function recommendMoves(board: number[], size: number, color: 1 | 2, history?: string[], limit?: number): MoveSuggestion[];
export function analyzePosition(board: number[], size: number, color: 1 | 2, history?: string[]): CoachAnalysis;
export function chooseAiMove(board: number[], size: number, color: 1 | 2, history?: string[], difficulty?: 'beginner' | 'standard', seed?: number): number | null;

export interface AlgorithmTrace {
  considered: number; legal: number; illegal: number; ranked: MoveSuggestion[]; shortlist: MoveSuggestion[];
  pool: MoveSuggestion[]; chosen: MoveSuggestion | null; chosenPoolIndex: number; weightedSeed: number; difficulty: string;
}
export function evaluateCandidates(board:number[], size:number, color:1|2, history?:string[]):MoveSuggestion[];
export function traceAlgorithm(board:number[], size:number, color:1|2, history?:string[], difficulty?:'beginner'|'standard', seed?:number):AlgorithmTrace;
