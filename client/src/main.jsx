import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import './styles.css'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#60a5fa' },
    secondary: { main: '#22d3ee' },
    background: { default: '#0b1220', paper: '#111827' }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, system-ui, Arial, sans-serif',
    h6: { fontWeight: 700 },
    h5: { fontWeight: 800 }
  },
  components: {
    MuiCard: { styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.08)' } } },
    MuiButton: { defaultProps: { variant: 'contained' } }
  }
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)

