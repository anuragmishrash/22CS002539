export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
  };
  if (process.env.NODE_ENV !== 'production' && err.details) {
    payload.details = err.details;
  }
  res.status(status).json(payload);
}

