import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { MqttProvider } from './MqttContext'; 

ReactDOM.render(
  <MqttProvider>
    <App />
  </MqttProvider>,
  document.getElementById('root')
);