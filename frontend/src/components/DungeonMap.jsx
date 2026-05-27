import React, { useState, useEffect } from 'react';
import { getTileAt } from '../logic';
import { MONSTER_SPRITES } from '../monsterSprites';

const VIEW_W = 17;     // viewport width in tiles (odd = player centred)
const VIEW_H = 11;     // viewport height in tiles
const HALF_W = 8;      // Math.floor(VIEW_W / 2)
const HALF_H = 5;      // Math.floor(VIEW_H / 2)
const CELL   = 44;     // px per tile

// Hero class tile indices into tilemap_packed.png (matches PlayerCard.jsx)
const CLASS_TILES = {
  warrior: 87, mage: 84, witch: 99, rogue: 96, paladin: 88, ranger: 82,
};

// Minidungeon sprite path prefix
const S = '/sprites/minidungeon';

// Per-tile rendering config
const TILE_CFG = {
  floor:        { wall: false },
  wall:         { wall: true  },
  start:        { wall: false },
  corridor:     { wall: false },
  gold_s:       { wall: false, obj: `${S}/Coin.png`,          fw: 112, fh: 16, frames: 7, tw: 16, th: 16 },
  gold_l:       { wall: false, obj: `${S}/Coin.png`,          fw: 112, fh: 16, frames: 7, tw: 16, th: 16, tint: '#ffd700' },
  chest:        { wall: false, obj: `${S}/Chest_Open_Filled.png`, fw: 64, fh: 32, frames: 4, tw: 16, th: 32 },
  trap:         { wall: false, obj: `${S}/Spike_1.png`,       fw: 48,  fh: 32, frames: 3, tw: 16, th: 32 },
  monster:      { wall: false },
  key:          { wall: false, obj: `${S}/Key.png`,           fw: 128, fh: 16, frames: 8, tw: 16, th: 16 },
  locked_chest: { wall: false, obj: `${S}/Chest_Closed.png`,  fw: 112, fh: 32, frames: 7, tw: 16, th: 32 },
  stairs_down:  { wall: false, obj: `${S}/Trapdoor.png`,      fw: 96,  fh: 32, frames: 3, tw: 32, th: 32 },
  stairs_up:    { wall: false, obj: `${S}/Trapdoor.png`,      fw: 96,  fh: 32, frames: 3, tw: 32, th: 32, frame: 2 },
};

const HIDDEN_TYPES = new Set(['trap', 'monster']);
const NEAR_VISIBLE  = new Set(['stairs_down', 'stairs_up', 'key', 'locked_chest']);

const PLAYER_COLORS = ['#50b8ff', '#50e870', '#ff9050', '#e050ff'];

// Fog overlay per visibility tier — slightly softened so the radial vignette
// can do the heavy lifting at the edges.
function fogStyle(vis) {
  if (vis === 'fog')     return 'rgba(2,1,5,0.97)';
  if (vis === 'shadow')  return 'rgba(2,1,5,0.60)';
  if (vis === 'visited') return 'rgba(2,1,5,0.34)';
  return null;
}

// ─── Wall cell ────────────────────────────────────────────────────────────────
// Uses minidungeon/Walls.png (9 cols × 13 rows of 16 px tiles).
// Two tile variants chosen for visible stone texture:
//   hasFloorSouth → row 1, col 4  (lit brick face — the wall the player sees)
//   solid         → row 3, col 4  (darker stone — mostly in fog, needs no detail)
// Adjust row/col here to try other tiles; row 2 col 4 is a slightly darker face.
const WALL_COLS = 9;
const WALL_ROWS = 13;

function WallCell({ size, hasFloorSouth }) {
  const col = 4;
  const row = hasFloorSouth ? 1 : 3;
  return (
    <div style={{
      width:  size,
      height: size,
      backgroundImage:    "url('/sprites/minidungeon/Walls.png')",
      backgroundSize:     `${WALL_COLS * size}px ${WALL_ROWS * size}px`,
      backgroundPosition: `-${col * size}px -${row * size}px`,
      backgroundRepeat:   'no-repeat',
      imageRendering:     'pixelated',
    }} />
  );
}

