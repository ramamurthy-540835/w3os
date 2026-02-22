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

    const REDIRECT_URI = AUTH_CONFIG.github.redirectUri;

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Token+exchange+failed`, AUTH_CONFIG.baseUrl)
      );
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData);
      return NextResponse.redirect(
        new URL(`/?auth_error=Failed+to+get+user+info`, AUTH_CONFIG.baseUrl)
      );
    }

    // Get user email (may not be public)
    let email = userData.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const emails = await emailResponse.json();
      if (Array.isArray(emails) && emails.length > 0) {
        email = emails.find((e: any) => e.primary)?.email || emails[0].email;
      }
    }

    const authData = {
      email: email || `${userData.login}@github.com`,
      name: userData.name || userData.login,
      picture: userData.avatar_url,
      accessToken: tokenData.access_token,
      provider: 'github',
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
            provider: 'github',
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

    response.cookies.set('w3-auth-github', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log(`✓ GitHub user logged in: ${email}`);

    return response;
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?auth_error=Authentication+failed`, AUTH_CONFIG.baseUrl)
    );
  }
}
