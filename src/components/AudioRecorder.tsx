import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  AlertCircle,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { formatSecondsToTime, playChime, fileToBase64 } from '../utils/audioUtils';

interface AudioRecorderProps {
  onAudioRecorded: (
    blob: Blob,
    mimeType: string,
    title?: string,
    subject?: string,
    durationSec?: number
  ) => void;
  isLoading: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  isLoading,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureSubject, setLectureSubject] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [quickTranscript, setQuickTranscript] = useState<string | null>(null);
  const [isQuickTranscribing, setIsQuickTranscribing] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const stopModeRef = useRef<'full' | 'quick'>('full');

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setQuickTranscript(null);
    audioChunksRef.current = [];
    setDuration(0);
    durationRef.current = 0;
    setLiveTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        stopRecordingCleanup();

        if (audioBlob.size > 0) {
          if (stopModeRef.current === 'quick') {
            await runQuickMicTranscription(audioBlob, mimeType);
          } else {
            onAudioRecorded(
              audioBlob,
              mimeType,
              lectureTitle.trim() || undefined,
              lectureSubject.trim() || undefined,
              durationRef.current
            );
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      playChime(600, 'sine', 0.2);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      drawWaveform();

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'pt-BR';
          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(transcript.trim());
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.log('Speech recognition not available', e);
        }
      }
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      setErrorMsg(
        'Permissão de microfone negada ou dispositivo não encontrado. Verifique as configurações de áudio do navegador.'
      );
    }
  };

  const runQuickMicTranscription = async (blob: Blob, mimeType: string) => {
    setIsQuickTranscribing(true);
    setErrorMsg(null);
    try {
      const audioBase64 = await fileToBase64(blob);
      const response = await fetch('/api/transcribe-mic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha na transcrição com gemini-3.5-transcribe.');
      }
      setQuickTranscript(data.transcript || 'Nenhum texto detectado no áudio.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao transcrever microfone.');
    } finally {
      setIsQuickTranscribing(false);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 1)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused'
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopAndFinish = (mode: 'full' | 'quick' = 'full') => {
    stopModeRef.current = mode;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      playChime(400, 'sine', 0.2);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    stopRecordingCleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setLiveTranscript('');
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      {/* Title & Subject Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Título da Aula (Opcional)
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            disabled={isRecording || isLoading || isQuickTranscribing}
            placeholder="Ex: Aula 04 - Genética Mendeliana"
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
            disabled={isRecording || isLoading || isQuickTranscribing}
            placeholder="Ex: Biologia, Direito, Cálculo..."
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

      {/* Recording Visual Area */}
      <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/60">
        {/* Canvas Waveform */}
        <div className="w-full max-w-md h-28 relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={110}
            className={`w-full h-full transition-opacity duration-300 ${
              isRecording && !isPaused ? 'opacity-100' : 'opacity-20'
            }`}
          />
          {!isRecording && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
                <Mic className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-slate-300">
                Grave o áudio pelo microfone para transcrição com{' '}
                <span className="text-indigo-400 font-semibold">gemini-3.5-transcribe</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Gravações longas são automaticamente divididas em partes e unificadas
              </p>
            </div>
          )}
        </div>

        {/* Timer Counter */}
        {isRecording && (
          <div className="mt-4 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-red-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isPaused ? 'bg-amber-500' : 'bg-red-500'
                }`}
              />
            </span>
            <span className="font-mono text-2xl font-bold tracking-wider text-white">
              {formatSecondsToTime(duration)}
            </span>
            {isPaused && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pausado
              </span>
            )}
          </div>
        )}

        {/* Live speech recognition preview if speaking */}
        {isRecording && liveTranscript && (
          <div className="w-full max-w-xl mt-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Prévia de fala em tempo real:</span>
            </div>
            <p className="text-xs text-slate-200 italic line-clamp-2">
              "{liveTranscript}"
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isLoading || isQuickTranscribing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 shadow-lg shadow-red-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isQuickTranscribing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Transcrevendo com gemini-3.5-transcribe...</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Iniciar Gravação no Microfone</span>
                </>
              )}
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Continuar</span>
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>Pausar</span>
                </button>
              )}

              <button
                onClick={() => stopAndFinish('quick')}
                disabled={duration < 1 || isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 transition-all disabled:opacity-50"
                title="Transcrever apenas o texto falado usando gemini-3.5-transcribe"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Apenas Transcrever Texto</span>
              </button>

              <button
                onClick={() => stopAndFinish('full')}
                disabled={duration < 1 || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Finalizar e Gerar Aula Completa</span>
              </button>

              <button
                onClick={cancelRecording}
                className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
              >
                Descartar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Transcription Result Box */}
      {quickTranscript && (
        <div className="mt-6 p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                gemini-3.5-transcribe
              </span>
              <span className="text-xs font-semibold text-white">
                Transcrição Direta do Microfone
              </span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(quickTranscript);
                setCopiedQuick(true);
                setTimeout(() => setCopiedQuick(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              {copiedQuick ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {quickTranscript}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          Transcrição de voz com <strong>gemini-3.5-transcribe</strong> e estruturação pedagógica com timestamps.
        </span>
      </div>
    </div>
  );
};
