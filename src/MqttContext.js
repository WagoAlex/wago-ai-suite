import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { MQTT_BROKER_URL, MQTT_START_TOPIC } from './config';

const MqttContext = createContext();

export function MqttProvider({ children, brokerUrl = MQTT_BROKER_URL, startTopic = MQTT_START_TOPIC }) {
  const [client, setClient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [error, setError] = useState(null);

  useEffect(() => {
    const mqttClient = mqtt.connect(brokerUrl, {
      reconnectPeriod: 1000, // Retry every 1 second if disconnected
      connectTimeout: 30 * 1000, // Timeout after 30 seconds
    });

    mqttClient.on('connect', () => {
      setConnectionStatus('Connected');
      setError(null);
      mqttClient.subscribe(startTopic, (err) => {
        if (err) {
          console.error('Subscription error:', err);
          setError(err.message);
        }
      });
    });

    mqttClient.on('error', (err) => {
      setConnectionStatus('Error');
      setError(err.message);
      console.error('MQTT Error:', err);
    });

    mqttClient.on('close', () => {
      setConnectionStatus('Disconnected');
      setError(null);
    });

    mqttClient.on('reconnect', () => {
      setConnectionStatus('Reconnecting');
    });

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, [brokerUrl, startTopic]);

  return (
    <MqttContext.Provider value={{ client, connectionStatus, error }}>
      {children}
    </MqttContext.Provider>
  );
}

export const useMqtt = () => useContext(MqttContext);