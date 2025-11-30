# Ambulance & Driver Linking Guide

## 🎯 Overview
The system now automatically links ambulances to drivers and providers when creating or editing ambulances. All data is structured to match the dummy data format for consistency.

---

## ✨ New Features

### 1. **Driver Assignment Dropdown**
When adding or editing an ambulance, you can now:
- Select a driver from a dropdown list
- See driver name and phone number
- Only shows available drivers (not already assigned to another ambulance)
- Optional field - can leave blank if no driver assigned yet

### 2. **Provider/Hospital Selection**
Choose provider in two ways:
- **Select from database**: Dropdown shows all hospitals in the system
- **Add custom provider**: Select "+ Add Custom Provider" to enter names like:
  - ER24
  - Netcare 911
  - Provincial EMS
  - Any other emergency service provider

### 3. **Automatic Data Linking**
When you assign a driver to an ambulance:
- Driver's name is automatically added to ambulance record
- Driver's phone number is automatically added to ambulance record
- Driver's status is updated to "active"
- Driver's ambulanceId field is updated with the vehicle number

---

## 📊 Data Structure (Matches Dummy Data)

### **Ambulance Record**
```javascript
{
  id: "amb1",
  vehicleNumber: "GP-AMB-001",        // Vehicle registration
  vehicleType: "ALS",                 // ALS, BLS, CCT, or Neonatal
  type: "ALS",                        // Same as vehicleType
  capacity: "2",                      // Number of patients
  
  // Driver Information (auto-populated)
  driverId: "driver1",                // Driver's Firebase ID
  driverName: "John Smith",           // Auto-filled from driver
  driverPhone: "+27 82 123 4567",     // Auto-filled from driver
  
  // Provider Information
  provider: "ER24",                   // Hospital or service provider
  
  // System Fields
  hospitalId: "hospital_xyz",         // Hospital that owns this ambulance
  status: "available",                // available, dispatched, busy
  currentLocation: { lat, lng },      // GPS coordinates
  lastUpdated: "ISO timestamp",
  createdAt: "ISO timestamp",
}
```

### **Driver Record** (Updated on Assignment)
```javascript
{
  id: "driver1",
  name: "John Smith",
  email: "john@hospital.com",
  phone: "+27 82 123 4567",
  licenseNumber: "DL-12345",
  
  // Updated when assigned to ambulance
  ambulanceId: "GP-AMB-001",          // Vehicle number they're assigned to
  status: "active",                   // active when assigned
  
  hospitalId: "hospital_xyz",
  createdAt: "ISO timestamp",
}
```

---

## 🎮 How to Use

### **Step 1: Add Drivers First**
Before adding ambulances with assigned drivers:

1. Go to **Hospital Management** page
2. Click **"Drivers"** tab
3. Click **"Add Driver"** button
4. Fill in:
   - Full Name: `John Smith`
   - Email: `john@hospital.com`
   - Phone: `+27 82 123 4567`
   - License Number: `DL-12345`
5. Click **"Add Driver"**

**Result:** Driver is added and available for assignment

---

### **Step 2: Add Ambulance with Driver**

1. Click **"Ambulances"** tab
2. Click **"Add Ambulance"** button
3. Fill in form:

   **Vehicle Number:**
   ```
   GP-AMB-001
   ```

   **Vehicle Type:** (Dropdown)
   ```
   ✓ ALS (Advanced Life Support)  ← Selected
   ○ BLS (Basic Life Support)
   ○ CCT (Critical Care Transport)
   ○ Neonatal
   ```

   **Patient Capacity:**
   ```
   2
   ```

   **Assign Driver:** (Dropdown)
   ```
   ✓ John Smith - +27 82 123 4567  ← Selected
   -- No Driver Assigned --
   (other available drivers...)
   ```

   **Provider/Hospital:** (Dropdown)
   ```
   -- Select Provider --
   Pretoria General Hospital
   Steve Biko Academic Hospital
   ✓ Life Groenkloof Hospital      ← Selected
   + Add Custom Provider
   ```

4. Click **"Add Ambulance"**

**What Happens Behind the Scenes:**
```javascript
// Ambulance created with:
{
  vehicleNumber: "GP-AMB-001",
  vehicleType: "ALS",
  type: "ALS",
  capacity: "2",
  driverId: "driver1",
  driverName: "John Smith",              // ← Auto-filled!
  driverPhone: "+27 82 123 4567",        // ← Auto-filled!
  provider: "Life Groenkloof Hospital",
  status: "available",
  // ...other fields
}

// Driver updated automatically:
{
  id: "driver1",
  ambulanceId: "GP-AMB-001",             // ← Updated!
  status: "active",                       // ← Updated!
  // ...other fields
}
```

