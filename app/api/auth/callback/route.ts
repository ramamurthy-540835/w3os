import { NextRequest, NextResponse } from 'next/server';
import { authService, AuthUser } from '@/lib/auth-service';

/**
 * Universal OAuth2 callback handler
 * Handles callbacks from Google, X, LinkedIn, Facebook, GitHub
 *
 * Usage: /api/auth/callback?provider=google&code=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      return NextResponse.redirect(
        `${request.nextUrl.origin}?auth_error=${errorDescription}`
      );
    }

    // Validate parameters
    if (!provider || !code) {
      return NextResponse.json(
        { error: 'Missing provider or code' },
        { status: 400 }
      );
    }

    // Exchange code for token
    const token = await authService.exchangeCodeForToken(provider, code);

    if (!token) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}?auth_error=Failed to exchange code for token`
      );
    }

    // Fetch user info based on provider
    const user = await fetchUserInfo(provider, token.accessToken);

    if (user) {
      authService.setUser(provider, user);
    }

    // Redirect to success page
    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set('auth_success', provider);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Fetch user information from provider
 */
async function fetchUserInfo(
  provider: string,
  accessToken: string
): Promise<AuthUser | null> {
  try {
    switch (provider) {
      case 'google': {
        const response = await fetch(
          'https://openidconnect.googleapis.com/v1/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json();
        return {
          id: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
          provider: 'google',
        };
      }

      case 'x': {
        const response = await fetch('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
          id: data.data.id,
          name: data.data.name,
          provider: 'x',
        };
      }

      case 'github': {
        const response = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
          id: data.id.toString(),
          email: data.email,
          name: data.name,
          picture: data.avatar_url,
          provider: 'github',
        };
      }

      case 'linkedin': {
        const response = await fetch(
          'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage))',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json();
        return {
          id: data.id,
          name: `${data.localizedFirstName} ${data.localizedLastName}`,
          provider: 'linkedin',
        };
      }

      case 'facebook': {
        const response = await fetch(
          'https://graph.facebook.com/me?fields=id,name,email,picture',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json();
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture?.data?.url,
          provider: 'facebook',
        };
      }

      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch user info for ${provider}:`, error);
    return null;
  }
}
