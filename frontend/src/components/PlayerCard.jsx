import React, { useState, useEffect, useRef, useCallback } from 'react';
import { todayKey, dateSeededMonster, resolveMonster, getLevelFromXP, critChanceForLevel, luckForLevel, getPlayerTitle, getTitleForBadge } from '../logic';
import { BADGES, TITLES, POWER_UPS, OVERKILL_CHARGE_GOAL, CLASSES } from '../data';
import TileSprite from './TileSprite';
import MonsterSprite from './MonsterSprite';

function HpSegBar({ hp, maxHP, low }) {
  const segments = Math.min(maxHP, 20);
  const filledSegs = maxHP > 0 ? Math.round((hp / maxHP) * segments) : 0;
  return (
    <div className="hp-bar-segmented">
      {Array.from({ length: segments }, (_, i) => (
        <div key={i} className={`hp-seg${i < filledSegs ? (low ? ' filled low' : ' filled') : ''}`} />
      ))}
    </div>
  );
}

function OverkillBar({ charge, goal }) {
  return (
    <div className="overkill-bar" title={`Overkill ${Math.min(charge, goal)}/${goal}`}>
      {Array.from({ length: goal }, (_, i) => (
        <div key={i} className={`overkill-seg${i < charge ? ' filled' : ''}${charge >= goal ? ' ready' : ''}`} />
      ))}
    </div>
  );
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Derived from CLASSES in data.js — add new classes there, not here.
const CLASS_TILES = Object.fromEntries(
  CLASSES.map(({ id, label, tile }) => [id, { tile, label }])
);

const MONSTER_CFG = {
  // PixelFlush Mega Pack - horizontal frame strips
  green_slime:      { src: '/sprites/monsters2/green_slime.png',     sw:  32, sh:  32, fs: 32, fr: 1, dp: 52 },
  rat:              { src: '/sprites/monsters2/rat.png',             sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  tiny_spider:      { src: '/sprites/monsters2/tiny_spider.png',     sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  forest_imp:       { src: '/sprites/monsters2/forest_imp.png',      sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  wisp:             { src: '/sprites/monsters2/wisp.png',            sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  goblin:           { src: '/sprites/monsters2/goblin.png',          sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  night_imp:        { src: '/sprites/monsters2/night_imp.png',       sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  spectral_hound:   { src: '/sprites/monsters2/spectral_hound.png',  sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  shadow_man:       { src: '/sprites/monsters2/shadow_man.png',      sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  plaguebearer:     { src: '/sprites/monsters2/plaguebearer.png',    sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  large_snake:      { src: '/sprites/monsters2/large_snake.png',     sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  reaper:           { src: '/sprites/monsters2/reaper.png',          sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  frost_yetling:    { src: '/sprites/monsters2/frost_yetling.png',   sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  toxic_slime:      { src: '/sprites/monsters2/toxic_slime.png',     sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  molten_golem:     { src: '/sprites/monsters2/molten_golem.png',    sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  mirrorfiend:      { src: '/sprites/monsters2/mirrorfiend.png',     sw:  64, sh:  32, fs: 32, fr: 2, dp: 52 },
  skeleton:         { src: '/sprites/monsters2/skeleton.png',        sw:  96, sh:  32, fs: 32, fr: 3, dp: 52 },
  chaos_imp:        { src: '/sprites/monsters2/chaos_imp.png',       sw:  96, sh:  32, fs: 32, fr: 3, dp: 52 },
  skeleton_warrior: { src: '/sprites/monsters2/skeleton_warrior.png',sw:  96, sh:  32, fs: 32, fr: 3, dp: 56 },
  fire_elemental:   { src: '/sprites/monsters2/fire_elemental.png',  sw: 128, sh:  32, fs: 32, fr: 4, dp: 56 },
  phantom_minotaur: { src: '/sprites/monsters2/phantom_minotaur.png',sw: 144, sh:  48, fs: 48, fr: 3, dp: 64 },
  frost_golem:      { src: '/sprites/monsters2/frost_golem.png',     sw: 144, sh:  48, fs: 48, fr: 3, dp: 64 },
  giant_spider:     { src: '/sprites/monsters2/giant_spider.png',    sw: 256, sh:  64, fs: 64, fr: 4, dp: 80 },
  cave_troll:       { src: '/sprites/monsters2/cave_troll.png',      sw: 256, sh:  64, fs: 64, fr: 4, dp: 80 },
  sandworm:         { src: '/sprites/monsters2/sandworm.png',        sw: 128, sh:  32, fs: 32, fr: 4, dp: 56 },
  volcano_drake:    { src: '/sprites/monsters2/volcano_drake.png',   sw: 256, sh:  64, fs: 64, fr: 4, dp: 88 },
  happy_blob:       { src: '/sprites/monsters2/happy_blob.png',      sw: 256, sh:  64, fs: 64, fr: 4, dp: 80 },
  // JRPG Pack - single-frame sprites
  evil_shroom:      { src: '/sprites/monsters2/evil_shroom.png',     sw:  32, sh:  32, fs: 32, fr: 1, dp: 52 },
  void_devil:       { src: '/sprites/monsters2/void_devil.png',      sw:  32, sh:  32, fs: 32, fr: 1, dp: 52 },
  wild_buck:        { src: '/sprites/monsters2/wild_buck.png',       sw:  48, sh:  48, fs: 48, fr: 1, dp: 64 },
  mimic:            { src: '/sprites/monsters2/mimic.png',           sw:  48, sh:  48, fs: 48, fr: 1, dp: 64 },
  rock_golem:       { src: '/sprites/monsters2/rock_golem.png',      sw:  48, sh:  48, fs: 48, fr: 1, dp: 64 },
  jrpg_ogre:        { src: '/sprites/monsters2/jrpg_ogre.png',       sw:  48, sh:  48, fs: 48, fr: 1, dp: 68 },
  // Dark Fantasy Enemies - Bat (animated 9-frame idle strip)
  cave_bat:         { src: '/sprites/monsters2/cave_bat.png',        sw: 576, sh:  64, fs: 64, fr: 9, dp: 80 },
  // Cyber Tooth
  cyber_walker:     { src: '/sprites/monsters2/cyber_tooth.png',     sw: 240, sh:  48, fs: 48, fr: 5, dp: 72 },
  cyber_drone:      { src: '/sprites/monsters2/cyber_drone.png',     sw: 320, sh: 288, fs: 32, fr: 4, dp: 52 },
};

function BadgeTooltip({ badge }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="badge-icon"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative' }}
    >
      {badge.icon}
      {visible && (
        <span className="badge-tooltip">
          <span className="badge-tooltip-name">{badge.name}</span>
          <span className="badge-tooltip-desc">{badge.desc}</span>
        </span>
      )}
    </span>
  );
}

export default function PlayerCard({ player, gold, xp, isSelected, onClick, monsterDamage, lastHit, streak, monster, prestige, badges, selectedTitleBadge, onSelectTitle, onPrestige, activePowerUps = [], overkillCharge = 0, storedPowerTokens = 0, projectedOverkillRewardId = null }) {
  const tKey = todayKey();
  const { level: playerLevel } = getLevelFromXP(xp || 0);
  const m = resolveMonster(monster, player) || dateSeededMonster(player, tKey, playerLevel);
  const dmg = (monsterDamage?.[player.id]?.[tKey]) || 0;
  const hp = Math.max(0, Math.min(m.maxHP, m.maxHP - dmg));
  const dead = hp === 0;
  const pct = Math.round((hp / m.maxHP) * 100);
  const low = pct < 30;

  const charCfg = CLASS_TILES[player.class] ?? CLASS_TILES.warrior;
  const mc = MONSTER_CFG[m.id] ?? MONSTER_CFG.green_slime;
  const { level, xpInLevel, xpNeeded } = getLevelFromXP(xp || 0);
  const critPct = Math.round(critChanceForLevel(level) * 100);
  const title = selectedTitleBadge ? getTitleForBadge(selectedTitleBadge) : getPlayerTitle(badges || []);
  const prestigeCount = prestige || 0;
  const earnedBadges = (badges || []).map(id => BADGES.find(b => b.id === id)).filter(Boolean);

  const projectedReward = projectedOverkillRewardId ? POWER_UPS.find(p => p.id === projectedOverkillRewardId) : null;
  const overkillTooltipLead = (storedPowerTokens > 0 || overkillCharge >= OVERKILL_CHARGE_GOAL) ? 'Tomorrow:' : 'On full:';
  const overkillTooltipCopy = (storedPowerTokens > 0 || overkillCharge >= OVERKILL_CHARGE_GOAL)
    ? 'Auto-activates at reset.'
    : 'Fill this bar to bank it for tomorrow.';

  const earnedTitles = (badges || [])
    .map(badgeId => {
      const te = TITLES.find(t => t.badge === badgeId);
      const be = BADGES.find(b => b.id === badgeId);
      return te && be ? { badgeId, title: te.title, icon: be.icon } : null;
    })
    .filter(Boolean);

  const [titlePickerOpen, setTitlePickerOpen] = useState(false);

  // Coin flip on gold gain
  const prevGoldRef = useRef(gold);
  const [coinFlipping, setCoinFlipping] = useState(false);
  useEffect(() => {
    if (gold > prevGoldRef.current) {
      setCoinFlipping(true);
      setTimeout(() => setCoinFlipping(false), 500);
    }
    prevGoldRef.current = gold;
  }, [gold]);

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
    <div className={`player-card ${isSelected ? 'active' : ''}`} onClick={onClick} style={{ backgroundColor: hexToRgba(player.textColor, 0.07) }}>
      <div className={`char-sprite${isSelected ? ' char-active' : ''}`}>
        <TileSprite tile={charCfg.tile} scale={4} />
      </div>
      <div className="player-info">
        <div className="player-name">
          {player.name}
          {prestigeCount > 0 && <span className="prestige-stars">{'⭐'.repeat(prestigeCount)}</span>}
        </div>
        {title && (
          <div className="player-title-wrap">
            <div
              className={`player-title${earnedTitles.length > 1 ? ' clickable' : ''}`}
              onClick={earnedTitles.length > 1 ? e => { e.stopPropagation(); setTitlePickerOpen(o => !o); } : undefined}
            >
              {title}{earnedTitles.length > 1 && <span style={{ opacity: 0.5, marginLeft: 3 }}>▾</span>}
            </div>
            {titlePickerOpen && (
              <div className="title-picker" onClick={e => e.stopPropagation()}>
                {earnedTitles.map(t => (
                  <div
                    key={t.badgeId}
                    className={`title-picker-item${(selectedTitleBadge === t.badgeId || (!selectedTitleBadge && t.title === getPlayerTitle(badges || []))) ? ' active' : ''}`}
                    onClick={() => { onSelectTitle?.(player.id, t.badgeId); setTitlePickerOpen(false); }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="player-class">{charCfg.label}</div>
        <div className="player-pts">
          <span className={`gold-coin${coinFlipping ? ' flipping' : ''}`} />
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
              <BadgeTooltip key={b.id} badge={b} />
            ))}
          </div>
        )}
        {activePowerUps.length > 0 && (
          <div className="powerup-row">
            {activePowerUps.map(pu => {
              const def = POWER_UPS.find(p => p.id === pu.id);
              if (!def) return null;
              const remaining = pu.durationHours > 0
                ? Math.max(0, Math.ceil((pu.activatedAt + pu.durationHours * 3600000 - Date.now()) / 3600000))
                : null;
              return (
                <span key={pu.id} className="powerup-icon" title={`${def.name} — ${remaining ? remaining + 'h left' : 'Active'}`}>
                  <TileSprite tile={def.icon} display={14} />
                  {remaining != null && <span className="powerup-timer">{remaining}h</span>}
                </span>
              );
            })}
          </div>
        )}
        {storedPowerTokens > 0 && (
          <div className="power-token-row">
            <span className="power-token-pill" title={`${storedPowerTokens} stored power token${storedPowerTokens === 1 ? '' : 's'}`}>
              <TileSprite tile={114} display={12} />
              {storedPowerTokens} token{storedPowerTokens === 1 ? '' : 's'}
            </span>
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
        {!dead && <HpSegBar hp={hp} maxHP={m.maxHP} low={low} />}
        {dead && (
          <div className={`overkill-panel${overkillCharge >= OVERKILL_CHARGE_GOAL ? ' ready' : ''}${projectedReward ? ' has-tooltip' : ''}`}>
            <div className="overkill-label">
              <span className="overkill-label-left">
                <TileSprite tile={114} display={11} />
                OVERKILL
              </span>
              <span className="overkill-label-count">
                {overkillCharge >= OVERKILL_CHARGE_GOAL ? 'READY' : `${Math.min(overkillCharge, OVERKILL_CHARGE_GOAL)}/${OVERKILL_CHARGE_GOAL}`}
              </span>
            </div>
            <OverkillBar charge={Math.min(overkillCharge, OVERKILL_CHARGE_GOAL)} goal={OVERKILL_CHARGE_GOAL} />
            <div className="overkill-hint">
              {overkillCharge >= OVERKILL_CHARGE_GOAL ? 'Auto-activates as tomorrow\'s power-up.' : 'Extra chores charge tomorrow\'s power-up.'}
            </div>
            {projectedReward && (
              <div className="overkill-tooltip" role="tooltip">
                <div className="overkill-tooltip-lead">{overkillTooltipLead}</div>
                <div className="overkill-tooltip-row">
                  <TileSprite tile={projectedReward.icon} display={14} />
                  <span>{projectedReward.name}</span>
                </div>
                <div className="overkill-tooltip-copy">{overkillTooltipCopy}</div>
              </div>
            )}
          </div>
        )}
        {!dead && <div className="atk-penalty">💀 -{m.atk}g at midnight</div>}
      </div>
    </div>
  );
}
