// src/types/tapper.ts

export interface TapperStudent {
  id: string;
  name: string;
  answerCount: number;
  isPresent: boolean;
}

export interface TapperList {
  id: string;
  name: string;
  students: TapperStudent[];
  createdAt: number;
  updatedAt: number;
}

export function generateTapperId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyTapperList(name: string): TapperList {
  return {
    id: generateTapperId('tapper-list'),
    name: name.trim() || 'Новый список',
    students: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
