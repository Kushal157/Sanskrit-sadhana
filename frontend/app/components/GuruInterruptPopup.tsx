'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Loader2, BookOpen, Zap } from 'lucide-react';
import type { GuruInterruptFrame } from '../utils/wsGuruHandler';

interface GuruInterruptPopupProps {
  interrupt: GuruInterruptFrame | null;
  shlokaId: string;
  backendUrl: string;
  onDismiss: () => void;
  /** Called when the popup finishes and the mic should be re-enabled */
  onResumeMic: () => void;
}

// Phoneme display names for known IPA symbols
const PHONEME_DISPLAY: Record<string, string> = {
  kʰ: 'खa (kha)', gʰ: 'घ (gha)', cʰ: 'छ (cha)', jʰ: 'झ (jha)',
  ʈʰ: 'ठ (ṭha)', ɖʰ: 'ढ (ḍha)', tʰ: 'थ (tha)', dʰ: 'ध (dha)',
  pʰ: 'फ (pha)', bʰ: 'भ (bha)',
  'aː': 'आ (ā)', 'iː': 'ई (ī)', 'uː': 'ऊ (ū)',
  ʈ: 'ट (ṭa)', ɖ: 'ड (ḍa)', ɳ: 'ण (ṇa)', ʂ: 'ष (ṣa)', ʃ: 'श (śa)',
};

const TAG_ICON: Record<string, string> = {
  mahaprana:  '💨',
  guru_laghu: '🕐',
  place:      '👅',
  voicing:    '🔊',
  cross_class:'⚠️',
  generic:    '📝',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GuruInterruptPopup({
  interrupt,
  shlokaId,
  backendUrl,
  onDismiss,
  onResumeMic,
}: GuruInterruptPopupProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [hasPlayed, setHasPlayed] = useState(false);

  // Auto-fetch and play reference audio when popup opens
  useEffect(() => {
    if (!interrupt) {
      setAudioState('idle');
      setHasPlayed(false);
      return;
    }

    if (interrupt.ref_idx === null) return;

    const fetchAndPlay = async () => {
      setAudioState('loading');
      try {
        const base = backendUrl.replace(/\/+$/, '');
        const url = `${base}/reference-audio/${shlokaId}/${interrupt.ref_idx}?window_ms=350`;
        const resp = await fetch(url);

        if (!resp.ok || resp.headers.get('X-Reference-Status') === 'not-cached') {
          setAudioState('error');
          return;
        }

        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = objUrl;
        audioRef.current.onended = () => {
          setAudioState('idle');
          setHasPlayed(true);
          URL.revokeObjectURL(objUrl);
        };
        audioRef.current.onerror = () => setAudioState('error');

        await audioRef.current.play();
        setAudioState('playing');
      } catch {
        setAudioState('error');
      }
    };

    fetchAndPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interrupt]);

  const handleReplay = () => {
    if (audioRef.current && audioState === 'idle') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setAudioState('playing');
    }
  };

  const handleUnderstand = () => {
    audioRef.current?.pause();
    onDismiss();
    onResumeMic();
  };

  return (
    <AnimatePresence>
      {interrupt && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={handleUnderstand}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg pointer-events-auto rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                border: '1px solid rgba(167,139,250,0.3)',
              }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-400" />

              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">
                      Guru Intervenes
                    </h2>
                    <p className="text-indigo-300 text-xs mt-0.5">
                      {TAG_ICON[interrupt.linguistic_tag] ?? '📝'}{' '}
                      {interrupt.tip.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUnderstand}
                  className="text-indigo-400 hover:text-white transition-colors mt-1"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Phoneme comparison */}
              <div className="mx-6 mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-around gap-4 text-center">
                  <div>
                    <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">Expected</p>
                    <p className="text-3xl font-bold text-emerald-300 font-mono">
                      {PHONEME_DISPLAY[interrupt.ref_ph] ?? interrupt.ref_ph}
                    </p>
                    <p className="text-indigo-400 text-xs mt-1 font-mono">[{interrupt.ref_ph}]</p>
                  </div>
                  <div className="text-indigo-500 text-2xl">→</div>
                  <div>
                    <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">Heard</p>
                    <p className="text-3xl font-bold text-red-400 font-mono">
                      {interrupt.hyp_ph
                        ? (PHONEME_DISPLAY[interrupt.hyp_ph] ?? interrupt.hyp_ph)
                        : '—'}
                    </p>
                    <p className="text-indigo-400 text-xs mt-1 font-mono">
                      [{interrupt.hyp_ph ?? 'missing'}]
                    </p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-indigo-400 mb-1">
                    <span>Phoneme accuracy</span>
                    <span>{(interrupt.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${interrupt.score * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Guru tip */}
              <div className="mx-6 mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-400/20">
                <div className="flex gap-3">
                  <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-100 text-sm leading-relaxed">
                      {interrupt.tip.tip}
                    </p>
                    {interrupt.tip.example && (
                      <p className="text-amber-300/70 text-xs mt-2 font-mono">
                        Example: {interrupt.tip.example}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference audio controls */}
              <div className="mx-6 mb-6 flex items-center gap-3">
                <button
                  onClick={handleReplay}
                  disabled={audioState === 'playing' || audioState === 'loading' || audioState === 'error'}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${audioState === 'error'
                      ? 'bg-white/5 text-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'}
                  `}
                >
                  {audioState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {audioState === 'playing' && <Volume2 className="w-4 h-4 animate-pulse" />}
                  {(audioState === 'idle' || audioState === 'error') && <Volume2 className="w-4 h-4" />}
                  {audioState === 'loading' ? 'Loading…' :
                   audioState === 'playing' ? 'Playing…' :
                   audioState === 'error' ? 'Audio unavailable' :
                   hasPlayed ? 'Replay Guru' : 'Play Guru Pronunciation'}
                </button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleUnderstand}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                >
                  🙏 I understand — resume
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
