import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh', // Full-screen height
        backgroundColor: '#f0f0f0', // Light gray background (not from theme)
        textAlign: 'center',
        padding: 4,
      }}
    >
      <Typography
        variant="h2"
        sx={{
          color: 'primary.main', // WAGO Green (#6ec800)
          fontWeight: 'bold',
          marginBottom: 2,
        }}
      >
        Welcome to WAGO AI Suite
      </Typography>
      <Typography
        variant="h5"
        sx={{
          color: 'text.primary', // Dark gray (#333333)
          marginBottom: 4,
        }}
      >
        Empowering Innovation with AI-Driven Insights
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap', // Responsive button wrapping
          justifyContent: 'center',
          gap: 2, // Consistent spacing
        }}
      >
        <Button variant="contained" component={Link} to="/dataflow">
          Explore Dataflow
        </Button>
        <Button variant="contained" component={Link} to="/conversation">
          Start a Conversation
        </Button>
        <Button variant="contained" component={Link} to="/chat">
          Start Chatting with Your Machine
        </Button>
        <Button variant="contained" component={Link} to="/visualization">
          View Visualizations
        </Button>
        <Button variant="contained" component={Link} to="/status">
          Check Status
        </Button>
      </Box>
    </Box>
  );
}

export default Home;