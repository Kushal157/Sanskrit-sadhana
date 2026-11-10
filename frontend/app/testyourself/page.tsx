'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Mic2,
  Brain,
  Zap,
  Award,
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { GuruMode } from '../components/GuruMode';
import { cn } from '../utils/cn';

interface SessionStats {
  correctAnswers: number;
  totalQuestions: number;
  averageScore: number;
  currentStreak: number;
}

type Screen = 'home' | 'guru' | 'summary';

export default function TestYourselfPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [sessionMode, setSessionMode] = useState<'test' | 'practice'>('practice');
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const router = useRouter();

  const handleStartSession = (mode: 'test' | 'practice') => {
    setSessionMode(mode);
    setScreen('guru');
  };

  const handleSessionEnd = (stats: SessionStats) => {
    setSessionStats(stats);
    setScreen('summary');
  };

  const handleBackToHome = () => {
    setScreen('home');
    setSessionStats(null);
  };

  if (screen === 'guru' && sessionStats === null) {
    return (
      <GuruMode
        initialMode={sessionMode}
        onExit={handleSessionEnd}
      />
    );
  }

  if (screen === 'summary' && sessionStats) {
    return (
      <SessionSummary
        stats={sessionStats}
        mode={sessionMode}
        onContinue={() => handleStartSession(sessionMode)}
        onReturn={handleBackToHome}
      />
    );
  }

  return (
    <div className="relative max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-10">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Recitation Chamber</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-500/10 border border-saffron-500/20 text-xs font-bold text-primary">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Guru-Shishya Vidya</span>
        </div>
      </div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">
          <Sparkles className="w-3 h-3" />
          <span>Voice-Driven Knowledge Assessment</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-display text-gradient tracking-tight">
          Vedic Quiz &amp; Knowledge Hall
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Engage in an authentic oral dialogue with the AI Guru. Test your Sanskrit verses, comprehension, and pronunciation accuracy with progressive difficulty levels.
        </p>
      </motion.div>

      {/* Feature Pillar Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Mic2,
            title: 'Oral Voice Dialogue',
            description: 'Recite answers naturally with real-time speech evaluation',
            tone: 'from-saffron-500 to-gold-500',
          },
          {
            icon: Brain,
            title: 'Guru Feedback',
            description: 'Instant counsel on pronunciation, sandhi and semantics',
            tone: 'from-amber-500 to-saffron-500',
          },
          {
            icon: Zap,
            title: 'Adaptive Levels',
            description: 'Questions adjust dynamically to your chanting fluency',
            tone: 'from-gold-400 to-amber-500',
          },
          {
            icon: Award,
            title: 'Sadhana Mastery',
            description: 'Build streaks and track milestone recitation achievements',
            tone: 'from-emerald-400 to-teal-500',
          },
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/[0.02] p-4 text-center space-y-2 hover:border-primary/20 transition-all"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${feature.tone} text-white flex items-center justify-center mx-auto shadow-md`}>
              <feature.icon className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">{feature.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Test Mode */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-saffron-500/10 text-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">Examination Mode (Pariksha)</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Formal Evaluation</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Challenge yourself under examination criteria. The Guru poses questions on shloka completion, word meaning, and phonetic clarity with formal scoring.
            </p>

            <ul className="space-y-2 text-xs text-muted-foreground pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Timed vocal response window</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Strict phonetic and sandhi evaluation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Session scorecard with mastery badges</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartSession('test')}
            className="btn btn-primary w-full py-3.5 text-xs sm:text-sm font-bold shadow-xl flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4 fill-current" />
            <span>Enter Examination Mode</span>
          </motion.button>
        </motion.div>

        {/* Practice Mode */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-500/10 text-gold-400 flex items-center justify-center">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-foreground">Practice Mode (Abhyasa)</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400">Patience-First Learning</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore Sanskrit at your own pace without scoring pressure. The Guru provides hints, repeats audio segments, and gently guides your pronunciation.
            </p>

            <ul className="space-y-2 text-xs text-muted-foreground pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>Unlimited retries with gentle guidance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>Audio assistance for difficult syllables</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>Switch to Examination mode at any time</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartSession('practice')}
            className="btn btn-secondary w-full py-3.5 text-xs sm:text-sm font-bold border-gold-500/30 text-gold-400 hover:border-gold-500/60 flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4 fill-current" />
            <span>Enter Practice Mode</span>
          </motion.button>
        </motion.div>

        {/* Live Guru Teaching Card (Span 2 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 rounded-3xl glass-altar p-6 sm:p-8 border border-saffron-500/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <GraduationCap className="w-4 h-4" />
                <span>Real-Time Chanting Classroom</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                Live Guru Teaching &amp; WebSocket Alignment
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experience stream-based phoneme alignment via WebSocket, Guru-Laghu duration ratio monitoring, and dynamic teacher interruption when a sound is mispronounced.
              </p>
            </div>

            <button
              onClick={() => router.push('/guru-teaching')}
              className="btn btn-primary py-3 px-6 text-xs sm:text-sm font-bold shrink-0 shadow-lg flex items-center gap-2"
            >
              <span>Launch Live Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SessionSummary({
  stats,
  mode,
  onContinue,
  onReturn,
}: {
  stats: SessionStats;
  mode: 'test' | 'practice';
  onContinue: () => void;
  onReturn: () => void;
  }) {
  const successRate = Math.round((stats.correctAnswers / Math.max(1, stats.totalQuestions)) * 100);
  const isExcellent = successRate >= 80;

  return (
    <div className="relative max-w-3xl mx-auto px-4 py-12 text-center space-y-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-altar rounded-3xl p-8 sm:p-12 border border-saffron-500/20 shadow-2xl space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-saffron-500 to-gold-500 text-white flex items-center justify-center mx-auto text-3xl shadow-xl shadow-saffron-500/25">
          {isExcellent ? '🏆' : '🙏'}
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Session Completed
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-gradient mt-1">
            {isExcellent ? 'Uttama Sadhana! Excellent!' : 'Sadhana Completed! Good Effort!'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            You successfully completed your {mode} session with your AI Guru.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-2xl font-black font-display text-foreground">{stats.totalQuestions}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Verses</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-2xl font-black font-display text-emerald-400">{stats.correctAnswers}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Accurate</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-2xl font-black font-display text-primary">{successRate}%</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resonance</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-2xl font-black font-display text-gold-400">{stats.currentStreak} 🔥</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={onContinue}
            className="btn btn-primary px-6 py-3 text-xs sm:text-sm font-bold shadow-lg"
          >
            Continue Learning
          </button>
          <button
            onClick={onReturn}
            className="btn btn-secondary px-6 py-3 text-xs sm:text-sm font-semibold"
          >
            Return to Chamber
          </button>
        </div>
      </motion.div>
    </div>
  );
}
