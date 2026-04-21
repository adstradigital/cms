'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

import transportApi from '@/api/transportApi';
import TransportModal from '../TransportModal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import styles from '../transport.module.css';

const EMPTY_ROUTE = { name: '', bus: '', source: '', destination: '', distance_km: '', scheduled_pickup_time: '', scheduled_drop_time: '' };
const EMPTY_STOP = { stop_name: '', stop_order: 1, pickup_time: '', drop_time: '', latitude: '', longitude: '' };

export default function RoutesTab({ routes, buses, onRefresh }) {
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [routeForm, setRouteForm] = useState({ ...EMPTY_ROUTE });

  const [showStopModal, setShowStopModal] = useState(false);
  const [editStopTarget, setEditStopTarget] = useState(null);
  const [stopRouteId, setStopRouteId] = useState(null);
  const [stopForm, setStopForm] = useState({ ...EMPTY_STOP });

  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateRoute = () => {
    setEditRoute(null);
    setRouteForm({ ...EMPTY_ROUTE });
    setShowRouteModal(true);
  };

  const openEditRoute = (route) => {
    setEditRoute(route);
    setRouteForm({
      name: route.name || '',
      bus: route.bus || '',
      source: route.source || '',
      destination: route.destination || '',
      distance_km: route.distance_km || '',
      scheduled_pickup_time: route.scheduled_pickup_time || '',
      scheduled_drop_time: route.scheduled_drop_time || '',
    });
    setShowRouteModal(true);
  };

  const openAddStop = (routeId) => {
    setEditStopTarget(null);
    setStopRouteId(routeId);
    const route = routes.find((r) => r.id === routeId);
    const nextOrder = (route?.stops?.length || 0) + 1;
    setStopForm({ ...EMPTY_STOP, stop_order: nextOrder });
    setShowStopModal(true);
  };

  const openEditStop = (stop) => {
    setEditStopTarget(stop);
    setStopRouteId(stop.route);
    setStopForm({
      stop_name: stop.stop_name || '',
      stop_order: stop.stop_order || 1,
      pickup_time: stop.pickup_time || '',
      drop_time: stop.drop_time || '',
      latitude: stop.latitude || '',
      longitude: stop.longitude || '',
    });
    setShowStopModal(true);
  };

  const setR = (k, v) => setRouteForm((p) => ({ ...p, [k]: v }));
  const setS = (k, v) => setStopForm((p) => ({ ...p, [k]: v }));

  const submitRoute = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...routeForm,
        bus: routeForm.bus ? Number(routeForm.bus) : null,
        distance_km: routeForm.distance_km ? Number(routeForm.distance_km) : null,
      };
      if (editRoute) {
        await transportApi.updateRoute(editRoute.id, payload);
      } else {
        await transportApi.createRoute(payload);
      }
      setShowRouteModal(false);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save route.');
    } finally {
      setSaving(false);
    }
  };

  const submitStop = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...stopForm,
        stop_order: Number(stopForm.stop_order || 1),
        latitude: stopForm.latitude ? Number(stopForm.latitude) : null,
        longitude: stopForm.longitude ? Number(stopForm.longitude) : null,
      };
      if (editStopTarget) {
        await transportApi.updateStop(editStopTarget.id, payload);
      } else {
        await transportApi.createRouteStop(stopRouteId, payload);
      }
      setShowStopModal(false);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save stop.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget.type === 'route') {
        await transportApi.deleteRoute(deleteTarget.id);
      } else {
        await transportApi.deleteStop(deleteTarget.id);
      }
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>
            <MapPin size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Routes & Stops
          </h3>
          <button className={styles.primaryBtn} style={{ marginTop: 0 }} onClick={openCreateRoute}>
            <Plus size={15} /> Add Route
          </button>
        </div>

        {routes.map((route) => {
          const isOpen = expanded === route.id;
          return (
            <div key={route.id} style={{ border: '1px solid var(--t-line)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)', cursor: 'pointer', background: isOpen ? '#f8fafc' : 'transparent',
                  transition: 'background var(--transition-fast)',
                }}
                onClick={() => setExpanded(isOpen ? null : route.id)}
              >
                <div>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{route.name}</strong>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
                    {route.source || '—'} → {route.destination || '—'}
                    {route.bus_name && ` · ${route.bus_name}`}
                    {route.distance_km && ` · ${route.distance_km} km`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)', marginRight: 8 }}>
                    {route.stops?.length || 0} stops
                  </span>
                  <button className={styles.ghostBtn} onClick={(e) => { e.stopPropagation(); openEditRoute(route); }} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button className={styles.ghostBtn} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'route', id: route.id }); }} title="Delete" style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0 var(--space-4) var(--space-4)', borderTop: '1px solid var(--t-line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 'var(--space-3) 0' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Stops
                    </span>
                    <button className={styles.smallBtn} onClick={() => openAddStop(route.id)}>
                      <Plus size={12} style={{ marginRight: 4 }} /> Add Stop
                    </button>
                  </div>
                  {route.stops?.length ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.table} style={{ minWidth: 500 }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Stop Name</th>
                            <th>Pickup</th>
                            <th>Drop</th>
                            <th>Coordinates</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {route.stops.map((stop) => (
                            <tr key={stop.id}>
                              <td>{stop.stop_order}</td>
                              <td><strong>{stop.stop_name}</strong></td>
                              <td>{stop.pickup_time || '—'}</td>
                              <td>{stop.drop_time || '—'}</td>
                              <td style={{ fontSize: 'var(--text-xs)', color: 'var(--t-muted)' }}>
                                {stop.latitude && stop.longitude
                                  ? `${stop.latitude}, ${stop.longitude}`
                                  : '—'}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    className={styles.ghostBtn}
                                    onClick={() => openEditStop(stop)}
                                    title="Edit stop"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    className={styles.ghostBtn}
                                    onClick={() => setDeleteTarget({ type: 'stop', id: stop.id })}
                                    style={{ color: 'var(--color-danger)' }}
                                    title="Remove stop"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className={styles.empty} style={{ padding: 'var(--space-3)' }}>No stops added yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!routes.length && <p className={styles.empty}>No routes configured yet.</p>}
      </div>

      {/* Route Modal */}
      <TransportModal open={showRouteModal} title={editRoute ? 'Edit Route' : 'Create Route'} onClose={() => setShowRouteModal(false)}>
        <form onSubmit={submitRoute}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Route Name *</label>
              <input className={styles.formInput} value={routeForm.name} onChange={(e) => setR('name', e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Assign Bus</label>
              <select className={styles.formSelect} value={routeForm.bus} onChange={(e) => setR('bus', e.target.value)}>
                <option value="">None</option>
                {buses.map((b) => <option key={b.id} value={b.id}>{b.bus_number} - {b.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Source</label>
              <input className={styles.formInput} value={routeForm.source} onChange={(e) => setR('source', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Destination</label>
              <input className={styles.formInput} value={routeForm.destination} onChange={(e) => setR('destination', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Distance (km)</label>
              <input className={styles.formInput} type="number" step="0.01" value={routeForm.distance_km} onChange={(e) => setR('distance_km', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Pickup Time</label>
              <input className={styles.formInput} type="time" value={routeForm.scheduled_pickup_time} onChange={(e) => setR('scheduled_pickup_time', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Drop Time</label>
              <input className={styles.formInput} type="time" value={routeForm.scheduled_drop_time} onChange={(e) => setR('scheduled_drop_time', e.target.value)} />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : editRoute ? 'Save Changes' : 'Create Route'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowRouteModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      </TransportModal>

      {/* Stop Modal */}
      <TransportModal open={showStopModal} title={editStopTarget ? 'Edit Stop' : 'Add Route Stop'} onClose={() => setShowStopModal(false)} width={480}>
        <form onSubmit={submitStop}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Stop Name *</label>
              <input className={styles.formInput} value={stopForm.stop_name} onChange={(e) => setS('stop_name', e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Stop Order *</label>
              <input className={styles.formInput} type="number" min="1" value={stopForm.stop_order} onChange={(e) => setS('stop_order', e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Pickup Time</label>
              <input className={styles.formInput} type="time" value={stopForm.pickup_time} onChange={(e) => setS('pickup_time', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Drop Time</label>
              <input className={styles.formInput} type="time" value={stopForm.drop_time} onChange={(e) => setS('drop_time', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Latitude</label>
              <input className={styles.formInput} type="number" step="0.000001" value={stopForm.latitude} onChange={(e) => setS('latitude', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Longitude</label>
              <input className={styles.formInput} type="number" step="0.000001" value={stopForm.longitude} onChange={(e) => setS('longitude', e.target.value)} />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : editStopTarget ? 'Save Changes' : 'Add Stop'}
            </button>
            <button type="button" className={styles.secondaryBtn} style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowStopModal(false)}>Cancel</button>
          </div>
        </form>
      </TransportModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'route' ? 'Route' : 'Stop'}`}
        message={deleteTarget?.type === 'route'
          ? 'This route will be deactivated. Student allocations on this route will not be affected.'
          : 'This stop will be permanently removed.'}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </section>
  );
}
