'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getTagCoverage, initMastery, type TagCoverage } from '@/lib/mastery';

function getScoreTone(avgScore: number, solved: number): string {
  if (solved === 0) return 'text-foreground/35';
  if (avgScore >= 3.5) return 'text-lc-easy';
  if (avgScore >= 2.5) return 'text-lc-medium';
  return 'text-red-400';
}

export default function BreadthGrid() {
  const [coverage, setCoverage] = useState<TagCoverage[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await initMastery();
      if (!cancelled) {
        setCoverage(getTagCoverage());
      }
    };

    void load();

    const interval = setInterval(() => {
      void load();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="px-4 py-3">
      <div className="mb-2 px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
          Mastery
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {coverage.map((topic) => (
          <Link
            key={topic.tag}
            href={`/history?tag=${encodeURIComponent(topic.tag)}`}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 transition-colors hover:border-lc-brand/40 hover:bg-lc-brand/5"
            title={`${topic.tag}: avg ${
              topic.solved === 0 ? '--' : topic.avgScore.toFixed(1)
            }/4 · ${topic.solved} solved`}
          >
            <span className="truncate text-[11px] font-medium text-foreground/75">
              {topic.tag}
            </span>
            <span
              className={`text-[11px] font-mono ${getScoreTone(
                topic.avgScore,
                topic.solved
              )}`}
            >
              {topic.solved === 0 ? '--' : topic.avgScore.toFixed(1)}
            </span>
            <span className="text-[11px] font-mono text-foreground/45">
              {topic.solved}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
