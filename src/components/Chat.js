import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { createChat } from '@n8n/chat';
import '@n8n/chat/style.css';
import './chat-overrides.css'; // Optional: Include if you have custom styles
import theme from '../theme'; // Your custom MUI theme
import { N8N_REST_API_KEY } from '../config';


function Chat({ webhookUrls }) {
  // Define constants
  const n8nWebhookUrl = webhookUrls[2];
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Initialize the chat widget
  useEffect(() => {
    if (!n8nWebhookUrl) {
      setSnackbarMessage('Chat webhook URL is missing.');
      setSnackbarOpen(true);
      return;
    }

    console.log('Initializing chat with webhook URL:', n8nWebhookUrl);
    try {
      createChat({
        webhookUrl: n8nWebhookUrl,
        target: '#chat-container',
        mode: 'fullscreen',
		showWelcomeScreen: true,
		headers: {
          'Authorization': `Bearer ${N8N_REST_API_KEY}`, // Add authentication
        },
        theme: 'light',
        initialMessages: ['Hello! I am the WAGO AI Assistant 🤖. How can I help you today?'],
        onError: (error) => {
          console.error('Chat widget error:', error);
          setSnackbarMessage(`Chat error: ${error.message}`);
          setSnackbarOpen(true);
        },
      });
      console.log('Chat widget initialized successfully');
    } catch (error) {
      console.error('Error initializing chat widget:', error);
      setSnackbarMessage('Failed to load chat widget. Check the webhook URL and n8n logs.');
      setSnackbarOpen(true);
    }
  }, [n8nWebhookUrl]);

  // Render the UI
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.palette.background.default }}>
      <Box id="chat-container" sx={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }} />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarMessage.includes('Failed') || snackbarMessage.includes('error') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Chat;