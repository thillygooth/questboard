// Tile reference (tilemap_packed.png, 16x16 grid):
//   8=faucet  29=heart  43=wooden crate  44=glowing crate  53=monitor  55=coin
//   63=dresser  64=cross  67=barrel  68=barrel2  72=treasure chest  75=bookshelf
//   89=travel bag  91=backpack  113=spray bottle  114=green potion  115=red potion
//   116=blue potion  117=double axe  118=silver axe  128=staff/stick  131=torch

export const ALL_CHORES = [
  // Daily - everyone
  { id: 'dishes',      name: 'Dishes',           icon: '🍽️', pts: 3, who: 'all',    freq: 'daily'   },
  { id: 'wipedown',    name: 'Wipe counters',     icon: '🧽', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'toys',        name: 'Pick up toys',      icon: '🧸', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'feedpet',     name: 'Feed pets',         icon: '🐾', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'setatable',   name: 'Set the table',     icon: '🍴', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'makebeds',    name: 'Make beds',         icon: '🛏️', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'walkdog',     name: 'Walk dog',          icon: '🐕', pts: 3, who: 'all',    freq: 'daily'   },
  { id: 'sweep',       name: 'Sweep floors',      icon: '🧹', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'unloaddw',    name: 'Empty dishwasher',  icon: '🥣', pts: 2, who: 'all',    freq: 'daily'   },
  { id: 'clearclutter',name: 'Clear clutter',     icon: '📦', pts: 2, who: 'all',    freq: 'daily'   },

  // Daily - adults
  { id: 'cook',        name: 'Cook dinner',       icon: '🍲', pts: 4, who: 'adults', freq: 'daily'   },
  { id: 'laundry',     name: 'Laundry',           icon: '🫧', pts: 4, who: 'adults', freq: 'daily'   },
  { id: 'catbox',      name: 'Cat litter',        icon: '🐱', pts: 3, who: 'adults', freq: 'daily'   },
  { id: 'foldlaundry', name: 'Fold laundry',      icon: '👕', pts: 3, who: 'adults', freq: 'daily'   },
  { id: 'packlunch',   name: 'Pack lunches',      icon: '🥪', pts: 3, who: 'adults', freq: 'daily'   },
  { id: 'wipestove',   name: 'Wipe stovetop',     icon: '🔥', pts: 2, who: 'adults', freq: 'daily'   },

  // Weekly - everyone
  { id: 'water',       name: 'Water plants',      icon: '🌱', pts: 2, who: 'all',    freq: 'weekly'  },

  // Weekly - adults
  { id: 'vacuum',      name: 'Vacuum',            icon: '🌀', pts: 4, who: 'adults', freq: 'weekly'  },
  { id: 'mop',         name: 'Mop floors',        icon: '🪣', pts: 4, who: 'adults', freq: 'weekly'  },
  { id: 'trash',       name: 'Take out trash',    icon: '🗑️', pts: 3, who: 'adults', freq: 'weekly', dow: 2 },
  { id: 'recycling',   name: 'Recycling',         icon: '♻️', pts: 3, who: 'adults', freq: 'weekly', dow: 5 },
  { id: 'groceries',   name: 'Groceries',         icon: '🛒', pts: 4, who: 'adults', freq: 'weekly'  },
  { id: 'dogpoop',     name: 'Dog poop',          icon: '💩', pts: 3, who: 'adults', freq: 'weekly'  },
  { id: 'bathroom',    name: 'Clean bathroom',    icon: '🚿', pts: 4, who: 'adults', freq: 'weekly'  },
  { id: 'compost',     name: 'Empty compost',     icon: '🍃', pts: 2, who: 'adults', freq: 'weekly'  },
  { id: 'microwave',   name: 'Clean microwave',   icon: '♨️', pts: 3, who: 'adults', freq: 'weekly'  },
  { id: 'yardwork',    name: 'Yard work',         icon: '🌿', pts: 4, who: 'adults', freq: 'weekly'  },
  { id: 'sheets',      name: 'Change bed sheets', icon: '🛌', pts: 3, who: 'adults', freq: 'weekly'  },
  { id: 'windows',     name: 'Clean windows',     icon: '🪟', pts: 3, who: 'adults', freq: 'weekly'  },
  { id: 'bathdog',     name: 'Bathe the dog',     icon: '🐶', pts: 3, who: 'adults', freq: 'weekly'  },

  // Weekly - kids
  { id: 'homework',    name: 'Homework done',     icon: '📚', pts: 3, who: 'kids',   freq: 'weekly'  },

  // Daily - kids
  { id: 'brushteeth',  name: 'Brush teeth',       icon: '🦷', pts: 2, who: 'kids',   freq: 'daily'   },
  { id: 'getdressed',  name: 'Get dressed',       icon: '🧢', pts: 2, who: 'kids',   freq: 'daily'   },
  { id: 'reading',     name: 'Read a book',       icon: '📖', pts: 3, who: 'kids',   freq: 'daily'   },
  { id: 'backpack',    name: 'Pack backpack',     icon: '🎒', pts: 2, who: 'kids',   freq: 'daily'   },
  { id: 'pjamas',      name: 'Put on pajamas',    icon: '🌙', pts: 2, who: 'kids',   freq: 'daily'   },
  { id: 'tidyroom',    name: 'Tidy bedroom',      icon: '🛋️', pts: 2, who: 'kids',   freq: 'daily'   },

  // Monthly - adults
  { id: 'deepclean',   name: 'Deep clean kitchen',icon: '🧼', pts: 6, who: 'adults', freq: 'monthly' },
  { id: 'carwash',     name: 'Wash the car',      icon: '🚗', pts: 4, who: 'adults', freq: 'monthly' },
  { id: 'deepvac',     name: 'Deep vacuum & mop', icon: '✨', pts: 5, who: 'adults', freq: 'monthly' },
  { id: 'oilchange',   name: 'Car maintenance',   icon: '🔧', pts: 6, who: 'adults', freq: 'monthly' },
  { id: 'gardening',   name: 'Gardening',         icon: '🌻', pts: 5, who: 'adults', freq: 'monthly' },

  // Monthly - everyone
  { id: 'organize',    name: 'Organize a room',   icon: '🗂️', pts: 5, who: 'all',    freq: 'monthly' },
  { id: 'donate',      name: 'Donate & declutter',icon: '💝', pts: 4, who: 'all',    freq: 'monthly' },

  // Monthly - kids
  { id: 'closetclean', name: 'Clean your closet', icon: '👗', pts: 4, who: 'kids',   freq: 'monthly' },
  { id: 'toybox',      name: 'Sort toy box',      icon: '🪀', pts: 3, who: 'kids',   freq: 'monthly' },
];

