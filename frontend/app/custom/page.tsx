"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Play, Type, Info, BookOpen, Feather, Copy, Check } from 'lucide-react';
import { transliterate } from '../utils/transliterate';
import { inferCustomMeaning } from '../utils/meaning';

const QUICK_GLYPHS = [
  { char: 'ā', label: 'long a' },
  { char: 'ī', label: 'long i' },
  { char: 'ū', label: 'long u' },
  { char: 'ṛ', label: 'vocalic r' },
  { char: 'ś', label: 'palatal sh' },
  { char: 'ṣ', label: 'retroflex sh' },
  { char: 'ṃ', label: 'anusvāra' },
  { char: 'ḥ', label: 'visarga' },
  { char: 'om', label: 'praṇava ॐ' },
];

export default function CustomPracticePage() {
    const [englishText, setEnglishText] = useState('');
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const sanskritText = transliterate(englishText);
    const customMeaning = englishText.trim() ? inferCustomMeaning(englishText) : '';

    const insertGlyph = (glyph: string) => {
        setEnglishText((prev) => prev + glyph);
    };

    const handleCopyDevanagari = () => {
        if (!sanskritText) return;
        navigator.clipboard.writeText(sanskritText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartPractice = () => {
        if (!englishText.trim()) return;

        const meaning = customMeaning || inferCustomMeaning(englishText);
        const customShlokaText = transliterate(englishText);

        const params = new URLSearchParams({
            customText: customShlokaText,
            customIAST: englishText,
            customMeaning: meaning,
            isCustom: 'true'
        });

        router.push(`/?${params.toString()}`);
    };

    return (
        <div className="relative max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-8">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Recitation Chamber</span>
                </Link>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-xs font-bold text-gold-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Real-time IAST Scribe</span>
                </div>
            </div>

            {/* Header Banner */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-gradient">
                    Custom Sanskrit Scribe
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Compose or paste any Sanskrit shloka in English IAST. Our grapheme engine will instantly render it into divine Devanagari, ready for speech analysis.
                </p>
            </div>

            {/* Main Interactive Scribe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Input Card: IAST Scribe */}
                <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-xl flex flex-col justify-between space-y-6"
                >
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-saffron-500/10 text-primary flex items-center justify-center">
                                    <Type className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Phonetic Input (IAST)</h3>
                                    <p className="text-[10px] text-muted-foreground">Type phonetically in Latin script</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                                IAST / English
                            </span>
                        </div>

                        {/* Quick Glyph Insertion Chips */}
                        <div className="space-y-1.5 mb-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                                Quick Accents
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_GLYPHS.map((g) => (
                                    <button
                                        key={g.char}
                                        onClick={() => insertGlyph(g.char)}
                                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-saffron-500/15 border border-white/10 hover:border-saffron-500/30 text-xs font-mono text-foreground transition-all"
                                        title={g.label}
                                    >
                                        {g.char}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={englishText}
                            onChange={(e) => setEnglishText(e.target.value)}
                            placeholder="Example: om namo bhagavate vasudevaya..."
                            className="w-full h-44 bg-white/5 dark:bg-black/30 border border-white/10 dark:border-white/5 rounded-2xl p-4 text-base font-serif text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-muted-foreground leading-relaxed">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>
                            Standard mapping supported: <span className="font-mono text-primary">&apos;aa&apos;</span> or <span className="font-mono text-primary">&apos;ā&apos;</span> for long A, <span className="font-mono text-primary">&apos;sh&apos;</span> for ś, <span className="font-mono text-primary">&apos;om&apos;</span> for ॐ.
                        </span>
                    </div>
                </motion.div>

                {/* Output Card: Devanagari Manifestation */}
                <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-bl-full pointer-events-none" />

                    <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center">
                                    <Feather className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Devanagari Manifestation</h3>
                                    <p className="text-[10px] text-muted-foreground">Sacred script generation</p>
                                </div>
                            </div>
                            {sanskritText && (
                                <button
                                    onClick={handleCopyDevanagari}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                                    title="Copy Devanagari text"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            )}
                        </div>

                        {/* Manifested Script Box */}
                        <div className="w-full h-44 bg-gradient-to-b from-black/5 to-black/15 dark:from-white/[0.02] dark:to-black/30 border border-white/10 dark:border-white/5 rounded-2xl p-4 flex items-center justify-center text-center overflow-y-auto custom-scrollbar">
                            {sanskritText ? (
                                <p className="text-2xl sm:text-3xl font-serif text-foreground leading-relaxed font-semibold">
                                    {sanskritText}
                                </p>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground/40 italic">
                                    Sacred Devanagari glyphs will manifest here as you type...
                                </p>
                            )}
                        </div>

                        {/* Inferred Context & Meaning Preview */}
                        <div className="mt-4 rounded-xl border border-white/10 dark:border-white/5 bg-white/5 p-3.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Meaning Interpretation</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {customMeaning || 'A custom passage composed for concentrated phonetic practice.'}
                            </p>
                        </div>
                    </div>

                    {/* Launch Practice Button */}
                    <button
                        onClick={handleStartPractice}
                        disabled={!englishText.trim()}
                        className="btn btn-primary w-full py-3.5 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Open in Recitation Chamber</span>
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
