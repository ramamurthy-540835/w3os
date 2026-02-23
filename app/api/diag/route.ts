import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    node_env: process.env.NODE_ENV,
    secrets_loaded: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ LOADED' : '❌ MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ LOADED' : '❌ MISSING',
      X_CLIENT_ID: process.env.X_CLIENT_ID ? '✅ LOADED' : '❌ MISSING',
      X_CLIENT_SECRET: process.env.X_CLIENT_SECRET ? '✅ LOADED' : '❌ MISSING',
      LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? '✅ LOADED' : '❌ MISSING',
      LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? '✅ LOADED' : '❌ MISSING',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? '✅ LOADED' : '❌ MISSING',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? '✅ LOADED' : '❌ MISSING',
    },
    auth_config_x: {
      clientId: process.env.X_CLIENT_ID || 'MISSING',
      clientSecret: process.env.X_CLIENT_SECRET ? '***' : 'MISSING',
      redirectUri: 'https://w3-1035117862188.us-central1.run.app/api/auth/x/callback',
    }
  });
}
