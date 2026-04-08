'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  Download,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';

const DEFAULT_BILL_FORM = {
  student: '',
  room: '',
  period_label: '',
  due_date: '',
  room_rent: '',
  electricity_charges: '',
  mess_fee: '',
  remarks: '',
};

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
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

const getStudentLabel = (entry) => {
  const name = entry?.student_name || 'Student';
  const admission = entry?.student_admission ? ` (${entry.student_admission})` : '';
  return `${name}${admission}`;
};

const toAmount = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const amountLabel = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const getPeriodLabel = (dateObj) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(dateObj);

const buildBillingPeriodOptions = (pastMonths = 3, futureMonths = 18) => {
  const base = new Date();
  base.setDate(1);
  const options = [];

  for (let offset = -pastMonths; offset <= futureMonths; offset += 1) {
    const monthDate = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    options.push(getPeriodLabel(monthDate));
  }

  return options;
};

const HostelFees = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [billCandidates, setBillCandidates] = useState([]);
  const [billForm, setBillForm] = useState(DEFAULT_BILL_FORM);
  const [billingPeriods] = useState(() => buildBillingPeriodOptions());

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await hostelApi.getFees();
      setFees(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillCandidates = async () => {
    setLookupLoading(true);
    try {
      const [allotmentsRes, roomsRes] = await Promise.all([
        hostelApi.getAllotments({ active: 'true' }),
        hostelApi.getRooms(),
      ]);

      const allotments = normalizeListPayload(allotmentsRes.data);
      const rooms = normalizeListPayload(roomsRes.data);
      const roomById = new Map(rooms.map((room) => [String(room.id), room]));

      const byStudent = new Map();
      allotments.forEach((entry) => {
        const studentId = entry?.student;
        const roomId = entry?.room;
        if (!studentId || !roomId || byStudent.has(String(studentId))) {
          return;
        }

        const roomDetail = roomById.get(String(roomId));
        byStudent.set(String(studentId), {
          student_id: studentId,
          student_name: entry.student_name,
          student_admission: entry.student_admission,
          room_id: roomId,
          room_number: entry.room_number || roomDetail?.room_number || '',
          hostel_name: entry.hostel_name || roomDetail?.hostel_name || '',
          monthly_rent: toAmount(roomDetail?.monthly_rent),
        });
      });

      const candidates = Array.from(byStudent.values()).sort((a, b) =>
        getStudentLabel(a).localeCompare(getStudentLabel(b))
      );

      setBillCandidates(candidates);
    } catch (err) {
      console.error(err);
      setBillCandidates([]);
      alert(getApiErrorMessage(err, 'Failed to load allotted students for billing.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const selectedCandidate = useMemo(
    () => billCandidates.find((entry) => String(entry.student_id) === String(billForm.student)),
    [billCandidates, billForm.student]
  );

  const totalDue = useMemo(() => {
    const roomRent = toAmount(billForm.room_rent);
    const electricity = toAmount(billForm.electricity_charges);
    const mess = toAmount(billForm.mess_fee);
    return roomRent + electricity + mess;
  }, [billForm.room_rent, billForm.electricity_charges, billForm.mess_fee]);

  const filteredFees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return fees;

    return fees.filter((item) => {
      const haystack = [
        item.student_name,
        item.student_admission,
        item.room_number,
        item.period_label,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [fees, searchTerm]);

  const openGenerateModal = () => {
    setBillForm({
      ...DEFAULT_BILL_FORM,
      period_label: getPeriodLabel(new Date()),
    });
    setIsGenerateModalOpen(true);
    fetchBillCandidates();
  };

  const closeGenerateModal = () => {
    if (submitting) return;
    setIsGenerateModalOpen(false);
  };

  const handleStudentChange = (studentId) => {
    const student = billCandidates.find((entry) => String(entry.student_id) === String(studentId));

    if (!student) {
      setBillForm((prev) => ({
        ...prev,
        student: studentId,
        room: '',
        room_rent: '',
      }));
      return;
    }

    setBillForm((prev) => ({
      ...prev,
      student: String(student.student_id),
      room: String(student.room_id),
      room_rent: student.monthly_rent ? String(student.monthly_rent) : '',
    }));
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();

    if (!billForm.student || !billForm.room || !billForm.period_label || !billForm.due_date) {
      alert('Please select student and fill period + due date.');
      return;
    }

    const roomRent = toAmount(billForm.room_rent);
    const electricity = toAmount(billForm.electricity_charges);
    const mess = toAmount(billForm.mess_fee);

    if (roomRent < 0 || electricity < 0 || mess < 0) {
      alert('Charges cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await hostelApi.createFee({
        student: Number(billForm.student),
        room: Number(billForm.room),
        period_label: billForm.period_label.trim(),
        due_date: billForm.due_date,
        room_rent: roomRent,
        electricity_charges: electricity,
        mess_fee: mess,
        amount_due: totalDue,
        remarks: billForm.remarks.trim(),
      });

      alert('Hostel bill generated successfully.');
      setIsGenerateModalOpen(false);
      fetchFees();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to generate hostel bill.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className={`${styles.badge} ${styles.badgeSuccess}`}>Paid</span>;
      case 'partial':
        return <span className={`${styles.badge} ${styles.badgeInfo}`}>Partial</span>;
      case 'overdue':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>Overdue</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeWarning}`}>Pending</span>;
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search student or receipt..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.btnSecondary}>
            <Filter size={18} />
            Filters
          </button>

          <button className={styles.btnPrimary} onClick={openGenerateModal}>
            <CreditCard size={18} />
            Generate Bills
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Student</th>
              <th style={{ width: '15%' }}>Period</th>
              <th style={{ width: '15%' }}>Amount Due</th>
              <th style={{ width: '15%' }}>Paid</th>
              <th style={{ width: '10%' }}>Balance</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  Loading fee records...
                </td>
              </tr>
            ) : filteredFees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  No fee records found.
                </td>
              </tr>
            ) : (
              filteredFees.map((item) => {
                const balanceDue = toAmount(item.balance_due);
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.student_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Room {item.room_number}</div>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      <div>{item.period_label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Due: {item.due_date}</div>
                    </td>
                    <td style={{ fontWeight: '700', color: '#1e293b' }}>
                      <div>{amountLabel(item.amount_due)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Rent {amountLabel(item.room_rent)} + Elec {amountLabel(item.electricity_charges)} + Mess {amountLabel(item.mess_fee)}
                      </div>
                    </td>
                    <td style={{ color: '#166534', fontWeight: '600' }}>{amountLabel(item.amount_paid)}</td>
                    <td style={{ fontWeight: '600', color: balanceDue > 0 ? '#ef4444' : '#64748b' }}>
                      {balanceDue > 0 ? amountLabel(balanceDue) : 'Settled'}
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <div className={styles.actionWrapper} style={{ gap: '8px' }}>
                        {balanceDue > 0 && (
                          <button className={styles.btnPrimary} style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px' }}>
                            Pay
                          </button>
                        )}
                        <button className={styles.btnIcon} title="Download Receipt">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isGenerateModalOpen && (
        <div className={styles.modalBackdrop} onClick={closeGenerateModal}>
          <div
            className={styles.modalContent}
            style={{ width: 'min(880px, 96vw)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Generate Hostel Bill</h2>
              <button type="button" className={styles.modalClose} onClick={closeGenerateModal} aria-label="Close bill form">
                <X size={18} />
              </button>
            </div>

            {lookupLoading ? (
              <div style={{ padding: '34px 0', textAlign: 'center', color: '#475569' }}>
                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                Loading allotted students...
              </div>
            ) : (
              <form className={styles.modalForm} onSubmit={handleGenerateBill}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Student</label>
                    <select
                      required
                      className={styles.formControl}
                      value={billForm.student}
                      onChange={(event) => handleStudentChange(event.target.value)}
                    >
                      <option value="">Select Student</option>
                      {billCandidates.map((entry) => (
                        <option key={entry.student_id} value={entry.student_id}>
                          {getStudentLabel(entry)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Hostel / Room</label>
                    <input
                      type="text"
                      className={styles.formControl}
                      value={selectedCandidate ? `${selectedCandidate.hostel_name} | Room ${selectedCandidate.room_number}` : ''}
                      placeholder="Selected student's allotted room"
                      readOnly
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Billing Period</label>
                    <select
                      required
                      className={styles.formControl}
                      value={billForm.period_label}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, period_label: event.target.value }))}
                    >
                      <option value="">Select Billing Period</option>
                      {billingPeriods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Due Date</label>
                    <input
                      required
                      type="date"
                      className={styles.formControl}
                      value={billForm.due_date}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, due_date: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Room Rent</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formControl}
                      value={billForm.room_rent}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, room_rent: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Electricity Charges</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formControl}
                      value={billForm.electricity_charges}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, electricity_charges: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Mess Food Charges</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formControl}
                      value={billForm.mess_fee}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, mess_fee: event.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Total Due</label>
                    <input type="text" className={styles.formControl} value={amountLabel(totalDue)} readOnly />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Remarks (Optional)</label>
                    <textarea
                      className={styles.formControl}
                      placeholder="Additional fee note..."
                      value={billForm.remarks}
                      onChange={(event) => setBillForm((prev) => ({ ...prev, remarks: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnSecondary} onClick={closeGenerateModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Generate Bill'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelFees;
