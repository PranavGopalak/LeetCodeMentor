import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { CANONICAL_TAGS, type CanonicalTag } from '@/lib/mastery';

const DATA_DIR = path.join(process.cwd(), 'data', 'store');
const META_FILE = path.join(DATA_DIR, 'meta.json');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const ACTIVE_SESSION_FILE = path.join(DATA_DIR, 'active-session.json');
const LEGACY_FILE = path.join(process.cwd(), 'data', 'store.json');
const LEGACY_ARCHIVE_FILE = path.join(process.cwd(), 'data', 'store.json.legacy');

type JsonObject = Record<string, unknown>;

interface SessionProblemRecord {
  id: string;
  problemNameOrUrl: string;
  timeTaken?: number;
  comments?: string;
  score?: number;
}

interface SessionRecord {
  id: string;
  date: string;
  problems: SessionProblemRecord[];
}

interface PersistedStoreState {
  leetcodeUsername: string;
  geminiApiKey: string;
  activeSession: SessionProblemRecord[];
  targetReviewProblems: number;
  targetNewProblems: number;
  powerLevels: Record<CanonicalTag, number>;
  aiSchedule: unknown;
  sessions: SessionRecord[];
}

interface StoreMetaFile {
  schema: 'leetmentor.store.meta.v1';
  version: number;
  state: Omit<PersistedStoreState, 'sessions'>;
}

interface SessionShardFile {
  schema: 'leetmentor.store.sessions.v1';
  date: string;
  sessions: SessionRecord[];
}

interface ActiveSessionFile {
  schema: 'leetmentor.store.active-session.v1';
  activeSession: SessionProblemRecord[];
}

const DEFAULT_STATE: PersistedStoreState = {
  leetcodeUsername: '',
  geminiApiKey: '',
  activeSession: [],
  targetReviewProblems: 4,
  targetNewProblems: 6,
  powerLevels: Object.fromEntries(
    CANONICAL_TAGS.map((tag) => [tag, 2])
  ) as Record<CanonicalTag, number>,
  aiSchedule: null,
  sessions: [],
};

function normalizePowerLevels(raw: unknown): Record<CanonicalTag, number> {
  const source = raw && typeof raw === 'object' ? (raw as JsonObject) : {};
  const normalized = { ...DEFAULT_STATE.powerLevels };

  for (const tag of CANONICAL_TAGS) {
    const value = Number(source[tag]);
    normalized[tag] = Number.isFinite(value)
      ? Math.max(0, Math.min(5, Math.round(value)))
      : DEFAULT_STATE.powerLevels[tag];
  }

  return normalized;
}

function slugifyProblemName(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

function normalizeProblemId(id: unknown, problemNameOrUrl: string): string {
  const fallback = slugifyProblemName(problemNameOrUrl);
  if (typeof id !== 'string' || id.trim().length === 0) {
    return fallback;
  }

  const trimmed = id.trim();
  if (trimmed.toLowerCase() === 'unknown') {
    return fallback;
  }

  // Older seeded data used synthetic ids like p-ts / p-vbst that should not
  // survive into the session-based mastery system.
  if (/^p-[a-z0-9-]+$/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function normalizeSessionProblem(raw: unknown): SessionProblemRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as JsonObject;
  if (typeof source.problemNameOrUrl !== 'string') return null;

  return {
    id: normalizeProblemId(source.id, source.problemNameOrUrl),
    problemNameOrUrl: source.problemNameOrUrl,
    timeTaken: typeof source.timeTaken === 'number' ? source.timeTaken : undefined,
    comments: typeof source.comments === 'string' ? source.comments : undefined,
    score: typeof source.score === 'number' ? source.score : undefined,
  };
}

function normalizeSession(raw: unknown): SessionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as JsonObject;
  if (typeof source.id !== 'string' || typeof source.date !== 'string') return null;

  const problems = Array.isArray(source.problems)
    ? source.problems
        .map(normalizeSessionProblem)
        .filter((problem): problem is SessionProblemRecord => !!problem)
    : [];

  return {
    id: source.id,
    date: source.date,
    problems,
  };
}

function normalizeState(raw: unknown): PersistedStoreState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE };
  const source = raw as JsonObject;

  return {
    leetcodeUsername:
      typeof source.leetcodeUsername === 'string' ? source.leetcodeUsername : '',
    geminiApiKey: typeof source.geminiApiKey === 'string' ? source.geminiApiKey : '',
    activeSession: Array.isArray(source.activeSession)
      ? source.activeSession
          .map(normalizeSessionProblem)
          .filter((problem): problem is SessionProblemRecord => !!problem)
      : [],
    targetReviewProblems:
      typeof source.targetReviewProblems === 'number'
        ? source.targetReviewProblems
        : DEFAULT_STATE.targetReviewProblems,
    targetNewProblems:
      typeof source.targetNewProblems === 'number'
        ? source.targetNewProblems
        : DEFAULT_STATE.targetNewProblems,
    powerLevels: normalizePowerLevels(source.powerLevels),
    aiSchedule: source.aiSchedule ?? null,
    sessions: Array.isArray(source.sessions)
      ? source.sessions
          .map(normalizeSession)
          .filter((session): session is SessionRecord => !!session)
      : [],
  };
}

function getSessionDayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown-day';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getProblemMergeKey(problem: SessionProblemRecord): string {
  const source =
    typeof problem.problemNameOrUrl === 'string' && problem.problemNameOrUrl.trim().length > 0
      ? problem.problemNameOrUrl
      : problem.id;
  return source.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

function mergeSessionsByDay(sessions: SessionRecord[]): SessionRecord[] {
  const dayBuckets = new Map<string, SessionRecord[]>();

  for (const session of sessions) {
    const key = getSessionDayKey(session.date);
    const existing = dayBuckets.get(key) || [];
    existing.push(session);
    dayBuckets.set(key, existing);
  }

  return Array.from(dayBuckets.entries())
    .map(([day, daySessions]) => {
      const sortedSessions = [...daySessions].sort((a, b) => a.date.localeCompare(b.date));
      const mergedProblems = new Map<string, SessionProblemRecord>();

      for (const session of sortedSessions) {
        for (const problem of session.problems) {
          const key = getProblemMergeKey(problem);
          if (mergedProblems.has(key)) {
            mergedProblems.delete(key);
          }
          mergedProblems.set(key, problem);
        }
      }

      const lastSession = sortedSessions[sortedSessions.length - 1];

      return {
        id: `session-${day}`,
        date: lastSession?.date || `${day}T12:00:00.000Z`,
        problems: Array.from(mergedProblems.values()),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function ensureLayout() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(SESSION_DIR, { recursive: true });

  try {
    await fs.access(META_FILE);
  } catch {
    const meta: StoreMetaFile = {
      schema: 'leetmentor.store.meta.v1',
      version: 2,
      state: {
        leetcodeUsername: DEFAULT_STATE.leetcodeUsername,
        geminiApiKey: DEFAULT_STATE.geminiApiKey,
        activeSession: DEFAULT_STATE.activeSession,
        targetReviewProblems: DEFAULT_STATE.targetReviewProblems,
        targetNewProblems: DEFAULT_STATE.targetNewProblems,
        powerLevels: DEFAULT_STATE.powerLevels,
        aiSchedule: DEFAULT_STATE.aiSchedule,
      },
    };
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
  }

  try {
    await fs.access(ACTIVE_SESSION_FILE);
  } catch {
    const activeSession: ActiveSessionFile = {
      schema: 'leetmentor.store.active-session.v1',
      activeSession: DEFAULT_STATE.activeSession,
    };
    await fs.writeFile(ACTIVE_SESSION_FILE, JSON.stringify(activeSession, null, 2), 'utf-8');
  }
}

async function writeState(state: PersistedStoreState): Promise<void> {
  await ensureLayout();

  const meta: StoreMetaFile = {
    schema: 'leetmentor.store.meta.v1',
    version: 2,
    state: {
      leetcodeUsername: state.leetcodeUsername,
      geminiApiKey: state.geminiApiKey,
      activeSession: state.activeSession,
      targetReviewProblems: state.targetReviewProblems,
      targetNewProblems: state.targetNewProblems,
      powerLevels: state.powerLevels,
      aiSchedule: state.aiSchedule,
    },
  };
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
  const activeSession: ActiveSessionFile = {
    schema: 'leetmentor.store.active-session.v1',
    activeSession: state.activeSession,
  };
  await fs.writeFile(ACTIVE_SESSION_FILE, JSON.stringify(activeSession, null, 2), 'utf-8');

  const shards = new Map<string, SessionRecord[]>();
  for (const session of state.sessions) {
    const key = getSessionDayKey(session.date);
    const existing = shards.get(key) || [];
    existing.push(session);
    shards.set(key, existing);
  }

  const existingFiles = await fs.readdir(SESSION_DIR).catch(() => []);
  await Promise.all(
    existingFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => fs.unlink(path.join(SESSION_DIR, file)))
  );

  await Promise.all(
    Array.from(shards.entries()).map(async ([date, sessions]) => {
      const shard: SessionShardFile = {
        schema: 'leetmentor.store.sessions.v1',
        date,
        sessions: sessions.sort((a, b) => b.date.localeCompare(a.date)),
      };
      await fs.writeFile(
        path.join(SESSION_DIR, `${date}.json`),
        JSON.stringify(shard, null, 2),
        'utf-8'
      );
    })
  );
}

async function readMetaState(): Promise<Omit<PersistedStoreState, 'sessions'>> {
  await ensureLayout();
  const raw = await fs.readFile(META_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<StoreMetaFile>;
  return normalizeState(parsed.state).sessions.length === 0
    ? {
        leetcodeUsername: typeof parsed.state?.leetcodeUsername === 'string' ? parsed.state.leetcodeUsername : '',
        geminiApiKey: typeof parsed.state?.geminiApiKey === 'string' ? parsed.state.geminiApiKey : '',
        activeSession: Array.isArray(parsed.state?.activeSession)
          ? parsed.state!.activeSession
              .map(normalizeSessionProblem)
              .filter((problem): problem is SessionProblemRecord => !!problem)
          : [],
        targetReviewProblems:
          typeof parsed.state?.targetReviewProblems === 'number'
            ? parsed.state.targetReviewProblems
            : DEFAULT_STATE.targetReviewProblems,
        targetNewProblems:
          typeof parsed.state?.targetNewProblems === 'number'
            ? parsed.state.targetNewProblems
            : DEFAULT_STATE.targetNewProblems,
        powerLevels: normalizePowerLevels(parsed.state?.powerLevels),
        aiSchedule: parsed.state?.aiSchedule ?? null,
      }
    : {
        leetcodeUsername: DEFAULT_STATE.leetcodeUsername,
        geminiApiKey: DEFAULT_STATE.geminiApiKey,
        activeSession: DEFAULT_STATE.activeSession,
        targetReviewProblems: DEFAULT_STATE.targetReviewProblems,
        targetNewProblems: DEFAULT_STATE.targetNewProblems,
        powerLevels: DEFAULT_STATE.powerLevels,
        aiSchedule: DEFAULT_STATE.aiSchedule,
      };
}

async function readActiveSession(): Promise<SessionProblemRecord[]> {
  await ensureLayout();

  try {
    const raw = await fs.readFile(ACTIVE_SESSION_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ActiveSessionFile>;
    if (!Array.isArray(parsed.activeSession)) {
      return [];
    }

    return parsed.activeSession
      .map(normalizeSessionProblem)
      .filter((problem): problem is SessionProblemRecord => !!problem);
  } catch {
    return [];
  }
}

async function readSessionShards(): Promise<SessionRecord[]> {
  await ensureLayout();
  const files = await fs.readdir(SESSION_DIR).catch(() => []);
  const sessions: SessionRecord[] = [];

  for (const file of files.filter((entry) => entry.endsWith('.json'))) {
    const raw = await fs.readFile(path.join(SESSION_DIR, file), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SessionShardFile>;
    if (!Array.isArray(parsed.sessions)) continue;

    for (const session of parsed.sessions) {
      const normalized = normalizeSession(session);
      if (normalized) sessions.push(normalized);
    }
  }

  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

async function migrateLegacyStore(): Promise<void> {
  await ensureLayout();
  const existingShards = await fs.readdir(SESSION_DIR).catch(() => []);
  if (existingShards.some((file) => file.endsWith('.json'))) {
    return;
  }

  let sourceFile: string | null = null;
  try {
    await fs.access(LEGACY_FILE);
    sourceFile = LEGACY_FILE;
  } catch {
    try {
      await fs.access(LEGACY_ARCHIVE_FILE);
      sourceFile = LEGACY_ARCHIVE_FILE;
    } catch {
      return;
    }
  }

  const raw = await fs.readFile(sourceFile, 'utf-8');
  const parsed = JSON.parse(raw) as JsonObject;
  const state = normalizeState((parsed.state as JsonObject | undefined) ?? parsed);
  const mergedState: PersistedStoreState = {
    ...state,
    sessions: mergeSessionsByDay(state.sessions),
  };
  await writeState(mergedState);

  if (sourceFile === LEGACY_FILE) {
    await fs.rename(LEGACY_FILE, LEGACY_ARCHIVE_FILE).catch(async () => {
      await fs.unlink(LEGACY_FILE).catch(() => {});
    });
  }
}

async function readState(): Promise<PersistedStoreState> {
  await migrateLegacyStore();
  const metaState = await readMetaState();
  const sessions = await readSessionShards();
  const activeSession = await readActiveSession();

  return {
    ...metaState,
    activeSession,
    sessions,
  };
}

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json({ state, version: 2 });
  } catch {
    return NextResponse.json({ state: DEFAULT_STATE, version: 2 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JsonObject;
    const state = normalizeState((body.state as JsonObject | undefined) ?? body);
    await writeState(state);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save store data' },
      { status: 500 }
    );
  }
}
