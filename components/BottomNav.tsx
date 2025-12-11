'use client';

import { PAGES } from '@/lib/constants';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export default function BottomNav({ activeIndex, onNavigate }: BottomNavProps) {
  return (
    <nav className="relative z-20 bg-bye-darker/90 backdrop-blur-xl border-t border-white/5 safe-bottom">
      <div className="flex justify-around items-center py-3 px-4">
        {PAGES.map((page, index) => (
          <button
            key={page.id}
            onClick={() => onNavigate(index)}
            className="relative flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all duration-300"
          >
            {/* Active indicator */}
            {activeIndex === index && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-bye-red/15 rounded-xl"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            
            {/* Icon */}
            <span 
              className={`text-xl transition-transform duration-200 ${
                activeIndex === index ? 'scale-110' : ''
              }`}
            >
              {page.icon}
            </span>
            
            {/* Label */}
            <span 
              className={`text-xs font-medium transition-colors duration-200 ${
                activeIndex === index 
                  ? 'text-bye-red' 
                  : 'text-white/50'
              }`}
            >
              {page.label}
            </span>
            
            {/* Active dot */}
            {activeIndex === index && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 w-1.5 h-1.5 bg-bye-red rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
