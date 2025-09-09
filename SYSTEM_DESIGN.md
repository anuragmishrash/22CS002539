## System Design Document — URL Shortener Microservice and React Web App

### 1) Architecture Overview
- Microservice: Single Node.js/Express service exposing REST endpoints.
- Database: MongoDB Atlas (managed) for schema-flexible storage and fast indexed lookups by `shortcode`.
- Frontend: React (Vite) + Material UI running at http://localhost:3000, consuming backend APIs only.
- Observability: Custom file-based logging middleware (JSON lines) for all requests and errors; no console/inbuilt loggers.
- Analytics: Redirect endpoint records per-click events (timestamp, referrer, user-agent, coarse geo via IP with geoip-lite).

High-level flow
1. Client calls POST /shorturls with long URL, optional validity (minutes), optional custom shortcode.
2. Service validates inputs, enforces uniqueness of `shortcode` (unique index), sets expiry (`createdAt + validity`).
3. On GET /:code, service checks expiration, appends a click entry, and 302 redirects to the target URL.
4. On GET /shorturls/:code, service returns compact stats (metadata + click list).

### 2) Key Design Decisions and Justifications
- Express JS: Lightweight, well-known ecosystem, easy middleware model for mandatory custom logging and error handling.
- MongoDB Atlas: Document model fits evolving analytics documents; unique index on `shortcode` ensures global uniqueness. Cloud-hosted reliability with minimal ops.
- nanoid for auto shortcodes: Collision-resistant, URL-safe IDs with configurable alphabet/length.
- geoip-lite: In-process IP-to-geo lookup; adequate for coarse analytics without external calls.
- Material UI: Rapid, accessible, responsive UI implementation with consistent design system.
- Vite: Fast local dev server and modern build tooling.

Trade-offs
- Single service keeps implementation simple; at very high scale, analytics writes could be moved to an async pipeline (e.g., queue + worker) to protect redirect latency.
- File-based logs meet the requirement; for production, ship logs to a central system (ELK/OpenSearch/Cloud logging).

### 3) Data Modeling

Collection: urls
```
{
  _id: ObjectId,
  shortcode: String, // unique index
  url: String,       // validated absolute http(s) URL
  createdAt: Date,
  expiry: Date,
  clicks: [
    {
      timestamp: Date,
      referrer: String,
      userAgent: String,
      ip: String,
      country: String,
      region: String,
      city: String
    }
  ]
}
```

Indexes
- `{ shortcode: 1 }` with `unique: true` for O(1) resolution and global uniqueness.
- Optional future index `{ expiry: 1 }` to support TTL-based cleanup via a job (TTL index is avoided here to preserve expired records for analytics; cleanup is an operational choice).

### 4) API Design
- POST `/shorturls` → Create short link
  - Body: `{ url: string, validity?: number (minutes; default 30), shortcode?: string (3–20 alphanumerics) }`
  - Returns 201 with `{ shortLink, expiry }`
  - Errors: 400 (invalid input), 409 (shortcode already in use), 500 (generation failure)
- GET `/shorturls/:code` → Retrieve stats
  - Returns `{ shortcode, url, createdAt, expiry, totalClicks, clicks: [...] , expired }`
  - Errors: 404 if not found
- GET `/:code` → Redirect
  - 302 to original URL if not expired; records click data
  - 404 if unknown code; 410 if expired

Error Handling Strategy
- Centralized error middleware ensures consistent JSON responses.
- Custom error logger writes to `logs/errors.log` with timestamp, route, and stack in non-production.

### 5) Logging and Observability
- Custom middleware logs JSON lines per request: `{ ts, requestId, method, url, status, durationMs, ip, ua, referrer }` → `logs/requests.log`.
- Errors are logged to `logs/errors.log` with `{ ts, method, url, status, name, message, stack? }`.
- Avoids console/inbuilt loggers as mandated; can be swapped with a pluggable transport in production.

### 6) Client Application (React)
- Two tabs: Shorten URLs and Statistics.
- Shortener supports up to 5 concurrent creations with client-side validation (URL format, positive integer validity, shortcode pattern, batch duplicate detection).
- Shortcode availability check: on blur, requests `/shorturls/:code`; if 404 → available, else taken with Suggest action for a unique variant.
- Statistics lists session-created codes; can also manually add any code or full short URL to fetch stats.
- UI: MUI theme with dark palette, sticky blurred AppBar, responsive grids.

### 7) Security and Validation
- Input validation server-side: absolute http(s) URLs only; validity positive integer; shortcode pattern `[A-Za-z0-9]{3,20}`.
- CORS enabled for local dev; in production, restrict `origin`.
- Open redirect risk is acknowledged; we validate URL scheme. Optionally implement allowlist/denylist of hosts for stricter policies.
- No auth per requirement; in production, consider API keys or OAuth if multi-tenant.

### 8) Scalability and Performance
- Hot path (redirect) performs one indexed lookup and an append to `clicks`. At very high QPS:
  - Move click writes to an async queue (e.g., Redis/Kafka) and a worker to avoid write amplification on the read path.
  - Introduce caching (CDN/edge) for `/:code` with short TTL; revalidate from DB.
  - Shard by `shortcode` prefix if dataset grows significantly.
- Batch creation is supported on the client; server remains single-create for simplicity; a bulk endpoint can be added.

### 9) Reliability
- Expiration enforced on read; expired links return 410 and are not redirected.
- Optional housekeeping job can archive or purge expired links.
- MongoDB Atlas provides backups and availability zones; connection configured with `dbName` and retry-able writes.

### 10) Deployment and Config
- Configuration via environment variables (`MONGO_URI`, `PORT`, `NODE_ENV`, `VITE_API_BASE`).
- Containerization-ready (Dockerfile can be added) for CI/CD and orchestration (Kubernetes). Health check: GET `/shorturls/doesnotexist` returns 404 when up.

### 11) Testing Strategy (outline)
- Unit tests: validation, ID generation, error handler, logging middleware.
- Integration tests: POST→GET→redirect cycle, expiry behavior, 409 on collision, 410 on expired.
- UI tests: form validation, availability check UX, stats rendering.

### 12) Assumptions
- No user accounts; all requests are pre-authorized (per spec).
- Coarse geo is sufficient; IP accuracy varies; private/forwarded IPs best-effort.
- Click arrays remain within manageable limits for the evaluation; for large volumes, migrate to a separate `clicks` collection or time-series storage.


