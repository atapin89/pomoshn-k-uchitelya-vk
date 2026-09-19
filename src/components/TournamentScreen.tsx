import { useState, useMemo } from 'react';
import {
  Network,
  Trophy,
  Shuffle,
  Trash2,
  Save,
  FolderOpen,
  Printer,
  Copy,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Medal,
  Users,
  ListOrdered,
  X,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

// ===== Типы =====

type Mode = 'playoff' | 'round';

interface MatchResult {
  winner: 'a' | 'b' | null;
  scoreA: number | null;
  scoreB: number | null;
}

interface SkeletonMatch {
  id: string;
  a: string | null;
  b: string | null;
}

interface ResolvedMatch extends SkeletonMatch {
  aName: string | null;
  bName: string | null;
  winner: 'a' | 'b' | null;
  bye: boolean;
  empty: boolean;
  scoreA: number | null;
  scoreB: number | null;
}

interface Tournament {
  id: string;
  name: string;
  mode: Mode;
  participants: string[];
  results: Record<string, MatchResult>;
  thirdPlace: boolean;
  createdAt: number;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

interface StandingRow {
  name: string;
  played: number;
  w: number;
  d: number;
  l: number;
  diff: number;
  pts: number;
}

const SAVED_KEY = 'tournament-saved';

// ===== Утилиты =====

function loadSaved(): Tournament[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

function persistSaved(list: Tournament[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {}
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function buildSkeleton(players: string[]): SkeletonMatch[][] {
  const size = nextPow2(players.length);
  const slots: (string | null)[] = [...players];
  while (slots.length < size) slots.push(null);

  const rounds: SkeletonMatch[][] = [];
  const r0: SkeletonMatch[] = [];
  for (let i = 0; i < size; i += 2) {
    r0.push({ id: `r0m${i / 2}`, a: slots[i], b: slots[i + 1] });
  }
  rounds.push(r0);

  let prevCount = r0.length;
  let rIdx = 1;
  while (prevCount > 1) {
    const c = prevCount / 2;
    rounds.push(Array.from({ length: c }, (_, i) => ({ id: `r${rIdx}m${i}`, a: null, b: null })));
    prevCount = c;
    rIdx++;
  }
  return rounds;
}

function resolveBracket(skeleton: SkeletonMatch[][], results: Record<string, MatchResult>) {
  const rounds: ResolvedMatch[][] = skeleton.map((r) =>
    r.map((m) => ({
      ...m,
      aName: m.a,
      bName: m.b,
      winner: null,
      bye: false,
      empty: false,
      scoreA: null,
      scoreB: null,
    })),
  );

  const winnerName = (m: ResolvedMatch): string | null =>
    m.winner === 'a' ? m.aName : m.winner === 'b' ? m.bName : null;
  const loserName = (m: ResolvedMatch): string | null =>
    m.winner === 'a' ? m.bName : m.winner === 'b' ? m.aName : null;

  for (let r = 0; r < rounds.length; r++) {
    for (let i = 0; i < rounds[r].length; i++) {
      const m = rounds[r][i];
      if (r > 0) {
        const pa = rounds[r - 1][i * 2];
        const pb = rounds[r - 1][i * 2 + 1];
        m.aName = pa ? winnerName(pa) : null;
        m.bName = pb ? winnerName(pb) : null;
      }
      const res = results[m.id];
      if (m.aName && m.bName) {
        if (res && res.winner) {
          m.winner = res.winner;
          m.scoreA = res.scoreA ?? null;
          m.scoreB = res.scoreB ?? null;
        }
      } else if (m.aName) {
        m.winner = 'a';
        m.bye = true;
      } else if (m.bName) {
        m.winner = 'b';
        m.bye = true;
      } else {
        m.empty = true;
      }
    }
  }

  const final = rounds[rounds.length - 1][0];
  const champion = final ? winnerName(final) : null;

  let third: ResolvedMatch | null = null;
  if (rounds.length >= 2) {
    const sf1 = rounds[rounds.length - 2][0];
    const sf2 = rounds[rounds.length - 2][1];
    const ta = sf1 ? loserName(sf1) : null;
    const tb = sf2 ? loserName(sf2) : null;
    const res = results['third'];
    third = {
      id: 'third',
      a: ta,
      b: tb,
      aName: ta,
      bName: tb,
      winner:
        ta && tb && res && res.winner ? res.winner : ta && !tb ? 'a' : !ta && tb ? 'b' : null,
      bye: Boolean(ta) !== Boolean(tb),
      empty: !ta && !tb,
      scoreA: res?.scoreA ?? null,
      scoreB: res?.scoreB ?? null,
    };
  }

  return { rounds, champion, third };
}

function roundName(r: number, total: number): string {
  const fromEnd = total - 1 - r;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return 'Полуфинал';
  if (fromEnd === 2) return 'Четвертьфинал';
  return `Раунд ${r + 1}`;
}

function roundRobinRounds(players: string[]): [string, string][][] {
  const arr: (string | null)[] = [...players];
  if (arr.length % 2) arr.push(null);
  const n = arr.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as string | null);
  }
  return rounds;
}

function computeStandings(
  players: string[],
  rounds: [string, string][][],
  results: Record<string, MatchResult>,
): StandingRow[] {
  const map = new Map<string, StandingRow>();
  players.forEach((p) => map.set(p, { name: p, played: 0, w: 0, d: 0, l: 0, diff: 0, pts: 0 }));
  rounds.forEach((pairs, r) =>
    pairs.forEach((pair, i) => {
      const res = results[`rr-${r}-${i}`];
      if (!res || res.scoreA == null || res.scoreB == null) return;
      const A = map.get(pair[0]);
      const B = map.get(pair[1]);
      if (!A || !B) return;
      A.played++;
      B.played++;
      A.diff += res.scoreA - res.scoreB;
      B.diff += res.scoreB - res.scoreA;
      if (res.scoreA > res.scoreB) {
        A.w++;
        B.l++;
        A.pts += 2;
      } else if (res.scoreA < res.scoreB) {
        B.w++;
        A.l++;
        B.pts += 2;
      } else {
        A.d++;
        B.d++;
        A.pts++;
        B.pts++;
      }
    }),
  );
  return [...map.values()].sort(
    (x, y) => y.pts - x.pts || y.diff - x.diff || x.name.localeCompare(y.name, 'ru'),
  );
}

// ===== FAQ и сценарии =====

const FAQ_ITEMS = [
  {
    q: 'Как строится сетка, если участников не степень двойки?',
    a: 'Приложение автоматически добавляет «свободные места» (bye). Участник, попавший в пару со свободным местом, проходит в следующий круг автоматически — такой матч помечается пометкой «авто». Например, для 6 участников сетка строится на 8 мест, и двое сильнейших по посеву получают автопроход в первом круге.',
  },
  {
    q: 'Как отметить победителя матча?',
    a: 'Нажмите на имя участника внутри карточки матча — он станет победителем (появится 🏆) и автоматически перейдёт в следующий круг. Повторное нажатие на другое имя меняет победителя. Счёт рядом с именами необязателен, но полезен для печати и статистики.',
  },
  {
    q: 'Что такое «Матч за 3 место»?',
    a: 'Дополнительный матч между двумя проигравшими в полуфиналах. Включается тумблером при создании турнира. Отключите, если бронза не нужна — сетка станет компактнее.',
  },
  {
    q: 'Как работает круговой турнир?',
    a: 'Каждый играет с каждым. Приложение само составляет расписание по туровому алгоритму. Внесите счета в пары — таблица посчитается автоматически: победа — 2 очка, ничья — 1, поражение — 0. Сортировка по очкам, затем по разнице мячей.',
  },
  {
    q: 'Можно ли ввести счёт матча?',
    a: 'Да, в каждой карточке матча есть поля для счёта. В плей-офф счёт носит справочный характер (победитель отмечается кликом), в круговом турнире счёт определяет очки в таблице.',
  },
  {
    q: 'Как сохранить турнир и продолжить позже?',
    a: 'Нажмите «Сохранить» — турнир попадёт в список «Сохранённые» (хранится локально в браузере). В любой момент откройте его оттуда и продолжите с того же места: сетка, счета и победители восстановятся.',
  },
  {
    q: 'Как распечатать сетку или таблицу?',
    a: 'Кнопка «Печать» открывает окно с готовой разметкой: сетка по кругам с победителями и счётом либо таблица кругового турнира. Нажмите «Печать» в открывшемся окне — формат подходит для A4.',
  },
  {
    q: 'Зачем кнопка «Перемешать»?',
    a: 'Для честной жеребьёвки: порядок участников в сетке случайный. Нажмите «Перемешать» в готовом турнире, чтобы пересоздать сетку с новым порядком (результаты матчей при этом сбрасываются).',
  },
];

const SCENARIO_ITEMS = [
  {
    icon: '🏆',
    title: 'Викторина-плей-офф по теме урока',
    description: 'Разделите класс на 8 команд (или учеников), создайте сетку. На каждом этапе команды отвечают на вопросы, победитель пары проходит дальше. Финал — в конце урока: азарт и повторение темы одновременно.',
  },
  {
    icon: '⚽',
    title: 'Кубок класса по мини-футболу',
    description: 'Спортивный час или школьный турнир: внесите команды, играйте матчи на переменах и отмечайте победителей со счётом. К концу недели готова красивая сетка с чемпионом для школьной доски.',
  },
  {
    icon: '📚',
    title: 'Книжный вызов (круговой турнир)',
    description: 'Ученики соревнуются по количеству прочитанных книг за месяц: каждый тур — обсуждение пары книг. Круговая таблица показывает лидера недели и мотивирует дочитывать.',
  },
  {
    icon: '🧠',
    title: 'Лига предметной недели',
    description: 'В неделю математики или русского языка проводите короткие дуэли: победитель пары набирает очки. Круговой режим даёт итоговый рейтинг участников для грамот.',
  },
  {
    icon: '🎲',
    title: 'Шахматный или настольный клуб',
    description: 'Регулярные встречи клуба: создавайте турнир на встречу, отмечайте результаты партий, сохраняйте турниры — к концу четверти видна общая таблица успехов каждого игрока.',
  },
  {
    icon: '👥',
    title: 'Справедливый выбор команд',
    description: 'Перед турниром нажмите «Перемешать» — посев будет случайным, никто не обидится на «подставную» сетку. Особенно полезно, когда в классе есть явные фавориты.',
  },
];

// ===== Компонент =====

export default function TournamentScreen({ onBack }: { onBack: () => void }) {
  const [participantsText, setParticipantsText] = useState('');
  const [mode, setMode] = useState<Mode>('playoff');
  const [thirdPlace, setThirdPlace] = useState(true);
  const [doShuffle, setDoShuffle] = useState(true);
  const [tName, setTName] = useState('');
  const [active, setActive] = useState<Tournament | null>(null);
  const [saved, setSaved] = useState<Tournament[]>(() => loadSaved());
  const [showSaved, setShowSaved] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const participants = useMemo(
    () =>
      participantsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [participantsText],
  );

  const minPlayers = mode === 'playoff' ? 2 : 3;

  const resolved = useMemo(() => {
    if (!active || active.mode !== 'playoff') return null;
    return resolveBracket(buildSkeleton(active.participants), active.results);
  }, [active]);

  const rrRounds = useMemo(() => {
    if (!active || active.mode !== 'round') return null;
    return roundRobinRounds(active.participants);
  }, [active]);

  const standings = useMemo(() => {
    if (!active || active.mode !== 'round' || !rrRounds) return null;
    return computeStandings(active.participants, rrRounds, active.results);
  }, [active, rrRounds]);

  const updateActive = (patch: Partial<Tournament>) => {
    setActive((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const setResult = (matchId: string, patch: Partial<MatchResult>) => {
    if (!active) return;
    const prevRes = active.results[matchId] || { winner: null, scoreA: null, scoreB: null };
    updateActive({
      results: { ...active.results, [matchId]: { ...prevRes, ...patch } },
    });
  };

  const handleCreate = () => {
    if (participants.length < minPlayers) {
      setAlertMsg(
        mode === 'playoff'
          ? 'Для сетки нужно минимум 2 участника.'
          : 'Для кругового турнира нужно минимум 3 участника.',
      );
      return;
    }
    const list = doShuffle ? shuffleArr(participants) : participants;
    setActive({
      id: `t-${Date.now()}`,
      name: tName.trim() || 'Турнир',
      mode,
      participants: list,
      results: {},
      thirdPlace: mode === 'playoff' ? thirdPlace : false,
      createdAt: Date.now(),
    });
    triggerHaptic('medium');
  };

  const handleNew = () => {
    setConfirmState({
      title: 'Начать новый турнир?',
      message: 'Текущая сетка и результаты будут сброшены.',
      confirmLabel: 'Новый турнир',
      danger: false,
      action: () => {
        setActive(null);
        setParticipantsText('');
        setTName('');
      },
    });
  };

  const handleReshuffle = () => {
    if (!active) return;
    setConfirmState({
      title: 'Перемешать участников?',
      message: 'Сетка будет пересоздана, все результаты матчей сбросятся.',
      confirmLabel: 'Перемешать',
      danger: true,
      action: () => {
        updateActive({ participants: shuffleArr(active.participants), results: {} });
        triggerHaptic('medium');
      },
    });
  };

  const handleSave = () => {
    if (!active) return;
    setSaved((prev) => {
      const exists = prev.some((t) => t.id === active.id);
      const next = exists ? prev.map((t) => (t.id === active.id ? active : t)) : [active, ...prev];
      persistSaved(next);
      return next;
    });
    setAlertMsg('Турнир сохранён ✅');
  };

  const handleLoad = (t: Tournament) => {
    setActive({ ...t, results: { ...t.results } });
    setShowSaved(false);
    triggerHaptic('light');
  };

  const handleDeleteSaved = (id: string) => {
    setSaved((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistSaved(next);
      return next;
    });
  };

  const buildResultsText = (): string => {
    if (!active) return '';
    const lines: string[] = [`🏆 ${active.name}`, `Режим: ${active.mode === 'playoff' ? 'плей-офф' : 'круговой'}`, ''];
    if (active.mode === 'playoff' && resolved) {
      resolved.rounds.forEach((round, r) => {
        lines.push(`${roundName(r, resolved.rounds.length)}:`);
        round.forEach((m) => {
          if (m.empty) return;
          const score = m.scoreA != null && m.scoreB != null ? ` (${m.scoreA}:${m.scoreB})` : '';
          const winner = m.winner === 'a' ? m.aName : m.winner === 'b' ? m.bName : '—';
          lines.push(`  ${m.aName || '—'} vs ${m.bName || '—'}${score} → ${winner}${m.bye ? ' (авто)' : ''}`);
        });
        lines.push('');
      });
      if (active.thirdPlace && resolved.third && !resolved.third.empty) {
        const t = resolved.third;
        const winner = t.winner === 'a' ? t.aName : t.winner === 'b' ? t.bName : '—';
        lines.push(`Матч за 3 место: ${t.aName || '—'} vs ${t.bName || '—'} → ${winner}`);
      }
      lines.push('', `🥇 Чемпион: ${resolved.champion || 'не определён'}`);
    }
    if (active.mode === 'round' && standings) {
      lines.push('Таблица:');
      standings.forEach((row, i) => {
        lines.push(
          `  ${i + 1}. ${row.name} — игр: ${row.played}, в: ${row.w}, н: ${row.d}, п: ${row.l}, разница: ${row.diff > 0 ? '+' : ''}${row.diff}, очков: ${row.pts}`,
        );
      });
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildResultsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      triggerHaptic('light');
    } catch {
      setAlertMsg('Не удалось скопировать. Выделите текст вручную.');
    }
  };

  const handlePrint = () => {
    if (!active) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setAlertMsg('Разрешите всплывающие окна для печати');
      return;
    }

    let body = '';
    if (active.mode === 'playoff' && resolved) {
      body = `
        <div class="rounds">
          ${resolved.rounds
            .map(
              (round, r) => `
            <div class="round">
              <h3>${roundName(r, resolved.rounds.length)}</h3>
              ${round
                .map((m) => {
                  if (m.empty) return '<div class="match empty">—</div>';
                  const score =
                    m.scoreA != null && m.scoreB != null ? ` (${m.scoreA}:${m.scoreB})` : '';
                  return `
                    <div class="match">
                      <div class="side ${m.winner === 'a' ? 'win' : ''}">${m.aName || '—'}${m.winner === 'a' ? ' 🏆' : ''}</div>
                      <div class="side ${m.winner === 'b' ? 'win' : ''}">${m.bName || '—'}${m.winner === 'b' ? ' 🏆' : ''}</div>
                      <div class="score">${score}</div>
                    </div>`;
                })
                .join('')}
            </div>`,
            )
            .join('')}
        </div>
        ${
          active.thirdPlace && resolved.third && !resolved.third.empty
            ? `<h3>Матч за 3 место</h3><div class="match"><div class="side ${resolved.third.winner === 'a' ? 'win' : ''}">${resolved.third.aName || '—'}</div><div class="side ${resolved.third.winner === 'b' ? 'win' : ''}">${resolved.third.bName || '—'}</div></div>`
            : ''
        }
        <h2 class="champ">🥇 Чемпион: ${resolved.champion || 'не определён'}</h2>`;
    } else if (active.mode === 'round' && standings && rrRounds) {
      body = `
        <table class="standings">
          <tr><th>№</th><th>Участник</th><th>Игр</th><th>В</th><th>Н</th><th>П</th><th>Разн.</th><th>Очки</th></tr>
          ${standings
            .map(
              (row, i) =>
                `<tr><td>${i + 1}</td><td>${row.name}</td><td>${row.played}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td><td>${row.diff > 0 ? '+' : ''}${row.diff}</td><td><b>${row.pts}</b></td></tr>`,
            )
            .join('')}
        </table>
        <h3>Матчи</h3>
        ${rrRounds
          .map(
            (pairs, r) => `
          <p><b>Тур ${r + 1}:</b> ${pairs
            .map((pair, i) => {
              const res = active.results[`rr-${r}-${i}`];
              const score = res && res.scoreA != null && res.scoreB != null ? ` ${res.scoreA}:${res.scoreB}` : '';
              return `${pair[0]} — ${pair[1]}${score}`;
            })
            .join('; ')}</p>`,
          )
          .join('')}`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${active.name}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 20px; color: #1f2937; }
          h1 { font-size: 22px; }
          h2.champ { color: #7c3aed; }
          .rounds { display: flex; gap: 24px; }
          .round { min-width: 180px; }
          .round h3 { font-size: 14px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; }
          .match { border: 1px solid #d1d5db; border-radius: 8px; margin: 8px 0; padding: 6px 8px; font-size: 13px; }
          .match.empty { color: #9ca3af; text-align: center; }
          .side.win { font-weight: bold; color: #15803d; }
          .score { color: #6b7280; font-size: 11px; }
          table.standings { border-collapse: collapse; width: 100%; font-size: 13px; }
          table.standings th, table.standings td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; }
          table.standings th { background: #f3e8ff; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:center;margin-bottom:16px;">
          <button onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer;">🖨️ Печать</button>
        </div>
        <h1>🏆 ${active.name}</h1>
        <p>Режим: ${active.mode === 'playoff' ? 'плей-офф (на выбывание)' : 'круговой турнир'} · Участников: ${active.participants.length}</p>
        ${body}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ===== Карточка матча плей-офф =====
  const renderMatch = (m: ResolvedMatch) => {
    if (m.empty) {
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-xs text-gray-400">
          —
        </div>
      );
    }
    const row = (side: 'a' | 'b') => {
      const name = side === 'a' ? m.aName : m.bName;
      const score = side === 'a' ? m.scoreA : m.scoreB;
      const isWinner = m.winner === side;
      const canPick = Boolean(m.aName && m.bName) && !m.bye;
      if (!name) {
        return (
          <div className="px-2.5 py-2 text-xs text-gray-400 italic">ожидает победителя</div>
        );
      }
      return (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-2 ${isWinner ? 'bg-green-50' : ''} ${
            side === 'b' ? 'border-t border-gray-100' : ''
          }`}
        >
          <button
            disabled={!canPick}
            onClick={() => setResult(m.id, { winner: side })}
            className={`flex-1 min-w-0 text-left text-xs font-semibold truncate transition-colors ${
              isWinner ? 'text-green-700' : 'text-gray-700'
            } ${canPick ? 'hover:text-purple-700 cursor-pointer' : 'cursor-default'}`}
            title={canPick ? 'Отметить победителем' : undefined}
          >
            {isWinner && '🏆 '}
            {name}
            {m.bye && <span className="text-gray-400 font-normal"> (авто)</span>}
          </button>
          <input
            type="number"
            min={0}
            value={score ?? ''}
            placeholder="–"
            onChange={(e) =>
              setResult(m.id, {
                [side === 'a' ? 'scoreA' : 'scoreB']: e.target.value === '' ? null : Number(e.target.value),
              } as Partial<MatchResult>)
            }
            className="w-10 shrink-0 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>
      );
    };
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {row('a')}
        {row('b')}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* ЕДИНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Турнирная сетка</h1>
          </div>
          <Network className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== СОЗДАНИЕ ТУРНИРА ===== */}
        {!active && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <div>
                <label className="text-sm font-semibold text-purple-700 block mb-2">
                  Название турнира
                </label>
                <input
                  type="text"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Например: Кубок класса по викторине"
                  className="w-full rounded-xl border border-purple-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700 block mb-2">Режим</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('playoff')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${
                      mode === 'playoff'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-purple-200'
                    }`}
                  >
                    <Network className="w-5 h-5" />
                    <span className="text-xs font-semibold">Сетка (плей-офф)</span>
                  </button>
                  <button
                    onClick={() => setMode('round')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-colors ${
                      mode === 'round'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-purple-200'
                    }`}
                  >
                    <ListOrdered className="w-5 h-5" />
                    <span className="text-xs font-semibold">Круговой турнир</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-700 block mb-2">
                  Участники
                </label>
                <textarea
                  value={participantsText}
                  onChange={(e) => setParticipantsText(e.target.value)}
                  placeholder={'Каждый участник с новой строки или через запятую:\nИванов\nПетров\nСидоров'}
                  rows={6}
                  className="w-full rounded-xl border border-purple-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Добавлено участников: <b className="text-purple-700">{participants.length}</b>
                  {mode === 'playoff' && participants.length >= 2
                    ? ` · сетка на ${nextPow2(participants.length)} мест`
                    : ''}
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doShuffle}
                    onChange={(e) => setDoShuffle(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  Перемешать участников при создании (честная жеребьёвка)
                </label>
                {mode === 'playoff' && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={thirdPlace}
                      onChange={(e) => setThirdPlace(e.target.checked)}
                      className="w-4 h-4 accent-purple-600"
                    />
                    Матч за 3 место
                  </label>
                )}
              </div>

              {participants.length < minPlayers && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <X className="w-4 h-4 shrink-0" />
                  {mode === 'playoff'
                    ? 'Для сетки необходимо как минимум 2 участника.'
                    : 'Для проведения турнира необходимо как минимум 3 участника.'}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={participants.length < minPlayers}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Trophy className="w-5 h-5" />
                Создать турнир
              </button>
            </section>

            {/* Сохранённые турниры */}
            <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="w-full px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-purple-700 text-sm">Сохранённые турниры</h3>
                  <span className="text-xs font-bold text-purple-400">{saved.length}</span>
                </div>
                {showSaved ? (
                  <ChevronUp className="w-4 h-4 text-purple-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-purple-600" />
                )}
              </button>
              {showSaved && (
                <div className="px-4 pb-4 space-y-2">
                  {saved.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Пока нет сохранённых турниров
                    </p>
                  ) : (
                    saved.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 border border-purple-100 rounded-xl p-2.5"
                      >
                        <button onClick={() => handleLoad(t)} className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {t.mode === 'playoff' ? 'плей-офф' : 'круговой'} · {t.participants.length} уч. ·{' '}
                            {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(t.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                          aria-label="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* ===== ПЛЕЙ-ОФФ ===== */}
        {active && active.mode === 'playoff' && resolved && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-purple-700 truncate">{active.name}</h2>
                  <p className="text-xs text-gray-500">
                    плей-офф · участников: {active.participants.length}
                  </p>
                </div>
                {resolved.champion && (
                  <div className="shrink-0 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-700 truncate max-w-[140px]">
                      {resolved.champion}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Печать
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Сохранить
                </button>
                <button
                  onClick={handleReshuffle}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Перемешать
                </button>
                <button
                  onClick={handleNew}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Новый
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {resolved.rounds.map((round, r) => (
                    <div key={r} className="flex flex-col gap-2 w-52">
                      <h4 className="text-xs font-bold text-purple-700 text-center uppercase tracking-wide">
                        {roundName(r, resolved.rounds.length)}
                      </h4>
                      <div className="flex flex-col gap-2 flex-1 justify-around">
                        {round.map((m) => (
                          <div key={m.id}>{renderMatch(m)}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {active.thirdPlace && resolved.third && (
                    <div className="flex flex-col gap-2 w-52">
                      <h4 className="text-xs font-bold text-amber-600 text-center uppercase tracking-wide flex items-center justify-center gap-1">
                        <Medal className="w-3.5 h-3.5" /> За 3 место
                      </h4>
                      <div className="flex-1 flex items-center">{renderMatch(resolved.third)}</div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Нажмите на имя участника в матче, чтобы отметить победителя · поля справа — счёт
              </p>
            </section>
          </>
        )}

        {/* ===== КРУГОВОЙ ТУРНИР ===== */}
        {active && active.mode === 'round' && rrRounds && standings && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-purple-700 truncate">{active.name}</h2>
                  <p className="text-xs text-gray-500">
                    круговой · участников: {active.participants.length} · туров: {rrRounds.length}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-700 truncate max-w-[140px]">
                    {standings[0]?.played ? standings[0].name : 'лидер не ясен'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Печать
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Сохранить
                </button>
                <button
                  onClick={handleNew}
                  className="flex-1 min-w-[110px] py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Новый
                </button>
              </div>
            </section>

            {/* Таблица */}
            <section className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
              <h3 className="font-bold text-purple-700 text-sm mb-2 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4" /> Турнирная таблица
              </h3>
              <table className="w-full text-xs border-collapse min-w-[420px]">
                <thead>
                  <tr className="bg-purple-50 text-purple-800">
                    <th className="border border-purple-100 px-2 py-1.5">№</th>
                    <th className="border border-purple-100 px-2 py-1.5 text-left">Участник</th>
                    <th className="border border-purple-100 px-2 py-1.5">Игр</th>
                    <th className="border border-purple-100 px-2 py-1.5">В</th>
                    <th className="border border-purple-100 px-2 py-1.5">Н</th>
                    <th className="border border-purple-100 px-2 py-1.5">П</th>
                    <th className="border border-purple-100 px-2 py-1.5">Разн.</th>
                    <th className="border border-purple-100 px-2 py-1.5">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr key={row.name} className={i === 0 && row.played > 0 ? 'bg-amber-50' : ''}>
                      <td className="border border-gray-100 px-2 py-1.5 text-center font-bold">
                        {i === 0 && row.played > 0 ? '🥇' : i + 1}
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 font-semibold text-gray-800">
                        {row.name}
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center">{row.played}</td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center text-green-700">{row.w}</td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center text-gray-500">{row.d}</td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center text-red-600">{row.l}</td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center">
                        {row.diff > 0 ? '+' : ''}
                        {row.diff}
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center font-bold text-purple-700">
                        {row.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-400 mt-2">
                Победа — 2 очка, ничья — 1, поражение — 0 · сортировка по очкам и разнице
              </p>
            </section>

            {/* Туры */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-purple-700 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Матчи (внесите счёт)
              </h3>
              {rrRounds.map((pairs, r) => (
                <div key={r}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Тур {r + 1}
                  </p>
                  <div className="space-y-1.5">
                    {pairs.map((pair, i) => {
                      const key = `rr-${r}-${i}`;
                      const res = active.results[key] || { winner: null, scoreA: null, scoreB: null };
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2 border border-gray-100 rounded-xl px-2.5 py-2"
                        >
                          <span className="flex-1 min-w-0 text-xs font-semibold text-gray-800 truncate text-right">
                            {pair[0]}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={res.scoreA ?? ''}
                            placeholder="–"
                            onChange={(e) =>
                              setResult(key, {
                                scoreA: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-11 shrink-0 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <span className="text-xs text-gray-400">:</span>
                          <input
                            type="number"
                            min={0}
                            value={res.scoreB ?? ''}
                            placeholder="–"
                            onChange={(e) =>
                              setResult(key, {
                                scoreB: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-11 shrink-0 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <span className="flex-1 min-w-0 text-xs font-semibold text-gray-800 truncate">
                            {pair[1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* ===== FAQ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </div>
            {showFaq ? (
              <ChevronUp className="w-4 h-4 text-purple-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600" />
            )}
          </button>
          {showFaq && (
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== СЦЕНАРИИ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowScen(!showScen)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-purple-700 text-sm">Сценарии использования</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </div>
            {showScen ? (
              <ChevronUp className="w-4 h-4 text-purple-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600" />
            )}
          </button>
          {showScen && (
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
          )}
        </section>
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
      <AlertDialog
        isOpen={alertMsg !== null}
        message={alertMsg ?? ''}
        onClose={() => setAlertMsg(null)}
      />
    </div>
  );
}
