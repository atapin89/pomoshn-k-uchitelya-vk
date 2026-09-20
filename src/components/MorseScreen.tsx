import { useState, useMemo, useRef } from 'react';
import {
  Radio,
  Copy,
  Check,
  Download,
  Play,
  Square,
  HelpCircle,
  Trophy,
  BookOpen,
  Lightbulb,
  ArrowLeftRight,
  Volume2,
  Gauge,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

type Mode = 'encode' | 'decode';
type Alphabet = 'ru' | 'la';

// ===== Таблица кодов: [русский, латинский, код] =====

const LETTERS: [string, string, string][] = [
  ['А', 'A', '.-'], ['Б', 'B', '-...'], ['В', 'W', '.--'], ['Г', 'G', '--.'],
  ['Д', 'D', '-..'], ['Е', 'E', '.'], ['Ж', 'V', '...-'], ['З', 'Z', '--..'],
  ['И', 'I', '..'], ['Й', 'J', '.---'], ['К', 'K', '-.-'], ['Л', 'L', '.-..'],
  ['М', 'M', '--'], ['Н', 'N', '-.'], ['О', 'O', '---'], ['П', 'P', '.--.'],
  ['Р', 'R', '.-.'], ['С', 'S', '...'], ['Т', 'T', '-'], ['У', 'U', '..-'],
  ['Ф', 'F', '..-.'], ['Х', 'H', '....'], ['Ц', 'C', '-.-.'], ['Ч', 'Ö', '---.'],
  ['Ш', 'ÖH', '----'], ['Щ', 'Q', '--.-'], ['Ъ', 'À', '.--.-.'], ['Ы', 'Y', '-.--'],
  ['Ь', 'X', '-..-'], ['Э', 'É', '..-..'], ['Ю', 'Ü', '..--'], ['Я', 'Ä', '.-.-'],
];

const DIGITS: [string, string][] = [
  ['0', '-----'], ['1', '.----'], ['2', '..---'], ['3', '...--'], ['4', '....-'],
  ['5', '.....'], ['6', '-....'], ['7', '--...'], ['8', '---..'], ['9', '----.'],
];

const PUNCT: [string, string][] = [
  ['.', '.-.-.-'], [',', '--..--'], ['?', '..--..'], ['!', '-.-.--'],
  ['/', '-..-.'], ['(', '-.--.'], [')', '-.--.-'], [':', '---...'],
  [';', '-.-.-.'], ['=', '-...-'], ['+', '.-.-.'], ['-', '-....-'],
  ['"', '.-..-.'], ['@', '.--.-.'],
];

// Карты кодирования
const RU_MAP: Record<string, string> = {};
const LA_MAP: Record<string, string> = {};
LETTERS.forEach(([ru, la, code]) => { RU_MAP[ru] = code; LA_MAP[la] = code; });
DIGITS.forEach(([d, c]) => { RU_MAP[d] = c; LA_MAP[d] = c; });
PUNCT.forEach(([p, c]) => { RU_MAP[p] = c; LA_MAP[p] = c; });

// Карты декодирования
const REV_RU: Record<string, string> = {};
const REV_LA: Record<string, string> = {};
LETTERS.forEach(([ru, la, code]) => { REV_RU[code] = ru; REV_LA[code] = la; });
DIGITS.forEach(([d, c]) => { REV_RU[c] = d; REV_LA[c] = d; });
PUNCT.forEach(([p, c]) => { REV_RU[c] = p; REV_LA[c] = p; });

// ===== Кодирование / декодирование =====

function encodeText(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) =>
      [...word.toUpperCase()]
        .map((ch) => RU_MAP[ch] || LA_MAP[ch] || '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}

function decodeMorse(input: string, alpha: Alphabet): string {
  const rev = alpha === 'ru' ? REV_RU : REV_LA;
  const normalized = input
    .replace(/[·•]/g, '.')
    .replace(/[–—_]/g, '-')
    .replace(/\|/g, '/')
    .replace(/\n/g, ' / ');
  return normalized
    .split('/')
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => rev[code] || '?')
        .join('')
    )
    .join(' ')
    .trim();
}

// ===== Таймлайн сигнала =====

interface Segment { on: boolean; ms: number }

function buildSegments(morse: string, unit: number): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < morse.length; i++) {
    const ch = morse[i];
    if (ch === '.') segs.push({ on: true, ms: unit });
    else if (ch === '-') segs.push({ on: true, ms: unit * 3 });
    else if (ch === ' ') { segs.push({ on: false, ms: unit * 3 }); continue; }
    else if (ch === '/') { segs.push({ on: false, ms: unit * 7 }); continue; }
    else continue;
    const next = morse[i + 1];
    if (next === '.' || next === '-') segs.push({ on: false, ms: unit });
  }
  return segs;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Данные справки =====

