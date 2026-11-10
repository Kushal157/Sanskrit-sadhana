'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mic, MicOff, Wifi, WifiOff, Activity,
  BookOpen, ChevronDown, BarChart3, Zap, AlertCircle,
} from 'lucide-react';
import { SHLOKAS } from '../data/shlokas';
import { PhoneticHighlighter } from '../components/PhoneticHighlighter';
import { GuruInterruptPopup } from '../components/GuruInterruptPopup';
import {
  GuruWebSocketHandler,
  type PhonemeScore,
  type GuruLaghuMetrics,
  type AlignmentFrame,
  type GuruInterruptFrame,
} from '../utils/wsGuruHandler';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:8001');
const GURU_INTERRUPT_THETA = 0.6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionStats {
  score: number;
  transcript: string;
  guruLaghuMetrics: GuruLaghuMetrics | null;
  phonemeScores: PhonemeScore[];
  errorCount: number;
  interruptCount: number;
}

// ---------------------------------------------------------------------------
// Guru-Laghu ratio meter component
// ---------------------------------------------------------------------------

function GuruLaghuMeter({ metrics }: { metrics: GuruLaghuMetrics | null }) {
  if (!metrics) {
    return (
      <div className="text-indigo-400/60 text-xs text-center py-4">
        Guru-Laghu data will appear after first analysis
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-violet-300">Guru (ā, ī, ū) accuracy</span>
          <span className="text-white font-mono">{(metrics.guru_accuracy * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${metrics.guru_accuracy * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-blue-300">Laghu (a, i, u) accuracy</span>
          <span className="text-white font-mono">{(metrics.laghu_accuracy * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${metrics.laghu_accuracy * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          />
        </div>
      </div>
      <div className="flex justify-between text-xs pt-1 border-t border-white/10">
        <span className="text-indigo-400">Swap errors</span>
        <span className="text-orange-300 font-mono">{metrics.guru_laghu_errors}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-indigo-400">Combined ratio score</span>
        <span
          className={`font-mono ${
            metrics.ratio_accuracy >= 0.8
              ? 'text-emerald-300'
              : metrics.ratio_accuracy >= 0.6
              ? 'text-yellow-300'
              : 'text-red-400'
          }`}
        >
          {(metrics.ratio_accuracy * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score ring component
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="48" cy="48" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold text-white"
        >
          {score}
        </motion.span>
        <span className="text-indigo-400 text-[10px]">score</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function GuruTeachingPage() {
  // ---- Shloka selection ----------------------------------------------------
  const [selectedShloka, setSelectedShloka] = useState(SHLOKAS[0]);
  const [showShlokaDropdown, setShowShlokaDropdown] = useState(false);

  // ---- WebSocket state -----------------------------------------------------
  const handlerRef = useRef<GuruWebSocketHandler | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);

  // ---- Live data -----------------------------------------------------------
  const [phonemeScores, setPhonemeScores] = useState<PhonemeScore[]>([]);
  const [guruLaghuMetrics, setGuruLaghuMetrics] = useState<GuruLaghuMetrics | null>(null);
  const [liveScore, setLiveScore] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ---- Guru Interrupt -------------------------------------------------------
  const [activeInterrupt, setActiveInterrupt] = useState<GuruInterruptFrame | null>(null);
  const interruptCount = useRef(0);

  // ---- Session log ----------------------------------------------------------
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [errorLog, setErrorLog] = useState<{ ph: string; tag: string; score: number }[]>([]);

  // ---- Init / teardown -----------------------------------------------------

  useEffect(() => {
    const handler = new GuruWebSocketHandler(BACKEND_URL, {
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      },
      onReady: () => {
        setIsProcessing(false);
      },
      onAlignment: (frame: AlignmentFrame) => {
        setPhonemeScores(frame.phoneme_scores);
        setGuruLaghuMetrics(frame.guru_laghu_metrics);
        setLiveScore(frame.score);
        setLiveTranscript(frame.transcript);
        setIsProcessing(false);

        // Update error log
        const newErrors = frame.phoneme_scores
          .filter(ps => ps.score < GURU_INTERRUPT_THETA && ps.ref_ph)
          .map(ps => ({
            ph: ps.ref_ph!,
            tag: ps.linguistic_tag ?? 'generic',
            score: ps.score,
          }));
        if (newErrors.length) {
          setErrorLog(prev => [...prev.slice(-20), ...newErrors]);
        }

        // Log to backend session history
        fetch(`${BACKEND_URL}/session/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shloka_id: selectedShloka.id,
            phoneme_scores: frame.phoneme_scores,
            guru_laghu_metrics: frame.guru_laghu_metrics,
            overall_score: frame.score,
          }),
        }).catch(() => {});
      },
      onGuruInterrupt: (frame: GuruInterruptFrame) => {
        if (!micEnabled) return;  // already in interrupt
        interruptCount.current += 1;
        setActiveInterrupt(frame);
        setMicEnabled(false);
        // Pause mic capture
        handlerRef.current?.stopRecording();
      },
      onSessionEnd: () => {
        setSessionActive(false);
        setIsProcessing(false);
      },
      onError: (msg) => {
        console.error('[GuruWS]', msg);
        setIsProcessing(false);
      },
    });

    handler.connect();
    handlerRef.current = handler;

    return () => {
      handler.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Session control -----------------------------------------------------

  const startSession = useCallback(async () => {
    const handler = handlerRef.current;
    if (!handler || !wsConnected) return;

    setPhonemeScores([]);
    setLiveScore(0);
    setLiveTranscript('');
    setErrorLog([]);
    interruptCount.current = 0;

    handler.sendConfig(selectedShloka.text, selectedShloka.id, selectedShloka.transliteration);
    setIsProcessing(true);

    await handler.startRecording();
    setSessionActive(true);
    setMicEnabled(true);
  }, [wsConnected, selectedShloka]);

  const stopSession = useCallback(() => {
    const handler = handlerRef.current;
    if (!handler) return;

    handler.stopRecording();
    handler.sendEndSignal();
    setSessionActive(false);
    setIsProcessing(false);

    setSessionStats({
      score: liveScore,
      transcript: liveTranscript,
      guruLaghuMetrics,
      phonemeScores,
      errorCount: phonemeScores.filter(p => p.score < GURU_INTERRUPT_THETA).length,
      interruptCount: interruptCount.current,
    });
  }, [liveScore, liveTranscript, guruLaghuMetrics, phonemeScores]);

  const handleDismissInterrupt = useCallback(() => {
    setActiveInterrupt(null);
  }, []);

  const handleResumeMic = useCallback(async () => {
    setMicEnabled(true);
    if (sessionActive) {
      try {
        await handlerRef.current?.startRecording();
      } catch (e) {
        console.error('Failed to resume mic', e);
      }
    }
  }, [sessionActive]);

  // ---- Render --------------------------------------------------------------

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient Vedic illumination */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-saffron-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Animated starfield background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
            animate={{ opacity: [0.1, 0.6, 0.1] }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Guru Interrupt Popup (above everything) */}
      <GuruInterruptPopup
        interrupt={activeInterrupt}
        shlokaId={selectedShloka.id}
        backendUrl={BACKEND_URL}
        onDismiss={handleDismissInterrupt}
        onResumeMic={handleResumeMic}
      />

      {/* ---- Header ---- */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/testyourself"
            className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Back</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              🪔
            </div>
            <h1 className="text-white font-bold text-xl tracking-wide">Guru Teaching Mode</h1>
          </div>

          {/* Connection indicator */}
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
            wsConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            {wsConnected
              ? <><Wifi className="w-3 h-3" /> Connected</>
              : <><WifiOff className="w-3 h-3" /> Disconnected</>
            }
          </div>
        </div>
      </header>

      {/* ---- Main layout ---- */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ============================================================
            LEFT PANEL — Shloka selection + highlighter
        ============================================================ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Shloka picker */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <button
              onClick={() => setShowShlokaDropdown(v => !v)}
              disabled={sessionActive}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                         bg-white/5 border border-white/10 hover:border-indigo-400/40
                         text-left transition-all disabled:opacity-50"
            >
              <div>
                <p className="text-indigo-300 text-xs mb-0.5">Selected Shloka</p>
                <p className="text-white font-semibold">{selectedShloka.title}</p>
                <p className="text-indigo-400 text-xs">{selectedShloka.source}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform ${showShlokaDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showShlokaDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute z-30 mt-2 w-full max-h-72 overflow-y-auto rounded-xl
                             bg-[#1e1b4b] border border-indigo-500/30 shadow-2xl"
                >
                  {SHLOKAS.slice(0, 30).map(shloka => (
                    <button
                      key={shloka.id}
                      onClick={() => {
                        setSelectedShloka(shloka);
                        setShowShlokaDropdown(false);
                        setPhonemeScores([]);
                        setLiveScore(0);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors ${
                        selectedShloka.id === shloka.id ? 'bg-indigo-600/20' : ''
                      }`}
                    >
                      <p className="text-white text-sm font-medium">{shloka.title}</p>
                      <p className="text-indigo-400 text-xs">{shloka.source}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Phonetic Highlighter card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-sm font-semibold uppercase tracking-widest">
                Real-time Phoneme Map
              </span>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-5 text-xs">
              {[
                { color: 'bg-yellow-400', label: 'Processing' },
                { color: 'bg-emerald-400', label: 'Accurate (≥80%)' },
                { color: 'bg-orange-400', label: 'Near miss (60–80%)' },
                { color: 'bg-red-400', label: 'Error (<60%)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-indigo-300">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            <PhoneticHighlighter
              devanagariText={selectedShloka.text}
              phonemeScores={phonemeScores}
              isProcessing={isProcessing}
              className="text-3xl"
            />

            {/* Transliteration */}
            <p className="mt-4 text-indigo-400/70 text-sm font-mono leading-relaxed">
              {selectedShloka.transliteration}
            </p>
          </motion.div>

          {/* Live transcript + controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-300 text-sm font-semibold">Live Transcript</span>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-1.5 text-yellow-300 text-xs">
                  <motion.div
                    className="w-2 h-2 bg-yellow-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                  Analysing…
                </div>
              )}
            </div>

            <div className="min-h-[48px] text-white/80 text-sm font-mono leading-relaxed">
              {liveTranscript || (
                <span className="text-indigo-500/60 italic">
                  {sessionActive ? 'Speak the shloka…' : 'Start a session to begin'}
                </span>
              )}
            </div>

            {/* Mic control */}
            <div className="mt-5 flex gap-3">
              {!sessionActive ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startSession}
                  disabled={!wsConnected}
                  id="btn-start-guru-session"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                             font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600
                             hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50
                             disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Mic className="w-5 h-5" />
                  {wsConnected ? 'Start Guru Teaching' : 'Waiting for connection…'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={stopSession}
                  id="btn-stop-guru-session"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                             font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600
                             hover:from-red-500 hover:to-rose-500 transition-all shadow-lg"
                >
                  <MicOff className="w-5 h-5" />
                  Stop &amp; Analyse
                </motion.button>
              )}
            </div>

            {/* Mic status badge */}
            {sessionActive && (
              <div className={`mt-3 flex items-center gap-2 text-xs ${micEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {micEnabled ? (
                  <><motion.div className="w-2 h-2 bg-emerald-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} /> Microphone active</>
                ) : (
                  <><AlertCircle className="w-3 h-3" /> Microphone paused — Guru is speaking</>
                )}
              </div>
            )}
          </motion.div>

          {/* Session results */}
          <AnimatePresence>
            {sessionStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5"
              >
                <h3 className="text-emerald-300 font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Session Results
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-white">{sessionStats.score}</p>
                    <p className="text-indigo-400 text-xs">Overall Score</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-400">{sessionStats.errorCount}</p>
                    <p className="text-indigo-400 text-xs">Error Phonemes</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-400">{sessionStats.interruptCount}</p>
                    <p className="text-indigo-400 text-xs">Guru Interrupts</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================
            RIGHT PANEL — Score ring + Guru-Laghu meter + Error log
        ============================================================ */}
        <div className="space-y-5">

          {/* Score ring */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-6 border border-white/10 flex flex-col items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <ScoreRing score={liveScore} />
            <p className="text-indigo-400 text-xs text-center">
              Real-time pronunciation score
            </p>

            {/* Interrupt counter badge */}
            {interruptCount.current > 0 && (
              <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
                <Zap className="w-3 h-3" />
                {interruptCount.current} Guru interrupt{interruptCount.current > 1 ? 's' : ''}
              </div>
            )}
          </motion.div>

          {/* Guru-Laghu meter */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <h3 className="text-indigo-300 text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Guru-Laghu Duration Ratio
            </h3>
            <GuruLaghuMeter metrics={guruLaghuMetrics} />
          </motion.div>

          {/* Error log */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <h3 className="text-indigo-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Session Error Log
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {errorLog.length === 0 ? (
                <p className="text-indigo-500/60 text-xs italic">No errors yet — keep reciting!</p>
              ) : (
                errorLog.slice(-15).reverse().map((err, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <span className="text-red-300 font-mono">[{err.ph}]</span>
                    <span className="text-indigo-400">{err.tag.replace('_', ' ')}</span>
                    <span className="text-orange-300">{(err.score * 100).toFixed(0)}%</span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Shloka meaning */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 border border-amber-500/15 bg-amber-500/5"
          >
            <h3 className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">
              Meaning
            </h3>
            <p className="text-amber-100/80 text-xs leading-relaxed">
              {selectedShloka.meaning}
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
