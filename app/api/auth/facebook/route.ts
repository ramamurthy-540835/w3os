import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = AUTH_CONFIG.facebook.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Facebook integration not configured. Add FACEBOOK_CLIENT_ID to Secret Manager.',
          setup: 'https://developers.facebook.com/apps',
        },
        { status: 503 }
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.facebook.redirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      scope: 'email public_profile',
      state: Math.random().toString(36).substring(7),
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

    return NextResponse.redirect(new URL(authUrl));
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get Facebook auth URL' },
      { status: 500 }
    );
  }
}
