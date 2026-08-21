export interface EduQuestion {
  id: string;
  text: string;
  answer: string;
  points: number;
}

export interface EduRound {
  id: string;
  title: string;
  questions: EduQuestion[];
}

export interface EduGame {
  id: string;
  title: string;
  rounds: EduRound[];
  createdAt: number;
  updatedAt: number;
}

export interface EduPlayer {
  id: string;
  name: string;
  score: number;
}

export const DEFAULT_POINTS = [10, 20, 30, 40, 50];

export function generateEduId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyGame(title: string): EduGame {
  return {
    id: generateEduId('edugame'),
    title: title.trim() || 'Новая игра',
    rounds: [{ id: generateEduId('round'), title: 'Раунд 1', questions: [] }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function gameQuestionsCount(game: EduGame): number {
  return game.rounds.reduce((sum, r) => sum + r.questions.length, 0);
}
