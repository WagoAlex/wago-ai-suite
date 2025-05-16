import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function Analyzer() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [netronReady, setNetronReady] = useState(false);
  const viewerRef = useRef(null);
  const modelUrlRef = useRef(null);
  const iframeRef = useRef(null);

  const handleFileSelection = (uploadedFile) => {
    if (!uploadedFile) return;
    
    if (!uploadedFile.name.endsWith('.onnx')) {
      setError('Please upload a valid .onnx file');
      return;
    }
    
    setFile(uploadedFile);
    setError(null);
    setLoading(true);
    
    if (modelUrlRef.current) {
      URL.revokeObjectURL(modelUrlRef.current);
    }
    
    const modelUrl = URL.createObjectURL(uploadedFile);
    modelUrlRef.current = modelUrl;
    
    if (iframeRef.current) {
      iframeRef.current.src = `/netron/index.html?url=${encodeURIComponent(modelUrl)}`;
      
      iframeRef.current.onload = () => {
        setLoading(false);
        setNetronReady(true);
      };
      
      iframeRef.current.onerror = () => {
        setError('Failed to load the Netron viewer');
        setLoading(false);
      };
    }
  };

  // Add useEffect to load a default model on page load
  useEffect(() => {
    // Option 1: Load from a URL
    const loadDefaultModel = async () => {
      try {
        // Replace with your default ONNX file URL
        const defaultModelUrl = 'path/to/your/default/model.onnx';
        const response = await fetch(defaultModelUrl);
        const blob = await response.blob();
        const defaultFile = new File([blob], 'default_model.onnx', { type: 'application/octet-stream' });
        handleFileSelection(defaultFile);
      } catch (err) {
        setError('Failed to load default model');
        setLoading(false);
      }
    };

    // Only load if no file is selected yet
    if (!file) {
      loadDefaultModel();
    }

    // Cleanup
    return () => {
      if (modelUrlRef.current) {
        URL.revokeObjectURL(modelUrlRef.current);
        modelUrlRef.current = null;
      }
    };
  }, []); // Empty dependency array means it runs once on mount

  const handleButtonUpload = (event) => {
    const uploadedFile = event.target.files[0];
    handleFileSelection(uploadedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />}
      
      <Card sx={{ mt: 2, overflow: 'hidden', display: file ? 'block' : 'none' }}>
        <iframe
          ref={iframeRef}
          style={{ 
            width: '100%', 
            height: '750px', 
            border: 'none' 
          }}
          title="Netron Model Viewer"
        />
      </Card>
    </>
  );
}

export default Analyzer;