---

### **Step 3: Add Custom Provider**

If your provider isn't in the hospital list:

1. **Provider/Hospital** dropdown
2. Select **"+ Add Custom Provider"**
3. Text field appears below
4. Enter provider name:
   ```
   ER24
   ```
   or
   ```
   Netcare 911
   ```
   or
   ```
   Provincial EMS
   ```

5. Continue with other fields
6. Click **"Add Ambulance"**

---

### **Step 4: Edit Ambulance Assignment**

To change driver or provider:

1. Click **Edit** button (✏️) on ambulance card
2. Change dropdowns:
   - **Assign Driver**: Select different driver
   - **Provider/Hospital**: Select different provider

3. Click **"Update"**

**What Happens:**
- Old driver's `ambulanceId` is NOT cleared (could be enhanced)
- New driver's `ambulanceId` is updated to this vehicle
- Ambulance `driverName` and `driverPhone` update automatically

---

## 📋 Form Field Details

### **Vehicle Type Options**
| Code | Full Name | Description |
|------|-----------|-------------|
| ALS | Advanced Life Support | Advanced medical equipment & paramedics |
| BLS | Basic Life Support | Basic medical equipment & EMTs |
| CCT | Critical Care Transport | ICU-level equipment for transfers |
| Neonatal | Neonatal | Specialized for newborn transport |

### **Assign Driver Dropdown**
- Shows: `Name - Phone Number`
- Filters: Only drivers without ambulance assignment
- Optional: Can be left as "-- No Driver Assigned --"
- Updates: When driver selected, their info auto-fills

### **Provider/Hospital Dropdown**
- Shows: All hospitals from database
- Option: "+ Add Custom Provider" for external services
- Custom field: Appears when custom option selected
- Examples: ER24, Netcare 911, Provincial EMS

---

## 🎨 Visual Examples

### **Add Ambulance Form**
```
┌─────────────────────────────────────────────┐
│ Add Ambulance                          [✕]  │
├─────────────────────────────────────────────┤
│                                             │
│ Vehicle Number                              │
│ ┌─────────────────────────────────────────┐ │
│ │ GP-AMB-001                             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Vehicle Type                                │
│ ┌─────────────────────────────────────────┐ │
│ │ ALS (Advanced Life Support)      [▼]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Patient Capacity                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 2                                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Assign Driver (Optional)                    │
│ ┌─────────────────────────────────────────┐ │
│ │ John Smith - +27 82 123 4567     [▼]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Provider/Hospital                           │
│ ┌─────────────────────────────────────────┐ │
│ │ Steve Biko Academic Hospital     [▼]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Add Ambulance] [Cancel]                    │
└─────────────────────────────────────────────┘
```

### **Custom Provider Flow**
```
Step 1: Select "+ Add Custom Provider"
┌─────────────────────────────────────────────┐
│ Provider/Hospital                           │
│ ┌─────────────────────────────────────────┐ │
│ │ + Add Custom Provider            [▼]   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

Step 2: Text field appears
┌─────────────────────────────────────────────┐
│ Provider/Hospital                           │
│ ┌─────────────────────────────────────────┐ │
│ │ + Add Custom Provider            [▼]   │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Enter provider name (e.g., ER24...)    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### **Ambulance Card Display**
```
┌────────────────────────────────────────────────┐
│ 🚑  GP-AMB-001             [🧭] [✏️] [🗑️]     │
│     Type: ALS                                  │
│     Capacity: 2 patients                       │
│     Driver: John Smith                         │
│     Provider: ER24                             │
│     [Available]                                │
└────────────────────────────────────────────────┘
```

---

## 🔄 Workflow Example

### **Complete Setup: Hospital Adding Fleet**

```
1. Hospital Admin Login
   └─> Dashboard

2. Click "Manage Fleet"
   └─> Management Page

3. Add Drivers
   ├─> Driver 1: John Smith
   ├─> Driver 2: Sarah Johnson
   └─> Driver 3: Mike Brown

