import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { loggingMiddleware, requestErrorLogger } from './middleware/logging.js';
import shortUrlsRouter from './routes/shorturls.js';
import redirectRouter from './routes/redirect.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Mandatory custom logging middleware
app.use(loggingMiddleware);

// Routes
app.use('/shorturls', shortUrlsRouter);
app.use('/', redirectRouter);

// Error logging middleware (custom)
app.use(requestErrorLogger);

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://lordgameranurag:987654321Anu@cluster0.lfpl7c7.mongodb.net/url-shortener?retryWrites=true&w=majority';

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'url-shortener' });
    app.listen(PORT, () => {
      // No console logging allowed by spec; rely on file logger
    });
  } catch (err) {
    // Capture startup failure using file logger
    // eslint-disable-next-line no-console
    process.exit(1);
  }
}

start();

export default app;

