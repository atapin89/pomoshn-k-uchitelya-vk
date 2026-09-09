import { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Download,
  Heart,
  Brain,
  Users,
  Briefcase,
  Home as HomeIcon,
  Sparkles,
  Smile,
  Wallet,
  Info,
  RotateCcw,
} from 'lucide-react';
import BackButton from './BackButton';

type SphereKey =
  | 'professional'
  | 'students'
  | 'colleagues'
  | 'parents'
  | 'health'
  | 'family'
  | 'hobby'
  | 'finance';

interface Sphere {
  key: SphereKey;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  highSigns: string[];
  lowSigns: string[];
  tips: string[];
}

const SPHERES: Sphere[] = [
  {
    key: 'professional',
    title: 'Профессиональное развитие',
    icon: <Brain className="w-5 h-5" />,
    color: '#7c3aed',
    description: 'Повышение квалификации, методическая работа, изучение новых подходов, чтение литературы по педагогике.',
    highSigns: ['Регулярно прохожу курсы', 'Читаю методическую литературу', 'Делюсь опытом с коллегами', 'Экспериментирую с новыми методиками'],
    lowSigns: ['Работаю по старым конспектам', 'Нет времени на обучение', 'Не хожу на курсы и вебинары', 'Чувствую профессиональное выгорание'],
    tips: ['Выделяйте 20 минут в день на чтение педагогических статей', 'Запишитесь на один онлайн-курс в четверть', 'Ведите методическую копилку в Notion или блокноте'],
  },
  {
    key: 'students',
    title: 'Отношения с учениками',
    icon: <Users className="w-5 h-5" />,
    color: '#8b5cf6',
    description: 'Взаимодействие с детьми, качество коммуникации, поддержка и вовлечённость в их развитие.',
    highSigns: ['Ученики идут ко мне с вопросами', 'Слышу каждого ребёнка', 'Вижу прогресс учеников', 'Атмосфера доверия в классе'],
    lowSigns: ['Конфликты в классе', 'Не нахожу подход к некоторым детям', 'Чувствую раздражение на учеников', 'Нет эмоциональной связи'],
    tips: ['Раз в неделю проводите неформальную беседу с классом', 'Узнайте увлечения «трудных» учеников', 'Заведите «журнал успехов» класса'],
  },
  {
    key: 'colleagues',
    title: 'Отношения с коллегами',
    icon: <Briefcase className="w-5 h-5" />,
    color: '#a78bfa',
    description: 'Профессиональное сообщество, обмен опытом, взаимопомощь и поддержка в школе.',
    highSigns: ['Есть коллеги, с которыми делюсь опытом', 'Участвую в методобъединениях', 'Получаю и оказываю поддержку', 'Атмосфера сотрудничества'],
    lowSigns: ['Чувствую себя изолированным', 'Конфликты с коллегами', 'Нет профессионального общения', 'Зависть и конкуренция'],
    tips: ['Найдите 1-2 близких по духу коллег для регулярного общения', 'Создайте мини-сообщество по интересам в школе', 'Делитесь удачными находками в общем чате'],
  },
  {
    key: 'parents',
    title: 'Работа с родителями',
    icon: <Users className="w-5 h-5" />,
    color: '#c4b5fd',
    description: 'Коммуникация с семьями учеников, партнёрство, доверие и конструктивное взаимодействие.',
    highSigns: ['Родители доверяют и поддерживают', 'Конструктивная обратная связь', 'Минимум конфликтов', 'Партнёрские отношения'],
    lowSigns: ['Жалобы и претензии', 'Непонимание с родителями', 'Эмоциональное выгорание от общения', 'Избегание родительских собраний'],
    tips: ['Начинайте общение с позитива — похвалите ребёнка', 'Используйте шаблоны сообщений для сложных тем', 'Установите чёткие границы времени для связи'],
  },
  {
    key: 'health',
    title: 'Здоровье и энергия',
    icon: <Heart className="w-5 h-5" />,
    color: '#ef4444',
    description: 'Физическое самочувствие, сон, питание, уровень энергии и профилактика выгорания.',
    highSigns: ['Сплю 7-8 часов', 'Регулярная физическая активность', 'Есть энергия до вечера', 'Прохожу диспансеризацию'],
    lowSigns: ['Хроническая усталость', 'Проблемы со сном', 'Боли и недомогания', 'Нет сил на хобби после работы'],
    tips: ['Введите правило «телефон в сторону за час до сна»', '10-минутная зарядка перед уроками', 'Обед без проверки тетрадей — святое'],
  },
  {
    key: 'family',
    title: 'Семья и личная жизнь',
    icon: <HomeIcon className="w-5 h-5" />,
    color: '#f59e0b',
    description: 'Баланс между работой и семьёй, время для близких, отношения с партнёром, детьми.',
    highSigns: ['Качественное время с семьёй', 'Поддержка близких', 'Выходные — для семьи', 'Личная жизнь в гармонии'],
    lowSigns: ['Работа забирает всё время', 'Конфликты дома из-за работы', 'Нет времени на близких', 'Одиночество или напряжение'],
    tips: ['Заведите «ритуал возвращения домой» — 15 минут без телефона', 'Планируйте семейные активности на выходные заранее', 'Говорите с близкими о своей работе, но дозированно'],
  },
  {
    key: 'hobby',
    title: 'Хобби и отдых',
    icon: <Sparkles className="w-5 h-5" />,
    color: '#10b981',
    description: 'Занятия для души, творчество, путешествия, восстановление через удовольствие.',
    highSigns: ['Есть регулярное хобби', 'Путешествую или планирую поездки', 'Читаю для удовольствия', 'Занимаюсь творчеством'],
    lowSigns: ['Нет времени на хобби', 'Отдых = сериалы и соцсети', 'Забыл(а), что меня радует', 'Отпуск проведён дома'],
    tips: ['Запишитесь на что-то новое: гончарное дело, танцы, рисование', 'Правило «1 день в месяц — только для себя»', 'Составьте список из 10 занятий, которые приносят радость'],
  },
  {
    key: 'finance',
    title: 'Финансы и стабильность',
    icon: <Wallet className="w-5 h-5" />,
    color: '#3b82f6',
    description: 'Материальное благополучие, планирование бюджета, дополнительные источники дохода.',
    highSigns: ['Стабильный доход', 'Есть финансовая подушка', 'Планирую бюджет', 'Дополнительный заработок при желании'],
    lowSigns: ['Постоянная тревога о деньгах', 'Не хватает до зарплаты', 'Нет накоплений', 'Нет ясности в финансах'],
    tips: ['Ведите простой учёт расходов в приложении', 'Откладывайте 10% с каждой зарплаты', 'Изучите возможности репетиторства или онлайн-курсов'],
  },
];

