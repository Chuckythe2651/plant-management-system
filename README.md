# 🌱 Smart Home Plant Management System

A self-hosted web application for managing indoor and outdoor plants, tracking health, scheduling care, and diagnosing issues using multiple AI providers (Anthropic Claude, OpenAI GPT-4o, and local Ollama).

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql) ![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)

---

## Features

| Feature | Description |
|---------|-------------|
| **Plant Registry** | Add, edit, remove plants with photos, location, species info |
| **Health Dashboard** | Visual overview of all plants, health status, care charts |
| **Watering Scheduler** | Track watering history, set frequency, get overdue alerts |
| **Care Logging** | Log watering, fertilizing, pruning, repotting, observations |
| **AI Diagnostics** | Upload a photo or describe symptoms — AI identifies and advises |
| **Multi-LLM Support** | Route to Ollama (local), OpenAI GPT-4o, or Anthropic Claude |
| **Plant Knowledge** | Search Perenual plant database and cache species data |
| **Location Management** | Organize by indoor/outdoor locations in Chandler, AZ (configurable) |
| **Weather Integration** | Live weather display via OpenWeatherMap |
| **Swagger API Docs** | Interactive API documentation at `/api/docs` |
| **Persistent Storage** | All data survives container restarts via named Docker volumes |

---

## Quick Start (Docker)

### 1. Clone and configure

```bash
git clone <this-repo>
cd plant-management-system
cp .env.example .env
# Edit .env to set a strong DB_PASSWORD
```

### 2. Launch

```bash
docker compose up -d --build
```

Wait ~30 seconds for the database to initialize, then open:

**→ http://localhost:8080**

That's it. The app starts with demo plants and locations for Chandler, Arizona.

### 3. Configure API Keys (optional)

Open **Settings** in the app and enter your API keys:
- **Anthropic Claude** — [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Perenual** — [perenual.com/docs](https://perenual.com/docs)
- **OpenWeatherMap** — [openweathermap.org/api](https://openweathermap.org/api)

API keys are stored in the PostgreSQL database (persistent volume), never in environment files.

---

## Persistent Data

Data survives reinstallation because it's stored in **named Docker volumes**:

| Volume | Contents |
|--------|----------|
| `plantmgr-pgdata` | All plants, care logs, AI history, settings |
| `plantmgr-uploads` | Uploaded plant photos |

To back up your data:
```bash
# Backup database
docker exec plantmgr-db pg_dump -U plantuser plantdb > backup.sql

# Restore database
docker exec -i plantmgr-db psql -U plantuser plantdb < backup.sql
```

To completely wipe data and start fresh:
```bash
docker compose down -v   # removes volumes too
docker compose up -d --build
```

---

## Architecture

```
Browser :8080
    │
    └─ Nginx (frontend container)
           ├─ /api/*  ──▶  backend:3001 (Node.js + Express)
           │                     └── db:5432 (PostgreSQL)
           ├─ /uploads/* ──▶ backend:3001 (static files)
           └─ /* ──▶ React SPA (built files)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design.

---

## AI Provider Setup

### Ollama (local, free, private)

```bash
# Install Ollama: https://ollama.ai
ollama pull llava          # vision model for photo analysis
ollama pull llama3.2       # text model for Q&A
```

Ollama must be running on the host machine. The app reaches it at `http://host.docker.internal:11434` by default.

### Auto-routing logic

When provider is set to **"Auto"**:
1. Checks if Ollama is reachable
2. If yes and the request has an image, checks if a vision model is available
3. Uses Ollama if available (preserves privacy)
4. Falls back to your preferred cloud provider (set in Settings)

---

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- (optional) Ollama

### Backend

```bash
cd backend
npm install
cp .env.example .env   # set DB_* vars for local postgres
npm run dev            # starts on :3001 with hot reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # starts on :3000 with Vite HMR
```

The Vite dev server proxies `/api/*` to `http://backend:3001`. Edit `vite.config.ts` to change the backend address for local development.

---

## API Documentation

Interactive Swagger UI: **http://localhost:8080/api/docs**

API spec JSON: **http://localhost:8080/api/docs.json**

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/plants` | List all plants |
| `POST` | `/api/v1/plants` | Create a plant |
| `PUT` | `/api/v1/plants/:id` | Update a plant |
| `DELETE` | `/api/v1/plants/:id` | Delete a plant |
| `POST` | `/api/v1/plants/:id/water` | Quick-log watering |
| `GET` | `/api/v1/plants/due-soon` | Plants needing water |
| `GET` | `/api/v1/care-logs` | Care event history |
| `POST` | `/api/v1/care-logs` | Log care event |
| `POST` | `/api/v1/ai/diagnose` | Run AI diagnosis (text + image) |
| `GET` | `/api/v1/ai/history` | AI interaction history |
| `GET` | `/api/v1/ai/providers` | Check provider availability |
| `GET` | `/api/v1/knowledge/search` | Search Perenual plant DB |
| `GET` | `/api/v1/settings` | Get all settings |
| `PUT` | `/api/v1/settings` | Update settings |
| `GET` | `/api/v1/settings/health` | System health check |

---

## Environment Variables

All application secrets (API keys) are stored in the database UI — the `.env` file only controls infrastructure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_NAME` | `plantdb` | PostgreSQL database name |
| `DB_USER` | `plantuser` | PostgreSQL username |
| `DB_PASSWORD` | *(required)* | PostgreSQL password — change this! |
| `DB_PORT` | `5432` | PostgreSQL port (host mapping) |
| `APP_PORT` | `8080` | Host port for the web UI |

---

## Project Structure

```
plant-management-system/
├── docker-compose.yml      # Single command deployment
├── .env.example            # Infrastructure config template
├── README.md
├── ARCHITECTURE.md         # System design document
├── docs/
│   └── PROJECT_ROADMAP.md  # Feature tracker / PM doc
├── db/
│   └── init/
│       ├── 01_schema.sql   # Database schema + triggers
│       └── 02_seed.sql     # Default data (locations, settings)
├── backend/                # Node.js + Express + TypeScript
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts        # App entry point
│   │   ├── config/         # DB pool, env config
│   │   ├── models/         # Database query functions
│   │   ├── services/       # LLM + external API services
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # Express routers
│   │   ├── middleware/      # Error handler, file upload
│   │   └── types/          # TypeScript interfaces
│   └── package.json
└── frontend/               # React + TypeScript + Vite
    ├── Dockerfile
    ├── nginx.conf          # Production nginx config
    ├── src/
    │   ├── pages/          # Route-level components
    │   ├── components/     # Reusable UI components
    │   ├── services/       # API client (axios)
    │   ├── types/          # TypeScript types
    │   └── hooks/          # (custom hooks)
    └── package.json
```

---

## Default Location: Chandler, Arizona

The app defaults to **Chandler, AZ (33.3062°N, 111.8413°W, USDA Zone 9b)** for weather integration. Change in Settings → Location to match your location.

---

## License

MIT — free for personal and commercial use.
