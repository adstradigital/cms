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
  const [showFilters, setShowFilters] = useState(false);
  const [filterHostel, setFilterHostel] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [billCandidates, setBillCandidates] = useState([]);
  const [billForm, setBillForm] = useState(DEFAULT_BILL_FORM);
  const [billingPeriods] = useState(() => buildBillingPeriodOptions());

  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'gpay',
    transaction_id: ''
  });

  useEffect(() => {
    fetchHostels();
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchFees();
  }, [filterHostel, filterRoom, filterStatus]);

  const fetchHostels = async () => {
    try {
      const res = await hostelApi.getHostels();
      setHostels(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await hostelApi.getRooms();
      setRooms(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFees = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterHostel) params.hostel = filterHostel;
      if (filterRoom) params.room = filterRoom;
      if (filterStatus) params.status = filterStatus;

      const res = await hostelApi.getFees(params);
      setFees(normalizeListPayload(res.data));
    } catch (err) {
      console.error(err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const filterHostelOptions = useMemo(() => {
    return hostels.map(h => ({ id: h.id, name: h.name }));
  }, [hostels]);

  const filterRoomOptions = useMemo(() => {
    return rooms
      .filter(r => !filterHostel || String(r.hostel) === String(filterHostel))
      .map(r => ({ id: r.id, number: r.room_number }));
  }, [rooms, filterHostel]);

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

  const handleOpenPaymentModal = (fee) => {
    setPaymentModalData(fee);
    setPaymentForm({
      amount_paid: toAmount(fee.balance_due), // Default to full balance
      payment_method: 'gpay',
      transaction_id: `TXN${Math.floor(Math.random() * 100000000)}` 
    });
  };

  const handleProcessPayment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await hostelApi.payFee(paymentModalData.id, {
        amount_paid: Number(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        transaction_id: paymentForm.transaction_id
      });
      alert('Payment processed successfully!');
      setPaymentModalData(null);
      fetchFees();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to process payment.'));
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
          <button 
            className={`${styles.btnSecondary} ${showFilters ? styles.btnActive : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>

          <button className={styles.btnPrimary} onClick={openGenerateModal}>
            <CreditCard size={18} />
            Generate Bills
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filterRow} style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Hostel</label>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Room</label>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Status</label>
            <select
              className={styles.formControl}
              style={{ width: '150px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              className={styles.btnSecondary}
              style={{ height: '38px', padding: '0 12px' }}
              onClick={() => {
                setFilterHostel('');
                setFilterRoom('');
                setFilterStatus('');
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Student</th>
              <th style={{ width: '15%' }}>Period</th>
              <th style={{ width: '20%' }}>Amount Due</th>
              <th style={{ width: '10%' }}>Paid</th>
              <th style={{ width: '10%' }}>Balance</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                     <Loader2 size={24} className="animate-spin" />
                     <span>Loading fee records...</span>
                   </div>
                </td>
              </tr>
            ) : filteredFees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  No fee records found matches your filters.
                </td>
              </tr>
            ) : (
              filteredFees.map((item) => {
                const balanceDue = toAmount(item.balance_due);
                const roomRent = toAmount(item.room_rent);
                const messFee = toAmount(item.mess_fee);
                const elecFee = toAmount(item.electricity_charges);

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>{item.student_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span>{item.student_admission}</span>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span>Room {item.room_number}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#334155' }}>{item.period_label}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Due: {item.due_date}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{amountLabel(item.amount_due)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', letterSpacing: '0.01em' }}>
                        {roomRent > 0 && `Rent ${amountLabel(roomRent)}`} 
                        {messFee > 0 && ` • Mess ${amountLabel(messFee)}`}
                        {elecFee > 0 && ` • Elec ${amountLabel(elecFee)}`}
                      </div>
                    </td>
                    <td style={{ color: '#166534', fontWeight: '600', fontSize: '15px' }}>{amountLabel(item.amount_paid)}</td>
                    <td>
                      {balanceDue > 0 ? (
                        <div>
                          <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '15px' }}>{amountLabel(balanceDue)}</div>
                          <div style={{ fontSize: '10px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Balance</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: '500' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                          Settled
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <div className={styles.actionWrapper} style={{ gap: '8px' }}>
                        {balanceDue > 0 ? (
                          <button 
                            className={styles.btnPrimary} 
                            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
                            onClick={() => handleOpenPaymentModal(item)}
                          >
                            Pay
                          </button>
                        ) : (
                          <button className={styles.btnIcon} title="Download Receipt">
                            <Download size={16} />
                          </button>
                        )}
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

      {/* Payment Gateway Modal */}
      {paymentModalData && (
        <div className={styles.modalBackdrop} onClick={() => !submitting && setPaymentModalData(null)}>
          <div
            className={styles.modalContent}
            style={{ width: 'max-content', maxWidth: '500px' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader} style={{ marginBottom: '15px' }}>
              <h2 className={styles.modalTitle}>Process Payment</h2>
              <button type="button" className={styles.modalClose} onClick={() => setPaymentModalData(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Paying for</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '16px', color: '#1e293b' }}>{paymentModalData.student_name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
                Balance: {amountLabel(paymentModalData.balance_due)}
              </p>
            </div>

            <form className={styles.modalForm} onSubmit={handleProcessPayment}>
              <div className={styles.formGroup}>
                <label>Amount to Pay</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={paymentModalData.balance_due}
                  step="0.01"
                  className={styles.formControl}
                  value={paymentForm.amount_paid}
                  onChange={e => setPaymentForm(p => ({ ...p, amount_paid: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['gpay', 'phonepe', 'paytm', 'credit_card', 'cash'].map(method => (
                    <label key={method} style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      padding: '10px', border: '1px solid #e2e8f0', 
                      borderRadius: '8px', cursor: 'pointer',
                      background: paymentForm.payment_method === method ? '#f1f5f9' : '#fff',
                      borderColor: paymentForm.payment_method === method ? '#1e293b' : '#e2e8f0'
                    }}>
                      <input 
                        type="radio" 
                        name="payment_method" 
                        value={method} 
                        checked={paymentForm.payment_method === method}
                        onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                        style={{ margin: 0, accentColor: '#1e293b' }}
                      />
                      <span style={{ textTransform: 'capitalize', fontSize: '13px', fontWeight: '500' }}>
                        {method === 'gpay' ? 'GPay' : method === 'phonepe' ? 'PhonePe' : method.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '5px' }}>
                <label>Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  className={styles.formControl}
                  value={paymentForm.transaction_id}
                  onChange={e => setPaymentForm(p => ({ ...p, transaction_id: e.target.value }))}
                />
              </div>

              <div className={styles.modalActions} style={{ marginTop: '20px' }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setPaymentModalData(null)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : `Pay ${amountLabel(paymentForm.amount_paid || 0)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelFees;
