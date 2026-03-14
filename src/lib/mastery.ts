// Smart Learning System - Mastery Ledger
// Deterministic breadth-first mastery engine backed by server-side JSON.

export interface MasteryEntry {
  id: string;
  name: string;
  tags: string[];
  nextReviewDate: string;
  currentInterval: number;
  lastScore: number;
  totalReviews: number;
  lastReviewedAt: string;
  lastReviewedSession: number;
  nextReviewSession: number;
}

export type ConfidenceScore = 1 | 2 | 3 | 4;

export interface CanonicalProblem {
  id: string;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface SessionHistoryProblemInput {
  id?: string;
  problemNameOrUrl: string;
  score?: number;
}

export interface SessionHistoryInput {
  id: string;
  date: string;
  problems: SessionHistoryProblemInput[];
}

export type CanonicalTag =
  | "Array"
  | "String"
  | "Two Pointers"
  | "Sliding Window"
  | "Linked List"
  | "Trees"
  | "Graphs"
  | "DFS/BFS"
  | "Dynamic Programming"
  | "Binary Search"
  | "Heap"
  | "Stack"
  | "Trie"
  | "Backtracking"
  | "Greedy";

export const CANONICAL_TAGS: CanonicalTag[] = [
  "Array",
  "String",
  "Two Pointers",
  "Sliding Window",
  "Linked List",
  "Trees",
  "Graphs",
  "DFS/BFS",
  "Dynamic Programming",
  "Binary Search",
  "Heap",
  "Stack",
  "Trie",
  "Backtracking",
  "Greedy",
];

export const SCORE_LABELS: Record<
  ConfidenceScore,
  { label: string; emoji: string; color: string }
> = {
  1: {
    label: "Bad",
    emoji: "😵",
    color:
      "text-red-500 bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
  },
  2: {
    label: "Shaky",
    emoji: "😰",
    color:
      "text-lc-medium bg-lc-medium/10 border-lc-medium/30 hover:bg-lc-medium/20",
  },
  3: {
    label: "Good",
    emoji: "😊",
    color:
      "text-lc-easy bg-lc-easy/10 border-lc-easy/30 hover:bg-lc-easy/20",
  },
  4: {
    label: "Perfect",
    emoji: "🔥",
    color:
      "text-lc-brand bg-lc-brand/10 border-lc-brand/30 hover:bg-lc-brand/20",
  },
};

export const POPULAR_PROBLEMS_BY_TAG: Record<CanonicalTag, CanonicalProblem[]> = {
  Array: [
    { id: "two-sum", name: "Two Sum", difficulty: "Easy" },
    {
      id: "best-time-to-buy-and-sell-stock",
      name: "Best Time to Buy and Sell Stock",
      difficulty: "Easy",
    },
    {
      id: "product-of-array-except-self",
      name: "Product of Array Except Self",
      difficulty: "Medium",
    },
    { id: "maximum-subarray", name: "Maximum Subarray", difficulty: "Medium" },
    { id: "merge-intervals", name: "Merge Intervals", difficulty: "Medium" },
  ],
  String: [
    { id: "valid-anagram", name: "Valid Anagram", difficulty: "Easy" },
    { id: "valid-palindrome", name: "Valid Palindrome", difficulty: "Easy" },
    { id: "group-anagrams", name: "Group Anagrams", difficulty: "Medium" },
    {
      id: "longest-substring-without-repeating-characters",
      name: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
    },
    { id: "valid-parentheses", name: "Valid Parentheses", difficulty: "Easy" },
  ],
  "Two Pointers": [
    { id: "3sum", name: "3Sum", difficulty: "Medium" },
    {
      id: "container-with-most-water",
      name: "Container With Most Water",
      difficulty: "Medium",
    },
    {
      id: "trapping-rain-water",
      name: "Trapping Rain Water",
      difficulty: "Hard",
    },
    {
      id: "remove-duplicates-from-sorted-array",
      name: "Remove Duplicates from Sorted Array",
      difficulty: "Easy",
    },
    { id: "two-sum-ii-input-array-is-sorted", name: "Two Sum II - Input Array Is Sorted", difficulty: "Medium" },
  ],
  "Sliding Window": [
    {
      id: "longest-substring-without-repeating-characters",
      name: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
    },
    {
      id: "longest-repeating-character-replacement",
      name: "Longest Repeating Character Replacement",
      difficulty: "Medium",
    },
    {
      id: "minimum-window-substring",
      name: "Minimum Window Substring",
      difficulty: "Hard",
    },
    {
      id: "permutation-in-string",
      name: "Permutation in String",
      difficulty: "Medium",
    },
    {
      id: "sliding-window-maximum",
      name: "Sliding Window Maximum",
      difficulty: "Hard",
    },
  ],
  "Linked List": [
    {
      id: "reverse-linked-list",
      name: "Reverse Linked List",
      difficulty: "Easy",
    },
    {
      id: "linked-list-cycle",
      name: "Linked List Cycle",
      difficulty: "Easy",
    },
    {
      id: "merge-two-sorted-lists",
      name: "Merge Two Sorted Lists",
      difficulty: "Easy",
    },
    {
      id: "remove-nth-node-from-end-of-list",
      name: "Remove Nth Node From End of List",
      difficulty: "Medium",
    },
    { id: "lru-cache", name: "LRU Cache", difficulty: "Medium" },
  ],
  Trees: [
    {
      id: "invert-binary-tree",
      name: "Invert Binary Tree",
      difficulty: "Easy",
    },
    {
      id: "maximum-depth-of-binary-tree",
      name: "Maximum Depth of Binary Tree",
      difficulty: "Easy",
    },
    { id: "same-tree", name: "Same Tree", difficulty: "Easy" },
    {
      id: "binary-tree-level-order-traversal",
      name: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
    },
    {
      id: "validate-binary-search-tree",
      name: "Validate Binary Search Tree",
      difficulty: "Medium",
    },
  ],
  Graphs: [
    { id: "number-of-islands", name: "Number of Islands", difficulty: "Medium" },
    { id: "clone-graph", name: "Clone Graph", difficulty: "Medium" },
    { id: "course-schedule", name: "Course Schedule", difficulty: "Medium" },
    {
      id: "pacific-atlantic-water-flow",
      name: "Pacific Atlantic Water Flow",
      difficulty: "Medium",
    },
    {
      id: "number-of-connected-components-in-an-undirected-graph",
      name: "Number of Connected Components in an Undirected Graph",
      difficulty: "Medium",
    },
  ],
  "DFS/BFS": [
    { id: "word-search", name: "Word Search", difficulty: "Medium" },
    {
      id: "binary-tree-zigzag-level-order-traversal",
      name: "Binary Tree Zigzag Level Order Traversal",
      difficulty: "Medium",
    },
    { id: "rotting-oranges", name: "Rotting Oranges", difficulty: "Medium" },
    {
      id: "walls-and-gates",
      name: "Walls and Gates",
      difficulty: "Medium",
    },
    { id: "word-ladder", name: "Word Ladder", difficulty: "Hard" },
  ],
  "Dynamic Programming": [
    { id: "climbing-stairs", name: "Climbing Stairs", difficulty: "Easy" },
    { id: "house-robber", name: "House Robber", difficulty: "Medium" },
    { id: "coin-change", name: "Coin Change", difficulty: "Medium" },
    {
      id: "longest-increasing-subsequence",
      name: "Longest Increasing Subsequence",
      difficulty: "Medium",
    },
    { id: "word-break", name: "Word Break", difficulty: "Medium" },
  ],
  "Binary Search": [
    {
      id: "binary-search",
      name: "Binary Search",
      difficulty: "Easy",
    },
    {
      id: "search-in-rotated-sorted-array",
      name: "Search in Rotated Sorted Array",
      difficulty: "Medium",
    },
    {
      id: "find-minimum-in-rotated-sorted-array",
      name: "Find Minimum in Rotated Sorted Array",
      difficulty: "Medium",
    },
    {
      id: "search-a-2d-matrix",
      name: "Search a 2D Matrix",
      difficulty: "Medium",
    },
    {
      id: "koko-eating-bananas",
      name: "Koko Eating Bananas",
      difficulty: "Medium",
    },
  ],
  Heap: [
    {
      id: "kth-largest-element-in-an-array",
      name: "Kth Largest Element in an Array",
      difficulty: "Medium",
    },
    {
      id: "top-k-frequent-elements",
      name: "Top K Frequent Elements",
      difficulty: "Medium",
    },
    {
      id: "task-scheduler",
      name: "Task Scheduler",
      difficulty: "Medium",
    },
    {
      id: "find-median-from-data-stream",
      name: "Find Median from Data Stream",
      difficulty: "Hard",
    },
    {
      id: "merge-k-sorted-lists",
      name: "Merge K Sorted Lists",
      difficulty: "Hard",
    },
  ],
  Stack: [
    {
      id: "generate-parentheses",
      name: "Generate Parentheses",
      difficulty: "Medium",
    },
    { id: "min-stack", name: "Min Stack", difficulty: "Medium" },
    {
      id: "daily-temperatures",
      name: "Daily Temperatures",
      difficulty: "Medium",
    },
    {
      id: "evaluate-reverse-polish-notation",
      name: "Evaluate Reverse Polish Notation",
      difficulty: "Medium",
    },
    {
      id: "largest-rectangle-in-histogram",
      name: "Largest Rectangle in Histogram",
      difficulty: "Hard",
    },
  ],
  Trie: [
    { id: "implement-trie-prefix-tree", name: "Implement Trie (Prefix Tree)", difficulty: "Medium" },
    {
      id: "design-add-and-search-words-data-structure",
      name: "Design Add and Search Words Data Structure",
      difficulty: "Medium",
    },
    { id: "word-search-ii", name: "Word Search II", difficulty: "Hard" },
    {
      id: "replace-words",
      name: "Replace Words",
      difficulty: "Medium",
    },
    {
      id: "implement-magic-dictionary",
      name: "Implement Magic Dictionary",
      difficulty: "Medium",
    },
  ],
  Backtracking: [
    { id: "subsets", name: "Subsets", difficulty: "Medium" },
    { id: "permutations", name: "Permutations", difficulty: "Medium" },
    { id: "combination-sum", name: "Combination Sum", difficulty: "Medium" },
    { id: "n-queens", name: "N-Queens", difficulty: "Hard" },
    {
      id: "palindrome-partitioning",
      name: "Palindrome Partitioning",
      difficulty: "Medium",
    },
  ],
  Greedy: [
    { id: "jump-game", name: "Jump Game", difficulty: "Medium" },
    { id: "gas-station", name: "Gas Station", difficulty: "Medium" },
    {
      id: "partition-labels",
      name: "Partition Labels",
      difficulty: "Medium",
    },
    {
      id: "hand-of-straights",
      name: "Hand of Straights",
      difficulty: "Medium",
    },
    {
      id: "merge-triplets-to-form-target-triplet",
      name: "Merge Triplets to Form Target Triplet",
      difficulty: "Medium",
    },
  ],
};

export interface TagCoverage {
  tag: CanonicalTag;
  solved: number;
  total: number;
  avgScore: number;
  solvedProblems: CanonicalProblem[];
  unsolvedProblems: CanonicalProblem[];
}

export interface SystemState {
  tagMastery: Record<string, number>;
  weakestTags: { tag: string; avgScore: number; solved: number; total: number }[];
  dueProblems: {
    id: string;
    name: string;
    score: number;
    sessionsOverdue: number;
    sessionsSinceReview: number;
    interval: number;
  }[];
  shakyProblems: {
    id: string;
    name: string;
    score: number;
    sessionsUntilDue: number;
    sessionsSinceReview: number;
    urgency: number;
  }[];
  solvedSlugs: string[];
  tagCoverage: TagCoverage[];
}

const REVIEW_BASE_INTERVALS: Record<ConfidenceScore, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
};

