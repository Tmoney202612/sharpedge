export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const sport = req.query.sport;

  try {
    let sportsToFetch = [];

    if (sport) {
      // Single sport requested - just fetch that one
      sportsToFetch = [sport];
    } else {
      // Fetch active sports list (FREE - no quota cost)
      // Filter out futures/outrights which have no scores
      const sportsRes = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${API_KEY}&all=false`);
      const sportsData = await sportsRes.json();
      sportsToFetch = Array.isArray(sportsData)
        ? sportsData
            .filter(s => !s.has_outrights && s.active)
            .map(s => s.key)
        : [];
    }

    if (sportsToFetch.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch scores for all active sports in parallel
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
        // Live games (has scores, not completed) first
        const aLive = !a.completed && Array.isArray(a.scores) && a.scores.length > 0;
        const bLive = !b.completed && Array.isArray(b.scores) && b.scores.length > 0;
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        // Then upcoming
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return new Date(a.commence_time) - new Date(b.commence_time);
      });

    res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=60');
    res.status(200).json(allGames);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
