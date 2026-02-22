# W3 Desktop - Deployment with AI Assistant
## Complete Cloud Deployment Guide

---

## 📋 Overview

This guide covers the complete deployment of W3 Desktop to Google Cloud Run with:
- ✅ Secure API key management via Secret Manager
- ✅ Claude AI Assistant integration
- ✅ Google OAuth2 authentication
- ✅ Google Drive file storage
- ✅ Playwright browser automation
- ✅ Health checks and monitoring

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Google Cloud Project
- `gcloud` CLI installed and authenticated
- GitHub repository with W3 code

### Deploy Now

```bash
cd /home/appadmin/w3

# 1. Run setup script (prompts for API keys)
chmod +x SETUP_SECURE_DEPLOYMENT.sh
./SETUP_SECURE_DEPLOYMENT.sh

# 2. Complete OAuth2 setup (manual, ~5 min)
# Follow instructions in SECURE_CLOUD_DEPLOYMENT.md

# 3. Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml

# 4. Get your Cloud Run URL
gcloud run services describe w3 --region us-central1
```

---

## 📁 Key Files for Deployment

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Local development secrets (git-ignored) |
| `cloudbuild.yaml` | Cloud Build pipeline configuration |
| `Dockerfile` | Production container image |
| `SETUP_SECURE_DEPLOYMENT.sh` | Automated setup script |
| `SECURE_CLOUD_DEPLOYMENT.md` | Detailed setup instructions |

### Application Files

| File | Purpose |
|------|---------|
| `app/api/ai/route.ts` | AI Assistant API endpoint |
| `lib/ai-assistant.ts` | AI Assistant configuration loader |
| `server.js` | Custom Next.js server |

---

## 🔐 Security Architecture

### Secrets Management

```
┌─────────────────────────────────────────────────┐
│       Google Cloud Secret Manager               │
│  ┌────────────────────────────────────────────┐ │
│  │ GEMINI_API_KEY                             │ │
│  │ YOUTUBE_API_KEY                            │ │
│  │ SERPAPI_KEY                                │ │
│  │ GOOGLE_CLIENT_ID                           │ │
│  │ GOOGLE_CLIENT_SECRET                       │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
           ↓ (Cloud Build reads)
    ┌──────────────────┐
    │ Cloud Build      │
    │ (builds image)   │
    └──────────────────┘
           ↓ (builds Docker image)
    ┌──────────────────┐
    │ Artifact Registry│
    │ (stores image)   │
    └──────────────────┘
           ↓ (Cloud Run pulls)
    ┌──────────────────┐
    │ Cloud Run        │
    │ (injects secrets)│
    └──────────────────┘
```

### Local Development

```
.env.local (git-ignored)
    ↓
Environment Variables
    ↓
lib/ai-assistant.ts (loads config)
    ↓
app/api/ai/route.ts (handles requests)
```

---

## 🔑 Environment Variables

### Required for Production

```bash
# API Keys
GEMINI_API_KEY                  # Google Gemini API Key
YOUTUBE_API_KEY                 # YouTube Data API v3 Key
SERPAPI_KEY                     # SerpAPI Key for Google Search

# Google OAuth2
GOOGLE_CLIENT_ID                # OAuth2 Client ID
GOOGLE_CLIENT_SECRET            # OAuth2 Client Secret

# AI Assistant
AI_ASSISTANT_SYSTEM_PROMPT      # Claude's system prompt (loaded from .env.local)
```

### Optional/Configured

```bash
# Node.js
NODE_ENV=production             # Automatically set by Cloud Run
NEXT_TELEMETRY_DISABLED=1       # Disable Next.js telemetry

# Playwright
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright  # Automatically set

# Google Drive
GOOGLE_DRIVE_FOLDER_NAME=W3 Desktop Files
```

---

## 🎯 Deployment Steps

### Step 1: Revoke Exposed API Keys

If you previously exposed API keys, revoke them:

1. **Google Cloud Console**
   - Go to APIs & Services → Credentials
   - Delete old GEMINI_API_KEY and YOUTUBE_API_KEY
   - Create new keys