// ─── Monster sprite (sidebar + tile) ─────────────────────────────────────────
function DungeonMonsterSprite({ id, dp = 52 }) {
  const mc = MONSTER_SPRITES[id] ?? MONSTER_SPRITES.green_slime;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (mc.type === 'img' || (mc.fr ?? 1) <= 1) return;
    const tid = setInterval(() => setFrame(f => (f + 1) % mc.fr), 1000 / 6);
    return () => clearInterval(tid);
  }, [mc]);

  if (mc.type === 'img') {
    return (
      <img src={mc.src} className="monster-idle"
        style={{ height: dp, width: 'auto', maxWidth: dp * 1.6, imageRendering: 'pixelated', display: 'block', margin: '4px auto' }} />
    );
  }
  const scale = dp / (mc.fs ?? 64);
  return (
    <div className="monster-idle" style={{
      width: dp, height: dp, margin: '4px auto',
      backgroundImage:    `url('${mc.src}')`,
      backgroundSize:     `${mc.sw * scale}px ${mc.sh * scale}px`,
      backgroundPosition: `${-(frame * dp)}px 0px`,
      backgroundRepeat:   'no-repeat',
      imageRendering:     'pixelated',
    }} />
  );
}

// ─── Floor cell ───────────────────────────────────────────────────────────────
function FloorCell({ size, tileType, vis, isPlayer, isExplored, hasKey, othersHere, playerClass, activeMonster }) {
  const cfg       = TILE_CFG[tileType] || {};
  const isHidden  = HIDDEN_TYPES.has(tileType) && !isExplored;
  const isNearVis = NEAR_VISIBLE.has(tileType) && (vis === 'near' || vis === 'current' || isExplored);
  const showObj   = cfg.obj && !isHidden && (isExplored || isNearVis);

  const frame    = cfg.frame ?? 0;
  const objScale = cfg.th === 32 ? 1.5 : 2;
  const objW     = cfg.tw ? cfg.tw * objScale : size;
  const objH     = cfg.th ? cfg.th * objScale : size;
  const stripW   = cfg.fw ? cfg.fw * objScale : size;
  const stripH   = cfg.fh ? cfg.fh * objScale : size;

  const chestTint = tileType === 'locked_chest' && hasKey
    ? 'sepia(1) saturate(3) hue-rotate(10deg)'
    : undefined;

  const fog = fogStyle(vis);

  // Hero portrait derived from class
  const heroTileIdx = CLASS_TILES[playerClass] ?? CLASS_TILES.warrior;
  const heroSize    = Math.round(size * 0.72);
  const heroRatio   = heroSize / 16;

  // Monster in tile — shown at 70% cell size
  const monsterDp = Math.round(size * 0.7);

  return (
    <div style={{
      width: size, height: size,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Floor texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:    `url('${S}/Floor.png')`,
        backgroundSize:     `${size}px ${size}px`,
        backgroundRepeat:   'no-repeat',
        imageRendering:     'pixelated',
      }} />

      {/* Object sprite (chest, key, coin, trap, stairs…) */}
      {showObj && (
        <div style={{
          position:  'absolute',
          bottom:    (tileType === 'stairs_down' || tileType === 'stairs_up') ? 0 : 2,
          left:      '50%',
          transform: 'translateX(-50%)',
          width:  objW, height: objH,
          backgroundImage:    `url('${cfg.obj}')`,
          backgroundRepeat:   'no-repeat',
          backgroundPosition: `-${frame * objW}px 0`,
          backgroundSize:     `${stripW}px ${stripH}px`,
          imageRendering:     'pixelated',
          filter: chestTint,
          zIndex: 2,
        }} />
      )}

      {/* Monster sprite on tile — real sprite if we know which monster, skull fallback otherwise */}
      {tileType === 'monster' && isExplored && (
        activeMonster ? (
          <div style={{ position: 'absolute', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DungeonMonsterSprite id={activeMonster.id} dp={monsterDp} />
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.45), color: '#dd3050', zIndex: 2, position: 'relative' }}>☠</span>
        )
      )}

      {/* Start marker */}
      {tileType === 'start' && isExplored && !isPlayer && (
        <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.4), color: '#50c870', zIndex: 2, position: 'relative' }}>★</span>
      )}

      {/* Other players — class portrait with team colour glow */}
      {othersHere.length > 0 && !isPlayer && (() => {
        const { player: op, color } = othersHere[0];
        const tIdx = CLASS_TILES[op.class] ?? CLASS_TILES.warrior;
        const s = Math.round(size * 0.72);
        const ratio = s / 16;
        return (
          <div style={{
            position: 'absolute',
            width: s, height: s,
            backgroundImage: "url('/sprites/tilemap_packed.png')",
            backgroundSize: `${192 * ratio}px ${176 * ratio}px`,
            backgroundPosition: `-${(tIdx % 12) * s}px -${Math.floor(tIdx / 12) * s}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            filter: `drop-shadow(0 0 4px ${color}E0) drop-shadow(0 0 2px ${color})`,
            zIndex: 3,
          }} />
        );
      })()}

      {/* Player marker — hero class portrait with glow */}
      {isPlayer && (
        <div style={{
          position: 'absolute',
          width:  heroSize,
          height: heroSize,
          backgroundImage:    "url('/sprites/tilemap_packed.png')",
          backgroundSize:     `${192 * heroRatio}px ${176 * heroRatio}px`,
          backgroundPosition: `-${(heroTileIdx % 12) * heroSize}px -${Math.floor(heroTileIdx / 12) * heroSize}px`,
          backgroundRepeat:   'no-repeat',
          imageRendering:     'pixelated',
          filter:  'drop-shadow(0 0 4px rgba(80,184,255,0.95)) drop-shadow(0 0 2px rgba(80,184,255,1))',
          zIndex:  3,
        }} />
      )}

      {/* Fog overlay */}
      {fog && (
        <div style={{ position: 'absolute', inset: 0, background: fog, zIndex: 4, pointerEvents: 'none' }} />
      )}
    </div>
  );
}

// ─── DungeonMap ───────────────────────────────────────────────────────────────
// Human-readable description for the tile the player is standing on
function currentTileDesc(tileType, dungeonMap) {
  const am = dungeonMap.activeMonster;
  switch (tileType) {
    case 'floor':        return 'Stone floor';
    case 'start':        return 'Starting chamber';
    case 'gold_s':       return 'Scattered coins — collected';
    case 'gold_l':       return 'Treasure pile — looted';
    case 'chest':        return 'Chest — emptied';
    case 'trap':         return 'Trap — triggered!';
    case 'monster':      return am ? `⚔ ${am.name} blocks the way!` : 'Monster lair — cleared';
    case 'key':          return 'Key location — found!';
    case 'locked_chest': return dungeonMap.lockedChestOpened ? 'Bonus chest — opened' : (dungeonMap.hasKey ? 'Locked chest (key ready!)' : 'Locked chest (need key)');
    case 'stairs_down':  return 'Stairs leading deeper';
    case 'stairs_up':    return 'Stairs leading up';
    default:             return '';
  }
}

export default function DungeonMap({ player, dungeonMap, allPlayers = [], allDungeonMaps = {}, onMove, cellSize = CELL }) {
  if (!dungeonMap?.grid || !player) return null;
  const { grid, pos, explored, pendingMoves, activeMonster, floor = 1 } = dungeonMap;
  const [px, py] = pos;
  const inCombat = activeMonster && (activeMonster.currentHP ?? 0) > 0;
  const canMove = pendingMoves > 0 && !inCombat;

  // Other players' positions indexed by coord key
  const otherPlayerAt = {};
  allPlayers.forEach((p, idx) => {
    if (p.id === player.id) return;
    const dm = allDungeonMaps[p.id];
    if (!dm?.pos) return;
    const k = `${dm.pos[0]},${dm.pos[1]}`;
    if (!otherPlayerAt[k]) otherPlayerAt[k] = [];
    otherPlayerAt[k].push({ player: p, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] });
  });

  const canMoveTo = (dx, dy) => canMove && getTileAt(grid, px + dx, py + dy) !== 'wall';

  const gridW = VIEW_W * cellSize;  // px — no gap between tiles
  const gridH = VIEW_H * cellSize;

  return (
    <div className="dmap-tab-layout">
      {/* ── Left sidebar ── */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">LEGEND</div>
        <div className="dmap-legend">
          {/* "You" row — shows the actual class sprite with the same glow as on the map */}
          <div className="dmap-legend-row">
            {(() => {
              const tileIdx = CLASS_TILES[player.class] ?? CLASS_TILES.warrior;
              const s = 16;
              const ratio = s / 16;
              return (
                <div style={{
                  width: s, height: s, flexShrink: 0,
                  backgroundImage: "url('/sprites/tilemap_packed.png')",
                  backgroundSize: `${192 * ratio}px ${176 * ratio}px`,
                  backgroundPosition: `-${(tileIdx % 12) * s}px -${Math.floor(tileIdx / 12) * s}px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(0 0 2px rgba(80,184,255,0.9))',
                }} />
              );
            })()}
            <span className="dmap-legend-label">You</span>
          </div>
          {[
            { icon: '◇', color: '#ffd700', label: 'Key'          },
            { icon: '▣', color: '#778899', label: 'Locked chest' },
            { icon: '▼', color: '#b88cff', label: 'Stairs down'  },
            { icon: '▲', color: '#88c8ff', label: 'Stairs up'    },
            { icon: '?', color: '#666',    label: 'Danger'       },
            { icon: '★', color: '#50c870', label: 'Start'        },
          ].map(({ icon, color, label }) => (
            <div key={label} className="dmap-legend-row">
              <span style={{ color, fontFamily: 'var(--pixel)', fontSize: 10 }}>{icon}</span>
              <span className="dmap-legend-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="dmap-sidebar-title" style={{ marginTop: 14 }}>STATUS</div>
        <div className="dmap-status">
          <div className="dmap-status-row">
            <span className="dmap-status-label">Floor:</span>
            <span className="dmap-status-val" style={{ color: '#b88cff' }}>{floor}</span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Key:</span>
            <span className="dmap-status-val" style={{ color: dungeonMap.hasKey ? '#ffd700' : '#444' }}>
              {dungeonMap.hasKey ? '◇ held' : dungeonMap.lockedChestOpened ? '✓ used' : 'not found'}
            </span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Moves:</span>
            <span className="dmap-status-val" style={{ color: pendingMoves > 0 ? '#80c8ff' : '#555' }}>{pendingMoves}</span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Explored:</span>
            <span className="dmap-status-val">{explored.length} tiles</span>
          </div>
          {(() => {
            const desc = currentTileDesc(getTileAt(grid, px, py), dungeonMap);
            return desc ? (
              <div className="dmap-status-row" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                <span className="dmap-status-label">Tile:</span>
                <span className="dmap-status-val" style={{ fontSize: 8, color: inCombat ? '#ff7060' : undefined }}>{desc}</span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Party positions */}
        {allPlayers.filter(p => p.id !== player.id && allDungeonMaps[p.id]).length > 0 && (
          <>
            <div className="dmap-sidebar-title" style={{ marginTop: 14 }}>PARTY</div>
            <div className="dmap-status">
              {allPlayers.map((p, idx) => {
                if (p.id === player.id) return null;
                const dm = allDungeonMaps[p.id];
                if (!dm?.pos) return null;
                const [ox, oy] = dm.pos;
                const dist  = Math.max(Math.abs(ox - px), Math.abs(oy - py));
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                const pTileIdx = CLASS_TILES[p.class] ?? CLASS_TILES.warrior;
                const ps = 16;
                return (
                  <div key={p.id} className="dmap-status-row">
                    <div style={{
                      width: ps, height: ps, flexShrink: 0,
                      backgroundImage: "url('/sprites/tilemap_packed.png')",
                      backgroundSize: `${192}px ${176}px`,
                      backgroundPosition: `-${(pTileIdx % 12) * ps}px -${Math.floor(pTileIdx / 12) * ps}px`,
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                      filter: `drop-shadow(0 0 2px ${color}CC)`,
                    }} />
                    <span className="dmap-status-label" style={{ marginLeft: 4 }}>{p.name}</span>
                    <span className="dmap-status-val" style={{ color: dist === 0 ? color : undefined }}>
                      {dist === 0 ? 'here!' : `f${dm.floor || 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {inCombat && (
          <div className="dmap-monster-warning">
            <DungeonMonsterSprite id={activeMonster.id} dp={60} />
            <div className="dmap-warning-name">{activeMonster.name}</div>
            {/* HP bar */}
            <div className="dmap-monster-hp-bg">
              <div className="dmap-monster-hp-fill" style={{ width: `${Math.round((activeMonster.currentHP / activeMonster.maxHP) * 100)}%` }} />
            </div>
            <div className="dmap-warning-sub">HP: {activeMonster.currentHP} / {activeMonster.maxHP}</div>
            <div className="dmap-warning-tip">⚔ Complete chores to fight!</div>
            <div className="dmap-warning-gold">Reward: {activeMonster.gold}g + 3 moves</div>
          </div>
        )}
        {activeMonster && !inCombat && (
          <div className="dmap-monster-warning">
            <DungeonMonsterSprite id={activeMonster.id} dp={60} />
            <div className="dmap-warning-name">{activeMonster.name}</div>
            <div className="dmap-warning-tip">Complete a chore to defeat it</div>
          </div>
        )}
        {!activeMonster && pendingMoves === 0 && (
          <div className="dmap-no-moves">
            <div className="dmap-no-moves-icon">⚡</div>
            <div className="dmap-no-moves-text">Complete chores to earn moves</div>
          </div>
        )}
      </div>

      {/* ── Centre: map + d-pad ── */}
      <div className="dmap-center">
        <div className="dmap-title-row">
          <span className="dmap-main-title">⚔ {player.name}&apos;s Dungeon</span>
          <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: '#b88cff', marginLeft: 10 }}>Floor {floor}</span>
        </div>

        {/* Viewport wrapper — positions the torch-light overlay and d-pad relative to the grid */}
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0 }}>
          <div
            className="dmap-viewport"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${VIEW_W}, ${cellSize}px)`,
              gridTemplateRows:    `repeat(${VIEW_H}, ${cellSize}px)`,
              gap: 0,
              width:  gridW,
              height: gridH,
              imageRendering: 'pixelated',
              border:    '3px solid rgba(110,75,30,0.85)',
              boxShadow: 'inset 0 0 50px rgba(0,0,0,0.85), 0 0 22px rgba(80,50,15,0.55), 0 0 3px rgba(180,120,40,0.35)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: VIEW_W * VIEW_H }, (_, i) => {
              const vx = i % VIEW_W, vy = Math.floor(i / VIEW_W);
              const wx = px + (vx - HALF_W);
              const wy = py + (vy - HALF_H);
              const key        = `${wx},${wy}`;
              const isPlayer   = vx === HALF_W && vy === HALF_H;
              const isExplored = explored.includes(key);
              const dist = Math.max(Math.abs(vx - HALF_W), Math.abs(vy - HALF_H));
              const vis  = dist === 0 ? 'current'
                         : dist === 1 ? 'near'
                         : isExplored  ? 'visited'
                         : dist <= 2   ? 'shadow'
                         : 'fog';
              const tileType   = vis !== 'fog' ? getTileAt(grid, wx, wy) : 'wall';
              const othersHere = (!TILE_CFG[tileType]?.wall && otherPlayerAt[key]) || [];

              if (tileType === 'wall') {
                const hasFloorSouth = vis !== 'fog' && getTileAt(grid, wx, wy + 1) !== 'wall';
                const fog = fogStyle(vis);
                return (
                  <div key={key} style={{ width: cellSize, height: cellSize, position: 'relative' }}>
                    <WallCell size={cellSize} hasFloorSouth={hasFloorSouth} />
                    {fog && <div style={{ position: 'absolute', inset: 0, background: fog, pointerEvents: 'none' }} />}
                  </div>
                );
              }

              return (
                <FloorCell
                  key={key}
                  size={cellSize}
                  tileType={tileType}
                  vis={vis}
                  isPlayer={isPlayer}
                  isExplored={isExplored}
                  hasKey={dungeonMap.hasKey || false}
                  othersHere={othersHere}
                  playerClass={player.class}
                  activeMonster={activeMonster}
                />
              );
            })}
          </div>

          {/* Torch-light vignette — warm glow behind tiles, subtle dark edges */}
          <div style={{
            position:       'absolute',
            inset:          0,
            background:     'radial-gradient(ellipse at 50% 50%, rgba(255,148,40,0.20) 0%, rgba(255,100,20,0.07) 16%, transparent 26%, rgba(0,0,0,0.36) 62%, rgba(0,0,0,0.76) 100%)',
            pointerEvents:  'none',
            zIndex:         1,
            borderRadius:   3,
            animation:      'torch-flicker 4s ease-in-out infinite',
          }} />

          {/* D-pad — overlaid inside the dungeon map */}
          <div className="dmap-dpad" style={{
            position:  'absolute',
            bottom:    12,
            left:      '50%',
            transform: 'translateX(-50%)',
            zIndex:    10,
          }}>
            <div className="dmap-dpad-row">
              <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
                onClick={() => onMove(0, -1)} disabled={!canMoveTo(0, -1)}>▲</button>
            </div>
            <div className="dmap-dpad-row">
              <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
                onClick={() => onMove(-1, 0)} disabled={!canMoveTo(-1, 0)}>◀</button>
              <div style={{ width: cellSize, height: cellSize - 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: pendingMoves > 0 ? '#80c8ff' : 'var(--text2)' }}>
                  {pendingMoves > 0 ? `⚡${pendingMoves}` : '·'}
                </span>
              </div>
              <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
                onClick={() => onMove(1, 0)} disabled={!canMoveTo(1, 0)}>▶</button>
            </div>
            <div className="dmap-dpad-row">
              <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
                onClick={() => onMove(0, 1)} disabled={!canMoveTo(0, 1)}>▼</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">HOW TO PLAY</div>
        <div className="dmap-guide">
          {[
            ['⚔', 'Each chore earns 2 moves (or 1 while in combat)'],
            ['☠', 'Dungeon monsters take multiple chores to defeat — earn gold + 3 moves'],
            ['◇', 'Find the key, then the locked chest for bonus gold'],
            ['▼', 'Stairs descend each floor — deeper = richer'],
            ['▲', 'Stairs up return to the previous floor'],
            ['?', 'Danger tiles are hidden until you enter'],
            ['⭐', 'New day grants bonus moves — dungeon progress never resets'],
          ].map(([icon, text]) => (
            <div key={text} className="dmap-guide-row">
              <span className="dmap-guide-icon">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
