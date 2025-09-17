/**
 * backend index.js
 */

const express = require('express');
const https = require('https');
const http = require('http');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require('fs').promises;
const fsp = require('fs');
const path = require('path');
const Docker = require('dockerode');
const yaml = require('js-yaml');
const winston = require('winston');
const { createProxyMiddleware } = require('http-proxy-middleware');
const port = process.env.BACKEND_PORT || 3042;
const httpsPort = process.env.BACKEND_HTTPS_PORT || 3443;
const portInference = process.env.INFERENCE_PORT || 8042;
const { spawn } = require('child_process');
const { debounce } = require('lodash');
const app = express();

/**
 * Ensures the logs directory exists and is writable.
 */
const logsDir = '/app/logs';
const requestTimestamps = new Map(); // Track client IPs and timestamps
const THROTTLE_WINDOW = 10000; // 10s window
const MAX_REQUESTS = 50; // Max 50 requests per window
const debouncedInfo  = debounce((...args) => logger.info(...args), 20000, { leading: true });
const debouncedWarn  = debounce((...args) => logger.info(...args), 15000, { leading: true });
const debouncedError = debounce((...args) => logger.error(...args), 10000, { leading: true });
try {
  if (!fsp.existsSync(logsDir)) {
    fsp.mkdirSync(logsDir, { recursive: true, mode: 0o755 });
    console.log(`Created logs directory: ${logsDir}`);
  } else {
    console.log(`Logs directory already exists: ${logsDir}`);
  }
  try {
    fsp.accessSync(logsDir, fsp.constants.W_OK);
    console.log(`Logs directory is writable: ${logsDir}`);
  } catch (err) {
    console.error(`Logs directory not writable: ${logsDir}`, err);
  }
} catch (err) {
  console.error('Failed to create or access logs directory:', err);
}

/**
 * Configures Winston logger for request and error logging.
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsDir, 'backend.log') })
  ]
});

// Debounce stream-specific request log (60s window)
const debouncedStreamRequestLog = debounce((req) => {
  logger.info(`Request received: ${req.method} ${req.url}`, {
    ip: req.ip,
    query: req.query,
    body: req.body
  });
}, 60000, { leading: true });

// Update middleware for path-specific debouncing
app.use((req, res, next) => {
  if (req.url.startsWith('/api/video/stream')) {
    debouncedStreamRequestLog(req);
  } else {
    logger.info(`Request received: ${req.method} ${req.url}`, {
      ip: req.ip,
      query: req.query,
      body: req.body
    });
  }
  next();
});
// Define local Docker instance
const localDocker = new Docker({ socketPath: '/var/run/docker.sock' });

// Cache Docker instances for reuse (key: 'local' or 'remote:host:port')
const dockerInstanceCache = new Map();

/**
 * Defines Docker connections for local and remote inference.
 */
const dockerConnections = {
  local: localDocker,
  remote: (host, port) => {
    const key = `remote:${host}:${port}`;
    if (!dockerInstanceCache.has(key)) {
      logger.info(`Creating and caching remote Docker instance for ${host}:${port}`);
      const instance = new Docker({
        host,
        port,
        ca: fsp.readFileSync('/etc/docker/certs/ca.pem'),
        cert: fsp.readFileSync('/etc/docker/certs/client-cert.pem'),
        key: fsp.readFileSync('/etc/docker/certs/client-key.pem'),
        protocol: 'https',
      });
      dockerInstanceCache.set(key, instance);
    }
    return dockerInstanceCache.get(key);
  },
};

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    logger.info('Handling CORS preflight request', { method: req.method, url: req.url });
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON bodies
app.use(express.json());

/**
 * Selects the appropriate Docker instance based on server type.
 * @param {string} type - 'local' or 'remote'
 * @param {string} remoteInferenceUrl - URL for remote Docker host
 * @returns {Docker} Docker instance
 */
const getDockerInstance = (type, remoteInferenceUrl) => {
  if (type === 'remote' && remoteInferenceUrl) {
    let host, port;
    try {
      const urlString = remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `https://${remoteInferenceUrl}`;
      const url = new URL(urlString);
      host = url.hostname;
      port = url.port || 2376;
    } catch (e) {
      logger.error('Invalid remoteInferenceUrl format', { url: remoteInferenceUrl, error: e.message });
      const [hostPart, portPart] = remoteInferenceUrl.split(':');
      host = hostPart;
      port = portPart || 2376;
    }
    logger.info(`Using remote Docker instance: host=${host}, port=${port}`);
    return dockerConnections.remote(host, port);
  }
  logger.info('Using local Docker instance');
  return dockerConnections.local;
};

