# Radar Emergency Response System - Technical Documentation

## 1. System Overview

Radar is a real-time emergency response coordination system designed to connect emergency callers with ambulance drivers and hospitals. The system enables automatic dispatch, live GPS tracking, and hospital bed management for efficient emergency medical services.


## 2. Technology Stack

### 2.1 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | Core UI library for building component-based interfaces |
| **React Router DOM** | 7.9.6 | Client-side routing and navigation |
| **Vite** | 7.2.4 | Build tool and development server |
| **Tailwind CSS** | CDN | Utility-first CSS framework for styling |
| **Framer Motion** | 12.23.24 | Animation library for React |
| **Lucide React** | 0.554.0 | Icon library |
| **Axios** | 1.13.2 | HTTP client for API requests |

### 2.2 Backend & Database Technologies

| Technology | Purpose |
|------------|---------|
| **Firebase Authentication** | User authentication (email/password) |
| **Cloud Firestore** | Primary NoSQL database for structured data |
| **Firebase Realtime Database** | Real-time location tracking data |
| **n8n Cloud** | Workflow automation and AI dispatch logic |

### 2.3 External APIs & Services

| Service | Purpose |
|---------|---------|
| **Google Maps JavaScript API** | Interactive maps, markers, and route visualization |
| **@react-google-maps/api** (v2.20.7) | React wrapper for Google Maps |
| **n8n Webhook** | AI-powered ambulance dispatch automation |
| **Geolocation API** | Browser-based GPS tracking |

### 2.4 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **TypeScript** | 5.9.3 | Type checking (tsconfig configured) |
| **Node.js/npm** | - | Package management |
| **ES Modules** | ESNext | Modern JavaScript module system |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Emergency    │ │ Hospital     │ │ Ambulance Driver         │ │
│  │ Caller UI    │ │ Admin UI     │ │ Dashboard                │ │
│  └──────┬───────┘ └──────┬───────┘ └───────────┬──────────────┘ │
│         │                │                     │                │
│  ┌──────┴────────────────┴─────────────────────┴────────────── ┐│
│  │                 React 19 + React Router                     ││
│  │               (Vite Build System)                           ││
│  └─────────────────────────┬───────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     INTEGRATION LAYER                           │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │                    Firebase SDK                          │   │
│  │  • Authentication  • Firestore  • Realtime Database      │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │           n8n Cloud Webhook (AI Dispatch)                │   │
│  │         /webhook/emergency-dispatch                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │              Firebase Cloud Services                     │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐    │   │
│  │  │ Cloud Firestore │  │ Realtime Database           │    │   │
│  │  │ • users         │  │ • locations/drivers/{uid}   │    │   │
│  │  │ • hospitals     │  │ • locations/hospitals/{id}  │    │   │
│  │  │ • ambulances    │  │                             │    │   │
│  │  │ • emergencyCalls│  │                             │    │   │
│  │  └─────────────────┘  └─────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### 4.1 Cloud Firestore Collections

#### `users` Collection
```javascript
{
  uid: string,           // Firebase Auth UID
  email: string,
  role: 'admin' | 'hospital' | 'driver',
  hospitalId?: string,   // For hospital admins
  hospitalName?: string,
  currentLocation: { lat: number, lng: number },
  lastLocationUpdate: string (ISO timestamp),
  createdAt: string (ISO timestamp)
}
```

#### `hospitals` Collection
```javascript
{
  id: string,
  name: string,
  location: { lat: number, lng: number },
  totalUnits: number,
  occupiedUnits: number,
  contactPhone: string,
  address: string
}
```

#### `ambulances` Collection
```javascript
{
  id: string,
  vehicleNumber: string,
  vehicleType: 'BLS' | 'ALS' | 'CCT' | 'Neonatal',
  patientCapacity: number,
  status: 'available' | 'dispatched' | 'busy',
  assignedDriverId?: string,
  hospitalId: string,
  paramedics: string[],
  currentLocation: { lat: number, lng: number }
}
```

#### `emergencyCalls` Collection
```javascript
{
  id: string,
  callerName: string,
  callerPhone: string,
  location: { lat: number, lng: number },
  emergencyType: string,
  priority: 'critical' | 'urgent' | 'moderate',
  status: 'pending' | 'dispatched' | 'in_progress' | 'completed',
  assignedDriverId?: string,
  assignedHospitalId?: string,
  timestamp: string (ISO timestamp)
}
```


## 5. n8n Workflow Integration

### 5.1 Webhook Endpoint
```
URL: https://xweblabs25.app.n8n.cloud/webhook/emergency-dispatch
Method: POST
Content-Type: application/json
```

### 5.2 Request Payload
```json
{
  "callId": "string",
  "callerName": "string",
  "callerPhone": "string",
  "location": { "lat": number, "lng": number },
  "emergencyType": "string",
  "priority": "string",
  "eventType": "new_emergency_call"
}
```

### 5.3 Response Format

