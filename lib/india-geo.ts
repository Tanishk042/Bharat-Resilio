/**
 * Lightweight India geolocation + map projection helpers.
 * No external tiles or APIs — everything is computed locally so the
 * live disaster map works even in fully offline/satellite scenarios.
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface IndiaStateInfo {
  name: string
  centroid: LatLng
}

/**
 * Approximate centroids for major states/UTs (used to label the map).
 */
export const INDIA_STATES: IndiaStateInfo[] = [
  { name: "J&K", centroid: { lat: 34.2, lng: 76.0 } },
  { name: "Himachal", centroid: { lat: 31.8, lng: 77.1 } },
  { name: "Punjab", centroid: { lat: 30.9, lng: 75.3 } },
  { name: "Haryana", centroid: { lat: 29.1, lng: 76.1 } },
  { name: "Uttarakhand", centroid: { lat: 30.0, lng: 79.0 } },
  { name: "Delhi", centroid: { lat: 28.7, lng: 77.1 } },
  { name: "Rajasthan", centroid: { lat: 26.6, lng: 73.8 } },
  { name: "UP", centroid: { lat: 27.2, lng: 80.5 } },
  { name: "Gujarat", centroid: { lat: 22.7, lng: 71.6 } },
  { name: "MP", centroid: { lat: 23.4, lng: 78.7 } },
  { name: "Bihar", centroid: { lat: 25.6, lng: 85.5 } },
  { name: "Jharkhand", centroid: { lat: 23.7, lng: 85.3 } },
  { name: "WB", centroid: { lat: 23.3, lng: 87.8 } },
  { name: "Sikkim", centroid: { lat: 27.6, lng: 88.4 } },
  { name: "Assam", centroid: { lat: 26.3, lng: 92.8 } },
  { name: "Arunachal", centroid: { lat: 28.0, lng: 94.0 } },
  { name: "Nagaland", centroid: { lat: 25.6, lng: 94.3 } },
  { name: "Manipur", centroid: { lat: 24.8, lng: 93.9 } },
  { name: "Mizoram", centroid: { lat: 23.2, lng: 92.9 } },
  { name: "Tripura", centroid: { lat: 23.7, lng: 91.7 } },
  { name: "Meghalaya", centroid: { lat: 25.5, lng: 91.3 } },
  { name: "Odisha", centroid: { lat: 20.2, lng: 84.5 } },
  { name: "Chhattisgarh", centroid: { lat: 21.3, lng: 81.9 } },
  { name: "Maharashtra", centroid: { lat: 19.8, lng: 75.7 } },
  { name: "Telangana", centroid: { lat: 17.8, lng: 79.5 } },
  { name: "AP", centroid: { lat: 15.9, lng: 79.5 } },
  { name: "Goa", centroid: { lat: 15.3, lng: 74.1 } },
  { name: "Karnataka", centroid: { lat: 14.6, lng: 76.0 } },
  { name: "Kerala", centroid: { lat: 10.5, lng: 76.3 } },
  { name: "Tamil Nadu", centroid: { lat: 10.8, lng: 78.1 } },
  { name: "Ladakh", centroid: { lat: 34.1, lng: 77.6 } },
]

