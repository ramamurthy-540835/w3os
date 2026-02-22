# 🚀 Quick Start Checklist - Cloud Run Deployment

Follow this checklist to get your Next.js app deployed to Cloud Run in 15 minutes.

## Phase 1: GitHub Connection (5 minutes)

- [ ] Open https://console.cloud.google.com/cloud-build/connect
- [ ] Click "Connect Repository"
- [ ] Select "GitHub" and click "Authorize"
- [ ] Authenticate with your GitHub account
- [ ] Select repository: `valarama/w3`
- [ ] Click "Connect"

**✅ GitHub is now connected to Cloud Build**

---

## Phase 2: Create Cloud Build Trigger (2 minutes)

Choose one option:

### Option A: Automated (Recommended)
```bash
cd /home/appadmin/w3
bash CREATE_GITHUB_TRIGGER.sh
```

### Option B: Manual
- [ ] Go to https://console.cloud.google.com/cloud-build/triggers
- [ ] Click "Create Trigger"
- [ ] **Name:** `nextjs-w3-prod`
- [ ] **Event:** Push to a branch
- [ ] **Repository:** `valarama/w3`
- [ ] **Branch:** `^main$`
- [ ] **Build config:** Cloud Build configuration file
- [ ] **Config file location:** `cloudbuild.yaml`
- [ ] Scroll to "Substitutions" and add:
  - `_GCP_PROJECT_ID` = `ctoteam`
  - `_SERVICE_NAME` = `w3`
  - `_REGION` = `us-central1`
  - `_IMAGE_REPO` = `us-docker.pkg.dev/ctoteam/node-apps`
- [ ] Click "Create"

**✅ Cloud Build trigger is now created**

---

## Phase 3: Add Health Check Endpoint (2 minutes)

Create `pages/api/health.ts` in your Next.js app:

```typescript
export default function handler(req, res) {
  res.status(200).json({ status: 'healthy' });
}
```

- [ ] File created: `pages/api/health.ts`
- [ ] Endpoint returns `{ status: 'healthy' }`

**✅ Health check endpoint is ready**

---

## Phase 4: Update Secrets (3 minutes)

Update placeholder values with real credentials:

```bash
# Database URL
echo "postgresql://user:password@host/database" | \
  gcloud secrets versions add database-url --data-file=-

# API Key
echo "your-actual-api-key" | \
  gcloud secrets versions add api-key --data-file=-

# OAuth Secret
echo "your-oauth-secret" | \
  gcloud secrets versions add oauth-secret --data-file=-
```

- [ ] `database-url` secret updated
- [ ] `api-key` secret updated
- [ ] `oauth-secret` secret updated

**✅ Secrets are configured**

---

## Phase 5: Test Docker Build (5 minutes)

Verify Docker configuration works locally:

```bash
# Build
docker build -t w3:test .

# Run
docker run -p 3005:3005 w3:test

# Test (in another terminal)
curl http://localhost:3005/api/health
```

- [ ] Docker image builds successfully
- [ ] Container runs without errors
- [ ] Health endpoint responds with 200
- [ ] Container stops cleanly (Ctrl+C)

**✅ Docker configuration is correct**

---

## Phase 6: Deploy (1 minute)

Push to main branch to trigger Cloud Build:

```bash
git add .
git commit -m "Add Cloud Run CI/CD pipeline"
git push origin main
```

- [ ] Changes committed
- [ ] Pushed to main branch

**✅ Deployment triggered!**

---

## Phase 7: Monitor Deployment (3 minutes)

### Watch the build:
```bash
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)') --follow
```

- [ ] Build started
- [ ] Docker image built successfully
- [ ] Image pushed to Artifact Registry
- [ ] Cloud Run deployment initiated
- [ ] Health checks passing
- [ ] Build completed successfully

### Verify Cloud Run service:
```bash
gcloud run services describe w3 --region=us-central1
```

- [ ] Service created: `w3`
- [ ] Region: `us-central1`
- [ ] Status: Running
- [ ] Traffic split: 90% old / 10% new (canary)

### Test the deployment:
```bash
# Get service URL from above output, then:
curl https://w3-HASH.run.app/api/health
```

- [ ] Service URL obtained
- [ ] Health endpoint responds with 200
- [ ] Application is live!

**✅ Deployment successful!**

---

## Phase 8: Promote to 100% (Optional - After Testing)

After verifying everything works, promote the new version:

```bash
gcloud run services update-traffic w3 \
  --region=us-central1 \
  --to-revisions=LATEST=100
```

- [ ] Confirmed new version is working
- [ ] Promoted to 100% traffic
- [ ] Previous version still available for rollback

**✅ Fully deployed to production**

---

## 🎉 You're Done!

Your Next.js application is now deployed to Google Cloud Run with:

✅ Automated CI/CD pipeline (Cloud Build)
✅ Canary deployments with auto-rollback
✅ Auto-scaling (0-100 instances)
✅ Automatic HTTPS
✅ Health checks and monitoring

### Next Actions:
- Monitor logs: `gcloud logging read 'resource.type=cloud_run_revision' --follow`
- Set up alerts: https://console.cloud.google.com/monitoring
- Configure custom domain: Cloud Console → Cloud Run → w3 → Set up custom domain
- Enable Cloud Armor: Cloud Console → Cloud Run → w3 → Security

### Make more changes:
Just push to main branch - Cloud Build will automatically:
1. Build your application
2. Test via health check
3. Deploy with canary split (10% new, 90% old)
4. Auto-rollback if health check fails
5. Monitor and alert

---

## ⏱️ Time Summary

- GitHub Connection: 5 minutes ✓
- Create Trigger: 2 minutes ✓
- Add Health Check: 2 minutes ✓
- Update Secrets: 3 minutes ✓
- Test Docker: 5 minutes ✓
- Deploy: 1 minute ✓
- Monitor: 3 minutes ✓

**Total Time: ~15 minutes** ⏱️

---

## 🆘 Troubleshooting

**Build fails?**
→ Check: `gcloud builds log <BUILD_ID>`

**Health check fails?**
→ Verify endpoint: `curl http://localhost:3005/api/health`

**Deployment not showing?**
→ Check: `gcloud run services list --region=us-central1`

**Need to rollback?**
→ Run: `gcloud run services update-traffic w3 --region=us-central1 --to-revisions=PREVIOUS=100`

**More help?**
→ Read: [DEPLOYMENT.md](./DEPLOYMENT.md) or [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📚 Documentation

- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** - Detailed setup guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical deep-dive

