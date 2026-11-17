/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LectureData, InputMode } from './types';
import { Navbar } from './components/Navbar';
import { AudioRecorder } from './components/AudioRecorder';
import { AudioUploader } from './components/AudioUploader';
import { GoogleDriveImporter } from './components/GoogleDriveImporter';
import { TextNotesInput } from './components/TextNotesInput';
import { SampleLecturesSelector } from './components/SampleLecturesSelector';
import { LectureViewer } from './components/LectureViewer';
import { LiveVoiceTutor } from './components/LiveVoiceTutor';
import { ExportModal } from './components/ExportModal';
import { SavedTranscriptionsModal } from './components/SavedTranscriptionsModal';
import {
  fileToBase64,
  splitAudioIntoChunks,
  formatSecondsToTime,
} from './utils/audioUtils';
import { downloadAiReadyMarkdown } from './utils/markdownBuilder';
import {
  Mic,
  UploadCloud,
  FileText,
  BookOpen,
  Sparkles,
  Headphones,
  Radio,
  Scissors,
  HardDrive,
  FileDown,
} from 'lucide-react';

export default function App() {
  const [activeLecture, setActiveLecture] = useState<LectureData | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [partProgress, setPartProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSavedFolderOpen, setIsSavedFolderOpen] = useState(false);
  const [autoDownloadMd, setAutoDownloadMd] = useState(true);

  // Transcribe audio blob (from computer, Google Drive, or mic of ANY size with auto-split)
  const processAudio = async (
    blobOrFile: Blob | File,
    mimeType: string,
    title?: string,
    subject?: string,
    durationSec?: number | null
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPartProgress(null);
    setLoadingStep('Analisando tamanho e duração do arquivo de áudio...');

    try {
      const audioUrl = URL.createObjectURL(blobOrFile);

      // Automatically split large audio files into smaller parts
      const chunks = await splitAudioIntoChunks(
        blobOrFile,
        mimeType,
        durationSec,
        (msg) => setLoadingStep(msg)
      );

      // Single-part fast path
      if (chunks.length === 1) {
        setPartProgress({ current: 1, total: 1 });
        setLoadingStep(
          'Transcrevendo áudio e gerando arquivo .MD estruturado...'
        );
        const audioBase64 = await fileToBase64(chunks[0].blob);

        const response = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: chunks[0].mimeType,
            lectureTitle: title,
            lectureSubject: subject,
            targetLanguage: 'pt-BR',
          }),
        });

        const resData = await response.json();
        if (!response.ok || !resData.success) {
          throw new Error(resData.error || 'Falha ao transcrever o áudio.');
        }

        const lectureResult: LectureData = {
          ...resData.data,
          audioUrl,
          partsCount: 1,
        };

        setActiveLecture(lectureResult);
        if (autoDownloadMd) {
          downloadAiReadyMarkdown(lectureResult);
        }
        return;
      }

      // Multi-part automatic split + sequential transcription + organized merge
      const totalParts = chunks.length;
      const transcribedParts: string[] = [];

      for (let i = 0; i < totalParts; i++) {
        const chunk = chunks[i];
        setPartProgress({ current: i + 1, total: totalParts });
        setLoadingStep(
          `Transcrevendo Parte ${i + 1} de ${totalParts} (${
            chunk.startTimeFormatted
          } - ${chunk.endTimeFormatted})...`
        );

        const chunkBase64 = await fileToBase64(chunk.blob);

        const chunkRes = await fetch('/api/transcribe-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: chunkBase64,
            mimeType: chunk.mimeType,
            partIndex: chunk.partIndex,
            totalParts: chunk.totalParts,
            startTimeFormatted: chunk.startTimeFormatted,
            endTimeFormatted: chunk.endTimeFormatted,
            lectureTitle: title,
          }),
        });

        const chunkData = await chunkRes.json();
        if (!chunkRes.ok || !chunkData.success) {
          throw new Error(
            chunkData.error ||
              `Falha ao transcrever a Parte ${i + 1} de ${totalParts}.`
          );
        }

        transcribedParts.push(
          `=== [PARTE ${chunk.partIndex} DE ${chunk.totalParts} | Trecho: ${chunk.startTimeFormatted} - ${chunk.endTimeFormatted}] ===\n${chunkData.transcript}`
        );
      }

      // Merge all transcribed parts in chronological order and generate structured lecture + .md file
      setLoadingStep(
        `Juntando todas as ${totalParts} partes transcritas e salvando arquivo .MD na pasta transcricoes/...`
      );

      const unifiedRawText = transcribedParts.join('\n\n');
      const totalEndSec = chunks[chunks.length - 1].endTimeSec;
      const totalDurationFormatted =
        totalEndSec > 0 ? `${formatSecondsToTime(totalEndSec)} min` : '';

      const mergeResponse = await fetch('/api/process-lesson-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: unifiedRawText,
          lectureTitle: title,
          lectureSubject: subject,
          targetLanguage: 'pt-BR',
          partsCount: totalParts,
          totalDurationFormatted,
        }),
      });

      const mergeData = await mergeResponse.json();
      if (!mergeResponse.ok || !mergeData.success) {
        throw new Error(
          mergeData.error || 'Falha ao unificar e organizar as partes da aula.'
        );
      }

      const finalLecture: LectureData = {
        ...mergeData.data,
        audioUrl,
        partsCount: totalParts,
        rawTranscript: unifiedRawText,
      };

      setActiveLecture(finalLecture);
      if (autoDownloadMd) {
        downloadAiReadyMarkdown(finalLecture);
      }
    } catch (err: any) {
      console.error('Erro de transcrição:', err);
      setErrorMessage(
        err.message ||
          'Ocorreu um erro ao transcrever o áudio. Tente novamente ou use uma aula de exemplo.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
      setPartProgress(null);
    }
  };

  // Process raw text / transcript / notes
  const processText = async (
    rawText: string,
    title?: string,
    subject?: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setPartProgress(null);
    setLoadingStep('Analisando o conteúdo didático da aula e gerando .MD...');

    try {
      const response = await fetch('/api/process-lesson-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          lectureTitle: title,
          lectureSubject: subject,
          targetLanguage: 'pt-BR',
        }),
      });

      setLoadingStep(
        'Estruturando transcrição e salvando arquivo .MD na pasta transcricoes/...'
      );

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(
          resData.error || 'Falha ao estruturar as anotações.'
        );
      }

      setActiveLecture(resData.data);
      if (autoDownloadMd) {
        downloadAiReadyMarkdown(resData.data);
      }
    } catch (err: any) {
      console.error('Erro de estruturação:', err);
      setErrorMessage(
        err.message ||
          'Ocorreu um erro ao estruturar o texto. Verifique se o servidor está ativo.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectSample = (sample: LectureData) => {
    setActiveLecture(sample);
  };

  const handleNewLecture = () => {
    setActiveLecture(null);
    setErrorMessage(null);
  };

  const progressPercentage = partProgress
    ? Math.round((partProgress.current / partProgress.total) * 100)
    : 75;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        hasActiveLecture={!!activeLecture}
        onNewLecture={handleNewLecture}
        onExport={() => setIsExportModalOpen(true)}
        onSelectSample={() => {
          setActiveLecture(null);
          setInputMode('sample');
        }}
        onOpenLiveVoice={() => {
          setActiveLecture(null);
          setInputMode('live');
        }}
        onOpenSavedFolder={() => setIsSavedFolderOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Overlay with Multi-Part Progress */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl space-y-5">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1.5">
                  {partProgress && partProgress.total > 1
                    ? `Processando Parte ${partProgress.current} de ${partProgress.total}`
                    : 'Transcrevendo e Gerando Arquivo .MD'}
                </h3>
                <p className="text-xs sm:text-sm text-indigo-300 font-medium">
                  {loadingStep ||
                    'Processando com Inteligência Artificial...'}
                </p>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {partProgress && partProgress.total > 1 && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>
                    Divisão Automática: {progressPercentage}% concluído • Unificação ao final
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Ao finalizar, o arquivo .MD estruturado será salvo na pasta{' '}
                <code className="text-emerald-400">transcricoes/</code>
                {autoDownloadMd ? ' e baixado automaticamente.' : '.'}
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-200 text-sm flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-300 hover:text-white px-2 py-1 bg-red-900/50 rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}

        {/* If Active Lecture Loaded: Display Viewer */}
        {activeLecture ? (
          <LectureViewer
            lecture={activeLecture}
            onOpenExport={() => setIsExportModalOpen(true)}
            onOpenSavedFolder={() => setIsSavedFolderOpen(true)}
            onUpdateLecture={(updated) => setActiveLecture(updated)}
          />
        ) : (
          /* Welcome & Input Selection Screen */
          <div className="space-y-8 py-4 max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Google Drive • Auto-Split Ilimitado • Salva e Baixa .MD para Outras IAs
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Faça a transcrição completa da sua{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400 bg-clip-text text-transparent">
                  aula ou palestra
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Importe do <strong>Google Drive</strong> ou computador, divida arquivos grandes automaticamente e, ao final, salve e baixe o arquivo <strong>.MD estruturado</strong> pronto para outra IA trabalhar com os dados da aula.
              </p>

              {/* Auto-Download .MD Toggle */}
              <div className="flex items-center justify-center pt-1">
                <label className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-emerald-500/40 transition-all">
                  <input
                    type="checkbox"
                    checked={autoDownloadMd}
                    onChange={(e) => setAutoDownloadMd(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>
                    Salvar na pasta <code className="text-emerald-400 font-mono">transcricoes/</code> e <strong>baixar arquivo .MD automaticamente</strong> ao concluir
                  </span>
                </label>
              </div>
            </div>

            {/* Input Mode Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800/90 rounded-2xl max-w-4xl mx-auto backdrop-blur-sm">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Enviar Arquivo (Auto-Split)</span>
              </button>

              <button
                onClick={() => setInputMode('drive')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'drive'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Google Drive</span>
              </button>

              <button
                onClick={() => setInputMode('record')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'record'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Gravar no Microfone</span>
              </button>

              <button
                onClick={() => setInputMode('live')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'live'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Conversa de Voz (Live API)</span>
              </button>

              <button
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Colar ou Ditar Notas</span>
              </button>

              <button
                onClick={() => setInputMode('sample')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  inputMode === 'sample'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Exemplos Prontos</span>
              </button>
            </div>

            {/* Active Input Mode Component */}
            <div className="transition-all duration-300">
              {inputMode === 'upload' && (
                <AudioUploader
                  onFileSelected={(file, title, subject, durationSec) =>
                    processAudio(file, file.type, title, subject, durationSec)
                  }
                  onSwitchToDrive={() => setInputMode('drive')}
                  isLoading={isLoading}
                />
              )}

              {inputMode === 'drive' && (
                <GoogleDriveImporter
                  onFileImported={(file, title, subject, durationSec) =>
                    processAudio(file, file.type, title, subject, durationSec)
                  }
                  isLoading={isLoading}
                />
              )}

              {inputMode === 'record' && (
                <AudioRecorder
                  onAudioRecorded={(blob, mimeType, title, subject, durationSec) =>
                    processAudio(blob, mimeType, title, subject, durationSec)
                  }
                  isLoading={isLoading}
                />
              )}

              {inputMode === 'live' && <LiveVoiceTutor lecture={activeLecture} />}

              {inputMode === 'text' && (
                <TextNotesInput
                  onTextSubmit={(text, title, subject) =>
                    processText(text, title, subject)
                  }
                  isLoading={isLoading}
                />
              )}

              {inputMode === 'sample' && (
                <SampleLecturesSelector
                  onSelectSample={handleSelectSample}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Value Proposition Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-slate-900">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Arquivo .MD para IA
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Salva na pasta <code className="text-emerald-400">transcricoes/</code> e baixa o arquivo .MD estruturado para outra IA analisar.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Google Drive Direto
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Busque e importe áudios ou vídeos direto do seu Google Drive com divisão automática.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Auto-Split Ilimitado
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Arquivos grandes são divididos automaticamente em partes menores, transcritos e unificados.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Voz ao Vivo & Mic
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Converse por voz em tempo real com o Professor IA ou grave aulas pelo microfone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      {activeLecture && (
        <ExportModal
          lecture={activeLecture}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Saved Transcriptions Folder Modal */}
      <SavedTranscriptionsModal
        isOpen={isSavedFolderOpen}
        onClose={() => setIsSavedFolderOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Transcritor de Aulas AI • Assistente pedagógico universitário</span>
          <span className="flex items-center gap-1">
            Desenvolvido com <Sparkles className="w-3.5 h-3.5 text-indigo-400" />{' '}
            Gemini API & Google Drive API
          </span>
        </div>
      </footer>
    </div>
  );
}
