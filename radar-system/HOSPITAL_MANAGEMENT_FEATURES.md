# Hospital Management Features - Complete Guide

## Overview
The Radar System now includes comprehensive hospital management capabilities allowing each hospital to manage their own drivers and ambulances, with advanced real-time tracking features including route visualization and live Google Maps integration.

---

## 🚀 New Features

### 1. **Hospital-Specific Driver & Ambulance Management**

Each hospital can now independently manage their fleet:

#### **Driver Management (CRUD Operations)**
- ✅ **Add Drivers**: Register new drivers with complete details
- ✅ **Edit Drivers**: Update driver information
- ✅ **Delete Drivers**: Remove drivers from the system
- ✅ **View All Drivers**: See complete list of hospital's drivers
- ✅ **Track Drivers**: Real-time location tracking

**Driver Information Captured:**
- Full Name
- Email Address
- Phone Number
- License Number
- Current Status (available, on-duty, off-duty)
- Real-time GPS Location (when logged in)

#### **Ambulance Management (CRUD Operations)**
- ✅ **Add Ambulances**: Register new ambulances to fleet
- ✅ **Edit Ambulances**: Update vehicle information
- ✅ **Delete Ambulances**: Remove ambulances from system
- ✅ **View All Ambulances**: Complete fleet overview
- ✅ **Track Ambulances**: Real-time location tracking

**Ambulance Information Captured:**
- Vehicle Number (e.g., GP-AMB-001)
- Vehicle Type:
  - Basic Life Support (BLS)
  - Advanced Life Support (ALS)
  - Critical Care Transport (CCT)
  - Neonatal
- Patient Capacity (1-10)
- Current Status (available, dispatched, busy)
- Assigned Driver ID
- Real-time GPS Location (when active)

---

### 2. **Advanced Tracking with Route Lines**

#### **Track Button Functionality**
When you click "Track" on any driver or ambulance:

1. **Opens Modal Map**: Full-screen map view with tracking details
2. **Shows Route Line**: Blue polyline connecting:
   - 🟣 **Your Location** (Purple marker)
   - 🟢/🔵 **Tracked Entity** (Green for driver, Blue for ambulance)
3. **Displays Distance**: Real-time distance calculation in kilometers
4. **Live Updates**: Position updates automatically as entity moves
5. **Coordinate Display**: Shows exact lat/long coordinates
6. **Last Update Time**: Timestamp of last location ping

**Visual Elements:**
```
Route Line: 
- Color: Cyan blue (#0EA5E9)
- Opacity: 80%
- Weight: 3px
- Style: Solid line directly connecting two points
```

---

### 3. **Live Tracking via Google Maps**

#### **"Open Live Tracking in Google Maps" Button**

This powerful feature provides real-time turn-by-turn navigation:

**What it does:**
1. Opens Google Maps app (mobile) or website (desktop)
2. Sets your current location as starting point
3. Sets tracked entity's location as destination
4. Enables driving mode with live traffic
5. Provides turn-by-turn directions
6. Shows real-time ETA and distance
7. Updates automatically as both parties move

**How it works:**
```javascript
// Deep linking format
https://www.google.com/maps/dir/?api=1
  &origin={your_lat},{your_lng}
  &destination={target_lat},{target_lng}
  &travelmode=driving
```

**User Experience:**
- **On Mobile**: Opens native Google Maps app with full navigation
- **On Desktop**: Opens Google Maps in browser with route guidance
- **Works Offline**: Once route loaded, continues navigation
- **Live Updates**: Both locations update in real-time
- **Rerouting**: Automatic rerouting if you deviate from route

---

## 📱 User Interface

### **Hospital Management Page** (`/hospital/management`)

#### **Navigation Tabs**
```
┌─────────────────────────────────────┐
│  [Drivers]  [Ambulances]            │
└─────────────────────────────────────┘
```

