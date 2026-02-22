#!/bin/bash

# Create Cloud Build GitHub Trigger for Next.js w3 Application
# This script creates a Cloud Build trigger connected to your GitHub repository

set -e

# Configuration
PROJECT_ID="ctoteam"
GITHUB_OWNER="valarama"
GITHUB_REPO="w3"
TRIGGER_NAME="nextjs-w3-prod"
SERVICE_NAME="w3"
REGION="us-central1"
IMAGE_REPO="us-docker.pkg.dev/${PROJECT_ID}/node-apps"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cloud Build GitHub Trigger Setup for Next.js Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  GitHub Owner: $GITHUB_OWNER"
echo "  GitHub Repository: $GITHUB_REPO"
echo "  Trigger Name: $TRIGGER_NAME"
echo "  Region: $REGION"
echo ""

# Step 1: Check if GitHub connection exists
echo "Step 1: Checking GitHub connection..."
GITHUB_CONNECTION=$(gcloud builds connect --dry-run --repository-name="$GITHUB_REPO" --repository-owner="$GITHUB_OWNER" 2>/dev/null || echo "NOT_CONFIGURED")

if [ "$GITHUB_CONNECTION" == "NOT_CONFIGURED" ]; then
    echo "⚠️  GitHub connection not found. You need to authenticate with GitHub first."
    echo ""
    echo "To connect GitHub to Cloud Build:"
    echo "1. Go to: https://console.cloud.google.com/cloud-build/connect"
    echo "2. Click 'Connect Repository'"
    echo "3. Select 'GitHub' as the source"
    echo "4. Click 'Authorize' and authenticate with your GitHub account"
    echo "5. Select the repository: valarama/w3"
    echo "6. Click 'Connect'"
    echo ""
    echo "After connecting, run this script again."
    exit 1
fi

echo "✓ GitHub repository is connected"
echo ""

# Step 2: Create the trigger
echo "Step 2: Creating Cloud Build trigger..."
gcloud builds triggers create github \
    --name="$TRIGGER_NAME" \
    --description="CI/CD pipeline for Next.js 16 application" \
    --repo-name="$GITHUB_REPO" \
    --repo-owner="$GITHUB_OWNER" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --substitutions="_GCP_PROJECT_ID=$PROJECT_ID,_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION,_IMAGE_REPO=$IMAGE_REPO" \
    --project="$PROJECT_ID" \
    2>/dev/null || echo "Trigger already exists or could not be created"

echo "✓ Cloud Build trigger created/verified"
echo ""

# Step 3: Verify trigger
echo "Step 3: Verifying trigger..."
TRIGGER_ID=$(gcloud builds triggers describe "$TRIGGER_NAME" --format="value(id)" --project="$PROJECT_ID" 2>/dev/null || echo "NOT_FOUND")

if [ "$TRIGGER_ID" != "NOT_FOUND" ]; then
    echo "✓ Trigger verified successfully"
    echo "  Trigger ID: $TRIGGER_ID"
    echo "  Trigger Name: $TRIGGER_NAME"
    echo ""
else
    echo "⚠️  Could not verify trigger. Please check manually:"
    echo "  https://console.cloud.google.com/cloud-build/triggers"
fi

# Step 4: Display next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setup Complete! Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ✅ Verify Health Endpoint"
echo "   Add this to your Next.js app: pages/api/health.ts"
echo ""
echo "   export default function handler(req, res) {"
echo "     res.status(200).json({ status: 'healthy' })"
echo "   }"
echo ""
echo "2. ✅ Set Secret Manager Values"
echo "   Update secrets with real values:"
echo ""
echo "   # Database URL"
echo "   echo 'postgresql://user:pass@host/db' | \\"
echo "   gcloud secrets versions add database-url --data-file=-"
echo ""
echo "   # API Key"
echo "   echo 'your-api-key' | \\"
echo "   gcloud secrets versions add api-key --data-file=-"
echo ""
echo "   # OAuth Secret"
echo "   echo 'your-oauth-secret' | \\"
echo "   gcloud secrets versions add oauth-secret --data-file=-"
echo ""
echo "3. ✅ Deploy to Cloud Run (Initial)"
echo "   First deployment via push to main:"
echo ""
echo "   git add ."
echo "   git commit -m 'Add Cloud Run CI/CD pipeline'"
echo "   git push origin main"
echo ""
echo "   Cloud Build will automatically trigger on push!"
echo ""
echo "4. ⏱️  Monitor the build:"
echo "   Open Cloud Build Console: https://console.cloud.google.com/cloud-build/builds"
echo ""
echo "5. 📊 Verify deployment in Cloud Run:"
echo "   Command: gcloud run services list --region=$REGION"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Useful Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# View Cloud Build logs for latest build"
echo "gcloud builds log \$(gcloud builds list --limit=1 --format='value(id)') --follow"
echo ""
echo "# List all Cloud Run services"
echo "gcloud run services list --region=$REGION"
echo ""
echo "# View Cloud Run service details"
echo "gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""
echo "# View real-time Cloud Run logs"
echo "gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME' --follow --format=json"
echo ""
echo "# Manual rollback (if needed)"
echo "gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=PREVIOUS=100"
echo ""
echo "# Test local Docker build"
echo "docker build -t $SERVICE_NAME:test ."
echo "docker run -p 3005:3005 $SERVICE_NAME:test"
echo "curl http://localhost:3005/api/health"
echo ""
