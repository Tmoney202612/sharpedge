export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;

  // First, dynamically fetch all in-season sports (FREE - no API credit cost)
  let sportKeys = [];
  try {
    const sportsRes = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${API_KEY}`);
    const sportsData = await sportsRes.json();
    if (Array.isArray(sportsData)) {
      sportKeys = sportsData.map(s => s.key);
    }
  } catch (e) {
    // Fallback to hardcoded list if sports endpoint fails
    sportKeys = [
      'americanfootball_nfl',
      'americanfootball_ncaaf',
      'americanfootball_nfl_preseason',
      'americanfootball_xfl',
      'americanfootball_ufl',
      'basketball_nba',
      'basketball_ncaab',
      'basketball_wnba',
      'basketball_euroleague',
      'baseball_mlb',
      'baseball_ncaa',
      'icehockey_nhl',
      'soccer_usa_mls',
      'soccer_epl',
      'soccer_spain_la_liga',
      'soccer_germany_bundesliga',
      'soccer_italy_serie_a',
      'soccer_france_ligue_one',
      'soccer_uefa_champs_league',
      'soccer_uefa_europa_league',
      'soccer_mexico_ligamx',
      'soccer_brazil_serie_a',
      'mma_mixed_martial_arts',
      'boxing_boxing',
      'tennis_atp_aus_open',
      'tennis_atp_french_open',
      'tennis_atp_us_open',
      'tennis_atp_wimbledon',
      'golf_masters_tournament',
      'golf_pga_championship',
      'golf_the_open_championship',
      'golf_us_open',
      'rugbyleague_nrl',
      'aussierules_afl',
      'cricket_ipl',
      'cricket_test_match',
    ];
  }

  try {
    // Fetch scores for all sports in parallel
    const results = await Promise.allSettled(
      sportKeys.map(sport =>
        fetch(`https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${API_KEY}&daysFrom=1`)
          .then(r => r.json())
          .then(data => Array.isArray(data) ? data : [])
      )
    );

    const allGames = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => {
        // Live games first
        if (a.last_update && !b.last_update) return -1;
        if (!a.last_update && b.last_update) return 1;
        // Then upcoming, then completed
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
