'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';

const DEFAULT_FORM = {
  hostel: '',
  floor: '',
  room_number: '',
  room_type: 'double',
  ac_type: 'non_ac',
  capacity: 2,
  monthly_rent: 0,
  description: ''
};

const RoomModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [floors, setFloors] = useState([]);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (isOpen) {
      fetchHostels();
      if (initialData) {
        setFormData({
          hostel: initialData.hostel ? String(initialData.hostel) : '',
          floor: initialData.floor ? String(initialData.floor) : '',
          room_number: initialData.room_number || '',
          room_type: initialData.room_type || 'double',
          ac_type: initialData.ac_type || 'non_ac',
          capacity: Number(initialData.capacity || 2),
          monthly_rent: Number(initialData.monthly_rent || 0),
          description: initialData.description || ''
        });
      } else {
        setFormData(DEFAULT_FORM);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (formData.hostel) {
      fetchFloors(formData.hostel);
    } else {
      setFloors([]);
      setFormData(prev => ({ ...prev, floor: '' }));
    }
  }, [formData.hostel]);

  const fetchHostels = async () => {
    try {
      const res = await hostelApi.getHostels();
      setHostels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFloors = async (hostelId) => {
    try {
      const res = await hostelApi.getFloors({ hostel: hostelId });
      setFloors(res.data);
      if (res.data.length > 0) {
        setFormData(prev => {
          const currentFloor = prev.floor ? String(prev.floor) : '';
          const hasCurrent = currentFloor && res.data.some(f => String(f.id) === currentFloor);
          const nextFloor = hasCurrent ? currentFloor : String(res.data[0].id);
          if (nextFloor === currentFloor) return prev;
          return { ...prev, floor: nextFloor };
        });
      } else {
        setFormData(prev => (prev.floor ? { ...prev, floor: '' } : prev));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const capacity = Number(formData.capacity);
      const monthlyRent = formData.monthly_rent === '' ? 0 : Number(formData.monthly_rent);

      if (!Number.isFinite(capacity) || capacity < 1) {
        alert('Capacity must be at least 1 bed.');
        setLoading(false);
        return;
      }

      await onSave(
        {
          ...formData,
          capacity,
          monthly_rent: Number.isFinite(monthlyRent) ? monthlyRent : 0,
        },
        initialData?.id
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent} style={{ width: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{initialData ? 'Edit Room' : 'Add New Room'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label>Hostel</label>
              <select 
                required
                className={styles.formControl}
                value={formData.hostel}
                onChange={(e) => setFormData({...formData, hostel: e.target.value})}
              >
                <option value="">Select Hostel</option>
                {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Floor</label>
              <select 
                required
                className={styles.formControl}
                value={formData.floor}
                onChange={(e) => setFormData({...formData, floor: e.target.value})}
                disabled={!formData.hostel}
              >
                <option value="">Select Floor</option>
                {floors.map(f => <option key={f.id} value={f.id}>Floor {f.number} {f.name ? `(${f.name})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label>Room Number</label>
              <input 
                required
                type="text" 
                className={styles.formControl} 
                placeholder="e.g. 101"
                value={formData.room_number}
                onChange={(e) => setFormData({...formData, room_number: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Capacity (Beds)</label>
              <input 
                required
                type="number" 
                className={styles.formControl} 
                value={formData.capacity}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  setFormData({
                    ...formData,
                    capacity: rawValue === '' ? '' : parseInt(rawValue, 10)
                  });
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label>Room Type</label>
              <select 
                className={styles.formControl}
                value={formData.room_type}
                onChange={(e) => setFormData({...formData, room_type: e.target.value})}
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dormitory">Dormitory</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>AC Type</label>
              <select 
                className={styles.formControl}
                value={formData.ac_type}
                onChange={(e) => setFormData({...formData, ac_type: e.target.value})}
              >
                <option value="non_ac">Non-AC</option>
                <option value="ac">AC</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Monthly Rent (৳)</label>
            <input 
              type="number" 
              className={styles.formControl} 
              value={formData.monthly_rent}
              onChange={(e) => {
                const rawValue = e.target.value;
                setFormData({
                  ...formData,
                  monthly_rent: rawValue === '' ? '' : parseFloat(rawValue)
                });
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.btnPrimary} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : (initialData ? 'Save Changes' : 'Save Room')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
