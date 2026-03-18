import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

import { CANONICAL_TAGS, ConfidenceScore, type CanonicalTag } from '@/lib/mastery';

export interface ProblemLog {
  id: string;
  problemNameOrUrl: string;
  timeTaken?: number;
  comments?: string;
  score?: ConfidenceScore;
}

export interface StudySession {
  id: string;
  date: string;
  problems: ProblemLog[];
}

export interface ScheduledProblem {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
}

export interface AISchedule {
  date: string;
  reviewProblems: ScheduledProblem[];
  newProblems: ScheduledProblem[];
  challengeProblem: ScheduledProblem | null;
  tips: string;
  preferenceSignature?: string;
}

export type TagPowerLevels = Record<CanonicalTag, number>;

export const DEFAULT_POWER_LEVELS: TagPowerLevels = Object.fromEntries(
  CANONICAL_TAGS.map((tag) => [tag, 2])
) as TagPowerLevels;

export const POWER_LEVEL_PRESETS: Record<string, TagPowerLevels> = {
  Balanced: { ...DEFAULT_POWER_LEVELS },
  'Arrays + Strings': {
    ...DEFAULT_POWER_LEVELS,
    Array: 5,
    String: 5,
    'Two Pointers': 4,
    'Sliding Window': 4,
  },
  'Trees + Graphs': {
    ...DEFAULT_POWER_LEVELS,
    Trees: 5,
    Graphs: 5,
    'DFS/BFS': 4,
    Heap: 3,
  },
  'DP Sprint': {
    ...DEFAULT_POWER_LEVELS,
    'Dynamic Programming': 5,
    Greedy: 3,
    'Binary Search': 3,
  },
  'Interview Mix': {
    ...DEFAULT_POWER_LEVELS,
    Array: 4,
    String: 4,
    'Two Pointers': 4,
    'Sliding Window': 3,
    'Linked List': 3,
    Trees: 3,
    'Binary Search': 3,
  },
};

type PersistedSessionState = Partial<{
  leetcodeUsername: string;
  geminiApiKey: string;
  sessions: StudySession[];
  aiSchedule: AISchedule | null;
  activeSession: ProblemLog[];
  targetReviewProblems: number;
  targetNewProblems: number;
  powerLevels: Partial<Record<CanonicalTag, number>>;
}>;

function normalizePowerLevels(
  raw: Partial<Record<CanonicalTag, number>> | undefined
): TagPowerLevels {
  const normalized = { ...DEFAULT_POWER_LEVELS };
  for (const tag of CANONICAL_TAGS) {
    const value = Number(raw?.[tag]);
    normalized[tag] = Number.isFinite(value)
      ? Math.max(0, Math.min(5, Math.round(value)))
      : DEFAULT_POWER_LEVELS[tag];
  }
  return normalized;
}

interface SessionState {
  leetcodeUsername: string;
  geminiApiKey: string;
  sessions: StudySession[];
  aiSchedule: AISchedule | null;

  activeSession: ProblemLog[];
  setActiveSession: (problems: ProblemLog[]) => void;
  targetReviewProblems: number;
  targetNewProblems: number;
  powerLevels: TagPowerLevels;

  setLeetcodeUsername: (username: string) => void;
  setGeminiApiKey: (key: string) => void;
  setTargetReviewProblems: (count: number) => void;
  setTargetNewProblems: (count: number) => void;
  setPowerLevel: (tag: CanonicalTag, level: number) => void;
  setPowerLevels: (powerLevels: Partial<Record<CanonicalTag, number>>) => void;
  addSession: (session: StudySession) => void;
  removeSession: (id: string) => void;
  setAISchedule: (schedule: AISchedule | null) => void;
  exportData: () => void;
  importData: (json: string) => void;
}

interface PersistHints {
  replaceSessions: boolean;
  replaceActiveSession: boolean;
  replaceLeetcodeUsername: boolean;
  replaceGeminiApiKey: boolean;
  replaceTargets: boolean;
  replacePowerLevels: boolean;
  replaceSchedule: boolean;
}

const EMPTY_PERSIST_HINTS: PersistHints = {
  replaceSessions: false,
  replaceActiveSession: false,
  replaceLeetcodeUsername: false,
  replaceGeminiApiKey: false,
  replaceTargets: false,
  replacePowerLevels: false,
  replaceSchedule: false,
};

let hasHydratedStore = false;
let pendingPersistValue: string | null = null;
let queuedPersistValue: string | null = null;
let queuedPersistHints: PersistHints = { ...EMPTY_PERSIST_HINTS };
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistChain: Promise<void> = Promise.resolve();
let nextPersistHints: PersistHints = { ...EMPTY_PERSIST_HINTS };

function mergePersistHints(current: PersistHints, incoming: Partial<PersistHints>): PersistHints {
  return {
    replaceSessions: current.replaceSessions || incoming.replaceSessions === true,
    replaceActiveSession:
      current.replaceActiveSession || incoming.replaceActiveSession === true,
    replaceLeetcodeUsername:
      current.replaceLeetcodeUsername || incoming.replaceLeetcodeUsername === true,
    replaceGeminiApiKey:
      current.replaceGeminiApiKey || incoming.replaceGeminiApiKey === true,
    replaceTargets: current.replaceTargets || incoming.replaceTargets === true,
    replacePowerLevels:
      current.replacePowerLevels || incoming.replacePowerLevels === true,
    replaceSchedule: current.replaceSchedule || incoming.replaceSchedule === true,
  };
}

function markNextPersistHints(hints: Partial<PersistHints>): void {
  nextPersistHints = mergePersistHints(nextPersistHints, hints);
}

