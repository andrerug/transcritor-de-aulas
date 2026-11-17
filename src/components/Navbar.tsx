import React from 'react';
import {
  Sparkles,
  RotateCcw,
  Download,
  BookOpen,
  GraduationCap,
  Radio,
  FolderOpen,
} from 'lucide-react';

interface NavbarProps {
  hasActiveLecture: boolean;
  onNewLecture: () => void;
  onExport: () => void;
  onSelectSample: () => void;
  onOpenLiveVoice: () => void;
  onOpenSavedFolder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  hasActiveLecture,
  onNewLecture,
  onExport,
  onSelectSample,
  onOpenLiveVoice,
  onOpenSavedFolder,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={onNewLecture}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Transcritor de Aulas AI
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Auto-Split & .MD
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Transcrição sem limite de tamanho • Salva e baixa .MD estruturado para outras IAs
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenSavedFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/30 transition-all cursor-pointer"
            title="Ver pasta transcricoes/ com arquivos .MD salvos"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Pasta .MD</span>
          </button>

          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-indigo-200 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 transition-all cursor-pointer"
            title="Conversar por voz em tempo real com gemini-3.8-live"
          >
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="hidden sm:inline">Voz ao Vivo</span>
          </button>

          <button
            onClick={onSelectSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all hover:border-slate-700 cursor-pointer"
            title="Ver aulas de exemplo prontas"
          >
            <BookOpen className="w-4 h-4 text-violet-400" />
            <span className="hidden lg:inline">Aulas de Exemplo</span>
            <span className="lg:hidden">Exemplos</span>
          </button>

          {hasActiveLecture && (
            <>
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                title="Exportar transcrição e notas"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Exportar</span>
              </button>

              <button
                onClick={onNewLecture}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                title="Transcrever outra aula"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Transcrição</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
