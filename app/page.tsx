'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SwipeContainer from '@/components/SwipeContainer';
import HomePage from '@/components/HomePage';
import PredictionMarket from '@/components/PredictionMarket';
import InfoPage from '@/components/InfoPage';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) {
          setUserFid(context.user.fid);
          setUsername(context.user.username);
        }
        console.log('Mini App SDK initialized');
      } catch (error) {
        console.log('Running in standalone mode');
      }
    };
    initSDK();
  }, []);

  const handleNavigate = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="h-full flex flex-col">
      <Header />
      
      <SwipeContainer activeIndex={activeIndex} onNavigate={handleNavigate}>
        <PredictionMarket userFid={userFid} username={username} />
        <HomePage />
        <InfoPage />
      </SwipeContainer>
      
      <BottomNav activeIndex={activeIndex} onNavigate={handleNavigate} />
    </div>
  );
}