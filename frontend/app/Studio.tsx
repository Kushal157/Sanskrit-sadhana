"use client";

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import {
    Mic, Square, RefreshCw, Volume2, Search, ArrowRight,
    Award, History, Info, Sparkles, LogOut, LogIn,
    ChevronLeft, ChevronRight, Activity, Clock, Waves, Target, BookOpen, CheckCircle2, Download, ExternalLink,
    Play, Pause, Flame, Disc, Radio, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SHLOKAS, Shloka } from './data/shlokas';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from './utils/cn';
import { useAuth } from './context/AuthContext';

interface AnalysisError {
    description: string;
    ref_ph: string | null;
    hyp_ph: string | null;
    ref_idx: number;
}

interface WordFeedback {
    word: string;
    word_index: number;
    issue_count: number;
    severity: 'low' | 'medium' | 'high';
}

interface WordMismatch {
    mismatch_type: 'replace' | 'delete' | 'insert';
    expected_word: string | null;
    pronounced_word: string | null;
    expected_index: number | null;
    pronounced_index: number | null;
}

type MismatchSeverity = 'low' | 'medium' | 'high';

interface AnalysisResult {
    score: number;
    matches: number;
    total_ref: number;
    errors: AnalysisError[];
    ref_mismatches?: number;
    op_counts?: {
        sub?: number;
        del?: number;
        ins?: number;
    };
    word_feedback?: WordFeedback[];
    word_mismatches?: WordMismatch[];
}

interface PronunciationResult {
    score: number;
    analysis: AnalysisResult;
    transcript?: string;
}

function getScoreSummary(score: number) {
    if (score >= 90) {
        return {
            label: "Divya Dhvani • Divine Resonance",
            message: "Your chant is exquisitely aligned. Phonemes landed with pristine clarity and authentic Sanskrit cadence.",
            badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300",
            scoreClassName: "from-emerald-400 via-teal-300 to-amber-300",
            glowColor: "rgba(16, 185, 129, 0.25)",
        };
    }

    if (score >= 75) {
        return {
            label: "Uttama Sadhana • Strong Foundation",
            message: "Strong vocal flow and rhythmic pacing. Minor refinement needed on long vowel lengths or consonant transitions.",
            badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-300",
            scoreClassName: "from-amber-400 via-gold-400 to-saffron-500",
            glowColor: "rgba(245, 158, 11, 0.25)",
        };
    }

    return {
        label: "Punah Abhyasa • Guided Practice",
        message: "Phonetic deviation detected. Listen closely to the reference audio, slow down your pace, and chant syllable by syllable.",
        badgeClassName: "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-300",
        scoreClassName: "from-rose-400 via-orange-400 to-amber-500",
        glowColor: "rgba(244, 63, 94, 0.25)",
    };
}

function getScoreBreakdown(results: PronunciationResult | null) {
    const analysis = results?.analysis;
    const totalRef = analysis?.total_ref ?? 0;
    const matches = analysis?.matches ?? 0;
    const errors = analysis?.errors ?? [];
    const refMismatches = analysis?.ref_mismatches ?? Math.max(0, totalRef - matches);
    const extraSounds = analysis?.op_counts?.ins ?? 0;
    const alignment = totalRef > 0 ? Math.round((matches / totalRef) * 100) : 0;
    const consistency = Math.max(0, 100 - refMismatches * 6);
    const clarity = Math.max(0, Math.min(100, Math.round((results?.score ?? 0) * 0.85 + alignment * 0.15)));

    return { totalRef, matches, errors, refMismatches, extraSounds, alignment, consistency, clarity };
}

function MetricBar({ label, value, tone, subtitle }: { label: string; value: number; tone: string; subtitle?: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                    {label}
                    {subtitle && <span className="text-[10px] text-muted-foreground/60 font-normal">({subtitle})</span>}
                </span>
                <span className="font-mono font-bold text-foreground">{value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10 p-[1px]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r shadow-sm", tone)}
                />
            </div>
        </div>
    );
}

function InsightStat({
    title,
    value,
    caption,
    accentClassName,
}: {
    title: string;
    value: number;
    caption: string;
    accentClassName: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-zinc-900/40 p-4 transition-all hover:border-saffron-500/20">
            <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accentClassName)} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {title}
            </p>
            <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black font-display text-foreground">{value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/80">
                {caption}
            </p>
        </div>
    );
}

function tokenizeTransliterationWords(text: string): string[] {
    return text
        .replace(/\n/g, ' ')
        .replace(/[|।॥]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean);
}

