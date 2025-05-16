import React from 'react';
import { Link } from 'react-router-dom'; // Added import for Link
import BurgerMenu from './BurgerMenu';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { useMqtt } from '../MqttContext';
import WagoLogo from '../assets/wago-logo.png'; // Ensure you have this asset in your project

function Layout({ children }) {
  const { connectionStatus, isConnecting, error } = useMqtt();

  // Determine LED color based on MQTT status with case-insensitive check
  const getLedColor = () => {
    if (error) return 'red'; // Error state
    if (isConnecting) return 'yellow'; // Connecting state
    if (connectionStatus && connectionStatus.toLowerCase() === 'connected') return 'green'; // Connected state
    return 'gray'; // Default (disconnected or unknown)
  };

  // Standardize status text (e.g., 'Connected', 'Disconnected')
  const statusText = connectionStatus
    ? connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1).toLowerCase()
    : 'Disconnected';

  return (
    <div>
      <AppBar
        position="static"
        color="default"
        sx={{
          mb: 2,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #d3d7da',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: WAGO Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" title="Go to home page">
              <img
                src={WagoLogo}
                alt="WAGO Logo"
                style={{ height: '40px', marginRight: '10px', cursor: 'pointer' }}
              />
            </Link>
          </Box>

          {/* Center: WAGO AI Suite Title */}
          <Typography variant="h6" sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            WAGO AI Suite
          </Typography>

          {/* Right: MQTT Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getLedColor(),
                boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
              }}
              title={`MQTT Status: ${statusText}${
                isConnecting ? ' (Connecting)' : ''
              }${error ? ` (Error: ${error})` : ''}`}
            />
            <Typography variant="body2">
              MQTT Status: {statusText}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <div style={{ display: 'flex' }}>
        <BurgerMenu />
        <div style={{ flexGrow: 1, padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

export default Layout;