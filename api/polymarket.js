// /api/polymarket.js - Vercel serverless function
// Fetches SPORTS markets from Polymarket using sports tags
// Normalizes cent prices to American odds format

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  try {
    // Step 1: Get sports metadata to find sport tag IDs
    const sportsRes = await fetch('https://gamma-api.polymarket.com/sports', {
      headers: { 'User-Agent': 'PrimeEdgePicks/1.0' }
    });

    let sportTags = [];
    if (sportsRes.ok) {
      const sportsData = await sportsRes.json();
      if (Array.isArray(sportsData)) {
        sportTags = sportsData.map(s => ({
          id: s.id || s.tag_id,
          name: (s.label || s.name || s.sport || '').toLowerCase(),
          slug: s.slug || ''
        })).filter(s => s.id);
      }
    }

    // Step 2: Fetch sports events using sports-specific search
    // Use the Polymarket sports live endpoint data structure
    const marketsRes = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100&order=volume_24hr&ascending=false',
      { headers: { 'User-Agent': 'PrimeEdgePicks/1.0' } }
    );

    if (!marketsRes.ok) {
      return res.status(502).json({ error: 'Polymarket API error', status: marketsRes.status });
    }

    const events = await marketsRes.json();
    if (!Array.isArray(events)) {
      return res.status(502).json({ error: 'Invalid response' });
    }

    // Sport detection - STRICT matching to avoid political markets
    // Only match if event has sports-specific structure
    const sportPatterns = {
      'basketball_nba': {
        teams: ['lakers','celtics','warriors','knicks','heat','bucks','nuggets','suns','cavaliers','thunder','mavericks','timberwolves','pacers','magic','hawks','nets','clippers','grizzlies','pelicans','rockets','spurs','kings','76ers','sixers','raptors','bulls','pistons','hornets','wizards','blazers','jazz'],
        leagues: ['nba'],
        mustMatch: ['vs', 'win', 'beat', 'game', 'series', 'playoffs', 'finals', 'champion']
      },
      'baseball_mlb': {
        teams: ['yankees','dodgers','astros','braves','phillies','padres','mets','cubs','red sox','cardinals','brewers','guardians','orioles','rangers','twins','rays','mariners','diamondbacks','reds','pirates','royals','tigers','angels','athletics','rockies','marlins','nationals','white sox','giants'],
        leagues: ['mlb','baseball'],
        mustMatch: ['vs', 'win', 'beat', 'game', 'series', 'world series']
      },
      'icehockey_nhl': {
        teams: ['bruins','rangers','oilers','avalanche','panthers','hurricanes','jets','stars','wild','lightning','maple leafs','penguins','capitals','devils','islanders','flames','canucks','blues','predators','senators','red wings','kraken','ducks','sabres','flyers','blue jackets','blackhawks','canadiens','sharks','golden knights'],
        leagues: ['nhl','hockey','stanley cup'],
        mustMatch: ['vs', 'win', 'beat', 'game', 'series']
      },
      'mma_mixed_martial_arts': {
        teams: [],
        leagues: ['ufc','mma'],
        mustMatch: ['vs', 'win', 'beat', 'fight', 'bout']
      },
      'soccer_epl': {
        teams: ['arsenal','manchester city','manchester united','liverpool','chelsea','tottenham','newcastle','brighton','aston villa','west ham','crystal palace','fulham','wolves','bournemouth','brentford','everton','nottingham forest'],
        leagues: ['premier league','epl'],
        mustMatch: ['vs', 'win', 'beat', 'match']
      },
      'soccer_usa_mls': {
        teams: ['inter miami','la galaxy','lafc','seattle sounders','portland timbers','atlanta united','columbus crew','fc cincinnati','orlando city','nashville sc','sporting kc','austin fc'],
        leagues: ['mls'],
        mustMatch: ['vs', 'win', 'beat', 'match']
      }
    };

    const normalizedMarkets = [];

    events.forEach(event => {
      const title = (event.title || '').toLowerCase();
      const markets = event.markets || [];

      // STRICT sport detection
      let detectedSport = null;
      for (const [sportKey, patterns] of Object.entries(sportPatterns)) {
        // Must match a team name or league
        const hasTeam = patterns.teams.some(t => title.includes(t));
        const hasLeague = patterns.leagues.some(l => title.includes(l));

        if (!hasTeam && !hasLeague) continue;

        // Must also have a sports-action word to avoid "Will LeBron win the presidency"
        const hasAction = patterns.mustMatch.some(w => title.includes(w));
        if (!hasAction && !hasLeague) continue;

        // Extra filter: reject if contains political keywords
        const politicalWords = ['president', 'democrat', 'republican', 'nominee', 'election', 'congress', 'senate', 'governor', 'political', 'party', 'cabinet', 'secretary', 'minister'];
        if (politicalWords.some(pw => title.includes(pw))) continue;

        detectedSport = sportKey;
        break;
      }

      if (!detectedSport) return;

      markets.forEach(market => {
        if (!market.active || market.closed) return;

        const outcomes = market.outcomes || [];
        let outcomePrices;
        try {
          outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
        } catch(e) {
          outcomePrices = [];
        }

        let clobTokenIds;
        try {
          clobTokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
        } catch(e) {
          clobTokenIds = [];
        }

        if (outcomes.length < 2 || outcomePrices.length < 2) return;

        const yesPrice = parseFloat(outcomePrices[0]);
        const noPrice = parseFloat(outcomePrices[1]);

        if (isNaN(yesPrice) || isNaN(noPrice) || yesPrice <= 0.01 || yesPrice >= 0.99) return;

        const yesOdds = centToAmerican(yesPrice);
        const noOdds = centToAmerican(noPrice);

        if (yesOdds === 0 || noOdds === 0) return;

        const outcome1 = outcomes[0] || 'Yes';
        const outcome2 = outcomes[1] || 'No';
        const volume = parseFloat(market.volume) || 0;
        const liquidity = parseFloat(market.liquidity) || 0;

        // Skip very low liquidity markets
        if (liquidity < 100) return;

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
            { name: outcome1, price: yesOdds, cent_price: yesPrice, token_id: clobTokenIds[0] || null },
            { name: outcome2, price: noOdds, cent_price: noPrice, token_id: clobTokenIds[1] || null }
          ],
          volume: volume,
          liquidity: liquidity,
          volume_24hr: parseFloat(market.volume24hr) || 0,
          polymarket_url: 'https://polymarket.com/event/' + (event.slug || ''),
          market_slug: market.slug || ''
        });
      });
    });

    normalizedMarkets.sort((a, b) => b.volume - a.volume);

    return res.status(200).json({
      count: normalizedMarkets.length,
      source: 'polymarket',
      sport_tags_found: sportTags.length,
      markets: normalizedMarkets
    });

  } catch (error) {
    console.error('Polymarket API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

function centToAmerican(price) {
  if (price <= 0 || price >= 1) return 0;
  if (price >= 0.5) {
    return Math.round(-(price / (1 - price)) * 100);
  } else {
    return Math.round(((1 - price) / price) * 100);
  }
}
