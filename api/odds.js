export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const { sport = 'basketball_nba', market = 'h2h' } = req.query;
  const API_KEY = process.env.ODDS_API_KEY;
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2,eu&markets=${market}&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars,betrivers,pointsbet,pinnacle,unibet,betonlineag`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
