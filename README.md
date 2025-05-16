# WAGO AI Suite

A containerized application providing AI capabilities with React frontend, Node.js backend, and integrations with various services including Label Studio, MQTT broker, n8n workflows, and more.

## Architecture

- React.js frontend
- Node.js backend
- NGINX as reverse proxy
- Integration with:
  - Label Studio for data labeling
  - MQTT for IoT communication
  - n8n for workflow automation
  - Grafana for visualization
  - Jupyter for notebooks

## Project Structure
/
├── backend/                # Node.js backend code
├── build2.sh               # Build script
├── craco.config.js         # Create React App configuration override
├── docker-compose.yml      # Docker Compose configuration
├── docker-entrypoint.sh    # Docker entrypoint script
├── Dockerfile              # Docker build instructions
├── .env                    # Environment variables
├── nginx.conf.template     # NGINX configuration template
├── package.json            # Node.js dependencies
├── public/                 # Static assets
├── src/                    # React source code
├── ssl/                    # SSL certificates
└── supervisor.conf         # Supervisor configuration
## Setup and Deployment

The application is containerized using Docker and can be deployed using Docker Compose.

### Running the Application

```bash
docker compose up -d