**Success (Driver Found)**:
```json
{
  "success": true,
  "driver": {
    "driverName": "string",
    "vehiclePlate": "string",
    "location": "{\"lat\": number, \"lng\": number}",
    "vehicleType": "ALS",
    "phone": "string"
  }
}
```

**Failure (No Driver Available)**:
```json
{
  "success": false,
  "message": "No drivers available at the moment"
}
```

### 5.4 n8n Workflow Logic
The n8n automation performs:
1. **Receives** emergency call data via webhook
2. **Queries** Firestore for available drivers (status = 'available')
3. **Calculates** distance from each driver to caller location
4. **Selects** the nearest available driver
5. **Updates** driver status to 'dispatched' in Firestore
6. **Returns** driver details to the frontend

---

## 6. Application Routes & User Roles

| Route | Component | Required Role | Description |
|-------|-----------|---------------|-------------|
| `/` | EmergencyCaller | Public | Emergency call submission |
| `/login` | Login | Public | Authentication page |
| `/admin` | SystemAdmin | admin | System-wide dashboard |
| `/hospital` | HospitalAdminNew | hospital | Hospital management |
| `/hospital/management` | HospitalManagement | hospital | Extended hospital features |
| `/driver` | AmbulanceDriverEnhanced | driver | Driver dispatch dashboard |
| `/system-docs` | SystemDocs | Public | System documentation |

---

## 7. Key Features by Module

### 7.1 Emergency Caller Module
- Location auto-detection via Geolocation API
- Emergency type selection
- Priority classification
- Real-time dispatch status updates
- Live ambulance tracking via Google Maps
- ETA calculation (Haversine formula)

### 7.2 System Admin Module
- Real-time emergency call timeline
- Hospital capacity monitoring
- Ambulance fleet overview
- Driver status tracking
- System-wide statistics

### 7.3 Hospital Admin Module
- CRUD operations for drivers
- CRUD operations for ambulances
- Paramedic assignment to vehicles
- Bed capacity management
- Incoming emergency call monitoring
- Driver-ambulance linking

### 7.4 Ambulance Driver Module
- Dispatch notifications
- Navigation to caller location
- Status updates (Arrived, Transporting, Delivered)
- Hospital selection assistance
- Live location broadcasting
- Forward dispatch functionality

---

## 8. Location Tracking System

### 8.1 Implementation
- Uses HTML5 Geolocation API with `watchPosition()`
- High accuracy mode enabled
- Updates every 5 seconds (maximum age)
- 10-second timeout per position request

### 8.2 Data Flow
```
Browser Geolocation → Location Tracking Util → Firebase Realtime DB → Firestore (backup)
```

### 8.3 Configuration
```javascript
{
  enableHighAccuracy: true,
  maximumAge: 5000,      // 5 seconds
  timeout: 10000         // 10 seconds
}
```

---

## 9. Google Maps Integration

### 9.1 Features Used
- Interactive map rendering
- Custom markers (caller, driver, hospital)
- Polyline route visualization
- Directions URL generation for navigation

### 9.2 Configuration
```javascript
{
  defaultCenter: { lat: -20.1325, lng: 28.6265 }, // Bulawayo
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true
}
```

---

## 10. Authentication System

### 10.1 Flow
1. User submits credentials via Login form
2. Firebase Auth validates email/password
3. On success, fetch user document from Firestore
4. Extract role and hospital association
5. Start location tracking for drivers/hospitals
6. Redirect to role-appropriate dashboard

### 10.2 Role-Based Access Control
- Protected routes via `PrivateRoute` component
- Role checking against `allowedRoles` array
- Unauthorized users redirected to home

---

## 11. Security Considerations

- Firebase Security Rules (configure in Firebase Console)
- API keys stored in config files (should use environment variables in production)
- Role-based access control on routes
- Authentication required for admin functions

---

## 12. Deployment

### 12.1 Build Command
```bash
npm run build
```

### 12.2 Development Server
```bash
npm run dev -- --host
```

### 12.3 Output
- Build artifacts in `/dist` directory
- Static files suitable for any web hosting

---

## 13. Dependencies Summary

### Production Dependencies
```json
{
  "@react-google-maps/api": "^2.20.7",
  "axios": "^1.13.2",
  "firebase": "^12.6.0",
  "framer-motion": "^12.23.24",
  "lucide-react": "^0.554.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.6"
}
```

### Development Dependencies
```json
{
  "typescript": "~5.9.3",
  "vite": "^7.2.4"
}
```

---

## 14. External Service Configuration

### 14.1 Firebase Project
- **Project ID**: systemradar
- **Auth Domain**: systemradar.firebaseapp.com

### 14.2 n8n Cloud
- **Instance**: xweblabs25.app.n8n.cloud
- **Webhook**: /webhook/emergency-dispatch

### 14.3 Google Cloud Platform
- Google Maps JavaScript API enabled
- API key configured for web application
