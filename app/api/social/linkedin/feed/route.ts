import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
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

    // Fetch user profile
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'LinkedIn access failed' },
        { status: profileResponse.status }
      );
    }

    const profile = await profileResponse.json();

    // For LinkedIn, we can't easily fetch the feed with v2 API
    // Instead, return the profile and a message about limitations
    return NextResponse.json({
      profile: {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      message: 'LinkedIn API v2 has limitations for feed access. Use the web browser for full functionality.',
    });
  } catch (error: any) {
    console.error('LinkedIn fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch LinkedIn profile' },
      { status: 500 }
    );
  }
}
