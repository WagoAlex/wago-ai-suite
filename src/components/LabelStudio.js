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
      console.error('Failed to parse isLabelStudioEnabled from localStorage:', e);
      return false;
    }
  });

  const [labelStudioContainerName, setLabelStudioContainerName] = useState(null);
  const [containerStatus, setContainerStatus] = useState('unknown');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [containerHint, setContainerHint] = useState(null);
  const [embedMode, setEmbedMode] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [iframeError, setIframeError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef(null);
  
  const labelStudioUrl = '/labelstudio/';
  const maxRetries = 3;

  useEffect(() => {
    localStorage.setItem('isLabelStudioEnabled', JSON.stringify(isLabelStudioEnabled));
  }, [isLabelStudioEnabled]);

  // Simulate loading progress with timeout protection
  useEffect(() => {
    if (isLabelStudioEnabled && embedMode && !iframeLoaded && containerStatus === 'running') {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Timeout protection - if not loaded after 30 seconds, show error
      const timeout = setTimeout(() => {
        if (!iframeLoaded) {
          setIframeError('Label Studio took too long to load. Please try refreshing or check if the container is properly configured.');
          clearInterval(interval);
        }
      }, 30000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isLabelStudioEnabled, embedMode, iframeLoaded, containerStatus, retryCount]);

  const fetchContainerInfo = async () => {
    try {
      const response = await axios.get('/api/labelstudio/container-name');
      const data = response.data;
      
      setLabelStudioContainerName(data.containerName);
      setContainerHint(data.hint || null);

      const statusResponse = await axios.get(`/api/containers/${data.containerName}/status`, {
        params: { type: 'local' }
      });
      setContainerStatus(statusResponse.data.status);
      
      // Clear errors if container is running properly
      if (statusResponse.data.status === 'running') {
        setErrorMessage(null);
      }
    } catch (error) {
      console.error('Error fetching Label Studio container info:', error);
      setErrorMessage(error.response?.data?.hint || 'Failed to fetch container information');
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
    setIframeError(null);
    setIsUpdating(true);
    setIframeLoaded(false);
    setLoadingProgress(0);
    setRetryCount(0);
    
    try {
      const response = await axios.post('/api/labelstudio/config', { enabled });
      console.log('Label Studio config updated:', response.data);
      
      if (response.data.hint) {
        setContainerHint(response.data.hint);
      }
      
      // Wait a bit for container to start
      if (enabled) {
        setTimeout(() => {
          fetchContainerInfo();
        }, 3000);
      } else {
        await fetchContainerInfo();
      }
    } catch (error) {
      console.error('Error updating Label Studio config:', error);
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

  const openLabelStudioInNewTab = () => {
    window.open(labelStudioUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setLoadingProgress(100);
    setIframeError(null);
    setRetryCount(0);
    console.log('Label Studio iframe loaded successfully');
  };

  const handleIframeError = (e) => {
    console.error('Label Studio iframe error:', e);
    setIframeLoaded(false);
    setLoadingProgress(0);
    
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIframeError(`Loading failed (attempt ${retryCount + 1}/${maxRetries}). Retrying...`);
      
      // Retry after a delay
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = labelStudioUrl + '?v=' + Date.now(); // Add cache buster
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
    
    if (iframeRef.current) {
      iframeRef.current.src = labelStudioUrl + '?v=' + Date.now();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Label Studio - Data Annotation Platform
      </Typography>

      {/* Control Panel */}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={embedMode}
                    onChange={(e) => {
                      setEmbedMode(e.target.checked);
                      setIframeLoaded(false);
                      setLoadingProgress(0);
                      setIframeError(null);
                      setRetryCount(0);
                    }}
                  />
                }
                label="Embed Mode"
              />
              <Button 
                variant="outlined" 
                onClick={openLabelStudioInNewTab}
                size="small"
              >
                Open in New Tab
              </Button>
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
      
      {/* Container hint */}
      {containerHint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {containerHint}
        </Alert>
      )}
      
      {/* Error messages */}
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
      
      {/* Main content area */}
      {isLabelStudioEnabled && containerStatus === 'running' && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {embedMode ? (
              <Box sx={{ position: 'relative', minHeight: '600px' }}>
                {/* Loading overlay */}
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
                  // Minimal sandbox - nur was absolut nötig ist
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                  allow="fullscreen; clipboard-read; clipboard-write; camera; microphone"
                />
                
                {/* Error state */}
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
                      <Button 
                        variant="outlined" 
                        onClick={openLabelStudioInNewTab}
                      >
                        Open in New Tab
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" gutterBottom>
                  Label Studio is Running
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Access Label Studio in a new tab for the full experience
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={openLabelStudioInNewTab}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  Open Label Studio
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Help text when container is not running */}
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