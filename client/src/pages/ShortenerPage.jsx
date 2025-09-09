import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Card, CardContent, Grid, TextField, Button, Typography, Alert, Divider, InputAdornment } from '@mui/material';

const emptyRow = () => ({ url: '', validity: 30, shortcode: '', result: null, error: '', availability: 'idle' });

export default function ShortenerPage({ apiBase, onCreated }) {
  const [rows, setRows] = useState([emptyRow()]);
  const canAdd = rows.length < 5;

  function updateRow(idx, patch) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() { if (canAdd) setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(idx) { setRows((prev) => prev.filter((_, i) => i !== idx)); }

  function validate(r) {
    try {
      const u = new URL(r.url);
      if (!/^https?:$/.test(u.protocol)) return 'URL must be http(s)';
    } catch { return 'Enter a valid URL'; }
    if (!Number.isInteger(Number(r.validity)) || Number(r.validity) <= 0) return 'Validity must be a positive integer';
    if (r.shortcode && !/^[a-zA-Z0-9]{3,20}$/.test(r.shortcode)) return 'Shortcode: 3-20 alphanumerics';
    return '';
  }

  async function submitAll() {
    // pre-check for duplicate custom shortcodes within this batch
    const customCodes = rows.map((r, i) => ({ i, code: (r.shortcode || '').trim() })).filter(x => x.code);
    const dupSet = new Set();
    const seen = new Set();
    customCodes.forEach(({ code }) => { if (seen.has(code)) dupSet.add(code); else seen.add(code); });

    const withErrors = rows.map((r) => ({ r, err: validate(r) || (r.shortcode && dupSet.has(r.shortcode.trim()) ? 'Duplicate shortcode in this batch' : '') || (r.shortcode && r.availability === 'taken' ? 'Shortcode already in use' : '') }));
    if (withErrors.some((x) => x.err)) {
      setRows((prev) => prev.map((r, i) => ({ ...r, error: withErrors[i].err })));
      return;
    }
    const promises = rows.map(async (r) => {
      try {
        const { data } = await axios.post(`${apiBase}/shorturls`, {
          url: r.url,
          validity: Number(r.validity),
          ...(r.shortcode ? { shortcode: r.shortcode } : {}),
        });
        return { ok: true, data };
      } catch (e) {
        // Do not auto-retry without shortcode. Surface the server error so the user can pick another code.
        return { ok: false, error: e?.response?.data?.error || 'Failed' };
      }
    });

    const results = await Promise.all(promises);
    setRows((prev) => prev.map((r, i) => results[i].ok ? { ...r, result: results[i].data, error: '' } : { ...r, error: results[i].error }));
    results.forEach((res) => { if (res.ok) { const code = (res.data.shortLink.split('/').pop() || '').trim(); if (code) onCreated?.(code); } });
  }

  async function checkAvailability(idx) {
    const code = (rows[idx].shortcode || '').trim();
    if (!code) return;
    updateRow(idx, { availability: 'checking' });
    try {
      await axios.get(`${apiBase}/shorturls/${code}`);
      updateRow(idx, { availability: 'taken' });
    } catch (e) {
      if (e?.response?.status === 404) updateRow(idx, { availability: 'available' });
      else updateRow(idx, { availability: 'unknown' });
    }
  }

  function suggestCode(base) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (n) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    let candidate = `${(base || '').trim()}${rand(3)}`;
    const current = new Set(rows.map(r => (r.shortcode || '').trim()).filter(Boolean));
    while (current.has(candidate)) candidate = `${(base || '').trim()}${rand(3)}`;
    return candidate;
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Shorten up to 5 URLs</Typography>
          <Grid container spacing={{ xs: 1.5, md: 2.5 }}>
            {rows.map((r, idx) => (
              <Grid item xs={12} key={idx}>
                <Grid container spacing={{ xs: 1, md: 1.5 }} alignItems="flex-end">
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Long URL" type="url" value={r.url} onChange={(e) => updateRow(idx, { url: e.target.value })} placeholder="https://example.com/..." />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField fullWidth label="Validity (min)" type="number" inputProps={{ min: 1 }} value={r.validity} onChange={(e) => updateRow(idx, { validity: e.target.value })} />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Custom shortcode (optional)"
                      value={r.shortcode}
                      onChange={(e) => updateRow(idx, { shortcode: e.target.value, availability: 'idle', error: '' })}
                      onBlur={() => checkAvailability(idx)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {r.availability === 'available' && <Typography color="success.main" variant="caption">available</Typography>}
                            {r.availability === 'taken' && (
                              <Button size="small" onClick={() => updateRow(idx, { shortcode: suggestCode(r.shortcode), availability: 'idle' })}>Suggest</Button>
                            )}
                            {r.availability === 'checking' && <Typography variant="caption">checking…</Typography>}
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Button color="error" variant="outlined" fullWidth disabled={rows.length === 1} onClick={() => removeRow(idx)}>Remove</Button>
                  </Grid>
                  {r.error && (
                    <Grid item xs={12}>
                      <Alert severity="error">{r.error}</Alert>
                    </Grid>
                  )}
                  {r.result && (
                    <Grid item xs={12}>
                      <Alert severity="success">
                        <Typography variant="body2"><strong>Short Link:</strong> <a href={r.result.shortLink} target="_blank" rel="noreferrer">{r.result.shortLink}</a></Typography>
                        <Typography variant="body2"><strong>Expires:</strong> {new Date(r.result.expiry).toLocaleString()}</Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
                <Divider sx={{ my: { xs: 1, md: 1.5 } }} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={addRow} disabled={!canAdd}>Add URL</Button>
            <Button variant="contained" onClick={submitAll}>Create Short URLs</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

