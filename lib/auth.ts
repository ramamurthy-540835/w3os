import { cookies } from 'next/headers';

export interface AuthData {
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  provider: string;
}

const PROVIDER_COOKIES = {
  google: 'w3-auth',
  github: 'w3-auth-github',
  x: 'w3-auth-x',
  linkedin: 'w3-auth-linkedin',
  facebook: 'w3-auth-facebook',
};

/**
 * Get all connected providers from cookies
 */
export async function getConnectedProviders(): Promise<
  Record<string, { connected: boolean; user?: AuthData }>
> {
  const cookieStore = await cookies();
  const providers: Record<string, { connected: boolean; user?: AuthData }> = {
    google: { connected: false },
    github: { connected: false },
    x: { connected: false },
    linkedin: { connected: false },
    facebook: { connected: false },
  };

  for (const [provider, cookieName] of Object.entries(PROVIDER_COOKIES)) {
    try {
      const cookie = cookieStore.get(cookieName);
      if (cookie?.value) {
        const userData = JSON.parse(cookie.value) as AuthData;
        providers[provider] = { connected: true, user: userData };
      }
    } catch (error) {
      console.error(`Failed to parse ${provider} auth cookie:`, error);
    }
  }

  return providers;
}

/**
 * Get user info for a specific provider
 */
export async function getUserInfo(provider: string): Promise<AuthData | null> {
  const cookieStore = await cookies();
  const cookieName =
    PROVIDER_COOKIES[provider as keyof typeof PROVIDER_COOKIES];

  if (!cookieName) return null;

  try {
    const cookie = cookieStore.get(cookieName);
    if (cookie?.value) {
      return JSON.parse(cookie.value) as AuthData;
    }
  } catch (error) {
    console.error(`Failed to parse ${provider} auth cookie:`, error);
  }

  return null;
}

/**
 * Get access token for a specific provider
 */
export async function getAccessToken(provider: string): Promise<string | null> {
  const userInfo = await getUserInfo(provider);
  return userInfo?.accessToken || null;
}

/**
 * Disconnect a provider (remove from cookies)
 */
export async function disconnectProvider(provider: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieName =
    PROVIDER_COOKIES[provider as keyof typeof PROVIDER_COOKIES];

  if (cookieName) {
    cookieStore.delete(cookieName);
  }
}

/**
 * Get the primary provider (first connected)
 */
export async function getPrimaryProvider(): Promise<{
  provider: string;
  user: AuthData;
} | null> {
  const providers = await getConnectedProviders();

  for (const provider of ['google', 'github', 'x', 'linkedin', 'facebook']) {
    if (providers[provider].connected && providers[provider].user) {
      return {
        provider,
        user: providers[provider].user!,
      };
    }
  }

  return null;
}
