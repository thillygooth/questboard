import React from 'react';
import { getTileAt, GRID_W, GRID_H } from '../logic';

const VIEW = 11;       // viewport side (odd = player centered)
const HALF = 5;
const CELL = 34;       // px per cell

// Sprites — all 16px native tiles displayed at 2× (32px) or scaled to CELL
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
  monster:      { wall: false, obj: null, icon: '☠', iconColor: '#dd3050' },
  key:          { wall: false, obj: `${S}/Key.png`,           fw: 128, fh: 16, frames: 8, tw: 16, th: 16 },
  locked_chest: { wall: false, obj: `${S}/Chest_Closed.png`,  fw: 112, fh: 32, frames: 7, tw: 16, th: 32 },
  stairs_down:  { wall: false, obj: `${S}/Trapdoor.png`,      fw: 96,  fh: 32, frames: 3, tw: 32, th: 32 },
  stairs_up:    { wall: false, obj: `${S}/Trapdoor.png`,      fw: 96,  fh: 32, frames: 3, tw: 32, th: 32, frame: 2 },
};

const HIDDEN_TYPES = new Set(['trap', 'monster']);
const NEAR_VISIBLE  = new Set(['stairs_down', 'stairs_up', 'key', 'locked_chest']);

const PLAYER_COLORS = ['#50b8ff', '#50e870', '#ff9050', '#e050ff'];

// Fog tint based on visibility
function fogStyle(vis) {
  if (vis === 'fog')    return 'rgba(2,1,5,0.98)';
  if (vis === 'shadow') return 'rgba(2,1,5,0.72)';
  if (vis === 'visited') return 'rgba(2,1,5,0.38)';
  return null;
}

function WallCell({ size, hasFloorSouth }) {
  return (
    <div style={{
      width: size, height: size,
      backgroundColor: hasFloorSouth ? '#2c2440' : '#0e0c18',
      borderBottom: hasFloorSouth ? `3px solid #4a3e6a` : 'none',
      boxSizing: 'border-box',
    }} />
  );
}

