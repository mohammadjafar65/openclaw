const axios = require('axios');

// Places API (New) — works on all new Google Cloud projects
const PLACES_NEW_BASE = 'https://places.googleapis.com/v1/places';

async function searchGoogleMaps(options) {
  return await searchGoogleMapsLive(options, () => {});
}

async function searchGoogleMapsLive(options, onEvent) {
  const {
    niche, microNiche, region, radiusKm = 25,
    apiKey = process.env.GOOGLE_PLACES_API_KEY,
  } = options;

  const searchQuery = microNiche
    ? `${microNiche} ${niche} in ${region}`
    : `${niche} in ${region}`;

  if (apiKey && apiKey !== 'your_google_places_api_key') {
    return await searchViaNewPlacesAPI(searchQuery, region, radiusKm, apiKey, onEvent);
  } else if (process.env.SERPAPI_KEY) {
    return await searchViaSerpApi(searchQuery, region, onEvent);
  } else {
    throw new Error('No API key configured. Add GOOGLE_PLACES_API_KEY to .env');
  }
}

async function searchViaNewPlacesAPI(queryStr, region, radiusKm, apiKey, onEvent) {
  const results = [];
  let pageToken = null;
  let page = 0;

  const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.rating',
    'places.userRatingCount',
    'places.types',
    'places.businessStatus',
    'places.googleMapsUri',
    'places.addressComponents',
    'places.reviews',
    'nextPageToken',
  ].join(',');

  onEvent('status', { message: `Searching Google Maps for "${queryStr}"...`, phase: 'searching' });

  do {
    page++;
    const body = { textQuery: queryStr, maxResultCount: 20, languageCode: 'en' };
    if (pageToken) {
      body.pageToken = pageToken;
      onEvent('status', { message: `Loading page ${page}...`, phase: 'searching' });
      await sleep(2000);
    }

    let data;
    try {
      const res = await axios.post(`${PLACES_NEW_BASE}:searchText`, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        timeout: 20000,
      });
      data = res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      throw new Error(`Google API denied: ${msg}`);
    }

    const places = data.places || [];
    if (places.length === 0 && page === 1) {
      onEvent('status', { message: 'No results found for this search.', phase: 'done' });
      break;
    }

    onEvent('status', { message: `Found ${places.length} businesses on page ${page}`, phase: 'fetching' });

    for (const place of places) {
      const normalized = normalizePlaceNew(place);
      results.push(normalized);
      onEvent('discovered', { lead: normalized });
      await sleep(100);
    }

    pageToken = data.nextPageToken || null;
    if (results.length >= 60) break;

  } while (pageToken);

  return results;
}

function normalizePlaceNew(place) {
  const ac = place.addressComponents || [];
  const gc = (type) => {
    const c = ac.find(c => c.types && c.types.includes(type));
    return c ? (c.longText || c.shortText) : null;
  };

  const reviews = (place.reviews || []).slice(0, 5).map(r => ({
    author: r.authorAttribution?.displayName || 'Anonymous',
    rating: r.rating,
    text:   r.text?.text?.slice(0, 400) || '',
    time:   r.relativePublishTimeDescription || '',
  }));

  const skipTypes = ['point_of_interest', 'establishment', 'food', 'store'];
  const types = (place.types || []).filter(t => !skipTypes.includes(t));

  return {
    place_id:       place.id,
    business_name:  place.displayName?.text || 'Unknown',
    category:       types.slice(0, 2).join(', '),
    address:        place.formattedAddress || null,
    city:           gc('locality') || gc('sublocality') || gc('postal_town'),
    state:          gc('administrative_area_level_1'),
    country:        gc('country'),
    phone:          place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    rating:         place.rating ? parseFloat(place.rating) : null,
    review_count:   place.userRatingCount ? parseInt(place.userRatingCount) : 0,
    maps_website:   place.websiteUri || null,
    source_reviews: reviews,
    raw_data: {
      url:             place.googleMapsUri,
      business_status: place.businessStatus,
      types:           place.types,
    },
  };
}

async function searchViaSerpApi(queryStr, region, onEvent) {
  onEvent('status', { message: `Searching via SerpApi: "${queryStr}"`, phase: 'searching' });
  const res = await axios.get('https://serpapi.com/search', {
    params: { engine: 'google_maps', q: `${queryStr} ${region}`, api_key: process.env.SERPAPI_KEY, type: 'search' },
    timeout: 15000,
  });
  const raw = res.data.local_results || [];
  const results = raw.map(p => ({
    place_id: p.place_id || p.data_id, business_name: p.title,
    address: p.address, phone: p.phone,
    rating: parseFloat(p.rating) || null, review_count: parseInt(p.reviews) || 0,
    maps_website: p.website || null, category: p.type,
    city: null, state: null, country: null, source_reviews: [], raw_data: p,
  }));
  for (const lead of results) { onEvent('discovered', { lead }); await sleep(80); }
  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { searchGoogleMaps, searchGoogleMapsLive };
