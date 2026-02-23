import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    console.log('=== GMAIL API CALLED ===');
    console.log('All cookies available:', Array.from(cookieStore.getAll()).map(c => c.name).join(', '));

    const authCookie = cookieStore.get('w3-auth-google');
    console.log('w3-auth-google cookie found:', !!authCookie);

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with Google' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;

    // Fetch recent emails
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Gmail access failed. Re-login required.' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Fetch details for each message
    const emails = await Promise.all(
      (data.messages || [])
        .slice(0, 15)
        .map(async (msg: any) => {
          const detail = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const d = await detail.json();
          const headers = d.payload?.headers || [];
          return {
            id: msg.id,
            from:
              headers.find((h: any) => h.name === 'From')?.value || 'Unknown',
            subject:
              headers.find((h: any) => h.name === 'Subject')?.value ||
              '(no subject)',
            date: headers.find((h: any) => h.name === 'Date')?.value || '',
            snippet: d.snippet || '',
          };
        })
    );

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
