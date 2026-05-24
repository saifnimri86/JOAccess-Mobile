# JOAccess Mobile App

**Accessibility Map Jordan** — The mobile companion to JOAccess, helping people find and share accessibility information about locations across Jordan.

---

## What is JOAccess Mobile?

JOAccess Mobile lets you explore, contribute to, and interact with an accessibility map of Jordan — right from your phone. Whether you're looking for a wheelchair-friendly entrance, an accessible restroom, or a ramp at a public building, the app puts that information in your hands wherever you are.

---

## Features

### 🗺️ Interactive Map
Browse an interactive map of Jordan with accessibility markers. Filter locations by category or by specific accessibility features (ramps, elevators, accessible parking, etc.), search for places by name, and tap any marker to see full details.

### 📍 Location Details
Each location shows a full profile — description, address, photos, a list of its accessibility features, user reviews, and a verified/unverified badge so you know how trustworthy the information is.

### ➕ Add & Edit Locations
Spotted an accessible place that isn't on the map yet? You can add it directly from the app. Pick the location on the map, fill in the details in Arabic or English, toggle which accessibility features it has, and attach photos from your camera or gallery.

### 🤖 Bilingual Chatbot
A built-in chat assistant that answers accessibility-related questions in both Arabic and English. It includes suggestion buttons for common queries so you don't have to type everything out.

### 👤 Profile
View your contributed locations, edit or delete them, and see your activity stats — all in one place.

### ⚙️ Settings & Accessibility Options
The app includes a dedicated accessibility settings panel with:
- **High contrast mode**
- **Adjustable text size**
- **Dyslexia-friendly font**
- **Color blind modes**
- **Language toggle (English / Arabic)**

### 🌐 Auto-detects Your System Language
When you first open the app, it automatically detects your phone's system language and sets the interface to Arabic or English accordingly — no manual setup needed. You can always switch languages manually from Settings.

### 🔄 Full RTL Support
The entire app layout flips to right-to-left when Arabic is active, including navigation, forms, and the map interface.

### 🔐 Secure Authentication
Sign up and log in with a standard account. Your session is stored securely on the device, so you stay logged in between uses without compromising your credentials.

---

## Tech Highlights

- Built with **React Native** for both Android and iOS
- **JWT-based authentication** with secure token storage on-device
- **Bilingual (EN/AR)** throughout, with automatic RTL layout switching
- Map powered by **Leaflet.js**, designed to be swappable with Google Maps in the future
- Connects to the **JOAccess Flask backend** with a full REST API
- Photo upload support via camera and gallery

---

*JOAccess Mobile is part of the JOAccess graduation project — an accessibility mapping platform for Jordan.*
