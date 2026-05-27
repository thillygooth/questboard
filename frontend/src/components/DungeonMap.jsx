import React from 'react';
import { getTileAt } from '../logic';

const VIEW = 9;        // viewport side length (odd = player in center)
const HALF = 4;        // floor(VIEW/2)
const CELL = 36;       // px per cell

// Tiles hidden until player actually steps on them (random encounter)
const HIDDEN_TYPES = new Set(['trap', 'monster']);
// Tiles whose icons are visible from 1 tile away (not fog) — discoverable before stepping
const NEAR_VISIBLE_TYPES = new Set(['stairs']);

// Visual config per room type — only shown on explored cells
const ROOM_STYLE = {
  start:    { bg: '#0e2c1c', icon: '★', iconColor: '#50c870' },
  corridor: { bg: '#110e18', icon: null },
  empty:    { bg: '#13101e', icon: null },
  gold_s:   { bg: '#1a1606', icon: '·',  iconColor: '#c8952a' },
  gold_l:   { bg: '#221c08', icon: '◆',  iconColor: '#e8b84b' },
  chest:    { bg: '#26200a', icon: '▣',  iconColor: '#ffe060' },
  trap:     { bg: '#220808', icon: '✕',  iconColor: '#cc3030' },  // icon hidden until visited
  monster:  { bg: '#1e0c14', icon: '☠',  iconColor: '#dd3050' },  // icon hidden until visited
  stairs:   { bg: '#12082a', icon: '↓',  iconColor: '#b88cff' },  // visible when near
};

const FLOOR_TILE_SIZE = 32; // puny_dungeon tile size
// puny_dungeon.png: 416x320, 16px native tiles, we'll use 32x32 sections
const FLOOR_BG = "url('/sprites/dungeon_floor.png')";

const PLAYER_COLORS = ['#50b8ff', '#50e870', '#ff9050', '#e050ff'];

function getCellStyle(tileType, vis, isPlayer, isCorridor) {
  if (vis === 'fog') {
    return { backgroundColor: '#020105' };
  }

  const style = ROOM_STYLE[tileType] || ROOM_STYLE.empty;

  if (vis === 'shadow') {
    // Within view range but not current — dark stone texture
    return {
      backgroundImage: FLOOR_BG,
      backgroundSize: '128px 64px',
      backgroundColor: '#0a0812',
      backgroundBlendMode: 'luminosity',
      opacity: 0.45,
    };
  }

  // Explored or current — show floor texture with tint
  return {
    backgroundImage: FLOOR_BG,
    backgroundSize: '128px 64px',
    backgroundColor: style.bg,
    backgroundBlendMode: 'overlay',
    opacity: isPlayer ? 1 : (vis === 'near' ? 1 : 0.75),
  };
}

