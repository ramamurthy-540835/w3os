import { NextRequest, NextResponse } from 'next/server';
import { getConnectedProviders, getPrimaryProvider } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const connectedProviders = await getConnectedProviders();
    const primaryProvider = await getPrimaryProvider();

    // Build response
    const providers: Record<string, any> = {};
    for (const [provider, data] of Object.entries(connectedProviders)) {
      if (data.connected && data.user) {
        providers[provider] = {
          connected: true,
          name: data.user.name,
          email: data.user.email,
          picture: data.user.picture,
        };
      } else {
        providers[provider] = { connected: false };
      }
    }

    return NextResponse.json({
      providers,
      primaryProvider: primaryProvider?.provider || null,
      user: primaryProvider?.user || null,
      isLoggedIn: !!primaryProvider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get auth status', isLoggedIn: false },
      { status: 500 }
    );
  }
}
