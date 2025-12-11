'use client';

import { TOKEN } from '@/lib/constants';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <header className="relative z-10 px-4 py-4 flex items-center justify-between bg-bye-darker/80 backdrop-blur-xl border-b border-white/5">
      {/* Logo & Name */}
      <div className="flex items-center gap-3">
        <motion.div 
          className="w-10 h-10 rounded-full bg-gradient-to-br from-bye-red to-bye-pink flex items-center justify-center glow-red"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-xl">💸</span>
        </motion.div>
        <div>
          <h1 className="font-display font-bold text-lg text-gradient">
            ${TOKEN.symbol}
          </h1>
          <p className="text-xs text-white/40">on Base</p>
        </div>
      </div>
      
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs text-white/60 font-medium">LIVE</span>
      </div>
    </header>
  );
}
