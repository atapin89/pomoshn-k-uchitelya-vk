// src/types/pomodoro.ts

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroTask {
  id: string;
  title: string;
  estimate: number;          // Оценка в помидорах
  completedPomodoros: number; // Завершено помидоров
  isCompleted: boolean;       // Задача выполнена
  note: string;               // Заметка
  createdAt: number;
  updatedAt: number;
}

export interface PomodoroSettings {
  focusDuration: number;      // минуты
  shortBreakDuration: number; // минуты
  longBreakDuration: number;  // минуты
  longBreakInterval: number;  // после скольких помидоров
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  alarmSound: string;
  alarmVolume: number;
  alarmRepeat: number;
  clickSound: boolean;
  autoClearFinished: boolean;
  autoSwitchTask: boolean;
}

export interface PomodoroStats {
  date: string;       // YYYY-MM-DD
  completedPomodoros: number;
  totalFocusMinutes: number;
  taskStats: Record<string, number>; // taskId -> количество помидоров
}

export interface PomodoroState {
  tasks: PomodoroTask[];
  activeTaskId: string | null;
  settings: PomodoroSettings;
  stats: PomodoroStats[];
  currentPomodoro: number; // счётчик в цикле (1-4)
  completedToday: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: 'bell',
  alarmVolume: 70,
  alarmRepeat: 1,
  clickSound: false,
  autoClearFinished: false,
  autoSwitchTask: true,
};

export const ALARM_SOUNDS = [
  { id: 'bell', label: 'Колокольчик' },
  { id: 'digital', label: 'Цифровой' },
  { id: 'gentle', label: 'Мягкий' },
  { id: 'bird', label: 'Птица' },
];

export function generatePomodoroId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyTask(title: string, estimate: number = 1): PomodoroTask {
  return {
    id: generatePomodoroId('task'),
    title: title.trim(),
    estimate,
    completedPomodoros: 0,
    isCompleted: false,
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatPomodoroTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
