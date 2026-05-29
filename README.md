# Questboard

> Turn household chores into a pixel art RPG adventure for the whole family.

Each family member picks a hero and fights a daily monster. Complete chores to deal damage, defeat it before midnight to earn gold, or it strikes back. Spend gold on rewards you've agreed on as a family.

[![Release](https://img.shields.io/github/v/release/thillygooth/questboard)](https://github.com/thillygooth/questboard/releases)
[![License](https://img.shields.io/github/license/thillygooth/questboard)](LICENSE)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/thillygooth)

---

![Chores](screenshot_chores.png)

![Rewards](screenshot_rewards.png)

![Dungeon](screenshot_dungeon.png)

---

## Features

| Feature | Description |
|---------|-------------|
| ⚔ Monster battles | Each player fights a date-seeded monster every day |
| 💥 Crit hits | 5% base crit chance, increases with level |
| 🔥 Kill streaks | Multi-day streaks multiply gold rewards up to 2x |
| 🎯 Combo attacks | Chain chores within 8 seconds for up to 2.5x bonus damage |
| 🎲 Loot drops | Chance to find bonus gold or XP on any chore |
| ⚡ Overkill system | Extra chores after a kill charge a bar to bank Power Tokens |
| 🔮 Power-ups | Gold Rush, Double Damage, Shield Aura, Treasure Magnet, Forge Reward |
| 🏅 Badges and titles | Unlock achievements and choose your hero title |
| ⭐ Prestige | Reset XP at level 10 for a permanent gold bonus |
| 🗺 Dungeon | Per-player fog-of-war dungeon - chores earn moves |
| 🏆 Weekly leaderboard | See who earned the most gold this week |
| 🌙 Overnight penalty | Fail to kill your monster and lose gold at midnight |
| 👥 Up to 6 players | Each with their own hero, monster, gold, XP, and dungeon |
| 👤 Solo chores | Personal tasks tracked per player (brush teeth, homework) |
| 📱 Kids and adults modes | Separate difficulty scaling with easier monsters for kids |
| 🎮 CRT overlay | Optional scanline filter for retro vibes |
| 🔍 UI scale | Mini, Heroic, and Epic zoom modes for any screen size |
| 📅 Week start day | Configurable Monday or Sunday weekly reset |
| 💾 Backup and restore | Export and import save data |

📖 **[Full game guide](questboard/DOCS.md)** - hero classes, dungeon mechanics, combat, badges, power-ups, and more.

---

## Install

### Home Assistant

In the HA Terminal add-on:

```bash
mkdir -p /mnt/data/supervisor/questboard/data
docker run -d --restart unless-stopped --name questboard -p 8099:8099 \
  -v /mnt/data/supervisor/questboard/data:/data \
  ghcr.io/thillygooth/questboard:latest
```

Then add it to your HA sidebar in `configuration.yaml`:

```yaml
panel_iframe:
  questboard:
    title: "Questboard"
    url: "http://<your-ha-ip>:8099"
    icon: mdi:sword-cross
    require_admin: false
```

Replace `<your-ha-ip>` with your Home Assistant IP, found under **Settings → System → Network**. Restart HA to apply.

### Docker (any host)

```bash
mkdir -p /opt/questboard/data
docker run -d --restart unless-stopped --name questboard -p 8099:8099 \
  -v /opt/questboard/data:/data \
  ghcr.io/thillygooth/questboard:latest
```

Open `http://localhost:8099`. Use any writable path for the data volume.

---

## First-Run Setup

A setup wizard runs the first time you open the app:

1. Set the number of players (1-6)
2. For each player: name, difficulty (kids / adults), avatar class
3. Choose which chores to track - toggle on/off, set solo vs. shared, adjust values
4. Configure the reward shop - enable/disable rewards, set custom costs
5. Configure power-ups and display options (CRT overlay, UI scale, week start day)

After launch, tap **Settings** to edit anything without re-running the wizard.

---

## Development

```bash
# Frontend - hot-reload dev server on :5174
cd frontend && npm install && npm run dev

# Backend - auto-reload API server on :5050
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 5050
```

The dev server proxies `/api/*` to the backend automatically.

---

## License

[CC BY-NC 4.0](LICENSE) - free to share and adapt for non-commercial purposes with attribution. Commercial use is prohibited.

Sprite assets from [OpenGameArt.org](https://opengameart.org) under CC-BY / CC0 licenses. Font: [Pixelated Elegance](https://www.fontspace.com/pixelated-elegance-font-f126145) by GGBotNet (CC0).

---

## Credits

Overkill system, power-ups, solo chore mode, tabbed settings, new hero classes, and gold economy rebalancing contributed by **[TreasuryMatt](https://github.com/TreasuryMatt)**.

Week start day config, chore confirmation, player editing, state backup/restore, bug fixes, and docs contributed by **[CarelvanHeerden](https://github.com/CarelvanHeerden)**.
