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

export default function EduGameScreen({ onBack }: EduGameScreenProps) {
  const [games, setGames] = useState<EduGame[]>([]);
  const [editingGame, setEditingGame] = useState<EduGame | null>(null);
  const [projectorGame, setProjectorGame] = useState<EduGame | null>(null);

  const [showMyGames, setShowMyGames] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGames(loadEduGames());
  }, []);

  const refresh = () => setGames(loadEduGames());

  const handleCopyPreset = (preset: EduGame) => {
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
  };

  const handleCreate = () => {
    const game = createEmptyGame('');
    upsertEduGame(game);
    refresh();
    setEditingGame(game);
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

  const handleDelete = (id: string) => {
    deleteEduGame(id);
    refresh();
  };

  const howItems = [
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

  const faqItems = [
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

  // ===== РЕЖИМ РАЗРАБОТЧИКА =====
  if (editingGame) {
    return (
      <EduGameEditorScreen
        game={editingGame}
        onBack={() => {
          setEditingGame(null);
          refresh();
        }}
        onSave={(g) => upsertEduGame(g)}
      />
    );
  }

  // ===== РЕЖИМ ПРОЕКТОРА =====
  if (projectorGame) {
    return <EduGameProjectorScreen game={projectorGame} onBack={() => setProjectorGame(null)} />;
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" /> Создать игру
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
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
            <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Игра импортирована — смотрите в «Мои игры»
            </p>
          )}
          {importMsg === 'error' && (
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Не удалось прочитать файл игры
            </p>
          )}
          <p className="text-xs text-gray-500">
            Импорт принимает файлы .json из «Помощника учителя» — так учителя делятся готовыми играми.
          </p>
        </div>

        {/* Готовые игры */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-purple-700">Готовые игры</h2>
              <span className="text-xs font-bold text-purple-400">{presetEduGames.length}</span>
            </div>
            {showPresets ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showPresets && (
            <div className="px-5 pb-5 space-y-2">
              {presetEduGames.map((g) => (
                <div
                  key={g.id}
                  className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2 bg-gray-50"
                >
                  <button
                    onClick={() => setProjectorGame(g)}
                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                  >
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-white border border-purple-200 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate">
                        {g.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        раундов: {g.rounds.length} · вопросов: {gameQuestionsCount(g)}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleCopyPreset(g)}
                    className="p-2 text-gray-300 hover:text-purple-600 transition-colors shrink-0"
                    aria-label="Скопировать в Мои игры и редактировать"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Нажми на набор — сразу откроется проектор для игры. Карандаш — скопировать в «Мои игры» и отредактировать под свой класс.
              </p>
            </div>
          )}
        </div>

        {/* Мои игры */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowMyGames(!showMyGames)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-purple-700">Мои игры</h2>
              <span className="text-xs font-bold text-purple-400">{games.length}</span>
            </div>
            {showMyGames ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showMyGames && (
            <div className="px-5 pb-5">
              {games.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Пока нет игр — создайте первую или импортируйте файл
                </p>
              ) : (
                <div className="space-y-2">
                  {games.map((g) => (
                    <div key={g.id} className="border-2 border-purple-100 rounded-xl p-3 space-y-2 bg-gray-50">
                      <button onClick={() => setEditingGame(g)} className="w-full text-left min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate">
                          {g.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          раундов: {g.rounds.length} · вопросов: {gameQuestionsCount(g)} ·{' '}
                          {new Date(g.updatedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </button>
                      <div className="grid grid-cols-5 gap-1">
                        <button
                          onClick={() => setEditingGame(g)}
                          className="bg-white hover:bg-gray-100 text-purple-600 rounded-lg py-2 flex items-center justify-center transition-colors"
                          aria-label="Редактировать"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setProjectorGame(g)}
                          className="bg-white hover:bg-gray-100 text-gray-700 rounded-lg py-2 flex items-center justify-center transition-colors"
                          aria-label="Режим проектора"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportEduGameToPDF(g)}
                          className="bg-white hover:bg-gray-100 text-green-600 rounded-lg py-2 flex items-center justify-center transition-colors"
                          aria-label="Скачать PDF для печати"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportGame(g)}
                          className="bg-white hover:bg-gray-100 text-blue-600 rounded-lg py-2 flex items-center justify-center transition-colors"
                          aria-label="Поделиться игрой"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="bg-white hover:bg-gray-100 text-red-500 rounded-lg py-2 flex items-center justify-center transition-colors"
                          aria-label="Удалить игру"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Инструкции */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Инструкции</h3>
              <span className="text-xs font-bold text-purple-400">{howItems.length}</span>
            </div>
            {showHow ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showHow && (
            <div className="px-5 pb-5 space-y-2">
              {howItems.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenHow(openHow === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openHow === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openHow === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Вопросы и сценарии */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Вопросы и сценарии</h3>
              <span className="text-xs font-bold text-purple-400">{faqItems.length}</span>
            </div>
            {showFaq ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showFaq && (
            <div className="px-5 pb-5 space-y-2">
              {faqItems.map((item, idx) => (
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
        </div>
      </main>
    </div>
  );
}
