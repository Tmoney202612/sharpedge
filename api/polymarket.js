// /api/polymarket.js - Vercel serverless function
// Fetches sports markets from Polymarket's Gamma API
// Normalizes cent prices to American odds format
// Returns data compatible with the frontend arb engine

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  const sport = req.query.sport || 'all';

  try {
    // Fetch active sports events from Polymarket Gamma API
    const gammaUrl = 'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100&order=volume_24hr&ascending=false';
    const response = await fetch(gammaUrl, {
      headers: { 'User-Agent': 'PrimeEdgePicks/1.0' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Polymarket API error', status: response.status });
    }

    const events = await response.json();
    if (!Array.isArray(events)) {
      return res.status(502).json({ error: 'Invalid Polymarket response' });
    }

    // Sport keyword mapping
    const sportKeywords = {
      'basketball_nba': ['nba', 'basketball', 'lakers', 'celtics', 'warriors', 'knicks', 'heat', 'bucks', 'nuggets', 'suns', 'cavaliers', 'thunder', 'mavericks', 'timberwolves', 'pacers', 'magic', 'hawks', 'nets', 'clippers', 'grizzlies', 'pelicans', 'rockets', 'spurs', 'kings', 'sixers', '76ers', 'raptors', 'bulls', 'pistons', 'hornets', 'wizards', 'blazers', 'jazz'],
      'baseball_mlb': ['mlb', 'baseball', 'yankees', 'dodgers', 'astros', 'braves', 'phillies', 'padres', 'mets', 'cubs', 'red sox', 'cardinals', 'brewers', 'guardians', 'orioles', 'rangers', 'twins', 'rays', 'mariners', 'diamondbacks', 'reds', 'pirates', 'royals', 'tigers', 'angels', 'athletics', 'rockies', 'marlins', 'nationals', 'white sox', 'giants'],
      'icehockey_nhl': ['nhl', 'hockey', 'bruins', 'rangers', 'oilers', 'avalanche', 'panthers', 'hurricanes', 'jets', 'stars', 'wild', 'lightning', 'maple leafs', 'penguins', 'capitals', 'devils', 'islanders', 'flames', 'canucks', 'blues', 'predators', 'senators', 'red wings', 'kraken', 'ducks', 'coyotes', 'sabres', 'flyers', 'blue jackets', 'blackhawks', 'canadiens', 'sharks', 'golden knights'],
      'americanfootball_nfl': ['nfl', 'chiefs', 'eagles', 'cowboys', '49ers', 'bills', 'ravens', 'lions', 'dolphins', 'bengals', 'texans', 'packers', 'steelers', 'jaguars', 'chargers', 'rams', 'bears', 'broncos', 'seahawks', 'saints', 'vikings', 'colts', 'browns', 'falcons', 'commanders', 'panthers', 'titans', 'buccaneers', 'raiders', 'cardinals', 'giants', 'jets'],
      'mma_mixed_martial_arts': ['ufc', 'mma', 'fight', 'bout', 'knockout', 'submission'],
      'soccer_epl': ['premier league', 'epl', 'arsenal', 'manchester city', 'manchester united', 'liverpool', 'chelsea', 'tottenham', 'newcastle', 'brighton', 'aston villa', 'west ham', 'crystal palace', 'fulham', 'wolves', 'bournemouth', 'brentford', 'everton', 'nottingham forest', 'burnley', 'luton', 'sheffield'],
      'soccer_usa_mls': ['mls', 'inter miami', 'la galaxy', 'lafc', 'seattle sounders', 'portland timbers', 'atlanta united', 'columbus crew', 'fc cincinnati', 'new york red bulls', 'nycfc', 'orlando city', 'nashville sc', 'real salt lake', 'sporting kc', 'austin fc', 'chicago fire', 'houston dynamo', 'vancouver whitecaps', 'cf montreal', 'toronto fc', 'new england revolution', 'philadelphia union', 'dc united', 'san jose earthquakes', 'minnesota united', 'colorado rapids', 'fc dallas', 'st louis city'],
    };

    // Filter and normalize events
    const normalizedMarkets = [];

    events.forEach(event => {
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const combined = title + ' ' + description;
      const markets = event.markets || [];

      // Determine sport
      let detectedSport = null;
      if (sport !== 'all') {
        // Check if this event matches the requested sport
        const keywords = sportKeywords[sport] || [];
        if (keywords.some(kw => combined.includes(kw))) {
          detectedSport = sport;
        } else {
          return; // Skip non-matching events
        }
      } else {
        // Auto-detect sport
        for (const [sportKey, keywords] of Object.entries(sportKeywords)) {
          if (keywords.some(kw => combined.includes(kw))) {
            detectedSport = sportKey;
            break;
          }
        }
        if (!detectedSport) return; // Skip non-sports events
      }

      // Process each market (binary outcome)
      markets.forEach(market => {
        if (!market.active || market.closed) return;

        const outcomes = market.outcomes || [];
        const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
        const clobTokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];

        if (outcomes.length < 2 || outcomePrices.length < 2) return;

        const yesPrice = parseFloat(outcomePrices[0]);
        const noPrice = parseFloat(outcomePrices[1]);

        if (isNaN(yesPrice) || isNaN(noPrice) || yesPrice <= 0 || yesPrice >= 1) return;

        // Convert cent prices to American odds
        // Yes price: probability = yesPrice, odds = prob > 0.5 ? -(prob/(1-prob))*100 : ((1-prob)/prob)*100
        const yesOdds = centToAmerican(yesPrice);
        const noOdds = centToAmerican(noPrice);

        // Extract team names from outcomes or title
        const outcome1 = outcomes[0] || 'Yes';
        const outcome2 = outcomes[1] || 'No';

        // Get liquidity info
        const volume = market.volume || 0;
        const liquidity = market.liquidity || 0;

        normalizedMarkets.push({
          id: market.id || event.id,
          sport: detectedSport,
          event_title: event.title,
          question: market.question || event.title,
          home_team: outcome1,
          away_team: outcome2,
          commence_time: market.endDate || event.endDate,
          start_date: market.startDate || event.startDate,
          bookmaker: 'Polymarket',
          outcomes: [
            {
              name: outcome1,
              price: yesOdds,
              cent_price: yesPrice,
              token_id: clobTokenIds[0] || null
            },
            {
              name: outcome2,
              price: noOdds,
              cent_price: noPrice,
              token_id: clobTokenIds[1] || null
            }
          ],
          volume: volume,
          liquidity: liquidity,
          volume_24hr: market.volume24hr || 0,
          polymarket_url: `https://polymarket.com/event/${event.slug || ''}`,
          market_slug: market.slug || ''
        });
      });
    });

    // Sort by volume (most liquid first)
    normalizedMarkets.sort((a, b) => b.volume - a.volume);

    return res.status(200).json({
      count: normalizedMarkets.length,
      source: 'polymarket',
      markets: normalizedMarkets
    });

  } catch (error) {
    console.error('Polymarket API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Convert Polymarket cent price (0.00-1.00) to American odds
function centToAmerican(price) {
  if (price <= 0 || price >= 1) return 0;
  if (price >= 0.5) {
    // Favorite: negative odds
    return Math.round(-(price / (1 - price)) * 100);
  } else {
    // Underdog: positive odds
    return Math.round(((1 - price) / price) * 100);
  }
}
