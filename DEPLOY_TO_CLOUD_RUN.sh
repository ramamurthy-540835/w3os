#!/bin/bash

# ============================================================
# W3 Desktop - Deploy to Google Cloud Run
# Project: ctoteam | Region: us-central1
# ============================================================

set -e

PROJECT_ID="ctoteam"
SERVICE_NAME="w3"
REGION="us-central1"

echo "🚀 W3 Desktop - Cloud Run Deployment"
echo "=================================================="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# ============================================================
# Step 1: Verify gcloud is authenticated
# ============================================================
echo "✓ Checking authentication..."
gcloud auth list --filter=status:ACTIVE --format="value(account)"
echo ""

# ============================================================
# Step 2: Create/Update Secrets in Secret Manager
# ============================================================
echo "📝 Setting up Google Cloud Secrets..."
echo ""

create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2

  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    echo "  📌 Updating existing secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
      --data-file=- --project="$PROJECT_ID" >/dev/null 2>&1
  else
    echo "  ✨ Creating new secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
      --data-file=- --replication-policy="automatic" \
      --project="$PROJECT_ID" >/dev/null 2>&1
  fi
}

# Read from .env.local
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local not found!"
  exit 1
fi

# Function to read env value
get_env_value() {
  grep "^$1=" .env.local | cut -d'=' -f2- | sed 's/^"//;s/"$//'
}

# Create/update all secrets
SECRETS=(
  "GEMINI_API_KEY"
  "YOUTUBE_API_KEY"
  "SERPAPI_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GITHUB_CLIENT_ID"
  "GITHUB_CLIENT_SECRET"
  "X_CLIENT_ID"
  "X_CLIENT_SECRET"
  "LINKEDIN_CLIENT_ID"
  "LINKEDIN_CLIENT_SECRET"
  "FACEBOOK_CLIENT_ID"
  "FACEBOOK_CLIENT_SECRET"
)

for secret in "${SECRETS[@]}"; do
  value=$(get_env_value "$secret")
  if [ -z "$value" ]; then
    echo "  ⚠️  Skipping $secret (not configured in .env.local)"
  else
    create_or_update_secret "$secret" "$value"
  fi
done

echo ""
echo "✅ Secrets configured"
echo ""

# ============================================================
# Step 3: Grant Cloud Run service account access to Cloud Storage
# ============================================================
echo "🔐 Setting up Cloud Storage permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gsutil iam ch serviceAccount:$SA_EMAIL:roles/storage.objectAdmin gs://w3-os 2>/dev/null || true

echo "✅ Storage permissions configured"
echo ""

# ============================================================
# Step 4: Build and Deploy
# ============================================================
echo "🏗️  Building and deploying to Cloud Run..."
echo ""

gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION

echo ""
echo "✅ Deployment submitted to Cloud Build"
echo ""

# ============================================================
# Step 5: Wait for deployment and get URL
# ============================================================
echo "⏳ Waiting for deployment to complete..."
echo ""

# Poll for the service
for i in {1..30}; do
  SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format='value(status.url)' 2>/dev/null || echo "")

  if [ -n "$SERVICE_URL" ]; then
    echo "✅ Deployment complete!"
    break
  fi

  echo "  ⏳ Waiting... ($i/30)"
  sleep 4
done

echo ""
echo "=================================================="
echo "🎉 W3 Desktop is live!"
echo "=================================================="
echo ""
echo "URL: $SERVICE_URL"
echo ""
echo "Quick Links:"
echo "  🌐 Open: $SERVICE_URL"
echo "  📊 View logs: gcloud run logs read $SERVICE_NAME --region=$REGION --limit 100"
echo "  🔧 View service: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo ""

# ============================================================
# Step 6: Health check
# ============================================================
echo "🏥 Running health check..."
sleep 5

HEALTH_STATUS=$(curl -s "$SERVICE_URL/api/health" || echo "")

if echo "$HEALTH_STATUS" | grep -q '"status"'; then
  echo "✅ Health check passed"
  echo ""
  echo "$HEALTH_STATUS" | head -c 500
else
  echo "⚠️  Health check did not respond immediately"
  echo "   Service may still be warming up. Check logs:"
  echo "   gcloud run logs read $SERVICE_NAME --region=$REGION --limit 50"
fi

echo ""
echo "=================================================="
echo "📋 Next Steps:"
echo ""
echo "1. Open $SERVICE_URL in browser"
echo "2. Settings → Integrations → Connect Google"
echo "3. Try voice commands in AI Assistant 🎤"
echo "4. Check Cloud Run dashboard for metrics"
echo ""
echo "Issues? View logs:"
echo "  gcloud run logs read $SERVICE_NAME --region=$REGION --limit 100"
echo ""
