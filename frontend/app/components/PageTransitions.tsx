'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  delay?: number;
}

/**
 * Page Transition Wrapper - applies smooth transitions to page changes
 */
export function PageTransition({ children, delay = 0 }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}

interface SectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Animated Section - reusable animated section component
 */
export function AnimatedSection({
  children,
  title,
  subtitle,
  className = '',
}: SectionProps) {
  return (
    <motion.section
      className={`relative ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {(title || subtitle) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}

interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
}

/**
 * Text Reveal Animation - character by character reveal
 */
export function RevealText({ text, className = '', delay = 0 }: RevealTextProps) {
  const characters = text.split('');

  return (
    <span className={className}>
      {characters.map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * 0.02,
            duration: 0.3,
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

interface StaggerListProps {
  items: ReactNode[];
  className?: string;
  containerClassName?: string;
}

/**
 * Stagger List Animation - animate list items sequentially
 */
export function StaggerList({
  items,
  className = '',
  containerClassName = 'space-y-4',
}: StaggerListProps) {
  return (
    <motion.ul
      className={containerClassName}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          className={className}
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 },
          }}
          transition={{ duration: 0.5 }}
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}
