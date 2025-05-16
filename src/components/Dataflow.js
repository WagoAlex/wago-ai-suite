import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { Box, Typography, TextField, Switch, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import { useMqtt } from '../MqttContext';
import { Graph } from 'react-d3-graph';
import { LineChart, Line, XAxis, YAxis } from 'recharts';
import theme from '../theme';

// Permanent Topics
const PERMANENT_TOPICS = [
  'agent/audio/#',
  'inference/#',
  'ContainerManager',
];

// Color Definitions
const WAGO_GREEN = theme.palette.primary.main;    // #6ec800
const LIGHT_GREY = theme.palette.secondary.main;  // #d3d7da
const BLACK = theme.palette.text.primary;         // #333333

// Reducer for Message State
const messageReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        allMessages: [...state.allMessages, action.payload].slice(-100),
      };
    default:
      return state;
  }
};

// Pretty Print JSON for Display
const prettyPrintJson = (jsonString) => {
  try {
    const json = JSON.parse(jsonString);
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return jsonString;
  }
};

// Custom hook for persisted state
function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Failed to parse ${key} from localStorage:`, e);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage:`, e);
    }
  }, [key, value]);

  return [value, setValue];
}

// Default Values
const DEFAULT_NODE_LIMIT = 10;
const DEFAULT_REDUCE_LOAD = false;
const DEFAULT_EXCLUDED_TOPICS = [];