const SPHERE_COUNT = SPHERES.length;
const CENTER = 200;
const MAX_RADIUS = 170;
const LABEL_RADIUS = 190;

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function getScoreColor(score: number): string {
  if (score <= 3) return '#ef4444';
  if (score <= 5) return '#f59e0b';
  if (score <= 7) return '#84cc16';
  return '#10b981';
}

function getBalanceLabel(avg: number, balance: number): { label: string; color: string; description: string } {
  if (balance <= 1.5 && avg >= 7) return { label: 'Гармония', color: '#10b981', description: 'Отличный баланс! Все сферы жизни наполнены. Продолжайте поддерживать этот ритм.' };
  if (balance <= 2 && avg >= 5) return { label: 'Устойчивость', color: '#84cc16', description: 'Хороший баланс с небольшими перекосами. Есть над чем поработать, но фундамент прочный.' };
  if (balance <= 2.5) return { label: 'Дисбаланс', color: '#f59e0b', description: 'Есть заметные перекосы. Некоторые сферы проседают — они забирают энергию у других.' };
  return { label: 'Кризис', color: '#ef4444', description: 'Серьёзный дисбаланс. Нужно срочно уделить внимание самым низким сферам, чтобы избежать выгорания.' };
}

export default function LifeBalanceScreen({ onBack }: { onBack: () => void }) {
  const [scores, setScores] = useState<Record<SphereKey, number>>({
    professional: 5,
    students: 5,
    colleagues: 5,
    parents: 5,
    health: 5,
    family: 5,
    hobby: 5,
    finance: 5,
  });
  const [selectedSphere, setSelectedSphere] = useState<SphereKey | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportName, setExportName] = useState('');
  const wheelRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const values = Object.values(scores);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
    const balance = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const minSphere = SPHERES.find(s => scores[s.key] === min)!;
    const maxSphere = SPHERES.find(s => scores[s.key] === max)!;
    return { avg, balance, min, max, minSphere, maxSphere };
  }, [scores]);

  const balanceInfo = getBalanceLabel(stats.avg, stats.balance);

  const handleScoreChange = (key: SphereKey, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setScores({
      professional: 5, students: 5, colleagues: 5, parents: 5,
      health: 5, family: 5, hobby: 5, finance: 5,
    });
    setSelectedSphere(null);
  };

  const downloadImage = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 1000 * scale;
    canvas.height = 1400 * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // Фон
    const gradient = ctx.createLinearGradient(0, 0, 0, 1400);
    gradient.addColorStop(0, '#faf5ff');
    gradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 1400);

    // Заголовок
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Колесо жизненного баланса педагога', 500, 60);

    if (exportName) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Arial';
      ctx.fillText(exportName, 500, 90);
    }

    // Дата
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.fillText(new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), 500, 115);

    // Рисуем колесо (переносим центр в (500, 380))
    const cx = 500;
    const cy = 380;
    const maxR = 220;
    const angleStep = 360 / SPHERE_COUNT;

    // Сетка
    for (let i = 1; i <= 10; i++) {
      const r = (maxR * i) / 10;
      ctx.strokeStyle = i === 5 ? '#d8b4fe' : '#e9d5ff';
      ctx.lineWidth = i === 5 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Линии секторов
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const angle = (i * angleStep - 90) * Math.PI / 180;
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.stroke();
    }

    // Заливка секторов
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const sphere = SPHERES[i];
      const score = scores[sphere.key];
      const startAngle = ((i * angleStep - 90) * Math.PI) / 180;
      const endAngle = (((i + 1) * angleStep - 90) * Math.PI) / 180;
      const r = (maxR * score) / 10;

      ctx.fillStyle = sphere.color + 'cc';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Обводка
      ctx.strokeStyle = sphere.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Подпись сферы
      const labelAngle = ((i + 0.5) * angleStep - 90) * Math.PI / 180;
      const labelR = maxR + 35;
      const lx = cx + labelR * Math.cos(labelAngle);
      const ly = cy + labelR * Math.sin(labelAngle);

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const words = sphere.title.split(' ');
      if (words.length > 1) {
        ctx.fillText(words[0], lx, ly - 8);
        ctx.fillText(words.slice(1).join(' '), lx, ly + 10);
      } else {
        ctx.fillText(sphere.title, lx, ly);
      }

      // Оценка
      ctx.fillStyle = sphere.color;
      ctx.font = 'bold 18px Arial';
      const scoreR = (maxR * score) / 10 - 25;
      const sr = (i + 0.5) * angleStep - 90;
      const sx = cx + scoreR * Math.cos((sr * Math.PI) / 180);
      const sy = cy + scoreR * Math.sin((sr * Math.PI) / 180);
      ctx.fillText(score.toString(), sx, sy);
    }

    // Статистика
    const statsY = 680;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, statsY, 900, 110);
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, statsY, 900, 110);

    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Средний балл: ${stats.avg.toFixed(1)} / 10`, 80, statsY + 35);
    ctx.fillText(`Баланс: ${balanceInfo.label}`, 80, statsY + 70);

    ctx.fillStyle = balanceInfo.color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Δ ${stats.balance.toFixed(2)}`, 920, statsY + 55);

    // Рекомендации
    const recY = statsY + 150;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, recY, 900, 350);
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, recY, 900, 350);

    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🎯 Анализ и рекомендации', 80, recY + 35);

    ctx.fillStyle = '#374151';
    ctx.font = '16px Arial';
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line !== '') {
          ctx.fillText(line, x, currentY);
          line = word + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY;
    };

    const line1 = wrapText(balanceInfo.description, 80, recY + 75, 840, 24);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`✅ Самая сильная сфера: ${stats.maxSphere.title} (${stats.max} / 10)`, 80, line1 + 45);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`⚠️ Точка роста: ${stats.minSphere.title} (${stats.min} / 10)`, 80, line1 + 75);

    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('💡 Первые шаги:', 80, line1 + 115);

    ctx.fillStyle = '#374151';
    ctx.font = '15px Arial';
    const tips = stats.minSphere.tips;
    let tipY = line1 + 145;
    tips.forEach((tip, i) => {
      ctx.fillText(`${i + 1}. ${tip}`, 100, tipY);
      tipY += 25;
    });

    // Футер
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Проект Алексея Атапина · topteach.ru', 500, 1380);

    // Скачать
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `колесо-баланса-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    });
  };

  const selected = selectedSphere ? SPHERES.find(s => s.key === selectedSphere) : null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-violet-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Колесо жизненного баланса</h1>
            <p className="text-xs text-purple-200">Саморефлексия педагога</p>
          </div>
          <BookOpen className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-3 space-y-3 pb-8">
        {/* Интро */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-3 items-start">
          <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Info className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-purple-700 mb-1">Как это работает</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Оцените 8 сфер жизни от 1 до 10. Колесо покажет, где есть перекос, и даст персональные рекомендации.
              Нажмите на сектор колеса, чтобы увидеть расшифровку и советы именно по этой сфере.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          {/* Левая колонка: колесо */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-purple-700">Ваше колесо</h2>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Сброс
                </button>
              </div>

              <div ref={wheelRef} className="flex justify-center">
                <svg viewBox="0 0 400 400" className="w-full max-w-md">
                  {/* Сетка */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <circle
                      key={i}
                      cx={CENTER}
                      cy={CENTER}
                      r={(MAX_RADIUS * i) / 10}
                      fill="none"
                      stroke={i === 5 ? '#d8b4fe' : '#e9d5ff'}
                      strokeWidth={i === 5 ? 1.5 : 1}
                      strokeDasharray={i === 5 ? '4 2' : 'none'}
                    />
                  ))}

                  {/* Линии секторов */}
                  {SPHERES.map((_, i) => {
                    const angle = ((i * 360) / SPHERE_COUNT - 90) * Math.PI / 180;
                    return (
                      <line
                        key={i}
                        x1={CENTER}
                        y1={CENTER}
                        x2={CENTER + MAX_RADIUS * Math.cos(angle)}
                        y2={CENTER + MAX_RADIUS * Math.sin(angle)}
                        stroke="#d8b4fe"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Секторы (заливка) */}
                  {SPHERES.map((sphere, i) => {
                    const score = scores[sphere.key];
                    const startAngle = (i * 360) / SPHERE_COUNT - 90;
                    const endAngle = ((i + 1) * 360) / SPHERE_COUNT - 90;
                    const r = (MAX_RADIUS * score) / 10;

                    const start = polarToCartesian(startAngle, r);
                    const end = polarToCartesian(endAngle, r);

                    const pathData = [
                      `M ${CENTER} ${CENTER}`,
                      `L ${start.x} ${start.y}`,
                      `A ${r} ${r} 0 0 1 ${end.x} ${end.y}`,
                      'Z',
                    ].join(' ');

                    return (
                      <path
                        key={sphere.key}
                        d={pathData}
                        fill={sphere.color + 'cc'}
                        stroke={sphere.color}
                        strokeWidth="2"
                        className="cursor-pointer transition-all hover:opacity-80"
                        onClick={() => setSelectedSphere(sphere.key)}
                      />
                    );
                  })}

                  {/* Оценки на секторах */}
                  {SPHERES.map((sphere, i) => {
                    const score = scores[sphere.key];
                    const midAngle = ((i + 0.5) * 360) / SPHERE_COUNT - 90;
                    const r = (MAX_RADIUS * score) / 10 - 20;
                    const pos = polarToCartesian(midAngle, r);
                    return (
                      <text
                        key={`score-${sphere.key}`}
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill="white"
                        style={{ pointerEvents: 'none' }}
                      >
                        {score}
                      </text>
                    );
                  })}

                  {/* Подписи сфер */}
                  {SPHERES.map((sphere, i) => {
                    const midAngle = ((i + 0.5) * 360) / SPHERE_COUNT - 90;
                    const pos = polarToCartesian(midAngle, LABEL_RADIUS);
                    const isSelected = selectedSphere === sphere.key;
                    return (
                      <g key={`label-${sphere.key}`} className="cursor-pointer" onClick={() => setSelectedSphere(sphere.key)}>
                        <text
                          x={pos.x}
                          y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="11"
                          fontWeight={isSelected ? 'bold' : '500'}
                          fill={isSelected ? sphere.color : '#4b5563'}
                        >
                          {sphere.title}
                        </text>
                      </g>
                    );
                  })}

                  {/* Центр */}
                  <circle cx={CENTER} cy={CENTER} r="4" fill="#7c3aed" />
                </svg>
              </div>

              {/* Статистика */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Средний балл</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.avg.toFixed(1)}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: balanceInfo.color + '15' }}>
                  <p className="text-[10px] text-gray-500">Баланс</p>
                  <p className="text-lg font-bold" style={{ color: balanceInfo.color }}>{balanceInfo.label}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Разброс</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.balance.toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: balanceInfo.color + '10', borderLeft: `4px solid ${balanceInfo.color}` }}>
                <p className="text-sm text-gray-700">{balanceInfo.description}</p>
              </div>
            </div>

            {/* Расшифровка выбранной сферы */}
            {selected && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border-2" style={{ borderColor: selected.color + '40' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: selected.color }}>
                    {selected.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{selected.title}</h3>
                    <p className="text-xs text-gray-500">Ваша оценка: <span className="font-bold" style={{ color: selected.color }}>{scores[selected.key]} / 10</span></p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{selected.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3">
                    <h4 className="font-bold text-green-700 text-sm mb-2">✅ Признаки высокого балла</h4>
                    <ul className="space-y-1">
                      {selected.highSigns.map((sign, i) => (
                        <li key={i} className="text-xs text-green-800 flex gap-1.5">
                          <span className="text-green-500">•</span>
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-xl p-3">
                    <h4 className="font-bold text-red-700 text-sm mb-2">⚠️ Признаки низкого балла</h4>
                    <ul className="space-y-1">
                      {selected.lowSigns.map((sign, i) => (
                        <li key={i} className="text-xs text-red-800 flex gap-1.5">
                          <span className="text-red-500">•</span>
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 bg-purple-50 rounded-xl p-3">
                  <h4 className="font-bold text-purple-700 text-sm mb-2">💡 Практические советы</h4>
                  <ul className="space-y-1.5">
                    {selected.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-purple-900 flex gap-2">
                        <span className="shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка: слайдеры */}
          <div className="space-y-2">
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-purple-700">Оцените сферы (1–10)</h3>
              {SPHERES.map(sphere => {
                const score = scores[sphere.key];
                const isSelected = selectedSphere === sphere.key;
                return (
                  <div
                    key={sphere.key}
                    onClick={() => setSelectedSphere(sphere.key)}
                    className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: sphere.color }}>
                        {sphere.icon}
                      </div>
                      <span className="flex-1 text-xs font-semibold text-gray-800 leading-tight">{sphere.title}</span>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{ color: sphere.color, backgroundColor: sphere.color + '20' }}>
                        {score}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={score}
                      onChange={(e) => handleScoreChange(sphere.key, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full accent-purple-600 h-1.5"
                      style={{
                        background: `linear-gradient(to right, ${sphere.color} 0%, ${sphere.color} ${((score - 1) / 9) * 100}%, #e5e7eb ${((score - 1) / 9) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Персональный анализ */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-purple-700">Ваш анализ</h3>
              <div className="bg-green-50 rounded-lg p-2.5 flex gap-2">
                <Smile className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-green-600 font-semibold">Сильная сторона</p>
                  <p className="text-xs text-green-900 font-semibold">{stats.maxSphere.title} ({stats.max}/10)</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5 flex gap-2">
                <Heart className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-amber-600 font-semibold">Точка роста</p>
                  <p className="text-xs text-amber-900 font-semibold">{stats.minSphere.title} ({stats.min}/10)</p>
                  <p className="text-[10px] text-amber-800 mt-1">{stats.minSphere.tips[0]}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExport(true)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              Скачать картинку
            </button>
          </div>
        </div>
      </main>

      {/* Модалка экспорта */}
      {showExport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-purple-700">Скачать результат</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Ваше имя (необязательно)</label>
                <input
                  type="text"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="Имя учителя"
                  className="w-full rounded-lg border border-purple-200 p-2 text-sm mt-1"
                />
              </div>
              <p className="text-xs text-gray-500">Скачается PNG с вашим колесом, статистикой и персональными рекомендациями.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExport(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={downloadImage}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Скачать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
