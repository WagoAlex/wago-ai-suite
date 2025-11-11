import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function Automation() {
  // Initialize isN8nEnabled from localStorage with error handling
  const [isN8nEnabled, setIsN8nEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isN8nEnabled');
      return savedState ? JSON.parse(savedState) : false;
    } catch (e) {
      console.error('Failed to parse isN8nEnabled from localStorage:', e);
      return false; // Default to false if parsing fails
    }
  });

  const [n8nContainerName, setN8nContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const n8nUrl = '/n8n/'; // URL proxied by NGINX to the n8n container

  // Persist isN8nEnabled to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('isN8nEnabled', JSON.stringify(isN8nEnabled));
  }, [isN8nEnabled]);

  // Fetch container name and status from the backend
  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/n8n/container-name');
      const name = response.data.containerName;
      setN8nContainerName(name);

      const statusResponse = await axios.get(`/api/containers/${name}/status`);
      setContainerStatus(statusResponse.data.status);
    } catch (error) {
      console.error('Error fetching n8n container info:', error);
      setErrorMessage('Failed to fetch container information');
      setContainerStatus('unknown');
    }
  };

  // Fetch data on component mount and poll every 5 seconds
  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Handle toggle switch to enable/disable n8n embedding
  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsN8nEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await axios.post('/api/n8n/config', { enabled });
      console.log('n8n config updated successfully');
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating n8n config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update n8n configuration');
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
        return 'yellow'; // Unknown or intermediate state
    }
  };

  return (
    <Box>
      <Typography variant="h6">Automation with n8n</Typography>

      {/* Toggle switch for enabling n8n embedding */}
      <FormControlLabel
        control={
          <Switch
            checked={isN8nEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
          />
        }
        label="Enable n8n Embedding"
      />
      {isUpdating && <Typography>Updating configuration...</Typography>}

      {/* Display container name and status with LED */}
      {n8nContainerName && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography>Container: {n8nContainerName}</Typography>
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

      {/* Error message display */}
      {errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Embed n8n interface in an iframe when enabled */}
      {isN8nEnabled && (
        <Box sx={{ border: '1px solid #d3d7da', p: 2, my: 2 }}>
          <iframe
            src={n8nUrl}
            width="100%"
            height="800"
            frameBorder="0"
            title="n8n Dashboard"
          />
        </Box>
      )}
    </Box>
  );
}

export default Automation;