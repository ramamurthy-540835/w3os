import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('w3-auth');

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with Google' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;
    const { id } = await params;
    const messageId = id;

    // Fetch full message
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch email' },
        { status: response.status }
      );
    }

    const message = await response.json();
    const headers = message.payload?.headers || [];

    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const to = headers.find((h: any) => h.name === 'To')?.value || '';
    const subject =
      headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // Extract body
    let body = '';
    if (message.payload?.parts) {
      const textPart = message.payload.parts.find(
        (p: any) => p.mimeType === 'text/plain'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString(
        'utf-8'
      );
    }

    return NextResponse.json({ from, to, subject, date, body });
  } catch (error: any) {
    console.error('Gmail detail fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch email details' },
      { status: 500 }
    );
  }
}
