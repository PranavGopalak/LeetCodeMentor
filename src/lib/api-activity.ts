'use client';

type Listener = () => void;

interface ApiActivityStore {
  activeCount: number;
  listeners: Set<Listener>;
  patched: boolean;
}

declare global {
  interface Window {
    __leetmentorApiActivityStore?: ApiActivityStore;
    __leetmentorOriginalFetch?: typeof window.fetch;
  }
}

function getStore(): ApiActivityStore {
  if (!window.__leetmentorApiActivityStore) {
    window.__leetmentorApiActivityStore = {
      activeCount: 0,
      listeners: new Set<Listener>(),
      patched: false,
    };
  }

  return window.__leetmentorApiActivityStore;
}

function emit(): void {
  const store = getStore();
  for (const listener of store.listeners) {
    listener();
  }
}

function begin(): void {
  const store = getStore();
  store.activeCount += 1;
  emit();
}

function end(): void {
  const store = getStore();
  store.activeCount = Math.max(0, store.activeCount - 1);
  emit();
}

function shouldTrackRequest(input: RequestInfo | URL): boolean {
  try {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    const resolved = new URL(rawUrl, window.location.origin);

    if (resolved.origin === window.location.origin) {
      return resolved.pathname.startsWith('/api/');
    }

    return (
      resolved.hostname.includes('googleapis.com') ||
      resolved.hostname.includes('leetcode.com')
    );
  } catch {
    return false;
  }
}

export function ensureApiActivityTracking(): void {
  if (typeof window === 'undefined') return;

  const store = getStore();
  if (store.patched) return;

  store.patched = true;
  if (!window.__leetmentorOriginalFetch) {
    window.__leetmentorOriginalFetch = window.fetch.bind(window);
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const tracked = shouldTrackRequest(input);
    if (tracked) begin();

    try {
      return await window.__leetmentorOriginalFetch!(input, init);
    } finally {
      if (tracked) end();
    }
  };
}

export function subscribeToApiActivity(listener: Listener): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function getApiActivitySnapshot(): number {
  return typeof window === 'undefined' ? 0 : getStore().activeCount;
}
