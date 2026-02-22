# Deployment Guide: Next.js 16 on Google Cloud Run

This guide provides comprehensive instructions for deploying your Next.js 16 application to Google Cloud Run using Cloud Build CI/CD pipeline.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Environment Variables](#environment-variables)
6. [Secret Management](#secret-management)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Cost Optimization](#cost-optimization)

---

## Prerequisites

Before you begin, ensure you have:

### GCP Requirements
- [ ] Active Google Cloud Platform project with billing enabled
- [ ] `gcloud` CLI installed ([install guide](https://cloud.google.com/sdk/docs/install))
- [ ] Owner or Editor role in the GCP project
- [ ] Sufficient project quota for Cloud Run, Artifact Registry, Cloud Build

### Local Development
- [ ] Node.js 22.11 or later
- [ ] npm or yarn package manager
- [ ] Docker installed locally (for testing Dockerfile)
- [ ] Git repository connected to GitHub

### GitHub Integration
- [ ] GitHub account with repository access
- [ ] Repository with Next.js 16 application code
- [ ] Branch protection rules on `main` (recommended for production)

---

## Initial Setup

### 1. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Run Setup Script

```bash
# Make script executable
chmod +x GCP_SETUP.sh

# Run setup (this creates all required resources)
bash GCP_SETUP.sh YOUR_PROJECT_ID us-central1

# Replace YOUR_PROJECT_ID with your actual GCP project ID
# Replace us-central1 with your preferred region
```

The script will:
- ✓ Enable required APIs (Cloud Build, Cloud Run, Artifact Registry, Secret Manager)
- ✓ Create Artifact Registry repository
- ✓ Create service account with appropriate roles
- ✓ Configure IAM permissions
- ✓ Set up Secret Manager structure

### 3. Create Required API Endpoint

Add a health check endpoint to your Next.js application (required for Cloud Run health probes):

**File: `src/pages/api/health.ts` or `pages/api/health.ts`**

```typescript
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

This endpoint:
- Returns HTTP 200 status for healthy state
- Is used by Cloud Run to verify service readiness
- Prevents automatic restarts due to failed health checks

---

## Configuration

### 1. Environment Variables

Next.js supports different environment variable types:

#### Build-time Variables (Public in Browser)
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_NAME=My App
```

#### Server-side Only Variables
Set via Cloud Run environment configuration (see below)

#### At Cloud Build Time
Configured in `cloudbuild.yaml` substitutions:
```yaml
--set-env-vars=NODE_ENV=production,NEXT_ENVIRONMENT=production
```

### 2. Cloud Build Configuration

The `cloudbuild.yaml` file already includes:
- Multi-stage Docker build
- Image push to Artifact Registry
- Cloud Run deployment with canary traffic split
- Automatic rollback on failure

**Key Substitutions** (set in Cloud Build Trigger):
```
_GCP_PROJECT_ID = your-project-id
_SERVICE_NAME = w3
_REGION = us-central1
_IMAGE_REPO = us-docker.pkg.dev/your-project-id/node-apps
```

### 3. Docker Configuration

The provided `Dockerfile`:
- Uses Node 22-alpine base image (minimal attack surface)
- Implements multi-stage build (faster, smaller image)
- Runs as non-root user `nextjs` (UID 1000) for security
- Includes health check endpoint
- Exposes port 3005

Test locally:
```bash
# Build image
docker build -t w3:test .

# Run container
docker run -p 3005:3005 w3:test

# Test health endpoint
curl http://localhost:3005/api/health
```

---

## Deployment

### Automatic Deployment (GitHub Integration)

Once Cloud Build trigger is created:

1. **Commit and push to main branch**
   ```bash
   git add .
   git commit -m "Deploy to Cloud Run"
   git push origin main
   ```

2. **Cloud Build automatically:**
   - Builds Docker image
   - Pushes to Artifact Registry
   - Deploys to Cloud Run with canary split (10% traffic)
   - Monitors health checks

3. **Verify deployment**
   ```bash
   gcloud run services describe w3 --region=us-central1
   ```

### Manual Deployment (Local Testing)

```bash
# Submit build manually
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_GCP_PROJECT_ID=your-project-id,_REGION=us-central1

# View build progress
gcloud builds log <BUILD_ID> --follow

# List builds
gcloud builds list --limit=10
```

### Deployment Flow

```
1. Git push to main
   ↓
2. GitHub webhook triggers Cloud Build
   ↓
3. Cloud Build builds Docker image
   ↓
4. Image pushed to Artifact Registry
   ↓
5. Cloud Run deployment (new revision)
   ↓
6. Traffic split: 10% new, 90% old (canary)
   ↓
7. Monitor for errors (manual observation)
   ↓
8a. If stable: Shift 100% traffic to new revision
   ↓
8b. If failed: Automatic rollback to previous revision
```

---

## Environment Variables

### Public Build-time Variables

These are baked into the Docker image and available in the browser:

```bash
# .env.production (commit to git)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ANALYTICS_ID=UA-XXXXXXXXX-X
NEXT_PUBLIC_APP_NAME=W3
```

### Server-side Runtime Variables

Set in Cloud Run service configuration:

```bash
# Via gcloud CLI
gcloud run deploy w3 \
  --update-env-vars=DATABASE_URL=postgres://...,REDIS_URL=redis://...

# Via Cloud Console
# → Cloud Run → w3 → Edit & Deploy → Environment variables
```

### Secret Manager Variables

For sensitive credentials, use Secret Manager:

```bash
# Create secret
echo "your-secret-value" | gcloud secrets create api-key --data-file=-

# Reference in Cloud Run
gcloud run deploy w3 \
  --set-secrets=API_KEY=api-key:latest
```

### Cloud Build Environment Variables

In `cloudbuild.yaml`:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'w3'
      - '--set-env-vars=NODE_ENV=production,NEXT_ENVIRONMENT=production'
      - '--set-secrets=DATABASE_URL=db-url:latest'
```

---

## Secret Management

### Creating Secrets

```bash
# Create database URL secret
echo "postgresql://user:pass@host/db" | \
  gcloud secrets create database-url --data-file=-

# Create API key secret
echo "sk_live_xxxxxxxxxxxxx" | \
  gcloud secrets create api-key --data-file=-

# Create OAuth secret
echo "client_secret_xxxxx" | \
  gcloud secrets create oauth-secret --data-file=-
```

### Updating Secrets

```bash
# Update an existing secret (creates new version)
echo "new-value" | gcloud secrets versions add database-url --data-file=-

# View secret value (requires permission)
gcloud secrets versions access latest --secret=database-url
```

### Referencing Secrets in Cloud Run

In `cloudbuild.yaml` deployment step:
```yaml
--set-secrets=DB_URL=database-url:latest,API_KEY=api-key:latest
```

The secret versions are automatically resolved at runtime.

### Granting Access to Secrets

```bash
# Allow Cloud Build to access secrets
gcloud secrets add-iam-policy-binding database-url \
  --member=serviceAccount:cloud-build-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## Monitoring & Logging

### View Cloud Run Logs

```bash
# Recent logs for service
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=w3' \
  --limit=50 --format=json

# Stream logs in real-time
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=w3' \
  --follow --format=json
```

### Check Service Status

```bash
# Describe service
gcloud run services describe w3 --region=us-central1

# List all revisions
gcloud run revisions list --service=w3 --region=us-central1

# View specific revision
gcloud run revisions describe w3-abcd1234 --region=us-central1
```

### Cloud Monitoring

Monitor your service via Cloud Console:
1. Go to **Cloud Run** → **w3** → **Metrics**
2. View:
   - Request count
   - Request latencies (p50, p95, p99)
   - Container CPU utilization
   - Container memory utilization
   - Error rates

### Set Up Alerts

Create alerts for critical metrics:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud Run Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=0.01 \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="w3"'
```

---

## Troubleshooting

### Build Failures

#### Issue: Docker build fails with "out of memory"

**Solution:**
- Increase machine type in `cloudbuild.yaml`:
  ```yaml
  options:
    machineType: 'N1_HIGHCPU_32'
  ```

#### Issue: Image push fails

**Solution:**
- Verify Artifact Registry is created:
  ```bash
  gcloud artifacts repositories list
  ```
- Check service account permissions:
  ```bash
  gcloud projects get-iam-policy PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:cloud-build-deployer*"
  ```

### Deployment Failures

#### Issue: Cloud Run deployment fails with permission error

**Solution:**
```bash
# Grant Cloud Build SA additional permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin
```

#### Issue: Service fails health check

**Solution:**
1. Verify health endpoint exists:
   ```bash
   curl https://w3-HASH.run.app/api/health
   ```
2. Check logs for errors:
   ```bash
   gcloud logging read \
     'resource.type=cloud_run_revision AND resource.labels.service_name=w3' \
     --limit=20
   ```
3. Increase health check timeout in Dockerfile if needed

#### Issue: Application timeout (504 Gateway Timeout)

**Solution:**
- Increase timeout in `cloudbuild.yaml`:
  ```yaml
  --timeout=120s
  ```
- Optimize Next.js build time
- Check database connection pooling

### Runtime Issues

#### Issue: Out of memory errors

**Solution:**
- Increase memory allocation:
  ```bash
  gcloud run deploy w3 --memory=1Gi
  ```
- Check logs for memory leaks
- Optimize image size

#### Issue: Secret not accessible in Cloud Run

**Solution:**
1. Verify secret exists:
   ```bash
   gcloud secrets list
   ```
2. Check access permissions:
   ```bash
   gcloud secrets get-iam-policy database-url
   ```
3. Verify Cloud Run service account has access:
   ```bash
   gcloud secrets add-iam-policy-binding database-url \
     --member=serviceAccount:cloud-build-deployer@PROJECT_ID.iam.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   ```

---

## Rollback Procedures

### Automatic Rollback

Automatic rollback happens when:
1. Deployment completes but traffic split fails
2. Health checks fail
3. Build fails

The pipeline automatically reverts to the previous revision with 100% traffic.

### Manual Rollback (10% to Previous)

```bash
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=PREVIOUS=100
```

### Manual Rollback (Specific Revision)

```bash
# List available revisions
gcloud run revisions list --service=w3 --region=us-central1

# Route traffic to specific revision
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=w3-v1=100
```

### Gradual Rollback (Canary in Reverse)

```bash
# Step 1: Move 10% traffic to previous
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=PREVIOUS=10,LATEST=90

# Step 2: Monitor for issues

# Step 3a: If stable, move to 100% previous
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=PREVIOUS=100

# Step 3b: If unstable, revert
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=LATEST=100
```

---

## Cost Optimization

### Reduce Costs

1. **Memory allocation:** Start with 512Mi, increase if needed
   ```bash
   gcloud run deploy w3 --memory=512Mi
   ```

2. **Max instances:** Set reasonable limit (100 is default)
   ```bash
   gcloud run deploy w3 --max-instances=100
   ```

3. **Image retention:** Clean old images in Artifact Registry
   ```bash
   # Set automatic cleanup
   gcloud artifacts repositories update node-apps \
     --location=us \
     --cleanup-policy=DELETE_UNREACHABLE
   ```

4. **Build optimization:**
   - Use smaller base images (alpine)
   - Multi-stage builds (already implemented)
   - Exclude unnecessary files (.dockerignore)

5. **Cloud Build:** Use cheaper machine types for simple builds
   ```yaml
   options:
     machineType: 'N1_STANDARD_2'
   ```

### Monitor Costs

```bash
# View Cloud Run costs
gcloud billing accounts list
gcloud billing accounts describe ACCOUNT_ID

# Estimate costs
# Cloud Run: $0.0000002/vCPU/second + $0.0000025/GB/second
# Artifact Registry: $0.40/GB/month
# Cloud Build: $0.003/build-minute (free tier: 120 min/day)
```

---

## Advanced Configuration

### Custom Domain

```bash
# Map custom domain to Cloud Run service
gcloud run services update w3 \
  --set-cloud-sql-instances=INSTANCE_CONNECTION_NAME

# For custom domain:
# 1. Go to Cloud Console → Cloud Run → w3 → Set Up Custom Domain
# 2. Add DNS CNAME record pointing to Cloud Run domain
# 3. SSL certificate is automatic
```

### Database Connection Pooling

For PostgreSQL with Prisma:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

Set connection pool in SECRET:
```bash
echo "postgresql://user:pass@host:5432/db?schema=public" | \
  gcloud secrets create database-url --data-file=-
```

### CI/CD with Cloud SQL

```bash
# Connect Cloud SQL instance to Cloud Run
gcloud run deploy w3 \
  --set-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars=DATABASE_URL=postgres://socket_dir/db
```

---

## Support & Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