export default function DungeonMap({ player, dungeonMap, allPlayers = [], allDungeonMaps = {}, onMove, cellSize = CELL }) {
  if (!dungeonMap || !player) return null;
  const { pos, explored, pendingMoves, activeMonster, dayKey, floor = 1 } = dungeonMap;
  const [px, py] = pos;
  const canMove = pendingMoves > 0 && !activeMonster;

  // Build a lookup: world key → [{ player, color }] for other players' positions
  const otherPlayerAt = {};
  allPlayers.forEach((p, idx) => {
    if (p.id === player.id) return;
    const dm = allDungeonMaps[p.id];
    if (!dm) return;
    const k = `${dm.pos[0]},${dm.pos[1]}`;
    if (!otherPlayerAt[k]) otherPlayerAt[k] = [];
    otherPlayerAt[k].push({ player: p, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] });
  });

  // Build the 9×9 viewport centered on player
  const cells = [];
  for (let vy = 0; vy < VIEW; vy++) {
    for (let vx = 0; vx < VIEW; vx++) {
      const wx = px + (vx - HALF);   // world x
      const wy = py + (vy - HALF);   // world y
      const key = `${wx},${wy}`;
      const isPlayer = vx === HALF && vy === HALF;
      const isExplored = explored.includes(key);

      // Fog of war: only current + adjacent (1 tile) are "near", explored = seen before
      const distFromPlayer = Math.max(Math.abs(vx - HALF), Math.abs(vy - HALF));
      let vis;
      if (distFromPlayer === 0) vis = 'current';
      else if (distFromPlayer === 1) vis = 'near';
      else if (isExplored) vis = 'visited';
      else if (distFromPlayer <= 2) vis = 'shadow';
      else vis = 'fog';

      const tileType = (vis !== 'fog') ? getTileAt(dayKey, floor, wx, wy) : 'empty';
      const isCorridor = tileType === 'corridor';
      const othersHere = otherPlayerAt[key] || [];

      // Decide what icon to show
      const styleDef = ROOM_STYLE[tileType] || ROOM_STYLE.empty;
      const isHidden = HIDDEN_TYPES.has(tileType) && !isExplored;
      // Near-visible types (stairs) show icon when within sight, others only when explored
      const showIcon = styleDef.icon && !isPlayer && !isHidden && (
        isExplored || (NEAR_VISIBLE_TYPES.has(tileType) && (vis === 'near' || vis === 'current'))
      );

      cells.push({
        key, vx, vy, wx, wy, isPlayer, vis, tileType, isCorridor,
        showIcon,
        icon: styleDef.icon,
        iconColor: styleDef.iconColor,
        cellStyle: getCellStyle(tileType, vis, isPlayer, isCorridor),
        othersHere,
      });
    }
  }

  const gridPx = VIEW * cellSize + (VIEW - 1) * 2;

  return (
    <div className="dmap-tab-layout">
      {/* Left sidebar */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">LEGEND</div>
        <div className="dmap-legend">
          {[
            { icon: '@',  color: '#50b8ff', label: 'You' },
            { icon: '@',  color: '#50e870', label: 'Party' },
            { icon: '·',  color: '#c8952a', label: 'Small gold' },
            { icon: '◆',  color: '#e8b84b', label: 'Treasure' },
            { icon: '▣',  color: '#ffe060', label: 'Chest' },
            { icon: '↓',  color: '#b88cff', label: 'Stairs down' },
            { icon: '?',  color: '#666',    label: 'Danger (hidden)' },
            { icon: '★',  color: '#50c870', label: 'Start' },
          ].map(({ icon, color, label }) => (
            <div key={label} className="dmap-legend-row">
              <span style={{ color, fontFamily: 'var(--pixel)', fontSize: 10 }}>{icon}</span>
              <span className="dmap-legend-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="dmap-sidebar-title" style={{ marginTop: 18 }}>STATUS</div>
        <div className="dmap-status">
          <div className="dmap-status-row">
            <span className="dmap-status-label">Floor:</span>
            <span className="dmap-status-val" style={{ color: '#b88cff' }}>{floor}</span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Moves:</span>
            <span className="dmap-status-val" style={{ color: pendingMoves > 0 ? '#80c8ff' : '#555' }}>
              {pendingMoves}
            </span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Visited:</span>
            <span className="dmap-status-val">{explored.length} rooms</span>
          </div>
          <div className="dmap-status-row">
            <span className="dmap-status-label">Position:</span>
            <span className="dmap-status-val">{px},{py}</span>
          </div>
        </div>

        {allPlayers.filter(p => p.id !== player.id && allDungeonMaps[p.id]).length > 0 && (
          <>
            <div className="dmap-sidebar-title" style={{ marginTop: 18 }}>PARTY</div>
            <div className="dmap-status">
              {allPlayers.map((p, idx) => {
                if (p.id === player.id) return null;
                const dm = allDungeonMaps[p.id];
                if (!dm) return null;
                const [ox, oy] = dm.pos;
                const dist = Math.max(Math.abs(ox - px), Math.abs(oy - py));
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                return (
                  <div key={p.id} className="dmap-status-row">
                    <span style={{ color, fontFamily: 'var(--pixel)', fontSize: 9 }}>@</span>
                    <span className="dmap-status-label" style={{ marginLeft: 4 }}>{p.name}</span>
                    <span className="dmap-status-val" style={{ color: dist === 0 ? color : undefined }}>
                      {dist === 0 ? 'here!' : `${ox},${oy}`}
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
          <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: '#b88cff', marginLeft: 10 }}>
            Floor {floor}
          </span>
        </div>

        {/* Map grid */}
        <div
          className="dmap-viewport"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${VIEW}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${VIEW}, ${cellSize}px)`,
            gap: 2,
            width: gridPx,
            imageRendering: 'pixelated',
            border: '2px solid rgba(80,50,20,0.6)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {cells.map(({ key, vx, vy, wx, wy, isPlayer, vis, tileType, isCorridor, showIcon, icon, iconColor, cellStyle, othersHere }) => {
            const fontSize = isCorridor ? Math.round(cellSize * 0.3) : Math.round(cellSize * 0.45);
            const isActiveMonsterHere = isPlayer && !!activeMonster;

            // Narrow corridor visual: inner padding
            const innerPad = isCorridor && !isPlayer ? Math.round(cellSize * 0.22) : 0;

            return (
              <div
                key={key}
                style={{
                  width: cellSize,
                  height: cellSize,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundPosition: `${(((wx % 4) + 4) % 4) * cellSize}px ${(((wy % 2) + 2) % 2) * cellSize}px`,
                  ...cellStyle,
                }}
              >
                {/* Corridor narrowing overlay */}
                {isCorridor && !isPlayer && vis !== 'fog' && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `
                      linear-gradient(to bottom, #020105 ${innerPad}px, transparent ${innerPad}px, transparent ${cellSize - innerPad}px, #020105 ${cellSize - innerPad}px)
                    `,
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Player marker */}
                {isPlayer && (
                  <span style={{
                    fontFamily: 'var(--pixel)',
                    fontSize: Math.round(cellSize * 0.5),
                    color: isActiveMonsterHere ? '#ff4060' : '#50b8ff',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    textShadow: isActiveMonsterHere
                      ? '0 0 8px rgba(255,64,96,0.9)'
                      : '0 0 8px rgba(80,184,255,0.8)',
                    zIndex: 2,
                    position: 'relative',
                  }}>
                    {isActiveMonsterHere ? '!' : '@'}
                  </span>
                )}

                {/* Other players on this cell */}
                {othersHere.length > 0 && !isPlayer && vis !== 'fog' && (
                  <span style={{
                    fontFamily: 'var(--pixel)',
                    fontSize: Math.round(cellSize * 0.45),
                    color: othersHere[0].color,
                    lineHeight: 1,
                    textShadow: `0 0 8px ${othersHere[0].color}99`,
                    position: 'relative',
                    zIndex: 3,
                  }}>
                    @
                  </span>
                )}

                {/* Room icon */}
                {showIcon && othersHere.length === 0 && (
                  <span style={{
                    fontFamily: 'var(--pixel)',
                    fontSize,
                    color: iconColor,
                    lineHeight: 1,
                    opacity: vis === 'visited' ? 0.65 : 1,
                    textShadow: `0 0 4px ${iconColor}60`,
                    position: 'relative',
                    zIndex: 2,
                  }}>
                    {icon}
                  </span>
                )}

                {/* Fog of war overlay for shadow/near cells */}
                {(vis === 'shadow') && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2,1,5,0.55)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* D-pad */}
        <div className="dmap-dpad" style={{ marginTop: 16 }}>
          <div className="dmap-dpad-row">
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(0, -1)} disabled={!canMove} title="North">▲</button>
          </div>
          <div className="dmap-dpad-row">
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(-1, 0)} disabled={!canMove} title="West">◀</button>
            <div style={{ width: cellSize, height: cellSize - 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: 'var(--text2)' }}>
                {pendingMoves > 0 ? `⚡${pendingMoves}` : '·'}
              </span>
            </div>
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(1, 0)} disabled={!canMove} title="East">▶</button>
          </div>
          <div className="dmap-dpad-row">
            <button className="dmap-btn" style={{ width: cellSize, height: cellSize - 4 }}
              onClick={() => onMove(0, 1)} disabled={!canMove} title="South">▼</button>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="dmap-sidebar">
        <div className="dmap-sidebar-title">HOW TO PLAY</div>
        <div className="dmap-guide">
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon">⚔</span>
            <span>Each chore earns 1 move</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon" style={{ color: '#c8952a' }}>◆</span>
            <span>Gold rooms give bonus coins</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon" style={{ color: '#ffe060' }}>▣</span>
            <span>Chests are the biggest reward</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon">?</span>
            <span>Danger rooms are hidden — step in to trigger them</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon">☠</span>
            <span>Monsters block movement until a chore is done</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon">🌫</span>
            <span>Map resets at midnight</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon" style={{ color: '#b88cff' }}>↓</span>
            <span>Stairs take you to the next floor — deeper = richer rewards</span>
          </div>
          <div className="dmap-guide-row">
            <span className="dmap-guide-icon">∞</span>
            <span>The dungeon is infinite — explore as far as you dare</span>
          </div>
        </div>
      </div>
    </div>
  );
}
