import { useEffect, useState, useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';
import type { LessonTemplate } from '@/types';
import { presetTemplates } from '@/data/templates';
import { loadCustomTemplates, saveCustomTemplates } from '@/lib/storage';
import { fullSync } from '@/lib/sync';
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
import DiceMakerScreen from '@/components/DiceMakerScreen';
import EquipmentScreen from '@/components/EquipmentScreen';
import TeleprompterScreen from '@/components/TeleprompterScreen';
import WordCloudScreen from '@/components/WordCloudScreen';
import GraphDictationScreen from '@/components/GraphDictationScreen';
import LifeBalanceScreen from '@/components/LifeBalanceScreen';
import QRCodeScreen from '@/components/QRCodeScreen';
import BibliographyScreen from '@/components/BibliographyScreen';
import VisualScheduleScreen from '@/components/VisualScheduleScreen';
import TournamentScreen from '@/components/TournamentScreen';
import CardMakerScreen from '@/components/CardMakerScreen';
import PosterMakerScreen from '@/components/PosterMakerScreen'; // 🆕
import { AuthProvider } from '@/contexts/AuthContext';

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
  | 'dice'
  | 'equipment'
  | 'teleprompter'
  | 'wordcloud'
  | 'graphdictation'
  | 'lifebalance'
  | 'qrcode'
  | 'bibliography'
  | 'visualschedule'
  | 'tournament'
  | 'cardmaker'
  | 'postermaker'; // 🆕

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
    const init = async () => {
      try {
        await bridge.send('VKWebAppInit');
        console.log('✅ VK Bridge initialized');
      } catch (err) {
        console.warn('⚠️ VK Bridge init failed (возможно, вне VK):', err);
      }

      await fullSync();
      setCustomTemplates(loadCustomTemplates());
    };
    void init();
  }, []);

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
    study: studyDeckId ? <StudyScreen deckId={studyDeckId} onBack={() => setRoute('flashcards')} /> : null,
    quiz: quizDeckId ? <QuizScreen deckId={quizDeckId} onBack={() => setRoute('flashcards')} /> : null,
    wordsearch: <WordSearchScreen onBack={navigateHome} />,
    manual: <ManualScreen onBack={navigateHome} />,
    calculators: <CalculatorsScreen onBack={navigateHome} />,
    bingo: <BingoGeneratorScreen onBack={navigateHome} />,
    edugame: <EduGameScreen onBack={navigateHome} />,
    activity: <TapperScreen onBack={navigateHome} />,
    pomodoro: <PomodoroScreen onBack={navigateHome} />,
    dice: <DiceMakerScreen onBack={navigateHome} />,
    equipment: <EquipmentScreen onBack={navigateHome} />,
    teleprompter: <TeleprompterScreen onBack={navigateHome} />,
    wordcloud: <WordCloudScreen onBack={navigateHome} />,
    graphdictation: <GraphDictationScreen onBack={navigateHome} />,
    lifebalance: <LifeBalanceScreen onBack={navigateHome} />,
    qrcode: <QRCodeScreen onBack={navigateHome} />,
    bibliography: <BibliographyScreen onBack={navigateHome} />,
    visualschedule: <VisualScheduleScreen onBack={navigateHome} />,
    tournament: <TournamentScreen onBack={navigateHome} />,
    cardmaker: <CardMakerScreen onBack={navigateHome} />,
    postermaker: <PosterMakerScreen onBack={navigateHome} />, // 🆕
    timer: null,
  };

  let content: React.ReactNode;

  if (activeTemplate) {
    content = (
      <ActiveTimer
        key={activeTemplate.id}
        template={activeTemplate}
        onReset={() => setActiveTemplate(null)}
      />
    );
  } else if (route === 'study' && !studyDeckId) {
    content = (
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
    );
  } else if (route === 'quiz' && !quizDeckId) {
    content = (
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
    );
  } else if (routes[route] !== null) {
    content = <div className="animate-fadeIn">{routes[route]}</div>;
  } else {
    content = (
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

  return <AuthProvider>{content}</AuthProvider>;
}
