const express = require('express');
const https = require('https');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require('fs').promises;
const fsp = require('fs');
const path = require('path');
const Docker = require('dockerode');
const port = process.env.PORT || 3042;
const { spawn } = require('child_process');
const app = express();

// Define local Docker instance
const localDocker = new Docker({ socketPath: '/var/run/docker.sock' });

// Define Docker connections for inference use case
const dockerConnections = {
  local: localDocker,
  remote: (host, port) => {
    console.log(`Creating remote Docker instance for ${host}:${port}`);
    return new Docker({
      host,
      port,
      ca: fsp.readFileSync('/etc/docker/certs/ca.pem'),
      cert: fsp.readFileSync('/etc/docker/certs/client-cert.pem'),
      key: fsp.readFileSync('/etc/docker/certs/client-key.pem'),
      protocol: 'https',
    });
  },
};

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Parse JSON bodies
app.use(express.json());

// Helper function to select Docker instance
const getDockerInstance = (type, remoteInferenceUrl) => {
  if (type === 'remote' && remoteInferenceUrl) {
    let host, port;
    try {
      const urlString = remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `https://${remoteInferenceUrl}`;
      const url = new URL(urlString);
      host = url.hostname;
      port = url.port || 2376;
    } catch (e) {
      console.error('Invalid remoteInferenceUrl format:', remoteInferenceUrl, e.message);
      const [hostPart, portPart] = remoteInferenceUrl.split(':');
      host = hostPart;
      port = portPart || 2376;
    }
    console.log(`Using remote Docker instance: host=${host}, port=${port}`);
    return dockerConnections.remote(host, port);
  }
  return dockerConnections.local;
};

// Function to identify inference containers
const isInferenceContainer = (name) => /wago-hailo/.test(name);

// Send email function
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

  await transporter.sendMail({
    from: '"WAGO Inquiry" <no-reply@wago.com>',
    to,
    subject,
    text,
  });
}

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, type } = req.body;
  if (!name || !email || !subject || !message || !type) {
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
      return res.status(400).json({ error: 'Invalid inquiry type' });
  }
  try {
    await sendEmail(recipient, subject, `From: ${name} <${email}>\n\n${message}`);
    res.status(200).json({ message: 'Inquiry sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

// Start a container
app.post('/api/containers/:name/start', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl, source, rtspUrl } = req.body;
  console.log(`Starting container: ${name} with source: ${source}, rtspUrl: ${rtspUrl || 'N/A'}`);

  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const container = dockerInstance.getContainer(name);
    await container.start();
    console.log(`Container ${name} started successfully`);
    res.status(200).json({ message: `${name} started`, source, rtspUrl });
  } catch (error) {
    console.error(`Error starting container ${name}:`, error.stack);
    res.status(500).json({ error: 'Failed to start container', details: error.message });
  }
});

// Stop a container
app.post('/api/containers/:name/stop', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl } = req.body;
  console.log(`Stopping container: ${name}`);

  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const container = dockerInstance.getContainer(name);
    await container.stop();
    console.log(`Container ${name} stopped successfully`);
    res.status(200).json({ message: `${name} stopped` });
  } catch (error) {
    console.error(`Error stopping container ${name}:`, error.stack);
    res.status(500).json({ error: 'Failed to stop container', details: error.message });
  }
});
const previousStatuses = new Map();

app.get('/api/containers/:name/status', async (req, res) => {
  const { name } = req.params;
  let { inferenceServerType, remoteInferenceUrl } = req.query;

  // Default to 'local' if inferenceServerType is not provided
  inferenceServerType = inferenceServerType || 'local';

  console.log(`Fetching status for container: ${name} with type: ${inferenceServerType}, url: ${remoteInferenceUrl || 'N/A'}`);

  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const container = dockerInstance.getContainer(name);
    const data = await container.inspect();
    const currentStatus = data.State.Status;

    // Check previous status and log only on first check or status change
    const previousStatus = previousStatuses.get(name);
    if (previousStatus === undefined) {
      console.log(`Container ${name} status: ${currentStatus} (first check)`);
    } else if (currentStatus !== previousStatus) {
      console.log(`Container ${name} status changed from ${previousStatus} to ${currentStatus}`);
    }
    // Update the Map with the current status
    previousStatuses.set(name, currentStatus);

    res.status(200).json({
      running: data.State.Running,
      status: currentStatus,
      containerName: data.Name.replace(/^\//, ''),
    });
  } catch (error) {
    console.error(`Error fetching status for container ${name}:`, error.stack);
    if (error.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch container status', details: error.message });
    }
  }
});

