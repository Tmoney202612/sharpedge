export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const sport = req.query.sport;

  // Only sports shown on the site - saves ~95% of API calls vs fetching all 30+
  const ACTIVE_SPORTS = [
    'basketball_nba',
    'baseball_mlb',
    'icehockey_nhl',
    'soccer_epl',
    'soccer_spain_la_liga',
    'soccer_germany_bundesliga',
    'soccer_italy_serie_a',
    'soccer_france_ligue_one',
    'soccer_uefa_champs_league',
    'soccer_usa_mls',
    'tennis_atp_french_open',
    'tennis_wta_french_open',
    'mma_mixed_martial_arts',
    'boxing_boxing',
  ];

  const sportsToFetch = sport ? [sport] : ACTIVE_SPORTS;

  try {
    const results = await Promise.allSettled(
      sportsToFetch.map(s =>
        fetch(`https://api.the-odds-api.com/v4/sports/${s}/scores/?apiKey=${API_KEY}&daysFrom=1`)
          .then(r => r.json())
          .then(data => Array.isArray(data) ? data : [])
          .catch(() => [])
      )
    );

    const allGames = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => {
        const aLive = !a.completed && a.scores;
        const bLive = !b.completed && b.scores;
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return new Date(a.commence_time) - new Date(b.commence_time);
      });

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    res.status(200).json(allGames);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
