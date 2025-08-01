"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define our data structures
interface SlackMessage {
  text: string;
  user: string;
  ts: string;
}

interface ActionItem {
  task: string;
  suggestedOwner: string | null;
}

interface Sentiment {
  score: number;
  summary: string;
}

// Helper function to get an emoji based on sentiment score
const getSentimentEmoji = (score: number) => {
  if (score >= 8) return '😄';
  if (score >= 6) return '🙂';
  if (score >= 4) return '😐';
  return '😟';
};

export default function DashboardLayout() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const handleCheckboxChange = (index: number) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(index)) newCheckedItems.delete(index);
    else newCheckedItems.add(index);
    setCheckedItems(newCheckedItems);
  };

  const fetchAnalysisData = () => {
    // Fetch summary
    fetch('/api/slack/summary')
      .then((res) => res.json())
      .then((data) => {
        setSummary(data.summary || 'No summary available.');
        setLastUpdated(new Date().toLocaleString());
      });

    // Fetch action items with owners
    fetch('/api/slack/actionItems')
      .then((res) => res.json())
      .then((data) => {
        setActionItems(data.actionItems || []);
        setCheckedItems(new Set());
      });
      
    // Fetch sentiment analysis
    fetch('/api/slack/sentiment')
      .then((res) => res.json())
      .then((data) => {
        setSentiment(data.sentiment || null);
      });
  };

  useEffect(() => {
    fetch('/api/slack/messages')
      .then((res) => res.json())
      .then(setMessages);
    fetchAnalysisData();
  }, []);

  const regenerateAnalysis = () => {
    fetchAnalysisData();
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4 space-y-6">
        <h1 className="text-2xl font-bold">AsyncBrief</h1>
        <nav className="space-y-2">
          <a href="#" className="block text-gray-300 hover:text-white">Dashboard</a>
          <a href="#" className="block text-gray-300 hover:text-white">Slack</a>
          <a href="#" className="block text-gray-300 hover:text-white">GitHub</a>
          <a href="#" className="block text-gray-300 hover:text-white">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-6 overflow-y-scroll">
        <header className="mb-6">
          <h2 className="text-3xl font-semibold">Dashboard Overview</h2>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Recent Messages Card */}
          <Card className="col-span-3">
            <CardHeader><CardTitle>Recent Slack Messages</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-80 w-full pr-4">
                {messages.map((msg, idx) => (
                  <li key={idx} className="list-none border-b pb-2 mb-2">
                    <span className="block text-sm text-gray-800">{msg.text}</span>
                    <span className="block text-xs text-gray-500">
                      User: {msg.user} • Time: {new Date(parseFloat(msg.ts) * 1000).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Digest Card */}
          <Card className="col-span-3 xl:col-span-2">
            <CardHeader><CardTitle>AI-Powered Digest</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
              <p className="text-xs text-gray-500 mt-2">Last updated: {lastUpdated}</p>
              <Button onClick={regenerateAnalysis} className="mt-4">Regenerate Analysis</Button>
            </CardContent>
          </Card>
          
          {/* Container for the right-hand column cards */}
          <div className="col-span-3 xl:col-span-1 space-y-6">
            {/* Sentiment Card (New) */}
            <Card>
              <CardHeader><CardTitle>Sentiment Check</CardTitle></CardHeader>
              <CardContent>
                {sentiment ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{getSentimentEmoji(sentiment.score)}</span>
                    <div>
                      <p className="font-bold text-lg">{sentiment.score}/10</p>
                      <p className="text-sm text-gray-600">{sentiment.summary}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No sentiment analysis available.</p>
                )}
              </CardContent>
            </Card>

            {/* Action Items Card (Modified) */}
            <Card>
              <CardHeader><CardTitle>Action Items 📝</CardTitle></CardHeader>
              <CardContent>
                {actionItems.length > 0 ? (
                  <div className="space-y-4">
                    {actionItems.map((item, idx) => (
                      <div key={idx} className="border-b pb-2 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <Checkbox id={`action-${idx}`} checked={checkedItems.has(idx)} onCheckedChange={() => handleCheckboxChange(idx)} className="mt-1"/>
                          <Label htmlFor={`action-${idx}`} className={`text-sm leading-tight ${checkedItems.has(idx) ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.task}
                          </Label>
                        </div>
                        <div className="pl-7 pt-1 text-xs text-gray-500 font-medium">
                          👤 Owner: {item.suggestedOwner || 'Unassigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No action items identified.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}