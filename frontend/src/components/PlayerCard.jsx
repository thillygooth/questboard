import React, { useState, useEffect, useRef } from 'react';
import { todayKey, dateSeededMonster, getLevelFromXP, critChanceForLevel, luckForLevel, getPlayerTitle } from '../logic';
import { BADGES } from '../data';
import TileSprite from './TileSprite';
import MonsterSprite from './MonsterSprite';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const CLASS_TILES = {
  warrior: { tile: 87, label: 'Warrior'  },
  mage:    { tile: 84, label: 'Mage'     },
  witch:   { tile: 99, label: 'Witch'    },
  rogue:   { tile: 96, label: 'Rogue'    },
  paladin: { tile: 88, label: 'Paladin'  },
  ranger:  { tile: 82, label: 'Ranger'   },
};

// src, sheetW, sheetH, frameSize (default 64), frames, CSS filter, offsetY px, display override dp
const MONSTER_CFG = {
  // PixelFlush Mega Pack - horizontal frame strips
  green_slime:      { src: '/sprites/monsters2/green_slime.png',     sw:  32, sh:  32, fs: 32, fr: 1 },
  rat:              { src: '/sprites/monsters2/rat.png',             sw:  64, sh:  32, fs: 32, fr: 2 },
  tiny_spider:      { src: '/sprites/monsters2/tiny_spider.png',     sw:  64, sh:  32, fs: 32, fr: 2 },
  forest_imp:       { src: '/sprites/monsters2/forest_imp.png',      sw:  64, sh:  32, fs: 32, fr: 2 },
  wisp:             { src: '/sprites/monsters2/wisp.png',            sw:  64, sh:  32, fs: 32, fr: 2 },
  goblin:           { src: '/sprites/monsters2/goblin.png',          sw:  64, sh:  32, fs: 32, fr: 2 },
  night_imp:        { src: '/sprites/monsters2/night_imp.png',       sw:  64, sh:  32, fs: 32, fr: 2 },
  spectral_hound:   { src: '/sprites/monsters2/spectral_hound.png',  sw:  64, sh:  32, fs: 32, fr: 2 },
  shadow_man:       { src: '/sprites/monsters2/shadow_man.png',      sw:  64, sh:  32, fs: 32, fr: 2 },
  plaguebearer:     { src: '/sprites/monsters2/plaguebearer.png',    sw:  64, sh:  32, fs: 32, fr: 2 },
  large_snake:      { src: '/sprites/monsters2/large_snake.png',     sw:  64, sh:  32, fs: 32, fr: 2 },
  reaper:           { src: '/sprites/monsters2/reaper.png',          sw:  64, sh:  32, fs: 32, fr: 2 },
  frost_yetling:    { src: '/sprites/monsters2/frost_yetling.png',   sw:  64, sh:  32, fs: 32, fr: 2 },
  toxic_slime:      { src: '/sprites/monsters2/toxic_slime.png',     sw:  64, sh:  32, fs: 32, fr: 2 },
  molten_golem:     { src: '/sprites/monsters2/molten_golem.png',    sw:  64, sh:  32, fs: 32, fr: 2 },
  mirrorfiend:      { src: '/sprites/monsters2/mirrorfiend.png',     sw:  64, sh:  32, fs: 32, fr: 2 },
  skeleton:         { src: '/sprites/monsters2/skeleton.png',        sw:  96, sh:  32, fs: 32, fr: 3 },
  chaos_imp:        { src: '/sprites/monsters2/chaos_imp.png',       sw:  96, sh:  32, fs: 32, fr: 3 },
  skeleton_warrior: { src: '/sprites/monsters2/skeleton_warrior.png',sw:  96, sh:  32, fs: 32, fr: 3 },
  fire_elemental:   { src: '/sprites/monsters2/fire_elemental.png',  sw: 128, sh:  32, fs: 32, fr: 4 },
  phantom_minotaur: { src: '/sprites/monsters2/phantom_minotaur.png',sw: 144, sh:  48, fs: 48, fr: 3 },
  frost_golem:      { src: '/sprites/monsters2/frost_golem.png',     sw: 144, sh:  48, fs: 48, fr: 3, dp: 52 },
  giant_spider:     { src: '/sprites/monsters2/giant_spider.png',    sw: 256, sh:  64, fs: 64, fr: 4, dp: 60 },
  cave_troll:       { src: '/sprites/monsters2/cave_troll.png',      sw: 256, sh:  64, fs: 64, fr: 4, dp: 60 },
  sandworm:         { src: '/sprites/monsters2/sandworm.png',        sw: 128, sh:  32, fs: 32, fr: 4 },
  volcano_drake:    { src: '/sprites/monsters2/volcano_drake.png',   sw: 256, sh:  64, fs: 64, fr: 4, dp: 64 },
  happy_blob:       { src: '/sprites/monsters2/happy_blob.png',      sw: 256, sh:  64, fs: 64, fr: 4, dp: 56 },
  // JRPG Pack - single-frame sprites
  evil_shroom:      { src: '/sprites/monsters2/evil_shroom.png',     sw:  32, sh:  32, fs: 32, fr: 1 },
  void_devil:       { src: '/sprites/monsters2/void_devil.png',      sw:  32, sh:  32, fs: 32, fr: 1 },
  wild_buck:        { src: '/sprites/monsters2/wild_buck.png',       sw:  48, sh:  48, fs: 48, fr: 1 },
  mimic:            { src: '/sprites/monsters2/mimic.png',           sw:  48, sh:  48, fs: 48, fr: 1 },
  rock_golem:       { src: '/sprites/monsters2/rock_golem.png',      sw:  48, sh:  48, fs: 48, fr: 1, dp: 54 },
  jrpg_ogre:        { src: '/sprites/monsters2/jrpg_ogre.png',       sw:  48, sh:  48, fs: 48, fr: 1, dp: 56 },
  // Dark Fantasy Enemies - Bat (animated 9-frame idle strip)
  cave_bat:         { src: '/sprites/monsters2/cave_bat.png',        sw: 576, sh:  64, fs: 64, fr: 9 },
  // Scifi Pack - walk loops start at frame 0
  cyber_walker:     { src: '/sprites/monsters2/cyber_walker.png',    sw: 400, sh: 160, fs: 40, fr: 4 },
  cyber_drone:      { src: '/sprites/monsters2/cyber_drone.png',     sw: 320, sh: 288, fs: 32, fr: 4 },
};

