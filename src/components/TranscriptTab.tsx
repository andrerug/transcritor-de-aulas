import React, { useState } from 'react';
import { Segment } from '../types';
import { Search, Copy, Check, Volume2, Edit3, User, Clock, Filter } from 'lucide-react';
import { parseTimeToSeconds, speakText, stopSpeaking } from '../utils/audioUtils';

interface TranscriptTabProps {
  segments: Segment[];
  currentTime?: number;
  onSeek: (seconds: number) => void;
  onUpdateSegment?: (id: number, newText: string) => void;
}

export const TranscriptTab: React.FC<TranscriptTabProps> = ({
  segments,
  currentTime = 0,
  onSeek,
  onUpdateSegment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  // Unique speakers
  const speakers = Array.from(new Set(segments.map((s) => s.speaker)));

  // Filtered segments
  const filteredSegments = segments.filter((segment) => {
    const matchesSpeaker =
      selectedSpeaker === 'all' || segment.speaker === selectedSpeaker;
    const matchesSearch =
      searchQuery.trim() === '' ||
      segment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (segment.topic && segment.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSpeaker && matchesSearch;
  });

  const handleCopySegment = (seg: Segment) => {
    const content = `[${seg.startTime} - ${seg.speaker}]: ${seg.text}`;
    navigator.clipboard.writeText(content);
    setCopiedId(seg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = segments
      .map((seg) => `[${seg.startTime}] ${seg.speaker}${seg.topic ? ` (${seg.topic})` : ''}:\n${seg.text}\n`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSpeakSegment = (seg: Segment) => {
    if (speakingId === seg.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(seg.id);
      speakText(seg.text, () => {
        setSpeakingId(null);
      });
    }
  };

  const startEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const saveEdit = (id: number) => {
    onUpdateSegment?.(id, editText);
    setEditingId(null);
  };

  const isCurrentSegment = (seg: Segment) => {
    const startSec = parseTimeToSeconds(seg.startTime);
    const endSec = parseTimeToSeconds(seg.endTime);
    return currentTime >= startSec && currentTime <= (endSec || startSec + 30);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar palavras ou termos na transcrição..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {speakers.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">Todos os Oradores</option>
                {speakers.map((spk, idx) => (
                  <option key={idx} value={spk} className="bg-slate-900">
                    {spk}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shrink-0"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Transcrição</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-4">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800/80">
            Nenhum trecho encontrado com a busca informada.
          </div>
        ) : (
          filteredSegments.map((segment) => {
            const active = isCurrentSegment(segment);
            return (
              <div
                key={segment.id}
                id={`seg-${segment.id}`}
                className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 border ${
                  active
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header: Timestamp, Speaker, Topic */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Clickable timestamp */}
                    <button
                      onClick={() => onSeek(parseTimeToSeconds(segment.startTime))}
                      className="flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer"
                      title="Pular áudio para este instante"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{segment.startTime}</span>
                      {segment.endTime && <span>- {segment.endTime}</span>}
                    </button>

                    {/* Speaker badge */}
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <User className="w-3 h-3 text-violet-400" />
                      {segment.speaker}
                    </span>

                    {/* Topic tag if available */}
                    {segment.topic && (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {segment.topic}
                      </span>
                    )}
                  </div>

                  {/* Actions for this segment */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeakSegment(segment)}
                      className={`p-1.5 rounded-lg text-xs transition-all ${
                        speakingId === segment.id
                          ? 'text-indigo-300 bg-indigo-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={speakingId === segment.id ? 'Parar leitura' : 'Ouvir leitura em voz alta'}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleCopySegment(segment)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                      title="Copiar este trecho"
                    >
                      {copiedId === segment.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {onUpdateSegment && (
                      <button
                        onClick={() => startEdit(segment)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                        title="Editar transcrição"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Content or Edit Area */}
                {editingId === segment.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl p-3 text-sm text-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs rounded-lg text-slate-400 hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEdit(segment.id)}
                        className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                    {highlightMatch(segment.text, searchQuery)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
