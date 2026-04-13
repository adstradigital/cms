'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical,
  Zap,
  Wind,
  Edit,
  Trash2
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';
import RoomModal from './RoomModal';

const HostelRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hostels, setHostels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filters, setFilters] = useState({
    hostel: '',
    type: '',
    status: ''
  });

  const fetchHostels = useCallback(async () => {
    try {
      const res = await hostelApi.getHostels();
      setHostels(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hostelApi.getRooms(filters);
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const filteredRooms = React.useMemo(() => {
    if (!searchTerm.trim()) return rooms;
    const lowerQuery = searchTerm.trim().toLowerCase();
    return rooms.filter(room => 
      String(room.room_number).toLowerCase().includes(lowerQuery)
    );
  }, [rooms, searchTerm]);

  const handleSaveRoom = async (data, id) => {
    try {
      if (id) {
        await hostelApi.updateRoom(id, data);
        alert('Room updated successfully!');
      } else {
        await hostelApi.createRoom(data);
        alert('Room added successfully!');
      }
      fetchRooms();
    } catch (err) {
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data)
        : (id ? 'Failed to update room' : 'Failed to add room');
      alert('Error: ' + errorMsg);
      throw err;
    }
  };

  const handleToggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleEditClick = (room) => {
    setSelectedRoom(room);
    setOpenMenuId(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await hostelApi.deleteRoom(id);
      alert('Room deleted successfully!');
      setOpenMenuId(null);
      fetchRooms();
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to delete room';
      alert('Error: ' + errorMsg);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'available': return <span className={`${styles.badge} ${styles.badgeSuccess}`}>Available</span>;
      case 'full': return <span className={`${styles.badge} ${styles.badgeDanger}`}>Full</span>;
      case 'maintenance': return <span className={`${styles.badge} ${styles.badgeWarning}`}>Maintenance</span>;
      case 'reserved': return <span className={`${styles.badge} ${styles.badgeInfo}`}>Reserved</span>;
      default: return null;
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search room by number..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
            <select 
              className={styles.formControl} 
              style={{ width: '180px' }}
              value={filters.hostel}
              onChange={(e) => setFilters({...filters, hostel: e.target.value})}
            >
              <option value="">All Hostels</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <select 
              className={styles.formControl} 
              style={{ width: '150px' }}
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="">All Types</option>
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="triple">Triple</option>
            </select>

            <button
              className={styles.btnPrimary}
              onClick={() => {
                setSelectedRoom(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={18} />
              New Room
            </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Room</th>
              <th style={{ width: '25%' }}>Hostel / Floor</th>
              <th style={{ width: '15%' }}>Type</th>
              <th style={{ width: '12%' }}>Capacity</th>
              <th style={{ width: '15%' }}>Occupancy</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '8%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading rooms...</td></tr>
            ) : filteredRooms.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No rooms found.</td></tr>
            ) : filteredRooms.map((room) => (
              <tr key={room.id}>
                <td style={{ fontWeight: '600', color: '#1e293b' }}>{room.room_number}</td>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{room.hostel_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Floor {room.floor_number}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize', fontWeight: '500' }}>
                    {room.ac_type === 'ac' ? <Zap size={14} color="#3b82f6" /> : <Wind size={14} color="#64748b" />}
                    <span>{room.room_type} {room.ac_type === 'ac' ? '(AC)' : ''}</span>
                  </div>
                </td>
                <td style={{ fontWeight: '500' }}>{room.capacity} Beds</td>
                <td>
                    <div className={styles.progressWrapper}>
                        <div className={styles.progressBarContainer}>
                            <div 
                                className={styles.progressBarFill} 
                                style={{ 
                                    width: `${room.occupancy_percent}%`,
                                    background: room.occupancy_percent >= 100 ? '#ef4444' : 'linear-gradient(90deg, #1e293b 0%, #334155 100%)'
                                }} 
                            />
                        </div>
                        <span className={styles.progressLabel}>
                            {room.occupied} occupied
                        </span>
                    </div>
                </td>
                <td>{getStatusBadge(room.status)}</td>
                <td className={styles.actionCell}>
                  <div className={styles.actionWrapper}>
                    <button className={styles.btnIcon} onClick={(e) => handleToggleMenu(e, room.id)}>
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === room.id && (
                      <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.dropdownItem} onClick={() => handleEditClick(room)}>
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => handleDeleteClick(room.id)}
                        >
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

      <RoomModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoom(null);
        }}
        onSave={handleSaveRoom}
        initialData={selectedRoom}
      />
    </div>
  );
};

export default HostelRooms;
