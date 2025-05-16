import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function Model() {
  const [isJupyterEnabled, setIsJupyterEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isJupyterEnabled');
      return savedState ? JSON.parse(savedState) : false;
    } catch (e) {
      console.error('Failed to parse isJupyterEnabled from localStorage:', e);
      return false;
    }
  });

  const [jupyterContainerName, setJupyterContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const jupyterUrl = '/jupyter/lab'; 

  useEffect(() => {
    localStorage.setItem('isJupyterEnabled', JSON.stringify(isJupyterEnabled));
  }, [isJupyterEnabled]);

  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/jupyter/container-name');
      const name = response.data.containerName;
      setJupyterContainerName(name);

      const statusResponse = await axios.get(`/api/containers/${name}/status`);
      setContainerStatus(statusResponse.data.status);
    } catch (error) {
      console.error('Error fetching container info:', error);
      setErrorMessage('Failed to fetch container information');
      setContainerStatus('unknown');
    }
  };

  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsJupyterEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await axios.post('/api/jupyter/config', { enabled });
      console.log('Jupyter config updated successfully');
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating Jupyter config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update Jupyter configuration');
    } finally {
      setIsUpdating(false);
    }
  };

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

  return (
    <Box>
      <Typography variant="h6">Create a Model</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={isJupyterEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
          />
        }
        label="Enable Jupyter"
      />
      {isUpdating && <Typography>Updating configuration...</Typography>}
      {jupyterContainerName && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography>Container: {jupyterContainerName}</Typography>
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
      {errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {isJupyterEnabled && (
        <Box sx={{ border: '1px solid #d3d7da', p: 2, my: 2 }}>
          <iframe
            src={jupyterUrl}
            width="100%"
            height="700"
            frameBorder="0"
            title="Jupyter Notebook"
            allowFullScreen
          />
        </Box>
      )}
    </Box>
  );
}

export default Model;