export default function PlayerCard({ player, gold, xp, isSelected, onClick, monsterDamage, monsterBaseline, lastHit, streak, monster, prestige, badges, onPrestige }) {
  const tKey = todayKey();
  const m = monster || dateSeededMonster(player, tKey);
  const totalDmg = (monsterDamage?.[player.id]?.[tKey]) || 0;
  const baseline = (monsterBaseline?.[player.id]?.[tKey]) || 0;
  const dmg = totalDmg - baseline;
  const hp = Math.max(0, m.maxHP - dmg);
  const dead = hp === 0;
  const pct = Math.round((hp / m.maxHP) * 100);
  const low = pct < 30;

  const charCfg = CLASS_TILES[player.class] ?? CLASS_TILES.warrior;
  const mc = MONSTER_CFG[m.id] ?? MONSTER_CFG.green_slime;
  const { level, xpInLevel, xpNeeded } = getLevelFromXP(xp || 0);
  const critPct = Math.round(critChanceForLevel(level) * 100);
  const luckPct = Math.round(luckForLevel(level) * 100);
  const title = getPlayerTitle(badges || []);
  const prestigeCount = prestige || 0;
  const earnedBadges = (badges || []).map(id => BADGES.find(b => b.id === id)).filter(Boolean);

  // Hit flash state: triggered by lastHit changing
  const [hitting, setHitting] = useState(false);
  const [dmgNum, setDmgNum] = useState(null);
  const [isCritHit, setIsCritHit] = useState(false);
  const prevHit = useRef(lastHit);

  useEffect(() => {
    if (lastHit && lastHit !== prevHit.current) {
      prevHit.current = lastHit;
      setHitting(true);
      setDmgNum(lastHit.pts);
      setIsCritHit(!!lastHit.crit);
      setTimeout(() => setHitting(false), 350);
      setTimeout(() => { setDmgNum(null); setIsCritHit(false); }, 900);
    }
  }, [lastHit]);

  return (
    <div className={`player-card ${isSelected ? 'active' : ''}`} onClick={onClick} style={{ backgroundColor: hexToRgba(player.color, 0.10) }}>
      <div className={`char-sprite${isSelected ? ' char-active' : ''}`}>
        <TileSprite tile={charCfg.tile} scale={4} />
      </div>
      <div className="player-info">
        <div className="player-name">
          {player.name}
          {prestigeCount > 0 && <span className="prestige-stars">{'⭐'.repeat(prestigeCount)}</span>}
        </div>
        {title && <div className="player-title">{title}</div>}
        <div className="player-class">{charCfg.label}</div>
        <div className="player-pts">
          <span className="gold-coin" />
          <span className="pixel-num">{gold}</span>
          <span className="player-pts-label">gold</span>
        </div>
        <div className="player-level">
          <span className="level-badge">Lv {level}</span>
          <span className="crit-chance">{critPct}% crit</span>
          <span className="luck-chance">{Math.round(luckForLevel(level) * 100)}% luck</span>
        </div>
        <div className="xp-bar-outer" title={`${xpInLevel}/${xpNeeded} XP`}>
          <div className="xp-bar-fill" style={{ width: `${Math.round((xpInLevel / xpNeeded) * 100)}%`, background: `linear-gradient(90deg, ${player.color}, ${player.textColor})` }} />
        </div>
        {streak > 0 && (
          <div className="player-streak">
            <TileSprite tile={131} display={11} />
            {streak}d streak
          </div>
        )}
        {earnedBadges.length > 0 && (
          <div className="badge-row">
            {earnedBadges.slice(-5).map(b => (
              <span key={b.id} className="badge-icon" title={`${b.name}: ${b.desc}`}>{b.icon}</span>
            ))}
          </div>
        )}
        {level >= 10 && onPrestige && (
          <button
            className="prestige-btn"
            onClick={e => { e.stopPropagation(); onPrestige(player.id); }}
            title="Prestige: reset XP for permanent gold bonus"
          >⭐ PRESTIGE</button>
        )}
      </div>
      <div className={`monster-section${dead ? ' monster-dead' : ''}`}>
        <div className={`monster-name${dead ? ' defeated' : ''}`}>
          <TileSprite tile={dead ? 123 : 118} display={10} />
          {m.name}
        </div>
        <div className="monster-sprite-wrap" style={{ position: 'relative' }}>
          {dead ? (
            <div className="bones-display"><TileSprite tile={123} display={36} /></div>
          ) : (
            <>
              <div className={hitting ? 'monster-hit' : ''}>
                <MonsterSprite
                  src={mc.src}
                  sheetW={mc.sw}
                  sheetH={mc.sh}
                  frameSize={mc.fs ?? 64}
                  frames={mc.fr ?? 4}
                  fps={6}
                  display={mc.dp ?? 48}
                  filter={mc.f}
                  offsetY={mc.oy ?? 0}
                />
              </div>
              {dmgNum !== null && (
                <div className={`dmg-number${isCritHit ? ' crit' : ''}`}>
                  {isCritHit ? '⚡' : ''}-{dmgNum}
                </div>
              )}
              {hitting && <div className="hit-flash" />}
            </>
          )}
        </div>
        <div className="hp-text"><span className="pixel-num">{dead ? `+${m.gold} gold!` : `HP ${hp}/${m.maxHP}`}</span></div>
        <div className="hp-bar-outer">
          <div className={`hp-bar-fill${low ? ' low' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
