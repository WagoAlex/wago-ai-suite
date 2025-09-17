import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  Button,
  CircularProgress,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';

function LabelStudio() {
  const [isLabelStudioEnabled, setIsLabelStudioEnabled] = useState(() => {
    try {
      const savedState = localStorage.getItem('isLabelStudioEnabled');
      return savedState ? JSON.parse(savedState) : false;
    } catch (e) {
      console.error('[LabelStudio] [Error] Failed to parse isLabelStudioEnabled from localStorage:', e);
      return false;
    }
  });
  const [authToken, setAuthToken] = useState(localStorage.getItem('labelStudioToken') || null);
  const [labelStudioContainerName, setLabelStudioContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [containerHint, setContainerHint] = useState(null);
  const [embedMode, setEmbedMode] = useState(true);  // Always true, no toggle
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [iframeError, setIframeError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const iframeRef = useRef(null);
  const labelStudioUrl = '/labelstudio/';
  const maxRetries = 3;

  useEffect(() => {
    localStorage.setItem('isLabelStudioEnabled', JSON.stringify(isLabelStudioEnabled));
  }, [isLabelStudioEnabled]);

  // Simulate loading progress with timeout protection
  useEffect(() => {
    if (isLabelStudioEnabled && embedMode && !iframeLoaded && containerStatus === 'running') {
      console.debug('[LabelStudio] [Progress] Starting loading simulation for iframe');
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            console.info('[LabelStudio] [Progress] Loading simulation completed at 90% (waiting for iframe load)');
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const timeout = setTimeout(() => {
        if (!iframeLoaded) {
          console.warn('[LabelStudio] [Error] Loading timeout reached after 30 seconds');
          setIframeError('Label Studio took too long to load. This might be a container configuration issue.');
          clearInterval(interval);
        }
      }, 30000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        console.debug('[LabelStudio] [Progress] Cleaned up loading interval and timeout');
      };
    }
  }, [isLabelStudioEnabled, embedMode, iframeLoaded, containerStatus, retryCount]);

  const fetchContainerInfo = async () => {
    try {
      console.debug('[LabelStudio] [Fetch] Fetching container info');
      const response = await axios.get('/api/labelstudio/container-name');
      const data = response.data;
      setLabelStudioContainerName(data.containerName);
      setContainerHint(data.hint || null);
      const statusResponse = await axios.get(`/api/containers/${data.containerName}/status`, {
        params: { type: 'local' }
      });
      setContainerStatus(statusResponse.data.status);
      console.info('[LabelStudio] [Fetch] Container status fetched:', statusResponse.data.status);
      if (statusResponse.data.status === 'running') {
        setErrorMessage(null);
      }
    } catch (error) {
      console.error('[LabelStudio] [Error] Error fetching Label Studio container info:', error);
      setErrorMessage(error.response?.data?.hint || 'Failed to fetch container information');
      setContainerStatus('unknown');
    }
  };

  useEffect(() => {
    fetchContainerInfo();
    const interval = setInterval(fetchContainerInfo, 5000);
    console.debug('[LabelStudio] [Init] Started container info polling interval');
    return () => {
      clearInterval(interval);
      console.debug('[LabelStudio] [Cleanup] Stopped container info polling interval');
    };
  }, []);

  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setIsLabelStudioEnabled(enabled);
    setErrorMessage(null);
    setIframeError(null);
    setIsUpdating(true);
    setIframeLoaded(false);
    setLoadingProgress(0);
    setRetryCount(0);
    setLoginAttempted(false);
    try {
      console.debug('[LabelStudio] [Toggle] Updating Label Studio config:', { enabled });
      const response = await axios.post('/api/labelstudio/config', { enabled });
      console.info('[LabelStudio] [Toggle] Label Studio config updated:', response.data);
      if (response.data.hint) {
        setContainerHint(response.data.hint);
      }
      if (enabled) {
        setTimeout(() => {
          fetchContainerInfo();
        }, 3000);
      } else {
        await fetchContainerInfo();
      }
    } catch (error) {
      console.error('[LabelStudio] [Error] Error updating Label Studio config:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update Label Studio configuration';
      const errorDetails = error.response?.data?.details || '';
      setErrorMessage(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ''}`);
      setIsLabelStudioEnabled(!enabled);
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

  const handleIframeLoad = () => {
    console.debug('[LabelStudio] [Iframe] Iframe load event triggered');
    setIframeLoaded(true);
    setLoadingProgress(100);
    setIframeError(null);
    setRetryCount(0);
    console.info('[LabelStudio] [Iframe] Label Studio iframe loaded successfully');
    if (!loginAttempted) {
      setTimeout(() => {
        attemptAutoLogin();
      }, 1000);
    }
  };

const attemptAutoLogin = () => {
    console.debug('[LabelStudio] [AutoLogin] Attempting auto-login');
    try {
        if (!iframeRef.current) {
            console.warn('[LabelStudio] [AutoLogin] Iframe ref is null during auto-login');
            return;
        }
        
        const iframeWindow = iframeRef.current.contentWindow;
        if (!iframeWindow) {
            console.warn('[LabelStudio] [AutoLogin] Iframe contentWindow is null');
            return;
        }

        let iframeDoc;
        try {
            iframeDoc = iframeWindow.document;
        } catch (e) {
            console.warn('[LabelStudio] [AutoLogin] Cannot access iframe document:', e);
            return;
        }

        setLoginAttempted(true);

        // Look for login form with updated selectors
        const loginForm = iframeDoc.querySelector('form[action*="login"]') || 
                         iframeDoc.querySelector('form[method="post"]') ||
                         iframeDoc.querySelector('form.login-form');
                         
        const emailInput = iframeDoc.querySelector('input[name="email"]') || 
                          iframeDoc.querySelector('input[name="username"]') ||
                          iframeDoc.querySelector('input[type="email"]') ||
                          iframeDoc.querySelector('input[placeholder*="email"]');
                          
        const passwordInput = iframeDoc.querySelector('input[name="password"]') ||
                             iframeDoc.querySelector('input[type="password"]');

        if (loginForm && emailInput && passwordInput) {
            console.debug('[LabelStudio] [AutoLogin] Found login form elements');
            
            emailInput.value = 'alexander.fugmann@wago.com';
            passwordInput.value = 'wagowago';
            
            // Trigger events
            ['input', 'change', 'keyup'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                emailInput.dispatchEvent(event);
                passwordInput.dispatchEvent(event);
            });

            const submitButton = loginForm.querySelector('button[type="submit"]') ||
                               loginForm.querySelector('input[type="submit"]') ||
                               loginForm.querySelector('button.btn-primary') ||
                               loginForm.querySelector('button');

            if (submitButton) {
                setTimeout(() => {
                    try {
                        submitButton.click();
                        console.debug('[LabelStudio] [AutoLogin] Submit button clicked');
                    } catch (e) {
                        loginForm.submit();
                        console.debug('[LabelStudio] [AutoLogin] Form submitted directly');
                    }
                }, 100);
            }
        } else {
            console.debug('[LabelStudio] [AutoLogin] Login form elements not found, checking if already logged in');
        }
    } catch (e) {
        console.error('[LabelStudio] [AutoLogin] Auto-login error:', e);
    }
};

  const handleIframeError = (e) => {
    console.error('[LabelStudio] [Iframe] Label Studio iframe error:', e);
    setIframeLoaded(false);
    setLoadingProgress(0);
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIframeError(`Loading failed (attempt ${retryCount + 1}/${maxRetries}). Retrying...`);
      setTimeout(() => {
        if (iframeRef.current) {
          console.debug('[LabelStudio] [Iframe] Retrying iframe load');
          iframeRef.current.src = labelStudioUrl + '?v=' + Date.now();
        }
      }, 2000);
    } else {
      setIframeError('Failed to load Label Studio after multiple attempts. Please check the container logs or try opening in a new tab.');
    }
  };

  const retryIframe = () => {
    setIframeError(null);
    setIframeLoaded(false);
    setLoadingProgress(0);
    setRetryCount(0);
    setLoginAttempted(false);
    if (iframeRef.current) {
      iframeRef.current.src = labelStudioUrl + '?v=' + Date.now();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Label Studio - Data Annotation Platform
      </Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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

            {labelStudioContainerName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  Container: {labelStudioContainerName}
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
            )}

            {isUpdating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Updating...</Typography>
              </Box>
            )}
          </Box>
          {isLabelStudioEnabled && containerStatus === 'running' && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Removed Embed Mode switch as per request */}
              {iframeError && (
                <Button
                  variant="outlined"
                  onClick={retryIframe}
                  size="small"
                  color="warning"
                >
                  Retry Loading
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {containerHint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {containerHint}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {iframeError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {iframeError}
        </Alert>
      )}

      {isLabelStudioEnabled && containerStatus === 'running' && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {/* Embed mode always active, removed non-embed content */}
            <Box sx={{ position: 'relative', minHeight: '600px' }}>
              {!iframeLoaded && !iframeError && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    borderRadius: 1,
                    minHeight: '600px',
                  }}
                >
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading Label Studio... {loadingProgress}%
                  </Typography>
                  {retryCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Retry attempt: {retryCount}/{maxRetries}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      width: 200,
                      height: 4,
                      backgroundColor: 'grey.300',
                      borderRadius: 2,
                      mt: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${loadingProgress}%`,
                        height: '100%',
                        backgroundColor: 'primary.main',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>
                </Box>
              )}

              <iframe
                ref={iframeRef}
                src={labelStudioUrl}
                width="100%"
                height="800"
                frameBorder="0"
                title="Label Studio"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  minHeight: '600px',
                  display: iframeError ? 'none' : 'block',
                }}
                allow="fullscreen; clipboard-read; clipboard-write"
              />

              {iframeError && (
                <Box sx={{ textAlign: 'center', py: 8, minHeight: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Failed to Load Label Studio
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {iframeError}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={retryIframe}
                      color="primary"
                    >
                      Retry
                    </Button>
              
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {isLabelStudioEnabled && containerStatus !== 'running' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Label Studio container is not running. Please wait for it to start or check the container status.
          {containerStatus === 'exited' && ' The container may have crashed - check the logs for details.'}
        </Alert>
      )}
    </Box>
  );
}

export default LabelStudio;