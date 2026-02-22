import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = AUTH_CONFIG.google.clientId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Client ID not configured' },
        { status: 500 }
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.google.redirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(new URL(authUrl));
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get Google auth URL' },
      { status: 500 }
    );
  }
}
