export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    const { sport = 'basketball_nba', market = 'h2h' } = req.query;
    const API_KEY = process.env.ODDS_API_KEY;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2&markets=${market}&oddsFormat=american`;
    try {
        const r = await fetch(url);
        const data = await r.json();
        let allGames = Array.isArray(data) ? data : [];

        // Try to fetch live odds — if it fails, just use pre-match
        try {
            const liveUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds-live/?apiKey=${API_KEY}&regions=us,us2&markets=${market}&oddsFormat=american`;
            const liveRes = await fetch(liveUrl);
            if (liveRes.ok) {
                const liveData = await liveRes.json();
                if (Array.isArray(liveData)) {
                    liveData.forEach(lg => {
                        const idx = allGames.findIndex(g => g.id === lg.id);
                        if (idx >= 0) allGames[idx] = { ...lg, isLive: true };
                        else allGames.push({ ...lg, isLive: true });
                    });
                }
            }
        } catch(e) { /* live not available — no problem */ }

        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
        res.status(200).json(allGames);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
