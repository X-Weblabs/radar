# Location Tracking Features

## Overview
The Radar System now includes comprehensive real-time location tracking for drivers and hospitals, enabling live monitoring, distance calculations, and Google Maps integration for navigation.

## Features Implemented

### 1. **Automatic Location Tracking on Login**
- When drivers or hospital admins log in, their geolocation is automatically captured and tracked
- Location data is stored in Firebase Realtime Database (`locations/drivers/{userId}` and `locations/hospitals/{userId}`)
- Location updates are sent to Firestore user collection for persistent storage
- Tracking continues in real-time while the user is logged in
- Tracking stops automatically on logout

**Location Data Structure:**
```javascript
{
  lat: number,
  lng: number,
  timestamp: ISO string,
  accuracy: number (in meters),
  status: string, // for drivers: 'available', 'dispatched', 'transporting'
  assignedCallId: string | null // for drivers
}
```

### 2. **Real-Time Location Updates**
- Uses browser's Geolocation API with high accuracy mode
- Updates every 5 seconds or when position changes significantly
- Fallback to default coordinates if geolocation is denied/unavailable
- Location updates are visible to:
  - System administrators (can see all drivers and hospitals)
  - Emergency callers (can see assigned driver's location)
  - Hospitals (can see incoming ambulances)

### 3. **Distance Calculations**
- Calculates real-time distance between:
  - Driver and emergency caller location
  - Driver and destination hospital
  - User and any driver/hospital
- Uses Haversine formula for accurate geographic distance
- Displays distances in kilometers with 1 decimal precision
- Updates dynamically as positions change

**Distance Display Locations:**
- Driver dashboard: Distance to caller and hospital with ETA
- Live map sidebar: Distance from your location to each driver/hospital
- Map info windows: Distance to clicked markers

### 4. **Google Maps Integration**
- **One-tap Navigation:** Opens Google Maps app/website with route from current location to destination
- **Deep Linking:** Works on both mobile and desktop browsers
- **Automatic Route Calculation:** Uses driving mode by default
- **Available in:**
  - Driver dashboard (navigate to caller or hospital)
  - Live map markers (navigate to any tracked entity)
  - Emergency caller view (navigate to assigned driver)

**Button Locations:**
```
- AmbulanceDriver: "Open in Google Maps" buttons for caller and hospital
- LiveMapSectionEnhanced: "Navigate" buttons in info windows
```

### 5. **Enhanced Live Map View**
New component: `LiveMapSectionEnhanced.jsx`

**Features:**
- Real-time visualization of all drivers, hospitals, and emergency calls
- Color-coded markers:
  - 🟢 Green: Available drivers
  - 🔵 Blue: Dispatched drivers
  - 🟠 Orange: Transporting drivers
  - 🔴 Red: Emergency calls
  - 🏥 Hospital icon: Hospitals
  - 🟣 Purple: Your current location
- Interactive info windows with:
  - Entity details (status, last update time)
  - Distance from your location
  - Quick navigation button
- Real-time updates without page refresh
- Sidebar with active drivers and nearby hospitals sorted by distance

### 6. **Hospital Location Tracking**
- Hospital coordinates captured on login
- Display current location coordinates in dashboard
- Allows emergency services to locate hospital entrance
- Useful for large hospital complexes

## Files Created/Modified

### New Files:
1. **`src/utils/locationTracking.js`** - Location tracking service
   - `startLocationTracking()` - Initiates GPS tracking
   - `stopLocationTracking()` - Stops GPS tracking
   - `updateUserLocation()` - Updates Firebase with location
   - `subscribeToUserLocation()` - Real-time location listener
   - `subscribeToAllDriverLocations()` - Listen to all drivers
   - `subscribeToAllHospitalLocations()` - Listen to all hospitals
   - `calculateDistance()` - Haversine distance calculation
   - `openGoogleMapsNavigation()` - Opens Google Maps with route

2. **`src/components/LiveMapSectionEnhanced.jsx`** - Enhanced map view
   - Real-time driver/hospital tracking
   - Interactive markers with info windows
   - Distance calculations from user location
   - Navigation integration

### Modified Files:
1. **`src/context/AuthContext.jsx`**
   - Added location tracking on driver/hospital login
   - Stops tracking on logout
   - Manages location watch ID state

2. **`src/components/AmbulanceDriver.jsx`**
   - Integrated real-time location updates to Firebase
   - Added distance display to caller and hospital
   - Added "Open in Google Maps" buttons
   - Shows live distance updates during transit

3. **`src/components/HospitalAdmin.jsx`**
   - Captures hospital location on component mount
   - Displays current coordinates in dashboard
   - Persists location for emergency services reference

## Firebase Database Structure

```
firebase-realtime-database/
├── locations/
│   ├── drivers/
│   │   ├── {userId}/
│   │   │   ├── lat: -25.7479
│   │   │   ├── lng: 28.2293
│   │   │   ├── timestamp: "2025-11-21T10:30:00Z"
│   │   │   ├── accuracy: 10
│   │   │   ├── status: "dispatched"
│   │   │   └── assignedCallId: "call123"
│   │   └── ...
│   └── hospitals/
│       ├── {userId}/
│       │   ├── lat: -25.7500
│       │   ├── lng: 28.2400
│       │   └── timestamp: "2025-11-21T08:00:00Z"
│       └── ...

firestore/
└── users/
    ├── {userId}/
    │   ├── email: string
    │   ├── role: string
    │   ├── currentLocation: { lat: number, lng: number }
    │   └── lastLocationUpdate: string
    └── ...
```

## Usage Examples

### For Drivers:
1. **Login** → Location tracking starts automatically
2. **Get Assigned** → Your location visible to caller and hospital
3. **Navigate to Caller** → Click "Open in Google Maps" for turn-by-turn directions
4. **Pick Up Patient** → System finds nearest hospital and shows distance
5. **Navigate to Hospital** → Click "Open in Google Maps" for hospital route
6. **Logout** → Location tracking stops

### For Emergency Callers:
1. **Place Emergency Call** → See available drivers and their distances
2. **Get Assigned Driver** → Track driver's real-time location on map
3. **Monitor ETA** → See live distance and estimated arrival time
4. **Navigate to Meeting Point** → Click to open Google Maps if needed

### For Hospitals:
1. **Login** → Location captured and stored
2. **Incoming Ambulance** → See driver's location and ETA
3. **Prepare for Arrival** → Real-time updates as driver approaches
4. **Check Capacity** → Available beds visible to dispatchers

### For Administrators:
1. **Open Live Map** → See all drivers, hospitals, and emergencies
2. **Click Any Marker** → View details and distance
3. **Monitor Operations** → Real-time view of all system activity
4. **Navigate to Incidents** → Quick access to Google Maps

## Browser Permissions Required

- **Geolocation Permission**: Required for location tracking
  - Browser will prompt user on first access
  - User must allow for tracking to work
  - Fallback coordinates used if denied

## Performance Considerations

- **Update Frequency**: Every 5 seconds or on significant position change
- **High Accuracy Mode**: Uses GPS when available (may drain battery faster)
- **Network Usage**: Minimal - only sends coordinates (< 1KB per update)
- **Battery Impact**: Moderate - continuous GPS usage
- **Firebase Costs**: Real-time database reads/writes per location update

## Privacy & Security

- Location data only accessible to:
  - System administrators
  - Assigned emergency callers (driver location only)
  - Destination hospitals (incoming ambulance location only)
- Location tracking stops immediately on logout
- No location history stored (only current/last known position)
- Users can deny geolocation permission (system will use default coordinates)

## Testing Checklist

- [ ] Driver login triggers location tracking
- [ ] Hospital login captures location coordinates
- [ ] Location updates visible in Firebase Realtime Database
- [ ] Live map shows real-time driver positions
- [ ] Distance calculations are accurate
- [ ] Google Maps navigation opens correctly
- [ ] Info windows show correct data
- [ ] Location tracking stops on logout
- [ ] System handles geolocation permission denial
- [ ] Works on mobile browsers
- [ ] Works on desktop browsers

## Future Enhancements (Recommended)

1. **Route Optimization**: Calculate fastest route considering traffic
2. **Geofencing**: Alert when driver enters/exits zones
3. **Location History**: Store historical routes for analytics
4. **Battery Optimization**: Reduce GPS accuracy when not in active emergency
5. **Offline Support**: Cache last known locations
6. **Push Notifications**: Alert on proximity to destination
7. **Multi-language Support**: Google Maps in user's language
8. **Traffic Integration**: Show live traffic conditions on map

## Troubleshooting

### Location not updating:
- Check browser geolocation permissions
- Ensure user has granted location access
- Check Firebase Realtime Database security rules
- Verify internet connection

### Google Maps not opening:
- Check if pop-up blocker is enabled
- Verify GOOGLE_MAPS_API_KEY is valid
- Ensure user clicked button (auto-open may be blocked)

### Distance calculations incorrect:
- Verify both coordinates are valid
- Check if user location is available
- Ensure Haversine formula implementation is correct

### Firebase errors:
- Check Firebase Realtime Database rules allow writes
- Verify user is authenticated
- Check Firebase quota/billing

## Support

For issues or questions about location tracking features, contact the development team or refer to:
- Firebase Documentation: https://firebase.google.com/docs
- Google Maps Platform: https://developers.google.com/maps
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
