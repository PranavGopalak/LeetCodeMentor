import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  StudySession,
  ProblemLog,
  AISchedule,
  ScheduledProblem,
  DEFAULT_POWER_LEVELS,
  type TagPowerLevels,
} from "@/store/useSessionStore";
import {
  CANONICAL_TAGS,
  getLedger,
  getSystemState,
  POPULAR_PROBLEMS_BY_TAG,
  toProblemId,
  type CanonicalProblem,
} from "@/lib/mastery";

export type GenerateOneType = "review" | "recommended" | "challenge";

export interface GradedProblem {
  sessionId?: string;
  id: string;
  name: string;
  score: 1 | 2 | 3 | 4;
  tags: string[];
}

function getModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
}

function parseJson(text: string): unknown {
  const jsonString = text.replace(/```json\n?|\n?```/gi, "").trim();
  return JSON.parse(jsonString);
}

function normalizeProblem(problem: CanonicalProblem, tags: string[] = []): ScheduledProblem {
  return {
    id: problem.id,
    name: problem.name,
    difficulty: problem.difficulty,
    tags,
  };
}

const CANONICAL_PROBLEM_LOOKUP = new Map<
  string,
  { problem: CanonicalProblem; tags: string[] }
>();

for (const [tag, problems] of Object.entries(POPULAR_PROBLEMS_BY_TAG)) {
  for (const problem of problems) {
    const existing = CANONICAL_PROBLEM_LOOKUP.get(problem.id);
    if (existing) {
      existing.tags = [...new Set([...existing.tags, tag])];
      continue;
    }

    CANONICAL_PROBLEM_LOOKUP.set(problem.id, {
      problem,
      tags: [tag],
    });
  }
}

function flattenCanonicalProblems(): CanonicalProblem[] {
  return Array.from(CANONICAL_PROBLEM_LOOKUP.values()).map((entry) => entry.problem);
}

function getAttemptedIds(sessions: StudySession[]): Set<string> {
  const attempted = new Set<string>();
  for (const session of sessions) {
    for (const problem of session.problems) {
      attempted.add(toProblemId(problem.id || problem.problemNameOrUrl));
    }
  }
  return attempted;
}

function getScheduledIds(schedule: AISchedule | null): Set<string> {
  const ids = new Set<string>();
  if (!schedule) return ids;

  for (const problem of schedule.reviewProblems) {
    ids.add(problem.id || toProblemId(problem.name));
  }
  for (const problem of schedule.newProblems) {
    ids.add(problem.id || toProblemId(problem.name));
  }
  if (schedule.challengeProblem) {
    ids.add(schedule.challengeProblem.id || toProblemId(schedule.challengeProblem.name));
  }

  return ids;
}

function getPowerLevelBias(level: number): number {
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  return [-3, -1.5, 0, 1.5, 3, 5][clamped];
}

function getProblemFocusBias(tags: string[], powerLevels: TagPowerLevels): number {
  if (!tags || tags.length === 0) return 0;
  return Math.max(
    ...tags.map((tag) => getPowerLevelBias(powerLevels[tag as keyof TagPowerLevels] ?? 2))
  );
}

function getFocusedTags(powerLevels: TagPowerLevels): string[] {
  return CANONICAL_TAGS.filter((tag) => (powerLevels[tag] ?? 2) >= 4);
}

