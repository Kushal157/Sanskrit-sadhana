'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PalmLeavesBackgroundProps {
  children: ReactNode;
}

export function PalmLeavesBackground({ children }: PalmLeavesBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aged Manuscript Background */}
      <div className="absolute inset-0 z-0">
        {/* Primary aged parchment color */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: '#ebe3d5',
            backgroundImage: `
              linear-gradient(45deg, rgba(180, 140, 80, 0.08) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(160, 120, 70, 0.08) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(140, 100, 60, 0.08) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(120, 80, 40, 0.08) 75%)
            `,
            backgroundSize: '60px 60px',
            backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0px',
          }}
        />

        {/* Weathered texture overlay - aged stains */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 15% 25%, rgba(139, 90, 43, 0.2) 0%, transparent 35%),
              radial-gradient(ellipse at 85% 75%, rgba(160, 110, 50, 0.15) 0%, transparent 40%),
              radial-gradient(ellipse at 50% 50%, rgba(180, 130, 70, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(100, 60, 30, 0.12) 0%, transparent 25%)
            `,
          }}
        />

        {/* Fine paper grain texture */}
        <div className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(139, 90, 43, 0.02) 2px,
                rgba(139, 90, 43, 0.02) 4px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(160, 120, 70, 0.02) 2px,
                rgba(160, 120, 70, 0.02) 4px
              )
            `,
          }}
        />

        {/* Ancient vein-like fibers */}
        <svg className="absolute inset-0 w-full h-full opacity-8" preserveAspectRatio="none">
          <defs>
            <pattern id="palmVeins" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
              <path d="M 200,0 Q 220,100 200,200 Q 180,300 200,400" stroke="rgba(139, 90, 43, 0.15)" strokeWidth="0.5" fill="none" />
              <path d="M 100,200 Q 150,180 200,200 Q 250,220 300,200" stroke="rgba(160, 120, 70, 0.12)" strokeWidth="0.4" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#palmVeins)" />
        </svg>

        {/* Vignette shadow - darker edges for ancient feel */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at center, transparent 0%, rgba(60, 40, 20, 0.15) 100%)
            `,
          }}
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface CarvingTextProps {
  text: string;
  delay?: number;
  className?: string;
}

/**
 * CarvingText Component - Animates text appearing as if being carved into palm leaves
 * Character by character reveal with a carving/etching effect
 */
export function CarvingText({ text, delay = 0, className = '' }: CarvingTextProps) {
  const characters = text.split('');

  return (
    <div className={className}>
      {characters.map((char, index) => (
        <motion.span
          key={`${index}-${char}`}
          initial={{ 
            opacity: 0,
            scaleX: 0,
            filter: 'brightness(0.5) blur(2px)',
          }}
          animate={{ 
            opacity: 1,
            scaleX: 1,
            filter: 'brightness(1) blur(0px)',
          }}
          transition={{
            delay: delay + index * 0.05,
            duration: 0.4,
            ease: 'easeOut',
          }}
          className="inline-block origin-left"
          style={{
            textShadow: '0 1px 2px rgba(139, 90, 43, 0.2)',
            fontWeight: 500,
          }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

interface CarvingLineProps {
  show: boolean;
  duration?: number;
}

/**
 * CarvingLine Component - Animated line appearing like palm leaf vein carving
 */
export function CarvingLine({ show, duration = 0.8 }: CarvingLineProps) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={show ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
      transition={{ duration, ease: 'easeInOut' }}
      className="h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent origin-left"
      style={{
        boxShadow: '0 0 8px rgba(180, 140, 80, 0.3)',
      }}
    />
  );
}

interface PalmLeafFrameProps {
  children: ReactNode;
  animated?: boolean;
}

/**
 * PalmLeafFrame Component - Visual frame resembling an ancient palm leaf manuscript
 */
export function PalmLeafFrame({ children, animated = true }: PalmLeafFrameProps) {
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative"
      style={{
        backgroundColor: '#faf8f3',
        backgroundImage: `
          linear-gradient(90deg, transparent 0%, rgba(180, 140, 80, 0.05) 50%, transparent 100%),
          linear-gradient(180deg, rgba(160, 130, 90, 0.08) 0%, transparent 50%, rgba(160, 130, 90, 0.05) 100%)
        `,
      }}
    >
      {/* Decorative border - resembling palm leaf edges */}
      <div className="absolute inset-0 border-2 border-amber-900/10 pointer-events-none" />
      
      {/* Left edge - palm leaf vein effect */}
      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-20"
        style={{
          backgroundImage: `linear-gradient(180deg, 
            transparent 0%, 
            rgba(139, 90, 43, 0.4) 10%, 
            rgba(139, 90, 43, 0.3) 50%, 
            rgba(139, 90, 43, 0.4) 90%, 
            transparent 100%)`
        }}
      />

      {/* Right edge - palm leaf vein effect */}
      <div className="absolute right-0 top-0 bottom-0 w-1 opacity-20"
        style={{
          backgroundImage: `linear-gradient(180deg, 
            transparent 0%, 
            rgba(139, 90, 43, 0.4) 10%, 
            rgba(139, 90, 43, 0.3) 50%, 
            rgba(139, 90, 43, 0.4) 90%, 
            transparent 100%)`
        }}
      />

      {/* Content with padding */}
      <div className="relative p-8 lg:p-12">
        {children}
      </div>

      {/* Aged paper stains in corners */}
      <motion.div
        className="absolute top-4 right-4 w-20 h-20 opacity-5 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ delay: 0.5, duration: 1 }}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(139, 90, 43, 0.8) 0%, transparent 70%)'
        }}
      />
      
      <motion.div
        className="absolute bottom-4 left-4 w-32 h-32 opacity-5 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.04 }}
        transition={{ delay: 0.7, duration: 1 }}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(120, 80, 40, 0.8) 0%, transparent 70%)'
        }}
      />
    </motion.div>
  );
}
