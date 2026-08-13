# BodyTrack

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

Self-hosted service for tracking physical measurements (weight, configurable body measurements, frame size/ideal weight) with historical charts, progress photos, and multi-profile support (multiple people on the same account).

## Stack

- **Backend**: Node.js + Fastify + TypeScript + Prisma, in `backend-node/`
- **Database**: PostgreSQL 16
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Recharts + React Router, PWA (manifest + service worker), in `frontend/`
- **Deploy**: systemd (backend) + Nginx as reverse proxy and static file server (frontend), same origin (no CORS in production)

## Local setup (development)

Requirements: Node.js 20+, Docker (for Postgres) or an already-available Postgres 16 instance.

```bash
# 1. Start Postgres for development
docker compose up -d

# 2. Backend
cd backend-node
cp .env.example .env   # fill in the variables, see below
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:8081

# 3. Frontend (in another terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

In development, Vite proxies `/api/**` calls to the backend (see `frontend/vite.config.js`), so both need to be running. Make sure `CORS_ALLOWED_ORIGIN` on the backend matches exactly the origin you open the frontend from in the browser.

### Production build

```bash
cd backend-node && npm run build     # tsc -> dist/
cd frontend && npm run build          # generates frontend/dist
```

## Environment variables (backend-node/.env)

| Variable | Description |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Postgres connection |
| `JWT_SECRET` | HMAC key for signing JWTs, min. 32 bytes. Generate with `openssl rand -base64 48` |
| `JWT_EXPIRATION_MINUTES` | JWT token duration in minutes |
| `CORS_ALLOWED_ORIGIN` | Allowed CORS origin (single value, no wildcard) |
| `PHOTOS_STORAGE_PATH` | Path where progress photos are stored |
| `SERVER_PORT` | Backend HTTP port |

Always copy `.env.example` to `.env` and fill it in — **never commit `.env`**.

## Production deployment

Reference setup: Debian LXC container on Proxmox, backend managed by systemd, static frontend served by Nginx which also acts as reverse proxy to the backend (same origin, no CORS). A full Docker containerization for the new Node backend hasn't been done yet — `docker-compose.yml` in this repo only covers Postgres for local development.

### 1. Server prerequisites

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL 16 and Nginx
apt install -y postgresql nginx

sudo -u postgres createuser bodytrack -P   # set a password
sudo -u postgres createdb bodytrack -O bodytrack
```

### 2. Clone and build

```bash
git clone https://github.com/drakmanga/BodyTrack.git /root/bodytrack
cd /root/bodytrack

# Backend
cd backend-node
cp .env.example .env.production   # fill in DB_*, JWT_SECRET (openssl rand -base64 48), CORS_ALLOWED_ORIGIN, PHOTOS_STORAGE_PATH
npm install
npx prisma migrate deploy          # creates/updates the DB schema
npm run build                      # tsc -> dist/

# Frontend
cd ../frontend
npm install
npm run build                      # generates frontend/dist
```

### 3. Backend as a systemd service (auto-start on boot)

The repo already includes the unit file at `backend-node/bodytrack-backend-node.service`:

```bash
cp /root/bodytrack/backend-node/bodytrack-backend-node.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bodytrack-backend-node   # enable on boot + start now
systemctl status bodytrack-backend-node          # verify it's "active (running)"
```

The unit file assumes `WorkingDirectory=/root/bodytrack/backend-node` and `EnvironmentFile=/root/bodytrack/backend-node/.env.production` — if you clone elsewhere, update these two paths in the file before copying it.

### 4. Static frontend + Nginx as reverse proxy

```bash
mkdir -p /var/www/bodytrack
cp -r /root/bodytrack/frontend/dist/* /var/www/bodytrack/
chown -R www-data:www-data /var/www/bodytrack
```

Nginx config (`/etc/nginx/sites-available/bodytrack`):

```nginx
server {
    listen 80 default_server;
    server_name _;

    root /var/www/bodytrack;
    index index.html;

    location /api/ {
        client_max_body_size 11m;   # must exceed the app-level photo upload limit (10MB)
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /actuator/health {
        proxy_pass http://127.0.0.1:8080;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/bodytrack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # optional, avoids conflicts on port 80
nginx -t && systemctl enable --now nginx && systemctl reload nginx
```

`SERVER_PORT` in the backend's `.env.production` must match the port used in `proxy_pass` (8080 in this example).

### 5. Verify

```bash
curl http://localhost/actuator/health   # should respond OK
```

Then open the server's IP/domain in a browser: you should see the login/registration page.

### 6. Redeploy after changes

- **Backend**: `cd backend-node && npm run build && systemctl restart bodytrack-backend-node`
- **Frontend**: `cd frontend && rm -rf dist && npm run build`, then **`rm -rf /var/www/bodytrack/*`** (important: Vite generates content-hashed filenames, so old bundles pile up if you don't clear the directory first), then `cp -r dist/* /var/www/bodytrack/`, `chown -R www-data:www-data /var/www/bodytrack`, `systemctl reload nginx`.

## License

MIT — see [LICENSE](LICENSE).