async function curateFoundationOrderWithPowerLevels(
  apiKey: string,
  newProblems: ScheduledProblem[],
  powerLevels: TagPowerLevels
): Promise<ScheduledProblem[]> {
  if (!apiKey || newProblems.length <= 1) {
    return newProblems;
  }

  try {
    const model = getModel(apiKey);
    const result = await model.generateContent(`
      You are curating a LeetCode foundation schedule.

      The hard constraints have already been enforced in code. Your only job is to reorder the candidate problems
      so the list feels intentionally focused around the user's strongest Power Level preferences.

      Power Levels:
      ${JSON.stringify(powerLevels)}

      Candidate problems:
      ${JSON.stringify(
        newProblems.map((problem) => ({
          id: problem.id,
          name: problem.name,
          tags: problem.tags || [],
          difficulty: problem.difficulty,
        }))
      )}

      Rules:
      1. Return only ids from the candidate list.
      2. Return each id once.
      3. Favor higher Power Level tags first.
      4. Keep some variety; don't cluster the same pattern too heavily if avoidable.

      Return ONLY JSON in this format:
      { "ordered_ids": ["id-1", "id-2"] }
    `);

    const parsed = parseJson(result.response.text()) as
      | { ordered_ids?: unknown }
      | unknown[];
    const orderedIds = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { ordered_ids?: unknown })?.ordered_ids)
      ? (parsed as { ordered_ids: unknown[] }).ordered_ids
      : [];

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return newProblems;
    }

    const byId = new Map(newProblems.map((problem) => [problem.id, problem]));
    const reordered: ScheduledProblem[] = [];
    const usedIds = new Set<string>();

    for (const rawId of orderedIds) {
      if (typeof rawId !== "string") continue;
      const match = byId.get(rawId);
      if (!match || usedIds.has(rawId)) continue;
      reordered.push(match);
      usedIds.add(rawId);
    }

    for (const problem of newProblems) {
      if (!usedIds.has(problem.id)) {
        reordered.push(problem);
      }
    }

    return reordered;
  } catch {
    return newProblems;
  }
}

function selectReviewProblems(
  targetReview: number,
  existingIds: Set<string>,
  completedSessions: number,
  powerLevels: TagPowerLevels
): ScheduledProblem[] {
  const state = getSystemState(completedSessions);
  const ledgerById = new Map(getLedger().map((entry) => [entry.id, entry]));
  const selected: ScheduledProblem[] = [];
  const selectedIds = new Set(existingIds);
  const dueCandidates = [...state.dueProblems].sort((a, b) => {
    const aCanonical = CANONICAL_PROBLEM_LOOKUP.get(a.id);
    const bCanonical = CANONICAL_PROBLEM_LOOKUP.get(b.id);
    const aScore =
      a.sessionsOverdue * 2.5 +
      a.sessionsSinceReview * 0.4 +
      (5 - a.score) +
      getProblemFocusBias(aCanonical?.tags || [], powerLevels);
    const bScore =
      b.sessionsOverdue * 2.5 +
      b.sessionsSinceReview * 0.4 +
      (5 - b.score) +
      getProblemFocusBias(bCanonical?.tags || [], powerLevels);
    return bScore - aScore;
  });

  for (const due of dueCandidates) {
    if (selected.length >= targetReview) break;
    if (selectedIds.has(due.id)) continue;

    const canonical = CANONICAL_PROBLEM_LOOKUP.get(due.id);
    selected.push({
      id: due.id,
      name: due.name,
      difficulty: canonical?.problem.difficulty || "Medium",
      tags: canonical?.tags || ledgerById.get(due.id)?.tags || [],
    });
    selectedIds.add(due.id);
  }

  if (selected.length < targetReview) {
    const shakyCandidates = [...state.shakyProblems].sort((a, b) => {
      const aCanonical = CANONICAL_PROBLEM_LOOKUP.get(a.id);
      const bCanonical = CANONICAL_PROBLEM_LOOKUP.get(b.id);
      const aScore =
        a.urgency + getProblemFocusBias(aCanonical?.tags || [], powerLevels);
      const bScore =
        b.urgency + getProblemFocusBias(bCanonical?.tags || [], powerLevels);
      return bScore - aScore;
    });

    for (const shaky of shakyCandidates) {
      if (selected.length >= targetReview) break;
      if (selectedIds.has(shaky.id)) continue;

      const canonical = CANONICAL_PROBLEM_LOOKUP.get(shaky.id);
      selected.push({
        id: shaky.id,
        name: shaky.name,
        difficulty: canonical?.problem.difficulty || "Medium",
        tags: canonical?.tags || ledgerById.get(shaky.id)?.tags || [],
      });
      selectedIds.add(shaky.id);
    }
  }

  if (selected.length < targetReview) {
    const fallbackCandidates = [...getLedger()]
      .map((entry) => {
        const canonical = CANONICAL_PROBLEM_LOOKUP.get(entry.id);
        const sessionsSinceReview = Math.max(
          0,
          completedSessions - entry.lastReviewedSession
        );
        const interval = Math.max(1, entry.currentInterval || 1);
        const sessionsUntilDue = Math.max(
          0,
          entry.nextReviewSession - completedSessions
        );
        const sessionsOverdue = Math.max(
          0,
          completedSessions - entry.nextReviewSession
        );
        const urgency =
          sessionsOverdue * 3 +
          sessionsSinceReview / interval +
          (5 - Math.max(1, Math.min(4, entry.lastScore || 3))) * 0.8 +
          (entry.lastScore <= 2 ? 2.2 : 0) +
          Math.max(0, 2 - sessionsUntilDue) * 0.75 +
          getProblemFocusBias(canonical?.tags || entry.tags || [], powerLevels);

        return {
          id: entry.id,
          name: entry.name,
          difficulty: canonical?.problem.difficulty || "Medium",
          tags: canonical?.tags || entry.tags || [],
          urgency,
        };
      })
      .sort((a, b) => b.urgency - a.urgency);

    for (const candidate of fallbackCandidates) {
      if (selected.length >= targetReview) break;
      if (selectedIds.has(candidate.id)) continue;

      selected.push({
        id: candidate.id,
        name: candidate.name,
        difficulty: candidate.difficulty,
        tags: candidate.tags,
      });
      selectedIds.add(candidate.id);
    }
  }

  return selected;
}

