/* ============================================================
   EDIT THIS FILE to change songs, albums and scoring.
   Points + rarity are calculated from `streams` automatically.
   ============================================================ */
const TOP_POINTS = 5000;         // most streamed song
const POINTS_CURVE = 0.7;        // lower = flatter curve (more points for small songs)
const UNRELEASED_POINTS = 30000; // every unreleased song
const ALBUM_BONUS = 0.10;        // bonus for a full album = 10% of its songs' points
const ALBUM_PACKS = 2;         // free packs for claiming a full album
const HOLO_CHANCE = 0.10;      // chance an option in a pack is holo
const HOLO_MULT = 3;           // holo songs are worth 3x

const ALBUMS = [
  { id: 'gk1',   name: 'Good Kid',                  year: '2018' },
  { id: 'gk2',   name: 'Good Kid 2',                year: '2020' },
  { id: 'gk3',   name: 'Good Kid 3',                year: '2023' },
  { id: 'gk4',   name: 'Good Kid 4',                year: '2024' },
  { id: 'cwhos', name: 'Can We Hang Out Sometime?', year: '2026' },
  { id: 'singles', name: 'Singles',                 year: '2016-2020' },
  { id: 'unreleased', name: 'Unreleased',           year: '-' },
];

/* streams are PLACEHOLDERS - replace with real Spotify counts.
   Optional per song: cover:'url', audio:'url.mp3' (overrides the automatic lookup). */
const SONGS = [
  // Good Kid (2018 EP)
  { id: 'nomu',      title: 'Nomu',                  album: 'gk1', made: '2015-10-13', streams: 70e6 },
  { id: 'tmyk',      title: 'Tell Me You Know',      album: 'gk1', made: '2018-06-04', streams: 45e6 },
  { id: 'alchemist', title: 'Alchemist',             album: 'gk1', made: '2020',       streams: 95e6 },
  { id: 'witches',   title: 'Witches',               album: 'gk1', made: '2017-06-06', streams: 90e6 },
  { id: 'faster',   title: 'Faster',                 album: 'gk1', made: '2017-06-06', streams: 90e6 },
  { id: 'atlas',   title: 'Atlas',                   album: 'gk1', made: '2017-06-06', streams: 90e6 },
  // Good Kid 2 (2020)
  { id: 'dwtk',      title: 'Down with the King',    album: 'gk2', made: '2020', streams: 30e6 },
  { id: 'everything',title: 'Everything Everything', album: 'gk2', made: '2020', streams: 36e6 },
  { id: 'slingshot', title: 'Slingshot',             album: 'gk2', made: '2019', streams: 40e6 },
  { id: 'pox',       title: 'Pox',                   album: 'gk2', made: '2020', streams: 32e6 },
  { id: 'aloe',      title: 'Aloe Lite',             album: 'gk2', made: '2020', streams: 28e6 },
  { id: 'drifting',  title: 'Drifting',              album: 'gk2', made: '2020', streams: 33e6 },
  // Good Kid 3 (2023)
  { id: 'ntte',      title: 'No Time to Explain',    album: 'gk3', made: '2022', streams: 140e6 },
  { id: 'mimi',      title: "Mimi's Delivery Service", album: 'gk3', made: '2023', streams: 170e6 },
  { id: 'osmosis',   title: 'Osmosis',               album: 'gk3', made: '2023', streams: 26e6 },
  { id: 'frt',       title: 'First Rate Town',       album: 'gk3', made: '2023', streams: 35e6 },
  { id: 'orbit',     title: 'Orbit',                 album: 'gk3', made: '2021', streams: 24e6 },
  { id: 'madeleine', title: 'Madeleine',             album: 'gk3', made: '2023', streams: 55e6 },
  // Good Kid 4 (2024)
  { id: 'fts',       title: 'From the Start',        album: 'gk4', made: '2023-11-10', streams: 220e6 },
  { id: 'bubbly',    title: 'Bubbly',                album: 'gk4', made: '2024', streams: 60e6 },
  { id: 'break',     title: 'Break',                 album: 'gk4', made: '2024', streams: 20e6 },
  { id: 'summer',    title: 'Summer',                album: 'gk4', made: '2024', streams: 22e6 },
  { id: 'dance',     title: 'Dance Class',           album: 'gk4', made: '2017-06-06', streams: 90e6 },
  { id: 'inn',       title: 'Premier Inn',           album: 'gk4', made: '2017-06-06', streams: 90e6 },
  // Can We Hang Out Sometime? (2026) - only 2 of 10 songs added so far
  { id: 'wall',      title: 'Wall',                  album: 'cwhos', made: '2026', streams: 15e6 },
  { id: 'cicada',    title: 'Cicada',                album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'rift',      title: 'Rift',                  album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'eastside',  title: 'Eastside',              album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'tea',       title: 'Tea Leaves',            album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'alone',     title: 'Alone With Me',         album: 'cwhos', made: '2026', streams: 15e6 },
  { id: 'ghost',     title: 'Ghost Keeper',          album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'tornado',   title: 'Tornado',               album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'ginger',    title: 'Ginger Lemonade',       album: 'cwhos', made: '2026', streams: 12e6 },
  { id: 'coffee',    title: 'Coffee',                album: 'cwhos', made: '2026', streams: 12e6 },
  // Singles
  { id: 'ground',    title: 'Ground',                album: 'singles', made: '2026', streams: 15e6 },

  /* UNRELEASED - add one per song. Always 30,000 pts. Example:
  { id: 'example', title: 'Song Name', album: 'unreleased', made: '2019', unreleased: true,
    audio: 'https://.../file.mp3', cover: 'https://.../cover.jpg' }, */
];
