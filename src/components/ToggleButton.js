import React, { useState, useEffect } from 'react';
import Switch from '@mui/material/Switch';
import axios from 'axios';

const ToggleButton = ({ containerName }) => {
  const [isRunning, setIsRunning] = useState(false);
  const apiKey = 'your-secret-key'; // Replace with your actual API key

  // Fetch container status on mount and poll every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`/api/containers/${containerName}/status`, {
          headers: { 'x-api-key': apiKey },
        });
        setIsRunning(response.data.running);
      } catch (error) {
        console.error(`Error fetching status for ${containerName}:`, error);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [containerName]);

  // Handle toggle action (start/stop)
  const handleToggle = async (event) => {
    const action = event.target.checked ? 'start' : 'stop';
    try {
      await axios.post(`/api/containers/${containerName}/${action}`, {}, {
        headers: { 'x-api-key': apiKey },
      });
      setIsRunning(event.target.checked);
    } catch (error) {
      console.error(`Error ${action}ing container ${containerName}:`, error);
    }
  };

  return (
    <div>
      <label>
        {containerName} ({isRunning ? 'Running' : 'Stopped'})
        <Switch checked={isRunning} onChange={handleToggle} />
      </label>
    </div>
  );
};

export default ToggleButton;