# Quick Start: Using New Animation Components

This guide shows how to use the new animation and UI components in your project.

## 🎯 Most Common Use Cases

### 1. Animate Section on Scroll
```tsx
import { ScrollReveal } from '@/app/components/ScrollReveal';

export function MySection() {
  return (
    <ScrollReveal direction="up" delay={0.2}>
      <div className="p-8">
        <h2>This appears as you scroll down</h2>
        <p>Smooth fade-in animation</p>
      </div>
    </ScrollReveal>
  );
}
```

### 2. Staggered List Animation
```tsx
import { ScrollRevealGroup, ScrollRevealChild } from '@/app/components/ScrollReveal';

export function ShlokasList() {
  const shlokas = ['Shloka 1', 'Shloka 2', 'Shloka 3'];
  
  return (
    <ScrollRevealGroup staggerDelay={0.15}>
      {shlokas.map((shloka) => (
        <ScrollRevealChild key={shloka}>
          <div className="p-4 glass rounded-lg">
            {shloka}
          </div>
        </ScrollRevealChild>
      ))}
    </ScrollRevealGroup>
  );
}
```

### 3. Modern Card with Hover Effect
```tsx
import { ModernCard, GradientText } from '@/app/components/ModernComponents';

export function FeatureCard() {
  return (
    <ModernCard hoverEffect glow>
      <h3>
        <GradientText>Amazing Feature</GradientText>
      </h3>
      <p>Hover over this card to see the effect</p>
    </ModernCard>
  );
}
```

### 4. Animated Button with Loading State
```tsx
import { AnimatedButton } from '@/app/components/ModernComponents';
import { useState } from 'react';

export function AnalyzeButton() {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <AnimatedButton 
      variant="primary"
      size="lg"
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        // Do something async
        await new Promise(r => setTimeout(r, 2000));
        setIsLoading(false);
      }}
    >
      Analyze Pronunciation
    </AnimatedButton>
  );
}
```

### 5. Page Transitions
```tsx
import { PageTransition } from '@/app/components/PageTransitions';

export default function Page() {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <h1>Page content with smooth transitions</h1>
      </div>
    </PageTransition>
  );
}
```

## 🎨 Animation Directions

```tsx
// Different animation entry directions
<ScrollReveal direction="up">    {/* Default: slides up while fading in */}
<ScrollReveal direction="down">  {/* Slides down while fading in */}
<ScrollReveal direction="left">  {/* Slides in from right */}
<ScrollReveal direction="right"> {/* Slides in from left */}
```

## ⏱️ Timing Control

```tsx
// All animations accept these props:
<ScrollReveal 
  delay={0.3}      // Wait 0.3s after element enters viewport
  duration={0.8}   // Animation takes 0.8s
  threshold={0.2}  // Trigger when 20% of element is visible
>
  Content
</ScrollReveal>
```

## 🎯 Stagger Animations

```tsx
// Automatically stagger child animations
<ScrollRevealGroup staggerDelay={0.1}> {/* 0.1s between each child */}
  <ScrollRevealChild>Item 1</ScrollRevealChild>
  <ScrollRevealChild>Item 2</ScrollRevealChild>
  <ScrollRevealChild>Item 3</ScrollRevealChild>
</ScrollRevealGroup>
```

## 🔘 Button Variants

```tsx
// Different button styles
<AnimatedButton variant="primary">Primary</AnimatedButton>
<AnimatedButton variant="secondary">Secondary</AnimatedButton>
<AnimatedButton variant="ghost">Ghost</AnimatedButton>

// Different sizes
<AnimatedButton size="sm">Small</AnimatedButton>
<AnimatedButton size="md">Medium</AnimatedButton>
<AnimatedButton size="lg">Large</AnimatedButton>
```

## 📊 Utility Hooks

