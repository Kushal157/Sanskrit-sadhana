/**
 * Voice Processor - Handles speech recognition, synthesis, and audio processing
 * Uses Web Speech API for cross-browser compatibility
 */

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceProcessorConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

const DEFAULT_CONFIG: VoiceProcessorConfig = {
  language: 'en-US', // Can support Hindi, Sanskrit variants if available
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
};

export class VoiceProcessor {
  private recognition: any;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private isListening: boolean = false;
  private transcript: string = '';
  private confidence: number = 0;
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(config: Partial<VoiceProcessorConfig> = {}) {
    const SpeechRecognition = (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition API not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    this.recognition.language = finalConfig.language;
    this.recognition.continuous = finalConfig.continuous;
    this.recognition.interimResults = finalConfig.interimResults;
    this.recognition.maxAlternatives = finalConfig.maxAlternatives;

    this.setupRecognitionListeners();
  }

  private setupRecognitionListeners(): void {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.transcript = '';
      this.confidence = 0;
    };

    this.recognition.onresult = (event: any) => {
      this.transcript = '';
      this.confidence = 0;
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        this.transcript += transcript + ' ';
        
        if (event.results[i].isFinal) {
          isFinal = true;
          this.confidence = event.results[i][0].confidence;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript: this.transcript.trim(),
          confidence: this.confidence,
          isFinal,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  /**
   * Start listening for speech
   */
  public startListening(): void {
    if (!this.isListening) {
      this.transcript = '';
      this.recognition.start();
    }
  }

  /**
   * Stop listening for speech
   */
  public stopListening(): void {
    if (this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort listening
   */
  public abort(): void {
    this.recognition.abort();
    this.isListening = false;
  }

  /**
   * Speak text using Web Speech API
   */
  public async speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event: any) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Register callback for recognition results
   */
  public onResult(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Register callback for recognition errors
   */
  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Register callback for recognition end
   */
  public onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Get current transcript
   */
  public getTranscript(): string {
    return this.transcript.trim();
  }

  /**
   * Get current confidence
   */
  public getConfidence(): number {
    return this.confidence;
  }

  /**
   * Check if currently listening
   */
  public isListeningNow(): boolean {
    return this.isListening;
  }

  /**
   * Cancel ongoing speech
   */
  public cancelSpeech(): void {
    window.speechSynthesis.cancel();
  }
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidenceScore(
  speechConfidence: number,
  responseValidity: boolean,
  pronunciationMatch: number // 0-100
): number {
  const weights = {
    speech: 0.4,      // 40% - speech recognition confidence
    validity: 0.3,    // 30% - response validity
    pronunciation: 0.3, // 30% - pronunciation match
  };

  const validityScore = responseValidity ? 100 : 50;
  const score =
    speechConfidence * 100 * weights.speech +
    validityScore * weights.validity +
    pronunciationMatch * weights.pronunciation;

  return Math.min(100, Math.max(0, score));
}

/**
 * Pronunciations database for Sanskrit words
 */
export const SANSKRIT_PRONUNCIATIONS: Record<string, string[]> = {
  om: ['o', 'hm'], // Nasalized ending
  namah: ['na', 'mah'],
  shivaya: ['shi', 'va', 'ya'],
  namaste: ['na', 'ma', 'ste'],
  tat: ['taht'], // retroflex t
  tvam: ['tvahm'],
  asi: ['ah', 'si'],
  aham: ['ah', 'hum'], // with nasalization
  brahmasmi: ['brah', 'mah', 'smi'],
};

/**
 * Analyze pronunciation by comparing with expected phonemes
 */
export function analyzePronunciation(
  recognizedText: string,
  expectedIAST: string
): { score: number; feedback: string } {
  const recognized = recognizedText.toLowerCase().trim();
  const expected = expectedIAST.toLowerCase().trim();

  // Exact match
  if (recognized === expected) {
    return {
      score: 100,
      feedback: '✓ Perfect pronunciation!',
    };
  }

  // Calculate similarity score using basic string matching
  const similarityScore = calculateSimilarity(recognized, expected);

  let feedback = '';
  if (similarityScore >= 80) {
    feedback = '✓ Great! Minor adjustments needed.';
  } else if (similarityScore >= 60) {
    feedback = '~ Good effort. Listen carefully and try again.';
  } else {
    feedback = '✗ Please listen carefully to the pronunciation.';
  }

  return {
    score: Math.round(similarityScore),
    feedback,
  };
}

/**
 * Calculate similarity between two strings (Levenshtein distance based)
 */
function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) {
    return 100;
  }

  const editDistance = getLevenshteinDistance(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
