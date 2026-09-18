import { useState } from 'react';
import { Check, X, ArrowRight, Shuffle, Settings, Award, Link, Target, HelpCircle, ChevronDown } from 'lucide-react';
import type { Deck } from '@/types';
import { loadDecks } from '@/lib/storage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface QuizScreenProps {
  deckId: string;
  onBack: () => void;
}

type QuizType = 'assign' | 'choice' | 'text' | null;

interface Question {
  question: string;
  correct: string;
  options: string[];
}

interface AssignPair {
  id: string;
  left: string;
  right: string;
}

const FAQ_ITEMS = [
  {
    q: 'Как работает тест с выбором ответа?',
    a: 'Для каждого вопроса показываются 4 варианта ответа — один правильный и три случайных из других карточек колоды. Нажмите на правильный вариант. После выбора ответа правильный подсвечивается зелёным, неправильный — красным. Нажмите «Далее» для перехода к следующему вопросу.',
  },
  {
    q: 'Как оценивается ввод текста?',
    a: 'Ответ проверяется по вхождению: если ваш текст содержит правильный ответ (без учёта регистра и пробелов), он считается верным. Например, если ответ «Париж», подойдут «париж», «г. Париж», «Париж — столица». Это удобно для проверки терминов и понятий.',
  },
  {
    q: 'Как работает режим «Соответствие»?',
    a: 'Слева — вопросы (сторона 1 карточек), справа — перемешанные ответы (сторона 2). Нажмите на элемент слева, затем на соответствующий ему справа. Правильные пары подсвечиваются зелёным и исчезают из игры. Тест завершается, когда все пары найдены.',
  },
  {
    q: 'Как выбрать количество вопросов?',
    a: 'На экране настройки переместите ползунок «Количество вопросов» — от 2 до 20 (или меньше, если в колоде меньше карточек). Для быстрой разминки на уроке достаточно 5–7 вопросов, для контрольной проверки — 15–20.',
  },
  {
    q: 'Можно ли пройти тест несколько раз?',
    a: 'Да! После завершения теста нажмите «Пройти ещё раз» — вопросы перемешаются заново, и вы сможете улучшить результат. Это полезно для закрепления материала: каждый проход тренирует память с новым порядком карточек.',
  },
  {
    q: 'Как использовать тест с классом?',
    a: 'Сценарий 1: выводите колоду на проектор, весь класс выбирает ответ голосованием (поднятие рук). Сценарий 2: ученики проходят тест индивидуально на планшетах. Сценарий 3: командная игра — один представитель команды отвечает за всех. Сценарий 4: парная работа — один читает вопрос, другой отвечает.',
  },
];

