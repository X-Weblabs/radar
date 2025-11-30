import React from 'react';

const credentials = [
  {
    role: 'Radar System Admin',
    email: 'admin@radar.com',
    password: 'admin123',
    abilities: [
      'Full visibility over emergency calls, hospitals, ambulances, and drivers',
      'Controls dispatch policies and monitors live timelines',
      'Ideal for supervisors coordinating the entire network'
    ],
  },
  {
    role: 'Hospital Admin (Mpilo Hospital)',
    email: 'adminmpilo@gmail.com',
    password: '12345678',
    abilities: [
      'Manages hospital capacity, beds, patients, and assigned ambulances',
      'Sees only calls routed to their hospital',
      'Tracks inbound ambulances and can admit or discharge patients'
    ],
  },
  {
    role: 'Driver Hope',
    email: 'hope@gmail.com',
    password: '12345678',
    abilities: [
      'Uses the driver dashboard for live navigation and dispatch handling',
      'Updates status automatically by following the in-app workflow',
    ],
  },
  {
    role: 'Driver Gigi',
    email: 'gigi@gmail.com',
    password: '12345678',
    abilities: [
      'Same permissions as Hope — ideal for multi-driver demos'
    ],
  },
];

const SystemDocs = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg border border-gray-200 rounded-2xl p-8 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Radar Emergency Response</p>
          <h1 className="text-2xl font-bold text-gray-900">System Overview & Demo Guide</h1>
          <p className="text-sm text-gray-600">
            Use these demo accounts to experience each part of the platform. The system links every login to
            its permitted actions, so even non-technical testers can explore without breaking live data.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Demo Accounts & Permissions</h2>
          <div className="grid gap-4">
            {credentials.map((account) => (
              <div key={account.email} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{account.role}</p>
                    <p className="text-xs text-gray-500">{account.email} • Password: {account.password}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Demo Login</span>
                </div>
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                  {account.abilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Who Does What?</h2>
          <div className="grid gap-3 text-sm text-gray-700">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900">System Admin (/admin)</h3>
              <p className="mt-1 text-xs text-gray-600">
                Oversees every call, hospital, ambulance, and driver. Ideal for demonstrating the live timeline
                and dispatch monitoring described in the provided system guides.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900">Hospital Admin (/hospital)</h3>
              <p className="mt-1 text-xs text-gray-600">
                Focuses on a single facility’s capacity, patients, and inbound calls. They only see the calls
                assigned to their hospital, making it easy to show role-based restrictions.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900">Ambulance Drivers (/driver)</h3>
              <p className="mt-1 text-xs text-gray-600">
                Receive dispatches, run live navigation, and push their location/status back to the database.
                Their screens highlight current calls, patient details, and "Forward Dispatch" actions.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Driver Login, Availability & Onboarding</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <ol className="list-decimal list-inside space-y-2">
              <li>Drivers <strong>must</strong> log in via <span className="font-mono text-xs">/login</span> and select the Driver tab (use Hope or Gigi credentials) before they show up in dispatch lists.</li>
              <li>On first load, the dashboard stores their current GPS coordinates (or the default Bulawayo center) and marks the driver <strong>available</strong>. Without this login, the database will not have their latest status or location.</li>
              <li>When a dispatch appears, pressing “Arrived at Caller” or “Delivered to Hospital” updates Firestore in real time, so admins see live state changes.</li>
              <li>If a driver needs to be added to the platform, hospital admins create the account in the Hospital Admin dashboard under “Drivers → Add Driver”.</li>
            </ol>
            <p className="text-xs text-gray-600">
              Tip: Keep location services enabled on mobile to show live tracking; desktop demos will use the Bulawayo default center but still toggle status correctly as long as the driver stays logged in.
            </p>
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              Reminder: A driver who has not logged in recently will remain invisible to the AI dispatcher. Always sign in the driver first so they are marked available and their coordinates hit the database.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Ambulance Fleet Management</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Hospital admins can add ambulances from the “Ambulances” tab in their dashboard. Each ambulance can be linked to a driver so that dispatches automatically know which vehicle is responding.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>New ambulances inherit the hospital’s coordinates by default and show up on the live map.</li>
              <li>Assigning a driver updates both the ambulance and driver records so the pairing is obvious to admins and to the AI dispatcher.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Paramedics Management</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <p>
              Hospital admins can assign paramedics to ambulances to track medical personnel on each vehicle. This helps coordinate emergency response teams and ensures drivers know who is working alongside them.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Adding Paramedics (Hospital Admin)</h3>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
                <li>Navigate to the <strong>Ambulances</strong> tab in the Hospital Admin dashboard.</li>
                <li>When adding a new ambulance, use the <strong>Paramedics</strong> input field at the bottom of the form.</li>
                <li>Type a paramedic's name and press <strong>comma</strong> or <strong>Enter</strong> to add them as a chip.</li>
                <li>Add multiple paramedics by repeating the process — each name appears as a purple chip.</li>
                <li>Click the <strong>X</strong> on any chip to remove a paramedic before saving.</li>
                <li>For existing ambulances, click the <strong>Edit</strong> button on the ambulance card to modify paramedics.</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Viewing Paramedics (Hospital Admin)</h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li>Each ambulance card in the Ambulances tab displays assigned paramedics as purple chips.</li>
                <li>The vehicle type is shown in full (e.g., "Advanced Life Support" instead of "ALS").</li>
                <li>Click <strong>Edit</strong> to see all paramedics and make changes as needed.</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Driver View — "Assigned Ambulance" Card</h3>
              <p className="text-xs text-gray-700 mb-2">
                Drivers see their assigned ambulance details in a dedicated card below "Quick Stats" on their dashboard:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li><strong>Vehicle Plates</strong> — The ambulance registration number.</li>
                <li><strong>Vehicle Type</strong> — Shows "Advanced Life Support" or "Basic Life Support".</li>
                <li><strong>Provider</strong> — The ambulance service provider.</li>
                <li><strong>Paramedics on Board</strong> — All assigned paramedics displayed as purple chips so drivers know exactly who is with them on calls.</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                If no paramedics are assigned, the card shows "No paramedics assigned". If no ambulance is linked to the driver, a placeholder message appears instead.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">How the AI Chooses Drivers & Hospitals</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <p>
              Every emergency call triggers the AI webhook (<span className="font-mono text-xs">/webhook/emergency-dispatch</span>). The automation inspects all drivers marked <strong>available</strong> and selects the nearest one based on live coordinates. If a driver is busy, they’re ignored until their status returns to available.
            </p>
            <p>
              Once the patient is onboard, the driver view suggests the nearest hospital that currently has open units. Hospitals broadcast their capacity, so the AI (and the driver) always sees which facility can accept a patient immediately.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Handling Dispatch Forwards & Fallbacks</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <p>
              Drivers can tap “Forward Dispatch” if they cannot complete the call (e.g., mechanical issues). The system captures the reason, marks the call as forwarded, and notifies the AI via the same webhook so it can dispatch the next closest available driver automatically.
            </p>
            <p>
              Admins see the forward reason on the timeline and history lists, making it clear why a call switched drivers. The patient stays informed because the emergency caller screen shows when a dispatch is reassigning.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">How the Workflow Fits Together</h2>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
            <li><strong>Emergency Caller (/)</strong>: submits a request that appears instantly in the admin dashboards and triggers the AI dispatch webhook, which assigns the closest available driver.</li>
            <li><strong>System Admin</strong>: watches the real-time timeline plus every dispatched ambulance.</li>
            <li><strong>Hospital Admin</strong>: sees only the calls routed to their facility, adjusts bed capacity, and tracks en-route units; they also manage drivers and ambulances.</li>
            <li><strong>Drivers</strong>: follow the in-app prompts (arrive → transport → hospital) so every action is written back to the database and visible to admins.</li>
          </ul>
          <p className="text-xs text-gray-600">
            For deeper feature references, see the supplied markdown guides (Hospital Management, Location Tracking, Webhook Integration, etc.). They map directly to what you observe here.
          </p>
        </section>

        <footer className="text-xs text-gray-500">
          Need a quick recap? Log in as admin first to watch activity, then open a second window as a driver to see statuses update live.
        </footer>
      </div>
    </div>
  );
};

export default SystemDocs;
