# JOAccess Mobile App

**Accessibility Map Jordan** — React Native (Expo) mobile companion for the JOAccess Flask web application.

## What's Included

### Mobile App (`/joaccess-mobile/`)
A full React Native Expo app with all features from the web version:
- **Interactive Map** — Leaflet-based map (WebView) with custom markers, search, category/feature filters, locate-me button
- **Location Details** — Full popup with description, address, accessibility features, photos, reviews, verified/unverified badges
- **Add/Edit Location** — Map picker for coordinates, all form fields (bilingual), accessibility feature toggles, camera/gallery photo upload
- **Profile** — User stats, location cards with edit/delete, logout
- **Chatbot** — Bilingual chat assistant with suggestion buttons (same keyword-matching logic as web)
- **Settings** — EN/AR language toggle, accessibility settings (high contrast, text size, dyslexia font, color blind modes)
- **Auth** — JWT-based login/signup with SecureStore token persistence
- **Bilingual** — Full Arabic/English support with RTL layout

### Backend API Blueprint (`api_blueprint.py`)
A Flask Blueprint that adds JWT REST API endpoints alongside existing web routes:
- `POST /api/v1/auth/signup` — Register
- `POST /api/v1/auth/login` — Login (returns JWT tokens)
- `POST /api/v1/auth/refresh` — Refresh expired access token
- `GET /api/v1/auth/me` — Current user profile
- `GET /api/v1/locations` — List all (with filters)
- `GET /api/v1/locations/:id` — Single location detail
- `POST /api/v1/locations` — Create (with base64 photo upload)
- `PUT /api/v1/locations/:id` — Update
- `DELETE /api/v1/locations/:id` — Delete
- `POST /api/v1/locations/:id/reviews` — Add review
- `DELETE /api/v1/reviews/:id` — Delete review
- `POST /api/v1/locations/:id/report` — Report location
- `POST /api/v1/chatbot` — Chat message
- `GET/PUT /api/v1/accessibility-settings` — User accessibility prefs
- `GET /api/v1/uploads/:filename` — Serve uploaded photos
- `GET /api/v1/my-locations` — Current user's locations

---

## Setup Instructions

### 1. Backend Setup (Flask)

#### Install the new dependency
```bash
cd /path/to/JOAccess-main
pip install flask-jwt-extended
```

#### Add to requirements.txt
```
flask-jwt-extended
```

#### Copy the API blueprint
```bash
cp /path/to/joaccess-mobile/api_blueprint.py /path/to/JOAccess-main/api_blueprint.py
```

#### Register the blueprint in `app.py`
Add these lines near the top of `app.py`, after creating the Flask app and configuring it:

```python
# ── After line: app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
# Add JWT configuration
from datetime import timedelta
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'joaccess-jwt-secret-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# ── After line: login_manager.login_view = 'login'
# Register mobile API blueprint
from api_blueprint import mobile_api, jwt
jwt.init_app(app)
app.register_blueprint(mobile_api, url_prefix='/api/v1')
```

#### Run the Flask server
```bash
# Find your local IP address
ip addr | grep 'inet 192'   # Linux
# or
ifconfig | grep 'inet 192'  # macOS

# Run Flask on all interfaces so your phone can reach it
python app.py
# Server runs at http://0.0.0.0:5000
```

### 2. Mobile App Setup

#### Prerequisites
- Node.js 18+ installed
- Expo Go app on your Android/iOS phone (from Play Store / App Store)
- Phone and PC on the same WiFi network

#### Install dependencies
```bash
cd joaccess-mobile
npm install
```

#### Configure the server URL
Edit `src/config.js` and set `BASE_URL` to your Flask server's address:
```javascript
// Replace with your PC's local IP (not localhost!)
const BASE_URL = 'http://192.168.1.100:5000';
```

#### Start the development server
```bash
npx expo start
```

This shows a QR code in the terminal. Scan it with:
- **Android**: Expo Go app → "Scan QR Code"
- **iOS**: Camera app → recognizes the QR code → opens in Expo Go

The app will hot-reload as you make changes.

### 3. Team Access During Development

For your team to test without being on the same WiFi:

#### Option A: Expo Tunnel (Quick & Free)
```bash
npx expo start --tunnel
```
This creates a public URL that anyone can scan. Requires `ngrok` (installed automatically).

#### Option B: Deploy Flask to Render.com (Free Tier)
1. Push your Flask code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, set:
   - Build: `pip install -r requirements.txt`
   - Start: `python app.py`
   - Environment vars: `JWT_SECRET_KEY`, `SECRET_KEY`, `FLASK_DEBUG=false`
4. Update `src/config.js` with the Render URL
5. Your team runs `npx expo start --tunnel` or builds an APK

#### Option C: Build a Standalone APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK (free, runs on Expo's cloud)
eas build --platform android --profile preview

# This gives you an .apk download link to share with your team
```

---

## Project Structure

```
joaccess-mobile/
├── App.js                          # Entry point (providers + splash)
├── app.json                        # Expo config
├── package.json                    # Dependencies
├── babel.config.js                 # Babel + Reanimated
├── api_blueprint.py                # Flask API blueprint (copy to backend)
└── src/
    ├── config.js                   # API URL, map settings
    ├── context/
    │   ├── AuthContext.js           # JWT auth state
    │   └── LanguageContext.js       # EN/AR language state
    ├── navigation/
    │   └── AppNavigator.js         # Stack + Tab navigation
    ├── screens/
    │   ├── MapScreen.js            # Leaflet map + filters + detail modal
    │   ├── ChatbotScreen.js        # Chat assistant
    │   ├── ProfileScreen.js        # User profile + my locations
    │   ├── SettingsScreen.js       # Language, accessibility, about
    │   ├── LoginScreen.js          # Login form
    │   ├── SignupScreen.js         # Registration form
    │   └── AddEditLocationScreen.js # Add/edit with map picker
    ├── services/
    │   └── api.js                  # HTTP client + token management
    └── utils/
        ├── theme.js                # Colors, spacing, typography
        └── translations.js         # All EN/AR strings
```

## Switching to Google Maps Later

The map is abstracted behind a WebView running Leaflet. To switch to Google Maps:

1. Install `react-native-maps`:
   ```bash
   npx expo install react-native-maps
   ```

2. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)

3. Add to `app.json`:
   ```json
   "android": {
     "config": {
       "googleMaps": { "apiKey": "YOUR_KEY_HERE" }
     }
   }
   ```

4. Replace the `<WebView>` in `MapScreen.js` with:
   ```jsx
   import MapView, { Marker } from 'react-native-maps';
   
   <MapView
     style={{ flex: 1 }}
     initialRegion={{
       latitude: 31.9539,
       longitude: 35.9106,
       latitudeDelta: 4,
       longitudeDelta: 4,
     }}
   >
     {filteredLocations.map(loc => (
       <Marker
         key={loc.id}
         coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
         title={getLocalized(loc, 'name')}
         onPress={() => { setSelectedLocation(loc); setShowDetail(true); }}
       />
     ))}
   </MapView>
   ```

The rest of the app (detail modals, filters, search) stays exactly the same — only the map rendering component changes.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile Framework | React Native (Expo SDK 52) |
| Navigation | React Navigation 7 (Stack + Tabs) |
| Map | Leaflet.js via WebView (swappable to Google Maps) |
| Auth | JWT (flask-jwt-extended) + expo-secure-store |
| Photos | expo-image-picker (camera + gallery) |
| Location | expo-location |
| State | React Context API |
| Backend | Flask + SQLAlchemy + SQLite |
| Styling | React Native StyleSheet (matches web CSS variables) |