// Gold economy (kids earn ~3/kill tier1, adults ~6/kill tier1)
// Target: 2-3 kills for cheapest reward in each mode
// Rewards: quick (2-3 kills) | mid (5-8 kills) | big (2-3 weeks) | dream (1+ month)
export const REWARDS = [
  // Quick treats
  { id: 'extracandy',   name: 'Candy bag',           icon: '🍬', cost:  8, desc: 'Pick any candy you want',          who: 'kids'   },
  { id: 'screentime',   name: 'Extra screen time',   icon: '📱', cost:  8, desc: '1 hour extra',                     who: 'kids'   },
  { id: 'cocktails',    name: 'Cocktail night',      icon: '🍹', cost: 15, desc: 'Fancy drinks at home',             who: 'adults' },
  { id: 'dessert',      name: 'Special dessert',     icon: '🎂', cost: 18, desc: 'Fancy treat from the store',       who: 'all'    },

  // Mid rewards
  { id: 'latenight',    name: 'Stay up late',        icon: '⭐', cost: 18, desc: '1 hour past bedtime',              who: 'kids'   },
  { id: 'choosemeal',   name: 'Pick dinner',         icon: '🍜', cost: 20, desc: "You choose what's for dinner",     who: 'all'    },
  { id: 'bookshop',     name: 'New book',            icon: '📘', cost: 22, desc: 'Pick any book from the store',     who: 'all'    },
  { id: 'craft',        name: 'Craft project',       icon: '✂️', cost: 24, desc: 'Pick a craft from the store',      who: 'kids'   },
  { id: 'cookwithme',   name: 'Cook a recipe',       icon: '👨‍🍳', cost: 28, desc: 'Pick any recipe to make together', who: 'kids'   },
  { id: 'choosemovie',  name: 'Pick the movie',      icon: '🎬', cost: 28, desc: 'You choose what we watch',         who: 'all'    },
  { id: 'icecream',     name: 'Ice cream trip',      icon: '🍦', cost: 30, desc: 'Pick any flavor',                  who: 'all'    },
  { id: 'gamenight',    name: 'Family game night',   icon: '🎲', cost: 35, desc: 'Pick the board game',              who: 'all'    },
  { id: 'nochore',      name: 'No chores today',     icon: '🏖️', cost: 40, desc: 'Full day off from all chores',     who: 'all'    },

  // Big rewards
  { id: 'hike',         name: 'Hike or park day',    icon: '🥾', cost: 45, desc: 'Pick a trail nearby',              who: 'adults' },
  { id: 'picnic',       name: 'Picnic in the park',  icon: '🧺', cost: 45, desc: 'Pack a picnic together',           who: 'all'    },
  { id: 'videogameday', name: 'Video game all day',  icon: '🎮', cost: 45, desc: 'No screen time limits today',      who: 'kids'   },
  { id: 'sleepover',    name: 'Sleepover',           icon: '🌛', cost: 45, desc: 'Friend can sleep over',            who: 'kids'   },
  { id: 'movie',        name: 'Movie night',         icon: '🍿', cost: 55, desc: 'Family picks the film + popcorn',  who: 'all'    },
  { id: 'brunch',       name: 'Fancy brunch',        icon: '🥐', cost: 55, desc: 'Brunch at a nice cafe',            who: 'adults' },
  { id: 'spa',          name: 'Relaxation day',      icon: '🛁', cost: 60, desc: 'No chores, massage, chill',        who: 'adults' },
  { id: 'toyshop',      name: 'Toy shop trip',       icon: '🎪', cost: 65, desc: '$10 toy budget, your pick',        who: 'kids'   },
  { id: 'arcade',       name: 'Arcade or bowling',   icon: '🕹️', cost: 70, desc: 'Fun family outing',               who: 'all'    },

  // Dream rewards
  { id: 'dinner',       name: 'Dinner out',          icon: '🥂', cost: 90, desc: 'Restaurant of your choice',        who: 'all'    },
  { id: 'waterpark',    name: 'Water park day',      icon: '🌊', cost:160, desc: 'Full day at the water park',       who: 'all'    },
  { id: 'camping',      name: 'Camping trip',        icon: '🏕️', cost:220, desc: 'Weekend in the mountains',         who: 'all'    },
];

