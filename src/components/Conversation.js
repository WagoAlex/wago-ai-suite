import React, { useState, useEffect, useRef, memo } from 'react';
import { useMqtt } from '../MqttContext';
import { Box, Button, Typography, IconButton, LinearProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import { makeStyles, useTheme } from '@mui/styles';
import throttle from 'lodash/throttle'; // Added for performance
import DOMPurify from 'dompurify'; // Added for XSS safety
import ErrorBoundary from './ErrorBoundary'; // New for robustness
import {
  MQTT_VOICE_TOPIC,
  MQTT_TRANSCRIPTION_TOPIC,
  MQTT_START_TOPIC,
  START_PAYLOAD,
  MQTT_PROGRESS_TOPIC,
} from '../config';

const useStyles = makeStyles((theme) => ({
  pulseOrb: {
    animation: '$pulseOrb 3s ease-in-out infinite',
    background: `radial-gradient(circle, ${theme.palette.primary.main} 0%, rgba(110,200,0,0.2) 70%)`, // WAGO green gradient
  },
  rippleEffect: {
    position: 'absolute',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${theme.palette.primary.main}0.4 0%, rgba(110,200,0,0.2) 40%, rgba(110,200,0,0) 70%)`, // Themed green
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
      boxShadow: `0 0 30px ${theme.palette.primary.main}0.6, 0 0 60px ${theme.palette.primary.main}0.3`,
    },
    '50%': {
      transform: 'scale(1.08)',
      boxShadow: `0 0 50px ${theme.palette.primary.main}0.8, 0 0 100px ${theme.palette.primary.main}0.4`,
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: `0 0 30px ${theme.palette.primary.main}0.6, 0 0 60px ${theme.palette.primary.main}0.3`,
    },
  },
  '@keyframes rippleOrb': {
    '0%': {
      transform: 'scale(0.8)',
      opacity: 0.8,
    },
    '50%': {
      transform: 'scale(1.2)',
      opacity: 0.4,
    },
    '100%': {
      transform: 'scale(1.8)',
      opacity: 0,
    },
  },
  '@keyframes rotateGlow': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '@keyframes breathing': {
    '0%': {
      transform: 'scale(1) rotate(0deg)',
      filter: 'brightness(1) hue-rotate(0deg)',
    },
    '25%': {
      transform: 'scale(1.05) rotate(90deg)',
      filter: 'brightness(1.1) hue-rotate(15deg)',
    },
    '50%': {
      transform: 'scale(1.1) rotate(180deg)',
      filter: 'brightness(1.2) hue-rotate(30deg)',
    },
    '75%': {
      transform: 'scale(1.05) rotate(270deg)',
      filter: 'brightness(1.1) hue-rotate(15deg)',
    },
    '100%': {
      transform: 'scale(1) rotate(360deg)',
      filter: 'brightness(1) hue-rotate(0deg)',
    },
  },
}));

const BeautifulOrb = memo(({ onClick, disabled, isActive, isIdle, interactionState }) => {
  const classes = useStyles();
  const theme = useTheme();

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
          ? `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}, #FFA500, #FF6347, ${theme.palette.secondary.main})`
          : orbState === 'processing'
          ? `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}, #00CED1, #20B2AA, ${theme.palette.secondary.main})`
          : orbState === 'responding'
          ? `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}, #90EE90, #32CD32, ${theme.palette.secondary.main})`
          : `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, #008B8B, #006666)`,
        boxShadow: isActive
          ? `0 0 60px ${theme.palette.primary.main}0.8, 0 0 120px ${theme.palette.primary.main}0.4, inset 0 0 60px rgba(255,255,255,0.1)`
          : `0 0 40px ${theme.palette.primary.main}0.6, 0 0 80px ${theme.palette.primary.main}0.3, inset 0 0 40px rgba(255,255,255,0.1)`,
        '&:hover': {
          transform: disabled ? 'none' : 'scale(1.1)',
          boxShadow: `0 0 80px ${theme.palette.primary.main}0.9, 0 0 160px ${theme.palette.primary.main}0.5, inset 0 0 80px rgba(255,255,255,0.2)`,
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
          background: `linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent, ${theme.palette.primary.main}0.3)`,
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
          },
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
          },
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
              },
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
});

