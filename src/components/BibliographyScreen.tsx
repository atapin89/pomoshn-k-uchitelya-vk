import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Newspaper,
  Globe,
  Scale,
  GraduationCap,
  Languages,
  Layers,
  Users,
  ClipboardList,
  Trash2,
  Copy,
  Download,
  Plus,
  X,
  HelpCircle,
  SortAsc,
  Check,
  Pencil,
  FileDown,
  Save,
  Library,
  BookMarked,
  File,
  Book,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

// ===== ТИПЫ =====

type SourceType =
  | 'book'
  | 'journal'
  | 'collection'
  | 'dissertation'
  | 'abstract'
  | 'electronic'
  | 'legal'
  | 'methodological'
  | 'textbook'
  | 'conference'
  | 'translation'
  | 'multivolume';

type GostStandard = 'gost-2018' | 'gost-2008' | 'gost-2003';

interface SourceFields {
  authors: string;
  title: string;
  subtitle: string;
  edition: string;
  city: string;
  publisher: string;
  year: string;
  pages: string;
  isbn: string;
  journal: string;
  volume: string;
  issue: string;
  pageFrom: string;
  pageTo: string;
  collectionTitle: string;
  conferenceName: string;
  conferenceCity: string;
  conferenceDate: string;
  degree: string;
  science: string;
  specialty: string;
  defensePlace: string;
  url: string;
  accessDate: string;
  legalType: string;
  number: string;
  adoptDate: string;
  adoptBody: string;
  lastRevision: string;
  sourcePublication: string;
  organization: string;
  approval: string;
  originalLanguage: string;
  translator: string;
  volumeNumber: string;
  totalVolumes: string;
}