// Monster roster
// adults avg ~2.5 pts/chore, kids avg ~2 pts/chore
// All tiers: 3-5 chores max (adult HP cap 12, kid HP cap 10)
// Gold: 2-3 tier-1 kills for cheapest reward (adults 15g, kids 8g)
export const MONSTERS = [
  // Tier 1: ~3 chores to defeat
  { id: 'green_slime',    name: 'Green Slime',      adultHP:  7, kidHP:  5, atk:  2, gold:  5, kidGold:  3 },
  { id: 'rat',            name: 'Sewer Rat',         adultHP:  7, kidHP:  5, atk:  2, gold:  5, kidGold:  3 },
  { id: 'tiny_spider',    name: 'Tiny Spider',       adultHP:  8, kidHP:  5, atk:  2, gold:  5, kidGold:  3 },
  { id: 'forest_imp',     name: 'Forest Imp',        adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  3 },
  { id: 'wisp',           name: 'Wisp',              adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  3 },
  { id: 'evil_shroom',    name: 'Evil Shroom',       adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  3 },

  // Tier 2: ~3-4 chores to defeat
  { id: 'goblin',         name: 'Goblin',            adultHP:  9, kidHP:  6, atk:  3, gold:  7, kidGold:  4 },
  { id: 'night_imp',      name: 'Night Imp',         adultHP:  9, kidHP:  6, atk:  3, gold:  7, kidGold:  4 },
  { id: 'plaguebearer',   name: 'Plaguebearer',      adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  4 },
  { id: 'spectral_hound', name: 'Spectral Hound',    adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  4 },
  { id: 'cave_bat',       name: 'Cave Bat',          adultHP: 10, kidHP:  7, atk:  3, gold:  8, kidGold:  4 },
  { id: 'shadow_man',     name: 'Shadow Stalker',    adultHP: 10, kidHP:  7, atk:  3, gold:  8, kidGold:  4 },
  { id: 'wild_buck',      name: 'Wild Buck',         adultHP: 10, kidHP:  7, atk:  3, gold:  8, kidGold:  4 },

  // Tier 3: ~4 chores to defeat
  { id: 'skeleton',       name: 'Skeleton',          adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  5 },
  { id: 'chaos_imp',      name: 'Chaos Imp',         adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  5 },
  { id: 'large_snake',    name: 'Giant Serpent',     adultHP: 10, kidHP:  8, atk:  4, gold: 10, kidGold:  5 },
  { id: 'reaper',         name: 'Grim Reaper',       adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  5 },
  { id: 'frost_yetling',  name: 'Frost Yeti',        adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  5 },
  { id: 'void_devil',     name: 'Void Devil',        adultHP: 11, kidHP:  8, atk:  5, gold: 11, kidGold:  5 },
  { id: 'toxic_slime',    name: 'Toxic Slime',       adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  5 },
  { id: 'mimic',          name: 'Mimic',             adultHP: 11, kidHP:  8, atk:  5, gold: 11, kidGold:  5 },
  { id: 'cyber_drone',    name: 'Cyber Drone',       adultHP: 10, kidHP:  7, atk:  4, gold: 10, kidGold:  5 },

  // Tier 4: ~4-5 chores to defeat
  { id: 'skeleton_warrior',name: 'Skeleton Warrior', adultHP: 11, kidHP:  8, atk:  5, gold: 12, kidGold:  6 },
  { id: 'molten_golem',   name: 'Molten Golem',      adultHP: 11, kidHP:  8, atk:  5, gold: 12, kidGold:  6 },
  { id: 'mirrorfiend',    name: 'Mirrorfiend',       adultHP: 11, kidHP:  9, atk:  5, gold: 13, kidGold:  6 },
  { id: 'fire_elemental', name: 'Fire Elemental',    adultHP: 12, kidHP:  9, atk:  5, gold: 13, kidGold:  7 },
  { id: 'phantom_minotaur',name: 'Phantom Minotaur', adultHP: 12, kidHP:  9, atk:  6, gold: 14, kidGold:  7 },
  { id: 'rock_golem',     name: 'Rock Golem',        adultHP: 11, kidHP:  8, atk:  5, gold: 13, kidGold:  6 },
  { id: 'cyber_walker',   name: 'Cyber Walker',      adultHP: 12, kidHP:  9, atk:  6, gold: 14, kidGold:  7 },

  // Tier 5: boss monsters, ~5 chores to defeat
  { id: 'frost_golem',    name: 'Frost Golem',       adultHP: 12, kidHP:  9, atk:  6, gold: 16, kidGold:  8 },
  { id: 'giant_spider',   name: 'Giant Spider',      adultHP: 12, kidHP: 10, atk:  7, gold: 18, kidGold:  9 },
  { id: 'cave_troll',     name: 'Cave Troll',        adultHP: 12, kidHP: 10, atk:  7, gold: 18, kidGold:  9 },
  { id: 'sandworm',       name: 'Sandworm',          adultHP: 12, kidHP: 10, atk:  7, gold: 20, kidGold: 10 },
  { id: 'jrpg_ogre',      name: 'Ogre Chieftain',    adultHP: 12, kidHP: 10, atk:  7, gold: 20, kidGold: 10 },
  { id: 'happy_blob',     name: 'Elder Blob',        adultHP: 12, kidHP:  9, atk:  6, gold: 16, kidGold:  8 },
  { id: 'volcano_drake',  name: 'Volcano Drake',     adultHP: 12, kidHP: 10, atk:  8, gold: 24, kidGold: 12 },
];

