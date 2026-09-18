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
  Plus,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog, AlertDialog, PromptDialog } from './ConfirmDialog';

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

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

interface PromptState {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  action: (value: string) => void;
}

const SCRIPTS_KEY = 'teleprompter-scripts';
const SETTINGS_KEY = 'teleprompter-settings';
const AUTORECORD_KEY = 'teleprompter-autorecord';
const AUTOTIMER_KEY = 'teleprompter-autotimer';
const AUTOTIMER_MIN_KEY = 'teleprompter-autotimer-min';
// 🆕 Зеркалирование камеры (отдельно от зеркалирования текста)
const CAMERA_MIRROR_KEY = 'teleprompter-camera-mirror';

// 🆕 Скорость можно уменьшить до 0 (текст стоит, листается свайпом)
const SPEED_MIN = 0;
const SPEED_MAX = 2.0;
const FONT_MIN = 20;
const FONT_MAX = 48;

// 🆕 Границы длительности таймера: 1–99 минут
const TIMER_MIN = 1;
const TIMER_MAX = 99;

const FONTS = [
  'Arial, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
  'Verdana, sans-serif',
  '"Trebuchet MS", sans-serif',
  'Impact, sans-serif',
  '"Comic Sans MS", cursive',
  'Tahoma, sans-serif',
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

function loadScripts(): Script[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {}
  return [
    {
      id: 'default',
      name: 'Пример',
      text: 'Вставьте текст сценария...\nКаждая строка будет плавно прокручиваться.\nНажмите «Старт» для начала.',
      createdAt: Date.now(),
    },
  ];
}

function saveScripts(list: Script[]) {
  try {
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(list));
  } catch {}
}

function loadSettings(): TeleprompterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      s.speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN, Number(s.speed) || DEFAULT_SETTINGS.speed));
      s.fontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, Number(s.fontSize) || DEFAULT_SETTINGS.fontSize));
      return s;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: TeleprompterSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

