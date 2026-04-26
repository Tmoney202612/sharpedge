export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const { sport = 'basketball_nba', market, markets, oddsFormat = 'american' } = req.query;
  const marketParam = markets || market || 'h2h';

  // Top 15 books - Pinnacle as sharp benchmark + major US books
  const TOP_BOOKS = [
    'pinnacle',       // Sharpest book in world - EV/arb benchmark
    'draftkings',
    'fanduel',
    'betmgm',
    'williamhill_us', // Caesars is williamhill_us in Odds API
    'bet365',
    'betrivers',
    'fanatics',
    'espnbet',
    'hardrockbet',
    'unibet_us',
    'superbook',
    'wynnbet',
    'betus',
    'fliff',
'ballybet',
  ].join(',');

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2,eu,uk,au&markets=${marketParam}&oddsFormat=${oddsFormat}&bookmakers=${TOP_BOOKS}`;
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('x-requests-remaining', r.headers.get('x-requests-remaining') || '');
    res.setHeader('x-requests-used', r.headers.get('x-requests-used') || '');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
