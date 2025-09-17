import React from 'react';
import { Typography } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', { error, errorInfo });
    // Optional: Log to external service for traceability
  }

  render() {
    if (this.state.hasError) {
      return (
        <Typography variant="h6" color="error" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
          Something went wrong: {this.state.error?.message}
        </Typography>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;