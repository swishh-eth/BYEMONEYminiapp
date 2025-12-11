'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SwipeContainer from '@/components/SwipeContainer';
import HomePage from '@/components/HomePage';
import VotePage from '@/components/VotePage';
import InfoPage from '@/components/InfoPage';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1); // Start on Chart (index 1)
  const [isReady, setIsReady] = useState(false);
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();

  // Initialize Farcaster Mini App SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        
        // Signal that the app is ready
        await sdk.actions.ready();
        
        // Get user context
        const context = await sdk.context;
        if (context?.user) {
          setUserFid(context.user.fid);
          setUsername(context.user.username);
        }
        
        console.log('Mini App SDK initialized');
      } catch (error) {
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
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Page order matches PAGES constant: vote (0), home/chart (1), info (2)
  return (
    <div className="h-full flex flex-col">
      <Header />
      
      <SwipeContainer activeIndex={activeIndex} onNavigate={handleNavigate}>
        <VotePage userFid={userFid} username={username} />
        <HomePage />
        <InfoPage />
      </SwipeContainer>
      
      <BottomNav activeIndex={activeIndex} onNavigate={handleNavigate} />
    </div>
  );
}