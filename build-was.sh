#!/bin/bash
set -x  # Enable debug output

# Manage version
VERSION_FILE="version.txt"
if [ ! -f "$VERSION_FILE" ]; then
    echo "1.0" > "$VERSION_FILE"
fi
VERSION=$(cat "$VERSION_FILE")
NEW_VERSION=$(echo "$VERSION" | awk -F. '{print $1"."$2+1}')
echo "$NEW_VERSION" > "$VERSION_FILE"

# Define image names
FRONTEND_IMAGE_NAME="wagoalex/wago-ai-suite-ui"
BACKEND_IMAGE_NAME="wagoalex/wago-ai-suite-backend"

# Source the .env file for environment variables
if [ -f .env ]; then
    set -a  # Automatically export all variables
    source .env
    set +a
else
    echo "Error: .env file not found."
    exit 1
fi

# Debug: Show current directory
echo "Current directory: $(pwd)"
# Debug: Print environment variables
echo "Environment variables:"
env | grep REACT_APP

# Build frontend Docker image
echo "Building frontend..."
docker build \
  --build-arg REACT_APP_MQTT_BROKER_URL="$REACT_APP_MQTT_BROKER_URL" \
  --build-arg REACT_APP_MQTT_START_TOPIC="$REACT_APP_MQTT_START_TOPIC" \
  --build-arg REACT_APP_N8N_API_URL="$REACT_APP_N8N_API_URL" \
  --build-arg REACT_APP_VERSION="$NEW_VERSION" \
  -t "$FRONTEND_IMAGE_NAME:$NEW_VERSION" \
  -t "$FRONTEND_IMAGE_NAME:latest" \
  .
if [ $? -ne 0 ]; then
    echo "Error: Frontend Docker build failed."
    exit 1
fi
echo "Frontend Docker image built successfully."

# Build backend Docker image
echo "Building backend..."
docker build \
  -t "$BACKEND_IMAGE_NAME:$NEW_VERSION" \
  -t "$BACKEND_IMAGE_NAME:latest" \
  backend
if [ $? -ne 0 ]; then
    echo "Error: Backend Docker build failed."
    exit 1
fi
echo "Backend Docker image built successfully."

# Output the updated version
echo "Updated version: $NEW_VERSION"

echo "Script completed."