async function persistStoreValue(
  value: string,
  hints: PersistHints = EMPTY_PERSIST_HINTS
): Promise<void> {
  try {
    const parsed = JSON.parse(value);
    await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        ...hints,
      }),
    });
  } catch {
    // Silently fail - next mutation can retry.
  }
}

function schedulePersist(value: string): void {
  queuedPersistValue = value;
  queuedPersistHints = mergePersistHints(queuedPersistHints, nextPersistHints);
  nextPersistHints = { ...EMPTY_PERSIST_HINTS };

  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;
    const nextValue = queuedPersistValue;
    const hints = queuedPersistHints;
    queuedPersistValue = null;
    queuedPersistHints = { ...EMPTY_PERSIST_HINTS };
    if (!nextValue) return;

    persistChain = persistChain
      .then(() => persistStoreValue(nextValue, hints))
      .catch(() => {
        // no-op
      });
  }, 120);
}

// Custom storage adapter: reads/writes to server JSON file via API routes
const fileStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    void name;
    try {
      const res = await fetch('/api/store');
      if (!res.ok) return null;
      const data = await res.json();
      return JSON.stringify({ state: data.state ?? data, version: data.version ?? 0 });
    } catch {
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    void _name;
    if (!hasHydratedStore) {
      pendingPersistValue = value;
      return;
    }
    schedulePersist(value);
  },
  removeItem: async (_name: string): Promise<void> => {
    void _name;
    try {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      // no-op
    }
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      leetcodeUsername: '',
      geminiApiKey: '',
      activeSession: [],
      targetReviewProblems: 4,
      targetNewProblems: 6,
      powerLevels: { ...DEFAULT_POWER_LEVELS },
      sessions: [],
      aiSchedule: null,

      setLeetcodeUsername: (username) => {
        markNextPersistHints({ replaceLeetcodeUsername: true });
        set({ leetcodeUsername: username });
      },
      setGeminiApiKey: (key) => {
        markNextPersistHints({ replaceGeminiApiKey: true });
        set({ geminiApiKey: key });
      },
      setActiveSession: (problems) => {
        markNextPersistHints({ replaceActiveSession: true });
        set({ activeSession: problems });
      },
      setTargetReviewProblems: (count) => {
        markNextPersistHints({ replaceTargets: true });
        set({ targetReviewProblems: count });
      },
      setTargetNewProblems: (count) => {
        markNextPersistHints({ replaceTargets: true });
        set({ targetNewProblems: count });
      },
      setPowerLevel: (tag, level) => {
        markNextPersistHints({ replacePowerLevels: true });
        set((state) => ({
          powerLevels: {
            ...state.powerLevels,
            [tag]: Math.max(0, Math.min(5, Math.round(level))),
          },
        }));
      },
      setPowerLevels: (powerLevels) => {
        markNextPersistHints({ replacePowerLevels: true });
        set(() => ({
          powerLevels: normalizePowerLevels(powerLevels),
        }));
      },
      addSession: (session) =>
        set((state) => ({ sessions: [session, ...state.sessions] })),
      removeSession: (id) => {
        markNextPersistHints({ replaceSessions: true });
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },
      setAISchedule: (schedule) => {
        markNextPersistHints({ replaceSchedule: true });
        set({ aiSchedule: schedule });
      },
      exportData: () => {
        const state = useSessionStore.getState();
        const data = {
          leetcodeUsername: state.leetcodeUsername,
          sessions: state.sessions,
          aiSchedule: state.aiSchedule,
          activeSession: state.activeSession,
          targetReviewProblems: state.targetReviewProblems,
          targetNewProblems: state.targetNewProblems,
          powerLevels: state.powerLevels,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leetmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      importData: (json: string) => {
        try {
          const data = JSON.parse(json);
          markNextPersistHints({
            replaceSessions: true,
            replaceActiveSession: true,
            replaceLeetcodeUsername: true,
            replaceGeminiApiKey: true,
            replaceTargets: true,
            replacePowerLevels: true,
            replaceSchedule: true,
          });
          set({
            leetcodeUsername: data.leetcodeUsername || '',
            sessions: data.sessions || [],
            aiSchedule: data.aiSchedule || null,
            activeSession: data.activeSession || [],
            targetReviewProblems: data.targetReviewProblems ?? 4,
            targetNewProblems: data.targetNewProblems ?? 6,
            powerLevels: normalizePowerLevels(data.powerLevels),
          });
        } catch (e) {
          console.error('Failed to import data:', e);
        }
      },
    }),
    {
      name: 'leetmentor-storage',
      storage: createJSONStorage(() => fileStorage),
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as PersistedSessionState;
        return {
          leetcodeUsername:
            typeof state.leetcodeUsername === 'string' ? state.leetcodeUsername : '',
          geminiApiKey:
            typeof state.geminiApiKey === 'string' ? state.geminiApiKey : '',
          sessions: Array.isArray(state.sessions) ? state.sessions : [],
          aiSchedule: state.aiSchedule ?? null,
          activeSession: Array.isArray(state.activeSession) ? state.activeSession : [],
          targetReviewProblems:
            typeof state.targetReviewProblems === 'number'
              ? state.targetReviewProblems
              : 4,
          targetNewProblems:
            typeof state.targetNewProblems === 'number'
              ? state.targetNewProblems
              : 6,
          powerLevels: normalizePowerLevels(state.powerLevels),
        };
      },
      onRehydrateStorage: () => {
        return () => {
          hasHydratedStore = true;
          if (pendingPersistValue) {
            schedulePersist(pendingPersistValue);
            pendingPersistValue = null;
          }
        };
      },
    }
  )
);