#### **Driver Card Layout**
```
┌───────────────────────────────────────────────────┐
│  👤  John Doe                     [Track] [✏️] [🗑️] │
│      john@hospital.com                            │
│      +27 123 4567                                 │
│      License: DL-12345                            │
│      [Available]                                  │
└───────────────────────────────────────────────────┘
```

#### **Ambulance Card Layout**
```
┌───────────────────────────────────────────────────┐
│  🚑  GP-AMB-001                   [Track] [✏️] [🗑️] │
│      Type: Advanced Life Support                  │
│      Capacity: 2 patients                         │
│      [Available]                                  │
└───────────────────────────────────────────────────┘
```

#### **Tracking Modal**
```
┌─────────────────────────────────────────────────────┐
│  Tracking: John Doe                            [✕]  │
│  Distance: 5.42 km                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│         [         MAP VIEW         ]                │
│         🟣 (Your Location)                          │
│          \                                          │
│           \ (Blue route line)                       │
│            \                                        │
│             🟢 (Tracked Driver)                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📍 Current Location                                │
│  Coordinates: -25.7479, 28.2293                     │
│  Last Update: 11/21/2025, 2:30:45 PM               │
├─────────────────────────────────────────────────────┤
│  [ 🌍 Open Live Tracking in Google Maps ]          │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow Examples

### **Scenario 1: Adding a New Driver**

1. **Navigate**: Hospital Admin Dashboard → "Manage Drivers & Ambulances"
2. **Click**: "Add Driver" button
3. **Fill Form**:
   - Name: Sarah Johnson
   - Email: sarah@hospital.com
   - Phone: +27 123 4567
   - License: DL-67890
4. **Submit**: Driver is added to your hospital's fleet
5. **Firebase**: Automatically creates record with `hospitalId` link
6. **Ready**: Driver can now log in and be tracked

### **Scenario 2: Tracking an Active Driver**

1. **View Drivers**: See list of all your drivers
2. **Click "Track"**: On driver currently on duty
3. **Map Opens**: Shows your location and driver's location
4. **Route Line**: Blue line connects the two points
5. **View Distance**: "Distance: 3.2 km"
6. **Live Updates**: Position updates every 5 seconds
7. **Navigate**: Click "Open Live Tracking in Google Maps"
8. **Google Maps Opens**: 
   - Shows full route
   - Turn-by-turn directions
   - Live ETA
   - Traffic conditions
9. **Track in Real-Time**: Follow driver's progress to destination

### **Scenario 3: Emergency Response with Live Tracking**

**Timeline:**
```
00:00 - Emergency call received
00:01 - Hospital assigns Driver (John) + Ambulance (GP-AMB-001)
00:02 - Hospital clicks "Track" on John
00:03 - Modal opens showing:
        • Hospital location: 🟣
        • Driver location: 🟢 (5.8 km away)
        • Blue route line connecting them
00:04 - Hospital clicks "Open Live Tracking in Google Maps"
00:05 - Google Maps opens with full navigation
00:06 - Hospital monitors:
        • John's real-time location
        • Distance: 5.8 → 5.1 → 4.6 → ...
        • ETA: 8 mins
        • Route with traffic
