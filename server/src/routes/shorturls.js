import { Router } from 'express';
import { customAlphabet } from 'nanoid';
import Url from '../models/Url.js';
import { isValidUrl, isValidShortcode } from '../utils/validate.js';

const router = Router();
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 7);

function minutesFromNow(minutes) {
  const ms = minutes * 60 * 1000;
  return new Date(Date.now() + ms);
}

router.post('/', async (req, res, next) => {
  try {
    const { url, validity, shortcode } = req.body || {};

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid or missing url' });
    }

    const validityMinutes = Number.isInteger(validity) ? validity : 30;
    if (validityMinutes <= 0) {
      return res.status(400).json({ error: 'validity must be a positive integer (minutes)' });
    }

    let code = shortcode;
    if (code != null) {
      if (!isValidShortcode(code)) {
        return res.status(400).json({ error: 'Invalid shortcode. Use 3-20 alphanumeric characters.' });
      }
      const exists = await Url.findOne({ shortcode: code });
      if (exists) {
        return res.status(409).json({ error: 'Shortcode already in use' });
      }
    } else {
      // generate unique
      for (let i = 0; i < 5; i += 1) {
        const candidate = nanoid();
        // eslint-disable-next-line no-await-in-loop
        const exists = await Url.findOne({ shortcode: candidate });
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return res.status(500).json({ error: 'Failed to generate unique shortcode' });
      }
    }

    const expiry = minutesFromNow(validityMinutes);
    const doc = await Url.create({ shortcode: code, url, expiry });

    const host = req.get('host');
    const protocol = req.protocol;
    const shortLink = `${protocol}://${host}/${code}`;
    return res.status(201).json({ shortLink, expiry: doc.expiry.toISOString() });
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const doc = await Url.findOne({ shortcode: code });
    if (!doc) {
      return res.status(404).json({ error: 'Shortcode not found' });
    }
    const isExpired = doc.expiry.getTime() < Date.now();
    const stats = {
      shortcode: doc.shortcode,
      url: doc.url,
      createdAt: doc.createdAt,
      expiry: doc.expiry,
      totalClicks: doc.clicks.length,
      clicks: doc.clicks
        .map((c) => ({
          timestamp: c.timestamp,
          referrer: c.referrer,
          location: { country: c.country, region: c.region, city: c.city },
          userAgent: c.userAgent,
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      expired: isExpired,
    };
    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;

