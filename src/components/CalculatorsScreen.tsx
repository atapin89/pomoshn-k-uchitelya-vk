import { useState } from 'react';
import { Calculator, TrendingUp, Award, BookOpen, Target, Users, PieChart, Plus, Minus, HelpCircle, ChevronDown } from 'lucide-react';
import BackButton from './BackButton';
import YandexAdBlock from './YandexAdBlock';
import { triggerHaptic } from '@/lib/haptic';

type CalculatorType = 'average' | 'final' | 'quarter' | 'test' | 'quality' | 'sou';

export default function CalculatorsScreen({ onBack }: { onBack: () => void }) {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('average');

  const calculators = [
    { id: 'average' as const, label: 'Средний балл', icon: TrendingUp },
    { id: 'final' as const, label: 'Итоговая', icon: Award },
    { id: 'quarter' as const, label: 'Четверть', icon: BookOpen },
    { id: 'test' as const, label: 'Тест', icon: Target },
    { id: 'quality' as const, label: 'Качество', icon: PieChart },
    { id: 'sou' as const, label: 'СОУ', icon: Users },
  ];

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Калькуляторы</h1>
          </div>
          <Calculator className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 overflow-y-auto pb-8">
        <div className="grid grid-cols-3 gap-2">
          {calculators.map((calc) => {
            const Icon = calc.icon;
            const active = activeCalculator === calc.id;
            return (
              <button
                key={calc.id}
                onClick={() => {
                  setActiveCalculator(calc.id);
                  triggerHaptic('light');
                }}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl min-h-14 transition-all touch-manipulation text-xs font-semibold ${
                  active
                    ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                    : 'bg-white text-gray-500 border-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-center leading-tight">{calc.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5">
          {activeCalculator === 'average' && <AverageCalculator />}
          {activeCalculator === 'final' && <FinalGradeCalculator />}
          {activeCalculator === 'quarter' && <QuarterCalculator />}
          {activeCalculator === 'test' && <TestCalculator />}
          {activeCalculator === 'quality' && <QualityCalculator />}
          {activeCalculator === 'sou' && <SOUCalculator />}
        </div>

        <FAQSection />
        <YandexAdBlock />
      </main>
    </div>
  );
}

// ===== 1. КАЛЬКУЛЯТОР СРЕДНЕГО БАЛЛА =====
function AverageCalculator() {
  const [grades, setGrades] = useState([{ value: '', weight: 100 }]);

  const addGrade = () => {
    setGrades([...grades, { value: '', weight: 100 }]);
    triggerHaptic('light');
  };
  const removeGrade = (index: number) => setGrades(grades.filter((_, i) => i !== index));
  const updateGrade = (index: number, field: 'value' | 'weight', value: string) => {
    const newGrades = [...grades];
    newGrades[index][field] = value;
    setGrades(newGrades);
  };

  const calculateAverage = () => {
    const validGrades = grades.filter(g => g.value && parseFloat(g.value) > 0 && g.weight > 0);
    if (validGrades.length === 0) return '0.00';
    const total = validGrades.reduce((sum, g) => sum + (parseFloat(g.value) * g.weight), 0);
    const totalWeight = validGrades.reduce((sum, g) => sum + g.weight, 0);
    return (total / totalWeight).toFixed(2);
  };

  const avg = calculateAverage();

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">Средний балл (с весом)</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Вес определяет значимость оценки: контрольная = 100%, домашняя = 50%</p>
      <div className="space-y-2 mb-4">
        {grades.map((grade, index) => (
          <div key={index} className="flex gap-2 items-center bg-purple-50 p-2 rounded-lg">
            <span className="text-gray-500 text-xs w-6">#{index + 1}</span>
            <input
              type="number" min="1" max="5" step="0.1"
              value={grade.value}
              onChange={(e) => updateGrade(index, 'value', e.target.value)}
              placeholder="Оценка"
              className="flex-1 px-2 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
            <input
              type="number" min="0" max="100"
              value={grade.weight}
              onChange={(e) => updateGrade(index, 'weight', e.target.value)}
              placeholder="Вес"
              className="w-16 px-2 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
            <button onClick={() => removeGrade(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addGrade}
        className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" /> Добавить оценку
      </button>
      <div className="mt-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 rounded-xl text-center">
        <p className="text-sm text-purple-100 mb-1">Средний балл:</p>
        <p className="text-4xl font-bold">{avg}</p>
      </div>
    </div>
  );
}

// ===== 2. КАЛЬКУЛЯТОР ИТОГОВОЙ ОЦЕНКИ =====
function FinalGradeCalculator() {
  const [currentGrade, setCurrentGrade] = useState('');
  const [currentWeight, setCurrentWeight] = useState('60');
  const [finalExam, setFinalExam] = useState('');
  const [finalWeight, setFinalWeight] = useState('40');

  const calculateFinal = () => {
    const cg = parseFloat(currentGrade) || 0;
    const cw = parseFloat(currentWeight) || 0;
    const fe = parseFloat(finalExam) || 0;
    const fw = parseFloat(finalWeight) || 0;
    if (cw + fw === 0) return '0.00';
    return ((cg * cw + fe * fw) / (cw + fw)).toFixed(2);
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">Итоговая оценка</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Рассчитывает итог с учётом веса текущей оценки и экзамена</p>
      <div className="space-y-3">
        <div className="bg-blue-50 p-3 rounded-xl">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Текущая оценка:</label>
          <input
            type="number" step="0.1" value={currentGrade}
            onChange={(e) => setCurrentGrade(e.target.value)}
            placeholder="Например: 4.5"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <input
            type="number" value={currentWeight}
            onChange={(e) => setCurrentWeight(e.target.value)}
            placeholder="Вес (%)"
            className="w-full mt-2 px-3 py-1.5 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Обычно 60-80%</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-xl">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Экзамен / итоговая:</label>
          <input
            type="number" step="0.1" value={finalExam}
            onChange={(e) => setFinalExam(e.target.value)}
            placeholder="Например: 5"
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
          <input
            type="number" value={finalWeight}
            onChange={(e) => setFinalWeight(e.target.value)}
            placeholder="Вес (%)"
            className="w-full mt-2 px-3 py-1.5 border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Обычно 20-40%</p>
        </div>
      </div>
      <div className="mt-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 rounded-xl text-center">
        <p className="text-sm text-purple-100 mb-1">Итоговая оценка:</p>
        <p className="text-4xl font-bold">{calculateFinal()}</p>
      </div>
    </div>
  );
}

// ===== 3. КАЛЬКУЛЯТОР ОЦЕНКИ ЗА ЧЕТВЕРТЬ =====
function QuarterCalculator() {
  const [grades, setGrades] = useState([{ value: '' }]);
  const [desiredGrade, setDesiredGrade] = useState('');

  const addGrade = () => {
    setGrades([...grades, { value: '' }]);
    triggerHaptic('light');
  };
  const removeGrade = (index: number) => setGrades(grades.filter((_, i) => i !== index));

  const calculate = () => {
    const validGrades = grades.filter(g => g.value);
    if (validGrades.length === 0) return { average: '0.00', needed: null };
    const sum = validGrades.reduce((acc, g) => acc + parseFloat(g.value), 0);
    const average = sum / validGrades.length;
    
    let needed: number | null = null;
    if (desiredGrade) {
      const desired = parseFloat(desiredGrade);
      needed = (desired * (validGrades.length + 1) - sum);
    }
    return { average: average.toFixed(2), needed };
  };

  const result = calculate();

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">Оценка за четверть</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Покажет, что нужно получить на следующей работе для желаемого балла</p>
      <div className="space-y-2 mb-4">
        {grades.map((grade, index) => (
          <div key={index} className="flex gap-2 items-center bg-purple-50 p-2 rounded-lg">
            <span className="text-gray-500 text-xs w-6">#{index + 1}</span>
            <input
              type="number" min="1" max="5" step="0.1"
              value={grade.value}
              onChange={(e) => {
                const newGrades = [...grades];
                newGrades[index].value = e.target.value;
                setGrades(newGrades);
              }}
              placeholder="Оценка (1-5)"
              className="flex-1 px-2 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
            <button onClick={() => removeGrade(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addGrade}
        className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-sm mb-4"
      >
        <Plus className="w-4 h-4" /> Добавить оценку
      </button>
      <div className="bg-blue-50 p-3 rounded-xl mb-4">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Желаемая оценка за четверть:</label>
        <input
          type="number" min="1" max="5" step="0.1" value={desiredGrade}
          onChange={(e) => setDesiredGrade(e.target.value)}
          placeholder="Например: 4.5"
          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-3 rounded-xl text-center">
          <p className="text-xs text-purple-100 mb-1">Текущий балл:</p>
          <p className="text-2xl font-bold">{result.average}</p>
        </div>
        {result.needed !== null && (
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-3 rounded-xl text-center">
            <p className="text-xs text-green-100 mb-1">Нужно получить:</p>
            <p className="text-2xl font-bold">{result.needed > 0 ? result.needed.toFixed(1) : '✓'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 4. КАЛЬКУЛЯТОР ОЦЕНКИ ЗА ТЕСТ =====
function TestCalculator() {
  const [totalQuestions, setTotalQuestions] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState('');

  const calculate = () => {
    if (!totalQuestions || !correctAnswers) return null;
    const total = parseInt(totalQuestions);
    const correct = parseInt(correctAnswers);
    if (total === 0) return null;
    const percentage = (correct / total) * 100;
    let grade = 2;
    if (percentage >= 90) grade = 5;
    else if (percentage >= 75) grade = 4;
    else if (percentage >= 60) grade = 3;
    return { percentage: percentage.toFixed(1), grade, correct, total };
  };

  const result = calculate();

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">Оценка за тест</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Шкала: 5 (90-100%), 4 (75-89%), 3 (60-74%), 2 (0-59%)</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Всего вопросов:</label>
          <input
            type="number" min="1" value={totalQuestions}
            onChange={(e) => setTotalQuestions(e.target.value)}
            placeholder="Например: 20"
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Правильных ответов:</label>
          <input
            type="number" min="0" value={correctAnswers}
            onChange={(e) => setCorrectAnswers(e.target.value)}
            placeholder="Например: 16"
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>
      </div>
      {result && (
        <div className="mt-4 space-y-3">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 rounded-xl text-center">
            <p className="text-sm text-purple-100 mb-1">Оценка:</p>
            <p className="text-5xl font-bold">{result.grade}</p>
            <p className="text-lg mt-1">{result.percentage}%</p>
            <p className="text-xs mt-1">{result.correct} из {result.total}</p>
          </div>
          <div className="bg-gray-100 rounded-full h-3">
            <div className="bg-purple-600 h-3 rounded-full transition-all" style={{ width: `${result.percentage}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 5. КАЛЬКУЛЯТОР КАЧЕСТВА ЗНАНИЙ =====
function QualityCalculator() {
  const [counts, setCounts] = useState({ '5': 0, '4': 0, '3': 0, '2': 0 });

  const handleChange = (grade: keyof typeof counts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [grade]: Math.max(0, num) }));
    triggerHaptic('light');
  };

  const total = counts['5'] + counts['4'] + counts['3'] + counts['2'];
  const quality = total > 0 ? (((counts['5'] + counts['4']) / total) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">Качество знаний</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Укажите количество учащихся, получивших каждую оценку</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[5, 4, 3, 2].map((grade) => (
          <div key={grade} className="text-center">
            <label className="block text-xs font-semibold text-gray-600 mb-1">«{grade}»</label>
            <input
              type="number"
              min="0"
              value={counts[grade.toString() as keyof typeof counts]}
              onChange={(e) => handleChange(grade.toString() as keyof typeof counts, e.target.value)}
              className="w-full px-2 py-3 border border-purple-200 rounded-xl text-center text-lg font-bold text-purple-700 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="bg-purple-50 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-600 text-center mb-1">Всего учащихся в списке:</p>
        <p className="text-2xl font-bold text-purple-700 text-center">{total}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-yellow-400 text-white p-3 rounded-xl text-center">
          <p className="text-xs mb-1 font-medium">«5»:</p>
          <p className="text-2xl font-bold">{counts['5']}</p>
        </div>
        <div className="bg-blue-500 text-white p-3 rounded-xl text-center">
          <p className="text-xs mb-1 font-medium">«4»:</p>
          <p className="text-2xl font-bold">{counts['4']}</p>
        </div>
        <div className="bg-green-500 text-white p-3 rounded-xl text-center">
          <p className="text-xs mb-1 font-medium">Качество:</p>
          <p className="text-2xl font-bold">{quality}%</p>
        </div>
      </div>
    </div>
  );
}

// ===== 6. КАЛЬКУЛЯТОР СОУ =====
function SOUCalculator() {
  const [counts, setCounts] = useState({ '5': 0, '4': 0, '3': 0, '2': 0 });

  const handleChange = (grade: keyof typeof counts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [grade]: Math.max(0, num) }));
    triggerHaptic('light');
  };

  const total = counts['5'] + counts['4'] + counts['3'] + counts['2'];
  const passed = counts['5'] + counts['4'] + counts['3'];
  const sou = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <h2 className="text-lg font-bold text-purple-700 mb-3">СОУ (степень обученности)</h2>
      <p className="text-xs text-gray-600 mb-4">💡 Укажите количество учащихся, получивших каждую оценку</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[5, 4, 3, 2].map((grade) => (
          <div key={grade} className="text-center">
            <label className="block text-xs font-semibold text-gray-600 mb-1">«{grade}»</label>
            <input
              type="number"
              min="0"
              value={counts[grade.toString() as keyof typeof counts]}
              onChange={(e) => handleChange(grade.toString() as keyof typeof counts, e.target.value)}
              className="w-full px-2 py-3 border border-purple-200 rounded-xl text-center text-lg font-bold text-purple-700 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="bg-purple-50 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-600 text-center mb-1">Всего учащихся в списке:</p>
        <p className="text-2xl font-bold text-purple-700 text-center">{total}</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-5 rounded-xl text-center">
        <p className="text-sm text-purple-100 mb-1">Усвоили программу (3, 4, 5): {passed} чел.</p>
        <p className="text-sm text-purple-100 mb-2">СОУ (степень обученности):</p>
        <p className="text-5xl font-bold">{sou}%</p>
      </div>
    </div>
  );
}

// ===== 🆕 УЛУЧШЕННЫЙ FAQ с анимированными стрелками и дополненными вопросами =====
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Как считается средний балл?',
      a: 'Средний балл = сумма (оценка × вес) ÷ сумма весов. Пустые оценки не учитываются. Например: «5» с весом 100 и «3» с весом 50 → (5×100 + 3×50) / 150 = 4.33.',
    },
    {
      q: 'Что такое вес оценки?',
      a: 'Вес показывает значимость оценки. Стандартно: контрольная работа = 100%, самостоятельная = 75%, домашняя = 50%, ответ на уроке = 25%. В электронных журналах (МЭШ, РЭШ, Дневник.ру) веса настраиваются учителем.',
    },
    {
      q: 'Что такое СОУ и чем отличается от качества знаний?',
      a: 'СОУ (степень обученности) — доля учащихся с оценками 3, 4, 5 от общего числа (то есть всех, кто усвоил программу). Качество знаний — доля только отличников и хорошистов (4 и 5). Например: из 25 учеников 5 получили «2» → СОУ = 80%, а качество = 60%.',
    },
    {
      q: 'Как считается качество знаний?',
      a: 'Качество знаний = (кол-во «4» + «5») ÷ (общее кол-во учащихся) × 100%. «Двойки» в числителе не учитываются, но участвуют в знаменателе. Это основной показатель работы учителя при аттестации.',
    },
    {
      q: 'Как округляются оценки в четверти?',
      a: 'Калькулятор показывает точное математическое значение. В реальности школы используют спорные случаи: обычно 3.50 округляется до «4», 4.50 — до «5», но правила могут отличаться. Учитывайте локальный акт школы.',
    },
    {
      q: 'Почему результат отличается от журнала?',
      a: 'Школы используют разные правила оценивания: где-то веса, где-то простое среднее, где-то медиана. Электронные журналы могут учитывать последнюю оценку сильнее. Калькулятор даёт ориентир по стандартной формуле.',
    },
    {
      q: 'Можно ли использовать для ЕГЭ и ОГЭ?',
      a: 'Калькулятор «Оценка за тест» подходит для любых тестов с процентной шкалой. Стандартная шкала: 90-100% = «5», 75-89% = «4», 60-74% = «3», 0-59% = «2». Для итоговых экзаменов шкалы перевода баллов отличаются — используйте официальные таблицы ФИПИ.',
    },
    {
      q: 'Как применять на практике?',
      a: 'Сценарий 1: перед родительским собранием быстро рассчитайте СОУ и качество по классу. Сценарий 2: покажите ученику, какую оценку нужно получить на следующей работе для «5» в четверти. Сценарий 3: для отчёта завучу — экспортируйте показатели качества знаний по параллели.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
        <HelpCircle className="w-5 h-5" />
        Частые вопросы
      </h2>
      <div className="space-y-2">
        {faqs.map((faq, index) => (
          <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === index && (
              <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
