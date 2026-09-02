import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
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
  Mic,
  Settings,
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
  recordQuality: '720p' | '1080p' | '4K';
  selectedVideoDeviceId: string;
  selectedAudioDeviceId: string;
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

const QUALITY_MAP = {
  '720p': { width: 1280, height: 720, bitrate: 2_500_000, label: '720p HD' },
  '1080p': { width: 1920, height: 1080, bitrate: 5_000_000, label: '1080p Full HD' },
  '4K': { width: 3840, height: 2160, bitrate: 15_000_000, label: '4K Ultra HD' },
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
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: TeleprompterSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

const DEFAULT_SETTINGS: TeleprompterSettings = {
  speed: 1.0,
  fontSize: 32,
  fontFamily: 'Arial, sans-serif',
  theme: 'dark',
  mirrorH: false,
  mirrorV: false,
  focusMode: 'line',
  textWidth: 80,
  recordQuality: '1080p',
  selectedVideoDeviceId: '',
  selectedAudioDeviceId: '',
};

export default function TeleprompterScreen({ onBack }: { onBack: () => void }) {
  const [scripts, setScripts] = useState<Script[]>(() => loadScripts());
  const [activeScriptId, setActiveScriptId] = useState(scripts[0]?.id || '');
  const [settings, setSettings] = useState<TeleprompterSettings>(() => loadSettings());
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);

  // Медиа
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
  const streamRef = useRef<MediaStream | null>(null);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const theme = THEMES[settings.theme];

  const wordCount = activeScript.text.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / (150 * settings.speed));

  // ===== ПОЛУЧЕНИЕ СПИСКА УСТРОЙСТВ =====
  useEffect(() => {
    const enumDevices = async () => {
      try {
        // Сначала запрашиваем разрешение, чтобы получить реальные имена устройств
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      } catch {
        // Игнорируем, если нет доступа
      }
    };
    enumDevices();
  }, []);

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
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

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

  // ===== ЕДИНЫЙ ПОТОК С КАМЕРЫ И МИКРОФОНА =====
  const startCameraStream = async (includeAudio = true): Promise<MediaStream | null> => {
    try {
      // Остановить предыдущий поток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const q = QUALITY_MAP[settings.recordQuality];
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: q.width },
        height: { ideal: q.height },
      };
      if (settings.selectedVideoDeviceId) {
        videoConstraints.deviceId = { exact: settings.selectedVideoDeviceId };
      }

      const audioConstraints: MediaTrackConstraints | boolean = includeAudio
        ? settings.selectedAudioDeviceId
          ? { deviceId: { exact: settings.selectedAudioDeviceId } }
          : true
        : false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      streamRef.current = stream;

      // Подключить к video-элементу для предпросмотра
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Stream error:', err);
      alert('Не удалось получить доступ к камере/микрофону');
      return null;
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setIsRecording(false);
  };

  const toggleCamera = async () => {
    if (showCamera) {
      // Если идёт запись — сначала остановить её
      if (isRecording) stopRecording();
      stopCameraStream();
    } else {
      const stream = await startCameraStream(false); // для предпросмотра без аудио
      if (stream) setShowCamera(true);
    }
  };

  // При смене устройств или качества — перезапуск потока
  useEffect(() => {
    if (showCamera) {
      startCameraStream(isRecording);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.selectedVideoDeviceId, settings.selectedAudioDeviceId, settings.recordQuality]);

  const startRecording = async () => {
    try {
      // Если поток не активен — создать его
      let stream = streamRef.current;
      if (!stream) {
        stream = await startCameraStream(true);
        if (!stream) return;
        setShowCamera(true);
      } else {
        // Проверим, что есть аудио-треки
        if (stream.getAudioTracks().length === 0) {
          // Перезапустим с аудио
          stream = await startCameraStream(true);
          if (!stream) return;
        }
      }

      const q = QUALITY_MAP[settings.recordQuality];
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: q.bitrate,
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `запись-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        triggerHaptic('heavy');
      };

      recorder.onerror = () => {
        setIsRecording(false);
      };

      recorder.start(1000);
      setIsRecording(true);
      triggerHaptic('light');
    } catch (err) {
      console.error('Recording error:', err);
      alert('Не удалось начать запись');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // setIsRecording(false) вызывается в onstop
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
      x: Math.max(0, Math.min(window.innerWidth - 160, dragStart.current.camX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 130, dragStart.current.camY + dy)),
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
      <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: theme.bg }}>
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

        {/* ПЛАВАЮЩАЯ КАМЕРА (перетаскиваемая) */}
        {showCamera && (
          <div
            className="fixed z-40 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-move select-none"
            style={{
              left: `${cameraPos.x}px`,
              top: `${cameraPos.y}px`,
              width: '160px',
              height: '120px',
            }}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover bg-black"
              style={{ transform: settings.mirrorH ? 'scaleX(-1)' : 'none' }}
            />
            <div className={`absolute top-1 left-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isRecording ? 'bg-red-500' : 'bg-black/60'}`}>
              {isRecording && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              {isRecording ? 'REC' : 'LIVE'}
            </div>
          </div>
        )}

        {/* ВЕРХНЯЯ ПАНЕЛЬ */}
        <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-white text-sm font-semibold">
                {isPlaying ? 'В эфире' : 'Пауза'}
              </span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <span className="text-white text-sm">{progress}%</span>
            {isRecording && (
              <>
                <div className="w-px h-5 bg-white/20" />
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-300 text-sm font-semibold">REC</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pointer-events-auto">
            {timerLeft !== null && (
              <div className={`bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 ${timerLeft <= 30 ? 'animate-pulse bg-red-500/70' : ''}`}>
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-mono">
                  {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setTimerPaused(!timerPaused)}
                  className="ml-2 text-white hover:text-yellow-300"
                >
                  {timerPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </div>
            )}
            <button
              onClick={handleExitPresentation}
              className="bg-black/70 backdrop-blur-sm text-white rounded-xl p-2 hover:bg-red-500/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ */}
        <div className="fixed bottom-4 left-4 right-4 z-30 bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <div className="grid grid-cols-6 gap-2 mb-3">
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
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[10px]">Сброс</span>
            </button>
            <button
              onClick={() => updateSettings({ mirrorH: !settings.mirrorH })}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                settings.mirrorH ? 'bg-purple-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="text-[10px]">Зеркало</span>
            </button>
            <button
              onClick={toggleCamera}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                showCamera ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-[10px]">{showCamera ? 'Камера ✓' : 'Камера'}</span>
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!showCamera && isRecording === false ? false : false}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span className="text-[10px]">{isRecording ? 'Стоп' : 'Запись'}</span>
            </button>
            <button
              onClick={timerLeft === null ? handleStartTimer : handleStopTimer}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                timerLeft !== null ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-[10px]">{timerLeft !== null ? 'Стоп' : 'Таймер'}</span>
            </button>
          </div>

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
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      <header className="bg-purple-700 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Телесуфлер</h1>
            <p className="text-xs text-purple-200">{activeScript.name}</p>
          </div>
          <Monitor className="w-5 h-5 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-4 pb-8">
        {/* ===== УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ ===== */}
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
              <RotateCcw className="w-5 h-5" />
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

          <div>
            <label className="text-xs text-gray-500">Размер шрифта: {settings.fontSize}px</label>
            <input
              type="range"
              min={12}
              max={72}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
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

        {/* ===== СЦЕНАРИЙ ===== */}
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

        {/* ===== ОФОРМЛЕНИЕ (перенесено из шестерёнки) ===== */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-semibold text-purple-700">Оформление</label>
          </div>

          <div>
            <label className="text-xs text-gray-500">Тема</label>
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
            <label className="text-xs text-gray-500">Шрифт</label>
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
            <label className="text-xs text-gray-500">Ширина текста: {settings.textWidth}%</label>
            <input
              type="range"
              min={50}
              max={100}
              value={settings.textWidth}
              onChange={(e) => updateSettings({ textWidth: Number(e.target.value) })}
              className="w-full accent-purple-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateSettings({ mirrorH: !settings.mirrorH })}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 ${
                settings.mirrorH ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <FlipHorizontal className="w-3 h-3" /> Гориз.
            </button>
            <button
              onClick={() => updateSettings({ mirrorV: !settings.mirrorV })}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 ${
                settings.mirrorV ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <FlipVertical className="w-3 h-3" /> Верт.
            </button>
            <select
              value={settings.focusMode}
              onChange={(e) => updateSettings({ focusMode: e.target.value as any })}
              className="rounded-xl border border-gray-200 p-2 text-xs bg-white"
            >
              <option value="none">Без фокуса</option>
              <option value="line">Строка</option>
              <option value="word">Слово</option>
            </select>
          </div>
        </div>

        {/* ===== КАМЕРА И ЗАПИСЬ ===== */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-semibold text-purple-700">Камера и запись</label>
          </div>

          {/* Предпросмотр камеры */}
          {showCamera && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {isRecording && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  REC
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleCamera}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm ${
                showCamera ? 'bg-blue-100 text-blue-700' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Camera className="w-5 h-5" />
              {showCamera ? 'Камера вкл' : 'Камера'}
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!showCamera}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm disabled:opacity-40 ${
                isRecording ? 'bg-red-100 text-red-700' : 'bg-purple-50 text-purple-700'
              }`}
            >
              {isRecording ? <><Square className="w-5 h-5" /> Стоп</> : <><Video className="w-5 h-5" /> Запись</>}
            </button>
          </div>

          {/* Выбор устройств */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <Camera className="w-3 h-3" /> Камера
              </label>
              <select
                value={settings.selectedVideoDeviceId}
                onChange={(e) => updateSettings({ selectedVideoDeviceId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2 text-sm bg-white mt-1"
              >
                <option value="">По умолчанию</option>
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Камера ${d.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Микрофон
              </label>
              <select
                value={settings.selectedAudioDeviceId}
                onChange={(e) => updateSettings({ selectedAudioDeviceId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2 text-sm bg-white mt-1"
              >
                <option value="">По умолчанию</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Микрофон ${d.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Качество записи</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(Object.keys(QUALITY_MAP) as (keyof typeof QUALITY_MAP)[]).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSettings({ recordQuality: q })}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 ${
                    settings.recordQuality === q ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  {QUALITY_MAP[q].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== ТАЙМЕР ===== */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-semibold text-purple-700">Таймер выступления</label>
          </div>
          {timerLeft !== null ? (
            <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
              <span className="text-lg font-bold text-orange-600 font-mono">
                {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimerPaused(!timerPaused)}
                  className="text-xs bg-orange-200 text-orange-800 px-3 py-1.5 rounded-lg font-semibold"
                >
                  {timerPaused ? 'Продолжить' : 'Пауза'}
                </button>
                <button
                  onClick={handleStopTimer}
                  className="text-xs bg-red-200 text-red-800 px-3 py-1.5 rounded-lg font-semibold"
                >
                  Стоп
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartTimer}
              className="w-full py-3 rounded-xl bg-purple-50 text-purple-700 font-semibold text-sm"
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Установить таймер
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
          <b>Горячие клавиши:</b> Space — старт/пауза, ↑/↓ — скорость, M — зеркало, F — фокус, R — сброс, Esc — выход
        </div>
      </main>
    </div>
  );
}
