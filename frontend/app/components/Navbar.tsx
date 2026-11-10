"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Volume2,
  BookOpen,
  Mic,
  GraduationCap,
  History,
  LogOut,
  LogIn,
  Clock,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Chamber", icon: Mic, badge: "AI Core" },
  { href: "/viva", label: "Viva Guru", icon: Volume2, badge: "Voice" },
  { href: "/custom", label: "Custom Scribe", icon: Sparkles, badge: "IAST" },
  { href: "/guru-teaching", label: "Live Chanting", icon: BookOpen, badge: "Real-time" },
  { href: "/testyourself", label: "Quiz Hall", icon: GraduationCap, badge: "Quiz" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="max-w-7xl mx-auto rounded-2xl glass-altar px-4 py-3 sm:px-6 flex items-center justify-between border border-white/10 dark:border-white/5 shadow-xl transition-all">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-gold-500 text-white font-serif font-bold text-xl shadow-md shadow-saffron-500/25 group-hover:scale-105 transition-transform">
            <span>ॐ</span>
            <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-saffron-400 to-gold-300 opacity-0 group-hover:opacity-40 blur transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-gradient">
                Sanskrit Sadhana
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-saffron-500/30 bg-saffron-500/10 text-saffron-500">
                संस्कृत
              </span>
            </div>
            <p className="hidden md:block text-[10px] tracking-wider text-muted-foreground uppercase font-medium">
              Vedic Phonetic Sanctuary
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-white/8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-200",
                  isActive
                    ? "text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-pill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-800 border border-saffron-500/20 shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "opacity-70")} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Theme Toggle & User Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 dark:border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                title="Account History"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-saffron-600 to-gold-500 flex items-center justify-center text-white text-[11px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[90px] truncate">
                  {user.name}
                </span>
                <History className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    className="absolute top-full right-0 mt-3 w-72 glass-altar rounded-2xl p-4 border border-white/10 z-50 shadow-2xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={logout}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Recent Sadhana Sessions
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {user.loginHistory && user.loginHistory.length > 0 ? (
                          user.loginHistory.map((time, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[11px] text-muted-foreground p-1.5 rounded-lg bg-white/5"
                            >
                              <Clock className="w-3 h-3 text-gold-500/60" />
                              <span className="truncate">{time}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            First active session
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="btn btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-primary" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden mt-2 max-w-7xl mx-auto rounded-2xl glass-altar p-4 border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