interface SavedSource {
  id: string;
  type: SourceType;
  fields: SourceFields;
  formatted: string;
  standard: GostStandard;
  createdAt: number;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

// ===== КОНСТАНТЫ =====

const STORAGE_KEY = 'bibliography-sources';

const SOURCE_TYPES: { id: SourceType; label: string; icon: React.ReactNode; short: string }[] = [
  { id: 'book', label: 'Книга', icon: <Book className="w-4 h-4" />, short: 'Книга' },
  { id: 'journal', label: 'Статья из журнала', icon: <Newspaper className="w-4 h-4" />, short: 'Журнал' },
  { id: 'collection', label: 'Статья из сборника', icon: <Layers className="w-4 h-4" />, short: 'Сборник' },
  { id: 'dissertation', label: 'Диссертация', icon: <GraduationCap className="w-4 h-4" />, short: 'Дис.' },
  { id: 'abstract', label: 'Автореферат', icon: <FileText className="w-4 h-4" />, short: 'Автореф.' },
  { id: 'electronic', label: 'Интернет-ресурс', icon: <Globe className="w-4 h-4" />, short: 'Сайт' },
  { id: 'legal', label: 'Нормативный акт', icon: <Scale className="w-4 h-4" />, short: 'НПА' },
  { id: 'methodological', label: 'Методичка', icon: <ClipboardList className="w-4 h-4" />, short: 'Мет.' },
  { id: 'textbook', label: 'Учебник с грифом', icon: <BookMarked className="w-4 h-4" />, short: 'Учеб.' },
  { id: 'conference', label: 'Труды конференции', icon: <Users className="w-4 h-4" />, short: 'Конф.' },
  { id: 'translation', label: 'Переводное издание', icon: <Languages className="w-4 h-4" />, short: 'Перев.' },
  { id: 'multivolume', label: 'Многотомник', icon: <Library className="w-4 h-4" />, short: 'Том' },
];

const GOST_LABELS: Record<GostStandard, { label: string; desc: string }> = {
  'gost-2018': { label: 'ГОСТ Р 7.0.100–2018', desc: 'Основной для списка литературы (действующий)' },
  'gost-2008': { label: 'ГОСТ Р 7.0.5–2008', desc: 'Для внутритекстовых и подстрочных ссылок' },
  'gost-2003': { label: 'ГОСТ 7.1–2003', desc: 'Устаревший (встречается в вузах)' },
};

const CITY_ABBR: Record<string, string> = {
  'москва': 'М.',
  'санкт-петербург': 'СПб.',
  'санкт-петербург ': 'СПб.',
  'спб': 'СПб.',
  'ленинград': 'Л.',
  'нижний новгород': 'Н. Новгород',
  'екатеринбург': 'Екатеринбург',
  'новосибирск': 'Новосибирск',
  'казань': 'Казань',
  'ростов-на-дону': 'Ростов н/Д',
  'ростов-на-дону ': 'Ростов н/Д',
};

// ===== СПРАВКИ К ПОЛЯМ =====

const FIELD_HELPS: Record<string, string> = {
  authors: 'ГОСТ Р 7.0.100–2018, п. 5.2.3. Формат: «Фамилия И. О.». Несколько — через запятую. До 4 авторов указываются перед заглавием, более 4 — добавляется «[и др.]».',
  title: 'ГОСТ Р 7.0.100–2018, п. 5.2.2. Заглавие приводится в том виде, как в источнике. Сохраняйте регистр и пунктуацию.',
  subtitle: 'ГОСТ Р 7.0.100–2018, п. 5.2.4. Сведения о заглавии: «учебник», «учебное пособие», «сборник статей», «материалы конференции».',
  edition: 'ГОСТ Р 7.0.100–2018, п. 5.4. Например: «2-е изд., перераб. и доп.». Пропустите, если издание первое.',
  city: 'ГОСТ Р 7.0.100–2018, п. 5.5.3. Город издания. Автоматически сокращается: Москва → М., Санкт-Петербург → СПб.',
  publisher: 'ГОСТ Р 7.0.100–2018, п. 5.5.4. Наименование издательства. Можно сокращать: «Просвещение», «Наука».',
  year: 'ГОСТ Р 7.0.100–2018, п. 5.5.5. Год издания (4 цифры).',
  pages: 'ГОСТ Р 7.0.100–2018, п. 5.6.3. Для книг — общее количество: «256 с.» (с. = страницы). Для статей — диапазон: «15–23».',
  isbn: 'ГОСТ Р 7.0.100–2018, п. 5.7. Международный стандартный номер книги. Необязательно.',
  journal: 'ГОСТ Р 7.0.100–2018, п. 5.8.2. Полное название журнала или общепринятое сокращение.',
  volume: 'ГОСТ Р 7.0.100–2018, п. 5.8.4. Том (если журнал многотомный). Например: «5».',
  issue: 'ГОСТ Р 7.0.100–2018, п. 5.8.4. Номер или выпуск журнала.',
  pageFrom: 'ГОСТ Р 7.0.100–2018, п. 5.8.5. Начало статьи. Указываются границы: «С. 15–23».',
  pageTo: 'ГОСТ Р 7.0.100–2018, п. 5.8.5. Конец статьи.',
  collectionTitle: 'ГОСТ Р 7.0.100–2018, п. 5.9. Название сборника, в котором опубликована статья.',
  conferenceName: 'ГОСТ Р 7.0.100–2018, п. 5.9.2. Полное название конференции с указанием статуса (международная, всероссийская).',
  conferenceCity: 'ГОСТ Р 7.0.100–2018, п. 5.9.2. Город проведения конференции.',
  conferenceDate: 'ГОСТ Р 7.0.100–2018, п. 5.9.2. Дата проведения: «15–17 мая 2024 г.».',
  degree: 'ГОСТ Р 7.0.100–2018, п. 5.10. Степень: «кандидат» или «доктор».',
  science: 'ГОСТ Р 7.0.100–2018, п. 5.10. Отрасль наук: «педагогических», «филологических», «физико-математических».',
  specialty: 'ГОСТ Р 7.0.100–2018, п. 5.10. Шифр специальности ВАК: «13.00.01 — Общая педагогика».',
  defensePlace: 'ГОСТ Р 7.0.100–2018, п. 5.10. Место защиты: «МГУ им. М. В. Ломоносова».',
  url: 'ГОСТ Р 7.0.100–2018, п. 5.12. Полный URL ресурса. Обязательно с «https://».',
  accessDate: 'ГОСТ Р 7.0.100–2018, п. 5.12. Дата обращения: фиксирует версию ресурса. Формат: «15.01.2024».',
  legalType: 'ГОСТ Р 7.0.100–2018, п. 5.13. Тип акта: «Федеральный закон», «Указ Президента», «Приказ Минобрнауки».',
  number: 'ГОСТ Р 7.0.100–2018, п. 5.13. Номер документа: «№ 273-ФЗ».',
  adoptDate: 'ГОСТ Р 7.0.100–2018, п. 5.13. Дата принятия: «29.12.2012».',
  adoptBody: 'ГОСТ Р 7.0.100–2018, п. 5.13. Орган, принявший документ: «Гос. Дума», «Президент РФ».',
  lastRevision: 'ГОСТ Р 7.0.100–2018, п. 5.13. Сведения о редакции: «ред. от 01.01.2024» или «с изм. и доп.».',
  sourcePublication: 'ГОСТ Р 7.0.100–2018, п. 5.13. Источник опубликования: «Собрание законодательства РФ», «Российская газета».',
  organization: 'ГОСТ Р 7.0.100–2018, п. 5.2.5. Организация-составитель: «ФИРО», «Минобрнауки России».',
  approval: 'ГОСТ Р 7.0.100–2018, п. 5.2.4. Гриф: «Рекомендовано УМО», «Допущено Минобрнауки».',
  originalLanguage: 'ГОСТ Р 7.0.100–2018, п. 5.2.6. Язык оригинала: «англ.», «нем.», «фр.».',
  translator: 'ГОСТ Р 7.0.100–2018, п. 5.2.6. Фамилия и инициалы переводчика: «пер. с англ. И. И. Иванова».',
  volumeNumber: 'ГОСТ Р 7.0.100–2018, п. 5.11. Номер тома: «Т. 1».',
  totalVolumes: 'ГОСТ Р 7.0.100–2018, п. 5.11. Общее количество томов: «в 3 т.».',
};

// ===== УТИЛИТЫ ФОРМАТИРОВАНИЯ =====

function abbrCity(city: string): string {
  if (!city.trim()) return '';
  const key = city.trim().toLowerCase();
  return CITY_ABBR[key] || city.trim();
}

function parseAuthors(authors: string): { full: string; inverted: string; count: number } {
  const list = authors.split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return { full: '', inverted: '', count: 0 };

  const invert = (a: string) => {
    const parts = a.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const fam = parts[0];
    const rest = parts.slice(1).join(' ');
    return `${rest} ${fam}`;
  };

  if (list.length === 1) {
    const [fam, ...rest] = list[0].split(/\s+/);
    const initials = rest.join(' ');
    return {
      full: `${fam}, ${initials}`,
      inverted: `${initials} ${fam}`,
      count: 1,
    };
  }

  if (list.length <= 4) {
    const [fam, ...rest] = list[0].split(/\s+/);
    const initials = rest.join(' ');
    const head = `${fam}, ${initials}`;
    const after = list.map(invert).join(', ');
    return { full: head, inverted: after, count: list.length };
  }

  const [fam, ...rest] = list[0].split(/\s+/);
  const initials = rest.join(' ');
  return {
    full: `${fam}, ${initials}`,
    inverted: `${initials} ${fam} [и др.]`,
    count: list.length,
  };
}

function formatSource(fields: SourceFields, type: SourceType, standard: GostStandard): string {
  const useLong = standard === 'gost-2018';
  const sep = useLong ? ' — ' : ' / ';

  const authorsInfo = parseAuthors(fields.authors);
  const city = abbrCity(fields.city);
  const pagesSuffix = fields.pages ? (fields.pages.includes('–') || fields.pages.includes('-') ? `С. ${fields.pages}` : `${fields.pages} с.`) : '';

  switch (type) {
    case 'book': {
      if (!fields.title) return '';
      const authorBlock = authorsInfo.count >= 1 && authorsInfo.count <= 4
        ? `${authorsInfo.full} ${fields.title}`
        : fields.title;
      const titleBlock = fields.subtitle ? `${fields.title} : ${fields.subtitle}` : fields.title;
      const responsibility = authorsInfo.inverted ? ` / ${authorsInfo.inverted}` : '';
      const editionBlock = fields.edition ? `${sep}${fields.edition}` : '';
      const pubBlock = city || fields.publisher
        ? `${sep}${city || '[б. м.]'} : ${fields.publisher || '[б. и.]'}, ${fields.year || '[б. г.]'}`
        : '';
      const pagesBlock = pagesSuffix ? `${sep}${pagesSuffix}` : '';
      const isbn = fields.isbn ? `${sep}ISBN ${fields.isbn}` : '';
      return `${authorBlock}${titleBlock !== fields.title ? '' : ''}${responsibility}${editionBlock}${pubBlock}${pagesBlock}${isbn}.`;
    }

    case 'journal': {
      if (!fields.title || !fields.journal) return '';
      const head = authorsInfo.full || fields.title;
      const responsibility = authorsInfo.inverted ? ` / ${authorsInfo.inverted}` : '';
      const journalBlock = ` // ${fields.journal}`;
      const yearBlock = fields.year ? `. — ${fields.year}` : '';
      const volIssue = [
        fields.volume ? `Т. ${fields.volume}` : '',
        fields.issue ? `№ ${fields.issue}` : '',
      ].filter(Boolean).join(', ');
      const volIssueBlock = volIssue ? `${yearBlock}${yearBlock ? ', ' : '. — '}${volIssue}` : yearBlock;
      const pagesBlock = fields.pageFrom && fields.pageTo
        ? `${volIssueBlock}. — С. ${fields.pageFrom}–${fields.pageTo}`
        : volIssueBlock;
      return `${head} ${fields.title}${responsibility}${journalBlock}${pagesBlock}.`;
    }

    case 'collection': {
      if (!fields.title || !fields.collectionTitle) return '';
      const head = authorsInfo.full || fields.title;
      const responsibility = authorsInfo.inverted ? ` / ${authorsInfo.inverted}` : '';
      const inBlock = ` // ${fields.collectionTitle}`;
      const pubBlock = city ? `${sep}${city}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = fields.pageFrom && fields.pageTo ? `${pubBlock}${pubBlock ? '. ' : ''}С. ${fields.pageFrom}–${fields.pageTo}` : pubBlock;
      return `${head} ${fields.title}${responsibility}${inBlock}${pagesBlock}.`;
    }

    case 'dissertation':
    case 'abstract': {
      if (!fields.title || !authorsInfo.full) return '';
      const label = type === 'dissertation' ? 'дис.' : 'автореф. дис.';
      const degree = fields.degree ? ` ${fields.degree}` : '';
      const science = fields.science ? ` ${fields.science} наук` : '';
      const specialty = fields.specialty ? ` : специальность ${fields.specialty}` : '';
      const place = fields.defensePlace ? ` ; ${fields.defensePlace}` : '';
      const pub = city ? `${sep}${city}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${pub}. ${pagesSuffix}` : pub;
      return `${authorsInfo.full} ${fields.title} : ${label}${degree}${science}${specialty} / ${authorsInfo.inverted}${place}${pagesBlock}.`;
    }

    case 'electronic': {
      if (!fields.title) return '';
      const head = authorsInfo.count === 1 ? `${authorsInfo.full} ` : '';
      const resp = authorsInfo.count === 1 ? ` / ${authorsInfo.inverted}` : '';
      const typeBlock = useLong ? ' [Электронный ресурс]' : '';
      const urlBlock = fields.url ? `${sep}URL: ${fields.url}` : '';
      const access = fields.accessDate ? ` (дата обращения: ${fields.accessDate})` : '';
      return `${head}${fields.title}${typeBlock}${resp}${urlBlock}${access}.`;
    }

    case 'legal': {
      if (!fields.title) return '';
      const typeBlock = fields.legalType ? ` : ${fields.legalType}` : '';
      const numBlock = fields.number ? ` № ${fields.number.replace(/^№\s*/, '')}` : '';
      const adopt = fields.adoptDate
        ? ` : [принят ${fields.adoptBody || ''} ${fields.adoptDate}]`
        : '';
      const revision = fields.lastRevision ? ` (ред. от ${fields.lastRevision})` : '';
      const source = fields.sourcePublication ? ` // ${fields.sourcePublication}.` : '';
      const urlBlock = fields.url ? `${sep}URL: ${fields.url}` : '';
      const access = fields.accessDate ? ` (дата обращения: ${fields.accessDate})` : '';
      return `${fields.title}${typeBlock}${numBlock}${adopt}${revision}${source}${urlBlock}${access}`;
    }

    case 'methodological': {
      if (!fields.title) return '';
      const org = fields.organization ? ` / ${fields.organization}` : '';
      const pubBlock = city ? `${sep}${city}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${pubBlock}. ${pagesSuffix}` : pubBlock;
      return `${fields.title} : методические рекомендации${org}${pagesBlock}.`;
    }

    case 'textbook': {
      if (!fields.title) return '';
      const sub = fields.subtitle
        ? `${fields.title} : ${fields.subtitle}`
        : `${fields.title} : учебник`;
      const resp = authorsInfo.inverted ? ` / ${authorsInfo.inverted}` : '';
      const approval = fields.approval ? `${sep}${fields.approval}` : '';
      const pubBlock = city ? `${sep}${city} : ${fields.publisher || '[б. и.]'}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${sep}${pagesSuffix}` : '';
      return `${authorsInfo.full} ${sub}${resp}${approval}${pubBlock}${pagesBlock}.`;
    }

    case 'conference': {
      if (!fields.collectionTitle) return '';
      const conf = fields.conferenceName
        ? ` : ${fields.conferenceName}${fields.conferenceCity ? `, ${fields.conferenceCity}` : ''}${fields.conferenceDate ? `, ${fields.conferenceDate}` : ''}`
        : '';
      const pub = city ? `${sep}${city}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${pub}. ${pagesSuffix}` : pub;
      return `${fields.collectionTitle}${conf} : материалы конференции${pagesBlock}.`;
    }

    case 'translation': {
      if (!fields.title) return '';
      const translator = fields.originalLanguage || fields.translator
        ? ` / пер. с ${fields.originalLanguage || ''}${fields.translator ? ` ${fields.translator}` : ''}`
        : '';
      const pubBlock = city ? `${sep}${city} : ${fields.publisher || '[б. и.]'}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${sep}${pagesSuffix}` : '';
      return `${authorsInfo.full} ${fields.title}${translator}${pubBlock}${pagesBlock}.`;
    }

    case 'multivolume': {
      if (!fields.title) return '';
      const volBlock = fields.volumeNumber ? `${fields.title}. Т. ${fields.volumeNumber}` : fields.title;
      const totalBlock = fields.totalVolumes ? `${sep}${fields.totalVolumes} т.` : '';
      const pubBlock = city ? `${sep}${city} : ${fields.publisher || '[б. и.]'}, ${fields.year || '[б. г.]'}` : '';
      const pagesBlock = pagesSuffix ? `${sep}${pagesSuffix}` : '';
      return `${authorsInfo.count > 0 ? `${authorsInfo.full} ` : ''}${volBlock}${totalBlock}${pubBlock}${pagesBlock}.`;
    }

    default:
      return '';
  }
}

// ===== УТИЛИТЫ ХРАНЕНИЯ =====

function loadSources(): SavedSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

function saveSources(list: SavedSource[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function emptyFields(): SourceFields {
  return {
    authors: '', title: '', subtitle: '', edition: '', city: '', publisher: '',
    year: '', pages: '', isbn: '', journal: '', volume: '', issue: '',
    pageFrom: '', pageTo: '', collectionTitle: '', conferenceName: '',
    conferenceCity: '', conferenceDate: '', degree: '', science: '',
    specialty: '', defensePlace: '', url: '', accessDate: '', legalType: '',
    number: '', adoptDate: '', adoptBody: '', lastRevision: '',
    sourcePublication: '', organization: '', approval: '', originalLanguage: '',
    translator: '', volumeNumber: '', totalVolumes: '',
  };
}

function sortByAuthors(a: SavedSource, b: SavedSource): number {
  const aKey = (a.formatted || a.fields.title || '').toLowerCase();
  const bKey = (b.formatted || b.fields.title || '').toLowerCase();
  return aKey.localeCompare(bKey, 'ru');
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ===== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ =====

function Field({
  label, fieldKey, value, onChange, placeholder, required,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const help = FIELD_HELPS[fieldKey];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {help && (
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            onBlur={() => setTimeout(() => setShowHelp(false), 150)}
            className="text-purple-500 hover:text-purple-700 transition-colors focus:outline-none"
            aria-label={`Справка: ${label}`}
            title={`Справка: ${label}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {showHelp && help && (
        <div className="text-[11px] bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-800 leading-relaxed animate-[fadeIn_0.15s_ease-out]">
          📖 {help}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
      />
    </div>
  );
}

// ===== ОСНОВНОЙ КОМПОНЕНТ =====

export default function BibliographyScreen({ onBack }: { onBack: () => void }) {
  const [sources, setSources] = useState<SavedSource[]>(() => loadSources());
  const [currentType, setCurrentType] = useState<SourceType>('book');
  const [standard, setStandard] = useState<GostStandard>('gost-2018');
  const [fields, setFields] = useState<SourceFields>(emptyFields());
  const [showTypePanel, setShowTypePanel] = useState(false);
  const [showStandardPanel, setShowStandardPanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortAlpha, setSortAlpha] = useState(true);
  const [showFaq, setShowFaq] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    saveSources(sources);
  }, [sources]);

  const setField = (key: keyof SourceFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const livePreview = useMemo(
    () => formatSource(fields, currentType, standard),
    [fields, currentType, standard],
  );

  const sortedSources = useMemo(() => {
    const copy = [...sources];
    if (sortAlpha) copy.sort(sortByAuthors);
    else copy.sort((a, b) => b.createdAt - a.createdAt);
    return copy;
  }, [sources, sortAlpha]);

  const handleSave = () => {
    if (!livePreview) {
      setAlertMsg('Заполните обязательные поля (авторы и заглавие), чтобы сформировать запись.');
      return;
    }

    const now = Date.now();
    if (editingId) {
      setSources((prev) => prev.map((s) =>
        s.id === editingId
          ? { ...s, type: currentType, fields, formatted: livePreview, standard }
          : s,
      ));
      setEditingId(null);
    } else {
      const newItem: SavedSource = {
        id: `bib-${now}-${Math.random().toString(36).slice(2, 8)}`,
        type: currentType,
        fields,
        formatted: livePreview,
        standard,
        createdAt: now,
      };
      setSources((prev) => [newItem, ...prev]);
    }
    setFields(emptyFields());
    triggerHaptic('light');
  };

  const handleEdit = (source: SavedSource) => {
    setCurrentType(source.type);
    setStandard(source.standard);
    setFields(source.fields);
    setEditingId(source.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    const source = sources.find((s) => s.id === id);
    setConfirmState({
      title: 'Удалить источник?',
      message: source ? `«${source.formatted.slice(0, 80)}${source.formatted.length > 80 ? '...' : ''}»` : 'Запись будет удалена.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => {
        setSources((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) {
          setEditingId(null);
          setFields(emptyFields());
        }
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFields(emptyFields());
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAlertMsg('Скопировано в буфер обмена ✅');
      triggerHaptic('light');
    } catch {
      setAlertMsg('Не удалось скопировать. Выделите текст вручную.');
    }
  };

  const handleCopyAll = () => {
    if (sources.length === 0) {
      setAlertMsg('Список пуст. Добавьте хотя бы один источник.');
      return;
    }
    const list = (sortAlpha ? [...sources].sort(sortByAuthors) : sources)
      .map((s, i) => `${i + 1}. ${s.formatted}`)
      .join('\n');
    handleCopy(list);
  };

  const handleExportTxt = () => {
    if (sources.length === 0) {
      setAlertMsg('Список пуст. Добавьте хотя бы один источник.');
      return;
    }
    const list = (sortAlpha ? [...sources].sort(sortByAuthors) : sources)
      .map((s, i) => `${i + 1}. ${s.formatted}`)
      .join('\n\n');
    const header = `СПИСОК ЛИТЕРАТУРЫ\n(составлено по ${GOST_LABELS[standard].label})\n\n`;
    const blob = new Blob(['\ufeff', header + list], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `список_литературы_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('heavy');
  };

  const handleExportDocx = () => {
    if (sources.length === 0) {
      setAlertMsg('Список пуст. Добавьте хотя бы один источник.');
      return;
    }
    const items = sortAlpha ? [...sources].sort(sortByAuthors) : sources;
    const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Список литературы</title>
<style>
  @page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }
  body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
  h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 1cm; }
  p { text-align: justify; text-indent: 1.25cm; margin: 0 0 0.3cm 0; }
</style>
</head>
<body>
  <h1>СПИСОК ЛИТЕРАТУРЫ</h1>
  ${items.map((item, i) => `<p>${i + 1}. ${item.formatted.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n  ')}
</body>
</html>`.trim();

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `список_литературы_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('heavy');
  };

  const handleExportTxtRequest = () => {
    if (sources.length === 0) {
      setAlertMsg('Список пуст. Добавьте хотя бы один источник.');
      return;
    }
    const mobile = isMobileDevice();
    setConfirmState({
      title: '⚠️ Скачивание TXT',
      message: mobile
        ? 'Вы работаете с мобильного устройства. Скачивание файлов стабильно работает только при работе с компьютера. В мини-апе ВКонтакте или мобильном браузере файл может не сохраниться. Для гарантированного результата откройте приложение на компьютере. Всё равно продолжить?'
        : 'Скачивание файлов стабильно работает только при работе с компьютера. В мини-апе ВКонтакте или мобильном браузере файл может не сохраниться. Продолжить скачивание?',
      confirmLabel: 'Скачать .txt',
      danger: false,
      action: () => {
        handleExportTxt();
      },
    });
  };

  const handleExportDocxRequest = () => {
    if (sources.length === 0) {
      setAlertMsg('Список пуст. Добавьте хотя бы один источник.');
      return;
    }
    const mobile = isMobileDevice();
    setConfirmState({
      title: '⚠️ Скачивание Word (.doc)',
      message: mobile
        ? 'Вы работаете с мобильного устройства. Скачивание Word-файлов стабильно работает только при работе с компьютера. В мини-апе ВКонтакте файл может не открыться или открыться с ошибками (в виде кода или с нарушенной кириллицей). Для гарантированного результата откройте приложение на компьютере или используйте копирование списка в буфер. Всё равно продолжить?'
        : 'Скачивание Word-файлов стабильно работает только при работе с компьютера. В мини-апе ВКонтакте или мобильном браузере файл может не открыться или открыться с ошибками (нарушенная кириллица, вид архива вместо документа). Продолжить скачивание?',
      confirmLabel: 'Скачать .doc',
      danger: false,
      action: () => {
        handleExportDocx();
      },
    });
  };

  const handleClearAll = () => {
    if (sources.length === 0) return;
    setConfirmState({
      title: 'Очистить весь список?',
      message: `Будут удалены все ${sources.length} записей. Это действие нельзя отменить.`,
      confirmLabel: 'Очистить',
      danger: true,
      action: () => {
        setSources([]);
        setEditingId(null);
        setFields(emptyFields());
      },
    });
  };

  const currentTypeInfo = SOURCE_TYPES.find((t) => t.id === currentType)!;

  const renderFields = () => {
    const common = (
      <>
        <Field label="Авторы" fieldKey="authors" value={fields.authors}
          onChange={(v) => setField('authors', v)}
          placeholder="Иванов И. И., Петров П. П." required />
        <Field label="Заглавие" fieldKey="title" value={fields.title}
          onChange={(v) => setField('title', v)}
          placeholder="Название книги" required />
      </>
    );

    switch (currentType) {
      case 'book':
        return (
          <>
            {common}
            <Field label="Сведения о заглавии" fieldKey="subtitle" value={fields.subtitle}
              onChange={(v) => setField('subtitle', v)} placeholder="учебник, учебное пособие" />
            <Field label="Издание" fieldKey="edition" value={fields.edition}
              onChange={(v) => setField('edition', v)} placeholder="2-е изд., перераб. и доп." />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Издательство" fieldKey="publisher" value={fields.publisher}
                onChange={(v) => setField('publisher', v)} placeholder="Просвещение" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
              <Field label="Страниц" fieldKey="pages" value={fields.pages}
                onChange={(v) => setField('pages', v)} placeholder="256" />
            </div>
            <Field label="ISBN" fieldKey="isbn" value={fields.isbn}
              onChange={(v) => setField('isbn', v)} placeholder="978-5-09-123456-7" />
          </>
        );

      case 'journal':
        return (
          <>
            {common}
            <Field label="Название журнала" fieldKey="journal" value={fields.journal}
              onChange={(v) => setField('journal', v)} placeholder="Вопросы образования" required />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
              <Field label="Том" fieldKey="volume" value={fields.volume}
                onChange={(v) => setField('volume', v)} placeholder="5" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Номер" fieldKey="issue" value={fields.issue}
                onChange={(v) => setField('issue', v)} placeholder="3" />
              <Field label="Стр. с" fieldKey="pageFrom" value={fields.pageFrom}
                onChange={(v) => setField('pageFrom', v)} placeholder="15" />
              <Field label="Стр. по" fieldKey="pageTo" value={fields.pageTo}
                onChange={(v) => setField('pageTo', v)} placeholder="23" />
            </div>
          </>
        );

      case 'collection':
        return (
          <>
            {common}
            <Field label="Название сборника" fieldKey="collectionTitle" value={fields.collectionTitle}
              onChange={(v) => setField('collectionTitle', v)} placeholder="Современные проблемы науки" required />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Стр. с" fieldKey="pageFrom" value={fields.pageFrom}
                onChange={(v) => setField('pageFrom', v)} placeholder="15" />
              <Field label="Стр. по" fieldKey="pageTo" value={fields.pageTo}
                onChange={(v) => setField('pageTo', v)} placeholder="23" />
            </div>
          </>
        );

      case 'dissertation':
      case 'abstract':
        return (
          <>
            {common}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Степень" fieldKey="degree" value={fields.degree}
                onChange={(v) => setField('degree', v)} placeholder="кандидат" />
              <Field label="Отрасль" fieldKey="science" value={fields.science}
                onChange={(v) => setField('science', v)} placeholder="педагогических" />
            </div>
            <Field label="Специальность ВАК" fieldKey="specialty" value={fields.specialty}
              onChange={(v) => setField('specialty', v)} placeholder="13.00.01 — Общая педагогика" />
            <Field label="Место защиты" fieldKey="defensePlace" value={fields.defensePlace}
              onChange={(v) => setField('defensePlace', v)} placeholder="МГУ им. М. В. Ломоносова" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
            </div>
            <Field label="Страниц" fieldKey="pages" value={fields.pages}
              onChange={(v) => setField('pages', v)} placeholder="200" />
          </>
        );

      case 'electronic':
        return (
          <>
            {common}
            <Field label="URL" fieldKey="url" value={fields.url}
              onChange={(v) => setField('url', v)} placeholder="https://example.com/article" required />
            <Field label="Дата обращения" fieldKey="accessDate" value={fields.accessDate}
              onChange={(v) => setField('accessDate', v)} placeholder="15.01.2024" required />
          </>
        );

      case 'legal':
        return (
          <>
            <Field label="Заглавие" fieldKey="title" value={fields.title}
              onChange={(v) => setField('title', v)} placeholder="Об образовании в Российской Федерации" required />
            <Field label="Тип акта" fieldKey="legalType" value={fields.legalType}
              onChange={(v) => setField('legalType', v)} placeholder="Федеральный закон" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Номер" fieldKey="number" value={fields.number}
                onChange={(v) => setField('number', v)} placeholder="273-ФЗ" />
              <Field label="Дата принятия" fieldKey="adoptDate" value={fields.adoptDate}
                onChange={(v) => setField('adoptDate', v)} placeholder="29.12.2012" />
            </div>
            <Field label="Принявший орган" fieldKey="adoptBody" value={fields.adoptBody}
              onChange={(v) => setField('adoptBody', v)} placeholder="Государственная Дума" />
            <Field label="Редакция" fieldKey="lastRevision" value={fields.lastRevision}
              onChange={(v) => setField('lastRevision', v)} placeholder="01.01.2024" />
            <Field label="Источник публикации" fieldKey="sourcePublication" value={fields.sourcePublication}
              onChange={(v) => setField('sourcePublication', v)} placeholder="Собрание законодательства РФ" />
            <Field label="URL (если электронный)" fieldKey="url" value={fields.url}
              onChange={(v) => setField('url', v)} placeholder="http://pravo.gov.ru/..." />
            <Field label="Дата обращения" fieldKey="accessDate" value={fields.accessDate}
              onChange={(v) => setField('accessDate', v)} placeholder="15.01.2024" />
          </>
        );

      case 'methodological':
        return (
          <>
            <Field label="Заглавие" fieldKey="title" value={fields.title}
              onChange={(v) => setField('title', v)} placeholder="Методика преподавания..." required />
            <Field label="Организация" fieldKey="organization" value={fields.organization}
              onChange={(v) => setField('organization', v)} placeholder="ФИРО" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
            </div>
            <Field label="Страниц" fieldKey="pages" value={fields.pages}
              onChange={(v) => setField('pages', v)} placeholder="50" />
          </>
        );

      case 'textbook':
        return (
          <>
            {common}
            <Field label="Сведения о заглавии" fieldKey="subtitle" value={fields.subtitle}
              onChange={(v) => setField('subtitle', v)} placeholder="учебник для вузов" />
            <Field label="Гриф" fieldKey="approval" value={fields.approval}
              onChange={(v) => setField('approval', v)} placeholder="Рекомендовано УМО" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Издательство" fieldKey="publisher" value={fields.publisher}
                onChange={(v) => setField('publisher', v)} placeholder="Просвещение" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
              <Field label="Страниц" fieldKey="pages" value={fields.pages}
                onChange={(v) => setField('pages', v)} placeholder="320" />
            </div>
          </>
        );

      case 'conference':
        return (
          <>
            <Field label="Название сборника" fieldKey="collectionTitle" value={fields.collectionTitle}
              onChange={(v) => setField('collectionTitle', v)} placeholder="Наука и образование" required />
            <Field label="Название конференции" fieldKey="conferenceName" value={fields.conferenceName}
              onChange={(v) => setField('conferenceName', v)} placeholder="X Междунар. науч. конф." />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город проведения" fieldKey="conferenceCity" value={fields.conferenceCity}
                onChange={(v) => setField('conferenceCity', v)} placeholder="Москва" />
              <Field label="Дата проведения" fieldKey="conferenceDate" value={fields.conferenceDate}
                onChange={(v) => setField('conferenceDate', v)} placeholder="15–17 мая 2024 г." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город издания" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
            </div>
            <Field label="Страниц" fieldKey="pages" value={fields.pages}
              onChange={(v) => setField('pages', v)} placeholder="450" />
          </>
        );

      case 'translation':
        return (
          <>
            {common}
            <Field label="Язык оригинала" fieldKey="originalLanguage" value={fields.originalLanguage}
              onChange={(v) => setField('originalLanguage', v)} placeholder="англ." />
            <Field label="Переводчик" fieldKey="translator" value={fields.translator}
              onChange={(v) => setField('translator', v)} placeholder="Иванов И. И." />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Издательство" fieldKey="publisher" value={fields.publisher}
                onChange={(v) => setField('publisher', v)} placeholder="Иностранка" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
              <Field label="Страниц" fieldKey="pages" value={fields.pages}
                onChange={(v) => setField('pages', v)} placeholder="320" />
            </div>
          </>
        );

      case 'multivolume':
        return (
          <>
            <Field label="Заглавие" fieldKey="title" value={fields.title}
              onChange={(v) => setField('title', v)} placeholder="История России" required />
            <Field label="Авторы (если есть)" fieldKey="authors" value={fields.authors}
              onChange={(v) => setField('authors', v)} placeholder="Иванов И. И." />
            <Field label="Номер тома" fieldKey="volumeNumber" value={fields.volumeNumber}
              onChange={(v) => setField('volumeNumber', v)} placeholder="1" />
            <Field label="Всего томов" fieldKey="totalVolumes" value={fields.totalVolumes}
              onChange={(v) => setField('totalVolumes', v)} placeholder="3" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Город" fieldKey="city" value={fields.city}
                onChange={(v) => setField('city', v)} placeholder="Москва" />
              <Field label="Издательство" fieldKey="publisher" value={fields.publisher}
                onChange={(v) => setField('publisher', v)} placeholder="Наука" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Год" fieldKey="year" value={fields.year}
                onChange={(v) => setField('year', v)} placeholder="2024" />
              <Field label="Страниц" fieldKey="pages" value={fields.pages}
                onChange={(v) => setField('pages', v)} placeholder="500" />
            </div>
          </>
        );

      case 'abstract':
        return null;

      default:
        return common;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Источники по ГОСТу</h1>
          </div>
          <FileText className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* Выбор ГОСТа */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <button
            onClick={() => setShowStandardPanel(!showStandardPanel)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Оформляю по</p>
              <p className="font-bold text-purple-700 truncate">
                {GOST_LABELS[standard].label}
              </p>
            </div>
            <div className="shrink-0 bg-purple-100 rounded-full p-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>
          </button>
          {showStandardPanel && (
            <div className="mt-3 space-y-1.5 border-t border-purple-100 pt-3">
              {(Object.keys(GOST_LABELS) as GostStandard[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setStandard(g);
                    setShowStandardPanel(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border-2 transition-colors ${
                    standard === g
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-800">{GOST_LABELS[g].label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{GOST_LABELS[g].desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Выбор типа */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <button
            onClick={() => setShowTypePanel(!showTypePanel)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                {currentTypeInfo.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Тип источника</p>
                <p className="font-bold text-purple-700 truncate">{currentTypeInfo.label}</p>
              </div>
            </div>
            <div className="shrink-0 text-gray-400">
              {showTypePanel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
          {showTypePanel && (
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-purple-100 pt-3">
              {SOURCE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentType(t.id);
                    setShowTypePanel(false);
                    setFields(emptyFields());
                    setEditingId(null);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-colors ${
                    currentType === t.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <span className="text-purple-600">{t.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Форма */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-purple-700">Данные источника</h2>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Отмена
              </button>
            )}
          </div>
          <div className="space-y-3">{renderFields()}</div>

          {/* Live preview */}
          <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-purple-700 mb-1.5 flex items-center gap-1">
              <Check className="w-3 h-3" /> Результат ({GOST_LABELS[standard].label})
            </p>
            <p className="text-sm text-gray-800 leading-relaxed break-words min-h-[3rem]">
              {livePreview || <span className="text-gray-400 italic">Заполните поля — результат появится здесь...</span>}
            </p>
            {livePreview && (
              <button
                onClick={() => handleCopy(livePreview)}
                className="mt-2 w-full py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Скопировать эту запись
              </button>
            )}
          </div>

          {/* Кнопки */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Обновить' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                setFields(emptyFields());
                setEditingId(null);
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" /> Очистить
            </button>
          </div>
        </div>

        {/* Список источников */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-purple-700 flex items-center gap-2">
              <Library className="w-4 h-4" />
              Список источников
              <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                {sources.length}
              </span>
            </h2>
            <button
              onClick={() => setSortAlpha(!sortAlpha)}
              className={`p-1.5 rounded-lg transition-colors ${
                sortAlpha ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
              }`}
              aria-label="Сортировка"
              title={sortAlpha ? 'По алфавиту (ГОСТ)' : 'По порядку добавления'}
            >
              <SortAsc className="w-4 h-4" />
            </button>
          </div>

          {sources.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Пока нет источников. Заполните форму выше и нажмите «Сохранить».
            </p>
          ) : (
            <div className="space-y-2">
              {sortedSources.map((s, i) => (
                <div key={s.id} className="border border-purple-100 rounded-xl p-2.5 hover:border-purple-300 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-purple-500 w-5 text-right shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <p className="flex-1 text-xs text-gray-800 leading-relaxed break-words min-w-0">
                      {s.formatted}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button
                      onClick={() => handleCopy(s.formatted)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors rounded"
                      aria-label="Копировать"
                      title="Копировать"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors rounded"
                      aria-label="Редактировать"
                      title="Редактировать"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                      aria-label="Удалить"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={handleCopyAll}
                  className="py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  title="Скопировать все записи в буфер обмена (работает на любом устройстве)"
                >
                  <Copy className="w-3 h-3" /> Все
                </button>
                <button
                  onClick={handleExportTxtRequest}
                  className="py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <FileDown className="w-3 h-3" /> .txt
                </button>
                <button
                  onClick={handleExportDocxRequest}
                  className="py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> .doc
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1 px-2 leading-relaxed">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                Скачивание файлов стабильно работает только с компьютера. На мобильных используйте кнопку «Все» для копирования.
              </p>
              <button
                onClick={handleClearAll}
                className="w-full py-2 text-[11px] text-red-600 hover:text-red-800 font-semibold"
              >
                Очистить весь список
              </button>
            </div>
          )}
        </div>

        {/* 🆕 УЛУЧШЕННЫЙ FAQ с анимацией */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Как пользоваться</h3>
            </div>
            <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform duration-200 ${showFaq ? 'rotate-180' : ''}`} />
          </button>
          {showFaq && (
            <div className="px-5 pb-5 space-y-3 text-sm">
              <div>
                <p className="font-bold text-gray-800 mb-1">❓ Какой ГОСТ выбрать?</p>
                <p className="text-xs text-gray-600 leading-relaxed">Для списков литературы в дипломах и диссертациях — ГОСТ Р 7.0.100–2018 (действующий). Для внутритекстовых ссылок — ГОСТ Р 7.0.5–2008. ГОСТ 7.1–2003 устарел, но встречается в некоторых вузах.</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">❓ Как указать несколько авторов?</p>
                <p className="text-xs text-gray-600 leading-relaxed">Вводите через запятую: «Иванов И. И., Петров П. П., Сидоров С. С.». До 4 авторов указываются перед заглавием, более 4 — автоматически добавляется «[и др.]».</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">❓ Как оформить электронную статью?</p>
                <p className="text-xs text-gray-600 leading-relaxed">Выберите тип «Интернет-ресурс», заполните URL (с https://) и дату обращения. Формат: «Название [Электронный ресурс] // URL: https://... (дата обращения: 15.01.2024)».</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">❓ Можно ли редактировать запись?</p>
                <p className="text-xs text-gray-600 leading-relaxed">Да! В списке источников нажмите на иконку карандаша — запись загрузится в форму для редактирования. После исправлений нажмите «Обновить».</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">❓ Почему сортировка по алфавиту?</p>
                <p className="text-xs text-gray-600 leading-relaxed">По ГОСТу список литературы должен быть упорядочен по алфавиту фамилий авторов. Кнопка сортировки справа от заголовка переключает между алфавитным порядком и порядком добавления.</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">❓ Как экспортировать в Word?</p>
                <p className="text-xs text-gray-600 leading-relaxed">Нажмите кнопку .doc в списке источников. Файл откроется в Word с правильным форматированием: Times New Roman 14pt, выравнивание по ширине, абзацный отступ 1.25 см.</p>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span><b>Важно:</b> скачивание .doc и .txt стабильно работает только при работе с компьютера. В мини-апе ВКонтакте или мобильном браузере файлы могут не скачаться или открыться с ошибками. Используйте кнопку «Все» для копирования списка в буфер — она работает на любом устройстве.</span>
                </p>
                <p className="text-xs text-gray-500">
                  💡 <b>Совет:</b> нажимайте на иконку ? рядом с каждым полем — там точный пункт ГОСТа с примерами заполнения.
                </p>
              </div>
            </div>
          )}
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
      <AlertDialog
        isOpen={alertMsg !== null}
        message={alertMsg ?? ''}
        onClose={() => setAlertMsg(null)}
      />
    </div>
  );
}
