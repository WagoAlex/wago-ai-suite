// config.js
export const SERVER_NAME = process.env.REACT_APP_SERVER_NAME || 'localhost';
export const INFERENCE_URL = process.env.REACT_APP_INFERENCE_URL || 'localhost';
// MQTT Broker URLs
export const MQTT_BROKER_URL = `wss://${SERVER_NAME}/mqtt`;
export const MQTT_BROKER_URL_DIRECT = `wss://${SERVER_NAME}:9001`;
export const MQTT_BROKER_URL_MQTTS = `mqtts://${SERVER_NAME}:8883`;
export const MQTT_BROKER_URL_WS = `ws://${SERVER_NAME}:1883`;

// N8N Configuration
export const N8N_API_URL = process.env.REACT_APP_N8N_API_URL || '/n8n';
export const N8N_REST_API_KEY = process.env.REACT_APP_N8N_REST_API_KEY || '';
export const N8N_WEBHOOKS = process.env.REACT_APP_WEBHOOK_URL
  ? process.env.REACT_APP_WEBHOOK_URL.split(' ').map(url => 
      url.startsWith('http') ? `${N8N_API_URL}${new URL(url).pathname}` : url
    )
  : [
      `${N8N_API_URL}/webhook-test/invoke_recording`,
      `${N8N_API_URL}/webhook-test/invoke_audio`,
      `${N8N_API_URL}/webhook/e104e40e-6134-4825-a6f0-8a646d882662/chat`,
    ];

// MQTT Topics
export const MQTT_TRANSCRIPTION_TOPIC =
  process.env.REACT_APP_MQTT_TRANSCRIPTION_TOPIC || 'agent/audio/transcription';
export const MQTT_RESPONSE_TOPIC =
  process.env.REACT_APP_MQTT_RESPONSE_TOPIC || 'agent/audio/response';
export const MQTT_INPUT_TOPIC =
  process.env.REACT_APP_MQTT_INPUT_TOPIC || 'agent/audio/input';
export const MQTT_START_TOPIC =
  process.env.REACT_APP_MQTT_START_TOPIC || 'agent/audio/start';
export const MQTT_VOICE_TOPIC =
  process.env.REACT_APP_MQTT_VOICE_TOPIC || 'agent/audio/voice';
export const MQTT_CHAT_INPUT_TOPIC =
  process.env.REACT_APP_MQTT_CHAT_INPUT_TOPIC || 'agent/chat/input';
export const MQTT_CHAT_RESPONSE_TOPIC =
  process.env.REACT_APP_MQTT_CHAT_RESPONSE_TOPIC || 'agent/chat/response';
export const MQTT_PROGRESS_TOPIC =
  process.env.REACT_APP_MQTT_PROGRESS_TOPIC || 'agent/audio/progress';
export const START_PAYLOAD =
  process.env.REACT_APP_START_PAYLOAD || '{"command": "start"}';

// Version
export const VERSION = process.env.REACT_APP_VERSION || '1.0';