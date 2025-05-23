"use client";

import { useEffect, useState } from 'react';

interface SlackMessage {
  text: string;
  user: string;
  ts: string;
}

export default function DashboardLayout() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    fetch('/api/slack/summary')
      .then(res => res.json())
      .then(data => setSummary(data.summary));
  }, []);

  useEffect(() => {
    // Fetch real messages from Supabase-connected API
    fetch('/api/slack/messages')
      .then((res) => res.json())
      .then(setMessages);
  }, []);

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

        <div className="bg-blue-50 p-4 rounded-lg shadow col-span-3 mb-6">
          <h3 className="font-semibold text-lg mb-2">Summary</h3>
          <p className="text-gray-700">{summary || 'Loading summary...'}</p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow col-span-3">
            <h3 className="font-semibold text-lg mb-2">Recent Slack Messages</h3>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {messages.length === 0 && <p className="text-gray-400">No messages yet.</p>}
              {messages.map((msg, idx) => (
                <li key={idx} className="border-b pb-2">
                  <span className="block text-sm text-gray-800">{msg.text}</span>
                  <span className="block text-xs text-gray-500">User: {msg.user} • Time: {new Date(parseFloat(msg.ts) * 1000).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
