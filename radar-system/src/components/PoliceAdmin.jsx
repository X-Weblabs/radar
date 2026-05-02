import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CheckCircle, XCircle, AlertTriangle, Clock, MapPin, Shield, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatTimestamp } from '../utils/helpers';
import Header from './Header';
import Sidebar from './Sidebar';

const PoliceAdmin = () => {
  const [pendingCalls, setPendingCalls] = useState([]);
  const [approvedCalls, setApprovedCalls] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const { signOut, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const callsRef = collection(db, 'emergencyCalls');
    
    // Query for calls awaiting police approval
    const pendingQuery = query(
      callsRef, 
      where('status', '==', 'awaiting_police_approval')
    );

    // Query for calls already approved by police (now pending or dispatched)
    const approvedQuery = query(
      callsRef,
      where('policeApproved', '==', true)
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingCalls(calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (error) => {
      console.error("Pending calls listener failed:", error);
    });

    const unsubscribeApproved = onSnapshot(approvedQuery, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApprovedCalls(calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (error) => {
      console.error("Approved calls listener failed:", error);
    });

    return () => {
      unsubscribePending();
      unsubscribeApproved();
    };
  }, []);

  const handleApprove = async (callId) => {
    try {
      const callRef = doc(db, 'emergencyCalls', callId);
      const now = new Date().toISOString();
      
      await updateDoc(callRef, {
        status: 'pending', // Move to pending so hospitals/drivers can see it
        policeApproved: true,
        policeApprovedAt: now,
      });

      // Also trigger the webhook here if we want to automate dispatch AFTER approval
      const callData = pendingCalls.find(c => c.id === callId);
      if (callData) {
        try {
          await fetch('https://xweblabs25.app.n8n.cloud/webhook/emergency-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callId,
              ...callData,
              status: 'pending',
              eventType: 'police_approved_emergency'
            }),
          });
        } catch (webhookError) {
          console.error('Webhook call failed after police approval:', webhookError);
        }
      }
    } catch (error) {
      console.error('Error approving emergency:', error);
      alert('Failed to approve emergency call.');
    }
  };

  const handleReject = async (callId) => {
    if (!window.confirm('Are you sure you want to reject this emergency call?')) return;
    
    try {
      const callRef = doc(db, 'emergencyCalls', callId);
      await updateDoc(callRef, {
        status: 'rejected_by_police',
        policeApproved: false,
        policeRejectedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error rejecting emergency:', error);
      alert('Failed to reject emergency call.');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Awaiting Approval</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCalls.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Approved Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {approvedCalls.filter(c => {
                  const today = new Date().toISOString().split('T')[0];
                  return c.policeApprovedAt && c.policeApprovedAt.startsWith(today);
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Handled</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCalls.length + pendingCalls.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Emergencies List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Urgent Approval Queue
          </h2>
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
            LIVE
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {pendingCalls.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No pending emergencies at the moment.</p>
              <p className="text-sm">All clear on the radar.</p>
            </div>
          ) : (
            pendingCalls.map(call => (
              <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded">
                        Emergency #{call.id.substring(0, 6)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.h-3" />
                        {formatTimestamp(call.timestamp)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{call.callerName || 'Anonymous Caller'}</h3>
                      <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">{call.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>{call.address || 'Location data available'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span>Priority: <span className="font-bold text-red-600 uppercase">{call.priority || 'Urgent'}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(call.id)}
                      className="flex-1 lg:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(call.id)}
                      className="flex-1 lg:flex-none px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Dispatch
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resolved Cases
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {approvedCalls.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No resolved cases found.</p>
          </div>
        ) : (
          approvedCalls.map(call => (
            <div key={call.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900">#{call.id.substring(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      call.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {call.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{call.callerName}</p>
                  <p className="text-xs text-gray-500">{call.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Approved At</p>
                  <p className="text-sm font-medium text-gray-900">{formatTimestamp(call.policeApprovedAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
      <Navigation className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Live Situation Map</h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        This view shows all active emergency responses across the city, including patrol units and ambulances.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
        <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
        GPS Tracking System Active
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Police Admin Dashboard" 
        subtitle="Emergency Verification & Response Authorization" 
      />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          userRole="police"
          stats={{
            pendingApproval: pendingCalls.length,
            approvedTotal: approvedCalls.length
          }}
        />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'history' && renderHistory()}
            {activeSection === 'tracking' && renderTracking()}
            {activeSection !== 'dashboard' && activeSection !== 'history' && activeSection !== 'tracking' && (
               <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                 Section "{activeSection}" is coming soon.
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PoliceAdmin;
