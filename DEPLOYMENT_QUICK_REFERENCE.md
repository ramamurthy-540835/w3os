# W3 Desktop - Deployment Quick Reference
## One-Page Cheat Sheet

---

## 🚀 Deploy in 5 Steps

```bash
# 1️⃣ Setup (creates secrets & .env.local)
./SETUP_SECURE_DEPLOYMENT.sh

# 2️⃣ Complete OAuth2 (manual, ~5 min)
# Follow prompts, then run:
gcloud secrets create GOOGLE_CLIENT_ID --data-file=- <<< "YOUR_ID"
gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- <<< "YOUR_SECRET"

# 3️⃣ Edit .env.local (add OAuth values)
nano .env.local

# 4️⃣ Deploy (submits to Cloud Build)
gcloud builds submit --config=cloudbuild.yaml

# 5️⃣ Get URL
gcloud run services describe w3 --region us-central1
```

---

## 📁 Files Updated for AI Assistant

| File | Change |
|------|--------|
| `.env.local` | ✨ **NEW** - Contains AI_ASSISTANT_SYSTEM_PROMPT |
| `cloudbuild.yaml` | ✅ Updated - Includes GOOGLE_CLIENT_ID/SECRET |
| `Dockerfile` | ✅ Updated - Health check + AI config |
| `app/api/ai/route.ts` | ✨ **NEW** - AI endpoint |
| `lib/ai-assistant.ts` | ✨ **NEW** - Config loader |

---

## 🔑 Environment Variables

### Development (`.env.local`)
```env
GEMINI_API_KEY=xxx
YOUTUBE_API_KEY=xxx
SERPAPI_KEY=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
AI_ASSISTANT_SYSTEM_PROMPT="You are Claude..."
NODE_ENV=development
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

### Production (Secret Manager)
Same variables, stored in Google Cloud Secret Manager instead of `.env.local`

---

## 📊 Deployment Flow

```
Local Dev (.env.local)
         ↓
  gcloud builds submit
         ↓
  Cloud Build (reads from Secret Manager)
         ↓
  Docker Build (app/Dockerfile)
         ↓
  Push to Artifact Registry
         ↓
  Cloud Run Deploy (injects secrets at runtime)
         ↓
  Your App! https://w3-xxx.run.app
```

---

## ✅ Testing

### Local
```bash
npm run dev
curl http://localhost:3000/api/ai
curl http://localhost:3000/api/health
```

### Production
```bash
curl https://YOUR_CLOUD_RUN_URL/api/ai
curl https://YOUR_CLOUD_RUN_URL/api/health
```

### View Logs
```bash
gcloud run logs read w3 --region us-central1 --limit 50
```

---

## 🛠️ Common Commands

```bash
# View all secrets
gcloud secrets list

# Update a secret
echo "new_value" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# View deployment status
gcloud builds list

# View service details
gcloud run services describe w3 --region us-central1

# View real-time logs
gcloud run logs read w3 --region us-central1 --stream

# Redeploy
gcloud builds submit --config=cloudbuild.yaml
```

---

## 🔐 Security Checklist

- [ ] `.env.local` in `.gitignore` ✅ (already done)
- [ ] Old API keys revoked
- [ ] New API keys created
- [ ] Secrets in Secret Manager (not in code)
- [ ] Cloud Build has Secret Accessor role
- [ ] Cloud Run has Secret Accessor role
- [ ] OAuth2 redirect URIs configured
- [ ] Health check passing
- [ ] Logs show no errors

---

## 📞 Troubleshooting

**Build fails?**
```bash
gcloud builds log [BUILD_ID]
# Check: secrets exist, permissions granted, Dockerfile syntax
```

**App doesn't start?**
```bash
gcloud run logs read w3 --region us-central1 --severity ERROR
# Check: environment variables loaded, ports correct
```

**Secrets not accessible?**
```bash
gcloud secrets list
gcloud secrets get-iam-policy GEMINI_API_KEY
# Check: service account has roles/secretmanager.secretAccessor
```

**App is slow?**
```bash
# Increase resources in cloudbuild.yaml:
--memory=4Gi --cpu=4 --max-instances=100
```

---

## 📖 Full Docs

- **Setup Guide:** `SECURE_CLOUD_DEPLOYMENT.md`
- **Deployment Guide:** `DEPLOYMENT_WITH_AI_ASSISTANT.md`
- **Setup Script:** `SETUP_SECURE_DEPLOYMENT.sh`

---

## 🎯 Key URLs

| Service | URL |
|---------|-----|
| Google Cloud Console | https://console.cloud.google.com |
| Secret Manager | https://console.cloud.google.com/security/secret-manager |
| Cloud Run | https://console.cloud.google.com/run |
| Artifact Registry | https://console.cloud.google.com/artifacts |
| Cloud Build | https://console.cloud.google.com/cloud-build |

---

## 💡 Pro Tips

1. **Use Cloud Build Triggers** for auto-deploy on push:
   ```bash
   gcloud builds create --github-name=YOUR_REPO
   ```

2. **Monitor in Real-Time:**
   ```bash
   gcloud run logs read w3 --region us-central1 --stream
   ```

3. **Update Only Secrets Without Rebuilding:**
   ```bash
   echo "new_key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
   # Restart service:
   gcloud run deploy w3 --region us-central1 --image=[CURRENT_IMAGE]
   ```

4. **Check Deployment Size:**
   ```bash
   gcloud run services describe w3 --region us-central1 | grep memory
   ```

---

## 🚀 You're Done!

Your W3 Desktop is live! 🎉

Access it at: `https://YOUR_CLOUD_RUN_URL`

Questions? Check logs: `gcloud run logs read w3 --region us-central1`
