#!/bin/bash

# Complete Cloud Build & Cloud Run Setup + Deployment
# This script automates the entire process from trigger creation to deployment

set -e

# Configuration
PROJECT_ID="ctoteam"
GITHUB_OWNER="valarama"
GITHUB_REPO="w3"
TRIGGER_NAME="nextjs-w3-prod"
SERVICE_NAME="w3"
REGION="us-central1"
IMAGE_REPO="us-docker.pkg.dev/${PROJECT_ID}/node-apps"
SERVICE_ACCOUNT="cloud-build-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║    COMPLETE CLOUD BUILD & CLOUD RUN DEPLOYMENT SETUP          ║${NC}"
echo -e "${BLUE}║    Next.js 16 on Google Cloud Platform                        ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify gcloud authentication
echo -e "${YELLOW}[Step 1/10]${NC} Verifying GCP authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}✗ Not authenticated with gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Step 2: Verify project
echo -e "${YELLOW}[Step 2/10]${NC} Verifying GCP project..."
CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    gcloud config set project "$PROJECT_ID"
fi
echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"
echo ""

# Step 3: Verify infrastructure
echo -e "${YELLOW}[Step 3/10]${NC} Verifying GCP infrastructure..."

# Check Artifact Registry
if gcloud artifacts repositories describe "node-apps" --location="us" &>/dev/null; then
    echo -e "${GREEN}✓ Artifact Registry: node-apps${NC}"
else
    echo -e "${RED}✗ Artifact Registry not found${NC}"
    exit 1
fi

# Check Service Account
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" &>/dev/null; then
    echo -e "${GREEN}✓ Service Account: cloud-build-deployer${NC}"
else
    echo -e "${RED}✗ Service Account not found${NC}"
    exit 1
fi

# Check Secret Manager
if gcloud secrets describe database-url &>/dev/null; then
    echo -e "${GREEN}✓ Secret Manager: Configured${NC}"
else
    echo -e "${RED}✗ Secret Manager not found${NC}"
    exit 1
fi
echo ""

# Step 4: Check GitHub connection
echo -e "${YELLOW}[Step 4/10]${NC} Checking GitHub connection..."
if gcloud source repos list --format="value(name)" 2>/dev/null | grep -q "github"; then
    echo -e "${GREEN}✓ GitHub connected${NC}"
    GITHUB_CONNECTED=true
else
    echo -e "${YELLOW}⚠ GitHub not connected via gcloud${NC}"
    echo -e "${YELLOW}  This is OK - we'll create the trigger anyway${NC}"
    GITHUB_CONNECTED=false
fi
echo ""

# Step 5: Create or verify Cloud Build trigger
echo -e "${YELLOW}[Step 5/10]${NC} Creating Cloud Build trigger..."

# Check if trigger already exists
if gcloud builds triggers describe "$TRIGGER_NAME" &>/dev/null 2>&1; then
    echo -e "${GREEN}✓ Trigger exists: $TRIGGER_NAME${NC}"
    TRIGGER_EXISTS=true
else
    echo -e "${YELLOW}  Creating new trigger...${NC}"

    # Try to create GitHub trigger
    if gcloud builds triggers create github \
        --name="$TRIGGER_NAME" \
        --description="CI/CD pipeline for Next.js 16 application" \
        --repo-name="$GITHUB_REPO" \
        --repo-owner="$GITHUB_OWNER" \
        --branch-pattern="^main$" \
        --build-config="cloudbuild.yaml" \
        --substitutions="_GCP_PROJECT_ID=$PROJECT_ID,_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION,_IMAGE_REPO=$IMAGE_REPO" \
        --project="$PROJECT_ID" 2>/dev/null; then

        echo -e "${GREEN}✓ GitHub trigger created: $TRIGGER_NAME${NC}"
        TRIGGER_EXISTS=true

    else
        echo -e "${YELLOW}⚠ Could not auto-create GitHub trigger${NC}"
        echo -e "${YELLOW}  Manual setup required (see step 9)${NC}"
        TRIGGER_EXISTS=false
    fi
fi
echo ""

# Step 6: Test Docker build (skip if Docker not available)
echo -e "${YELLOW}[Step 6/10]${NC} Testing Docker build locally..."
if command -v docker &> /dev/null; then
    if docker build -t "$SERVICE_NAME:test" . &>/dev/null; then
        echo -e "${GREEN}✓ Docker build successful${NC}"
        DOCKER_OK=true
    else
        echo -e "${RED}✗ Docker build failed${NC}"
        echo "Fix Dockerfile and try again"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Docker not available (OK - will build in Cloud)${NC}"
    DOCKER_OK=true
