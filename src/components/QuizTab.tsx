import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Award, ChevronRight, Sparkles } from 'lucide-react';
import { playChime } from '../utils/audioUtils';

interface QuizTabProps {
  quiz: QuizQuestion[];
}

export const QuizTab: React.FC<QuizTabProps> = ({ quiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleFinishQuiz = () => {
    setShowResults(true);
    playChime(600, 'triangle', 0.3);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setCurrentStep(0);
  };

  // Calculate score
  const totalQuestions = quiz.length;
  const correctCount = quiz.reduce((count, q) => {
    return selectedAnswers[q.id] === q.correctIndex ? count + 1 : count;
  }, 0);
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  if (totalQuestions === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800">
        Nenhum quiz disponível para esta aula.
      </div>
    );
  }

  const currentQ = quiz[currentStep];
  const isSelected = selectedAnswers[currentQ?.id] !== undefined;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Quiz Progress & Results Banner */}
      {showResults ? (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
            Quiz Concluído!
          </h3>
          <p className="text-sm text-slate-300 mb-4">
            Você acertou <span className="font-bold text-emerald-400">{correctCount}</span> de{' '}
            <span className="font-bold">{totalQuestions}</span> questões ({scorePercentage}%)
          </p>

          <div className="w-full max-w-xs mx-auto bg-slate-800 h-2.5 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full transition-all duration-1000 ${
                scorePercentage >= 70
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500'
              }`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>

          <button
            onClick={handleResetQuiz}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refazer Quiz</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs sm:text-sm font-semibold text-white">
              Questão {currentStep + 1} de {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {quiz.map((q, idx) => {
              const answered = selectedAnswers[q.id] !== undefined;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    currentStep === idx
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50'
                      : answered
                      ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Card */}
      {currentQ && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">
              Q{currentStep + 1}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
              {currentQ.question}
            </h4>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, optIdx) => {
              const isChosen = selectedAnswers[currentQ.id] === optIdx;
              const isCorrect = currentQ.correctIndex === optIdx;

              let style = 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200';

              if (showResults) {
                if (isCorrect) {
                  style = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200';
                } else if (isChosen && !isCorrect) {
                  style = 'bg-rose-950/40 border-rose-500/80 text-rose-200';
                }
              } else if (isChosen) {
                style = 'bg-indigo-950/60 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500';
              }

              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${style}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                      isChosen
                        ? 'border-indigo-400 bg-indigo-500 text-white'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <span className="text-xs sm:text-sm leading-relaxed flex-1">
                    {option}
                  </span>
                  {showResults && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {showResults && isChosen && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation in Results mode */}
          {showResults && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs sm:text-sm text-indigo-200">
              <strong className="block text-indigo-300 font-semibold mb-1">
                Explicação Pedagógica:
              </strong>
              {currentQ.explanation}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-all"
            >
              Anterior
            </button>

            {currentStep < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : !showResults ? (
              <button
                onClick={handleFinishQuiz}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <span>Finalizar Quiz e Ver Nota</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
