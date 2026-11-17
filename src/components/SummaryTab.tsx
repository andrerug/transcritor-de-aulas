import React, { useState } from 'react';
import { LectureData } from '../types';
import { BookOpen, CheckCircle, Clock, Lightbulb, Volume2, Sparkles } from 'lucide-react';
import { parseTimeToSeconds, speakText, stopSpeaking } from '../utils/audioUtils';

interface SummaryTabProps {
  lecture: LectureData;
  onSeek: (seconds: number) => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ lecture, onSeek }) => {
  const [isReadingSummary, setIsReadingSummary] = useState(false);

  const toggleReadSummary = () => {
    if (isReadingSummary) {
      stopSpeaking();
      setIsReadingSummary(false);
    } else {
      setIsReadingSummary(true);
      speakText(lecture.summary, () => setIsReadingSummary(false));
    }
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Resumo Executivo da Aula
            </h3>
          </div>

          <button
            onClick={toggleReadSummary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isReadingSummary
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isReadingSummary ? 'Parar Leitura' : 'Ouvir Resumo'}</span>
          </button>
        </div>

        <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-3 font-normal">
          {lecture.summary.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Key Takeaways */}
      {lecture.keyTakeaways && lecture.keyTakeaways.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Principais Lições e Pontos de Aprendizado
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {lecture.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {takeaway}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Topics */}
      {lecture.timelineTopics && lecture.timelineTopics.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Linha do Tempo e Estrutura dos Tópicos
            </h3>
          </div>

          <div className="relative border-l-2 border-slate-800 ml-3 sm:ml-4 pl-5 sm:pl-6 space-y-6">
            {lecture.timelineTopics.map((topic, idx) => (
              <div key={idx} className="relative group">
                {/* Node dot */}
                <div className="absolute -left-[27px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />

                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <button
                    onClick={() => onSeek(parseTimeToSeconds(topic.timestamp))}
                    className="font-mono text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/20 transition-all cursor-pointer"
                    title="Pular para este momento no áudio"
                  >
                    {topic.timestamp}
                  </button>
                  <h4 className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">
                    {topic.title}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practical Applications */}
      {lecture.practicalApplications && lecture.practicalApplications.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Aplicações Práticas no Mundo Real
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lecture.practicalApplications.map((app, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-300">{app}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
