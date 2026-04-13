'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Calendar,
  Save
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';

const HostelAttendance = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHostel, setFilterHostel] = useState('');
  const [filterRoom, setFilterRoom] = useState('');

  useEffect(() => {
    fetchActiveStudents();
  }, [date]);

  const fetchActiveStudents = async () => {
    setLoading(true);
    try {
      // Fetch both residents and the saved attendance records for the selected date concurrently
      const [allotmentsRes, attendanceRes] = await Promise.all([
        hostelApi.getAllotments(),
        hostelApi.getAttendance({ date: date })
      ]);
      
      // Build lookup map for existing attendance
      const savedAttendanceMap = {};
      attendanceRes.data.forEach(record => {
        savedAttendanceMap[record.student] = record.status;
      });

      // Initialize attendance state with actual saved status, or default to present if no record exists
      const initializedStudents = allotmentsRes.data.map(s => ({
        ...s,
        currentStatus: savedAttendanceMap[s.student] || 'present'
      }));
      
      setStudents(initializedStudents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId, status) => {
    setStudents(prev => prev.map(s => 
      s.student === studentId ? { ...s, currentStatus: status } : s
    ));
  };

  const handleSave = async () => {
    const records = students.map(s => ({
      student: s.student,
      room: s.room,
      date: date,
      status: s.currentStatus
    }));

    try {
      await hostelApi.markAttendance(records);
      alert('Attendance saved successfully');
    } catch (err) {
      alert('Failed to save attendance');
    }
  };

  const filterHostelOptions = React.useMemo(() => {
    const unique = new Map();
    students.forEach((item) => {
      if (item.hostel_name && item.hostel_id) {
        unique.set(String(item.hostel_id), item.hostel_name);
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  const filterRoomOptions = React.useMemo(() => {
    const unique = new Map();
    students.forEach((item) => {
      if (item.room_number && item.room && (!filterHostel || String(item.hostel_id) === String(filterHostel))) {
        unique.set(String(item.room), item.room_number);
      }
    });
    return Array.from(unique.entries()).map(([id, number]) => ({ id, number }));
  }, [students, filterHostel]);

  const filteredStudents = React.useMemo(() => {
    let result = students;
    if (filterHostel) result = result.filter((item) => String(item.hostel_id) === String(filterHostel));
    if (filterRoom) result = result.filter((item) => String(item.room) === String(filterRoom));

    const query = searchTerm.trim().toLowerCase();
    if (!query) return result;
    return result.filter((item) => {
      const haystack = [
        item.student_name,
        item.student_admission,
        item.hostel_name,
        item.room_number,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [students, searchTerm, filterHostel, filterRoom]);

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar} style={{ flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
          <div className={styles.searchWrapper} style={{ minWidth: '250px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search student or admission number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={styles.formControl}
            style={{ width: '180px' }}
            value={filterHostel}
            onChange={(e) => {
              setFilterHostel(e.target.value);
              setFilterRoom('');
            }}
          >
            <option value="">All Hostels</option>
            {filterHostelOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select
            className={styles.formControl}
            style={{ width: '150px' }}
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          >
            <option value="">All Rooms</option>
            {filterRoomOptions.map(r => <option key={r.id} value={r.id}>Room {r.number}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className={styles.searchWrapper}>
            <Calendar size={18} />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
            Marking night roll-call
          </span>
          <button onClick={handleSave} className={styles.btnPrimary}>
            <Save size={18} />
            Save Attendance
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Student</th>
              <th style={{ width: '20%' }}>Room</th>
              <th style={{ width: '40%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>Loading residents...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>No students allotted to any hostel.</td></tr>
            ) : filteredStudents.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.student_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.student_admission}</div>
                </td>
                <td style={{ fontWeight: '500' }}>Room {item.room_number}</td>
                <td>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button"
                      onClick={() => setStatus(item.student, 'present')}
                      className={styles.tabButton}
                      style={{ 
                        padding: '6px 12px', fontSize: '12px', minHeight: '34px',
                        background: item.currentStatus === 'present' ? '#1e293b' : 'transparent',
                        color: item.currentStatus === 'present' ? '#fff' : '#64748b',
                        border: item.currentStatus === 'present' ? 'none' : '1px solid #e2e8f0',
                        boxShadow: item.currentStatus === 'present' ? '0 4px 12px rgba(30, 41, 59, 0.2)' : 'none'
                      }}
                    >
                      <CheckCircle2 size={14} /> Present
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStatus(item.student, 'absent')}
                      className={styles.tabButton}
                      style={{ 
                        padding: '6px 12px', fontSize: '12px', minHeight: '34px',
                        background: item.currentStatus === 'absent' ? '#ef4444' : 'transparent',
                        color: item.currentStatus === 'absent' ? '#fff' : '#64748b',
                        border: item.currentStatus === 'absent' ? 'none' : '1px solid #e2e8f0',
                        boxShadow: item.currentStatus === 'absent' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
                      }}
                    >
                      <XCircle size={14} /> Absent
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStatus(item.student, 'on_leave')}
                      className={styles.tabButton}
                      style={{ 
                        padding: '6px 12px', fontSize: '12px', minHeight: '34px',
                        background: item.currentStatus === 'on_leave' ? '#3b82f6' : 'transparent',
                        color: item.currentStatus === 'on_leave' ? '#fff' : '#64748b',
                        border: item.currentStatus === 'on_leave' ? 'none' : '1px solid #e2e8f0',
                        boxShadow: item.currentStatus === 'on_leave' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                      }}
                    >
                      <Clock size={14} /> Leave
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HostelAttendance;
