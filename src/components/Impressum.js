import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';

function Impressum({ companyData }) {
  return (
    <Box sx={{ p: 4, bgcolor: 'background.paper' }}>
      {/* Main Heading */}
      <Typography variant="h4" gutterBottom>
        Impressum
      </Typography>

      {/* Company Information */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Company Information
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        {companyData.companyName}
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        {companyData.address}
      </Typography>

      {/* Contact */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Contact
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Phone: {companyData.phone}
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Email: <MuiLink href={`mailto:${companyData.email}`}>{companyData.email}</MuiLink>
      </Typography>

      {/* Legal Information */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Legal Information
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Register Court: {companyData.registerCourt}
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        VAT ID: {companyData.vatId}
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Management: {companyData.management}
      </Typography>

      {/* Responsible Person */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Responsible Person
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Verantwortlich nach {companyData.responsibleLaw}: {companyData.responsiblePerson}
      </Typography>

      {/* Trademark Note */}
      <Typography variant="body1" sx={{ mt: 4, fontStyle: 'italic' }}>
        {companyData.trademarkNote}
      </Typography>
    </Box>
  );
}

export default Impressum;