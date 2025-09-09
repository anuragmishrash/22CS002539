import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { AppBar, Toolbar, Typography, Container, Box, Tab, Tabs } from '@mui/material';
import ShortenerPage from './pages/ShortenerPage.jsx';
import StatsPage from './pages/StatsPage.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  const [tab, setTab] = useState(0);
  const [sessionShortcodes, setSessionShortcodes] = useState([]);

  function handleCreated(code) {
    setSessionShortcodes((prev) => Array.from(new Set([...prev, code])));
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="transparent" enableColorOnDark sx={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(17,24,39,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Toolbar sx={{ minHeight: 72 }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>URL Shortener</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Built by Anurag Mishra</Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: { xs: 2, md: 4 }, flexGrow: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Shorten URLs" />
          <Tab label="Statistics" />
        </Tabs>
        {tab === 0 && (
          <ShortenerPage apiBase={API_BASE} onCreated={handleCreated} />
        )}
        {tab === 1 && (
          <StatsPage apiBase={API_BASE} sessionShortcodes={sessionShortcodes} />
        )}
      </Container>
    </Box>
  );
}

