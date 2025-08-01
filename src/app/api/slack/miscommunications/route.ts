// app/api/slack/miscommunications/route.ts

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
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Could not fetch messages' }, { status: 500 });
  }

  const prompt = `
You are an expert communication analyst AI. Your task is to review a Slack conversation and identify messages that represent potential miscommunications or ambiguities.

Look for the following patterns:
- Unanswered questions.
- Vague or non-committal language (e.g., "maybe," "I'll try," "soon").
- Potentially conflicting information or deadlines.
- Assumptions that haven't been confirmed.
- Unclear requests or action items.

For each message you identify, provide its unique timestamp ('ts') and a brief, one-sentence reason for flagging it.

Respond with a valid JSON object containing a single key "flaggedMessages", which holds an array of objects. Each object must have a "ts" and a "reason". If you find no potential miscommunications, return an empty array.

Example Response:
{
  "flaggedMessages": [
    { "ts": "1722527938.123456", "reason": "The term 'soon' is ambiguous and could lead to mismatched expectations about the deadline." },
    { "ts": "1722527945.789012", "reason": "This direct question to Bob was not answered in the subsequent messages." }
  ]
}

Conversation to analyze:
${messages.map(m => `[ts: ${m.ts}] ${m.user}: ${m.text}`).join('\n')}
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
      return NextResponse.json({ flaggedMessages: [] });
    }
    
    const analysisData = JSON.parse(rawText);
    return NextResponse.json(analysisData);

  } catch (e) {
    console.error("Failed to process Gemini miscommunication analysis:", e);
    return NextResponse.json({ error: 'Failed to analyze messages' }, { status: 500 });
  }
}