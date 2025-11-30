# Radar System - Quick Start Guide

## 🚀 What You Should See After Login

### **Admin Account (role: admin)**

After logging in with admin credentials:

**URL:** `http://localhost:5174/admin` (or 5173)

**What you should see:**

1. **Header**: "System Administrator - Radar Emergency Response System"
2. **Sidebar** (left side) with menu items:
   - Dashboard
   - Live Map
   - Traffic
   - Hospitals
   - Ambulances
   - Drivers
   - Emergency Calls

3. **Main Content Area**:
   - **System Overview** card with stats:
     - Number of Hospitals
     - Number of Ambulances
     - Number of Drivers
     - Active Calls
   - **Quick Action Cards**:
     - Live Tracking (view all ambulances)
     - Traffic Conditions

4. **Navigation**: Click any sidebar item to view that section

---

### **Hospital Account (role: hospital)**

After logging in with hospital credentials:

**URL:** `http://localhost:5174/hospital`

**What you should see:**

1. **Header**: "{Hospital Name} - Hospital Management Dashboard"

2. **Quick Actions Banner** (teal/cyan gradient):
   - **"Manage Fleet"** button (Drivers & Ambulances)
   - **"Track Vehicles"** button (Real-time Location)

3. **Hospital Location Tracker**:
   - Blue box showing current coordinates

4. **Capacity Stats** (4 cards):
   - Total Units
   - Occupied
   - Available
   - Occupancy %

5. **Patient Management Section**:
   - "Check In Patient" button
   - List of current patients
   - Check out functionality

**To access new features:**
- Click **"Manage Fleet"** or **"Track Vehicles"** button
- This takes you to: `/hospital/management`

---

### **Hospital Management Page** (`/hospital/management`)

**URL:** `http://localhost:5174/hospital/management`

**What you should see:**

1. **Header**: "Hospital Management - Manage Drivers & Ambulances"

2. **Tab Navigation**:
   - [Drivers] tab (active)
   - [Ambulances] tab

3. **Drivers Tab**:
   - "Add Driver" button (top right)
   - List of your hospital's drivers (empty if none added)
   - Each driver card has:
     - Name, email, phone, license
     - Status badge (available/on-duty/off-duty)
     - Three action buttons:
       - 🧭 **Track** (blue) - Opens map with route line
       - ✏️ **Edit** (gray) - Edit driver details
       - 🗑️ **Delete** (red) - Remove driver

4. **Ambulances Tab**:
   - "Add Ambulance" button (top right)
   - List of your hospital's ambulances (empty if none added)
   - Each ambulance card has:
     - Vehicle number, type, capacity
     - Status badge (available/dispatched/busy)
     - Three action buttons:
       - 🧭 **Track** (blue) - Opens map with route line
       - ✏️ **Edit** (gray) - Edit ambulance details
       - 🗑️ **Delete** (red) - Remove ambulance

---

## 🎯 Step-by-Step: Testing the New Features

### **Test 1: Add a Driver**

1. Login as hospital admin
2. Click "Manage Fleet" button
3. You should see "Drivers" tab selected
4. Click "Add Driver" button
5. Fill in the form:
   - Full Name: `John Doe`
   - Email: `john@hospital.com`
   - Phone: `+27 123 4567`
   - License: `DL-12345`
6. Click "Add Driver"
7. You should see success message
8. Driver card appears in the list

### **Test 2: Add an Ambulance**

1. Click "Ambulances" tab
2. Click "Add Ambulance" button
3. Fill in the form:
   - Vehicle Number: `GP-AMB-001`
   - Vehicle Type: `Advanced Life Support`
   - Capacity: `2`
4. Click "Add Ambulance"
5. You should see success message
6. Ambulance card appears in the list

### **Test 3: Track a Driver (with route line)**

1. Go to Drivers tab
2. Click the blue "Track" button (🧭) on a driver
3. **Modal should open** showing:
   - Map with your location (purple marker 🟣)
   - Driver location (green marker 🟢)
   - **Blue polyline connecting the two points**
   - Distance display (e.g., "Distance: 5.42 km")
   - Coordinates and last update time
4. **"Open Live Tracking in Google Maps"** button at bottom

