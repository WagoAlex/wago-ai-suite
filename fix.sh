#!/bin/bash

echo "🔧 Complete Label Studio Fix"
echo "============================"

# Step 1: Stop everything
echo "1. Stopping all containers..."
docker-compose down

# Step 2: Fix the mysterious 's' variable warnings
echo "2. Fixing environment variable issues..."

# Create a clean .env file
cat > .env << 'EOF'
# WAGO Backend API Key
API_KEY="j}b9Q~#zsJOhR~LH-<"

# Server Name
SERVER_NAME=192.168.2.165
INFERENCE_URL=192.168.2.62

# React App Configurations
REACT_APP_SERVER_NAME=192.168.2.165
REACT_APP_INFERENCE_URL=https://192.168.2.62:2376
REACT_APP_MQTT_BROKER_URL=wss://192.168.2.165/mqtt
REACT_APP_BACKEND_API_URL=https://wago-ai-suite-backend:3042
REACT_APP_N8N_API_URL=/n8n
REACT_APP_N8N_REST_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYWFiZmJjNi0zZWI4LTQzZWMtYTgwMy1jY2NkZjc4NTEzNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQyNDYzNjA5fQ.A6QeVOZpwVdLJ7hiJe7oO6-P5yVRu3AuhEZ8H7TDqSw
REACT_APP_WEBHOOK_URL="/n8n/webhook-test/invoke_n8n_agent /n8n/webhook-test/bf4dd093-bb02-472c-9454-7ab9af97bd1d /n8n/webhook-test/MUz2PN6jMbI2hGda"

# MQTT Topics
REACT_APP_MQTT_TRANSCRIPTION_TOPIC=agent/audio/transcription
REACT_APP_MQTT_RESPONSE_TOPIC=agent/audio/response
REACT_APP_MQTT_INPUT_TOPIC=agent/audio/input
REACT_APP_MQTT_START_TOPIC=agent/audio/start
REACT_APP_MQTT_VOICE_TOPIC=agent/audio/voice
REACT_APP_MQTT_CHAT_INPUT_TOPIC=agent/chat/input
REACT_APP_MQTT_CHAT_RESPONSE_TOPIC=agent/chat/response
REACT_APP_MQTT_PROGRESS_TOPIC=agent/audio/progress
REACT_APP_START_PAYLOAD='{"command": "start"}'

# Version
REACT_APP_VERSION=1.0
EOF

echo "   ✅ Clean .env file created"

# Step 3: Completely reset Label Studio database
echo "3. Completely resetting Label Studio database..."
sudo rm -rf /docker/labelstudio/data
sudo mkdir -p /docker/labelstudio/data
sudo chmod 777 /docker/labelstudio/data

# Create a fresh database directory structure
sudo mkdir -p /docker/labelstudio/data/media
sudo chmod -R 777 /docker/labelstudio/data

echo "   ✅ Database reset complete"

# Step 4: Remove any existing Label Studio containers and volumes
echo "4. Cleaning up containers and volumes..."
docker rm -f wago-label-studio test-labelstudio 2>/dev/null || true
docker volume prune -f

echo "   ✅ Cleanup complete"

# Step 5: Start Label Studio with a fresh database
echo "5. Starting Label Studio with fresh database..."
docker-compose up -d wago-label-studio

echo "6. Waiting for Label Studio to initialize (60 seconds)..."
sleep 10

# Check logs every 10 seconds
for i in {1..5}; do
    echo "   Checking logs (attempt $i/5)..."
    
    if docker logs wago-label-studio 2>&1 | grep -q "Starting development server"; then
        echo "   ✅ Label Studio is starting up!"
        break
    elif docker logs wago-label-studio 2>&1 | grep -q "OperationalError"; then
        echo "   ❌ Database error detected, trying reset..."
        docker-compose down
        sudo rm -rf /docker/labelstudio/data/*
        sleep 5
        docker-compose up -d wago-label-studio
    elif docker logs wago-label-studio 2>&1 | grep -q "Applying"; then
        echo "   📝 Database migrations in progress..."
    fi
    
    sleep 10
done

# Step 7: Test Label Studio
echo "7. Testing Label Studio..."

# Wait a bit more for full startup
sleep 20

# Test direct access
echo "   Testing direct access (port 8080)..."
if curl -s -o /dev/null -w "%{http_code}" http://192.168.2.165:8080/ | grep -q "200\|302"; then
    echo "   ✅ Direct access: SUCCESS"
else
    echo "   ⚠️  Direct access: Not ready yet"
fi

# Step 8: Start all other services
echo "8. Starting all other services..."
docker-compose up -d

echo "9. Final status check..."
sleep 10

# Show container status
echo "   Container status:"
docker-compose ps

echo ""
echo "10. Label Studio logs (last 10 lines):"
docker logs --tail 10 wago-label-studio

echo ""
echo "🏁 Setup Complete!"
echo ""
echo "Access Label Studio:"
echo "- Direct: http://192.168.2.165:8080"
echo "- Through proxy: https://192.168.2.165/labelstudio/"
echo "- Login: admin / wago"
echo ""
echo "If it's still not working, run:"
echo "docker logs wago-label-studio"
