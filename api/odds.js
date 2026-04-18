export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.ODDS_API_KEY;
  const { sport = 'basketball_nba', markets = 'h2h', oddsFormat = 'american' } = req.query;

  // Top 15 sharp + major books - Pinnacle is sharpest, rest are high-volume soft books
  const TOP_BOOKS = [
    'pinnacle',
    'draftkings',
    'fanduel',
    'betmgm',
    'caesars',
    'bet365',
    'pointsbetus',
    'betrivers',
    'circasports',
    'fanatics',
    'espnbet',
    'hardrockbet',
    'betway',
    'unibet_us',
    'williamhill_us',
  ].join(',');

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2,eu,uk,au&markets=${markets}&oddsFormat=${oddsFormat}&bookmakers=${TOP_BOOKS}`;
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
