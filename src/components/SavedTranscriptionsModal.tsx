import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  X,
  FileDown,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Sparkles,
} from 'lucide-react';

interface SavedMdFile {
  filename: string;
  relativePath: string;
  sizeBytes: number;
  createdAt: string;
}

interface SavedTranscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavedTranscriptionsModal: React.FC<
  SavedTranscriptionsModalProps
> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<SavedMdFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedFiles();
    }
  }, [isOpen]);

  const fetchSavedFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/saved-transcriptions');
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error('Erro ao listar arquivos .md:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (filename: string) => {
    try {
      const res = await fetch(
        `/api/saved-transcriptions/${encodeURIComponent(filename)}`
      );
      const data = await res.json();
      if (data.success) {
        setSelectedContent({ filename: data.filename, content: data.content });
      }
    } catch (e) {
      console.error('Erro ao ler arquivo .md:', e);
    }
  };

  const handleCopyFileContent = async (filename: string) => {
    try {
      const res = await fetch(
        `/api/saved-transcriptions/${encodeURIComponent(filename)}`
      );
      const data = await res.json();
      if (data.success && data.content) {
        navigator.clipboard.writeText(data.content);
        setCopiedFile(filename);
        setTimeout(() => setCopiedFile(null), 2000);
      }
    } catch (e) {
      console.error('Erro ao copiar arquivo .md:', e);
    }
  };

  const handleDownloadFile = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/saved-transcriptions/${encodeURIComponent(
      filename
    )}?download=1`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Pasta de Transcrições Salvas (/transcricoes/*.md)
              </h3>
              <p className="text-xs text-slate-400">
                Arquivos .MD estruturados com YAML frontmatter prontos para outras IAs analisarem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSavedFiles}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Atualizar pasta"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File List or Preview */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {selectedContent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-mono text-xs text-emerald-400">
                  transcricoes/{selectedContent.filename}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile(selectedContent.filename)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Baixar .MD
                  </button>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Voltar para a pasta
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                {selectedContent.content}
              </pre>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-2">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                Nenhuma transcrição .MD salva na pasta ainda.
              </p>
              <p className="text-xs text-slate-500">
                Assim que você transcrever uma aula (ou clicar em "Salvar/Baixar .MD"), o arquivo aparecerá aqui automaticamente.
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.filename}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div
                  onClick={() => handlePreview(file.filename)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-mono font-semibold text-white truncate">
                      {file.relativePath}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>
                        {new Date(file.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePreview(file.filename)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    Visualizar
                  </button>

                  <button
                    onClick={() => handleCopyFileContent(file.filename)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                    title="Copiar conteúdo .MD para outra IA"
                  >
                    {copiedFile === file.filename ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar p/ IA</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadFile(file.filename)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Baixar .MD</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Todos os arquivos são salvos automaticamente na pasta{' '}
            <code className="text-emerald-300 font-mono">transcricoes/</code> do projeto.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
