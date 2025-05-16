import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function Visualization() {
  // Initialize isGrafanaEnabled from localStorage with error handling
  const [isGrafanaEnabled, setIsGrafanaEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isGrafanaEnabled');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (typeof parsed === 'boolean') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse isGrafanaEnabled from localStorage:', e);
    }
    return false; // Default to false if no valid state is found
  });

  const [grafanaContainerName, setGrafanaContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const grafanaUrl = '/grafana/';

  // Save isGrafanaEnabled to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isGrafanaEnabled', JSON.stringify(isGrafanaEnabled));
  }, [isGrafanaEnabled]);

  // Function to fetch container name and status
  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/grafana/container-name');
      const name = response.data.containerName;
      setGrafanaContainerName(name);

      const statusResponse = await axios.get(`/api/containers/${name}/status`);
      setContainerStatus(statusResponse.data.status);
    } catch (error) {
      console.error('Error fetching container info:', error);
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

  // Handle toggle for enabling/disabling Grafana embedding
  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsGrafanaEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await axios.post('/api/grafana/config', { enabled });
      console.log('Grafana config updated successfully');
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating Grafana config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update Grafana configuration');
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
      <Typography variant="h6">Visualization</Typography>

      {/* Toggle for enabling Grafana embedding */}
      <FormControlLabel
        control={
          <Switch
            checked={isGrafanaEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
          />
        }
        label="Enable Grafana Embedding"
      />
      {isUpdating && <Typography>Updating configuration...</Typography>}

      {/* Container status with LED */}
      {grafanaContainerName && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography>Container: {grafanaContainerName}</Typography>
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

      {/* Grafana iframe */}
      {isGrafanaEnabled && (
        <Box sx={{ border: '1px solid #d3d7da', p: 2, my: 2 }}>
          <iframe
            src={grafanaUrl}
            width="100%"
            height="800"
            frameBorder="0"
            title="Grafana Dashboard"
          />
        </Box>
      )}
    </Box>
  );
}

export default Visualization;