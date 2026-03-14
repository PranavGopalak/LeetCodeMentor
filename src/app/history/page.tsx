'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/useSessionStore';
import {
  History,
  Calendar,
  Clock,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import {
  getLedger,
  getTagCoverage,
  initMastery,
  normalizeTag,
  rebuildMasteryFromSessions,
  toProblemId,
  type TagCoverage,
} from '@/lib/mastery';

export default function HistoryPage() {
  const { sessions, removeSession, setAISchedule } = useSessionStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [coverage, setCoverage] = useState<TagCoverage[]>([]);
  const [problemTagsById, setProblemTagsById] = useState<Record<string, string[]>>({});

  const selectedTagParam = searchParams.get('tag');
  const selectedTag = selectedTagParam ? normalizeTag(selectedTagParam) : null;

  useEffect(() => {
    let cancelled = false;

    const loadMastery = async () => {
      await initMastery();
      if (cancelled) return;

      const ledger = getLedger();
      const tagsById: Record<string, string[]> = {};
      for (const entry of ledger) {
        tagsById[entry.id] = entry.tags;
      }

      setProblemTagsById(tagsById);
      setCoverage(getTagCoverage());
    };

    loadMastery();
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  const filteredSessions = sessions
    .map((session) => {
      const filteredProblems = session.problems.filter((problem) => {
        if (!selectedTag) return true;

        const problemId = toProblemId(problem.id || problem.problemNameOrUrl);
        const tags = problemTagsById[problemId] || [];
        return tags.includes(selectedTag);
      });

      return {
        ...session,
        problems: filteredProblems,
      };
    })
    .filter((session) => session.problems.length > 0);

  const filteredProblemCount = filteredSessions.reduce(
    (count, session) => count + session.problems.length,
    0
  );

  const tagLinks = coverage.map((topic) => topic.tag);

  const getTagHref = (tag: string) =>
    `${pathname}?tag=${encodeURIComponent(tag)}`;

  return (
    <div className="animate-in fade-in duration-500 space-y-8 p-8 max-w-5xl mx-auto">
      <header className="border-b border-border pb-6 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-lc-medium">
              <History className="w-8 h-8" />
              Session History
            </h1>
            <p className="mt-2 text-foreground/60">
              View all your past study sessions and problems.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground/65">
            <Filter className="w-4 h-4 text-lc-brand" />
            Filter by tag
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={pathname}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedTag
                  ? 'border-lc-brand/30 bg-lc-brand/10 text-lc-brand'
                  : 'border-border bg-background text-foreground/70 hover:border-lc-brand/30 hover:text-lc-brand'
              }`}
            >
              All Problems
            </Link>

            {tagLinks.map((tag) => {
              const isActive = tag === selectedTag;
              const topic = coverage.find((item) => item.tag === tag);
              return (
                <Link
                  key={tag}
                  href={getTagHref(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-lc-brand/30 bg-lc-brand/10 text-lc-brand'
                      : 'border-border bg-background text-foreground/70 hover:border-lc-brand/30 hover:text-lc-brand'
                  }`}
                >
                  {tag} {topic ? `(${topic.solved})` : ''}
                </Link>
              );
            })}
          </div>

          {selectedTag && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-lc-brand/20 bg-lc-brand/5 px-4 py-3">
              <div className="text-sm text-foreground/75">
                Showing <span className="font-semibold text-lc-brand">{filteredProblemCount}</span>{' '}
                problem{filteredProblemCount === 1 ? '' : 's'} tagged{' '}
                <span className="font-semibold text-lc-brand">{selectedTag}</span>
              </div>
              <Link
                href={pathname}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-lc-brand hover:text-lc-brand/80"
              >
                <X className="w-3.5 h-3.5" />
                Clear filter
              </Link>
            </div>
          )}
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-24 text-center text-foreground/40">
          <History className="mx-auto mb-4 w-12 h-12 opacity-20" />
          <p>No study sessions recorded yet.</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-20 text-center text-foreground/45">
          <History className="mx-auto mb-4 w-12 h-12 opacity-20" />
          <p className="font-medium">No problems found for {selectedTag}.</p>
          <p className="mt-2 text-sm text-foreground/40">
            Try another tag or clear the filter to see your full history.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-lc-brand/30"
            >
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 font-medium text-foreground/80">
                  <Calendar className="w-5 h-5 text-lc-brand" />
                  {new Date(session.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-sm">
                    {session.problems.length} problem
                    {session.problems.length === 1 ? '' : 's'}
                  </span>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this session?')) {
                        const remainingSessions = sessions.filter(
                          (item) => item.id !== session.id
                        );
                        removeSession(session.id);
                        await rebuildMasteryFromSessions(remainingSessions);
                        setAISchedule(null);
                      }
                    }}
                    className="p-2 text-foreground/30 transition-colors hover:text-red-500"
                    title="Delete Session"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {session.problems.map((problem, idx) => {
                  const problemId = toProblemId(problem.id || problem.problemNameOrUrl);
                  const tags = problemTagsById[problemId] || [];

                  return (
                    <div
                      key={`${session.id}-${problem.id}-${idx}`}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="mb-2 pr-8 font-semibold text-lc-easy">
                        {idx + 1}. {problem.problemNameOrUrl}
                      </div>

                      {tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Link
                              key={`${problemId}-${tag}`}
                              href={getTagHref(tag)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                tag === selectedTag
                                  ? 'border-lc-brand/30 bg-lc-brand/10 text-lc-brand'
                                  : 'border-border bg-card text-foreground/65 hover:border-lc-brand/30 hover:text-lc-brand'
                              }`}
                            >
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}

                      {problem.timeTaken && (
                        <div className="mb-2 flex items-center gap-1.5 text-sm text-foreground/60">
                          <Clock className="w-4 h-4" /> {problem.timeTaken} minutes
                        </div>
                      )}

                      {problem.comments && (
                        <div className="rounded-lg border border-border/50 bg-card p-3 text-sm italic text-foreground/70">
                          &quot;{problem.comments}&quot;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
