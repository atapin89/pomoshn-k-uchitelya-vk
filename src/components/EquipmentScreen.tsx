import { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  RotateCcw,
  History,
  Trash2,
  Users,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog } from './ConfirmDialog';

interface LoanRecord {
  id: string;
  student: string;
  item: string;
  loanedAt: number;
  returnedAt: number | null;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

const STORAGE_KEY = 'equipment-loans';

const PRESET_ITEMS = [
  'Калькулятор',
  'Линейка',
  'Транспортир',
  'Циркуль',
  'Карандаш',
  'Ручка',
  'Ластик',
  'Ножницы',
];

function loadLoans(): LoanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLoans(list: LoanRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function genId(): string {
  return `loan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

type HistoryFilter = 'all' | 'outstanding' | 'returned';

export default function EquipmentScreen({ onBack }: { onBack: () => void }) {
  const [loans, setLoans] = useState<LoanRecord[]>(() => loadLoans());
  const [view, setView] = useState<'main' | 'history'>('main');
  const [studentName, setStudentName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const update = (next: LoanRecord[]) => {
    setLoans(next);
    saveLoans(next);
  };

  const outstanding = useMemo(() => loans.filter((l) => !l.returnedAt), [loans]);

  const stats = useMemo(
    () => ({
      itemsOut: outstanding.length,
      students: new Set(outstanding.map((l) => l.student.toLowerCase())).size,
      today: loans.filter((l) => isToday(l.loanedAt)).length,
    }),
    [loans, outstanding],
  );

  const toggleItem = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleAdd = () => {
    const name = studentName.trim();
    const items = [...selected];
    const custom = customItem.trim();
    if (custom) items.push(custom);
    if (!name || items.length === 0) {
      triggerHaptic('medium');
      return;
    }
    const now = Date.now();
    const newRecords: LoanRecord[] = items.map((item) => ({
      id: genId(),
      student: name,
      item,
      loanedAt: now,
      returnedAt: null,
    }));
    update([...newRecords, ...loans]);
    setStudentName('');
    setSelected([]);
    setCustomItem('');
    triggerHaptic('light');
  };

  const handleReturn = (id: string) => {
    update(loans.map((l) => (l.id === id ? { ...l, returnedAt: Date.now() } : l)));
    triggerHaptic('light');
  };

  const handleReturnAll = () => {
    if (outstanding.length === 0) return;
    setConfirmState({
      title: 'Вернуть все предметы?',
      message: `Будет возвращено ${outstanding.length} ${outstanding.length === 1 ? 'предмет' : outstanding.length < 5 ? 'предмета' : 'предметов'} от всех учеников.`,
      confirmLabel: 'Вернуть всё',
      danger: false,
      action: () => {
        const now = Date.now();
        update(loans.map((l) => (l.returnedAt ? l : { ...l, returnedAt: now })));
        triggerHaptic('heavy');
      },
    });
  };

  const handleClearHistory = () => {
    if (loans.length === 0) return;
    setConfirmState({
      title: 'Очистить всю историю учёта?',
      message: 'Все записи о выдачах и возвратах будут удалены безвозвратно. Это действие нельзя отменить.',
      confirmLabel: 'Очистить',
      danger: true,
      action: () => {
        update([]);
        triggerHaptic('heavy');
      },
    });
  };

  const filteredHistory = useMemo(() => {
    const sorted = [...loans].sort((a, b) => b.loanedAt - a.loanedAt);
    if (filter === 'outstanding') return sorted.filter((l) => !l.returnedAt);
    if (filter === 'returned') return sorted.filter((l) => l.returnedAt);
    return sorted;
  }, [loans, filter]);

  const faqs = [
    {
      q: 'Для чего нужен учёт оборудования?',
      a: 'Учитель выдаёт ученикам калькуляторы, линейки, циркули и другие принадлежности. Без учёта предметы теряются, а в конце урока сложно проверить, всё ли вернули. Этот инструмент фиксирует: кто взял, что взял, когда. В любой момент видно, что ещё на руках.',
    },
    {
      q: 'Как выдать несколько предметов одному ученику?',
      a: 'Введите имя ученика один раз, затем отметьте все нужные предметы (калькулятор + линейка + транспортир) и нажмите «Выдать». Система создаст отдельную запись для каждого предмета. Так удобнее возвращать по одному.',
    },
    {
      q: 'Что делать, если предмета нет в списке?',
      a: 'Используйте поле «Или свой предмет...» — введите любое название (например, «Микроскоп» или «Гербарий»). Можно одновременно выбрать предметы из списка и добавить свой.',
    },
    {
      q: 'Как вернуть все предметы сразу?',
      a: 'В конце урока нажмите кнопку «Вернуть всё» — все предметы от всех учеников будут отмечены как возвращённые. Это удобно, если вы уверены, что всё собрали. Если вернули не всё — возвращайте по одному кнопкой «Вернуть» рядом с каждой записью.',
    },
    {
      q: 'Что показывает история учёта?',
      a: 'История хранит все записи: и текущие выдачи (на руках), и уже возвращённые предметы. Фильтры «На руках» и «Возвращено» помогают быстро найти нужное. Это полезно для анализа: какие предметы теряются чаще, кто из учеников часто забывает вернуть.',
    },
    {
      q: 'Можно ли использовать для других целей?',
      a: 'Да! Инструмент подходит для учёта любых выдач: библиотечных книг, спортивного инвентаря, планшетов в компьютерном классе, халатов в кабинете химии. Принцип один: кто взял, что взял, когда вернул.',
    },
  ];

  // ===== ЭКРАН ИСТОРИИ =====
  if (view === 'history') {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
        <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => setView('main')} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">История учёта</h1>
            </div>
            <History className="w-6 h-6 text-white/70" />
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
          {/* Фильтры */}
          <div className="inline-flex w-full bg-gray-100 rounded-xl p-1">
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'outstanding', label: 'На руках' },
                { id: 'returned', label: 'Возвращено' },
              ] as { id: HistoryFilter; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filter === f.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Нет записей для показа</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((l) => (
                <div key={l.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${l.returnedAt ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {l.returnedAt ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Package className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {l.student} — {l.item}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Выдано: {fmtDateTime(l.loanedAt)}
                      {l.returnedAt && ` · Возврат: ${fmtDateTime(l.returnedAt)}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg ${l.returnedAt ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {l.returnedAt ? 'возврат' : 'на руках'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleClearHistory}
            disabled={loans.length === 0}
            className="w-full bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-600 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-5 h-5" /> Очистить историю
          </button>
        </main>

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
      </div>
    );
  }

  // ===== ГЛАВНЫЙ ЭКРАН =====
  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию, правый угол свободен */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Учёт оборудования</h1>
          </div>
          <Package className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* 🆕 Панель действий с кнопкой "История" (перенесена из шапки) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setView('history')}
            className="bg-white hover:bg-gray-50 text-gray-700 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors shadow-sm"
          >
            <History className="w-5 h-5" />
            История учёта
          </button>
          <button
            onClick={handleReturnAll}
            disabled={outstanding.length === 0}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" /> Вернуть всё
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <Package className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.itemsOut}</p>
            <p className="text-[11px] text-gray-500">выдано</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.students}</p>
            <p className="text-[11px] text-gray-500">учеников</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <ClipboardList className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.today}</p>
            <p className="text-[11px] text-gray-500">сегодня</p>
          </div>
        </div>

        {/* Форма выдачи */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-purple-700">Выдать предмет</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Имя ученика..."
            className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ITEMS.map((item) => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleItem(item)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            placeholder="Или свой предмет..."
            className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={handleAdd}
            disabled={!studentName.trim() || (selected.length === 0 && !customItem.trim())}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" /> Выдать
          </button>
        </div>

        {/* Сейчас на руках */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-purple-700">Сейчас на руках</label>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 rounded-lg px-2 py-1">
              {outstanding.length}
            </span>
          </div>
          {outstanding.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Все предметы возвращены 🎉</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {outstanding.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border border-gray-100 rounded-xl p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{l.student}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {l.item} · {fmtDateTime(l.loanedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReturn(l.id)}
                    className="shrink-0 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Вернуть
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🆕 FAQ секция */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                    <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

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
    </div>
  );
}
