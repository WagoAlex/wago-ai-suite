import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import axios from 'axios';

// URL for JupyterLab, aligned with nginx.conf.template
const jupyterUrl = '/jupyter/lab';

function Model() {
  // State for toggling JupyterLab
  const [isJupyterEnabled, setIsJupyterEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isJupyterEnabled');
      return savedState ? JSON.parse(savedState) : false;
    } catch (e) {
      console.error('Failed to parse isJupyterEnabled from localStorage:', e);
      return false;
    }
  });

  // State for container information
  const [jupyterContainerName, setJupyterContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [containerHint, setContainerHint] = useState(null);
  const [jupyterContainers, setJupyterContainers] = useState([]); // List of Jupyter containers
  const [selectedContainerReason, setSelectedContainerReason] = useState(''); // Reason for selected container

  // Persist enabled state to localStorage
  useEffect(() => {
    localStorage.setItem('isJupyterEnabled', JSON.stringify(isJupyterEnabled));
  }, [isJupyterEnabled]);

  // Fetch Jupyter container info and status
  const fetchContainerInfo = async () => {
    try {
      // Fetch list of Jupyter containers from dedicated endpoint
      const response = await axios.get('/api/jupyter/containers');
      const containers = response.data;
      setJupyterContainers(containers);

      if (containers.length === 0) {
        setErrorMessage('No Jupyter containers found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab" is running.');
        setJupyterContainerName(null);
        setContainerStatus('unknown');
        setSelectedContainerReason('No containers with "jupyter" in the name were detected.');
        return;
      }

      // Select the first running container
      const targetContainer = containers.find(c => c.status === 'running') || containers[0];
      setJupyterContainerName(targetContainer.name);
      setContainerStatus(targetContainer.status);

      // Set tooltip reason for selection
      const reason = containers.length > 1
        ? `Selected ${targetContainer.name} (${targetContainer.status}) from ${containers.length} Jupyter containers. Reason: First running container found.`
        : `Selected ${targetContainer.name} (${targetContainer.status}), the only Jupyter container found.`;
      setSelectedContainerReason(reason);

      // Clear errors if container is running
      if (targetContainer.status === 'running') {
        setErrorMessage(null);
        setContainerHint(null);
      } else {
        setContainerHint(`Container ${targetContainer.name} is ${targetContainer.status}. Ensure it is running to access JupyterLab.`);
      }
    } catch (error) {
      console.error('Error fetching Jupyter container info:', error);
      setErrorMessage(error.response?.data?.error || 'No Jupyter container found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab" is running.');
      setJupyterContainerName(null);
      setContainerStatus('unknown');
      setSelectedContainerReason('Error fetching container information.');
    }
  };

  // Poll container info every 5 seconds
  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle toggle for enabling/disabling Jupyter
  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsJupyterEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);

    try {
      // Update backend configuration (assumes /api/jupyter/config endpoint from index.js)
      const response = await axios.post('/api/jupyter/config', { enabled });
      console.log('Jupyter config updated:', response.data);

      if (response.data.hint) {
        setContainerHint(response.data.hint);
      }

      // Wait for container status update
      if (enabled) {
        setTimeout(fetchContainerInfo, 3000);
      } else {
        await fetchContainerInfo();
      }
    } catch (error) {
      console.error('Error updating Jupyter config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update Jupyter configuration');
      setIsJupyterEnabled(!enabled); // Revert on failure
    } finally {
      setIsUpdating(false);
    }
  };

  // Get LED color based on container status
  const getLedColor = () => {
    switch (containerStatus) {
      case 'running': return 'green';
      case 'restarting': return 'yellow';
      case 'created':
      case 'exited':
      case 'dead': return 'red';
      default: return 'yellow';
    }
  };

  // Get status chip for display
  const getStatusChip = () => {
    const color = containerStatus === 'running' ? 'success' :
                  containerStatus === 'restarting' ? 'warning' : 'error';
    return (
      <Chip
        label={containerStatus.toUpperCase()}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Create a Model - JupyterLab
      </Typography>
      {/* Control Panel */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            
            {jupyterContainerName && (
              <Tooltip title={selectedContainerReason}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    Container: {jupyterContainerName}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getLedColor(),
                      boxShadow: `0 0 4px ${getLedColor()}`,
                    }}
                  />
                  {getStatusChip()}
                </Box>
              </Tooltip>
            )}
            {isUpdating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Updating...</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Container hint */}
      {containerHint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {containerHint}
        </Alert>
      )}

      {/* Error messages */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* JupyterLab iframe */}
      {isJupyterEnabled && jupyterContainerName && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ position: 'relative', minHeight: '600px' }}>
              <iframe
                src={jupyterUrl}
                width="100%"
                height="700"
                frameBorder="0"
                title="Jupyter Notebook"
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  minHeight: '600px'
                }}
                allowFullScreen
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Help text when no container is found or not running */}
      {isJupyterEnabled && !jupyterContainerName && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No Jupyter containers found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab" is running.
        </Alert>
      )}
      {isJupyterEnabled && jupyterContainerName && containerStatus !== 'running' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          JupyterLab container ({jupyterContainerName}) is not running (status: {containerStatus}). Please wait for it to start or check the container logs for details.
        </Alert>
      )}
    </Box>
  );
}

export default Model;