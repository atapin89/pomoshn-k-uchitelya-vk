import { useEffect, useState } from 'react';
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

type Route = 'home' | 'timer' | 'generator' | 'noise' | 'flashcards' | 'study' | 'quiz' | 'wordsearch' | 'manual' | 'calculators' | 'bingo';

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [customTemplates, setCustomTemplates] = useState<LessonTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<LessonTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LessonTemplate | null>(null);
  
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [quizDeckId, setQuizDeckId] = useState<string | null>(null);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
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

  if (route === 'home') return <HomeScreen onNavigate={setRoute} />;
  if (route === 'generator') return <GeneratorScreen onBack={() => setRoute('home')} />;
  if (route === 'noise') return <NoiseMonitorScreen onBack={() => setRoute('home')} />;
  
  if (route === 'flashcards') {
    return (
      <FlashcardsScreen
        onBack={() => setRoute('home')}
        onStudy={(deckId: string) => { setStudyDeckId(deckId); setRoute('study'); }}
        onQuiz={(deckId: string) => { setQuizDeckId(deckId); setRoute('quiz'); }}
      />
    );
  }

  if (route === 'study' && studyDeckId) return <StudyScreen deckId={studyDeckId} onBack={() => setRoute('flashcards')} />;
  if (route === 'quiz' && quizDeckId) return <QuizScreen deckId={quizDeckId} onBack={() => setRoute('flashcards')} />;
  if (route === 'wordsearch') return <WordSearchScreen onBack={() => setRoute('home')} />;
  if (route === 'manual') return <ManualScreen onBack={() => setRoute('home')} />;
  if (route === 'calculators') return <CalculatorsScreen onBack={() => setRoute('home')} />;
  if (route === 'bingo') return <BingoGeneratorScreen onBack={() => setRoute('home')} />;

  if (activeTemplate) {
    return (
      <ActiveTimer
        key={activeTemplate.id}
        template={activeTemplate}
        onReset={() => setActiveTemplate(null)}
      />
    );
  }

  return (
    <>
      <TemplateList
        templates={allTemplates}
        onSelect={setActiveTemplate}
        onCreate={() => setShowCreate(true)}
        onDelete={handleDeleteCustom}
        onEdit={setEditingTemplate}
        onBack={() => setRoute('home')}
      />
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
