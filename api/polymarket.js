// /api/polymarket.js - Vercel serverless function v4
// Fetches game-level sports odds from Polymarket
// Deep-parses Next.js dehydrated React Query state

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=30');

  const sport = req.query.sport || 'all';

  const leagueMap = {
    'basketball_nba': 'nba',
    'baseball_mlb': 'mlb',
    'icehockey_nhl': 'nhl',
    'mma_mixed_martial_arts': 'ufc',
    'soccer_epl': 'epl',
    'soccer_usa_mls': 'mls',
  };

  const sportLabels = {
    'nba': 'NBA', 'mlb': 'MLB', 'nhl': 'NHL',
    'ufc': 'UFC', 'epl': 'EPL', 'mls': 'MLS',
  };

  try {
    // Step 1: Get buildId
    const buildId = await getBuildId();
    if (!buildId) {
      return res.status(502).json({ error: 'Could not get Polymarket buildId' });
    }

    // Step 2: Determine leagues
    let leagues = [];
    if (sport === 'all') {
      leagues = Object.values(leagueMap);
    } else if (leagueMap[sport]) {
      leagues = [leagueMap[sport]];
    } else {
      return res.status(200).json({ count: 0, source: 'polymarket', markets: [] });
    }

    // Step 3: Fetch and parse games for each league
    const allMarkets = [];

    for (const league of leagues) {
      try {
        const url = `https://polymarket.com/_next/data/${buildId}/en/sports/${league}/games.json?league=${league}`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://polymarket.com/sports/live'
          }
        });

        if (!resp.ok) continue;

        const json = await resp.json();
        const text = JSON.stringify(json);

        // Deep extraction: find all objects that look like game/market data
        // Strategy: recursively search for objects with conditionId, outcomePrices, or outcomes
        const markets = extractMarkets(json, league);
        allMarkets.push(...markets);

      } catch(e) {
        console.error(`Error fetching ${league}:`, e.message);
      }
    }

    // Remove duplicates by conditionId or slug
    const seen = new Set();
    const unique = allMarkets.filter(m => {
      const key = m.id || m.game_slug || m.question;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by commence_time
    unique.sort((a, b) => new Date(a.commence_time || 0) - new Date(b.commence_time || 0));

    return res.status(200).json({
      count: unique.length,
      source: 'polymarket',
      buildId,
      leagues,
      markets: unique
    });

  } catch (error) {
    console.error('Polymarket API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Recursively extract market data from deeply nested JSON
function extractMarkets(obj, league) {
  const results = [];
  const sportLabel = { 'nba': 'NBA', 'mlb': 'MLB', 'nhl': 'NHL', 'ufc': 'UFC', 'epl': 'EPL', 'mls': 'MLS' }[league] || league;

  function walk(node, depth) {
    if (depth > 15 || !node) return;

    if (Array.isArray(node)) {
      node.forEach(item => walk(item, depth + 1));
      return;
    }

    if (typeof node !== 'object') return;

    // Check if this object looks like a game/market
    const hasCondition = node.conditionId || node.condition_id;
    const hasOutcomePrices = node.outcomePrices;
    const hasTicker = node.ticker || node.slug;
    const hasQuestion = node.question;
    const isGame = node.homeTeam || node.home_team || node.homeTeamName;
    const hasMarkets = Array.isArray(node.markets) && node.markets.length > 0;

    // Found a game with nested markets
    if (hasMarkets && (isGame || hasTicker)) {
      const homeTeam = node.homeTeam?.name || node.homeTeamName || node.home_team || '';
      const awayTeam = node.awayTeam?.name || node.awayTeamName || node.away_team || '';
      const startDate = node.startDate || node.startsAt || node.startTime || '';
      const gameSlug = node.slug || node.ticker || '';
      const gameTitle = node.title || `${awayTeam} vs ${homeTeam}`;

      node.markets.forEach(market => {
        const parsed = parseMarket(market, league, sportLabel, homeTeam, awayTeam, startDate, gameSlug, gameTitle);
        if (parsed) results.push(parsed);
      });
      return; // Don't recurse into children we already processed
    }

    // Found an individual market with prices
    if ((hasCondition || hasOutcomePrices) && (hasTicker || hasQuestion)) {
      const parsed = parseMarket(node, league, sportLabel, '', '', '', node.ticker || node.slug || '', node.question || node.title || '');
      if (parsed) results.push(parsed);
    }

    // Recurse into all child properties
    for (const key of Object.keys(node)) {
      walk(node[key], depth + 1);
    }
  }

  walk(obj, 0);
  return results;
}

// Parse a single market object into normalized format
function parseMarket(market, league, sportLabel, homeTeam, awayTeam, startDate, gameSlug, gameTitle) {
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

    // Need at least 2 outcomes and prices
    if (outcomes.length < 2 || prices.length < 2) return null;

    const p1 = parseFloat(prices[0]);
    const p2 = parseFloat(prices[1]);

    // Filter out extreme prices (not real game odds)
    if (isNaN(p1) || isNaN(p2) || p1 <= 0.02 || p1 >= 0.98 || p2 <= 0.02 || p2 >= 0.98) return null;

    const odds1 = centToAmerican(p1);
    const odds2 = centToAmerican(p2);
    if (odds1 === 0 || odds2 === 0) return null;

    // Get team/outcome names
    const name1 = typeof outcomes[0] === 'string' ? outcomes[0] : (outcomes[0]?.name || outcomes[0]?.title || homeTeam || 'Home');
    const name2 = typeof outcomes[1] === 'string' ? outcomes[1] : (outcomes[1]?.name || outcomes[1]?.title || awayTeam || 'Away');

    // Determine market type from question or groupItemTitle
    const q = (market.question || market.groupItemTitle || gameTitle || '').toLowerCase();
    let marketType = 'h2h';
    if (q.includes('spread') || q.includes('handicap') || q.includes('+') || q.includes('-')) marketType = 'spreads';
    if (q.includes('total') || q.includes('over') || q.includes('under')) marketType = 'totals';

    const volume = parseFloat(market.volume) || 0;
    const liquidity = parseFloat(market.liquidity) || 0;

    // Skip very low liquidity
    if (liquidity < 50 && volume < 1000) return null;

    // Get clobTokenIds
    let tokenIds = market.clobTokenIds || [];
    if (typeof tokenIds === 'string') {
      try { tokenIds = JSON.parse(tokenIds); } catch(e) { tokenIds = []; }
    }

    return {
      id: market.conditionId || market.id || gameSlug,
      sport: league,
      sportLabel,
      event_title: gameTitle,
      question: market.question || gameTitle,
      home_team: name1,
      away_team: name2,
      commence_time: market.startDate || startDate || market.endDate || '',
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

// Get current Polymarket buildId
async function getBuildId() {
  try {
    const res = await fetch('https://polymarket.com/sports/live', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"buildId":"([^"]+)"/);
    if (match && match[1]) return match[1];
    const scriptMatch = html.match(/_next\/data\/([^/]+)\//);
    if (scriptMatch && scriptMatch[1]) return scriptMatch[1];
    return null;
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
