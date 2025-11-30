# Webhook Integration Update

## Changes Made

### 1. Updated Webhook Response Handling

The system now matches your exact webhook response format:

#### Success Response (Driver Found):
```json
{
  "success": true,
  "driver": {
    "driverName": "Muzi Malaba",
    "vehiclePlate": "AXZ 6579",
    "location": "{\"lat\": -25.7479, \"lng\": 28.2293}"
  }
}
```

#### Failure Response (No Driver Available):
```json
{
  "success": false,
  "message": "No drivers available at the moment"
}
```

---

## 2. Key Features Implemented

### A. JSON Location Parsing ✅
- Automatically detects if location is stringified
- Parses JSON string to object
- Handles parsing errors gracefully

```javascript
let driverLocation = responseData.driver.location;
if (typeof driverLocation === 'string') {
  try {
    driverLocation = JSON.parse(driverLocation);
  } catch (e) {
    console.error('Failed to parse driver location:', e);
    driverLocation = null;
  }
}
```

### B. Client-Side ETA Calculation ✅
- Calculates distance between caller and driver locations
- Uses `calculateDistance()` from helpers
- Uses `calculateETA()` to convert distance to time estimate

```javascript
if (driverLocation && location) {
  const distance = calculateDistance(
    driverLocation.lat,
    driverLocation.lng,
    location.lat,
    location.lng
  );
  eta = calculateETA(distance);
}
```

### C. Field Name Mapping ✅
Maps webhook fields to internal structure:
- `driverName` → `name`
- `vehiclePlate` → `vehicleNumber`
- `location` → `location` (after parsing)

---

## 3. UI States

### State 1: Searching (isWaitingForDriver = true)
- Yellow spinning icon
- "Searching for Ambulance..."
- "Please wait while we find the nearest available ambulance. This usually takes 30-60 seconds."

### State 2: Success - Driver Dispatched (success = true, driverInfo exists)
- Green ambulance icon
- "Ambulance Dispatched!"
- Shows driver details card with:
  - Driver name
  - Vehicle plate number
  - Vehicle type (defaults to 'ALS' if not provided)
  - ETA (calculated)
  - Phone (if provided)
- Live map showing both locations
- "Open Live Tracking in Google Maps" button

### State 3: No Driver Available (success = false, no driverInfo)
- Blue pulsing clock icon
- "Emergency Call Received!"
- Shows custom message from webhook or default message
- Displays caller location on map only
- Shows yellow alert box:
  - "No Ambulance Available Yet"
  - "We are actively searching for the nearest ambulance..."

---

## 4. Message Handling

### Success Messages:
```javascript
`Ambulance dispatched! ${responseData.driver.driverName} is on the way.`
```

### Failure Messages (in order of priority):
1. **From webhook**: Uses `responseData.message` if provided
2. **Default**: "Please sit tight, an ambulance will be dispatched to you shortly. We are searching for the nearest available driver."
3. **On error**: "Emergency call received. Please sit tight, an ambulance will be dispatched to you shortly."

---

## 5. User Experience Flow

```
1. User submits emergency call
   ↓
2. Shows: "Searching for Ambulance..." (yellow, spinning)
   ↓
3. Webhook is called
   ↓
4a. SUCCESS PATH (driver found):
    - Shows: "Ambulance Dispatched!" (green)
    - Displays driver info card
    - Shows map with both locations
    - Calculates and shows ETA
    - Enables Google Maps tracking button
   
4b. FAILURE PATH (no driver):
    - Shows: "Emergency Call Received!" (blue, pulsing)
    - Displays custom message
    - Shows caller location only
    - Shows yellow alert about searching
```

---

## 6. Google Maps Tracking

When driver is assigned, the "Open Live Tracking in Google Maps" button creates a URL:

```javascript
const url = `https://www.google.com/maps/dir/?api=1&origin=${driverInfo.location.lat},${driverInfo.location.lng}&destination=${location.lat},${location.lng}&travelmode=driving`;
```

This opens Google Maps with:
- **Origin**: Driver's current location
- **Destination**: Caller's location
- **Mode**: Driving directions

---

## 7. Complete Webhook Response Examples

### Example 1: Successful Dispatch
```json
{
  "success": true,
  "driver": {
    "driverName": "Muzi Malaba",
    "vehiclePlate": "AXZ 6579",
    "location": "{\"lat\": -25.7479, \"lng\": 28.2293}",
    "vehicleType": "ALS",
    "phone": "+27 82 123 4567"
  }
}
```

**Result**: 
- Shows driver card
- ETA: Calculated (e.g., "8 mins")
- Map with both markers
- Google Maps button enabled

### Example 2: No Drivers Available
```json
{
  "success": false,
  "message": "All ambulances are currently dispatched. We are searching for the nearest available unit."
}
```

**Result**:
- Blue clock icon
- Custom message displayed
- Yellow alert box
- Caller location shown only

### Example 3: Minimal Success Response
```json
{
  "success": true,
  "driver": {
    "driverName": "John Smith",
    "vehiclePlate": "GP 1234",
    "location": "{\"lat\": -25.8, \"lng\": 28.3}"
  }
}
```

**Result**:
- Shows driver card
- Vehicle Type: Defaults to "ALS"
- Phone: Not shown (not provided)
- ETA: Calculated
- Map and tracking work normally

---

## 8. Error Handling

### Scenario 1: Stringified Location Parsing Fails
```javascript
// If JSON.parse fails
driverLocation = null;
// Result: No map tracking, but other info still shown
```

### Scenario 2: Webhook Request Fails
```javascript
catch (webhookError) {
  // Shows generic message
  // Stops waiting animation
  // Shows caller location only
}
```

### Scenario 3: Webhook Returns Error Status
```javascript
if (!webhookResponse.ok) {
  // Shows: "Please sit tight, an ambulance will be dispatched to you shortly."
}
```

---

## 9. Testing Checklist

Test with your webhook:

- [ ] Success response with all fields populated
- [ ] Success response with minimal fields (no phone, no vehicleType)
- [ ] Success response with stringified location
- [ ] Success response with parsed location object
- [ ] Failure response with custom message
- [ ] Failure response without message
- [ ] Network error / webhook timeout
- [ ] Invalid JSON response

---

## 10. Code Location

**File Modified**: `src/components/EmergencyCaller.jsx`

**Lines Changed**: ~78-158 (webhook handling) and ~177-317 (UI rendering)

**Functions Updated**:
- `handleSubmitEmergency()` - Enhanced webhook response handling
- Render function - Updated UI states and feedback

---

## Notes

1. **ETA is approximate** - Based on straight-line distance, not actual road distance
2. **Location must be in valid format** - Either object `{lat, lng}` or stringified JSON
3. **Phone is optional** - System works without it
4. **Vehicle type defaults to "ALS"** - If not provided by webhook
5. **All messages are customizable** - Edit in EmergencyCaller.jsx if needed

---

## Summary

✅ Webhook response format matches your specification  
✅ Handles stringified JSON location  
✅ Calculates ETA on client side  
✅ Shows proper feedback for success/failure  
✅ Displays driver details when assigned  
✅ Live map tracking with Google Maps integration  
✅ Graceful error handling throughout  

The system is now fully integrated with your webhook format!
