import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Tooltip, Snackbar, Alert } from '@mui/material';
import { MQTT_BROKER_URL, MQTT_START_TOPIC, N8N_REST_API_KEY, SERVER_NAME, N8N_WEBHOOKS } from '../config';

function Configuration({
  brokerUrl = MQTT_BROKER_URL,
  startTopic = MQTT_START_TOPIC,
  setBrokerUrl,
  setStartTopic,
  setWebhookUrls,
}) {
  const getInitialBrokerUrl = () => localStorage.getItem('brokerUrl') || brokerUrl;
  const getInitialStartTopic = () => localStorage.getItem('startTopic') || startTopic;
  const getInitialWebhookUrls = () => {
    const savedWebhookUrls = JSON.parse(localStorage.getItem('webhookUrls'));
    if (savedWebhookUrls && Array.isArray(savedWebhookUrls) && savedWebhookUrls.length >= 3) {
      return savedWebhookUrls;
    }
    return [
      '/n8n/webhook-test/invoke_recording',
      '/n8n/webhook-test/invoke_audio',
      '/n8n/webhook/ai42/chat',
    ];
  };

  const [localBrokerUrl, setLocalBrokerUrl] = useState(getInitialBrokerUrl());
  const [localStartTopic, setLocalStartTopic] = useState(getInitialStartTopic());
  const [localWebhookUrls, setLocalWebhookUrls] = useState(getInitialWebhookUrls());
  const [testing, setTesting] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  useEffect(() => {
    setWebhookUrls(localWebhookUrls);
  }, [localWebhookUrls, setWebhookUrls]);

  const handleSave = () => {
    if (localWebhookUrls.length < 3 || localWebhookUrls.some((url) => !url.trim())) {
      setSnackbarMessage('Please configure at least three valid webhook URLs.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setBrokerUrl(localBrokerUrl);
    setStartTopic(localStartTopic);
    setWebhookUrls(localWebhookUrls);
    localStorage.setItem('brokerUrl', localBrokerUrl);
    localStorage.setItem('startTopic', localStartTopic);
    localStorage.setItem('webhookUrls', JSON.stringify(localWebhookUrls));
    setSnackbarMessage('Configuration saved successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const addWebhook = () => {
    if (localWebhookUrls.length >= 6) {
      setSnackbarMessage('Maximum of 6 webhooks reached.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    setLocalWebhookUrls([...localWebhookUrls, '']);
  };

  const removeWebhook = (index) => {
    if (index < 3) {
      setSnackbarMessage('The first three webhooks cannot be removed.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    const newUrls = localWebhookUrls.filter((_, i) => i !== index);
    setLocalWebhookUrls(newUrls);
  };

  const testWebhook = async (index) => {
    const url = localWebhookUrls[index];
    if (!url) {
      alert(`Webhook URL is not configured for index ${index}.`);
      return;
    }
    setTesting((prev) => ({ ...prev, [index]: true }));
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${SERVER_NAME}${url}`;
      console.log('Testing webhook with URL:', fullUrl); // Log before fetch
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${N8N_REST_API_KEY}`,
        },
        body: JSON.stringify({
          message: `Test webhook #${index} from configuration`,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`Test webhook #${index} response:`, data);
      alert(`Test webhook #${index} triggered successfully! Response: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`Error testing webhook #${index}:`, error);
      alert(`Failed to test webhook: ${error.message}`);
    } finally {
      setTesting((prev) => ({ ...prev, [index]: false }));
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Configuration
      </Typography>

      {/* MQTT Settings */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          MQTT Settings
        </Typography>
        <TextField
          label="MQTT Broker URL"
          value={localBrokerUrl}
          onChange={(e) => setLocalBrokerUrl(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="MQTT Start Topic"
          value={localStartTopic}
          onChange={(e) => setLocalStartTopic(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Webhook Settings */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Webhook Settings
        </Typography>
        {localWebhookUrls.map((url, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 2 }}>
            <TextField
              label={index === 2 ? 'Workflow URL' : `Webhook URL ${index + 1}`}
              value={url}
              onChange={(e) => {
                const newUrls = [...localWebhookUrls];
                newUrls[index] = e.target.value;
                setLocalWebhookUrls(newUrls);
              }}
              fullWidth
              helperText="Use relative path (e.g., /n8n/webhook-test/your-webhook-id) or full URL"
            />
            {index < 6 && (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => testWebhook(index)}
                disabled={testing[index]}
                sx={{ mt: 1, minWidth: '100px' }} // Align with top of TextField
              >
                {testing[index] ? 'Started...' : 'Invoke'}
              </Button>
            )}
            {index >= 7 && (
              <Button
                variant="contained"
                color="error"
                onClick={() => removeWebhook(index)}
                sx={{ mt: 1, minWidth: '100px' }} // Align with top of TextField
              >
                Remove
              </Button>
            )}
          </Box>
        ))}
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Tooltip title={localWebhookUrls.length >= 7 ? 'Maximum of 7 webhooks reached' : ''} arrow>
            <span>
              <Button
                variant="outlined"
                onClick={addWebhook}
                disabled={localWebhookUrls.length >= 6}
              >
                Add Webhook
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            title={
              !localBrokerUrl
                ? 'MQTT Broker URL is required.'
                : !localStartTopic
                ? 'MQTT Start Topic is required.'
                : localWebhookUrls.length < 3
                ? 'At least three webhook URLs are required.'
                : localWebhookUrls.some((url) => !url.trim())
                ? 'All webhook URLs must be filled.'
                : ''
            }
            arrow
          >
            <span>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={
                  !localBrokerUrl ||
                  !localStartTopic ||
                  localWebhookUrls.length < 3 ||
                  localWebhookUrls.some((url) => !url.trim())
                }
              >
                Save
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Configuration;