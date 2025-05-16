#!/bin/sh

# Check required environment variables
if [ -z "$SERVER_NAME" ]; then
  echo "Error: SERVER_NAME is not set"
  exit 1
fi

# Check required environment variables
if [ -z "$REACT_APP_N8N_REST_API_KEY" ]; then
  echo "Error: REACT_APP_N8N_REST_API_KEY is not set"
  exit 1
fi

# Check required environment variables
if [ -z "$INFERENCE_URL" ]; then
  echo "Error: INFERENCE_URL is not set"
  exit 1
fi

# Substitute environment variables into the NGINX configuration template
envsubst '$SERVER_NAME $REACT_APP_N8N_REST_API_KEY $INFERENCE_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Log the configuration details
echo "NGINX configuration generated with SERVER_NAME=$SERVER_NAME and INFERENCE_URL=$INFERENCE_URL"

# Start NGINX in the foreground
nginx -g "daemon off;"