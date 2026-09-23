/**
 * Comprehensive Geographic Distance & Bus Corridor Routing Engine
 * Provides instant highway distance calculations, route name suggestions,
 * driving durations, and corridor metadata for Indian & global transit routes.
 */

export interface DistanceResult {
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  suggestedRouteName: string;
  viaHighway?: string;
  isExactCorridorMatch: boolean;
  originFormatted: string;
  destinationFormatted: string;
}

// Known major transit hubs and their approximate geo coordinates (Latitude, Longitude)
export const KNOWN_CITIES: Record<string, { lat: number; lng: number; state: string; name: string }> = {
  // Karnataka
  'bengaluru': { lat: 12.9716, lng: 77.5946, state: 'Karnataka', name: 'Bengaluru' },
  'bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka', name: 'Bengaluru' },
  'mysuru': { lat: 12.2958, lng: 76.6394, state: 'Karnataka', name: 'Mysuru' },
  'mysore': { lat: 12.2958, lng: 76.6394, state: 'Karnataka', name: 'Mysuru' },
  'hubballi': { lat: 15.3647, lng: 75.1240, state: 'Karnataka', name: 'Hubballi' },
  'hubli': { lat: 15.3647, lng: 75.1240, state: 'Karnataka', name: 'Hubballi' },
  'dharwad': { lat: 15.4589, lng: 75.0078, state: 'Karnataka', name: 'Dharwad' },
  'mangaluru': { lat: 12.9141, lng: 74.8560, state: 'Karnataka', name: 'Mangaluru' },
  'mangalore': { lat: 12.9141, lng: 74.8560, state: 'Karnataka', name: 'Mangaluru' },
  'belagavi': { lat: 15.8497, lng: 74.4977, state: 'Karnataka', name: 'Belagavi' },
  'belgaum': { lat: 15.8497, lng: 74.4977, state: 'Karnataka', name: 'Belagavi' },
  'kalaburagi': { lat: 17.3297, lng: 76.8343, state: 'Karnataka', name: 'Kalaburagi' },
  'gulbarga': { lat: 17.3297, lng: 76.8343, state: 'Karnataka', name: 'Kalaburagi' },
  'davangere': { lat: 14.4644, lng: 75.9218, state: 'Karnataka', name: 'Davangere' },
  'shivamogga': { lat: 13.9299, lng: 75.5681, state: 'Karnataka', name: 'Shivamogga' },
  'shimoga': { lat: 13.9299, lng: 75.5681, state: 'Karnataka', name: 'Shivamogga' },
  'tumakuru': { lat: 13.3409, lng: 77.1010, state: 'Karnataka', name: 'Tumakuru' },
  'tumkur': { lat: 13.3409, lng: 77.1010, state: 'Karnataka', name: 'Tumakuru' },
  'ballari': { lat: 15.1394, lng: 76.9214, state: 'Karnataka', name: 'Ballari' },
  'bellary': { lat: 15.1394, lng: 76.9214, state: 'Karnataka', name: 'Ballari' },
  'udupi': { lat: 13.3409, lng: 74.7421, state: 'Karnataka', name: 'Udupi' },
  'hassan': { lat: 13.0072, lng: 76.0963, state: 'Karnataka', name: 'Hassan' },
  'chikkamagaluru': { lat: 13.3153, lng: 75.7754, state: 'Karnataka', name: 'Chikkamagaluru' },
  'vijayapura': { lat: 16.8302, lng: 75.7100, state: 'Karnataka', name: 'Vijayapura' },
  'bijapur': { lat: 16.8302, lng: 75.7100, state: 'Karnataka', name: 'Vijayapura' },
  'bidar': { lat: 17.9104, lng: 77.5199, state: 'Karnataka', name: 'Bidar' },
  'hosapete': { lat: 15.2704, lng: 76.3917, state: 'Karnataka', name: 'Hosapete' },
  'hampi': { lat: 15.3350, lng: 76.4600, state: 'Karnataka', name: 'Hampi' },
  'madikeri': { lat: 12.4244, lng: 75.7382, state: 'Karnataka', name: 'Madikeri (Coorg)' },
  'coorg': { lat: 12.4244, lng: 75.7382, state: 'Karnataka', name: 'Coorg' },

  // Tamil Nadu
  'chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', name: 'Chennai' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu', name: 'Coimbatore' },
  'madurai': { lat: 9.9252, lng: 78.1198, state: 'Tamil Nadu', name: 'Madurai' },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047, state: 'Tamil Nadu', name: 'Tiruchirappalli (Trichy)' },
  'trichy': { lat: 10.7905, lng: 78.7047, state: 'Tamil Nadu', name: 'Tiruchirappalli' },
  'salem': { lat: 11.6643, lng: 78.1460, state: 'Tamil Nadu', name: 'Salem' },
  'tirunelveli': { lat: 8.7139, lng: 77.7567, state: 'Tamil Nadu', name: 'Tirunelveli' },
  'erode': { lat: 11.3410, lng: 77.7172, state: 'Tamil Nadu', name: 'Erode' },
  'vellore': { lat: 12.9165, lng: 79.1325, state: 'Tamil Nadu', name: 'Vellore' },
  'hosur': { lat: 12.7409, lng: 77.8253, state: 'Tamil Nadu', name: 'Hosur' },
  'kanyakumari': { lat: 8.0883, lng: 77.5385, state: 'Tamil Nadu', name: 'Kanyakumari' },
  'pondicherry': { lat: 11.9416, lng: 79.8083, state: 'Puducherry', name: 'Puducherry' },
  'puducherry': { lat: 11.9416, lng: 79.8083, state: 'Puducherry', name: 'Puducherry' },

  // Telangana & Andhra Pradesh
  'hyderabad': { lat: 17.3850, lng: 78.4867, state: 'Telangana', name: 'Hyderabad' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, state: 'Telangana', name: 'Secunderabad' },
  'warangal': { lat: 17.9689, lng: 79.5941, state: 'Telangana', name: 'Warangal' },
  'karimnagar': { lat: 18.4386, lng: 79.1288, state: 'Telangana', name: 'Karimnagar' },
  'nizamabad': { lat: 18.6725, lng: 78.0941, state: 'Telangana', name: 'Nizamabad' },
  'khammam': { lat: 17.2473, lng: 80.1514, state: 'Telangana', name: 'Khammam' },
  'vijayawada': { lat: 16.5062, lng: 80.6480, state: 'Andhra Pradesh', name: 'Vijayawada' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh', name: 'Visakhapatnam (Vizag)' },
  'vizag': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh', name: 'Visakhapatnam' },
  'guntur': { lat: 16.3067, lng: 80.4365, state: 'Andhra Pradesh', name: 'Guntur' },
  'nellore': { lat: 14.4426, lng: 79.9865, state: 'Andhra Pradesh', name: 'Nellore' },
  'kurnool': { lat: 15.8281, lng: 78.0373, state: 'Andhra Pradesh', name: 'Kurnool' },
  'tirupati': { lat: 13.6288, lng: 79.4192, state: 'Andhra Pradesh', name: 'Tirupati' },
  'kadapa': { lat: 14.4673, lng: 78.8242, state: 'Andhra Pradesh', name: 'Kadapa' },
  'anantapur': { lat: 14.6819, lng: 77.6006, state: 'Andhra Pradesh', name: 'Anantapur' },
  'rajahmundry': { lat: 17.0005, lng: 81.8040, state: 'Andhra Pradesh', name: 'Rajahmundry' },
  'kakinada': { lat: 16.9891, lng: 82.2475, state: 'Andhra Pradesh', name: 'Kakinada' },

  // Maharashtra & Goa
  'mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra', name: 'Mumbai' },
  'pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra', name: 'Pune' },
  'nagpur': { lat: 21.1458, lng: 79.0882, state: 'Maharashtra', name: 'Nagpur' },
  'nashik': { lat: 19.9975, lng: 73.7898, state: 'Maharashtra', name: 'Nashik' },
  'aurangabad': { lat: 19.8762, lng: 75.3433, state: 'Maharashtra', name: 'Chhatrapati Sambhajinagar' },
  'chhatrapati sambhajinagar': { lat: 19.8762, lng: 75.3433, state: 'Maharashtra', name: 'Chhatrapati Sambhajinagar' },
  'solapur': { lat: 17.6599, lng: 75.9064, state: 'Maharashtra', name: 'Solapur' },
  'kolhapur': { lat: 16.7050, lng: 74.2433, state: 'Maharashtra', name: 'Kolhapur' },
  'thane': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra', name: 'Thane' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, state: 'Maharashtra', name: 'Navi Mumbai' },
  'goa': { lat: 15.4909, lng: 73.8278, state: 'Goa', name: 'Panaji (Goa)' },
  'panaji': { lat: 15.4909, lng: 73.8278, state: 'Goa', name: 'Panaji' },
  'margao': { lat: 15.2832, lng: 73.9862, state: 'Goa', name: 'Margao' },

  // Kerala
  'kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala', name: 'Kochi' },
  'cochin': { lat: 9.9312, lng: 76.2673, state: 'Kerala', name: 'Kochi' },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, state: 'Kerala', name: 'Thiruvananthapuram (Trivandrum)' },
  'trivandrum': { lat: 8.5241, lng: 76.9366, state: 'Kerala', name: 'Thiruvananthapuram' },
  'kozhikode': { lat: 11.2588, lng: 75.7804, state: 'Kerala', name: 'Kozhikode (Calicut)' },
  'calicut': { lat: 11.2588, lng: 75.7804, state: 'Kerala', name: 'Kozhikode' },
  'thrissur': { lat: 10.5276, lng: 76.2144, state: 'Kerala', name: 'Thrissur' },
  'kollam': { lat: 8.8932, lng: 76.6141, state: 'Kerala', name: 'Kollam' },
  'kannur': { lat: 11.8745, lng: 75.3704, state: 'Kerala', name: 'Kannur' },
  'palakkad': { lat: 10.7867, lng: 76.6548, state: 'Kerala', name: 'Palakkad' },
  'alappuzha': { lat: 9.4981, lng: 76.3388, state: 'Kerala', name: 'Alappuzha (Alleppey)' },

  // North & Central India
  'delhi': { lat: 28.7041, lng: 77.1025, state: 'Delhi', name: 'New Delhi' },
  'new delhi': { lat: 28.7041, lng: 77.1025, state: 'Delhi', name: 'New Delhi' },
  'noida': { lat: 28.5355, lng: 77.3910, state: 'Uttar Pradesh', name: 'Noida' },
  'gurugram': { lat: 28.4595, lng: 77.0266, state: 'Haryana', name: 'Gurugram' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, state: 'Haryana', name: 'Gurugram' },
  'jaipur': { lat: 26.9124, lng: 75.7873, state: 'Rajasthan', name: 'Jaipur' },
  'agra': { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh', name: 'Agra' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, state: 'Punjab', name: 'Chandigarh' },
  'lucknow': { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh', name: 'Lucknow' },
  'kanpur': { lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh', name: 'Kanpur' },
  'varanasi': { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh', name: 'Varanasi' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, state: 'Gujarat', name: 'Ahmedabad' },
  'surat': { lat: 21.1702, lng: 72.8311, state: 'Gujarat', name: 'Surat' },
  'vadodara': { lat: 22.3072, lng: 73.1812, state: 'Gujarat', name: 'Vadodara' },
  'indore': { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh', name: 'Indore' },
  'bhopal': { lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh', name: 'Bhopal' },
  'kolkata': { lat: 22.5726, lng: 88.3639, state: 'West Bengal', name: 'Kolkata' },
  'patna': { lat: 25.5941, lng: 85.1376, state: 'Bihar', name: 'Patna' },
  'ranchi': { lat: 23.3441, lng: 85.3096, state: 'Jharkhand', name: 'Ranchi' },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245, state: 'Odisha', name: 'Bhubaneswar' },
  'guwahati': { lat: 26.1445, lng: 91.7362, state: 'Assam', name: 'Guwahati' },
};

// Common intercity highway routes with exact bus highway kilometers and corridor names
export const KNOWN_CORRIDORS: Record<string, { km: number; highway: string; minutes: number }> = {
  // Karnataka & Inter-state
  'bengaluru:mysuru': { km: 144, highway: 'NH-275 (Bengaluru-Mysuru Expressway)', minutes: 135 },
  'bengaluru:hubballi': { km: 412, highway: 'NH-48 (Pune-Bengaluru Highway)', minutes: 390 },
  'bengaluru:mangaluru': { km: 352, highway: 'NH-75 (Shiradi Ghat Corridor)', minutes: 420 },
  'bengaluru:belagavi': { km: 504, highway: 'NH-48', minutes: 480 },
  'bengaluru:shivamogga': { km: 302, highway: 'NH-69', minutes: 330 },
  'bengaluru:davangere': { km: 262, highway: 'NH-48', minutes: 260 },
  'bengaluru:tumakuru': { km: 70, highway: 'NH-48', minutes: 75 },
  'bengaluru:hassan': { km: 183, highway: 'NH-75', minutes: 195 },
  'bengaluru:chikkamagaluru': { km: 242, highway: 'NH-75 & SH-57', minutes: 270 },
  'bengaluru:madikeri': { km: 252, highway: 'NH-275', minutes: 330 },
  'bengaluru:ballari': { km: 312, highway: 'NH-44 & NH-67', minutes: 340 },
  'bengaluru:udupi': { km: 402, highway: 'NH-75 & NH-66', minutes: 460 },
  'bengaluru:hosur': { km: 40, highway: 'NH-44', minutes: 60 },

  // Bengaluru to Other Metros
  'bengaluru:chennai': { km: 346, highway: 'NH-48 / NE-7 Corridor', minutes: 360 },
  'bengaluru:hyderabad': { km: 569, highway: 'NH-44 (North-South Corridor)', minutes: 540 },
  'bengaluru:pune': { km: 840, highway: 'NH-48 (Golden Quadrilateral)', minutes: 800 },
  'bengaluru:mumbai': { km: 984, highway: 'NH-48', minutes: 960 },
  'bengaluru:coimbatore': { km: 364, highway: 'NH-44 & NH-544', minutes: 390 },
  'bengaluru:salem': { km: 204, highway: 'NH-44', minutes: 210 },
  'bengaluru:madurai': { km: 436, highway: 'NH-44', minutes: 420 },
  'bengaluru:tirupati': { km: 250, highway: 'NH-75 & NH-69', minutes: 270 },
  'bengaluru:goa': { km: 560, highway: 'NH-48 & NH-67 / NH-748', minutes: 600 },
  'bengaluru:panaji': { km: 560, highway: 'NH-48 & NH-748', minutes: 600 },
  'bengaluru:kochi': { km: 535, highway: 'NH-544', minutes: 570 },
  'bengaluru:kozhikode': { km: 358, highway: 'NH-766 (via Gundlupet & Wayanad)', minutes: 450 },

  // Chennai Corridors
  'chennai:coimbatore': { km: 506, highway: 'NH-48 & NH-544', minutes: 510 },
  'chennai:madurai': { km: 462, highway: 'NH-38 & NH-45', minutes: 450 },
  'chennai:trichy': { km: 332, highway: 'NH-45 (Grand Southern Trunk Rd)', minutes: 330 },
  'chennai:salem': { km: 342, highway: 'NH-48 & NH-179A', minutes: 360 },
  'chennai:pondicherry': { km: 152, highway: 'East Coast Road (ECR / NH-332)', minutes: 180 },
  'chennai:puducherry': { km: 152, highway: 'East Coast Road (ECR / NH-332)', minutes: 180 },
  'chennai:tirupati': { km: 138, highway: 'NH-716', minutes: 195 },
  'chennai:vellore': { km: 138, highway: 'NH-48', minutes: 160 },
  'chennai:hyderabad': { km: 628, highway: 'NH-16 & NH-65', minutes: 660 },
  'chennai:vijayawada': { km: 452, highway: 'NH-16', minutes: 460 },

  // Hyderabad Corridors
  'hyderabad:vijayawada': { km: 274, highway: 'NH-65', minutes: 270 },
  'hyderabad:visakhapatnam': { km: 622, highway: 'NH-16 / NH-65', minutes: 660 },
  'hyderabad:warangal': { km: 148, highway: 'NH-163', minutes: 160 },
  'hyderabad:kurnool': { km: 214, highway: 'NH-44', minutes: 210 },
  'hyderabad:tirupati': { km: 554, highway: 'NH-44 & NH-40', minutes: 540 },
  'hyderabad:mumbai': { km: 710, highway: 'NH-65 & Mumbai Expressway', minutes: 720 },
  'hyderabad:pune': { km: 560, highway: 'NH-65', minutes: 570 },
  'hyderabad:nagpur': { km: 498, highway: 'NH-44', minutes: 480 },

  // Maharashtra Corridors
  'mumbai:pune': { km: 148, highway: 'Mumbai-Pune Expressway', minutes: 150 },
  'mumbai:nashik': { km: 166, highway: 'NH-160 (Mumbai-Agra Hwy)', minutes: 190 },
  'mumbai:goa': { km: 585, highway: 'NH-66 / Mumbai-Goa Highway', minutes: 660 },
  'mumbai:kolhapur': { km: 376, highway: 'NH-48', minutes: 390 },
  'pune:kolhapur': { km: 234, highway: 'NH-48', minutes: 240 },
  'pune:solapur': { km: 254, highway: 'NH-65', minutes: 270 },
  'pune:goa': { km: 442, highway: 'NH-48 & Chorla Ghat', minutes: 480 },

  // North India Corridors
  'delhi:jaipur': { km: 280, highway: 'NH-48 & Delhi-Mumbai Expressway (NE-4)', minutes: 240 },
  'delhi:agra': { km: 210, highway: 'Yamuna Expressway', minutes: 180 },
  'delhi:chandigarh': { km: 244, highway: 'NH-44', minutes: 240 },
  'delhi:lucknow': { km: 550, highway: 'Agra-Lucknow Expressway', minutes: 450 },
  'delhi:noida': { km: 28, highway: 'DND Flyway', minutes: 45 },
  'delhi:gurugram': { km: 32, highway: 'NH-48 (Delhi-Gurgaon Expressway)', minutes: 50 },
  'jaipur:agra': { km: 240, highway: 'NH-21', minutes: 240 },
};

/**
 * Standard Haversine distance in KM between two geographic coordinates
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Clean and normalize a terminal or city name into matching keys
 */
export function normalizePlaceName(place: string): string {
  if (!place) return '';
  return place
    .toLowerCase()
    .replace(/bus stand|bus stop|terminal|kstrc|ksrtc|bmrc|suburban|central|isbt|majestic|cmbt|depot|station|junction/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)[0] || '';
}

/**
 * Format driving minutes into "Xh Ym" string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculate driving distance between two entered places
 */
export function calculatePlaceDistance(
  originRaw: string,
  destinationRaw: string
): DistanceResult {
  const originClean = originRaw.trim();
  const destClean = destinationRaw.trim();

  if (!originClean || !destClean) {
    return {
      distanceKm: 100,
      durationText: '2h 00m',
      durationMinutes: 120,
      suggestedRouteName: 'Intercity Bus Corridor',
      isExactCorridorMatch: false,
      originFormatted: originClean || 'Origin Terminal',
      destinationFormatted: destClean || 'Destination Terminal'
    };
  }

  const key1 = normalizePlaceName(originClean);
  const key2 = normalizePlaceName(destClean);

  // 1. Check known corridor database (both directions)
  const forwardPair = `${key1}:${key2}`;
  const reversePair = `${key2}:${key1}`;

  if (KNOWN_CORRIDORS[forwardPair]) {
    const info = KNOWN_CORRIDORS[forwardPair];
    return {
      distanceKm: info.km,
      durationText: formatDuration(info.minutes),
      durationMinutes: info.minutes,
      suggestedRouteName: `${KNOWN_CITIES[key1]?.name || originClean} → ${KNOWN_CITIES[key2]?.name || destClean} Express`,
      viaHighway: info.highway,
      isExactCorridorMatch: true,
      originFormatted: KNOWN_CITIES[key1]?.name || originClean,
      destinationFormatted: KNOWN_CITIES[key2]?.name || destClean
    };
  }

  if (KNOWN_CORRIDORS[reversePair]) {
    const info = KNOWN_CORRIDORS[reversePair];
    return {
      distanceKm: info.km,
      durationText: formatDuration(info.minutes),
      durationMinutes: info.minutes,
      suggestedRouteName: `${KNOWN_CITIES[key1]?.name || originClean} → ${KNOWN_CITIES[key2]?.name || destClean} Express`,
      viaHighway: info.highway,
      isExactCorridorMatch: true,
      originFormatted: KNOWN_CITIES[key1]?.name || originClean,
      destinationFormatted: KNOWN_CITIES[key2]?.name || destClean
    };
  }

  // 2. Check known city coordinates
  const city1 = KNOWN_CITIES[key1];
  const city2 = KNOWN_CITIES[key2];

  if (city1 && city2) {
    const airKm = haversineDistance(city1.lat, city1.lng, city2.lat, city2.lng);
    // Indian highway road tortuosity factor: ~1.28x of straight-line geodesic
    const roadKm = Math.max(15, Math.round(airKm * 1.28));
    // Typical bus average operating speed with stops: ~52 km/h
    const estimatedMinutes = Math.max(25, Math.round((roadKm / 52) * 60));

    return {
      distanceKm: roadKm,
      durationText: formatDuration(estimatedMinutes),
      durationMinutes: estimatedMinutes,
      suggestedRouteName: `${city1.name} → ${city2.name} Intercity Route`,
      viaHighway: `Direct Highway Corridor (${city1.state} to ${city2.state})`,
      isExactCorridorMatch: false,
      originFormatted: city1.name,
      destinationFormatted: city2.name
    };
  }

  // 3. Fallback: If place names are custom (e.g. airport, depot, district), estimate sensible default
  const defaultKm = 120;
  return {
    distanceKm: defaultKm,
    durationText: '2h 15m',
    durationMinutes: 135,
    suggestedRouteName: `${originClean} → ${destClean} Line`,
    isExactCorridorMatch: false,
    originFormatted: originClean,
    destinationFormatted: destClean
  };
}
