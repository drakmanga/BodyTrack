# BodyTrack

Servizio self-hosted per il tracking di misurazioni fisiche (peso, misure corporee configurabili, corporatura/peso ideale) con grafici storici, foto di progresso e supporto multi-profilo (più persone sullo stesso account).

## Stack

- **Backend**: Node.js + Fastify + TypeScript + Prisma, in `backend-node/`
- **Database**: PostgreSQL 16
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Recharts + React Router, PWA (manifest + service worker), in `frontend/`
- **Deploy**: systemd (backend) + Nginx come reverse proxy e file statici (frontend), stessa origine (niente CORS in produzione)

## Setup locale (sviluppo)

Requisiti: Node.js 20+, Docker (per Postgres) o un'istanza Postgres 16 già disponibile.

```bash
# 1. Avvia Postgres per lo sviluppo
docker compose up -d

# 2. Backend
cd backend-node
cp .env.example .env   # valorizza le variabili, vedi sotto
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:8081

# 3. Frontend (in un altro terminale)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

In sviluppo, Vite fa da proxy delle chiamate `/api/**` verso il backend (vedi `frontend/vite.config.js`), quindi vanno avviati entrambi. Assicurati che `CORS_ALLOWED_ORIGIN` sul backend corrisponda esattamente all'origine da cui apri il frontend nel browser.

### Build di produzione

```bash
cd backend-node && npm run build     # tsc -> dist/
cd frontend && npm run build          # genera frontend/dist
```

## Variabili d'ambiente (backend-node/.env)

| Variabile | Descrizione |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Connessione Postgres |
| `JWT_SECRET` | Chiave HMAC per firma JWT, min. 32 byte. Genera con `openssl rand -base64 48` |
| `JWT_EXPIRATION_MINUTES` | Durata del token JWT in minuti |
| `CORS_ALLOWED_ORIGIN` | Origine consentita per CORS (una sola, no wildcard) |
| `PHOTOS_STORAGE_PATH` | Percorso su cui salvare le foto di progresso |
| `SERVER_PORT` | Porta HTTP del backend |

Copia sempre `.env.example` in `.env` e valorizza — **non committare mai `.env`**.

## Deploy in produzione

Setup di riferimento: container LXC Debian su Proxmox, backend gestito da systemd, frontend statico servito da Nginx che fa anche da reverse proxy verso il backend (stessa origine, niente CORS). Una containerizzazione Docker completa per il nuovo backend Node non è ancora stata fatta — `docker-compose.yml` in questa repo copre solo Postgres per lo sviluppo locale.

### 1. Prerequisiti sul server

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL 16 e Nginx
apt install -y postgresql nginx

sudo -u postgres createuser bodytrack -P   # imposta una password
sudo -u postgres createdb bodytrack -O bodytrack
```

### 2. Clona ed esegui il build

```bash
git clone https://github.com/drakmanga/BodyTrack.git /root/bodytrack
cd /root/bodytrack

# Backend
cd backend-node
cp .env.example .env.production   # valorizza DB_*, JWT_SECRET (openssl rand -base64 48), CORS_ALLOWED_ORIGIN, PHOTOS_STORAGE_PATH
npm install
npx prisma migrate deploy          # crea/aggiorna lo schema sul DB
npm run build                      # tsc -> dist/

# Frontend
cd ../frontend
npm install
npm run build                      # genera frontend/dist
```

### 3. Backend come servizio systemd (avvio automatico al boot)

Il repo include già l'unit file in `backend-node/bodytrack-backend-node.service`:

```bash
cp /root/bodytrack/backend-node/bodytrack-backend-node.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bodytrack-backend-node   # abilita all'avvio + parte subito
systemctl status bodytrack-backend-node          # verifica che sia "active (running)"
```

L'unit file assume `WorkingDirectory=/root/bodytrack/backend-node` ed `EnvironmentFile=/root/bodytrack/backend-node/.env.production` — se clonate altrove, aggiornate questi due percorsi nel file prima di copiarlo.

### 4. Frontend statico + Nginx come reverse proxy

```bash
mkdir -p /var/www/bodytrack
cp -r /root/bodytrack/frontend/dist/* /var/www/bodytrack/
chown -R www-data:www-data /var/www/bodytrack
```

Config Nginx (`/etc/nginx/sites-available/bodytrack`):

```nginx
server {
    listen 80 default_server;
    server_name _;

    root /var/www/bodytrack;
    index index.html;

    location /api/ {
        client_max_body_size 11m;   # deve superare il limite upload foto lato app (10MB)
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
rm -f /etc/nginx/sites-enabled/default   # opzionale, evita conflitti sulla porta 80
nginx -t && systemctl enable --now nginx && systemctl reload nginx
```

`SERVER_PORT` nel `.env.production` del backend deve corrispondere alla porta usata in `proxy_pass` (8080 in questo esempio).

### 5. Verifica

```bash
curl http://localhost/actuator/health   # deve rispondere OK
```

Poi apri l'IP/dominio del server nel browser: dovresti vedere la pagina di login/registrazione.

### 6. Redeploy dopo modifiche

- **Backend**: `cd backend-node && npm run build && systemctl restart bodytrack-backend-node`
- **Frontend**: `cd frontend && rm -rf dist && npm run build`, poi **`rm -rf /var/www/bodytrack/*`** (importante: Vite genera nomi file con hash del contenuto, i bundle vecchi si accumulano se non si svuota prima), quindi `cp -r dist/* /var/www/bodytrack/`, `chown -R www-data:www-data /var/www/bodytrack`, `systemctl reload nginx`.

## Licenza

MIT — vedi [LICENSE](LICENSE).
