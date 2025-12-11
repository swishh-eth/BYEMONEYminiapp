'use client';

import { ReactNode } from 'react';

interface SwipeContainerProps {
  children: ReactNode[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export default function SwipeContainer({ 
  children, 
  activeIndex, 
}: SwipeContainerProps) {
  return (
    <div className="flex-1 overflow-hidden relative">
      {children[activeIndex]}
    </div>
  );
}