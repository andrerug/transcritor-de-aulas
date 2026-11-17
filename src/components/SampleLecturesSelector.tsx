import React from 'react';
import { SAMPLE_LECTURES } from '../data/sampleLectures';
import { LectureData } from '../types';
import { BookOpen, Sparkles, Clock, CheckCircle2, Cpu, Dna, Landmark, ArrowRight } from 'lucide-react';

interface SampleLecturesSelectorProps {
  onSelectSample: (lecture: LectureData) => void;
  isLoading: boolean;
}

export const SampleLecturesSelector: React.FC<SampleLecturesSelectorProps> = ({
  onSelectSample,
  isLoading,
}) => {
  const getSubjectIcon = (subject: string) => {
    if (subject.toLowerCase().includes('computação') || subject.toLowerCase().includes('inteligência')) {
      return <Cpu className="w-5 h-5 text-cyan-400" />;
    }
    if (subject.toLowerCase().includes('biologia') || subject.toLowerCase().includes('medicina')) {
      return <Dna className="w-5 h-5 text-emerald-400" />;
    }
    return <Landmark className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h3 className="text-base font-semibold text-white">
          Aulas de Exemplo Prontas para Testar Imediatamente
        </h3>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Selecione uma aula já transcrita e analisada para explorar a transcrição sincronizada, resumos didáticos, quiz interativo, flashcards e o tutor de dúvidas:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SAMPLE_LECTURES.map((lecture, idx) => (
          <div
            key={idx}
            onClick={() => !isLoading && onSelectSample(lecture)}
            className="group relative bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-indigo-500/30 transition-colors">
                  {getSubjectIcon(lecture.subject)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{lecture.estimatedDuration}</span>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                {lecture.subject}
              </span>

              <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors leading-snug mb-2">
                {lecture.title}
              </h4>

              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                {lecture.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {lecture.segments.length} trechos • {lecture.quiz.length} questões
              </span>
              <span className="font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Ver Aula <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