### **Test 4: Live Tracking with Google Maps**

1. While in tracking modal (from Test 3)
2. Click **"Open Live Tracking in Google Maps"** button
3. **Google Maps should open** in new tab/app with:
   - Your current location as starting point
   - Tracked entity as destination
   - Route shown with driving directions
   - Turn-by-turn navigation available

---

## 🔍 Troubleshooting

### **Issue: Admin page shows blank screen**

**Fixed!** The SystemAdmin component was missing its main return statement. This has been corrected.

**What to check:**
1. Open browser console (F12)
2. Look for JavaScript errors
3. Verify URL is correct: `/admin`
4. Try refreshing the page (Ctrl+R or Cmd+R)

### **Issue: Hospital page doesn't show new buttons**

**Fixed!** The HospitalAdmin component now has prominent "Manage Fleet" and "Track Vehicles" buttons.

**What to check:**
1. URL should be `/hospital` (not `/hospital/management`)
2. You should see a teal/cyan gradient banner
3. Two large white buttons should be visible
4. If not, try clearing cache and refreshing

### **Issue: "Manage Fleet" button doesn't work**

**What to check:**
1. Open browser console (F12)
2. Click the button
3. Check if URL changes to `/hospital/management`
4. Verify you're logged in as hospital role
5. Check for navigation errors in console

### **Issue: No drivers/ambulances showing**

**This is normal!** When you first access the management page:
- Driver list will be empty (you need to add them)
- Ambulance list will be empty (you need to add them)
- You should see message: "No drivers added yet" or "No ambulances added yet"

**Action:** Use "Add Driver" or "Add Ambulance" buttons to create entries

### **Issue: Track button doesn't show route line**

**Possible reasons:**
1. **No location data**: Driver/ambulance must be logged in for location tracking
2. **Browser location denied**: Grant location permission to browser
3. **Google Maps API**: Verify API key is valid

**To test without real drivers:**
- The modal will still open
- It will show a "Waiting for location data..." message
- This is expected behavior when entity is not logged in

### **Issue: Google Maps doesn't open**

**Check:**
1. **Pop-up blocker**: Disable for this site
2. **Internet connection**: Must be online
3. **Browser console**: Check for errors
4. **Location permission**: Browser needs your location

---

## 📝 Test Credentials

### **Admin Account**
```
Email: admin@radar.com
Password: admin123
Expected: /admin route
```

### **Hospital Account**
```
Email: hospital@radar.com
Password: hospital123
Expected: /hospital route
```

### **Driver Account**
```
Email: driver@radar.com
Password: driver123
Expected: /driver route
```

---

## 🗺️ Route Map

```
Login (/login)
  │
  ├─ Admin Role → /admin
  │   └─ System Admin Dashboard
  │       ├─ Sidebar navigation
  │       └─ Stats and quick actions
  │
  ├─ Hospital Role → /hospital
  │   ├─ Hospital Admin Dashboard
  │   │   ├─ Quick Actions (Manage Fleet, Track Vehicles)
  │   │   ├─ Patient Management
  │   │   └─ Capacity Stats
  │   │
  │   └─ Click "Manage Fleet" → /hospital/management
  │       ├─ Drivers Tab
  │       │   ├─ Add Driver
  │       │   ├─ Edit Driver
  │       │   ├─ Delete Driver
  │       │   └─ Track Driver (opens modal with map + route line)
  │       │
  │       └─ Ambulances Tab
  │           ├─ Add Ambulance
  │           ├─ Edit Ambulance
  │           ├─ Delete Ambulance
  │           └─ Track Ambulance (opens modal with map + route line)
  │
  └─ Driver Role → /driver
      └─ Ambulance Driver Dashboard
```

---

## ✅ Expected Behavior Summary

### **Admin Login:**
✅ See full dashboard with sidebar  
✅ View system overview stats  
✅ Navigate between sections  
✅ Access live map and traffic  
✅ Manage hospitals, ambulances, drivers  

### **Hospital Login:**
✅ See hospital dashboard with stats  
✅ See prominent "Manage Fleet" button  
✅ See "Track Vehicles" button  
✅ Manage patient check-ins  
✅ View occupancy statistics  

