import React, { useState } from 'react';
import { LectureData } from '../types';
import { X, FileDown, Copy, Check, Printer, FileText, Sparkles } from 'lucide-react';

interface ExportModalProps {
  lecture: LectureData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  lecture,
  isOpen,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateFullMarkdown = () => {
    return `# ${lecture.title}
**Disciplina:** ${lecture.subject} | **Duração Estimada:** ${lecture.estimatedDuration} | **Idioma:** ${lecture.language}

---

## 📋 Resumo Executivo
${lecture.summary}

### 💡 Principais Lições
${lecture.keyTakeaways.map((k) => `- ${k}`).join('\n')}

---

## ⏱️ Transcrição Integral da Aula
${lecture.segments
  .map(
    (s) => `### [${s.startTime} - ${s.endTime}] ${s.speaker}${s.topic ? ` - *${s.topic}*` : ''}\n${s.text}\n`
  )
  .join('\n')}

---

## 📚 Caderno de Notas & Síntese Conceitual
${lecture.studyNotesMarkdown}

---

## 📖 Glossário de Termos
${lecture.glossary.map((g) => `- **${g.term}:** ${g.definition}`).join('\n')}

---

## 🎯 Quiz de Fixação
${lecture.quiz
  .map(
    (q, i) =>
      `### Questão ${i + 1}: ${q.question}\n` +
      q.options.map((opt, optIdx) => `  ${String.fromCharCode(65 + optIdx)}) ${opt}`).join('\n') +
      `\n\n*Resposta correta:* Alternativa ${String.fromCharCode(65 + q.correctIndex)}\n*Explicação:* ${q.explanation}\n`
  )
  .join('\n')}

---
*Transcrito e formatado com Transcritor de Aulas AI (Gemini 3.8)*
`;
  };

  const handleDownloadMarkdown = () => {
    const md = generateFullMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_completo.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadText = () => {
    const transcriptText = lecture.segments
      .map((s) => `[${s.startTime}] ${s.speaker}: ${s.text}`)
      .join('\n\n');
    const fullText = `AULA: ${lecture.title}\nDISCIPLINA: ${lecture.subject}\n\nRESUMO:\n${lecture.summary}\n\nTRANSCRIÇÃO:\n${transcriptText}`;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcricao.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = generateFullMarkdown();
    navigator.clipboard.writeText(md);
    setCopiedType('md');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Exportar Material da Aula</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-400">
          Escolha como deseja salvar ou compartilhar a transcrição, resumos, quiz e notas da aula:
        </p>

        <div className="space-y-3">
          {/* Markdown package */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Dossiê Completo (.MD)</h4>
                <p className="text-xs text-slate-400">Transcrição, resumo, notas, quiz e glossário</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyMarkdown}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
                title="Copiar Markdown"
              >
                {copiedType === 'md' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1 transition-all shadow-md shadow-indigo-600/20"
                title="Baixar arquivo Markdown"
              >
                <FileDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TXT Transcrição */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Texto Simples (.TXT)</h4>
                <p className="text-xs text-slate-400">Ideal para leitura rápida ou colar no Word/Docs</p>
              </div>
            </div>

            <button
              onClick={handleDownloadText}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
            >
              Baixar .TXT
            </button>
          </div>

          {/* PDF / Impressão */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Imprimir ou Salvar PDF</h4>
                <p className="text-xs text-slate-400">Layout limpo para estudo impresso ou salvar como PDF</p>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
            >
              Imprimir
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
