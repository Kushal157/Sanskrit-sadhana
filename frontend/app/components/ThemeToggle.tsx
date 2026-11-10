"use client";

import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative shrink-0 overflow-hidden rounded-xl border-white/10 p-2.5 glass transition-all group hover:bg-white/5"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0, rotate: -45 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.2 }}
                >
                    {theme === "light" ? (
                        <Sun className="w-5 h-5 text-saffron-500" />
                    ) : (
                        <Moon className="w-5 h-5 text-gold-400" />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    );
}