function getSeverityClasses(severity: MismatchSeverity) {
    if (severity === 'high') {
        return {
            word: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40 shadow-sm shadow-rose-500/10',
            item: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
            badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
    }

    if (severity === 'medium') {
        return {
            word: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 shadow-sm shadow-amber-500/10',
            item: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }

    return {
        word: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40 shadow-sm shadow-sky-500/10',
        item: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
}

function getMismatchDefaultSeverity(mismatchType: WordMismatch['mismatch_type']): MismatchSeverity {
    if (mismatchType === 'delete') return 'high';
    if (mismatchType === 'replace') return 'medium';
    return 'low';
}

function getMismatchTooltipText(item: WordMismatch, severity: MismatchSeverity): string {
    if (item.mismatch_type === 'replace' && item.expected_word && item.pronounced_word) {
        return `Expected "${item.expected_word}", but heard "${item.pronounced_word}" (${severity} severity).`;
    }
    if (item.mismatch_type === 'delete' && item.expected_word) {
        return `Expected word "${item.expected_word}" was not detected (${severity} severity).`;
    }
    if (item.mismatch_type === 'insert' && item.pronounced_word) {
        return `Extra spoken word "${item.pronounced_word}" is not part of the passage (${severity} severity).`;
    }
    return `Word-level mismatch detected (${severity} severity).`;
}

export default function Studio() {
    const [selectedShloka, setSelectedShloka] = useState<Shloka | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<PronunciationResult | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlayingReference, setIsPlayingReference] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const referenceAudioRef = useRef<HTMLAudioElement | null>(null);

    // Pagination & Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    const [audioError, setAudioError] = useState<string | null>(null);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [insightPage, setInsightPage] = useState(1);
    const insightsPerPage = 4;
    const apiBaseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        (typeof window !== 'undefined' ? '/api' : 'http://localhost:8001');

    const scoreSummary = results ? getScoreSummary(results.score ?? 0) : null;
    const scoreBreakdown = results ? getScoreBreakdown(results) : null;

    const highlightedWordIndexes = new Set<number>([
        ...(results?.analysis?.word_feedback?.map((item) => item.word_index) ?? []),
        ...((results?.analysis?.word_mismatches ?? [])
            .map((item) => item.expected_index)
            .filter((idx): idx is number => typeof idx === 'number')),
    ]);

    const wordSeverityByIndex = new Map<number, MismatchSeverity>();
    (results?.analysis?.word_feedback ?? []).forEach((item) => {
        const existing = wordSeverityByIndex.get(item.word_index);
        if (existing === 'high') return;
        if (existing === 'medium' && item.severity === 'low') return;
        wordSeverityByIndex.set(item.word_index, item.severity);
    });

    (results?.analysis?.word_mismatches ?? []).forEach((item) => {
        if (typeof item.expected_index !== 'number') return;
        const existing = wordSeverityByIndex.get(item.expected_index);
        const fallback = getMismatchDefaultSeverity(item.mismatch_type);
        if (existing === 'high') return;
        if (existing === 'medium' && fallback === 'low') return;
        if (!existing || fallback === 'high' || (fallback === 'medium' && existing === 'low')) {
            wordSeverityByIndex.set(item.expected_index, fallback);
        }
    });

    const transliterationWords = tokenizeTransliterationWords(selectedShloka?.transliteration || '');

    useEffect(() => {
        setInsightPage(1);
    }, [results]);

    // Handle custom shloka from query params
    useEffect(() => {
        const customText = searchParams.get('customText');
        const customIAST = searchParams.get('customIAST');
        const customMeaning = searchParams.get('customMeaning');
        const isCustom = searchParams.get('isCustom');

        if (customText) {
            setSelectedShloka((current) => {
                if (
                    current?.id === 'custom' &&
                    current.text === customText &&
                    current.transliteration === (customIAST || '') &&
                    current.meaning === (customMeaning || '')
                ) {
                    return current;
                }

                return {
                    id: 'custom',
                    title: isCustom ? 'Custom Practice' : 'Imported Shloka',
                    source: isCustom ? 'Direct Input' : 'External Link',
                    reference: isCustom ? 'Self-composed Passage' : 'Imported Passage',
                    text: customText,
                    transliteration: customIAST || '',
                    meaning: customMeaning || 'A custom shloka for focused phonetic refinement.'
                };
            });
        } else if (SHLOKAS.length > 0) {
            setSelectedShloka((current) => current ?? SHLOKAS[0]);
        }
    }, [searchParams]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (referenceAudioRef.current) referenceAudioRef.current.pause();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = () => {
                if (!audioChunks.current.length) {
                    setAudioError('No audio was recorded. Please try again.');
                    setAudioBlob(null);
                    setAudioUrl(null);
                    return;
                }
                try {
                    const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                    setAudioBlob(blob);
                    setAudioUrl(URL.createObjectURL(blob));
                    setAudioError(null);
                } catch {
                    setAudioError('Failed to process recorded audio.');
                    setAudioBlob(null);
                    setAudioUrl(null);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setRecordingTime((t) => t + 1);
            }, 1000);
            setResults(null);
            setAudioError(null);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setAudioError("Unable to access microphone. Please ensure microphone permissions are granted in your browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const playReference = async (url: string) => {
        setAudioError(null);
        try {
            if (referenceAudioRef.current) {
                referenceAudioRef.current.pause();
                referenceAudioRef.current = null;
                setIsPlayingReference(false);
            }
            const audio = new Audio(url);
            referenceAudioRef.current = audio;
            setIsPlayingReference(true);

            audio.addEventListener('ended', () => setIsPlayingReference(false));
            audio.addEventListener('error', (e) => {
                console.error("Audio Load Error:", e);
                setAudioError("Failed to load reference audio source.");
                setIsPlayingReference(false);
            });
            await audio.play();
        } catch (err: unknown) {
            console.error("Playback failed:", err);
            setIsPlayingReference(false);
            setAudioError("Reference audio playback was interrupted or blocked.");
        }
    };

    const stopReference = () => {
        if (referenceAudioRef.current) {
            referenceAudioRef.current.pause();
            referenceAudioRef.current = null;
            setIsPlayingReference(false);
        }
    };

    const analyzePronunciation = async () => {
        if (!audioBlob || !selectedShloka) return;

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('shloka_text', selectedShloka.text);
        formData.append('ref_text', selectedShloka.transliteration || selectedShloka.text);

        try {
            const response = await fetch(`${apiBaseUrl}/analyze`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setResults({
                ...data,
                score: data.score ?? data.analysis?.score ?? 0,
            });
        } catch (err) {
            console.error("Analysis failed:", err);
            setAudioError("Failed to connect to the analysis engine. Ensure the FastAPI backend is running on port 8001.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const openReferenceAudio = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const downloadDetailedReport = async () => {
        if (!results || !selectedShloka || !scoreBreakdown || !scoreSummary) {
            return;
        }

        setIsDownloadingReport(true);

        try {
            const { jsPDF } = await import("jspdf");
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const marginX = 48;
            let cursorY = 56;

            const paintPageTheme = () => {
                pdf.setFillColor(18, 18, 18);
                pdf.rect(0, 0, pageWidth, pageHeight, "F");

                pdf.setFillColor(35, 26, 20);
                pdf.rect(0, 0, pageWidth, 36, "F");

                pdf.setDrawColor(245, 158, 11);
                pdf.setLineWidth(0.6);
                pdf.line(marginX, 34, pageWidth - marginX, 34);
            };

            const toPdfReadableText = (value?: string | null) => {
                if (!value) return "";
                const ascii = value
                    .normalize("NFKD")
                    .replace(/[^\x20-\x7E]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                if (!ascii) return "";
                const compact = ascii.replace(/\s/g, "");
                if (!compact) return "";
                const readableChars = (compact.match(/[A-Za-z0-9]/g) || []).length;
                const readableRatio = readableChars / compact.length;
                return readableRatio >= 0.45 ? ascii : "";
            };

            const writeWrapped = (text: string, fontSize = 11, color: [number, number, number] = [75, 85, 99], gap = 18) => {
                pdf.setFontSize(fontSize);
                pdf.setTextColor(color[0], color[1], color[2]);
                const lines = pdf.splitTextToSize(text, pageWidth - marginX * 2);
                pdf.text(lines, marginX, cursorY);
                cursorY += lines.length * gap;
            };

            const ensureSpace = (required = 40) => {
                if (cursorY + required <= pageHeight - 50) return;
                pdf.addPage();
                paintPageTheme();
                cursorY = 56;
            };

            paintPageTheme();
            pdf.setTextColor(245, 158, 11);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.text("SANSKRIT SADHANA", marginX, cursorY);
            cursorY += 26;

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(26);
            pdf.text("Detailed Pronunciation Report", marginX, cursorY);
            cursorY += 28;

            pdf.setFont("helvetica", "normal");
            writeWrapped(`Shloka: ${selectedShloka.title}`, 12, [255, 255, 255], 17);
            writeWrapped(`Reference: ${selectedShloka.reference || selectedShloka.source}`, 11, [226, 232, 240], 16);
            writeWrapped(`Source: ${selectedShloka.source}`, 11, [148, 163, 184], 16);
            writeWrapped(`Generated: ${new Date().toLocaleString()}`, 10, [148, 163, 184], 16);

            cursorY += 8;
            pdf.setDrawColor(245, 158, 11);
            pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
            cursorY += 28;

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.setTextColor(255, 255, 255);
            pdf.text(`Score: ${results.score}/100`, marginX, cursorY);
            cursorY += 24;

            pdf.setFont("helvetica", "normal");
            writeWrapped(scoreSummary.message, 11, [203, 213, 225], 17);

            ensureSpace(120);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(245, 158, 11);
            pdf.text("Performance Breakdown", marginX, cursorY);
            cursorY += 22;

            pdf.setFont("helvetica", "normal");
            writeWrapped(`Matched phonemes: ${scoreBreakdown.matches}`, 11, [255, 255, 255], 16);
            writeWrapped(`Expected phonemes: ${scoreBreakdown.totalRef}`, 11, [255, 255, 255], 16);
            writeWrapped(`Detected mismatches: ${scoreBreakdown.refMismatches}`, 11, [255, 255, 255], 16);
            writeWrapped(`Extra detected sounds: ${scoreBreakdown.extraSounds}`, 11, [203, 213, 225], 16);
            writeWrapped(`Alignment: ${scoreBreakdown.alignment}%`, 11, [203, 213, 225], 16);
            writeWrapped(`Consistency: ${scoreBreakdown.consistency}%`, 11, [203, 213, 225], 16);
            writeWrapped(`Clarity: ${scoreBreakdown.clarity}%`, 11, [203, 213, 225], 16);

            ensureSpace(80);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(245, 158, 11);
            pdf.text("Reference Text", marginX, cursorY);
            cursorY += 22;
            pdf.setFont("helvetica", "normal");
            const readableReferenceText = toPdfReadableText(selectedShloka.text);
            const readableTransliteration = toPdfReadableText(selectedShloka.transliteration);

            if (readableReferenceText) {
                writeWrapped(readableReferenceText, 12, [255, 255, 255], 18);
            } else {
                writeWrapped("Reference text omitted in PDF due to unreadable characters for the current export font.", 10, [148, 163, 184], 16);
            }

            if (readableTransliteration) {
                writeWrapped(readableTransliteration, 11, [203, 213, 225], 17);
            }

            if (results.transcript) {
                ensureSpace(60);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.setTextColor(245, 158, 11);
                pdf.text("Recognized Transcript", marginX, cursorY);
                cursorY += 22;
                pdf.setFont("helvetica", "normal");
                const readableTranscript = toPdfReadableText(results.transcript);
                if (readableTranscript) {
                    writeWrapped(readableTranscript, 11, [255, 255, 255], 17);
                } else {
                    writeWrapped("Recognized transcript omitted due to unreadable characters.", 10, [148, 163, 184], 16);
                }
            }

            ensureSpace(80);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(245, 158, 11);
            pdf.text("Phonetic Insights", marginX, cursorY);
            cursorY += 24;

            if (scoreBreakdown.errors.length === 0) {
                writeWrapped("No significant errors detected in this attempt.", 11, [203, 213, 225], 17);
            } else {
                const tableWidth = pageWidth - marginX * 2;
                const colWidths = [34, 220, 90, 90, tableWidth - 34 - 220 - 90 - 90];
                const rowHeight = 22;
                const headerHeight = 24;
                const tableBottom = pageHeight - 48;
                const headers = ["#", "Description", "Expected", "Heard", "Pos"];

                const drawTableHeader = () => {
                    ensureSpace(headerHeight + 8);
                    pdf.setFillColor(28, 28, 28);
                    pdf.rect(marginX, cursorY, tableWidth, headerHeight, "F");
                    pdf.setDrawColor(60, 60, 60);
                    pdf.rect(marginX, cursorY, tableWidth, headerHeight);

                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(10);
                    pdf.setTextColor(245, 158, 11);

                    let x = marginX;
                    headers.forEach((header, idx) => {
                        pdf.text(header, x + 6, cursorY + 15);
                        if (idx < headers.length - 1) {
                            pdf.line(x + colWidths[idx], cursorY, x + colWidths[idx], cursorY + headerHeight);
                        }
                        x += colWidths[idx];
                    });

                    cursorY += headerHeight;
                };

                const fitCell = (text: string, width: number) => {
                    const normalized = text.replace(/\s+/g, " ").trim();
                    if (!normalized) return "-";

                    const lines = pdf.splitTextToSize(normalized, Math.max(10, width - 12));
                    const firstLine = Array.isArray(lines) ? (lines[0] ?? "") : String(lines);
                    if (Array.isArray(lines) && lines.length > 1) {
                        return `${String(firstLine).replace(/\s+$/, "")}...`;
                    }
                    return String(firstLine);
                };

                drawTableHeader();

                scoreBreakdown.errors.forEach((error, index) => {
                    if (cursorY + rowHeight > tableBottom) {
                        pdf.addPage();
                        paintPageTheme();
                        cursorY = 56;
                        pdf.setFont("helvetica", "bold");
                        pdf.setFontSize(12);
                        pdf.setTextColor(245, 158, 11);
                        pdf.text("Phonetic Insights (continued)", marginX, cursorY);
                        cursorY += 16;
                        drawTableHeader();
                    }

                    const rowShade = index % 2 === 0 ? 20 : 16;
                    pdf.setFillColor(rowShade, rowShade, rowShade);
                    pdf.rect(marginX, cursorY, tableWidth, rowHeight, "F");
                    pdf.setDrawColor(52, 52, 52);
                    pdf.rect(marginX, cursorY, tableWidth, rowHeight);

                    let x = marginX;
                    for (let i = 0; i < colWidths.length - 1; i += 1) {
                        x += colWidths[i];
                        pdf.line(x, cursorY, x, cursorY + rowHeight);
                    }

                    const description = fitCell(error.description, colWidths[1]);
                    const readableExpected = fitCell(toPdfReadableText(error.ref_ph ?? "") || "-", colWidths[2]);
                    const readableHeard = fitCell(toPdfReadableText(error.hyp_ph ?? "") || "(omitted)", colWidths[3]);

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(226, 232, 240);

                    const cells = [
                        String(index + 1),
                        description,
                        readableExpected,
                        readableHeard,
                        String(error.ref_idx + 1),
                    ];

                    let cellX = marginX;
                    cells.forEach((cell, cellIndex) => {
                        pdf.text(cell, cellX + 6, cursorY + 14);
                        cellX += colWidths[cellIndex];
                    });

                    cursorY += rowHeight;
                });
            }

            const totalPages = pdf.getNumberOfPages();
            for (let page = 1; page <= totalPages; page += 1) {
                pdf.setPage(page);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                pdf.setTextColor(203, 213, 225);
                pdf.text(`Page ${page}`, pageWidth - marginX, pageHeight - 24, { align: "right" });
            }

            const safeTitle = selectedShloka.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            pdf.save(`${safeTitle || "sanskrit-sadhana"}-report.pdf`);
        } finally {
            setIsDownloadingReport(false);
        }
    };

    return (
        <div className="relative max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">
            {/* Majestic Sanctuary Hero Header */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl glass-altar p-6 sm:p-10 border border-saffron-500/20 shadow-2xl"
            >
                {/* Luminous Vedic Background Glows */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-saffron-500/20 to-gold-500/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-gold-500/15 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-9xl font-serif text-saffron-500/5 select-none pointer-events-none hidden md:block">
                    ॐ
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/30 bg-saffron-500/10 px-3.5 py-1 text-xs font-semibold text-primary">
                            <Flame className="w-3.5 h-3.5 fill-primary text-primary" />
                            <span>Gurukula Recitation Chamber</span>
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            <span className="text-[10px] tracking-widest uppercase opacity-80">AI Phonetics</span>
                        </div>

                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                            Master the Divine Sounds of <span className="text-gradient">Sanskrit</span>
                        </h1>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Step into a sacred digital sanctuary. Recite classic verses, receive instantaneous phoneme-level alignment,
                            and refine every syllable under the watchful guidance of your AI Vedic Guru.
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-3">
                            <Link href="/viva" className="btn btn-primary text-xs sm:text-sm">
                                <Volume2 className="w-4 h-4" />
                                <span>Interactive Viva Guru</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>

                            <Link href="/custom" className="btn btn-secondary text-xs sm:text-sm">
                                <Sparkles className="w-4 h-4 text-gold-400" />
                                <span>Custom IAST Scribe</span>
                            </Link>

                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-muted-foreground">
                                <Target className="w-3.5 h-3.5 text-primary" />
                                <span>Whisper &amp; G2P Phonetic Engine</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Pillar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 w-full lg:w-72">
                        <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 p-4">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Verses</span>
                            <p className="text-2xl font-black font-display text-foreground mt-1">{SHLOKAS.length} Classical</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Gita, Upanishads &amp; Vedas</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 p-4">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Chant Methodology</span>
                            <p className="text-sm font-bold text-foreground mt-1">Shravana • Manana</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Hear, recite, realign</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 lg:col-span-1 rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 p-4">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Real-Time Precision</span>
                            <p className="text-sm font-bold text-gradient-gold mt-1">Grapheme-to-Phoneme</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Sub-syllable error detection</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Stage Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Passage Selector (Sidebar - 4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                                Sacred Library
                            </h2>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {SHLOKAS.length} Verses
                        </span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by title, deity or scripture..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
                        />
                    </div>

                    {/* Shloka List */}
                    <div className="glass-altar rounded-3xl p-3 space-y-2 border border-white/10 dark:border-white/5 shadow-lg">
                        {(() => {
                            const filtered = SHLOKAS.filter(s =>
                                s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                s.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                s.text.includes(searchTerm)
                            );
                            const lastIndex = currentPage * itemsPerPage;
                            const firstIndex = lastIndex - itemsPerPage;
                            const currentShlokas = filtered.slice(firstIndex, lastIndex);
                            const totalPages = Math.ceil(filtered.length / itemsPerPage);

                            if (filtered.length === 0) {
                                return (
                                    <div className="py-12 text-center text-xs text-muted-foreground italic">
                                        No shlokas found matching &quot;{searchTerm}&quot;
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <div className="space-y-2 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                                        {currentShlokas.map((shloka) => {
                                            const isSelected = selectedShloka?.id === shloka.id;
                                            return (
                                                <button
                                                    key={shloka.id}
                                                    onClick={() => {
                                                        setSelectedShloka(shloka);
                                                        setResults(null);
                                                        setAudioBlob(null);
                                                        setAudioError(null);
                                                        stopReference();
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-3.5 rounded-2xl border transition-all duration-200 group relative overflow-hidden",
                                                        isSelected
                                                            ? "border-primary/40 bg-gradient-to-r from-saffron-500/15 to-gold-500/10 saffron-glow translate-x-1"
                                                            : "border-white/5 bg-white/5 dark:bg-white/[0.02] hover:bg-white/10 hover:border-white/15"
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-saffron-500 to-gold-500" />
                                                    )}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="space-y-1 flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                                    {shloka.title}
                                                                </h3>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground truncate">
                                                                {shloka.source}
                                                            </p>
                                                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-muted-foreground">
                                                                    {shloka.reference}
                                                                </span>
                                                                {shloka.audioUrl && (
                                                                    <span className="text-[9px] font-semibold text-gold-400 flex items-center gap-1">
                                                                        <Volume2 className="w-2.5 h-2.5" /> Audio
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="flex items-center justify-between pt-3 px-2 border-t border-white/5 text-xs text-muted-foreground">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Previous Page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-[10px] font-mono uppercase tracking-widest">
                                            Page {currentPage} of {totalPages || 1}
                                        </span>
                                        <button
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Next Page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Recitation Sanctum (Main Chamber - 8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {selectedShloka ? (
                        <motion.div
                            key={selectedShloka.id}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-2xl space-y-8 relative overflow-hidden"
                        >
                            {/* Sacred Altar Frame Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/5 rounded-bl-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-500/5 rounded-tr-full pointer-events-none" />

                            {/* Verse Header Info */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 dark:border-white/5 pb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                                        {selectedShloka.source}
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground mt-0.5">
                                        {selectedShloka.title}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-mono">
                                        Ref: {selectedShloka.reference || selectedShloka.source}
                                    </span>
                                </div>
                            </div>

                            {/* Devanagari Script Altar Display */}
                            <div className="relative text-center py-6 px-4 rounded-2xl bg-gradient-to-b from-black/5 to-black/15 dark:from-white/[0.03] dark:to-transparent border border-white/10 dark:border-white/5 shadow-inner">
                                <div className="absolute top-2 left-3 text-xs text-muted-foreground/30 font-serif">॥</div>
                                <div className="absolute top-2 right-3 text-xs text-muted-foreground/30 font-serif">॥</div>

                                <p className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground leading-loose tracking-wide font-medium select-text">
                                    {selectedShloka.text}
                                </p>

                                {/* Transliteration with Word-Level Phonetic Highlights */}
                                <div className="mt-6 pt-5 border-t border-white/10 dark:border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground block mb-2">
                                        IAST Phonetic Guidance
                                    </span>
                                    <div className="text-base sm:text-lg italic text-muted-foreground leading-relaxed flex flex-wrap justify-center gap-1.5">
                                        {transliterationWords.map((word, index) => {
                                            const severity = wordSeverityByIndex.get(index) ?? 'low';
                                            const severityClasses = getSeverityClasses(severity);
                                            const hasError = highlightedWordIndexes.has(index);
                                            const tooltipText = hasError
                                                ? `Phonetic variance detected on "${word}" (${severity} severity)`
                                                : '';

                                            return (
                                                <span
                                                    key={`${word}-${index}`}
                                                    title={tooltipText}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-lg transition-all text-sm sm:text-base font-normal",
                                                        hasError
                                                            ? severityClasses.word
                                                            : "hover:text-foreground text-muted-foreground/90"
                                                    )}
                                                >
                                                    {word}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* English Meaning Drawer */}
                                {selectedShloka.meaning && (
                                    <div className="mt-6 rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 p-4 text-left">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>Sacred Meaning &amp; Context</span>
                                        </div>
                                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                            &ldquo;{selectedShloka.meaning}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reference Audio Guidance Strip */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 dark:bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-400">
                                        <Disc className="w-4 h-4 animate-spin-slow" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Archival Reference Chanting</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {selectedShloka.audioSourceName || "Traditional Vedic Gurukula recitation"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedShloka.audioUrl && (
                                        <button
                                            onClick={() => isPlayingReference ? stopReference() : playReference(selectedShloka.audioUrl!)}
                                            className={cn(
                                                "btn py-2 px-4 text-xs font-semibold rounded-xl border transition-all",
                                                isPlayingReference
                                                    ? "bg-amber-500 text-black border-amber-400"
                                                    : "btn-secondary"
                                            )}
                                        >
                                            {isPlayingReference ? (
                                                <>
                                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                                    <span>Pause Reference</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                                                    <span>Listen Reference</span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {selectedShloka.audioReferenceUrl && (
                                        <button
                                            onClick={() => openReferenceAudio(selectedShloka.audioReferenceUrl!)}
                                            className="btn btn-secondary py-2 px-3 text-xs text-gold-400 border-gold-500/30 hover:border-gold-500/60"
                                            title="Open authoritative archive"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Archival Source</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Practice Controls Altar (Central Record Station) */}
                            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-gradient-to-b from-black/5 via-black/10 to-black/20 dark:from-white/[0.02] dark:to-black/30 border border-white/10 dark:border-white/5 relative overflow-hidden">
                                <div className="text-center space-y-1 mb-6">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                                        Chant Recording Station
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        {isRecording
                                            ? `Recording in progress • ${formatTimer(recordingTime)}`
                                            : audioBlob
                                                ? "Attempt captured • Ready for AI phonetic alignment"
                                                : "Tap the microphone when you are ready to chant"}
                                    </p>
                                </div>

                                {/* Central Glowing Record Button */}
                                <div className="relative flex items-center justify-center my-2">
                                    {isRecording && (
                                        <>
                                            <div className="absolute inset-0 -m-6 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
                                            <div className="absolute inset-0 -m-3 rounded-full border-2 border-red-500/40 animate-pulse pointer-events-none" />
                                        </>
                                    )}

                                    {!isRecording ? (
                                        <motion.button
                                            whileHover={{ scale: 1.08 }}
                                            whileTap={{ scale: 0.94 }}
                                            onClick={startRecording}
                                            disabled={isAnalyzing}
                                            className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-saffron-600 via-saffron-500 to-gold-500 text-white flex flex-col items-center justify-center shadow-xl saffron-glow hover:shadow-saffron-500/50 transition-all group"
                                            aria-label="Start Recording"
                                        >
                                            <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-90">
                                                Record
                                            </span>
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.94 }}
                                            onClick={stopRecording}
                                            className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex flex-col items-center justify-center shadow-2xl shadow-red-500/40 transition-all"
                                            aria-label="Stop Recording"
                                        >
                                            <Square className="w-8 h-8 fill-current" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider mt-1">
                                                Stop
                                            </span>
                                        </motion.button>
                                    )}
                                </div>

                                {audioError && (
                                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{audioError}</span>
                                    </div>
                                )}

                                {/* Recorded Audio Actions Bar */}
                                {audioBlob && !isRecording && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 flex flex-wrap items-center justify-center gap-4 w-full pt-4 border-t border-white/5"
                                    >
                                        {audioUrl && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                                <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                                            </div>
                                        )}

                                        <button
                                            onClick={analyzePronunciation}
                                            disabled={isAnalyzing}
                                            className="btn btn-primary text-xs sm:text-sm font-bold shadow-lg"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    <span>Aligning Phonemes...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Activity className="w-4 h-4" />
                                                    <span>Analyze Pronunciation</span>
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-[460px] flex flex-col items-center justify-center rounded-3xl glass-altar border border-white/10 p-8 text-center space-y-3">
                            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a verse from the Sacred Library on the left to begin your recitation practice.
                            </p>
                        </div>
                    )}

                    {/* Pronunciation Results Stage */}
                    {results && scoreSummary && scoreBreakdown && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 pt-2"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                {/* Score & Radial Resonance Card (7 cols) */}
                                <div className="lg:col-span-7 glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                    <div
                                        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                                        style={{ backgroundColor: scoreSummary.glowColor }}
                                    />

                                    <div>
                                        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <Award className="w-5 h-5 text-primary" />
                                                <h3 className="text-base font-bold text-foreground">
                                                    Pronunciation Evaluation
                                                </h3>
                                            </div>
                                            <button
                                                onClick={downloadDetailedReport}
                                                disabled={isDownloadingReport}
                                                className="btn btn-secondary py-1.5 px-3 text-xs text-primary border-primary/30 hover:border-primary/60"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>{isDownloadingReport ? "Generating..." : "Download PDF"}</span>
                                            </button>
                                        </div>

                                        {/* Score Display Ring */}
                                        <div className="py-6 flex flex-col items-center justify-center text-center">
                                            <span className={cn("text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border mb-4", scoreSummary.badgeClassName)}>
                                                {scoreSummary.label}
                                            </span>

                                            <div className="relative flex items-center justify-center">
                                                <div className="text-7xl sm:text-8xl font-black font-display tracking-tight bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, #f79549, #cbb215)` }}>
                                                    {results.score}
                                                </div>
                                                <span className="text-xs font-mono text-muted-foreground ml-2 self-end mb-4">/100</span>
                                            </div>

                                            <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
                                                {scoreSummary.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Triplets */}
                                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                                        <InsightStat
                                            title="Matched"
                                            value={scoreBreakdown.matches}
                                            caption="Accurate phonemes"
                                            accentClassName="from-emerald-400 to-teal-500"
                                        />
                                        <InsightStat
                                            title="Reference"
                                            value={scoreBreakdown.totalRef}
                                            caption="Target phonemes"
                                            accentClassName="from-saffron-500 to-gold-500"
                                        />
                                        <InsightStat
                                            title="Variance"
                                            value={scoreBreakdown.refMismatches}
                                            caption="Errors / omissions"
                                            accentClassName="from-rose-500 to-orange-500"
                                        />
                                    </div>

                                    {/* Metric Bars */}
                                    <div className="mt-6 space-y-3 pt-4 border-t border-white/10">
                                        <MetricBar
                                            label="Phonetic Alignment"
                                            value={scoreBreakdown.alignment}
                                            tone="from-primary to-saffron-400"
                                            subtitle="Swara precision"
                                        />
                                        <MetricBar
                                            label="Rhythmic Consistency"
                                            value={scoreBreakdown.consistency}
                                            tone="from-gold-400 to-amber-500"
                                            subtitle="Laya cadence"
                                        />
                                        <MetricBar
                                            label="Vocal Clarity"
                                            value={scoreBreakdown.clarity}
                                            tone="from-emerald-400 to-teal-400"
                                            subtitle="Shuddha delivery"
                                        />
                                    </div>
                                </div>

                                {/* Granular Phonetic Insights Panel (5 cols) */}
                                <div className="lg:col-span-5 glass-altar rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/5 shadow-2xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-gold-400" />
                                                <h3 className="text-base font-bold text-foreground">
                                                    Phonetic Insights
                                                </h3>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/5">
                                                {scoreBreakdown.errors.length} detected
                                            </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                            Granular comparison between expected Sanskrit phonemes and your captured pronunciation.
                                        </p>

                                        {/* Error Items List */}
                                        <div className="mt-4 space-y-3">
                                            {(() => {
                                                const errors = scoreBreakdown.errors;
                                                const totalPages = Math.max(1, Math.ceil(errors.length / insightsPerPage));
                                                const safePage = Math.min(insightPage, totalPages);
                                                const startIndex = (safePage - 1) * insightsPerPage;
                                                const currentErrors = errors.slice(startIndex, startIndex + insightsPerPage);

                                                if (errors.length === 0) {
                                                    return (
                                                        <div className="py-12 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-6 space-y-2">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                                                                <Award className="w-5 h-5" />
                                                            </div>
                                                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                                                Pristine Articulation
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                No significant phonetic mismatches were detected.
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2.5">
                                                        {currentErrors.map((err, idx) => (
                                                            <div
                                                                key={`${safePage}-${idx}`}
                                                                className="p-3.5 rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 space-y-2 hover:border-primary/20 transition-all"
                                                            >
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                                                                        {err.description}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                                        Pos #{err.ref_idx + 1}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-xs font-mono pt-1">
                                                                    <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                                        <span className="text-[9px] uppercase font-sans text-muted-foreground block">Expected</span>
                                                                        {err.ref_ph || "-"}
                                                                    </div>
                                                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                    <div className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                                                        <span className="text-[9px] uppercase font-sans text-muted-foreground block">Heard</span>
                                                                        {err.hyp_ph || "(silence)"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Insights Pagination */}
                                    {scoreBreakdown.errors.length > insightsPerPage && (
                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 text-xs text-muted-foreground">
                                            <button
                                                disabled={insightPage === 1}
                                                onClick={() => setInsightPage(p => Math.max(1, p - 1))}
                                                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-[10px] font-mono uppercase tracking-widest">
                                                Page {insightPage} of {Math.ceil(scoreBreakdown.errors.length / insightsPerPage)}
                                            </span>
                                            <button
                                                disabled={insightPage >= Math.ceil(scoreBreakdown.errors.length / insightsPerPage)}
                                                onClick={() => setInsightPage(p => p + 1)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
