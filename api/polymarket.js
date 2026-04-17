// /api/polymarket.js - Vercel serverless function v3
// Fetches game-level sports odds from Polymarket
// Uses their Next.js data endpoint with dynamic buildId discovery

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=30');

  const sport = req.query.sport || 'all';

  // Map our sport keys to Polymarket league slugs
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
    // Step 1: Get the current buildId from Polymarket's sports page
    const buildId = await getBuildId();
    if (!buildId) {
      return res.status(502).json({ error: 'Could not get Polymarket buildId' });
    }

    // Step 2: Determine which leagues to fetch
    let leagues = [];
    if (sport === 'all') {
      leagues = Object.values(leagueMap);
    } else if (leagueMap[sport]) {
      leagues = [leagueMap[sport]];
    } else {
      leagues = [sport];
    }

    // Step 3: Fetch games for each league
    const allMarkets = [];
    for (const league of leagues) {
      try {
        const gamesUrl = `https://polymarket.com/_next/data/${buildId}/en/sports/${league}/games.json?league=${league}`;
        const gamesRes = await fetch(gamesUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://polymarket.com/sports/live'
          }
        });

        if (!gamesRes.ok) continue;

        const gamesData = await gamesRes.json();

        // Navigate the Next.js pageProps structure
        const pageProps = gamesData?.pageProps;
        if (!pageProps) continue;

        // Games can be in different locations depending on the response structure
        const games = pageProps.games || pageProps.fixtures || pageProps.events || [];
        const dehydratedState = pageProps.dehydratedState;

        // Try to extract games from dehydrated queries
        let gamesList = [];
        if (Array.isArray(games) && games.length > 0) {
          gamesList = games;
        } else if (dehydratedState?.queries) {
          for (const query of dehydratedState.queries) {
            const data = query?.state?.data;
            if (Array.isArray(data) && data.length > 0) {
              // Check if this looks like game data
              const first = data[0];
              if (first.markets || first.outcomes || first.home || first.away || first.slug) {
                gamesList = data;
                break;
              }
            }
            // Sometimes data is nested in pages
            if (data?.pages) {
              for (const page of data.pages) {
                if (Array.isArray(page) && page.length > 0) {
                  gamesList = [...gamesList, ...page];
                }
              }
            }
          }
        }

        // Process each game
        gamesList.forEach(game => {
          try {
            const markets = game.markets || [];
            const homeTeam = game.homeTeam?.name || game.home?.name || game.homeTeam || '';
            const awayTeam = game.awayTeam?.name || game.away?.name || game.awayTeam || '';
            const startDate = game.startDate || game.startsAt || game.commence_time || '';
            const gameTitle = game.title || `${awayTeam} vs ${homeTeam}`;
            const gameSlug = game.slug || '';
            const volume = parseFloat(game.volume) || 0;

            // Process moneyline market
            if (markets.length > 0) {
              markets.forEach(market => {
                const outcomes = market.outcomes || [];
                const groupItemTitle = (market.groupItemTitle || market.marketType || '').toLowerCase();

                // Determine market type
                let marketType = 'h2h';
                if (groupItemTitle.includes('spread') || groupItemTitle.includes('handicap')) marketType = 'spreads';
                else if (groupItemTitle.includes('total') || groupItemTitle.includes('over') || groupItemTitle.includes('under')) marketType = 'totals';

                if (outcomes.length < 2) return;

                const processedOutcomes = outcomes.map(o => {
                  const price = parseFloat(o.price || o.lastTradePrice || 0);
                  if (price <= 0.01 || price >= 0.99) return null;
                  return {
                    name: o.title || o.name || o.outcome || '',
                    price: centToAmerican(price),
                    cent_price: price,
                    token_id: o.clobTokenId || o.tokenId || null
                  };
                }).filter(Boolean);

                if (processedOutcomes.length < 2) return;

                const liquidity = parseFloat(market.liquidity) || 0;

                allMarkets.push({
                  id: market.id || game.id,
                  sport: league,
                  sportLabel: sportLabels[league] || league.toUpperCase(),
                  event_title: gameTitle,
                  question: market.question || gameTitle,
                  home_team: processedOutcomes[0]?.name || homeTeam,
                  away_team: processedOutcomes[1]?.name || awayTeam,
                  commence_time: startDate,
                  bookmaker: 'Polymarket',
                  market_type: marketType,
                  outcomes: processedOutcomes,
                  volume: volume,
                  liquidity: liquidity,
                  polymarket_url: `https://polymarket.com/sports/${league}/${gameSlug}`,
                  game_slug: gameSlug
                });
              });
            }

            // If no structured markets, try to build from game-level prices
            if (markets.length === 0 && (game.outcomePrices || game.outcomes)) {
              const outcomes = game.outcomes || [];
              let prices;
              try {
                prices = typeof game.outcomePrices === 'string' ?
                  JSON.parse(game.outcomePrices) : (game.outcomePrices || []);
              } catch(e) { prices = []; }

              if (outcomes.length >= 2 && prices.length >= 2) {
                const p1 = parseFloat(prices[0]);
                const p2 = parseFloat(prices[1]);
                if (p1 > 0.01 && p1 < 0.99 && p2 > 0.01 && p2 < 0.99) {
                  allMarkets.push({
                    id: game.id,
                    sport: league,
                    sportLabel: sportLabels[league] || league.toUpperCase(),
                    event_title: gameTitle,
                    question: gameTitle,
                    home_team: outcomes[0] || homeTeam,
                    away_team: outcomes[1] || awayTeam,
                    commence_time: startDate,
                    bookmaker: 'Polymarket',
                    market_type: 'h2h',
                    outcomes: [
                      { name: outcomes[0] || homeTeam, price: centToAmerican(p1), cent_price: p1 },
                      { name: outcomes[1] || awayTeam, price: centToAmerican(p2), cent_price: p2 }
                    ],
                    volume: volume,
                    liquidity: parseFloat(game.liquidity) || 0,
                    polymarket_url: `https://polymarket.com/sports/${league}/${gameSlug}`,
                    game_slug: gameSlug
                  });
                }
              }
            }
          } catch(e) { /* skip bad game data */ }
        });
      } catch(e) {
        console.error(`Error fetching ${league}:`, e.message);
      }
    }

    // Sort by commence_time (soonest first)
    allMarkets.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));

    return res.status(200).json({
      count: allMarkets.length,
      source: 'polymarket',
      buildId: buildId,
      leagues: leagues,
      markets: allMarkets
    });

  } catch (error) {
    console.error('Polymarket API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Get current Polymarket buildId by scraping the sports page
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

    // Extract buildId from Next.js page — it's in the __NEXT_DATA__ script
    const match = html.match(/"buildId":"([^"]+)"/);
    if (match && match[1]) return match[1];

    // Alternative: look in script src paths
    const scriptMatch = html.match(/_next\/data\/([^/]+)\//);
    if (scriptMatch && scriptMatch[1]) return scriptMatch[1];

    // Another alternative: look in __next/static path
    const staticMatch = html.match(/_next\/static\/([^/]+)\/_/);
    if (staticMatch && staticMatch[1]) return staticMatch[1];

    return null;
  } catch(e) {
    console.error('getBuildId error:', e.message);
    return null;
  }
}

// Convert Polymarket cent price (0.00-1.00) to American odds
function centToAmerican(price) {
  if (price <= 0 || price >= 1) return 0;
  if (price >= 0.5) {
    return Math.round(-(price / (1 - price)) * 100);
  } else {
    return Math.round(((1 - price) / price) * 100);
  }
}
