import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#6ec800' }, // WAGO Green
    secondary: { main: '#d3d7da' }, // Light gray
    background: { default: '#ffffff' }, // White background
    text: { primary: '#333333', secondary: '#666666' }, // Dark text
  },
  typography: {
    fontFamily: "'DIN Next Pro', 'Roboto', sans-serif",
    h6: { fontSize: '1.25rem', fontWeight: 600, textTransform: 'uppercase' },
    body1: { fontSize: '1rem' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #d3d7da',
          boxShadow: 'none',
        },
      },
    },
	MuiTableCell: {
    styleOverrides: {
      head: {
        backgroundColor: '#6ec800', // WAGO Green
        color: '#ffffff',           // White text
        fontWeight: 'bold',        // Bold text
      },
    },
  },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #d3d7da',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#6ec800',
          color: '#ffffff',
          borderRadius: '8px',
          textTransform: 'uppercase',
          '&:hover': {
            backgroundColor: '#5aa700',
          },
          '&.Mui-disabled': {
            backgroundColor: '#d3d7da',
            color: '#666666',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#e0e0e0',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#e0e0e0',
          },
        },
      },
    },
  },
});

export default theme;