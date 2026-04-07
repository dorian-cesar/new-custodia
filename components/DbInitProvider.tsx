'use client';

import { useEffect, useState } from 'react';
import { useCustodyStore } from '@/lib/custody-store';
import { getInitialState } from '@/app/actions/db-actions';

export function DbInitProvider({ children }: { children: React.ReactNode }) {
  const hydrateState = useCustodyStore((state) => state.hydrateState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getInitialState().then((res) => {
      if (res.success && res.data) {
        hydrateState(res.data);
      } else {
        console.error('Failed to load DB state:', res.error);
      }
      setIsLoaded(true);
    });
  }, [hydrateState]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Conectando a base de datos...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
