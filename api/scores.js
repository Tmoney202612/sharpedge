export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    const { sport = 'basketball_nba' } = req.query;
    const API_KEY = process.env.ODDS_API_KEY;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${API_KEY}&daysFrom=1`;
    try {
        const r = await fetch(url);
        const data = await r.json();
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
        res.status(200).json(Array.isArray(data) ? data : []);
    } catch (e) { res.status(500).json({ error: e.message }); }
}
