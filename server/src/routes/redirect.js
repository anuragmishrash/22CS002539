import { Router } from 'express';
import geoip from 'geoip-lite';
import Url from '../models/Url.js';

const router = Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const doc = await Url.findOne({ shortcode: code });
    if (!doc) {
      return res.status(404).json({ error: 'Shortcode not found' });
    }
    if (doc.expiry.getTime() < Date.now()) {
      return res.status(410).json({ error: 'Short link has expired' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const referrer = req.headers.referer || req.headers.referrer || '';
    const userAgent = req.headers['user-agent'] || '';
    const geo = ip ? geoip.lookup(ip) : null;

    const click = {
      timestamp: new Date(),
      referrer,
      ip,
      userAgent,
      country: geo?.country || '',
      region: geo?.region || '',
      city: geo?.city || '',
    };

    await Url.updateOne({ _id: doc._id }, { $push: { clicks: click } });

    return res.redirect(302, doc.url);
  } catch (err) {
    next(err);
  }
});

export default router;

