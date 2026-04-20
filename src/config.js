/**
 * API Configuration
 * =================
 * Change BASE_URL to point to your Flask server.
 * 
 * During development on the same WiFi:
 *   - Find your PC's local IP: `ip addr` on Linux, look for 192.168.x.x
 *   - Set BASE_URL to 'http://192.168.x.x:5000'
 * 
 * For team testing / production:
 *   - Deploy Flask to Render.com (free tier), Railway, or any host
 *   - Set BASE_URL to 'https://your-app.onrender.com'
 */

// ── Change this to your server URL ──
// USB development: adb reverse tcp:5000 tcp:5000 tunnels phone → this machine's localhost
const BASE_URL = 'https://joaccess-backend.onrender.com';

// The mobile API is mounted at /api/v1 (see api_blueprint.py)
export const API_BASE = `${BASE_URL}/api/v1`;

// For loading uploaded photos — the blueprint serves them at /api/v1/uploads/
export const UPLOADS_BASE = `${API_BASE}/uploads`;

// For the Leaflet map tile layer
export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const MAP_TILE_ATTRIBUTION = '© OpenStreetMap contributors © CARTO';

// Jordan map bounds and default center
export const JORDAN_CENTER = { lat: 31.9539, lng: 35.9106 };
export const JORDAN_BOUNDS = {
  south: 28.5,
  west: 34.0,
  north: 34.0,
  east: 40.0,
};
export const DEFAULT_ZOOM = 8;

// Google Maps API Key for Places (New) autocomplete API
export const GOOGLE_PLACES_API_KEY = "AIzaSyBK0MYlgq3VaDG2XgJ2ZpY5sm0Imhndv1I";

export default {
  API_BASE,
  UPLOADS_BASE,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  JORDAN_CENTER,
  JORDAN_BOUNDS,
  DEFAULT_ZOOM,
  GOOGLE_PLACES_API_KEY,
};
// this comment is from jameel