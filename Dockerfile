# Stage 1: Build Netron (web version only)
FROM node:18 AS netron-build

# Install Python and required dependencies for Netron build
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for Netron
WORKDIR /netron

# Clone Netron repository
RUN git clone https://github.com/lutzroeder/netron.git .

# Apply customizations to bypass cookie consent dialog
RUN mkdir -p custom && \
    cp -r source/* custom/ && \
    echo "/* Custom hosted Netron */\n" > custom/hosted.js && \
    cat source/index.js >> custom/hosted.js && \
    sed -i 's/if (message.cookie) {/if (message.cookie \&\& !options.bypassCookiePrompt) {/g' custom/hosted.js && \
    mkdir -p dist/web && \
    cp -r custom/* dist/web/

# Stage 2: Build the React app
FROM node:18 AS build

# Install minimal dependencies for the React app
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for the React app
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY craco.config.js ./
RUN npm install --legacy-peer-deps

# Copy the rest of the React project
COPY . .

# Copy Netron's customized web version
COPY --from=netron-build /netron/dist/web /app/public/netron

# Set environment variables for the React build
ARG REACT_APP_MQTT_BROKER_URL
ARG REACT_APP_MQTT_START_TOPIC
ARG REACT_APP_N8N_API_URL
ARG REACT_APP_VERSION
ENV REACT_APP_MQTT_BROKER_URL=$REACT_APP_MQTT_BROKER_URL
ENV REACT_APP_MQTT_START_TOPIC=$REACT_APP_MQTT_START_TOPIC
ENV REACT_APP_N8N_API_URL=$REACT_APP_N8N_API_URL
ENV REACT_APP_VERSION=$REACT_APP_VERSION

# Build the React app
RUN npm run build

# Stage 3: Final stage with Python, Label Studio, NGINX, and Supervisor
FROM python:3.8-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*


# Copy the built React app
COPY --from=build /app/build /usr/share/nginx/html
# Copy configuration files
COPY public/container-patterns.yml /usr/share/nginx/html/config/
# Copy SSL certificates
COPY ssl/selfsigned.crt /etc/ssl/nginx/selfsigned.crt
COPY ssl/selfsigned.key /etc/ssl/nginx/selfsigned.key

# Copy NGINX config template
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy Supervisor config
COPY supervisor.conf /etc/supervisor/conf.d/supervisor.conf

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 443 8080

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]