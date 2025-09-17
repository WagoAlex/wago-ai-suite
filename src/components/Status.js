import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Link as MuiLink } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import yaml from 'js-yaml';
import { SERVER_NAME } from '../config';

// Fetch container data from the backend API
const fetchContainers = async () => {
  try {
    const response = await fetch('/api/containers');
    if (!response.ok) {
      throw new Error(`Failed to fetch containers: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
};

// In fetchContainerLogs and fetchLatestLog functions
const fetchContainerLogs = async (containerName, setContainerLogs) => {
  try {
    const response = await fetch(`/api/containers/${containerName}/logs?lines=20`);
    if (response.status === 404) {
      setContainerLogs(prev => ({
        ...prev,
        [containerName]: { error: 'Container not found or logs unavailable' }
      }));
      return;
    }
    if (!response.ok) {
      let errMsg = `Failed to fetch logs: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
        if (errData.details) errMsg += ` - ${errData.details}`;
      } catch {} // Fallback if not json
      throw new Error(errMsg);
    }
    const logsText = await response.text();
    const logs = logsText.split('\n').filter(line => line.trim() !== '');
    setContainerLogs(prev => ({ ...prev, [containerName]: { logs } }));
  } catch (error) {
    setContainerLogs(prev => ({ ...prev, [containerName]: { error: error.message } }));
  }
};

const fetchLatestLog = async (containerName, setLatestLogs) => {
  setLatestLogs(prev => ({ ...prev, [containerName]: { loading: true } }));
  try {
    const response = await fetch(`/api/containers/${containerName}/logs?lines=1`);
    if (response.status === 404) {
      setLatestLogs(prev => ({
        ...prev,
        [containerName]: { error: 'Container not found or logs unavailable' }
      }));
      return;
    }
    if (!response.ok) {
      let errMsg = `Failed to fetch log: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
        if (errData.details) errMsg += ` - ${errData.details}`;
      } catch {} // Fallback if not json
      throw new Error(errMsg);
    }
    const log = await response.text();
    setLatestLogs(prev => ({ ...prev, [containerName]: { log } }));
  } catch (error) {
    setLatestLogs(prev => ({ ...prev, [containerName]: { error: error.message } }));
  }
};

function Status() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedContainers, setExpandedContainers] = useState(new Set());
  const [latestLogs, setLatestLogs] = useState({});
  const [containerLogs, setContainerLogs] = useState({});

  useEffect(() => {
    const loadConfigAndContainers = async () => {
      try {
        const configResponse = await fetch('/config/container-patterns.yml');
        if (!configResponse.ok) {
          throw new Error('Failed to fetch config file');
        }
        const configText = await configResponse.text();
        const config = yaml.load(configText);
        const patterns = config.patterns || ["00-30-de", "00-30-DE", "wago-", "mqtt-broker", "x-"];

        const containerData = await fetchContainers();
        const filteredContainers = containerData.filter(container =>
          patterns.some(pattern => container.name.startsWith(pattern))
        );

        setContainers(filteredContainers);
        setError(null);
      } catch (error) {
        console.error('Error loading config or containers:', error);
        setError('Failed to load container data. Please try again later.');
        setContainers([]);
      } finally {
        setLoading(false);
      }
    };

    loadConfigAndContainers();
  }, []);

  const toggleExpand = (containerName) => {
    setExpandedContainers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(containerName)) {
        newSet.delete(containerName);
      } else {
        newSet.add(containerName);
        // Begin loading logs when the container row is expanded
        setContainerLogs(prevLogs => ({ ...prevLogs, [containerName]: { loading: true } }));
        fetchContainerLogs(containerName, setContainerLogs);
      }
      return newSet;
    });
  };

  const renderRow = (container, isExpanded) => (
    <TableRow onClick={() => toggleExpand(container.name)} sx={{ cursor: 'pointer' }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography>{container.name}</Typography>
          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={container.status}
          color={container.status === 'running' ? 'success' : 'error'}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={container.health || 'N/A'}
          color={container.health === 'healthy' ? 'success' : 'warning'}
          variant="outlined"
        />
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 4, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Typography variant="h6" gutterBottom>
          Container Status
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Container Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Health</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {containers.length > 0 ? (
                containers.map((container, index) => {
                  const isExpanded = expandedContainers.has(container.name);
                  return (
                    <React.Fragment key={index}>
                      {isExpanded ? (
                        renderRow(container, true)
                      ) : (
                        <Tooltip
                          title={
                            <Box>
                              {latestLogs[container.name]?.loading ? (
                                <CircularProgress size={20} />
                              ) : latestLogs[container.name]?.log ? (
                                <Typography>{latestLogs[container.name].log}</Typography>
                              ) : latestLogs[container.name]?.error ? (
                                <Typography color="error">{latestLogs[container.name].error}</Typography>
                              ) : (
                                <Typography>Loading...</Typography>
                              )}
                            </Box>
                          }
                          enterDelay={1000}
                          onOpen={() => fetchLatestLog(container.name, setLatestLogs)}
                        >
                          {renderRow(container, false)}
                        </Tooltip>
                      )}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            {containerLogs[container.name]?.loading ? (
                              <CircularProgress />
                            ) : containerLogs[container.name]?.logs ? (
                              <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 2 }}>
                                {containerLogs[container.name].logs.join('\n')}
                              </Box>
                            ) : containerLogs[container.name]?.error ? (
                              <Alert severity="error">{containerLogs[container.name].error}</Alert>
                            ) : (
                              <Typography>No logs available</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No matching containers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <MuiLink
            href={`https://${SERVER_NAME}:9443`}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
          >
            <Button variant="contained">Open Portainer</Button>
          </MuiLink>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Status;