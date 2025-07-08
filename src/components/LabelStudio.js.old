import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function LabelStudio() {
  const [isLabelStudioEnabled, setIsLabelStudioEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isLabelStudioEnabled');
      return savedState ? JSON.parse(savedState) : false;
    } catch (e) {
      console.error('Failed to parse isLabelStudioEnabled from localStorage:', e);
      return false;
    }
  });

  const [labelStudioContainerName, setLabelStudioContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const labelStudioUrl = '/labelstudio/';

  useEffect(() => {
    localStorage.setItem('isLabelStudioEnabled', JSON.stringify(isLabelStudioEnabled));
  }, [isLabelStudioEnabled]);

  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/labelstudio/container-name');
      const name = response.data.containerName;
      setLabelStudioContainerName(name);

      const statusResponse = await axios.get(`/api/containers/${name}/status`, {
        params: { type: 'local' } // Explicitly pass type: 'local'
      });
      setContainerStatus(statusResponse.data.status);
    } catch (error) {
      console.error('Error fetching Label Studio container info:', error);
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
    setIsLabelStudioEnabled(enabled);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await axios.post('/api/labelstudio/config', { enabled });
      console.log('Label Studio config updated successfully');
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating Label Studio config:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update Label Studio configuration');
      setIsLabelStudioEnabled(!enabled); // Revert on failure
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
      <Typography variant="h6">Label Studio</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={isLabelStudioEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
          />
        }
        label="Enable Label Studio"
      />
      {isUpdating && <Typography>Updating configuration...</Typography>}
      {labelStudioContainerName && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography>Container: {labelStudioContainerName}</Typography>
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
      {isLabelStudioEnabled && (
        <Box sx={{ border: '1px solid #d3d7da', p: 2, my: 2 }}>
          <iframe
            id="label-studio-iframe"
            src={labelStudioUrl}
            width="100%"
            height="700"
            frameBorder="0"
            title="Label Studio"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </Box>
      )}
    </Box>
  );
}

export default LabelStudio;