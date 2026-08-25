import { useEffect, useState, useCallback } from 'react';
import type { LessonTemplate } from '@/types';
import { presetTemplates } from '@/data/templates';
import { loadCustomTemplates, saveCustomTemplates } from '@/lib/storage';
import TemplateList from '@/components/TemplateList';
import ActiveTimer from '@/components/ActiveTimer';
import CreateTemplateModal from '@/components/CreateTemplateModal';
import EditTemplateModal from '@/components/EditTemplateModal';
import HomeScreen from '@/components/HomeScreen';
import GeneratorScreen from '@/components/GeneratorScreen';
import NoiseMonitorScreen from '@/components/NoiseMonitorScreen';
import FlashcardsScreen from '@/components/FlashcardsScreen';
import StudyScreen from '@/components/StudyScreen';
import QuizScreen from '@/components/QuizScreen';
import WordSearchScreen from '@/components/WordSearchScreen';
import ManualScreen from '@/components/ManualScreen';
import CalculatorsScreen from '@/components/CalculatorsScreen';
import BingoGeneratorScreen from '@/components/BingoGeneratorScreen';
import EduGameScreen from '@/components/EduGameScreen';
import TapperScreen from '@/components/TapperScreen';
import PomodoroScreen from '@/components/PomodoroScreen';
import TarsiaScreen from '@/components/TarsiaScreen';

type Route = 
  | 'home' 
  | 'timer' 
  | 'generator' 
  | 'noise' 
  | 'flashcards' 
  | 'study' 
  | 'quiz' 
  | 'wordsearch' 
  | 'manual' 
  | 'calculators' 
  | 'bingo' 
  | 'edugame'
  | 'activity'
  | 'pomodoro'
  | 'tarsia';

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [customTemplates, setCustomTemplates] = useState<LessonTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<LessonTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LessonTemplate | null>(null);
  
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [quizDeckId, setQuizDeckId] = useState<string | null>(null);

  const [flashcardsState, setFlashcardsState] = useState<{
    scrollPosition: number;
    filter: string;
    searchQuery: string;
  } | null>(null);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  // ==== НАВИГАЦИЯ С ПОДДЕРЖКОЙ ИСТОРИИ ====

  // Функция перехода вперёд: добавляет запись в историю
  const navigate = useCallback((newRoute: Route) => {
    setRoute(prevRoute => {
      if (prevRoute === newRoute) return prevRoute;
      // Добавляем запись в историю браузера
      window.history.pushState({ route: newRoute }, '');
      // Сбрасываем временные состояния при уходе с соответствующих экранов
      if (newRoute !== 'study' && newRoute !== 'quiz') {
        setStudyDeckId(null);
        setQuizDeckId(null);
      }
      return newRoute;
    });
  }, []);

  // Функция возврата: использует history.back()
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  // Обработчик системной кнопки "Назад"
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { route?: Route } | null;
      if (state && state.route) {
        setRoute(state.route);
        // Сбрасываем временные состояния, если вернулись не на study/quiz
        if (state.route !== 'study' && state.route !== 'quiz') {
          setStudyDeckId(null);
          setQuizDeckId(null);
        }
      } else {
        // Если истории нет, остаёмся на текущем экране (или можно выйти)
        // В VK Mini Apps выход происходит автоматически при достижении пустой истории
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSaveCustom = (template: LessonTemplate) => {
    setCustomTemplates((prev) => {
      const next = [...prev, template];
      saveCustomTemplates(next);
      return next;
    });
    setShowCreate(false);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveCustomTemplates(next);
      return next;
    });
  };

  const handleEditSave = (edited: LessonTemplate) => {
    const isPreset = edited.id.startsWith('preset-');
    if (isPreset) {
      const newTemplate: LessonTemplate = {
        ...edited,
        id: `custom-${Date.now()}`,
        custom: true,
      };
      setCustomTemplates((prev) => {
        const next = [...prev, newTemplate];
        saveCustomTemplates(next);
        return next;
      });
    } else {
      setCustomTemplates((prev) => {
        const next = prev.map((t) => (t.id === edited.id ? { ...edited, custom: true } : t));
        saveCustomTemplates(next);
        return next;
      });
    }
    setEditingTemplate(null);
  };

  const allTemplates = [...presetTemplates, ...customTemplates];

  // ==== РЕНДЕР ЭКРАНОВ ====

  // Активный таймер
  if (activeTemplate) {
    return (
      <ActiveTimer
        key={activeTemplate.id}
        template={activeTemplate}
        onReset={() => setActiveTemplate(null)}
      />
    );
  }

  // Специальная обработка для экранов Study и Quiz
  if (route === 'study' && studyDeckId) {
    return (
      <StudyScreen 
        deckId={studyDeckId} 
        onBack={goBack} 
      />
    );
  }

  if (route === 'quiz' && quizDeckId) {
    return (
      <QuizScreen 
        deckId={quizDeckId} 
        onBack={goBack} 
      />
    );
  }

  // Обработка случая, когда маршрут study/quiz, но deckId отсутствует
  if (route === 'study' || route === 'quiz') {
    // Возвращаем на flashcards (или home, если нужно)
    return (
      <FlashcardsScreen
        onBack={goBack}
        onStudy={(deckId: string) => { 
          setStudyDeckId(deckId); 
          navigate('study'); 
        }}
        onQuiz={(deckId: string) => { 
          setQuizDeckId(deckId); 
          navigate('quiz'); 
        }}
        initialState={flashcardsState}
        onStateChange={setFlashcardsState}
      />
    );
  }

  // Основные маршруты
  switch (route) {
    case 'home':
      return <HomeScreen onNavigate={navigate} />;
    case 'generator':
      return <GeneratorScreen onBack={goBack} />;
    case 'noise':
      return <NoiseMonitorScreen onBack={goBack} />;
    case 'flashcards':
      return (
        <FlashcardsScreen
          onBack={goBack}
          onStudy={(deckId: string) => { 
            setStudyDeckId(deckId); 
            navigate('study'); 
          }}
          onQuiz={(deckId: string) => { 
            setQuizDeckId(deckId); 
            navigate('quiz'); 
          }}
          initialState={flashcardsState}
          onStateChange={setFlashcardsState}
        />
      );
    case 'wordsearch':
      return <WordSearchScreen onBack={goBack} />;
    case 'manual':
      return <ManualScreen onBack={goBack} />;
    case 'calculators':
      return <CalculatorsScreen onBack={goBack} />;
    case 'bingo':
      return <BingoGeneratorScreen onBack={goBack} />;
    case 'edugame':
      return <EduGameScreen onBack={goBack} />;
    case 'activity':
      return <TapperScreen onBack={goBack} />;
    case 'pomodoro':
      return <PomodoroScreen onBack={goBack} />;
    case 'tarsia':
      return <TarsiaScreen onBack={goBack} />;
    case 'timer':
      // Если route 'timer' без активного шаблона, показываем список шаблонов
      return (
        <>
          <div className="animate-fadeIn">
            <TemplateList
              templates={allTemplates}
              onSelect={setActiveTemplate}
              onCreate={() => setShowCreate(true)}
              onDelete={handleDeleteCustom}
              onEdit={setEditingTemplate}
              onBack={goBack}
            />
          </div>
          {showCreate && (
            <CreateTemplateModal onClose={() => setShowCreate(false)} onSave={handleSaveCustom} />
          )}
          {editingTemplate && (
            <EditTemplateModal
              template={editingTemplate}
              onClose={() => setEditingTemplate(null)}
              onSave={handleEditSave}
            />
          )}
        </>
      );
    default:
      return <HomeScreen onNavigate={navigate} />;
  }
}