function FloorCell({ size, tileType, vis, isPlayer, isExplored, hasKey, othersHere }) {
  const cfg = TILE_CFG[tileType] || {};
  const isHidden  = HIDDEN_TYPES.has(tileType) && !isExplored;
  const isNearVis = NEAR_VISIBLE.has(tileType) && (vis === 'near' || vis === 'current' || isExplored);
  const showObj   = cfg.obj && !isHidden && (isExplored || isNearVis);
  const showIcon  = cfg.icon && !isHidden && isExplored;

  const frame = cfg.frame ?? 0;
  const objScale = cfg.th === 32 ? 1.5 : 2; // tall sprites at 1.5×, others at 2×
  const objW = cfg.tw ? cfg.tw * objScale : size;
  const objH = cfg.th ? cfg.th * objScale : size;
  const stripW = cfg.fw ? cfg.fw * objScale : size;
  const stripH = cfg.fh ? cfg.fh * objScale : size;

  // Locked chest glows gold when player holds the key
  const chestTint = tileType === 'locked_chest' && hasKey ? 'sepia(1) saturate(3) hue-rotate(10deg)' : undefined;

  const fog = fogStyle(vis);

  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Floor texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url('${S}/Floor.png')`,
        backgroundSize: `${size}px ${size}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }} />

      {/* Object sprite */}
      {showObj && (
        <div style={{
          position: 'absolute',
          bottom: tileType === 'stairs_down' || tileType === 'stairs_up' ? 0 : 2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: objW, height: objH,
          backgroundImage: `url('${cfg.obj}')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `-${frame * objW}px 0`,
          backgroundSize: `${stripW}px ${stripH}px`,
          imageRendering: 'pixelated',
          filter: chestTint,
          zIndex: 2,
        }} />
      )}

      {/* Icon fallback (monster) */}
      {showIcon && !showObj && (
        <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.45), color: cfg.iconColor, zIndex: 2, position: 'relative' }}>
          {cfg.icon}
        </span>
      )}

      {/* Start marker */}
      {tileType === 'start' && isExplored && !isPlayer && (
        <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.4), color: '#50c870', zIndex: 2, position: 'relative' }}>★</span>
      )}

      {/* Other players */}
      {othersHere.length > 0 && !isPlayer && (
        <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.45), color: othersHere[0].color, textShadow: `0 0 8px ${othersHere[0].color}99`, zIndex: 3, position: 'relative' }}>@</span>
      )}

      {/* Player marker */}
      {isPlayer && (
        <span style={{ fontFamily: 'var(--pixel)', fontSize: Math.round(size * 0.5), color: '#50b8ff', fontWeight: 'bold', textShadow: '0 0 8px rgba(80,184,255,0.9)', zIndex: 3, position: 'relative' }}>@</span>
      )}

      {/* Fog overlay */}
      {fog && <div style={{ position: 'absolute', inset: 0, background: fog, zIndex: 4, pointerEvents: 'none' }} />}
    </div>
  );
}

export default function DungeonMap({ player, dungeonMap, allPlayers = [], allDungeonMaps = {}, onMove, cellSize = CELL }) {
  if (!dungeonMap?.grid || !player) return null;
  const { grid, pos, explored, pendingMoves, activeMonster, floor = 1 } = dungeonMap;
  const [px, py] = pos;
  const canMove = pendingMoves > 0 && !activeMonster;

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

  const gridPx = VIEW * cellSize + (VIEW - 1) * 1;

  return (
    <div className="dmap-tab-layout">
      {/* Left sidebar */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">LEGEND</div>
        <div className="dmap-legend">
          {[
            { icon: '@', color: '#50b8ff', label: 'You' },
            { icon: '@', color: '#50e870', label: 'Party' },
            { icon: '◇', color: '#ffd700', label: 'Key' },
            { icon: '▣', color: '#778899', label: 'Locked chest' },
            { icon: '▼', color: '#b88cff', label: 'Stairs down' },
            { icon: '▲', color: '#88c8ff', label: 'Stairs up' },
            { icon: '?', color: '#666',    label: 'Danger' },
            { icon: '★', color: '#50c870', label: 'Start' },
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
            <span className="dmap-status-val">{explored.length} rooms</span>
          </div>
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
                const dist = Math.max(Math.abs(ox - px), Math.abs(oy - py));
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                return (
                  <div key={p.id} className="dmap-status-row">
                    <span style={{ color, fontFamily: 'var(--pixel)', fontSize: 9 }}>@</span>
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

        {activeMonster && (
          <div className="dmap-monster-warning">
            <div className="dmap-warning-glyph">☠</div>
            <div className="dmap-warning-name">{activeMonster.name}</div>
            <div className="dmap-warning-sub">blocks your path!</div>
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

      {/* Center: map + d-pad */}
      <div className="dmap-center">
        <div className="dmap-title-row">
          <span className="dmap-main-title">⚔ {player.name}&apos;s Dungeon</span>
          <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: '#b88cff', marginLeft: 10 }}>Floor {floor}</span>
        </div>

        <div
          className="dmap-viewport"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${VIEW}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${VIEW}, ${cellSize}px)`,
            gap: 1,
            width: gridPx,
            imageRendering: 'pixelated',
            border: '2px solid rgba(80,50,20,0.5)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.6)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: VIEW * VIEW }, (_, i) => {
            const vx = i % VIEW, vy = Math.floor(i / VIEW);
            const wx = px + (vx - HALF);
            const wy = py + (vy - HALF);
            const key = `${wx},${wy}`;
            const isPlayer = vx === HALF && vy === HALF;
            const isExplored = explored.includes(key);
            const dist = Math.max(Math.abs(vx - HALF), Math.abs(vy - HALF));
            const vis = dist === 0 ? 'current' : dist === 1 ? 'near' : isExplored ? 'visited' : dist <= 2 ? 'shadow' : 'fog';
            const tileType = vis !== 'fog' ? getTileAt(grid, wx, wy) : 'wall';
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
              />
            );
          })}
        </div>

        {/* D-pad */}
        <div className="dmap-dpad" style={{ marginTop: 12 }}>
          <div className="dmap-dpad-row">
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(0, -1)} disabled={!canMoveTo(0, -1)}>▲</button>
          </div>
          <div className="dmap-dpad-row">
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(-1, 0)} disabled={!canMoveTo(-1, 0)}>◀</button>
            <div style={{ width: cellSize, height: cellSize - 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: 'var(--text2)' }}>
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

      {/* Right sidebar */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">HOW TO PLAY</div>
        <div className="dmap-guide">
          {[
            ['⚔', 'Each chore earns 2 moves'],
            ['☠', 'Defeat dungeon monsters for 3 moves'],
            ['◇', 'Find the key, then the locked chest for big gold'],
            ['▼', 'One staircase down per floor — deeper = richer'],
            ['▲', 'Stairs up go back to the previous floor'],
            ['?', 'Danger rooms are hidden until you enter'],
            ['🌫', 'Map resets at midnight'],
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
