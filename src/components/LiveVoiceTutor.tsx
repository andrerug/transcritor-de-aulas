import React, { useState, useRef, useEffect } from 'react';
import { LectureData } from '../types';
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Volume2,
  Sparkles,
  MessageSquare,
  Send,
  AlertCircle,
  Bot,
  User,
} from 'lucide-react';
import {
  float32ToPcm16Base64,
  base64Pcm16ToFloat32,
  playChime,
} from '../utils/audioUtils';

interface LiveVoiceTutorProps {
  lecture?: LectureData | null;
}

interface LiveTranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const VOICES = [
  { id: 'Zephyr', label: 'Zephyr (Clara & Didática)' },
  { id: 'Kore', label: 'Kore (Calma & Acadêmica)' },
  { id: 'Puck', label: 'Puck (Dinâmica & Entusiasta)' },
  { id: 'Charon', label: 'Charon (Profunda & Formal)' },
  { id: 'Fenrir', label: 'Fenrir (Firme & Objetiva)' },
];

export const LiveVoiceTutor: React.FC<LiveVoiceTutorProps> = ({ lecture }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [textInput, setTextInput] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMicMutedRef = useRef<boolean>(false);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  const stopAllPlayback = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsModelSpeaking(false);
  };

  const playPcm24kChunk = (base64Audio: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    if (outCtx.state === 'suspended') {
      outCtx.resume().catch(() => {});
    }

    const float32Data = base64Pcm16ToFloat32(base64Audio);
    if (float32Data.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const startTime = Math.max(outCtx.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.push(source);
    setIsModelSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        setIsModelSpeaking(false);
      }
    };
  };

  const appendOrUpdateTranscript = (role: 'user' | 'assistant', chunkText: string) => {
    if (!chunkText.trim()) return;
    const nowTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setTranscripts((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text} ${chunkText}`.replace(/\s+/g, ' ').trim(),
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role,
          text: chunkText.trim(),
          timestamp: nowTime,
        },
      ];
    });
  };

  const startLiveSession = async () => {
    setErrorMsg(null);
    setIsConnecting(true);

    try {
      // Request microphone stream first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        voice: selectedVoice,
      });
      if (lecture) {
        params.set('title', lecture.title);
        params.set('subject', lecture.subject);
        params.set('summary', lecture.summary.slice(0, 600));
      }

      const wsUrl = `${protocol}//${window.location.host}/api/live?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Set up 16kHz PCM audio capture pipeline
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMicMutedRef.current) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const base64Audio = float32ToPcm16Base64(inputData);
          wsRef.current.send(JSON.stringify({ audio: base64Audio }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setIsConnected(true);
            setIsConnecting(false);
            playChime(660, 'sine', 0.2);
          } else if (msg.type === 'audio' && msg.audio) {
            playPcm24kChunk(msg.audio);
          } else if (msg.type === 'input_transcription' && msg.text) {
            appendOrUpdateTranscript('user', msg.text);
          } else if (msg.type === 'output_transcription' && msg.text) {
            appendOrUpdateTranscript('assistant', msg.text);
          } else if (msg.type === 'interrupted') {
            stopAllPlayback();
          } else if (msg.type === 'error') {
            setErrorMsg(msg.error || 'Erro durante a sessão de voz ao vivo.');
            disconnectSession();
          } else if (msg.type === 'closed') {
            disconnectSession();
          }
        } catch (err) {
          console.error('Erro ao ler evento Live API:', err);
        }
      };

      ws.onerror = () => {
        setErrorMsg('Falha na comunicação WebSocket com o servidor Live API.');
        disconnectSession();
      };

      ws.onclose = () => {
        disconnectSession();
      };
    } catch (err: any) {
      console.error('Erro ao iniciar sessão de voz ao vivo:', err);
      setErrorMsg(
        'Não foi possível acessar o microfone ou conectar à Live API. Verifique as permissões de áudio do navegador.'
      );
      disconnectSession();
    }
  };

  const disconnectSession = () => {
    stopAllPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsMicMuted(false);
  };

  const handleSendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const text = textInput.trim();
    setTextInput('');
    appendOrUpdateTranscript('user', text);
    wsRef.current.send(JSON.stringify({ text }));
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
              gemini-3.8-live (Live API)
            </span>
            {lecture && (
              <span className="text-xs text-slate-400 truncate max-w-xs">
                • Contextualizado na aula atual
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Conversa de Voz em Tempo Real com o Professor IA
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Converse naturalmente por voz com baixa latência, tire dúvidas sobre a matéria, peça exemplos ou simule uma arguição oral.
          </p>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <label className="text-xs font-medium text-slate-400">Voz:</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={isConnected || isConnecting}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Visualizer Orb & Controls */}
      <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden">
        {/* Animated Halo */}
        <div className="relative flex items-center justify-center w-32 h-32 mb-5">
          {isConnected && (
            <>
              <div
                className={`absolute inset-0 rounded-full transition-all duration-500 ${
                  isModelSpeaking
                    ? 'bg-violet-500/30 animate-ping scale-125'
                    : !isMicMuted
                    ? 'bg-indigo-500/20 animate-pulse scale-110'
                    : 'bg-slate-800/20'
                }`}
              />
              <div
                className={`absolute inset-3 rounded-full transition-all duration-300 ${
                  isModelSpeaking
                    ? 'bg-purple-500/25 animate-pulse'
                    : !isMicMuted
                    ? 'bg-indigo-500/15'
                    : 'bg-slate-800/10'
                }`}
              />
            </>
          )}

          <div
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isConnected
                ? isModelSpeaking
                  ? 'bg-gradient-to-tr from-violet-600 via-purple-500 to-indigo-400 text-white scale-105 shadow-violet-500/40'
                  : isMicMuted
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                  : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-indigo-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            {isModelSpeaking ? (
              <Volume2 className="w-10 h-10 animate-bounce" />
            ) : isConnected ? (
              isMicMuted ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )
            ) : (
              <Radio className="w-10 h-10 text-indigo-400" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-1 mb-6">
          <h4 className="text-base font-bold text-white">
            {isConnecting
              ? 'Conectando ao Gemini 3.8 Live API...'
              : isConnected
              ? isModelSpeaking
                ? 'Professor IA está falando... (você pode interromper a qualquer momento)'
                : isMicMuted
                ? 'Microfone silenciado'
                : 'Ouvindo você em tempo real — pode falar!'
              : 'Pronto para iniciar a conversa por voz'}
          </h4>
          <p className="text-xs text-slate-400">
            {isConnected
              ? 'Áudio bidirecional PCM (Entrada 16kHz • Resposta 24kHz)'
              : 'Clique no botão abaixo para abrir o canal de voz em tempo real com gemini-3.8-live'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isConnected ? (
            <button
              onClick={startLiveSession}
              disabled={isConnecting}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>
                {isConnecting ? 'Iniciando Sessão Live...' : 'Iniciar Conversa de Voz ao Vivo'}
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                  isMicMuted
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {isMicMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Ativar Microfone</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span>Silenciar Microfone</span>
                  </>
                )}
              </button>

              <button
                onClick={disconnectSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Encerrar Conversa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Conversation Transcript & Optional Text Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            Transcrição em Tempo Real da Conversa
          </span>
          {transcripts.length > 0 && (
            <button
              onClick={() => setTranscripts([])}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Limpar histórico
            </button>
          )}
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-h-72 overflow-y-auto space-y-3">
          {transcripts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              As falas da sua conversa em tempo real aparecerão transcritas aqui automaticamente.
            </p>
          ) : (
            transcripts.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl text-xs sm:text-sm ${
                  item.role === 'user'
                    ? 'bg-indigo-950/40 border border-indigo-500/30 ml-6'
                    : 'bg-slate-900/80 border border-slate-800 mr-6'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    item.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                  }`}
                >
                  {item.role === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[11px] text-slate-400">
                      {item.role === 'user' ? 'Você' : `Professor IA (${selectedVoice})`}
                    </span>
                    <span className="text-[10px] text-slate-600">{item.timestamp}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Optional text message while in live session */}
        {isConnected && (
          <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ou envie uma pergunta por texto durante a chamada de voz..."
              className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
              title="Enviar mensagem para a sessão Live"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
