const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const CACHE_MS = 2 * 60 * 1000;
const MOVE_THRESHOLD_METERS = 200;

const radians = (degrees) => (degrees * Math.PI) / 180;

const distanceMeters = (from, to) => {
  const earthRadius = 6_371_000;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
};

const parseDurationMinutes = (duration) => Math.max(1, Math.ceil(Number.parseFloat(duration) / 60));

const fallbackEstimate = (origin, destination) => {
  const distance = Math.round(distanceMeters(origin, destination));
  const speedKph = Number(process.env.TRAVEL_FALLBACK_SPEED_KPH) || 20;
  return {
    durationMinutes: Math.max(1, Math.ceil((distance / 1000 / speedKph) * 60)),
    distanceMeters: distance,
    source: 'estimated',
    travelMode: 'DRIVE',
    updatedAt: new Date(),
    originLat: origin.lat,
    originLng: origin.lng,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
  };
};

const googleEstimate = async (origin, destination) => {
  const travelMode = process.env.ROUTES_TRAVEL_MODE || 'DRIVE';
  const response = await fetch(ROUTES_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(8_000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode,
      ...(['DRIVE', 'TWO_WHEELER'].includes(travelMode) ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      units: 'METRIC',
    }),
  });

  if (!response.ok) throw new Error(`Google Routes returned ${response.status}`);
  const payload = await response.json();
  const route = payload.routes?.[0];
  if (!route?.duration) throw new Error('Google Routes returned no route');
  return {
    durationMinutes: parseDurationMinutes(route.duration),
    distanceMeters: route.distanceMeters,
    source: 'google-routes',
    travelMode,
    updatedAt: new Date(),
    originLat: origin.lat,
    originLng: origin.lng,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
  };
};

export const refreshTravelEstimate = async (ticket, provider) => {
  const origin = ticket.consumerLocation;
  const destination = provider?.location;
  if (!Number.isFinite(origin?.lat) || !Number.isFinite(origin?.lng) || !Number.isFinite(destination?.lat) || !Number.isFinite(destination?.lng)) {
    return null;
  }

  const cached = ticket.travelEstimate;
  const cacheAge = cached?.updatedAt ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
  const moved = cached?.originLat === undefined ? Infinity : distanceMeters(origin, { lat: cached.originLat, lng: cached.originLng });
  const destinationMoved = cached?.destinationLat === undefined
    ? Infinity
    : distanceMeters(destination, { lat: cached.destinationLat, lng: cached.destinationLng });
  if (cacheAge < CACHE_MS && moved < MOVE_THRESHOLD_METERS && destinationMoved < 25) return cached;

  let estimate;
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      estimate = await googleEstimate(origin, destination);
    } catch (error) {
      console.error('Live route calculation failed, using fallback:', error.message);
      estimate = fallbackEstimate(origin, destination);
    }
  } else {
    estimate = fallbackEstimate(origin, destination);
  }
  ticket.travelEstimate = estimate;
  await ticket.save();
  return ticket.travelEstimate;
};

export const buildLeaveByEstimate = (travelEstimate, queueEstimate, ticketStatus) => {
  if (!travelEstimate) return null;
  const bufferMinutes = Number(process.env.ARRIVAL_BUFFER_MINUTES) || 5;
  const leaveInMinutes = Math.max(0, queueEstimate.min - travelEstimate.durationMinutes - bufferMinutes);
  const leaveNow = ['called', 'serving'].includes(ticketStatus) || leaveInMinutes === 0;
  return {
    durationMinutes: travelEstimate.durationMinutes,
    distanceMeters: travelEstimate.distanceMeters,
    source: travelEstimate.source,
    travelMode: travelEstimate.travelMode,
    routeUpdatedAt: travelEstimate.updatedAt,
    bufferMinutes,
    leaveNow,
    leaveBy: leaveNow ? new Date().toISOString() : new Date(Date.now() + leaveInMinutes * 60_000).toISOString(),
    warning: ['WALK', 'BICYCLE', 'TWO_WHEELER'].includes(travelEstimate.travelMode)
      ? 'Route conditions may be incomplete. Follow local signs and traffic rules.'
      : undefined,
  };
};
