# Secure Cloud Deployment Guide
## W3 Desktop + Google Workspace Integration

---

## ⚠️ CRITICAL: API Key Security

### 1. **Revoke Exposed Keys (DO THIS IMMEDIATELY)**
Your API keys were exposed in plain text. Follow these steps:

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Find `GEMINI_API_KEY` and `YOUTUBE_API_KEY`
4. Click the key → **Delete**
5. Create new keys and store them in **Google Secret Manager** (see below)

#### SerpAPI
1. Go to [SerpAPI Dashboard](https://serpapi.com/dashboard)
2. Find your API key
3. Click **Regenerate** to create a new one
4. Delete the old key

---

## 2. Google Cloud Secret Manager Setup

### Store Secrets Securely

```bash
# Create secrets in Google Cloud Secret Manager
gcloud secrets create GEMINI_API_KEY \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_NEW_GEMINI_API_KEY"

gcloud secrets create YOUTUBE_API_KEY \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_NEW_YOUTUBE_API_KEY"

gcloud secrets create SERPAPI_KEY \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_NEW_SERPAPI_KEY"

# Verify secrets were created
gcloud secrets list
```

### Grant Cloud Build Access to Secrets

```bash
# Get your Cloud Build service account
PROJECT_ID=$(gcloud config get-value project)
CLOUD_BUILD_SA="${PROJECT_ID}@cloudbuild.gserviceaccount.com"

# Grant Secret Accessor role
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member=serviceAccount:${CLOUD_BUILD_SA} \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding YOUTUBE_API_KEY \
  --member=serviceAccount:${CLOUD_BUILD_SA} \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding SERPAPI_KEY \
  --member=serviceAccount:${CLOUD_BUILD_SA} \
  --role=roles/secretmanager.secretAccessor
```

### Grant Cloud Run Service Account Access

```bash
# Get Cloud Run service account
CLOUD_RUN_SA="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant access for all secrets
for secret in GEMINI_API_KEY YOUTUBE_API_KEY SERPAPI_KEY; do
  gcloud secrets add-iam-policy-binding ${secret} \
    --member=serviceAccount:${CLOUD_RUN_SA} \
    --role=roles/secretmanager.secretAccessor
done
```

---

## 3. Google OAuth2 Setup (Gmail/Workspace Integration)

### Create OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Set **Authorized JavaScript origins**:
   ```
   https://YOUR_CLOUD_RUN_URL
   http://localhost:3000
   ```
5. Set **Authorized redirect URIs**:
   ```
   https://YOUR_CLOUD_RUN_URL/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
6. Download JSON and save securely

### Store OAuth Credentials in Secret Manager

```bash
# Store OAuth client ID and secret
gcloud secrets create GOOGLE_CLIENT_ID \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_CLIENT_ID"

gcloud secrets create GOOGLE_CLIENT_SECRET \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_CLIENT_SECRET"

# Grant access
CLOUD_BUILD_SA="${PROJECT_ID}@cloudbuild.gserviceaccount.com"
CLOUD_RUN_SA="${PROJECT_ID}@appspot.gserviceaccount.com"

for secret in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  gcloud secrets add-iam-policy-binding ${secret} \
    --member=serviceAccount:${CLOUD_BUILD_SA} \
    --role=roles/secretmanager.secretAccessor
  gcloud secrets add-iam-policy-binding ${secret} \
    --member=serviceAccount:${CLOUD_RUN_SA} \
    --role=roles/secretmanager.secretAccessor
done
```

---

## 4. Enable Required Google APIs

```bash
gcloud services enable \
  drive.googleapis.com \
  gmail.googleapis.com \
  sheets.googleapis.com \
  docs.googleapis.com \
  cloudrun.googleapis.com \
  secretmanager.googleapis.com
```

---

## 5. Update Environment Files

### `.env.local` (Development ONLY)
Never commit this file. Contains sensitive data for local development.

```bash
# Create .env.local (NOT committed to git)
cat > .env.local <<EOF
GEMINI_API_KEY=your_new_key_here
YOUTUBE_API_KEY=your_new_key_here
SERPAPI_KEY=your_new_key_here
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
EOF
```

### `.env.local` in `.gitignore`
Verify it's in your `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## 6. Update `cloudbuild.yaml`

The `cloudbuild.yaml` has been updated to use Secret Manager. It now:
1. Fetches secrets from Secret Manager
2. Builds the Docker image
3. Deploys to Cloud Run with secrets injected

### Deploy

```bash
# Manual deploy
gcloud builds submit --config=cloudbuild.yaml

# Or set up Cloud Build trigger in Google Cloud Console
# - Connect your GitHub repo
# - Set build trigger on push to main branch
```

---

## 7. Cloud Run Deployment

### Deploy Manually

```bash
# Build and deploy
gcloud run deploy w3 \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest,SERPAPI_KEY=SERPAPI_KEY:latest \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300s
```

### View deployed service

```bash
gcloud run services describe w3 --region us-central1
```

---

## 8. File Storage with Google Drive Integration

### Setup Google Drive API

```bash
# Enable Drive API
gcloud services enable drive.googleapis.com

# Create service account for backend file access
gcloud iam service-accounts create w3-file-storage \
  --display-name="W3 File Storage Service"

# Create key for backend
gcloud iam service-accounts keys create ~/w3-key.json \
  --iam-account=w3-file-storage@${PROJECT_ID}.iam.gserviceaccount.com

# Store as secret
gcloud secrets create GOOGLE_SERVICE_ACCOUNT_KEY \
  --replication-policy="automatic" \
  --data-file=~/w3-key.json
```

### Store Files Based on User Login

When a user logs in with Gmail:

1. **Create a folder** in their Google Drive: `/W3 Desktop Files/{user_email}/`
2. **Store all files** uploaded/created in that folder
3. **Use Google Drive API** to manage files:
   - Create folders
   - Upload files
   - Share with others
   - Delete/update files

### Backend Implementation Example

```typescript
// lib/googleDrive.ts
import { google } from 'googleapis';

export async function createUserFolder(userEmail: string) {
  const drive = google.drive({ version: 'v3', auth: getAuthClient() });

  const folder = await drive.files.create({
    requestBody: {
      name: `W3 Desktop - ${userEmail}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'], // or a shared team folder
    },
  });

  return folder.data.id;
}

