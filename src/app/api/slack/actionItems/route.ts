// app/api/slack/actionItems/route.ts (MODIFIED)

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
You are an expert project manager's assistant. Analyze the conversation and extract action items.

Respond with a valid JSON object containing a single key "actionItems", which holds an array of objects.
Each object must have two keys:
1.  "task": A string describing the concise, actionable task.
2.  "suggestedOwner": A string with the name of the user who is likely responsible, based on context or being directly mentioned. If no owner can be identified, this should be null.

Example response:
{
  "actionItems": [
    { "task": "Prepare the slide deck for the client meeting", "suggestedOwner": "Bob" },
    { "task": "Finalize the Q3 budget report", "suggestedOwner": "Alice" }
  ]
}

Conversation to analyze:
${messages.map(m => `${m.user}: ${m.text}`).join('\n')}
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
      return NextResponse.json({ actionItems: [] });
    }
    
    const actionItemsData = JSON.parse(rawText);
    return NextResponse.json(actionItemsData);

  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate action items' }, { status: 500 });
  }
}