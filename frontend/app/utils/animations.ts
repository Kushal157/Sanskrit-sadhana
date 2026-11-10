'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Smooth Scroll Offset for anchored navigation
 * This hook ensures smooth scrolling is applied across the application
 */
export function useSmoothScroll() {
  useEffect(() => {
    // Add smooth scroll behavior to html element
    if (typeof window !== 'undefined') {
      document.documentElement.style.scrollBehavior = 'smooth';
      
      return () => {
        document.documentElement.style.scrollBehavior = 'auto';
      };
    }
  }, []);
}

/**
 * Parallax Scroll Effect Hook
 * Create depth in scrolling content
 */
export function useParallax(offset: number = 0.5) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY * offset;
}

/**
 * Enhanced Motion Variants for consistent animations
 */
export const motionVariants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    },
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    },
  },
  fadeInScale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  },
};

/**
 * Intersection Observer Hook for element visibility tracking
 */
export function useElementInView(options = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      ...options,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

/**
 * Animated Counter Component - useful for statistics
 */
export function AnimatedCounter({ 
  from = 0, 
  to, 
  duration = 2 
}: { 
  from?: number; 
  to: number; 
  duration?: number;
}): React.ReactNode {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let start = from;
    const increment = (to - from) / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [from, to, duration]);

  return React.createElement('span', null, count);
}