/**
 * Identifies inference containers by name pattern.
 * @param {string} name - Container name
 * @returns {boolean} True if container is for inference
 */
const isInferenceContainer = (name) => /wago-hailo/.test(name);

/**
 * Sends an email using nodemailer.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body
 */
async function sendEmail(to, subject, text) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  logger.info('Sending email', { to, subject });
  await transporter.sendMail({
    from: '"WAGO Inquiry" <no-reply@wago.com>',
    to,
    subject,
    text,
  });
  logger.info('Email sent successfully', { to, subject });
}

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, type } = req.body;
  logger.info('Contact form submission received', { name, email, subject, type });
  if (!name || !email || !subject || !message || !type) {
    logger.warn('Missing required fields in contact form', { body: req.body });
    return res.status(400).json({ error: 'All fields are required' });
  }
  let recipient;
  switch (type) {
    case 'support':
      recipient = 'iot@wago.com';
      break;
    case 'solution':
      recipient = 'solutions@wago.com';
      break;
    default:
      logger.warn('Invalid inquiry type', { type });
      return res.status(400).json({ error: 'Invalid inquiry type' });
  }
  try {
    await sendEmail(recipient, subject, `From: ${name} <${email}>\n\n${message}`);
    logger.info('Contact form processed successfully', { recipient });
    res.status(200).json({ message: 'Inquiry sent successfully' });
  } catch (error) {
    logger.error('Error sending email', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

// List all containers
app.get('/api/containers', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  logger.info('Fetching container list', { inferenceServerType, remoteInferenceUrl });
  try {
    const dockerInstance = getDockerInstance(inferenceServerType, remoteInferenceUrl);
    const containers = await dockerInstance.listContainers({ all: true });
    const containerInfo = containers.map(container => ({
      id: container.Id,
      name: container.Names[0]?.replace(/^\//, '') || 'Unnamed',
      status: container.State,
      health: container.Status.includes('healthy') ? 'healthy' : container.Status.includes('unhealthy') ? 'unhealthy' : 'N/A',
      image: container.Image,
      created: container.Created,
      isInference: isInferenceContainer(container.Names[0] || ''),
    }));
    // Apply server-side filtering based on container-patterns.yml
    const configPath = path.join(__dirname, '../public/container-patterns.yml');
    let patterns = ["00-30-de", "00-30-DE", "wago-", "mqtt-broker", "x-"];
    try {
      const configText = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configText);
      patterns = config.patterns || patterns;
      logger.info('Loaded container patterns', { patterns });
    } catch (error) {
      logger.warn('Failed to load container-patterns.yml, using default patterns', { error: error.message });
    }
    const filteredContainers = containerInfo.filter(container =>
      patterns.some(pattern => container.name.startsWith(pattern))
    );
    logger.info('Container list fetched successfully', { count: filteredContainers.length });
    res.status(200).json(filteredContainers);
  } catch (error) {
    logger.error('Error fetching containers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch containers', details: error.message });
  }
});