function selectFoundationProblems(
  targetNew: number,
  sessions: StudySession[],
  previousSchedule: AISchedule | null,
  existingIds: Set<string>,
  powerLevels: TagPowerLevels
): ScheduledProblem[] {
  const state = getSystemState(sessions.length);
  const attemptedIds = getAttemptedIds(sessions);
  const previousIds = previousSchedule
    ? previousSchedule.newProblems.map((problem) => problem.id || toProblemId(problem.name))
    : [];
  const previousPriority = new Set(previousIds.filter((id) => !attemptedIds.has(id)));

  const selected: ScheduledProblem[] = [];
  const selectedIds = new Set(existingIds);
  const perTagCount = new Map<string, number>();
  const previousTagCounts = new Map<string, number>();
  for (const problem of previousSchedule?.newProblems || []) {
    for (const tag of problem.tags || []) {
      previousTagCounts.set(tag, (previousTagCounts.get(tag) || 0) + 1);
    }
  }

  const orderedTags = [...state.tagCoverage].sort((a, b) => {
    const aPower = powerLevels[a.tag] ?? 2;
    const bPower = powerLevels[b.tag] ?? 2;
    const aScore =
      getPowerLevelBias(aPower) +
      (a.total - a.solved) * 1.6 +
      (a.solved < a.total ? 1.2 : -2) +
      (a.solved === 0 ? 0.8 : 0) +
      (a.avgScore === 0 ? 0.4 : (4 - a.avgScore) * 0.9) -
      (previousTagCounts.get(a.tag) || 0) * 1.25;
    const bScore =
      getPowerLevelBias(bPower) +
      (b.total - b.solved) * 1.6 +
      (b.solved < b.total ? 1.2 : -2) +
      (b.solved === 0 ? 0.8 : 0) +
      (b.avgScore === 0 ? 0.4 : (4 - b.avgScore) * 0.9) -
      (previousTagCounts.get(b.tag) || 0) * 1.25;
    if (aScore !== bScore) return bScore - aScore;
    if (aPower !== bPower) return bPower - aPower;
    if (a.solved !== b.solved) return a.solved - b.solved;
    if (a.avgScore !== b.avgScore) return a.avgScore - b.avgScore;
    return a.tag.localeCompare(b.tag);
  });

  const focusedTags = new Set(getFocusedTags(powerLevels));

  let addedInRound = true;
  while (selected.length < targetNew && addedInRound) {
    addedInRound = false;

    for (const coverage of orderedTags) {
      if (selected.length >= targetNew) break;
      const usedForTag = perTagCount.get(coverage.tag) || 0;
      const maxPerTag = (powerLevels[coverage.tag] ?? 2) >= 4 ? 3 : 2;
      if (usedForTag >= maxPerTag) continue;
      if (
        focusedTags.size > 0 &&
        !focusedTags.has(coverage.tag) &&
        selected.length < Math.min(targetNew, focusedTags.size * 2)
      ) {
        continue;
      }

      const candidate = [...coverage.unsolvedProblems]
        .sort((a, b) => {
          const aPriority = previousPriority.has(a.id) ? 0 : 1;
          const bPriority = previousPriority.has(b.id) ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          if (a.difficulty !== b.difficulty) {
            const difficultyRank = { Easy: 0, Medium: 1, Hard: 2 };
            return difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
          }
          return a.name.localeCompare(b.name);
        })
        .find((problem) => !selectedIds.has(problem.id));

      if (!candidate) continue;

      selected.push(
        normalizeProblem(candidate, [coverage.tag])
      );
      selectedIds.add(candidate.id);
      perTagCount.set(coverage.tag, usedForTag + 1);
      addedInRound = true;
    }
  }

  return selected;
}

