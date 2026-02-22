# Phase 6: Deploy W3 to Cloud Run

Complete guide for deploying W3 Desktop with all integrations to Google Cloud Run.

## Prerequisites

✅ Verified:
- Google Cloud Project: `ctoteam`
- Cloud Run region: `us-central1`
- Service account with appropriate permissions
- Docker image repository configured

## What Gets Deployed

✅ **Core Features:**
- Next.js server with real terminal (node-pty)
- Gemini AI Assistant with voice support
- Cloud Storage filesystem backend (w3-os bucket)
- File Explorer with real CRUD operations
- Real bash/Python/Node.js terminal
- 6 OAuth integrations ready

✅ **Infrastructure:**
- 4 vCPU, 4GB RAM Cloud Run service
- Auto-scaling (0-20 instances)
- Secrets Manager for API keys
- Cloud Storage with user isolation
- Cloud Build for CI/CD

## Deployment Steps

### Option 1: Automated (Recommended)

```bash
cd ~/w3
bash DEPLOY_TO_CLOUD_RUN.sh
```

This script:
1. ✅ Creates/updates all secrets in Secret Manager
2. ✅ Builds Docker image
3. ✅ Pushes to Artifact Registry
4. ✅ Deploys to Cloud Run
5. ✅ Configures Cloud Storage permissions
6. ✅ Runs health check
7. ✅ Returns your live URL

### Option 2: Manual Step-by-Step

**1. Set up environment**
```bash
cd ~/w3
export PROJECT_ID="ctoteam"
export SERVICE_NAME="w3"
export REGION="us-central1"
```

**2. Create secrets (if not existing)**
```bash
# Create all secrets from .env.local
for secret in GEMINI_API_KEY YOUTUBE_API_KEY SERPAPI_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET X_CLIENT_ID X_CLIENT_SECRET LINKEDIN_CLIENT_ID LINKEDIN_CLIENT_SECRET FACEBOOK_CLIENT_ID FACEBOOK_CLIENT_SECRET; do
  VALUE=$(grep "^$secret=" .env.local | cut -d'=' -f2-)
  if [ ! -z "$VALUE" ]; then
    echo -n "$VALUE" | gcloud secrets create $secret --data-file=- --replication-policy=automatic 2>/dev/null || \
    echo -n "$VALUE" | gcloud secrets versions add $secret --data-file=-
  fi
done
```

**3. Grant Cloud Storage access**
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gsutil iam ch serviceAccount:$SA_EMAIL:roles/storage.objectAdmin gs://w3-os
```

**4. Build and deploy**
```bash
gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID
```

**5. Get the URL**
```bash
gcloud run services describe w3 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)'
```

## Environment Variables Set at Runtime

These are automatically injected from Secret Manager:

```
GEMINI_API_KEY          → Secret Manager
YOUTUBE_API_KEY         → Secret Manager
SERPAPI_KEY             → Secret Manager
GOOGLE_CLIENT_ID        → Secret Manager
GOOGLE_CLIENT_SECRET    → Secret Manager
GITHUB_CLIENT_ID        → Secret Manager
GITHUB_CLIENT_SECRET    → Secret Manager
X_CLIENT_ID             → Secret Manager
X_CLIENT_SECRET         → Secret Manager
LINKEDIN_CLIENT_ID      → Secret Manager
LINKEDIN_CLIENT_SECRET  → Secret Manager
FACEBOOK_CLIENT_ID      → Secret Manager
FACEBOOK_CLIENT_SECRET  → Secret Manager

NODE_ENV=production
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
NEXT_TELEMETRY_DISABLED=1
GCS_BUCKET=w3-os
GCS_PROJECT=ctoteam
AI_MODEL=gemini-2.0-flash
AI_VOICE_ENABLED=true
NEXTAUTH_URL=https://w3-xxxxx.us-central1.run.app
```

## After Deployment

### 1. Test the App

```bash
# Get the URL
URL=$(gcloud run services describe w3 \
  --region=us-central1 \
  --project=ctoteam \
  --format='value(status.url)')

# Test health check
curl $URL/api/health

# Test filesystem
curl "$URL/api/fs?path=/home"

# Test AI
curl -X POST "$URL/api/ai" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","history":[]}'

# Test terminal WebSocket (upgrade connection)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "$URL/terminal-ws"
```

### 2. View Logs

```bash
# Real-time logs
gcloud run logs read w3 --region=us-central1 --follow

# Last 100 lines
gcloud run logs read w3 --region=us-central1 --limit=100

