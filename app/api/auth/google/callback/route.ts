import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, AUTH_CONFIG.baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?auth_error=No+code+provided', AUTH_CONFIG.baseUrl)
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.google.redirectUri;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Token+exchange+failed`, AUTH_CONFIG.baseUrl)
      );
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Failed+to+get+user+info`, AUTH_CONFIG.baseUrl)
      );
    }

    // Create response with auth cookie
    const authData = {
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      provider: 'google',
    };

    // Return HTML that posts message to opener and closes popup
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Success</title>
    </head>
    <body>
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-success',
            provider: 'google',
            user: ${JSON.stringify(authData)}
          }, '*');
          window.close();
        } else {
          // Fallback if not in popup
          window.location.href = '/';
        }
      </script>
      <p>Authenticating... Please wait.</p>
    </body>
    </html>
    `;

    // Set auth cookie with user info
    const response = new NextResponse(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

    response.cookies.set('w3-auth', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log(`✓ User logged in: ${userData.email}`);

    return response;
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?auth_error=Authentication+failed`, AUTH_CONFIG.baseUrl)
    );
  }
}