export async function uploadFile(
  userEmail: string,
  folderId: string,
  fileName: string,
  fileContent: Buffer
) {
  const drive = google.drive({ version: 'v3', auth: getAuthClient() });

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/octet-stream',
      body: fileContent,
    },
  });

  return file.data.id;
}
```

---

## 9. Frontend Authentication Flow

### Next.js Authentication Handler

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Store user email in session
      session.user.email = token.email;
      return session;
    },
  },
};

export const handler = NextAuth(authOptions);
```

---

## 10. Deployment Checklist

- [ ] Revoked exposed API keys
- [ ] Created new API keys
- [ ] Created secrets in Google Secret Manager
- [ ] Granted permissions to Cloud Build and Cloud Run service accounts
- [ ] Enabled required Google APIs
- [ ] Updated `.env.local` with new keys (development only)
- [ ] Updated `cloudbuild.yaml` to use Secret Manager
- [ ] Set up Google OAuth2 credentials
- [ ] Configured OAuth redirect URIs
- [ ] Set up Cloud Run deployment
- [ ] Tested authentication locally
- [ ] Deployed to Cloud Run
- [ ] Verified secrets are accessible
- [ ] Enabled Google Drive API for file storage
- [ ] Tested file upload/download with authenticated user

---

## 11. Security Best Practices

✅ **DO:**
- Store all secrets in Google Secret Manager
- Use OAuth2 for user authentication
- Rotate API keys regularly (monthly)
- Enable Secret Manager logging
- Use service accounts with minimal permissions
- Enable Cloud Audit Logs
- Use VPC for Cloud Run if handling sensitive data

❌ **DON'T:**
- Commit `.env.local` to Git
- Store secrets in Docker images
- Share API keys via email or Slack
- Use hardcoded credentials
- Enable "Allow Unauthenticated" for admin endpoints
- Store credentials in comments

---

## 12. Monitoring and Logging

```bash
# View Cloud Run logs
gcloud run logs read w3 --region us-central1 --limit 100

# View Secret Manager access logs
gcloud logging read "resource.type=secretmanager.googleapis.com" \
  --limit 50 --format json

# View Cloud Build logs
gcloud builds log [BUILD_ID]
```

---

## Questions?

For more info:
- [Google Cloud Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google OAuth2](https://developers.google.com/identity/protocols/oauth2)
