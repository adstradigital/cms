'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  BusFront,
  CreditCard,
  MapPinned,
  MessageSquare,
  Plus,
  RefreshCcw,
  Route,
} from 'lucide-react';

import transportApi from '@/api/transportApi';
import styles from './TransportModule.module.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'buses', label: 'School Buses', icon: BusFront },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'tracking', label: 'Live Tracking', icon: MapPinned },
  { id: 'fees', label: 'Transport Fees', icon: CreditCard },
  { id: 'complaints', label: 'Complaints', icon: MessageSquare },
];

const asList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const statusTone = (value) => {
  if (['paid', 'active', 'resolved', 'closed'].includes(value)) return styles.badgeGood;
  if (['partial', 'in_progress', 'maintenance'].includes(value)) return styles.badgeWarn;
  if (['overdue', 'inactive'].includes(value)) return styles.badgeDanger;
  return styles.badgeNeutral;
};

const StatCard = ({ label, value, help }) => (
  <div className={styles.statCard}>
    <p className={styles.statLabel}>{label}</p>
    <p className={styles.statValue}>{value}</p>
    <p className={styles.statHelp}>{help}</p>
  </div>
);

export default function TransportModule({ segment = 'overview' }) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(segment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [locations, setLocations] = useState([]);

  const [selectedRouteForStop, setSelectedRouteForStop] = useState('');
  const [selectedBusForTrack, setSelectedBusForTrack] = useState('');
  const [liveLocation, setLiveLocation] = useState(null);

  const [busForm, setBusForm] = useState({
    name: '',
    bus_number: '',
    registration_number: '',
    capacity: 40,
    status: 'active',
  });
  const [routeForm, setRouteForm] = useState({
    name: '',
    bus: '',
    source: '',
    destination: '',
  });
  const [stopForm, setStopForm] = useState({
    stop_name: '',
    stop_order: 1,
  });
  const [trackForm, setTrackForm] = useState({
    bus: '',
    route: '',
    latitude: '',
    longitude: '',
    speed_kmph: '0',
    source: 'mobile',
  });
  const [feeForm, setFeeForm] = useState({
    student: '',
    route: '',
    period_label: '',
    amount_due: '',
    due_date: '',
  });
  const [complaintForm, setComplaintForm] = useState({
    student: '',
    bus: '',
    route: '',
    subject: '',
    description: '',
    priority: 'medium',
  });

  const [payDrafts, setPayDrafts] = useState({});
  const [resolutionDrafts, setResolutionDrafts] = useState({});

  useEffect(() => {
    if (segment && TABS.find((t) => t.id === segment)) {
      setActiveTab(segment);
    }
  }, [segment]);

  useEffect(() => {
    const parts = pathname?.split('/').filter(Boolean) || [];
    const maybeSegment = parts[parts.length - 1];
    if (TABS.some((t) => t.id === maybeSegment)) {
      setActiveTab(maybeSegment);
    }
  }, [pathname]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [busRes, routeRes, studentRes, feeRes, complaintRes, locationRes] = await Promise.all([
        transportApi.getBuses(),
        transportApi.getRoutes(),
        transportApi.getStudentTransports(),
        transportApi.getFees(),
        transportApi.getComplaints(),
        transportApi.getLocationLogs(),
      ]);

      setBuses(asList(busRes.data));
      setRoutes(asList(routeRes.data));
      setStudents(asList(studentRes.data));
      setFees(asList(feeRes.data));
      setComplaints(asList(complaintRes.data));
      setLocations(asList(locationRes.data));
    } catch (err) {
      console.error('Transport module load failed', err);
      setError('Unable to load transport data right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedBusForTrack) {
      setLiveLocation(null);
      return;
    }

    transportApi
      .getLiveLocation(selectedBusForTrack)
      .then((res) => setLiveLocation(res.data?.live_location || null))
      .catch(() => setLiveLocation(null));
  }, [selectedBusForTrack, locations]);

  const studentOptions = useMemo(() => {
    const map = new Map();
    students.forEach((row) => {
      if (!map.has(row.student)) {
        map.set(row.student, {
          id: row.student,
          name: row.student_name || `Student #${row.student}`,
          routeName: row.route_name || 'Unassigned route',
        });
      }
    });
    return [...map.values()];
  }, [students]);

  const metrics = useMemo(() => {
    const activeBuses = buses.filter((b) => b.is_active && b.status === 'active').length;
    const activeRoutes = routes.filter((r) => r.is_active).length;
    const pendingFees = fees.filter((f) => ['pending', 'partial', 'overdue'].includes(f.status)).length;
    const openComplaints = complaints.filter((c) => ['open', 'in_progress'].includes(c.status)).length;

    return { activeBuses, activeRoutes, pendingFees, openComplaints };
  }, [buses, routes, fees, complaints]);

  const onTab = (tabId) => {
    setActiveTab(tabId);
    router.push(`/admins/transport/${tabId}`);
  };

  const submitBus = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createBus({ ...busForm, capacity: Number(busForm.capacity || 40) });
      setBusForm({ name: '', bus_number: '', registration_number: '', capacity: 40, status: 'active' });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create bus.');
    }
  };

  const submitRoute = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createRoute({
        ...routeForm,
        bus: routeForm.bus ? Number(routeForm.bus) : null,
      });
      setRouteForm({ name: '', bus: '', source: '', destination: '' });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create route.');
    }
  };

  const submitStop = async (e) => {
    e.preventDefault();
    if (!selectedRouteForStop) {
      alert('Select a route first.');
      return;
    }
    try {
      await transportApi.createRouteStop(Number(selectedRouteForStop), {
        stop_name: stopForm.stop_name,
        stop_order: Number(stopForm.stop_order || 1),
      });
      setStopForm({ stop_name: '', stop_order: 1 });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create stop.');
    }
  };

  const submitLocation = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createLocationLog({
        ...trackForm,
        bus: Number(trackForm.bus),
        route: trackForm.route ? Number(trackForm.route) : null,
        latitude: Number(trackForm.latitude),
        longitude: Number(trackForm.longitude),
        speed_kmph: Number(trackForm.speed_kmph || 0),
      });
      setTrackForm((prev) => ({ ...prev, latitude: '', longitude: '', speed_kmph: '0' }));
      setSelectedBusForTrack(String(trackForm.bus));
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to publish location.');
    }
  };

  const submitFee = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createFee({
        ...feeForm,
        student: Number(feeForm.student),
        route: feeForm.route ? Number(feeForm.route) : null,
        amount_due: Number(feeForm.amount_due),
      });
      setFeeForm({ student: '', route: '', period_label: '', amount_due: '', due_date: '' });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create fee record.');
    }
  };

  const payFee = async (feeId) => {
    const draft = payDrafts[feeId] || {};
    if (!draft.amount || Number(draft.amount) <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    try {
      await transportApi.payFee(feeId, {
        amount: Number(draft.amount),
        payment_method: draft.payment_method || 'online',
        transaction_id: draft.transaction_id || '',
      });
      setPayDrafts((prev) => ({ ...prev, [feeId]: { amount: '', payment_method: 'online', transaction_id: '' } }));
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Payment failed.');
    }
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    try {
      await transportApi.createComplaint({
        ...complaintForm,
        student: complaintForm.student ? Number(complaintForm.student) : null,
        bus: complaintForm.bus ? Number(complaintForm.bus) : null,
        route: complaintForm.route ? Number(complaintForm.route) : null,
      });
      setComplaintForm({
        student: '',
        bus: '',
        route: '',
        subject: '',
        description: '',
        priority: 'medium',
      });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to raise complaint.');
    }
  };

  const updateComplaintStatus = async (complaint, nextStatus) => {
    try {
      await transportApi.updateComplaint(complaint.id, {
        status: nextStatus,
        resolution_note: resolutionDrafts[complaint.id] || complaint.resolution_note || '',
      });
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update complaint.');
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1>Transportation Center</h1>
          <p>Manage buses, routes, live GPS logs, fee collections, and complaint resolution.</p>
        </div>
        <button className={styles.refreshBtn} onClick={loadAll}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </header>

      <nav className={styles.tabs}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={`/admins/transport/${tab.id}`}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => onTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.loading}>Loading transport data...</div> : null}

      {activeTab === 'overview' && (
        <section className={styles.section}>
          <div className={styles.statsGrid}>
            <StatCard label="Active Buses" value={metrics.activeBuses} help="Ready for daily trips" />
            <StatCard label="Active Routes" value={metrics.activeRoutes} help="Pickup/drop circuits" />
            <StatCard label="Pending Fees" value={metrics.pendingFees} help="Require payment follow-up" />
            <StatCard label="Open Complaints" value={metrics.openComplaints} help="Needs resolution" />
          </div>

          <div className={styles.dual}>
            <div className={styles.panel}>
              <h3>Latest Location Events</h3>
              <div className={styles.simpleList}>
                {locations.slice(0, 6).map((row) => (
                  <div key={row.id} className={styles.simpleRow}>
                    <div>
                      <strong>{row.bus_name || row.bus_number || 'Bus'}</strong>
                      <p>{row.route_name || 'No route linked'}</p>
                    </div>
                    <span>{row.recorded_at ? new Date(row.recorded_at).toLocaleString() : '-'}</span>
                  </div>
                ))}
                {!locations.length ? <p className={styles.empty}>No location events yet.</p> : null}
              </div>
            </div>

            <div className={styles.panel}>
              <h3>Recent Complaints</h3>
              <div className={styles.simpleList}>
                {complaints.slice(0, 6).map((row) => (
                  <div key={row.id} className={styles.simpleRow}>
                    <div>
                      <strong>{row.subject}</strong>
                      <p>{row.student_name || row.raised_by_name || 'User'}</p>
                    </div>
                    <span className={`${styles.badge} ${statusTone(row.status)}`}>{row.status}</span>
                  </div>
                ))}
                {!complaints.length ? <p className={styles.empty}>No complaints logged.</p> : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'buses' && (
        <section className={styles.section}>
          <div className={styles.dual}>
            <form className={styles.panel} onSubmit={submitBus}>
              <h3>Create School Bus</h3>
              <div className={styles.formGrid}>
                <input placeholder="Bus Name" value={busForm.name} onChange={(e) => setBusForm((p) => ({ ...p, name: e.target.value }))} required />
                <input placeholder="Bus Number" value={busForm.bus_number} onChange={(e) => setBusForm((p) => ({ ...p, bus_number: e.target.value }))} required />
                <input placeholder="Registration Number" value={busForm.registration_number} onChange={(e) => setBusForm((p) => ({ ...p, registration_number: e.target.value }))} />
                <input type="number" min="1" placeholder="Capacity" value={busForm.capacity} onChange={(e) => setBusForm((p) => ({ ...p, capacity: e.target.value }))} />
                <select value={busForm.status} onChange={(e) => setBusForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button className={styles.primaryBtn} type="submit"><Plus size={16} /> Add Bus</button>
            </form>

            <div className={styles.panel}>
              <h3>Fleet</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Bus</th><th>Capacity</th><th>Status</th><th>Driver</th></tr>
                  </thead>
                  <tbody>
                    {buses.map((bus) => (
                      <tr key={bus.id}>
                        <td>{bus.bus_number} - {bus.name}</td>
                        <td>{bus.capacity}</td>
                        <td><span className={`${styles.badge} ${statusTone(bus.status)}`}>{bus.status}</span></td>
                        <td>{bus.driver_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!buses.length ? <p className={styles.empty}>No buses added yet.</p> : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'routes' && (
        <section className={styles.section}>
          <div className={styles.dual}>
            <form className={styles.panel} onSubmit={submitRoute}>
              <h3>Create Route</h3>
              <div className={styles.formGrid}>
                <input placeholder="Route Name" value={routeForm.name} onChange={(e) => setRouteForm((p) => ({ ...p, name: e.target.value }))} required />
                <select value={routeForm.bus} onChange={(e) => setRouteForm((p) => ({ ...p, bus: e.target.value }))}>
                  <option value="">Select Bus</option>
                  {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.bus_number} - {bus.name}</option>)}
                </select>
                <input placeholder="Source" value={routeForm.source} onChange={(e) => setRouteForm((p) => ({ ...p, source: e.target.value }))} />
                <input placeholder="Destination" value={routeForm.destination} onChange={(e) => setRouteForm((p) => ({ ...p, destination: e.target.value }))} />
              </div>
              <button className={styles.primaryBtn} type="submit"><Plus size={16} /> Add Route</button>
            </form>

            <form className={styles.panel} onSubmit={submitStop}>
              <h3>Add Route Stop</h3>
              <div className={styles.formGrid}>
                <select value={selectedRouteForStop} onChange={(e) => setSelectedRouteForStop(e.target.value)} required>
                  <option value="">Choose Route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                </select>
                <input placeholder="Stop Name" value={stopForm.stop_name} onChange={(e) => setStopForm((p) => ({ ...p, stop_name: e.target.value }))} required />
                <input type="number" min="1" placeholder="Stop Order" value={stopForm.stop_order} onChange={(e) => setStopForm((p) => ({ ...p, stop_order: e.target.value }))} required />
              </div>
              <button className={styles.primaryBtn} type="submit"><Plus size={16} /> Add Stop</button>
            </form>
          </div>

          <div className={styles.panel}>
            <h3>Routes Directory</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Route</th><th>Bus</th><th>Path</th><th>Stops</th></tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <td>{route.name}</td>
                      <td>{route.bus_name || '-'}</td>
                      <td>{route.source || '-'} to {route.destination || '-'}</td>
                      <td>{route.stops?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!routes.length ? <p className={styles.empty}>No routes configured yet.</p> : null}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'tracking' && (
        <section className={styles.section}>
          <div className={styles.dual}>
            <form className={styles.panel} onSubmit={submitLocation}>
              <h3>Publish Live Location</h3>
              <div className={styles.formGrid}>
                <select value={trackForm.bus} onChange={(e) => setTrackForm((p) => ({ ...p, bus: e.target.value }))} required>
                  <option value="">Select Bus</option>
                  {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.bus_number} - {bus.name}</option>)}
                </select>
                <select value={trackForm.route} onChange={(e) => setTrackForm((p) => ({ ...p, route: e.target.value }))}>
                  <option value="">Select Route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                </select>
                <input type="number" step="0.000001" placeholder="Latitude" value={trackForm.latitude} onChange={(e) => setTrackForm((p) => ({ ...p, latitude: e.target.value }))} required />
                <input type="number" step="0.000001" placeholder="Longitude" value={trackForm.longitude} onChange={(e) => setTrackForm((p) => ({ ...p, longitude: e.target.value }))} required />
                <input type="number" step="0.01" placeholder="Speed (km/h)" value={trackForm.speed_kmph} onChange={(e) => setTrackForm((p) => ({ ...p, speed_kmph: e.target.value }))} />
                <select value={trackForm.source} onChange={(e) => setTrackForm((p) => ({ ...p, source: e.target.value }))}>
                  <option value="gps">GPS Device</option>
                  <option value="mobile">Mobile App</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>
              <button className={styles.primaryBtn} type="submit"><MapPinned size={16} /> Push Location</button>
            </form>

            <div className={styles.panel}>
              <h3>Live Bus View</h3>
              <select value={selectedBusForTrack} onChange={(e) => setSelectedBusForTrack(e.target.value)}>
                <option value="">Choose Bus</option>
                {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.bus_number} - {bus.name}</option>)}
              </select>
              {liveLocation ? (
                <div className={styles.liveBox}>
                  <p><strong>Lat:</strong> {liveLocation.latitude}</p>
                  <p><strong>Lng:</strong> {liveLocation.longitude}</p>
                  <p><strong>Speed:</strong> {liveLocation.speed_kmph || 0} km/h</p>
                  <p><strong>Updated:</strong> {liveLocation.recorded_at ? new Date(liveLocation.recorded_at).toLocaleString() : '-'}</p>
                </div>
              ) : (
                <p className={styles.empty}>No live point for selected bus.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'fees' && (
        <section className={styles.section}>
          <form className={styles.panel} onSubmit={submitFee}>
            <h3>Create Transport Fee</h3>
            <div className={styles.formGrid}>
              <select value={feeForm.student} onChange={(e) => setFeeForm((p) => ({ ...p, student: e.target.value }))} required>
                <option value="">Select Student</option>
                {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.routeName})</option>)}
              </select>
              <select value={feeForm.route} onChange={(e) => setFeeForm((p) => ({ ...p, route: e.target.value }))}>
                <option value="">Select Route</option>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
              <input placeholder="Period Label (e.g. Apr-2026)" value={feeForm.period_label} onChange={(e) => setFeeForm((p) => ({ ...p, period_label: e.target.value }))} required />
              <input type="number" step="0.01" placeholder="Amount Due" value={feeForm.amount_due} onChange={(e) => setFeeForm((p) => ({ ...p, amount_due: e.target.value }))} required />
              <input type="date" value={feeForm.due_date} onChange={(e) => setFeeForm((p) => ({ ...p, due_date: e.target.value }))} required />
            </div>
            <button className={styles.primaryBtn} type="submit"><Plus size={16} /> Add Fee</button>
          </form>

          <div className={styles.panel}>
            <h3>Fee Payment Desk</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Student</th><th>Period</th><th>Due</th><th>Paid</th><th>Status</th><th>Quick Pay</th></tr>
                </thead>
                <tbody>
                  {fees.map((fee) => {
                    const draft = payDrafts[fee.id] || { amount: '', payment_method: 'online', transaction_id: '' };
                    return (
                      <tr key={fee.id}>
                        <td>{fee.student_name || fee.student}</td>
                        <td>{fee.period_label}</td>
                        <td>{fee.amount_due}</td>
                        <td>{fee.amount_paid}</td>
                        <td><span className={`${styles.badge} ${statusTone(fee.status)}`}>{fee.status}</span></td>
                        <td>
                          <div className={styles.inlinePay}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={draft.amount}
                              onChange={(e) => setPayDrafts((p) => ({ ...p, [fee.id]: { ...draft, amount: e.target.value } }))}
                            />
                            <select
                              value={draft.payment_method}
                              onChange={(e) => setPayDrafts((p) => ({ ...p, [fee.id]: { ...draft, payment_method: e.target.value } }))}
                            >
                              <option value="online">Online</option>
                              <option value="cash">Cash</option>
                              <option value="upi">UPI</option>
                              <option value="card">Card</option>
                            </select>
                            <button type="button" className={styles.smallBtn} onClick={() => payFee(fee.id)}>Pay</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!fees.length ? <p className={styles.empty}>No transport fee records yet.</p> : null}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'complaints' && (
        <section className={styles.section}>
          <form className={styles.panel} onSubmit={submitComplaint}>
            <h3>Raise Transport Complaint</h3>
            <div className={styles.formGrid}>
              <select value={complaintForm.student} onChange={(e) => setComplaintForm((p) => ({ ...p, student: e.target.value }))}>
                <option value="">Select Student</option>
                {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={complaintForm.bus} onChange={(e) => setComplaintForm((p) => ({ ...p, bus: e.target.value }))}>
                <option value="">Select Bus</option>
                {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.bus_number} - {bus.name}</option>)}
              </select>
              <select value={complaintForm.route} onChange={(e) => setComplaintForm((p) => ({ ...p, route: e.target.value }))}>
                <option value="">Select Route</option>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
              <select value={complaintForm.priority} onChange={(e) => setComplaintForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input placeholder="Subject" value={complaintForm.subject} onChange={(e) => setComplaintForm((p) => ({ ...p, subject: e.target.value }))} required />
              <textarea placeholder="Complaint description" value={complaintForm.description} onChange={(e) => setComplaintForm((p) => ({ ...p, description: e.target.value }))} required />
            </div>
            <button className={styles.primaryBtn} type="submit"><AlertTriangle size={16} /> Raise Complaint</button>
          </form>

          <div className={styles.panel}>
            <h3>Complaint Resolution Queue</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Subject</th><th>Raised By</th><th>Priority</th><th>Status</th><th>Resolution</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {complaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>{complaint.subject}</td>
                      <td>{complaint.student_name || complaint.raised_by_name || '-'}</td>
                      <td><span className={`${styles.badge} ${statusTone(complaint.priority === 'urgent' ? 'overdue' : complaint.priority === 'high' ? 'partial' : 'pending')}`}>{complaint.priority}</span></td>
                      <td><span className={`${styles.badge} ${statusTone(complaint.status)}`}>{complaint.status}</span></td>
                      <td>
                        <input
                          placeholder="Resolution note"
                          value={resolutionDrafts[complaint.id] ?? complaint.resolution_note ?? ''}
                          onChange={(e) => setResolutionDrafts((p) => ({ ...p, [complaint.id]: e.target.value }))}
                        />
                      </td>
                      <td>
                        <div className={styles.inlineActions}>
                          <button type="button" className={styles.smallBtn} onClick={() => updateComplaintStatus(complaint, 'in_progress')}>In Progress</button>
                          <button type="button" className={styles.smallBtn} onClick={() => updateComplaintStatus(complaint, 'resolved')}>Resolve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!complaints.length ? <p className={styles.empty}>No complaints filed yet.</p> : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