const FAQ_ITEMS = [
  { q: 'Сколько длится точка и тире?', a: 'Длительность точки — базовая единица времени. Тире = 3 точки. Единица зависит от скорости: при скорости W слов в минуту точка = 1200 / W миллисекунд. При 10 WPM точка = 120 мс, тире = 360 мс.' },
  { q: 'Какие паузы между знаками?', a: 'Пауза между точками и тире внутри одной буквы = 1 единица. Между буквами = 3 единицы. Между словами = 7 единиц. Именно паузы делают морзе читаемым — без них сигнал сливается.' },
  { q: 'Почему русские и латинские буквы звучат одинаково?', a: 'Русская азбука Морзе построена по принципу соответствия: каждой русской букве присвоен код созвучной латинской (А = A, Б = B, В = W, Г = G…). Поэтому «SOS» и русское «СОС» звучат одинаково: ... --- ...' },
  { q: 'Что означает SOS?', a: '... --- ... — три точки, три тире, три точки. Это НЕ аббревиатура (Save Our Souls — народная этимология). Код выбран потому, что его невозможно спутать с другим и легко передать даже неумелому радисту.' },
  { q: 'Как быстро передают морзе профессионалы?', a: 'Обычная рабочая скорость радиста — 12-20 слов в минуту (WPM). Рекорды приёма на слух — свыше 60 WPM. Для сравнения: средняя скорость речи — около 150 слов в минуту.' },
  { q: 'Где морзе используется сегодня?', a: 'Аварийная сигнализация (фонарик, звук, стуки), радиолюбительская связь (CW), навигационные маяки, ассистивные технологии для людей с ограничениями речи и движения, обучение телеграфному коду в клубах и на уроках.' },
  { q: 'Как выучить морзе быстрее?', a: 'Метод Коха: учить буквы сразу на слух на скорости 15-20 WPM, а не по таблице. Помогают мнемотехники: «А» — «а-а» (.-), «Б» — «ба-ба-ба-ба» (-...), «К» — «как» (-.-). Тренируйтесь с воспроизведением звука в этом инструменте.' },
  { q: 'Можно ли передавать морзе фонариком?', a: 'Да! Это визуальная сигнализация: короткое нажатие = точка, длинное = тире. Кнопка «Воспроизвести» в инструменте показывает лампой, как именно мигать. Ночью сигнал фонарика виден на километры.' },
];

const SCENARIO_ITEMS = [
  { icon: '📻', title: 'Урок истории и технологии', description: 'Расскажите о телеграфе и Сэмюэле Морзе: закодируйте имена учеников и дайте расшифровать соседа по парте. Включите звук — класс услышит настоящий телеграфный сигнал.' },
  { icon: '🆘', title: 'Урок ОБЖ', description: 'Отработайте сигнал бедствия SOS и передачу фонариком: включите воспроизведение и попросите детей повторять мигание лампы рукой. Обсудите, где применяется сигнализация.' },
  { icon: '🕵️', title: 'Квест и шифровальщики', description: 'Зашифруйте подсказки для станций квеста в морзе: команды расшифровывают код и получают следующее задание. Уровень сложности — скорость воспроизведения.' },
  { icon: '💻', title: 'Информатика: кодирование информации', description: 'Морзе — идеальный пример двоичного кодирования и префиксных кодов. Сравните с кодом ASCII, посчитайте информационный объём сообщения.' },
  { icon: '🏫', title: 'Кружок и внеурочка', description: 'Тренировка приёма на слух: учитель включает звук на 10 WPM, дети записывают буквы. Постепенно повышайте скорость — получите соревнование клуба юных радистов.' },
  { icon: '♿', title: 'Инклюзивное образование', description: 'Морзе как альтернативный канал коммуникации: ребёнок с ограничениями речи может отвечать миганием лампы или короткими звуками — да/нет, буквы по порядку.' },
];

const QUICK_TEXTS = ['SOS', 'ПРИВЕТ', 'УЧИТЕЛЬ', '2024', 'МОРЕ'];
const QUICK_MORSE = ['... --- ...', '.--. / .-. / .. / --. / . / -', '-.-. / .-. / ..- / --.', '... / -.-. / --- / .-. / .'];

// ===== Компонент =====

