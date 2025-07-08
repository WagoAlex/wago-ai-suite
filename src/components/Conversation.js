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
  pulseOrb: {
    animation: '$pulseOrb 3s ease-in-out infinite',
  },
  rippleEffect: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,168,150,0.4) 0%, rgba(0,168,150,0.2) 40%, rgba(0,168,150,0) 70%)',
    animation: '$rippleOrb 2.5s infinite',
  },
  rotateGlow: {
    animation: '$rotateGlow 8s linear infinite',
  },
  breathing: {
    animation: '$breathing 4s ease-in-out infinite',
  },
  '@keyframes pulseOrb': {
    '0%': { 
      transform: 'scale(1)',
      boxShadow: '0 0 30px rgba(0,168,150,0.6), 0 0 60px rgba(0,168,150,0.3)'
    },
    '50%': { 
      transform: 'scale(1.08)',
      boxShadow: '0 0 50px rgba(0,168,150,0.8), 0 0 100px rgba(0,168,150,0.4)'
    },
    '100%': { 
      transform: 'scale(1)',
      boxShadow: '0 0 30px rgba(0,168,150,0.6), 0 0 60px rgba(0,168,150,0.3)'
    },
  },
  '@keyframes rippleOrb': {
    '0%': { 
      transform: 'scale(0.8)', 
      opacity: 0.8 
    },
    '50%': { 
      transform: 'scale(1.2)', 
      opacity: 0.4 
    },
    '100%': { 
      transform: 'scale(1.8)', 
      opacity: 0 
    },
  },
  '@keyframes rotateGlow': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '@keyframes breathing': {
    '0%': { 
      transform: 'scale(1) rotate(0deg)',
      filter: 'brightness(1) hue-rotate(0deg)'
    },
    '25%': { 
      transform: 'scale(1.05) rotate(90deg)',
      filter: 'brightness(1.1) hue-rotate(15deg)'
    },
    '50%': { 
      transform: 'scale(1.1) rotate(180deg)',
      filter: 'brightness(1.2) hue-rotate(30deg)'
    },
    '75%': { 
      transform: 'scale(1.05) rotate(270deg)',
      filter: 'brightness(1.1) hue-rotate(15deg)'
    },
    '100%': { 
      transform: 'scale(1) rotate(360deg)',
      filter: 'brightness(1) hue-rotate(0deg)'
    },
  },
});

