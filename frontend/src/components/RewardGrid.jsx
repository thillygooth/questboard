import React, { useMemo } from 'react';
import { getRewardsFor } from '../logic';
import TileSprite from './TileSprite';

function rewardTier(cost) {
  if (cost <= 18) return 'tier-quick';
  if (cost <= 44) return 'tier-mid';
  if (cost <= 80) return 'tier-big';
  return 'tier-dream';
}

export default function RewardGrid({ player, gold, activeRewards, onRedeemReward }) {
  const rewards = useMemo(() => getRewardsFor(player, activeRewards), [player, activeRewards]);

  return (
    <>
      <div className="section-label">
        {player.name} — <span className="gold-coin" /> {gold} gold — tap to redeem
      </div>
      <div className="rewards">
        {rewards.map(r => (
          <div
            key={r.id}
            className={`reward ${rewardTier(r.cost)}${gold < r.cost ? ' cant-afford' : ''}`}
            onClick={() => gold >= r.cost && onRedeemReward(r.id)}
          >
            <div className="reward-top">
              <TileSprite tile={r.icon} scale={2} />
              <span className="cost-badge"><span className="gold-coin-sm" />{r.cost}</span>
            </div>
            <div className="reward-name">{r.name}</div>
            <div className="reward-desc">{r.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
