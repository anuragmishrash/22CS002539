import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const requestLogPath = path.join(logsDir, 'requests.log');
const errorLogPath = path.join(logsDir, 'errors.log');

function writeLogLine(filePath, line) {
  fs.appendFile(filePath, line + '\n', () => {});
}

export function loggingMiddleware(req, res, next) {
  const startHrTime = process.hrtime.bigint();
  const { method, originalUrl } = req;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1e6;
    const log = JSON.stringify({
      ts: new Date().toISOString(),
      requestId,
      method,
      url: originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      referrer: req.headers.referer || req.headers.referrer || '',
    });
    writeLogLine(requestLogPath, log);
  });

  next();
}

export function requestErrorLogger(err, req, res, next) {
  const log = JSON.stringify({
    ts: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    status: err.status || 500,
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  writeLogLine(errorLogPath, log);
  next(err);
}

