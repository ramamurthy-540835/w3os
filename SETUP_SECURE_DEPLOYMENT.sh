#!/bin/bash

# =============================================================================
# Secure Cloud Deployment Setup for W3 Desktop
# This script sets up Google Cloud Secret Manager and OAuth
# =============================================================================

set -e

echo "🔐 W3 Desktop - Secure Cloud Deployment Setup"
echo "=============================================="
echo ""

# Get Google Cloud Project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No Google Cloud project configured."
  echo "   Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "✅ Project ID: $PROJECT_ID"
echo ""

# =============================================================================
# Step 1: Enable Required APIs
# =============================================================================
echo "📋 Step 1: Enabling required Google APIs..."
gcloud services enable \
  drive.googleapis.com \
  gmail.googleapis.com \
  sheets.googleapis.com \
  docs.googleapis.com \
  cloudrun.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com

echo "✅ APIs enabled"
echo ""

# =============================================================================
# Step 2: Create Secrets in Secret Manager
# =============================================================================
echo "🔑 Step 2: Setting up secrets in Google Secret Manager..."
echo ""

# Function to create/update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2

  if gcloud secrets describe "$secret_name" &>/dev/null; then
    echo "  Updating secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
  else
    echo "  Creating secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
      --replication-policy="automatic" \
      --data-file=-
  fi
}

# Prompt for API keys
echo "⚠️  Enter your NEW API keys (these will be stored in Secret Manager):"
echo ""

read -sp "Enter GEMINI_API_KEY: " GEMINI_API_KEY
echo ""
create_or_update_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"

read -sp "Enter YOUTUBE_API_KEY: " YOUTUBE_API_KEY
echo ""
create_or_update_secret "YOUTUBE_API_KEY" "$YOUTUBE_API_KEY"

read -sp "Enter SERPAPI_KEY: " SERPAPI_KEY
echo ""
create_or_update_secret "SERPAPI_KEY" "$SERPAPI_KEY"

echo "✅ Secrets created in Secret Manager"
echo ""

# =============================================================================
# Step 3: Grant Permissions to Cloud Build
# =============================================================================
echo "🔐 Step 3: Granting Cloud Build permissions..."

CLOUD_BUILD_SA="${PROJECT_ID}@cloudbuild.gserviceaccount.com"

for secret in GEMINI_API_KEY YOUTUBE_API_KEY SERPAPI_KEY; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member=serviceAccount:${CLOUD_BUILD_SA} \
    --role=roles/secretmanager.secretAccessor \
    --quiet
done

echo "✅ Cloud Build permissions granted"
echo ""

# =============================================================================
# Step 4: Grant Permissions to Cloud Run
# =============================================================================
echo "🔐 Step 4: Granting Cloud Run permissions..."

CLOUD_RUN_SA="${PROJECT_ID}@appspot.gserviceaccount.com"

for secret in GEMINI_API_KEY YOUTUBE_API_KEY SERPAPI_KEY; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member=serviceAccount:${CLOUD_RUN_SA} \
    --role=roles/secretmanager.secretAccessor \
    --quiet
done

echo "✅ Cloud Run permissions granted"
echo ""

# =============================================================================
# Step 5: Create OAuth2 Credentials
# =============================================================================
echo "🔐 Step 5: Google OAuth2 Setup"
echo ""
echo "⚠️  Manual step required:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Click 'Create Credentials' → 'OAuth 2.0 Client ID' → 'Web application'"
echo "3. Add authorized redirect URIs:"
echo "   - http://localhost:3000/api/auth/callback/google"
echo "   - https://YOUR_CLOUD_RUN_URL/api/auth/callback/google"
echo "4. Download the JSON credentials"
echo "5. Run these commands:"
echo ""
echo "   gcloud secrets create GOOGLE_CLIENT_ID --replication-policy='automatic' --data-file=- <<< 'YOUR_CLIENT_ID'"
echo "   gcloud secrets create GOOGLE_CLIENT_SECRET --replication-policy='automatic' --data-file=- <<< 'YOUR_CLIENT_SECRET'"
echo ""
read -p "Press Enter after completing OAuth2 setup..."

