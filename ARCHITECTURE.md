# Smart Home Plant Management System — Architecture

## System Overview

A full-stack web application for managing indoor and outdoor plants with AI-powered health diagnostics, care scheduling, and plant identification via multiple LLM providers.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Compose                          │
│                                                                 │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │   Nginx     │   │    Backend      │   │   PostgreSQL    │   │
│  │  :80/:443   │──▶│  Node+TS :3001  │──▶│    :5432        │   │
│  │  (Reverse   │   │  REST API       │   │  (Named Volume) │   │
│  │   Proxy)    │   │                 │   │                 │   │
│  └──────┬──────┘   └────────┬────────┘   └─────────────────┘   │
│         │                   │                                    │
│  ┌──────▼──────┐            │  External APIs                    │
│  │  Frontend   │            ├──▶ Anthropic Claude API           │
│  │  React+TS   │            ├──▶ OpenAI GPT-4 API               │
│  │  :3000      │            ├──▶ Ollama (local) :11434          │
│  └─────────────┘            ├──▶ Perenual Plant API             │
│                              └──▶ OpenWeatherMap API            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend (React + TypeScript + Vite)
- SPA with React Router for client-side routing
- TanStack Query for server state management and caching
- Tailwind CSS for responsive styling
- Recharts for health dashboards and care history charts
- Pages: Dashboard, Plant Registry, Plant Detail, Locations, AI Diagnostics, Settings

### Backend (Node.js + Express + TypeScript)
- REST API with OpenAPI/Swagger documentation at `/api/docs`
- Business logic for plant health scoring and care scheduling
- LLM service abstraction layer for Ollama / OpenAI / Anthropic
- External API integration for Perenual plant knowledge database
- Multer for image upload handling (stored in `/app/uploads`)
- Connection pooling via `pg` (node-postgres)

### Database (PostgreSQL 16)
- Persistent named Docker volume (`pgdata`)
- Schema initialized via `/docker-entrypoint-initdb.d/` scripts
- Migrations tracked in `schema_migrations` table

### Nginx
- Reverse proxy: routes `/api/*` to backend, all else to frontend
- Serves uploaded files at `/uploads/*`
- Single entry point on port 80

## Database Schema (ERD)

```
locations ────────── plants ──────── care_logs
    │                  │
    │                  ├──────────── plant_knowledge
    │                  │
    │                  └──────────── llm_interactions
    │
settings (global key/value store)
```

### Entity Relationships
- `locations` 1:N `plants` — plants belong to a location
- `plants` 1:N `care_logs` — each plant has a history of care events
- `plants` 1:N `plant_knowledge` — cached data from external plant APIs
- `plants` 1:N `llm_interactions` — AI diagnostic sessions per plant (nullable)

## AI Integration Strategy

```
User Input (text + optional image)
         │
         ▼
┌─────────────────────────────────────┐
│        AI Routing Layer             │
│                                     │
│  Provider selection (user picks):   │
│  • "auto"    → tries Ollama first,  │
│               falls back to Claude  │
│  • "ollama"  → local LLaVA/Llama3  │
│  • "openai"  → GPT-4o              │
│  • "claude"  → claude-sonnet-4-6   │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 Ollama    OpenAI     Anthropic
 (local)  (remote)   (remote)
    │          │          │
    └──────────┴──────────┘
               │
    Structured response extraction
               │
    ┌──────────▼──────────┐
    │  llm_interactions   │
    │  (history stored)   │
    └─────────────────────┘
```

### Prompt Templates
1. **Diagnosis** — "Analyze this plant for health issues based on [description/photo]"
2. **Identification** — "Identify this plant from the photo and suggest care requirements"
3. **Care Advice** — "Provide care recommendations for [species] in [location/climate]"
4. **General Chat** — Open-ended plant questions

### Auto-provider Logic
1. Check if Ollama is reachable (health ping)
2. If yes and model supports vision (when image present) → use Ollama
3. If Ollama unavailable or text-only fallback needed → use preferred API provider from settings

## API Structure

```
/api/v1/
  plants/
    GET    /           — list all plants
    POST   /           — create plant
    GET    /:id        — get plant details
    PUT    /:id        — update plant
    DELETE /:id        — delete plant
    POST   /:id/water  — quick log watering
  locations/
    GET    /           — list locations
    POST   /           — create location
    PUT    /:id        — update location
    DELETE /:id        — delete location
  care-logs/
    GET    /           — list logs (filterable by plant_id)
    POST   /           — create log entry
    DELETE /:id        — delete log
  ai/
    POST   /diagnose   — run AI diagnosis
    GET    /history    — get interaction history
    GET    /providers  — list available/configured providers
  knowledge/
    GET    /search     — search Perenual API
    GET    /:plantId   — get cached knowledge for a plant
  settings/
    GET    /           — all settings
    PUT    /           — bulk update settings
    GET    /health     — system health check (API keys, Ollama)
  uploads/
    POST   /           — upload image, returns URL
```

## Security Considerations
- API keys stored in database (encrypted at rest via PG column), never in git
- Uploaded images validated for MIME type (images only)
- Helmet.js for security headers
- CORS configured to allow only the frontend origin
- Rate limiting on AI endpoints to prevent runaway API costs

## Scalability Notes
This architecture is designed as a monolith-first approach that can be split into microservices:
- Frontend → standalone CDN-hosted SPA
- Backend → split into: plant-service, ai-service, knowledge-service
- Database → can be externalized to managed PostgreSQL (RDS, Supabase, Neon)
- File storage → can be moved to S3/MinIO by swapping the upload service
