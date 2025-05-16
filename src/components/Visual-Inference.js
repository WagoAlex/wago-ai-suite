import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  TextField,
  Input,
  Collapse,
} from '@mui/material';
import axios from 'axios';
import { SERVER_NAME } from '../config';

const BACKEND_URL = `https://${SERVER_NAME}`; // Point to WAGO AI Suite backend

const VisualInference = ({ inferenceServerType, setInferenceServerType, remoteInferenceUrl, setRemoteInferenceUrl }) => {
  const [inputSource, setInputSource] = useState('webcam');
  const [rtspUrl, setRtspUrl] = useState('rtsp://admin:Master1!@192.168.2.176:554/h264Preview_01_main');
  const [status, setStatus] = useState('stopped');
  const [loading, setLoading] = useState(false);
  const [remoteHostStatus, setRemoteHostStatus] = useState('unknown');
  const [inferenceContainers, setInferenceContainers] = useState([]);
  const [caFile, setCaFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [showCertificateUpload, setShowCertificateUpload] = useState(false);
  const [logs, setLogs] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [inferenceData, setInferenceData] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [streamError, setStreamError] = useState(null);
  const videoRef = useRef(null);
  const logsRef = useRef(null);

  const [thinkingDots, setThinkingDots] = useState('.');

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setThinkingDots((prev) => (prev.length < 3 ? prev + '.' : '.'));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setThinkingDots('.');
    }
  }, [loading]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/containers/status`, {
        params: { inferenceServerType, remoteInferenceUrl, source: inputSource },
      });
      setStatus(response.data.status);
      setContainerName(response.data.containerName || 'Unknown');
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus('unknown');
    }
  };

  const fetchLogs = async (initial = false) => {
    try {
      const params = {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
        lines: initial ? 1000 : 200,
        since: initial ? Math.floor(Date.now() / 1000) - 30 : undefined,
      };
      const response = await axios.get(`${BACKEND_URL}/api/containers/logs`, { params });
      setLogs(response.data);
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs('Failed to fetch logs.');
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/containers/start`, {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
      });
      await fetchStatus();
      if (videoRef.current && inputSource !== 'webcam') {
        videoRef.current.src = `${BACKEND_URL}/api/video/stream?source=${inputSource}&rtspUrl=${encodeURIComponent(rtspUrl)}`;
        videoRef.current.play().catch((e) => console.error('Video playback error:', e));
      }
      await fetchLogs(true);
      setInterval(() => fetchLogs(false), 6400);
    } catch (error) {
      console.error('Error starting container:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/containers/stop`, {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
      });
      await fetchStatus();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      setLogs('');
    } catch (error) {
      console.error('Error stopping container:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCertificates = async () => {
    if (!caFile || !certFile || !keyFile) {
      alert('Please select all certificate files');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('ca', caFile);
      formData.append('cert', certFile);
      formData.append('key', keyFile);
      await axios.post(`${BACKEND_URL}/api/upload-certificates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Certificates uploaded successfully');
    } catch (error) {
      console.error('Error uploading certificates:', error);
      alert('Failed to upload certificates');
    }
  };

  const handleFetchMetadata = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/remote/metadata`);
      setMetadata(response.data.metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleFetchInferenceData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/remote/inference`);
      setInferenceData(response.data.inference);
    } catch (error) {
      console.error('Error fetching inference data:', error);
    }
  };

  const fetchInferenceContainers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/inference-containers`, {
        params: { inferenceServerType, remoteInferenceUrl },
      });
      setInferenceContainers(response.data);
    } catch (error) {
      console.error('Error fetching inference containers:', error);
      setInferenceContainers([]);
    }
  };

  const checkRemoteHost = async () => {
    if (inferenceServerType !== 'remote' || !remoteInferenceUrl) {
      setRemoteHostStatus('unknown');
      return;
    }
    setRemoteHostStatus('checking');
    try {
      const response = await axios.get(`${BACKEND_URL}/api/check-remote-docker`, {
        params: { inferenceServerType, remoteInferenceUrl },
      });
      setRemoteHostStatus(response.data.status);
    } catch (error) {
      console.error('Error checking remote host:', error);
      setRemoteHostStatus('unreachable');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchInferenceContainers();
    checkRemoteHost();
  }, [inferenceServerType, remoteInferenceUrl]);

  const getRemoteHostLedColor = () => {
    switch (remoteHostStatus) {
      case 'reachable': return 'green';
      case 'checking': return 'yellow';
      case 'unreachable': return 'red';
      default: return 'gray';
    }
  };

  const getContainerLedColor = (status) => {
    switch (status) {
      case 'running': return 'green';
      case 'exited': return 'red';
      default: return 'yellow';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Inference Server</InputLabel>
        <Select
          value={inferenceServerType}
          onChange={(e) => setInferenceServerType(e.target.value)}
          label="Inference Server"
        >
          <MenuItem value="local">Local</MenuItem>
          <MenuItem value="remote">Remote</MenuItem>
        </Select>
      </FormControl>

      {inferenceServerType === 'remote' && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getRemoteHostLedColor(),
                boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
              }}
              title={`Remote Host Status: ${remoteHostStatus}`}
            />
            <TextField
              label="Remote Inference URL"
              value={remoteInferenceUrl}
              onChange={(e) => setRemoteInferenceUrl(e.target.value)}
              fullWidth
              placeholder="e.g., https://192.168.2.62:2376"
            />
          </Box>
          <Button
            variant="outlined"
            onClick={() => setShowCertificateUpload(!showCertificateUpload)}
            sx={{ mt: 1, mb: 3 }}
          >
            {showCertificateUpload ? 'Hide Certificate Upload' : 'Upload Certificates'}
          </Button>
          <Collapse in={showCertificateUpload}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2">Upload Certificates</Typography>
              <Input type="file" onChange={(e) => setCaFile(e.target.files[0])} accept=".pem" sx={{ mb: 1, display: 'block' }} />
              <Input type="file" onChange={(e) => setCertFile(e.target.files[0])} accept=".pem" sx={{ mb: 1, display: 'block' }} />
              <Input type="file" onChange={(e) => setKeyFile(e.target.files[0])} accept=".pem" sx={{ mb: 1, display: 'block' }} />
              <Button variant="contained" onClick={handleUploadCertificates} size="small">
                Upload
              </Button>
            </Box>
          </Collapse>
        </Box>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Input Source</InputLabel>
        <Select
          value={inputSource}
          onChange={(e) => setInputSource(e.target.value)}
          label="Input Source"
          disabled={status === 'running' || loading}
        >
          <MenuItem value="webcam">Webcam</MenuItem>
          <MenuItem value="rtsp">RTSP Stream</MenuItem>
        </Select>
      </FormControl>

      {inputSource === 'rtsp' && (
        <Box sx={{ mb: 2 }}>
          <TextField
            label="RTSP URL"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            fullWidth
            disabled={status === 'running' || loading}
          />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStart}
          disabled={status === 'running' || loading}
          sx={{ mr: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Start'}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleStop}
          disabled={status !== 'running' || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Stop'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
        <Box sx={{ flex: 1, minWidth: '300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getContainerLedColor(status),
                boxShadow: status === 'running' ? '0 0 5px green' : '0 0 5px grey',
              }}
              title={`Container Status: ${status}`}
            />
            <Typography>Container: {containerName} ({status})</Typography>
          </Box>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>Inference Display:</Typography>
          <Box sx={{ mb: 2 }}>
            {inputSource === 'webcam' ? (
              <>
                <img
                  src="https://192.168.2.165/api/video/stream?source=webcam"
                  alt="Webcam Stream"
                  style={{ width: '100%', maxWidth: '640px', backgroundColor: '#000' }}
                  onError={(e) => {
                    console.error('Webcam stream error:', e.nativeEvent);
                    setStreamError('Failed to load webcam stream. Check server logs for details.');
                  }}
                />
                {streamError && <Typography color="error">{streamError}</Typography>}
              </>
            ) : (
              <video
                ref={videoRef}
                width="100%"
                height="480"
                controls
                autoPlay
                style={{ backgroundColor: '#000', maxWidth: '640px' }}
                onError={(e) => console.error('Video stream error:', e.target.error)}
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: '300px',
            maxHeight: '480px',
            overflowY: 'auto',
            backgroundColor: '#1A1A1A',
            color: 'white',
            padding: 2,
            borderRadius: '8px',
            border: '1px solid #333',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
          ref={logsRef}
        >
          {loading && (
            <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>
              Fetching{thinkingDots}
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ mb: 1, color: 'white' }}>
            Container Logs:
          </Typography>
          <Box
            sx={{
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30px',
                background: 'linear-gradient(to bottom, #1A1A1A, transparent)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '30px',
                background: 'linear-gradient(to top, #1A1A1A, transparent)',
              },
            }}
          >
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.8rem',
                padding: '10px 0',
                color: 'white',
              }}
            >
              {logs}
            </pre>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VisualInference;
