import React, { useState } from 'react';
import { Flashcard } from '../types';
import { RotateCw, Check, X, Shuffle, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { playChime } from '../utils/audioUtils';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ flashcards }) => {
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIndexes, setMasteredIndexes] = useState<Set<number>>(new Set());

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800">
        Nenhum flashcard disponível para esta aula.
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = masteredIndexes.has(currentIndex);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const markMastered = () => {
    setMasteredIndexes((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
    playChime(700, 'sine', 0.15);
    handleNext();
  };

  const markNeedsReview = () => {
    setMasteredIndexes((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    handleNext();
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIndexes(new Set());
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="text-xs sm:text-sm font-semibold text-white">
            Card {currentIndex + 1} de {cards.length}
          </span>
          {isMastered && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Dominado
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {masteredIndexes.size} dominados
          </span>
          <button
            onClick={shuffleCards}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
            title="Embaralhar cartões"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Embaralhar</span>
          </button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="w-full h-80 sm:h-96 cursor-pointer select-none perspective-1000 group"
      >
        <div
          className={`w-full h-full relative duration-500 transition-all transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-slate-800 group-hover:border-indigo-500/50 p-8 flex flex-col justify-between shadow-2xl transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-indigo-400">
                Pergunta / Conceito
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <RotateCw className="w-3 h-3" /> Clique para virar
              </span>
            </div>

            <div className="text-center my-auto px-4">
              <h3 className="text-lg sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>
            </div>

            <div className="text-center text-xs text-slate-500">
              Frente
            </div>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/50 p-8 flex flex-col justify-between shadow-2xl transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-emerald-400">
                Resposta Didática
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <RotateCw className="w-3 h-3" /> Clique para virar
              </span>
            </div>

            <div className="text-center my-auto px-4">
              <p className="text-sm sm:text-lg text-slate-100 leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="text-center text-xs text-indigo-400">
              Verso
            </div>
          </div>
        </div>
      </div>

      {/* Card Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={handlePrev}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          title="Card anterior"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={markNeedsReview}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Preciso Revisar</span>
          </button>

          <button
            onClick={markMastered}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-all"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Já Sei / Acertei</span>
          </button>
        </div>

        <button
          onClick={handleNext}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          title="Próximo card"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
