import { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  Plus,
  Upload,
  Pencil,
  Monitor,
  Download,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  GraduationCap,
  List,
  Check,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { EduGame } from '@/types/eduGame';
import { createEmptyGame, gameQuestionsCount, generateEduId } from '@/types/eduGame';
import { presetEduGames } from '@/data/presetEduGames';
import {
  loadEduGames,
  upsertEduGame,
  deleteEduGame,
  serializeEduGame,
  parseEduGameFile,
  downloadTextFile,
  sanitizeFileName,
} from '@/lib/eduGameStorage';
import { exportEduGameToPDF } from '@/lib/eduGamePdf';
import BackButton from './BackButton';
import EduGameEditorScreen from './EduGameEditorScreen';
import EduGameProjectorScreen from './EduGameProjectorScreen';

interface EduGameScreenProps {
  onBack: () => void;
}

// ===== Вспомогательные компоненты =====

function IconButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white hover:bg-gray-100 ${color} rounded-lg py-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400`}
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function CollapseSection({
  open,
  onToggle,
  icon: Icon,
  title,
  count,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: LucideIcon;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-2 hover:bg-purple-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-purple-700">{title}</h2>
          <span className="text-xs font-bold text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-purple-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-purple-600" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-expanded={open === idx}
          >
            <span className="font-semibold text-sm text-gray-800">{item.q}</span>
            {open === idx ? (
              <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
            )}
          </button>
          {open === idx && (
            <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== Данные =====

const HOW_ITEMS = [
  {
    q: 'Как создать игру (режим разработчика)',
    a: 'Нажмите «Создать игру»: введите название, добавьте раунды (темы) и вопросы с баллами и ответами. Баллы повышайте внутри раунда: 10 → 50. Изменения сохраняются автоматически. Карандаш на карточке игры — редактирование.',
  },
  {
    q: 'Режим проектора',
    a: 'Кнопка с монитором открывает табло: колонки — раунды, клетки — баллы. Нажмите на баллы — вопрос крупно на экране; «Показать вопрос» → «Показать ответ» → «Закрыть клетку» (клетка гаснет). Кнопка справа вверху — во весь экран для проектора или доски.',
  },
  {
    q: 'Индивидуальный рейтинг участников',
    a: 'В проекторе нажмите иконку «Люди» и включите «Индивидуальный рейтинг». Добавьте имена списком или импортом .txt (одно имя на строку). В окне вопроса у каждого ученика кнопки «+» и «−» начисляют или снимают стоимость вопроса. Иконка кубка — таблица результатов и экспорт в .txt.',
  },
  {
    q: 'Печать карточек: двусторонняя',
    a: 'Кнопка PDF создаёт файл, где каждая карточка — пара страниц: лицевая — вопрос, оборот — баллы и ответ. В настройках печати выберите «двусторонняя печать, переворот по длинному краю». Вырежьте по пунктирной рамке — и играйте без компьютера: вопрос для игроков, оборот для ведущего.',
  },
  {
    q: 'Обмен играми между учителями',
    a: 'Кнопка «Поделиться» скачивает игру файлом .json. Коллега в своём «Помощнике учителя» нажимает «Импорт игры» и выбирает файл — игра появляется в его «Моих играх» со всеми раундами, вопросами и баллами.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Урок-викторина',
    a: 'Повторение темы: класс делится на команды или играет индивидуально. Открывайте вопросы по выбору учеников, обсуждайте и показывайте ответ. С рейтингом — соревнование до последнего вопроса.',
  },
  {
    q: 'Сценарий 2 · Предметная неделя и финалы',
    a: 'Отборочные игры в классах, финал — на сцене с проектором. Рейтинг участников ведётся в приложении, результаты экспортируются в .txt для грамот.',
  },
  {
    q: 'Сценарий 3 · Игра без компьютера',
    a: 'Распечатайте карточки двусторонней печатью и разрежьте. Раздайте вопросы игрокам, ведущий читает по оборотам. Подходит для поезда, дачи и класса без техники.',
  },
  {
    q: 'Сколько раундов и вопросов делать?',
    a: 'Оптимально 3–5 раундов по 4–6 вопросов. На урок 40 минут хватает 3 раундов по 5 вопросов. Баллы: 10–50, в финальном раунде можно удвоить.',
  },
  {
    q: 'Где хранятся игры и результаты?',
    a: 'Игры, участники и счёт — только на вашем устройстве. Для переноса на другое устройство используйте экспорт .json (игры) и .txt (результаты).',
  },
  {
    q: '⚠️ Персональные данные',
    a: 'Имена участников — персональные данные (152-ФЗ). Храните списки на своём устройстве, не публикуйте результаты с именами в открытом доступе; для публикаций обезличивайте («команда 1»). Удаляйте ненужные списки.',
  },
];

// ===== Главный компонент =====

export default function EduGameScreen({ onBack }: EduGameScreenProps) {
  const [games, setGames] = useState<EduGame[]>([]);
  const [editingGame, setEditingGame] = useState<EduGame | null>(null);
  const [projectorGame, setProjectorGame] = useState<EduGame | null>(null);
  const [isNewGame, setIsNewGame] = useState(false);

  const [showMyGames, setShowMyGames] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGames(loadEduGames());
  }, []);

  const refresh = () => setGames(loadEduGames());

  const handleCreate = () => {
    const game = createEmptyGame('Новая игра');
    upsertEduGame(game);
    refresh();
    setEditingGame(game);
    setIsNewGame(true);
  };

  const handleCopyPreset = (preset: EduGame) => {
    const existingCopy = games.find(
      (g) => g.title === preset.title && g.rounds.length === preset.rounds.length
    );
    if (existingCopy) {
      const proceed = window.confirm(
        `Игра «${preset.title}» уже есть в «Моих играх». Создать ещё одну копию?`
      );
      if (!proceed) return;
    }

    const copy: EduGame = {
      ...preset,
      id: generateEduId('edugame'),
      rounds: preset.rounds.map((r) => ({
        ...r,
        id: generateEduId('round'),
        questions: r.questions.map((q) => ({ ...q, id: generateEduId('q') })),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertEduGame(copy);
    refresh();
    setEditingGame(copy);
    setIsNewGame(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const game = parseEduGameFile(String(reader.result || ''));
      if (game) {
        upsertEduGame(game);
        refresh();
        setImportMsg('ok');
      } else {
        setImportMsg('error');
      }
      setTimeout(() => setImportMsg(null), 2500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportGame = (game: EduGame) => {
    downloadTextFile(
      sanitizeFileName(`игра_${game.title}.json`),
      serializeEduGame(game),
      'application/json;charset=utf-8',
    );
  };

  const handleDelete = (game: EduGame) => {
    const proceed = window.confirm(
      `Удалить игру «${game.title}»? Это действие нельзя отменить.`
    );
    if (proceed) {
      deleteEduGame(game.id);
      refresh();
    }
  };

  const handleEditorBack = () => {
    if (editingGame && isNewGame) {
      const empty = gameQuestionsCount(editingGame) === 0;
      const renamed = editingGame.title.trim() !== 'Новая игра';
      if (empty && !renamed) {
        deleteEduGame(editingGame.id);
      }
    }
    setEditingGame(null);
    setIsNewGame(false);
    refresh();
  };

  const openEditor = (game: EduGame) => {
    setEditingGame(game);
    setIsNewGame(false);
  };

  // ===== РЕЖИМ РАЗРАБОТЧИКА =====
  if (editingGame) {
    return (
      <EduGameEditorScreen
        game={editingGame}
        onBack={handleEditorBack}
        onSave={(g) => upsertEduGame(g)}
      />
    );
  }

  // ===== РЕЖИМ ПРОЕКТОРА =====
  if (projectorGame) {
    return (
      <EduGameProjectorScreen
        game={projectorGame}
        onBack={() => setProjectorGame(null)}
      />
    );
  }

  // ===== ГЛАВНЫЙ ЭКРАН РАЗДЕЛА =====
  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Своя игра</h1>
            <p className="text-xs text-purple-200 leading-tight">Интеллектуальная викторина</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-10">
        {/* Создание и импорт */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <Plus className="w-5 h-5" /> Создать игру
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <Upload className="w-5 h-5" /> Импорт игры
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          {importMsg === 'ok' && (
            <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5" role="alert">
              <Check className="w-4 h-4" /> Игра импортирована — смотрите в «Мои игры»
            </p>
          )}
          {importMsg === 'error' && (
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5" role="alert">
              <AlertTriangle className="w-4 h-4" /> Не удалось прочитать файл игры
            </p>
          )}
          <p className="text-xs text-gray-500">
            Импорт принимает файлы .json из «Помощника учителя» — так учителя делятся готовыми играми.
          </p>
        </div>

        {/* 1) МОИ ИГРЫ */}
        <CollapseSection
          open={showMyGames}
          onToggle={() => setShowMyGames(!showMyGames)}
          icon={List}
          title="Мои игры"
          count={games.length}
        >
          {games.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">
                Пока нет игр — создайте первую или импортируйте файл
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <Plus className="w-4 h-4" /> Создать первую игру
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...games]
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .map((g) => (
                  <div
                    key={g.id}
                    className="border-2 border-purple-100 rounded-xl p-3 space-y-2 bg-gray-50"
                  >
                    <button
                      onClick={() => openEditor(g)}
                      className="w-full text-left min-w-0 group focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg"
                    >
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate group-hover:text-purple-700 transition-colors">
                        {g.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        раундов: {g.rounds.length} · вопросов: {gameQuestionsCount(g)} ·{' '}
                        {new Date(g.updatedAt).toLocaleDateString('ru-RU')}
                      </p>
                    </button>
                    <div className="grid grid-cols-5 gap-1">
                      <IconButton
                        icon={Pencil}
                        label="Редактировать"
                        color="text-purple-600"
                        onClick={() => openEditor(g)}
                      />
                      <IconButton
                        icon={Monitor}
                        label="Режим проектора"
                        color="text-gray-700"
                        onClick={() => setProjectorGame(g)}
                      />
                      <IconButton
                        icon={Download}
                        label="Скачать PDF для печати"
                        color="text-green-600"
                        onClick={() => exportEduGameToPDF(g)}
                      />
                      <IconButton
                        icon={Share2}
                        label="Поделиться игрой"
                        color="text-blue-600"
                        onClick={() => handleExportGame(g)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Удалить игру"
                        color="text-red-500"
                        onClick={() => handleDelete(g)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CollapseSection>

        {/* 2) ГОТОВЫЕ ИГРЫ */}
        <CollapseSection
          open={showPresets}
          onToggle={() => setShowPresets(!showPresets)}
          icon={Sparkles}
          title="Готовые игры"
          count={presetEduGames.length}
        >
          <div className="space-y-2">
            {presetEduGames.map((g) => (
              <div
                key={g.id}
                className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2 bg-gray-50"
              >
                <button
                  onClick={() => setProjectorGame(g)}
                  className="flex-1 min-w-0 text-left flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg"
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-white border border-purple-200 flex items-center justify-center group-hover:border-purple-400 transition-colors">
                    <Trophy className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate group-hover:text-purple-700 transition-colors">
                      {g.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      раундов: {g.rounds.length} · вопросов: {gameQuestionsCount(g)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleCopyPreset(g)}
                  className="p-2 text-gray-300 hover:text-purple-600 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg"
                  aria-label={`Скопировать «${g.title}» в Мои игры`}
                  title="Скопировать в Мои игры и редактировать"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Нажми на набор — сразу откроется проектор для игры. Карандаш — скопировать в «Мои игры» и отредактировать под свой класс.
            </p>
          </div>
        </CollapseSection>

        {/* Инструкции */}
        <CollapseSection
          open={showHow}
          onToggle={() => setShowHow(!showHow)}
          icon={GraduationCap}
          title="Инструкции"
          count={HOW_ITEMS.length}
        >
          <FaqList items={HOW_ITEMS} />
        </CollapseSection>

        {/* Вопросы и сценарии */}
        <CollapseSection
          open={showFaq}
          onToggle={() => setShowFaq(!showFaq)}
          icon={HelpCircle}
          title="Вопросы и сценарии"
          count={FAQ_ITEMS.length}
        >
          <FaqList items={FAQ_ITEMS} />
        </CollapseSection>
      </main>
    </div>
  );
}
