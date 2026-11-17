/**
 * Utilities for audio processing, automatic multi-part audio splitting,
 * Live API 16kHz/24kHz PCM conversion, time formatting, and file conversion.
 */

export interface AudioChunkPart {
  blob: Blob;
  mimeType: string;
  partIndex: number;
  totalParts: number;
  startTimeSec: number;
  endTimeSec: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  sizeBytes: number;
}

export function formatSecondsToTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Index = result.indexOf('base64,');
      if (base64Index !== -1) {
        resolve(result.substring(base64Index + 7));
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Encodes an AudioBuffer segment [startSample, endSample) into a 16kHz mono 16-bit WAV Blob.
 */
function encodeAudioBufferSliceToWav(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number,
  targetSampleRate = 16000
): Blob {
  const sourceRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const startSample = Math.floor(startSec * sourceRate);
  const endSample = Math.min(audioBuffer.length, Math.floor(endSec * sourceRate));
  const sourceLength = Math.max(0, endSample - startSample);

  const ratio = sourceRate / targetSampleRate;
  const outLength = Math.floor(sourceLength / ratio);
  const wavBuffer = new ArrayBuffer(44 + outLength * 2);
  const view = new DataView(wavBuffer);

  // Write 44-byte RIFF WAV header
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + outLength * 2, true);
  writeAsciiString(view, 8, 'WAVE');
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, outLength * 2, true);

  // Mix down channels and downsample to 16kHz mono Int16
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < outLength; i++) {
    const srcIdx = Math.min(audioBuffer.length - 1, startSample + Math.floor(i * ratio));
    let sample = 0;
    for (let c = 0; c < numChannels; c++) {
      sample += channelData[c][srcIdx];
    }
    sample /= numChannels;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeAsciiString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Estimates the number of parts a file will be split into for UI preview.
 */
export function estimateSplitPartsCount(fileSizeBytes: number, durationSec?: number | null): number {
  const SINGLE_FILE_MAX_BYTES = 14 * 1024 * 1024; // 14 MB threshold
  if (fileSizeBytes <= SINGLE_FILE_MAX_BYTES && (!durationSec || durationSec <= 420)) {
    return 1;
  }
  if (durationSec && durationSec > 0) {
    // 5 minutes (300s) per chunk when decoded to WAV
    const byDuration = Math.ceil(durationSec / 300);
    if (byDuration > 1) return byDuration;
  }
  const CHUNK_BYTES = 12 * 1024 * 1024; // 12 MB per slice
  return Math.max(2, Math.ceil(fileSizeBytes / CHUNK_BYTES));
}

/**
 * Automatically splits large audio/video files into smaller playable chunks
 * so there is no 50MB limit.
 */
export async function splitAudioIntoChunks(
  file: Blob | File,
  mimeType: string,
  knownDurationSec?: number | null,
  onProgress?: (msg: string) => void
): Promise<AudioChunkPart[]> {
  const SINGLE_FILE_THRESHOLD = 14 * 1024 * 1024; // 14 MB
  const MAX_DECODE_RAM_SIZE = 140 * 1024 * 1024; // 140 MB max for in-memory WebAudio decode
  const CHUNK_DURATION_SEC = 300; // 5 minutes per chunk (~9.6 MB WAV at 16kHz mono)
  const RAW_SLICE_BYTES = 12 * 1024 * 1024; // 12 MB per raw slice fallback

  const effectiveMime = mimeType || (file as File).type || 'audio/mp3';

  // If small enough and under 7 minutes, send as 1 single part
  if (
    file.size <= SINGLE_FILE_THRESHOLD &&
    (!knownDurationSec || knownDurationSec <= 420)
  ) {
    const endSec = knownDurationSec || 0;
    return [
      {
        blob: file,
        mimeType: effectiveMime,
        partIndex: 1,
        totalParts: 1,
        startTimeSec: 0,
        endTimeSec: endSec,
        startTimeFormatted: '00:00',
        endTimeFormatted: endSec > 0 ? formatSecondsToTime(endSec) : '',
        sizeBytes: file.size,
      },
    ];
  }

  // Try Web Audio API decode + 16kHz WAV slicing for sample-accurate splits
  if (file.size <= MAX_DECODE_RAM_SIZE) {
    try {
      onProgress?.('Decodificando trilha de áudio para divisão inteligente em partes...');
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close().catch(() => {});

      const totalDuration = audioBuffer.duration;
      const totalParts = Math.max(1, Math.ceil(totalDuration / CHUNK_DURATION_SEC));

      const chunks: AudioChunkPart[] = [];
      for (let i = 0; i < totalParts; i++) {
        const startSec = i * CHUNK_DURATION_SEC;
        const endSec = Math.min(totalDuration, (i + 1) * CHUNK_DURATION_SEC);
        onProgress?.(
          `Preparando Parte ${i + 1} de ${totalParts} (${formatSecondsToTime(
            startSec
          )} - ${formatSecondsToTime(endSec)})...`
        );

        const wavBlob = encodeAudioBufferSliceToWav(audioBuffer, startSec, endSec, 16000);
        chunks.push({
          blob: wavBlob,
          mimeType: 'audio/wav',
          partIndex: i + 1,
          totalParts,
          startTimeSec: startSec,
          endTimeSec: endSec,
          startTimeFormatted: formatSecondsToTime(startSec),
          endTimeFormatted: formatSecondsToTime(endSec),
          sizeBytes: wavBlob.size,
        });
      }

      if (chunks.length > 0) {
        return chunks;
      }
    } catch (decodeErr) {
      console.warn(
        'WebAudio decode fallback para corte direto por stream (File.slice):',
        decodeErr
      );
    }
  }

  // Fallback for very large files (>140MB) or containers: use memory-efficient File.slice()
  const isWav =
    effectiveMime.includes('wav') ||
    ((file as File).name && (file as File).name.toLowerCase().endsWith('.wav'));

  let wavHeaderBytes: ArrayBuffer | null = null;
  if (isWav && file.size > 44) {
    wavHeaderBytes = await file.slice(0, 44).arrayBuffer();
  }

  const dataStartOffset = isWav && wavHeaderBytes ? 44 : 0;
  const payloadTotalBytes = file.size - dataStartOffset;
  const totalParts = Math.max(1, Math.ceil(payloadTotalBytes / RAW_SLICE_BYTES));
  const estTotalSec = knownDurationSec && knownDurationSec > 0 ? knownDurationSec : totalParts * 300;

  const chunks: AudioChunkPart[] = [];
  for (let i = 0; i < totalParts; i++) {
    const byteStart = dataStartOffset + i * RAW_SLICE_BYTES;
    const byteEnd = Math.min(file.size, byteStart + RAW_SLICE_BYTES);
    const sliceSize = byteEnd - byteStart;

    const startSec = Math.floor((i / totalParts) * estTotalSec);
    const endSec = Math.floor(((i + 1) / totalParts) * estTotalSec);

    onProgress?.(
      `Fatiando Parte ${i + 1} de ${totalParts} (${formatSecondsToTime(
        startSec
      )} - ${formatSecondsToTime(endSec)})...`
    );

    let chunkBlob: Blob;
    let chunkMime = effectiveMime;

    if (isWav && wavHeaderBytes) {
      // Clone the original 44-byte WAV header and update the chunk payload length
      const headerCopy = wavHeaderBytes.slice(0);
      const view = new DataView(headerCopy);
      view.setUint32(4, 36 + sliceSize, true);
      view.setUint32(40, sliceSize, true);
      chunkBlob = new Blob([headerCopy, file.slice(byteStart, byteEnd)], {
        type: 'audio/wav',
      });
      chunkMime = 'audio/wav';
    } else {
      chunkBlob = file.slice(byteStart, byteEnd, effectiveMime);
    }

    chunks.push({
      blob: chunkBlob,
      mimeType: chunkMime,
      partIndex: i + 1,
      totalParts,
      startTimeSec: startSec,
      endTimeSec: endSec,
      startTimeFormatted: formatSecondsToTime(startSec),
      endTimeFormatted: formatSecondsToTime(endSec),
      sizeBytes: chunkBlob.size,
    });
  }

  return chunks;
}

/**
 * Converts Float32Array audio samples (-1..1) at 16kHz to Base64-encoded 16-bit PCM little-endian
 * for Gemini Live API input.
 */
export function float32ToPcm16Base64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

/**
 * Decodes Base64-encoded 16-bit PCM little-endian audio from Gemini Live API (24kHz)
 * into a Float32Array for Web Audio API playback.
 */
export function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const numSamples = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / 32768.0;
  }
  return float32;
}

// Synthesizes a pleasant notification chime or lecture start beep
export function playChime(freq = 520, type: OscillatorType = 'sine', duration = 0.25) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('AudioContext not permitted or not supported', e);
  }
}

// Browser speech synthesis to listen to segments or summary
export function speakText(text: string, onEnd?: () => void): () => void {
  if (!('speechSynthesis' in window)) {
    return () => {};
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
