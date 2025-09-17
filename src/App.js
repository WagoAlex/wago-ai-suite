import React, { useState, useEffect, Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GlobalStyles from '@mui/material/GlobalStyles';
import theme from './theme';
import { MqttProvider } from './MqttContext';
import Layout from './components/Layout';
import Chat from './components/Chat';
import Conversation from './components/Conversation';
import Visualization from './components/Visualization';
import Help from './components/Help';
import Impressum from './components/Impressum';
import Status from './components/Status';
import Analyzer from './components/Analyzer';
import VisualInference from './components/Visual-Inference';
import Model from './components/Model';
import Dataflow from './components/Dataflow';
import Home from './components/Home';
import Nodered from './components/Nodered';
import Automation from './components/Automation';
import LabelStudio from './components/LabelStudio';

import { N8N_REST_API_KEY, N8N_WEBHOOKS, MQTT_BROKER_URL, MQTT_START_TOPIC, SERVER_NAME, INFERENCE_URL } from './config';

const LazyConfiguration = React.lazy(() => import('./components/Configuration'));

function App() {
  const getInitialBrokerUrl = () => {
    const savedBrokerUrl = localStorage.getItem('brokerUrl');
    return savedBrokerUrl || MQTT_BROKER_URL;
  };

  const getInitialStartTopic = () => {
    const savedStartTopic = localStorage.getItem('startTopic');
    return savedStartTopic || MQTT_START_TOPIC;
  };

  const getInitialWebhookUrls = () => {
    const savedWebhookUrls = localStorage.getItem('webhookUrls');
    if (savedWebhookUrls) {
      try {
        const parsed = JSON.parse(savedWebhookUrls);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed.map((url) => {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return url;
            }
            return url.startsWith('/n8n') ? `https://${SERVER_NAME}${url}` : `https://${SERVER_NAME}/n8n${url}`;
          });
        }
      } catch (e) {
        console.error('Failed to parse webhookUrls from local storage:', e);
      }
    }
    const defaultWebhooks = N8N_WEBHOOKS || [
      '/n8n/webhook-test/invoke_a',
      '/n8n/webhook-test/invoke_b',
      '/n8n/webhook-test/c/chat',
    ];
    return defaultWebhooks.map((url) =>
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${SERVER_NAME}${url}`
    );
  };

  const getInitialInferenceServerType = () => {
    return localStorage.getItem('inferenceServerType') || 'local';
  };

  const getInitialRemoteInferenceUrl = () => {
    return localStorage.getItem('remoteInferenceUrl') || INFERENCE_URL || 'https://192.168.2.116:2376';
  };

  const [brokerUrl, setBrokerUrl] = useState(getInitialBrokerUrl());
  const [startTopic, setStartTopic] = useState(getInitialStartTopic());
  const [webhookUrls, setWebhookUrls] = useState(getInitialWebhookUrls());
  const [inferenceServerType, setInferenceServerType] = useState(getInitialInferenceServerType());
  const [remoteInferenceUrl, setRemoteInferenceUrl] = useState(getInitialRemoteInferenceUrl());

  useEffect(() => {
    localStorage.setItem('inferenceServerType', inferenceServerType);
    localStorage.setItem('remoteInferenceUrl', remoteInferenceUrl);
  }, [inferenceServerType, remoteInferenceUrl]);

  const impressumData = {
    companyName: 'WAGO GmbH & Co. KG',
    address: 'Hansastraße 27, 32423 Minden',
    phone: '+49 571 887 - 0',
    email: 'info.de@wago.com',
    registerCourt: 'Amtsgericht Bad Oeynhausen HRA 6218',
    vatId: 'DE 814428979',
    management:
      'Die WAGO GmbH & Co. KG, Sitz Minden, wird vertreten durch die Komplementärin WAGO Beteiligungs GmbH – Sitz: Brunn am Gebirge (Österreich) - Landesgericht Wiener Neustadt, FN 553907w - Niederlassung Minden, diese vertreten durch die Geschäftsführer: Kathrin Fricke, Jürgen Koopsingraven, Dr. Heiner Lang, Christian Sallach, Dr. Sebastian Schatt',
    responsiblePerson: 'Herr Christian Sallach, Hansastr. 27, 32423 Minden',
    responsibleLaw: '§ 18 Abs. 2 MStV (Medienstaatsvertrag)',
    trademarkNote: 'WAGO ist eine eingetragene Marke der WAGO Verwaltungsgesellschaft mbH.',
  };

  const NotFound = () => <h1>404 - Page Not Found</h1>;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={{ a: { color: 'inherit' } }} />
      <MqttProvider brokerUrl={brokerUrl} startTopic={startTopic}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/analyzer" element={<Analyzer />} />
			  
              <Route
                path="/visual-inference"
                element={
                  <VisualInference
                    inferenceServerType={inferenceServerType}
                    setInferenceServerType={setInferenceServerType}
                    remoteInferenceUrl={remoteInferenceUrl}
                    setRemoteInferenceUrl={setRemoteInferenceUrl}
                  />
                }
              />
              <Route path="/model" element={<Model />} />
              //<Route path="/chat" element={<Chat webhookUrls={webhookUrls} />} />
              //<Route path="/conversation" element={<Conversation webhookUrls={webhookUrls} />} />
              //<Route path="/dataflow" element={<Dataflow />} />
              //<Route path="/visualization" element={<Visualization />} />
			  
			  //<Route path="/automation" element={<Automation />} />
			   
			  //<Route path="/Nodered" element={<Nodered />} />
				
			  
              <Route path="/status" element={<Status />} />
              <Route
                path="/configuration"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <LazyConfiguration
                      brokerUrl={brokerUrl}
                      startTopic={startTopic}
                      setBrokerUrl={setBrokerUrl}
                      setStartTopic={setStartTopic}
                      webhookUrls={webhookUrls}
                      setWebhookUrls={setWebhookUrls}
                    />
                  </Suspense>
                }
              />
              <Route path="/help" element={<Help />} />
              <Route path="/impressum" element={<Impressum companyData={impressumData} />} />
			  <Route path="/labelstudio" element={<LabelStudio />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Router>
      </MqttProvider>
    </ThemeProvider>
  );
}

export default App;
