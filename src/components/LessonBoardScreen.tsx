import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Download,
  Projector,
  X,
  QrCode,
  RefreshCw,
  HelpCircle,
  Trophy,
  Lightbulb,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

interface BoardField {
  id: string;
  label: string;
  value: string;
}

const STORAGE_KEY = 'lesson-board-fields';

const genId = () => 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const defaultFields = (): BoardField[] => [
  {
    id: genId(),
    label: 'Дата',
    value: new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  },
  { id: genId(), label: 'Тема урока', value: '' },
  { id: genId(), label: 'План урока', value: '' },
  { id: genId(), label: 'Домашнее задание', value: '' },
];

// ===== Canvas-помощник =====

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===== Данные справки =====

const FAQ_ITEMS = [
  { q: 'Что именно зашифровано в QR-коде?', a: 'Обычный текст заметки: названия полей и их содержимое. Любой сканер (камера телефона, приложение ВК) покажет текст сразу, без интернета и без установки приложения.' },
  { q: 'Что делать, если текст не помещается в QR?', a: 'QR вмещает около 1-2 тысяч символов. Если заметка длиннее — появится предупреждение. Сократите план или домашнее задание до ключевых пунктов: номер упражнения и страницу дети найдут и по теме.' },
  { q: 'Сохраняется ли доска между запусками?', a: 'Да, все поля автоматически сохраняются на устройстве. При следующем открытии раздела вы увидите свою прошлую доску. Кнопки «Очистить значения» и «Поля по умолчанию» приводят её к новому уроку.' },
  { q: 'Зачем режим проектора?', a: 'Это полноэкранный вид доски с крупным текстом для проектора или интерактивной панели: тема и план читаются с задней парты. Выход — кнопка ✕ или клавиша Esc. В конце урока можно включить показ QR прямо на экране.' },
  { q: 'Можно ли добавить свои поля?', a: 'Да: «Добавить поле» создаёт новую строку с любым названием — «Оборудование», «Критерии оценки», «Слова на доске». Поля можно переименовывать, менять местами и удалять.' },
];

const SCENARIO_ITEMS = [
  { icon: '📋', title: 'Начало урока', description: 'За минуту заполните тему и план, включите режим проектора — класс сразу видит структуру урока на экране.' },
  { icon: '📱', title: 'Конец урока', description: 'Покажите QR на экране: ученики сканируют и уносят домой тему, план и домашнее задание текстом в телефоне.' },
  { icon: '🤒', title: 'Для отсутствующих', description: 'Скопируйте текст заметки одной кнопкой и отправьте в чат класса или родителям болеющего ученика.' },
  { icon: '🖨️', title: 'Открытый урок', description: 'Скачайте доску в PNG: распечатайте как приложение к плану урока или вставьте в портфолио методической копилки.' },
];

// ===== Компонент =====