// Get container logs
app.get('/api/containers/:name/logs', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl, lines = 20 } = req.query;
  console.log(`Fetching logs for container: ${name}, lines: ${lines}`);

  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const container = dockerInstance.getContainer(name);
    await container.inspect().catch((err) => {
      if (err.statusCode === 404) throw new Error('Container not found');
      throw err;
    });
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: parseInt(lines),
    });
    console.log(`Logs fetched for container ${name}`);
    res.status(200).send(logs.toString('utf8').trim() || 'No logs available');
  } catch (error) {
    console.error(`Error fetching logs for container ${name}:`, error.stack);
    if (error.message === 'Container not found') {
      res.status(404).json({ error: 'Container not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
    }
  }
});

// Get detailed information about all containers
app.get('/api/containers', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  console.log(`Fetching all containers with type: ${inferenceServerType}, url: ${remoteInferenceUrl || 'N/A'}`);

  try {
    const dockerInstance = inferenceServerType
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    const detailedContainers = await Promise.all(
      containers.map(async (containerInfo) => {
        const container = dockerInstance.getContainer(containerInfo.Id);
        const details = await container.inspect();
        return {
          id: details.Id,
          name: details.Name.replace(/^\//, ''),
          status: details.State.Status,
        };
      })
    );
    console.log('Containers fetched:', detailedContainers);
    res.json(detailedContainers);
  } catch (error) {
    console.error('Error fetching containers:', error.stack);
    res.status(500).json({ error: 'Failed to fetch containers', details: error.message });
  }
});

