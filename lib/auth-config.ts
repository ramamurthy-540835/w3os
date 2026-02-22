/**
 * Centralized OAuth configuration for all auth providers
 * This ensures consistent redirect URIs across development and production
 */

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://w3-1035117862188.us-central1.run.app'
  : 'http://localhost:3000';

export const AUTH_CONFIG = {
  baseUrl: BASE_URL,

  google: {
    redirectUri: `${BASE_URL}/api/auth/google/callback`,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  github: {
    redirectUri: `${BASE_URL}/api/auth/github/callback`,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },

  x: {
    redirectUri: `${BASE_URL}/api/auth/x/callback`,
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  },

  linkedin: {
    redirectUri: `${BASE_URL}/api/auth/linkedin/callback`,
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },

  facebook: {
    redirectUri: `${BASE_URL}/api/auth/facebook/callback`,
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  },
};
