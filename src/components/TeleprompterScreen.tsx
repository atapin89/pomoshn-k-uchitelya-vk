import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Settings,
  Monitor,
  FlipHorizontal,
  FlipVertical,
  Camera,
  Video,
  Clock,
  Download,
  Trash2,
  X,
  RotateCcw,
  Type,
  Gauge,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

interface Script {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

interface TeleprompterSettings {
  speed: number;
  fontSize: number;
  fontFamily: string;
  theme: 'light' | 'dark' | 'contrast';
  mirrorH: boolean;
  mirrorV: boolean;
  focusMode: 'line' | 'word' | 'none';
  textWidth: number;
}

const SCRIPTS_KEY = 'teleprompter-scripts';
const SETTINGS_KEY = 'teleprompter-settings';

const FONTS = [
  { id: 'Arial, sans-serif', label: 'Arial' },
  { id: '"Times New Roman", serif', label: 'Times New Roman' },
  { id: 'Roboto, sans-serif', label: 'Roboto' },
  { id: '"Open Sans", sans-serif', label: 'Open Sans' },
  { id: '"Comic Sans MS", cursive', label: 'Comic Sans' },
];

const THEMES = {
  light: { bg: '#ffffff', text: '#000000', accent: '#7c3aed' },
  dark: { bg: '#000000', text: '#ffffff', accent: '#a78bfa' },
  contrast: { bg: '#000000', text: '#ffff00', accent: '#fbbf24' },
};

function loadScripts(): Script[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [{ id: 'default', name: 'Пример', text: 'Введите текст сценария...', createdAt: Date.now() }];
}

function saveScripts(list: Script[]) {
  try {
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(list));
  } catch {}
}

function loadSettings(): TeleprompterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    speed: 1.0,
    fontSize: 32,
    fontFamily: 'Arial, sans-serif',
    theme: 'dark',
    mirrorH: false,
    mirrorV: false,
    focusMode: 'line',
    textWidth: 80,
  };
}