/** Common city / district lookups so free-text locations map to real coords. */
export const INDIA_CITIES: Record<string, LatLng> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  bombay: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  "new delhi": { lat: 28.7041, lng: 77.1025 },
  noida: { lat: 28.5355, lng: 77.391 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  faridabad: { lat: 28.4089, lng: 77.3178 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  calcutta: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  madras: { lat: 13.0827, lng: 80.2707 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  pune: { lat: 18.5204, lng: 73.8567 },
  surat: { lat: 21.1702, lng: 72.8311 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  patna: { lat: 25.5941, lng: 85.1376 },
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  ludhiana: { lat: 30.901, lng: 75.8573 },
  agra: { lat: 27.1767, lng: 78.0081 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  vizag: { lat: 17.6868, lng: 83.2185 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  ranchi: { lat: 23.3441, lng: 85.3096 },
  dehradun: { lat: 30.3165, lng: 78.0322 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  jammu: { lat: 32.7266, lng: 74.857 },
  amritsar: { lat: 31.634, lng: 74.8723 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  raipur: { lat: 21.2514, lng: 81.6296 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  vijayawada: { lat: 16.5062, lng: 80.648 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  salem: { lat: 11.6643, lng: 78.146 },
  gwalior: { lat: 26.2183, lng: 78.1828 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  tirupati: { lat: 13.6288, lng: 79.4192 },
  mangaluru: { lat: 12.9141, lng: 74.856 },
  mangalore: { lat: 12.9141, lng: 74.856 },
  "kochi coast": { lat: 9.66, lng: 76.24 },
  odisha: { lat: 20.2, lng: 84.5 },
  kerala: { lat: 10.5, lng: 76.3 },
  karnataka: { lat: 14.6, lng: 76.0 },
  assam: { lat: 26.3, lng: 92.8 },
  kutch: { lat: 23.2, lng: 69.7 },
  "gujarat coast": { lat: 21.5, lng: 72.0 },
  "odisha coast": { lat: 20.5, lng: 86.5 },
  "kerala backwaters": { lat: 9.5, lng: 76.3 },
  andaman: { lat: 12.0, lng: 92.9 },
  lakshadweep: { lat: 10.5, lng: 72.8 },
}

/**
 * Resolve a free text location (city, district, "Sector 12") into coordinates.
 * Falls back to a deterministic pseudo-coordinate inside India so the map
 * always has a position to render.
 */
export function geocodeLocation(location: string): LatLng {
  if (!location) return { lat: 28.7041, lng: 77.1025 }

  const raw = location.trim()
  const lower = raw.toLowerCase()

  // 1. Explicit lat/lng pairs
  const coords = raw.match(/-?\d{1,2}(?:\.\d+)?[,\s]\s*-?\d{1,2}(?:\.\d+)?/)
  if (coords) {
    const nums = coords[0].match(/-?\d{1,2}(?:\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const lat = parseFloat(nums[0])
      const lng = parseFloat(nums[1])
      if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
        return { lat, lng }
      }
    }
  }

  // 2. Sector / plot / colony codes -> NCR
  if (/\bsector\b|\bsec\b|phase\b|block\b/.test(lower)) {
    return { lat: 28.5355, lng: 77.391 }
  }

  // 3. ASCII / romanized location strings
  const stripped = lower.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()
  for (const [name, point] of Object.entries(INDIA_CITIES)) {
    if (stripped === name || stripped.startsWith(`${name} `) || stripped.endsWith(` ${name}`)) {
      return point
    }
    if (stripped.includes(name) && name.length >= 4) {
      return point
    }
  }

  // 4. Deterministic fallback inside India (reseeded by the string hash)
  const fallbacks: LatLng[] = [
    { lat: 28.7, lng: 77.2 },
    { lat: 19.1, lng: 72.9 },
    { lat: 22.6, lng: 88.4 },
    { lat: 13.1, lng: 80.3 },
    { lat: 12.97, lng: 77.6 },
    { lat: 17.4, lng: 78.5 },
    { lat: 23.0, lng: 72.6 },
    { lat: 21.2, lng: 81.6 },
    { lat: 25.6, lng: 85.1 },
    { lat: 23.7, lng: 83.0 },
  ]
  let hash = 0
  for (const ch of lower) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return fallbacks[hash % fallbacks.length]
}

/**
 * Map viewport in "projection units". The two axes are scaled by true Earth
 * distance (km per degree, longitude adjusted by cos θ) so India keeps its
 * real shape instead of being squashed into a square. Both the SVG outline
 * and the HTML markers use THIS same space, so pins always sit on the shape.
 */
export const MAP_VIEW_W = 100
export const MAP_VIEW_H = 109 // height in projection units = W × (ΔlatKm / ΔlonKm)

const LON_MIN = 67.5
const LON_MAX = 98.5
const LAT_MIN = 6.0
const LAT_MAX = 37.5

const KM_PER_DEG_LAT = 110.574
const KM_PER_DEG_LON = 111.32 * Math.cos(((LAT_MIN + LAT_MAX) / 2) * (Math.PI / 180))

/**
 * Project geographic coordinates onto the shared MAP_VIEW_W x MAP_VIEW_H
 * space (east-west distances are cos-latitude corrected, so the map is
 * geographically accurate rather than uniformly stretched).
 */
export function projectIndia(lat: number, lng: number): { x: number; y: number } {
  if (lng < LON_MIN) lng = LON_MIN
  if (lng > LON_MAX) lng = LON_MAX
  if (lat < LAT_MIN) lat = LAT_MIN
  if (lat > LAT_MAX) lat = LAT_MAX
  const x = ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_VIEW_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_VIEW_H
  return { x, y }
}

/**
 * Simplified India landmass outline (approximate border coordinates,
 * drawn with a smooth path). Cartographically indicative, not survey-grade.
 */
export const INDIA_OUTLINE: [number, number][] = [
  [34.6, 74.8],
  [35.0, 76.0],
  [34.2, 77.4],
  [32.7, 75.9],
  [32.2, 78.6],
  [31.3, 78.9],
  [30.6, 78.2],
  [30.2, 76.9],
  [29.4, 75.4],
  [28.9, 74.0],
  [29.1, 71.4],
  [27.7, 71.1],
  [26.4, 71.0],
  [24.7, 70.8],
  [23.3, 68.7],
  [22.2, 69.3],
  [21.6, 70.0],
  [21.3, 71.8],
  [20.9, 72.0],
  [19.6, 73.2],
  [18.9, 73.1],
  [17.9, 74.2],
  [16.2, 74.7],
  [14.9, 74.9],
  [13.7, 75.0],
  [13.5, 74.5],
  [12.4, 75.2],
  [11.2, 75.9],
  [9.6, 76.6],
  [9.6, 77.0],
  [8.1, 77.0],
  [8.1, 77.5],
  [8.7, 77.3],
  [9.3, 79.0],
  [10.3, 79.5],
  [12.0, 80.2],
  [13.1, 80.3],
  [14.9, 80.4],
  [15.8, 81.3],
  [17.6, 82.9],
  [19.2, 84.8],
  [21.3, 87.1],
  [21.5, 87.9],
  [22.2, 87.3],
  [23.4, 88.6],
  [24.1, 88.8],
  [25.6, 88.0],
  [26.6, 88.5],
  [27.4, 88.7],
  [27.7, 88.2],
  [26.9, 88.1],
  [27.0, 89.3],
  [27.3, 89.9],
  [28.0, 90.6],
  [28.3, 92.0],
  [27.8, 92.6],
  [28.2, 94.8],
  [28.4, 95.5],
  [28.0, 96.7],
  [27.2, 96.0],
  [27.5, 95.2],
  [26.0, 94.5],
  [25.3, 93.6],
  [23.6, 93.3],
  [23.6, 92.4],
  [22.5, 92.9],
  [22.0, 92.7],
  [22.4, 92.1],
  [22.2, 90.2],
  [23.6, 90.5],
  [23.4, 89.6],
  [23.9, 89.0],
  [23.2, 88.9],
  [22.5, 88.5],
  [22.7, 87.9],
  [21.6, 88.0],
  [21.4, 86.9],
  [20.6, 86.8],
  [20.4, 85.9],
  [19.7, 83.9],
  [18.3, 83.9],
  [16.9, 83.2],
  [15.6, 80.3],
  [14.3, 80.1],
  [13.6, 80.1],
  [13.0, 80.3],
  [12.0, 79.9],
  [11.5, 80.0],
  [10.7, 79.4],
  [10.5, 79.7],
  [9.9, 79.5],
  [9.6, 79.0],
  [8.8, 78.7],
  [9.0, 77.9],
  [8.2, 77.8],
  [8.1, 77.6],
  [8.1, 77.5],
  [8.4, 77.2],
  [8.9, 76.6],
  [10.0, 76.3],
  [10.9, 76.0],
  [11.6, 76.0],
  [12.4, 75.3],
  [13.2, 74.9],
  [14.0, 74.6],
  [14.8, 74.1],
  [15.7, 73.7],
  [16.7, 73.1],
  [17.7, 73.8],
  [18.2, 72.9],
  [18.9, 72.8],
  [19.2, 72.6],
  [20.4, 71.1],
  [21.3, 71.6],
  [21.8, 70.2],
  [22.3, 69.5],
  [23.2, 68.9],
  [24.0, 70.9],
  [25.0, 71.3],
  [25.9, 71.0],
  [27.5, 71.0],
  [28.3, 70.6],
  [29.5, 71.0],
  [29.9, 72.4],
  [30.5, 74.2],
  [31.2, 74.4],
  [32.0, 75.5],
  [32.8, 75.1],
  [33.5, 75.2],
  [34.6, 74.8],
]

export function indiaOutlinePath(): string {
  const pts = INDIA_OUTLINE.map(([lat, lng]) => {
    const { x, y } = projectIndia(lat, lng)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return `M ${pts.join(" L ")} Z`
}

/** Approximate Sri Lanka landmass (rendered south of the peninsula). */
export const SRI_LANKA_OUTLINE: [number, number][] = [
  [9.15, 79.72],
  [9.05, 80.35],
  [8.75, 80.75],
  [8.25, 80.72],
  [7.55, 81.5],
  [7.0, 81.8],
  [6.55, 81.45],
  [6.05, 80.75],
  [6.1, 80.05],
  [6.75, 79.75],
  [7.55, 79.9],
  [8.2, 79.75],
  [8.6, 79.5],
  [9.15, 79.72],
]

export function sriLankaOutlinePath(): string {
  const pts = SRI_LANKA_OUTLINE.map(([lat, lng]) => {
    const { x, y } = projectIndia(lat, lng)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return `M ${pts.join(" L ")} Z`
}