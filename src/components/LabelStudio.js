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
  const iframeRef = useRef(null);
  
  const labelStudioUrl = '/labelstudio/';

  useEffect(() => {
    localStorage.setItem('isLabelStudioEnabled', JSON.stringify(isLabelStudioEnabled));
  }, [isLabelStudioEnabled]);

  // Simulate loading progress
  useEffect(() => {
    if (isLabelStudioEnabled && embedMode && !iframeLoaded && containerStatus === 'running') {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90; // Stop at 90%, complete when iframe actually loads
          }
          return prev + 10;
        });
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isLabelStudioEnabled, embedMode, iframeLoaded, containerStatus]);

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
    setIsUpdating(true);
    setIframeLoaded(false);
    setLoadingProgress(0);
    
    try {
      const response = await axios.post('/api/labelstudio/config', { enabled });
      console.log('Label Studio config updated:', response.data);
      
      // Update hint if provided
      if (response.data.hint) {
        setContainerHint(response.data.hint);
      }
      
      await fetchContainerInfo();
    } catch (error) {
      console.error('Error updating Label Studio config:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update Label Studio configuration';
      const errorDetails = error.response?.data?.details || '';
      setErrorMessage(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ''}`);
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
    console.log('Label Studio iframe loaded successfully');
    
    // Try to hide Label Studio's own branding/navigation if possible
    try {
      const iframeDocument = iframeRef.current?.contentDocument;
      if (iframeDocument) {
        // Add custom styles to hide unnecessary elements
        const style = iframeDocument.createElement('style');
        style.textContent = `
          .ls-topbar { display: none !important; }
          .ls-navigation { display: none !important; }
          .dm-footer { display: none !important; }
          .ant-layout-header { display: none !important; }
          iframe[src*="labelstud.io"] { display: none !important; }
        `;
        iframeDocument.head.appendChild(style);
      }
    } catch (e) {
      // Cross-origin restrictions prevent this, but that's OK
      console.log('Cannot modify iframe content due to CORS');
    }
  };

  const handleIframeError = (e) => {
    console.error('Label Studio iframe error:', e);
    setErrorMessage('Failed to load Label Studio. Please check if the container is running.');
    setIframeLoaded(false);
    setLoadingProgress(0);
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
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={embedMode}
                    onChange={(e) => {
                      setEmbedMode(e.target.checked);
                      setIframeLoaded(false);
                      setLoadingProgress(0);
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
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Container hint if multiple containers found */}
      {containerHint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {containerHint}
        </Alert>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      
      {/* Main content area */}
      {isLabelStudioEnabled && containerStatus === 'running' && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {embedMode ? (
              <Box sx={{ position: 'relative', minHeight: '600px' }}>
                {/* Loading overlay */}
                {!iframeLoaded && (
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
                  }}
                  // Security attributes for iframe
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-top-navigation-by-user-activation"
                  allow="fullscreen; clipboard-read; clipboard-write"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
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
        </Alert>
      )}
    </Box>
  );
}

export default LabelStudio;