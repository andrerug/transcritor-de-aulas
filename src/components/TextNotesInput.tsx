import React, { useState, useRef } from 'react';
import {
  FileText,
  Sparkles,
  AlertCircle,
  Wand2,
  Mic,
  Square,
  Loader2,
} from 'lucide-react';
import { fileToBase64, formatSecondsToTime } from '../utils/audioUtils';

interface TextNotesInputProps {
  onTextSubmit: (rawText: string, title?: string, subject?: string) => void;
  isLoading: boolean;
}

export const TextNotesInput: React.FC<TextNotesInputProps> = ({
  onTextSubmit,
  isLoading,
}) => {
  const [rawText, setRawText] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureSubject, setLectureSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [micSeconds, setMicSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startMicDictation = async () => {
    setErrorMsg(null);
    chunksRef.current = [];
    setMicSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          await transcribeMicBlob(blob, mimeType);
        }
      };

      recorder.start(250);
      setIsRecordingMic(true);
      timerRef.current = window.setInterval(() => {
        setMicSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(
        'Não foi possível acessar o microfone. Verifique as permissões do navegador.'
      );
    }
  };

  const stopMicDictation = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingMic(false);
  };

  const transcribeMicBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribingMic(true);
    setErrorMsg(null);
    try {
      const audioBase64 = await fileToBase64(blob);
      const response = await fetch('/api/transcribe-mic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao transcrever o áudio do microfone.');
      }
      if (data.transcript) {
        setRawText((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${data.transcript}` : data.transcript
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao transcrever microfone com gemini-3.5-transcribe.');
    } finally {
      setIsTranscribingMic(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg(
        'Por favor, cole, digite ou dite por voz o texto da aula para transcrever e estruturar.'
      );
      return;
    }
    setErrorMsg(null);
    onTextSubmit(
      rawText.trim(),
      lectureTitle.trim() || undefined,
      lectureSubject.trim() || undefined
    );
  };

  const handlePasteSamplePrompt = () => {
    setLectureTitle('Aula de Economia: Inflação e Taxa Selic');
    setLectureSubject('Economia');
    setRawText(`Boa tarde pessoal. Na aula de hoje vamos discutir como o Banco Central utiliza a taxa básica de juros, a famosa taxa Selic, para controlar a inflação no Brasil através do regime de metas. 

Quando a demanda agregada está muito aquecida e os preços sobem descontroladamente, o Copom se reúne e decide elevar a Selic. Isso encarece o crédito, desestimula o consumo das famílias e os investimentos empresariais. Ao desacelerar a economia, a pressão sobre os preços arrefece.

Por outro lado, quando o país enfrenta recessão econômica com desemprego elevado e inflação sob controle, a autoridade monetária pode cortar a taxa de juros para baratear o financiamento e estimular a atividade produtiva. 

Existe também a relação com o câmbio: taxas de juros mais altas atraem capital estrangeiro em busca de rentabilidade, o que pode valorizar o Real frente ao Dólar, barateando importações e aliviando a inflação de custos.`);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Cole Anotações ou Dite por Microfone (gemini-3.5-transcribe)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            O Gemini irá transcrever sua fala ou estruturar o texto criando timestamps, resumo executivo, quiz e flashcards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice dictation button using gemini-3.5-transcribe */}
          {!isRecordingMic ? (
            <button
              type="button"
              onClick={startMicDictation}
              disabled={isLoading || isTranscribingMic}
              className="text-xs text-rose-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTranscribingMic ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  <span>Transcrevendo (gemini-3.5-transcribe)...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ditar por Voz</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopMicDictation}
              className="text-xs text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/30 animate-pulse transition-all cursor-pointer"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Parar e Transcrever ({formatSecondsToTime(micSeconds)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePasteSamplePrompt}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
          >
            <Wand2 className="w-3 h-3" />
            <span>Preencher Exemplo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Título da Aula (Opcional)
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Introdução à Microeconomia"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Disciplina / Matéria (Opcional)
          </label>
          <input
            type="text"
            value={lectureSubject}
            onChange={(e) => setLectureSubject(e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Economia, Administração..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isLoading}
            rows={8}
            placeholder="Cole aqui o texto da aula, clique em 'Ditar por Voz' para transcrever com o microfone (gemini-3.5-transcribe), ou insira anotações de caderno..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono text-xs leading-relaxed transition-all resize-y disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 text-[11px] text-slate-500 font-mono">
            {rawText.length} caracteres
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={isLoading || isTranscribingMic || !rawText.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Estruturar e Transcrever Aula</span>
          </button>
        </div>
      </form>
    </div>
  );
};
