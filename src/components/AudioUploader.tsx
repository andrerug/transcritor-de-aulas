import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Music,
  Film,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Play,
  Pause,
  Scissors,
  Layers,
} from 'lucide-react';
import { formatSecondsToTime, estimateSplitPartsCount } from '../utils/audioUtils';

interface AudioUploaderProps {
  onFileSelected: (
    file: File,
    title?: string,
    subject?: string,
    durationSec?: number | null
  ) => void;
  onSwitchToDrive?: () => void;
  isLoading: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelected,
  onSwitchToDrive,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureSubject, setLectureSubject] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);

    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/webm',
      'audio/aac',
      'audio/flac',
      'video/mp4',
      'video/webm',
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = [
      'mp3',
      'wav',
      'm4a',
      'ogg',
      'webm',
      'mp4',
      'aac',
      'flac',
      'opus',
    ];

    if (
      !validTypes.includes(file.type) &&
      !validExtensions.includes(extension || '')
    ) {
      setErrorMsg(
        'Formato de arquivo não suportado. Envie arquivos MP3, WAV, M4A, OGG, WEBM, FLAC ou MP4.'
      );
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSelectedFile(file);

    if (!lectureTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setLectureTitle(cleanName);
    }

    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      if (Number.isFinite(tempAudio.duration)) {
        setAudioDuration(tempAudio.duration);
      }
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setSelectedFile(null);
    setAudioDuration(null);
    setAudioUrl(null);
    setIsPlayingPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePreviewPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleStartTranscription = () => {
    if (!selectedFile) return;
    onFileSelected(
      selectedFile,
      lectureTitle.trim() || undefined,
      lectureSubject.trim() || undefined,
      audioDuration
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const estimatedParts = selectedFile
    ? estimateSplitPartsCount(selectedFile.size, audioDuration)
    : 1;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      {/* Inputs for Title and Subject */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Título da Aula
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Aula de Economia Monetária e Inflação"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Disciplina / Área
          </label>
          <input
            type="text"
            value={lectureSubject}
            onChange={(e) => setLectureSubject(e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Economia, Medicina, Filosofia..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone or Selected File Preview */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950/90'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.ogg,.webm,.mp4,.flac,.aac"
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white text-center">
            Arraste seu arquivo de áudio ou vídeo de qualquer tamanho
          </h3>
          <p className="text-sm text-slate-400 text-center mt-1">
            Sem limite de 50MB • Arquivos grandes são divididos automaticamente em partes menores e unificados
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              MP3
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              WAV
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              M4A
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              OGG
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              WEBM
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              FLAC
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              MP4
            </span>
            <span className="px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
              <Scissors className="w-3 h-3" /> Auto-Split Ilimitado
            </span>
          </div>

          {onSwitchToDrive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchToDrive();
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/15 hover:bg-blue-600/30 border border-blue-500/30 transition-all cursor-pointer"
            >
              <span>Ou importar áudio diretamente do Google Drive</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border border-slate-800 rounded-2xl bg-slate-950/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                {selectedFile.type.includes('video') ? (
                  <Film className="w-6 h-6" />
                ) : (
                  <Music className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                  {selectedFile.name}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  {audioDuration !== null && (
                    <>
                      <span>•</span>
                      <span>Duração: {formatSecondsToTime(audioDuration)}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo pronto
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={removeFile}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              title="Trocar arquivo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Automatic Split Information Banner when file is large or multi-part */}
          {estimatedParts > 1 ? (
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Scissors className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-indigo-200 flex items-center gap-2">
                  <span>Divisão Automática Ativada (~{estimatedParts} partes)</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                    gemini-3.5-transcribe
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Como o arquivo possui <strong>{formatFileSize(selectedFile.size)}</strong>, o sistema irá dividi-lo automaticamente em{' '}
                  <strong>~{estimatedParts} partes menores</strong>, transcrever cada parte em sequência e depois juntar toda a aula de forma cronológica e organizada.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Transcrição direta com <strong>gemini-3.5-transcribe</strong> + estruturação didática completa.
              </span>
            </div>
          )}

          {/* Audio Preview Player */}
          {audioUrl && (
            <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              >
                {isPlayingPreview ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pausar prévia</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ouvir prévia</span>
                  </>
                )}
              </button>
              <span className="text-xs text-slate-500">
                Pré-visualização do áudio selecionado
              </span>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartTranscription}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {estimatedParts > 1
                  ? `Dividir em ~${estimatedParts} Partes, Transcrever e Unificar Aula`
                  : 'Transcrever Aula com Inteligência Artificial'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