export default function QuizScreen({ deckId, onBack }: QuizScreenProps) {
  const [deck, setDeck] = useState<Deck | null>(() => {
    try {
      if (deckId === 'mistakes-temp') {
        const tempData = localStorage.getItem('temp_study_deck');
        if (tempData) return JSON.parse(tempData) as Deck;
        return null;
      }
      const allDecks = loadDecks();
      const found = allDecks.find((d) => d.id === deckId) || null;
      return found && found.cards.length >= 2 ? found : null;
    } catch {
      return null;
    }
  });
  const [quizType, setQuizType] = useState<QuizType>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [assignPairs, setAssignPairs] = useState<AssignPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const generateQuestions = (type: QuizType): Question[] => {
    if (!deck) return [];
    const cards = [...deck.cards].sort(() => Math.random() - 0.5).slice(0, questionCount);
    return cards.map((card) => {
      const correct = card.sides[1] || '';
      const wrongOptions = deck.cards
        .filter((c) => c.id !== card.id && (c.sides[1] || '').trim() !== '')
        .map((c) => c.sides[1] || '')
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [...wrongOptions, correct].sort(() => Math.random() - 0.5);
      return { question: card.sides[0] || '', correct, options };
    });
  };

  const generateAssignPairs = () => {
    if (!deck) return;
    const cards = [...deck.cards].sort(() => Math.random() - 0.5).slice(0, Math.min(questionCount, 6));
    const pairs: AssignPair[] = cards.map((card) => ({
      id: card.id,
      left: card.sides[0] || '',
      right: card.sides[1] || '',
    }));
    setAssignPairs(pairs);
  };

  const startQuiz = (type: QuizType) => {
    if (!deck) return;
    triggerHaptic('medium');
    setQuizType(type);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setTextAnswer('');
    setShowResult(false);
    setQuizComplete(false);
    setMatchedPairs([]);
    setSelectedLeft(null);

    if (type === 'assign') {
      generateAssignPairs();
    } else {
      setQuizQuestions(generateQuestions(type));
    }
  };

  const handleChoiceAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === quizQuestions[currentQuestion].correct;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      triggerHaptic('heavy');
    } else {
      triggerHaptic('medium');
    }
    setShowResult(true);
  };

  const handleTextSubmit = () => {
    if (!textAnswer.trim()) return;
    const correct = quizQuestions[currentQuestion].correct;
    const isCorrect = textAnswer.toLowerCase().trim().includes(correct.toLowerCase().trim());
    if (isCorrect) {
      setScore((prev) => prev + 1);
      triggerHaptic('heavy');
    } else {
      triggerHaptic('medium');
    }
    setShowResult(true);
  };

  const handleAssignClick = (side: 'left' | 'right', id: string) => {
    if (side === 'left') {
      setSelectedLeft(id);
      triggerHaptic('light');
    } else if (side === 'right' && selectedLeft) {
      const pair = assignPairs.find(p => p.id === selectedLeft);
      if (pair && pair.right === assignPairs.find(p => p.id === id)?.right) {
        setMatchedPairs([...matchedPairs, selectedLeft]);
        setScore((prev) => prev + 1);
        triggerHaptic('heavy');
      } else {
        triggerHaptic('medium');
      }
      setSelectedLeft(null);

      if (matchedPairs.length + 1 === assignPairs.length) {
        setTimeout(() => setQuizComplete(true), 500);
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  // Защита: колода не найдена — показываем экран с кнопкой назад
  if (!deck) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col items-center justify-center p-6">
        <p className="text-purple-700 text-lg font-semibold mb-4">Колода не найдена</p>
        <button onClick={onBack} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold">
          Назад
        </button>
      </div>
    );
  }

  // 🆕 ЭКРАН ВЫБОРА ТИПА ТЕСТА
  if (!quizType) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Настройка теста</h1>
            </div>
            <Settings className="w-6 h-6 text-white/70 shrink-0" />
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
          {/* 🆕 Информационная плашка с названием колоды */}
          <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Колода</p>
              <p className="text-sm font-bold text-purple-700 truncate">{deck.title}</p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-semibold text-purple-700 mb-2">
              Количество вопросов: {questionCount}
            </label>
            <input
              type="range"
              min="2"
              max={Math.min(20, deck.cards.length)}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <button
            onClick={() => startQuiz('choice')}
            className="w-full bg-white border-2 border-purple-200 rounded-2xl p-5 text-left active:scale-95 transition-transform"
          >
            <h3 className="text-lg font-bold text-purple-700 mb-1">Выбор ответа</h3>
            <p className="text-sm text-gray-600">4 варианта ответа, выберите правильный</p>
          </button>
          <button
            onClick={() => startQuiz('text')}
            className="w-full bg-white border-2 border-purple-200 rounded-2xl p-5 text-left active:scale-95 transition-transform"
          >
            <h3 className="text-lg font-bold text-purple-700 mb-1">Ввод текста</h3>
            <p className="text-sm text-gray-600">Введите ответ с клавиатуры</p>
          </button>
          <button
            onClick={() => startQuiz('assign')}
            disabled={deck.cards.length < 2}
            className="w-full bg-white border-2 border-purple-200 rounded-2xl p-5 text-left active:scale-95 transition-transform disabled:opacity-50"
          >
            <h3 className="text-lg font-bold text-purple-700 mb-1">Соответствие</h3>
            <p className="text-sm text-gray-600">Соедините пары понятий</p>
          </button>

          {/* 🆕 FAQ секция */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Частые вопросы
            </h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                      <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 🆕 ЭКРАН ЗАВЕРШЕНИЯ
  if (quizComplete) {
    const total = quizType === 'assign' ? assignPairs.length : quizQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Результаты</h1>
            </div>
            <Award className="w-6 h-6 text-white/70 shrink-0" />
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 pb-8 flex flex-col items-center justify-center text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-md">
            <h2 className="text-3xl font-bold text-purple-700 mb-2">Тест завершен!</h2>
            <p className="text-gray-600 mb-6">{deck?.title}</p>

            <div className="bg-purple-50 rounded-2xl p-6 mb-6">
              <div className="text-5xl font-bold text-purple-600 mb-2">{percentage}%</div>
              <div className="text-gray-600">
                Правильно: {score} из {total}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startQuiz(quizType)}
                className="bg-purple-100 text-purple-700 py-3 rounded-xl font-semibold"
              >
                Пройти еще раз
              </button>
              <button
                onClick={onBack}
                className="bg-purple-600 text-white py-3 rounded-xl font-semibold"
              >
                К колодам
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 🆕 РЕЖИМ ASSIGN (СООТВЕТСТВИЕ)
  if (quizType === 'assign') {
    const shuffledRights = [...assignPairs].sort(() => Math.random() - 0.5);
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Соответствие</h1>
            </div>
            <Link className="w-6 h-6 text-white/70 shrink-0" />
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
          {/* 🆕 Плашка со счётчиком пар */}
          <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Колода</p>
              <p className="text-sm font-bold text-purple-700 truncate">{deck?.title}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-500">Совпало</p>
              <p className="text-sm font-bold text-purple-700">
                {matchedPairs.length} / {assignPairs.length}
              </p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Link className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {assignPairs.map((pair) => {
                const isMatched = matchedPairs.includes(pair.id);
                const isSelected = selectedLeft === pair.id;
                return (
                  <button
                    key={pair.id}
                    onClick={() => !isMatched && handleAssignClick('left', pair.id)}
                    disabled={isMatched}
                    className={`w-full p-3 rounded-xl text-sm font-semibold transition-all min-h-16 ${
                      isMatched
                        ? 'bg-green-100 border-2 border-green-500 text-green-700 opacity-50'
                        : isSelected
                        ? 'bg-purple-600 text-white border-2 border-purple-600'
                        : 'bg-white border-2 border-purple-200 text-purple-900'
                    }`}
                  >
                    {pair.left}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              {shuffledRights.map((pair) => {
                const isMatched = matchedPairs.includes(pair.id);
                return (
                  <button
                    key={pair.id}
                    onClick={() => !isMatched && handleAssignClick('right', pair.id)}
                    disabled={isMatched}
                    className={`w-full p-3 rounded-xl text-sm font-semibold transition-all min-h-16 ${
                      isMatched
                        ? 'bg-green-100 border-2 border-green-500 text-green-700 opacity-50'
                        : 'bg-white border-2 border-purple-200 text-purple-900'
                    }`}
                  >
                    {pair.right}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Нажми на элемент слева, затем на соответствующий справа
          </p>
        </main>
      </div>
    );
  }

  // 🆕 РЕЖИМЫ CHOICE И TEXT
  const question = quizQuestions[currentQuestion];

  if (!question) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col items-center justify-center p-6">
        <p className="text-purple-700 text-lg font-semibold mb-4">Нет доступных вопросов</p>
        <button onClick={onBack} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold">
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Вопросы</h1>
          </div>
          <Target className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* 🆕 Плашка с названием колоды и номером вопроса */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Колода</p>
            <p className="text-sm font-bold text-purple-700 truncate">{deck?.title}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-500">Вопрос</p>
            <p className="text-sm font-bold text-purple-700">
              {currentQuestion + 1} / {quizQuestions.length}
            </p>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Вопрос:</p>
          <p className="text-xl font-bold text-purple-900">{question.question}</p>
        </div>

        {quizType === 'choice' && (
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              let bgClass = 'bg-white border-2 border-purple-200';
              if (showResult) {
                if (option === question.correct) {
                  bgClass = 'bg-green-100 border-2 border-green-500';
                } else if (option === selectedAnswer && option !== question.correct) {
                  bgClass = 'bg-red-100 border-2 border-red-500';
                }
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleChoiceAnswer(option)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl text-left font-semibold transition-all ${bgClass} ${!showResult ? 'active:scale-95' : ''}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {quizType === 'text' && (
          <div className="space-y-4">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !showResult && handleTextSubmit()}
              placeholder="Введите ответ..."
              disabled={showResult}
              className="w-full p-4 rounded-xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 text-lg"
            />
            {!showResult && (
              <button
                onClick={handleTextSubmit}
                className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg"
              >
                Проверить
              </button>
            )}
            {showResult && (
              <div className={`p-4 rounded-xl ${
                textAnswer.toLowerCase().trim().includes(question.correct.toLowerCase().trim())
                  ? 'bg-green-100 border-2 border-green-500'
                  : 'bg-red-100 border-2 border-red-500'
              }`}>
                <p className="font-bold mb-1">
                  {textAnswer.toLowerCase().trim().includes(question.correct.toLowerCase().trim())
                    ? '✓ Правильно!'
                    : '✗ Неправильно'}
                </p>
                <p className="text-sm">Правильный ответ: {question.correct}</p>
              </div>
            )}
          </div>
        )}

        {showResult && quizType !== 'text' && (
          <button
            onClick={nextQuestion}
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Далее <ArrowRight size={20} />
          </button>
        )}
      </main>
    </div>
  );
}
