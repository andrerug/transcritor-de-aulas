import React, { useState } from 'react';
import { GlossaryItem } from '../types';
import { BookA, Search, Volume2, Copy, Check } from 'lucide-react';
import { speakText } from '../utils/audioUtils';

interface GlossaryTabProps {
  glossary: GlossaryItem[];
}

export const GlossaryTab: React.FC<GlossaryTabProps> = ({ glossary }) => {
  const [search, setSearch] = useState('');
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  const filtered = glossary.filter(
    (item) =>
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (item: GlossaryItem) => {
    navigator.clipboard.writeText(`${item.term}: ${item.definition}`);
    setCopiedTerm(item.term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const handleSpeak = (item: GlossaryItem) => {
    speakText(`${item.term}. ${item.definition}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar termos ou conceitos técnicos..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400 px-2">
          {filtered.length} {filtered.length === 1 ? 'conceito' : 'conceitos'} identificados
        </div>
      </div>

      {/* Grid of glossary terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <BookA className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    {item.term}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSpeak(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-all"
                    title="Ouvir definição"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopy(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                    title="Copiar definição"
                  >
                    {copiedTerm === item.term ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {item.definition}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
