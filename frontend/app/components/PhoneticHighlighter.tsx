'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhonemeScore } from '../utils/wsGuruHandler';

interface PhoneticHighlighterProps {
  /** Devanagari shloka text to display */
  devanagariText: string;
  /** Phoneme-level scores returned from the WebSocket */
  phonemeScores: PhonemeScore[];
  /** True while audio is being captured but not yet analysed */
  isProcessing: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Colour mapping
// ---------------------------------------------------------------------------

type ColorState = 'idle' | 'processing' | 'accurate' | 'near' | 'error';

function getColorState(score: number, isProcessing: boolean): ColorState {
  if (isProcessing) return 'processing';
  if (score >= 0.8) return 'accurate';
  if (score >= 0.6) return 'near';
  return 'error';
}

const COLOR_VARIANTS: Record<ColorState, { text: string; glow: string; bg: string }> = {
  idle:       { text: 'text-amber-100',  glow: '',                         bg: 'bg-transparent' },
  processing: { text: 'text-yellow-300', glow: 'drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]', bg: 'bg-yellow-500/10' },
  accurate:   { text: 'text-emerald-300',glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]',  bg: 'bg-emerald-500/15' },
  near:       { text: 'text-orange-300', glow: 'drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]', bg: 'bg-orange-500/10' },
  error:      { text: 'text-red-400',    glow: 'drop-shadow-[0_0_10px_rgba(248,113,113,1)]',  bg: 'bg-red-500/20' },
};

// ---------------------------------------------------------------------------
// Build a character → phoneme-score mapping
// ---------------------------------------------------------------------------

/**
 * Naively maps each Devanagari character position to a phoneme index.
 * Skips whitespace, punctuation, and virāma so only phonemically significant
 * characters are coloured.
 */
function buildCharScoreMap(
  text: string,
  scores: PhonemeScore[],
): Map<number, PhonemeScore> {
  const DEVANAGARI_PUNCT = new Set(['।', '॥', ',', '.', ' ', '\n', '्']);
  const map = new Map<number, PhonemeScore>();
  let phonemeIdx = 0;

  for (let charIdx = 0; charIdx < text.length; charIdx++) {
    const ch = text[charIdx];
    if (DEVANAGARI_PUNCT.has(ch) || ch.trim() === '') continue;

    const ps = scores.find(s => s.ref_idx === phonemeIdx);
    if (ps) map.set(charIdx, ps);
    phonemeIdx++;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhoneticHighlighter({
  devanagariText,
  phonemeScores,
  isProcessing,
  className = '',
}: PhoneticHighlighterProps) {
  const charScoreMap = React.useMemo(
    () => buildCharScoreMap(devanagariText, phonemeScores),
    [devanagariText, phonemeScores],
  );

  const chars = Array.from(devanagariText);

  return (
    <div
      className={`font-serif leading-loose tracking-wide select-none ${className}`}
      aria-label="Shloka phonetic display"
    >
      <AnimatePresence mode="wait">
        {chars.map((ch, idx) => {
          const ps = charScoreMap.get(idx);
          const score = ps?.score ?? 1.0;
          const state = ps
            ? getColorState(score, isProcessing)
            : isProcessing
            ? 'processing'
            : 'idle';

          const colors = COLOR_VARIANTS[state];

          if (ch === '\n') {
            return <br key={`br-${idx}`} />;
          }

          if (ch === ' ') {
            return <span key={`sp-${idx}`}>&nbsp;</span>;
          }

          return (
            <motion.span
              key={`ch-${idx}`}
              layout
              initial={{ opacity: 0.6 }}
              animate={{
                opacity: 1,
                scale: state === 'error' ? [1, 1.15, 1] : 1,
              }}
              transition={{
                scale: { repeat: state === 'error' ? 2 : 0, duration: 0.3 },
                opacity: { duration: 0.2 },
              }}
              className={`
                inline-block relative px-[1px] rounded-sm transition-all duration-300
                ${colors.text} ${colors.glow} ${colors.bg}
              `}
              title={ps ? `${ps.ref_ph ?? '?'} → ${ps.hyp_ph ?? '?'} (${(score * 100).toFixed(0)}%)` : undefined}
            >
              {ch}
              {/* Underline bar for errors */}
              {state === 'error' && (
                <motion.span
                  layoutId={`underline-${idx}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 rounded-full"
                />
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
