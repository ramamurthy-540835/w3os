# W3 Integrations Setup Guide

This guide explains how to set up OAuth2 integrations with Google Workspace, GitHub, X, LinkedIn, and Facebook.

## Quick Start

All integrations are **lazy-loaded** - only what you use gets activated. Users authenticate through the Settings panel.

## Environment Variables (.env.local)

```bash
# Google OAuth2 (Gmail, Drive, Sheets, Docs)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here

# GitHub
GITHUB_CLIENT_ID=your-client-id-here
GITHUB_CLIENT_SECRET=your-client-secret-here

# X (Twitter)
X_CLIENT_ID=your-client-id-here
X_CLIENT_SECRET=your-client-secret-here

# LinkedIn
LINKEDIN_CLIENT_ID=your-client-id-here
LINKEDIN_CLIENT_SECRET=your-client-secret-here

# Facebook
FACEBOOK_CLIENT_ID=your-client-id-here
FACEBOOK_CLIENT_SECRET=your-client-secret-here

# Callback base URL
NEXTAUTH_URL=http://localhost:3000
```

## Setting Up Each Provider

### 1. Google Workspace (Gmail, Drive, Sheets, Docs)

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Gmail API
   - Google Drive API
   - Google Sheets API
   - Google Docs API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3000/api/auth/callback` (or your domain)
6. Copy Client ID and Client Secret to `.env.local`

**Scopes Requested:**
```
openid profile email
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/documents
```

### 2. GitHub

**Steps:**
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set:
   - Authorization callback URL: `http://localhost:3000/api/auth/callback`
4. Copy Client ID and Client Secret

**Scopes Requested:**
```
repo user:email read:user
```

### 3. X (Twitter)

**Steps:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app
3. Set up OAuth 2.0:
   - Callback URI: `http://localhost:3000/api/auth/callback`
   - Website URL: `http://localhost:3000`
4. Copy credentials

**Scopes Requested:**
```
tweet.read users.read tweet.write
```

### 4. LinkedIn

**Steps:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Authorized redirect URLs: `http://localhost:3000/api/auth/callback`
4. Copy Client ID and Client Secret

**Scopes Requested:**
```
openid profile email
```

### 5. Facebook

**Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app
3. Add Facebook Login product
4. Set OAuth Redirect URI: `http://localhost:3000/api/auth/callback`
5. Copy App ID (Client ID) and App Secret (Client Secret)

**Scopes Requested:**
```
email public_profile
```

---

## Usage

### For End Users

1. Open W3 Desktop
2. Click Settings ⚙️
3. Go to "Integrations" tab
4. Click "Connect" on any service
5. Authenticate with your account
6. Service is now available to Claude AI

### For Developers (Using MCP)

```typescript
import { mcpHelper } from '@/lib/mcp-helper';

// List available MCP tools
const tools = mcpHelper.getAvailableMCPTools();

// Execute Google Workspace action
const result = await mcpHelper.executeGoogleWorkspaceAction(
  'gmail',
  'list_messages',
  { maxResults: 5 }
);

// Execute GitHub action
const repos = await mcpHelper.executeGitHubAction(
  'list_repos',
  { owner: 'username' }
);

// Execute X action
const tweets = await mcpHelper.executeXAction(
  'list_tweets',
  { query: 'cloud os' }
);
```

### API Endpoints

**Get available providers:**
```bash
GET /api/auth/providers
```

Response:
```json
{
  "status": "ok",
  "availableProviders": [
    { "id": "google", "name": "Google", "connected": true },
    { "id": "github", "name": "GitHub", "connected": false },
    ...
  ],
  "connections": [...]
}
```

**Get login URL:**
```bash
POST /api/auth/providers
Body: { "provider": "google" }
```

Response:
```json
{
  "provider": "google",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "abc123"
}
```

**Disconnect:**
```bash
POST /api/auth/disconnect
Body: { "provider": "google" }
```

---

## Architecture

### Lazy Loading

- Providers only initialize if environment variables are present
- Tokens stored in-memory (extend to database for persistence)
- No external dependencies beyond what's already installed

### Security

- ✅ Uses OAuth2 (never storing passwords)
- ✅ PKCE for public clients (X, GitHub)
- ✅ State tokens for CSRF protection
- ✅ Token expiry handling with refresh
- ⚠️ Store tokens in secure database for production (not in-memory)

### Token Management

```typescript
// Auto-refresh expired tokens
const token = authService.getToken('google');
if (authService.isTokenExpired(token)) {
  await authService.refreshToken('google');
}

// Get current user
const user = authService.getUser('google');

// Check connection status
const connections = authService.getAllConnections();
```

---

## MCP Integration with Claude

W3 integrations work with Claude via MCP (Model Context Protocol).

**Example: Claude reads emails then creates GitHub issue**

```
User: "Read my latest 5 emails and create a GitHub issue summarizing them"

Claude uses MCP to:
1. Call mcpHelper.executeGoogleWorkspaceAction('gmail', 'list_messages')
2. Call mcpHelper.executeGitHubAction('create_issue')
3. Return summarized results to user
```

---

## Troubleshooting

### "Provider not configured"
- Check if environment variable is set in `.env.local`
- Restart dev server: `npm run dev`

### "Token exchange failed"
- Verify Client ID and Client Secret are correct
- Check Redirect URI matches exactly
- Ensure APIs are enabled (Google)

### "Access denied" / "Insufficient permissions"
- User needs to grant required scopes during authentication
- Remove old auth and re-authenticate

### Store Tokens Persistently

For production, extend `AuthService` to store tokens:

```typescript
// Example with Supabase
const storeToken = async (providerId: string, token: AuthToken) => {
  await supabase
    .from('oauth_tokens')
    .upsert({ provider_id: providerId, token_data: token });
};
```

---

## Next Steps

1. ✅ Set up one provider (Google recommended)
2. Test in Settings > Integrations
3. Try MCP commands: `await mcpHelper.executeGoogleWorkspaceAction(...)`
4. Deploy to Cloud Run with secrets in Secret Manager
5. Add more providers as needed

---

## Support

For more info:
- [OAuth2 Spec](https://oauth.net/2/)
- [Google API Docs](https://developers.google.com/docs)
- [GitHub API](https://docs.github.com/en/rest)
- [MCP Protocol](https://modelcontextprotocol.io)