const REVIEW_MAX_INTERVALS: Record<ConfidenceScore, number> = {
  1: 2,
  2: 6,
  3: 14,
  4: 24,
};

const REVIEW_GROWTH: Record<ConfidenceScore, number> = {
  1: 1,
  2: 1.15,
  3: 1.7,
  4: 2.2,
};

const PROBLEM_ID_ALIASES: Record<string, string> = {
  "three-sum": "3sum",
};

const CANONICAL_PROBLEM_TAGS = new Map<string, CanonicalTag[]>();
for (const [tag, problems] of Object.entries(
  POPULAR_PROBLEMS_BY_TAG
) as [CanonicalTag, CanonicalProblem[]][]) {
  for (const problem of problems) {
    const existing = CANONICAL_PROBLEM_TAGS.get(problem.id) || [];
    CANONICAL_PROBLEM_TAGS.set(problem.id, [...new Set([...existing, tag])]);
  }
}

const CANONICAL_PROBLEM_BY_ID = new Map<string, CanonicalProblem>();
for (const problems of Object.values(POPULAR_PROBLEMS_BY_TAG)) {
  for (const problem of problems) {
    if (!CANONICAL_PROBLEM_BY_ID.has(problem.id)) {
      CANONICAL_PROBLEM_BY_ID.set(problem.id, problem);
    }
  }
}

