import React, { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import Hls from 'hls.js';
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
  Chip,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Modal,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { SERVER_NAME } from '../config';
import { useMqtt } from '../MqttContext';
/*
const API_URL = `https://${SERVER_NAME}`;
*/
const API_URL = '';
console.log('API_URL:', API_URL);
console.log('Browser location:', window.location.hostname);

const VisualInference = ({ inferenceServerType, setInferenceServerType, remoteInferenceUrl, setRemoteInferenceUrl }) => {
  const [inputSource, setInputSource] = useState('webcam');
  const [rtspUrl, setRtspUrl] = useState('rtsp://admin:Master1!@192.168.2.189:554/h264Preview_01_main');
  const [status, setStatus] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [remoteHostStatus, setRemoteHostStatus] = useState('checking');
  const [localHostStatus, setLocalHostStatus] = useState('checking');
  const [inferenceContainers, setInferenceContainers] = useState([]);
  const [caFile, setCaFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [logs, setLogs] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [inferenceData, setInferenceData] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [streamError, setStreamError] = useState(null);
  const [containerHint, setContainerHint] = useState(null);
  const logsRef = useRef(null);
  const [thinkingDots, setThinkingDots] = useState('.');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  const rafId = useRef(null);
  const [detections, setDetections] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 640, height: 640 });
  const [parseError, setParseError] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const lastGoodDataURL = useRef(null);
  const streamTimestamp = useRef(Date.now());
  const reconnectAttempt = useRef(0);
  const { client, connectionStatus: mqttStatus, error: mqttError } = useMqtt();
  const BASE_RETRY_DELAY = 10000; // Start at 10s
  const MAX_RETRY_DELAY = 30000; // Cap at 30s
  const MAX_RETRIES = 5; // Stop after 5 attempts

  // Multi-camera state
  const [cameraOptions, setCameraOptions] = useState([
    { id: 0, label: 'Reolink (Default)', url: 'rtsp://admin:Master1!@192.168.2.189:554/h264Preview_01_main' },
    { id: 1, label: 'SICK Camera Template', url: 'rtsp://<ip>:554/live/0' },
    { id: 2, label: 'Hikvision Camera Template', url: 'rtsp://<benutzername>:<passwort>@<IP-Adresse>:<RTSP port>/Streaming/channels/<Kanal-Nr>' },
  ]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [customRtsp, setCustomRtsp] = useState('');
  const [numCameras, setNumCameras] = useState(1);

// HLS.js configuration for optimized low-latency live streaming
const hlsConfig = {
  // --- Latency & Live Stream Behavior ---
  lowLatencyMode: true,              // Enables Low-Latency HLS mode for minimal delay
  liveSyncDurationCount: 1,          // Target number of segments to stay behind live edge
  liveMaxLatencyDurationCount: 3,    // Maximum allowed segment distance from live edge before seeking forward

  // --- Buffering & Memory Management ---
  maxBufferLength: 10,               // Max seconds of buffer to store (for smoother playback)
  maxMaxBufferLength: 15,            // Absolute upper limit for buffer size 
  backBufferLength: 5,               // Amount of previous content (in seconds) to retain 
  maxBufferSize: 60 * 1000 * 1000,   // Maximum buffer size in bytes (new; prevents memory bloat)

  // --- Performance & Worker Settings ---
  enableWorker: true,                // Use web workers for background processing to improve performance

  // --- Adaptive Bitrate (ABR) Tuning ---
  abrEwmaFastLive: 3.0,              // Fast EWMA half-life (was 2.0) – reacts faster to bandwidth drops
  abrEwmaSlowLive: 9.0,              // Slow EWMA half-life (was 6.0) – smoother adaptation over time
  abrBandWidthFactor: 0.95,          // Multiplier to slightly undercut measured bandwidth (was 0.9)
  maxFragLookUpTolerance: 0.25,      // Tolerance when matching fragment start times (was 0.1)

  // --- Bandwidth & Loading Behavior ---
  testBandwidth: true,               // Enables bandwidth test before playback (was false)
  startFragPrefetch: true,           // Start loading next fragment early for seamless playback
  progressive: true,                 // Enables progressive download while playing
  capLevelToPlayerSize: true,        // Avoids loading higher resolution than player can display
  smoothSwitching: true,             // Enables seamless quality transitions during playback
  autoStartLoad: true,               // Automatically start loading segments when attached

  // --- Retry Logic ---
  fragLoadingMaxRetry: 6,            // Max retry attempts for fragment loading 
  manifestLoadingMaxRetry: 3,        // Max retry attempts for manifest loading 
};


  // Auto-clear stream error after 5s
  useEffect(() => {
    if (streamError) {
      const currentError = streamError;
      const timer = setTimeout(() => {
        if (streamError === currentError) {
          setStreamError(null);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [streamError]);

  // Load/save camera options to sessionStorage
  useEffect(() => {
    const savedCameras = sessionStorage.getItem('cameraOptions');
    if (savedCameras) {
      setCameraOptions(JSON.parse(savedCameras));
    }
  }, []);
  useEffect(() => {
    sessionStorage.setItem('cameraOptions', JSON.stringify(cameraOptions));
  }, [cameraOptions]);

	useEffect(() => {
	  const selectedCameraOption = cameraOptions.find(opt => opt.id === selectedCamera);
	  if (selectedCameraOption && inputSource === 'rtsp') {
		setRtspUrl(selectedCameraOption.url);
	  }
	}, [selectedCamera, cameraOptions, inputSource]);

  // Loading animation
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

  // Fetch inference containers
  useEffect(() => {
    const fetchAndLogContainers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/inference-containers`, {
          params: { inferenceServerType, remoteInferenceUrl },
        });
        const containers = response.data;
        console.info('Fetched inference containers:', containers);
        setInferenceContainers(containers);
      } catch (error) {
        console.error('Error fetching inference containers:', error);
        setStreamError('Failed to fetch inference containers: ' + (error.response?.data?.error || error.message));
      }
    };
    fetchAndLogContainers();
  }, [inferenceServerType, remoteInferenceUrl]);

  // Dynamic container selection
  useEffect(() => {
    if (inferenceContainers.length === 0) {
      setContainerName('');
      setContainerHint('No inference containers available.');
      return;
    }

    const sourceKeywords = inputSource === 'webcam' ? ['webcam', 'cam'] : ['rtsp'];
    const matchingContainers = inferenceContainers.filter(c =>
      c.name.startsWith('wago-hailo-') &&
      sourceKeywords.some(kw => c.name.toLowerCase().includes(kw.toLowerCase()))
    );

    if (matchingContainers.length > 0) {
      setContainerName(matchingContainers[0].name);
      setContainerHint(matchingContainers.length > 1
        ? `Multiple matching containers found: ${matchingContainers.map(c => c.name).join(', ')}. Using ${matchingContainers[0].name}.`
        : null);
    } else {
      setContainerName('');
      setContainerHint(`No matching inference container found for ${inputSource}. Available: ${inferenceContainers.map(c => c.name).join(', ') || 'None'}. Ensure container name includes 'wago-hailo-' and source keyword (e.g., 'webcam' or 'rtsp').`);
    }
  }, [inferenceContainers, inputSource]);

  // Fetch container status
  const fetchStatus = async () => {
    if (!containerName) return;
    setStreamError(null);
    setContainerHint(null);
    checkHostStatus();
    try {
      const response = await axios.get(`${API_URL}/api/containers/${containerName}/status`, {
        params: { inferenceServerType, remoteInferenceUrl },
      });
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus('unknown');
      const details = error.response?.data?.details || error.message;
      if (details.includes('no such container')) {
        setStreamError(`Container ${containerName} not found. Check Docker on ${inferenceServerType} host.`);
      } else {
        setStreamError(`Failed to fetch status for ${containerName}: ${details}`);
      }
    }
  };

  useEffect(() => {
    if (containerName) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [containerName, inferenceServerType, remoteInferenceUrl]);


// Fetch health status
	useEffect(() => {
	  const fetchHealth = async () => {
		if (status !== 'running' || !containerName) return;
		try {
		  //  Nur im Remote-Modus remoteInferenceUrl mitschicken
		  const params = { inferenceServerType };
		  
		  if (inferenceServerType === 'remote' && remoteInferenceUrl) {
			const inferencePort = process.env.REACT_APP_INFERENCE_PORT || '8042';
			const url = new URL(remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `https://${remoteInferenceUrl}`);
			url.port = inferencePort;
			params.remoteInferenceUrl = url.toString();
		  }
		  
		  const response = await axios.get(`${API_URL}/api/inference/health`, { params });
		  setNumCameras(response.data.cameras.length);
		} catch (error) {
		  console.error('Health check failed:', error);
		  setStreamError('Failed to fetch health status: ' + (error.response?.data?.error || error.message));
		}
	  };
	  fetchHealth();
	}, [status, containerName, inferenceServerType, remoteInferenceUrl]);
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
      await axios.post(`${API_URL}/api/upload-certificates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }, { timeout: 10000 });
      alert('Certificates uploaded successfully');
    } catch (error) {
      console.error('Error uploading certificates:', error);
      alert('Failed to upload certificates: ' + (error.response?.data?.details || error.message));
    }
  };

  const handleStart = async () => {
    if (!containerName) {
      setStreamError('No suitable container found for start. Check available containers.');
      return;
    }
    setLoading(true);
    setStreamError(null);
    setParseError(null);
    try {
      await axios.post(`${API_URL}/api/containers/${containerName}/start`, {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
        rtspUrl: inputSource === 'rtsp' ? rtspUrl : undefined,
      }, { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 10000));
      await fetchStatus();
      await fetchLogs(true);
      initStream();
    } catch (error) {
      console.error('Error starting container:', error);
      const errorMessage = error.response?.status === 400
        ? `Invalid stream parameters for ${containerName}. Ensure ${inputSource} is supported by the container${inputSource === 'webcam' ? ' and webcam device is available' : ' and RTSP URL is valid'}.`
        : error.response?.data?.details || `Failed to start ${containerName}: ${error.message}. Check backend logs for Docker issues.`;
      setStreamError(errorMessage);
      await fetchLogs(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!containerName) {
      setStreamError('No container selected for stop.');
      return;
    }
    setLoading(true);
    setStreamError(null);
    setParseError(null);
    try {
      await axios.post(`${API_URL}/api/containers/${containerName}/stop`, {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
      }, { timeout: 30000 });
      await fetchStatus();
      setLogs('');
      setDetections([]);
      if (hlsRef.current) hlsRef.current.destroy();
      if (videoRef.current) videoRef.current.src = '';
      setImageLoaded(false);
    } catch (error) {
      console.error('Error stopping container:', error);
      setStreamError(error.response?.data?.details || `Failed to stop ${containerName}: ${error.message}.`);
      await fetchLogs(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!containerName) {
      setStreamError('No container selected for restart.');
      return;
    }
    setLoading(true);
    setStreamError(null);
    setParseError(null);
    try {
      await axios.post(`${API_URL}/api/containers/${containerName}/restart`, {
        inferenceServerType,
        remoteInferenceUrl,
        source: inputSource,
      }, { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 10000));
      await fetchStatus();
      await fetchLogs(true);
      initStream();
    } catch (error) {
      console.error('Error restarting container:', error);
      setStreamError(error.response?.data?.details || `Failed to restart ${containerName}: ${error.message}.`);
      await fetchLogs(true);
    } finally {
      setLoading(false);
    }
  };

  const updateCameraUrl = (id, newUrl) => {
    const updatedOptions = cameraOptions.map((opt) =>
      opt.id === id ? { ...opt, url: newUrl } : opt
    );
    setCameraOptions(updatedOptions);
  };

  const addCustomCamera = () => {
    if (customRtsp) {
      setCameraOptions([...cameraOptions, { id: cameraOptions.length, label: 'Custom RTSP', url: customRtsp }]);
      setCustomRtsp('');
    }
  };

/*
  const drawDetections = useCallback((ctx, width, height) => {
    detections.forEach((det) => {
      let [x1, y1, x2, y2] = det.box;
      const maxCoord = Math.max(x1, y1, x2, y2);
      if (maxCoord > width * 2) {
        const scaleFix = maxCoord / width;
        x1 /= scaleFix;
        y1 /= scaleFix;
        x2 /= scaleFix;
        y2 /= scaleFix;
      }
      const scaleW = width / 640;
      const scaleH = height / 640;
      x1 = Math.max(0, Math.min(width, x1 * scaleW));
      y1 = Math.max(0, Math.min(height, y1 * scaleH));
      x2 = Math.max(0, Math.min(width, x2 * scaleW));
      y2 = Math.max(0, Math.min(height, y2 * scaleH));
      const w = x2 - x1;
      const h = y2 - y1;
      if (w > 0 && h > 0) {
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, w, h);
        ctx.fillStyle = 'lime';
        ctx.font = '14px Arial';
        ctx.fillText(`${det.class}: ${(det.confidence * 100).toFixed(2)}%`, x1, y1 - 10 > 0 ? y1 - 10 : y1 + 15);
      }
    });
  }, [detections]);

  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && detections.length > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      //drawDetections(ctx, canvas.width, canvas.height);
    }
    rafId.current = requestAnimationFrame(drawOverlay);
  //}, [detections, drawDetections]);
}, [detections]);


  useEffect(() => {
    if (status === 'running' && !loading && detections.length > 0) {
      rafId.current = requestAnimationFrame(drawOverlay);
      return () => cancelAnimationFrame(rafId.current);
    }
  }, [status, loading, drawOverlay]);
*/
  useEffect(() => {
    if (client && mqttStatus === 'Connected') {
      client.subscribe('inference/#', { qos: 1 }, (err) => {
        if (err) {
          console.error('MQTT subscription error:', err);
          setParseError('Failed to subscribe to inference topic.');
        }
      });
      const handleMessage = (topic, message) => {
        if (topic === 'inference/yolov5m-results') {
          try {
            const data = JSON.parse(message.toString());
            let latestDetections = data.detections || [];
            latestDetections = latestDetections.filter(det =>
              det.class &&
              typeof det.confidence === 'number' &&
              det.confidence > 0 &&
              Array.isArray(det.box) &&
              det.box.length === 4 &&
              det.box.every(coord => typeof coord === 'number' && !isNaN(coord)) &&
              (det.box[2] - det.box[0] > 0) &&
              (det.box[3] - det.box[1] > 0)
            );
            setDetections(latestDetections);
            setParseError(null);
          } catch (e) {
            console.error('MQTT JSON parse error:', e);
            setParseError(`MQTT parse error: ${e.message}`);
          }
        }
      };
      client.on('message', handleMessage);
      return () => {
        client.unsubscribe('inference/#');
        client.off('message', handleMessage);
      };
    } else if (mqttError) {
      setParseError(`MQTT connection error: ${mqttError}. Reconnecting...`);
      const maxDelay = 30000;
      const delay = Math.min(500 * (2 ** reconnectAttempt.current), maxDelay);
      reconnectAttempt.current += 1;
      setTimeout(() => client.reconnect(), delay);
    }
  }, [client, mqttStatus, mqttError]);

  const fetchLogs = useCallback(async (initial = false) => {
    if (!containerName) {
      setLogs('No container selected.');
      return '';
    }
    try {
      const params = {
        inferenceServerType,
        remoteInferenceUrl,
        lines: initial ? 1000 : 200,
        since: initial ? Math.floor(Date.now() / 1000) - 30 : undefined,
      };
      const response = await axios.get(`${API_URL}/api/containers/${containerName}/logs`, { params });
      const lines = response.data.split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-42);
      const reversedLogs = recentLines.reverse().join('\n');
      setLogs(reversedLogs);
      if (logsRef.current) {
        logsRef.current.scrollTop = 0;
      }
      return reversedLogs;
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs(`Error fetching logs: ${error.message}`);
      return '';
    }
  }, [containerName, inferenceServerType, remoteInferenceUrl]);

  const checkHostStatus = async () => {
    if (inferenceServerType === 'local') {
      setLocalHostStatus('checking');
    } else {
      setRemoteHostStatus('checking');
    }
    try {
      await axios.get(`${API_URL}/api/inference-containers`, {
        params: { inferenceServerType, remoteInferenceUrl },
      });
      if (inferenceServerType === 'local') {
        setLocalHostStatus('reachable');
      } else {
        setRemoteHostStatus('reachable');
      }
    } catch (error) {
      const errMsg = error.response ? error.response.data.error : error.message;
      if (inferenceServerType === 'local') {
        setLocalHostStatus('unreachable');
      } else {
        setRemoteHostStatus('unreachable');
      }
      setStreamError(`Host unreachable: ${errMsg}. Check Docker daemon and certificates.`);
    }
  };

	const getStreamUrl = useCallback(() => {
	  if (!inputSource || (inputSource === 'rtsp' && !rtspUrl)) {
		setStreamError('Invalid stream parameters: source and rtspUrl (if RTSP) are required.');
		return null;
	  }
	  if (inputSource === 'rtsp' && !/^rtsp:\/\//.test(rtspUrl)) {
		setStreamError('Invalid RTSP URL: Must start with rtsp://');
		return null;
	  }
	  
	  //  Base URL without Remote-Parameter in Local-Modus
	  let base = `${API_URL}/api/video/stream?source=${inputSource}&inferenceServerType=${inferenceServerType}`;
	  
	  // Remote-Mode only adds Remote-URL
	  if (inferenceServerType === 'remote' && remoteInferenceUrl) {
		const inferencePort = process.env.REACT_APP_INFERENCE_PORT || '8042';
		const url = new URL(remoteInferenceUrl.startsWith('http') ? remoteInferenceUrl : `https://${remoteInferenceUrl}`);
		url.port = inferencePort;
		base += `&remoteInferenceUrl=${encodeURIComponent(url.toString())}`;
	  }
	  
	  if (inputSource === 'rtsp') {
		base += `&rtspUrl=${encodeURIComponent(rtspUrl)}`;
	  }
	  return base + '&t=' + Date.now();
	}, [inputSource, rtspUrl, inferenceServerType, remoteInferenceUrl]);
	
  const initStream = () => {
    if (status !== 'running' || loading) return;
    const video = videoRef.current;
    const url = getStreamUrl() + `&camera_id=${selectedCamera}`;
    if (!url || !video) return;
    setImageLoaded(false);
    setStreamError(null);
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    if (Hls.isSupported()) {
      const hls = new Hls(hlsConfig);
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.error('Play error:', e));
        setImageLoaded(true);
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStreamError('Network error in HLS stream. Reconnecting...');
              setReconnecting(true);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setStreamError('Media error in HLS stream. Recovering...');
              hls.recoverMediaError();
              break;
            default:
              setStreamError(`HLS error: ${data.details}. Reconnecting...`);
              hls.destroy();
              if (reconnectAttempt.current < MAX_RETRIES) {
                reconnectAttempt.current += 1;
                setTimeout(initStream, BASE_RETRY_DELAY * (2 ** reconnectAttempt.current));
              } else {
                setStreamError('Max retries reached. Check remote service.');
                setReconnecting(false);
              }
              break;
          }
        }
      });
      hlsRef.current = hls;
      hls.startLoad();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.error('Play error:', e));
        setImageLoaded(true);
      });
    } else {
      setStreamError('HLS not supported in this browser.');
    }
    video.addEventListener('error', (e) => {
      setStreamError('Video error: ' + e.message);
      if (reconnectAttempt.current < MAX_RETRIES) {
        reconnectAttempt.current += 1;
        setTimeout(initStream, BASE_RETRY_DELAY * (2 ** reconnectAttempt.current));
      } else {
        setStreamError('Max retries reached. Check remote service.');
        setReconnecting(false);
      }
    });
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      video.src = '';
    };
  };

  useEffect(() => {
    if (status === 'running' && !loading) {
      initStream();
      const logsInterval = setInterval(fetchLogs, 5000);
      const streamTimeout = setTimeout(() => {
        if (!imageLoaded) setStreamError('Stream timeout - Check camera or backend logs');
      }, 120000);
      return () => {
        clearInterval(logsInterval);
        clearTimeout(streamTimeout);
      };
    }
  }, [status, loading, fetchLogs, selectedCamera]);

  const resizeCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getLedColor = () => {
    switch (status) {
      case 'running': return 'green';
      case 'restarting': return 'yellow';
      case 'created':
      case 'exited':
      case 'dead': return 'red';
      default: return 'yellow';
    }
  };

  const getStatusChip = () => {
    const color = status === 'running' ? 'success' :
                  status === 'restarting' ? 'warning' : 'error';
    return (
      <Chip
        label={status.toUpperCase()}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  const getLocalHostLedColor = () => {
    switch (localHostStatus) {
      case 'reachable': return 'green';
      case 'unreachable': return 'red';
      default: return 'yellow';
    }
  };

  const getRemoteHostLedColor = () => {
    switch (remoteHostStatus) {
      case 'reachable': return 'green';
      case 'unreachable': return 'red';
      default: return 'yellow';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Visual Inference
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {inferenceServerType === 'local' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Tooltip
                  title={`Local Host: ${localHostStatus === 'reachable' ? 'Reachable - FastAPI server responding at host.docker.internal:8042' : localHostStatus === 'unreachable' ? 'Unreachable - FastAPI server not responding at host.docker.internal:8042' : 'Not in use or checking availability...'}`}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getLocalHostLedColor(),
                      boxShadow: `0 0 4px ${getLocalHostLedColor()}`,
                    }}
                  />
                </Tooltip>
                <FormControl sx={{ flex: 1, minWidth: 200 }}>
                  <InputLabel>Inference Server</InputLabel>
                  <Select
                    value={inferenceServerType}
                    onChange={(e) => setInferenceServerType(e.target.value)}
                    label="Inference Server"
                    disabled={loading}
                  >
                    <MenuItem value="local">Local</MenuItem>
                    <MenuItem value="remote">Remote</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
            {inferenceServerType === 'remote' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Tooltip
                  title={`Remote Host: ${remoteHostStatus === 'reachable' ? `Reachable - Docker host responding at ${remoteInferenceUrl}` : remoteHostStatus === 'unreachable' ? `Unreachable - Docker host not responding at ${remoteInferenceUrl}` : 'Not in use or checking availability...'}`}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getRemoteHostLedColor(),
                      boxShadow: `0 0 4px ${getRemoteHostLedColor()}`,
                    }}
                  />
                </Tooltip>
                <FormControl sx={{ flex: 1, minWidth: 200 }}>
                  <InputLabel>Inference Server</InputLabel>
                  <Select
                    value={inferenceServerType}
                    onChange={(e) => setInferenceServerType(e.target.value)}
                    label="Inference Server"
                    disabled={loading}
                  >
                    <MenuItem value="local">Local</MenuItem>
                    <MenuItem value="remote">Remote</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Remote Inference URL"
                  value={remoteInferenceUrl}
                  onChange={(e) => setRemoteInferenceUrl(e.target.value)}
                  fullWidth
                  sx={{ flex: 1, minWidth: 200 }}
                  disabled={loading}
                />
                <Button
                  variant="outlined"
                  onClick={() => setShowCertificateModal(true)}
                  sx={{ minWidth: 150}}
                >
                  Upload Certificates
                </Button>
              </Box>
            )}
            <Modal
              open={showCertificateModal}
              onClose={() => setShowCertificateModal(false)}
              aria-labelledby="certificate-modal-title"
              aria-describedby="certificate-modal-description"
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Box
                sx={{
                  width: 400,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 24,
                  p: 4,
                  position: 'relative',
                }}
              >
                <IconButton
                  aria-label="close"
                  onClick={() => setShowCertificateModal(false)}
                  sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                  <CloseIcon />
                </IconButton>
                <Typography id="certificate-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
                  Upload Certificates
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Input type="file" onChange={(e) => setCaFile(e.target.files[0])} />
                    <Typography>CA</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Input type="file" onChange={(e) => setCertFile(e.target.files[0])} />
                    <Typography>Cert</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Input type="file" onChange={(e) => setKeyFile(e.target.files[0])} />
                    <Typography>Key</Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => {
                      handleUploadCertificates();
                      setShowCertificateModal(false);
                    }}
                    sx={{ mt: 2 }}
                  >
                    Upload Certificates
                  </Button>
                </Box>
              </Box>
            </Modal>
            <FormControl fullWidth>
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
              <TextField
                label="RTSP URL"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                fullWidth
                disabled={status === 'running' || loading}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStart}
                disabled={status === 'running' || loading || !containerName}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Start'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleStop}
                disabled={status !== 'running' || loading || !containerName}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Stop'}
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={handleRestart}
                disabled={status !== 'running' || loading || !containerName}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Restart'}
              </Button>
              {containerName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    Container: {containerName}
                  </Typography>
                  <Tooltip
                    title={`Container Status: ${status === 'running' ? 'Running - Container is active and processing' : status === 'restarting' ? 'Restarting - Container is in transition' : status === 'exited' ? 'Exited - Container stopped (check logs for errors)' : 'Unknown - Unable to determine status'}`}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getLedColor(),
                        boxShadow: `0 0 4px ${getLedColor()}`,
                      }}
                    />
                  </Tooltip>
                  {getStatusChip()}
                </Box>
              )}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Updating...</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
      {inputSource === 'rtsp' && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Camera Selection</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Camera</InputLabel>
                  <Select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    label="Select Camera"
                    disabled={status === 'running' || loading}
                  >
                    {cameraOptions.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Edit Selected RTSP URL"
                  value={cameraOptions.find((opt) => opt.id === selectedCamera)?.url || ''}
                  onChange={(e) => updateCameraUrl(selectedCamera, e.target.value)}
                  disabled={status === 'running' || loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Add Custom RTSP URL"
                  value={customRtsp}
                  onChange={(e) => setCustomRtsp(e.target.value)}
                  disabled={status === 'running' || loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={addCustomCamera} disabled={!customRtsp || status === 'running' || loading}>
                          <AddIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
			  </Grid>
            </CardContent>
        </Card>
      )}
      {containerHint && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {containerHint}
        </Alert>
      )}
      {streamError && (
        <Alert
          severity="error"
          onClose={() => setStreamError(null)}
          sx={{ mb: 2 }}
        >
          {streamError}
        </Alert>
      )}
      {parseError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {parseError}
        </Alert>
      )}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ position: 'relative', minHeight: '600px' }}>
            {status === 'running' && !loading ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Inference Stream{inputSource === 'rtsp' ? ` (Camera ${selectedCamera})` : ''}:
                </Typography>
                <Box sx={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    muted
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxWidth: '640px',
                      backgroundColor: 'gray',
                      borderRadius: '4px',
                      objectFit: 'contain',
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  />
                  {reconnecting && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Reconnecting stream...
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8, minHeight: '600px' }}>
                <Typography variant="body1" color="text.secondary">
                  {loading ? 'Starting stream...' : 'Start the container to view inference.'}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Container Logs:
          </Typography>
          <Box
            sx={{
              maxHeight: '420px',
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
                  wordBreak: 'break-all',
                  fontSize: '0.8rem',
                  padding: '10px 0',
                  color: 'white',
                }}
              >
                {logs}
              </pre>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VisualInference;