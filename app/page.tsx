'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SwipeContainer from '@/components/SwipeContainer';
import HomePage from '@/components/HomePage';
import InfoPage from '@/components/InfoPage';
import LinksPage from '@/components/LinksPage';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Initialize Farcaster Mini App SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        // Check if running in Farcaster context
        const url = new URL(window.location.href);
        const isMiniApp = url.searchParams.get('miniApp') === 'true' || 
                          window.parent !== window;
        
        if (isMiniApp) {
          // Dynamically import SDK only in miniapp context
          const { sdk } = await import('@farcaster/miniapp-sdk');
          
          // Signal that the app is ready
          await sdk.actions.ready();
          console.log('Mini App SDK initialized');
        }
      } catch (error) {
        // SDK not available or not in frame context - that's fine
        console.log('Running in standalone mode');
      } finally {
        setIsReady(true);
      }
    };

    initSDK();
  }, []);

  const handleNavigate = (index: number) => {
    setActiveIndex(index);
  };

  // Show loading state briefly
  if (!isReady) {
    return (
      <div className="h-full flex items-center justify-center bg-bye-darker">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-bye-red to-bye-pink flex items-center justify-center animate-pulse glow-red-strong">
            <span className="text-3xl">💸</span>
          </div>
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      
      <SwipeContainer activeIndex={activeIndex} onNavigate={handleNavigate}>
        <HomePage />
        <InfoPage />
        <LinksPage />
      </SwipeContainer>
      
      <BottomNav activeIndex={activeIndex} onNavigate={handleNavigate} />
    </>
  );
}