// Start a container and stop the other if running
app.post('/api/containers/:name/start-exclusive', async (req, res) => {
  const { name } = req.params;
  const { inferenceServerType, remoteInferenceUrl } = req.body;
  const otherContainerName = name === 'wago-hailo-webcam' ? 'wago-hailo-rtsp' : 'wago-hailo-webcam';
  console.log(`Starting container exclusively: ${name}, stopping: ${otherContainerName}`);

  try {
    const dockerInstance = isInferenceContainer(name)
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const otherContainer = dockerInstance.getContainer(otherContainerName);
    const otherStatus = await otherContainer.inspect().catch(() => ({ State: { Running: false } }));
    if (otherStatus.State.Running) {
      await otherContainer.stop();
      console.log(`${otherContainerName} stopped`);
    }

    const container = dockerInstance.getContainer(name);
    await container.start();
    console.log(`${name} started exclusively`);
    res.status(200).json({ message: `${name} started` });
  } catch (error) {
    console.error(`Error in start-exclusive for ${name}:`, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Fetch inference containers
app.get('/api/inference-containers', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;
  console.log(`Fetching inference containers with type: ${inferenceServerType}, url: ${remoteInferenceUrl || 'N/A'}`);

  try {
    const dockerInstance = inferenceServerType === 'remote'
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    const inferenceContainers = containers.filter(container =>
      container.Names.some(name => /wago-hailo/.test(name))
    ).map(container => ({
      id: container.Id,
      name: container.Names[0].replace(/^\//, ''),
      status: container.State,
    }));
    console.log('Inference containers fetched:', inferenceContainers);
    res.json(inferenceContainers);
  } catch (error) {
    console.error('Error fetching inference containers:', error.stack);
    res.status(500).json({ error: 'Failed to fetch inference containers', details: error.message });
  }
});

// Start a container dynamically based on source
app.post('/api/containers/start', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl, source } = req.body;
  const pattern = source === 'webcam' ? /wago-hailo.*webcam/ : /wago-hailo.*rtsp/;
  console.log(`Starting container for source: ${source}, pattern: ${pattern}`);

  try {
    const dockerInstance = inferenceServerType === 'remote'
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    console.log('Available containers:', containers.map(c => ({ name: c.Names[0], state: c.State })));
    const matchingContainer = containers.find(container =>
      container.Names.some(name => pattern.test(name))
    );

    if (!matchingContainer) {
      console.log(`No container found for source: ${source}`);
      return res.status(404).json({ error: `No container found for source: ${source}` });
    }

    const container = dockerInstance.getContainer(matchingContainer.Id);
    const inspect = await container.inspect();
    if (!inspect.State.Running) {
      console.log(`Starting stopped container: ${matchingContainer.Names[0]}`);
      await container.start();
    } else {
      console.log(`Container already running: ${matchingContainer.Names[0]}`);
    }
    res.status(200).json({ 
      message: `Container for ${source} started`, 
      containerId: matchingContainer.Id,
      containerName: matchingContainer.Names[0].replace(/^\//, ''),
    });
  } catch (error) {
    console.error(`Error starting container for ${source}:`, error.stack);
    res.status(500).json({ error: 'Failed to start container', details: error.message });
  }
});

// Stop a container dynamically based on source
app.post('/api/containers/stop', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl, source } = req.body;
  const pattern = source === 'webcam' ? /wago-hailo.*webcam/ : /wago-hailo.*rtsp/;
  console.log(`Stopping container for source: ${source}, pattern: ${pattern}`);

  try {
    const dockerInstance = inferenceServerType === 'remote'
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    console.log('Available containers:', containers.map(c => ({ name: c.Names[0], state: c.State })));
    const matchingContainer = containers.find(container =>
      container.Names.some(name => pattern.test(name))
    );

    if (!matchingContainer) {
      console.log(`No container found for source: ${source}`);
      return res.status(404).json({ error: `No container found for source: ${source}` });
    }

    const container = dockerInstance.getContainer(matchingContainer.Id);
    const inspect = await container.inspect();
    if (inspect.State.Running) {
      console.log(`Stopping running container: ${matchingContainer.Names[0]}`);
      await container.stop();
    } else {
      console.log(`Container already stopped: ${matchingContainer.Names[0]}`);
    }
    res.status(200).json({ 
      message: `Container for ${source} stopped`, 
      containerId: matchingContainer.Id,
      containerName: matchingContainer.Names[0].replace(/^\//, ''),
    });
  } catch (error) {
    console.error(`Error stopping container for ${source}:`, error.stack);
    res.status(500).json({ error: 'Failed to stop container', details: error.message });
  }
});

// Get container status dynamically
app.get('/api/containers/status', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl, source } = req.query;
  const pattern = source === 'webcam' ? /wago-hailo.*webcam/ : /wago-hailo.*rtsp/;
  console.log(`Fetching status for source: ${source}, pattern: ${pattern}`);

  try {
    const dockerInstance = inferenceServerType === 'remote'
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    console.log('Available containers:', containers.map(c => ({ name: c.Names[0], state: c.State })));
    const matchingContainer = containers.find(container =>
      container.Names.some(name => pattern.test(name))
    );

    if (!matchingContainer) {
      console.log(`No container found for source: ${source}`);
      return res.status(404).json({ error: `No container found for source: ${source}` });
    }

    const container = dockerInstance.getContainer(matchingContainer.Id);
    const data = await container.inspect();
    console.log(`Container status for ${matchingContainer.Names[0]}: ${data.State.Status}`);
    res.status(200).json({
      running: data.State.Running,
      status: data.State.Status,
      containerId: matchingContainer.Id,
      containerName: matchingContainer.Names[0].replace(/^\//, ''),
    });
  } catch (error) {
    console.error(`Error fetching status for source ${source}:`, error.stack);
    res.status(500).json({ error: 'Failed to fetch container status', details: error.message });
  }
});

// Get container logs dynamically
app.get('/api/containers/logs', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl, source, lines = 200, since } = req.query;
  const pattern = source === 'webcam' ? /wago-hailo.*webcam/ : /wago-hailo.*rtsp/;
  console.log(`Fetching logs for source: ${source}, lines: ${lines}, since: ${since || 'N/A'}`);

  try {
    const dockerInstance = inferenceServerType === 'remote'
      ? getDockerInstance(inferenceServerType, remoteInferenceUrl)
      : localDocker;

    const containers = await dockerInstance.listContainers({ all: true });
    console.log('Available containers:', containers.map(c => ({ name: c.Names[0], state: c.State })));
    const matchingContainer = containers.find(container =>
      container.Names.some(name => pattern.test(name))
    );

    if (!matchingContainer) {
      console.log(`No container found for source: ${source}`);
      return res.status(404).json({ error: `No container found for source: ${source}` });
    }

    const container = dockerInstance.getContainer(matchingContainer.Id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: parseInt(lines),
      since: since ? parseInt(since) : 0,
    });
    console.log(`Logs fetched for ${matchingContainer.Names[0]}`);
    res.status(200).send(logs.toString('utf8').trim() || 'No logs available');
  } catch (error) {
    console.error(`Error fetching logs for source ${source}:`, error.stack);
    res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
  }
});

