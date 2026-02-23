import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('w3-auth-linkedin');

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with LinkedIn' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;

    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post text cannot be empty' },
        { status: 400 }
      );
    }

    // LinkedIn UGC API - simplified for text posts
    // Note: LinkedIn API v2 requires specific payload structure
    const response = await fetch(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
        },
        body: JSON.stringify({
          author: `urn:li:person:${auth.id}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: text,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.detail || 'Failed to post to LinkedIn' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({ success: true, postId: result.id });
  } catch (error: any) {
    console.error('LinkedIn post error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post to LinkedIn' },
      { status: 500 }
    );
  }
}
