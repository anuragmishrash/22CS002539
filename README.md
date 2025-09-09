## URL Shortener (MERN)

Production-ready microservice with a responsive React frontend.

- Backend: Express + MongoDB Atlas, custom file logger (no console), geoip-lite analytics
- Frontend: React (Vite) + Material UI

### Prerequisites
- Node.js 18+
- Internet access for MongoDB Atlas

### Environment
- Server: runs on port 4000 (configurable via `PORT`)
- Client: runs on port 3000 (fixed per requirement)
- Mongo: uses provided Atlas URI by default; override with `MONGO_URI` if needed

### Quick Start
Open two terminals.

1) Backend (http://localhost:4000)
```
cd server
npm i
npm run dev
```
Optional env (create `server/.env`):
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/url-shortener?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development
```

2) Frontend (http://localhost:3000)
```
cd client
npm i
npm run dev
```
Optional env (create `client/.env`):
```
VITE_API_BASE=http://localhost:4000
```

### Features
- Create short URLs with optional validity (minutes) and optional custom shortcode
- Redirect via `/:code` with click tracking (timestamp, referrer, coarse geo via IP)
- Statistics page lists created links and click details
- Client-side validation and shortcode availability check
- Responsive, accessible UI using Material UI

### API
- POST `/shorturls`
  - body: `{ url: string, validity?: number (minutes), shortcode?: string }`
  - 201 OK: `{ shortLink: string, expiry: ISO8601 }`
- GET `/shorturls/:code`
  - 200 OK: `{ shortcode, url, createdAt, expiry, totalClicks, clicks: [{ timestamp, referrer, location: { country, region, city }, userAgent }] }`
- GET `/:code`
  - 302 Redirects to the long URL; records click

### Logging (Mandatory Custom Middleware)
- All requests logged to `server/logs/requests.log`
- Errors logged to `server/logs/errors.log`
- No console or built-in loggers are used

### Notes
- Default validity is 30 minutes when not provided
- Custom shortcode must be 3–20 alphanumeric chars and unique; service returns 409 if taken

### Troubleshooting
- Port 3000 in use (Windows PowerShell):
```
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
- Port 4000 in use: replace 3000 with 4000 in the commands above

