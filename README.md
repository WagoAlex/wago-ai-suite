# WAGO AI Suite

> **A comprehensive containerized AI platform for industrial applications with React frontend, Node.js backend, and seamless integration of ML/AI tools including Label Studio, n8n automation, Grafana visualization, and real-time inference capabilities.**

[![Version](https://img.shields.io/badge/version-1.6-brightgreen.svg)](https://github.com/WagoAlex/wago-ai-suite)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/WagoAlex/wago-ai-suite.git
cd wago-ai-suite

# 2. Configure environment
cp .env.example .env
# Edit .env with your specific settings

# 3. Deploy with Docker Compose
docker-compose up -d

# 4. Access the suite
open https://your-server-ip
```

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## ✨ Features

### 🤖 AI & Machine Learning
- **Visual Inference**: Real-time object detection with webcam/RTSP streams
- **Conversational AI**: Voice and text-based AI interactions
- **Model Training**: Jupyter notebooks for custom model development
- **Data Annotation**: Integrated Label Studio for dataset preparation

### 🔧 Automation & Integration
- **n8n Workflows**: Visual automation for AI pipelines
- **Node-RED**: IoT data processing and integration
- **MQTT Support**: Real-time messaging for IoT devices
- **RESTful APIs**: Complete backend API for all operations

### 📊 Monitoring & Visualization with WAGO App Analytics
- **Grafana Dashboards**: Real-time analytics and metrics
- **Node-RED Integration**: Advanced IoT data processing
- **Pre-configured Analytics**: Works seamlessly with WAGO App Analytics (WAA)
- **Container Management**: Live container status and logs
- **System Status**: Health monitoring for all services
- **Data Flow Visualization**: Interactive MQTT topic mapping

> **📋 Note**: This suite integrates perfectly with **WAGO App Analytics (WAA)** which typically uses the predefined network `waa-networks`. For the complete WAGO App Analytics solution, visit: [WAGO Download Center - App Analytics](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

### 🛡️ Enterprise Ready
- **SSL/TLS Security**: Self-signed or custom certificates
- **Docker Orchestration**: Scalable containerized deployment
- **NGINX Reverse Proxy**: Optimized routing and load balancing
- **Role-based Access**: Configurable authentication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                     │
│                     (Port 80/443)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────┐
│                React Frontend                               │
│            (Embedded in NGINX)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
    ┌─────────▼──────┐ ┌─────▼──────────┐
    │   Backend API  │ │  External APIs │
    │   (Port 3042)  │ │   & Services   │
    └─────────┬──────┘ └────────────────┘
              │
    ┌─────────▼──────────────────────────┐
    │            Services Layer          │
    │  ┌──────────┐ ┌─────────────────┐  │
    │  │Label     │ │n8n    │Node-RED │  │
    │  │Studio    │ │       │         │  │
    │  └──────────┘ └─────────────────┘  │
    │  ┌──────────┐ ┌─────────────────┐  │
    │  │Grafana   │ │Jupyter│MQTT     │  │
    │  │          │ │       │Broker   │  │
    │  └──────────┘ └─────────────────┘  │
    └────────────────────────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended for ML workloads)
- **Storage**: 50GB+ free space
- **Network**: Static IP recommended

### Software Dependencies
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+
- **OpenSSL**: For certificate generation

### Hardware Support (Optional)
- **GPU**: NVIDIA GPU with CUDA support for ML acceleration
- **Camera**: USB webcam for visual inference
- **RTSP Cameras**: IP cameras for video streaming

## 🔧 Installation

### Method 1: Quick Deploy (Recommended)

```bash
# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/WagoAlex/wago-ai-suite/main/install.sh | bash
```

### Method 2: Manual Installation

#### Step 1: Clone Repository
```bash
git clone https://github.com/WagoAlex/wago-ai-suite.git
cd wago-ai-suite
```

#### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

#### Step 3: Network Setup
```bash
# For WAGO App Analytics integration (recommended)
docker network create waa_cm_network

# Alternative: Use existing WAA network
# docker network ls | grep waa-networks
# docker network connect waa-networks container-name
```

#### Step 4: SSL Certificates (Production)
```bash
# Generate self-signed certificates
./scripts/generate-ssl.sh

# OR use your own certificates
cp your-cert.crt ssl/selfsigned.crt
cp your-key.key ssl/selfsigned.key
```

#### Step 5: Deploy Services
```bash
# Deploy all services
docker-compose up -d

# Verify deployment
docker-compose ps
```

### Integration with WAGO App Analytics

If you're using **WAGO App Analytics (WAA)**, ensure network compatibility:

```bash
# Check existing WAA networks
docker network ls | grep waa

# Connect to existing WAA network (if available)
docker network connect waa-networks wago-ai-suite
docker network connect waa-networks wago-ai-suite-backend
docker network connect waa-networks wago-label-studio

# Verify network connectivity
docker exec wago-ai-suite ping grafana-container-name
```

> **💡 Tip**: For complete WAGO App Analytics integration, download the full solution from [WAGO Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# === CORE SETTINGS ===
SERVER_NAME=192.168.1.100          # Your server IP/domain
INFERENCE_URL=192.168.1.101         # Remote inference server (optional)

# === AUTHENTICATION ===
API_KEY="your-secure-api-key"       # Backend API security
REACT_APP_N8N_REST_API_KEY="jwt-token"  # n8n authentication

# === MQTT CONFIGURATION ===
REACT_APP_MQTT_BROKER_URL=wss://192.168.1.100/mqtt
REACT_APP_MQTT_START_TOPIC=agent/audio/start

# === N8N WEBHOOKS ===
REACT_APP_WEBHOOK_URL="/n8n/webhook-test/invoke_recording /n8n/webhook-test/invoke_audio"

# === VERSION ===
REACT_APP_VERSION=1.6
```

### Service-Specific Configuration

#### Label Studio
```yaml
# Default credentials (change in production)
LABEL_STUDIO_USERNAME: "admin@company.com"
LABEL_STUDIO_PASSWORD: "secure-password"
```

#### Grafana
```yaml
# Access via /grafana/
# Default: admin/admin
```

#### n8n
```yaml
# Access via /n8n/
# Configure workflows for automation
```

## 📖 Usage

### 1. Access the Web Interface

Navigate to `https://your-server-ip` and explore the main dashboard:

- **🏠 Home**: Quick access to all features
- **🤖 AI Model**: Jupyter notebooks and model training
- **👁️ Visual Inference**: Real-time object detection
- **💬 Chat/Conversation**: AI interactions
- **📊 Visualization**: Grafana dashboards
- **🔧 Automation**: n8n and Node-RED workflows

### 2. Setting Up Visual Inference

```javascript
// Example: Start webcam inference
const response = await fetch('/api/containers/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inferenceServerType: 'local',
    source: 'webcam'
  })
});
```

### 3. Creating Automation Workflows

Access n8n at `/n8n/` to create workflows:
1. Connect MQTT nodes for IoT data
2. Add AI processing nodes
3. Route results to databases or APIs
4. Set up triggers and schedules

### 4. Data Annotation with Label Studio

1. Access Label Studio at `/labelstudio/`
2. Create a new project
3. Upload your datasets
4. Configure labeling interface
5. Start annotating for model training

### 5. MQTT Integration

```python
# Python example for MQTT publishing
import paho.mqtt.client as mqtt

client = mqtt.Client()
client.connect("your-server-ip", 1883, 60)
client.publish("agent/audio/start", '{"command": "start"}')
```

## 🔌 API Documentation

### Container Management
```bash
# Start container
POST /api/containers/:name/start
Body: {
  "inferenceServerType": "local|remote",
  "remoteInferenceUrl": "https://remote-server:2376"
}

# Get container status
GET /api/containers/:name/status

# Get container logs
GET /api/containers/:name/logs?lines=100
```

### Video Streaming
```bash
# Stream webcam
GET /api/video/stream?source=webcam

# Stream RTSP
GET /api/video/stream?source=rtsp&rtspUrl=rtsp://camera-ip/stream
```

### Authentication
```bash
# All API requests require API key header
Authorization: Bearer your-api-key
```

## 💻 Development

### Local Development Setup

```bash
# Backend development
cd backend
npm install
npm run dev

# Frontend development
npm install
npm start

# Build production images
./build2.sh
```

### Project Structure
```
wago-ai-suite/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   ├── assets/            # Static assets
│   └── theme.js           # WAGO CI theme
├── backend/               # Node.js backend
│   ├── index.js          # Main server file
│   └── ssl/              # Backend certificates
├── public/               # Static files
│   └── netron/          # Embedded Netron viewer
├── ssl/                  # Frontend certificates
├── docker-compose.yml    # Service orchestration
├── nginx.conf.template   # Proxy configuration
└── .env                 # Environment variables
```

### Adding New Features

1. **Frontend Components**:
   ```bash
   # Create new component
   touch src/components/NewFeature.js
   
   # Add route in App.js
   <Route path="/new-feature" element={<NewFeature />} />
   ```

2. **Backend APIs**:
   ```javascript
   // Add endpoint in backend/index.js
   app.get('/api/new-feature', (req, res) => {
     res.json({ message: 'New feature endpoint' });
   });
   ```

3. **Docker Services**:
   ```yaml
   # Add to docker-compose.yml
   new-service:
     image: your-image:latest
     networks:
       - waa_cm_network
   ```

### Testing

```bash
# Run frontend tests
npm test

# Test container health
docker-compose exec wago-ai-suite-backend curl http://localhost:3042/api/containers

# Test NGINX routing
curl -k https://your-server-ip/labelstudio/
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Label Studio Static Files Not Loading
```bash
# Check NGINX logs
docker logs wago-ai-suite 2>&1 | grep labelstudio

# Verify container status
docker exec wago-label-studio curl http://localhost:8080/static/css/main.css

# Solution: Restart with updated config
docker-compose restart wago-ai-suite
```

#### 2. MQTT Connection Failed
```bash
# Check broker status
docker logs mqtt-broker

# Test connection
mosquitto_pub -h your-server-ip -p 1883 -t test -m "hello"

# Check firewall
sudo ufw status
```

#### 3. SSL Certificate Issues
```bash
# Regenerate certificates
./scripts/generate-ssl.sh

# Update Docker volumes
docker-compose down
docker-compose up -d
```

#### 4. Container Startup Failures
```bash
# Check resource usage
docker stats

# View detailed logs
docker-compose logs service-name

# Reset containers
docker-compose down --volumes
docker-compose up -d
```

### Debug Mode

Enable debug logging:
```bash
# Set in .env
DEBUG=true
NGINX_LOG_LEVEL=debug

# Restart services
docker-compose restart
```

### Performance Optimization

```bash
# Monitor resource usage
htop
docker stats

# Optimize Docker
docker system prune -f
docker volume prune -f

# Tune NGINX
# Edit nginx.conf.template worker processes
```

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/wago-ai-suite.git
   cd wago-ai-suite
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development**
   ```bash
   # Make your changes
   # Test thoroughly
   npm test
   docker-compose up -d
   ```

4. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Describe your changes
   - Include screenshots if UI changes
   - Reference any related issues

### Code Style

- **Frontend**: ESLint + Prettier
- **Backend**: Node.js best practices
- **Docker**: Multi-stage builds
- **Documentation**: Markdown with examples

### Reporting Issues

Use GitHub Issues with:
- Clear description
- Steps to reproduce
- Environment details
- Docker logs if relevant

## 📄 License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Mozilla Public License Version 2.0
==================================

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
```

## 👨‍💻 Contact & Responsibility

**Technical Contact & Project Maintainer:**
- **Alexander Fugmann** - alexander.fugmann@wago.com
- Senior Software Engineer, WAGO GmbH & Co. KG

**General Support & IoT Inquiries:**
- **IoT Team** - iot@wago.com
- WAGO Industrial IoT Solutions

## 🙏 Acknowledgments

- **WAGO GmbH & Co. KG** - Industrial automation expertise
- **Label Studio** - Data annotation platform
- **n8n** - Workflow automation
- **Grafana** - Visualization and monitoring
- **React** - Frontend framework
- **Docker** - Containerization platform

## 📞 Support

- **Primary Contact**: alexander.fugmann@wago.com (Technical Lead)
- **IoT Support**: iot@wago.com (General IoT inquiries)
- **Documentation**: [GitHub Wiki](https://github.com/WagoAlex/wago-ai-suite/wiki)
- **Issues**: [GitHub Issues](https://github.com/WagoAlex/wago-ai-suite/issues)
- **WAGO App Analytics**: [Download Center](https://downloadcenter.wago.com/wago/solution/details/m7d6fq3g6kbg604hre4)
- **Community**: [WAGO Community Forum](https://www.wago.community/)

---

**Made with ❤️ by WAGO for the Industrial AI Community**