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
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// --- Type Definitions ---
type SlackMessage = { text: string; user: string; ts: string };
type ActionItem = { task: string; suggestedOwner: string | null };
type Sentiment = { score: number; summary: string };
type FlaggedMessage = { ts: string; reason: string };

const formatTime = (ts: string) => new Date(parseFloat(ts) * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const getEmoji = (score: number) => score >= 8 ? "😄" : score >= 6 ? "🙂" : score >= 4 ? "😐" : "😟";

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

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <aside className="w-56 bg-gray-900 text-white p-4 flex-shrink-0">
            <div className="mb-4"><h1 className="text-xl font-semibold">AsyncBrief</h1></div>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="#" onClick={() => setPage('dashboard')} className={`truncate p-2 rounded ${page === 'dashboard' ? 'bg-gray-700' : 'text-gray-300'} hover:bg-gray-700 hover:text-white`}>Dashboard</a>
              <a href="#" onClick={() => setPage('settings')} className={`truncate p-2 rounded ${page === 'settings' ? 'bg-gray-700' : 'text-gray-300'} hover:bg-gray-700 hover:text-white`}>Settings</a>
            </nav>
          </aside>
          <main className="flex-1 bg-gray-50 p-4 overflow-y-auto">
            {page === 'dashboard' ? <DashboardPage /> : <SettingsPage />}
          </main>
        </div>
      </TooltipProvider>
      <Toaster />
    </>
  );
}

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

const DEFAULT_PROMPTS = {
  summary: `You are an AI project manager. Summarize the key topics, decisions, and outcomes from the following Slack conversation. Be concise and clear.`,
  actionItems: `You are a project manager's assistant. Analyze the conversation and extract action items. Respond with a JSON object with an "actionItems" key, containing an array of objects. Each object needs a "task" and a "suggestedOwner". If no owner is clear, it should be null.`,
  sentiment: `Analyze the conversation's sentiment. Respond with a JSON object with a "sentiment" key, containing an object with a "score" (1-10) and a "summary" (one sentence).`,
  miscommunications: `You are a communication analyst. Identify messages that are ambiguous, have unanswered questions, or could lead to miscommunication. Respond with a JSON object with a "flaggedMessages" key, containing an array of objects with the message "ts" and a "reason".`
};
type PromptKeys = keyof typeof DEFAULT_PROMPTS;

function SettingsPage() {
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const { toast } = useToast();

  useEffect(() => {
    // This object now has a specific type, fixing the 'any' error.
    const loadedPrompts: { [key: string]: string } = {};
    for (const key in DEFAULT_PROMPTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_PROMPTS, key)) {
        const saved = localStorage.getItem(`prompt_${key}`);
        loadedPrompts[key] = saved || DEFAULT_PROMPTS[key as PromptKeys];
      }
    }
    setPrompts(loadedPrompts as typeof DEFAULT_PROMPTS);
  }, []);

  const handleSave = () => {
    Object.entries(prompts).forEach(([key, value]) => {
      localStorage.setItem(`prompt_${key}`, value);
    });
    toast({
      title: "Prompts Saved!",
      description: "Your custom instructions will be used on the next refresh.",
    });
  };

  const handleReset = (key: PromptKeys) => {
    setPrompts(prev => ({ ...prev, [key]: DEFAULT_PROMPTS[key] }));
  };

  const handlePromptChange = (key: PromptKeys, value: string) => {
    setPrompts(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-medium">Settings</h2>
        <p className="text-sm text-gray-600">Customize the instructions given to the AI for each feature.</p>
      </div>
      <div className="space-y-6">
        {Object.entries(prompts).map(([key, value]) => (
          <Card key={key}>
            <CardHeader><CardTitle className="capitalize">{key.replace(/([A-Z])/g, ' $1')} Prompt</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor={`prompt-${key}`}>AI Instructions</Label>
              <Textarea
                id={`prompt-${key}`}
                value={value}
                onChange={(e) => handlePromptChange(key as PromptKeys, e.target.value)}
                className="min-h-[120px] text-sm font-mono"
              />
              <Button variant="outline" size="sm" onClick={() => handleReset(key as PromptKeys)}>Reset to Default</Button>
            </CardContent>
          </Card>
        ))}
        <Button onClick={handleSave} size="lg">Save All Prompts</Button>
      </div>
    </div>
  );
}