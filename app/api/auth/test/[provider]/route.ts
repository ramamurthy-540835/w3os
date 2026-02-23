import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Get auth token from cookies
    const authToken = req.cookies.get(`auth-${provider}-token`)?.value;

    if (!authToken) {
      return NextResponse.json(
        { valid: false, error: 'No auth token found. Please connect first.' },
        { status: 401 }
      );
    }

    // Test different providers
    let testUrl: string;
    let headers: Record<string, string>;

    switch (provider.toLowerCase()) {
      case 'google':
        testUrl = 'https://www.googleapis.com/oauth2/v1/userinfo';
        headers = {
          Authorization: `Bearer ${authToken}`,
        };
        break;

      case 'x':
        testUrl = 'https://api.twitter.com/2/users/me';
        headers = {
          Authorization: `Bearer ${authToken}`,
        };
        break;

      case 'linkedin':
        testUrl = 'https://api.linkedin.com/v2/userinfo';
        headers = {
          Authorization: `Bearer ${authToken}`,
        };
        break;

      case 'github':
        testUrl = 'https://api.github.com/user';
        headers = {
          Authorization: `Bearer ${authToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        };
        break;

      case 'facebook':
        testUrl = `https://graph.facebook.com/me?access_token=${authToken}`;
        headers = {};
        break;

      default:
        return NextResponse.json(
          { error: `Unknown provider: ${provider}` },
          { status: 400 }
        );
    }

    // Make test request
    const response = await fetch(testUrl, {
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          valid: false,
          error: `API returned ${response.status}: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      valid: true,
      provider,
      user: data,
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
