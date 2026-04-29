/**
 * @typedef {{
 *   speedKmh: number,
 *   directionDeg: number,
 *   headingDeg: number
 * }} WindSnapshot
 *
 * directionDeg: meteorologisch — woher der Wind kommt (0–360°, 0=N, 90=E, 270=W)
 * headingDeg:   Fahrtrichtung in den Wind = directionDeg (Gegenwind-zuerst-Logik)
 */

/**
 * @typedef {{
 *   type: 'LineString',
 *   coordinates: [number, number][]
 * }} GeoJsonLineString
 *
 * coordinates: [lng, lat] — GeoJSON-Standard (Längengrad zuerst)
 */

/**
 * @typedef {{
 *   _id?: import('mongodb').ObjectId | string,
 *   name: string,
 *   createdAt: Date | string,
 *   startLat: number,
 *   startLng: number,
 *   startLabel: string,
 *   distanceKm: number,
 *   sport: 'road' | 'gravel',
 *   wind: WindSnapshot,
 *   geometry: GeoJsonLineString,
 *   actualDistanceKm: number,
 *   elevationGainM: number,
 *   durationMin: number,
 *   tailwindPercent: number,
 *   alternativeGeometry?: GeoJsonLineString,
 *   alternativeDistanceKm?: number,
 *   alternativeElevationGainM?: number,
 *   alternativeDurationMin?: number,
 *   alternativeTailwindPercent?: number
 * }} Route
 */

export {};
