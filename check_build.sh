#!/bin/bash

# Default values
SLEEP_TIME=20
PROJECT_ID="ctoteam"
BUILD_ID=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --sleep) SLEEP_TIME="$2"; shift ;;
    --project) PROJECT_ID="$2"; shift ;;
    --build) BUILD_ID="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

echo "Checking Cloud Build status..."
echo "Sleep interval: ${SLEEP_TIME}s"
echo "Project: $PROJECT_ID"

while true
do
  if [ -z "$BUILD_ID" ]; then
    # Get latest build if no specific ID provided
    BUILD_INFO=$(gcloud builds list \
      --project="$PROJECT_ID" \
      --limit=1 \
      --format="value(id,status)")
    BUILD_ID=$(echo $BUILD_INFO | awk '{print $1}')
    STATUS=$(echo $BUILD_INFO | awk '{print $2}')
  else
    STATUS=$(gcloud builds describe "$BUILD_ID" \
      --project="$PROJECT_ID" \
      --format="value(status)")
  fi

  echo "Build ID: $BUILD_ID"
  echo "Current Status: $STATUS"

  if [ "$STATUS" == "SUCCESS" ]; then
    echo "✅ Build completed successfully!"
    exit 0
  elif [[ "$STATUS" == "FAILURE" || "$STATUS" == "CANCELLED" || "$STATUS" == "TIMEOUT" ]]; then
    echo "❌ Build failed with status: $STATUS"
    exit 1
  else
    echo "⏳ Still in progress... Checking again in ${SLEEP_TIME} seconds..."
    sleep "$SLEEP_TIME"
  fi
done
