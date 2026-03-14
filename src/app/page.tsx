"use client";

import LeetCodeProfile from "@/components/LeetCodeProfile";
import {
  Sparkles,
  BookOpen,
  Brain,
  Clock,
  ChevronRight,
  ExternalLink,
  Plus,
  CheckCircle,
  Timer,
  BrainCircuit,
  Sliders,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  useSessionStore,
  ScheduledProblem,
} from "@/store/useSessionStore";
import {
  generateSchedule,
  generateOneProblem,
  GenerateOneType,
  gradeSessionProblems,
  backfillProblemTags,
} from "@/lib/gemini";
import {
  updateMastery,
  ConfidenceScore,
  SCORE_LABELS,
  getLedger,
  initMastery,
  setEntryTags,
  getToday,
  toLocalDateString,
} from "@/lib/mastery";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";

function extractProblemName(input: string): string {
  if (!input) return "Unknown";
  try {
    const url = new URL(input);
    if (
      url.hostname.includes("leetcode.com") &&
      url.pathname.includes("/problems/")
    ) {
      const slug = url.pathname.split("/problems/")[1]?.replace(/\/$/, "");
      if (slug) {
        return slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }
  } catch {}
  return input;
}

// Normalize a problem from schedule (handles old string format + new object format)
function toScheduledProblem(p: ScheduledProblem | string | null | undefined): ScheduledProblem {
  if (typeof p === "string") return { id: p.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: p, difficulty: "Medium", tags: [] };
  return {
    id: p?.id || p?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || "unknown-id",
    name: p?.name || "Unknown",
    difficulty: p?.difficulty || "Medium",
    tags: p?.tags || [],
  };
}

const difficultyColor: Record<string, string> = {
  Easy: "text-lc-easy bg-lc-easy/10 border-lc-easy/20",
  Medium: "text-lc-medium bg-lc-medium/10 border-lc-medium/20",
  Hard: "text-lc-hard bg-lc-hard/10 border-lc-hard/20",
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${difficultyColor[difficulty] || difficultyColor.Medium}`}
    >
      {difficulty}
    </span>
  );
}

function ProblemLink({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  if (!name)
    return <span className="text-foreground/40 italic">Unknown problem</span>;
  const displayName = extractProblemName(name);
  const isUrl = name.startsWith("http");
  const href = isUrl
    ? name
    : `https://leetcode.com/problemset/?search=${encodeURIComponent(displayName)}`;

  const handleClick = () => {
    navigator.clipboard.writeText(displayName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title="Opens link and copies name to clipboard"
      className="group hover:text-lc-brand transition-colors underline decoration-foreground/20 hover:decoration-lc-brand flex items-center gap-1.5"
    >
      <span className="line-clamp-2">{displayName}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 shrink-0 text-lc-easy" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      )}
    </a>
  );
}

function ProblemRow({
  prob,
  icon,
  isCompleted,
}: {
  prob: ScheduledProblem | string;
  icon: React.ReactNode;
  isCompleted?: boolean;
}) {
  const normalized =
    typeof prob === "string"
      ? { id: prob.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: prob, difficulty: "Medium" as const, tags: [] }
      : prob;
  return (
    <div className={`flex flex-col gap-1 w-full ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 text-sm">
        {isCompleted ? <CheckCircle className="w-4 h-4 text-lc-easy shrink-0" /> : icon}
        <div className={`flex items-center gap-1.5 flex-1 min-w-0 pr-2 ${isCompleted ? 'line-through text-foreground/50' : ''}`}>
          <ProblemLink name={normalized.name} />
        </div>
        {normalized.tags && normalized.tags.length > 0 && (
          <div className="flex gap-1.5 items-center hidden sm:flex shrink-0">
            {normalized.tags.slice(0, 2).map((t: string, i: number) => (
              <span
                key={i}
                className="text-[10px] font-medium bg-foreground/5 text-foreground/50 px-1.5 py-0.5 rounded border border-border truncate max-w-[80px]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <DifficultyBadge difficulty={normalized.difficulty} />
      </div>
    </div>
  );
}

export default function Home() {
  const {
    sessions,
    aiSchedule,
    setAISchedule,
    addSession,
    activeSession,
    setActiveSession,
    geminiApiKey,
    targetReviewProblems,
    targetNewProblems,
    powerLevels,
    setTargetReviewProblems,
    setTargetNewProblems,
  } = useSessionStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [showAllSessionFoundation, setShowAllSessionFoundation] = useState(false);
  const [showAllScheduleFoundation, setShowAllScheduleFoundation] = useState(false);
  const lastPreferenceSyncRef = useRef<string | null>(null);
  const [currentProblem, setCurrentProblem] = useState({
    problemNameOrUrl: "",
    timeTaken: "",
    comments: "",
    score: 3 as ConfidenceScore,
  });

  useEffect(() => {
    let cancelled = false;

    const runOneTimeTagMigration = async () => {
      await initMastery();

      if (!geminiApiKey) return;

      const untagged = getLedger().filter((entry) => entry.tags.length === 0);
      if (untagged.length === 0) return;

      try {
        const tagMap = await backfillProblemTags(
          geminiApiKey,
          untagged.map((entry) => entry.name)
        );

        if (cancelled) return;

        const normalizedTagMap = new Map<string, string[]>();
        for (const [name, tags] of Object.entries(tagMap)) {
          normalizedTagMap.set(name.toLowerCase().trim(), tags);
        }

        for (const entry of untagged) {
          const tags = normalizedTagMap.get(entry.name.toLowerCase().trim());
          if (tags && tags.length > 0) {
            setEntryTags(entry.id, tags);
          }
        }
      } catch (migrationError) {
        console.error("Background tag migration failed:", migrationError);
      }
    };

    runOneTimeTagMigration();

    return () => {
      cancelled = true;
    };
  }, [geminiApiKey]);

  useEffect(() => {
    let cancelled = false;

    const refreshSchedule = async () => {
      await initMastery();
      if (sessions.length === 0) return;

      const state = getLedger();
      const hasReviewBase = state.some(
        (entry) => entry.lastScore <= 2 || sessions.length >= entry.nextReviewSession
      );
      const isScheduleStale =
        !aiSchedule || toLocalDateString(aiSchedule.date) !== getToday();
      const shouldRefresh =
        isScheduleStale ||
        aiSchedule?.newProblems.length === 0 ||
        (hasReviewBase && aiSchedule?.reviewProblems.length === 0);

      if (!shouldRefresh) return;

      const schedule = await generateSchedule(
        geminiApiKey,
        sessions,
        null,
        targetReviewProblems,
        targetNewProblems,
        aiSchedule,
        powerLevels
      );

      if (!cancelled) {
        setAISchedule(schedule);
      }
    };

    refreshSchedule();

    return () => {
      cancelled = true;
    };
  }, [
    aiSchedule,
    geminiApiKey,
    sessions,
    setAISchedule,
    targetNewProblems,
    powerLevels,
    targetReviewProblems,
  ]);

  useEffect(() => {
    if (!aiSchedule || sessions.length === 0) return;

    const preferenceSignature = `${targetReviewProblems}:${targetNewProblems}:${JSON.stringify(powerLevels)}`;
    if (lastPreferenceSyncRef.current === preferenceSignature) return;

    lastPreferenceSyncRef.current = preferenceSignature;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const schedule = await generateSchedule(
          geminiApiKey,
          sessions,
          null,
          targetReviewProblems,
          targetNewProblems,
          aiSchedule,
          powerLevels
        );

        if (!cancelled) {
          setAISchedule(schedule);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to sync schedule to your preferences."
          );
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    aiSchedule,
    geminiApiKey,
    sessions,
    setAISchedule,
    targetNewProblems,
    powerLevels,
    targetReviewProblems,
  ]);

  const handleGenerateSchedule = async () => {
    if (sessions.length === 0) {
      setError("Complete at least one session to get a schedule.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const schedule = await generateSchedule(
        geminiApiKey,
        sessions,
        null,
        targetReviewProblems,
        targetNewProblems,
        aiSchedule,
        powerLevels,
      );
      setAISchedule(schedule);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddOneProblem = async (type: GenerateOneType) => {
    if (!aiSchedule) {
      setError("Generate a schedule first before adding extra problems.");
      return;
    }

    setGeneratingType(type);
    setError(null);
    try {
      const newProblem = await generateOneProblem(
        geminiApiKey,
        type,
        aiSchedule,
        sessions,
        powerLevels
      );
      const updated = { ...aiSchedule };
      if (type === "review") {
        updated.reviewProblems = [...updated.reviewProblems, newProblem];
      } else if (type === "recommended") {
        updated.newProblems = [...updated.newProblems, newProblem];
      } else {
        updated.challengeProblem = newProblem;
      }
      setAISchedule(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add problem.");
    } finally {
      setGeneratingType(null);
    }
  };

  const handleAddProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem.problemNameOrUrl.trim()) return;

    setActiveSession([
      ...activeSession,
      {
        id: nanoid(),
        problemNameOrUrl: extractProblemName(currentProblem.problemNameOrUrl),
        timeTaken: currentProblem.timeTaken
          ? parseInt(currentProblem.timeTaken)
          : undefined,
        comments: currentProblem.comments,
        score: currentProblem.score,
      },
    ]);
    setCurrentProblem({
      problemNameOrUrl: "",
      timeTaken: "",
      comments: "",
      score: 3,
    });
  };

  const handleEndSession = async () => {
    if (activeSession.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      let finalSession = [...activeSession];

      // 1. Grade and normalize inputs via LLM
      if (geminiApiKey) {
        const reviewSessionIndex = sessions.length + 1;
        const graded = await gradeSessionProblems(geminiApiKey, activeSession);
        const gradedBySessionId = new Map(
          graded
            .filter((item) => item.sessionId)
            .map((item) => [item.sessionId as string, item])
        );

        finalSession = activeSession.map((p) => {
          const g =
            gradedBySessionId.get(p.id) ||
            graded.find((x, idx) => activeSession.indexOf(p) === idx);
          if (g) {
            return {
              ...p,
              id: g.id && g.id !== 'unknown' ? g.id : p.id, // Fallback if AI hallucinates 'unknown'
              problemNameOrUrl: g.name,
              score: p.score && p.score !== 3 ? p.score : g.score, // allow manual score override, else AI score
            };
          }
          return p;
        });

        // Update mastery with normalized names and AI generated tags
        finalSession.forEach((p, idx) => {
          const originalId = activeSession[idx]?.id;
          const g =
            (originalId ? gradedBySessionId.get(originalId) : undefined) ||
            graded.find((x, gradedIdx) => idx === gradedIdx);
          if (g && g.id !== 'unknown') {
            updateMastery(g.id, g.name, p.score || g.score, g.tags, reviewSessionIndex);
          }
        });
      } else {
        // Fallback if no LLM: manual extraction
        const reviewSessionIndex = sessions.length + 1;
        finalSession.forEach((p) => {
          const finalScore = p.score || 3;
          let tags: string[] = [];
          if (aiSchedule) {
            const allScheduled = [
              ...aiSchedule.reviewProblems,
              ...aiSchedule.newProblems,
              ...(aiSchedule.challengeProblem ? [aiSchedule.challengeProblem] : []),
            ];
            const match = allScheduled.find(
              (sp) => extractProblemName(sp.name) === p.problemNameOrUrl
            );
            if (match?.tags) tags = match.tags;
          }
          const safeName = extractProblemName(p.problemNameOrUrl);
          const safeId = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          updateMastery(
            safeId,
            safeName,
            finalScore as ConfidenceScore,
            tags,
            reviewSessionIndex
          );
        });
      }

      // 2. Save the session
      addSession({
        id: nanoid(),
        date: new Date().toISOString(),
        problems: finalSession,
      });

      // 3. Reset state
      setActiveSession([]);
      setSessionOpen(false);

      // 4. Auto-generate new schedule
      if (geminiApiKey) {
        const updatedSessions = [
          { id: nanoid(), date: new Date().toISOString(), problems: finalSession },
          ...sessions,
        ];
        const schedule = await generateSchedule(
          geminiApiKey,
          updatedSessions,
          null,
          targetReviewProblems,
          targetNewProblems,
          aiSchedule,
          powerLevels,
        );
        setAISchedule(schedule);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to finalize session.");
    } finally {
      setIsGenerating(false);
    }
  };

  const recentSessions = sessions.slice(0, 3);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-foreground/60 mt-1">
            Track your progress and get AI mentorship.
          </p>
        </div>
        <button
          onClick={() => setSessionOpen(!sessionOpen)}
          className={`font-semibold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg ${
            sessionOpen
              ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-red-500/10 hover:bg-red-500/20"
              : "bg-lc-brand hover:bg-lc-brand/90 text-black shadow-lc-brand/20"
          }`}
        >
          {sessionOpen ? (
            <>
              <ChevronDown className="w-5 h-5" />
              Minimize Session
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Start Session
            </>
          )}
        </button>
      </header>

      {/* Inline Session Form */}
      {sessionOpen && (
        <section className="bg-card border-2 border-lc-brand/30 rounded-2xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-lc-brand">
            <Timer className="w-6 h-6" />
            Active Session
          </h2>

          {/* AI Suggestions Quick Add */}
          {aiSchedule &&
            (aiSchedule.reviewProblems.length > 0 ||
              aiSchedule.newProblems.length > 0) && (
              <div className="space-y-3 p-4 bg-lc-brand/5 border border-lc-brand/20 rounded-xl">
                <h3 className="text-sm font-semibold text-lc-brand flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  Today&apos;s Foundation + Reinforcement
                </h3>
                <div className="flex flex-wrap gap-2">
                  {aiSchedule.reviewProblems.map((rawProb, idx) => {
                    const prob = toScheduledProblem(rawProb);
                    const isCompleted = activeSession.some(
                      (p) =>
                        p.problemNameOrUrl === extractProblemName(prob.name),
                    );
                    return (
                      <button
                        key={`rev-${idx}`}
                        type="button"
                        onClick={() =>
                          setCurrentProblem({
                            ...currentProblem,
                            problemNameOrUrl: extractProblemName(prob.name),
                          })
                        }
                        className={`text-xs border px-3 py-1.5 rounded-lg transition-colors text-left truncate max-w-[220px] flex items-center gap-1.5 ${
                          isCompleted
                            ? "bg-foreground/5 border-border text-foreground/50 line-through"
                            : "bg-background border-border hover:border-lc-brand"
                        }`}
                      >
                        <span className="text-lc-medium font-bold">Review</span>
                        <span className="truncate">
                          {extractProblemName(prob.name)}
                        </span>
                        {isCompleted ? (
                          <CheckCircle className="w-3 h-3 text-lc-easy" />
                        ) : (
                          <DifficultyBadge difficulty={prob.difficulty} />
                        )}
                      </button>
                    );
                  })}
                  {(showAllSessionFoundation
                    ? aiSchedule.newProblems
                    : aiSchedule.newProblems.slice(0, 4)
                  ).map((rawProb, idx) => {
                    const prob = toScheduledProblem(rawProb);
                    const isCompleted = activeSession.some(
                      (p) =>
                        p.problemNameOrUrl === extractProblemName(prob.name),
                    );
                    return (
                      <button
                        key={`new-${idx}`}
                        type="button"
                        onClick={() =>
                          setCurrentProblem({
                            ...currentProblem,
                            problemNameOrUrl: extractProblemName(prob.name),
                          })
                        }
                        className={`text-xs border px-3 py-1.5 rounded-lg transition-colors text-left truncate max-w-[220px] flex items-center gap-1.5 ${
                          isCompleted
                            ? "bg-foreground/5 border-border text-foreground/50 line-through"
                            : "bg-background border-border hover:border-lc-brand"
                        }`}
                      >
                        <span className="text-lc-easy font-bold">New</span>
                        <span className="truncate">
                          {extractProblemName(prob.name)}
                        </span>
                        {isCompleted ? (
                          <CheckCircle className="w-3 h-3 text-lc-easy" />
                        ) : (
                          <DifficultyBadge difficulty={prob.difficulty} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {aiSchedule.newProblems.length > 4 && (
                  <div className="flex items-center justify-between gap-3 text-[11px] text-foreground/45">
                    <p>
                      {aiSchedule.newProblems.length - 4} more foundation problem
                      {aiSchedule.newProblems.length - 4 === 1 ? "" : "s"} queued in the schedule card.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllSessionFoundation(!showAllSessionFoundation)
                      }
                      className="text-lc-brand hover:text-lc-brand/80 font-medium transition-colors"
                    >
                      {showAllSessionFoundation ? "Show less" : "Show more"}
                    </button>
                  </div>
                )}
                <p className="text-xs text-foreground/50 italic">
                  Click a problem to auto-fill. Note &quot;Skipped&quot; in
                  comments if you didn&apos;t attempt it.
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Log Form */}
            <form onSubmit={handleAddProblem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">
                  Problem Name or URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={currentProblem.problemNameOrUrl}
                  onChange={(e) =>
                    setCurrentProblem({
                      ...currentProblem,
                      problemNameOrUrl: e.target.value,
                    })
                  }
                  placeholder="e.g. 1. Two Sum or https://leetcode..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-lc-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">
                  Time Taken (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentProblem.timeTaken}
                  onChange={(e) =>
                    setCurrentProblem({
                      ...currentProblem,
                      timeTaken: e.target.value,
                    })
                  }
                  placeholder="e.g. 25"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-lc-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">
                  Personal Comments
                </label>
                <textarea
                  value={currentProblem.comments}
                  onChange={(e) =>
                    setCurrentProblem({
                      ...currentProblem,
                      comments: e.target.value,
                    })
                  }
                  placeholder="e.g. Struggled with DP mapping..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 min-h-[80px] focus:outline-none focus:border-lc-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  Confidence Rating <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([1, 2, 3, 4] as ConfidenceScore[]).map((score) => {
                    const info = SCORE_LABELS[score];
                    const isSelected = currentProblem.score === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setCurrentProblem({ ...currentProblem, score })
                        }
                        className={`text-xs font-semibold py-2.5 px-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? `${info.color} ring-2 ring-current scale-105`
                            : "bg-background border-border text-foreground/50 hover:border-foreground/30"
                        }`}
                      >
                        <span className="text-base">{info.emoji}</span>
                        {info.label} ({score})
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-foreground text-background font-semibold px-4 py-3 rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Add Problem
              </button>
              <p className="text-xs text-foreground/45 text-center">
                Adding a problem keeps the session open. It only ends when you click
                &nbsp;&quot;End Session &amp; Get AI Schedule&quot;.
              </p>
            </form>

            {/* Session Progress + Preferences */}
            <div className="space-y-4">
              <div className="bg-background border border-border rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setProgressOpen(!progressOpen)}
                  className="w-full text-sm font-semibold text-foreground/80 flex items-center justify-between"
                >
                  <span>Session Progress ({activeSession.length})</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${progressOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {progressOpen && (
                  <div className="mt-3">
                    {activeSession.length === 0 ? (
                      <div className="text-center text-foreground/40 py-4 border border-dashed border-border rounded-lg text-sm">
                        No problems logged yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {activeSession.map((p, idx) => (
                          <div
                            key={p.id}
                            className="bg-card border border-border rounded-lg p-3 relative group"
                          >
                            <div className="font-medium text-lc-easy pr-6 truncate text-sm flex gap-1 items-center">
                              {idx + 1}. {p.problemNameOrUrl}
                              {aiSchedule &&
                                (aiSchedule.reviewProblems.some(
                                  (rp) => extractProblemName(rp.name) === p.problemNameOrUrl
                                ) ||
                                  aiSchedule.newProblems.some(
                                    (np) => extractProblemName(np.name) === p.problemNameOrUrl
                                  )) && (
                                  <CheckCircle className="w-3.5 h-3.5 text-lc-easy ml-1" />
                                )}
                            </div>
                            {p.timeTaken && (
                              <div className="text-xs text-foreground/60 mt-1 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> {p.timeTaken}m
                              </div>
                            )}
                            {p.score && (
                              <div
                                className="text-xs mt-1 flex items-center gap-1 font-semibold"
                                style={{
                                  color: SCORE_LABELS[p.score].color
                                    .split(" ")[0]
                                    .replace("text-", ""),
                                }}
                              >
                                {SCORE_LABELS[p.score].emoji} Score: {p.score}/4
                              </div>
                            )}
                            {p.comments && (
                              <div className="text-xs text-foreground/60 mt-1 italic">
                                &quot;{p.comments}&quot;
                              </div>
                            )}
                            <button
                              onClick={() =>
                                setActiveSession(
                                  activeSession.filter((prob) => prob.id !== p.id),
                                )
                              }
                              className="absolute top-3 right-3 text-foreground/30 hover:text-red-500 transition-colors text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule Preferences */}
              <div className="bg-background border border-border rounded-xl p-4">
                <h3 className="text-xs font-semibold flex items-center gap-2 mb-3 text-foreground/70">
                  <Sliders className="w-3.5 h-3.5 text-lc-brand" />
                  Schedule Preferences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-foreground/60 mb-2 flex justify-between">
                      <span>Review</span>
                      <span className="text-lc-brand font-bold bg-lc-brand/10 px-1.5 py-0.5 rounded text-[10px]">
                        {targetReviewProblems}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={targetReviewProblems}
                      onChange={(e) =>
                        setTargetReviewProblems(parseInt(e.target.value))
                      }
                      className="w-full accent-lc-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/60 mb-2 flex justify-between">
                      <span>New</span>
                      <span className="text-lc-brand font-bold bg-lc-brand/10 px-1.5 py-0.5 rounded text-[10px]">
                        {targetNewProblems}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={targetNewProblems}
                      onChange={(e) =>
                        setTargetNewProblems(parseInt(e.target.value))
                      }
                      className="w-full accent-lc-brand"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleEndSession}
                disabled={activeSession.length === 0}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  activeSession.length > 0
                    ? "bg-lc-brand text-black hover:bg-lc-brand/90 shadow-lg shadow-lc-brand/20"
                    : "bg-card text-foreground/30 cursor-not-allowed border border-border"
                }`}
              >
                <BrainCircuit className="w-5 h-5" />
                End Session & Get AI Schedule
              </button>
            </div>
          </div>
        </section>
      )}

      <LeetCodeProfile />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* The "Why" Standalone Card */}
      {aiSchedule && aiSchedule.tips && (
        <div className="bg-lc-brand/5 border border-lc-brand/20 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <BrainCircuit className="w-24 h-24 text-lc-brand" />
          </div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-lc-brand mb-2 relative z-10">
            <Sparkles className="w-4 h-4" />
            AI Mentor&apos;s Reasoning
          </h3>
          <p className="text-foreground/80 text-sm leading-relaxed italic relative z-10">
            &quot;{aiSchedule.tips}&quot;
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Recent Sessions */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-lc-easy" />
              Recent Sessions
            </h3>
            {sessions.length > 0 && (
              <span className="text-xs text-foreground/50 bg-background px-2 py-1 rounded-md">
                Total: {sessions.length}
              </span>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center text-foreground/50 py-8 border border-dashed border-border rounded-xl">
              No recent sessions found. Start studying!
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-background border border-border rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm text-foreground/60 font-medium">
                      {new Date(session.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs bg-card px-2 py-1 rounded text-foreground/70">
                      {session.problems.length} problems
                    </div>
                  </div>
                  <div className="space-y-2">
                    {session.problems.map((prob, i) => (
                      <div
                        key={prob.id}
                        className="text-sm flex gap-2 items-center"
                      >
                        <span className="text-foreground/40 text-xs w-4">
                          {i + 1}.
                        </span>
                        <span className="truncate flex-1">
                          {prob.problemNameOrUrl}
                        </span>
                        {prob.timeTaken && (
                          <span className="text-xs text-foreground/40 shrink-0">
                            {prob.timeTaken}m
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Schedule */}
        <section className="bg-card border border-lc-brand/20 shadow-lg shadow-lc-brand/5 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Sparkles className="w-32 h-32 text-lc-brand" />
          </div>

          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-lc-brand">
              <Brain className="w-5 h-5" />
              AI Mentor Schedule
            </h3>
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating || sessions.length === 0}
              className="text-xs font-medium bg-lc-brand/10 text-lc-brand hover:bg-lc-brand/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3 h-3" />
              {isGenerating ? "Analyzing..." : "Generate Full Schedule"}
            </button>
          </div>

          {!aiSchedule ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-foreground/50 p-8 border border-dashed border-border rounded-xl relative z-10">
              <Sparkles className="w-8 h-8 mb-3 opacity-20" />
              <p>
                Complete a session and generate a schedule to get personalized
                AI mentorship.
              </p>
            </div>
          ) : (
            <div className="space-y-6 relative z-10">
              {/* Reinforcement Review */}
              {aiSchedule.reviewProblems &&
                aiSchedule.reviewProblems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground/70 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-lc-medium" />
                      Reinforcement (Review)
                    </h4>
                    <div className="bg-background border border-border rounded-xl p-3 space-y-2">
                      {aiSchedule.reviewProblems.map((prob, i) => {
                        const probId = typeof prob === 'string' ? prob : (prob.id || extractProblemName(prob.name));
                        const isCompleted = activeSession.some((p) => p.id === probId || p.problemNameOrUrl === extractProblemName(typeof prob === 'string' ? prob : prob.name));
                        return (
                          <ProblemRow
                            key={i}
                            prob={prob}
                            icon={
                              <ChevronRight className="w-4 h-4 text-lc-medium shrink-0" />
                            }
                            isCompleted={isCompleted}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Foundation Problems */}
              {aiSchedule.newProblems && aiSchedule.newProblems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground/70 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-lc-easy" />
                    Foundation (New)
                  </h4>
                    <div className="bg-background border border-border rounded-xl p-3 space-y-2">
                      {(showAllScheduleFoundation
                        ? aiSchedule.newProblems
                        : aiSchedule.newProblems.slice(0, 4)
                      ).map((prob, i) => {
                        const probId = typeof prob === 'string' ? prob : (prob.id || extractProblemName(prob.name));
                        const isCompleted = activeSession.some((p) => p.id === probId || p.problemNameOrUrl === extractProblemName(typeof prob === 'string' ? prob : prob.name));
                        return (
                        <ProblemRow
                          key={i}
                          prob={prob}
                          icon={
                            <ChevronRight className="w-4 h-4 text-lc-easy shrink-0" />
                          }
                          isCompleted={isCompleted}
                          />
                        );
                      })}
                      {aiSchedule.newProblems.length > 4 && (
                        <div className="pt-1 flex items-center justify-between gap-3 text-xs text-foreground/45">
                          <span>
                            +{aiSchedule.newProblems.length - 4} more foundation problem
                            {aiSchedule.newProblems.length - 4 === 1 ? "" : "s"} hidden for focus
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllScheduleFoundation(!showAllScheduleFoundation)
                            }
                            className="text-lc-brand hover:text-lc-brand/80 font-medium transition-colors"
                          >
                            {showAllScheduleFoundation ? "Show less" : "Show more"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Preference Sync */}
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating}
                  className="flex-1 text-xs font-medium bg-lc-brand/10 text-lc-brand hover:bg-lc-brand/20 border border-lc-brand/20 px-2 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  {isGenerating
                    ? "..."
                    : `Match Preferences (${targetReviewProblems} Review / ${targetNewProblems} Foundation)`}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAddOneProblem("review")}
                  disabled={!aiSchedule || !!generatingType || isGenerating}
                  className="flex-1 text-xs font-medium bg-lc-medium/10 text-lc-medium hover:bg-lc-medium/20 border border-lc-medium/20 px-2 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  {generatingType === "review" ? "..." : "Add 1 Review"}
                </button>
                <button
                  onClick={() => handleAddOneProblem("recommended")}
                  disabled={!aiSchedule || !!generatingType || isGenerating}
                  className="flex-1 text-xs font-medium bg-lc-easy/10 text-lc-easy hover:bg-lc-easy/20 border border-lc-easy/20 px-2 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  {generatingType === "recommended" ? "..." : "Add 1 Foundation"}
                </button>
              </div>

              <div className="text-xs text-foreground/40 text-right">
                Generated {new Date(aiSchedule.date).toLocaleDateString()}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