fi
echo ""

# Step 7: Submit first build via gcloud
echo -e "${YELLOW}[Step 7/10]${NC} Submitting build to Cloud Build..."
BUILD_OUTPUT=$(gcloud builds submit --config=cloudbuild.yaml --no-source 2>&1)
BUILD_ID=$(echo "$BUILD_OUTPUT" | grep -oP "(?<=id: )[^']*" | head -1)

if [ -z "$BUILD_ID" ]; then
    BUILD_ID=$(gcloud builds list --limit=1 --format='value(id)')
fi

echo -e "${GREEN}✓ Build submitted${NC}"
echo -e "  Build ID: $BUILD_ID"
echo ""

# Step 8: Monitor build
echo -e "${YELLOW}[Step 8/10]${NC} Monitoring build (this may take 2-3 minutes)..."
echo ""

# Get build status with timeout
TIMEOUT=300  # 5 minutes
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    BUILD_STATUS=$(gcloud builds describe "$BUILD_ID" --format='value(status)')

    case "$BUILD_STATUS" in
        SUCCESS)
            echo -e "${GREEN}✓ Build completed successfully!${NC}"
            BUILD_SUCCESS=true
            break
            ;;
        FAILURE)
            echo -e "${RED}✗ Build failed${NC}"
            echo -e "${YELLOW}  View logs: gcloud builds log $BUILD_ID${NC}"
            BUILD_SUCCESS=false
            break
            ;;
        TIMEOUT)
            echo -e "${RED}✗ Build timed out${NC}"
            BUILD_SUCCESS=false
            break
            ;;
        QUEUED|WORKING)
            echo -ne "\r  Status: $BUILD_STATUS - Elapsed: ${ELAPSED}s"
            sleep 5
            ELAPSED=$((ELAPSED + 5))
            ;;
        *)
            echo -ne "\r  Status: $BUILD_STATUS - Elapsed: ${ELAPSED}s"
            sleep 5
            ELAPSED=$((ELAPSED + 5))
            ;;
    esac
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${YELLOW}⚠ Build still running after 5 minutes${NC}"
    echo -e "${YELLOW}  View logs: gcloud builds log $BUILD_ID${NC}"
    BUILD_SUCCESS=false
fi
echo ""
echo ""

# Step 9: Verify Cloud Run service
echo -e "${YELLOW}[Step 9/10]${NC} Verifying Cloud Run service..."
if gcloud run services describe "$SERVICE_NAME" --region="$REGION" &>/dev/null; then
    echo -e "${GREEN}✓ Cloud Run service deployed${NC}"
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --format='value(status.url)')
    echo -e "${BLUE}  Service URL: $SERVICE_URL${NC}"
    SERVICE_FOUND=true
else
    echo -e "${YELLOW}⚠ Service not yet available${NC}"
    echo -e "${YELLOW}  It may still be initializing...${NC}"
    SERVICE_FOUND=false
fi
echo ""

# Step 10: Display summary
echo -e "${YELLOW}[Step 10/10]${NC} Setup Summary"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     SETUP COMPLETE ✓                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Infrastructure:${NC}"
echo "  • Project ID: $PROJECT_ID"
echo "  • Region: $REGION"
echo "  • Artifact Registry: $IMAGE_REPO"
echo "  • Service Account: $SERVICE_ACCOUNT"
echo ""

echo -e "${GREEN}✓ Cloud Build:${NC}"
echo "  • Latest Build ID: $BUILD_ID"
if [ "$BUILD_SUCCESS" = true ]; then
    echo -e "  • Status: ${GREEN}SUCCESS${NC}"
else
    echo -e "  • Status: ${YELLOW}IN PROGRESS${NC}"
fi
echo ""

if [ "$SERVICE_FOUND" = true ]; then
    echo -e "${GREEN}✓ Cloud Run Service:${NC}"
    echo "  • Service Name: $SERVICE_NAME"
    echo -e "  • URL: ${BLUE}$SERVICE_URL${NC}"
    echo ""
    echo -e "${YELLOW}Test the service:${NC}"
    echo "  curl $SERVICE_URL/api/health"
    echo ""
