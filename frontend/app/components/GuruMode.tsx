'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  SkipForward,
  Home,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { VoiceProcessor, analyzePronunciation, calculateConfidenceScore } from '../utils/voiceProcessor';
import {
  getRandomQuestion,
  getAdaptiveQuestion,
  isValidResponse,
  getPronunciationFeedback,
  GuruQuestion,
} from '../utils/guruQuestions';

interface SessionStats {
  correctAnswers: number;
  totalQuestions: number;
  averageScore: number;
  currentStreak: number;
}

type SessionMode = 'test' | 'practice';
type SessionPhase = 'question' | 'listening' | 'feedback' | 'summary';

export interface GuruModeProps {
  initialMode?: SessionMode;
  onExit?: (stats: SessionStats) => void;
}

export function GuruMode({ initialMode = 'practice', onExit }: GuruModeProps) {
  // State Management
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [phase, setPhase] = useState<SessionPhase>('question');
  const [currentQuestion, setCurrentQuestion] = useState<GuruQuestion | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [voiceProcessor, setVoiceProcessor] = useState<VoiceProcessor | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correctAnswers: 0,
    totalQuestions: 0,
    averageScore: 0,
    currentStreak: 0,
  });
  const [guruFeedback, setGuruFeedback] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const voiceProcessorRef = useRef<VoiceProcessor | null>(null);
  const elapsedTimeRef = useRef(0);

  // Initialize Voice Processor
  useEffect(() => {
    try {
      const processor = new VoiceProcessor({
        language: 'en-US',
        continuous: false,
        interimResults: true,
      });

      processor.onResult((result) => {
        setUserResponse(result.transcript);
        if (result.isFinal) {
          handleResponseReceived(result.transcript);
        }
      });

      processor.onError((error) => {
        console.error('Voice error:', error);
        setGuruFeedback(`🔊 Listening error: ${error}`);
      });

      processor.onEnd(() => {
        setIsListening(false);
      });

      voiceProcessorRef.current = processor;
      setVoiceProcessor(processor);
    } catch (error) {
      console.error('Failed to initialize voice processor:', error);
    }

    return () => {
      voiceProcessorRef.current?.abort();
    };
  }, []);

  // Load first question
  useEffect(() => {
    loadNextQuestion();
  }, []);

  const loadNextQuestion = useCallback(() => {
    const nextQuestion =
      sessionStats.totalQuestions === 0
        ? getRandomQuestion('beginner')
        : getAdaptiveQuestion(currentQuestion?.level || 'beginner', confidenceScore);

    setCurrentQuestion(nextQuestion);
    setUserResponse('');
    setPhase('question');
    setGuruFeedback('');
    setPronunciationScore(0);
    setShowDetails(false);
  }, [currentQuestion?.level, sessionStats.totalQuestions, confidenceScore]);

  const handleStartListening = useCallback(() => {
    if (voiceProcessorRef.current && !isListening) {
      setUserResponse('');
      setPhase('listening');
      voiceProcessorRef.current.startListening();
      setIsListening(true);
    }
  }, [isListening]);

  const handleStopListening = useCallback(() => {
    if (voiceProcessorRef.current && isListening) {
      voiceProcessorRef.current.stopListening();
      setIsListening(false);
    }
  }, [isListening]);

  const handleResponseReceived = useCallback(
    async (response: string) => {
      if (!currentQuestion) return;

      setPhase('feedback');
      const valid = isValidResponse(response, currentQuestion.expectedResponse);
      setIsCorrect(valid);

      // Pronounciation analysis
      const { score: pronouncScore, feedback: pronouncFeedback } = analyzePronunciation(
        response,
        currentQuestion.iast
      );
      setPronunciationScore(pronouncScore);

      // Calculate overall confidence
      const speechConf = voiceProcessorRef.current?.getConfidence() || 0.7;
      const overallScore = calculateConfidenceScore(speechConf, valid, pronouncScore);
      setConfidenceScore(overallScore);

      // Get guru feedback via API
      try {
        const guruResp = await fetch('/api/guru', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userResponse: response,
            userResponseConfidence: overallScore,
            isCorrect: valid,
            pronunciationScore: pronouncScore,
            currentQuestion: currentQuestion.iast,
            currentQuestionType: currentQuestion.category,
            sessionPhase: mode,
            mistakesCount: sessionStats.totalQuestions - sessionStats.correctAnswers,
          }),
        });

        const feedback = await guruResp.json();
        setGuruFeedback(feedback.feedback || 'Excellent work!');

        // Speech synthesis for guru response
        if (feedback.ttsText && voiceProcessorRef.current) {
          setIsSpeaking(true);
          try {
            await voiceProcessorRef.current.speak(feedback.ttsText, { rate: 0.85 });
          } catch (error) {
            console.error('Speech synthesis error:', error);
          } finally {
            setIsSpeaking(false);
          }
        }
      } catch (error) {
        console.error('Guru API error:', error);
        setGuruFeedback(getPronunciationFeedback(currentQuestion.iast));
      }

      // Update stats
      setSessionStats((prev) => ({
        correctAnswers: prev.correctAnswers + (valid ? 1 : 0),
        totalQuestions: prev.totalQuestions + 1,
        averageScore:
          (prev.averageScore * prev.totalQuestions + overallScore) / (prev.totalQuestions + 1),
        currentStreak: valid ? prev.currentStreak + 1 : 0,
      }));
    },
    [currentQuestion, mode]
  );

  const handleNextQuestion = useCallback(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

  const handleSwitchMode = useCallback(() => {
    const newMode = mode === 'test' ? 'practice' : 'test';
    setMode(newMode);
    setPhase('question');
    setUserResponse('');
    setGuruFeedback('');
    loadNextQuestion();
  }, [mode, loadNextQuestion]);

  const handleEndSession = useCallback(() => {
    if (onExit) {
      onExit(sessionStats);
    }
  }, [sessionStats, onExit]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <p className="text-amber-900">Loading your Guru session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-50 to-amber-50/50">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div
          style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 90, 43, 0.02) 2px, rgba(139, 90, 43, 0.02) 4px),
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(160, 120, 70, 0.02) 2px, rgba(160, 120, 70, 0.02) 4px)
            `,
          }}
          className="absolute inset-0"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-amber-900/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-amber-900" />
            <h1 className="text-2xl font-bold text-amber-950">
              👨‍🏫 Guru-Sishya Learning
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-amber-900">{mode.toUpperCase()}</p>
              <p className="text-xs text-amber-900/60">Phase: {phase}</p>
            </div>
            <button
              onClick={handleEndSession}
              className="p-2 rounded-lg hover:bg-amber-900/10 transition-colors"
              aria-label="Exit session"
            >
              <Home className="w-5 h-5 text-amber-900" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4"
          >
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-amber-900/10 shadow-md">
              <h3 className="font-semibold text-amber-950 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Session Stats
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-amber-900/60">Questions Answered</p>
                  <p className="text-2xl font-bold text-amber-950">{sessionStats.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-900/60">Correct Answers</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {sessionStats.correctAnswers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-900/60">Average Score</p>
                  <p className="text-2xl font-bold text-amber-800">
                    {Math.round(sessionStats.averageScore)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-900/60">Current Streak</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {sessionStats.currentStreak} 🔥
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Middle Column - Main Interaction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Question Card */}
            <div className="bg-gradient-to-br from-amber-50/80 to-white/60 backdrop-blur rounded-lg p-8 border border-amber-900/20 shadow-lg">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/10 text-amber-900 mb-3">
                  {currentQuestion.level.toUpperCase()} • {currentQuestion.category}
                </span>
                <p className="text-amber-900/70 leading-relaxed">{currentQuestion.englishContext}</p>
              </div>

              {/* Sanskrit Display */}
              <div className="my-6 p-6 bg-amber-50/50 rounded-lg border border-amber-900/15">
                <p className="text-center text-4xl font-serif text-amber-950 mb-2">
                  {currentQuestion.sanskrit}
                </p>
                <p className="text-center text-lg text-amber-900 font-mono">
                  {currentQuestion.iast}
                </p>
                <p className="text-center text-sm text-amber-900/60 mt-2 italic">
                  {currentQuestion.pronunciation}
                </p>
              </div>
            </div>

            {/* Voice Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur rounded-lg p-8 border border-amber-900/20 shadow-md"
            >
              <h3 className="font-semibold text-amber-950 mb-4">🎤 Your Response</h3>

              {phase === 'listening' && (
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-4 h-4 rounded-full bg-red-500"
                    />
                    <span className="text-amber-950">Listening...</span>
                  </div>
                </div>
              )}

              {userResponse && (
                <div className="mb-4 p-3 bg-amber-50/70 rounded-lg border border-amber-900/15">
                  <p className="text-sm text-amber-900/60 mb-1">Recognized:</p>
                  <p className="text-lg text-amber-950 font-medium">{userResponse}</p>
                </div>
              )}

              {/* Voice Controls */}
              <div className="flex gap-4 justify-center mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartListening}
                  disabled={isListening || isSpeaking}
                  className="px-6 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </motion.button>

                {isListening && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStopListening}
                    className="px-6 py-3 rounded-lg font-semibold bg-amber-700 text-white hover:bg-amber-800 flex items-center gap-2"
                  >
                    <MicOff className="w-5 h-5" />
                    Stop Recording
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Feedback Section */}
            <AnimatePresence>
              {phase === 'feedback' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-lg p-8 border-2 shadow-lg ${
                    isCorrect
                      ? 'bg-green-50/80 border-green-300'
                      : 'bg-orange-50/80 border-orange-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {isCorrect ? (
                      <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg mb-2 ${
                        isCorrect ? 'text-green-900' : 'text-orange-900'
                      }`}>
                        {isCorrect ? '✓ शाबाश! (Well Done!)' : '~ Let us try again'}
                      </h4>
                      <p className={`mb-4 ${
                        isCorrect ? 'text-green-800' : 'text-orange-800'
                      }`}>
                        {guruFeedback}
                      </p>

                      {/* Detailed Scores */}
                      <motion.button
                        onClick={() => setShowDetails(!showDetails)}
                        className="mb-4 text-sm text-amber-900 hover:underline flex items-center gap-1"
                      >
                        <BarChart3 className="w-4 h-4" />
                        {showDetails ? 'Hide Details' : 'Show Score Details'}
                      </motion.button>

                      <AnimatePresence>
                        {showDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0 }}
                            className="mb-4 p-3 bg-black/5 rounded space-y-2 text-sm"
                          >
                            <div className="flex justify-between">
                              <span>Speech Confidence:</span>
                              <span className="font-semibold">
                                {(voiceProcessorRef.current?.getConfidence() || 0).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pronunciation Score:</span>
                              <span className="font-semibold">{pronunciationScore}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Overall Score:</span>
                              <span className="font-semibold text-lg">
                                {Math.round(confidenceScore)}%
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-6">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNextQuestion}
                          className="flex-1 px-4 py-2 rounded-lg font-semibold bg-amber-700 text-white hover:bg-amber-800 flex items-center justify-center gap-2"
                        >
                          <SkipForward className="w-4 h-4" />
                          Next Question
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSwitchMode}
                          className="flex-1 px-4 py-2 rounded-lg font-semibold border-2 border-amber-700 text-amber-700 hover:bg-amber-50"
                        >
                          Switch to {mode === 'test' ? 'Practice' : 'Test'}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
