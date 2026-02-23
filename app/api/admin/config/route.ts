import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      apis: {
        gemini: {
          configured: !!process.env.GEMINI_API_KEY,
          preview: process.env.GEMINI_API_KEY
            ? process.env.GEMINI_API_KEY.slice(0, 8) + '****' + process.env.GEMINI_API_KEY.slice(-4)
            : null,
        },
        serpapi: {
          configured: !!process.env.SERPAPI_KEY,
          preview: process.env.SERPAPI_KEY
            ? process.env.SERPAPI_KEY.slice(0, 6) + '****' + process.env.SERPAPI_KEY.slice(-3)
            : null,
        },
        youtube: {
          configured: !!process.env.YOUTUBE_API_KEY,
          preview: process.env.YOUTUBE_API_KEY
            ? process.env.YOUTUBE_API_KEY.slice(0, 8) + '****' + process.env.YOUTUBE_API_KEY.slice(-4)
            : null,
        },
      },
      oauth: {
        google: {
          configured: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'placeholder',
          needsSetup: process.env.GOOGLE_CLIENT_ID === 'placeholder',
          preview: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'placeholder'
            ? process.env.GOOGLE_CLIENT_ID.slice(0, 12) + '****' + process.env.GOOGLE_CLIENT_ID.slice(-4)
            : process.env.GOOGLE_CLIENT_ID === 'placeholder' ? '🔴 placeholder' : 'Not set',
        },
        github: {
          configured: !!process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== 'placeholder',
          needsSetup: process.env.GITHUB_CLIENT_ID === 'placeholder',
          preview: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== 'placeholder'
            ? process.env.GITHUB_CLIENT_ID.slice(0, 12) + '****' + process.env.GITHUB_CLIENT_ID.slice(-4)
            : process.env.GITHUB_CLIENT_ID === 'placeholder' ? '🔴 placeholder' : 'Not set',
        },
        x: {
          configured: !!process.env.X_CLIENT_ID && process.env.X_CLIENT_ID !== 'placeholder',
          needsSetup: process.env.X_CLIENT_ID === 'placeholder',
          preview: process.env.X_CLIENT_ID && process.env.X_CLIENT_ID !== 'placeholder'
            ? process.env.X_CLIENT_ID.slice(0, 12) + '****' + process.env.X_CLIENT_ID.slice(-4)
            : process.env.X_CLIENT_ID === 'placeholder' ? '🔴 placeholder' : 'Not set',
        },
        linkedin: {
          configured: !!process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_ID !== 'placeholder',
          needsSetup: process.env.LINKEDIN_CLIENT_ID === 'placeholder',
          preview: process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_ID !== 'placeholder'
            ? process.env.LINKEDIN_CLIENT_ID.slice(0, 12) + '****' + process.env.LINKEDIN_CLIENT_ID.slice(-4)
            : process.env.LINKEDIN_CLIENT_ID === 'placeholder' ? '🔴 placeholder' : 'Not set',
        },
        facebook: {
          configured: !!process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_ID !== 'placeholder',
          needsSetup: process.env.FACEBOOK_CLIENT_ID === 'placeholder',
          preview: process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_ID !== 'placeholder'
            ? process.env.FACEBOOK_CLIENT_ID.slice(0, 12) + '****' + process.env.FACEBOOK_CLIENT_ID.slice(-4)
            : process.env.FACEBOOK_CLIENT_ID === 'placeholder' ? '🔴 placeholder' : 'Not set',
        },
      },
      system: {
        url: process.env.NEXTAUTH_URL || 'https://w3-1035117862188.us-central1.run.app',
        model: process.env.AI_MODEL || 'gemini-2.0-flash',
        bucket: process.env.GCS_BUCKET || 'w3-os',
        project: process.env.GCS_PROJECT || 'ctoteam',
        nodeEnv: process.env.NODE_ENV || 'production',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch config' },
      { status: 500 }
    );
  }
}
