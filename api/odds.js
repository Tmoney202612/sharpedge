xport default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    const { sport = 'basketball_nba', market = 'h2h', live = 'false' } = req.query;
    const API_KEY = process.env.ODDS_API_KEY;

    try {
        // Fetch both pre-match and live odds in parallel
        const preMatchUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2&markets=${market}&oddsFormat=american`;
        const liveUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds-live/?apiKey=${API_KEY}&regions=us,us2&markets=${market}&oddsFormat=american`;

        let allGames = [];

        // Always fetch pre-match
        const preRes = await fetch(preMatchUrl);
        if (preRes.ok) {
            const preData = await preRes.json();
            if (Array.isArray(preData)) {
                allGames = preData.map(g => ({ ...g, isLive: false }));
            }
        }

        // Also fetch live odds
        try {
            const liveRes = await fetch(liveUrl);
            if (liveRes.ok) {
                const liveData = await liveRes.json();
                if (Array.isArray(liveData) && liveData.length > 0) {
                    // Mark live games and add/replace in allGames
                    const liveGames = liveData.map(g => ({ ...g, isLive: true }));
                    // Replace pre-match entries with live versions if same game
                    liveGames.forEach(lg => {
                        const idx = allGames.findIndex(g => g.id === lg.id);
                        if (idx >= 0) {
                            allGames[idx] = lg; // Replace with live odds
                        } else {
                            allGames.push(lg); // Add new live game
                        }
                    });
                }
            }
        } catch(e) {
            // Live endpoint might not be available for all sports — that's ok
        }

        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
        res.status(200).json(allGames);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