// Dataflow Component
function Dataflow() {
  const { client, connectionStatus } = useMqtt();
  const [state, dispatch] = useReducer(messageReducer, { allMessages: [] });
  const [topics, setTopics] = useState(PERMANENT_TOPICS);
  const [topicsWithMessages, setTopicsWithMessages] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [topicActivity, setTopicActivity] = useState(
    Object.fromEntries(PERMANENT_TOPICS.map(t => [t, Date.now()]))
  );
  const [nodeLimit, setNodeLimit] = usePersistedState('dataflow_nodeLimit', DEFAULT_NODE_LIMIT);
  const [reduceLoad, setReduceLoad] = usePersistedState('dataflow_reduceLoad', DEFAULT_REDUCE_LOAD);
  const [excludedTopics, setExcludedTopics] = usePersistedState('dataflow_excludedTopics', DEFAULT_EXCLUDED_TOPICS);
  const [manageTopicsOpen, setManageTopicsOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredPayload, setHoveredPayload] = useState(null);
  const [activeNodes, setActiveNodes] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Reset to Defaults Function
  const resetToDefaults = () => {
    setNodeLimit(DEFAULT_NODE_LIMIT);
    setReduceLoad(DEFAULT_REDUCE_LOAD);
    setExcludedTopics(DEFAULT_EXCLUDED_TOPICS);
    localStorage.removeItem('dataflow_nodeLimit');
    localStorage.removeItem('dataflow_reduceLoad');
    localStorage.removeItem('dataflow_excludedTopics');
  };

  // MQTT Subscription and Message Handling
  useEffect(() => {
    if (client && connectionStatus === 'Connected') {
      client.subscribe(['agent/#', 'inference/#', 'ContainerManager'], (err) => {
        if (err) console.error('Subscription error:', err);
      });

      const messageHandler = (topic, message) => {
        const newMessage = { topic, message: message.toString(), timestamp: new Date() };
        setTopicsWithMessages(prev => ({ ...prev, [topic]: true }));
        setLastMessages(prev => ({ ...prev, [topic]: newMessage }));
        setTopicActivity(prev => ({ ...prev, [topic]: Date.now() }));
        if (!topics.includes(topic) && !excludedTopics.includes(topic)) {
          setTopics(prev => [...new Set([...prev, topic])]);
        }
        dispatch({ type: 'ADD_MESSAGE', payload: newMessage });

        // Highlight node temporarily when a message is received
        setActiveNodes(prev => ({ ...prev, [topic]: true }));
        setTimeout(() => setActiveNodes(prev => ({ ...prev, [topic]: false })), 1000);
      };

      client.on('message', messageHandler);
      return () => client.removeAllListeners('message');
    }
  }, [client, connectionStatus, topics, excludedTopics]);

  // Periodic Cleanup of Inactive Topics (30 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTopics = topics.filter(topic => {
        const lastActive = topicActivity[topic] || 0;
        return lastActive && (now - lastActive) > 30 * 60 * 1000; // 30 minutes
      });
      if (inactiveTopics.length > 0) {
        setTopics(prev => prev.filter(t => !inactiveTopics.includes(t)));
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [topics, topicActivity]);

  // Track Mouse Position for Hover
  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Compute Graph Data
  const computedGraphData = useMemo(() => {
    const effectiveLimit = reduceLoad ? 5 : nodeLimit;
    const displayedTopics = topics
      .filter(t => !excludedTopics.includes(t))
      .sort((a, b) => (topicActivity[b] || 0) - (topicActivity[a] || 0))
      .slice(0, effectiveLimit);

    const nodes = [
      { id: 'broker', label: 'Broker', color: WAGO_GREEN, size: 60, symbolType: 'circle' },
      ...displayedTopics.map(fullTopic => ({
        id: fullTopic,
        label: fullTopic.startsWith('agent/') ? fullTopic.replace('agent/', '').split('/').join('.') : fullTopic,
        color: activeNodes[fullTopic] ? 'yellow' : BLACK,
        size: 20,
      })),
    ];
    const links = displayedTopics.map(fullTopic => ({ source: 'broker', target: fullTopic }));
    return { nodes, links };
  }, [topics, excludedTopics, topicActivity, activeNodes, reduceLoad, nodeLimit]);

  // Compute Message Frequency (Last 60 Seconds)
  const messageFrequency = useMemo(() => {
    const now = new Date();
    const frequencies = [];
    for (let i = 59; i >= 0; i--) {
      const time = new Date(now - i * 1000);
      const secondKey = time.toISOString().slice(0, 19);
      const count = state.allMessages.filter(msg => msg.timestamp.toISOString().slice(0, 19) === secondKey).length;
      frequencies.push({ time: secondKey.slice(11, 19), messages: count });
    }
    return frequencies;
  }, [state.allMessages]);

  // Component Rendering
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      {/* Control Bar - Right-aligned */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={() => setManageTopicsOpen(true)}>
          Manage Settings
        </Button>
      </Box>

      {/* Messages per Second Trendline */}
      <Box sx={{ mb: 2, width: '100%' }}>
        <Typography variant="h6">Messages per Second</Typography>
        <LineChart width="100%" height={200} data={messageFrequency}>
          <Line type="monotone" dataKey="messages" stroke={WAGO_GREEN} />
          <XAxis dataKey="time" />
          <YAxis />
        </LineChart>
      </Box>

      {/* Graph Section */}
      <Box sx={{ flex: 1, width: '100%', border: '1px solid #e0e0e0', position: 'relative', overflow: 'hidden' }}>
        <Graph
          id="mqtt-graph"
          data={computedGraphData}
          config={{
            nodeHighlightBehavior: false,
            node: { labelProperty: 'label', size: 20 },
            link: { highlightColor: LIGHT_GREY, type: 'STRAIGHT' },
            maxZoom: 2,
            minZoom: 0.5,
            d3: { linkLength: 100, gravity: -150 },
            initialZoom: 1.5,
          }}
          onMouseOverNode={(nodeId) => {
            setHoveredNode(nodeId);
            setHoveredPayload(lastMessages[nodeId]?.message || 'No messages yet');
          }}
          onMouseOutNode={() => {
            setHoveredNode(null);
            setHoveredPayload(null);
          }}
        />
        {hoveredPayload && (
          <Box
            sx={{
              position: 'fixed',
              top: mousePosition.y + 10,
              left: mousePosition.x + 10,
              bgcolor: 'white',
              p: 2,
              borderRadius: 2,
              boxShadow: 3,
              maxWidth: 400,
              maxHeight: 300,
              overflow: 'auto',
              zIndex: 10,
            }}
          >
            <Typography variant="h6">Last Message</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {prettyPrintJson(hoveredPayload)}
            </pre>
          </Box>
        )}
      </Box>

      {/* Manage Settings Dialog */}
      <Dialog open={manageTopicsOpen} onClose={() => setManageTopicsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 1 }}>Node Limit:</Typography>
              <TextField
                type="number"
                value={nodeLimit}
                onChange={(e) => setNodeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1 }}
                sx={{ width: 60 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 1 }}>Reduce Load:</Typography>
              <Switch checked={reduceLoad} onChange={(e) => setReduceLoad(e.target.checked)} />
            </Box>
            <Button variant="outlined" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Included Topics</Typography>
                <List>
                  {topics.filter(t => !excludedTopics.includes(t)).map(topic => (
                    <ListItem key={topic} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ListItemText primary={topic} sx={{ flex: 1 }} />
                      <Button onClick={() => setExcludedTopics(prev => [...prev, topic])}>Exclude</Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Excluded Topics</Typography>
                <List>
                  {excludedTopics.map(topic => (
                    <ListItem key={topic} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ListItemText primary={topic} sx={{ flex: 1 }} />
                      <Button onClick={() => setExcludedTopics(prev => prev.filter(t => t !== topic))}>Include</Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Add Topic"
                variant="outlined"
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newTopic = e.target.value.trim();
                    if (newTopic && !topics.includes(newTopic) && !excludedTopics.includes(newTopic)) {
                      setTopics(prev => [...prev, newTopic]);
                      setTopicActivity(prev => ({ ...prev, [newTopic]: Date.now() }));
                    }
                    e.target.value = '';
                  }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageTopicsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dataflow;