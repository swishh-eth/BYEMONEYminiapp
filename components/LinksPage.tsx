'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { motion } from 'framer-motion';

const links = [
  {
    id: 'dexscreener',
    name: 'DexScreener',
    description: 'Charts & Trading',
    url: DEXSCREENER.tokenUrl,
    icon: '📊',
    color: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
  },
  {
    id: 'basescan',
    name: 'Basescan',
    description: 'Contract Explorer',
    url: SOCIALS.basescan,
    icon: '🔍',
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Latest Updates',
    url: SOCIALS.twitter,
    icon: '🐦',
    color: 'from-sky-500/20 to-sky-600/20',
    borderColor: 'border-sky-500/30',
    textColor: 'text-sky-400',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Community Chat',
    url: SOCIALS.telegram,
    icon: '💬',
    color: 'from-cyan-500/20 to-cyan-600/20',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
  },
];

export default function LinksPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
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
        {/* Header */}
        <div className="text-center py-4">
          <motion.h2 
            className="font-display font-bold text-2xl text-white mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Official Links
          </motion.h2>
          <motion.p 
            className="text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Connect with ${TOKEN.symbol}
          </motion.p>
        </div>
        
        {/* Links Grid */}
        <motion.div 
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {links.map((link) => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-2xl p-4 bg-gradient-to-r ${link.color} border ${link.borderColor} hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200`}
              variants={itemVariants}
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bye-darker/50 flex items-center justify-center text-2xl">
                  {link.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-display font-semibold ${link.textColor}`}>
                    {link.name}
                  </h3>
                  <p className="text-sm text-white/50">{link.description}</p>
                </div>
                <div className="text-white/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>
        
        {/* Buy Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <a
            href={`https://app.uniswap.org/swap?outputCurrency=${TOKEN.address}&chain=base`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-gradient-to-r from-bye-red to-bye-pink rounded-2xl p-4 text-center font-display font-bold text-white text-lg hover:opacity-90 transition-opacity glow-red-strong btn-hover"
          >
            💸 Buy ${TOKEN.symbol}
          </a>
        </motion.div>
        
        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-4 text-center"
        >
          <p className="text-sm text-white/50 mb-2">Share this miniapp</p>
          <p className="font-mono text-xs text-white/30 break-all">
            Cast the link to share on Farcaster
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
