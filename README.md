# WAGO AI Suite

> Enterprise-grade AI application suite optimized for edge deployment with local inference capabilities

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

### Business Value

- **Edge-First Design**: Optimized for local execution, reducing latency and cloud dependencies
- **Energy Efficient**: Purpose-built for resource-constrained environments
- **Scalable Architecture**: Modular design allows selective deployment of components
- **Enterprise Ready**: Production-grade security with HTTPS, authentication, and monitoring

## ✨ Key Features

### Core Capabilities

- **Model Visualization**: Integrated Netron for neural network architecture inspection
- **Data Annotation**: Label Studio integration for dataset creation and management
- **Workflow Automation**: Node-RED and n8n for visual programming and automation
- **Real-time Monitoring**: Grafana dashboards for system and model performance
- **Interactive Development**: JupyterLab environment for experimentation
- **MQTT Integration**: Real-time messaging for inference requests and results
- **Video Processing**: RTSP stream handling with inference capabilities
- **Multi-Platform Support**: GPU and CPU inference options

### Technical Highlights

- Containerized microservices architecture
- NGINX reverse proxy with SSL/TLS termination
- WebSocket support for real-time communication
- Cross-Origin Resource Sharing (CORS) enabled
- Docker Compose orchestration
- Automated build pipeline with versioning

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

| Component | Purpose | Port | Technology |
|-----------|---------|------|------------|
| **Frontend** | Web UI | 443, 80 | React 18, Material-UI |
| **Backend** | REST API | 3042, 3443 | Node.js, Express |
| **Label Studio** | Data annotation | 8080 | Python/Django |
| **Grafana** | Monitoring | 5000 | Go |
| **JupyterLab** | Development | 8888 | Python |
| **Node-RED** | Automation | 5101 | Node.js |
| **n8n** | Workflow automation | 5678 | Node.js |
| **MQTT Broker** | Messaging | 9001 | Mosquitto |

## 📦 Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: 20GB available space
- **Network**: Static IP or dynamic DNS

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

**Use Cases**:
- System metrics (CPU, memory, disk)
- Model inference performance
- MQTT message statistics
- Custom dashboards

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

**Features**:
- Visual flow-based programming
- MQTT integration
- HTTP request handling
- Database connectors

**Example Use Cases**:
- MQTT message routing
- Data transformation pipelines
- API integrations
- Scheduled tasks

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
```
[paste relevant logs here]
```

**Configuration**
SERVER_NAME=192.168.1.100
(other relevant config)
```
```

---

## 📚 Additional Documentation

### API Documentation

See [API.md](API.md) for backend API reference (if available)

### Architecture Diagrams

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation (if available)

### Deployment Guides

- [AWS Deployment](docs/aws-deployment.md)
- [Azure Deployment](docs/azure-deployment.md)
- [On-Premise Deployment](docs/on-premise-deployment.md)

*(Create these as needed)*

---

**Built with ❤️ for Edge AI Applications**

*Version 1.7 - Last Updated: 2024*
