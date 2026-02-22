import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = AUTH_CONFIG.linkedin.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'LinkedIn integration not configured. Add LINKEDIN_CLIENT_ID to Secret Manager.',
          setup: 'https://www.linkedin.com/developers/apps',
        },
        { status: 503 }
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.linkedin.redirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

    return NextResponse.redirect(new URL(authUrl));
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get LinkedIn auth URL' },
      { status: 500 }
    );
  }
}
