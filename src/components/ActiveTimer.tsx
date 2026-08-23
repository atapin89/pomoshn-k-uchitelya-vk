import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Check, Plus } from 'lucide-react';
import type { LessonTemplate } from '@/types';
import { formatTime } from '@/lib/format';
import { playBell } from '@/lib/sound';
import { triggerHaptic } from '@/lib/haptic';
import {
  requestWakeLock,
  releaseWakeLock,
  attachWakeLockVisibilityHandler,
} from '@/lib/wakeLock';
import CircularProgress from './CircularProgress';
import YandexAdBlock from './YandexAdBlock';
import BackButton from './BackButton';

interface ActiveTimerProps {
  template: LessonTemplate;
  onReset: () => void;
}

const TICK_MS = 250;

export default function ActiveTimer({ template, onReset }: ActiveTimerProps) {
  const [stageDurations, setStageDurations] = useState(() =>
    template.stages.map((s) => s.duration * 60),
  );
  
  const totalSeconds = useMemo(
    () => stageDurations.reduce((s, d) => s + d, 0),
    [stageDurations],
  );
  
  const stageBoundaries = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const d of stageDurations) {
      acc += d;
      arr.push(acc);
    }
    return arr;
  }, [stageDurations]);

  const [isRunning, setIsRunning] = useState(true);
  const [endAt, setEndAt] = useState(() => Date.now() + totalSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  const remainingMs = Math.max(0, endAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const elapsedSec = totalSeconds - remainingSec;
  const fraction = totalSeconds > 0 ? remainingSec / totalSeconds : 0;

  const currentStageIdx = Math.min(
    stageBoundaries.findIndex((b) => elapsedSec < b),
    stageBoundaries.length - 1,
  );
  const stageIdx = currentStageIdx === -1 ? stageBoundaries.length - 1 : currentStageIdx;
  const currentStage = template.stages[stageIdx];

  const stageEndSec = stageBoundaries[stageIdx];
  const stageRemainingSec = Math.max(0, stageEndSec - elapsedSec);

  const colorClass =
    fraction > 0.35
      ? 'text-purple-600'
      : fraction >= 0.15
        ? 'text-violet-500'
        : 'text-purple-800';
  const strokeClass =
    fraction > 0.35
      ? 'stroke-purple-600'
      : fraction >= 0.15
        ? 'stroke-violet-500'
        : 'stroke-purple-800';
  const pulse = fraction < 0.15;

  // Таймер с setInterval + requestAnimationFrame для плавности
  useEffect(() => {
    if (!isRunning) return;
    
    // Основной таймер
    const interval = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    
    // Дополнительный RAF для плавности
    let rafId: number;
    const raf = () => {
      setNow(Date.now());
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafId);
    };
  }, [isRunning]);

  // Wake Lock
  useEffect(() => {
    if (!isRunning) return;
    void requestWakeLock();
    const detach = attachWakeLockVisibilityHandler();
    return () => {
      detach();
      void releaseWakeLock();
    };
  }, [isRunning]);

  // Отслеживание смены этапа
  const prevStageIdxRef = useRef(stageIdx);
  useEffect(() => {
    if (prevStageIdxRef.current !== stageIdx) {
      const finished = stageIdx > prevStageIdxRef.current;
      prevStageIdxRef.current = stageIdx;
      if (finished) {
        playBell(2);
        triggerHaptic('medium');
      }
    }
  }, [stageIdx]);

  // Завершение урока
  const finishedRef = useRef(false);
  useEffect(() => {
    if (remainingSec <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      setIsRunning(false);
      playBell(3);
      triggerHaptic('heavy');
    }
  }, [remainingSec]);

  // Сброс при смене шаблона
  useEffect(() => {
    finishedRef.current = false;
    prevStageIdxRef.current = stageIdx;
  }, [template.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    if (finishedRef.current) return;
    setIsRunning((r) => {
      if (r) return false;
      setEndAt(Date.now() + remainingMs);
      return true;
    });
  };

  const handleNext = () => {
    if (stageIdx >= stageDurations.length - 1) return;
    
    setStageDurations((prev) => {
      const next = [...prev];
      const prevBoundary = stageIdx > 0 ? stageBoundaries[stageIdx - 1] : 0;
      const elapsedInCurrent = Math.max(0, elapsedSec - prevBoundary);
      const remainingInCurrent = next[stageIdx] - elapsedInCurrent;
      next[stageIdx] = Math.max(0, elapsedInCurrent);

      const futureIndices: number[] = [];
      for (let i = stageIdx + 1; i < next.length; i++) futureIndices.push(i);

      if (futureIndices.length > 0 && remainingInCurrent > 0) {
        const base = Math.floor(remainingInCurrent / futureIndices.length);
        let extra = remainingInCurrent - base * futureIndices.length;
        for (const i of futureIndices) {
          next[i] += base;
          if (extra > 0) {
            next[i] += 1;
            extra--;
          }
        }
      }
      return next;
    });
  };

  const canAddMinute = (idx: number): boolean => {
    if (idx === stageDurations.length - 1) return true;
    return stageDurations.slice(idx + 1).some((d) => d > 60);
  };

  const addMinuteToStage = (idx: number) => {
    if (finishedRef.current) return;
    setStageDurations((prev) => {
      const next = [...prev];
      const remainingIdxs: number[] = [];
      for (let i = idx + 1; i < next.length; i++) {
        if (next[i] > 60) remainingIdxs.push(i);
      }
      if (remainingIdxs.length === 0 && idx !== prev.length - 1) return prev;
      
      next[idx] += 60;
      
      if (remainingIdxs.length > 0) {
        const largest = remainingIdxs.reduce(
          (max, i) => (next[i] > next[max] ? i : max),
          remainingIdxs[0],
        );
        next[largest] -= 60;
      }
      return next;
    });
    triggerHaptic('light');
  };

  const handleReset = () => {
    finishedRef.current = false;
    void releaseWakeLock();
    onReset();
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <BackButton onClick={handleReset} variant="light" />
          <div className="mt-3">
            <p className="text-sm text-white/70">Урок</p>
            <h1 className="text-xl font-bold text-white truncate">{template.name}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col">
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold text-purple-700">{currentStage.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            Этап {stageIdx + 1} из {template.stages.length}
          </p>
        </div>

        <div className="flex justify-center my-2">
          <CircularProgress
            progress={fraction}
            colorClass={colorClass}
            strokeClass={strokeClass}
            pulse={pulse}
          >
            {formatTime(remainingSec)}
          </CircularProgress>
        </div>

        <div className="bg-white shadow-md rounded-2xl p-4 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">До конца этапа</span>
            <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>
              {formatTime(stageRemainingSec)}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fraction > 0.35
                  ? 'bg-purple-600'
                  : fraction >= 0.15
                    ? 'bg-violet-500'
                    : 'bg-purple-800'
              }`}
              style={{
                width: `${
                  stageDurations[stageIdx] > 0
                    ? (stageRemainingSec / stageDurations[stageIdx]) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2 px-1">
            Этапы урока
          </h3>
          <div className="space-y-2">
            {template.stages.map((stage, i) => {
              const sEnd = stageBoundaries[i];
              const isDone = elapsedSec >= sEnd;
              const isCurrent = i === stageIdx && !isDone;
              const isFuture = i > stageIdx;
              const sRemaining = Math.max(0, sEnd - elapsedSec);
              const stageFraction =
                stageDurations[i] > 0 ? sRemaining / stageDurations[i] : 0;
              const canAdd = canAddMinute(i);

              return (
                <div
                  key={i}
                  className={`rounded-2xl px-4 py-3 transition-colors ${
                    isCurrent
                      ? 'bg-white shadow-md ring-2 ring-purple-500'
                      : isDone
                        ? 'bg-white/60 shadow-sm'
                        : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        isCurrent
                          ? 'bg-purple-600 text-white'
                          : isDone
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isDone ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold truncate ${
                          isCurrent
                            ? 'text-gray-900'
                            : isDone
                              ? 'text-gray-400 line-through'
                              : 'text-gray-600'
                        }`}
                      >
                        {stage.name}
                      </p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCurrent
                              ? stageFraction > 0.35
                                ? 'bg-purple-600'
                                : stageFraction >= 0.15
                                  ? 'bg-violet-500'
                                  : 'bg-purple-800'
                              : isDone
                                ? 'bg-purple-600'
                                : 'bg-gray-300'
                          }`}
                          style={{
                            width: `${isDone ? 0 : isCurrent ? stageFraction * 100 : 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={`tabular-nums font-semibold shrink-0 text-sm ${
                        isCurrent
                          ? colorClass
                          : isDone
                            ? 'text-gray-300'
                            : 'text-gray-400'
                      }`}
                    >
                      {isDone
                        ? '✓'
                        : formatTime(isCurrent ? sRemaining : stageDurations[i])}
                    </span>
                  </div>

                  {!isDone && (isCurrent || isFuture) && (
                    <div className="flex items-center gap-2 mt-2.5 ml-12">
                      <button
                        onClick={() => addMinuteToStage(i)}
                        disabled={!canAdd}
                        className={`flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 min-h-8 transition-all touch-manipulation ${
                          canAdd
                            ? 'bg-purple-50 text-purple-700 active:scale-95'
                            : 'bg-gray-100 text-gray-300'
                        }`}
                        aria-label="Добавить 1 минуту"
                        title="Добавить 1 минуту"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        1 мин
                      </button>
                      {isCurrent && i < stageDurations.length - 1 && (
                        <button
                          onClick={handleNext}
                          className="flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 min-h-8 bg-gray-100 text-purple-700 active:scale-95 transition-all touch-manipulation"
                          aria-label="Перейти к следующему этапу"
                          title="Перейти к следующему этапу"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          Далее
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {finishedRef.current && (
          <div className="text-center mt-4 text-purple-600 font-semibold text-lg">
            Урок завершён
          </div>
        )}

        <YandexAdBlock />
      </main>

      <footer className="max-w-md mx-auto w-full px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="bg-white shadow-md rounded-2xl p-4 min-h-14 min-w-14 flex items-center justify-center text-purple-600 active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Сброс таймера"
            title="Сброс"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={togglePlay}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-2xl py-4 min-h-14 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label={isRunning ? 'Пауза' : 'Старт'}
          >
            {isRunning ? (
              <>
                <Pause className="w-6 h-6" /> Пауза
              </>
            ) : (
              <>
                <Play className="w-6 h-6" /> Старт
              </>
            )}
          </button>
          <button
            onClick={handleNext}
            disabled={stageIdx >= stageDurations.length - 1}
            className="bg-white shadow-md rounded-2xl p-4 min-h-14 min-w-14 flex items-center justify-center text-purple-600 active:scale-95 transition-transform disabled:opacity-40 touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Следующий этап"
            title="Следующий этап"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}
