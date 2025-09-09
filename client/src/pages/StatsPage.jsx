import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Card, CardContent, Typography, Grid, Chip, List, ListItem, ListItemText, Divider, TextField, Button } from '@mui/material';

function normalizeShortcodeInput(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      return parts.pop() || '';
    }
  } catch {}
  const parts = trimmed.split('/').filter(Boolean);
  return parts.pop() || '';
}

export default function StatsPage({ apiBase, sessionShortcodes }) {
  const [manual, setManual] = useState('');
  const [codes, setCodes] = useState(sessionShortcodes);
  const [items, setItems] = useState([]); // { code, loading, error, data }

  useEffect(() => { setCodes((prev) => Array.from(new Set([...prev, ...sessionShortcodes]))); }, [sessionShortcodes]);

  async function fetchOne(code) {
    const normalized = normalizeShortcodeInput(code);
    if (!normalized) return;
    setItems((prev) => prev.some((x) => x.code === normalized) ? prev : [...prev, { code: normalized, loading: true }]);
    try {
      const { data } = await axios.get(`${apiBase}/shorturls/${normalized}`);
      setItems((prev) => prev.map((x) => x.code === normalized ? { ...x, loading: false, data } : x));
    } catch (e) {
      setItems((prev) => prev.map((x) => x.code === normalized ? { ...x, loading: false, error: e?.response?.data?.error || 'Failed' } : x));
    }
  }

  useEffect(() => {
    // initial fetch known codes
    codes.forEach((c) => fetchOne(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes.join(',')]);

  function addManual() {
    if (!manual) return;
    fetchOne(manual);
    setManual('');
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Load stats by shortcode</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField fullWidth label="Shortcode or full short URL" value={manual} onChange={(e) => setManual(e.target.value)} />
            <Button variant="contained" onClick={addManual}>Add</Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={{ xs: 1.5, md: 2.5 }}>
        {items.map((item) => (
          <Grid item xs={12} key={item.code}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">{item.code}</Typography>
                {item.loading && <Typography>Loading…</Typography>}
                {item.error && <Typography color="error">{item.error}</Typography>}
                {item.data && (
                  <Box>
                    <Typography variant="body2"><strong>Short URL:</strong> {window.location.origin.replace(':3000', ':4000')}/{item.code}</Typography>
                    <Typography variant="body2"><strong>Target:</strong> <a href={item.data.url} target="_blank" rel="noreferrer">{item.data.url}</a></Typography>
                    <Typography variant="body2"><strong>Created:</strong> {new Date(item.data.createdAt).toLocaleString()}</Typography>
                    <Typography variant="body2"><strong>Expiry:</strong> {new Date(item.data.expiry).toLocaleString()} {item.data.expired ? '(expired)' : ''}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}><strong>Total Clicks:</strong> <Chip label={item.data.totalClicks} /></Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1">Clicks</Typography>
                    {item.data.clicks.length === 0 ? (
                      <Typography>No clicks yet.</Typography>
                    ) : (
                      <List dense>
                        {item.data.clicks.map((c, i) => (
                          <ListItem key={i} divider>
                            <ListItemText
                              primary={`${new Date(c.timestamp).toLocaleString()} — ${c.referrer || 'direct'}`}
                              secondary={`${c.location?.country || '-'} ${c.location?.region || ''} ${c.location?.city || ''}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