export default function LessonBoardScreen({ onBack }: { onBack: () => void }) {
  const [fields, setFields] = useState<BoardField[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as BoardField[];
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch {}
    return defaultFields();
  });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projector, setProjector] = useState(false);
  const [showQrInProjector, setShowQrInProjector] = useState(false);

  // Автосохранение доски
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    } catch {}
  }, [fields]);

  // Текстовая заметка из всех полей
  const noteText = useMemo(() => {
    const lines = fields
      .filter((f) => f.label.trim() || f.value.trim())
      .map((f) => `${f.label.trim() || 'Без названия'}: ${f.value.trim() || '—'}`);
    return lines.length ? `СЕГОДНЯ НА УРОКЕ\n${lines.join('\n')}` : '';
  }, [fields]);

  // Генерация QR при изменении заметки
  useEffect(() => {
    let alive = true;
    if (!noteText.trim()) {
      setQrUrl(null);
      setQrError(null);
      return;
    }
    QRCode.toDataURL(noteText, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => { if (alive) { setQrUrl(url); setQrError(null); } })
      .catch(() => { if (alive) { setQrUrl(null); setQrError('Текст слишком длинный для QR-кода. Сократите поля.'); } });
    return () => { alive = false; };
  }, [noteText]);

  // Выход из проектора по Esc
  useEffect(() => {
    if (!projector) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProjector(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projector]);

  // ===== Операции с полями =====

  const updateField = (id: string, patch: Partial<BoardField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    setFields((prev) => [...prev, { id: genId(), label: 'Новое поле', value: '' }]);
    triggerHaptic('light');
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    triggerHaptic('light');
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const clearValues = () => {
    setFields((prev) => prev.map((f) => ({ ...f, value: '' })));
    triggerHaptic('medium');
  };

  const resetFields = () => {
    setFields(defaultFields());
    triggerHaptic('medium');
  };

  const handleCopy = async () => {
    if (!noteText) return;
    try {
      await navigator.clipboard.writeText(noteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      triggerHaptic('light');
    } catch {}
  };

  // ===== Скачивание доски в PNG =====

  const downloadPng = () => {
    if (!qrUrl) return;
    const W = 1200;
    const pad = 60;
    const maxTextW = W - pad * 2;
    const measure = document.createElement('canvas').getContext('2d')!;
    const wrapText = (text: string, font: string) => {
      measure.font = font;
      const out: string[] = [];
      text.split('\n').forEach((par) => {
        if (!par.trim()) { out.push(''); return; }
        out.push(...wrapCanvasText(measure, par, maxTextW));
      });
      return out;
    };

    const blocks = fields
      .filter((f) => f.label.trim() || f.value.trim())
      .map((f) => {
        const valueLines = f.value.trim() ? wrapText(f.value.trim(), '26px Arial') : [];
        const h = 44 + valueLines.length * 34 + 24;
        return { f, valueLines, h };
      });

    const headerH = 150;
    const qrSize = 320;
    const footerH = 70;
    const contentH = blocks.reduce((s, b) => s + b.h, 0);
    const H = headerH + contentH + qrSize + 120 + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#7c3aed');
    g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px Arial';
    ctx.fillText('СЕГОДНЯ НА УРОКЕ', W / 2, 72);
    ctx.font = '22px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Помощник учителя · доска урока', W / 2, 114);

    let y = headerH + 50;
    blocks.forEach((b) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b21a8';
      ctx.font = 'bold 30px Arial';
      ctx.fillText(b.f.label || 'Без названия', pad, y);
      y += 40;
      if (b.valueLines.length === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '26px Arial';
        ctx.fillText('—', pad, y);
        y += 34;
      } else {
        ctx.fillStyle = '#111827';
        ctx.font = '26px Arial';
        b.valueLines.forEach((line) => {
          ctx.fillText(line, pad, y);
          y += 34;
        });
      }
      y += 24;
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, y - 12);
      ctx.lineTo(W - pad, y - 12);
      ctx.stroke();
    });

    const img = new Image();
    img.onload = () => {
      const qrX = (W - qrSize) / 2;
      ctx.drawImage(img, qrX, y + 10, qrSize, qrSize);
      ctx.fillStyle = '#6b7280';
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Отсканируй в конце урока — заметка останется у тебя', W / 2, y + qrSize + 50);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, H - footerH, W, footerH);
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Arial';
      ctx.fillText('Создано в мини-приложении «Помощник учителя» · vk.ru/topteach', W / 2, H - 26);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'segodnya-na-uroke.png';
      a.click();
      triggerHaptic('heavy');
    };
    img.src = qrUrl;
  };

  const visibleFields = fields.filter((f) => f.label.trim() || f.value.trim());

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* ЕДИНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Сегодня на уроке</h1>
          </div>
          <ClipboardList className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Поля доски ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-base">Поля доски</h3>
              <span className="text-xs text-gray-400">({fields.length})</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={clearValues}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Оставить названия полей, стереть текст"
              >
                <RefreshCw className="w-3 h-3" /> Очистить значения
              </button>
              <button
                onClick={resetFields}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
                title="Вернуть стандартный набор полей"
              >
                Поля по умолчанию
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {fields.map((f, idx) => (
              <div key={f.id} className="border-2 border-gray-200 rounded-xl p-3 space-y-2 bg-white">
                <div className="flex items-center gap-1.5">
                  <input
                    value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })}
                    placeholder="Название поля"
                    className="flex-1 min-w-0 rounded-lg border border-purple-200 px-2.5 py-1.5 text-sm font-semibold text-purple-900 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => moveField(f.id, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-25 transition-colors"
                    aria-label="Выше"
                  >
                    <ChevronUp className="w-4 h-4 text-purple-700" />
                  </button>
                  <button
                    onClick={() => moveField(f.id, 'down')}
                    disabled={idx === fields.length - 1}
                    className="p-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-25 transition-colors"
                    aria-label="Ниже"
                  >
                    <ChevronDown className="w-4 h-4 text-purple-700" />
                  </button>
                  <button
                    onClick={() => removeField(f.id)}
                    disabled={fields.length <= 1}
                    className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-25 transition-colors"
                    aria-label="Удалить поле"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <textarea
                  value={f.value}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                  rows={2}
                  placeholder="Текст поля (для плана — каждый пункт с новой строки)"
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-800 resize-y focus:outline-none focus:border-purple-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addField}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-700 text-sm font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Добавить поле
          </button>
        </section>

        {/* ===== Заметка и QR ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700 text-base">Заметка и QR-код</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Текст заметки</span>
                <button
                  onClick={handleCopy}
                  disabled={!noteText}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  aria-label="Копировать заметку"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                </button>
              </div>
              <pre className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-56 overflow-y-auto font-mono">
                {noteText || 'Заполните поля — здесь появится текст заметки'}
              </pre>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">QR для учеников</span>
              {qrUrl ? (
                <img src={qrUrl} alt="QR-код заметки урока" className="w-44 h-44 rounded-xl border border-gray-200 bg-white p-1" />
              ) : (
                <div className="w-44 h-44 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-center px-3">
                  <span className="text-[11px] text-gray-400">{qrError || 'QR появится, когда вы заполните поля'}</span>
                </div>
              )}
              {qrError && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-center">{qrError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setProjector(true)}
              disabled={visibleFields.length === 0}
              className="py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Projector className="w-4 h-4" /> Режим проектора
            </button>
            <button
              onClick={downloadPng}
              disabled={!qrUrl}
              className="py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Скачать доску в PNG
            </button>
          </div>
        </section>

        {/* ===== Как это работает ===== */}
        <section className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900 text-sm">Как это работает</h3>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-purple-900">
            <li>Заполните поля доски: дата подставится сама, тему и план впишите или вставьте из плана урока.</li>
            <li>Включите «Режим проектора» — класс видит тему и план крупно на экране.</li>
            <li>В конце урока покажите QR: ученики сканируют камерой и получают всю заметку текстом в телефон.</li>
            <li>Нужно на бумагу? «Скачать доску в PNG» — готовый лист с полями и QR для печати или чата.</li>
          </ol>
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

      {/* ===== РЕЖИМ ПРОЕКТОРА ===== */}
      {projector && (
        <div className="fixed inset-0 z-[100] bg-slate-900 text-white overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 sm:px-10 py-8 space-y-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-purple-300">
                <ClipboardList className="w-6 h-6" />
                <span className="text-sm font-semibold uppercase tracking-widest">Сегодня на уроке</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQrInProjector((v) => !v)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    showQrInProjector ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Показать QR
                </button>
                <button
                  onClick={() => setProjector(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Выйти из режима проектора"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {visibleFields.map((f) => (
              <div key={f.id} className="space-y-2">
                <div className="text-purple-300 text-base sm:text-xl font-semibold uppercase tracking-widest">
                  {f.label}
                </div>
                <div className="text-3xl sm:text-5xl font-bold leading-tight whitespace-pre-wrap">
                  {f.value.trim() || '—'}
                </div>
              </div>
            ))}

            {showQrInProjector && qrUrl && (
              <div className="flex flex-col items-center gap-3 pt-4">
                <img src={qrUrl} alt="QR-код заметки урока" className="w-56 h-56 sm:w-72 sm:h-72 rounded-2xl bg-white p-2" />
                <p className="text-lg sm:text-2xl text-purple-200 text-center">
                  Отсканируй — тема, план и домашнее задание останутся у тебя
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