export default function TeleprompterScreen({ onBack }: { onBack: () => void }) {
  const [scripts, setScripts] = useState<Script[]>(() => loadScripts());
  const [activeScriptId, setActiveScriptId] = useState(() => loadScripts()[0]?.id || 'default');
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

  // Автораспись
  const [autoRecord, setAutoRecord] = useState(() => {
    try {
      return localStorage.getItem(AUTORECORD_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Автотаймер + длительность 1–99 мин
  const [autoTimer, setAutoTimer] = useState(() => {
    try {
      return localStorage.getItem(AUTOTIMER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [autoTimerMin, setAutoTimerMin] = useState(() => {
    try {
      const v = Number(localStorage.getItem(AUTOTIMER_MIN_KEY));
      return v >= TIMER_MIN && v <= TIMER_MAX ? v : 5;
    } catch {
      return 5;
    }
  });

  // 🆕 Зеркалирование камеры
  const [cameraMirror, setCameraMirror] = useState(() => {
    try {
      return localStorage.getItem(CAMERA_MIRROR_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Позиция камеры (для drag)
  const [cameraPos, setCameraPos] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // Диалоги
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);

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

  // ===== ПОЛУЧЕНИЕ СПИСКА УСТРОЙСТВ =====
  useEffect(() => {
    const enumDevices = async () => {
      try {
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

  // ===== СИНХРОНИЗАЦИЯ ВИДЕО С ПОТОКОМ =====
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [showCamera, isRecording, presentationMode]);

  // ===== Очистка при размонтировании =====
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

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
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'arrowup':
          e.preventDefault();
          updateSettings({ speed: Math.min(SPEED_MAX, settings.speed + 0.05) });
          break;
        case 'arrowdown':
          e.preventDefault();
          updateSettings({ speed: Math.max(SPEED_MIN, settings.speed - 0.05) });
          break;
        case 'm':
          updateSettings({ mirrorH: !settings.mirrorH });
          break;
        case 'escape':
          handleExitPresentation();
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
    setPromptState({
      title: 'Новый сценарий',
      message: 'Введите название сценария',
      placeholder: 'Например: Вступление к уроку',
      confirmLabel: 'Создать',
      action: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const newScript: Script = {
          id: `script-${Date.now()}`,
          name: trimmed,
          text: '',
          createdAt: Date.now(),
        };
        setScripts((prev) => {
          const next = [...prev, newScript];
          saveScripts(next);
          return next;
        });
        setActiveScriptId(newScript.id);
      },
    });
  };

  const deleteScript = (id: string) => {
    const script = scripts.find((s) => s.id === id);
    setConfirmState({
      title: 'Удалить сценарий?',
      message: script ? `Сценарий «${script.name}» будет удалён безвозвратно.` : 'Сценарий будет удалён.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => {
        setScripts((prev) => {
          let next = prev.filter((s) => s.id !== id);
          if (next.length === 0) {
            next = [
              { id: 'default', name: 'Пример', text: 'Вставьте текст сценария...', createdAt: Date.now() },
            ];
          }
          saveScripts(next);
          if (activeScriptId === id) setActiveScriptId(next[0].id);
          return next;
        });
      },
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

  // ===== КАМЕРА =====
  const startCameraStream = async (includeAudio = true): Promise<MediaStream | null> => {
    try {
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.error('Stream error:', err);
      setAlertMsg('Не удалось получить доступ к камере или микрофону. Проверьте разрешения в настройках браузера.');
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
      if (isRecording) stopRecording();
      stopCameraStream();
    } else {
      const stream = await startCameraStream(false);
      if (stream) setShowCamera(true);
    }
  };

  useEffect(() => {
    if (showCamera) {
      startCameraStream(isRecording);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.selectedVideoDeviceId, settings.selectedAudioDeviceId, settings.recordQuality]);

  // ===== ЗАПИСЬ =====
  const startRecording = async () => {
    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await startCameraStream(true);
        if (!stream) return;
        setShowCamera(true);
      } else {
        if (stream.getAudioTracks().length === 0) {
          stream = await startCameraStream(true);
          if (!stream) return;
          setShowCamera(true);
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
      setAlertMsg('Не удалось начать запись. Попробуйте перезагрузить страницу или проверить доступ к устройствам.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // ===== ТУМБЛЕР АВТОЗАПИСИ =====
  const toggleAutoRecord = () => {
    const next = !autoRecord;
    setAutoRecord(next);
    try {
      localStorage.setItem(AUTORECORD_KEY, next ? '1' : '0');
    } catch {}
    triggerHaptic('light');
  };

  // 🆕 ТУМБЛЕР ТАЙМЕРА: вкл — запустить отсчёт, выкл — сбросить
  const toggleAutoTimer = () => {
    const next = !autoTimer;
    setAutoTimer(next);
    try {
      localStorage.setItem(AUTOTIMER_KEY, next ? '1' : '0');
    } catch {}
    if (next) {
      setTimerLeft(autoTimerMin * 60);
      setTimerPaused(false);
    } else {
      setTimerLeft(null);
      setTimerPaused(false);
    }
    triggerHaptic('light');
  };

  // 🆕 Длительность таймера с ограничением 1–99 минут
  const changeAutoTimerMin = (min: number) => {
    const v = Math.max(TIMER_MIN, Math.min(TIMER_MAX, Math.round(min) || TIMER_MIN));
    setAutoTimerMin(v);
    try {
      localStorage.setItem(AUTOTIMER_MIN_KEY, String(v));
    } catch {}
  };

  // 🆕 ТУМБЛЕР ЗЕРКАЛА КАМЕРЫ
  const toggleCameraMirror = () => {
    const next = !cameraMirror;
    setCameraMirror(next);
    try {
      localStorage.setItem(CAMERA_MIRROR_KEY, next ? '1' : '0');
    } catch {}
    triggerHaptic('light');
  };

  // ===== КЛЮЧЕВЫЕ ДЕЙСТВИЯ =====
  const handlePlayPause = () => {
    const willPlay = !isPlaying;
    setIsPlaying(willPlay);
    if (willPlay && !presentationMode) {
      setPresentationMode(true);
    }
    // Автораспись: старт записи одновременно со стартом прокрутки
    if (willPlay && autoRecord && !isRecording) {
      void startRecording();
    }
    // Автотаймер: старт отсчёта одновременно со стартом прокрутки
    if (willPlay && autoTimer) {
      setTimerLeft(autoTimerMin * 60);
      setTimerPaused(false);
    }
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
    if (isRecording) stopRecording();
    if (showCamera) stopCameraStream();
  };

  const handleStartTimer = () => {
    setPromptState({
      title: 'Таймер выступления',
      message: `Сколько минут продлится выступление? (${TIMER_MIN}–${TIMER_MAX})`,
      initialValue: String(autoTimerMin),
      placeholder: '5',
      confirmLabel: 'Запустить',
      action: (min) => {
        const n = Number(min);
        if (n >= TIMER_MIN && n <= TIMER_MAX) {
          changeAutoTimerMin(n);
          setTimerLeft(n * 60);
          setTimerPaused(false);
          setAutoTimer(true);
          try {
            localStorage.setItem(AUTOTIMER_KEY, '1');
          } catch {}
        } else {
          setAlertMsg(`Введите число от ${TIMER_MIN} до ${TIMER_MAX}`);
        }
      },
    });
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

  // ===== Рендер общих диалогов =====
  const renderDialogs = () => (
    <>
      <ConfirmDialog
        isOpen={confirmState !== null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />
      <AlertDialog
        isOpen={alertMsg !== null}
        message={alertMsg ?? ''}
        onClose={() => setAlertMsg(null)}
      />
      <PromptDialog
        isOpen={promptState !== null}
        title={promptState?.title ?? ''}
        message={promptState?.message}
        initialValue={promptState?.initialValue}
        placeholder={promptState?.placeholder}
        confirmLabel={promptState?.confirmLabel}
        onConfirm={(v) => {
          promptState?.action(v);
          setPromptState(null);
        }}
        onCancel={() => setPromptState(null)}
      />
    </>
  );

  // ===== ПРЕЗЕНТАЦИОННЫЙ РЕЖИМ =====
  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: theme.bg }}>
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
              style={{ transform: cameraMirror ? 'scaleX(-1)' : 'none' }}
            />
            <div
              className={`absolute top-1 left-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                isRecording ? 'bg-red-500' : 'bg-black/60'
              }`}
            >
              {isRecording && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              {isRecording ? 'REC' : 'LIVE'}
            </div>
          </div>
        )}

        <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-white text-sm font-semibold">
                {isPlaying ? 'В эфире' : 'Пауза'}
              </span>
            </div>
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
              <div
                className={`bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 ${
                  timerLeft <= 30 ? 'animate-pulse bg-red-500/70' : ''
                }`}
              >
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

        <div className="fixed bottom-4 left-4 right-4 z-30 bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          {/* 🆕 Кнопки управления: таймер убран, добавлено зеркало камеры */}
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
              <span className="text-[10px]">Зеркало текста</span>
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
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span className="text-[10px]">{isRecording ? 'Стоп' : 'Запись'}</span>
            </button>
            {/* 🆕 Зеркало камеры */}
            <button
              onClick={toggleCameraMirror}
              className={`py-2.5 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1 ${
                cameraMirror ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="text-[10px]">Зеркало камеры</span>
            </button>
          </div>

          {/* 🆕 Переключатели и настройки в одну строку */}
          <div className="grid grid-cols-4 gap-2">
            {/* Запись после старта */}
            <div className="bg-white/5 rounded-xl p-2 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                <Video className="w-3 h-3 text-red-400 shrink-0" />
                Запись после старта
              </span>
              <button
                onClick={toggleAutoRecord}
                className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${
                  autoRecord ? 'bg-red-500' : 'bg-gray-600'
                }`}
                aria-label="Запись после старта"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    autoRecord ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Таймер после старта + минуты 1–99 */}
            <div className="bg-white/5 rounded-xl p-2 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 text-yellow-400 shrink-0" />
                Таймер после старта
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={TIMER_MIN}
                  max={TIMER_MAX}
                  value={autoTimerMin}
                  onChange={(e) => changeAutoTimerMin(Number(e.target.value))}
                  className="w-11 bg-gray-700 text-white text-xs rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  aria-label="Минуты таймера"
                />
                <button
                  onClick={toggleAutoTimer}
                  className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${
                    autoTimer ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                  aria-label="Таймер после старта"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      autoTimer ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Скорость */}
            <div className="bg-white/5 rounded-xl p-2 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                <Gauge className="w-3 h-3 shrink-0" />
                Скорость: {settings.speed.toFixed(2)}×
              </span>
              <input
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={0.05}
                value={settings.speed}
                onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Размер */}
            <div className="bg-white/5 rounded-xl p-2 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                <Type className="w-3 h-3 shrink-0" />
                Размер: {settings.fontSize}px
              </span>
              <input
                type="range"
                min={FONT_MIN}
                max={FONT_MAX}
                step={1}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  // ===== ОСНОВНОЙ ЭКРАН =====
  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Телесуфлер</h1>
          </div>
          <Monitor className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* Сценарий */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-purple-700">Сценарий</label>
            <div className="flex gap-1">
              <button
                onClick={addScript}
                className="p-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                title="Новый сценарий"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={exportScript}
                className="p-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Экспорт .txt"
              >
                <Download className="w-4 h-4" />
              </button>
              {scripts.length > 1 && (
                <button
                  onClick={() => deleteScript(activeScript.id)}
                  className="p-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Удалить сценарий"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <select
            value={activeScriptId}
            onChange={(e) => {
              setActiveScriptId(e.target.value);
              setScrollPos(0);
              setIsPlaying(false);
            }}
            className="w-full rounded-xl border border-purple-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            placeholder="Вставьте текст сценария..."
            rows={6}
            className="w-full rounded-xl border border-purple-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
          />
        </section>

        {/* Настройки прокрутки */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-semibold text-purple-700">Прокрутка и текст</label>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Скорость
              </label>
              <span className="text-xs font-mono text-purple-700">{settings.speed.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.05}
              value={settings.speed}
              onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{SPEED_MIN.toFixed(2)}× (стоп)</span>
              <span>{SPEED_MAX.toFixed(2)}×</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <Type className="w-3 h-3" /> Размер шрифта
              </label>
              <span className="text-xs font-mono text-purple-700">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min={FONT_MIN}
              max={FONT_MAX}
              step={1}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{FONT_MIN}px</span>
              <span>{FONT_MAX}px</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Шрифт</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="w-full rounded-xl border border-purple-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f.split(',')[0].replace(/"/g, '')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Тема</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'contrast'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    settings.theme === t ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {t === 'light' ? 'Светлая' : t === 'dark' ? 'Тёмная' : 'Контраст'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Ширина текста: {settings.textWidth}%
            </label>
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
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                settings.mirrorH ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <FlipHorizontal className="w-3 h-3" /> Гориз.
            </button>
            <button
              onClick={() => updateSettings({ mirrorV: !settings.mirrorV })}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                settings.mirrorV ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <FlipVertical className="w-3 h-3" /> Верт.
            </button>
            <select
              value={settings.focusMode}
              onChange={(e) => updateSettings({ focusMode: e.target.value as TeleprompterSettings['focusMode'] })}
              className="rounded-xl border border-gray-200 p-2 text-xs bg-white"
            >
              <option value="none">Без фокуса</option>
              <option value="line">Строка</option>
              <option value="word">Слово</option>
            </select>
          </div>
        </section>

        {/* Камера: предпросмотр без записи */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-semibold text-purple-700">Камера</label>
          </div>

          <button
            onClick={toggleCamera}
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
              showCamera ? 'bg-blue-100 text-blue-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <Camera className="w-5 h-5" />
            {showCamera ? 'Скрыть предпросмотр' : 'Предварительный просмотр'}
          </button>

          {showCamera && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: cameraMirror ? 'scaleX(-1)' : 'none' }}
              />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                ПРЕДПРОСМОТР
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            🎥 Предпросмотр показывает картинку с камеры без записи. Запись видео доступна в
            полноэкранном режиме.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Camera className="w-3 h-3" /> Камера
              </label>
              <select
                value={settings.selectedVideoDeviceId}
                onChange={(e) => updateSettings({ selectedVideoDeviceId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2 text-sm bg-white"
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
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Mic className="w-3 h-3" /> Микрофон
              </label>
              <select
                value={settings.selectedAudioDeviceId}
                onChange={(e) => updateSettings({ selectedAudioDeviceId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2 text-sm bg-white"
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
            <label className="text-xs text-gray-500 block mb-1">Качество записи</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(QUALITY_MAP) as (keyof typeof QUALITY_MAP)[]).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSettings({ recordQuality: q })}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    settings.recordQuality === q ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {QUALITY_MAP[q].label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Таймер выступления */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
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
              className="w-full py-3 rounded-xl bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-100 transition-colors"
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Установить таймер
            </button>
          )}
        </section>

        {/* Кнопка старта */}
        <button
          onClick={handlePlayPause}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
        >
          <Play className="w-6 h-6" />
          Старт полноэкранного режима
        </button>
      </main>

      {renderDialogs()}
    </div>
  );
}
