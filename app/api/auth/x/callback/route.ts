import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    console.log('=== X CALLBACK START ===');
    console.log('URL:', req.url);
    console.log('Cookies available:', req.cookies.getAll().map(c => c.name).join(', '));

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');
    const errorDescription = req.nextUrl.searchParams.get('error_description');

    console.log('Code present:', !!code);
    console.log('Error:', error);
    console.log('Error description:', errorDescription);

    if (error) {
      console.error('X OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error + ': ' + errorDescription)}`, AUTH_CONFIG.baseUrl)
      );
    }

    if (!code) {
      console.error('No code provided');
      return NextResponse.redirect(
        new URL('/?auth_error=No+code+provided', AUTH_CONFIG.baseUrl)
      );
    }

    const REDIRECT_URI = AUTH_CONFIG.x.redirectUri;
    console.log('REDIRECT_URI:', REDIRECT_URI);

    const codeVerifier = req.cookies.get('oauth-code-verifier')?.value;
    console.log('Code verifier present:', !!codeVerifier);

    if (!codeVerifier) {
      console.error('Code verifier missing! This might be a cookie/session issue');
      return NextResponse.redirect(
        new URL('/?auth_error=Session+expired+or+cookie+lost', AUTH_CONFIG.baseUrl)
      );
    }

    // Exchange code for token using Basic auth (Twitter requirement)
    const clientId = AUTH_CONFIG.x.clientId || '';
    const clientSecret = AUTH_CONFIG.x.clientSecret || '';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log('Exchanging code for token...');
    console.log('Client ID present:', !!clientId);
    console.log('Client Secret present:', !!clientSecret);

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response body:', JSON.stringify(tokenData, null, 2));

    if (!tokenResponse.ok || tokenData.error) {
      console.error('X token exchange FAILED:', {
        status: tokenResponse.status,
        error: tokenData.error,
        error_description: tokenData.error_description,
      });
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(tokenData.error || 'Token exchange failed')}`, AUTH_CONFIG.baseUrl)
      );
    }

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.data) {
      console.error('User info fetch failed:', userData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Failed+to+get+user+info`, AUTH_CONFIG.baseUrl)
      );
    }

    const authData = {
      email: `${userData.data.username}@twitter.com`,
      name: userData.data.name,
      picture: userData.data.profile_image_url || '',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      provider: 'x',
    };

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
            provider: 'x',
            user: ${JSON.stringify(authData)}
          }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>
      <p>Authenticating... Please wait.</p>
    </body>
    </html>
    `;

    const response = new NextResponse(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

    response.cookies.set('w3-auth-x', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log(`✓ X user logged in: ${userData.data.username}`);

    return response;
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?auth_error=Authentication+failed`, AUTH_CONFIG.baseUrl)
    );
  }
}
