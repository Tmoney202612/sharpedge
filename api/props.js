export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const API_KEY = process.env.ODDS_API_KEY;
  const { sport, eventId, markets } = req.query;
  if (!sport || !eventId || !markets) {
    res.status(400).json({ error: 'Missing sport, eventId, or markets' });
    return;
  }
  const PROPS_BOOKS = ['draftkings','fanduel','betmgm','williamhill_us','betrivers','fanatics','espnbet','hardrockbet'].join(',');
  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${API_KEY}&regions=us,us2&markets=${markets}&oddsFormat=american&bookmakers=${PROPS_BOOKS}`;
    const r = await fetch(url);
    const remaining = r.headers.get('x-requests-remaining') || '';
    res.setHeader('x-requests-remaining', remaining);
    res.setHeader('Access-Control-Expose-Headers', 'x-requests-remaining');
    if (!r.ok) {
      const body = await r.text();
      res.setHeader('Cache-Control', 'no-store');
      res.status(r.status).json({ error: 'Upstream error', status: r.status, remaining, body: body.slice(0, 500) });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
