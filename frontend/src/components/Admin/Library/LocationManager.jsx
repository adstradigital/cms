'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Layers, 
  MapPin, 
  Info,
  ChevronRight,
  Database
} from 'lucide-react';
import axios from '@/api/instance';

const LocationManager = () => {
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRackModal, setShowRackModal] = useState(false);
  const [showShelfModal, setShowShelfModal] = useState(false);
  
  const [rackForm, setRackForm] = useState({ name: '', code: '', location: '' });
  const [shelfForm, setShelfForm] = useState({ rack: '', name: '', code: '' });

  useEffect(() => {
    fetchRacks();
  }, []);

  const fetchRacks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/library/racks/');
      // Fetch shelves for each rack (or update backend to include them)
      // Since it's a related field, we can fetch all shelves and group them
      const shelvesRes = await axios.get('/api/library/shelves/');
      const groupedRacks = response.data.map(rack => ({
        ...rack,
        shelves: shelvesRes.data.filter(s => s.rack === rack.id)
      }));
      setRacks(groupedRacks);
    } catch (error) {
      console.error('Error fetching racks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRack = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/library/racks/', rackForm);
      setShowRackModal(false);
      setRackForm({ name: '', code: '', location: '' });
      fetchRacks();
    } catch (error) {
      alert('Error creating rack');
    }
  };

  const handleCreateShelf = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/library/shelves/', shelfForm);
      setShowShelfModal(false);
      setShelfForm({ rack: '', name: '', code: '' });
      fetchRacks();
    } catch (error) {
      alert('Error creating shelf');
    }
  };

  const handleDeleteRack = async (id) => {
    if (window.confirm('Deleting a rack will delete all its shelves. Proceed?')) {
      await axios.delete(`/api/library/racks/${id}/`);
      fetchRacks();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-text)' }}>Shelf Configuration</h3>
          <p style={{ color: 'var(--theme-text-muted)', fontSize: '14px' }}>Define physical racks and shelves to organize your collection.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowRackModal(true)}
            style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Add Rack
          </button>
          <button 
            onClick={() => setShowShelfModal(true)}
            style={{ backgroundColor: 'var(--theme-primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Add Shelf
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-muted)' }}>Loading location map...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {racks.map(rack => (
            <div key={rack.id} style={{
              backgroundColor: 'var(--theme-bg-white)',
              border: '1px solid var(--theme-border-subtle)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--theme-shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)', padding: '8px', borderRadius: '10px' }}>
                    <Layers size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{rack.name}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--theme-text-muted)', fontWeight: '500' }}>Code: {rack.code}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteRack(rack.id)} style={{ color: 'var(--theme-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>

              {rack.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--theme-text-muted)', backgroundColor: 'var(--theme-bg-subtle)', padding: '8px 12px', borderRadius: '8px' }}>
                   <MapPin size={14} /> {rack.location}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shelves in this rack</p>
                {rack.shelves?.length > 0 ? rack.shelves.map(shelf => (
                  <div key={shelf.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--theme-bg-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--theme-border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Database size={14} style={{ color: 'var(--theme-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{shelf.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', fontWeight: '600' }}>{shelf.code}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: '13px', color: 'var(--theme-text-muted)', fontStyle: 'italic', padding: '10px' }}>No shelves added yet.</p>
                )}
              </div>
            </div>
          ))}
          {racks.length === 0 && (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: 'var(--theme-bg-subtle)', borderRadius: '16px', border: '2px dashed var(--theme-border)' }}>
               <Info size={40} style={{ color: 'var(--theme-text-muted)', marginBottom: '16px' }} />
               <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--theme-text)' }}>No racks defined.</p>
               <p style={{ color: 'var(--theme-text-muted)', fontSize: '14px' }}>Start by adding a rack to organize your library.</p>
             </div>
          )}
        </div>
      )}

      {/* Rack Modal */}
      {showRackModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
             <h3 style={{ marginBottom: '24px' }}>Add Physical Rack</h3>
             <form onSubmit={handleCreateRack} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <input required placeholder="Rack Name (e.g. Science Section)" value={rackForm.name} onChange={e => setRackForm({...rackForm, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }} />
               <input required placeholder="Unique Code (e.g. RCK-01)" value={rackForm.code} onChange={e => setRackForm({...rackForm, code: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }} />
               <input placeholder="Location Description" value={rackForm.location} onChange={e => setRackForm({...rackForm, location: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }} />
               <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                 <button type="submit" style={{ flex: 1, backgroundColor: 'var(--theme-primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600' }}>Save</button>
                 <button type="button" onClick={() => setShowRackModal(false)} style={{ flex: 1, backgroundColor: 'var(--theme-bg-subtle)', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600' }}>Cancel</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Shelf Modal */}
      {showShelfModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
             <h3 style={{ marginBottom: '24px' }}>Add Shelf</h3>
             <form onSubmit={handleCreateShelf} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <select required value={shelfForm.rack} onChange={e => setShelfForm({...shelfForm, rack: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }}>
                 <option value="">Select Rack</option>
                 {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
               </select>
               <input required placeholder="Shelf Name (e.g. Top Shelf)" value={shelfForm.name} onChange={e => setShelfForm({...shelfForm, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }} />
               <input required placeholder="Shelf Code (e.g. S1)" value={shelfForm.code} onChange={e => setShelfForm({...shelfForm, code: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)' }} />
               <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                 <button type="submit" style={{ flex: 1, backgroundColor: 'var(--theme-primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600' }}>Save</button>
                 <button type="button" onClick={() => setShowShelfModal(false)} style={{ flex: 1, backgroundColor: 'var(--theme-bg-subtle)', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600' }}>Cancel</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManager;
