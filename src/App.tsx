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
  | 'tapper';

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [customTemplates, setCustomTemplates] = useState<LessonTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<LessonTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LessonTemplate | null>(null);
  
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [quizDeckId, setQuizDeckId] = useState<string | null>(null);

  // Состояние для сохранения позиции Flashcards
  const [flashcardsState, setFlashcardsState] = useState<{
    scrollPosition: number;
    filter: string;
    searchQuery: string;
  } | null>(null);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  // Очистка ID при уходе на главный экран
  const navigateHome = useCallback(() => {
    setStudyDeckId(null);
    setQuizDeckId(null);
    setActiveTemplate(null);
    setRoute('home');
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

  // Словарь маршрутов
  const routes: Record<Route, React.ReactNode> = {
    home: <HomeScreen onNavigate={setRoute} />,
    generator: <GeneratorScreen onBack={navigateHome} />,
    noise: <NoiseMonitorScreen onBack={navigateHome} />,
    flashcards: (
      <FlashcardsScreen
        onBack={navigateHome}
        onStudy={(deckId: string) => { 
          setStudyDeckId(deckId); 
          setRoute('study'); 
        }}
        onQuiz={(deckId: string) => { 
          setQuizDeckId(deckId); 
          setRoute('quiz'); 
        }}
        initialState={flashcardsState}
        onStateChange={setFlashcardsState}
      />
    ),
    study: studyDeckId ? (
      <StudyScreen 
        deckId={studyDeckId} 
        onBack={() => setRoute('flashcards')} 
      />
    ) : null,
    quiz: quizDeckId ? (
      <QuizScreen 
        deckId={quizDeckId} 
        onBack={() => setRoute('flashcards')} 
      />
    ) : null,
    wordsearch: <WordSearchScreen onBack={navigateHome} />,
    manual: <ManualScreen onBack={navigateHome} />,
    calculators: <CalculatorsScreen onBack={navigateHome} />,
    bingo: <BingoGeneratorScreen onBack={navigateHome} />,
    edugame: <EduGameScreen onBack={navigateHome} />,
    tapper: <TapperScreen onBack={navigateHome} />,
    timer: null, // Обрабатывается отдельно
  };

  // Обработка таймера
  if (activeTemplate) {
    return (
      <ActiveTimer
        key={activeTemplate.id}
        template={activeTemplate}
        onReset={() => setActiveTemplate(null)}
      />
    );
  }

  // Если маршрут study/quiz, но нет deckId — возврат на flashcards
  if (route === 'study' && !studyDeckId) {
    return <FlashcardsScreen
      onBack={navigateHome}
      onStudy={(deckId: string) => { setStudyDeckId(deckId); setRoute('study'); }}
      onQuiz={(deckId: string) => { setQuizDeckId(deckId); setRoute('quiz'); }}
      initialState={flashcardsState}
      onStateChange={setFlashcardsState}
    />;
  }

  if (route === 'quiz' && !quizDeckId) {
    return <FlashcardsScreen
      onBack={navigateHome}
      onStudy={(deckId: string) => { setStudyDeckId(deckId); setRoute('study'); }}
      onQuiz={(deckId: string) => { setQuizDeckId(deckId); setRoute('quiz'); }}
      initialState={flashcardsState}
      onStateChange={setFlashcardsState}
    />;
  }

  // Рендер выбранного маршрута
  const currentRoute = routes[route];
  if (currentRoute !== null) {
    return <div className="animate-fadeIn">{currentRoute}</div>;
  }

  // По умолчанию — список таймеров
  return (
    <>
      <div className="animate-fadeIn">
        <TemplateList
          templates={allTemplates}
          onSelect={setActiveTemplate}
          onCreate={() => setShowCreate(true)}
          onDelete={handleDeleteCustom}
          onEdit={setEditingTemplate}
          onBack={navigateHome}
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
}
