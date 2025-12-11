'use client';

import { TOKEN, SOCIALS } from '@/lib/constants';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function InfoPage() {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full overflow-y-auto"
    >
      <div className="p-4 space-y-4">
        {/* Hero Card */}
        <motion.div 
          className="glass rounded-2xl p-6 text-center relative overflow-hidden"
          variants={itemVariants}
        >
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-bye-red/20 rounded-full blur-3xl" />
          
          <motion.div 
            className="relative z-10"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-6xl mb-4 block">💸</span>
          </motion.div>
          <h2 className="font-display font-bold text-3xl text-gradient relative z-10">
            ${TOKEN.symbol}
          </h2>
          <p className="text-white/50 mt-2 relative z-10">
            Say Goodbye to Your Money
          </p>
        </motion.div>
        
        {/* Contract Address */}
        <motion.div 
          className="glass rounded-2xl p-4"
          variants={itemVariants}
        >
          <p className="text-xs text-white/40 mb-2">Contract Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-white/80 bg-bye-darker rounded-lg p-3 font-mono overflow-hidden text-ellipsis">
              {TOKEN.address}
            </code>
            <button
              onClick={copyAddress}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                copied 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-bye-red/20 text-bye-red hover:bg-bye-red/30'
              }`}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </motion.div>
        
        {/* Token Info Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="glass rounded-2xl p-4" variants={itemVariants}>
            <p className="text-xs text-white/40 mb-1">Network</p>
            <p className="font-display font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">⬢</span>
              Base
            </p>
          </motion.div>
          
          <motion.div className="glass rounded-2xl p-4" variants={itemVariants}>
            <p className="text-xs text-white/40 mb-1">Chain ID</p>
            <p className="font-display font-semibold text-white">{TOKEN.chainId}</p>
          </motion.div>
          
          <motion.div className="glass rounded-2xl p-4" variants={itemVariants}>
            <p className="text-xs text-white/40 mb-1">Decimals</p>
            <p className="font-display font-semibold text-white">{TOKEN.decimals}</p>
          </motion.div>
          
          <motion.div className="glass rounded-2xl p-4" variants={itemVariants}>
            <p className="text-xs text-white/40 mb-1">Type</p>
            <p className="font-display font-semibold text-white">ERC-20</p>
          </motion.div>
        </motion.div>
        
        {/* View on Basescan Button */}
        <motion.a
          href={SOCIALS.basescan}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full glass rounded-2xl p-4 text-center font-medium text-white/80 hover:text-white transition-colors btn-hover"
          variants={itemVariants}
        >
          View on Basescan →
        </motion.a>
        
        {/* Disclaimer */}
        <motion.p 
          className="text-xs text-white/30 text-center px-4"
          variants={itemVariants}
        >
          Always DYOR. Crypto is volatile. Only invest what you can afford to lose.
        </motion.p>
      </div>
    </motion.div>
  );
}
