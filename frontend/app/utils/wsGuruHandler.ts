/**
 * wsGuruHandler.ts — WebSocket + PCM 16-bit audio handler for Guru Teaching mode.
 *
 * Captures microphone audio using the Web Audio API, downsamples to 16kHz mono PCM-16,
 * and streams binary chunks to the /ws/guru-teaching endpoint.
 *
 * Receives JSON alignment frames and dispatches them to registered callbacks.
 */

export interface PhonemeScore {
  ref_idx: number | null;
  ref_ph: string | null;
  hyp_ph: string | null;
  score: number;           // 0.0 – 1.0
  op: string;              // match | sub | del | ins
  linguistic_tag: string | null;
}

export interface GuruLaghuMetrics {
  guru_total: number;
  laghu_total: number;
  guru_correct: number;
  laghu_correct: number;
  guru_accuracy: number;
  laghu_accuracy: number;
  ratio_accuracy: number;
  guru_laghu_errors: number;
}

export interface AlignmentFrame {
  type: 'alignment';
  phoneme_scores: PhonemeScore[];
  guru_laghu_metrics: GuruLaghuMetrics;
  transcript: string;
  score: number;
  errors: Record<string, unknown>[];
}

export interface GuruInterruptFrame {
  type: 'guru_interrupt';
  ref_idx: number | null;
  ref_ph: string;
  hyp_ph: string | null;
  score: number;
  linguistic_tag: string;
  tip: {
    title: string;
    tip: string;
    example: string;
  };
}

export type GuruFrame =
  | AlignmentFrame
  | GuruInterruptFrame
  | { type: 'ready' }
  | { type: 'session_end' }
  | { type: 'error'; message: string };

export interface GuruHandlerCallbacks {
  onAlignment?: (frame: AlignmentFrame) => void;
  onGuruInterrupt?: (frame: GuruInterruptFrame) => void;
  onReady?: () => void;
  onSessionEnd?: () => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// ---------------------------------------------------------------------------
// PCM helpers
// ---------------------------------------------------------------------------

/** Downsample Float32Array from srcRate → 16000 Hz using linear interpolation. */
function downsampleTo16k(buffer: Float32Array, srcRate: number): Float32Array {
  if (srcRate === 16000) return buffer;
  const ratio = srcRate / 16000;
  const outLength = Math.round(buffer.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, buffer.length - 1);
    const frac = srcIdx - lo;
    out[i] = buffer[lo] * (1 - frac) + buffer[hi] * frac;
  }
  return out;
}

/** Convert Float32 PCM [-1,1] → Int16 PCM [-32768,32767] as ArrayBuffer. */
function float32ToPcm16(samples: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clamped * 32767, true /* little-endian */);
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Main handler class
// ---------------------------------------------------------------------------

export class GuruWebSocketHandler {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private callbacks: GuruHandlerCallbacks;
  private isRecording = false;
  private backendUrl: string;

  constructor(backendUrl: string, callbacks: GuruHandlerCallbacks = {}) {
    this.backendUrl = backendUrl;
    this.callbacks = callbacks;
  }

  // ---- Connection lifecycle -----------------------------------------------

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const wsUrl = this.backendUrl
      .replace(/^http/, 'ws')
      .replace(/\/+$/, '') + '/ws/guru-teaching';

    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.callbacks.onConnectionChange?.(true);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const frame: GuruFrame = JSON.parse(event.data);
          this._dispatchFrame(frame);
        } catch {
          this.callbacks.onError?.('Malformed JSON from server');
        }
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.('WebSocket connection error');
    };

    this.ws.onclose = () => {
      this.callbacks.onConnectionChange?.(false);
    };
  }

  disconnect(): void {
    this.stopRecording();
    this.ws?.close();
    this.ws = null;
  }

  // ---- Session config ------------------------------------------------------

  sendConfig(shlokaText: string, shlokaId: string, refText?: string): void {
    this._send(JSON.stringify({
      type: 'config',
      shloka_text: shlokaText,
      shloka_id: shlokaId,
      ref_text: refText ?? shlokaText,
    }));
  }

  sendEndSignal(): void {
    this._send(JSON.stringify({ type: 'end' }));
  }

  // ---- Audio capture -------------------------------------------------------

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: 16000 },
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // AudioContext may be at any native sample rate; we downsample in JS
    this.audioCtx = new AudioContext();
    const nativeSampleRate = this.audioCtx.sampleRate;

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

    // ScriptProcessorNode gives us raw PCM access (deprecated but widely supported)
    // For production, migrate to AudioWorkletNode
    const bufferSize = 4096;
    this.processorNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const downsampled = downsampleTo16k(inputData, nativeSampleRate);
      const pcm16 = float32ToPcm16(downsampled);
      this._sendBinary(pcm16);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioCtx.destination);

    this.isRecording = true;
  }

  stopRecording(): void {
    this.isRecording = false;
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioCtx?.close();
    this.processorNode = null;
    this.sourceNode = null;
    this.stream = null;
    this.audioCtx = null;
  }

  get recording(): boolean {
    return this.isRecording;
  }

  // ---- Internal helpers ----------------------------------------------------

  private _send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private _sendBinary(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private _dispatchFrame(frame: GuruFrame): void {
    switch (frame.type) {
      case 'alignment':
        this.callbacks.onAlignment?.(frame);
        break;
      case 'guru_interrupt':
        this.callbacks.onGuruInterrupt?.(frame);
        break;
      case 'ready':
        this.callbacks.onReady?.();
        break;
      case 'session_end':
        this.callbacks.onSessionEnd?.();
        break;
      case 'error':
        this.callbacks.onError?.(frame.message);
        break;
    }
  }
}