// Container status for specific container
app.get('/api/containers/:name/status', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  logger.info('Fetching container status', { name, inferenceServerType, remoteInferenceUrl });
  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;
    const containers = await dockerInstance.listContainers({ all: true });
    const targetContainer = containers.find(c => c.Names.some(n => n.replace(/^\//, '') === name));
    if (!targetContainer) {
      logger.warn('Container not found', { name });
      return res.status(404).json({ error: `Container ${name} not found` });
    }
    const containerName = targetContainer.Names[0].replace(/^\//, '');
    const containerInfo = await dockerInstance.getContainer(targetContainer.Id).inspect();
    logger.info('Container status fetched', { containerName, status: containerInfo.State.Status });
    res.status(200).json({
      status: containerInfo.State.Status,
      containerName,
      health: containerInfo.State.Health?.Status || 'N/A'
    });
  } catch (error) {
    logger.error('Error fetching container status', { name, error: error.message, stack: error.stack });
    let statusCode = 500;
    let errDetails = error.message;
    if (error.json && error.json.message) {
      errDetails = error.json.message;
      if (errDetails.includes('No such container')) statusCode = 404;
    } else if (error.message.includes('No such container')) {
      statusCode = 404;
    }
    res.status(statusCode).json({ error: 'Failed to fetch container status', details: errDetails });
  }
});

// Start a container
app.post('/api/containers/:name/start', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl, source, rtspUrl } = req.body;
  logger.info('Starting container', { name, source, rtspUrl, inferenceServerType });
  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;
    const container = dockerInstance.getContainer(name);
    // Verify container exists
    await container.inspect();
    await container.start();
    logger.info(`Container ${name} started successfully`);
    res.status(200).json({ message: `${name} started`, source, rtspUrl });
  } catch (error) {
    logger.error(`Error starting container ${name}`, { error: error.message, stack: error.stack });
    let statusCode = 500;
    let errDetails = error.message;
    if (error.json && error.json.message) {
      errDetails = error.json.message;
      if (errDetails.includes('No such container')) statusCode = 404;
    } else if (error.message.includes('No such container')) {
      statusCode = 404;
    } else if (error.message.includes('already running')) {
      statusCode = 304; // Not Modified
      errDetails = 'Container is already running';
    }
    res.status(statusCode).json({ error: 'Failed to start container', details: errDetails });
  }
});

// Stop a container
app.post('/api/containers/:name/stop', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl } = req.body;
  logger.info('Stopping container', { name, inferenceServerType });
  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;
    const container = dockerInstance.getContainer(name);
    await container.stop();
    logger.info(`Container ${name} stopped successfully`);
    res.status(200).json({ message: `${name} stopped` });
  } catch (error) {
    logger.error(`Error stopping container ${name}`, { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to stop container', details: error.message });
  }
});

// Container logs
app.get('/api/containers/:name/logs', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl, lines, since } = req.query;
  logger.info('Fetching container logs', { name, inferenceServerType, remoteInferenceUrl, lines, since });
  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;
    const container = dockerInstance.getContainer(name);
    const logsBuffer = await container.logs({
      follow: false, // Explicit batch mode for tail/lines
      stdout: true,
      stderr: true,
      timestamps: true,
      since: since ? parseInt(since) : 0,
      tail: lines || '142',
    });

    // Demux multiplexed Buffer (strip 8-byte headers, concat stdout/stderr)
    let output = '';
    let offset = 0;
    while (offset < logsBuffer.length) {
      const header = logsBuffer.slice(offset, offset + 8);
      const streamType = header.readUInt8(0); // 1=stdout, 2=stderr
      const size = header.readUInt32BE(4);
      const payload = logsBuffer.slice(offset + 8, offset + 8 + size).toString('utf8');
      output += payload;
      offset += 8 + size;
    }

    logger.info('Container logs fetched successfully', { name });
    res.send(output);
  } catch (error) {
    logger.error('Error fetching logs', { name, error: error.message, stack: error.stack });
    let statusCode = 500;
    let errDetails = error.message;
    if (error.json && error.json.message) {
      errDetails = error.json.message;
      if (errDetails.includes('No such container')) statusCode = 404;
    } else if (error.message.includes('No such container')) {
      statusCode = 404;
    }
    res.status(statusCode).json({ error: 'Failed to fetch logs', details: errDetails });
  }
});

// Check remote Docker
app.get('/api/check-remote-docker', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  logger.info('Checking remote Docker', { inferenceServerType, remoteInferenceUrl });
  if (inferenceServerType !== 'remote' || !remoteInferenceUrl) {
    logger.warn('Invalid remote check request', { inferenceServerType, remoteInferenceUrl });
    return res.status(400).json({ status: 'unknown', error: 'Remote inference URL required' });
  }
  try {
    const dockerInstance = getDockerInstance(inferenceServerType, remoteInferenceUrl);
    await dockerInstance.ping();
    logger.info(`Remote Docker at ${remoteInferenceUrl} is reachable`);
    res.json({ status: 'reachable' });
  } catch (error) {
    logger.error('Error checking remote Docker host', { error: error.message, stack: error.stack });
    res.status(500).json({ status: 'unreachable', error: error.message });
  }
});

