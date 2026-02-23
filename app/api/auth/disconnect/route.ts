import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign out / Clear auth for all or specific provider
 * POST /api/auth/disconnect
 * Body: { provider?: string } - if provider is specified, only disconnect that provider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = body.provider;

    const response = NextResponse.json({
      success: true,
      message: provider
        ? `Disconnected from ${provider}`
        : 'Signed out successfully',
    });

    // Clear auth cookies
    const cookieNames = [
      'w3-auth-google',
      'w3-auth-github',
      'w3-auth-x',
      'w3-auth-linkedin',
      'w3-auth-facebook',
    ];

    if (provider) {
      // Clear specific provider
      const providerCookieMap: Record<string, string> = {
        google: 'w3-auth-google',
        github: 'w3-auth-github',
        x: 'w3-auth-x',
        linkedin: 'w3-auth-linkedin',
        facebook: 'w3-auth-facebook',
      };
      const cookieName = providerCookieMap[provider];
      if (cookieName) {
        response.cookies.delete(cookieName);
      }
    } else {
      // Clear all cookies
      cookieNames.forEach((name) => response.cookies.delete(name));
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sign out' },
      { status: 500 }
    );
  }
}
