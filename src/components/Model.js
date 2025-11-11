import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
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
  // State for container information
  const [jupyterContainerName, setJupyterContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [containerHint, setContainerHint] = useState(null);
  const [jupyterContainers, setJupyterContainers] = useState([]);
  const [selectedContainerReason, setSelectedContainerReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Jupyter container info and status
  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/jupyter/containers');
      const containers = response.data;
      setJupyterContainers(containers);

      if (containers.length === 0) {
        setErrorMessage('No Jupyter containers found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab" is running.');
        setJupyterContainerName(null);
        setContainerStatus('unknown');
        setSelectedContainerReason('No containers with "jupyter" in the name were detected.');
        setIsLoading(false);
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
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching Jupyter container info:', error);
      setErrorMessage(error.response?.data?.error || 'No Jupyter container found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab" is running.');
      setJupyterContainerName(null);
      setContainerStatus('unknown');
      setSelectedContainerReason('Error fetching container information.');
      setIsLoading(false);
    }
  };

  // Poll container info every 5 seconds
  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    return () => clearInterval(interval);
  }, []);

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
      
      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading Jupyter container information...
          </Typography>
        </Box>
      )}

      {/* Container Status Panel - nur wenn Container gefunden */}
      {!isLoading && jupyterContainerName && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
            </Box>
          </CardContent>
        </Card>
      )}

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

      {/* JupyterLab iframe - NUR WENN CONTAINER GEFUNDEN */}
      {!isLoading && jupyterContainerName && (
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

      {/* Help text when no container is found */}
      {!isLoading && !jupyterContainerName && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No Jupyter containers found with name pattern "jupyter". Please ensure a container like "wago-jupyter-lab-cpu" is running.
        </Alert>
      )}
      
      {/* Warning when container is not running */}
      {!isLoading && jupyterContainerName && containerStatus !== 'running' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          JupyterLab container ({jupyterContainerName}) is not running (status: {containerStatus}). Please wait for it to start or check the container logs for details.
        </Alert>
      )}
    </Box>
  );
}

export default Model;