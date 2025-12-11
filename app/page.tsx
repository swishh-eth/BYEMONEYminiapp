'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SwipeContainer from '@/components/SwipeContainer';
import HomePage from '@/components/HomePage';
import InfoPage from '@/components/InfoPage';
import VotePage from '@/components/VotePage';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const url = new URL(window.location.href);
        const isMiniApp = url.searchParams.get('miniApp') === 'true' || 
                          window.parent !== window;
        
        if (isMiniApp) {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          
          // Get context with user info
          const context = await sdk.context;
          
          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            });
          }
          
          await sdk.actions.ready();
        }
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

  if (!isReady) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p className="text-white/50 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      
      <SwipeContainer activeIndex={activeIndex} onNavigate={handleNavigate}>
        <VotePage 
          userFid={user?.fid} 
          username={user?.username}
        />
        <HomePage />
        <InfoPage />
      </SwipeContainer>
      
      <BottomNav activeIndex={activeIndex} onNavigate={handleNavigate} />
    </>
  );
}