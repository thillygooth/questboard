# Questboard  -  Full Guide

A pixel art RPG-themed chore tracker for the whole family. Complete household chores to battle monsters, earn gold, and unlock rewards.

---

## First-Run Setup

When you open Questboard for the first time, a setup wizard guides you through:

1. **Add players** (1–6)  -  enter names and choose difficulty mode
   - **Kids mode**  -  kid-appropriate chores, lower monster HP, easier battles
   - **Adults mode**  -  full chore list, tougher monsters, higher stakes
2. **Pick an avatar and class**  -  see [Hero Classes](#hero-classes) below
3. **Choose chores**  -  toggle individual chores on/off, add custom ones
4. **Choose rewards**  -  pick what you can spend gold on
5. **Start your adventure!**

You can return to Settings any time to add/remove players, change chores, adjust rewards, or tweak difficulty.

---

## How to Play

1. Tap a **player card** to select your hero
2. Tap any **chore** to complete it  -  this deals damage to your daily monster
3. Fill the monster's HP bar to zero before midnight to **earn gold**
4. Spend gold in the **Reward Shop** on family rewards

### The Daily Cycle

Every day at midnight:
- Each player gets a new monster (seeded by date, so everyone sees the same monsters)
- All daily chores reset
- Weekly chores reset on Sundays, monthly chores on the 1st

### What Happens If You Don't Defeat Your Monster

If midnight hits and your monster still has HP left, **the monster attacks you**. You lose gold equal to the monster's attack power. The exact amount depends on the monster  -  tougher monsters hit harder.

You'll see a warning toast like: `⚠ Amy: The goblin swings wildly at your coins! -3 gold`

Your gold can't go below zero, but a penalty resets your "penalty-free days" streak (which matters for the Untouchable badge).

**Shield Aura** power-up blocks the midnight penalty if active.

---

## Hero Classes

Classes are cosmetic  -  they change your hero's sprite but don't affect gameplay stats. Pick whatever looks cool!

| Class | Description |
|-------|-------------|
| Warrior | Classic sword-and-shield fighter |
| Mage | Arcane spellcaster |
| Witch | Dark magic wielder |
| Rogue | Sneaky dual-wielder |
| Paladin | Holy knight |
| Ranger | Bow-wielding forest guardian |
| Frost Knight | Ice-armored warrior |

All players earn XP, gold, and level up at the same rate regardless of class.

---

## Chores  -  Party vs Solo

Every chore has a mode:

- **ALL (party)**  -  shared by the whole group. When one person completes it, it's done for everyone. Great for household tasks like "Cook dinner" or "Vacuum."
- **1P (solo)**  -  tracked per player. Each person must complete it themselves. Perfect for personal tasks like "Brush teeth" or "Pack backpack."

You can toggle any chore between ALL and 1P in Settings using the green ALL / pink 1P button.

### Custom Chores

Add your own chores in Settings → Chores → "+ Add custom chore". Set the name, icon, points, frequency (daily/weekly/monthly), and mode (ALL shared or 1P per player).

### Bonus Chore

One random chore each day is marked as the **bonus chore** (shown with a ⭐). Completing it gives extra rewards.

---

## Combat Mechanics

### Crit Hits
Each chore completion has a chance to deal **double damage**. Base crit chance is 5%, increasing by 1% per level. Crits show a ⚡ flash and play a special sound.

### Combo Attacks
Complete multiple chores within 8 seconds to chain a combo. Combos multiply damage up to 2.5×.

### Kill Streaks
Defeat your monster every day to build a streak:
- 3+ days: 1.2× gold multiplier
- 7+ days: 1.5× gold multiplier
- 14+ days: 2.0× gold multiplier

Missing a day (monster survives) resets your streak to zero.

### Loot Drops
Every chore has a 10% chance to drop bonus loot  -  extra gold or XP. Your luck stat (increases with level) improves drop quality.

### Overkill System
After killing your monster, any additional chores charge an **overkill bar**. Fill it up to bank Power Tokens that can be spent on power-ups.

---

## Dungeon

The Dungeon is a fog-of-war exploration mode  -  a procedurally generated dungeon that each player explores independently.

### How It Works

1. **Earn moves** by completing chores. Each chore grants dungeon moves.
2. **Explore** the dungeon using the on-screen d-pad (← ↑ ↓ →) or swipe gestures.
3. **Discover rooms** as you move  -  the fog lifts to reveal what's inside.
4. **Collect loot** and avoid traps as you go deeper.

### What You'll Find

| Tile | What It Does |
|------|-------------|
| 🟡 Small gold | 1–2 gold (scaled by depth and floor) |
| 💰 Large gold | 2–5 gold |
| 📦 Chest | 5–9 gold jackpot |
| ⚠️ Trap | Lose gold (reduced by luck stat) |
| 👹 Monster | Dungeon combat  -  defeat it with chore completions |
| 🗝️ Key | Picks up the floor key |
| 🔒 Locked chest | 10–17 gold  -  requires the floor key |
| ⬇️ Stairs down | Descend to the next floor (harder but more loot) |
| ⬆️ Stairs up | Return to the previous floor |

### Dungeon Strategy

- **Go deep**  -  deeper floors and rooms farther from the start give better rewards (depth multiplier + floor multiplier)
- **Find the key first**  -  each floor has one key and one locked chest. The locked chest is the biggest payout.
- **Watch for traps**  -  higher luck (from leveling up) reduces trap damage
- **Dungeon monsters** require multiple chore completions to defeat, but drop gold when killed

### Controls

- **D-pad overlay**  -  tap the directional arrows on screen
- Each move costs 1 pending move from your pool
- You earn moves from completing chores during normal play

### Daily Starter Moves

Every day you get free dungeon moves based on your level:
- Level 1: 2 moves
- +1 move per 3 levels

---

## Power-Ups

Power-ups activate when you meet certain conditions (configurable in Settings):

| Power-Up | Effect | Duration |
|----------|--------|----------|
| Gold Rush | Bonus gold on all chore completions | Timed |
| Double Damage | All chores deal 2× damage | Timed |
| Shield Aura | Blocks midnight gold penalty | Timed |
| Treasure Magnet | Increased loot drop chance | Timed |
| Forge Reward | Grants Power Tokens directly | Instant |

Power-up triggers can be set to: daily chores completed, weekly chores completed, monthly chores completed, kill streak length, or all dailies done.

---

## Badges & Titles

Earn badges by reaching milestones. Each badge also unlocks a hero title.

| Badge | Requirement | Title Unlocked |
|-------|------------|----------------|
| 🩸 First Blood | Defeat your first monster | Monster Hunter |
| 🔥 On a Roll | 3-day kill streak | On a Roll |
| ⚡ Streak Lord | 7-day kill streak | The Relentless |
| 👑 Unstoppable | 14-day kill streak | The Unstoppable |
| 💸 Big Spender | Redeem 5 rewards | The Wealthy |
| 💰 Gold Hoarder | Hold 100+ gold at once | Gold Hoarder |
| ⚔️ Monster Slayer | Defeat 10 monsters total | Monster Slayer |
| 🍀 Lucky Charm | Get 3 lucky loot drops | Lucky Charm |
| 🛡️ Untouchable | No midnight penalties for 7 days | Untouchable |
| 🌟 Prestige | Reach level 10 and prestige | The Prestigious |

### Prestige

At level 10, you can **prestige**  -  reset your XP and level back to 1 in exchange for a permanent gold bonus. Your badges, gold, and history are kept.

---

## Leveling & XP

| Level | XP Required |
|-------|-------------|
| 1 → 2 | 10 XP |
| 2 → 3 | 15 XP |
| 3 → 4 | 25 XP |
| n → n+1 | 10 + 5 × (n−1)² XP |

Each level increases:
- Crit chance (+1% per level)
- Luck stat (+2% per level, caps at 50%)
- Daily dungeon starter moves (+1 per 3 levels)

XP and levels never reset (except prestige).

---

## Reset Week Button

The **Reset Week** button in the top-right is a manual full reset. It:
- Resets all gold to 0 for every player
- Clears all chore completion states (daily, weekly, monthly)
- Resets all monster damage and kill streaks to 0
- Clears overkill charge and power tokens
- Removes active power-ups

It does **NOT** reset: history log, XP/levels, badges, or settings.

This is a hard reset  -  use it when you want a fresh start for the family. It triggers immediately from the current moment, not aligned to any specific day of the week.

A confirmation dialog appears before it runs.

---

## Automatic Resets

| What | When |
|------|------|
| Daily chores | Every midnight |
| Weekly chores | Every Sunday at midnight |
| Monthly chores | 1st of each month at midnight |
| Monster assignment | Every midnight (new monster) |
| Kill streak | Resets to 0 if monster survived |
| Dungeon starter moves | Granted daily |

XP, levels, gold, badges, and history persist forever.

---

## Weekly Leaderboard

The History tab shows a weekly gold leaderboard  -  who earned the most gold this week. Resets when the week rolls over (Sunday).

---

## Tips

- Chain chores quickly for combo damage (within 8 seconds)
- The bonus chore (⭐) changes daily  -  prioritize it
- Kill streaks compound  -  a 14-day streak doubles your gold
- Explore the dungeon for extra gold that doesn't depend on monsters
- Shield Aura is your insurance policy against midnight penalties
- Personal chores (1P) are great for kids' routines that each child needs to do independently

---

## Support

Issues and feature requests: [github.com/thillygooth/questboard/issues](https://github.com/thillygooth/questboard/issues)