00:14 - John arrives at caller location
00:15 - Status changes to "Transporting"
00:16 - Track shows new route: Caller → Hospital
00:17 - Hospital staff prepares emergency room
00:25 - John arrives at hospital
```

---

## 🔐 Database Structure

### **Drivers Collection** (`drivers`)
```javascript
{
  id: "driver123",
  name: "John Doe",
  email: "john@hospital.com",
  phone: "+27 123 4567",
  licenseNumber: "DL-12345",
  hospitalId: "hospital_xyz",  // Links to specific hospital
  status: "available",
  createdAt: "2025-11-21T10:00:00Z",
  updatedAt: "2025-11-21T14:30:00Z"
}
```

### **Ambulances Collection** (`ambulances`)
```javascript
{
  id: "amb123",
  vehicleNumber: "GP-AMB-001",
  vehicleType: "Advanced Life Support",
  capacity: "2",
  hospitalId: "hospital_xyz",  // Links to specific hospital
  status: "available",
  driverId: null,
  createdAt: "2025-11-21T10:00:00Z",
  updatedAt: "2025-11-21T14:30:00Z"
}
```

### **Real-Time Location Database** (`locations/drivers/{userId}`)
```javascript
{
  lat: -25.7479,
  lng: 28.2293,
  timestamp: "2025-11-21T14:35:22Z",
  accuracy: 10,
  status: "on-duty",
  assignedCallId: "call456"
}
```

---

## 🎯 Key Benefits

### **For Hospitals:**
1. ✅ **Complete Control**: Manage your own fleet independently
2. ✅ **Real-Time Visibility**: Know where every driver/ambulance is
3. ✅ **Better Coordination**: Track incoming ambulances for preparation
4. ✅ **Resource Management**: See which vehicles are available
5. ✅ **Performance Tracking**: Monitor driver activity and response times
6. ✅ **Easy Updates**: Modify driver/vehicle info instantly

### **For Drivers:**
1. ✅ **Proper Registration**: Official assignment to hospital
2. ✅ **Status Tracking**: Availability clearly indicated
3. ✅ **Location Privacy**: Only tracked when logged in
4. ✅ **Clear Assignment**: Know which vehicle assigned to

### **For Emergency Response:**
1. ✅ **Faster Coordination**: Hospital sees exactly where driver is
2. ✅ **Better Preparation**: Track incoming ambulance to prepare ER
3. ✅ **Live Communication**: Share Google Maps live location
4. ✅ **Distance Awareness**: Know exact distance and ETA
5. ✅ **Route Optimization**: See traffic and best route

---

## 🛠️ Technical Implementation

### **Components Created:**
- `HospitalManagement.jsx` - Main management interface
- Complete CRUD operations for drivers/ambulances
- Real-time tracking with route visualization
- Google Maps integration

### **Key Technologies:**
- **Firebase Firestore**: Persistent data storage (drivers, ambulances)
- **Firebase Realtime DB**: Live location tracking
- **Google Maps JavaScript API**: Map rendering and markers
- **Google Maps Polyline**: Route line visualization
- **Google Maps Deep Linking**: Live navigation
- **React Hooks**: State management and real-time subscriptions

### **Real-Time Subscriptions:**
```javascript
// Subscribe to driver location updates
subscribeToUserLocation(driverId, 'driver', (location) => {
  // Updates every 5 seconds
  console.log('Driver moved:', location);
});
```

### **Route Line Drawing:**
```javascript
<Polyline
  path={[userLocation, trackedLocation]}
  options={{
    strokeColor: '#0EA5E9',
    strokeOpacity: 0.8,
    strokeWeight: 3
  }}
/>
```

---

## 📊 Use Case: Multi-Hospital System

### **Hospital A** (Steve Biko Academic)
```
Drivers:
- Sarah Johnson (Available)
- Mike Chen (On Duty)
- David Smith (Off Duty)

Ambulances:
- GP-AMB-001 (Available)
- GP-AMB-002 (Dispatched - Mike Chen)
- GP-AMB-003 (Maintenance)
```

### **Hospital B** (Kalafong Hospital)
```
Drivers:
- Emily Watson (Available)
- John Mthembu (On Duty)