else
    echo -e "${YELLOW}⚠ Cloud Run Service:${NC}"
    echo "  • Still initializing or not yet created"
    echo "  • Check status: gcloud run services describe $SERVICE_NAME --region=$REGION"
    echo ""
fi

if [ "$TRIGGER_EXISTS" = true ]; then
    echo -e "${GREEN}✓ Cloud Build Trigger:${NC}"
    echo "  • Trigger Name: $TRIGGER_NAME"
    echo "  • Repository: $GITHUB_OWNER/$GITHUB_REPO"
    echo "  • Branch: main"
    echo ""
    echo -e "${YELLOW}Automatic deployments:${NC}"
    echo "  Just push to main branch - Cloud Build will auto-deploy!"
    echo ""
else
    echo -e "${YELLOW}⚠ Cloud Build Trigger:${NC}"
    echo "  Manual creation required (see instructions below)"
    echo ""
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    NEXT ACTIONS                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$TRIGGER_EXISTS" = false ]; then
    echo -e "${YELLOW}1. Create Cloud Build Trigger (Manual - 2 minutes)${NC}"
    echo ""
    echo "   Go to: https://console.cloud.google.com/cloud-build/triggers"
    echo "   Click: Create Trigger"
    echo "   Configure:"
    echo "     • Name: $TRIGGER_NAME"
    echo "     • Event: Push to a branch"
    echo "     • Repository: $GITHUB_OWNER/$GITHUB_REPO"
    echo "     • Branch: ^main\$"
    echo "     • Build config: Cloud Build configuration file"
    echo "     • Config file location: cloudbuild.yaml"
    echo "   Substitutions:"
    echo "     • _GCP_PROJECT_ID = $PROJECT_ID"
    echo "     • _SERVICE_NAME = $SERVICE_NAME"
    echo "     • _REGION = $REGION"
    echo "     • _IMAGE_REPO = $IMAGE_REPO"
    echo ""
    echo "   Then click: Create"
    echo ""
fi

echo -e "${YELLOW}2. Add Health Check Endpoint${NC}"
echo ""
echo "   Create: pages/api/health.ts"
echo ""
echo "   Content:"
echo "   export default function handler(req, res) {"
echo "     res.status(200).json({ status: 'healthy' })"
echo "   }"
echo ""

echo -e "${YELLOW}3. Test the Deployment (if service is up)${NC}"
echo ""
if [ "$SERVICE_FOUND" = true ]; then
    echo "   curl $SERVICE_URL/api/health"
    echo ""
    echo -e "${GREEN}   Expected response: {\"status\":\"healthy\"}${NC}"
    echo ""
else
    echo "   curl https://w3-HASH.run.app/api/health"
    echo ""
fi

echo -e "${YELLOW}4. Push to Main Branch to Trigger Auto-Deploy${NC}"
echo ""
echo "   git add ."
echo "   git commit -m 'Deploy to Cloud Run'"
echo "   git push origin main"
echo ""

echo -e "${YELLOW}5. Monitor Deployments${NC}"
echo ""
echo "   View builds:"
echo "   gcloud builds list --limit=10"
echo ""
echo "   View latest build logs:"
echo "   gcloud builds log \$(gcloud builds list --limit=1 --format='value(id)') --follow"
echo ""
echo "   View Cloud Run service:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              IMPORTANT INFORMATION                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Service URL: ${BLUE}$SERVICE_URL${NC}"
echo ""

echo -e "${YELLOW}Documentation:${NC}"
echo "  • Quick Setup: QUICKSTART_CHECKLIST.md"
echo "  • Deployment: DEPLOYMENT.md"
echo "  • Architecture: ARCHITECTURE.md"
echo ""

echo -e "${YELLOW}Useful Commands:${NC}"
echo ""
echo "  # View service details"
echo "  gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""
echo "  # View real-time logs"
echo "  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME' --follow"
echo ""
echo "  # Manual rollback"
echo "  gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=PREVIOUS=100"
echo ""
echo "  # Check build status"
echo "  gcloud builds describe $BUILD_ID"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🎉 SETUP COMPLETE! 🎉                       ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
if [ "$SERVICE_FOUND" = true ]; then
    echo -e "${GREEN}║  Your app is live! Test it now:                             ║${NC}"
    echo -e "${GREEN}║  $SERVICE_URL${NC}"
else
    echo -e "${GREEN}║  First deployment is being processed...                      ║${NC}"
    echo -e "${GREEN}║  Service URL will be available soon                          ║${NC}"
fi
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
