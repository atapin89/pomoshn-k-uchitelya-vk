import { useState, useEffect } from 'react';
import { Check, X, ArrowRight, Shuffle } from 'lucide-react';
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

export default function QuizScreen({ deckId, onBack }: QuizScreenProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
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

  useEffect(() => {
    const allDecks = loadDecks();
    const foundDeck = allDecks.find((d) => d.id === deckId);
    if (foundDeck && foundDeck.cards.length >= 2) {
      setDeck(foundDeck);
    }
  }, [deckId]);

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

  // ЭКРАН ВЫБОРА ТИПА ТЕСТА
  if (!quizType && deck) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-5 py-4">
            <BackButton onClick={onBack} variant="light" />
            <h1 className="text-xl font-bold text-white mt-3">Настройка теста</h1>
            <p className="text-white/70 text-sm">{deck.title}</p>
          </div>
        </header>
        <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col gap-4">
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
        </main>
      </div>
    );
  }

  // ЭКРАН ЗАВЕРШЕНИЯ
  if (quizComplete) {
    const total = quizType === 'assign' ? assignPairs.length : quizQuestions.length;
    const percentage = Math.round((score / total) * 100);
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-5 py-4">
            <BackButton onClick={onBack} variant="light" />
          </div>
        </header>
        <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col items-center justify-center text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl w-full">
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

  // РЕЖИМ ASSIGN (СООТВЕТСТВИЕ)
  if (quizType === 'assign') {
    const shuffledRights = [...assignPairs].sort(() => Math.random() - 0.5);
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-5 py-4">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex items-center justify-between mt-3">
              <h1 className="text-lg font-bold text-white">Соответствие</h1>
              <span className="text-white/80 text-sm font-semibold">
                {matchedPairs.length} / {assignPairs.length}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-md mx-auto w-full px-5 py-6">
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

  // РЕЖИМЫ CHOICE И TEXT
  const question = quizQuestions[currentQuestion];

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex items-center justify-between mt-3">
            <h1 className="text-lg font-bold text-white">{deck?.title}</h1>
            <span className="text-white/80 text-sm font-semibold">
              {currentQuestion + 1} / {quizQuestions.length}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col gap-6">
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
