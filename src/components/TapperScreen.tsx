// src/components/TapperScreen.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Save,
  Trash2,
  Pencil,
  Check,
  X,
  RotateCcw,
  UserCheck,
  UserX,
  List,
  AlertTriangle,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { TapperList, TapperStudent } from '@/types/tapper';
import { generateTapperId, createEmptyTapperList } from '@/types/tapper';
import {
  loadTapperLists,
  upsertTapperList,
  deleteTapperList,
  renameTapperList,
  serializeTapperList,
  parseTapperListFile,
  loadTapperSession,
  saveTapperSession,
  clearTapperSession,
} from '@/lib/tapperStorage';
import { downloadTextFile, sanitizeFileName } from '@/lib/eduGameStorage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface TapperScreenProps {
  onBack: () => void;
}

// ===== Демо-список =====

const DEMO_STUDENTS = [
  'Иванов Иван',
  'Петрова Анна',
  'Смирнов Пётр',
  'Кузнецова Мария',
  'Васильев Дмитрий',
  'Соколова Елена',
  'Михайлов Артём',
  'Новикова Софья',
  'Фёдоров Кирилл',
  'Морозова Дарья',
  'Волков Максим',
  'Лебедева Виктория',
];

function createDemoList(): TapperList {
  const students: TapperStudent[] = DEMO_STUDENTS.map((name) => ({
    id: generateTapperId('student'),
    name,
    answerCount: 0,
    isPresent: true,
  }));
  
  return {
    id: generateTapperId('tapper-list'),
    name: 'Демо-класс (5А)',
    students,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ===== Инструкции и FAQ =====

const HOW_ITEMS = [
  {
    q: 'Как начать работу',
    a: '1) Создайте список класса или импортируйте готовый.\n2) Нажимайте на карточку ученика, когда он отвечает — счётчик увеличится.\n3) ПКМ (долгое нажатие) — сбросить счётчик конкретного ученика.\n4) Кнопка «Итоги» покажет сводку в конце урока.\n\nДля быстрого знакомства нажмите «Загрузить демо-список».',
  },
  {
    q: 'Как добавить учеников',
    a: 'В поле ввода добавьте имена — по одному на строку:\n\nИванов Иван\nПетрова Анна\nСмирнов Пётр\n\nНажмите «Добавить учеников». Дубликаты (без учёта регистра) автоматически отфильтруются.',
  },
  {
    q: 'Как отметить отсутствующих',
    a: 'Нажмите ПКМ (долгое нажатие на телефоне) на карточке ученика и выберите «Отметить отсутствующим». Ученик станет серым и не будет учитываться в статистике. Повторное действие вернёт его в список присутствующих.',
  },
  {
    q: 'Как работает счётчик',
    a: 'Каждое нажатие на карточку ученика добавляет +1 ответ. Счётчик отображается в правом верхнем углу карточки. Зелёная карточка — ученик отвечал хотя бы раз. Белая — ещё не отвечал.',
  },
  {
    q: 'Сохранение и восстановление',
    a: 'Результаты сохраняются автоматически. При возвращении в список и повторном открытии счётчики восстановятся. Кнопка сброса (↺) очищает все результаты.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Устный опрос',
    a: 'Используйте счётчик во время устного опроса. Нажимайте на ученика, когда он отвечает. В конце урока откройте «Итоги» и посмотрите, кого не спросили — их можно вызвать на следующем уроке.',
  },
  {
    q: 'Сценарий 2 · Дискуссия',
    a: 'Во время классной дискуссии фиксируйте каждое выступление. Счётчик покажет самых активных участников и тех, кто отмалчивается.',
  },
  {
    q: 'Сценарий 3 · Групповая работа',
    a: 'При работе в группах отмечайте вклад каждого ученика. Сводка покажет, кто был лидером, а кто пассивен.',
  },
  {
    q: 'Сценарий 4 · Накопление за неделю',
    a: 'Ведите один список в течение недели. Счётчики накопят статистику по всем урокам. Экспортируйте результат в .txt для отчёта.',
  },
  {
    q: 'Импорт списка: формат и порядок',
    a: 'Формат: .json (из этого приложения) или .txt (простой текст).\n\nДля .txt: каждая строка — один ученик:\nИванов Иван\nПетрова Анна\n\nНажмите «Импорт» и выберите файл. Список появится в «Моих списках».',
  },
  {
    q: 'Экспорт списка: как поделиться',
    a: 'Кнопка «Экспорт» (иконка ↓) на карточке списка скачивает файл .json. Его можно отправить коллеге — он импортирует через «Импорт». Для отчёта используйте «Экспорт .txt» на экране результатов.',
  },
];

export default function TapperScreen({ onBack }: TapperScreenProps) {
  const [lists, setLists] = useState<TapperList[]>([]);
  const [activeList, setActiveList] = useState<TapperList | null>(null);
  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadedLists = loadTapperLists();
    setLists(loadedLists);
    
    // ПРАВКА 1: защита от null при отсутствии сессии
    const sessionResults = loadTapperSession() || {};
    if (Object.keys(sessionResults).length > 0) {
      setResults(sessionResults);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(results).length > 0) {
      saveTapperSession(results);
    }
  }, [results]);

  const refreshLists = () => setLists(loadTapperLists());

  const handleCreateList = () => {
    const newList = createEmptyTapperList('Новый список');
    upsertTapperList(newList);
    refreshLists();
    setActiveList(newList);
    setResults({});
    clearTapperSession();
    triggerHaptic('light');
  };

  const handleLoadDemoList = () => {
    const demoList = createDemoList();
    upsertTapperList(demoList);
    refreshLists();
    setActiveList(demoList);
    setResults({});
    clearTapperSession();
    triggerHaptic('medium');
  };

  const handleImportList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Пробуем JSON, если не получилось — парсим как TXT
      const text = String(reader.result || '');
      let list: TapperList | null = parseTapperListFile(text);
      
      if (!list) {
        // Пробуем как TXT
        const names = text
          .split('\n')
          .map((n) => n.trim())
          .filter((n) => n);
        
        if (names.length > 0) {
          const students: TapperStudent[] = names.map((name) => ({
            id: generateTapperId('student'),
            name,
            answerCount: 0,
            isPresent: true,
          }));
          
          list = {
            id: generateTapperId('tapper-list'),
            name: file.name.replace(/\.[^.]+$/, '') || 'Импортированный список',
            students,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }
      
      if (list) {
        upsertTapperList(list);
        refreshLists();
        setActiveList(list);
        setResults({});
        clearTapperSession();
        setImportMsg('ok');
      } else {
        setImportMsg('error');
      }
      setTimeout(() => setImportMsg(null), 2500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportList = (list: TapperList) => {
    downloadTextFile(
      sanitizeFileName(`активность_${list.name}.json`),
      serializeTapperList(list),
      'application/json;charset=utf-8',
    );
    triggerHaptic('light');
  };

  const handleDeleteList = (id: string) => {
    const list = lists.find((l) => l.id === id);
    const proceed = window.confirm(`Удалить список «${list?.name}»?`);
    if (!proceed) return;
    deleteTapperList(id);
    refreshLists();
    if (
