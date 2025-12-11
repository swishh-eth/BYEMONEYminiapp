'use client';

import { ReactNode, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface SwipeContainerProps {
  children: ReactNode[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export default function SwipeContainer({ 
  children, 
  activeIndex, 
  onNavigate 
}: SwipeContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (offset < -threshold || velocity < -500) {
      // Swipe left - next page
      if (activeIndex < children.length - 1) {
        onNavigate(activeIndex + 1);
      }
    } else if (offset > threshold || velocity > 500) {
      // Swipe right - previous page
      if (activeIndex > 0) {
        onNavigate(activeIndex - 1);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
    >
      <motion.div
        className="flex h-full"
        animate={{ x: `-${activeIndex * 100}%` }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          mass: 0.8
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {children.map((child, index) => (
          <div 
            key={index}
            className="w-full h-full flex-shrink-0"
            style={{ minWidth: '100%' }}
          >
            {child}
          </div>
        ))}
      </motion.div>
      
      {/* Page Indicator Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {children.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => onNavigate(index)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              index === activeIndex ? 'bg-bye-red' : 'bg-white/20'
            }`}
            whileTap={{ scale: 0.9 }}
            animate={{ 
              scale: index === activeIndex ? 1.2 : 1,
              opacity: index === activeIndex ? 1 : 0.5
            }}
          />
        ))}
      </div>
    </div>
  );
}