function buildTips(reviewProblems: ScheduledProblem[], newProblems: ScheduledProblem[]): string {
  if (reviewProblems.length === 0 && newProblems.length === 0) {
    return "No immediate review or foundation problems were available.";
  }

  const parts: string[] = [];
  if (reviewProblems.length > 0) {
    parts.push(`Review is driven by spaced repetition first (${reviewProblems.length} due or weak problem${reviewProblems.length === 1 ? "" : "s"}).`);
  }
  if (newProblems.length > 0) {
    const topics = [...new Set(newProblems.flatMap((problem) => problem.tags || []))];
    parts.push(`Foundation work is spread across ${topics.length} topic${topics.length === 1 ? "" : "s"} to avoid overloading one pattern in a single day.`);
  }

  return parts.join(" ");
}

export async function generateSchedule(
  apiKey: string,
  recentSessions: StudySession[],
  leetcodeStats: unknown,
  targetReview: number,
  targetNew: number,
  previousSchedule: AISchedule | null,
  powerLevels: TagPowerLevels = DEFAULT_POWER_LEVELS
): Promise<AISchedule> {
  void leetcodeStats;
  const preferenceSignature = `${targetReview}:${targetNew}:${JSON.stringify(powerLevels)}`;

  const existingIds = new Set<string>();
  const reviewProblems = selectReviewProblems(
    targetReview,
    existingIds,
    recentSessions.length,
    powerLevels
  );
  for (const problem of reviewProblems) existingIds.add(problem.id);

  const foundationCandidates = selectFoundationProblems(
    targetNew,
    recentSessions,
    previousSchedule,
    existingIds,
    powerLevels
  );
  const newProblems = await curateFoundationOrderWithPowerLevels(
    apiKey,
    foundationCandidates,
    powerLevels
  );

  const focusedTags = getFocusedTags(powerLevels);
  const tipsBase = buildTips(reviewProblems, newProblems);
  const tips =
    focusedTags.length === 0
      ? tipsBase
      : `${tipsBase} Power focus is pushing ${focusedTags.slice(0, 3).join(", ")}${
          focusedTags.length > 3 ? " and adjacent patterns" : ""
        } higher in the new-problem mix.`;

  return {
    date: new Date().toISOString(),
    reviewProblems,
    newProblems,
    challengeProblem: null,
    tips,
    preferenceSignature,
  };
}

export async function generateOneProblem(
  _apiKey: string,
  type: GenerateOneType,
  currentSchedule: AISchedule,
  recentSessions: StudySession[],
  powerLevels: TagPowerLevels = DEFAULT_POWER_LEVELS
): Promise<ScheduledProblem> {
  void _apiKey;

  const existingIds = getScheduledIds(currentSchedule);

  if (type === "review") {
    const [problem] = selectReviewProblems(
      1,
      existingIds,
      recentSessions.length,
      powerLevels
    );
    if (!problem) {
      throw new Error("All tracked review candidates are already on the schedule.");
    }
    return problem;
  }

  if (type === "challenge") {
    const state = getSystemState(recentSessions.length);
    const problem = flattenCanonicalProblems()
      .filter((candidate) => !state.solvedSlugs.includes(candidate.id))
      .filter((candidate) => !existingIds.has(candidate.id))
      .sort((a, b) => {
        const difficultyRank = { Easy: 0, Medium: 1, Hard: 2 };
        return difficultyRank[b.difficulty] - difficultyRank[a.difficulty];
      })[0];

    if (!problem) throw new Error("No challenge problem is available right now.");
    return normalizeProblem(problem, CANONICAL_PROBLEM_LOOKUP.get(problem.id)?.tags || []);
  }

  const [problem] = selectFoundationProblems(
    1,
    recentSessions,
    currentSchedule,
    existingIds,
    powerLevels
  );
  if (!problem) throw new Error("No new foundation problem is available right now.");
  return problem;
}