4. Add Ambulances
   ├─> Ambulance 1:
   │   ├─ Vehicle: GP-AMB-001
   │   ├─ Type: ALS
   │   ├─ Capacity: 2
   │   ├─ Driver: John Smith ← Dropdown selection
   │   └─ Provider: ER24 ← Custom entry
   │
   ├─> Ambulance 2:
   │   ├─ Vehicle: GP-AMB-002
   │   ├─ Type: BLS
   │   ├─ Capacity: 2
   │   ├─ Driver: Sarah Johnson ← Dropdown selection
   │   └─ Provider: Steve Biko Hospital ← From dropdown
   │
   └─> Ambulance 3:
       ├─ Vehicle: GP-AMB-003
       ├─ Type: CCT
       ├─ Capacity: 1
       ├─ Driver: -- No Driver Assigned -- ← Empty
       └─ Provider: Netcare 911 ← Custom entry

5. View Fleet
   ├─> 3 Ambulances created
   ├─> 2 Drivers assigned
   ├─> 1 Unassigned ambulance
   └─> All data properly linked
```

---

## 🧪 Testing Checklist

### **Driver Dropdown Tests**
- [ ] Shows all available drivers
- [ ] Displays "Name - Phone" format
- [ ] Hides drivers already assigned to other ambulances
- [ ] Shows driver being edited (even if assigned)
- [ ] "-- No Driver Assigned --" option works
- [ ] Empty state message when no drivers available

### **Provider Dropdown Tests**
- [ ] Shows all hospitals from database
- [ ] "+ Add Custom Provider" option appears
- [ ] Selecting custom shows text input field
- [ ] Custom provider text saves correctly
- [ ] Switching from custom back to dropdown works
- [ ] Edit modal loads custom provider correctly

### **Data Linking Tests**
- [ ] Driver assignment updates ambulance.driverId
- [ ] Driver name auto-fills in ambulance.driverName
- [ ] Driver phone auto-fills in ambulance.driverPhone
- [ ] Driver.ambulanceId updates with vehicle number
- [ ] Driver.status updates to "active"
- [ ] Provider saves correctly
- [ ] All fields match dummy data structure

### **UI Tests**
- [ ] Form is scrollable if too long
- [ ] Dropdowns are readable and styled
- [ ] Labels are clear
- [ ] Buttons are distinct
- [ ] Cards show driver and provider info
- [ ] Edit modal pre-fills correctly

---

## 🐛 Troubleshooting

### **"No drivers available" message shows**
**Cause:** No drivers added to your hospital yet  
**Solution:** Add drivers first before adding ambulances

### **Driver doesn't appear in dropdown**
**Cause:** Driver already assigned to another ambulance  
**Solution:** 
- Edit the other ambulance first to unassign
- Or assign this driver to current ambulance

### **Custom provider not saving**
**Cause:** Text field is required when custom selected  
**Solution:** Enter a provider name before saving

### **Driver info not showing on card**
**Cause:** Ambulance created before driver linking was implemented  
**Solution:** Edit the ambulance and re-select the driver

---

## 📊 Database Queries

### **Get Available Drivers**
```javascript
drivers.filter(d => !d.ambulanceId || d.ambulanceId === currentVehicleNumber)
```

### **Get All Hospitals**
```javascript
const hospitalsQuery = query(collection(db, 'hospitals'));
onSnapshot(hospitalsQuery, (snapshot) => {
  const hospitalsList = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
  setHospitals(hospitalsList);
});
```

### **Link Driver to Ambulance**
```javascript
// Update ambulance
await updateDoc(ambulanceRef, {
  driverId: selectedDriverId,
  driverName: driver.name,
  driverPhone: driver.phone,
});

// Update driver
await updateDoc(driverRef, {
  ambulanceId: vehicleNumber,
  status: 'active',
});
```

---

## ✅ Summary

**What's New:**
- ✅ Driver dropdown when adding/editing ambulance
- ✅ Provider dropdown with custom option
- ✅ Automatic data linking
- ✅ Driver name and phone auto-fill
- ✅ Match dummy data structure exactly
- ✅ Visual display of driver and provider on cards

**Benefits:**
- 🎯 No manual data entry for driver details
- 🔗 Automatic bidirectional linking
- 📊 Consistent data structure
- 🚀 Faster ambulance setup
- 🎨 Better user experience
- ✨ Professional provider management

**Data Integrity:**
- All ambulance records match dummy data format
- Driver linkage is automatic and consistent
- Provider can be from database or custom
- Status updates handled automatically
