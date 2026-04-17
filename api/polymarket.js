// /api/polymarket.js - Vercel serverless function v5
// Uses Polymarket's public-search API to find game-level odds
// Searches by team names from our Odds API to find matching markets

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=20');

  // Accept either a sport key or specific team search
  const sport = req.query.sport || 'all';
  const oddsGames = req.query.games; // JSON array of {home, away} from frontend

  try {
    let allMarkets = [];

    if (oddsGames) {
      // Mode 1: Frontend passes specific games to search for
      const games = JSON.parse(oddsGames);
      for (const game of games.slice(0, 15)) { // Limit to 15 games to avoid rate limits
        const markets = await searchGame(game.home, game.away, game.sport);
        allMarkets.push(...markets);
      }
    } else {
      // Mode 2: Search by sport using key team names
      const sportSearches = {
        'basketball_nba': ['NBA'],
        'baseball_mlb': ['MLB'],
        'icehockey_nhl': ['NHL'],
        'mma_mixed_martial_arts': ['UFC'],
        'soccer_epl': ['Premier League'],
        'soccer_usa_mls': ['MLS'],
      };

      let searches = [];
      if (sport === 'all') {
        searches = Object.values(sportSearches).flat();
      } else if (sportSearches[sport]) {
        searches = sportSearches[sport];
      }

      for (const query of searches) {
        const markets = await searchPolymarket(query, 20);
        allMarkets.push(...markets);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Deduplicate by conditionId
    const seen = new Set();
    const unique = allMarkets.filter(m => {
      const key = m.id || m.question;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by volume
    unique.sort((a, b) => b.volume - a.volume);

    return res.status(200).json({
      count: unique.length,
      source: 'polymarket',
      markets: unique
    });

  } catch (error) {
    console.error('Polymarket API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Search for a specific game matchup
async function searchGame(homeTeam, awayTeam, sport) {
  // Extract last word of team name (e.g., "Los Angeles Lakers" -> "Lakers")
  const home = homeTeam.split(' ').pop();
  const away = awayTeam.split(' ').pop();
  const query = `${away} ${home}`;
  return searchPolymarket(query, 5, sport);
}

// Search Polymarket's public search endpoint
async function searchPolymarket(query, limit, sport) {
  try {
    const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query)}&limit=${limit || 10}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PrimeEdgePicks/1.0' }
    });

    if (!resp.ok) return [];

    const data = await resp.json();

    // Response has events array
    const events = data.events || data || [];
    if (!Array.isArray(events)) return [];

    const results = [];

    events.forEach(event => {
      const markets = event.markets || [];
      const eventTitle = event.title || '';

      markets.forEach(market => {
        const parsed = parseMarket(market, eventTitle, sport);
        if (parsed) results.push(parsed);
      });

      // If no nested markets, try parsing the event itself as a market
      if (markets.length === 0) {
        const parsed = parseMarket(event, eventTitle, sport);
        if (parsed) results.push(parsed);
      }
    });

    return results;
  } catch(e) {
    console.error('Search error:', e.message);
    return [];
  }
}

// Parse a market object into normalized format
function parseMarket(market, eventTitle, sport) {
  try {
    // Get outcomes
    let outcomes = market.outcomes || [];
    if (typeof outcomes === 'string') {
      try { outcomes = JSON.parse(outcomes); } catch(e) { return null; }
    }

    // Get prices
    let prices = market.outcomePrices || [];
    if (typeof prices === 'string') {
      try { prices = JSON.parse(prices); } catch(e) { return null; }
    }

    if (outcomes.length < 2 || prices.length < 2) return null;

    // Get outcome names
    const name1 = typeof outcomes[0] === 'string' ? outcomes[0] : (outcomes[0]?.name || '');
    const name2 = typeof outcomes[1] === 'string' ? outcomes[1] : (outcomes[1]?.name || '');

    // CRITICAL: Skip Yes/No markets — these are futures/props, not game moneylines
    // Game markets use team names as outcomes (e.g., "Celtics", "Heat")
    const lowerNames = [name1.toLowerCase(), name2.toLowerCase()];
    if (lowerNames.includes('yes') || lowerNames.includes('no') || 
        lowerNames.includes('over') || lowerNames.includes('under')) return null;

    const p1 = parseFloat(prices[0]);
    const p2 = parseFloat(prices[1]);

    // Filter extremes (futures/championship markets)
    if (isNaN(p1) || isNaN(p2) || p1 <= 0.03 || p1 >= 0.97 || p2 <= 0.03 || p2 >= 0.97) return null;

    const odds1 = centToAmerican(p1);
    const odds2 = centToAmerican(p2);
    if (odds1 === 0 || odds2 === 0) return null;

    // Determine market type
    const question = (market.question || market.groupItemTitle || eventTitle || '').toLowerCase();
    let marketType = 'h2h';
    if (question.includes('spread') || question.includes('+') && question.includes('-')) marketType = 'spreads';
    if (question.includes('o/u') || question.includes('over') || question.includes('under') || question.includes('total')) marketType = 'totals';
    if (question.includes('points') || question.includes('rebounds') || question.includes('assists') || question.includes('strikeouts') || question.includes('goals')) marketType = 'props';

    // Detect sport from slug or question
    const slug = market.slug || '';
    let detectedSport = sport || 'unknown';
    if (slug.startsWith('nba-') || question.includes('nba')) detectedSport = 'basketball_nba';
    else if (slug.startsWith('mlb-') || question.includes('mlb')) detectedSport = 'baseball_mlb';
    else if (slug.startsWith('nhl-') || question.includes('nhl')) detectedSport = 'icehockey_nhl';
    else if (slug.startsWith('ufc-') || question.includes('ufc')) detectedSport = 'mma_mixed_martial_arts';
    else if (slug.startsWith('epl-') || question.includes('premier league')) detectedSport = 'soccer_epl';
    else if (slug.startsWith('mls-') || question.includes('mls')) detectedSport = 'soccer_usa_mls';

    const sportLabels = {
      'basketball_nba': 'NBA', 'baseball_mlb': 'MLB', 'icehockey_nhl': 'NHL',
      'mma_mixed_martial_arts': 'UFC', 'soccer_epl': 'EPL', 'soccer_usa_mls': 'MLS'
    };

    const volume = parseFloat(market.volume) || 0;
    const liquidity = parseFloat(market.liquidity) || 0;

    // Skip very low liquidity
    if (liquidity < 100 && volume < 500) return null;

    // Get clobTokenIds
    let tokenIds = market.clobTokenIds || [];
    if (typeof tokenIds === 'string') {
      try { tokenIds = JSON.parse(tokenIds); } catch(e) { tokenIds = []; }
    }

    const gameSlug = market.slug || slug;
    const gameDate = market.startDate || market.gameStartDate || '';
    const league = gameSlug.split('-')[0] || '';

    return {
      id: market.conditionId || market.id || gameSlug,
      sport: detectedSport,
      sportLabel: sportLabels[detectedSport] || detectedSport,
      event_title: eventTitle || market.question || '',
      question: market.question || eventTitle || '',
      home_team: name1,
      away_team: name2,
      commence_time: gameDate,
      bookmaker: 'Polymarket',
      market_type: marketType,
      outcomes: [
        { name: name1, price: odds1, cent_price: p1, token_id: tokenIds[0] || null },
        { name: name2, price: odds2, cent_price: p2, token_id: tokenIds[1] || null }
      ],
      volume,
      liquidity,
      polymarket_url: `https://polymarket.com/sports/${league}/${gameSlug}`,
      game_slug: gameSlug
    };
  } catch(e) {
    return null;
  }
}

// Convert Polymarket cent price to American odds
function centToAmerican(price) {
  if (price <= 0 || price >= 1) return 0;
  if (price >= 0.5) {
    return Math.round(-(price / (1 - price)) * 100);
  } else {
    return Math.round(((1 - price) / price) * 100);
  }
}
