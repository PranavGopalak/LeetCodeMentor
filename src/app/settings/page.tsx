'use client';

import {
  useSessionStore,
  DEFAULT_POWER_LEVELS,
  POWER_LEVEL_PRESETS,
} from '@/store/useSessionStore';
import { Save, User, Key, AlertCircle, Download, Upload, Loader2, Tags, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CANONICAL_TAGS, getLedger, setEntryTags, type CanonicalTag } from '@/lib/mastery';
import { backfillProblemTags } from '@/lib/gemini';

export default function SettingsPage() {
  const {
    leetcodeUsername,
    geminiApiKey,
    powerLevels,
    setLeetcodeUsername,
    setGeminiApiKey,
    setPowerLevels,
    exportData,
    importData,
  } = useSessionStore();
  
  const [localUsername, setLocalUsername] = useState('');
  const [localKey, setLocalKey] = useState('');
  const [localPowerLevels, setLocalPowerLevels] = useState({ ...DEFAULT_POWER_LEVELS });
  const [saved, setSaved] = useState(false);

  // Backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ done: 0, total: 0 });
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [untaggedCount, setUntaggedCount] = useState(0);

  useEffect(() => {
    setLocalUsername(leetcodeUsername);
    setLocalKey(geminiApiKey);
    setLocalPowerLevels(powerLevels);
  }, [leetcodeUsername, geminiApiKey, powerLevels]);

  useEffect(() => {
    const ledger = getLedger();
    setUntaggedCount(ledger.filter(e => e.tags.length === 0).length);
  }, []);

  const handleSave = () => {
    setLeetcodeUsername(localUsername.trim());
    setGeminiApiKey(localKey.trim());
    setPowerLevels(localPowerLevels);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateLocalPowerLevel = (tag: CanonicalTag, nextLevel: number) => {
    setLocalPowerLevels((current) => ({
      ...current,
      [tag]: Math.max(0, Math.min(5, Math.round(nextLevel))),
    }));
  };

  const handleBackfill = async () => {
    const key = geminiApiKey || localKey.trim();
    if (!key) {
      setBackfillResult('Please save your API key first.');
      return;
    }

    const ledger = getLedger();
    const untagged = ledger.filter(e => e.tags.length === 0);

    if (untagged.length === 0) {
      setBackfillResult('All problems already have tags!');
      return;
    }

    setIsBackfilling(true);
    setBackfillResult(null);
    setBackfillProgress({ done: 0, total: untagged.length });

    try {
      const names = untagged.map(e => e.name);
      const tagMap = await backfillProblemTags(key, names, (done, total) => {
        setBackfillProgress({ done, total });
      });

      // Build a normalized lookup so AI name variations still match
      const normalizedTagMap = new Map<string, string[]>();
      for (const [name, tags] of Object.entries(tagMap)) {
        normalizedTagMap.set(name.toLowerCase().trim(), tags);
      }

      // Update the mastery ledger with the new tags
      let updated = 0;
      for (const entry of untagged) {
        const tags = normalizedTagMap.get(entry.name.toLowerCase().trim());
        if (tags && tags.length > 0) {
          try {
            if (setEntryTags(entry.id, tags)) {
              updated++;
            }
          } catch (e) {
            console.error(`Failed to update "${entry.name}":`, e);
          }
        }
      }

      setBackfillResult(`Done! Tagged ${updated}/${untagged.length} problems.`);
      setUntaggedCount(getLedger().filter(e => e.tags.length === 0).length);
    } catch (err: unknown) {
      setBackfillResult(`Error: ${err instanceof Error ? err.message : 'Unknown backfill error'}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-foreground/60 mt-1">Configure your integrations and preferences.</p>
      </header>

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-lc-brand" />
            <h2 className="text-lg font-semibold">LeetCode Profile</h2>
          </div>
          <p className="text-sm text-foreground/60">
            Enter your LeetCode username to fetch your latest stats and history. 
            Your profile must be public for this to work.
          </p>
          <input
            type="text"
            placeholder="e.g. neetcode"
            value={localUsername}
            onChange={(e) => setLocalUsername(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-lc-brand transition-colors"
          />
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-lc-easy" />
            <h2 className="text-lg font-semibold">Google Gemma API Integrations</h2>
          </div>
          <p className="text-sm text-foreground/60">
            LeetMentor uses Google&apos;s latest Gemma 3 27B open model to act as your personalized coding mentor. 
            You can get a free API key from Google AI Studio. We store this locally in your browser.
          </p>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-lc-brand transition-colors font-mono text-sm"
          />
          <div className="flex items-start gap-2 text-xs text-foreground/50 bg-background/50 p-4 rounded-lg border border-border/50">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Your API key is never sent to our servers. All API calls to Gemini are made directly from your browser.</p>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lc-brand" />
            <h2 className="text-lg font-semibold">Power Level Focus</h2>
          </div>
          <p className="text-sm text-foreground/60">
            Power Levels bias the schedule toward the patterns you want to sharpen.
            Reviews still stay due-first, but new problems will lean harder into the tags
            you push higher.
          </p>

          <div className="flex flex-wrap gap-2">
            {Object.entries(POWER_LEVEL_PRESETS).map(([presetName, presetLevels]) => (
              <button
                key={presetName}
                type="button"
                onClick={() => setLocalPowerLevels({ ...presetLevels })}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-lc-brand/30 hover:text-lc-brand"
              >
                {presetName}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {CANONICAL_TAGS.map((tag) => (
              <div
                key={tag}
                className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-4 rounded-xl border border-border bg-background/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground/85">{tag}</div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={localPowerLevels[tag]}
                    onChange={(e) => updateLocalPowerLevel(tag, parseInt(e.target.value, 10))}
                    className="mt-2 w-full accent-lc-brand"
                  />
                </div>
                <div className="rounded-lg border border-lc-brand/20 bg-lc-brand/10 px-3 py-2 text-center">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
                    Power
                  </div>
                  <div className="text-lg font-bold text-lc-brand">
                    {localPowerLevels[tag]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-xs text-foreground/55">
            `0` deprioritizes a tag, `2` is neutral, and `5` makes the scheduler strongly favor it for new problems.
          </div>
        </section>

        {/* Backfill Historical Tags */}
        <section className="bg-card border border-lc-brand/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-lc-brand" />
            <h2 className="text-lg font-semibold">Backfill Historical Tags</h2>
          </div>
          <p className="text-sm text-foreground/60">
            Use Gemma AI to categorize your historical problems that don&apos;t have topic tags yet.
            This updates your mastery ledger so the Breadth-First grid can track your progress.
          </p>
          {untaggedCount > 0 ? (
            <p className="text-sm text-lc-medium font-medium">
              {untaggedCount} problem{untaggedCount !== 1 ? 's' : ''} without tags
            </p>
          ) : (
            <p className="text-sm text-lc-easy font-medium">
              All problems are tagged! ✓
            </p>
          )}
          <button
            onClick={handleBackfill}
            disabled={isBackfilling || untaggedCount === 0}
            className={`w-full font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              isBackfilling
                ? 'bg-lc-brand/10 text-lc-brand border border-lc-brand/20'
                : untaggedCount === 0
                ? 'bg-card text-foreground/30 cursor-not-allowed border border-border'
                : 'bg-lc-brand/10 text-lc-brand border border-lc-brand/20 hover:bg-lc-brand/20'
            }`}
          >
            {isBackfilling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Categorizing... {backfillProgress.done}/{backfillProgress.total}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Categorize with AI
              </>
            )}
          </button>
          {backfillResult && (
            <p className={`text-sm font-medium ${
              backfillResult.startsWith('Error') ? 'text-lc-hard' : 'text-lc-easy'
            }`}>
              {backfillResult}
            </p>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-lc-medium" />
            <h2 className="text-lg font-semibold">Data Backup</h2>
          </div>
          <p className="text-sm text-foreground/60">
            Export all your sessions, schedules, and settings to a JSON file. Import a previous backup to restore your data.
          </p>
          <div className="flex gap-3">
            <button
              onClick={exportData}
              className="flex-1 bg-lc-easy/10 text-lc-easy border border-lc-easy/20 font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-lc-easy/20 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export JSON
            </button>
            <label className="flex-1 bg-lc-medium/10 text-lc-medium border border-lc-medium/20 font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-lc-medium/20 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              Import JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        importData(ev.target.result as string);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            className="bg-foreground text-background font-semibold px-8 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Save className="w-5 h-5" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
