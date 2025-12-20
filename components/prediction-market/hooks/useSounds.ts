'use client';

import { useRef, useEffect, useCallback } from 'react';

interface UseSoundsReturn {
  playClick: () => void;
  playSuccess: () => void;
  triggerHaptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => Promise<void>;
}

export function useSounds(sdk: any): UseSoundsReturn {
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      clickSoundRef.current = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Coverage0NDQ0NDQ0M='
      );
      clickSoundRef.current.volume = 0.2;
      successSoundRef.current = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Af4'
      );
      successSoundRef.current.volume = 0.3;
    }
  }, []);

  const playClick = useCallback(() => {
    try {
      clickSoundRef.current?.play().catch(() => {});
    } catch {}
  }, []);

  const playSuccess = useCallback(() => {
    try {
      successSoundRef.current?.play().catch(() => {});
    } catch {}
  }, []);

  const triggerHaptic = useCallback(
    async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
      try {
        if (sdk?.haptics) {
          if (type === 'success') {
            await sdk.haptics.notificationOccurred('success');
          } else if (type === 'error') {
            await sdk.haptics.notificationOccurred('error');
          } else {
            await sdk.haptics.impactOccurred(type);
          }
        }
      } catch {}
    },
    [sdk]
  );

  return { playClick, playSuccess, triggerHaptic };
}
