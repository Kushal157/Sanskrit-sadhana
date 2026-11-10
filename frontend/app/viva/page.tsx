"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Square, Play, RotateCcw, Volume2, Loader2, ArrowLeft,
  Sparkles, Award, AlertCircle, ArrowRight, BookOpen, Waves, Flame
} from "lucide-react";
import { transliterate } from "../utils/transliterate";
import { cn } from "../utils/cn";

// Classical Shlokas for Viva Examination
const SAMPLE_SHLOKAS = [
  {
    id: "gita-2-47",
    title: "Karma Yoga (Bhagavad Gita 2.47)",
    source: "Bhagavad Gita",
    text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
    transliteration: "Karmanye vadhikaras te, ma phalesu kadachana.",
    meaning: "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action."
  },
  {
    id: "gayatri",
    title: "Gayatri Mantra (Rigveda)",
    source: "Rigveda Mandala 3",
    text: "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यम्।",
    transliteration: "Om bhur bhuvah svah tat savitur varenyam.",
    meaning: "Om, the physical, mental and spiritual realms: we meditate upon that divine, radiant source of wisdom."
  },
  {
    id: "asato-ma",
    title: "Pavamana Shanti Mantra (Brihadaranyaka)",
    source: "Brihadaranyaka Upanishad",
    text: "असतो मा सद्गमय। तमसो मा ज्योतिर्गमय।",
    transliteration: "Asato ma sadgamaya, tamaso ma jyotirgamaya.",
    meaning: "Lead me from ignorance to truth, from darkness to light, from mortality to immortality."
  },
];

interface VivaFeedback {
  guru_verdict: string;
  mispronounced_word: string;
  timestamps: [number, number];
  score: number;
  detailed_errors: any[];
}

