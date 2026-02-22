/**
 * W3 Authentication Service
 * Simple OAuth2 provider management with lazy loading
 * Supports: Google, X, LinkedIn, Facebook, GitHub
 */

import { AUTH_CONFIG } from './auth-config';

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface AuthToken {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: string;
}

class AuthService {
  private providers: Map<string, OAuthProvider> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private users: Map<string, AuthUser> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const baseUrl = process.env.NEXTAUTH_URL || AUTH_CONFIG.baseUrl;

    // Google OAuth2
    if (process.env.GOOGLE_CLIENT_ID) {
      this.registerProvider({
        id: 'google',
        name: 'Google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${baseUrl}/api/auth/callback/google`,
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/documents',
        ],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
      });
    }

    // X (Twitter) OAuth2
    if (process.env.X_CLIENT_ID) {
      this.registerProvider({
        id: 'x',
        name: 'X',
        clientId: process.env.X_CLIENT_ID,
        clientSecret: process.env.X_CLIENT_SECRET,
        redirectUri: `${baseUrl}/api/auth/callback/x`,
        scopes: ['tweet.read', 'users.read', 'tweet.write'],
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      });
    }

    // LinkedIn OAuth2
    if (process.env.LINKEDIN_CLIENT_ID) {
      this.registerProvider({
        id: 'linkedin',
        name: 'LinkedIn',
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: `${baseUrl}/api/auth/callback/linkedin`,
        scopes: ['openid', 'profile', 'email'],
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      });
    }

    // Facebook OAuth2
    if (process.env.FACEBOOK_CLIENT_ID) {
      this.registerProvider({
        id: 'facebook',
        name: 'Facebook',
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        redirectUri: `${baseUrl}/api/auth/callback/facebook`,
        scopes: ['email', 'public_profile'],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      });
    }

    // GitHub OAuth2
    if (process.env.GITHUB_CLIENT_ID) {
      this.registerProvider({
        id: 'github',
        name: 'GitHub',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: `${baseUrl}/api/auth/callback/github`,
        scopes: ['repo', 'user:email', 'read:user'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
      });
    }
  }

  registerProvider(provider: OAuthProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): OAuthProvider | undefined {
    return this.providers.get(id);
  }

  getAvailableProviders(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  generateAuthUrl(providerId: string, state: string): string | null {
    const provider = this.getProvider(providerId);
    if (!provider) return null;

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: provider.scopes.join(' '),
      response_type: 'code',
      state,
    });

    return `${provider.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    providerId: string,
    code: string
  ): Promise<AuthToken | null> {
    const provider = this.getProvider(providerId);
    if (!provider) return null;

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: provider.clientId,
          client_secret: provider.clientSecret || '',
          redirect_uri: provider.redirectUri,
        }).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Token exchange failed for ${providerId}:`, data);
        return null;
      }

      const token: AuthToken = {
        provider: providerId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        scopes: provider.scopes,
      };

      this.tokens.set(providerId, token);
      return token;
    } catch (error) {
      console.error(`Token exchange error for ${providerId}:`, error);
      return null;
    }
  }

  getToken(providerId: string): AuthToken | undefined {
    return this.tokens.get(providerId);
  }

  setToken(providerId: string, token: AuthToken) {
    this.tokens.set(providerId, token);
  }

  getUser(providerId: string): AuthUser | undefined {
    return this.users.get(providerId);
  }

  setUser(providerId: string, user: AuthUser) {
    this.users.set(providerId, user);
  }

  isTokenExpired(token: AuthToken): boolean {
    if (!token.expiresAt) return false;
    return Date.now() > token.expiresAt;
  }

  async refreshToken(providerId: string): Promise<AuthToken | null> {
    const provider = this.getProvider(providerId);
    const token = this.getToken(providerId);

    if (!provider || !token || !token.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret || '',
        }).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Token refresh failed for ${providerId}:`, data);
        return null;
      }

      const newToken: AuthToken = {
        ...token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || token.refreshToken,
        expiresAt: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
      };

      this.tokens.set(providerId, newToken);
      return newToken;
    } catch (error) {
      console.error(`Token refresh error for ${providerId}:`, error);
      return null;
    }
  }

  disconnect(providerId: string) {
    this.tokens.delete(providerId);
    this.users.delete(providerId);
  }

  getAllConnections() {
    return Array.from(this.providers.keys()).map((id) => ({
      provider: id,
      connected: this.tokens.has(id),
      user: this.users.get(id),
    }));
  }
}

// Export singleton instance
export const authService = new AuthService();
