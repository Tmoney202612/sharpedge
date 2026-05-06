export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const { sport } = req.query;

  const PROP_MARKETS = {
    basketball_nba: 'player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists',
    baseball_mlb: 'batter_total_bases,batter_hits,batter_home_runs,pitcher_strikeouts',
    icehockey_nhl: 'player_points,player_shots_on_goal,player_assists,player_goals',
    americanfootball_nfl: 'player_pass_yds,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td',
    soccer_epl: 'player_shots_on_target,player_shots,player_goal_scorer_anytime'
  };

  res.setHeader('Cache-Control', 'no-store');

  if (!sport || !PROP_MARKETS[sport]) {
    res.status(400).json({ error: 'Missing or unsupported sport', supported: Object.keys(PROP_MARKETS) });
    return;
  }

  const PROPS_BOOKS = ['draftkings','fanduel','betmgm','williamhill_us','betrivers','fanatics','espnbet','hardrockbet'].join(',');
  const markets = PROP_MARKETS[sport];

  try {
    const eventsUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${API_KEY}`;
    const eventsRes = await fetch(eventsUrl);
    if (!eventsRes.ok) {
      const body = await eventsRes.text();
      res.status(eventsRes.status).json({ error: 'Upstream events error', status: eventsRes.status, body: body.slice(0, 500) });
      return;
    }
    const allEvents = await eventsRes.json();
    if (!Array.isArray(allEvents)) {
      res.status(502).json({ error: 'Unexpected events payload' });
      return;
    }

    const now = Date.now();
    const cutoff = now + 86400000;
    const upcoming = allEvents.filter(e => {
      const t = e.commence_time ? new Date(e.commence_time).getTime() : 0;
      return t > now && t <= cutoff;
    });

    let lastRemaining = eventsRes.headers.get('x-requests-remaining') || '';

    if (upcoming.length === 0) {
      res.status(200).json({ sport, fetchedAt: Date.now(), requestsRemaining: lastRemaining, events: [] });
      return;
    }

    const CONCURRENCY = 6;
    const results = new Array(upcoming.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < upcoming.length) {
        const idx = cursor++;
        const ev = upcoming[idx];
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${ev.id}/odds?apiKey=${API_KEY}&regions=us,us2&markets=${markets}&oddsFormat=american&bookmakers=${PROPS_BOOKS}`;
        try {
          const r = await fetch(url);
          const remaining = r.headers.get('x-requests-remaining');
          if (remaining) lastRemaining = remaining;
          if (!r.ok) { results[idx] = { event: ev, error: 'upstream ' + r.status }; continue; }
          const data = await r.json();
          results[idx] = { event: ev, data };
        } catch (e) {
          results[idx] = { event: ev, error: e.message };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, upcoming.length) }, worker));

    const events = results.map(r => {
      const ev = r.event;
      const out = {
        event_id: ev.id,
        home: ev.home_team,
        away: ev.away_team,
        commence_time: ev.commence_time,
        legs: []
      };
      if (r.error || !r.data) { out.error = r.error || 'no data'; return out; }
      const legMap = new Map();
      const books = r.data.bookmakers || [];
      books.forEach(bm => {
        (bm.markets || []).forEach(mk => {
          (mk.outcomes || []).forEach(o => {
            const hasDesc = !!o.description;
            const player = hasDesc ? o.description : (o.name || '');
            const side = hasDesc ? (o.name || '') : 'Yes';
            const point = (o.point != null) ? o.point : null;
            if (!player) return;
            const key = `${ev.id}|${mk.key}|${player}|${side}|${point == null ? '' : point}`;
            if (!legMap.has(key)) {
              legMap.set(key, { leg_key: key, market: mk.key, player, point, side, prices: [] });
            }
            legMap.get(key).prices.push({ book: bm.key, price: o.price });
          });
        });
      });
      out.legs = Array.from(legMap.values());
      return out;
    });

    res.status(200).json({ sport, fetchedAt: Date.now(), requestsRemaining: lastRemaining, events });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
