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
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchActiveStudents();
  }, []);

  const fetchActiveStudents = async () => {
    setLoading(true);
    try {
      // We use allotments to get residents
      const res = await hostelApi.getAllotments();
      setStudents(res.data);
      
      // Initialize attendance state with defaults (present)
      const initial = {};
      res.data.forEach(s => {
        initial[s.student] = 'present';
      });
      setAttendance(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    const records = students.map(s => ({
      student: s.student,
      room: s.room,
      date: date,
      status: attendance[s.student]
    }));

    try {
      await hostelApi.markAttendance(records);
      alert('Attendance saved successfully');
    } catch (err) {
      alert('Failed to save attendance');
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
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
        </div>
        
        <button onClick={handleSave} className={styles.btnPrimary}>
          <Save size={18} />
          Save Attendance
        </button>
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
            ) : students.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>No students allotted to any hostel.</td></tr>
            ) : students.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.student_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.student_admission}</div>
                </td>
                <td style={{ fontWeight: '500' }}>Room {item.room_number}</td>
                <td>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setStatus(item.student, 'present')}
                      className={`${styles.tabButton} ${attendance[item.student] === 'present' ? styles.activeTab : ''}`}
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', border: attendance[item.student] === 'present' ? 'none' : '1px solid #e2e8f0' }}
                    >
                      <CheckCircle2 size={14} /> Present
                    </button>
                    <button 
                      onClick={() => setStatus(item.student, 'absent')}
                      className={`${styles.tabButton} ${attendance[item.student] === 'absent' ? styles.activeTab : ''}`}
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', border: attendance[item.student] === 'absent' ? 'none' : '1px solid #e2e8f0', background: attendance[item.student] === 'absent' ? '#ef4444' : '' }}
                    >
                      <XCircle size={14} /> Absent
                    </button>
                    <button 
                      onClick={() => setStatus(item.student, 'on_leave')}
                      className={`${styles.tabButton} ${attendance[item.student] === 'on_leave' ? styles.activeTab : ''}`}
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', border: attendance[item.student] === 'on_leave' ? 'none' : '1px solid #e2e8f0', background: attendance[item.student] === 'on_leave' ? '#3b82f6' : '' }}
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