const Conversation = ({ webhookUrls }) => {
  const { client, connectionStatus, error } = useMqtt();
  const [interactionState, setInteractionState] = useState('idle');
  const [transcription, setTranscription] = useState('');
  const [audioSrc, setAudioSrc] = useState(null);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [fetchError, setFetchError] = useState(null); // Added for error handling
  const audioRef = useRef(new Audio());
  const theme = useTheme(); // Added for WAGO theme integration
  const classes = useStyles();

  const progressMap = {
    recording: 25,
    transcribing: 50,
    'generating audio': 75,
    complete: 100,
  };

  useEffect(() => {
    if (!client || connectionStatus !== 'Connected') return;

    const handleMessage = throttle((topic, message) => {
      const timestamp = new Date().toISOString();
      let msg;
      try {
        msg = JSON.parse(message.toString());
      } catch (e) {
        console.error(`[MQTT ${timestamp}] Parse error on topic ${topic}: ${e.message}`);
        return;
      }
      console.debug(`[MQTT ${timestamp}] Topic: ${topic}, Payload:`, msg); // Structured log

      if (topic === MQTT_TRANSCRIPTION_TOPIC) {
        setTranscription(DOMPurify.sanitize(msg.transcription)); // Sanitize for XSS
        setInteractionState('processing');
      } else if (topic === MQTT_VOICE_TOPIC) {
        const audioUrl = msg.audioUrl?.endsWith('.mp3') ? msg.audioUrl : null;
        if (audioUrl) {
          setAudioSrc(audioUrl);
          setInteractionState('responding');
          setShowPlayButton(true);
        }
      } else if (topic === MQTT_PROGRESS_TOPIC) {
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
      }
    }, 200); // Throttle for scalability

    client.subscribe(MQTT_TRANSCRIPTION_TOPIC, (err) => {
      if (err) console.error(`[MQTT ${new Date().toISOString()}] Subscribe error for ${MQTT_TRANSCRIPTION_TOPIC}: ${err.message}`);
    });
    client.subscribe(MQTT_VOICE_TOPIC, (err) => {
      if (err) console.error(`[MQTT ${new Date().toISOString()}] Subscribe error for ${MQTT_VOICE_TOPIC}: ${err.message}`);
    });
    client.subscribe(MQTT_PROGRESS_TOPIC, (err) => {
      if (err) console.error(`[MQTT ${new Date().toISOString()}] Subscribe error for ${MQTT_PROGRESS_TOPIC}: ${err.message}`);
    });

    client.on('message', handleMessage);

    return () => {
      client.off('message', handleMessage);
      client.unsubscribe([MQTT_TRANSCRIPTION_TOPIC, MQTT_VOICE_TOPIC, MQTT_PROGRESS_TOPIC], (err) => {
        if (err) console.error(`[MQTT ${new Date().toISOString()}] Unsubscribe error: ${err.message}`);
      });
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
        console.debug(`[State ${new Date().toISOString()}] Processing timed out, reset to idle`);
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
      console.debug(`[Audio ${new Date().toISOString()}] Playback ended`);
    };
    return () => {
      audio.pause();
      console.debug(`[Audio ${new Date().toISOString()}] Audio paused on cleanup`);
    };
  }, [audioSrc]);

  const retryOperation = async (fn, retries = 3, operationName = 'Operation') => {
    for (let i = 0; i < retries; i++) {
      try {
        await fn();
        console.debug(`[${operationName} ${new Date().toISOString()}] Attempt ${i + 1} successful`);
        return;
      } catch (e) {
        console.warn(`[${operationName} ${new Date().toISOString()}] Attempt ${i + 1}/${retries} failed: ${e.message}`);
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw new Error(`${operationName} failed after ${retries} retries`);
  };

  const handleStartRecording = () => {
    if (interactionState !== 'idle' || !client || connectionStatus !== 'Connected') {
      console.debug(`[Recording ${new Date().toISOString()}] Skipped: state=${interactionState}, connection=${connectionStatus}`);
      return;
    }

    const publishStart = async () => {
      client.publish(MQTT_START_TOPIC, START_PAYLOAD);
      setInteractionState('listening');
      setProgressValue(10);
      setProgressMessage('Starting...');
      setTimeout(() => {
        if (interactionState === 'listening') {
          setInteractionState('processing');
          console.debug(`[State ${new Date().toISOString()}] Transitioned to processing`);
        }
      }, 10000);
    };

    retryOperation(publishStart, 3, 'StartRecording').catch((err) => {
      setFetchError(err.message);
      console.error(`[Recording ${new Date().toISOString()}] Failed: ${err.message}`);
    });
  };

  const handlePlayLatestAudio = async () => {
    const fetchAudio = async () => {
      const response = await fetch('/api/latest-audio');
      if (!response.ok) throw new Error('Failed to fetch latest audio');
      const data = await response.json();
      if (!data.url) throw new Error('No audio URL returned');
      setAudioSrc(data.url);
      setInteractionState('responding');
      setShowPlayButton(true);
    };

    retryOperation(fetchAudio, 3, 'FetchLatestAudio').catch((err) => {
      setFetchError('Failed to load the latest audio file. Please try again.');
      console.error(`[AudioFetch ${new Date().toISOString()}] Failed: ${err.message}`);
    });
  };

  const handlePlayAudio = () => {
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        console.debug(`[Audio ${new Date().toISOString()}] Playing audio: ${audioSrc}`);
      })
      .catch((error) => {
        console.error(`[Audio ${new Date().toISOString()}] Play error: ${error.message}`);
        setFetchError('Error playing audio');
      });
  };

  const handlePauseAudio = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    console.debug(`[Audio ${new Date().toISOString()}] Paused audio`);
  };

  const handleStopAudio = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    console.debug(`[Audio ${new Date().toISOString()}] Stopped audio`);
  };

  const handleAbort = () => {
    if (client) {
      const abortPublish = async () => {
        client.publish('agent/audio/abort', JSON.stringify({ command: 'abort' }));
        setInteractionState('idle');
        setTranscription('');
        setProgressMessage('');
        setProgressValue(0);
        setAudioSrc(null);
        setShowPlayButton(false);
        setIsPlaying(false);
        console.debug(`[Abort ${new Date().toISOString()}] Aborted conversation`);
      };

      retryOperation(abortPublish, 3, 'Abort').catch((err) => {
        setFetchError(err.message);
        console.error(`[Abort ${new Date().toISOString()}] Failed: ${err.message}`);
      });
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
      <ErrorBoundary>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, // WAGO theme
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              mb: 2,
              textTransform: 'uppercase', // WAGO theme typography
              fontWeight: 600,
            }}
          >
            MQTT {connectionStatus}
          </Typography>
          {error && (
            <Typography color="error" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              {error}
            </Typography>
          )}
        </Box>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
          textAlign: 'center',
          py: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, // WAGO theme
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 80%, ${theme.palette.primary.main}0.3 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${theme.palette.secondary.main}0.3 0%, transparent 50%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '400px',
            height: '400px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
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
                  bgcolor: theme.palette.secondary.main, // WAGO theme
                  borderRadius: '10px',
                  height: '8px',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, // WAGO theme
                    borderRadius: '10px',
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 600, // WAGO theme
                  textTransform: 'uppercase', // WAGO theme
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
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
              backgroundColor: theme.palette.primary.main, // WAGO green
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.secondary.main}`, // WAGO secondary
              borderRadius: '25px',
              px: 3,
              py: 1.5,
              textTransform: 'uppercase', // WAGO theme
              fontWeight: 600, // WAGO theme
              color: '#ffffff',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark, // WAGO dark green
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 25px ${theme.palette.primary.main}0.3`,
              },
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
                    backgroundColor: theme.palette.secondary.main, // WAGO secondary
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
                    backgroundColor: theme.palette.secondary.main, // WAGO secondary
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
                    backgroundColor: theme.palette.secondary.main, // WAGO secondary
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
                borderColor: theme.palette.secondary.main, // WAGO secondary
                color: 'white',
                backdropFilter: 'blur(10px)',
                borderRadius: '25px',
                px: 3,
                py: 1.5,
                textTransform: 'uppercase', // WAGO theme
                fontWeight: 600, // WAGO theme
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: theme.palette.secondary.main, // WAGO secondary
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Abort
            </Button>
          )}
        </Box>
        {(transcription || fetchError) && (
          <Box
            sx={{
              mt: 4,
              p: 3,
              maxWidth: '600px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(15px)',
              borderRadius: '20px',
              border: `1px solid ${theme.palette.secondary.main}`, // WAGO secondary
              zIndex: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                mb: 2,
                fontWeight: 600, // WAGO theme
                textTransform: 'uppercase', // WAGO theme
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {fetchError ? 'Error' : 'Transcription'}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
                textTransform: fetchError ? 'uppercase' : 'none', // WAGO theme for errors
                fontWeight: fetchError ? 600 : 'normal', // WAGO theme for errors
              }}
            >
              {fetchError || transcription}
            </Typography>
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default Conversation;