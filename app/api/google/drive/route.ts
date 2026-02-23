import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('w3-auth-google');

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with Google' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;

    // Get folderId from query params (default to root)
    const folderId = req.nextUrl.searchParams.get('folderId') || 'root';

    const query =
      folderId === 'root'
        ? "trashed=false and 'root' in parents"
        : `trashed=false and '${folderId}' in parents`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime%20desc&pageSize=50&fields=files(id,name,mimeType,modifiedTime,size,iconLink,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Drive access failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ files: data.files || [] });
  } catch (error: any) {
    console.error('Drive fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Drive files' },
      { status: 500 }
    );
  }
}