// Certificate upload endpoint
app.post('/api/upload-certificates', upload.fields([
  { name: 'ca', maxCount: 1 },
  { name: 'cert', maxCount: 1 },
  { name: 'key', maxCount: 1 },
]), async (req, res) => {
  const { ca, cert, key } = req.files;
  console.log('Uploading certificates...');
  try {
    if (!ca || !cert || !key) {
      console.log('Missing certificate files');
      return res.status(400).json({ error: 'All certificate files (ca, cert, key) are required' });
    }
    await fs.writeFile('/etc/docker/certs/ca.pem', ca[0].buffer);
    await fs.writeFile('/etc/docker/certs/client-cert.pem', cert[0].buffer);
    await fs.writeFile('/etc/docker/certs/client-key.pem', key[0].buffer);
    console.log('Certificates uploaded successfully');
    res.status(200).json({ message: 'Certificates uploaded successfully' });
  } catch (error) {
    console.error('Error uploading certificates:', error.stack);
    res.status(500).json({ error: 'Failed to upload certificates', details: error.message });
  }
});

// Helper function to select the best Label Studio container
const selectBestLabelStudioContainer = (containers) => {
  // Sort containers by priority:
  // 1. Running containers first
  // 2. Containers with "wago" in the name
  // 3. Recently created containers
  
  const sorted = containers.sort((a, b) => {
    // First priority: running state
    const aRunning = a.State === 'running' ? 1 : 0;
    const bRunning = b.State === 'running' ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;
    
    // Second priority: has "wago" in name
    const aWago = a.Names.some(n => n.toLowerCase().includes('wago')) ? 1 : 0;
    const bWago = b.Names.some(n => n.toLowerCase().includes('wago')) ? 1 : 0;
    if (aWago !== bWago) return bWago - aWago;
    
    // Third priority: creation time (newer first)
    return b.Created - a.Created;
  });
  
  return sorted[0];
};

// Get Label Studio container name with smart selection
app.get('/api/labelstudio/container-name', async (req, res) => {
  console.log('[LabelStudio] Fetching container name...');
  
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainers = containers.filter((container) =>
      container.Names.some((name) => name.toLowerCase().includes('label-studio') || name.toLowerCase().includes('labelstudio'))
    );
    
    if (labelStudioContainers.length === 0) {
      console.log('[LabelStudio] No Label Studio container found');
      return res.status(404).json({ 
        error: 'No Label Studio container found',
        hint: 'Please ensure Label Studio container is installed'
      });
    }
    
    // Analyze the containers
    const containerStats = {
      total: labelStudioContainers.length,
      running: labelStudioContainers.filter(c => c.State === 'running').length,
      stopped: labelStudioContainers.filter(c => c.State === 'exited').length,
      other: labelStudioContainers.filter(c => c.State !== 'running' && c.State !== 'exited').length
    };
    
    console.log('[LabelStudio] Container statistics:', containerStats);
    
    // Select the best container
    const selectedContainer = selectBestLabelStudioContainer(labelStudioContainers);
    const containerName = selectedContainer.Names[0].replace(/^\//, '');
    
    console.log(`[LabelStudio] Selected container: ${containerName} (state: ${selectedContainer.State})`);
    
    // Prepare response
    const response = {
      containerName,
      containerState: selectedContainer.State,
      containerStats
    };
    
    // Add hint if multiple containers found
    if (labelStudioContainers.length > 1) {
      response.hint = `Found ${containerStats.total} Label Studio containers: ${containerStats.running} running, ${containerStats.stopped} stopped${containerStats.other > 0 ? `, ${containerStats.other} other` : ''}. Using ${containerName}.`;
      console.log('[LabelStudio] Multiple containers hint:', response.hint);
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[LabelStudio] Error fetching container name:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Label Studio container name',
      details: error.message
    });
  }
});

