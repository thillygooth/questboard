# Questboard

> Turn household chores into a pixel art RPG adventure.

Each family member gets a hero and faces a daily monster. Complete chores to deal damage — defeat the monster before midnight to earn gold, or it fights back. Spend gold in the reward shop on treats you've agreed on as a family.

![Questboard](https://raw.githubusercontent.com/thillygooth/questboard/main/screenshot.png)

[![Release](https://img.shields.io/github/v/release/thillygooth/questboard)](https://github.com/thillygooth/questboard/releases)
[![License](https://img.shields.io/github/license/thillygooth/questboard)](LICENSE)

---

## Install on Home Assistant

1. Go to **Settings → Add-ons → Add-on Store**
2. Click **⋮** (top right) → **Repositories**
3. Paste and add:
   ```
   https://github.com/thillygooth/questboard
   ```
4. Find **Questboard** in the store → **Install**
5. Click **Start** then **Open Web UI**

Questboard appears in your HA sidebar. No port forwarding required.

---

## Features

- **Monster battles** — each player fights a unique monster every day
- **Crit hits** — 5% base chance to double damage, increases as you level up
- **XP & levels** — defeat monsters to gain XP and raise your crit chance
- **Gold economy** — earn gold by winning, spend it in the family reward shop
- **Smart resets** — daily/weekly/monthly chores reset automatically at the right time
- **Overnight penalty** — fail to defeat your monster and lose gold when you sleep
- **Up to 6 players** — each with their own monster, gold, XP, and streak

---

## Manual Install (Docker)

```bash
git clone https://github.com/thillygooth/questboard
cd questboard
docker build -t questboard .
mkdir -p /opt/questboard/data
docker run -d -p 8099:8099 -v /opt/questboard/data:/data questboard
```

Open `http://localhost:8099`.

> **Note:** Use an absolute path for the data volume (`/opt/questboard/data` above). Relative paths like `./data` can fail if the working directory isn't writable. Choose any writable absolute path you prefer.

---

## First-Run Setup

A setup wizard runs the first time you open the app:

1. Set the number of players (1–6)
2. For each player: name, difficulty (easy/kids or hard/adults), avatar, class
3. Choose which chores to track — toggle any on/off, or add custom ones
4. Start the adventure

---

## Development

```bash
# Frontend (hot-reload dev server on :5174)
cd frontend && npm install && npm run dev

# Backend (auto-reload API server on :5050)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 5050
```

The dev server proxies `/api/*` to the backend automatically.

---

## License

[MIT](LICENSE) — free to use, fork, and share.
