#!/bin/bash

# GCP Setup Script for Next.js 16 Cloud Build CI/CD Pipeline
# This script configures all necessary GCP resources for production deployment
# Usage: bash GCP_SETUP.sh <PROJECT_ID> <REGION>

set -e

# Color output for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate arguments
if [ $# -lt 1 ]; then
  echo -e "${RED}Error: Missing required arguments${NC}"
  echo "Usage: bash GCP_SETUP.sh <PROJECT_ID> [REGION]"
  echo "Example: bash GCP_SETUP.sh my-project us-central1"
  exit 1
fi

PROJECT_ID="$1"
REGION="${2:-us-central1}"
SERVICE_NAME="w3"
SERVICE_ACCOUNT_NAME="cloud-build-deployer"
ARTIFACT_REPO="node-apps"

echo -e "${YELLOW}Starting GCP Setup for Next.js 16 Application${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo "Service Account: $SERVICE_ACCOUNT_NAME"
echo ""

# Step 1: Set the project
echo -e "${YELLOW}[1/9]${NC} Setting GCP project..."
gcloud config set project "$PROJECT_ID"

# Step 2: Enable required APIs
echo -e "${YELLOW}[2/9]${NC} Enabling required Google Cloud APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  container.googleapis.com \
  iam.googleapis.com

echo -e "${GREEN}✓${NC} APIs enabled"

# Step 3: Create Artifact Registry repository
echo -e "${YELLOW}[3/9]${NC} Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="us" --project="$PROJECT_ID" &>/dev/null; then
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location=us \
    --project="$PROJECT_ID" \
    --description="Docker repository for Next.js applications"
  echo -e "${GREEN}✓${NC} Artifact Registry repository created"
else
  echo -e "${GREEN}✓${NC} Artifact Registry repository already exists"
fi

# Step 4: Create service account
echo -e "${YELLOW}[4/9]${NC} Creating Cloud Build service account..."
if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" --project="$PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="Cloud Build Deployer Service Account" \
    --description="Service account for Cloud Build CI/CD pipeline" \
    --project="$PROJECT_ID"
  echo -e "${GREEN}✓${NC} Service account created"
else
  echo -e "${GREEN}✓${NC} Service account already exists"
fi

SA_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Step 5: Grant IAM roles to service account
echo -e "${YELLOW}[5/9]${NC} Granting IAM roles to service account..."

# Roles to grant
ROLES=(
  "roles/artifactregistry.writer"      # Push images to Artifact Registry
  "roles/run.admin"                    # Deploy to Cloud Run
  "roles/run.developer"                # Manage Cloud Run services
  "roles/iam.serviceAccountUser"       # Use service accounts
  "roles/secretmanager.secretAccessor" # Read secrets
)

for role in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role" \
    --quiet 2>/dev/null || true
done

echo -e "${GREEN}✓${NC} IAM roles granted"

# Step 6: Grant Cloud Build service account permissions
echo -e "${YELLOW}[6/9]${NC} Configuring Cloud Build service account permissions..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUD_BUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

# Grant Cloud Build SA permission to impersonate deployer SA
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/iam.serviceAccountUser" \
  --quiet 2>/dev/null || true

# Grant Cloud Build SA access to Secret Manager
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

echo -e "${GREEN}✓${NC} Cloud Build service account permissions configured"

# Step 7: Create Secret Manager secrets (example structure)
echo -e "${YELLOW}[7/9]${NC} Setting up Secret Manager..."
echo "Note: You will need to manually set secret values with:"
echo "  gcloud secrets create <SECRET_NAME> --replication-policy=\"automatic\" --data-file=-"
echo ""
echo "Required secrets (create if needed):"

SECRETS=(
  "database-url"
  "api-key"
  "oauth-secret"
)

for secret in "${SECRETS[@]}"; do
  if ! gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    echo "  - Creating secret: $secret"
    echo "placeholder" | gcloud secrets create "$secret" \
      --replication-policy="automatic" \
      --project="$PROJECT_ID" \
      --data-file=- 2>/dev/null || true
    echo -e "${YELLOW}  ⚠${NC} Update with real value: gcloud secrets versions add $secret --data-file=-"
  else
    echo "  - Secret exists: $secret"
  fi
done

echo -e "${GREEN}✓${NC} Secret Manager setup complete"

# Step 8: Create Cloud Build trigger (manual step required)
echo -e "${YELLOW}[8/9]${NC} Cloud Build Trigger Setup Instructions..."
echo ""
echo "To connect your GitHub repository and create a Cloud Build trigger:"
echo "1. Go to Cloud Console: https://console.cloud.google.com/cloud-build/triggers"
echo "2. Click 'Create Trigger'"
echo "3. Configure:"
echo "   - Name: nextjs-w3-prod"
echo "   - Event: Push to a branch"
echo "   - Repository: Select your GitHub repo"
echo "   - Branch: ^main\$"
echo "   - Build configuration: Cloud Build configuration file"
echo "   - Cloud Build configuration file location: cloudbuild.yaml"
echo "4. Add Substitution Variables:"
echo "   - _GCP_PROJECT_ID = $PROJECT_ID"
echo "   - _SERVICE_NAME = $SERVICE_NAME"
echo "   - _REGION = $REGION"
echo "   - _IMAGE_REPO = us-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REPO"
echo "5. Click 'Create'"
echo ""

# Step 9: Display summary
echo -e "${YELLOW}[9/9]${NC} Setup Complete!"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Service Account: $SA_EMAIL"
echo "  Artifact Registry: us-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REPO"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Create a Cloud Build trigger (see instructions above)"
echo "2. Set up Secret Manager secrets with real values"
echo "3. Add a health check endpoint to your Next.js app (GET /api/health)"
echo "4. Commit and push to main branch to trigger first build"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  # Manual build submission:"
echo "  gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "  # View build logs:"
echo "  gcloud builds log <BUILD_ID>"
echo ""
echo "  # List Cloud Run services:"
echo "  gcloud run services list --region=$REGION"
echo ""
echo "  # Describe Cloud Run service:"
echo "  gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""
echo "  # View Cloud Run logs:"
echo "  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME' --limit 50 --format json"
echo ""
echo "  # Manual rollback:"
echo "  gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=PREVIOUS=100"
echo ""
echo "  # Canary deployment (10% traffic):"
echo "  gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=LATEST=10,PREVIOUS=90"
echo ""

# Step 10: Create Health Check API endpoint (Next.js)
echo -e "${YELLOW}Important:${NC} Create a health check endpoint in your Next.js app:"
echo ""
echo "File: src/pages/api/health.ts (or pages/api/health.ts)"
echo "---"
echo "export default function handler(req, res) {"
echo "  res.status(200).json({ status: 'healthy' })"
echo "}"
echo "---"
echo ""
echo "This endpoint is required for Cloud Run health checks to work properly."
echo ""
