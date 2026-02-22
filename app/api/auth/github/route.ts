import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = AUTH_CONFIG.github.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'GitHub integration not configured. Add GITHUB_CLIENT_ID to Secret Manager.',
          setup: 'https://github.com/settings/developers',
        },
        { status: 503 }
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.github.redirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      scope: 'user:email read:user',
      state: Math.random().toString(36).substring(7),
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(new URL(authUrl));
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get GitHub auth URL' },
      { status: 500 }
    );
  }
}