export async function gradeSessionProblems(
  apiKey: string,
  problems: ProblemLog[]
): Promise<GradedProblem[]> {
  const model = getModel(apiKey);

  const prompt = `
    You are a LeetCode mentor. The user has inputted problems they just solved. Their inputs might be messy (e.g. URLs, typos, abbreviations like "2sum").
    Some of these problems may be random ad-hoc LeetCode problems that were never part of the user's generated schedule. You must still identify and tag them.

    For each problem below:
    1. Identify the official LeetCode problem they are referring to.
    2. Extract its official name for the "name" field (e.g., "Two Sum").
    3. Generate its official slug for the "id" field (e.g., "two-sum"). If it's not a real problem, use "unknown".
    4. Analyze the user's comments and time taken to assign a confidence score from 1-4.
    5. Assign 1-3 topic tags using ONLY this canonical list:
       ${CANONICAL_TAGS.join(", ")}.

    Problems:
    ${JSON.stringify(
      problems.map((problem) => ({
        session_id: problem.id,
        user_input: problem.problemNameOrUrl,
        time: problem.timeTaken,
        comments: problem.comments,
      }))
    )}

    Return ONLY a JSON array (no markdown) in this format:
    [{ "session_id": "the-id", "id": "two-sum", "name": "Two Sum", "score": 3, "tags": ["Array"] }]
  `;

  try {
    const result = await model.generateContent(prompt);
    const parsed = parseJson(result.response.text());
    const parsedObject =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    let validArray: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsedObject.problems)
      ? parsedObject.problems
      : Array.isArray(parsedObject.graded_problems)
      ? parsedObject.graded_problems
      : [parsed];

    if (!Array.isArray(validArray)) validArray = [];

    return validArray
      .filter(
        (problem): problem is Record<string, unknown> =>
          !!problem && typeof problem === "object"
      )
      .map((problem) => ({
      sessionId:
        typeof problem.session_id === "string"
          ? problem.session_id
          : typeof problem.sessionId === "string"
          ? problem.sessionId
          : undefined,
      id:
        typeof problem.id === "string"
          ? problem.id
          : toProblemId(
              typeof problem.name === "string" ? problem.name : "unknown"
            ),
      name: typeof problem.name === "string" ? problem.name : "Unknown",
      score: Math.max(
        1,
        Math.min(4, Math.round(Number(problem.score) || 3))
      ) as 1 | 2 | 3 | 4,
      tags: Array.isArray(problem.tags)
        ? problem.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      }));
  } catch (error) {
    console.error("Grading Error:", error);
    return problems.map((problem) => ({
      sessionId: problem.id,
      id: toProblemId(problem.problemNameOrUrl),
      name: problem.problemNameOrUrl,
      score: 3 as const,
      tags: [],
    }));
  }
}

export async function backfillProblemTags(
  apiKey: string,
  problemNames: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string[]>> {
  const model = getModel(apiKey);
  const allTags: Record<string, string[]> = {};
  const batchSize = 15;

  for (let i = 0; i < problemNames.length; i += batchSize) {
    const batch = problemNames.slice(i, i + batchSize);
    const prompt = `
      You are a LeetCode expert. For each problem below, assign 1-3 topic tags using ONLY this canonical list:
      ${CANONICAL_TAGS.join(", ")}.

      Problems: ${JSON.stringify(batch)}

      Return ONLY a JSON array (no markdown):
      [{ "name": "Problem Name", "tags": ["Array", "Two Pointers"] }]
    `;

    try {
      const result = await model.generateContent(prompt);
      const parsed = parseJson(result.response.text());
      const items = Array.isArray(parsed) ? parsed : [];
      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).name === "string"
        ) {
          const record = item as Record<string, unknown>;
          allTags[record.name as string] = Array.isArray(record.tags)
            ? record.tags.filter((tag): tag is string => typeof tag === "string")
            : [];
        }
      }
    } catch (error) {
      console.error("Backfill batch error:", error);
    }

    onProgress?.(Math.min(i + batchSize, problemNames.length), problemNames.length);
  }

  return allTags;
}