function saveSettings(s: TeleprompterSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

export default function TeleprompterScreen({ onBack }: { onBack: () => void }) {
  const [scripts, setScripts] = useState<Script[]>(() => loadScripts());
  const [activeScriptId, setActiveScriptId] = useState(scripts[0]?.id || '');
  const [settings, setSettings] = useState<TeleprompterSettings>(() => loadSettings());
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Позиция камеры (для drag)
  const [cameraPos, setCameraPos] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const theme = THEMES[settings.theme];

  const wordCount = activeScript.text.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / (150 * settings.speed));

  // ===== КОРРЕКТНЫЙ ПРОГРЕСС =====
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!scrollRef.current || !textContainerRef.current) return;
    const viewportH = scrollRef.current.clientHeight;
    const contentH = textContainerRef.current.scrollHeight;
    const maxScroll = Math.max(1, contentH - viewportH);
    const p = Math.min(100, Math.max(0, (scrollPos / maxScroll) * 100));
    setProgress(Math.round(p));
  }, [scrollPos, settings.fontSize, activeScript.text]);

  // ===== АНИМАЦИЯ ПРОКРУТКИ =====
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Пикселей в секунду = скорость * размер_шрифта * 1.5
      const pixelsPerSecond = settings.speed * settings.fontSize * 1.5;
      const pixelsPerFrame = (pixelsPerSecond * delta) / 1000;
      setScrollPos((prev) => prev + pixelsPerFrame);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = 0;
    };
  }, [isPlaying, settings.speed, settings.fontSize]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPos;
    }
  }, [scrollPos]);

  // ===== ТАЙМЕР С ПАУЗОЙ =====
  useEffect(() => {
    if (timerLeft === null || timerLeft <= 0 || timerPaused) return;
    const timer = setTimeout(() => setTimerLeft((t) => (t !== null ? Math.max(0, t - 1) : null)), 1000);
    return () => clearTimeout(timer);
  }, [timerLeft, timerPaused]);

  // ===== ГОРЯЧИЕ КЛАВИШИ =====
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'arrowup':
          e.preventDefault();
          updateSettings({ speed: Math.min(3, settings.speed + 0.05) });
          break;
        case 'arrowdown':
          e.preventDefault();
          updateSettings({ speed: Math.max(0.5, settings.speed - 0.05) });
          break;
        case 'm':
          updateSettings({ mirrorH: !settings.mirrorH });
          break;
        case 'escape':
          handleExitPresentation();
          break;
        case 'f':
          updateSettings({ focusMode: settings.focusMode === 'line' ? 'word' : settings.focusMode === 'word' ? 'none' : 'line' });
          break;
        case 'r':
          handleResetProgress();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settings, presentationMode, isPlaying]);

  const updateSettings = (patch: Partial<TeleprompterSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const updateScriptText = (text: string) => {
    setScripts((prev) => {
      const next = prev.map((s) => (s.id === activeScriptId ? { ...s, text } : s));
      saveScripts(next);
      return next;
    });
  };

  const addScript = () => {
    const name = prompt('Название сценария:');
    if (!name) return;
    const newScript: Script = { id: `script-${Date.now()}`, name, text: '', createdAt: Date.now() };
    setScripts((prev) => {
      const next = [...prev, newScript];
      saveScripts(next);
      return next;
    });
    setActiveScriptId(newScript.id);
  };

  const deleteScript = (id: string) => {
    if (!confirm('Удалить сценарий?')) return;
    setScripts((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) next.push({ id: 'default', name: 'Пример', text: '', createdAt: Date.now() });
      saveScripts(next);
      if (activeScriptId === id) setActiveScriptId(next[0].id);
      return next;
    });
  };

  const exportScript = () => {
    const blob = new Blob([activeScript.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScript.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCamera = async () => {
    if (!showCamera) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setShowCamera(true);
      } catch (err) {
        alert('Не удалось получить доступ к камере');
      }
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      setShowCamera(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `запись-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      alert('Запись начата. Нажмите снова для остановки.');
    } catch (err) {
      alert('Не удалось начать запись');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // ===== КЛЮЧЕВЫЕ ДЕЙСТВИЯ =====
  const handlePlayPause = () => {
    setIsPlaying((p) => {
      const newState = !p;
      if (newState && !presentationMode) {
        setPresentationMode(true);
      }
      return newState;
    });
    triggerHaptic('light');
  };

  const handleResetProgress = () => {
    setIsPlaying(false);
    setScrollPos(0);
    triggerHaptic('medium');
  };

  const handleExitPresentation = () => {
    setIsPlaying(false);
    setPresentationMode(false);
  };

  const handleStartTimer = () => {
    const min = prompt('Таймер выступления (минут):', '5');
    if (min && Number(min) > 0) {
      setTimerLeft(Number(min) * 60);
      setTimerPaused(false);
    }
  };

  const handleStopTimer = () => {
    setTimerLeft(null);
    setTimerPaused(false);
  };

  // ===== DRAG КАМЕРЫ =====
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY, camX: cameraPos.x, camY: cameraPos.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setCameraPos({
      x: Math.max(0, Math.min(window.innerWidth - 140, dragStart.current.camX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 110, dragStart.current.camY + dy)),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // ===== СВАЙП ДЛЯ РУЧНОЙ ПЕРЕМОТКИ =====
  const touchStartY = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const delta = touchStartY.current - touch.clientY;
    touchStartY.current = touch.clientY;
    setScrollPos((prev) => Math.max(0, prev + delta));
  };

  // ===== ПРЕЗЕНТАЦИОННЫЙ РЕЖИМ =====
  if (presentationMode) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        style={{ background: theme.bg }}
      >
        {/* Контейнер текста с прокруткой */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          style={{
            transform: `scaleX(${settings.mirrorH ? -1 : 1}) scaleY(${settings.mirrorV ? -1 : 1})`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="pt-[40vh] pb-[60vh]" style={{ width: `${settings.textWidth}%`, margin: '0 auto' }}>
            <div
              ref={textContainerRef}
              style={{
                fontFamily: settings.fontFamily,
                fontSize: `${settings.fontSize}px`,
                color: theme.text,
                lineHeight: 1.6,
              }}
            >
              {activeScript.text}
            </div>
          </div>
        </div>

        {/* ===== ПЛАВАЮЩАЯ КАМЕРА (перетаскиваемая) ===== */}
        {showCamera && (
          <div
            className="fixed z-40 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-move"
            style={{
              left: `${cameraPos.x}px`,
              top: `${cameraPos.y}px`,
              width: '140px',
              height: '105px',
            }}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
          >
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              LIVE
            </div>
          </div>
        )}

        {/* ===== ВЕРХНЯЯ ПАНЕЛЬ ===== */}
        <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between gap-2">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-white text-sm font-semibold">
                {isPlaying ? 'В эфире' : 'Пауза'}
              </span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <span className="text-white text-sm">{progress}%</span>
          </div>

          <div className="flex gap-2">
            {timerLeft !== null && (
              <div className={`bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 ${timerLeft <= 30 ? 'animate-pulse bg-red-500/70' : ''}`}>
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-mono">
                  {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setTimerPaused(!timerPaused)}
                  className="ml-2 text-white hover:text-yellow-300"
                  title={timerPaused ? 'Продолжить' : 'Пауза'}
                >
                  {timerPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </div>
            )}
            <button
              onClick={handleExitPresentation}
              className="bg-black/70 backdrop-blur-sm text-white rounded-xl p-2 hover:bg-red-500/70"
              title="Выход (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== НИЖНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ ===== */}
        <div className="fixed bottom-4 left-4 right-4 z-30 bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          {/* Ряд 1: Кнопки действий */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <button
              onClick={handlePlayPause}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                isPlaying ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-[10px]">{isPlaying ? 'Пауза' : 'Старт'}</span>
            </button>
            <button
              onClick={handleResetProgress}
              className="py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm flex flex-col items-center justify-center gap-1"
              title="Сброс (R)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[10px]">Сброс</span>
            </button>
            <button
              onClick={() => updateSettings({ mirrorH: !settings.mirrorH })}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                settings.mirrorH ? 'bg-purple-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              title="Зеркало (M)"
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="text-[10px]">Зеркало</span>
            </button>
            <button
              onClick={toggleCamera}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                showCamera ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-[10px]">{showCamera ? 'Камера ✓' : 'Камера'}</span>
            </button>
            <button
              onClick={timerLeft === null ? handleStartTimer : handleStopTimer}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                timerLeft !== null ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-[10px]">{timerLeft !== null ? 'Стоп таймер' : 'Таймер'}</span>
            </button>
          </div>

          {/* Ряд 2: Слайдеры */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-white shrink-0" />
              <span className="text-white text-xs w-16 shrink-0">Скорость</span>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={settings.speed}
                onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-white text-xs w-10 text-right font-mono">{settings.speed.toFixed(2)}×</span>
            </div>
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-white shrink-0" />
              <span className="text-white text-xs w-16 shrink-0">Размер</span>
              <input
                type="range"
                min={12}
                max={72}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-white text-xs w-10 text-right font-mono">{settings.fontSize}px</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== ОСНОВНОЙ ЭКРАН =====
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: theme.bg }}>
      <header className="bg-purple-700 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Телесуфлер</h1>
            <p className="text-xs text-purple-200">{activeScript.name}</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePlayPause}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isPlaying ? 'Пауза' : 'Старт (полный экран)'}
            </button>
            <button
              onClick={handleResetProgress}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3"
              title="Сброс в начало"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-500">Скорость: {settings.speed.toFixed(2)}×</label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={settings.speed}
              onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
              className="w-full accent-purple-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="font-bold text-purple-700">{wordCount}</p>
              <p className="text-gray-500">слов</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="font-bold text-purple-700">{readingTime}</p>
              <p className="text-gray-500">мин</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="font-bold text-purple-700">{progress}%</p>
              <p className="text-gray-500">прогресс</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-purple-700">Сценарий</label>
            <div className="flex gap-2">
              <button onClick={addScript} className="text-xs bg-purple-100 text-purple-700 rounded-lg px-2 py-1">
                + Новый
              </button>
              <button onClick={exportScript} className="text-xs bg-gray-100 text-gray-700 rounded-lg px-2 py-1">
                <Download className="w-3 h-3 inline" /> Экспорт
              </button>
            </div>
          </div>

          <select
            value={activeScriptId}
            onChange={(e) => setActiveScriptId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <textarea
            value={activeScript.text}
            onChange={(e) => updateScriptText(e.target.value)}
            placeholder="Введите текст сценария..."
            rows={8}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />

          {scripts.length > 1 && activeScript.id !== 'default' && (
            <button
              onClick={() => deleteScript(activeScript.id)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3 inline" /> Удалить сценарий
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-purple-700">Инструменты</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleCamera}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm ${
                showCamera ? 'bg-green-100 text-green-700' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Camera className="w-5 h-5" />
              {showCamera ? 'Камера вкл' : 'Камера'}
            </button>
            <button
              onClick={() => {
                if (mediaRecorderRef.current?.state === 'recording') stopRecording();
                else startRecording();
              }}
              className="py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm bg-red-50 text-red-700"
            >
              <Video className="w-5 h-5" />
              {mediaRecorderRef.current?.state === 'recording' ? 'Стоп запись' : 'Запись'}
            </button>
            <button
              onClick={() => setPresentationMode(true)}
              className="py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm bg-purple-50 text-purple-700"
            >
              <Monitor className="w-5 h-5" />
              Презентация
            </button>
            <button
              onClick={handleStartTimer}
              className="py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm bg-purple-50 text-purple-700"
            >
              <Clock className="w-5 h-5" />
              Таймер
            </button>
          </div>
          {timerLeft !== null && timerLeft > 0 && (
            <div className="flex items-center justify-between bg-orange-50 rounded-lg p-2">
              <span className="text-sm font-bold text-orange-600">
                Осталось: {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimerPaused(!timerPaused)}
                  className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded"
                >
                  {timerPaused ? 'Продолжить' : 'Пауза'}
                </button>
                <button
                  onClick={handleStopTimer}
                  className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded"
                >
                  Стоп
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
          <b>Горячие клавиши в презентации:</b> Space — старт/пауза, ↑/↓ — скорость, M — зеркало, F — фокус, R — сброс, Esc — выход
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-purple-700">Настройки</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-purple-700">Размер шрифта: {settings.fontSize}px</label>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700">Шрифт</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700">Тема</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['light', 'dark', 'contrast'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSettings({ theme: t })}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 ${
                        settings.theme === t ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      {t === 'light' ? 'Светлая' : t === 'dark' ? 'Тёмная' : 'Контраст'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700">Зеркалирование</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => updateSettings({ mirrorH: !settings.mirrorH })}
                    className={`py-2 rounded-xl flex items-center justify-center gap-2 text-sm ${
                      settings.mirrorH ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" /> Гориз.
                  </button>
                  <button
                    onClick={() => updateSettings({ mirrorV: !settings.mirrorV })}
                    className={`py-2 rounded-xl flex items-center justify-center gap-2 text-sm ${
                      settings.mirrorV ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4" /> Верт.
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700">Фокус</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['none', 'line', 'word'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSettings({ focusMode: m })}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 ${
                        settings.focusMode === m ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      {m === 'none' ? 'Нет' : m === 'line' ? 'Строка' : 'Слово'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700">Ширина текста: {settings.textWidth}%</label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={settings.textWidth}
                  onChange={(e) => updateSettings({ textWidth: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
