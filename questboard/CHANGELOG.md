# Changelog

## 1.12.1 - 2026-06-26

### Changed
- Performance: optimized rendering for low-end devices. Memoized the most-rendered
  components (TileSprite, MonsterSprite, chore/reward grids) so unrelated state
  changes no longer reconcile the whole tree, and code-split the heavy views
  (SetupWizard, DungeonMap, BountyBoard, HistoryTab) to shrink initial parse cost.
  No gameplay or animation changes.

## 1.0.0 - 2026-05-24

### Added
- Initial release
- Pixel art RPG-themed chore tracking for up to 6 players
- Daily, weekly, and monthly chore quests
- Monster battle system - complete chores to damage your assigned monster
- Crit system with 5% base chance, scales with player level
- XP and leveling system
- Gold rewards for defeating monsters, penalty if defeated by midnight
- Reward shop for spending gold on family treats
- History log of all chore and reward activity
- Multi-arch Docker image (amd64, aarch64, armv7)
- Home Assistant ingress support (no port forwarding required)
