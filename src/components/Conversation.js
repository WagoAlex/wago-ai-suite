import React, { useState, useEffect, useRef } from 'react';
import { useMqtt } from '../MqttContext';
import { Box, Button, Typography, IconButton, LinearProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import { makeStyles } from '@mui/styles';
import {
  MQTT_VOICE_TOPIC,
  MQTT_TRANSCRIPTION_TOPIC,
  MQTT_START_TOPIC,
  START_PAYLOAD,
  MQTT_PROGRESS_TOPIC,
} from '../config';

const useStyles = makeStyles({
  pulse: {
    animation: '$pulse 7s infinite',
  },
  ripple: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,168,150,0.3) 0%, rgba(0,168,150,0.1) 50%, rgba(0,168,150,0) 70%)',
    animation: '$ripple 2s infinite',
  },
  rotate: {
    animation: '$rotate 20s linear infinite',
  },
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },
  '@keyframes ripple': {
    '0%': { transform: 'scale(1)', opacity: 1 },
    '100%': { transform: 'scale(2)', opacity: 0 },
  },
  '@keyframes rotate': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
});

const MobiusStrip = ({ onClick, disabled, isActive, isIdle }) => {
  const classes = useStyles();
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      className={isIdle ? classes.pulse : ''}
      sx={{
        width: isActive ? '400px' : '300px',
        height: isActive ? '400px' : '300px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'scale(1.2)',
        },
      }}
    >
      <svg className={isIdle ? classes.rotate : ''} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: '100%', height: '100%', filter: 'drop-shadow(0 0 10px rgba(0,168,150,0.5))' }}>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#40E0D0" /> {/* Turquoise */}
            <stop offset="100%" stop-color="#00A896" /> {/* WAGO CI Green */}
          </linearGradient>
        </defs>
        <path
          d="M 50,100 Q 75,50 100,100 Q 125,150 150,100 Q 125,50 100,100 Q 75,150 50,100 Z"
          fill="url(#grad)"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      <MicIcon sx={{ fontSize: '5rem', color: 'white', zIndex: 1 }} />
    </Box>
  );
};

