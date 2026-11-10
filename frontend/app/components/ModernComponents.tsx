'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export function ModernCard({
  children,
  className = '',
  hoverEffect = true,
  glow = false,
  interactive = false,
  onClick,
}: ModernCardProps) {
  return (
    <motion.div
      className={cn(
        'glass rounded-3xl p-6 transition-all duration-300',
        hoverEffect && 'hover:shadow-xl hover:-translate-y-1',
        glow && 'saffron-glow',
        interactive && 'cursor-pointer',
        className
      )}
      whileHover={hoverEffect ? { scale: 1.02 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

interface GradientTextProps {
  children: ReactNode;
  className?: string;
}

export function GradientText({ children, className = '' }: GradientTextProps) {
  return (
    <span className={cn('text-gradient', className)}>
      {children}
    </span>
  );
}

interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'bg-transparent border border-white/20 hover:bg-white/5',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4 text-lg',
};

export function AnimatedButton({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  isLoading = false,
}: AnimatedButtonProps) {
  return (
    <motion.button
      className={cn('btn', variantStyles[variant], sizeStyles[size], className)}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isLoading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline-block"
        >
          ⟳
        </motion.span>
      ) : (
        children
      )}
    </motion.button>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.05,
  className = '',
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
}

export function AnimatedText({ children, className = '', delay = 0 }: AnimatedTextProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.span>
  );
}
