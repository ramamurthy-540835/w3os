import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('w3-auth-x');

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with X' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;

    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tweet text cannot be empty' },
        { status: 400 }
      );
    }

    if (text.length > 280) {
      return NextResponse.json(
        { error: 'Tweet exceeds 280 characters' },
        { status: 400 }
      );
    }

    // Post tweet
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to post tweet' },
        { status: response.status }
      );
    }

    const tweet = await response.json();

    return NextResponse.json({ success: true, tweet: tweet.data });
  } catch (error: any) {
    console.error('X post error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post tweet' },
      { status: 500 }
    );
  }
}
