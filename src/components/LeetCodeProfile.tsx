"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/useSessionStore";
import { Trophy, Target, Zap } from "lucide-react";

interface Stats {
  username: string;
  submitStats: {
    acSubmissionNum: {
      difficulty: string;
      count: number;
      submissions: number;
    }[];
  };
}

export default function LeetCodeProfile() {
  const { leetcodeUsername } = useSessionStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leetcodeUsername) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leetcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: leetcodeUsername }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch LeetCode data");
        }

        setStats(data.matchedUser);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch LeetCode data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [leetcodeUsername]);

  if (!leetcodeUsername) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center text-foreground/60">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>Enter your LeetCode username in Settings to view your stats.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-card h-40 border border-border rounded-2xl"></div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-6">
        <p className="font-medium">Error loading profile</p>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const allCount =
    stats.submitStats.acSubmissionNum.find((s) => s.difficulty === "All")
      ?.count || 0;
  const easyCount =
    stats.submitStats.acSubmissionNum.find((s) => s.difficulty === "Easy")
      ?.count || 0;
  const mediumCount =
    stats.submitStats.acSubmissionNum.find((s) => s.difficulty === "Medium")
      ?.count || 0;
  const hardCount =
    stats.submitStats.acSubmissionNum.find((s) => s.difficulty === "Hard")
      ?.count || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Trophy className="w-32 h-32 text-lc-brand" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            {stats.username}
          </h2>
          <div className="flex items-center gap-2 text-foreground/60 text-sm">
            <Zap className="w-4 h-4 text-lc-brand" />
            <span>{allCount} Problems Solved</span>
          </div>
        </div>

        <div className="flex gap-4 lg:gap-8">
          <div className="text-center">
            <div className="text-2xl font-semibold text-lc-easy">
              {easyCount}
            </div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider mt-1">
              Easy
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-lc-medium">
              {mediumCount}
            </div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider mt-1">
              Medium
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-lc-hard">
              {hardCount}
            </div>
            <div className="text-xs text-foreground/50 uppercase tracking-wider mt-1">
              Hard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
