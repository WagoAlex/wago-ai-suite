import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function Nodered() {
  // Initialize isNodeRedEnabled from localStorage with error handling
  const [isNodeRedEnabled, setIsNodeRedEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isNodeRedEnabled');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (typeof parsed === 'boolean') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse isNodeRedEnabled from localStorage:', e);
    }
    return false; // Default to false if no valid state is found
  });

  const [nodeRedContainerName, setNodeRedContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const nodeRedUrl = '/nodered/'; // NGINX will proxy this to Node-RED

  // Save isNodeRedEnabled to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isNodeRedEnabled', JSON.stringify(isNodeRedEnabled));
  }, [isNodeRedEnabled]);

  // Function to fetch container name and status
  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/nodered/container-name');
      const name = response.data.containerName;
      setNodeRedContainerName(name);

      const statusResponse = await axios.get(`/api/containers/${name}/status`);
      setContainerStatus(statusResponse.data.status);
    } catch (error) {
      console.error('Error fetching Node-RED container info:', error);
      setErrorMessage('Failed to fetch container information');
      setContainerStatus('unknown');
    }
  };

  // Fetch data on mount and poll every 5 seconds
  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle toggle for enabling/disabling Node-RED embedding
  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsNodeRedEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await axios.post('/api/nodered/config', { enabled });
      console.log('Node-RED config updated successfully');
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating Node-RED config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update Node-RED configuration');
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine LED color based on container status
  const getLedColor = () => {
    switch (containerStatus) {
      case 'running':
        return 'green';
      case 'restarting':
        return 'yellow';
      case 'created':
      case 'exited':
      case 'dead':
        return 'red';
      default:
        return 'yellow';
    }
  };

  return (
    <Box>
      <Typography variant="h6">Node-RED</Typography>

      {/* Toggle for enabling Node-RED embedding */}
      <FormControlLabel
        control={
          <Switch
            checked={isNodeRedEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
          />
        }
        label="Enable Node-RED Embedding"
      />
      {isUpdating && <Typography>Updating configuration...</Typography>}

      {/* Container status with LED */}
      {nodeRedContainerName && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography>Container: {nodeRedContainerName}</Typography>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: getLedColor(),
              ml: 2,
            }}
          />
        </Box>
      )}

      {/* Error display */}
      {errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Node-RED iframe */}
      {isNodeRedEnabled && (
        <Box sx={{ border: '1px solid #d3d7da', p: 2, my: 2 }}>
          <iframe
            src={nodeRedUrl}
            width="100%"
            height="800"
            frameBorder="0"
            title="Node-RED Dashboard"
          />
        </Box>
      )}
    </Box>
  );
}

export default Nodered;