# Error logs only
gcloud run logs read w3 --region=us-central1 | grep ERROR
```

### 3. Monitor Performance

```bash
# Cloud Run metrics
gcloud monitoring timeseries list --filter 'metric.type="run.googleapis.com/request_count"'

# View in console
open "https://console.cloud.google.com/run/detail/us-central1/w3"
```

### 4. Scale Configuration

```bash
# Increase max instances if needed
gcloud run deploy w3 \
  --region=us-central1 \
  --max-instances=50

# Set minimum instances to reduce cold starts
gcloud run deploy w3 \
  --region=us-central1 \
  --min-instances=1
```

## Integrations Setup (First Time)

After deployment, users need to connect their accounts:

1. **Open W3 Desktop** at the deployed URL
2. **Settings ⚙️** → **Integrations** tab
3. **Click Connect** on:
   - ✅ Google (Gmail, Drive)
   - ✅ GitHub
   - ✅ X (Twitter)
   - ✅ LinkedIn
   - ✅ Facebook
4. **Authenticate** with each account
5. **Done!** Claude can now use these APIs

## Troubleshooting

### Build fails with Docker error
```bash
# Check build logs
gcloud builds log <BUILD-ID> --stream
```

### Service not starting
```bash
# View recent logs
gcloud run logs read w3 --region=us-central1 --limit=50

# Common issue: Playwright not installed
# Check Dockerfile for: RUN npx playwright install chromium
```

### Secrets not injecting
```bash
# List all secrets
gcloud secrets list --project=ctoteam

# Check a specific secret exists
gcloud secrets describe GEMINI_API_KEY --project=ctoteam

# Redeploy to pick up new secrets
gcloud run deploy w3 --region=us-central1 \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### Cloud Storage permissions denied
```bash
# Re-grant permissions
PROJECT_NUMBER=$(gcloud projects describe ctoteam --format='value(projectNumber)')
gsutil iam ch serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com:roles/storage.objectAdmin gs://w3-os
```

### Terminal WebSocket not working
```bash
# Verify node-pty is in Dockerfile
grep "npm install.*node-pty" Dockerfile

# Check Dockerfile runner stage has PTY dependencies
grep "build-essential" Dockerfile
```

## Cost Estimation

| Component | Est. Cost |
|-----------|-----------|
| Cloud Run (4vCPU, 4GB, 1M requests) | $20-30 |
| Cloud Storage (10GB files) | $0.20 |
| Cloud Build | Free (120 min/day) |
| Secret Manager | Free (6 secrets) |
| **Total/month** | **$20-30** |

*Note: Auto-scaling to 0 when idle keeps costs low*

## Security Checklist

- ✅ Secrets in Secret Manager (not in code/Docker)
- ✅ Service account with minimal permissions
- ✅ Cloud Run unauthenticated (behind OAuth)
- ✅ HTTPS enforced
- ✅ User file isolation by email
- ✅ OAuth2 for external integrations
- ✅ Token refresh handling

## Advanced: CI/CD Pipeline

The `cloudbuild.yaml` provides:
- ✅ Automatic builds on git push (if GitHub trigger configured)
- ✅ Docker image caching
- ✅ Multi-region support (modify substitutions)
- ✅ Canary deployments (manual with traffic splitting)

To enable GitHub integration:
```bash
gcloud builds connect --repository-name=w3 --github-enterprise
```

## Rollback

If deployment breaks:
```bash
# Revert to previous revision
gcloud run deploy w3 \
  --region=us-central1 \
  --revision-suffix=$(date +%s)

# OR view revisions
gcloud run revisions list --service=w3 --region=us-central1

# Deploy specific revision
gcloud run deploy w3 --region=us-central1 \
  --revision=w3-00001-abc
```

## Live Example

```bash
# Your deployed service
https://w3-1035117862188.us-central1.run.app

# Try it
curl https://w3-1035117862188.us-central1.run.app/api/health
```

## Final Commands Reference

```bash
# 🚀 Deploy
bash DEPLOY_TO_CLOUD_RUN.sh

# 📊 Monitor
gcloud run logs read w3 --region=us-central1 --follow

# 🔍 Test health
curl $(gcloud run services describe w3 --region=us-central1 --format='value(status.url)')/api/health

# 🗑️ Delete service (⚠️ careful!)
gcloud run services delete w3 --region=us-central1
```

## Support

For issues:
1. Check logs: `gcloud run logs read w3 --region=us-central1 --limit=100`
2. Verify secrets: `gcloud secrets list --project=ctoteam`
3. Check Cloud Run dashboard: https://console.cloud.google.com/run/detail/us-central1/w3
4. Review security groups and IAM permissions

---

**Congratulations! W3 Desktop is now live on Google Cloud Run! 🎉**
