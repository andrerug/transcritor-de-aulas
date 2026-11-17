import React, { useState } from 'react';
import { Copy, Check, Printer, FileDown } from 'lucide-react';

interface StudyNotesTabProps {
  notesMarkdown: string;
  lectureTitle: string;
}

export const StudyNotesTab: React.FC<StudyNotesTabProps> = ({
  notesMarkdown,
  lectureTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notesMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMd = () => {
    const blob = new Blob([notesMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_notas.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <span className="text-xs text-slate-400 font-medium">
          Caderno de Estudos didático formatado em Markdown
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            title="Copiar para Notion ou Obsidian"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Notas</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            title="Baixar arquivo .md"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Baixar .MD</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            title="Imprimir ou Salvar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Formatted Markdown Content */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-10 backdrop-blur-sm shadow-xl print:bg-white print:text-black print:border-none print:shadow-none">
        <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-headings:font-bold prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-indigo-300 prose-hr:border-slate-800 print:prose-headings:text-black print:prose-p:text-black">
          {notesMarkdown.split('\n\n').map((block, idx) => {
            if (block.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-xl sm:text-2xl font-black text-white border-b border-slate-800 pb-3 mb-4">
                  {block.replace('# ', '')}
                </h1>
              );
            }
            if (block.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-lg sm:text-xl font-bold text-indigo-200 mt-6 mb-3">
                  {block.replace('## ', '')}
                </h2>
              );
            }
            if (block.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-base font-semibold text-violet-200 mt-5 mb-2">
                  {block.replace('### ', '')}
                </h3>
              );
            }
            if (block.startsWith('- ') || block.startsWith('* ')) {
              const items = block.split('\n');
              return (
                <ul key={idx} className="list-disc list-inside space-y-1 my-3 text-sm sm:text-base text-slate-300">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^[-*]\s+/, '')}</li>
                  ))}
                </ul>
              );
            }
            if (block.startsWith('1. ') || /^\d+\.\s/.test(block)) {
              const items = block.split('\n');
              return (
                <ol key={idx} className="list-decimal list-inside space-y-1.5 my-3 text-sm sm:text-base text-slate-300">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^\d+\.\s+/, '')}</li>
                  ))}
                </ol>
              );
            }
            if (block.startsWith('---')) {
              return <hr key={idx} className="border-slate-800 my-6" />;
            }
            return (
              <p key={idx} className="text-sm sm:text-base text-slate-200 leading-relaxed my-2">
                {block}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};
