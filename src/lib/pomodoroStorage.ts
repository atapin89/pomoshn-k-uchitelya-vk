// src/lib/pomodoroStorage.ts

import type { PomodoroState, PomodoroTask, PomodoroSettings, PomodoroStats } from '@/types/pomodoro';
import { DEFAULT_SETTINGS, getTodayKey } from '@/types/pomodoro';
import { vkStorageSet } from '@/lib/vkStorage';

const STATE_KEY = 'pomodoro-state';
const SETTINGS_KEY = 'pomodoro-settings';
const STATS_KEY = 'pomodoro-stats';

// ===== СОСТОЯНИЕ =====

export function loadPomodoroState(): PomodoroState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    tasks: [],
    activeTaskId: null,
    settings: loadPomodoroSettings(),
    stats: loadPomodoroStats(),
    currentPomodoro: 0,
    completedToday: 0,
  };
}

export function savePomodoroState(state: PomodoroState): void {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STATE_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(STATE_KEY, json).catch(() => {
      // Не критично — данные останутся в localStorage
    });
  } catch {
    console.error('Ошибка сохранения состояния Помодоро');
  }
}

// ===== НАСТРОЙКИ =====

export function loadPomodoroSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function savePomodoroSettings(settings: PomodoroSettings): void {
  try {
    const json = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(SETTINGS_KEY, json).catch(() => {
      // ignore
    });
  } catch {
    console.error('Ошибка сохранения настроек Помодоро');
  }
}

// ===== СТАТИСТИКА =====

export function loadPomodoroStats(): PomodoroStats[] {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function savePomodoroStats(stats: PomodoroStats[]): void {
  try {
    const json = JSON.stringify(stats);
    localStorage.setItem(STATS_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(STATS_KEY, json).catch(() => {
      // ignore
    });
  } catch {
    console.error('Ошибка сохранения статистики');
  }
}

export function addCompletedPomodoro(taskId: string | null, focusMinutes: number): void {
  const today = getTodayKey();
  const stats = loadPomodoroStats();
  
  let todayStats = stats.find((s) => s.date === today);
  if (!todayStats) {
    todayStats = {
      date: today,
      completedPomodoros: 0,
      totalFocusMinutes: 0,
      taskStats: {},
    };
    stats.push(todayStats);
  }
  
  todayStats.completedPomodoros += 1;
  todayStats.totalFocusMinutes += focusMinutes;
  
  if (taskId) {
    todayStats.taskStats[taskId] = (todayStats.taskStats[taskId] || 0) + 1;
  }
  
  // Ограничиваем историю 90 днями
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  
  const filtered = stats.filter((s) => s.date >= cutoffKey);
  savePomodoroStats(filtered);
}

export function getTodayStats(): PomodoroStats | null {
  const today = getTodayKey();
  const stats = loadPomodoroStats();
  return stats.find((s) => s.date === today) || null;
}

export function getLast7DaysStats(): PomodoroStats[] {
  const stats = loadPomodoroStats();
  const result: PomodoroStats[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayStats = stats.find((s) => s.date === key);
    result.push(dayStats || { date: key, completedPomodoros: 0, totalFocusMinutes: 0, taskStats: {} });
  }
  
  return result;
}

// ===== ЭКСПОРТ / ИМПОРТ =====

export function exportPomodoroData(): string {
  const data = {
    format: 'pomoshnik-uchitelya-pomodoro',
    version: 1,
    state: loadPomodoroState(),
    stats: loadPomodoroStats(),
  };
  return JSON.stringify(data, null, 2);
}

export function importPomodoroData(text: string): boolean {
  try {
    const data = JSON.parse(text);
    if (data.format !== 'pomoshnik-uchitelya-pomodoro') return false;
    
    if (data.state && Array.isArray(data.state.tasks)) {
      savePomodoroState(data.state);
    }
    if (Array.isArray(data.stats)) {
      savePomodoroStats(data.stats);
    }
    if (data.state?.settings) {
      savePomodoroSettings(data.state.settings);
    }
    return true;
  } catch {
    return false;
  }
}

export function exportPomodoroCSV(): string {
  const stats = loadPomodoroStats();
  const lines: string[] = ['Дата,Помидоров,Минут фокуса'];
  
  stats.forEach((s) => {
    lines.push(`${s.date},${s.completedPomodoros},${s.totalFocusMinutes}`);
  });
  
  return lines.join('\n');
}
