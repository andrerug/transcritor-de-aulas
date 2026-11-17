import React, { useState } from 'react';
import { LectureData } from '../types';
import { TranscriptTab } from './TranscriptTab';
import { SummaryTab } from './SummaryTab';
import { StudyNotesTab } from './StudyNotesTab';
import { GlossaryTab } from './GlossaryTab';
import { QuizTab } from './QuizTab';
import { FlashcardsTab } from './FlashcardsTab';
import { LectureTutorTab } from './LectureTutorTab';
import { LiveVoiceTutor } from './LiveVoiceTutor';
import { AudioPlayerBar } from './AudioPlayerBar';
import {
  buildAiReadyMarkdownClient,
  downloadAiReadyMarkdown,
} from '../utils/markdownBuilder';
import {
  FileText,
  BookOpen,
  HelpCircle,
  BrainCircuit,
  MessageSquare,
  Clock,
  GraduationCap,
  Sparkles,
  Download,
  Radio,
  Scissors,
  FileDown,
  FolderCheck,
  Copy,
  Check,
} from 'lucide-react';

interface LectureViewerProps {
  lecture: LectureData;
  onOpenExport: () => void;
  onOpenSavedFolder?: () => void;
  onUpdateLecture?: (updated: LectureData) => void;
}

type TabType =
  | 'transcript'
  | 'summary'
  | 'notes'
  | 'glossary'
  | 'quiz'
  | 'flashcards'
  | 'tutor'
  | 'live';

export const LectureViewer: React.FC<LectureViewerProps> = ({
  lecture,
  onOpenExport,
  onOpenSavedFolder,
  onUpdateLecture,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [copiedAiMd, setCopiedAiMd] = useState(false);
  const [isSavingMd, setIsSavingMd] = useState(false);

  const handleSeek = (seconds: number) => {
    setSeekTime(seconds);
  };

  const handleUpdateSegment = (id: number, newText: string) => {
    if (!onUpdateLecture) return;
    const updatedSegments = lecture.segments.map((seg) =>
      seg.id === id ? { ...seg, text: newText } : seg
    );
    onUpdateLecture({
      ...lecture,
      segments: updatedSegments,
    });
  };

  const handleSaveAndDownloadMd = async () => {
    setIsSavingMd(true);
    try {
      // Ensure it is saved in the server /transcricoes folder as well
      const res = await fetch('/api/save-transcription-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lecture }),
      });
      const data = await res.json();
      if (data.success && onUpdateLecture) {
        onUpdateLecture({
          ...lecture,
          savedMdPath: data.savedMdPath,
          savedMdFilename: data.savedMdFilename,
        });
      }
    } catch (e) {
      console.error('Erro ao salvar .md na pasta:', e);
    } finally {
      setIsSavingMd(false);
      // Always trigger browser download of the .md file
      downloadAiReadyMarkdown(lecture);
    }
  };

  const handleCopyAiMarkdown = () => {
    const md = buildAiReadyMarkdownClient(lecture);
    navigator.clipboard.writeText(md);
    setCopiedAiMd(true);
    setTimeout(() => setCopiedAiMd(false), 2000);
  };

  const tabs = [
    {
      id: 'transcript',
      label: 'Transcrição Integral',
      icon: FileText,
      badge: lecture.segments.length,
    },
    {
      id: 'live',
      label: 'Conversa de Voz (Live)',
      icon: Radio,
    },
    {
      id: 'summary',
      label: 'Resumo & Tópicos',
      icon: BookOpen,
      badge: lecture.keyTakeaways.length,
    },
    {
      id: 'notes',
      label: 'Caderno de Notas',
      icon: GraduationCap,
    },
    {
      id: 'glossary',
      label: 'Glossário',
      icon: Sparkles,
      badge: lecture.glossary.length,
    },
    {
      id: 'quiz',
      label: 'Quiz de Fixação',
      icon: HelpCircle,
      badge: lecture.quiz.length,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: BrainCircuit,
      badge: lecture.flashcards.length,
    },
    {
      id: 'tutor',
      label: 'Tutor em Chat',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {lecture.subject || 'Disciplina Geral'}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800">
                <Clock className="w-3 h-3 text-slate-400" />
                {lecture.estimatedDuration}
              </span>
              {lecture.partsCount && lecture.partsCount > 1 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                  <Scissors className="w-3 h-3" />
                  {lecture.partsCount} partes unificadas
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 uppercase bg-slate-800/80 border border-slate-700/60">
                {lecture.language}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {lecture.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 max-w-3xl">
              {lecture.summary.substring(0, 220)}...
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={handleSaveAndDownloadMd}
              disabled={isSavingMd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              title="Salvar na pasta transcricoes/ e baixar arquivo .MD pronto para outra IA"
            >
              <FileDown className="w-4 h-4" />
              <span>Salvar e Baixar .MD (p/ IA)</span>
            </button>

            <button
              onClick={handleCopyAiMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              title="Copiar o arquivo .MD estruturado para colar em outra IA"
            >
              {copiedAiMd ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>.MD Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-400" />
                  <span>Copiar .MD</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenExport}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Mais Formatos</span>
            </button>
          </div>
        </div>

        {/* Saved .MD File Status Bar */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {lecture.savedMdPath ? (
                <>
                  Arquivo salvo automaticamente na pasta:{' '}
                  <code className="px-2 py-0.5 rounded bg-slate-950 border border-emerald-500/30 font-mono text-emerald-300">
                    {lecture.savedMdPath}
                  </code>
                </>
              ) : (
                'Pronto para salvar na pasta transcricoes/ ou baixar em formato .MD para análise por outra IA.'
              )}
            </span>
          </div>

          {onOpenSavedFolder && (
            <button
              onClick={onOpenSavedFolder}
              className="text-xs font-semibold text-indigo-300 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Abrir Pasta de Arquivos .MD Salvos
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'transcript' && (
          <TranscriptTab
            segments={lecture.segments}
            currentTime={audioCurrentTime}
            onSeek={handleSeek}
            onUpdateSegment={handleUpdateSegment}
          />
        )}

        {activeTab === 'live' && <LiveVoiceTutor lecture={lecture} />}

        {activeTab === 'summary' && (
          <SummaryTab lecture={lecture} onSeek={handleSeek} />
        )}

        {activeTab === 'notes' && (
          <StudyNotesTab
            notesMarkdown={lecture.studyNotesMarkdown}
            lectureTitle={lecture.title}
          />
        )}

        {activeTab === 'glossary' && (
          <GlossaryTab glossary={lecture.glossary} />
        )}

        {activeTab === 'quiz' && <QuizTab quiz={lecture.quiz} />}

        {activeTab === 'flashcards' && (
          <FlashcardsTab flashcards={lecture.flashcards} />
        )}

        {activeTab === 'tutor' && <LectureTutorTab lecture={lecture} />}
      </div>

      {/* Floating Audio Player when audio is present */}
      {lecture.audioUrl && (
        <AudioPlayerBar
          audioUrl={lecture.audioUrl}
          currentTime={audioCurrentTime}
          onTimeUpdate={setAudioCurrentTime}
          seekTime={seekTime}
          onSeekComplete={() => setSeekTime(null)}
        />
      )}
    </div>
  );
};