Ambulances:
- GP-AMB-101 (Available)
- GP-AMB-102 (Dispatched - John Mthembu)
```

**Key Point**: Each hospital manages their fleet independently. Hospital A cannot see/modify Hospital B's drivers/ambulances.

---

## 🚨 Error Handling

### **Location Not Available**
```
⚠️ Waiting for location data...
Make sure the driver is logged in and location tracking is enabled.
```

### **No GPS Permission**
```
❌ Location access denied
Driver must enable location permissions in browser.
```

### **Google Maps Failed**
```
❌ Unable to open Google Maps
Check internet connection and pop-up blocker settings.
```

---

## 📱 Mobile vs Desktop Experience

### **Mobile (Recommended for Field Use)**
- **Track Button**: Opens full-screen map modal
- **Live Tracking Button**: Opens native Google Maps app
- **Experience**: Seamless app-to-app navigation
- **Features**: Full turn-by-turn voice guidance
- **Offline**: Works with cached maps

### **Desktop (Recommended for Hospital Control)**
- **Track Button**: Opens map modal in browser
- **Live Tracking Button**: Opens Google Maps website
- **Experience**: New browser tab with route
- **Features**: Large screen overview, multiple tracking
- **Advantage**: Monitor multiple drivers simultaneously

---

## 🔒 Security & Privacy

### **Access Control**
- ✅ Each hospital only sees their own drivers/ambulances
- ✅ `hospitalId` enforced in all database queries
- ✅ Firebase security rules prevent cross-hospital access
- ✅ Location tracking requires authentication

### **Data Protection**
- ✅ Location only tracked when user logged in
- ✅ Tracking stops immediately on logout
- ✅ No location history stored (only current position)
- ✅ Driver can deny location permission

---

## 🎓 Training Guide

### **For Hospital Administrators:**

1. **Add Your Fleet**
   - Click "Manage Drivers & Ambulances"
   - Add all drivers with complete information
   - Add all ambulances with vehicle details

2. **Track in Emergency**
   - When emergency assigned, click "Track" on driver
   - Monitor their approach to caller
   - Use "Live Tracking" for real-time navigation
   - Prepare ER based on ETA

3. **Update Information**
   - Click edit icon (✏️) to update details
   - Keep driver phone numbers current
   - Update vehicle maintenance status

4. **Remove Inactive Assets**
   - Click delete icon (🗑️) to remove
   - Confirm deletion
   - Cannot be undone

### **For Drivers:**

1. **Get Registered**
   - Hospital admin adds you to system
   - Receive login credentials
   - Log in to driver dashboard

2. **Enable Location**
   - Browser will request location permission
   - Click "Allow" to enable tracking
   - Your location visible to your hospital only

3. **Stay Logged In**
   - Keep app open during shift
   - Location updates automatically
   - Hospital can track you during emergencies

---

## 🔄 Future Enhancements

### **Planned Features:**
- [ ] Driver performance analytics
- [ ] Ambulance maintenance scheduling
- [ ] Shift management and scheduling
- [ ] Automatic driver-ambulance assignment
- [ ] Route history and playback
- [ ] Geofencing for hospital zones
- [ ] Driver rating system
- [ ] Vehicle fuel tracking
- [ ] Multi-hospital collaboration
- [ ] Predictive dispatch based on location

---

## 📞 Support

### **Common Questions:**

**Q: Can I assign a driver to a specific ambulance?**
A: Currently drivers and ambulances are managed separately. Assignment happens during dispatch.

**Q: What if Google Maps doesn't open?**
A: Check pop-up blocker settings and ensure internet connection is active.

**Q: How often does location update?**
A: Every 5 seconds when driver is logged in and moving.

**Q: Can I see historical routes?**
A: Not yet - only current location is tracked. Historical routes planned for future release.

**Q: What if driver's battery dies?**
A: Last known location remains visible. No updates until driver comes back online.

---

## 🎉 Summary

The new Hospital Management system provides:
- ✅ Complete driver/ambulance fleet management
- ✅ Real-time GPS tracking with route lines
- ✅ Live Google Maps navigation integration
- ✅ Distance calculations and ETA monitoring
- ✅ Independent hospital fleet management
- ✅ Seamless mobile and desktop experience

**Result**: Faster emergency response, better coordination, and improved patient outcomes through advanced real-time tracking technology.