export default function MorseScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('encode');
  const [text, setText] = useState('ПРИВЕТ');
  const [morseInput, setMorseInput] = useState('... --- ...');
  const [alpha, setAlpha] = useState<Alphabet>('ru');
  const [wpm, setWpm] = useState(10);
  const [freq, setFreq] = useState(600);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lamp, setLamp] = useState(false);
  const stopRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const unit = Math.round(1200 / wpm);

  const output = useMemo(() => {
    if (mode === 'encode') return encodeText(text);
    return decodeMorse(morseInput, alpha);
  }, [mode, text, morseInput, alpha]);

  const morseToPlay = useMemo(() => {
    if (mode === 'encode') return output;
    return morseInput
      .replace(/[·•]/g, '.')
      .replace(/[–—_]/g, '-')
      .replace(/\|/g, '/')
      .replace(/\n/g, ' / ')
      .replace(/[^.\-/\s]/g, '')
      .trim();
  }, [mode, output, morseInput]);

  const segments = useMemo(() => buildSegments(morseToPlay, unit), [morseToPlay, unit]);
  const totalMs = useMemo(() => segments.reduce((s, x) => s + x.ms, 0), [segments]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      triggerHaptic('light');
    } catch {}
  };

  const handleDownload = () => {
    const content =
      mode === 'encode'
        ? `Текст: ${text}\nМорзе: ${output}\nСкорость: ${wpm} WPM\nСоздано в «Помощнике учителя»`
        : `Морзе: ${morseInput}\nТекст (${alpha === 'ru' ? 'русский' : 'латиница'}): ${output}\nСоздано в «Помощнике учителя»`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'morze.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    triggerHaptic('medium');
  };

  const stopPlayback = () => {
    stopRef.current = true;
  };

  const playMorse = async () => {
    if (!morseToPlay || playing) return;
    stopRef.current = false;
    setPlaying(true);
    triggerHaptic('medium');
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioRef.current = ctx;
      for (const seg of segments) {
        if (stopRef.current) break;
        if (seg.on) {
          setLamp(true);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = 0.35;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          await sleep(seg.ms);
          osc.stop();
          setLamp(false);
        } else {
          await sleep(seg.ms);
        }
      }
      await ctx.close();
    } catch {}
    setLamp(false);
    setPlaying(false);
    audioRef.current = null;
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* ЕДИНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Азбука Морзе</h1>
          </div>
          <Radio className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Режим и ввод ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-xl p-1.5">
            <button
              onClick={() => { setMode('encode'); triggerHaptic('light'); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'encode' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" /> Текст → Морзе
            </button>
            <button
              onClick={() => { setMode('decode'); triggerHaptic('light'); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'decode' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" /> Морзе → Текст
            </button>
          </div>

          {mode === 'encode' ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Введите текст: ПРИВЕТ, SOS, 2024…"
                className="w-full rounded-xl border-2 border-purple-200 p-3 text-lg text-center text-gray-900 focus:outline-none focus:border-purple-500 resize-y"
              />
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <span className="text-xs text-gray-500">Примеры:</span>
                {QUICK_TEXTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setText(t)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <textarea
                value={morseInput}
                onChange={(e) => setMorseInput(e.target.value)}
                rows={3}
                placeholder="... --- ...  (пробел между буквами, / между словами)"
                className="w-full rounded-xl border-2 border-purple-200 p-3 text-lg text-center font-mono text-gray-900 focus:outline-none focus:border-purple-500 resize-y"
              />
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <span className="text-xs text-gray-500">Примеры:</span>
                {QUICK_MORSE.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMorseInput(m)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-mono hover:bg-purple-100 transition-colors"
                  >
                    {m.length > 18 ? m.slice(0, 18) + '…' : m}
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-xl p-1">
                  {(['ru', 'la'] as Alphabet[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAlpha(a)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        alpha === a ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      {a === 'ru' ? 'Русский' : 'Латиница'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ===== Результат ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-purple-700 text-base">
              {mode === 'encode' ? 'Код Морзе' : 'Расшифровка'}
            </h3>
            <div className="flex gap-1.5">
              <button onClick={handleCopy} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Копировать">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
              </button>
              <button onClick={handleDownload} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" aria-label="Скачать">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 text-center break-all min-h-[4rem] flex items-center justify-center border-2 bg-purple-50 border-purple-200 text-xl text-purple-900 ${
              mode === 'encode' ? 'font-mono' : 'font-semibold'
            }`}
          >
            {output || '—'}
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            <span>Знаков морзе: <b className="text-purple-700">{morseToPlay.replace(/[\s/]/g, '').length}</b></span>
            <span>·</span>
            <span>Время звучания: <b className="text-purple-700">{(totalMs / 1000).toFixed(1)} с</b></span>
          </div>
        </section>

        {/* ===== Воспроизведение ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700 text-base">Воспроизведение сигнала</h3>
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* Лампа */}
            <div
              className={`w-24 h-24 rounded-full border-4 transition-all duration-75 ${
                lamp
                  ? 'bg-yellow-300 border-yellow-500 shadow-[0_0_40px_10px_rgba(253,224,71,0.7)]'
                  : 'bg-gray-200 border-gray-300'
              }`}
              aria-label="Сигнальная лампа"
            />
            <div className="space-y-2">
              <button
                onClick={playing ? stopPlayback : playMorse}
                disabled={!morseToPlay}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-40 ${
                  playing ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {playing ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {playing ? 'Стоп' : 'Воспроизвести'}
              </button>
              <p className="text-[11px] text-gray-500 max-w-[180px]">
                Лампа мигает и звучит тон в такт коду
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Скорость</span>
                <span className="font-mono font-bold text-purple-700">{wpm} WPM</span>
              </div>
              <input type="range" min={5} max={30} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full accent-purple-600" />
              <p className="text-[10px] text-gray-400 mt-0.5">Точка = {unit} мс</p>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Тон</span>
                <span className="font-mono font-bold text-purple-700">{freq} Гц</span>
              </div>
              <input type="range" min={400} max={1000} step={25} value={freq} onChange={(e) => setFreq(Number(e.target.value))} className="w-full accent-purple-600" />
              <p className="text-[10px] text-gray-400 mt-0.5">Стандартный телеграфный тон ≈ 600-700 Гц</p>
            </div>
          </div>
        </section>

        {/* ===== Правила тайминга ===== */}
        <section className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900 text-sm">Правила тайминга</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs text-purple-900">
            <div className="bg-white/80 rounded-lg p-2"><b className="font-mono text-base">•</b><br />точка = 1</div>
            <div className="bg-white/80 rounded-lg p-2"><b className="font-mono text-base">—</b><br />тире = 3</div>
            <div className="bg-white/80 rounded-lg p-2"><b className="font-mono text-base"> </b><br />внутри буквы = 1</div>
            <div className="bg-white/80 rounded-lg p-2"><b className="font-mono text-base">␣</b><br />между буквами = 3</div>
            <div className="bg-white/80 rounded-lg p-2"><b className="font-mono text-base">/</b><br />между словами = 7</div>
          </div>
          <p className="text-xs text-purple-800">
            При скорости <b>{wpm} WPM</b> точка длится <b>{unit} мс</b>, тире — <b>{unit * 3} мс</b>, пауза между буквами — <b>{unit * 3} мс</b>.
          </p>
        </section>

        {/* ===== Таблица кодов ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-purple-700 text-sm">Таблица кодов</h3>
              <span className="text-xs font-bold text-purple-400">{LETTERS.length + DIGITS.length + PUNCT.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-800">
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Код</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Рус</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Лат</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Код</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Рус</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">Лат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(LETTERS.length / 2) }, (_, i) => {
                      const a = LETTERS[i];
                      const b = LETTERS[i + Math.ceil(LETTERS.length / 2)];
                      return (
                        <tr key={i} className="hover:bg-purple-50/50">
                          <td className="border border-gray-100 px-2 py-1 text-center font-mono font-bold">{a[2]}</td>
                          <td className="border border-gray-100 px-2 py-1 text-center">{a[0]}</td>
                          <td className="border border-gray-100 px-2 py-1 text-center text-gray-500">{a[1]}</td>
                          {b ? (
                            <>
                              <td className="border border-gray-100 px-2 py-1 text-center font-mono font-bold">{b[2]}</td>
                              <td className="border border-gray-100 px-2 py-1 text-center">{b[0]}</td>
                              <td className="border border-gray-100 px-2 py-1 text-center text-gray-500">{b[1]}</td>
                            </>
                          ) : (
                            <>
                              <td />
                              <td />
                              <td />
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-xl p-3">
                  <h4 className="font-semibold text-xs text-gray-700 mb-2">Цифры</h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {DIGITS.map(([d, c]) => (
                      <div key={d} className="flex justify-between font-mono">
                        <span className="font-bold">{d}</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl p-3">
                  <h4 className="font-semibold text-xs text-gray-700 mb-2">Знаки препинания</h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {PUNCT.map(([p, c]) => (
                      <div key={p} className="flex justify-between font-mono">
                        <span className="font-bold">{p}</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* ===== FAQ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <summary className="px-4 py-2.5 cursor-pointer hover:bg-purple-50 font-semibold text-sm text-gray-800">{item.q}</summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">{item.a}</div>
                </details>
              ))}
            </div>
          </details>
        </section>

        {/* ===== Сценарии ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-purple-700 text-sm">Сценарии использования</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {SCENARIO_ITEMS.map((s, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl p-3 flex gap-3">
                  <span className="text-3xl shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
