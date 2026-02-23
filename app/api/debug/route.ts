import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    secrets: {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(0, 10) + '...' : 'MISSING',
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      X_CLIENT_ID: process.env.X_CLIENT_ID ? process.env.X_CLIENT_ID.slice(0, 10) + '...' : 'MISSING',
      X_CLIENT_SECRET: !!process.env.X_CLIENT_SECRET,
      LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? process.env.LINKEDIN_CLIENT_ID.slice(0, 10) + '...' : 'MISSING',
      LINKEDIN_CLIENT_SECRET: !!process.env.LINKEDIN_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.slice(0, 10) + '...' : 'MISSING',
      GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
      FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || 'MISSING',
      FACEBOOK_CLIENT_SECRET: !!process.env.FACEBOOK_CLIENT_SECRET,
    }
  });
}