// Update Label Studio configuration with smart selection
app.post('/api/labelstudio/config', async (req, res) => {
  const { enabled } = req.body;
  console.log(`[LabelStudio] Config update requested: enabled=${enabled}`);
  
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainers = containers.filter((container) =>
      container.Names.some((name) => name.toLowerCase().includes('label-studio') || name.toLowerCase().includes('labelstudio'))
    );
    
    if (labelStudioContainers.length === 0) {
      console.error('[LabelStudio] No Label Studio container found');
      return res.status(404).json({ 
        error: 'No Label Studio container found',
        hint: 'Please ensure Label Studio container is installed'
      });
    }
    
    // Select the best container
    const selectedContainer = selectBestLabelStudioContainer(labelStudioContainers);
    const containerName = selectedContainer.Names[0].replace(/^\//, '');
    const containerId = selectedContainer.Id;
    
    console.log(`[LabelStudio] Selected container for operation: ${containerName} (${containerId})`);
    
    // If enabling and there's already a running container that's not the selected one, stop it
    if (enabled) {
      const runningContainers = labelStudioContainers.filter(c => c.State === 'running' && c.Id !== containerId);
      if (runningContainers.length > 0) {
        console.log(`[LabelStudio] Stopping ${runningContainers.length} other running Label Studio container(s)`);
        for (const running of runningContainers) {
          try {
            const container = localDocker.getContainer(running.Id);
            await container.stop();
            console.log(`[LabelStudio] Stopped container: ${running.Names[0]}`);
          } catch (err) {
            console.warn(`[LabelStudio] Failed to stop container ${running.Names[0]}:`, err.message);
          }
        }
      }
    }
    
    const container = localDocker.getContainer(containerId);

    try {
      const inspection = await container.inspect();
      const isRunning = inspection.State.Running;
      
      let message = '';
      if (enabled && !isRunning) {
        await container.start();
        message = `Started Label Studio container: ${containerName}`;
      } else if (!enabled && isRunning) {
        await container.stop();
        message = `Stopped Label Studio container: ${containerName}`;
      } else {
        message = `Label Studio container ${containerName} already ${enabled ? 'running' : 'stopped'}`;
      }
      
      // Prepare response
      const response = {
        message,
        containerName,
        enabled
      };
      
      // Add container stats if multiple found
      if (labelStudioContainers.length > 1) {
        response.containerStats = {
          total: labelStudioContainers.length,
          managed: containerName
        };
        response.hint = `Managing ${containerName} out of ${labelStudioContainers.length} Label Studio containers found`;
      }
      
      res.status(200).json(response);
    } catch (dockerError) {
      if (dockerError.statusCode === 304) {
        return res.status(200).json({ 
          message: `Label Studio container ${containerName} already ${enabled ? 'running' : 'stopped'}`,
          containerName,
          enabled 
        });
      }
      throw dockerError;
    }
  } catch (error) {
    console.error('[LabelStudio] Error updating config:', error);
    res.status(500).json({ 
      error: 'Failed to update Label Studio config',
      details: error.message
    });
  }
});
// Get Grafana container name
app.get('/api/grafana/container-name', async (req, res) => {
  const containerSuffix = 'oGenericAnalytics_grafana';
  try {
    const containers = await localDocker.listContainers({ all: true });
    const matchingContainers = containers.filter((container) =>
      container.Names.some((name) => name.endsWith(containerSuffix))
    );
    if (matchingContainers.length === 0) {
      return res.status(404).json({ error: 'No Grafana container found' });
    }
    if (matchingContainers.length > 1) {
      return res.status(500).json({ error: 'Multiple Grafana containers found' });
    }
    const containerName = matchingContainers[0].Names[0].replace(/^\//, '');
    res.status(200).json({ containerName });
  } catch (error) {
    console.error('Error fetching Grafana container name:', error);
    res.status(500).json({ error: 'Failed to fetch Grafana container name' });
  }
});

// Update Grafana configuration
app.post('/api/grafana/config', async (req, res) => {
  const { enabled } = req.body;
  const configPath = '/etc/grafana/grafana.ini';
  const containerSuffix = 'oGenericAnalytics_grafana';

  try {
    const containers = await localDocker.listContainers({ all: true });
    const matchingContainers = containers.filter((container) =>
      container.Names.some((name) => name.includes(containerSuffix))
    );
    if (matchingContainers.length !== 1) {
      throw new Error(`Expected 1 Grafana container, found ${matchingContainers.length}`);
    }
    const containerInfo = matchingContainers[0];
    const container = localDocker.getContainer(containerInfo.Id);
    const data = await container.inspect();
    if (!data.State.Running) {
      await container.start();
      console.log(`Started container ${containerInfo.Names[0]}`);
    }
    const configContent = enabled
      ? `
[auth.basic]
enabled = true
[security]
allow_embedding = true
[server]
http_port = 3000
root_url = https://%(domain)s/grafana/
[users]
default_theme = light
[log]
level = debug
[live]
enabled = true
      `.trim()
      : `
[auth.basic]
enabled = true
[security]
allow_embedding = false
[server]
http_port = 3000
      `.trim();
    const exec = await container.exec({
      Cmd: ['sh', '-c', `echo "${configContent}" > ${configPath}`],
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await exec.start({ Detach: false });
    let output = '';
    stream.on('data', (data) => (output += data.toString()));
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    const execInfo = await exec.inspect();
    if (execInfo.ExitCode !== 0) {
      throw new Error(`Config update failed. Exit code: ${execInfo.ExitCode}. Output: ${output}`);
    }
    await container.restart();
    console.log(`Restarted container ${containerInfo.Names[0]}`);
    res.status(200).json({ message: 'Grafana config updated' });
  } catch (error) {
    console.error('Error updating Grafana config:', error.message);
    res.status(500).json({ error: `Failed to update Grafana config: ${error.message}` });
  }
});

// Get Node-RED container name
app.get('/api/nodered/container-name', async (req, res) => {
  const containerSuffix = 'oGenericAnalytics_nodered';
  try {
    const containers = await localDocker.listContainers({ all: true });
    const matchingContainers = containers.filter((container) =>
      container.Names.some((name) => name.includes(containerSuffix))
    );
    if (matchingContainers.length === 0) {
      return res.status(404).json({ error: 'No Node-RED container found' });
    }
    if (matchingContainers.length > 1) {
      return res.status(500).json({ error: 'Multiple Node-RED containers found' });
    }
    const containerName = matchingContainers[0].Names[0].replace(/^\//, '');
    res.status(200).json({ containerName });
  } catch (error) {
    console.error('Error fetching Node-RED container name:', error);
    res.status(500).json({ error: 'Failed to fetch Node-RED container name' });
  }
});

// Update Node-RED configuration (start/stop container)
app.post('/api/nodered/config', async (req, res) => {
  const { enabled } = req.body;
  const containerSuffix = 'oGenericAnalytics_nodered';
  try {
    const containers = await localDocker.listContainers({ all: true });
    const matchingContainers = containers.filter((container) =>
      container.Names.some((name) => name.includes(containerSuffix))
    );
    if (matchingContainers.length !== 1) {
      throw new Error(`Expected 1 Node-RED container, found ${matchingContainers.length}`);
    }
    const containerName = matchingContainers[0].Names[0].replace(/^\//, '');
    const container = localDocker.getContainer(containerName);

    if (enabled) {
      await container.start();
    } else {
      await container.stop();
    }
    res.status(200).json({ message: 'Node-RED config updated' });
  } catch (error) {
    console.error('Error updating Node-RED config:', error);
    res.status(500).json({ error: 'Failed to update Node-RED config' });
  }
});

app.get('/api/n8n/container-name', async (req, res) => {
  try {
    const containers = await localDocker.listContainers({ all: true });
    const n8nContainer = containers.find((container) =>
      container.Names.some((name) => name === '/x-n8n')
    );
    if (!n8nContainer) {
      return res.status(404).json({ error: 'No primary n8n container found' });
    }
    const containerName = n8nContainer.Names[0].replace(/^\//, '');
    res.status(200).json({ containerName });
  } catch (error) {
    console.error('Error fetching n8n container name:', error);
    res.status(500).json({ error: 'Failed to fetch n8n container name' });
  }
});

app.post('/api/n8n/config', async (req, res) => {
  const { enabled } = req.body;
  try {
    const containers = await localDocker.listContainers({ all: true });
    const n8nContainer = containers.find((container) =>
      container.Names.some((name) => name === '/x-n8n')
    );
    if (!n8nContainer) {
      throw new Error('Primary n8n container not found');
    }
    const containerName = n8nContainer.Names[0].replace(/^\//, '');
    const container = localDocker.getContainer(containerName);

    if (enabled) {
      await container.start();
    } else {
      await container.stop();
    }
    res.status(200).json({ message: 'n8n config updated' });
  } catch (error) {
    console.error('Error updating n8n config:', error);
    res.status(500).json({ error: 'Failed to update n8n config' });
  }
});

// Video stream endpoint with error handling
app.get('/api/video/stream', (req, res) => {
  const { source, rtspUrl } = req.query;
  let ffmpegCmd;

  console.log(`Starting video stream for source: ${source}, rtspUrl: ${rtspUrl || 'N/A'}`);

  try {
    if (source === 'rtsp') {
      if (!rtspUrl) {
        console.log('RTSP URL missing');
        return res.status(400).send('RTSP URL is required');
      }
      ffmpegCmd = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov',
        '-reset_timestamps', '1',
        'pipe:1'
      ]);
    } else if (source === 'webcam') {
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      });
      ffmpegCmd = spawn('ffmpeg', [
        '-f', 'v4l2',              // Video4Linux2 input format
        '-framerate', '30',        // 30 FPS
        '-video_size', '640x640',  // Match FRAME_WIDTH and FRAME_HEIGHT
        '-i', '/dev/video0',       // Webcam device (WEBCAM_INDEX: 0)
        '-f', 'mjpeg',             // Output as MJPEG
        'pipe:1',                  // Pipe output to stdout
      ]);
      ffmpegCmd.stdout.on('data', (data) => {
        res.write('--frame\r\n');
        res.write('Content-Type: image/jpeg\r\n');
        res.write(`Content-Length: ${data.length}\r\n\r\n`);
        res.write(data);
      });
    } else {
      console.log('Invalid source specified');
      return res.status(400).send('Invalid source');
    }

    ffmpegCmd.on('error', (err) => {
      console.error('FFmpeg spawn error:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to start video stream: FFmpeg unavailable');
      }
    });

    ffmpegCmd.stdout.pipe(res);

    ffmpegCmd.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpegCmd.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      if (!res.writableEnded) {
        res.end();
      }
    });
  } catch (error) {
    console.error('Error in video stream:', error.stack);
    if (!res.headersSent) {
      res.status(500).send('Video streaming error');
    }
  }
});

