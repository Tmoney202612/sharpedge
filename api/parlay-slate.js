export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const { sports, sport } = req.query;

  const SPORT_MARKETS = {
    basketball_nba: 'h2h,spreads,totals,player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists',
    basketball_wnba: 'h2h,spreads,totals,player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists',
    baseball_mlb: 'h2h,spreads,totals,batter_total_bases,batter_hits,batter_home_runs,pitcher_strikeouts',
    icehockey_nhl: 'h2h,spreads,totals,player_points,player_shots_on_goal,player_assists,player_goals',
    americanfootball_nfl: 'h2h,spreads,totals,player_pass_yds,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td',
    americanfootball_ufl: 'h2h,spreads,totals,player_pass_yds,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td',
    // TODO: soccer_epl h2h is 3-way (home/away/draw). 2-way de-vig produces fake edges. Add when 3-way de-vig is implemented (separate slice).
    soccer_epl: 'spreads,totals,player_shots_on_target,player_shots,player_goal_scorer_anytime'
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Expose-Headers', 'x-requests-remaining');

  const requestedRaw = (sports || sport || '');
  const requested = requestedRaw.split(',').map(s => s.trim()).filter(s => s && SPORT_MARKETS[s]);
  if (!requested.length) {
    res.status(400).json({ error: 'Missing or unsupported sports', supported: Object.keys(SPORT_MARKETS) });
    return;
  }

  const PROPS_BOOKS = ['ballybet','betmgm','betonlineag','betparx','betrivers','bovada','draftkings','espnbet','fanatics','fanduel','fliff','hardrockbet_fl','williamhill_us'].join(',');

  function parseOutcome(o, marketKey) {
    if (o.price == null) return null;
    let entity, side, market_type;
    const point = (o.point != null) ? o.point : null;
    if (marketKey === 'h2h') {
      entity = o.name; side = 'ML'; market_type = 'h2h';
    } else if (marketKey === 'spreads' || marketKey === 'alternate_spreads') {
      entity = o.name; side = 'SPREAD'; market_type = 'spread';
    } else if (marketKey === 'totals' || marketKey === 'alternate_totals') {
      entity = 'TOTAL'; side = o.name; market_type = 'total';
    } else {
      if (!o.description) return null;
      entity = o.description; side = o.name; market_type = 'prop';
    }
    if (!entity) return null;
    return { entity, side, point, market_type };
  }

  let lastRemaining = '';

  async function fetchSportSlate(sportKey) {
    const markets = SPORT_MARKETS[sportKey];
    const eventsUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${API_KEY}`;
    const eventsRes = await fetch(eventsUrl);
    if (!eventsRes.ok) return [];
    const allEvents = await eventsRes.json();
    if (!Array.isArray(allEvents)) return [];
    const remaining = eventsRes.headers.get('x-requests-remaining');
    if (remaining) lastRemaining = remaining;

    const now = Date.now();
    const cutoff = now + 86400000;
    const upcoming = allEvents.filter(e => {
      const t = e.commence_time ? new Date(e.commence_time).getTime() : 0;
      return t > now && t <= cutoff;
    });
    if (upcoming.length === 0) return [];

    const CONCURRENCY = 6;
    const results = new Array(upcoming.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < upcoming.length) {
        const idx = cursor++;
        const ev = upcoming[idx];
        const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${ev.id}/odds?apiKey=${API_KEY}&regions=us,us2&markets=${markets}&oddsFormat=american&bookmakers=${PROPS_BOOKS}`;
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

    return results.map(r => {
      const ev = r.event;
      const out = {
        event_id: ev.id,
        sport_key: sportKey,
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
            const parsed = parseOutcome(o, mk.key);
            if (!parsed) return;
            const { entity, side, point, market_type } = parsed;
            const key = `${ev.id}|${mk.key}|${entity}|${side}|${point == null ? '' : point}`;
            if (!legMap.has(key)) {
              legMap.set(key, { leg_key: key, market: mk.key, market_type, entity, side, point, prices: [] });
            }
            legMap.get(key).prices.push({ book: bm.key, price: o.price });
          });
        });
      });
      out.legs = Array.from(legMap.values());
      return out;
    });
  }

  try {
    const allEvents = [];
    for (const sportKey of requested) {
      const events = await fetchSportSlate(sportKey);
      for (const ev of events) allEvents.push(ev);
    }
    res.setHeader('x-requests-remaining', lastRemaining);
    res.status(200).json({ sports: requested, fetchedAt: Date.now(), requestsRemaining: lastRemaining, events: allEvents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
