import React, { useState, useRef } from 'react';
import { LectureData } from '../types';
import {
  Send,
  Bot,
  User,
  Lightbulb,
  Loader2,
  Mic,
  Square,
} from 'lucide-react';
import { fileToBase64 } from '../utils/audioUtils';

interface LectureTutorTabProps {
  lecture: LectureData;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const LectureTutorTab: React.FC<LectureTutorTabProps> = ({ lecture }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá! Sou seu tutor virtual para a aula **"${lecture.title}"**. 
Você pode me fazer qualquer pergunta digitando ou usando o microfone (transcrição via **gemini-3.5-transcribe**). O que você gostaria de esclarecer?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const suggestedQuestions = [
    'Explique o conceito principal em termos bem simples para um iniciante.',
    'Dê um exemplo prático do dia a dia sobre o que o professor falou.',
    'Qual a parte mais importante dessa aula para cair em provas ou concursos?',
    'Resuma a conclusão da aula em uma única frase marcante.',
  ];

  const startMicInput = async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          setIsTranscribingMic(true);
          try {
            const audioBase64 = await fileToBase64(blob);
            const res = await fetch('/api/transcribe-mic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64, mimeType }),
            });
            const data = await res.json();
            if (data.success && data.transcript) {
              setInput((prev) =>
                prev.trim() ? `${prev.trim()} ${data.transcript}` : data.transcript
              );
            }
          } catch (e) {
            console.error(e);
          } finally {
            setIsTranscribingMic(false);
          }
        }
      };

      recorder.start(250);
      setIsRecordingMic(true);
    } catch (e) {
      console.error('Erro ao acessar microfone:', e);
    }
  };

  const stopMicInput = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingMic(false);
  };

  const handleSend = async (questionText?: string) => {
    const q = questionText || input.trim();
    if (!q || isLoading) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-lecture-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          lectureContext: {
            title: lecture.title,
            subject: lecture.subject,
            summary: lecture.summary,
            keyTakeaways: lecture.keyTakeaways,
            segments: lecture.segments.slice(0, 15),
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.answer) {
        setMessages([...newMessages, { role: 'assistant', content: data.answer }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content:
              'Desculpe, ocorreu uma instabilidade ao formular a resposta. Tente reformular a pergunta.',
          },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Erro de conexão com o servidor. Por favor, tente novamente.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Suggestions */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Sugestões de perguntas para esta aula:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug)}
              disabled={isLoading}
              className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all text-left"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-4 min-h-[300px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-4 sm:p-5 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-indigo-950/40 border border-indigo-500/30 ml-8'
                : 'bg-slate-900/60 border border-slate-800 mr-8'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {msg.content.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mr-8 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>O professor virtual está consultando a transcrição da aula...</span>
          </div>
        )}
      </div>

      {/* Input bar with Microphone Transcription */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="sticky bottom-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 backdrop-blur-xl shadow-2xl flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading || isTranscribingMic}
          placeholder={
            isTranscribingMic
              ? 'Transcrevendo sua pergunta com gemini-3.5-transcribe...'
              : 'Digite ou fale no microfone sua dúvida sobre a aula...'
          }
          className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        {!isRecordingMic ? (
          <button
            type="button"
            onClick={startMicInput}
            disabled={isLoading || isTranscribingMic}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition-all disabled:opacity-40"
            title="Falar pergunta no microfone (gemini-3.5-transcribe)"
          >
            {isTranscribingMic ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopMicInput}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white animate-pulse transition-all"
            title="Parar gravação e transcrever"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || isTranscribingMic || !input.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