export const LOOT_TABLE = [
  { id: 'gold_pouch',   name: 'Gold Pouch',   icon: '👝', gold: 5,  xp: 0 },
  { id: 'silver_coin',  name: 'Silver Coin',  icon: '🪙', gold: 3,  xp: 0 },
  { id: 'treasure_gem', name: 'Treasure Gem', icon: '💎', gold: 10, xp: 0 },
  { id: 'xp_scroll',    name: 'XP Scroll',    icon: '📜', gold: 0,  xp: 3 },
  { id: 'elixir',       name: 'Elixir',       icon: '🧪', gold: 4,  xp: 1 },
];

export const BADGES = [
  { id: 'first_blood',    name: 'First Blood',   icon: '🩸', desc: 'Defeat your first monster' },
  { id: 'streak_3',       name: 'On a Roll',      icon: '🔥', desc: '3-day kill streak' },
  { id: 'streak_7',       name: 'Streak Lord',    icon: '⚡', desc: '7-day kill streak' },
  { id: 'streak_14',      name: 'Unstoppable',    icon: '👑', desc: '14-day kill streak' },
  { id: 'big_spender',    name: 'Big Spender',    icon: '💸', desc: 'Redeem 5 rewards' },
  { id: 'gold_hoarder',   name: 'Gold Hoarder',   icon: '💰', desc: 'Hold 100+ gold at once' },
  { id: 'monster_slayer', name: 'Monster Slayer', icon: '⚔️', desc: 'Defeat 10 monsters total' },
  { id: 'lucky_charm',    name: 'Lucky Charm',    icon: '🍀', desc: 'Lucky drop 3 times' },
  { id: 'untouchable',    name: 'Untouchable',    icon: '🛡️', desc: 'No penalties for 7 days' },
  { id: 'prestige_1',     name: 'Prestige',       icon: '🌟', desc: 'Reach level 10 and prestige' },
];

