'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import styles from './HostelModule.module.css';

const HostelModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gender: 'boys',
    address: '',
    phone: '',
    email: '',
    total_floors: '1',
    total_capacity: '0',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        total_floors: String(initialData.total_floors ?? 1),
        total_capacity: String(initialData.total_capacity ?? 0),
      });
    } else {
      setFormData({
        name: '',
        code: '',
        gender: 'boys',
        address: '',
        phone: '',
        email: '',
        total_floors: '1',
        total_capacity: '0',
        description: '',
        is_active: true
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalFloors = parseInt(formData.total_floors, 10);
      const totalCapacity = parseInt(formData.total_capacity, 10);

      if (!Number.isFinite(totalFloors) || totalFloors < 1) {
        alert('Total Floors must be at least 1.');
        setLoading(false);
        return;
      }

      if (!Number.isFinite(totalCapacity) || totalCapacity < 0) {
        alert('Total Capacity must be 0 or greater.');
        setLoading(false);
        return;
      }

      await onSave(
        {
          ...formData,
          total_floors: totalFloors,
          total_capacity: totalCapacity,
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
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New Hostel</h2>
          <button type="button" onClick={onClose} className={styles.modalClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Hostel Name</label>
              <input 
                required
                type="text" 
                className={styles.formControl} 
                placeholder="e.g. Einstein Hall"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Hostel Code (Unique)</label>
              <input 
                required
                type="text" 
                className={styles.formControl} 
                placeholder="e.g. EH-01"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Category</label>
              <select 
                className={styles.formControl}
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="boys">Boys Hostel</option>
                <option value="girls">Girls Hostel</option>
                <option value="mixed">Mixed / Staff</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Contact Phone</label>
              <input 
                type="text" 
                className={styles.formControl} 
                placeholder="Phone number..."
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Total Floors</label>
              <input 
                type="number" 
                className={styles.formControl} 
                min="1"
                max="20"
                value={formData.total_floors}
                onChange={(e) => setFormData({ ...formData, total_floors: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Total Capacity (Beds)</label>
              <input 
                type="number" 
                className={styles.formControl} 
                min="0"
                value={formData.total_capacity}
                onChange={(e) => setFormData({ ...formData, total_capacity: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Email (Optional)</label>
              <input 
                type="email" 
                className={styles.formControl} 
                placeholder="hostel@campus.edu"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Address</label>
            <textarea 
              className={styles.formControl} 
              rows="2"
              placeholder="Full location details..."
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            ></textarea>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.btnPrimary}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Hostel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostelModal;
