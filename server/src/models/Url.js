import mongoose from 'mongoose';

const ClickSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    referrer: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    country: { type: String, default: '' },
    region: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  { _id: false }
);

const UrlSchema = new mongoose.Schema(
  {
    shortcode: { type: String, unique: true, index: true, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiry: { type: Date, required: true },
    clicks: { type: [ClickSchema], default: [] },
  },
  { versionKey: false }
);

export default mongoose.model('Url', UrlSchema);

