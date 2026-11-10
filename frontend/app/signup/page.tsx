"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '../components/ThemeToggle';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signup, login } = useAuth();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        signup(name, email);
        router.push('/');
    };

    const handleQuickDemo = () => {
        login('sadhaka@sanskrit.org');
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Auras */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-saffron-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md z-10 glass-altar rounded-3xl p-8 sm:p-10 border border-saffron-500/20 shadow-2xl relative">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-gold-500 text-white font-serif font-bold text-xl flex items-center justify-center shadow-md shadow-saffron-500/25 group-hover:scale-105 transition-transform">
                            ॐ
                        </div>
                        <h1 className="text-2xl font-bold font-display text-gradient">Sanskrit Sadhana</h1>
                    </Link>
                    <h2 className="text-lg font-bold text-foreground">Begin Your Sadhana</h2>
                    <p className="text-xs text-muted-foreground mt-1">Create an account to track your pronunciation mastery</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                            Full Name
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3.5 py-3 bg-white/5 dark:bg-black/30 border border-white/10 dark:border-white/5 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
                                placeholder="Rohan Sharma"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3.5 py-3 bg-white/5 dark:bg-black/30 border border-white/10 dark:border-white/5 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
                                placeholder="rohan@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                            Password
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3.5 py-3 bg-white/5 dark:bg-black/30 border border-white/10 dark:border-white/5 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full btn btn-primary py-3 text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 group mt-6"
                    >
                        <span>Create Sadhana Profile</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-4 pt-4 border-t border-white/10 text-center">
                    <button
                        onClick={handleQuickDemo}
                        type="button"
                        className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 text-primary border-primary/20 hover:border-primary/40"
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Instant Demo Login (Guest Mode)</span>
                    </button>
                </div>

                <p className="text-center mt-6 text-xs text-muted-foreground">
                    Already registered?{' '}
                    <Link href="/login" className="text-primary font-semibold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