const TAG_ALIASES: Record<string, CanonicalTag> = {
  array: "Array",
  arrays: "Array",
  string: "String",
  strings: "String",
  "two pointers": "Two Pointers",
  "two-pointer": "Two Pointers",
  "sliding window": "Sliding Window",
  "linked list": "Linked List",
  "linked lists": "Linked List",
  tree: "Trees",
  trees: "Trees",
  "binary tree": "Trees",
  "binary search tree": "Trees",
  bst: "Trees",
  graph: "Graphs",
  graphs: "Graphs",
  "dfs/bfs": "DFS/BFS",
  dfs: "DFS/BFS",
  bfs: "DFS/BFS",
  "breadth-first search": "DFS/BFS",
  "depth-first search": "DFS/BFS",
  dp: "Dynamic Programming",
  "dynamic programming": "Dynamic Programming",
  "binary search": "Binary Search",
  heap: "Heap",
  "priority queue": "Heap",
  "heap/priority queue": "Heap",
  stack: "Stack",
  trie: "Trie",
  backtracking: "Backtracking",
  greedy: "Greedy",
};

let _cache: MasteryEntry[] = [];
let _initialized = false;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function toLocalDateString(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return getToday();
  }
  return formatLocalDate(date);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getToday(): string {
  return formatLocalDate(new Date());
}

