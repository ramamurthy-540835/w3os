import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = AUTH_CONFIG.x.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'X (Twitter) integration not configured. Add X_CLIENT_ID to Secret Manager.',
          setup: 'https://developer.twitter.com/en/dashboard/apps',
        },
        { status: 503 }
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.x.redirectUri;

    // Generate PKCE challenge
    const codeVerifier = randomBytes(32).toString('hex');
    const challenge = Buffer.from(codeVerifier).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'tweet.read users.read offline.access',
      state: randomBytes(16).toString('hex'),
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    // Store code_verifier in session/cookie for callback
    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    const response = NextResponse.redirect(new URL(authUrl));
    response.cookies.set('oauth-code-verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get X auth URL' },
      { status: 500 }
    );
  }
}
