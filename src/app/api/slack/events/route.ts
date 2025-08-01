/**
 * This file recieves data from slack and stores it in supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Handle Slack's initial URL verification
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle message events
  if (body.event?.type === 'message') {
    const { text, user, ts, channel } = body.event;

    await supabase.from('slack_messages').insert([
      { text, user, ts, channel }
    ]);
  }

  return NextResponse.json({ ok: true });
}
