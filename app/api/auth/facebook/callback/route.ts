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

    const REDIRECT_URI = AUTH_CONFIG.facebook.redirectUri;

    // Exchange code for token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Token+exchange+failed`, AUTH_CONFIG.baseUrl)
      );
    }

    // Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
    );

    const userData = await userResponse.json();

    if (!userResponse.ok || userData.error) {
      console.error('User info fetch failed:', userData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Failed+to+get+user+info`, AUTH_CONFIG.baseUrl)
      );
    }

    const authData = {
      email: userData.email,
      name: userData.name,
      picture: userData.picture?.data?.url || '',
      accessToken: tokenData.access_token,
      provider: 'facebook',
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
            provider: 'facebook',
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

    response.cookies.set('w3-auth-facebook', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log(`✓ Facebook user logged in: ${userData.email}`);

    return response;
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?auth_error=Authentication+failed`, AUTH_CONFIG.baseUrl)
    );
  }
}