// Label Studio container name
app.get('/api/labelstudio/container-name', async (req, res) => {
  logger.info('Fetching Label Studio container name');
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainer = containers.find((container) =>
      container.Names.some((name) => name.includes('label-studio'))
    );
    if (!labelStudioContainer) {
      logger.warn('No Label Studio container found');
      return res.status(404).json({ error: 'No Label Studio container found' });
    }
    const containerName = labelStudioContainer.Names[0].replace(/^\//, '');
    logger.info('Label Studio container name fetched', { containerName });
    res.status(200).json({ containerName });
  } catch (error) {
    logger.error('Error fetching Label Studio container name', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch Label Studio container name' });
  }
});

app.get('/api/jupyter/containers', async (req, res) => {
  logger.info('Fetching Jupyter containers');
  try {
    const containers = await localDocker.listContainers({ all: true });
    const jupyterContainers = containers
      .filter((container) => container.Names.some((name) => name.toLowerCase().includes('jupyter')))
      .map(container => ({
        id: container.Id,
        name: container.Names[0].replace(/^\//, '') || 'Unnamed',
        status: container.State,
      }));
    if (jupyterContainers.length === 0) {
      logger.warn('No Jupyter containers found');
      return res.status(404).json({ error: 'No Jupyter containers found' });
    }
    logger.info('Jupyter containers fetched', { count: jupyterContainers.length });
    res.status(200).json(jupyterContainers);
  } catch (error) {
    logger.error('Error fetching Jupyter containers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch Jupyter containers' });
  }
});


app.get('/api/n8n/container-name', async (req, res) => {
  logger.info('Fetching n8n container name');
  try {
    const containers = await localDocker.listContainers({ all: true });
    const n8nContainer = containers.find((container) =>
      container.Names.some((name) => name.includes('n8n'))
    );
    if (!n8nContainer) {
      logger.warn('No n8n container found');
      return res.status(404).json({ error: 'No n8n container found' });
    }
    const containerName = n8nContainer.Names[0].replace(/^\//, '');
    logger.info('n8n container name fetched', { containerName });
    res.status(200).json({ containerName });
  } catch (error) {
    logger.error('Error fetching n8n container name', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch n8n container name' });
  }
});

app.get('/api/n8n/containers', async (req, res) => {
  logger.info('Fetching n8n containers');
  try {
    const containers = await localDocker.listContainers({ all: true });
    const n8nContainers = containers
      .filter((container) => container.Names.some((name) => name.toLowerCase().includes('n8n')))
      .map(container => ({
        id: container.Id,
        name: container.Names[0].replace(/^\//, '') || 'Unnamed',
        status: container.State,
      }));
    if (n8nContainers.length === 0) {
      logger.warn('No n8n containers found');
      return res.status(404).json({ error: 'No n8n containers found' });
    }
    logger.info('n8n containers fetched', { count: n8nContainers.length });
    res.status(200).json(n8nContainers);
  } catch (error) {
    logger.error('Error fetching n8n containers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch n8n containers' });
  }
});


// Update Label Studio config
app.post('/api/labelstudio/config', async (req, res) => {
  const { enabled } = req.body;
  logger.info('Updating Label Studio config', { enabled });
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainer = containers.find((container) =>
      container.Names.some((name) => name.includes('label-studio'))
    );
    if (!labelStudioContainer) {
      logger.warn('Label Studio container not found');
      return res.status(404).json({ error: 'Label Studio container not found' });
    }
    const containerName = labelStudioContainer.Names[0].replace(/^\//, '');
    logger.info(`Found Label Studio container: ${containerName}, current state: ${labelStudioContainer.State}`);
    const container = localDocker.getContainer(labelStudioContainer.Id);
    try {
      if (enabled) {
        const containerInfo = await container.inspect();
        if (containerInfo.State.Running) {
          logger.info('Label Studio container is already running', { containerName });
          return res.status(200).json({ message: 'Label Studio is already running' });
        }
        logger.info('Starting Label Studio container', { containerName });
        await container.start();
        logger.info('Label Studio container started successfully', { containerName });
      } else {
        const containerInfo = await container.inspect();
        if (!containerInfo.State.Running) {
          logger.info('Label Studio container is already stopped', { containerName });
          return res.status(200).json({ message: 'Label Studio is already stopped' });
        }
        logger.info('Stopping Label Studio container', { containerName });
        await container.stop();
        logger.info('Label Studio container stopped successfully', { containerName });
      }
      res.status(200).json({ message: 'Label Studio config updated' });
    } catch (dockerError) {
      logger.error('Docker operation error for Label Studio', { error: dockerError.message, stack: dockerError.stack });
      if (dockerError.statusCode === 304) {
        logger.info('Label Studio state unchanged', { containerName });
        return res.status(200).json({ message: 'Label Studio state unchanged' });
      }
      throw dockerError;
    }
  } catch (error) {
    logger.error('Error updating Label Studio config', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to update Label Studio config',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Upload certificates
app.post('/api/upload-certificates', upload.fields([{ name: 'ca' }, { name: 'cert' }, { name: 'key' }]), async (req, res) => {
  logger.info('Uploading certificates');
  try {
    await fs.writeFile('/etc/docker/certs/ca.pem', req.files.ca[0].buffer);
    await fs.writeFile('/etc/docker/certs/client-cert.pem', req.files.cert[0].buffer);
    await fs.writeFile('/etc/docker/certs/client-key.pem', req.files.key[0].buffer);
    logger.info('Certificates uploaded successfully');
    res.status(200).json({ message: 'Certificates uploaded' });
  } catch (error) {
    logger.error('Error uploading certificates', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Remote metadata
app.get('/api/remote/metadata', async (req, res) => {
  debouncedInfo('Fetching remote metadata');
  res.status(200).json({ metadata: {} });
});

// Remote inference data
app.get('/api/remote/inference-data', async (req, res) => {
  debouncedInfo('Fetching remote inference data');
  res.status(200).json({ data: {} });
});

// Inference containers
app.get('/api/inference-containers', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  debouncedInfo('Fetching inference containers', { inferenceServerType, remoteInferenceUrl });
  try {
    const dockerInstance = getDockerInstance(inferenceServerType, remoteInferenceUrl);
    const containers = await dockerInstance.listContainers({ all: true });
    const inferenceContainers = containers
      .filter(container => isInferenceContainer(container.Names[0]?.replace(/^\//, '') || ''))
      .map(container => ({
        id: container.Id,
        name: container.Names[0]?.replace(/^\//, '') || 'Unnamed',
        status: container.State,
        health: container.Status.includes('healthy') ? 'healthy' : container.Status.includes('unhealthy') ? 'unhealthy' : 'N/A',
        image: container.Image,
        created: container.Created,
        isInference: true,
      }));
    logger.info('Inference containers fetched successfully', { count: inferenceContainers.length });
    res.status(200).json(inferenceContainers);
  } catch (error) {
    logger.error('Error fetching inference containers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch inference containers', details: error.message });
  }
});

// Latest audio
app.get('/api/latest-audio', async (req, res) => {
  debouncedInfo('Fetching latest audio file');
  try {
    const audioDir = '/app';
    const audioFiles = await fs.readdir(audioDir);
    if (audioFiles.length === 0) {
      debouncedWarn('No audio files found in directory', { audioDir });
      return res.status(404).json({ error: 'No audio files found' });
    }
    const latestFile = audioFiles.sort((a, b) => {
      const timeA = a.match(/speech_(\d{8}_\d{6})/)?.[1] || '';
      const timeB = b.match(/speech_(\d{8}_\d{6})/)?.[1] || '';
      return timeB.localeCompare(timeA);
    })[0];
    const url = `https://${req.headers.host}/audio/${latestFile}`;
    debouncedInfo('Latest audio file fetched', { file: latestFile, url });
    res.json({ url });
  } catch (error) {
    logger.error('Error fetching latest audio', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch latest audio' });
  }
});

app.get('/api/inference/health', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  debouncedInfo('Checking inference health', { inferenceServerType, remoteInferenceUrl });

  try {
    let targetHost = 'localhost';
    let targetPort = portInference;

    if (inferenceServerType === 'remote' && remoteInferenceUrl) {
      try {
        const urlString = remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `https://${remoteInferenceUrl}`;
        const url = new URL(urlString);
        targetHost = url.hostname;
        targetPort = url.port || portInference;
      } catch (e) {
        logger.error('Invalid remoteInferenceUrl format', { url: remoteInferenceUrl, error: e.message, stack: e.stack });
        const [hostPart] = remoteInferenceUrl.split(':');
        targetHost = hostPart || 'localhost';
      }
    }

    const healthUrl = `http://${targetHost}:${targetPort}/health`;
    const response = await fetch(healthUrl, { timeout: 5000, headers: { 'Accept': 'application/json' } });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Health check failed with status ${response.status}`, { url: healthUrl, body: errorText });
      throw new Error(`Health check failed: ${response.status} - ${errorText}`);
    }

    const healthData = await response.json();
    res.status(200).json({
      status: 'healthy',
      cameras: healthData.cameras || [{ id: 0, name: 'default' }],
      inference_server: targetHost,
      port: targetPort
    });
  } catch (error) {
    logger.error('Inference health check failed', { error: error.message, stack: error.stack, url: healthUrl });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      cameras: [],
      details: error.stack || 'No stack trace available'
    });
  }
});

app.get('/api/video/stream', (req, res) => {
  const { source, rtspUrl, inferenceServerType, remoteInferenceUrl, camera_id } = req.query;
  logger.info('Proxying HLS video stream', { source, rtspUrl, inferenceServerType, remoteInferenceUrl, camera_id });
  if (!source) {
    logger.warn('Source required for video stream');
    return res.status(400).json({ error: 'Source required' });
  }
  let targetHost = 'localhost';
  let targetPort = portInference;
  let targetProtocol = 'http';
  if (inferenceServerType === 'remote' && remoteInferenceUrl) {
    let host;
    try {
      const urlString = remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `http://${remoteInferenceUrl}`;
      const url = new URL(urlString);
      host = url.hostname;
      targetHost = host;
      targetPort = portInference;
    } catch (e) {
      logger.error('Invalid remoteInferenceUrl format', { url: remoteInferenceUrl, error: e.message, stack: e.stack });
      const [hostPart] = remoteInferenceUrl.split(':');
      targetHost = hostPart || 'localhost';
      targetPort = portInference;
    }
  }
  let targetPath = `/video/stream?source=${source}${rtspUrl ? `&rtspUrl=${encodeURIComponent(rtspUrl)}` : ''}${camera_id ? `&camera_id=${camera_id}` : ''}`;
  const targetUrl = `${targetProtocol}://${targetHost}:${targetPort}${targetPath}`;
  logger.info(`Proxying HLS stream to: ${targetUrl}`);
  const proxy = createProxyMiddleware({
    target: `${targetProtocol}://${targetHost}:${targetPort}`,
    pathRewrite: {
      '/api/video/stream': '/video/stream',
    },
    router: (req) => {
      if (req.url.includes('.ts')) {
        logger.info(`Target .ts: ${targetProtocol}://${targetHost}:${targetPort}`);
        return `${targetProtocol}://${targetHost}:${targetPort}`;
      }
      logger.info(`Target: ${targetProtocol}://${targetHost}:${targetPort}`);
      return `${targetProtocol}://${targetHost}:${targetPort}`;
    },
    changeOrigin: true,
    selfHandleResponse: true,
    timeout: 60000, // Increased timeout
    proxyTimeout: 60000,
    on: {
      proxyRes: (proxyRes, req, res) => {
        try {
          if (proxyRes.statusCode !== 200) {
            logger.warn('Non-200 response from target', {
              status: proxyRes.statusCode,
              targetUrl,
              headers: proxyRes.headers,
              timestamp: new Date().toISOString()
            });
            res.status(proxyRes.statusCode).json({
              error: 'Stream error from target',
              details: proxyRes.statusMessage || 'No details available',
              hint: 'Check remote FastAPI logs (docker logs wago-hailo-yolov5m-helmet-webcam | grep error)',
              timestamp: new Date().toISOString()
            });
            return;
          }
          let contentType = proxyRes.headers['content-type'] || (req.url.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T');
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Connection': 'keep-alive',
          });
          if (contentType === 'application/vnd.apple.mpegurl') {
            let body = '';
            proxyRes.on('data', (chunk) => { body += chunk.toString(); });
            proxyRes.on('end', () => {
              const lines = body.split('\n');
              const newLines = lines.map((line) => {
                if (line.match(/playlist\d+\.ts$/)) {
                  const params = new URLSearchParams();
                  for (const [key, value] of Object.entries(req.query)) {
                    if (key !== 't') {
                      params.set(key, value);
                    }
                  }
                  logger.debug(`Rewriting .m3u8 line: ${line} to /api/remote/video/${line}`);
                  return `/api/remote/video/${line}?${params.toString()}`;
                }
                return line;
              });
              logger.debug(`Serving rewritten .m3u8:\n${newLines.join('\n')}`);
              res.end(newLines.join('\n'));
            });
          } else {
            proxyRes.pipe(res, { end: true });
          }
        } catch (err) {
          logger.error('Error handling proxy response for stream', {
            error: err.message,
            stack: err.stack,
            targetUrl,
            timestamp: new Date().toISOString()
          });
          res.status(500).json({
            error: 'Internal proxy error',
            details: err.message,
            hint: 'Check backend logs for details',
            timestamp: new Date().toISOString()
          });
        }
      },
      error: (err, req, res) => {
        logger.error('Proxy error for HLS video stream', {
          error: err.message,
          code: err.code,
          stack: err.stack,
          targetUrl,
          query: req.query,
          headers: req.headers,
          containerIp: require('os').networkInterfaces().eth0?.[0]?.address || 'unknown',
          timestamp: new Date().toISOString()
        });
        let details = err.message;
        let status = 502;
        let hint = 'Verify FastAPI on 192.168.2.116:8042 (docker exec wago-ai-suite-backend curl http://192.168.2.116:8042/health). Check firewall on remote (firewall-cmd --list-rich-rules).';
        if (err.code === 'ECONNREFUSED') {
          details = `Connection refused to ${targetHost}:${targetPort} - Ensure FastAPI is running and port 8042 is open.`;
        } else if (err.code === 'ETIMEDOUT') {
          details = `Timeout connecting to ${targetHost}:${targetPort}. Check network latency or increase proxyTimeout.`;
          status = 504;
        } else if (err.code === 'ENOTFOUND') {
          details = `Host ${targetHost} not found - Verify DNS (nslookup 192.168.2.116).`;
        } else if (err.code === 'ECONNRESET') {
          details = `Connection reset by ${targetHost}:${targetPort} - Check FastAPI logs (docker logs wago-hailo-yolov5m-helmet-webcam).`;
        }
        res.status(status).json({
          error: 'HLS stream proxy failed',
          details,
          hint,
          errorCode: err.code,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  proxy(req, res);
});
app.get('/api/remote/video/:segment_name', (req, res) => {
  const { segment_name } = req.params;
  const { source, rtspUrl, inferenceServerType, remoteInferenceUrl, camera_id } = req.query;
  if (!inferenceServerType || !camera_id) {
    logger.warn('Missing required parameters for segment proxy', { query: req.query, timestamp: new Date().toISOString() });
    return res.status(400).json({
      error: 'Missing required query params (inferenceServerType, camera_id)',
      hint: 'Ensure browser requests include all query params from .m3u8 modification',
      timestamp: new Date().toISOString()
    });
  }
  if (!segment_name || !segment_name.match(/playlist\d+\.ts$/)) {
    logger.warn('Invalid segment name format', { segment_name, query: req.query, timestamp: new Date().toISOString() });
    return res.status(400).json({
      error: 'Invalid segment name; must be playlistN.ts',
      hint: 'Check .m3u8 playlist for correct segment names (e.g., playlist7.ts)',
      received: segment_name,
      timestamp: new Date().toISOString()
    });
  }
  let targetHost = 'localhost';
  let targetPort = portInference || 8042;
  let targetProtocol = 'http';
  if (inferenceServerType === 'remote' && remoteInferenceUrl) {
    let host;
    try {
      const urlString = remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `http://${remoteInferenceUrl}`;
      const url = new URL(urlString);
      host = url.hostname;
      targetHost = host;
      targetPort = portInference || 8042;
    } catch (e) {
      logger.error('Invalid remoteInferenceUrl format in segment', {
        url: remoteInferenceUrl,
        error: e.message,
        stack: e.stack,
        timestamp: new Date().toISOString()
      });
      const [hostPart] = remoteInferenceUrl.split(':');
      targetHost = hostPart || 'localhost';
      targetPort = portInference || 8042;
    }
  }
  let targetPath = `/video/${segment_name}`;
  const targetUrl = `${targetProtocol}://${targetHost}:${targetPort}${targetPath}`;
  logger.info(`Proxying HLS segment to: ${targetUrl}`, {
    camera_id,
    source,
    segment_name,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  const proxy = createProxyMiddleware({
    target: `${targetProtocol}://${targetHost}:${targetPort}`,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,
    on: {
      proxyRes: (proxyRes, req, res) => {
        try {
          if (proxyRes.statusCode !== 200) {
            logger.warn('Non-200 response for segment', {
              status: proxyRes.statusCode,
              targetUrl,
              headers: proxyRes.headers,
              timestamp: new Date().toISOString()
            });
            res.status(proxyRes.statusCode).json({
              error: 'Segment error from target',
              details: proxyRes.statusMessage || 'No details available',
              hint: 'Check remote FFmpeg logs (docker logs wago-hailo-yolov5m-helmet-webcam | grep FFmpeg). If 404, verify /tmp/hls_0/${segment_name} exists.',
              statusCode: proxyRes.statusCode,
              timestamp: new Date().toISOString()
            });
            return;
          }
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'video/MP2T',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Connection': 'keep-alive'
          });
          proxyRes.pipe(res, { end: true });
        } catch (err) {
          logger.error('Error handling proxy response for segment', {
            error: err.message,
            stack: err.stack,
            targetUrl,
            timestamp: new Date().toISOString()
          });
          res.status(500).json({
            error: 'Internal proxy error for segment',
            details: err.message,
            hint: 'Check backend logs for traceback; ensure remote service stability',
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
        }
      },
      error: (err, req, res) => {
        logger.error('Proxy error for HLS segment', {
          error: err.message,
          code: err.code,
          stack: err.stack,
          targetUrl,
          query: req.query,
          headers: req.headers,
          containerIp: require('os').networkInterfaces().eth0?.[0]?.address || 'unknown',
          timestamp: new Date().toISOString()
        });
        let details = err.message;
        let status = 502;
        let hint = 'Verify FastAPI on 192.168.2.116:8042 (docker exec wago-ai-suite-backend curl http://192.168.2.116:8042/health). Check firewall on remote (firewall-cmd --list-rich-rules).';
        if (err.code === 'ECONNREFUSED') {
          details = `Connection refused to ${targetHost}:${targetPort} - Ensure FastAPI is running and port 8042 is open.`;
        } else if (err.code === 'ETIMEDOUT') {
          details = `Timeout connecting to ${targetHost}:${targetPort}. Check network latency or increase proxyTimeout.`;
          status = 504;
        } else if (err.code === 'ENOTFOUND') {
          details = `Host ${targetHost} not found - Verify DNS (nslookup 192.168.2.116).`;
        } else if (err.code === 'ECONNRESET') {
          details = `Connection reset by ${targetHost}:${targetPort} - Check FastAPI logs (docker logs wago-hailo-yolov5m-helmet-webcam).`;
        }
        res.status(status).json({
          error: 'HLS segment proxy failed',
          details,
          hint,
          errorCode: err.code,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  try {
    proxy(req, res);
  } catch (proxyErr) {
    logger.error('Unexpected proxy initialization error', {
      error: proxyErr.message,
      stack: proxyErr.stack,
      targetUrl,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      error: 'Unexpected proxy initialization error',
      details: proxyErr.message,
      hint: 'Check backend configuration and restart service',
      timestamp: new Date().toISOString()
    });
  }
});
// Start HTTP server
app.listen(port, () => {
  logger.info(`HTTP server running on port ${port}`);
});

// Start HTTPS server (fallback if certs fail)
try {
  const options = {
    key: fsp.readFileSync('/app/ssl/backend-selfsigned.key'),
    cert: fsp.readFileSync('/app/ssl/backend-selfsigned.crt'),
  };
  https.createServer(options, app).listen(httpsPort, () => {
    logger.info(`HTTPS server running on port ${httpsPort}`);
  });
} catch (error) {
  logger.error('Failed to start HTTPS server due to certificate issues', { error: error.message, stack: error.stack });
  logger.info('Continuing with HTTP server only');
}

module.exports = app;