export default function VivaPage() {
  const [currentShlokaIndex, setCurrentShlokaIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<VivaFeedback | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [guruSpeaking, setGuruSpeaking] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const currentShloka = SAMPLE_SHLOKAS[currentShlokaIndex];

  // Initialize Web Audio API
  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          recordedChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          setRecordedAudioBlob(blob);
          recordedChunksRef.current = [];
        };
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Detect silence using Web Audio API
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    let animationFrameId: number;

    const detectSilence = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const SILENCE_THRESHOLD = 30;

      setGlowIntensity(Math.min(100, average * 2.5));

      if (average < SILENCE_THRESHOLD) {
        if (silenceTimeoutRef.current === null) {
          silenceTimeoutRef.current = setTimeout(() => {
            stopRecording();
            silenceTimeoutRef.current = null;
          }, 800);
        }
      } else {
        if (silenceTimeoutRef.current !== null) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }

      if (isRecording) {
        animationFrameId = requestAnimationFrame(detectSilence);
      }
    };

    detectSilence();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (!mediaRecorderRef.current) return;

    try {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setFeedback(null);
      setGlowIntensity(0);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitRecording = async () => {
    if (!recordedAudioBlob) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        const response = await fetch("/api/guru/viva-evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shloka_text: currentShloka.transliteration,
            audio_base64: base64Audio,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to evaluate pronunciation");
        }

        const data: VivaFeedback = await response.json();
        setFeedback(data);

        speakGuruVerdictAndPlayAudio(data);
      };
      reader.readAsDataURL(recordedAudioBlob);
    } catch (err) {
      console.error("Error submitting recording:", err);
      alert("Error evaluating pronunciation. Please check backend status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakGuruVerdictAndPlayAudio = async (feedbackData: VivaFeedback) => {
    setGuruSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(feedbackData.guru_verdict);
      utterance.rate = 0.9;
      utterance.pitch = 0.9;

      utterance.lang = "en-IN";
      const voices = window.speechSynthesis.getVoices();
      const enInVoice = voices.find(v => v.lang === "en-IN" || v.lang.toLowerCase() === "en-in");
      if (enInVoice) {
        utterance.voice = enInVoice;
      }

      return new Promise<void>((resolve) => {
        utterance.onend = async () => {
          if (feedbackData.score < 90 && feedbackData.mispronounced_word && feedbackData.mispronounced_word !== "word_boundary") {
            const correctionText = "The correct pronunciation is ";
            const correctionUtterance = new SpeechSynthesisUtterance(correctionText);
            correctionUtterance.rate = 0.9;
            correctionUtterance.pitch = 0.9;
            correctionUtterance.lang = "en-IN";
            if (enInVoice) {
              correctionUtterance.voice = enInVoice;
            }

            correctionUtterance.onend = () => {
              const devanagariWord = transliterate(feedbackData.mispronounced_word);

              const wordUtterance = new SpeechSynthesisUtterance(devanagariWord);
              wordUtterance.rate = 0.75;
              wordUtterance.pitch = 1.0;
              wordUtterance.lang = "hi-IN";

              const currentVoices = window.speechSynthesis.getVoices();
              const hiVoice = currentVoices.find(v => v.lang.startsWith("hi-IN") || v.lang.startsWith("hi"));
              if (hiVoice) {
                wordUtterance.voice = hiVoice;
              }

              wordUtterance.onend = async () => {
                if (feedbackData.timestamps[1] > feedbackData.timestamps[0]) {
                  await playExpertAudioSegment(feedbackData.timestamps);
                }
                setGuruSpeaking(false);
                resolve();
              };

              window.speechSynthesis.speak(wordUtterance);
            };

            window.speechSynthesis.speak(correctionUtterance);
          } else {
            if (feedbackData.timestamps[1] > feedbackData.timestamps[0]) {
              await playExpertAudioSegment(feedbackData.timestamps);
            }
            setGuruSpeaking(false);
            resolve();
          }
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (err) {
      console.error("Error speaking verdict:", err);
      setGuruSpeaking(false);
    }
  };

  const playExpertAudioSegment = async (timestamps: [number, number]) => {
    console.log(`Expert reference audio segment: ${timestamps[0]}ms - ${timestamps[1]}ms`);
    const audio = new Audio();
    audio.volume = 0.7;
    try {
      await audio.play().catch(() => {});
    } catch {
      // Gracefully handle playback issues
    }
  };

  const resetState = () => {
    setFeedback(null);
    setRecordedAudioBlob(null);
    setGlowIntensity(0);
    recordedChunksRef.current = [];
  };

  const nextShloka = () => {
    setCurrentShlokaIndex((prev) => (prev + 1) % SAMPLE_SHLOKAS.length);
    resetState();
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return to Recitation Chamber</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-500/10 border border-saffron-500/20 text-xs font-bold text-primary">
          <Flame className="w-3.5 h-3.5" />
          <span>Oral Viva Examination</span>
        </div>
      </div>

      {/* Main Altar Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-altar rounded-3xl p-6 sm:p-10 border border-saffron-500/20 shadow-2xl relative overflow-hidden"
      >
        {/* Guru Presence Aura */}
        <div
          className={cn(
            "absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700",
            guruSpeaking ? "bg-amber-500/30 scale-125" : "bg-saffron-500/10"
          )}
        />

        {/* Title */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">
            <Sparkles className="w-3 h-3" />
            <span>Interactive Oral Sadhana</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient">
            Vedic Viva Mode
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Recite the designated verse. The AI Guru listens for rhythm and vowel elongation, detects pauses automatically, and provides spoken corrections.
          </p>
        </div>

        {/* Scripture Card */}
        <motion.div
          key={currentShloka.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 border",
            isRecording
              ? "bg-saffron-500/10 border-saffron-500/50 saffron-glow"
              : "bg-black/5 dark:bg-white/[0.02] border-white/10 dark:border-white/5"
          )}
        >
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: `0 0 ${glowIntensity}px rgba(240, 106, 26, ${Math.max(0.2, glowIntensity / 100)})`,
              }}
              transition={{ duration: 0.05 }}
            />
          )}

          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary block mb-3">
            {currentShloka.source} • Passage {currentShlokaIndex + 1} of {SAMPLE_SHLOKAS.length}
          </span>

          <p className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground leading-relaxed font-semibold my-4">
            {currentShloka.text}
          </p>

          <p className="text-base sm:text-lg italic text-muted-foreground font-light mb-4">
            {currentShloka.transliteration}
          </p>

          <div className="pt-3 border-t border-white/5 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
              &ldquo;{currentShloka.meaning}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Dynamic Controls Bar */}
        <div className="flex flex-col items-center justify-center gap-4 my-8">
          {!isRecording && !recordedAudioBlob && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="btn btn-primary px-8 py-3.5 text-sm font-bold rounded-2xl shadow-xl flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              <span>Begin Oral Recitation</span>
            </motion.button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="btn px-8 py-3.5 text-sm font-bold rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-500/30 flex items-center gap-2 animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>Stop &amp; Submit Recitation</span>
              </motion.button>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span>Listening actively • Auto-completes upon silence</span>
              </p>
            </div>
          )}

          {recordedAudioBlob && !isProcessing && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitRecording}
                className="btn btn-primary px-6 py-3 text-sm font-bold rounded-2xl shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Submit to Guru for Evaluation</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetState}
                className="btn btn-secondary px-5 py-3 text-sm font-semibold rounded-2xl"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Re-record</span>
              </motion.button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>The Guru is analyzing your phonemes...</span>
            </div>
          )}
        </div>

        {/* Guru Feedback Stage */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="rounded-3xl border border-saffron-500/30 bg-gradient-to-b from-saffron-500/10 to-gold-500/5 p-6 sm:p-8 space-y-6"
            >
              {/* Score Display */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  Viva Score
                </span>
                <div className="text-5xl sm:text-6xl font-black font-display text-gradient">
                  {Math.round(feedback.score)}%
                </div>
              </div>

              {/* Spoken Guru Verdict */}
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3",
                  guruSpeaking
                    ? "bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "bg-white/5 border-white/10"
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", guruSpeaking ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-white/10 text-muted-foreground")}>
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">
                    {guruSpeaking ? "Guru Speaking Now..." : "Guru's Counsel"}
                  </p>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed italic">
                    &ldquo;{feedback.guru_verdict}&rdquo;
                  </p>
                </div>
              </div>

              {/* Areas to Improve */}
              {feedback.detailed_errors && feedback.detailed_errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-primary" />
                    <span>Detailed Phonetic Observations</span>
                  </h4>
                  <ul className="space-y-2">
                    {feedback.detailed_errors.slice(0, 3).map((error, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>{error.description || error.category || "Phonetic stress discrepancy"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={resetState}
                  className="btn btn-secondary text-xs sm:text-sm py-2.5 px-5 font-semibold"
                >
                  Chant This Verse Again
                </button>
                <button
                  onClick={nextShloka}
                  className="btn btn-primary text-xs sm:text-sm py-2.5 px-6 font-bold"
                >
                  <span>Next Passage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sacred Sadhana Guidance Tip */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">
            Guru Advice: Articulate guttural, palatal, and retroflex consonants deliberately.
          </p>
          <p className="text-[11px] opacity-75">
            The analyzer will automatically conclude your turn when you pause after recitation.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
