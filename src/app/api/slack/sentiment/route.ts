// app/api/slack/sentiment/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data: messages, error } = await supabase
    .from('slack_messages')
    .select('text')
    .order('ts', { ascending: true })
    .limit(50);

  if (error || !messages) {
    return NextResponse.json({ error: 'Could not fetch messages' }, { status: 500 });
  }

  const prompt = `
You are a communication analyst AI. Analyze the overall sentiment of the following conversation.

Provide a response as a valid JSON object with two keys:
1.  "score": A numerical score from 1 (very negative) to 10 (very positive).
2.  "summary": A brief, one-sentence explanation for your score.

Do not include any introductory text. Your entire response must be only the JSON object.

Conversation to analyze:
${messages.map(m => m.text).join('\n')}
`;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API responded with status ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ sentiment: null });
    }
    
    const sentimentData = JSON.parse(rawText);
    return NextResponse.json({ sentiment: sentimentData });

  } catch (e) {
    return NextResponse.json({ error: 'Failed to analyze sentiment' }, { status: 500 });
  }
}