// Get latest audio file
app.get('/api/latest-audio', async (req, res) => {
  try {
    const audioDir = '/app/audio';
    console.log('Reading directory:', audioDir);
    const files = await fs.readdir(audioDir);
    console.log('Files found:', files);
    const audioFiles = files.filter((file) => file.endsWith('.mp3'));
    console.log('Filtered .mp3 files:', audioFiles);
    if (audioFiles.length === 0) {
      console.log('No .mp3 files found');
      return res.status(404).json({ error: 'No audio files found' });
    }
    const latestFile = audioFiles.sort((a, b) => {
      const timeA = a.match(/speech_(\d{8}_\d{6})/)?.[1] || '';
      const timeB = b.match(/speech_(\d{8}_\d{6})/)?.[1] || '';
      return timeB.localeCompare(timeA);
    })[0];
    console.log('Latest file:', latestFile);
    const url = `https://${req.headers.host}/audio/${latestFile}`;
    console.log('Returning URL:', url);
    res.json({ url });
  } catch (error) {
    console.error('Error fetching latest audio:', error);
    res.status(500).json({ error: 'Failed to fetch latest audio' });
  }
});

// Check remote Docker host accessibility
app.get('/api/check-remote-docker', async (req, res) => {
  const { inferenceServerType, remoteInferenceUrl } = req.query;

  if (inferenceServerType !== 'remote' || !remoteInferenceUrl) {
    console.log('Invalid remote check request:', { inferenceServerType, remoteInferenceUrl });
    return res.status(400).json({ status: 'unknown', error: 'Remote inference URL required' });
  }

  try {
    console.log(`Checking remote Docker at ${remoteInferenceUrl}`);
    const dockerInstance = getDockerInstance(inferenceServerType, remoteInferenceUrl);
    await dockerInstance.ping();
    console.log(`Remote Docker at ${remoteInferenceUrl} is reachable`);
    res.json({ status: 'reachable' });
  } catch (error) {
    console.error('Error checking remote Docker host:', error.stack);
    res.status(500).json({ status: 'unreachable', error: error.message });
  }
});

