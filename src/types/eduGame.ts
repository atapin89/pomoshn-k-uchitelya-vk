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
    rounds: [{
      id: generateEduId('round'),
      title: 'Раунд 1',
      questions: [{
        id: generateEduId('q'),
        text: '',
        answer: '',
        points: DEFAULT_POINTS[0],
      }],
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function gameQuestionsCount(game: EduGame): number {
  return game.rounds.reduce((sum, r) => sum + r.questions.length, 0);
}

// ===== Валидация =====

export function isEduQuestion(data: unknown): data is EduQuestion {
  if (typeof data !== 'object' || data === null) return false;
  const q = data as Record<string, unknown>;
  
  return (
    typeof q.id === 'string' &&
    typeof q.text === 'string' &&
    typeof q.answer === 'string' &&
    typeof q.points === 'number' &&
    q.points > 0
  );
}

export function isEduRound(data: unknown): data is EduRound {
  if (typeof data !== 'object' || data === null) return false;
  const r = data as Record<string, unknown>;
  
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    Array.isArray(r.questions) &&
    r.questions.every(isEduQuestion)
  );
}

export function isEduGame(data: unknown): data is EduGame {
  if (typeof data !== 'object' || data === null) return false;
  const g = data as Record<string, unknown>;
  
  return (
    typeof g.id === 'string' &&
    typeof g.title === 'string' &&
    Array.isArray(g.rounds) &&
    g.rounds.every(isEduRound) &&
    typeof g.createdAt === 'number' &&
    typeof g.updatedAt === 'number'
  );
}

export function isEduPlayer(data: unknown): data is EduPlayer {
  if (typeof data !== 'object' || data === null) return false;
  const p = data as Record<string, unknown>;
  
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.score === 'number'
  );
}

export function validateRoundPoints(round: EduRound): boolean {
  const points = round.questions.map(q => q.points);
  return new Set(points).size === points.length;
}

export function validateGame(game: EduGame): string[] {
  const errors: string[] = [];
  
  if (!game.title.trim()) {
    errors.push('Название игры не может быть пустым');
  }
  
  if (game.rounds.length === 0) {
    errors.push('Добавьте хотя бы один раунд');
  }
  
  game.rounds.forEach((round, roundIndex) => {
    if (!round.title.trim()) {
      errors.push(`Раунд ${roundIndex + 1}: название не может быть пустым`);
    }
    
    if (round.questions.length === 0) {
      errors.push(`Раунд «${round.title || roundIndex + 1}»: добавьте хотя бы один вопрос`);
    }
    
    round.questions.forEach((question, questionIndex) => {
      if (!question.text.trim()) {
        errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: текст вопроса не может быть пустым`);
      }
      
      if (!question.answer.trim()) {
        errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: ответ не может быть пустым`);
      }
      
      if (question.points <= 0) {
        errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: баллы должны быть положительными`);
      }
    });
    
    if (!validateRoundPoints(round)) {
      errors.push(`Раунд «${round.title || roundIndex + 1}»: есть дубликаты баллов`);
    }
  });
  
  return errors;
}