export const TITLES = [
  { badge: 'prestige_1',     title: 'The Prestigious'  },
  { badge: 'streak_14',      title: 'The Unstoppable'  },
  { badge: 'monster_slayer', title: 'Monster Slayer'   },
  { badge: 'untouchable',    title: 'Untouchable'      },
  { badge: 'streak_7',       title: 'The Relentless'   },
  { badge: 'gold_hoarder',   title: 'Gold Hoarder'     },
  { badge: 'lucky_charm',    title: 'Lucky Charm'      },
  { badge: 'big_spender',    title: 'The Wealthy'      },
  { badge: 'streak_3',       title: 'On a Roll'        },
  { badge: 'first_blood',    title: 'Monster Hunter'   },
];

export const MONSTER_TAUNTS = {
  green_slime:      "The slime gurgles triumphantly.",
  rat:              "The rat gnaws through your coins!",
  tiny_spider:      "Tiny but vengeful...",
  forest_imp:       "The imp cackles as gold vanishes!",
  wisp:             "The wisp drains your will and gold.",
  evil_shroom:      "Spores everywhere! It costs you.",
  goblin:           "The goblin raids your treasure!",
  night_imp:        "Darkness costs you dearly.",
  plaguebearer:     "The plague spreads to your wallet.",
  spectral_hound:   "Its howl chills your gold away.",
  cave_bat:         "Scratches and stolen coins!",
  shadow_man:       "The shadow takes what it wants.",
  wild_buck:        "Trampled! And your gold with it.",
  skeleton:         "Rattling bones, rattling coins!",
  chaos_imp:        "Pure chaos! Gold everywhere... gone.",
  large_snake:      "Squeezed dry of gold.",
  reaper:           "The reaper collects his due.",
  frost_yetling:    "Frozen in fear, frozen gold!",
  void_devil:       "The void consumes your earnings.",
  toxic_slime:      "Dissolved your gold reserves!",
  mimic:            "It wasn't a chest. Costly mistake.",
  cyber_drone:      "ALERT: Deducting gold credits.",
  skeleton_warrior: "A warrior's toll must be paid.",
  molten_golem:     "Burns through your gold stash!",
  mirrorfiend:      "Your laziness reflected back.",
  fire_elemental:   "Scorched earth, scorched savings.",
  phantom_minotaur: "Lost in the labyrinth, losing gold.",
  rock_golem:       "Crushed your piggy bank.",
  cyber_walker:     "ERROR: Unauthorized gold transfer.",
  frost_golem:      "Your gold is now an ice sculpture.",
  giant_spider:     "Webbed up tight, gold sucked dry!",
  cave_troll:       "TOLL! The troll always collects.",
  sandworm:         "Swallowed whole... and your gold.",
  jrpg_ogre:        "FEE FI FO FUM! Gold is gone.",
  happy_blob:       "The blob looks pleased. You don't.",
  volcano_drake:    "Drake tax: extremely painful.",
};
