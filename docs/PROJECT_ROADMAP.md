# Project Roadmap & Progress Tracker

## Project: Smart Home Plant Management System
**Version:** 1.0.0  
**Target:** Production-ready self-hosted home application  
**Tech Stack:** React · Node.js · TypeScript · PostgreSQL · Docker

---

## Milestones

### M1 — Foundation (Week 1) ✅
| # | Task | Status | Owner |
|---|------|--------|-------|
| 1.1 | Project scaffolding & Docker Compose setup | ✅ Done | — |
| 1.2 | PostgreSQL schema design & initialization SQL | ✅ Done | — |
| 1.3 | Backend Express app skeleton with TypeScript | ✅ Done | — |
| 1.4 | Frontend React app scaffold with Vite + Tailwind | ✅ Done | — |
| 1.5 | Database connection pooling | ✅ Done | — |
| 1.6 | Environment configuration system | ✅ Done | — |

### M2 — Core CRUD APIs (Week 1-2) ✅
| # | Task | Status | Owner |
|---|------|--------|-------|
| 2.1 | Plant registry endpoints (CRUD) | ✅ Done | — |
| 2.2 | Location management endpoints | ✅ Done | — |
| 2.3 | Care log endpoints | ✅ Done | — |
| 2.4 | Settings/admin endpoints | ✅ Done | — |
| 2.5 | Image upload endpoint | ✅ Done | — |
| 2.6 | OpenAPI/Swagger documentation | ✅ Done | — |

### M3 — Frontend UI (Week 2) ✅
| # | Task | Status | Owner |
|---|------|--------|-------|
| 3.1 | Layout, navigation, routing | ✅ Done | — |
| 3.2 | Dashboard with health overview | ✅ Done | — |
| 3.3 | Plant list & add/edit forms | ✅ Done | — |
| 3.4 | Plant detail page with care history | ✅ Done | — |
| 3.5 | Location management UI | ✅ Done | — |
| 3.6 | Settings configuration UI | ✅ Done | — |
| 3.7 | Responsive design (mobile-friendly) | ✅ Done | — |

### M4 — AI Integration (Week 2-3) ✅
| # | Task | Status | Owner |
|---|------|--------|-------|
| 4.1 | Ollama local LLM service | ✅ Done | — |
| 4.2 | OpenAI GPT-4o integration | ✅ Done | — |
| 4.3 | Anthropic Claude integration | ✅ Done | — |
| 4.4 | AI routing / provider selection logic | ✅ Done | — |
| 4.5 | AI Diagnostics chat UI | ✅ Done | — |
| 4.6 | Interaction history storage & display | ✅ Done | — |

### M5 — Plant Knowledge Integration (Week 3) ✅
| # | Task | Status | Owner |
|---|------|--------|-------|
| 5.1 | Perenual API integration | ✅ Done | — |
| 5.2 | Plant search & identification | ✅ Done | — |
| 5.3 | Knowledge cache in PostgreSQL | ✅ Done | — |
| 5.4 | Weather/zone API (OpenWeatherMap) | ✅ Done | — |

### M6 — Polish & Production Readiness (Week 3-4)
| # | Task | Status | Owner |
|---|------|--------|-------|
| 6.1 | Error boundaries & graceful degradation | ⬜ Todo | — |
| 6.2 | Loading states & skeleton screens | ⬜ Todo | — |
| 6.3 | Notification / toast system | ⬜ Todo | — |
| 6.4 | Input validation (frontend + backend) | ⬜ Todo | — |
| 6.5 | Data export (CSV/JSON) | ⬜ Todo | — |
| 6.6 | Dark mode support | ⬜ Todo | — |
| 6.7 | PWA manifest (installable on mobile) | ⬜ Todo | — |

### M7 — Future Enhancements (Backlog)
| # | Feature | Priority |
|---|---------|----------|
| 7.1 | Push notifications for watering reminders | Medium |
| 7.2 | Plant photo gallery per plant | Low |
| 7.3 | Seasonal care calendar | Medium |
| 7.4 | Multi-user support with auth | Low |
| 7.5 | iOS/Android companion app | Low |
| 7.6 | Automated plant identification from live camera | High |
| 7.7 | Integration with smart home (HA, MQTT) | Medium |
| 7.8 | Soil moisture sensor data ingestion | Medium |

---

## Known Issues / Tech Debt
| ID | Issue | Severity |
|----|-------|----------|
| TD-1 | No automated test suite (unit/integration) | Medium |
| TD-2 | API keys stored as plaintext in DB (should encrypt) | High |
| TD-3 | No pagination on large plant lists | Low |
| TD-4 | Image resize/optimization before storage | Low |

---

## Definition of Done
- [ ] Feature works end-to-end in Docker Compose
- [ ] API endpoint documented in Swagger
- [ ] TypeScript types defined (no `any`)
- [ ] Error states handled gracefully in UI
- [ ] Mobile-responsive layout verified

---

## Versioning
| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-06-10 | Initial release — all M1-M5 complete |
