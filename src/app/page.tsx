"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Type Definitions ---
type SlackMessage = { text: string; user: string; ts: string };
type ActionItem = { task: string; suggestedOwner: string | null };
type Sentiment = { score: number; summary:string };
type FlaggedMessage = { ts: string; reason: string };

const NAV = ["Dashboard", "Settings"];

const formatTime = (ts: string) => new Date(parseFloat(ts) * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const getEmoji = (score: number) =>
  score >= 8 ? "😄" : score >= 6 ? "🙂" : score >= 4 ? "😐" : "😟";

// --- Custom Hook for Data Fetching ---
function useSlackAnalysis() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  // --- START: Added state for miscommunications ---
  const [miscommunications, setMiscommunications] = useState<Map<string, string>>(new Map());
  // --- END: Added state for miscommunications ---

  const fetchAll = useCallback(async () => {
    try {
      // --- START: Added miscommunications endpoint to fetch ---
      const [msgsRes, summaryRes, itemsRes, sentimentRes, miscommsRes] = await Promise.all([
        fetch("/api/slack/messages"),
        fetch("/api/slack/summary"),
        fetch("/api/slack/actionItems"),
        fetch("/api/slack/sentiment"),
        fetch("/api/slack/miscommunications"),
      ]);
      // --- END: Added miscommunications endpoint to fetch ---

      // Process all responses
      const msgs = await msgsRes.json();
      setMessages(msgs || []);
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary || "No summary available.");
      const aiItems = await itemsRes.json();
      setActionItems(aiItems.actionItems || []);
      const sentimentData = await sentimentRes.json();
      setSentiment(sentimentData.sentiment || null);
      setLastUpdated(new Date().toLocaleString());

      // --- START: Process and store miscommunication data ---
      const miscommsData = await miscommsRes.json();
      const flaggedMap = new Map<string, string>();
      if (miscommsData.flaggedMessages) {
        miscommsData.flaggedMessages.forEach((msg: FlaggedMessage) => {
          flaggedMap.set(msg.ts, msg.reason);
        });
      }
      setMiscommunications(flaggedMap);
      // --- END: Process and store miscommunication data ---

    } catch (e) {
      console.error("Fetch error", e);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- START: Added miscommunications to return object ---
  return { messages, summary, actionItems, sentiment, miscommunications, lastUpdated, refresh: fetchAll };
  // --- END: Added miscommunications to return object ---
}


// --- Main Dashboard Component ---
export default function DashboardLayout() {
  const { messages, summary, actionItems, sentiment, miscommunications, lastUpdated, refresh } =
    useSlackAnalysis();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setChecked((prev) => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });

  return (
    <TooltipProvider> {/* Required for Tooltips to work */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-gray-900 text-white p-4 flex-shrink-0">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">AsyncBrief</h1>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
            {NAV.map((n) => (
              <a key={n} href="#" className="truncate text-gray-300 hover:text-white">{n}</a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-gray-50 p-4 overflow-y-auto">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-2xl font-medium">Overview</h2>
              {lastUpdated && (<p className="text-xs text-gray-600">Last updated: {lastUpdated}</p>)}
            </div>
            <div className="flex gap-2">
              <Button onClick={refresh}>Refresh</Button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left / wider column */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Digest</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{summary}</p></CardContent>
              </Card>

              {/* --- START: Modified "Recent Slack" Card --- */}
              <Card>
                <CardHeader><CardTitle className="text-base">Recent Slack</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-64">
                    <ul className="divide-y">
                      {messages.map((m) => {
                        const reason = miscommunications.get(m.ts);
                        return (
                          <Tooltip key={m.ts} delayDuration={100}>
                            <TooltipTrigger asChild>
                              <li className={`py-2 px-3 transition-colors ${
                                reason ? 'bg-amber-100 border-l-4 border-amber-400' : ''
                              }`}>
                                <div className="text-sm">{m.text}</div>
                                <div className="text-xs text-gray-500 flex justify-between mt-1">
                                  <span>{m.user}</span>
                                  <span>{formatTime(m.ts)}</span>
                                </div>
                              </li>
                            </TooltipTrigger>
                            {reason && (
                              <TooltipContent>
                                <p className="max-w-xs">💡 AI Suggestion: {reason}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
              {/* --- END: Modified "Recent Slack" Card --- */}
            </div>

            {/* Right / compact column */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Project {sentiment && <span className="ml-1">{getEmoji(sentiment.score)}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {sentiment ? (
                    <>
                      <div className="text-sm font-medium">{sentiment.score}/10</div>
                      <div className="text-xs text-gray-600">{sentiment.summary}</div>
                    </>
                  ) : (<div className="text-xs text-gray-500">No sentiment data.</div>)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Action Items</CardTitle></CardHeader>
                <CardContent className="p-2">
                  {actionItems.length ? (
                    <div className="space-y-2">
                      {actionItems.map((it, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Checkbox id={`ai-${i}`} checked={checked.has(i)} onCheckedChange={() => toggle(i)}/>
                          <div className="flex-1">
                            <div className={`${checked.has(i) ? "line-through text-gray-400" : "text-gray-800"}`}>
                              {it.task}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {it.suggestedOwner ? `Owner: ${it.suggestedOwner}` : "Unassigned"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<div className="text-xs text-gray-500">No action items.</div>)}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}