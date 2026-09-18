import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, ChevronDown, ChevronUp, Volume, HelpCircle } from 'lucide-react';
import BackButton from './BackButton';
import YandexAdBlock from './YandexAdBlock';
import { triggerHaptic } from '@/lib/haptic';

type Theme = 'balls' | 'emojis' | 'bubbles';
type SoundType = 'beep' | 'shush' | 'bell' | 'none';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  emoji: string;
}

const COLORS = [
  '#a855f7', '#8b5cf6', '#7c3aed', '#9333ea',
  '#c084fc', '#d8b4fe', '#6d28d9', '#e9d5ff',
];

const EMOJIS = ['😊', '😮', '😡', '😴', '🤔', '😲', '🙄', '😬'];

function createBalls(count: number, width: number, height: number): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 14 + Math.random() * 14;
    balls.push({
      x: Math.random() * (width - radius * 2) + radius,
      y: Math.random() * (height - radius * 2) + radius,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      radius,
      color: COLORS[i % COLORS.length],
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    });
  }
  return balls;
}

export default function NoiseMonitorScreen({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const lastBeepRef = useRef<number>(0);
  const loudSinceRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [sensitivity, setSensitivity] = useState(80);
  const [theme, setTheme] = useState<Theme>('balls');
  const [ballCount, setBallCount] = useState(60);
  const [threshold, setThreshold] = useState(80);
  const [showSettings, setShowSettings] = useState(true);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [showFaq, setShowFaq] = useState(false);

  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('noiseMonitorVolume')) || 50;
    }
    return 50;
  });

  const [soundType, setSoundType] = useState<SoundType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('noiseMonitorSoundType') as SoundType) || 'beep';
    }
    return 'beep';
  });

  const [soundAlert, setSoundAlert] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('noiseMonitorSoundAlert');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  const sensitivityRef = useRef(sensitivity);
  const themeRef = useRef(theme);
  const thresholdRef = useRef(threshold);
  const soundAlertRef = useRef(soundAlert);
  const soundTypeRef = useRef(soundType);
  const soundVolumeRef = useRef(soundVolume);

  sensitivityRef.current = sensitivity;
  themeRef.current = theme;
  thresholdRef.current = threshold;
  soundAlertRef.current = soundAlert;
  soundTypeRef.current = soundType;
  soundVolumeRef.current = soundVolume;

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setActive(false);
  }, []);

  const playSound = (ctx: AudioContext, type: SoundType, volumePercent: number) => {
    if (type === 'none') return;
    if (!ctx || ctx.state === 'closed') return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const gainValue = Math.max(0.2, (volumePercent / 100) * 0.8);

    try {
      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(gainValue, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(Math.max(now + 0.25, ctx.currentTime + 0.01));
      } else if (type === 'shush') {
        const bufferSize = Math.floor(ctx.sampleRate * 0.4);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(gainValue, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(Math.max(now + 0.45, ctx.currentTime + 0.01));
      } else if (type === 'bell') {
        const freqs = [523, 659, 784];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(f, startTime);
          gain.gain.setValueAtTime(gainValue, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(Math.max(startTime + 0.45, ctx.currentTime + 0.01));
        });
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  };

  const testSound = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      setError('Сначала включите микрофон, чтобы активировать аудиосистему.');
      return;
    }
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    playSound(ctx, soundType, soundVolume);
    triggerHaptic('light');
  };

  const startMic = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      setActive(true);
    } catch (e: any) {
      const debugInfo = [
        `mediaDevices: ${!!navigator.mediaDevices}`,
        `getUserMedia: ${!!navigator.mediaDevices?.getUserMedia}`,
        `protocol: ${window.location.protocol}`,
        `hostname: ${window.location.hostname}`,
        `errorName: ${e?.name || 'Unknown'}`,
      ];
      
      let userMessage = 'Не удалось получить доступ к микрофону.';
      if (e?.name === 'NotAllowedError') {
        userMessage = 'Доступ к микрофону запрещён. Разрешите доступ в настройках приложения.';
      } else if (e?.name === 'NotFoundError') {
        userMessage = 'Микрофон не найден на устройстве.';
      }
      
      setError(`${userMessage}\n\n[Диагностика]:\n${debugInfo.join('\n')}`);
    }
  };

  useEffect(() => {
    if (!active || !canvasRef.current || !analyserRef.current || !audioContextRef.current) return;

    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const audioCtx = audioContextRef.current;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx2d.scale(window.devicePixelRatio, window.devicePixelRatio);
      ballsRef.current = createBalls(ballCount, rect.width, rect.height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const GRAVITY = 0.45;
    const BOUNCE = 0.72;
    const FRICTION = 0.985;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const sens = sensitivityRef.current / 50;
      const volume = Math.min(1, rms * sens * 3);
      setNoiseLevel(volume);

      const thr = thresholdRef.current / 100;
      if (soundAlertRef.current && soundTypeRef.current !== 'none' && volume > thr) {
        if (loudSinceRef.current === null) {
          loudSinceRef.current = Date.now();
        } else if (Date.now() - loudSinceRef.current > 2000) {
          if (Date.now() - lastBeepRef.current > 3000) {
            if (audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }
            playSound(audioCtx, soundTypeRef.current, soundVolumeRef.current);
            lastBeepRef.current = Date.now();
          }
        }
      } else {
        loudSinceRef.current = null;
      }

      const balls = ballsRef.current;
      const force = volume * 22;

      ctx2d.clearRect(0, 0, w, h);

      for (const ball of balls) {
        if (volume > 0.05) {
          const angle = Math.random() * Math.PI * 2;
          const power = force * (0.5 + Math.random() * 0.8);
          ball.vx += Math.cos(angle) * power * 0.15;
          ball.vy -= Math.abs(Math.sin(angle)) * power * 0.2 + power * 0.08;
        }

        ball.vy += GRAVITY;
        ball.vx *= FRICTION;
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * BOUNCE;
        }
        if (ball.x > w - ball.radius) {
          ball.x = w - ball.radius;
          ball.vx = -ball.vx * BOUNCE;
        }
        if (ball.y < ball.radius) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * BOUNCE;
        }
        if (ball.y > h - ball.radius) {
          ball.y = h - ball.radius;
          ball.vy = -ball.vy * BOUNCE;
          ball.vx *= 0.93;
        }

        const t = themeRef.current;
        if (t === 'balls') {
          ctx2d.beginPath();
          ctx2d.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx2d.fillStyle = ball.color;
          ctx2d.fill();
        } else if (t === 'bubbles') {
          ctx2d.beginPath();
          ctx2d.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx2d.fillStyle = ball.color + '40';
          ctx2d.fill();
          ctx2d.lineWidth = 2;
          ctx2d.strokeStyle = ball.color;
          ctx2d.stroke();
        } else {
          ctx2d.font = `${ball.radius * 1.8}px sans-serif`;
          ctx2d.textAlign = 'center';
          ctx2d.textBaseline = 'middle';
          ctx2d.fillText(ball.emoji, ball.x, ball.y);
        }
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ballCount]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const isLoud = noiseLevel > threshold / 100;

  const noiseColor = isLoud
    ? 'bg-red-500 animate-pulse'
    : noiseLevel > 0.5
    ? 'bg-violet-500'
    : 'bg-purple-400';

  const soundOptions: { id: SoundType; label: string }[] = [
    { id: 'beep', label: 'Бип' },
    { id: 'shush', label: 'Ш-ш-ш' },
    { id: 'bell', label: 'Колокольчик' },
    { id: 'none', label: 'Без звука' },
  ];

  const faqItems = [
    {
      q: 'Как работает шумометр?',
      a: 'Приложение использует микрофон устройства для измерения уровня звука. Звук обрабатывается локально в браузере и никуда не отправляется. Уровень шума отображается в процентах и влияет на поведение объектов на экране — они начинают двигаться активнее при повышении громкости.',
    },
    {
      q: 'Что делает чувствительность?',
      a: 'Чувствительность (от 10 до 200) определяет, насколько сильно микрофон усиливает входящий звук. Низкие значения (10-50) подходят для тихих помещений, высокие (100-200) — для шумных классов. Начните со значения 80 и настраивайте по ситуации.',
    },
    {
      q: 'Что такое порог сигнала?',
      a: 'Порог (от 20% до 100%) — это уровень шума, при превышении которого срабатывает звуковой сигнал и появляется предупреждение "ТИШЕ!". Например, при пороге 80% сигнал сработает только когда шум превысит 80% от максимума.',
    },
    {
      q: 'Какие звуковые сигналы доступны?',
      a: 'Бип — короткий электронный звук, Ш-ш-ш — шум ветра (менее резкий), Колокольчик — мелодичный перезвон из трёх нот, Без звука — только визуальное предупреждение. Громкость сигнала настраивается отдельно от системной громкости.',
    },
    {
      q: 'Можно ли использовать без интернета?',
      a: 'Да! После загрузки страницы шумометр работает полностью офлайн. Все вычисления происходят локально, интернет не требуется. Микрофон должен быть разрешён в настройках браузера.',
    },
    {
      q: 'Сохраняются ли настройки?',
      a: 'Да, настройки громкости сигнала и типа звука сохраняются в localStorage вашего браузера. При следующем открытии приложения они будут восстановлены. Данные о уровне шума не сохраняются.',
    },
    {
      q: 'Какие темы оформления доступны?',
      a: 'Шарики — цветные круги с физикой отскоков, Смайлики — эмодзи с разными выражениями лица, Пузыри — полупрозрачные круги с обводкой. Все темы реагируют на шум одинаково, разница только в визуальном оформлении.',
    },
    {
      q: 'Почему микрофон не работает?',
      a: 'Возможные причины: 1) Доступ к микрофону запрещён в настройках браузера — разрешите в адресной строке. 2) Страница открыта по HTTP — микрофон работает только по HTTPS или localhost. 3) Микрофон занят другим приложением. 4) В мобильном браузере VK мини-апп может блокировать доступ.',
    },
  ];

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Контроль шума</h1>
          </div>
          <Volume2 className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {!active && !error && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <Mic className="w-10 h-10 text-purple-600" />
            </div>
            <button
              onClick={startMic}
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-2xl px-8 py-4 min-h-14 transition-colors touch-manipulation shadow-md"
            >
              Включить микрофон
            </button>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Звук обрабатывается только локально и нигде не сохраняется
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <MicOff className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-sm text-red-600 text-center max-w-xs whitespace-pre-line">{error}</p>
            <button
              onClick={startMic}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-2xl px-6 py-3 min-h-12 transition-colors touch-manipulation"
            >
              Повторить
            </button>
          </div>
        )}

        {active && (
          <>
            <div>
              <div className="flex justify-between text-xs font-semibold text-purple-700 mb-1">
                <span>Уровень шума</span>
                <span>{Math.round(noiseLevel * 100)}%</span>
              </div>
              <div className="w-full h-4 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${noiseColor}`}
                  style={{ width: `${Math.max(2, noiseLevel * 100)}%` }}
                />
              </div>
              <div className="relative h-1 mt-0.5">
                <div
                  className="absolute -top-0.5 w-0.5 h-3 bg-red-500"
                  style={{ left: `${threshold}%` }}
                />
              </div>
            </div>

            <div className={`relative w-full h-96 rounded-2xl overflow-hidden shadow-md border-2 transition-colors duration-300 ${
              isLoud ? 'bg-red-500 border-red-600' : 'bg-white border-purple-100'
            }`}>
              <canvas ref={canvasRef} className="w-full h-full block" />
              {isLoud && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-600/20">
                  <span className="text-5xl font-black text-white drop-shadow-lg animate-pulse tracking-wider">
                    ТИШЕ!
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="w-full flex items-center justify-between text-purple-700 font-semibold min-h-12 touch-manipulation"
              >
                <span>Настройки</span>
                {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showSettings && (
                <div className="space-y-4 mt-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex justify-between">
                      <span>Чувствительность</span>
                      <span className="text-purple-600 font-semibold">{sensitivity}</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      value={sensitivity}
                      onChange={(e) => {
                        setSensitivity(Number(e.target.value));
                        triggerHaptic('light');
                      }}
                      className="w-full accent-purple-600 h-2 cursor-pointer mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex justify-between">
                      <span>Порог сигнала</span>
                      <span className="text-purple-600 font-semibold">{threshold}%</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={threshold}
                      onChange={(e) => {
                        setThreshold(Number(e.target.value));
                        triggerHaptic('light');
                      }}
                      className="w-full accent-purple-600 h-2 cursor-pointer mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-2">Тема объектов</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['balls', 'Шарики'], ['emojis', 'Смайлики'], ['bubbles', 'Пузыри']] as [Theme, string][]).map(
                        ([id, label]) => (
                          <button
                            key={id}
                            onClick={() => {
                              setTheme(id);
                              triggerHaptic('light');
                            }}
                            className={`py-2.5 rounded-xl text-sm font-semibold transition-all min-h-12 touch-manipulation ${
                              theme === id
                                ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                                : 'bg-gray-50 text-gray-500 border-2 border-transparent'
                            }`}
                          >
                            {label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex justify-between">
                      <span>Количество объектов</span>
                      <span className="text-purple-600 font-semibold">{ballCount}</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={150}
                      value={ballCount}
                      onChange={(e) => {
                        setBallCount(Number(e.target.value));
                        triggerHaptic('light');
                      }}
                      className="w-full accent-purple-600 h-2 cursor-pointer mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full min-h-12 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700 shrink-0">Звуковой сигнал</span>
                      {soundAlert && (
                        <select
                          value={soundType}
                          onChange={(e) => {
                            const val = e.target.value as SoundType;
                            setSoundType(val);
                            localStorage.setItem('noiseMonitorSoundType', val);
                            triggerHaptic('light');
                          }}
                          className="w-[120px] rounded-xl border border-purple-200 p-2 bg-white text-sm text-gray-800 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 shrink-0"
                        >
                          {soundOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        const val = !soundAlert;
                        setSoundAlert(val);
                        localStorage.setItem('noiseMonitorSoundAlert', String(val));
                        triggerHaptic('light');
                      }}
                      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                        soundAlert ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                      aria-label="Переключить звуковой сигнал"
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          soundAlert ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {soundAlert && soundType !== 'none' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Громкость сигнала
                        </span>
                        <button
                          onClick={testSound}
                          className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Volume className="w-3.5 h-3.5" />
                          Проверить
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={soundVolume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSoundVolume(val);
                            localStorage.setItem('noiseMonitorVolume', String(val));
                            triggerHaptic('light');
                          }}
                          className="flex-1 accent-purple-600 h-2 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-purple-600 w-10 text-right">
                          {soundVolume}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={cleanup}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl py-3 min-h-12 transition-colors touch-manipulation flex items-center justify-center gap-2"
            >
              <MicOff className="w-5 h-5" />
              Выключить микрофон
            </button>
          </>
        )}

        {/* 🆕 FAQ секция */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {faqItems.map((item, index) => (
              <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowFaq(!showFaq)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${showFaq ? 'rotate-180' : ''}`} />
                </button>
                {showFaq && (
                  <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <YandexAdBlock />
        </div>
      </main>
    </div>
  );
}
