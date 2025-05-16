import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Link } from '@mui/material';
import IotDiagram from '../assets/iot-edge2000x1125.jpg'; // Adjust path based on your project structure

function Help() {
  const version = process.env.REACT_APP_VERSION || 'Unknown';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'support', // Default type
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (type) => {
    const { name, email, subject, message } = formData;
    if (!name || !email || !subject || !message) {
      alert('All fields are required');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, type }),
      });

      if (response.ok) {
        alert('Inquiry sent successfully');
        setFormData({ name: '', email: '', subject: '', message: '', type: 'support' }); // Reset form
      } else {
        alert('Failed to send inquiry');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to send inquiry');
    }
  };

  return (
    <Box>
      {/* Heading */}
      <Typography variant="h6">Help</Typography>



      {/* Contact Information */}
      <Typography sx={{ mt: 2 }}>
        <strong>Support Team:</strong> For technical assistance, please contact{' '}
        <a href="mailto:iot@wago.com">iot@wago.com</a> with a detailed description of your issue.
      </Typography>
      <Typography sx={{ mt: 1 }}>
        <strong>Sales Team:</strong> For sales inquiries, reach out to{' '}
        <a href="mailto:sales@wago.com">sales@wago.com</a>.
      </Typography>

      {/* Contact Form */}
      <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
        <Typography variant="h6">Contact Form</Typography>
        <TextField
          label="Your Name"
          name="name"
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          required
          value={formData.name}
          onChange={handleInputChange}
        />
        <TextField
          label="Your Email"
          name="email"
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          type="email"
          required
          value={formData.email}
          onChange={handleInputChange}
        />
        <TextField
          label="Subject"
          name="subject"
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          required
          value={formData.subject}
          onChange={handleInputChange}
        />
        <TextField
          label="Message"
          name="message"
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          multiline
          rows={4}
          required
          value={formData.message}
          onChange={handleInputChange}
        />
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => handleSubmit('support')}
        >
          Submit to Support (iot@wago.com)
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ mt: 2, ml: 2 }}
          onClick={() => handleSubmit('solution')}
        >
          Submit Solution Request (solutions@wago.com)
        </Button>
      </Box>

      {/* Links */}
      <Typography sx={{ mt: 2 }}>
        Need more help? Visit the{' '}
        <Link href="https://www.wago.community/" target="_blank" rel="noopener noreferrer">
          WAGO Community Forum
        </Link>{' '}
        for community support, explore{' '}
        <Link
          href="https://www.wago.com/de/wago-partner/iot-partner"
          target="_blank"
          rel="noopener noreferrer"
        >
          IoT Partner Collaboration
        </Link>{' '}
        opportunities, or check out our{' '}
        <Link
          href="https://www.wago.com/de/s/solutionprovider"
          target="_blank"
          rel="noopener noreferrer"
        >
          Solution Provider Page
        </Link>{' '}
        if looking for a tailored solution.
      </Typography>
      {/* Embedded IoT Diagram */}
      <Box sx={{ mt: 2, p: 2 }}>
        <img
          src={IotDiagram}
          alt="WAGO IoT Architecture Diagram"
          style={{
            width: '100%',
            maxWidth: '800px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}
        />
      </Box>
      {/* Existing Information */}
      <Typography sx={{ mt: 2 }}>WAGO Information: WAGO GmbH & Co. KG.</Typography>
      <Typography sx={{ mt: 1 }}>Version: {version}</Typography>
    </Box>
  );
}

export default Help;