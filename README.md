# WAGO AI Suite

> AI application suite optimized for edge deployment with local inference capabilities

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Version](https://img.shields.io/badge/version-1.7-blue.svg)]()

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Integrated Services](#integrated-services)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

WAGO AI Suite is a containerized application platform designed for deploying and managing AI workloads on edge devices. It provides a unified interface for model visualization, data labeling, workflow automation, and real-time inference with a focus on energy efficiency and local execution.

The suite integrates with **WAGO App Analytics (WAA)**, a CODESYS-based solution that provides pre-built Docker images for Node-RED and Grafana, enabling remote container management directly from CODESYS projects. This integration allows seamless orchestration between industrial automation and AI workflows.

**Learn more about WAA**: [WAGO App Analytics Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

### Business Value

- **CODESYS Integration**: Seamless integration with WAGO App Analytics (WAA) for unified industrial automation and AI management
- **Edge-First Design**: Optimized for local execution, reducing latency and cloud dependencies
- **Energy Efficient**: Purpose-built for resource-constrained environments
- **Scalable Architecture**: Modular design allows selective deployment of components
- **Enterprise Ready**: Production-grade security with HTTPS, authentication, and monitoring
- **Industrial-Grade**: Leverages WAGO's industrial automation expertise with pre-built, tested container images

## ✨ Key Features

### Core Capabilities

- **Model Visualization**: Integrated Netron for neural network architecture inspection
- **Data Annotation**: Label Studio integration for dataset creation and management
- **Workflow Automation**: Node-RED and n8n for visual programming and automation
- **Real-time Monitoring**: Grafana dashboards for system and model performance
- **Interactive Development**: JupyterLab environment for experimentation
- **MQTT Integration**: Real-time messaging for inference requests and results
- **Video Processing**: RTSP stream handling with inference capabilities
- **Edge AI Acceleration**: Hailo-8 powered inference for real-time object detection
- **Multi-Platform Support**: GPU, CPU, and dedicated AI accelerator inference options

### Technical Highlights

- Containerized microservices architecture
- NGINX reverse proxy with SSL/TLS termination
- WebSocket support for real-time communication
- Cross-Origin Resource Sharing (CORS) enabled
- Docker Compose orchestration
- Automated build pipeline with versioning
- Hardware-accelerated inference with Hailo-8 (26 TOPS, ~2.5W)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (Port 443/80)                      │
│                   SSL/TLS Termination                        │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│ React  │      │ Backend  │
│   UI   │      │   API    │
│        │      │ (Node.js)│
└───┬────┘      └────┬─────┘
    │                │
    │   ┌────────────┴──────────────┬──────────────┐
    │   │                           │              │
┌───▼───▼────┐  ┌──────────┐  ┌────▼─────┐  ┌────▼────────┐
│ Label      │  │ Grafana  │  │ Jupyter  │  │ Node-RED    │
│ Studio     │  │          │  │ Lab      │  │ / n8n       │
└────────────┘  └──────────┘  └──────────┘  └─────────────┘
                                                    │
                                              ┌─────▼─────┐
                                              │ Inference │
                                              │  Engine   │
                                              └───────────┘
```

### Component Breakdown

| Component | Purpose | Port | Technology | Source |
|-----------|---------|------|------------|--------|
| **Frontend** | Web UI | 443, 80 | React 18, Material-UI | Custom |
| **Backend** | REST API | 3042, 3443 | Node.js, Express | Custom |
| **Label Studio** | Data annotation | 8080 | Python/Django | Open Source |
| **Grafana** | Monitoring | 5000 | Go | **WAA** (WAGO App Analytics) |
| **JupyterLab** | Development | 8888 | Python | Custom |
| **Node-RED** | Automation | 5101 | Node.js | **WAA** (WAGO App Analytics) |
| **n8n** | Workflow automation | 5678 | Node.js | Open Source |
| **MQTT Broker** | Messaging | 1883, 9001 | Mosquitto | Open Source |
| **Hailo AI** | Edge inference | 8042 | Python, Hailo-8 | Custom |

## 📦 Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: 20GB available space
- **Network**: Static IP or dynamic DNS

### WAGO App Analytics (WAA) Integration

The WAGO AI Suite leverages **WAGO App Analytics (WAA)** for Node-RED and Grafana services. WAA is a CODESYS-based solution that provides:

- **Pre-built Docker Images**: Industrial-grade, tested container images for Node-RED and Grafana
- **CODESYS Integration**: Remote container management directly from CODESYS projects
- **Installer Package**: Simplified deployment on WAGO PLCs and edge devices
- **Industrial Automation Bridge**: Seamless data flow between PLC logic and AI workflows

**Download WAA**: [WAGO App Analytics at Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

**Note**: While the AI Suite can use standard Node-RED and Grafana images, using WAA-provided images ensures compatibility with WAGO industrial automation ecosystems.

### Optional Requirements

- **GPU Support**: NVIDIA Docker runtime for GPU-accelerated inference
- **Certificates**: Valid SSL certificates (self-signed included for testing)

### Software Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 🚀 Quick Start

### 1. Clone or Extract Project

```bash
# If using git
git clone <repository-url>
cd wago-ai-suite

# Or extract archive
tar -xzf wago-ai-suite.tar.gz
cd wago-ai-suite
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Minimum Required Configuration:**

```bash
# Server Configuration
SERVER_NAME=192.168.1.100  # Your server IP address
INFERENCE_URL=192.168.1.100  # Inference server IP (can be same as SERVER_NAME)

# Backend API Key (generate secure key)
API_KEY="your-secure-api-key-here"

# React App URLs
REACT_APP_SERVER_NAME=192.168.1.100
REACT_APP_MQTT_BROKER_URL=wss://192.168.1.100/mqtt
```

### 3. Build Images

```bash
# Make build script executable
chmod +x build-was.sh

# Build all images
./build-was.sh
```

### 4. Deploy Services

```bash
# Create required directories
sudo mkdir -p /docker/tests
sudo mkdir -p /docker/local-ai/labelstudio/{data,files}

# Start services
docker-compose up -d

# Verify deployment
docker-compose ps
```

### 5. Access Application

Open your browser and navigate to:

```
https://192.168.1.100  (replace with your SERVER_NAME)
```

**Note**: You'll need to accept the self-signed certificate warning for initial testing.

## 📄 Complete Docker Compose Configuration

### Full docker-compose.yml

Below is the complete, production-ready Docker Compose configuration. This file is **100% Portainer Stack compatible**.

```yaml
version: '3.8'

# ============================================================================
# Global Environment Variables
# Adjustable via .env file or directly here
# ============================================================================
x-common-variables: &common-vars
  SERVER_NAME: "192.168.2.124"
  INFERENCE_URL: "192.168.2.124"

networks:
  waa_cm_network:
    external: true
    driver: bridge

services:
  # ============================================================================
  # MQTT Broker Service
  # ============================================================================
  mqtt-broker:
    container_name: mqtt-broker
    image: wagoalex/mqtt-broker:latest
    restart: always
    ports:
      - "1883:1883"
      - "8883:8883"
      - "9001:9001"
    environment: 
      <<: *common-vars
      MOSQUITTO_CONFIG: "/mosquitto/config/mosquitto-any.conf"
      #MOSQUITTO_CONFIG: "/mosquitto/config/mosquitto-pwd.conf"
    networks:
      - waa_cm_network
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "1"

  # ============================================================================
  # WAGO AI Suite - Frontend
  # ============================================================================
  wago-ai-suite:
    image: wagoalex/wago-ai-suite-ui:1.947
    container_name: wago-ai-suite
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /docker/tests:/app
      - /etc/docker/certs:/etc/docker/certs
    environment:
      <<: *common-vars
      REACT_APP_MQTT_BROKER_URL: "wss://${SERVER_NAME:-192.168.2.124}/mqtt"
      REACT_APP_MQTT_START_TOPIC: "agent/audio/start"
      REACT_APP_N8N_API_URL: "/n8n"
      REACT_APP_N8N_REST_API_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlOTFjMmYyNy1kOGEzLTRkNWYtYTZmZC1hYTIwMmU4OGRiNTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1Njk2NjQwfQ.zS_yBGDx5X10HdwPUMb9zBHJgIEI8QlLXcHszEai2gA"
      REACT_APP_SERVER_NAME: "${SERVER_NAME:-192.168.2.124}"
      REACT_APP_INFERENCE_URL: "${INFERENCE_URL:-192.168.2.124}"
      REACT_APP_BACKEND_API_URL: "https://wago-ai-suite-backend:3042"
      REACT_APP_WEBHOOK_URL: "/n8n/webhook-test/1 /n8n/webhook-test/2 /n8n/webhook-test/3"
      REACT_APP_MQTT_TRANSCRIPTION_TOPIC: "agent/audio/transcription"
      REACT_APP_MQTT_RESPONSE_TOPIC: "agent/audio/response"
      REACT_APP_MQTT_INPUT_TOPIC: "agent/audio/input"
      REACT_APP_MQTT_VOICE_TOPIC: "agent/audio/voice"
      REACT_APP_MQTT_CHAT_INPUT_TOPIC: "agent/chat/input"
      REACT_APP_MQTT_CHAT_RESPONSE_TOPIC: "agent/chat/response"
      REACT_APP_MQTT_PROGRESS_TOPIC: "agent/audio/progress"
      REACT_APP_START_PAYLOAD: '{"command": "start"}'
      REACT_APP_MQTT_INFERENCE_TOPIC: "inference/#"
      REACT_APP_VERSION: "1.7"
      INTERFACE_PATTERN: "X.*"
    networks:
      - waa_cm_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "1"

  # ============================================================================
  # WAGO AI Suite - Backend
  # ============================================================================
  wago-ai-suite-backend:
    image: wagoalex/wago-ai-suite-backend:1.947
    container_name: wago-ai-suite-backend
    ports:
      - "3042:3042"
      - "3443:3443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /docker/local-ai/was/backend/ssl:/app/ssl
      - /docker/tests:/app/audio
      - /etc/docker/certs:/etc/docker/certs
    environment:
      <<: *common-vars
      API_KEY: "j}b9Q~#zsJOhR~LH-<"
      BACKEND_HTTPS_PORT: "3443"
      BACKEND_PORT: "3042"
      INFERENCE_PORT: "8042"
    networks:
      - waa_cm_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "1"

  # ============================================================================
  # Label Studio - Data Annotation Tool
  # ============================================================================
  wago-label-studio:
    image: heartexlabs/label-studio:1.20.0
    container_name: wago-label-studio
    ports:
      - "8080:8080"
    volumes:
      - /docker/local-ai/labelstudio/data:/label-studio/data
      - /docker/local-ai/labelstudio/files:/label-studio/files
    environment:
      <<: *common-vars
      # Basic Authentication
      LABEL_STUDIO_USERNAME: "alexander.fugmann@wago.com"
      LABEL_STUDIO_PASSWORD: "wagowago"
      LABEL_STUDIO_USER_EMAIL: "alexander.fugmann@wago.com"
      
      # URL Configuration
      LABEL_STUDIO_HOST: "https://${SERVER_NAME:-192.168.2.124}/labelstudio"
      LABEL_STUDIO_BASE_URL: "https://${SERVER_NAME:-192.168.2.124}/labelstudio/"
      
      # Static and Media URLs
      STATIC_URL: "/labelstudio/static/"
      STATIC_ROOT: "/label-studio/static"
      MEDIA_URL: "/labelstudio/media/"
      MEDIA_ROOT: "/label-studio/media"
      
      # Django Settings for Subpath
      SCRIPT_NAME: "/labelstudio"
      FORCE_SCRIPT_NAME: "/labelstudio"
      USE_X_FORWARDED_PREFIX: "true"
      
      # Login/Logout Redirects
      DJANGO_LOGIN_REDIRECT_URL: "/labelstudio/projects/"
      DJANGO_LOGOUT_REDIRECT_URL: "/labelstudio/"
      LOGIN_URL: "/labelstudio/user/login/"
      
      # Security Settings
      ALLOWED_HOSTS: "*"
      DEBUG: "true"
      DJANGO_USE_X_FORWARDED_HOST: "true"
      DJANGO_USE_X_FORWARDED_PROTO: "true"
      DJANGO_USE_X_FORWARDED_PORT: "true"
      DJANGO_USE_X_FORWARDED_PREFIX: "true"
      DJANGO_SECURE_SSL_REDIRECT: "false"
      DJANGO_SECURE_CONTENT_TYPE_NOSNIFF: "false"
      DJANGO_SECURE_BROWSER_XSS_FILTER: "false"
      DJANGO_SECURE_HSTS_SECONDS: "0"
      DJANGO_SECURE_FRAME_DENY: "false"
      X_FRAME_OPTIONS: "ALLOWALL"
      
      # CSRF and CORS Settings
      LABEL_STUDIO_DISABLE_CSRF_MIDDLEWARE: "true"
      USE_ENFORCE_CSRF_CHECKS: "false"
      CSRF_TRUSTED_ORIGINS: "http://${SERVER_NAME:-192.168.2.124},https://${SERVER_NAME:-192.168.2.124}"
      LABEL_STUDIO_CORS_ALLOWED_ORIGINS: "*"
      LABEL_STUDIO_CORS_ALLOW_ALL_ORIGINS: "true"
      LABEL_STUDIO_CORS_ALLOW_CREDENTIALS: "true"
      
      # Disable Telemetry
      LABEL_STUDIO_DISABLE_TELEMETRY: "true"
      LABEL_STUDIO_DISABLE_ANALYTICS: "true"
      LABEL_STUDIO_DISABLE_SENTRY: "true"
    networks:
      - waa_cm_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "1"

  # ============================================================================
  # JupyterLab - Development Environment
  # ============================================================================
  jupyterlab:
    image: wagoalex/jupyterhub:wago-engineering-cpu
    container_name: wago-jupyter-lab-cpu
    user: "10642:10600"
    entrypoint: 
      - jupyter
      - lab
      - --ip=0.0.0.0
      - --ServerApp.base_url=/jupyter/
      - --port=8888
      - --no-browser
      - --allow-root
      - --ServerApp.token=
      - --ServerApp.password=
      - --ServerApp.allow_origin=*
      - --ServerApp.disable_check_xsrf=True
      - --ServerApp.tornado_settings={"headers":{"Content-Security-Policy":"frame-ancestors 'self' *"}}
    restart: unless-stopped
    ports:
      - "8888:8888"
    volumes:
      - /docker/local-ai/wj/yolo:/usr/src/app
    environment:
      - JUPYTERLAB_BASE_URL=/jupyter/
    networks:
      - waa_cm_network
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "1"

  # ============================================================================
  # Hailo AI - YOLOv5 Inference (RTSP/Webcam Mode)
  # ============================================================================
  hailo-ai:
    image: wagoalex/wago-hailo:yolov5-latest
    container_name: wago-hailo-yolo5m-helmet-wago-rtsp
    privileged: true
    network_mode: host
    ipc: host
    
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
    
    entrypoint: ["/bin/bash", "entrypoint.sh", "rtsp"]
    
    environment:
      # Capture & Retry Configuration
      MAX_CAPTURE_OPEN_RETRIES: "20"
      CAPTURE_OPEN_RETRY_DELAY: "3.0"
      MAX_READ_RETRIES: "10"
      PLACEHOLDER_FRAME_DELAY: "0.7"
      
      # Display & GUI Settings
      QT_QPA_PLATFORM: "xcb"
      XDG_RUNTIME_DIR: "/run/user/0"
      DISPLAY: ":99"
      SHOW_IN_GUI: "0"
      
      # Frame Configuration
      FRAME_WIDTH: "640"
      FRAME_HEIGHT: "640"
      FRAME_MAX: "0.3"
      FRAME_RATE: "15"
      
      # Detection Thresholds
      CONFIDENCE_THRESHOLD: "0.85"
      IOU_THRESHOLD: "0.3"
      NMS_IOU_THRESHOLD: "0.45"
      
      # MQTT Configuration
      MQTT_BROKER: "192.168.2.124"
      MQTT_PORT: "1883"
      MQTT_TOPIC: "inference/yolov5m-results"
      
      # Model Configuration
      HEF_PATH: "/local/workspace/yolov5m-helmet-wago_20251014_183320.hef"
      WEBCAM_INDEX: "0"
      
      # Logging & Metadata
      LOG_LEVEL: "INFO"
      INCLUDE_METADATA: "0"
      GST_DEBUG: "1"
      
      # Streaming Configuration
      USE_GSTREAMER: "0"
      HLS_TIME: "2"
      HLS_LIST_SIZE: "60"
      HLS_FLAGS: "independent_segments+append_list+delete_segments+omit_endlist"
      FFMPEG_PRESET: "veryfast"
      
      # Queue Management
      QUEUE_WARN_THRESHOLD: "20"
      QUEUE_DROP_THRESHOLD: "500"
    
    volumes:
      - /tmp/.X11-unix/:/tmp/.X11-unix/
      - /root/.Xauthority:/root/.Xauthority:ro
      - /lib/firmware:/lib/firmware
      - /docker/tests/:/local/workspace/share:rw
    
    devices:
      - /dev/dri:/dev/dri
      - /dev/video0:/dev/video0
      - /dev/video1:/dev/video1
    
    group_add:
      - 44
    
    tty: true
    stdin_open: true
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8042/health"]
      interval: 120s
      timeout: 5s
      retries: 3
      start_period: 20s
    
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Portainer Stack Deployment

This configuration is **100% compatible** with Portainer Stacks. To deploy:

1. **Navigate to Portainer**
   - Go to Stacks → Add Stack
   - Name: `wago-ai-suite`

2. **Paste Configuration**
   - Copy the entire docker-compose.yml above
   - Paste into Web editor

3. **Adjust Variables**
   - Update `SERVER_NAME` to your host IP
   - Update `INFERENCE_URL` if using separate inference server
   - Modify volume paths as needed

4. **Deploy Stack**
   - Click "Deploy the stack"
   - Monitor deployment logs

### Key Configuration Points

#### Global Variables (x-common-variables)
```yaml
x-common-variables: &common-vars
  SERVER_NAME: "192.168.2.124"      # Change to your IP
  INFERENCE_URL: "192.168.2.124"    # Inference server IP
```

#### Network Configuration
- External network: `waa_cm_network`
- Create before deployment: `docker network create waa_cm_network`

#### Service Highlights

**MQTT Broker**
- Ports: 1883 (MQTT), 8883 (MQTTS), 9001 (WebSocket)
- Configuration: mosquitto-any.conf (no authentication)

**Frontend (wago-ai-suite)**
- Version: 1.947
- Ports: 443 (HTTPS), 80 (HTTP)
- Embedded services: Label Studio, Netron, all proxied paths

**Backend (wago-ai-suite-backend)**
- Docker socket access for container management
- Ports: 3042 (HTTP), 3443 (HTTPS)

**Label Studio**
- Data annotation platform
- Port: 8080
- Subpath: /labelstudio/

**JupyterLab**
- Development environment
- Port: 8888
- Subpath: /jupyter/
- User: 10642:10600 (configurable)

**Hailo AI Inference**
- YOLOv5 object detection
- Network mode: host (for low-latency streaming)
- Privileged: true (hardware access)
- Resource limits: 4 CPU, 4GB RAM

### Volume Requirements

Create these directories before deployment:

```bash
# Core directories
sudo mkdir -p /docker/tests
sudo mkdir -p /docker/local-ai/labelstudio/{data,files}
sudo mkdir -p /docker/local-ai/was/backend/ssl
sudo mkdir -p /docker/local-ai/wj/yolo
sudo mkdir -p /etc/docker/certs

# Set permissions
sudo chmod -R 755 /docker/local-ai
```

### Environment Customization

#### Production Security
```yaml
environment:
  API_KEY: "GENERATE_NEW_KEY_HERE"  # Change in wago-ai-suite-backend
  LABEL_STUDIO_PASSWORD: "strong-password"  # Change in wago-label-studio
```

#### MQTT Authentication
```yaml
mqtt-broker:
  environment:
    MOSQUITTO_CONFIG: "/mosquitto/config/mosquitto-pwd.conf"  # Enable authentication
```

#### JupyterLab User Mapping
```yaml
jupyterlab:
  user: "1000:1000"  # Change to your UID:GID
```

#### Hailo AI Mode Selection
```yaml
hailo-ai:
  entrypoint: ["/bin/bash", "entrypoint.sh", "webcam"]  # Switch to webcam mode
```

## ⚙️ Configuration

### Environment Variables

#### Core Settings

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SERVER_NAME` | Host IP/domain for services | `192.168.2.181` | ✅ |
| `INFERENCE_URL` | Inference server address | `192.168.2.116` | ✅ |
| `API_KEY` | Backend authentication key | `j}b9Q~#zsJOhR~LH-<` | ✅ |
| `BACKEND_PORT` | Backend HTTP port | `3042` | ❌ |
| `BACKEND_HTTPS_PORT` | Backend HTTPS port | `3443` | ❌ |

#### React Application

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_MQTT_BROKER_URL` | WebSocket MQTT URL | `wss://${SERVER_NAME}/mqtt` |
| `REACT_APP_BACKEND_API_URL` | Backend API endpoint | `https://wago-ai-suite-backend:3042` |
| `REACT_APP_N8N_API_URL` | n8n workflow API | `/n8n` |
| `REACT_APP_VERSION` | Application version | Auto-incremented |

#### MQTT Topics

```bash
REACT_APP_MQTT_TRANSCRIPTION_TOPIC=agent/audio/transcription
REACT_APP_MQTT_RESPONSE_TOPIC=agent/audio/response
REACT_APP_MQTT_INPUT_TOPIC=agent/audio/input
REACT_APP_MQTT_START_TOPIC=agent/audio/start
REACT_APP_MQTT_INFERENCE_TOPIC=inference/#
```

### SSL/TLS Configuration

#### Using Self-Signed Certificates (Development)

Self-signed certificates are included at:
- `ssl/selfsigned.crt`
- `ssl/selfsigned.key`

#### Using Custom Certificates (Production)

```bash
# Replace certificates
cp your-certificate.crt ssl/selfsigned.crt
cp your-private-key.key ssl/selfsigned.key

# Update backend certificates
cp your-backend-cert.crt backend/ssl/backend-selfsigned.crt
cp your-backend-key.key backend/ssl/backend-selfsigned.key

# Rebuild and restart
./build-was.sh
docker-compose restart
```

### Network Configuration

#### Docker Network

The suite uses an external Docker network:

```bash
# Create network if it doesn't exist
docker network create waa_cm_network
```

#### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Frontend | 443 | 443 | HTTPS |
| Frontend | 80 | 80 | HTTP |
| Backend | 3042 | 3042 | HTTP |
| Backend | 3443 | 3443 | HTTPS |
| Label Studio | 8080 | 8080 | HTTP |

### Service-Specific Configuration

#### Label Studio

```yaml
environment:
  LABEL_STUDIO_USERNAME: "your-email@domain.com"
  LABEL_STUDIO_PASSWORD: "your-secure-password"
  LABEL_STUDIO_HOST: "https://${SERVER_NAME}/labelstudio"
```

#### RTSP Video Stream

```bash
RTSP_URL=rtsp://username:password@camera-ip:554/stream
```

## 🚢 Deployment

### Production Deployment

#### 1. Security Hardening

```bash
# Generate strong API key
API_KEY=$(openssl rand -base64 32)

# Update .env file
echo "API_KEY=$API_KEY" >> .env

# Set proper file permissions
chmod 600 .env
chmod 600 backend/ssl/*
chmod 600 ssl/*
```

#### 2. Configure Firewall

```bash
# Allow HTTPS
sudo ufw allow 443/tcp

# Allow HTTP (for redirect)
sudo ufw allow 80/tcp

# Allow Backend API (if needed externally)
sudo ufw allow 3042/tcp
sudo ufw allow 3443/tcp
```

#### 3. Deploy with Auto-Restart

```bash
# Services restart automatically with 'unless-stopped' policy
docker-compose up -d

# Enable Docker to start on boot
sudo systemctl enable docker
```

#### 4. Monitoring

```bash
# View logs
docker-compose logs -f

# Check service health
docker-compose ps

# Monitor resources
docker stats
```

### Scaling Considerations

#### Vertical Scaling
- Increase container memory limits in `docker-compose.yml`
- Add more CPU cores to host system

#### Horizontal Scaling
- Deploy multiple inference backend instances
- Use load balancer for frontend (not included)
- Separate databases for Label Studio

### WAGO App Analytics (WAA) Deployment

#### Using WAA with CODESYS

If deploying on WAGO PLCs with CODESYS runtime:

1. **Install WAA Package**:
   - Download from [WAGO Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)
   - Follow WAA installation guide
   - Configure CODESYS project integration

2. **Configure Container Management**:
   ```
   - Use WAA's pre-built images for Grafana and Node-RED
   - Configure remote start from CODESYS project
   - Set up data bridges between PLC and containers
   ```

3. **Network Configuration**:
   - Ensure CODESYS runtime can reach Docker daemon
   - Configure port mappings (5000 for Grafana, 5101 for Node-RED)
   - Set up firewall rules for industrial protocols

4. **Benefits of WAA Integration**:
   - **Unified Management**: Control containers directly from CODESYS IDE
   - **Data Flow**: Seamless PLC variable access in Node-RED flows
   - **Visualization**: Real-time PLC data in Grafana dashboards
   - **Industrial Protocols**: Pre-configured Modbus, OPC UA support
   - **Edge Optimization**: Images optimized for WAGO edge controllers

#### Standalone Deployment (Without WAA)

The AI Suite can also run with standard Docker images:
- Replace WAA Grafana with official `grafana/grafana` image
- Replace WAA Node-RED with official `nodered/node-red` image
- Adjust port mappings in `docker-compose.yml` as needed
- Note: Industrial protocol integrations may require additional configuration

### Backup and Recovery

#### Backup Data Volumes

```bash
#!/bin/bash
# backup-was.sh

BACKUP_DIR="/backup/was-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Label Studio data
docker cp wago-label-studio:/label-studio/data "$BACKUP_DIR/labelstudio-data"

# Backup environment
cp .env "$BACKUP_DIR/"

# Backup certificates
cp -r ssl "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
```

#### Restore

```bash
# Stop services
docker-compose down

# Restore data
cp -r /backup/was-20240101/labelstudio-data/* /docker/local-ai/labelstudio/data/

# Restore configuration
cp /backup/was-20240101/.env .env

# Restart services
docker-compose up -d
```

## 🔌 Integrated Services

### About WAGO App Analytics (WAA)

Some services in this suite (Grafana and Node-RED) are provided by **WAGO App Analytics (WAA)**, an industrial automation solution that bridges CODESYS projects with modern container-based applications.

**Key WAA Features**:
- Pre-built, industrial-tested Docker images
- Remote container management from CODESYS projects
- Direct PLC data integration
- Optimized for WAGO edge devices
- Industrial protocol support (Modbus, OPC UA, etc.)

**Download and Documentation**: [WAGO App Analytics at Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

---

### Label Studio (Data Annotation)

**Access**: `https://{SERVER_NAME}/labelstudio/`

**Features**:
- Image, text, audio, video annotation
- Custom labeling configurations
- Export to multiple formats (COCO, YOLO, CSV)
- Collaborative annotation workflows

**Quick Start**:
1. Login with credentials from `.env`
2. Create new project
3. Import data
4. Define labeling interface
5. Start annotating

### Grafana (Monitoring)

**Access**: `https://{SERVER_NAME}/grafana/`

**Default Credentials**: Check host system configuration

**Provided by**: WAGO App Analytics (WAA) - [Learn More](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

**Use Cases**:
- System metrics (CPU, memory, disk)
- Model inference performance
- MQTT message statistics
- Custom dashboards
- PLC data visualization (via WAA integration)
- Industrial process monitoring

**WAA Benefits**:
- Pre-configured for WAGO industrial environments
- Direct CODESYS data source integration
- Optimized for edge device performance
- Industrial-grade reliability and testing

### JupyterLab (Development)

**Access**: `https://{SERVER_NAME}/jupyter/`

**Features**:
- Python notebook environment
- Terminal access
- File browser
- Extension ecosystem

**Typical Workflows**:
- Model prototyping
- Data exploration
- Performance profiling
- Documentation

### Node-RED (Visual Programming)

**Access**: `https://{SERVER_NAME}/nodered/`

**Provided by**: WAGO App Analytics (WAA) - [Learn More](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

**Features**:
- Visual flow-based programming
- MQTT integration
- HTTP request handling
- Database connectors
- CODESYS variable access (via WAA)
- Modbus/TCP, OPC UA support
- Industrial protocol integration

**Example Use Cases**:
- MQTT message routing
- Data transformation pipelines
- API integrations
- Scheduled tasks
- PLC to AI inference workflows
- Industrial sensor data preprocessing
- Real-time data aggregation from multiple sources

**WAA Benefits**:
- Pre-installed industrial automation nodes
- Optimized for WAGO edge devices
- Direct integration with CODESYS runtime
- Field-tested in industrial environments

### n8n (Workflow Automation)

**Access**: `https://{SERVER_NAME}/n8n/`

**Features**:
- 200+ integrations
- Webhook support
- Scheduled workflows
- Conditional logic

**Example Workflows**:
- Inference result notifications
- Data pipeline automation
- System health checks
- Report generation

### Netron (Model Visualization)

**Access**: `https://{SERVER_NAME}/netron/`

**Supported Formats**:
- ONNX (.onnx)
- TensorFlow (.pb, .meta)
- PyTorch (.pt, .pth)
- Keras (.h5, .keras)
- TensorFlow Lite (.tflite)

**Usage**:
1. Navigate to Netron interface
2. Upload or provide URL to model file
3. Explore architecture visually
4. Export diagrams

### Hailo AI Inference (Edge AI Accelerator)

**Hardware**: Hailo-8 AI Accelerator

**Container**: `wagoalex/wago-hailo:yolov5-latest`

**Features**:
- YOLOv5 object detection optimized for Hailo-8
- RTSP stream processing (IP cameras)
- USB webcam support
- Real-time inference with HLS streaming
- MQTT result publishing
- Hardware-accelerated processing

**Modes**:
- **RTSP Mode**: Process IP camera streams
- **Webcam Mode**: Process USB camera input

**Configuration**:

```yaml
# Switch between modes
entrypoint: ["/bin/bash", "entrypoint.sh", "rtsp"]   # or "webcam"

# Key environment variables
CONFIDENCE_THRESHOLD: "0.85"    # Detection confidence
FRAME_RATE: "15"                # Processing FPS
MQTT_BROKER: "192.168.2.124"   # Results destination
MQTT_TOPIC: "inference/yolov5m-results"
```

**MQTT Output Format**:
```json
{
  "timestamp": "2024-11-11T15:30:45",
  "detections": [
    {
      "class": "helmet",
      "confidence": 0.92,
      "bbox": [x, y, width, height]
    }
  ],
  "frame_count": 1542,
  "inference_time_ms": 12.3
}
```

**Use Cases**:
- Safety equipment detection (helmets, vests)
- Quality control inspection
- Person/vehicle counting
- Anomaly detection
- Real-time monitoring

**Hardware Requirements**:
- Hailo-8 AI accelerator module
- 4GB RAM minimum
- USB 3.0 or RTSP-capable camera
- Host network mode for optimal performance

**Benefits**:
- **Energy Efficient**: ~2.5W power consumption
- **High Performance**: 26 TOPS processing power
- **Edge Processing**: No cloud dependency
- **Low Latency**: <50ms inference time
- **Scalable**: Multiple accelerators per host

## 🛠️ Development

### Local Development Setup

#### Frontend Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start

# Build for production
npm run build
```

#### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server
node index.js
```

### Project Structure

```
wago-ai-suite/
├── src/                      # React application source
│   ├── components/          # React components
│   ├── assets/              # Static assets
│   └── config/              # Configuration files
├── backend/                 # Node.js backend
│   ├── index.js            # Main server file
│   └── ssl/                # Backend certificates
├── public/                  # Public assets
├── nginx.conf.template     # NGINX configuration template
├── docker-compose.yml      # Service orchestration
├── Dockerfile              # Frontend container image
├── build-was.sh            # Build automation script
└── .env                    # Environment configuration
```

### Adding New Components

#### 1. Create React Component

```javascript
// src/components/NewComponent.js
import React from 'react';

const NewComponent = () => {
  return (
    <div>
      <h1>New Component</h1>
    </div>
  );
};

export default NewComponent;
```

#### 2. Add Route

```javascript
// src/App.js
import NewComponent from './components/NewComponent';

// Add to routes
<Route path="/new-component" element={<NewComponent />} />
```

#### 3. Add to Navigation

```javascript
// src/components/Layout.js or BurgerMenu.js
<MenuItem onClick={() => navigate('/new-component')}>
  New Component
</MenuItem>
```

### Building Custom Images

#### Frontend Image

```bash
docker build \
  --build-arg REACT_APP_VERSION="1.0.0" \
  -t wagoalex/wago-ai-suite-ui:custom \
  .
```

#### Backend Image

```bash
docker build \
  -t wagoalex/wago-ai-suite-backend:custom \
  backend
```

### Customizing NGINX Configuration

Edit `nginx.conf.template` to add new proxy rules:

```nginx
location /custom-service/ {
    proxy_pass http://custom-service:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Then rebuild and restart:

```bash
./build-was.sh
docker-compose restart wago-ai-suite
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Certificate Warnings

**Problem**: Browser shows SSL certificate warning

**Solution**:
```bash
# For development, accept self-signed certificate
# For production, install valid certificate:
cp production.crt ssl/selfsigned.crt
cp production.key ssl/selfsigned.key
docker-compose restart
```

#### 2. Services Not Accessible

**Problem**: Cannot access services at configured URLs

**Diagnosis**:
```bash
# Check if containers are running
docker-compose ps

# Check logs
docker-compose logs -f wago-ai-suite

# Verify NGINX configuration
docker exec wago-ai-suite nginx -t

# Check network connectivity
docker exec wago-ai-suite ping -c 3 wago-ai-suite-backend
```

**Solution**:
```bash
# Restart services
docker-compose restart

# Rebuild if configuration changed
./build-was.sh
docker-compose up -d
```

#### 3. MQTT Connection Failed

**Problem**: Frontend cannot connect to MQTT broker

**Check**:
```bash
# Verify MQTT broker is running
docker ps | grep mqtt

# Test MQTT connection
mosquitto_sub -h $SERVER_NAME -p 9001 -t test -v
```

**Solution**:
- Verify `REACT_APP_MQTT_BROKER_URL` in `.env`
- Ensure WebSocket port 9001 is accessible
- Check firewall rules

#### 4. Label Studio iframe Issues

**Problem**: Label Studio not loading in iframe

**Solution**:
```bash
# Verify environment variables
docker exec wago-label-studio env | grep LABEL_STUDIO

# Check NGINX configuration for CSP headers
docker exec wago-ai-suite cat /etc/nginx/conf.d/default.conf | grep -A 5 labelstudio
```

#### 5. Out of Memory

**Problem**: Services crash or slow performance

**Solution**:
```yaml
# Add memory limits to docker-compose.yml
services:
  wago-ai-suite:
    mem_limit: 4g
    mem_reservation: 2g
```

#### 6. Port Conflicts

**Problem**: Cannot start container due to port already in use

**Diagnosis**:
```bash
# Check what's using the port
sudo netstat -tulpn | grep :443
sudo lsof -i :443
```

**Solution**:
```bash
# Stop conflicting service
sudo systemctl stop apache2  # or nginx, if running on host

# Or change port in docker-compose.yml
ports:
  - "8443:443"  # Use alternative external port
```

### Logging

#### View All Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f wago-ai-suite
docker-compose logs -f wago-ai-suite-backend
docker-compose logs -f wago-label-studio
```

#### NGINX Logs

```bash
# Access logs
docker exec wago-ai-suite tail -f /var/log/nginx/access.log

# Error logs
docker exec wago-ai-suite tail -f /var/log/nginx/error.log

# Service-specific logs
docker exec wago-ai-suite tail -f /var/log/nginx/jupyter.log
docker exec wago-ai-suite tail -f /var/log/nginx/labelstudio.log
```

#### Backend Logs

```bash
docker exec wago-ai-suite-backend cat /var/log/backend.log
```

### Performance Optimization

#### 1. Resource Limits

```yaml
# docker-compose.yml
services:
  wago-ai-suite:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

#### 2. Log Rotation

Configured in `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "5m"
    max-file: "1"
```

#### 3. Caching

NGINX caching is configured for static assets:
```nginx
location /labelstudio/static/ {
    expires 1d;
    add_header Cache-Control "public, max-age=86400";
}
```

### Getting Help

1. **Check Logs**: Always start with container logs
2. **Verify Configuration**: Use `docker exec` to inspect running configuration
3. **Network Issues**: Use `docker exec <container> ping` to test connectivity
4. **Documentation**: Review official docs for integrated services
5. **Community**: Check Docker and service-specific forums

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check all services
docker-compose ps

# Health check script
#!/bin/bash
curl -k https://$SERVER_NAME/api/health
curl -k https://$SERVER_NAME/labelstudio/health/
```

### Regular Maintenance

#### Weekly Tasks
- Review logs for errors
- Check disk space usage
- Verify backup completion

```bash
# Disk usage
docker system df

# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune
```

#### Monthly Tasks
- Update container images
- Rotate logs manually if needed
- Review security patches

```bash
# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d
```

### Updates and Upgrades

#### Update Process

```bash
# 1. Backup current state
./backup-was.sh

# 2. Pull latest images
docker-compose pull

# 3. Stop services
docker-compose down

# 4. Start with new images
docker-compose up -d

# 5. Verify
docker-compose ps
docker-compose logs -f
```

#### Rollback

```bash
# Stop current version
docker-compose down

# Use specific version
docker-compose --file docker-compose.yml pull
docker tag wagoalex/wago-ai-suite-ui:1.6 wagoalex/wago-ai-suite-ui:latest

# Start services
docker-compose up -d
```

## 🤝 Contributing

### Development Workflow

1. **Fork Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Changes**
4. **Test Locally**
   ```bash
   ./build-was.sh
   docker-compose up -d
   ```
5. **Commit Changes**
   ```bash
   git commit -m "Add: description of changes"
   ```
6. **Push and Create Pull Request**

### Code Standards

- **JavaScript**: Follow Airbnb style guide
- **React**: Use functional components with hooks
- **Docker**: Multi-stage builds preferred
- **Documentation**: Update README for new features

### Testing

```bash
# Frontend tests
npm test

# Backend tests (if available)
cd backend && npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📄 License

This project is licensed under the **Mozilla Public License Version 2.0** (MPL-2.0).

See [LICENSE](LICENSE) file for full text.

### Key Points

- **Open Source**: Free to use, modify, and distribute
- **Copyleft**: Modified versions must be shared under same license
- **File-Level**: Only modified files must be open-sourced
- **Commercial Use**: Permitted with proper attribution

## 🆘 Support

### Resources

- **Documentation**: This README
- **Issue Tracker**: [GitHub Issues](link-to-issues)
- **Email**: support@domain.com (update with actual contact)

### Before Requesting Support

1. Check this README thoroughly
2. Review logs for specific errors
3. Search existing issues
4. Prepare environment details:
   - OS version
   - Docker version
   - Docker Compose version
   - Relevant configuration (sanitized)

### Reporting Issues

**Good Issue Report Template**:

```markdown
**Environment**
- OS: Ubuntu 22.04
- Docker: 24.0.5
- Docker Compose: 2.20.0

**Expected Behavior**
Label Studio should load in iframe

**Actual Behavior**
Blank iframe with CSP errors in console

**Steps to Reproduce**
1. Navigate to https://192.168.1.100/
2. Click "Label Studio" in menu
3. Observe blank iframe

**Logs**

``` bash
[+] Running 3/3
 ✔ Container wago-ai-suite-backend  Created                                                                        0.1s
 ✔ Container wago-label-studio      Created                                                                        0.1s
 ✔ Container wago-ai-suite          Created                                                                        0.1s
Attaching to wago-ai-suite, wago-ai-suite-backend, wago-label-studio
wago-label-studio  | + exec
wago-label-studio  | + ENTRYPOINT_PATH=/label-studio/deploy/docker-entrypoint.d
wago-label-studio  | + source_inject_envvars
wago-label-studio  | + '[' -n '' ']'
wago-label-studio  | + '[' -f /opt/heartex/instance-data/etc/config_env ']'
wago-label-studio  | + '[' label-studio = nginx ']'
wago-label-studio  | + '[' label-studio = label-studio-uwsgi ']'
wago-label-studio  | + '[' label-studio = label-studio-migrate ']'
wago-label-studio  | + exec_or_wrap_n_exec label-studio
wago-label-studio  | + '[' -n '' ']'
wago-label-studio  | + exec label-studio
wago-ai-suite      |  Starting WAGO AI Suite Frontend...
wago-ai-suite      |
wago-ai-suite      |    Configuration:
wago-ai-suite      |    SERVER_NAME:     192.168.2.181 (Grafana, Jupyter, Node-RED)
wago-ai-suite      |    INFERENCE_URL:   192.168.2.116 (Inference Server)
wago-ai-suite      |    N8N_API_KEY:     [SET]
wago-ai-suite      |
wago-ai-suite      |    Testing NGINX configuration...
wago-ai-suite      | 2025/11/11 14:38:16 [warn] 8#8: conflicting server name "_" on 0.0.0.0:80, ignored
wago-ai-suite      | nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
wago-ai-suite      | nginx: configuration file /etc/nginx/nginx.conf test is successful
wago-ai-suite      |   NGINX config valid. Starting NGINX...
wago-ai-suite      | 2025/11/11 14:38:16 [warn] 1#1: conflicting server name "_" on 0.0.0.0:80, ignored
wago-ai-suite-backend  | Created logs directory: /app/logs
wago-ai-suite-backend  | Logs directory is writable: /app/logs
wago-ai-suite-backend  | {"level":"info","message":"HTTP server running on port 3042","timestamp":"2025-11-11 14:38:17"}
wago-ai-suite-backend  | {"level":"info","message":"HTTPS server running on port 3443","timestamp":"2025-11-11 14:38:17"}
wago-label-studio      | => Hostname correctly is set to: https://192.168.2.181/labelstudio
wago-label-studio      | => Django URL prefix is set to: /labelstudio
wago-label-studio      | => Database and media directory: /label-studio/data
wago-label-studio      | => Static URL is set to: /static/
wago-label-studio      | => Hostname correctly is set to: https://192.168.2.181/labelstudio
wago-label-studio      | => Django URL prefix is set to: /labelstudio
wago-label-studio      | => Database and media directory: /label-studio/data
wago-label-studio      | => Static URL is set to: /static/
wago-label-studio      | Read environment variables from: /label-studio/data/.env
wago-label-studio      | get 'SECRET_KEY' casted as '<class 'str'>' with default ''
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/types/project.py:157: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/types/projects_create_response.py:81: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/types/projects_update_response.py:86: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/_extensions/label_studio_tools/core/label_config.py:137: SyntaxWarning: invalid escape sequence '\$'
wago-label-studio      |   expression = "^\$[A-Za-z_]+$"
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/files/client.py:122: SyntaxWarning: invalid escape sequence '\ '
wago-label-studio      |   curl -H 'Authorization: Token abc123' \ -X POST 'https://localhost:8080/api/import/file-upload/245' -F ‘file=@path/to/my_file.csv’
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/files/client.py:448: SyntaxWarning: invalid escape sequence '\ '
wago-label-studio      |   curl -H 'Authorization: Token abc123' \ -X POST 'https://localhost:8080/api/import/file-upload/245' -F ‘file=@path/to/my_file.csv’
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:210: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:444: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:535: SyntaxWarning: invalid escape sequence '\.'
wago-label-studio      |   #### 1\. **POST with data**
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:895: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:1153: SyntaxWarning: invalid escape sequence '\{'
wago-label-studio      |   Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will have its own key in control weight dict with weight for each label and overall weight. For example, if a bounding box annotation with a control tag named my_bbox should be included with 0.33 weight in agreement calculation, and the first label Car should be twice as important as Airplane, then you need to specify: \{'my_bbox': \{'type': 'RectangleLabels', 'labels': \{'Car': 1.0, 'Airplane': 0.5}, 'overall': 0.33}}
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/client.py:1252: SyntaxWarning: invalid escape sequence '\.'
wago-label-studio      |   #### 1\. **POST with data**
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/exports/client.py:58: SyntaxWarning: invalid escape sequence '\&'
wago-label-studio      |   curl -X GET https://localhost:8080/api/projects/{id}/export?ids[]=123\&ids[]=345 -H 'Authorization: Token abc123' --output 'annotations.json'
wago-label-studio      | /label-studio/.venv/lib/python3.12/site-packages/label_studio_sdk/projects/exports/client.py:607: SyntaxWarning: invalid escape sequence '\&'
wago-label-studio      |   curl -X GET https://localhost:8080/api/projects/{id}/export?ids[]=123\&ids[]=345 -H 'Authorization: Token abc123' --output 'annotations.json'
wago-label-studio      | Not in REPL -> leaving logger event level as is.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.address`.
wago-label-studio      | Provider `faker.providers.address` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.automotive`.
wago-label-studio      | Provider `faker.providers.automotive` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.bank`.
wago-label-studio      | Specified locale `en_US` is not available for provider `faker.providers.bank`. Locale reset to `en_GB` for this provider.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.barcode`.
wago-label-studio      | Provider `faker.providers.barcode` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.color`.
wago-label-studio      | Provider `faker.providers.color` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.company`.
wago-label-studio      | Provider `faker.providers.company` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.credit_card`.
wago-label-studio      | Provider `faker.providers.credit_card` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.currency`.
wago-label-studio      | Provider `faker.providers.currency` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.date_time`.
wago-label-studio      | Provider `faker.providers.date_time` has been localized to `en_US`.
wago-label-studio      | Provider `faker.providers.emoji` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Provider `faker.providers.file` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.geo`.
wago-label-studio      | Provider `faker.providers.geo` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.internet`.
wago-label-studio      | Provider `faker.providers.internet` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.isbn`.
wago-label-studio      | Provider `faker.providers.isbn` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.job`.
wago-label-studio      | Provider `faker.providers.job` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.lorem`.
wago-label-studio      | Provider `faker.providers.lorem` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.misc`.
wago-label-studio      | Provider `faker.providers.misc` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.passport`.
wago-label-studio      | Provider `faker.providers.passport` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.person`.
wago-label-studio      | Provider `faker.providers.person` has been localized to `en_US`.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.phone_number`.
wago-label-studio      | Provider `faker.providers.phone_number` has been localized to `en_US`.
wago-label-studio      | Provider `faker.providers.profile` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Provider `faker.providers.python` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Provider `faker.providers.sbn` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Looking for locale `en_US` in provider `faker.providers.ssn`.
wago-label-studio      | Provider `faker.providers.ssn` has been localized to `en_US`.
wago-label-studio      | Provider `faker.providers.user_agent` does not feature localization. Specified locale `en_US` is not utilized for this provider.
wago-label-studio      | Starting new HTTPS connection (1): pypi.org:443
wago-label-studio      | https://pypi.org:443 "GET /pypi/label-studio/json HTTP/1.1" 200 35580
wago-label-studio      | ╔════════════════════════════════╗
wago-label-studio      | ║Update available 1.20.0 → 1.21.0║
wago-label-studio      | ║Run pip install -U label-studio ║
wago-label-studio      | ╚════════════════════════════════╝
wago-label-studio      |
wago-label-studio      | /label-studio/label_studio/projects/models.py:1088: SyntaxWarning: invalid escape sequence '\o'
wago-label-studio      |   Update tasks counters and update tasks states (rearrange and\or is_labeled)
wago-label-studio      | User alexander.fugmann@wago.com already exists
wago-label-studio      | November 11, 2025 - 14:38:22
wago-label-studio      | Django version 5.1.10, using settings 'core.settings.label_studio'
wago-label-studio      | Starting development server at http://0.0.0.0:8080/
wago-label-studio      | Quit the server with CONTROL-C.
wago-label-studio      |
wago-ai-suite-backend  | {"ip":"::ffff:172.18.0.23","level":"info","message":"Request received: GET /api/inference-containers?inferenceServerType=remote&remoteInferenceUrl=https:%2F%2F192.168.2.116:2376","query":{"inferenceServerType":"remote","remoteInferenceUrl":"https://192.168.2.116:2376"},"timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"inferenceServerType":"remote","level":"info","message":"Fetching inference containers","remoteInferenceUrl":"https://192.168.2.116:2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"level":"info","message":"Using remote Docker instance: host=192.168.2.116, port=2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"level":"info","message":"Creating and caching remote Docker instance for 192.168.2.116:2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"count":2,"level":"info","message":"Inference containers fetched successfully","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"ip":"::ffff:172.18.0.23","level":"info","message":"Request received: GET /api/inference-containers?inferenceServerType=remote&remoteInferenceUrl=https:%2F%2F192.168.2.116:2376","query":{"inferenceServerType":"remote","remoteInferenceUrl":"https://192.168.2.116:2376"},"timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"level":"info","message":"Using remote Docker instance: host=192.168.2.116, port=2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"ip":"::ffff:172.18.0.23","level":"info","message":"Request received: GET /api/containers/wago-hailo-yolo5m-helmet-wago-webcam/status?inferenceServerType=remote&remoteInferenceUrl=https:%2F%2F192.168.2.116:2376","query":{"inferenceServerType":"remote","remoteInferenceUrl":"https://192.168.2.116:2376"},"timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"inferenceServerType":"remote","level":"info","message":"Fetching container status","name":"wago-hailo-yolo5m-helmet-wago-webcam","remoteInferenceUrl":"https://192.168.2.116:2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"level":"info","message":"Using remote Docker instance: host=192.168.2.116, port=2376","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"count":2,"level":"info","message":"Inference containers fetched successfully","timestamp":"2025-11-11 14:38:36"}
wago-ai-suite-backend  | {"containerName":"wago-hailo-yolo5m-helmet-wago-webcam","level":"info","message":"Container status fetched","status":"exited","timestamp":"2025-11-11 14:38:36"}


```

**Configuration**
SERVER_NAME=192.168.1.100
(other relevant config)
```
```

---

## 📚 Additional Documentation

### YOLOv5 Helmet Detection Model

**Repository**: [github.com/WagoAlex/yolov5m-helmet-wago](https://github.com/WagoAlex/yolov5m-helmet-wago)

This repository contains the custom-trained YOLOv5m model optimized for safety helmet detection in industrial environments, specifically designed for deployment on WAGO edge devices with Hailo-8 AI acceleration.

#### Model Details

**Purpose**: Real-time safety equipment detection for industrial workplace monitoring

**Training Specifications**:
- **Base Model**: YOLOv5m (medium variant)
- **Classes Detected**: Safety helmets, human heads without helmets
- **Training Dataset**: Industrial workplace images with various lighting conditions and angles
- **Output Format**: Hailo HEF (Hailo Executable Format) for optimized inference
- **Model File**: `yolov5m-helmet-wago_20251014_183320.hef`

**Performance Metrics**:
- **Inference Time**: ~12-15ms per frame on Hailo-8
- **Accuracy**: 85%+ confidence threshold for reliable detection
- **FPS**: 15-30 frames per second depending on resolution
- **Power Consumption**: ~2.5W (Hailo-8 accelerator)

#### Integration with WAGO AI Suite

The YOLOv5m helmet detection model is deeply integrated into the AI Suite ecosystem:


---
``` bash 

┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Architecture                        │
└─────────────────────────────────────────────────────────────────┘

Video Input (RTSP/Webcam)
│
├─→ Hailo AI Container (wago-hailo:yolov5-latest)
│   ├─ Model: yolov5m-helmet-wago_20251014_183320.hef
│   ├─ Preprocessing: 640x640 frame normalization
│   └─ Inference: Hailo-8 accelerated detection
│
Detection Results
│
├─→ MQTT Broker (topic: inference/yolov5m-results)
│   └─ JSON payload with detections, confidence, bounding boxes
│
Real-time Monitoring & Actions
│
├─→ Node-RED (Workflow Automation)
│   ├─ Alert generation for non-compliance
│   ├─ Data transformation and routing
│   └─ Integration with safety systems
│
├─→ Grafana (Visualization)
│   ├─ Real-time detection dashboards
│   ├─ Compliance statistics
│   └─ Historical trend analysis
│
└─→ n8n (Workflow Automation)
├─ Notification systems (email, SMS, Slack)
├─ Incident logging
└─ Safety report generation

```


#### Key Integration Points

**1. Hailo AI Service Configuration**

The model is loaded and configured in the Hailo AI container:
```yaml
hailo-ai:
  environment:
    HEF_PATH: "/local/workspace/yolov5m-helmet-wago_20251014_183320.hef"
    CONFIDENCE_THRESHOLD: "0.85"
    MQTT_TOPIC: "inference/yolov5m-results"
```

**2. MQTT Message Format**

Detection results are published in real-time:
```json
{
  "timestamp": "2024-11-11T15:30:45.123Z",
  "frame_count": 1542,
  "detections": [
    {
      "class": "helmet",
      "confidence": 0.92,
      "bbox": [120, 80, 200, 180],
      "label": "Safety Helmet Detected"
    },
    {
      "class": "head", 
      "confidence": 0.88,
      "bbox": [450, 100, 550, 220],
      "label": "No Helmet - Safety Violation"
    }
  ],
  "inference_time_ms": 12.3,
  "total_detections": 2,
  "violations": 1
}
```

**3. Node-RED Integration**

Example Node-RED flow for helmet detection monitoring:
```javascript
// MQTT In Node (Subscribe to inference results)
Topic: inference/yolov5m-results

// Function Node (Process detections)
if (msg.payload.violations > 0) {
    // Extract violation details
    const violations = msg.payload.detections.filter(d => d.class === "head");
    
    // Create alert message
    msg.alert = {
        timestamp: msg.payload.timestamp,
        violation_count: violations.length,
        confidence: violations.map(v => v.confidence),
        camera_id: "camera-01"
    };
    
    return msg;
}

// MQTT Out / HTTP Request (Send alerts to safety system)
```

**4. Grafana Dashboards**

Pre-configured dashboard queries for helmet detection monitoring:

- **Real-time Detection Rate**: Detections per minute
- **Compliance Percentage**: Helmet vs. head ratio
- **Violation Heatmap**: Time-based violation patterns
- **Camera Performance**: FPS, latency, detection accuracy per camera

**5. Label Studio Integration**

Use Label Studio for continuous model improvement:

1. **Data Collection**: Export frames with low-confidence detections
2. **Re-annotation**: Correct and refine labels in Label Studio
3. **Dataset Export**: Export in YOLO format for retraining
4. **Model Retraining**: Use JupyterLab for model fine-tuning
5. **Deployment**: Convert new model to HEF format and update container

#### Use Cases in Industrial Environments

**Construction Sites**:
- Enforce hard hat compliance
- Generate safety reports
- Alert supervisors of violations in real-time

**Manufacturing Facilities**:
- Monitor designated PPE zones
- Track compliance statistics
- Integrate with access control systems

**Warehouses & Logistics**:
- High-traffic area monitoring
- Forklift operation zones
- Loading dock safety compliance

#### Model Training & Customization

To train your own variant of the model:

1. **Data Collection**:
   - Use Label Studio for annotation
   - Minimum 1000+ images with diverse scenarios
   - Include various helmet types, colors, angles

2. **Training in JupyterLab**:
```python
   # Clone YOLOv5 repository
   !git clone https://github.com/ultralytics/yolov5
   
   # Train custom model
   !python train.py --img 640 --batch 16 --epochs 100 \
                    --data helmet.yaml --weights yolov5m.pt
```

3. **Convert to Hailo HEF**:
   - Export to ONNX format
   - Use Hailo Dataflow Compiler
   - Optimize for Hailo-8 architecture

4. **Deploy to AI Suite**:
   - Copy HEF file to `/docker/tests/`
   - Update `HEF_PATH` in docker-compose.yml
   - Restart Hailo AI container

#### Performance Optimization Tips

**Frame Rate Optimization**:
- Reduce input resolution for higher FPS (480p vs 640p)
- Adjust `FRAME_RATE` environment variable
- Use hardware video decoding (RTSP mode)

**Accuracy vs Speed Trade-offs**:
- Lower `CONFIDENCE_THRESHOLD` for more detections (more false positives)
- Increase threshold for fewer detections (higher precision)
- Adjust `NMS_IOU_THRESHOLD` for overlapping detection handling

**Planned: Multi-Camera Deployment**:
- Deploy multiple Hailo AI containers with different camera streams
- Use MQTT topics to differentiate: `inference/camera-{id}/results`
- Aggregate results in Node-RED for centralized monitoring

#### Possible Repository Structure
``` bash
yolov5m-helmet-wago/
├── models/
│   ├── yolov5m-helmet-wago_20251014_183320.hef  # Hailo optimized model
│   ├── yolov5m.pt                                # PyTorch weights
│   └── model_info.json                           # Model metadata
├── datasets/
│   ├── images/                                   # Training images
│   ├── labels/                                   # YOLO format annotations
│   └── data.yaml                                 # Dataset configuration
├── scripts/
│   ├── train.py                                  # Training script
│   ├── export_to_onnx.py                         # Model export
│   └── hailo_compilation.sh                      # HEF conversion
├── notebooks/
│   └── model_evaluation.ipynb                    # Performance analysis
└── README.md                                      # Detailed documentation
```

**Built with ❤️ for Edge AI Applications**

*Version 1.7 - Last Updated: 2025*
