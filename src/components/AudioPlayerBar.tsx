import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward } from 'lucide-react';
import { formatSecondsToTime } from '../utils/audioUtils';

interface AudioPlayerBarProps {
  audioUrl?: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  seekTime?: number | null;
  onSeekComplete?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  currentTime,
  onTimeUpdate,
  seekTime,
  onSeekComplete,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Handle external seek requests (e.g. user clicked a timestamp)
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekTime;
      onTimeUpdate(seekTime);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      onSeekComplete?.();
    }
  }, [seekTime]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    onTimeUpdate(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onTimeUpdate(newTime);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-30 max-w-4xl mx-auto px-4 w-full">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2 ring-1 ring-white/10">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Progress Slider */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400 w-11 text-right">
            {formatSecondsToTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
          />

          <span className="font-mono text-xs text-slate-400 w-11">
            {formatSecondsToTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
              title="Voltar 10 segundos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">-10s</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
              title="Avançar 10 segundos"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="text-[10px]">+10s</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Pill */}
            <button
              onClick={cyclePlaybackRate}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all"
              title="Velocidade de reprodução"
            >
              {playbackRate}x
            </button>

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
