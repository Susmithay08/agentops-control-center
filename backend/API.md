# AgentOps Control Center — API Reference

Base URL: `http://localhost:4000/api`

All requests accept:
- `x-role`: `admin | manager | engineer | viewer` (defaults to `viewer`)
- `x-trace-id`: optional; echoed back and used for log correlation

Responses set `x-trace-id` and (for cacheable GETs) `x-cache: HIT|MISS`.

## Dashboard & analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | KPI cards, charts, reliability summary |
| GET | `/reliability` | SLO dashboard, trends, incidents, top failure causes |
| GET | `/models/comparison` | Provider ranking table + recommendations |
| GET | `/models/recommendations` | Best model per task type with explanation |

## Agent runs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/runs` | Paginated/filterable/sortable runs table |
| GET | `/runs/filters` | Dropdown metadata |
| GET | `/runs/:id` | Full run detail |

`/runs` query params: `search, status, agentId, modelId, teamId, taskType, provider, sort (timestamp|cost|duration|tokens|health), dir (asc|desc), page, size`.

## Alerting
| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts` | Active alerts, counts, thresholds |

## Admin (RBAC)
| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| GET | `/admin/entities` | read | Agents/models/teams/users/config |
| GET | `/admin/audit` | read | Audit log |
| POST | `/admin/agents` `/admin/models` `/admin/teams` `/admin/users` | write | Create entity |
| PUT | `/admin/config` | configure | Update SLO/cost/alert thresholds |

## System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus exposition (`?format=json` for JSON) |
| GET | `/status` | Component-level status |
| GET | `/docs` | Machine-readable API spec |