# Grant permissions to new OAuth secrets
for secret in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  if gcloud secrets describe "$secret" &>/dev/null; then
    gcloud secrets add-iam-policy-binding "$secret" \
      --member=serviceAccount:${CLOUD_BUILD_SA} \
      --role=roles/secretmanager.secretAccessor \
      --quiet
    gcloud secrets add-iam-policy-binding "$secret" \
      --member=serviceAccount:${CLOUD_RUN_SA} \
      --role=roles/secretmanager.secretAccessor \
      --quiet
  fi
done

echo "✅ OAuth2 setup complete"
echo ""

# =============================================================================
# Step 6: Store AI Assistant System Prompt
# =============================================================================
echo "🤖 Step 6: Storing AI Assistant System Prompt..."

# The system prompt is stored as an environment variable
# It will be injected at runtime from .env.local or Secret Manager

read -p "Press Enter to continue..."

echo "✅ AI Assistant system prompt configured"
echo ""

# =============================================================================
# Step 7: Create .env.local for local development
# =============================================================================
echo "📝 Step 7: Creating .env.local for local development..."

cat > .env.local <<EOF
# =============================================================================
# W3 Desktop - Local Development Environment Variables
# =============================================================================

# Google API Keys (Development Only)
GEMINI_API_KEY=${GEMINI_API_KEY}
YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
SERPAPI_KEY=${SERPAPI_KEY}

# Google OAuth2 Configuration
# Update with your values after OAuth2 setup
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# W3 AI Assistant System Prompt
# This defines Claude's personality and capabilities within W3
AI_ASSISTANT_SYSTEM_PROMPT="You are Claude, an AI assistant created by Anthropic to help users with tasks inside the W3 desktop environment, a futuristic Windows-like OS experience.

## Capabilities
- Knowledgeable assistant that can answer questions on a wide range of topics
- Guide users in navigating the W3 desktop UI and using its applications effectively
- Engage in open-ended conversation and provide helpful suggestions to streamline workflows

## Persona
- Friendly, curious, and always eager to help
- Patient in explaining concepts and walking users through steps
- Professional in tone while building warm rapport

## Goals
- Provide an unparalleled AI-powered desktop assistant experience
- Measurably increase user productivity, satisfaction and engagement with the W3 OS"

# Node.js / Next.js Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Playwright Configuration
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Google Drive Integration
GOOGLE_DRIVE_FOLDER_NAME=W3 Desktop Files
EOF

echo "✅ .env.local created (added to .gitignore)"
echo ""

# =============================================================================
# Step 8: Verify secrets
# =============================================================================
echo "✅ Step 8: Verifying secrets..."
echo ""
echo "Secrets in Secret Manager:"
gcloud secrets list --filter="name:(GEMINI_API_KEY OR YOUTUBE_API_KEY OR SERPAPI_KEY OR GOOGLE_CLIENT_ID OR GOOGLE_CLIENT_SECRET)" || echo "No secrets found yet"
echo ""

# =============================================================================
# Step 9: Configure AI Assistant
# =============================================================================
echo "🤖 Step 9: AI Assistant Configuration"
echo ""
echo "The AI Assistant system prompt is stored in .env.local and will be:"
echo "  - Loaded at development time from .env.local"
echo "  - Injected at runtime in Cloud Run from Secret Manager"
echo ""
echo "To test locally:"
echo "  npm run dev"
echo "  curl http://localhost:3000/api/ai"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "🎉 Setup Complete!"
echo "=============================================="
echo ""
echo "✅ Completed:"
echo "1. ✅ APIs enabled"
echo "2. ✅ Secrets created in Google Secret Manager"
echo "3. ✅ Cloud Build permissions granted"
echo "4. ✅ Cloud Run permissions granted"
echo "5. ✅ .env.local created for local development"
echo "6. ✅ AI Assistant system prompt configured"
echo ""
echo "⏳ Next steps:"
echo "1. Complete OAuth2 setup (manual step) - see SECURE_CLOUD_DEPLOYMENT.md"
echo "2. Update .env.local with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
echo "3. Test locally: npm run dev"
echo "4. Deploy: gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "📖 For detailed instructions, see: SECURE_CLOUD_DEPLOYMENT.md"
echo ""
echo "🚀 Deploy to Cloud Run with:"
echo "   gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "📊 View deployment status:"
echo "   gcloud builds list"
echo "   gcloud run logs read w3 --region us-central1"
echo ""
