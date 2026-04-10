'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  MoreVertical,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';
import HostelModal from './HostelModal';

const HostelList = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [error, setError] = useState(null);

  const fetchHostels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hostelApi.getHostels();
      setHostels(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load hostel data. Please check your connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const handleToggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleEditClick = (hostel) => {
    setSelectedHostel(hostel);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (data, id) => {
    try {
      await hostelApi.updateHostel(id, data);
      alert('Hostel updated successfully!');
      fetchHostels();
    } catch (err) {
      alert('Failed to update hostel');
      console.error(err);
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this hostel? This action cannot be undone.')) {
        try {
            await hostelApi.deleteHostel(id);
            alert('Hostel deleted successfully');
            fetchHostels();
        } catch (err) {
            alert('Failed to delete hostel. Make sure it has no rooms/allotments.');
            console.error(err);
        }
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input type="text" placeholder="Search hostels by name or code..." />
        </div>
        <button className={styles.btnSecondary} onClick={fetchHostels}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Hostel Name</th>
              <th>Code</th>
              <th>Category</th>
              <th>Floors</th>
              <th>Capacity</th>
              <th>Occupancy</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" style={{ margin: '0 auto 10px' }} />
                Loading hostels...
              </td></tr>
            ) : error ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                <p>{error}</p>
                <button onClick={fetchHostels} className={styles.btnSecondary} style={{ marginTop: '12px' }}>Retry</button>
              </td></tr>
            ) : hostels.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No hostels found.</td></tr>
            ) : hostels.map((hostel) => (
              <tr key={hostel.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} color="#1e293b" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1e293b' }}>{hostel.name}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={10} /> {hostel.address || 'No address'}
                      </p>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{hostel.code}</span></td>
                <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{hostel.gender}</td>
                <td style={{ fontWeight: '500' }}>{hostel.total_floors}</td>
                <td style={{ fontWeight: '500' }}>{hostel.total_capacity || 0} Beds</td>
                <td>
                  <div className={styles.progressWrapper}>
                    <div className={styles.progressBarContainer}>
                      <div 
                        className={styles.progressBarFill} 
                        style={{ 
                          width: `${Math.min(100, (hostel.total_occupancy / (hostel.total_capacity || 1) * 100) || 0)}%` 
                        }} 
                      />
                    </div>
                    <span className={styles.progressLabel}>
                      {hostel.total_capacity ? Math.round((hostel.total_occupancy / hostel.total_capacity * 100) || 0) : 0}% Occupied
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${hostel.is_active ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {hostel.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <div className={styles.actionWrapper}>
                    <button className={styles.btnIcon} onClick={(e) => handleToggleMenu(e, hostel.id)}>
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === hostel.id && (
                      <div
                        className={styles.dropdownMenu}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className={styles.dropdownItem} onClick={() => handleEditClick(hostel)}>
                          <Edit size={14} /> Edit
                        </button>
                        <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={() => handleDeleteClick(hostel.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HostelModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        initialData={selectedHostel}
      />
    </div>
  );
};

export default HostelList;
