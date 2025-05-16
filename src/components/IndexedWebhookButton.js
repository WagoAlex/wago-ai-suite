import React, { useState } from 'react';
import { Button } from '@mui/material';
import { N8N_REST_API_KEY } from '../config';

function IndexedWebhookButton({ webhookUrls, index, buttonText, onClick }) {
  const [isLoading, setIsLoading] = useState(false);

  const triggerWebhook = async () => {
    const url = webhookUrls?.[index];
    if (!url) {
      alert(`Webhook URL is not configured for index ${index}.`);
      return;
    }
    console.log('Triggering webhook at:', url);
    if (onClick) onClick();
    setIsLoading(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${N8N_REST_API_KEY}`,
        },
        body: JSON.stringify({
          message: `Webhook #${index} triggered from React app`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Webhook #${index} response:`, data);
    } catch (error) {
      console.error(`Error triggering webhook #${index}:`, error);
      alert(`Failed to trigger webhook: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={triggerWebhook}
      disabled={isLoading}
    >
      {isLoading ? 'Triggering...' : (buttonText || `Trigger Webhook ${index + 1}`)}
    </Button>
  );
}

export default IndexedWebhookButton;