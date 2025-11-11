#!/bin/sh

# ===== CONFIGURATION VALIDATION =====
echo " Starting WAGO AI Suite Frontend..."

# SERVER_NAME: Host für Grafana, Jupyter, Node-RED (PFLICHT)
if [ -z "$SERVER_NAME" ]; then
  echo "   ERROR: SERVER_NAME is required!"
  echo "   Example: SERVER_NAME=192.168.2.17"
  echo "   This is the IP where Grafana, Jupyter, Node-RED run."
  exit 1
fi

# INFERENCE_URL: Host für Inference Server (Default = SERVER_NAME)
if [ -z "$INFERENCE_URL" ]; then
  echo "   INFERENCE_URL not set. Using SERVER_NAME: $SERVER_NAME"
  INFERENCE_URL="$SERVER_NAME"
fi

# N8N API Key (Optional)
if [ -z "$REACT_APP_N8N_REST_API_KEY" ]; then
  echo "   REACT_APP_N8N_REST_API_KEY not set. Using default."
  REACT_APP_N8N_REST_API_KEY="default-key"
fi

# ===== CONFIGURATION SUMMARY =====
echo ""
echo "   Configuration:"
echo "   SERVER_NAME:     $SERVER_NAME (Grafana, Jupyter, Node-RED)"
echo "   INFERENCE_URL:   $INFERENCE_URL (Inference Server)"
echo "   N8N_API_KEY:     [SET]"
echo ""

# ===== NGINX CONFIG GENERATION =====
envsubst '$SERVER_NAME $INFERENCE_URL $REACT_APP_N8N_REST_API_KEY' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# ===== NGINX CONFIG TEST =====
echo "   Testing NGINX configuration..."
nginx -t

if [ $? -eq 0 ]; then
  echo "  NGINX config valid. Starting NGINX..."
  exec nginx -g "daemon off;"
else
  echo "    NGINX config test failed!"
  echo "    Generated config:"
  cat /etc/nginx/conf.d/default.conf
  exit 1
fi