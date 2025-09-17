import React from 'react';
import { Box } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
  pulse: {
    animation: '$pulse 7s infinite',
  },
  rotate: {
    animation: '$rotate 10s linear infinite',
  },
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
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
          transform: 'scale(1.2)', // 20% larger on hover
        },
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className={isIdle ? classes.rotate : ''}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      >
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#f8f8ff ', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#d3d3d3 ', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          d="M10,50 Q50,10 90,50 Q50,90 10,50 Z"
          fill="url(#grad)"
        />
      </svg>
      <MicIcon sx={{ fontSize: '5rem', color: 'white', zIndex: 1 }} />
    </Box>
  );
};

export default MobiusStrip;