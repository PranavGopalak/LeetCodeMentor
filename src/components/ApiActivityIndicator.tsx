'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureApiActivityTracking,
  getApiActivitySnapshot,
  subscribeToApiActivity,
} from '@/lib/api-activity';

export default function ApiActivityIndicator() {
  useEffect(() => {
    ensureApiActivityTracking();
  }, []);

  const activeCount = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivitySnapshot,
    () => 0
  );

  return (
    <div
      className={`pointer-events-none fixed bottom-4 right-4 z-50 transition-all duration-200 ${
        activeCount > 0
          ? 'translate-y-0 opacity-100'
          : 'translate-y-3 opacity-0'
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3 rounded-full border border-lc-brand/25 bg-card/95 px-3 py-2 shadow-xl shadow-black/20 backdrop-blur">
        <div className="relative h-11 w-11 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-lc-brand/15" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lc-brand border-r-lc-brand animate-spin" />
          <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-lc-brand/10 text-xs font-bold text-lc-brand">
            {activeCount}
          </div>
        </div>
        <div className="min-w-[112px]">
          <div className="text-xs font-semibold text-foreground/85">
            Working
          </div>
          <div className="text-[11px] text-foreground/55">
            {activeCount === 1
              ? '1 API request in flight'
              : `${activeCount} API requests in flight`}
          </div>
        </div>
      </div>
    </div>
  );
}
