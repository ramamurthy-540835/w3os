import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

/**
 * Get available OAuth providers and their connection status
 * GET /api/auth/providers
 */
export async function GET(request: NextRequest) {
  try {
    const providers = authService.getAvailableProviders();
    const connections = authService.getAllConnections();

    return NextResponse.json({
      status: 'ok',
      availableProviders: providers.map((p) => ({
        id: p.id,
        name: p.name,
        connected: connections.find((c) => c.provider === p.id)?.connected || false,
      })),
      connections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get providers' },
      { status: 500 }
    );
  }
}

/**
 * Get OAuth login URL for a specific provider
 * POST /api/auth/providers/login
 * Body: { provider: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 }
      );
    }

    // Generate state token for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Get auth URL
    const authUrl = authService.generateAuthUrl(provider, state);

    if (!authUrl) {
      return NextResponse.json(
        { error: `Provider ${provider} not configured` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      provider,
      authUrl,
      state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}
