"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Type Definitions ---
type SlackMessage = { text: string; user: string; ts: string };
type ActionItem = { task: string; suggestedOwner: string | null };
type Sentiment = { score: number; summary: string };
type FlaggedMessage = { ts: string; reason: string };

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
  const [miscommunications, setMiscommunications] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [msgsRes, summaryRes, itemsRes, sentimentRes, miscommsRes] = await Promise.all([
        fetch("/api/slack/messages"),
        fetch("/api/slack/summary"),
        fetch("/api/slack/actionItems"),
        fetch("/api/slack/sentiment"),
        fetch("/api/slack/miscommunications"),
      ]);

      const msgs = await msgsRes.json();
      setMessages(msgs || []);
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary || "No summary available.");
      const aiItems = await itemsRes.json();
      setActionItems(aiItems.actionItems || []);
      const sentimentData = await sentimentRes.json();
      setSentiment(sentimentData.sentiment || null);
      setLastUpdated(new Date().toLocaleString());

      const miscommsData = await miscommsRes.json();
      const flaggedMap = new Map<string, string>();
      if (miscommsData.flaggedMessages) {
        miscommsData.flaggedMessages.forEach((msg: FlaggedMessage) => {
          flaggedMap.set(msg.ts, msg.reason);
        });
      }
      setMiscommunications(flaggedMap);
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { messages, summary, actionItems, sentiment, miscommunications, isLoading, lastUpdated, refresh: fetchAll };
}

// --- Main App Component ---
export default function App() {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-gray-900 text-white p-4 flex-shrink-0">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">AsyncBrief</h1>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
            <a href="#" className="truncate p-2 rounded bg-gray-700 text-white">Dashboard</a>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-50 p-4 overflow-y-auto">
          <DashboardPage />
        </main>
      </div>
    </TooltipProvider>
  );
}

// --- Dashboard Page Component ---
function DashboardPage() {
  const { messages, summary, actionItems, sentiment, miscommunications, isLoading, lastUpdated, refresh } = useSlackAnalysis();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const s = new Set(prev);
      if (s.has(i)) {
        s.delete(i);
      } else {
        s.add(i);
      }
      return s;
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-medium">Overview</h2>
          {lastUpdated && !isLoading && <p className="text-xs text-gray-600">Last updated: {lastUpdated}</p>}
        </div>
        <Button onClick={refresh} disabled={isLoading}>{isLoading ? "Refreshing..." : "Refresh"}</Button>
      </div>
      
      {isLoading ? <p>Loading analysis...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left / wider column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Digest</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{summary}</p></CardContent>
            </Card>

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
                            <li className={`py-2 px-3 transition-colors ${reason ? 'bg-amber-100' : ''}`}>
                              <div className="text-sm">{m.text}</div>
                              <div className="text-xs text-gray-500 flex justify-between mt-1">
                                <span>{m.user}</span>
                                <span>{formatTime(m.ts)}</span>
                              </div>
                            </li>
                          </TooltipTrigger>
                          {reason && (<TooltipContent><p className="max-w-xs">💡 AI Suggestion: {reason}</p></TooltipContent>)}
                        </Tooltip>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right / compact column */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center justify-between">Sentiment {sentiment && <span className="ml-1">{getEmoji(sentiment.score)}</span>}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {sentiment ? (
                  <>
                    <div className="text-sm font-medium">{sentiment.score}/10</div>
                    <div className="text-xs text-gray-600">{sentiment.summary}</div>
                  </>
                ) : <div className="text-xs text-gray-500">No sentiment data.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Action Items</CardTitle></CardHeader>
              <CardContent className="p-2">
                {actionItems.length > 0 ? (
                  <div className="space-y-2">
                    {actionItems.map((it, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Checkbox id={`ai-${i}`} checked={checked.has(i)} onCheckedChange={() => toggle(i)}/>
                        <div className="flex-1">
                          <Label htmlFor={`ai-${i}`} className={`${checked.has(i) ? "line-through text-gray-400" : "text-gray-800"}`}>{it.task}</Label>
                          <div className="text-xs text-gray-500 mt-0.5">{it.suggestedOwner ? `Owner: ${it.suggestedOwner}` : "Unassigned"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-xs text-gray-500">No action items.</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}