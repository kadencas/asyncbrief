import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data: messages, error } = await supabase
    .from('slack_messages')
    .select('text, user, ts')
    .order('ts', { ascending: true })
    .limit(50);

  if (error || !messages) {
    return NextResponse.json({ error: 'Could not fetch messages' }, { status: 500 });
  }

  const prompt = `
Summarize the following Slack conversation:

${messages.map(m => `- ${m.user}: ${m.text}`).join('\n')}
`;

  const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    }),
  });

  const result = await geminiResponse.json();
  const summary = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No summary available.';

  return NextResponse.json({ summary });
}