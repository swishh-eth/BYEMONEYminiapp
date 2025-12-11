'use client';

import { ReactNode, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';

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
    <div className="flex-1 overflow-hidden relative">
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
    </div>
  );
}
