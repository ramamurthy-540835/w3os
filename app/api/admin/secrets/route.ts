import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json();

    // Whitelist of allowed secret names
    const ALLOWED_SECRETS = [
      'GEMINI_API_KEY',
      'SERPAPI_KEY',
      'YOUTUBE_API_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'X_CLIENT_ID',
      'X_CLIENT_SECRET',
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET',
      'FACEBOOK_CLIENT_ID',
      'FACEBOOK_CLIENT_SECRET',
    ];

    if (!ALLOWED_SECRETS.includes(key)) {
      return NextResponse.json(
        { error: 'Invalid secret name' },
        { status: 400 }
      );
    }

    if (!value || value.trim().length === 0) {
      return NextResponse.json(
        { error: 'Value cannot be empty' },
        { status: 400 }
      );
    }

    // Update in Google Secret Manager
    try {
      // Try to add new version to existing secret
      await execAsync(
        `echo -n "${value.replace(/"/g, '\\"')}" | gcloud secrets versions add ${key} --data-file=- --project=ctoteam 2>&1`
      );
    } catch (e) {
      // If secret doesn't exist, create it
      await execAsync(
        `echo -n "${value.replace(/"/g, '\\"')}" | gcloud secrets create ${key} --data-file=- --project=ctoteam 2>&1`
      );
    }

    // Also update the current process env so it takes effect immediately
    process.env[key] = value;

    return NextResponse.json({
      success: true,
      message: `${key} updated. Note: Full effect after next deployment.`,
    });
  } catch (e: any) {
    console.error('Secret update error:', e);
    return NextResponse.json(
      { error: e.message || 'Failed to update secret' },
      { status: 500 }
    );
  }
}
