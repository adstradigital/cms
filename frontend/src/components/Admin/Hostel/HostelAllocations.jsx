'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  ArrowRightLeft,
  LogOut,
  Clock,
  ExternalLink,
  X,
  Loader2,
  Wand2,
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';
import instance from '@/api/instance';

const DEFAULT_MANUAL_FORM = {
  student: '',
  hostel: '',
  room: '',
  remarks: '',
};

const DEFAULT_AUTO_FORM = {
  student: '',
  hostel: '',
  room_type: '',
  apply_gender_rule: true,
  apply_class_rule: true,
};

const getStudentName = (student) => {
  const first = student?.user?.first_name || '';
  const last = student?.user?.last_name || '';
  return `${first} ${last}`.trim() || student?.admission_number || 'Student';
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const payload = error?.response?.data;
  if (!payload) return fallbackMessage;
  if (typeof payload === 'string') return payload;
  if (payload.error) return payload.error;
  const firstField = Object.keys(payload)[0];
  if (!firstField) return fallbackMessage;
  const fieldError = payload[firstField];
  if (Array.isArray(fieldError)) return fieldError[0];
  return fieldError || fallbackMessage;
};

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const HostelAllocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeAllotmentStudents, setActiveAllotmentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateMode, setAllocateMode] = useState('manual');
  const [manualForm, setManualForm] = useState(DEFAULT_MANUAL_FORM);
  const [autoForm, setAutoForm] = useState(DEFAULT_AUTO_FORM);

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (isAllocateModalOpen) {
      fetchAllocationLookups();
    }
  }, [isAllocateModalOpen]);

  useEffect(() => {
    if (!manualForm.room) return;
    const roomStillValid = rooms.some(
      (room) =>
        String(room.id) === String(manualForm.room) &&
        (!manualForm.hostel || String(room.hostel) === String(manualForm.hostel))
    );
    if (!roomStillValid) {
      setManualForm((prev) => ({ ...prev, room: '' }));
    }
  }, [manualForm.hostel, manualForm.room, rooms]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await hostelApi.getAllotments();
      const list = normalizeListPayload(res.data);
      setAllocations(list);
      setActiveAllotmentStudents(
        Array.from(
          new Set(
            list
              .map((item) => item?.student)
              .filter((studentId) => studentId !== null && studentId !== undefined)
              .map((studentId) => String(studentId))
          )
        )
      );
    } catch (err) {
      console.error(err);
      setAllocations([]);
      setActiveAllotmentStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationLookups = async () => {
    setLookupLoading(true);
    try {
      const [hostelsRes, roomsRes, studentsRes, activeAllotmentsRes] = await Promise.all([
        hostelApi.getHostels(),
        hostelApi.getRooms({ status: 'available' }),
        instance.get('/students/students/', { params: { is_active: 'true' } }),
        hostelApi.getAllotments({ active: 'true' }),
      ]);
      const activeAllotments = normalizeListPayload(activeAllotmentsRes.data);
      setHostels(normalizeListPayload(hostelsRes.data));
      setRooms(normalizeListPayload(roomsRes.data));
      setStudents(normalizeListPayload(studentsRes.data));
      setActiveAllotmentStudents(
        Array.from(
          new Set(
            activeAllotments
              .map((item) => item?.student)
              .filter((studentId) => studentId !== null && studentId !== undefined)
              .map((studentId) => String(studentId))
          )
        )
      );
    } catch (err) {
      console.error(err);
      alert(getApiErrorMessage(err, 'Failed to load students and room availability.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVacate = async (id) => {
    if (!window.confirm('Are you sure you want to vacate this student?')) return;
    try {
      await hostelApi.vacateStudent(id);
      fetchAllocations();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to vacate student.'));
    }
  };

  const handleOpenAllocateModal = () => {
    setAllocateMode('manual');
    setManualForm({ ...DEFAULT_MANUAL_FORM });
    setAutoForm({ ...DEFAULT_AUTO_FORM });
    setIsAllocateModalOpen(true);
  };

  const handleCloseAllocateModal = () => {
    if (submitting) return;
    setIsAllocateModalOpen(false);
  };

  const activeAllotmentStudentIds = useMemo(
    () => new Set(activeAllotmentStudents.map((studentId) => String(studentId))),
    [activeAllotmentStudents]
  );

  const allocatableStudents = useMemo(
    () =>
      students
        .filter((student) => !activeAllotmentStudentIds.has(String(student.id)))
        .sort((a, b) => getStudentName(a).localeCompare(getStudentName(b))),
    [students, activeAllotmentStudentIds]
  );

  const availableRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const availableBeds =
          typeof room.available_beds === 'number'
            ? room.available_beds
            : Number(room.capacity || 0) - Number(room.occupied || 0);
        return room.status === 'available' && availableBeds > 0;
      }),
    [rooms]
  );

  const manualRoomOptions = useMemo(
    () =>
      availableRooms.filter(
        (room) => !manualForm.hostel || String(room.hostel) === String(manualForm.hostel)
      ),
    [availableRooms, manualForm.hostel]
  );

  const filteredAllocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return allocations;
    return allocations.filter((item) => {
      const haystack = [
        item.student_name,
        item.student_admission,
        item.hostel_name,
        item.room_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [allocations, searchTerm]);

  const handleManualAllocate = async (event) => {
    event.preventDefault();
    if (!manualForm.student || !manualForm.room) {
      alert('Please select both student and room.');
      return;
    }
    if (activeAllotmentStudentIds.has(String(manualForm.student))) {
      alert('Selected student already has an active allotment. Use Transfer Student or vacate first.');
      return;
    }

    setSubmitting(true);
    try {
      await hostelApi.createAllotment({
        student: Number(manualForm.student),
        room: Number(manualForm.room),
        remarks: manualForm.remarks?.trim() || '',
      });
      alert('Room allocated successfully.');
      setIsAllocateModalOpen(false);
      fetchAllocations();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Manual allocation failed.');
      alert(message);
      if (String(message).toLowerCase().includes('already has an active allotment')) {
        fetchAllocations();
        fetchAllocationLookups();
        setManualForm((prev) => ({ ...prev, student: '' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoAllocate = async (event) => {
    event.preventDefault();
    if (!autoForm.student) {
      alert('Please select a student for auto allocation.');
      return;
    }
    if (activeAllotmentStudentIds.has(String(autoForm.student))) {
      alert('Selected student already has an active allotment. Use Transfer Student or vacate first.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        student: Number(autoForm.student),
        apply_gender_rule: Boolean(autoForm.apply_gender_rule),
        apply_class_rule: Boolean(autoForm.apply_class_rule),
      };
      if (autoForm.hostel) payload.hostel = Number(autoForm.hostel);
      if (autoForm.room_type) payload.room_type = autoForm.room_type;

      const res = await hostelApi.autoAssign(payload);
      const message = res?.data?.room_number
        ? `Student allocated to ${res.data.hostel_name} - Room ${res.data.room_number}.`
        : 'Student allocated successfully.';
      alert(message);
      setIsAllocateModalOpen(false);
      fetchAllocations();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Auto allocation failed.');
      alert(message);
      if (String(message).toLowerCase().includes('already has an active allotment')) {
        fetchAllocations();
        fetchAllocationLookups();
        setAutoForm((prev) => ({ ...prev, student: '' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStudentOptionLabel = (student) => {
    const name = getStudentName(student);
    const className = student.class_name ? ` | ${student.class_name}` : '';
    const yearName = student.academic_year ? ` | Year ${student.academic_year}` : '';
    return `${name} (${student.admission_number || 'N/A'})${className}${yearName}`;
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search student or admission number..." 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
            <button className={styles.btnSecondary}>
              <ArrowRightLeft size={18} />
              Transfer Student
            </button>

            <button className={styles.btnPrimary} onClick={handleOpenAllocateModal}>
              <UserPlus size={18} />
              Allocate Room
            </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Student</th>
              <th style={{ width: '25%' }}>Hostel / Room</th>
              <th style={{ width: '20%' }}>Allotted Date</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading assignments...</td></tr>
            ) : filteredAllocations.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No active allotments.</td></tr>
            ) : filteredAllocations.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                      {(item.student_name || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.student_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{item.student_admission}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.hostel_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Room {item.room_number}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <Clock size={14} color="#64748b" />
                    {new Date(item.join_date).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>Active Allotment</span>
                </td>
                <td>
                  <div className={styles.actionWrapper} style={{ gap: '8px' }}>
                    <button 
                      onClick={() => handleVacate(item.id)}
                      className={styles.btnIcon}
                      title="Vacate Student"
                      style={{ color: '#ef4444' }}
                    >
                      <LogOut size={16} />
                    </button>
                    <button 
                      className={styles.btnIcon}
                      title="Details"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAllocateModalOpen && (
        <div className={styles.modalBackdrop} onClick={handleCloseAllocateModal}>
          <div
            className={styles.modalContent}
            style={{ width: 'min(760px, 96vw)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Allocate Room</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={handleCloseAllocateModal}
                aria-label="Close allocate room modal"
              >
                <X size={18} />
              </button>
            </div>

            {lookupLoading ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: '#475569' }}>
                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                Loading students and room data...
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    border: '1px solid #dbe3ec',
                    borderRadius: '12px',
                    padding: '4px',
                    marginBottom: '18px',
                    gap: '4px',
                    background: '#f8fafc',
                  }}
                >
                  <button
                    type="button"
                    className={allocateMode === 'manual' ? styles.btnPrimary : styles.btnSecondary}
                    style={{ minWidth: '150px' }}
                    onClick={() => setAllocateMode('manual')}
                  >
                    <UserPlus size={16} />
                    Manual Allocation
                  </button>
                  <button
                    type="button"
                    className={allocateMode === 'auto' ? styles.btnPrimary : styles.btnSecondary}
                    style={{ minWidth: '170px' }}
                    onClick={() => setAllocateMode('auto')}
                  >
                    <Wand2 size={16} />
                    Automatic Allocation
                  </button>
                </div>

                {allocateMode === 'manual' ? (
                  <form className={styles.modalForm} onSubmit={handleManualAllocate}>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label>Student</label>
                        <select
                          required
                          className={styles.formControl}
                          value={manualForm.student}
                          onChange={(event) =>
                            setManualForm((prev) => ({ ...prev, student: event.target.value }))
                          }
                        >
                          <option value="">Select Student</option>
                          {allocatableStudents.map((student) => (
                            <option key={student.id} value={student.id}>
                              {renderStudentOptionLabel(student)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Hostel (Optional Filter)</label>
                        <select
                          className={styles.formControl}
                          value={manualForm.hostel}
                          onChange={(event) =>
                            setManualForm((prev) => ({
                              ...prev,
                              hostel: event.target.value,
                            }))
                          }
                        >
                          <option value="">All Hostels</option>
                          {hostels.map((hostel) => (
                            <option key={hostel.id} value={hostel.id}>
                              {hostel.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Room</label>
                        <select
                          required
                          className={styles.formControl}
                          value={manualForm.room}
                          onChange={(event) =>
                            setManualForm((prev) => ({ ...prev, room: event.target.value }))
                          }
                        >
                          <option value="">Select Available Room</option>
                          {manualRoomOptions.map((room) => (
                            <option key={room.id} value={room.id}>
                              {`${room.hostel_name} | Room ${room.room_number} | Floor ${room.floor_number} | ${room.available_beds} beds left`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Remarks (Optional)</label>
                        <textarea
                          className={styles.formControl}
                          placeholder="Any special note for this allotment..."
                          value={manualForm.remarks}
                          onChange={(event) =>
                            setManualForm((prev) => ({ ...prev, remarks: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={handleCloseAllocateModal}>
                        Cancel
                      </button>
                      <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Allocate Room'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className={styles.modalForm} onSubmit={handleAutoAllocate}>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label>Student</label>
                        <select
                          required
                          className={styles.formControl}
                          value={autoForm.student}
                          onChange={(event) =>
                            setAutoForm((prev) => ({ ...prev, student: event.target.value }))
                          }
                        >
                          <option value="">Select Student</option>
                          {allocatableStudents.map((student) => (
                            <option key={student.id} value={student.id}>
                              {renderStudentOptionLabel(student)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Preferred Hostel (Optional)</label>
                        <select
                          className={styles.formControl}
                          value={autoForm.hostel}
                          onChange={(event) =>
                            setAutoForm((prev) => ({ ...prev, hostel: event.target.value }))
                          }
                        >
                          <option value="">Auto-select by rules</option>
                          {hostels.map((hostel) => (
                            <option key={hostel.id} value={hostel.id}>
                              {hostel.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Room Type (Optional)</label>
                        <select
                          className={styles.formControl}
                          value={autoForm.room_type}
                          onChange={(event) =>
                            setAutoForm((prev) => ({ ...prev, room_type: event.target.value }))
                          }
                        >
                          <option value="">Any Room Type</option>
                          <option value="single">Single</option>
                          <option value="double">Double</option>
                          <option value="triple">Triple</option>
                          <option value="dormitory">Dormitory</option>
                        </select>
                      </div>

                      <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Auto-allocation Rules</label>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '10px',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              border: '1px solid #dbe3ec',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={autoForm.apply_gender_rule}
                              onChange={(event) =>
                                setAutoForm((prev) => ({
                                  ...prev,
                                  apply_gender_rule: event.target.checked,
                                }))
                              }
                            />
                            Gender
                          </label>

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              border: '1px solid #dbe3ec',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={autoForm.apply_class_rule}
                              onChange={(event) =>
                                setAutoForm((prev) => ({
                                  ...prev,
                                  apply_class_rule: event.target.checked,
                                }))
                              }
                            />
                            Class
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnSecondary} onClick={handleCloseAllocateModal}>
                        Cancel
                      </button>
                      <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Auto Allocate'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelAllocations;
