#!/bin/bash

echo "🔧 Label Studio Troubleshooting Script"
echo "======================================="

# Stop current containers
echo "1. Stopping current containers..."
docker-compose down

# Remove problematic Label Studio container and volume
echo "2. Cleaning up Label Studio container and data..."
docker rm -f wago-label-studio 2>/dev/null || true
docker volume rm labelstudio_static 2>/dev/null || true

# Clean up data directory
echo "3. Resetting data directory..."
sudo rm -rf /docker/labelstudio/data/* 2>/dev/null || true
sudo mkdir -p /docker/labelstudio/data
sudo chmod 777 /docker/labelstudio/data

# Test Label Studio standalone first
echo "4. Testing Label Studio standalone..."
docker run --rm -d \
  --name test-labelstudio \
  -p 8081:8080 \
  -e LABEL_STUDIO_USERNAME=admin \
  -e LABEL_STUDIO_PASSWORD=wago \
  -v /docker/labelstudio/data:/label-studio/data \
  heartexlabs/label-studio:latest

echo "5. Waiting for Label Studio to start..."
sleep 30

# Check if it's running
if docker ps | grep test-labelstudio > /dev/null; then
    echo "✅ Label Studio standalone test: SUCCESS"
    echo "   Accessible at: http://192.168.2.165:8081"
    echo "   Login: admin / wago"
else
    echo "❌ Label Studio standalone test: FAILED"
    echo "Checking logs..."
    docker logs test-labelstudio
fi

# Clean up test container
docker rm -f test-labelstudio 2>/dev/null || true

# Now try with compose
echo ""
echo "6. Starting with docker-compose (minimal config)..."
docker-compose up -d wago-label-studio

echo "7. Waiting for Label Studio to initialize..."
sleep 30

# Check status
echo "8. Container status:"
docker ps | grep wago-label-studio || echo "❌ Container not running"

echo ""
echo "9. Container logs (last 20 lines):"
docker logs --tail 20 wago-label-studio

echo ""
echo "10. Testing Label Studio endpoints:"

# Test basic endpoint
echo "   Testing basic endpoint..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://192.168.2.165:8080/ || echo "❌ Direct access failed"

# Test through nginx
echo "   Testing through nginx proxy..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://192.168.2.165/labelstudio/ -k || echo "❌ Proxy access failed"

echo ""
echo "🏁 Troubleshooting complete!"
echo ""
echo "Next steps:"
echo "- If standalone test worked: Use that configuration"
echo "- If compose failed: Check the minimal docker-compose.yml"
echo "- If nginx proxy failed: Check nginx configuration"