### **Hospital Management Page:**
✅ Switch between Drivers/Ambulances tabs  
✅ Add new drivers with form  
✅ Add new ambulances with form  
✅ Edit existing entries  
✅ Delete entries  
✅ **Track button opens map modal**  
✅ **Map shows route line between locations**  
✅ **"Live Tracking" button opens Google Maps**  

---

## 🎨 Visual Reference

### **Admin Dashboard Should Look Like:**
```
┌─────────────────────────────────────────────────────┐
│ [Header] System Administrator                      │
├─────────┬───────────────────────────────────────────┤
│ SIDEBAR │ MAIN CONTENT                             │
│         │                                           │
│ Dash    │ [System Overview - Purple/Blue Gradient] │
│ Live    │ 📊 5 Hospitals | 12 Ambulances | etc.    │
│ Traffic │                                           │
│ Hosp    │ [Quick Actions]                          │
│ Ambu    │ 🗺️ Live Tracking | 🚦 Traffic           │
│ Driv    │                                           │
│ Calls   │                                           │
└─────────┴───────────────────────────────────────────┘
```

### **Hospital Dashboard Should Look Like:**
```
┌─────────────────────────────────────────────────────┐
│ [Header] Steve Biko Hospital                       │
├─────────────────────────────────────────────────────┤
│ [Quick Actions - Teal/Cyan Gradient]               │
│                                                     │
│  👥 Manage Fleet        🚑 Track Vehicles          │
│     Drivers & Ambo         Real-time Location      │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📍 Hospital Location Tracked                       │
│    Coordinates: -25.7479, 28.2293                  │
├─────────────────────────────────────────────────────┤
│ [Stats Cards]                                       │
│ 🏥 Total: 50 | 🟠 Occupied: 35 | 🟢 Available: 15  │
└─────────────────────────────────────────────────────┘
```

### **Management Page Should Look Like:**
```
┌─────────────────────────────────────────────────────┐
│ [Header] Hospital Management                       │
├─────────────────────────────────────────────────────┤
│ [Drivers] [Ambulances]                   [+ Add]   │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐       │
│ │ 👤 John Doe              [🧭] [✏️] [🗑️]  │       │
│ │    john@hospital.com                     │       │
│ │    +27 123 4567                          │       │
│ │    License: DL-12345                     │       │
│ │    [Available]                           │       │
│ └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### **Tracking Modal Should Look Like:**
```
┌─────────────────────────────────────────────────────┐
│ Tracking: John Doe                            [✕]  │
│ Distance: 5.42 km                                   │
├─────────────────────────────────────────────────────┤
│ [        GOOGLE MAP VIEW         ]                 │
│                                                     │
│        🟣 Your Location                            │
│         \                                          │
│          \ (Blue Line)                             │
│           \                                        │
│            🟢 John Doe                             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📍 Current Location                                │
│ Coordinates: -25.7479, 28.2293                     │
│ Last Update: 11/21/2025, 2:30 PM                  │
├─────────────────────────────────────────────────────┤
│ [ 🌍 Open Live Tracking in Google Maps ]          │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Developer Tools

### **Check Console for Errors:**
1. Press F12 (Windows) or Cmd+Option+I (Mac)
2. Click "Console" tab
3. Look for red error messages
4. Common issues:
   - "Cannot read property of undefined" → Check data loading
   - "Network error" → Check Firebase connection
   - "Google Maps API" → Check API key

### **Check Network Tab:**
1. F12 → Network tab
2. Refresh page
3. Look for failed requests (red)
4. Check Firebase calls are succeeding

### **React DevTools:**
1. Install React DevTools browser extension
2. F12 → Components tab
3. Inspect component state and props
4. Verify currentUser and userRole are set correctly

---

## 📞 Need Help?

If you're still seeing issues:

1. **Clear browser cache**: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. **Hard refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. **Check browser console**: F12 → Console tab
4. **Verify dev server is running**: Should see "Local: http://localhost:5174/"
5. **Check file was saved**: Verify edits were applied
6. **Restart dev server**:
   - Stop server (Ctrl+C)
   - Run: `npm run dev`

**Everything should now be visible and working!** 🎉