const BeautifulOrb = ({ onClick, disabled, isActive, isIdle, interactionState }) => {
  const classes = useStyles();
  
  const getOrbState = () => {
    if (interactionState === 'listening') return 'listening';
    if (interactionState === 'processing') return 'processing';
    if (interactionState === 'responding') return 'responding';
    return 'idle';
  };
  
  const orbState = getOrbState();
  
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      className={isIdle ? classes.pulseOrb : ''}
      sx={{
        width: isActive ? '320px' : '280px',
        height: isActive ? '320px' : '280px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '50%',
        background: orbState === 'listening' 
          ? 'radial-gradient(circle at 30% 30%, #FFD700, #FFA500, #FF6347, #00A896)'
          : orbState === 'processing'
          ? 'radial-gradient(circle at 30% 30%, #40E0D0, #00CED1, #20B2AA, #008B8B)'
          : orbState === 'responding'
          ? 'radial-gradient(circle at 30% 30%, #98FB98, #90EE90, #32CD32, #228B22)'
          : 'radial-gradient(circle at 30% 30%, #40E0D0, #00A896, #008B8B, #006666)',
        boxShadow: isActive 
          ? '0 0 60px rgba(0,168,150,0.8), 0 0 120px rgba(0,168,150,0.4), inset 0 0 60px rgba(255,255,255,0.1)'
          : '0 0 40px rgba(0,168,150,0.6), 0 0 80px rgba(0,168,150,0.3), inset 0 0 40px rgba(255,255,255,0.1)',
        '&:hover': {
          transform: disabled ? 'none' : 'scale(1.1)',
          boxShadow: '0 0 80px rgba(0,168,150,0.9), 0 0 160px rgba(0,168,150,0.5), inset 0 0 80px rgba(255,255,255,0.2)',
        },
        '&:active': {
          transform: disabled ? 'none' : 'scale(0.95)',
        },
      }}
    >
      {/* Outer glow ring */}
      <Box
        className={isActive ? classes.rotateGlow : ''}
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '2px solid transparent',
          background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent, rgba(0,168,150,0.3))',
          backgroundClip: 'border-box',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            bottom: '2px',
            borderRadius: '50%',
            background: 'transparent',
          }
        }}
      />
      
      {/* Inner orb with glassmorphism effect */}
      <Box
        className={orbState === 'processing' ? classes.breathing : ''}
        sx={{
          width: '85%',
          height: '85%',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 50%, transparent 70%)',
            filter: 'blur(2px)',
          }
        }}
      >
        <MicIcon 
          sx={{ 
            fontSize: isActive ? '4rem' : '3.5rem',
            color: 'white',
            zIndex: 2,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
            transition: 'all 0.3s ease',
          }} 
        />
      </Box>
      
      {/* Floating particles */}
      {isActive && (
        <>
          <Box
            sx={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              top: '20%',
              left: '30%',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-15px)' },
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.6)',
              top: '70%',
              right: '25%',
              animation: 'float 4s ease-in-out infinite 1s',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              bottom: '30%',
              left: '70%',
              animation: 'float 2.5s ease-in-out infinite 0.5s',
            }}
          />
        </>
      )}
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
    width: '100px',
    height: '100px',
    marginTop: '-50px',
    marginLeft: '-50px',
  };

  if (connectionStatus !== 'Connected') {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
          MQTT {connectionStatus}
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: '100vh', 
      justifyContent: 'center', 
      textAlign: 'center', 
      py: 4,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
        pointerEvents: 'none',
      }
    }}>
      <Box sx={{ 
        position: 'relative', 
        width: '400px', 
        height: '400px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        zIndex: 1,
      }}>
        {interactionState === 'idle' && (
          <>
            <Box className={classes.rippleEffect} sx={{ ...rippleStyles, animationDelay: '0s' }} />
            <Box className={classes.rippleEffect} sx={{ ...rippleStyles, animationDelay: '0.6s' }} />
            <Box className={classes.rippleEffect} sx={{ ...rippleStyles, animationDelay: '1.2s' }} />
            <Box className={classes.rippleEffect} sx={{ ...rippleStyles, animationDelay: '1.8s' }} />
          </>
        )}
        <BeautifulOrb
          onClick={handleStartRecording}
          disabled={interactionState !== 'idle'}
          isActive={interactionState === 'listening' || interactionState === 'processing'}
          isIdle={interactionState === 'idle'}
          interactionState={interactionState}
        />
      </Box>

      <Box sx={{ width: '300px', mt: 3, zIndex: 1 }}>
        {['listening', 'processing'].includes(interactionState) && (
          <>
            <LinearProgress
              variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
              value={progressValue}
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                height: '8px',
                '& .MuiLinearProgress-bar': { 
                  bgcolor: 'linear-gradient(90deg, #40E0D0, #00A896)',
                  borderRadius: '10px',
                } 
              }}
            />
            <Typography variant="body2" sx={{ 
              mt: 2, 
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {progressMessage || 'Processing...'}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ mt: 4, zIndex: 1 }}>
        <Button
          variant="contained"
          onClick={handlePlayLatestAudio}
          sx={{
            mr: 2,
            backgroundColor: 'rgba(0, 168, 150, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '25px',
            px: 3,
            py: 1.5,
            '&:hover': { 
              backgroundColor: 'rgba(0, 147, 131, 0.9)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(0, 168, 150, 0.3)',
            },
            color: '#ffffff',
            fontWeight: 600,
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Play Latest Audio
        </Button>
        
        {showPlayButton && (
          <Box sx={{ display: 'inline-flex', gap: 1 }}>
            <IconButton 
              onClick={handlePlayAudio} 
              disabled={isPlaying}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <PlayArrowIcon />
            </IconButton>
            
            <IconButton 
              onClick={handlePauseAudio} 
              disabled={!isPlaying}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <PauseIcon />
            </IconButton>
            
            <IconButton 
              onClick={handleStopAudio}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <StopIcon />
            </IconButton>
          </Box>
        )}
        
        {interactionState !== 'idle' && (
          <Button
            variant="outlined"
            onClick={handleAbort}
            sx={{
              ml: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              borderRadius: '25px',
              px: 3,
              py: 1.5,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-2px)',
              },
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Abort
          </Button>
        )}
      </Box>

      {transcription && (
        <Box sx={{ 
          mt: 4, 
          p: 3, 
          maxWidth: '600px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(15px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          zIndex: 1,
        }}>
          <Typography variant="h6" sx={{ 
            color: 'white', 
            mb: 2,
            fontWeight: 600,
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            Transcription
          </Typography>
          <Typography variant="body1" sx={{ 
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.6,
          }}>
            {transcription}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Conversation;