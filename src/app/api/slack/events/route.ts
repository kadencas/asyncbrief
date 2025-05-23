import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Handle Slack's initial URL verification
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle message events
  if (body.event?.type === 'message') {
    console.log('New message event:', body.event);

    // Save to database or forward to AI summarizer here
  }

  return NextResponse.json({ ok: true });
}