```tsx
// Smooth scroll behavior
import { useSmoothScroll } from '@/app/utils/animations';

export function Component() {
  useSmoothScroll();
  return <div>Smooth scroll enabled</div>;
}

// Parallax effect
import { useParallax } from '@/app/utils/animations';

export function ParallaxBg() {
  const parallaxY = useParallax(0.5); // 50% of scroll speed
  
  return (
    <div style={{ transform: `translateY(${parallaxY}px)` }}>
      Parallax background
    </div>
  );
}

// Track visibility
import { useElementInView } from '@/app/utils/animations';

export function InViewElement() {
  const [ref, isInView] = useElementInView();
  
  return (
    <div ref={ref as any}>
      {isInView ? 'Visible!' : 'Not in view'}
    </div>
  );
}
```

## 💡 CSS Animation Classes

```tsx
// Apply animations directly via CSS
<div className="animate-fade-in-up">Fades in moving up</div>
<div className="animate-fade-in-scale">Fades in scaling up</div>
<div className="animate-glow">Glowing effect</div>

// Add delays
<div className="animate-fade-in-up delay-200">Delayed 200ms</div>
<div className="animate-fade-in-up delay-500">Delayed 500ms</div>
```

## 🎬 Complex Animation Example

```tsx
import { ScrollRevealGroup, ScrollRevealChild } from '@/app/components/ScrollReveal';
import { ModernCard, GradientText, AnimatedButton } from '@/app/components/ModernComponents';

export function ComplexExample() {
  return (
    <div className="space-y-8">
      {/* Hero section with staggered reveal */}
      <ScrollRevealGroup staggerDelay={0.1}>
        <ScrollRevealChild>
          <h1>
            <GradientText>Sanskrit Sadhana</GradientText>
          </h1>
        </ScrollRevealChild>
        
        <ScrollRevealChild>
          <p className="text-lg text-muted-foreground">
            Master the divine sounds with AI-guided precision
          </p>
        </ScrollRevealChild>
        
        <ScrollRevealChild>
          <AnimatedButton variant="primary" size="lg">
            Start Practice
          </AnimatedButton>
        </ScrollRevealChild>
      </ScrollRevealGroup>

      {/* Feature grid with individual reveals */}
      <ScrollRevealGroup staggerDelay={0.15}>
        {['Feature 1', 'Feature 2', 'Feature 3'].map((feature) => (
          <ScrollRevealChild key={feature}>
            <ModernCard hoverEffect glow>
              <h3>{feature}</h3>
              <p>Feature description goes here</p>
            </ModernCard>
          </ScrollRevealChild>
        ))}
      </ScrollRevealGroup>
    </div>
  );
}
```

## 🚀 Performance Tips

1. **Use `once: true`**: Animations only play once (default behavior)
2. **Lazy load components**: Prevents unnecessary DOM nodes
3. **Avoid too many staggered items**: Keep under 20 children for best performance
4. **Use CSS animations**: For simpler effects, use CSS classes
5. **Test on mobile**: Some animations may feel slow on lower-end devices

## ⚙️ Configuration

### Global Animation Timing
Edit `frontend/app/globals.css`:
```css
/* Change duration of all fadeInUp animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Component Default Props
Create a custom wrapper in your project:
```tsx
const MyScrollReveal: typeof ScrollReveal = (props) => (
  <ScrollReveal duration={0.7} delay={0.1} {...props} />
);
```

## 🐛 Troubleshooting

**Animations not playing?**
- Check if element is in viewport
- Verify `once: true` hasn't already played
- Check z-index if hidden behind other elements

**Janky animations?**
- Reduce number of staggered items
- Increase `duration` prop
- Check browser DevTools for CPU/GPU usage

**Too fast/slow?**
- Adjust `duration` prop
- Change `delay` for stagger timing
- Modify keyframe timing in globals.css

## 📚 Further Reading

- [Framer Motion Docs](https://www.framer.com/motion/)
- [CSS Animation Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web Animation Performance](https://web.dev/animations-guide/)

---

**Need help?** Check the component source code for more configuration options!