function addDays(dateStr: string, days: number): string {
  const parsed = parseDate(dateStr) || new Date();
  const safe = Math.min(Math.max(Math.round(days), 0), 365);
  parsed.setDate(parsed.getDate() + safe);
  return formatLocalDate(parsed);
}

function diffDays(fromDate: string, toDate: string): number {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (!from || !to) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function clampScore(value: unknown): ConfidenceScore {
  const numeric = Number(value);
  if (numeric <= 1) return 1;
  if (numeric >= 4) return 4;
  if (numeric <= 2) return 2;
  if (numeric <= 3) return 3;
  return 3;
}

export function toProblemId(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  return PROBLEM_ID_ALIASES[normalized] || normalized;
}

function titleFromId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeTag(tag: string): string {
  const cleaned = tag.trim();
  if (!cleaned) return "";

  const alias = TAG_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeTags(tags: string[], problemId?: string): string[] {
  const canonicalTags = problemId ? CANONICAL_PROBLEM_TAGS.get(problemId) || [] : [];
  const incoming = Array.isArray(tags) ? tags : [];

  return [...new Set([...canonicalTags, ...incoming.map(normalizeTag).filter(Boolean)])];
}

function computeNextInterval(
  score: ConfidenceScore,
  currentInterval: number,
  daysSinceLastReview: number
): number {
  const baseline = REVIEW_BASE_INTERVALS[score];
  const maxInterval = REVIEW_MAX_INTERVALS[score];

  if (score === 1) return baseline;
  if (score === 2) return Math.min(maxInterval, Math.max(baseline, 2));

  const anchor = Math.max(currentInterval || baseline, daysSinceLastReview || baseline);
  const grown = Math.round(anchor * REVIEW_GROWTH[score]);
  return Math.min(maxInterval, Math.max(baseline, grown));
}

function migrateEntry(
  raw: unknown,
  today: string
): { entry: MasteryEntry | null; changed: boolean } {
  if (!raw || (typeof raw !== "object" && typeof raw !== "function")) {
    return { entry: null, changed: true };
  }

  const source = raw as Record<string, unknown>;

  const rawId = typeof source.id === "string" ? source.id : "";
  const rawName = typeof source.name === "string" ? source.name : "";
  const canonicalId = toProblemId(rawId || rawName || "unknown");
  const canonicalProblem = CANONICAL_PROBLEM_BY_ID.get(canonicalId);

  const name =
    canonicalProblem?.name ||
    rawName ||
    (rawId ? titleFromId(toProblemId(rawId)) : "Unknown Problem");

  const score = clampScore(source.lastScore ?? source.score);

  const nextReviewDate = formatLocalDate(
    parseDate(typeof source.nextReviewDate === "string" ? source.nextReviewDate : null) ||
      parseDate(today) ||
      new Date()
  );

  const currentInterval = Math.min(
    28,
    Math.max(1, Math.round(Number(source.currentInterval) || REVIEW_BASE_INTERVALS[score]))
  );

  const inferredLastReviewedAt = addDays(nextReviewDate, -currentInterval);
  const lastReviewedAt = formatLocalDate(
    parseDate(typeof source.lastReviewedAt === "string" ? source.lastReviewedAt : null) ||
      parseDate(inferredLastReviewedAt) ||
      parseDate(today) ||
      new Date()
  );

  const tags = normalizeTags(
    Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    canonicalId
  );
  const totalReviews = Math.max(1, Math.round(Number(source.totalReviews) || 1));
  const lastReviewedSession = Math.max(
    0,
    Math.round(Number(source.lastReviewedSession) || 0)
  );
  const nextReviewSession = Math.max(
    lastReviewedSession + 1,
    Math.round(
      Number(source.nextReviewSession) ||
        lastReviewedSession + currentInterval
    )
  );

  const entry: MasteryEntry = {
    id: canonicalId,
    name,
    tags,
    nextReviewDate,
    currentInterval,
    lastScore: score,
    totalReviews,
    lastReviewedAt,
    lastReviewedSession,
    nextReviewSession,
  };

  const changed =
    source.id !== entry.id ||
    source.name !== entry.name ||
    JSON.stringify(source.tags || []) !== JSON.stringify(entry.tags) ||
    source.nextReviewDate !== entry.nextReviewDate ||
    source.currentInterval !== entry.currentInterval ||
    source.lastScore !== entry.lastScore ||
    source.totalReviews !== entry.totalReviews ||
    source.lastReviewedAt !== entry.lastReviewedAt ||
    source.lastReviewedSession !== entry.lastReviewedSession ||
    source.nextReviewSession !== entry.nextReviewSession;

  return { entry, changed };
}

function mergeEntries(existing: MasteryEntry, incoming: MasteryEntry): MasteryEntry {
  const existingIsNewer = diffDays(existing.lastReviewedAt, incoming.lastReviewedAt) <= 0;
  const primary = existingIsNewer ? existing : incoming;
  const secondary = existingIsNewer ? incoming : existing;

  return {
    ...primary,
    name: CANONICAL_PROBLEM_BY_ID.get(primary.id)?.name || primary.name || secondary.name,
    tags: [...new Set([...primary.tags, ...secondary.tags])],
    totalReviews: Math.max(primary.totalReviews, secondary.totalReviews),
    currentInterval: Math.max(primary.currentInterval, secondary.currentInterval),
    lastReviewedSession: Math.max(primary.lastReviewedSession, secondary.lastReviewedSession),
    nextReviewSession: Math.max(primary.nextReviewSession, secondary.nextReviewSession),
    nextReviewDate:
      diffDays(primary.nextReviewDate, secondary.nextReviewDate) <= 0
        ? primary.nextReviewDate
        : secondary.nextReviewDate,
  };
}

function migrateLedger(entries: unknown[]): { entries: MasteryEntry[]; changed: boolean } {
  const today = getToday();
  let changed = false;
  const byId = new Map<string, MasteryEntry>();

  for (const raw of Array.isArray(entries) ? entries : []) {
    const result = migrateEntry(raw, today);
    changed = changed || result.changed;

    if (!result.entry) continue;

    const existing = byId.get(result.entry.id);
    if (existing) {
      byId.set(result.entry.id, mergeEntries(existing, result.entry));
      changed = true;
    } else {
      byId.set(result.entry.id, result.entry);
    }
  }

  return { entries: Array.from(byId.values()), changed };
}

function saveLedger(entries: MasteryEntry[]): void {
  _cache = entries;
  fetch("/api/mastery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  }).catch(() => {
    // Keep the in-memory cache authoritative for the current session.
  });
}

export async function initMastery(): Promise<void> {
  if (_initialized) return;

  try {
    const res = await fetch("/api/mastery");
    if (res.ok) {
      const data = await res.json();
      const migrated = migrateLedger(Array.isArray(data) ? data : []);
      _cache = migrated.entries;

      if (migrated.changed) {
        saveLedger(migrated.entries);
      }
    }
  } catch {
    _cache = [];
  }

  _initialized = true;
}

export function getLedger(): MasteryEntry[] {
  return _cache;
}

export function getEntry(problemName: string): MasteryEntry | undefined {
  const id = toProblemId(problemName);
  return _cache.find((entry) => entry.id === id);
}

export function setEntryTags(id: string, tags: string[]): MasteryEntry | undefined {
  const normalizedId = toProblemId(id);
  const entry = _cache.find((item) => item.id === normalizedId);
  if (!entry) return undefined;

  entry.tags = normalizeTags(tags, normalizedId);
  saveLedger([..._cache]);
  return entry;
}

function applyReviewResult(
  ledger: MasteryEntry[],
  id: string,
  name: string,
  score: ConfidenceScore,
  reviewDate: string,
  reviewSessionIndex: number,
  tags: string[] = []
): MasteryEntry {
  const normalizedId = toProblemId(id || name);
  const canonicalProblem = CANONICAL_PROBLEM_BY_ID.get(normalizedId);
  const canonicalName = canonicalProblem?.name || name || titleFromId(normalizedId);

  let entry = ledger.find((item) => item.id === normalizedId);

  if (!entry) {
    entry = {
      id: normalizedId,
      name: canonicalName,
      tags: normalizeTags(tags, normalizedId),
      nextReviewDate: reviewDate,
      currentInterval: 1,
      lastScore: score,
      totalReviews: 0,
      lastReviewedAt: reviewDate,
      lastReviewedSession: Math.max(0, reviewSessionIndex - 1),
      nextReviewSession: reviewSessionIndex,
    };
    ledger.push(entry);
  }

  const sessionsSinceLastReview = Math.max(
    1,
    reviewSessionIndex - (entry.lastReviewedSession || 0)
  );
  const nextInterval = computeNextInterval(
    score,
    entry.currentInterval,
    sessionsSinceLastReview
  );

  entry.name = canonicalName;
  entry.tags = normalizeTags([...entry.tags, ...tags], normalizedId);
  entry.lastScore = score;
  entry.totalReviews += 1;
  entry.currentInterval = nextInterval;
  entry.lastReviewedAt = reviewDate;
  entry.lastReviewedSession = reviewSessionIndex;
  entry.nextReviewSession = reviewSessionIndex + nextInterval;
  entry.nextReviewDate = addDays(reviewDate, nextInterval);

  return entry;
}

export function updateMastery(
  id: string,
  name: string,
  score: ConfidenceScore,
  tags: string[] = [],
  sessionIndex: number = 1
): MasteryEntry {
  const today = getToday();
  const entry = applyReviewResult(_cache, id, name, score, today, sessionIndex, tags);
  saveLedger([..._cache]);
  return entry;
}

export async function rebuildMasteryFromSessions(
  sessions: SessionHistoryInput[]
): Promise<MasteryEntry[]> {
  const rebuilt: MasteryEntry[] = [];
  const orderedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  orderedSessions.forEach((session, index) => {
    const reviewDate = formatLocalDate(parseDate(session.date) || new Date());
    const reviewSessionIndex = index + 1;

    for (const problem of session.problems) {
      const normalizedId = toProblemId(problem.id || problem.problemNameOrUrl);
      const canonicalProblem = CANONICAL_PROBLEM_BY_ID.get(normalizedId);
      const score = clampScore(problem.score ?? 3);
      applyReviewResult(
        rebuilt,
        canonicalProblem?.id || normalizedId,
        canonicalProblem?.name || problem.problemNameOrUrl,
        score,
        reviewDate,
        reviewSessionIndex,
        canonicalProblem ? CANONICAL_PROBLEM_TAGS.get(canonicalProblem.id) || [] : []
      );
    }
  });

  saveLedger(rebuilt);
  return rebuilt;
}

function getReviewUrgency(entry: MasteryEntry, completedSessions: number): number {
  const sessionsSinceReview = Math.max(
    0,
    completedSessions - entry.lastReviewedSession
  );
  const interval = Math.max(1, entry.currentInterval || REVIEW_BASE_INTERVALS[clampScore(entry.lastScore)]);
  const timePressure = sessionsSinceReview / interval;
  const scorePressure = (5 - clampScore(entry.lastScore)) * 0.7;
  return timePressure + scorePressure;
}

export function getDueProblems(completedSessions: number = 0): MasteryEntry[] {
  return [..._cache]
    .filter((entry) => completedSessions >= entry.nextReviewSession)
    .sort((a, b) => getReviewUrgency(b, completedSessions) - getReviewUrgency(a, completedSessions));
}

export function getTagCoverage(): TagCoverage[] {
  const ledgerById = new Map(_cache.map((entry) => [entry.id, entry]));

  return CANONICAL_TAGS.map((tag) => {
    const problems = POPULAR_PROBLEMS_BY_TAG[tag];
    const solvedProblems: CanonicalProblem[] = [];
    const unsolvedProblems: CanonicalProblem[] = [];
    const scores: number[] = [];

    for (const problem of problems) {
      const solved = ledgerById.get(problem.id);
      if (solved) {
        solvedProblems.push(problem);
        scores.push(solved.lastScore);
      } else {
        unsolvedProblems.push(problem);
      }
    }

    return {
      tag,
      solved: solvedProblems.length,
      total: problems.length,
      avgScore:
        scores.length > 0
          ? scores.reduce((sum, value) => sum + value, 0) / scores.length
          : 0,
      solvedProblems,
      unsolvedProblems,
    };
  });
}

export function getWeakestTopics(
  topN: number = 3
): { tag: string; avgScore: number; solved: number; total: number }[] {
  return getTagCoverage()
    .sort((a, b) => {
      if (a.solved !== b.solved) return a.solved - b.solved;
      if (a.avgScore !== b.avgScore) return a.avgScore - b.avgScore;
      return a.tag.localeCompare(b.tag);
    })
    .slice(0, topN)
    .map((topic) => ({
      tag: topic.tag,
      avgScore: topic.avgScore,
      solved: topic.solved,
      total: topic.total,
    }));
}

export function getAllTopicStats(): {
  tag: string;
  avgScore: number;
  count: number;
  total: number;
  progress: number;
}[] {
  return getTagCoverage().map((coverage) => ({
    tag: coverage.tag,
    avgScore: coverage.avgScore,
    count: coverage.solved,
    total: coverage.total,
    progress: coverage.total === 0 ? 0 : coverage.solved / coverage.total,
  }));
}

export function getMasteryStats() {
  const due = getDueProblems();
  const weakTopics = getWeakestTopics();

  return {
    totalTracked: _cache.length,
    dueCount: due.length,
    dueProblems: due,
    weakTopics,
    ledger: _cache,
  };
}

export function getSystemState(completedSessions: number = 0): SystemState {
  const tagCoverage = getTagCoverage();

  const tagMastery: Record<string, number> = {};
  for (const coverage of tagCoverage) {
    tagMastery[coverage.tag] = coverage.avgScore;
  }

  const dueProblems = getDueProblems(completedSessions).map((entry) => ({
    id: entry.id,
    name: entry.name,
    score: entry.lastScore,
    sessionsOverdue: Math.max(0, completedSessions - entry.nextReviewSession),
    sessionsSinceReview: Math.max(0, completedSessions - entry.lastReviewedSession),
    interval: entry.currentInterval,
  }));

  const shakyProblems = [..._cache]
    .filter((entry) => entry.lastScore <= 2)
    .map((entry) => {
      const sessionsSinceReview = Math.max(
        0,
        completedSessions - entry.lastReviewedSession
      );
      const targetInterval = REVIEW_BASE_INTERVALS[clampScore(entry.lastScore)];
      const urgency =
        (sessionsSinceReview / Math.max(1, targetInterval)) +
        (3 - clampScore(entry.lastScore)) * 0.8;

      return {
        id: entry.id,
        name: entry.name,
        score: entry.lastScore,
        sessionsUntilDue: Math.max(0, entry.nextReviewSession - completedSessions),
        sessionsSinceReview,
        urgency,
      };
    })
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 5);

  const weakestTags = getWeakestTopics(3);
  const solvedSlugs = _cache.map((entry) => entry.id);

  return { tagMastery, weakestTags, dueProblems, shakyProblems, solvedSlugs, tagCoverage };
}
