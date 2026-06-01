# Questboard

Pixel art RPG chore tracker for families. Each player picks a hero and fights a daily monster; completing chores deals damage, defeating it earns gold, failing causes an overnight penalty. Gold is spent on family-agreed rewards.

## Stack

- **Frontend**: React 18 + Vite, plain CSS, no component library. Source in `frontend/src/`.
- **Backend**: Python FastAPI (`backend/main.py`), single-file API, no ORM.
- **Data**: JSON files on disk (`backend/data/state.json`, `config.json`). No database.
- **Deployment**: Single Docker image (`Dockerfile` at root), nginx serves the built frontend and proxies `/api/*` to uvicorn on port 5050. Published as `ghcr.io/thillygooth/questboard:latest`.

## Dev

```bash
# Frontend - hot-reload on :5174
cd frontend && npm install && npm run dev

# Backend - auto-reload on :5050
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 5050
```

Vite proxies `/api/*` to the backend automatically.

## Key source files

| Path | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Root component, game loop, state management |
| `frontend/src/logic.js` | Combat math, gold, XP, crits, streaks, combos |
| `frontend/src/data.js` | Static data: chores, rewards, hero classes, monsters |
| `frontend/src/components/SetupWizard.jsx` | First-run setup flow |
| `frontend/src/components/PlayerCard.jsx` | Per-player combat UI |
| `frontend/src/components/DungeonMap.jsx` | Fog-of-war dungeon renderer |
| `backend/main.py` | All API endpoints, save/load, midnight cron logic |

## Game mechanics

- Monster is seeded by date — same monster for everyone on a given day
- 5% base crit chance, scales with level
- Kill streaks up to 2x gold multiplier over consecutive days
- Combo attacks: chain chores within 8 seconds for up to 2.5x bonus damage
- Loot drops: random bonus gold or XP on any chore completion
- Overkill bar: extra chores after a kill bank Power Tokens
- Power-ups: Gold Rush, Double Damage, Shield Aura, Treasure Magnet, Forge Reward
- Prestige at level 10: reset XP for a permanent gold bonus
- Dungeon: per-player fog-of-war map, chores earn moves
- Midnight: uncompleted monster strikes back (gold penalty)

## Players

- 1–6 players, each with hero class, difficulty (kids/adults), gold, XP, dungeon state
- Solo chores: personal tasks tracked per player
- Kids mode uses easier monster scaling

## Docker build

```bash
docker build -t questboard . && docker run -p 8099:8099 -v ./data:/data questboard
```

The root `Dockerfile` builds the frontend and copies the dist into the image alongside the backend.