2. **SerpAPI**
   - Go to SerpAPI Dashboard
   - Regenerate your API key

### Step 2: Create New API Keys

1. **Get Gemini API Key**
   - Google Cloud Console → APIs & Services → Library
   - Search "Google Generative AI"
   - Click Enable
   - Create API Key (use Application default credentials)

2. **Get YouTube API Key**
   - Google Cloud Console → APIs & Services → Library
   - Search "YouTube Data API v3"
   - Click Enable
   - Create API Key

3. **Get SerpAPI Key**
   - [SerpAPI Dashboard](https://serpapi.com/dashboard)
   - Copy your existing key or generate a new one

### Step 3: Run Setup Script

```bash
./SETUP_SECURE_DEPLOYMENT.sh
```

This automatically:
- ✅ Enables required Google APIs
- ✅ Creates secrets in Secret Manager
- ✅ Grants Cloud Build permissions
- ✅ Grants Cloud Run permissions
- ✅ Creates `.env.local` for local development

### Step 4: Complete OAuth2 Setup (Manual)

```bash
# 1. Go to Google Cloud Console
# https://console.cloud.google.com/apis/credentials

# 2. Create OAuth 2.0 Client ID
# - Type: Web application
# - Name: W3 Desktop
# - Authorized JavaScript origins:
#   http://localhost:3000
#   https://YOUR_CLOUD_RUN_URL
# - Authorized redirect URIs:
#   http://localhost:3000/api/auth/callback/google
#   https://YOUR_CLOUD_RUN_URL/api/auth/callback/google

# 3. Download JSON credentials

# 4. Store in Secret Manager
gcloud secrets create GOOGLE_CLIENT_ID \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_CLIENT_ID"

gcloud secrets create GOOGLE_CLIENT_SECRET \
  --replication-policy="automatic" \
  --data-file=- <<< "YOUR_CLIENT_SECRET"

# 5. Update .env.local
# Edit .env.local and uncomment GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
```

### Step 5: Test Locally

```bash
# Install dependencies
npm install

# Build Next.js app
npm run build

# Start development server
npm run dev

# Test AI Assistant endpoint
curl http://localhost:3000/api/ai

# Test health check
curl http://localhost:3000/api/health
```

### Step 6: Deploy to Cloud Run

```bash
# Deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Monitor build progress
gcloud builds log [BUILD_ID]

# Get deployment URL
gcloud run services describe w3 --region us-central1
```

### Step 7: Verify Deployment

```bash
# Check service status
gcloud run services describe w3 --region us-central1

# View logs
gcloud run logs read w3 --region us-central1 --limit 100

# Test health check
curl https://YOUR_CLOUD_RUN_URL/api/health

# Test AI Assistant
curl https://YOUR_CLOUD_RUN_URL/api/ai
```

---

## 🤖 AI Assistant Integration

### System Prompt

The Claude AI Assistant system prompt is defined in `.env.local`:

```
You are Claude, an AI assistant created by Anthropic to help users
with tasks inside the W3 desktop environment...
```

### Loading Configuration

```typescript
// lib/ai-assistant.ts
import { loadAIAssistantConfig } from './ai-assistant';

const config = loadAIAssistantConfig();
console.log(config.systemPrompt);  // Claude's system prompt
console.log(config.model);         // claude-3-5-sonnet-20241022
```

### API Endpoint

```bash
# GET - Retrieve configuration
curl http://localhost:3000/api/ai

# Response:
{
  "status": "ready",
  "model": "claude-3-5-sonnet-20241022",
  "systemPromptLength": 1234,
  "hasAnthropicKey": true,
  "environment": "development"
}
```

---

## 📊 Monitoring and Logging

### View Cloud Run Logs

```bash
# Real-time logs
gcloud run logs read w3 --region us-central1

# Last 100 lines
gcloud run logs read w3 --region us-central1 --limit 100

# Filter by severity
gcloud run logs read w3 --region us-central1 --severity ERROR
```

### Health Checks

The Dockerfile includes a health check:

```bash
# Docker health check
HEALTHCHECK --interval=30s --timeout=10s \
    CMD node -e "require('http').get('http://localhost:8080/api/health')"
```

Cloud Run periodically calls `/api/health` to ensure the service is running.

### Monitor Metrics

```bash
# View Cloud Run metrics
gcloud run services describe w3 --region us-central1

# View invocations
gcloud monitoring metrics-descriptors describe \
  run.googleapis.com/request_count \
  --filter='resource.service_name=w3'
```

---

## 🛠️ Troubleshooting

### Build Failures

```bash
# View detailed build logs
gcloud builds log [BUILD_ID] --stream

# Common issues:
# - Missing secrets: Run ./SETUP_SECURE_DEPLOYMENT.sh again
# - Permission denied: Check service account permissions
# - Docker build failed: Check Dockerfile for syntax errors
```

### Runtime Errors

```bash
# View Cloud Run logs
gcloud run logs read w3 --region us-central1 --severity ERROR

# SSH into Cloud Run pod (if configured)
gcloud compute ssh [POD_NAME]

# Check environment variables are loaded
curl https://YOUR_URL/api/ai
# Should return { "status": "ready", ... }
```

### Secret Access Issues

```bash
# Verify secret exists
gcloud secrets list | grep GEMINI_API_KEY

# Verify service account has access
gcloud secrets get-iam-policy GEMINI_API_KEY

# Grant access if needed
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member=serviceAccount:w3-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## 📈 Scaling and Performance

### Cloud Run Configuration

```yaml
# cloudbuild.yaml
args:
  - '--memory=2Gi'           # Memory per instance
  - '--cpu=2'                # CPU per instance
  - '--max-instances=20'     # Scale up to 20 instances
  - '--min-instances=0'      # Scale down to 0 when idle
  - '--concurrency=1'        # Requests per instance
  - '--timeout=300s'         # 5 minute timeout
```

### For Production

```bash
# Higher memory for AI operations
gcloud run deploy w3 \
  --memory 4Gi \
  --cpu 4 \
  --max-instances 100 \
  --min-instances 10
```

---

## 🔄 Continuous Deployment

### Set Up GitHub Trigger

```bash
# Create Cloud Build trigger connected to GitHub
gcloud builds create --config=cloudbuild.yaml \
  --github-name=YOUR_REPO \
  --github-owner=YOUR_USERNAME \
  --build-name=w3-deploy
```

Now deployments happen automatically on push to main!

---

## 📚 Related Documentation

- [SECURE_CLOUD_DEPLOYMENT.md](./SECURE_CLOUD_DEPLOYMENT.md) - Detailed security setup
- [SETUP_SECURE_DEPLOYMENT.sh](./SETUP_SECURE_DEPLOYMENT.sh) - Automated setup script
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Google Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Claude API Documentation](https://docs.anthropic.com/)

---

## ✅ Deployment Checklist

- [ ] API keys revoked and recreated
- [ ] Secrets created in Secret Manager
- [ ] Cloud Build permissions granted
- [ ] Cloud Run permissions granted
- [ ] OAuth2 credentials created
- [ ] `.env.local` updated with all keys
- [ ] Local testing: `npm run dev`
- [ ] Health check verified: `/api/health`
- [ ] AI Assistant tested: `/api/ai`
- [ ] Cloud Build deployment: `gcloud builds submit`
- [ ] Deployment verified on Cloud Run
- [ ] Logs checked for errors
- [ ] Custom domain configured (optional)
- [ ] CI/CD trigger set up (optional)

---

## 🎉 You're Ready!

Your W3 Desktop is now running on Google Cloud Run with:
- ✅ Secure secret management
- ✅ Claude AI Assistant
- ✅ Google authentication
- ✅ File storage with Google Drive
- ✅ Automated browser automation with Playwright
- ✅ Real-time monitoring and logging

**Access your deployment at:**
```
https://YOUR_CLOUD_RUN_URL
```

**Questions?** Check the logs:
```bash
gcloud run logs read w3 --region us-central1 --limit 100
```