const Conversation = ({ webhookUrls }) => {
  const { client, connectionStatus, error } = useMqtt();
  const [interactionState, setInteractionState] = useState('idle');
  const [transcription, setTranscription] = useState('');
  const [audioSrc, setAudioSrc] = useState(null);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const audioRef = useRef(new Audio());
  const classes = useStyles();

  const progressMap = {
    'recording': 25,
    'transcribing': 50,
    'generating audio': 75,
    'complete': 100,
  };

  useEffect(() => {
    if (!client || connectionStatus !== 'Connected') return;

    const handleTranscription = (topic, message) => {
      const msg = JSON.parse(message.toString());
      setTranscription(msg.transcription);
      setInteractionState('processing');
    };

    const handleVoice = (topic, message) => {
      const msg = JSON.parse(message.toString());
      const audioUrl = msg.audioUrl?.endsWith('.mp3') ? msg.audioUrl : null;
      if (audioUrl) {
        setAudioSrc(audioUrl);
        setInteractionState('responding');
        setShowPlayButton(true);
      }
    };

    const handleProgress = (topic, message) => {
      const msg = JSON.parse(message.toString());
      const progressText = msg.message?.toLowerCase() || 'Processing...';
      setProgressMessage(progressText);
      const value = progressMap[progressText] || 0;
      setProgressValue(value);
      if (value === 100) {
        setTimeout(() => {
          setInteractionState('idle');
          setTranscription('');
          setProgressMessage('');
          setProgressValue(0);
        }, 1000);
      }
    };

    client.subscribe(MQTT_TRANSCRIPTION_TOPIC);
    client.subscribe(MQTT_VOICE_TOPIC);
    client.subscribe(MQTT_PROGRESS_TOPIC);
    client.on('message', (topic, message) => {
      if (topic === MQTT_TRANSCRIPTION_TOPIC) handleTranscription(topic, message);
      if (topic === MQTT_VOICE_TOPIC) handleVoice(topic, message);
      if (topic === MQTT_PROGRESS_TOPIC) handleProgress(topic, message);
    });

    return () => {
      client.unsubscribe(MQTT_TRANSCRIPTION_TOPIC);
      client.unsubscribe(MQTT_VOICE_TOPIC);
      client.unsubscribe(MQTT_PROGRESS_TOPIC);
    };
  }, [client, connectionStatus]);

  useEffect(() => {
    let timeoutId;
    if (interactionState === 'processing') {
      timeoutId = setTimeout(() => {
        setInteractionState('idle');
        setTranscription('');
        setProgressMessage('');
        setProgressValue(0);
      }, 120000);
    }
    return () => clearTimeout(timeoutId);
  }, [interactionState]);

  useEffect(() => {
    if (!audioSrc) return;

    const audio = audioRef.current;
    audio.src = audioSrc;

    audio.onended = () => {
      setIsPlaying(false);
      setInteractionState('idle');
      setShowPlayButton(false);
    };

    return () => {
      audio.pause();
    };
  }, [audioSrc]);

  const handleStartRecording = () => {
    if (interactionState === 'idle' && client && connectionStatus === 'Connected') {
      client.publish(MQTT_START_TOPIC, START_PAYLOAD);
      setInteractionState('listening');
      setProgressValue(10);
      setProgressMessage('Starting...');
      setTimeout(() => {
        if (interactionState === 'listening') setInteractionState('processing');
      }, 10000);
    }
  };

  const handlePlayLatestAudio = async () => {
    try {
      const response = await fetch('/api/latest-audio');
      if (!response.ok) throw new Error('Failed to fetch latest audio');
      const data = await response.json();
      if (!data.url) throw new Error('No audio URL returned');
      setAudioSrc(data.url);
      setInteractionState('responding');
      setShowPlayButton(true);
    } catch (error) {
      console.error('Error fetching latest audio:', error);
      setTranscription('Failed to load the latest audio file. Please try again.');
    }
  };

  const handlePlayAudio = () => {
    audioRef.current.play().then(() => setIsPlaying(true)).catch((error) => console.error('Error playing audio:', error));
  };

  const handlePauseAudio = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleStopAudio = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const handleAbort = () => {
    if (client) {
      client.publish('agent/audio/abort', JSON.stringify({ command: 'abort' }));
      setInteractionState('idle');
      setTranscription('');
      setProgressMessage('');
      setProgressValue(0);
      setAudioSrc(null);
      setShowPlayButton(false);
      setIsPlaying(false);
    }
  };

  const rippleStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '75px',
    height: '75px',
    marginTop: '-37.5px',
    marginLeft: '-37.5px',
  };

  if (connectionStatus !== 'Connected') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
        <Typography variant="h6">MQTT {connectionStatus}</Typography>
        {error && <Typography color="error">{error}</Typography>}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center', textAlign: 'center', py: 4 }}>
      <Box sx={{ position: 'relative', width: '400px', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {interactionState === 'idle' && (
          <>
            <Box className={classes.ripple} sx={{ ...rippleStyles, animationDelay: '0s' }} />
            <Box className={classes.ripple} sx={{ ...rippleStyles, animationDelay: '0.4s' }} />
            <Box className={classes.ripple} sx={{ ...rippleStyles, animationDelay: '0.8s' }} />
            <Box className={classes.ripple} sx={{ ...rippleStyles, animationDelay: '1.2s' }} />
            <Box className={classes.ripple} sx={{ ...rippleStyles, animationDelay: '1.6s' }} />
          </>
        )}
        <MobiusStrip
          onClick={handleStartRecording}
          disabled={interactionState !== 'idle'}
          isActive={interactionState === 'listening' || interactionState === 'processing'}
          isIdle={interactionState === 'idle'}
        />
      </Box>

      <Box sx={{ width: '200px', mt: 2 }}>
        {['listening', 'processing'].includes(interactionState) && (
          <>
            <LinearProgress
              variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
              value={progressValue}
              sx={{ bgcolor: '#6ec800', '& .MuiLinearProgress-bar': { bgcolor: '#5aa700' } }}
            />
            <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
              {progressMessage || 'Processing...'}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          onClick={handlePlayLatestAudio}
          sx={{
            mr: 2,
            backgroundColor: '#00A896',
            '&:hover': { backgroundColor: '#009383' },
            color: '#ffffff',
          }}
        >
          Play Latest Audio
        </Button>
        {showPlayButton && (
          <Box sx={{ display: 'inline-flex' }}>
            <IconButton onClick={handlePlayAudio} disabled