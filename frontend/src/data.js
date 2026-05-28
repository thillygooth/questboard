// Tile reference (tilemap_packed.png, 16x16 grid):
//   8=faucet  29=heart  43=wooden crate  44=glowing crate  53=monitor  55=coin
//   63=dresser  64=cross  67=barrel  68=barrel2  72=treasure chest  75=bookshelf
//   89=travel bag  91=backpack  113=spray bottle  114=green potion  115=red potion
//   116=blue potion  117=double axe  118=silver axe  128=staff/stick  131=torch

export const ALL_CHORES = [
  // Daily - everyone
  { id: 'dishes',      name: 'Dishes',           icon: '🍽️', pts: 3, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'wipedown',    name: 'Wipe counters',     icon: '🧽', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'toys',        name: 'Pick up toys',      icon: '🧸', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'feedpet',     name: 'Feed pets',         icon: '🐾', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'setatable',   name: 'Set the table',     icon: '🍴', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'makebeds',    name: 'Make beds',         icon: '🛏️', pts: 2, who: 'all',    freq: 'daily',   mode: 'solo'  },
  { id: 'walkdog',     name: 'Walk dog',          icon: '🐕', pts: 3, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'sweep',       name: 'Sweep floors',      icon: '🧹', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'unloaddw',    name: 'Empty dishwasher',  icon: '🥣', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },
  { id: 'clearclutter',name: 'Clear clutter',     icon: '📦', pts: 2, who: 'all',    freq: 'daily',   mode: 'party' },

  // Daily - adults
  { id: 'cook',        name: 'Cook dinner',       icon: '🍲', pts: 4, who: 'adults', freq: 'daily',   mode: 'party' },
  { id: 'laundry',     name: 'Laundry',           icon: '🫧', pts: 4, who: 'adults', freq: 'daily',   mode: 'party' },
  { id: 'catbox',      name: 'Cat litter',        icon: '🐱', pts: 3, who: 'adults', freq: 'daily',   mode: 'party' },
  { id: 'foldlaundry', name: 'Fold laundry',      icon: '👕', pts: 3, who: 'adults', freq: 'daily',   mode: 'party' },
  { id: 'packlunch',   name: 'Pack lunches',      icon: '🥪', pts: 3, who: 'adults', freq: 'daily',   mode: 'party' },
  { id: 'wipestove',   name: 'Wipe stovetop',     icon: '🔥', pts: 2, who: 'adults', freq: 'daily',   mode: 'party' },

  // Weekly - everyone
  { id: 'water',       name: 'Water plants',      icon: '🌱', pts: 2, who: 'all',    freq: 'weekly',  mode: 'party' },

  // Weekly - adults
  { id: 'vacuum',      name: 'Vacuum',            icon: '🌀', pts: 4, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'mop',         name: 'Mop floors',        icon: '🪣', pts: 4, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'trash',       name: 'Take out trash',    icon: '🗑️', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party', dow: 2 },
  { id: 'recycling',   name: 'Recycling',         icon: '♻️', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party', dow: 5 },
  { id: 'groceries',   name: 'Groceries',         icon: '🛒', pts: 4, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'dogpoop',     name: 'Dog poop',          icon: '💩', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'bathroom',    name: 'Clean bathroom',    icon: '🚿', pts: 4, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'compost',     name: 'Empty compost',     icon: '🍃', pts: 2, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'microwave',   name: 'Clean microwave',   icon: '♨️', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'yardwork',    name: 'Yard work',         icon: '🌿', pts: 4, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'sheets',      name: 'Change bed sheets', icon: '🛌', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'windows',     name: 'Clean windows',     icon: '🪟', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party' },
  { id: 'bathdog',     name: 'Bathe the dog',     icon: '🐶', pts: 3, who: 'adults', freq: 'weekly',  mode: 'party' },

  // Weekly - kids
  { id: 'homework',    name: 'Homework done',     icon: '📚', pts: 3, who: 'kids',   freq: 'weekly',  mode: 'solo'  },

  // Daily - kids
  { id: 'brushteeth',  name: 'Brush teeth',       icon: '🦷', pts: 2, who: 'kids',   freq: 'daily',   mode: 'solo'  },
  { id: 'getdressed',  name: 'Get dressed',       icon: '🧢', pts: 2, who: 'kids',   freq: 'daily',   mode: 'solo'  },
  { id: 'reading',     name: 'Read a book',       icon: '📖', pts: 3, who: 'kids',   freq: 'daily',   mode: 'solo'  },
  { id: 'backpack',    name: 'Pack backpack',     icon: '🎒', pts: 2, who: 'kids',   freq: 'daily',   mode: 'solo'  },
  { id: 'pjamas',      name: 'Put on pajamas',    icon: '🌙', pts: 2, who: 'kids',   freq: 'daily',   mode: 'solo'  },
  { id: 'tidyroom',    name: 'Tidy bedroom',      icon: '🛋️', pts: 2, who: 'kids',   freq: 'daily',   mode: 'solo'  },

  // Monthly - adults
  { id: 'deepclean',   name: 'Deep clean kitchen',icon: '🧼', pts: 6, who: 'adults', freq: 'monthly', mode: 'party' },
  { id: 'carwash',     name: 'Wash the car',      icon: '🚗', pts: 4, who: 'adults', freq: 'monthly', mode: 'party' },
  { id: 'deepvac',     name: 'Deep vacuum & mop', icon: '✨', pts: 5, who: 'adults', freq: 'monthly', mode: 'party' },
  { id: 'oilchange',   name: 'Car maintenance',   icon: '🔧', pts: 6, who: 'adults', freq: 'monthly', mode: 'party' },
  { id: 'gardening',   name: 'Gardening',         icon: '🌻', pts: 5, who: 'adults', freq: 'monthly', mode: 'party' },

  // Monthly - everyone
  { id: 'organize',    name: 'Organize a room',   icon: '🗂️', pts: 5, who: 'all',    freq: 'monthly', mode: 'party' },
  { id: 'donate',      name: 'Donate & declutter',icon: '💝', pts: 4, who: 'all',    freq: 'monthly', mode: 'party' },

  // Monthly - kids
  { id: 'closetclean', name: 'Clean your closet', icon: '👗', pts: 4, who: 'kids',   freq: 'monthly', mode: 'solo'  },
  { id: 'toybox',      name: 'Sort toy box',      icon: '🪀', pts: 3, who: 'kids',   freq: 'monthly', mode: 'solo'  },
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

// Monster roster — level-gated tiers with normalized gold/HP ratios
// Tier assignment: HP 7-8 → T1, HP 9 → T2, HP 10 atk≤3 → T2, HP 10 atk≥4 → T3,
//   HP 11 atk≤4 → T3, HP 11 atk≥5 → T4, HP 12 gold<16(old) → T4, HP 12 gold≥16(old) → T5
// Gold ratios: T1=0.80/0.70, T2=0.85/0.75, T3=0.90/0.80, T4=0.95/0.85, T5=1.00/0.90
export const MONSTERS = [
  // Tier 1: HP 7-8, gold/HP ratio 0.80 (adults), 0.70 (kids)
  { id: 'green_slime',    name: 'Green Slime',      adultHP:  7, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'rat',            name: 'Sewer Rat',         adultHP:  7, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'tiny_spider',    name: 'Tiny Spider',       adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'forest_imp',     name: 'Forest Imp',        adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'wisp',           name: 'Wisp',              adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'evil_shroom',    name: 'Evil Shroom',       adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },

  // Tier 2: HP 9, or HP 10 with atk ≤ 3; gold/HP ratio 0.85/0.75
  { id: 'goblin',         name: 'Goblin',            adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'night_imp',      name: 'Night Imp',         adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'plaguebearer',   name: 'Plaguebearer',      adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'spectral_hound', name: 'Spectral Hound',    adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'cave_bat',       name: 'Cave Bat',          adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },
  { id: 'shadow_man',     name: 'Shadow Stalker',    adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },
  { id: 'wild_buck',      name: 'Wild Buck',         adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },

  // Tier 3: HP 10 atk ≥ 4, or HP 11 atk ≤ 4; gold/HP ratio 0.90/0.80
  { id: 'skeleton',       name: 'Skeleton',          adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'chaos_imp',      name: 'Chaos Imp',         adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'large_snake',    name: 'Giant Serpent',     adultHP: 10, kidHP:  8, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'reaper',         name: 'Grim Reaper',       adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },
  { id: 'frost_yetling',  name: 'Frost Yeti',        adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },
  { id: 'toxic_slime',    name: 'Toxic Slime',       adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'cyber_drone',    name: 'Cyber Drone',       adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },

  // Tier 4: HP 11 atk ≥ 5, or HP 12 (non-boss); gold/HP ratio 0.95/0.85
  { id: 'void_devil',     name: 'Void Devil',        adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'mimic',          name: 'Mimic',             adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'skeleton_warrior',name: 'Skeleton Warrior', adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'molten_golem',   name: 'Molten Golem',      adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'mirrorfiend',    name: 'Mirrorfiend',       adultHP: 11, kidHP:  9, atk:  5, gold: 10, kidGold:  8, tier: 4 },
  { id: 'fire_elemental', name: 'Fire Elemental',    adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'phantom_minotaur',name: 'Phantom Minotaur', adultHP: 12, kidHP:  9, atk:  6, gold: 11, kidGold:  8, tier: 4 },
  { id: 'rock_golem',     name: 'Rock Golem',        adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'cyber_walker',   name: 'Cyber Tooth',       adultHP: 12, kidHP:  9, atk:  6, gold: 11, kidGold:  8, tier: 4 },

  // Tier 5: boss monsters (HP 12, high gold); gold/HP ratio 1.00/0.90
  { id: 'frost_golem',    name: 'Frost Golem',       adultHP: 12, kidHP:  9, atk:  6, gold: 12, kidGold:  8, tier: 5 },
  { id: 'giant_spider',   name: 'Giant Spider',      adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'cave_troll',     name: 'Cave Troll',        adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'sandworm',       name: 'Sandworm',          adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'jrpg_ogre',      name: 'Ogre Chieftain',    adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'happy_blob',     name: 'Elder Blob',        adultHP: 12, kidHP:  9, atk:  6, gold: 12, kidGold:  8, tier: 5 },
  { id: 'volcano_drake',  name: 'Volcano Drake',     adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },

  // Monster Creatures Fantasy — animated
  { id: 'flying_eye',   name: 'Flying Eye',    adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'wild_goblin',  name: 'Wild Goblin',   adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'spore_beast',  name: 'Spore Beast',   adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'bone_walker',  name: 'Bone Walker',   adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },

  // st04 Tier 1 — small creatures
  { id: 'cursed_doll',  name: 'Cursed Doll',   adultHP:  7, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'toy_soldier',  name: 'Toy Soldier',   adultHP:  7, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'white_snake',  name: 'White Snake',   adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'mad_hand',     name: 'Mad Hand',      adultHP:  7, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'mandrake',     name: 'Mandrake',      adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'cait_sith',    name: 'Cait Sith',     adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },

  // st04 Tier 2
  { id: 'headless_chicken',  name: 'Headless Chicken',  adultHP:  8, kidHP:  5, atk:  2, gold:  6, kidGold:  4, tier: 1 },
  { id: 'dark_crow',         name: 'Dark Crow',         adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'bugbear',           name: 'Bugbear',           adultHP:  9, kidHP:  6, atk:  2, gold:  8, kidGold:  5, tier: 2 },
  { id: 'dead_soldier',      name: 'Dead Soldier',      adultHP:  9, kidHP:  6, atk:  3, gold:  8, kidGold:  5, tier: 2 },
  { id: 'nymph',             name: 'Nymph',             adultHP:  9, kidHP:  6, atk:  2, gold:  8, kidGold:  5, tier: 2 },
  { id: 'arcane_soldieress', name: 'Arcane Soldieress', adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },
  { id: 'dullahan',          name: 'Dullahan',          adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },

  // st04 Tier 3
  { id: 'grave_robber',   name: 'Grave Robber',   adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },
  { id: 'evil_shaman',    name: 'Evil Shaman',    adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'gravekeeper',    name: 'Gravekeeper',    adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },
  { id: 'corpse_hound',   name: 'Corpse Hound',   adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'gorgon',         name: 'Gorgon',         adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },
  { id: 'jack_o_lantern', name: "Jack O'Lantern",  adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },
  { id: 'fanatic',        name: 'Fanatic',        adultHP: 10, kidHP:  7, atk:  4, gold:  9, kidGold:  6, tier: 3 },
  { id: 'kelpie',         name: 'Kelpie',         adultHP: 11, kidHP:  8, atk:  4, gold: 10, kidGold:  6, tier: 3 },
  { id: 'cursed_archer',  name: 'Cursed Archer',  adultHP: 10, kidHP:  7, atk:  3, gold:  9, kidGold:  5, tier: 2 },

  // st04 Tier 4
  { id: 'arcane_cannon',         name: 'Arcane Cannon',         adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'goat_man',              name: 'Goat Man',              adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'hollow_soldier',        name: 'Hollow Soldier',        adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'incubus',               name: 'Incubus',               adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'scarecrow',             name: 'Scarecrow',             adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'devil_well',            name: 'Devil Well',            adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'death_machine',         name: 'Death Machine',         adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'arcane_core',           name: 'Arcane Core',           adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'machine_golem',         name: 'Machine Golem',         adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'fallen_kingdom_knight', name: 'Fallen Kingdom Knight', adultHP: 12, kidHP:  9, atk:  6, gold: 11, kidGold:  8, tier: 4 },
  { id: 'calamity_priest',       name: 'Calamity Priest',       adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'royal_tomb_guardian',   name: 'Royal Tomb Guardian',   adultHP: 12, kidHP:  9, atk:  6, gold: 11, kidGold:  8, tier: 4 },
  { id: 'judgement_soldier',     name: 'Judgement Soldier',     adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },
  { id: 'gem_thief',             name: 'Gem Thief',             adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'cursed_king',           name: 'Cursed King',           adultHP: 12, kidHP:  9, atk:  6, gold: 11, kidGold:  8, tier: 4 },
  { id: 'evil_pudding',          name: 'Evil Pudding',          adultHP: 11, kidHP:  8, atk:  5, gold: 10, kidGold:  7, tier: 4 },
  { id: 'godblight_parasite',    name: 'Godblight Parasite',    adultHP: 12, kidHP:  9, atk:  5, gold: 11, kidGold:  8, tier: 4 },

  // st04 Tier 5 — bosses
  { id: 'dark_drake',              name: 'Dark Drake',               adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'scylla',                  name: 'Scylla',                   adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'stone_troll',             name: 'Stone Troll',              adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'fat_beast',               name: 'Fat Beast',                adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'war_ogre',                name: 'War Ogre',                 adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'manticore',               name: 'Manticore',                adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },
  { id: 'stone_colossus',          name: 'Stone Colossus',           adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },
  { id: 'divine_beast_young',      name: 'Divine Beast',             adultHP: 12, kidHP: 10, atk:  7, gold: 12, kidGold:  9, tier: 5 },
  { id: 'divine_beast_adult',      name: 'Divine Beast (Elder)',     adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },
  { id: 'cursed_king_second_form', name: 'Cursed King (True Form)',  adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },
  { id: 'divine_beast_perfect',    name: 'Divine Beast (Perfect)',   adultHP: 12, kidHP: 10, atk:  8, gold: 12, kidGold:  9, tier: 5 },
];

export const POWER_UPS = [
  { id: 'gold_rush',       name: 'Gold Rush',       icon: 'gold_rush',       desc: '2x gold from monster kills',         effectType: 'timed'   },
  { id: 'forge_reward',    name: 'Forge Reward',     icon: 'forge_reward',    desc: 'Create a free custom reward',        effectType: 'instant' },
  { id: 'shield_aura',     name: 'Shield Aura',      icon: 'shield_aura',     desc: 'Immune to monster attack penalties', effectType: 'timed'   },
  { id: 'double_damage',   name: 'Double Damage',    icon: 'double_damage',   desc: '2x chore damage to monsters',        effectType: 'timed'   },
  { id: 'treasure_magnet', name: 'Treasure Magnet',  icon: 'treasure_magnet', desc: '3x loot and lucky drop chance',      effectType: 'timed'   },
];

export const OVERKILL_CHARGE_GOAL = 4;
export const POWER_TOKEN_CAP = 2;
export const POWER_TOKEN_CHOICES = ['gold_rush', 'double_damage', 'treasure_magnet', 'shield_aura'];

export const DEFAULT_POWER_UP_SETTINGS = {
  gold_rush:        { enabled: true, trigger: 'daily_chores',     count: 5,  durationHours: 24 },
  forge_reward:     { enabled: true, trigger: 'weekly_chores',    count: 15, durationHours: 0  },
  shield_aura:      { enabled: true, trigger: 'kill_streak',      count: 3,  durationHours: 24 },
  double_damage:    { enabled: true, trigger: 'weekly_chores',    count: 10, durationHours: 24 },
  treasure_magnet:  { enabled: true, trigger: 'all_dailies_done', count: 1,  durationHours: 24 },
};

export const TRIGGER_TYPES = [
  { id: 'daily_chores',     label: 'Daily chores done' },
  { id: 'weekly_chores',    label: 'Weekly chores done' },
  { id: 'monthly_chores',   label: 'Monthly chores done' },
  { id: 'kill_streak',      label: 'Day kill streak' },
  { id: 'all_dailies_done', label: 'All dailies done' },
];

export const DURATION_OPTIONS = [12, 24, 48];

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
  cyber_walker:     "CRUNCH! The Cyber Tooth devours your coins.",
  frost_golem:      "Your gold is now an ice sculpture.",
  giant_spider:     "Webbed up tight, gold sucked dry!",
  cave_troll:       "TOLL! The troll always collects.",
  sandworm:         "Swallowed whole... and your gold.",
  jrpg_ogre:        "FEE FI FO FUM! Gold is gone.",
  happy_blob:       "The blob looks pleased. You don't.",
  volcano_drake:    "Drake tax: extremely painful.",
  // MCF
  flying_eye:       "The eye sees all — and takes all.",
  wild_goblin:      "The goblin swings wildly at your coins!",
  spore_beast:      "Spores cloud your vision and your wallet.",
  bone_walker:      "The skeleton's rattling shakes loose your gold.",
  // st04 Tier 1
  cursed_doll:      "The doll pricks you with a cursed needle.",
  toy_soldier:      "Small but fierce! The soldier claims its toll.",
  white_snake:      "The white snake coils around your earnings.",
  mad_hand:         "A disembodied hand snatches your gold!",
  mandrake:         "The mandrake's shriek costs you dearly.",
  cait_sith:        "The cat spirit paws away your gold.",
  // st04 Tier 2
  headless_chicken: "It runs around scattering your coins!",
  dark_crow:        "The crow flies off with a gold piece.",
  bugbear:          "The bugbear demands its tribute.",
  dead_soldier:     "The undead soldier levies a grave tax.",
  nymph:            "A beautiful trap — she takes your gold.",
  arcane_soldieress:"Her magic drains your gold reserves.",
  dullahan:         "The headless rider charges through your savings!",
  // st04 Tier 3
  grave_robber:     "The robber rifles through your gold!",
  evil_shaman:      "Dark spirits transfer your gold away.",
  gravekeeper:      "Toll for the dead: paid in gold.",
  corpse_hound:     "The hound buries your gold like a bone.",
  gorgon:           "One glance and your gold turns to stone.",
  jack_o_lantern:   "The lantern's flames scorch your coin bag!",
  fanatic:          "Fanatical fury drains your wallet!",
  kelpie:           "The water horse drags your gold to the depths.",
  cursed_archer:    "A cursed arrow punches through your coin purse!",
  // st04 Tier 4
  arcane_cannon:         "BOOM! The explosion scatters your gold!",
  goat_man:              "The goat man headbutts your savings.",
  hollow_soldier:        "The hollow soldier fills itself with your gold.",
  incubus:               "The incubus steals more than your sleep.",
  scarecrow:             "It scared off your gold too!",
  devil_well:            "The well demands a very large coin.",
  death_machine:         "ERROR: Deducting gold credits.",
  arcane_core:           "The arcane core absorbs your wealth.",
  machine_golem:         "Gears grind through your gold reserves!",
  fallen_kingdom_knight: "The fallen knight levies a kingdom's debt.",
  calamity_priest:       "The priest blesses your enemies with your gold.",
  royal_tomb_guardian:   "The guardian's toll is steep indeed.",
  judgement_soldier:     "Judged guilty: sentenced to poverty.",
  gem_thief:             "Caught the thief — but lost gold anyway.",
  cursed_king:           "A cursed crown demands cursed coin.",
  evil_pudding:          "The pudding oozes through your coin purse!",
  godblight_parasite:    "The parasite feeds on your gold reserves.",
  // st04 Tier 5
  dark_drake:              "The drake's fire melts your gold stash!",
  scylla:                  "Caught in Scylla's tentacles — gold escaping!",
  stone_troll:             "TOLL! The stone troll always collects.",
  fat_beast:               "The beast sits on your gold. All of it.",
  war_ogre:                "SMASH! The ogre claims its war tribute.",
  manticore:               "The manticore's sting costs everything!",
  stone_colossus:          "The colossus crushes your coin vault!",
  divine_beast_young:      "Even young, the divine beast takes all.",
  divine_beast_adult:      "The elder divine beast demands tribute!",
  cursed_king_second_form: "The king's true form is even more expensive.",
  divine_beast_perfect:    "PERFECT destruction. Your gold is gone.",
};

// ─── Player Classes ───────────────────────────────────────────────────────────
// To add a new class:
//   1. Add an entry here — that's it. Both SetupWizard and PlayerCard read from this list.
//   2. For a tilemap tile: set tile to the numeric index (see tile reference at top of file).
//   3. For a custom sprite: drop a 16×16 PNG at frontend/public/sprites/icons/<id>.png
//      and set tile to the string id (e.g. 'frost_knight').
// ─────────────────────────────────────────────────────────────────────────────
export const CLASSES = [
  { id: 'warrior',      label: 'Warrior',      tile: 87             },
  { id: 'mage',         label: 'Mage',         tile: 84             },
  { id: 'witch',        label: 'Witch',        tile: 99             },
  { id: 'rogue',        label: 'Rogue',        tile: 88             },
  { id: 'paladin',      label: 'Paladin',      tile: 96             },
  { id: 'ranger',       label: 'Ranger',       tile: 'ranger'       },
  { id: 'frost_knight', label: 'Frost Knight', tile: 'frost_knight' },
];