app.get('/api/labelstudio/container-name', async (req, res) => {
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainer = containers.find((container) =>
      container.Names.some((name) => name.includes('label-studio'))
    );
    if (!labelStudioContainer) {
      return res.status(404).json({ error: 'No Label Studio container found' });
    }
    const containerName = labelStudioContainer.Names[0].replace(/^\//, '');
    res.status(200).json({ containerName });
  } catch (error) {
    console.error('Error fetching Label Studio container name:', error);
    res.status(500).json({ error: 'Failed to fetch Label Studio container name' });
  }
});
// Update Label Studio configuration (start/stop container)
app.post('/api/labelstudio/config', async (req, res) => {
  const { enabled } = req.body;
  try {
    const containers = await localDocker.listContainers({ all: true });
    const labelStudioContainer = containers.find((container) =>
      container.Names.some((name) => name.includes('label-studio'))
    );
    
    if (!labelStudioContainer) {
      console.error('Label Studio container not found');
      return res.status(404).json({ error: 'Label Studio container not found' });
    }
    
    const containerName = labelStudioContainer.Names[0].replace(/^\//, '');
    console.log(`Found Label Studio container: ${containerName}, current state: ${labelStudioContainer.State}`);
    
    const container = localDocker.getContainer(labelStudioContainer.Id);

    try {
      if (enabled) {
        // Check if container is already running
        const containerInfo = await container.inspect();
        if (containerInfo.State.Running) {
          console.log('Label Studio container is already running');
          return res.status(200).json({ message: 'Label Studio is already running' });
        }
        
        console.log('Starting Label Studio container...');
        await container.start();
        console.log('Label Studio container started successfully');
      } else {
        // Check if container is already stopped
        const containerInfo = await container.inspect();
        if (!containerInfo.State.Running) {
          console.log('Label Studio container is already stopped');
          return res.status(200).json({ message: 'Label Studio is already stopped' });
        }
        
        console.log('Stopping Label Studio container...');
        await container.stop();
        console.log('Label Studio container stopped successfully');
      }
      res.status(200).json({ message: 'Label Studio config updated' });
    } catch (dockerError) {
      console.error('Docker operation error:', dockerError);
      
      // Check if it's a "container already started/stopped" error
      if (dockerError.statusCode === 304) {
        return res.status(200).json({ message: 'Label Studio state unchanged' });
      }
      
      throw dockerError;
    }
  } catch (error) {
    console.error('Error updating Label Studio config:', error);
    res.status(500).json({ 
      error: 'Failed to update Label Studio config', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Load self-signed certificates for the server
const options = {
  key: fsp.readFileSync('/app/ssl/backend-selfsigned.key'),
  cert: fsp.readFileSync('/app/ssl/backend-selfsigned.crt'),
};

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;