'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  Salad,
  Search,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import styles from './HostelModule.module.css';
import hostelApi from '@/api/hostelApi';
import instance from '@/api/instance';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={16} /> },
  { id: 'attendance', label: 'Attendance', icon: <ClipboardCheck size={16} /> },
  { id: 'diet', label: 'Diet & Allergy', icon: <Salad size={16} /> },
  { id: 'feedback', label: 'Ratings', icon: <MessageSquareWarning size={16} /> },
  { id: 'inventory', label: 'Inventory', icon: <Boxes size={16} /> },
  { id: 'vendors', label: 'Vendors', icon: <Truck size={16} /> },
  { id: 'logs', label: 'Wastage/Consumption', icon: <BarChart3 size={16} /> },
];

const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'];
const ATTENDANCE_STATUS = ['ate', 'skipped'];
const DIET_TYPES = ['veg', 'non_veg', 'eggetarian', 'vegan'];
const FEEDBACK_STATUS = ['open', 'in_progress', 'resolved'];

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getApiErrorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (payload.error) return payload.error;
  const key = Object.keys(payload)[0];
  if (!key) return fallback;
  const value = payload[key];
  return Array.isArray(value) ? value[0] : value || fallback;
};

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const parseAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getYearMonth = (dateValue) => {
  if (!dateValue) return '';

  const raw = String(dateValue).trim();

  // ISO-like: YYYY-MM...
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) {
    const parts = raw.split(/[-/]/);
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    if (year && month) return `${year}-${month}`;
    return '';
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
    const [year, month] = raw.split('/');
    return year && month ? `${year}-${month}` : '';
  }

  // Fallback: try Date parsing
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const inSelectedMonth = (dateValue, monthValue) => {
  if (!monthValue) return true;
  return getYearMonth(dateValue) === monthValue;
};

const monthRange = (monthValue) => {
  if (!monthValue || !monthValue.includes('-')) return {};
  const [yRaw, mRaw] = monthValue.split('-');
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return {};
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start_date: start, end_date: end };
};

const MENU_STORAGE_SEPARATOR = '|||';

const packMenuItems = (dishName, items) => {
  const cleanDish = String(dishName || '').trim();
  const cleanItems = String(items || '').trim();
  if (!cleanDish) return cleanItems;
  if (!cleanItems) return cleanDish;
  return `${cleanDish}${MENU_STORAGE_SEPARATOR}${cleanItems}`;
};

const unpackMenuItems = (rawItems) => {
  const value = String(rawItems || '');
  if (!value.includes(MENU_STORAGE_SEPARATOR)) {
    return {
      dish_name: '',
      items: value,
    };
  }
  const [dishName, ...rest] = value.split(MENU_STORAGE_SEPARATOR);
  return {
    dish_name: String(dishName || '').trim(),
    items: rest.join(MENU_STORAGE_SEPARATOR).trim(),
  };
};

const getStudentLabel = (student) => {
  const first = student?.user?.first_name || '';
  const last = student?.user?.last_name || '';
  const name = `${first} ${last}`.trim() || student?.admission_number || 'Student';
  return `${name} (${student?.admission_number || 'N/A'})`;
};

const HostelMess = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);

  const [hostels, setHostels] = useState([]);
  const [students, setStudents] = useState([]);

  const [analytics, setAnalytics] = useState(null);
  const [studentCosts, setStudentCosts] = useState([]);
  const [menus, setMenus] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [diets, setDiets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [consumption, setConsumption] = useState([]);

  const [menuForm, setMenuForm] = useState({ hostel: '', plan_date: today(), meal_type: 'breakfast', dish_name: '', items: '' });
  const [attendanceForm, setAttendanceForm] = useState({ student: '', hostel: '', date: today(), meal_type: 'breakfast', status: 'ate' });
  const [dietForm, setDietForm] = useState({ student: '', preference: 'veg', allergies: '' });
  const [feedbackForm, setFeedbackForm] = useState({ student: '', hostel: '', date: today(), meal_type: 'lunch', rating: '5', complaint: '' });
  const [inventoryForm, setInventoryForm] = useState({ hostel: '', name: '', unit: 'kg', current_stock: '', minimum_stock: '' });
  const [vendorForm, setVendorForm] = useState({ hostel: '', name: '', phone: '' });
  const [supplyForm, setSupplyForm] = useState({ hostel: '', vendor: '', item_name: '', amount: '', supply_date: today(), payment_status: 'pending' });
  const [wastageForm, setWastageForm] = useState({ hostel: '', date: today(), meal_type: 'breakfast', item_name: '', quantity: '' });
  const [consumptionForm, setConsumptionForm] = useState({ hostel: '', date: today(), meal_type: 'breakfast', item_name: '', quantity: '', student_count: '' });
  const [feedbackStatusDrafts, setFeedbackStatusDrafts] = useState({});

  const setDefaultHostelInForms = useCallback((hostelId) => {
    if (!hostelId) return;
    setMenuForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setAttendanceForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setFeedbackForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setInventoryForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setVendorForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setSupplyForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setWastageForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setConsumptionForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      const [hostelRes, studentRes] = await Promise.all([
        hostelApi.getHostels(),
        instance.get('/students/students/', { params: { is_active: 'true' } }),
      ]);
      const hostelList = normalizeListPayload(hostelRes.data);
      setHostels(hostelList);
      setStudents(normalizeListPayload(studentRes.data));

      if (!selectedHostel && hostelList.length > 0) {
        const firstHostel = String(hostelList[0].id);
        setSelectedHostel(firstHostel);
        setDefaultHostelInForms(firstHostel);
      }
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to load mess hostels/students.'));
    }
  }, [selectedHostel, setDefaultHostelInForms]);

  const fetchSectionData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeSection === 'dashboard') {
        const params = { month: selectedMonth };
        if (selectedHostel) params.hostel = selectedHostel;

        const [analyticsRes, costsRes] = await Promise.all([
          hostelApi.getMessAnalytics(params),
          hostelApi.getMessStudentCosts(params),
        ]);

        setAnalytics(analyticsRes.data || null);
        setStudentCosts(analyticsRes.data ? costsRes.data?.student_costs || [] : []);
        return;
      }

      if (activeSection === 'menu') {
        const params = monthRange(selectedMonth);
        if (selectedHostel) params.hostel = selectedHostel;
        const res = await hostelApi.getMessMenus(params);
        setMenus(normalizeListPayload(res.data));
        return;
      }

      if (activeSection === 'attendance') {
        const params = {};
        if (selectedHostel) params.hostel = selectedHostel;
        const res = await hostelApi.getMessAttendance(params);
        setAttendance(normalizeListPayload(res.data));
        return;
      }

      if (activeSection === 'diet') {
        const res = await hostelApi.getMessDietProfiles();
        setDiets(normalizeListPayload(res.data));
        return;
      }

      if (activeSection === 'feedback') {
        const params = {};
        if (selectedHostel) params.hostel = selectedHostel;
        const res = await hostelApi.getMessFeedback(params);
        const rows = normalizeListPayload(res.data);
        setFeedback(rows);
        setFeedbackStatusDrafts((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            if (!next[row.id]) next[row.id] = row.status;
          });
          return next;
        });
        return;
      }

      if (activeSection === 'inventory') {
        const params = {};
        if (selectedHostel) params.hostel = selectedHostel;
        const res = await hostelApi.getMessInventoryItems(params);
        setInventory(normalizeListPayload(res.data));
        return;
      }

      if (activeSection === 'vendors') {
        const params = {};
        if (selectedHostel) params.hostel = selectedHostel;
        const [vendorRes, supplyRes] = await Promise.all([
          hostelApi.getMessVendors(params),
          hostelApi.getMessVendorSupplies(params),
        ]);
        setVendors(normalizeListPayload(vendorRes.data));
        setSupplies(normalizeListPayload(supplyRes.data));
        return;
      }

      if (activeSection === 'logs') {
        const params = {};
        if (selectedHostel) params.hostel = selectedHostel;
        const [wastageRes, consumptionRes] = await Promise.all([
          hostelApi.getMessWastage(params),
          hostelApi.getMessConsumption(params),
        ]);
        setWastage(normalizeListPayload(wastageRes.data));
        setConsumption(normalizeListPayload(consumptionRes.data));
      }
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to load mess data.'));
    } finally {
      setLoading(false);
    }
  }, [activeSection, selectedHostel, selectedMonth]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  const matchesSearch = useCallback(
    (...values) => {
      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;
      return values
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(query);
    },
    [searchTerm]
  );

  const filteredAttendance = useMemo(
    () => attendance.filter((item) => inSelectedMonth(item.date, selectedMonth) && matchesSearch(item.student_name, item.meal_type, item.status)),
    [attendance, selectedMonth, matchesSearch]
  );

  const filteredFeedback = useMemo(
    () => feedback.filter((item) => inSelectedMonth(item.date, selectedMonth) && matchesSearch(item.student_name, item.complaint, item.status)),
    [feedback, selectedMonth, matchesSearch]
  );

  const filteredSupplies = useMemo(
    () => supplies.filter((item) => inSelectedMonth(item.supply_date, selectedMonth) && matchesSearch(item.vendor_name, item.item_name, item.payment_status)),
    [supplies, selectedMonth, matchesSearch]
  );

  const filteredWastage = useMemo(
    () => wastage.filter((item) => inSelectedMonth(item.date, selectedMonth) && matchesSearch(item.item_name, item.meal_type, item.reason)),
    [wastage, selectedMonth, matchesSearch]
  );

  const filteredConsumption = useMemo(
    () => consumption.filter((item) => inSelectedMonth(item.date, selectedMonth) && matchesSearch(item.item_name, item.meal_type, item.student_count)),
    [consumption, selectedMonth, matchesSearch]
  );

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => getStudentLabel(a).localeCompare(getStudentLabel(b))),
    [students]
  );

  const vendorOptionsForSupply = useMemo(
    () => vendors.filter((vendor) => !supplyForm.hostel || String(vendor.hostel) === String(supplyForm.hostel)),
    [vendors, supplyForm.hostel]
  );

  const onSubmit = async (event, action, payloadBuilder, successMessage, resetForm) => {
    event.preventDefault();
    try {
      await action(payloadBuilder());
      alert(successMessage);
      if (resetForm) resetForm();
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Action failed.'));
    }
  };

  const handleSaveFeedback = async (event) => {
    event.preventDefault();

    if (!feedbackForm.student) {
      alert('Please select a student.');
      return;
    }

    const payload = {
      student: Number(feedbackForm.student),
      date: feedbackForm.date,
      meal_type: feedbackForm.meal_type,
      rating: Number(feedbackForm.rating),
      complaint: feedbackForm.complaint || '',
    };

    if (feedbackForm.hostel) {
      payload.hostel = Number(feedbackForm.hostel);
    }

    try {
      const res = await hostelApi.createMessFeedback(payload);
      const created = res?.data;
      alert('Feedback saved.');
      setFeedbackForm((prev) => ({ ...prev, student: '', complaint: '' }));
      if (created?.id) {
        setFeedback((prev) => [created, ...prev.filter((row) => String(row.id) !== String(created.id))]);
        setFeedbackStatusDrafts((prev) => ({ ...prev, [created.id]: created.status || 'open' }));
      }
      fetchSectionData();
    } catch (error) {
      const data = error?.response?.data;
      if (data?.hostel && Array.isArray(data.hostel) && String(data.hostel[0]).toLowerCase().includes('required')) {
        alert('Please select a hostel (or allocate the student to a hostel first).');
        return;
      }
      alert(getApiErrorMessage(error, 'Failed to save feedback.'));
    }
  };

  const updateFeedbackStatus = async (id) => {
    try {
      const statusValue = feedbackStatusDrafts[id];
      if (!statusValue) return;
      await hostelApi.updateMessFeedback(id, { status: statusValue });
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to update complaint status.'));
    }
  };

  const loadingRow = (colSpan, label) => (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            {label}
          </>
        ) : (
          label
        )}
      </td>
    </tr>
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search mess records..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className={styles.formControl}
            style={{ width: '180px' }}
            value={selectedHostel}
            onChange={(event) => {
              const id = event.target.value;
              setSelectedHostel(id);
              setDefaultHostelInForms(id);
            }}
          >
            <option value="">All Hostels</option>
            {hostels.map((hostel) => (
              <option key={hostel.id} value={hostel.id}>
                {hostel.name}
              </option>
            ))}
          </select>

          <input
            type="month"
            className={styles.formControl}
            style={{ width: '155px' }}
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />

          <button className={styles.btnSecondary} type="button" onClick={fetchSectionData}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? styles.btnPrimary : styles.btnSecondary}
            style={{ minHeight: '36px', padding: '8px 12px' }}
            onClick={() => setActiveSection(section.id)}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'dashboard' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div className={styles.tableContainer} style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Food Cost ({selectedMonth})</div>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{formatMoney(analytics?.vendor?.total_spend)}</div>
            </div>
            <div className={styles.tableContainer} style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Attendance Rate</div>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{Number(analytics?.attendance?.attendance_rate || 0).toFixed(2)}%</div>
            </div>
            <div className={styles.tableContainer} style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Open Complaints</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626' }}>{analytics?.feedback?.open_complaints || 0}</div>
            </div>
            <div className={styles.tableContainer} style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Low Stock Alerts</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#b45309' }}>{analytics?.inventory?.low_stock_count || 0}</div>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Student</th>
                  <th style={{ width: '20%' }}>Meals</th>
                  <th style={{ width: '35%' }}>Estimated Cost</th>
                </tr>
              </thead>
              <tbody>
                {studentCosts.length === 0
                  ? loadingRow(3, 'No student food-cost rows for selected month.')
                  : studentCosts.slice(0, 10).map((item) => (
                      <tr key={item.student}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.student_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.student_admission || '-'}</div>
                        </td>
                        <td>{item.meals_taken || 0}</td>
                        <td style={{ fontWeight: 700 }}>{formatMoney(item.estimated_cost)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'menu' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form
              className={styles.modalForm}
              onSubmit={(event) =>
                onSubmit(
                  event,
                  hostelApi.createMessMenu,
                  () => ({
                    hostel: Number(menuForm.hostel),
                    plan_date: menuForm.plan_date,
                    meal_type: menuForm.meal_type,
                    items: packMenuItems(menuForm.dish_name, menuForm.items),
                  }),
                  'Menu plan saved.',
                  () => setMenuForm((prev) => ({ ...prev, dish_name: '', items: '' }))
                )
              }
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Hostel</label>
                  <select className={styles.formControl} value={menuForm.hostel} onChange={(event) => setMenuForm((prev) => ({ ...prev, hostel: event.target.value }))} required>
                    <option value="">Select Hostel</option>
                    {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input className={styles.formControl} type="date" value={menuForm.plan_date} onChange={(event) => setMenuForm((prev) => ({ ...prev, plan_date: event.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Meal</label>
                  <select className={styles.formControl} value={menuForm.meal_type} onChange={(event) => setMenuForm((prev) => ({ ...prev, meal_type: event.target.value }))}>
                    {MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Dish Name</label>
                  <input
                    className={styles.formControl}
                    type="text"
                    value={menuForm.dish_name}
                    onChange={(event) => setMenuForm((prev) => ({ ...prev, dish_name: event.target.value }))}
                    placeholder="e.g. Idli Sambar"
                    required
                  />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Items</label>
                  <textarea
                    className={styles.formControl}
                    value={menuForm.items}
                    onChange={(event) => setMenuForm((prev) => ({ ...prev, items: event.target.value }))}
                    placeholder="e.g. Sambar, coconut chutney, tea"
                    required
                  />
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Menu</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Meal</th><th>Hostel</th><th>Dish</th><th>Items</th></tr></thead>
              <tbody>
                {menus.length === 0
                  ? loadingRow(5, 'No menu plans found.')
                  : menus
                      .filter((item) => {
                        const parsed = unpackMenuItems(item.items);
                        return matchesSearch(item.hostel_name, parsed.dish_name, parsed.items, item.meal_type);
                      })
                      .map((item) => {
                        const parsed = unpackMenuItems(item.items);
                        return (
                      <tr key={item.id}>
                        <td>{formatDate(item.plan_date)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{item.meal_type}</td>
                        <td>{item.hostel_name}</td>
                        <td style={{ whiteSpace: 'normal', fontWeight: 600 }}>{parsed.dish_name || '-'}</td>
                        <td style={{ whiteSpace: 'normal' }}>{parsed.items || '-'}</td>
                      </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'attendance' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form
              className={styles.modalForm}
              onSubmit={(event) =>
                onSubmit(
                  event,
                  hostelApi.markMessAttendance,
                  () => ({
                    student: Number(attendanceForm.student),
                    hostel: attendanceForm.hostel ? Number(attendanceForm.hostel) : undefined,
                    date: attendanceForm.date,
                    meal_type: attendanceForm.meal_type,
                    status: attendanceForm.status,
                  }),
                  'Meal attendance saved.',
                  () => setAttendanceForm((prev) => ({ ...prev, student: '' }))
                )
              }
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Student</label>
                  <select className={styles.formControl} value={attendanceForm.student} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, student: event.target.value }))} required>
                    <option value="">Select Student</option>
                    {sortedStudents.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student)}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Hostel (Optional)</label>
                  <select className={styles.formControl} value={attendanceForm.hostel} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, hostel: event.target.value }))}>
                    <option value="">Auto from allotment</option>
                    {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input className={styles.formControl} type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, date: event.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Meal</label>
                  <select className={styles.formControl} value={attendanceForm.meal_type} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, meal_type: event.target.value }))}>
                    {MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select className={styles.formControl} value={attendanceForm.status} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, status: event.target.value }))}>
                    {ATTENDANCE_STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Attendance</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Student</th><th>Date</th><th>Meal</th><th>Status</th><th>Hostel</th></tr></thead>
              <tbody>
                {filteredAttendance.length === 0
                  ? loadingRow(5, 'No attendance rows found.')
                  : filteredAttendance.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.student_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.student_admission || '-'}</div>
                        </td>
                        <td>{formatDate(row.date)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{row.meal_type}</td>
                        <td><span className={`${styles.badge} ${row.status === 'ate' ? styles.badgeSuccess : styles.badgeWarning}`}>{row.status}</span></td>
                        <td>{row.hostel_name || '-'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'diet' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form
              className={styles.modalForm}
              onSubmit={(event) =>
                onSubmit(
                  event,
                  hostelApi.saveMessDietProfile,
                  () => ({
                    student: Number(dietForm.student),
                    preference: dietForm.preference,
                    allergies: dietForm.allergies,
                  }),
                  'Diet profile saved.',
                  () => setDietForm((prev) => ({ ...prev, student: '', allergies: '' }))
                )
              }
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Student</label>
                  <select className={styles.formControl} value={dietForm.student} onChange={(event) => setDietForm((prev) => ({ ...prev, student: event.target.value }))} required>
                    <option value="">Select Student</option>
                    {sortedStudents.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student)}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Preference</label>
                  <select className={styles.formControl} value={dietForm.preference} onChange={(event) => setDietForm((prev) => ({ ...prev, preference: event.target.value }))}>
                    {DIET_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Allergy / Restriction</label>
                  <textarea className={styles.formControl} value={dietForm.allergies} onChange={(event) => setDietForm((prev) => ({ ...prev, allergies: event.target.value }))} />
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Profile</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Student</th><th>Preference</th><th>Allergies/Restrictions</th></tr></thead>
              <tbody>
                {diets.length === 0
                  ? loadingRow(3, 'No diet profiles found.')
                  : diets.filter((row) => matchesSearch(row.student_name, row.preference, row.allergies)).map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.student_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.student_admission || '-'}</div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{row.preference}</td>
                        <td style={{ whiteSpace: 'normal' }}>{row.allergies || '-'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'feedback' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form
              className={styles.modalForm}
              onSubmit={handleSaveFeedback}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Student</label>
                  <select className={styles.formControl} value={feedbackForm.student} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, student: event.target.value }))} required>
                    <option value="">Select Student</option>
                    {sortedStudents.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student)}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Hostel (Optional)</label>
                  <select className={styles.formControl} value={feedbackForm.hostel} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, hostel: event.target.value }))}>
                    <option value="">Auto from allotment</option>
                    {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formControl} type="date" value={feedbackForm.date} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, date: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Meal</label><select className={styles.formControl} value={feedbackForm.meal_type} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, meal_type: event.target.value }))}>{MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className={styles.formGroup}><label>Rating</label><select className={styles.formControl} value={feedbackForm.rating} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, rating: event.target.value }))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Complaint</label>
                  <textarea className={styles.formControl} value={feedbackForm.complaint} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, complaint: event.target.value }))} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnPrimary} type="submit" disabled={!feedbackForm.student}>
                  Save Feedback
                </button>
              </div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Student</th><th>Date/Meal</th><th>Rating</th><th>Complaint</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredFeedback.length === 0
                  ? loadingRow(6, 'No ratings/complaints found.')
                  : filteredFeedback.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.student_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.hostel_name || '-'}</div>
                        </td>
                        <td>
                          <div>{formatDate(row.date)}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{row.meal_type}</div>
                        </td>
                        <td>{row.rating}/5</td>
                        <td style={{ whiteSpace: 'normal' }}>{row.complaint || '-'}</td>
                        <td><span className={`${styles.badge} ${row.status === 'resolved' ? styles.badgeSuccess : row.status === 'in_progress' ? styles.badgeInfo : styles.badgeWarning}`}>{String(row.status).replace('_', ' ')}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select className={styles.formControl} style={{ minHeight: '34px', fontSize: '12px' }} value={feedbackStatusDrafts[row.id] || row.status} onChange={(event) => setFeedbackStatusDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}>
                              {FEEDBACK_STATUS.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}
                            </select>
                            <button className={styles.btnSecondary} style={{ minHeight: '34px', fontSize: '12px', padding: '6px 10px' }} type="button" onClick={() => updateFeedbackStatus(row.id)}>Update</button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'inventory' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form
              className={styles.modalForm}
              onSubmit={(event) =>
                onSubmit(
                  event,
                  hostelApi.createMessInventoryItem,
                  () => ({
                    hostel: Number(inventoryForm.hostel),
                    name: inventoryForm.name,
                    unit: inventoryForm.unit,
                    current_stock: parseAmount(inventoryForm.current_stock),
                    minimum_stock: parseAmount(inventoryForm.minimum_stock),
                  }),
                  'Inventory item saved.',
                  () => setInventoryForm((prev) => ({ ...prev, name: '', current_stock: '', minimum_stock: '' }))
                )
              }
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Hostel</label><select className={styles.formControl} value={inventoryForm.hostel} onChange={(event) => setInventoryForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Item Name</label><input className={styles.formControl} value={inventoryForm.name} onChange={(event) => setInventoryForm((prev) => ({ ...prev, name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Unit</label><input className={styles.formControl} value={inventoryForm.unit} onChange={(event) => setInventoryForm((prev) => ({ ...prev, unit: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Current Stock</label><input className={styles.formControl} type="number" min="0" step="0.01" value={inventoryForm.current_stock} onChange={(event) => setInventoryForm((prev) => ({ ...prev, current_stock: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Minimum Stock</label><input className={styles.formControl} type="number" min="0" step="0.01" value={inventoryForm.minimum_stock} onChange={(event) => setInventoryForm((prev) => ({ ...prev, minimum_stock: event.target.value }))} /></div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Inventory</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Item</th><th>Hostel</th><th>Current</th><th>Minimum</th><th>Status</th></tr></thead>
              <tbody>
                {inventory.length === 0
                  ? loadingRow(5, 'No inventory items found.')
                  : inventory.filter((row) => matchesSearch(row.name, row.hostel_name, row.category)).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.hostel_name || '-'}</td>
                        <td>{row.current_stock} {row.unit}</td>
                        <td>{row.minimum_stock} {row.unit}</td>
                        <td><span className={`${styles.badge} ${row.low_stock ? styles.badgeWarning : styles.badgeSuccess}`}>{row.low_stock ? 'Low Stock' : 'Healthy'}</span></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'vendors' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessVendor, () => ({ hostel: Number(vendorForm.hostel), name: vendorForm.name, phone: vendorForm.phone }), 'Vendor saved.', () => setVendorForm((prev) => ({ ...prev, name: '', phone: '' })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Hostel</label><select className={styles.formControl} value={vendorForm.hostel} onChange={(event) => setVendorForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Vendor Name</label><input className={styles.formControl} value={vendorForm.name} onChange={(event) => setVendorForm((prev) => ({ ...prev, name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Phone</label><input className={styles.formControl} value={vendorForm.phone} onChange={(event) => setVendorForm((prev) => ({ ...prev, phone: event.target.value }))} /></div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnSecondary} type="submit">Save Vendor</button></div>
            </form>

            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessVendorSupply, () => ({ hostel: Number(supplyForm.hostel), vendor: Number(supplyForm.vendor), item_name: supplyForm.item_name, amount: parseAmount(supplyForm.amount), supply_date: supplyForm.supply_date, payment_status: supplyForm.payment_status }), 'Supply saved.', () => setSupplyForm((prev) => ({ ...prev, item_name: '', amount: '' })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Hostel</label><select className={styles.formControl} value={supplyForm.hostel} onChange={(event) => setSupplyForm((prev) => ({ ...prev, hostel: event.target.value, vendor: '' }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Vendor</label><select className={styles.formControl} value={supplyForm.vendor} onChange={(event) => setSupplyForm((prev) => ({ ...prev, vendor: event.target.value }))} required><option value="">Select Vendor</option>{vendorOptionsForSupply.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Item</label><input className={styles.formControl} value={supplyForm.item_name} onChange={(event) => setSupplyForm((prev) => ({ ...prev, item_name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Amount</label><input className={styles.formControl} type="number" min="0" step="0.01" value={supplyForm.amount} onChange={(event) => setSupplyForm((prev) => ({ ...prev, amount: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formControl} type="date" value={supplyForm.supply_date} onChange={(event) => setSupplyForm((prev) => ({ ...prev, supply_date: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Payment</label><select className={styles.formControl} value={supplyForm.payment_status} onChange={(event) => setSupplyForm((prev) => ({ ...prev, payment_status: event.target.value }))}>{['pending', 'partial', 'paid'].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Supply</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Vendor</th><th>Item</th><th>Amount</th><th>Payment</th><th>Date</th></tr></thead>
              <tbody>
                {filteredSupplies.length === 0
                  ? loadingRow(5, 'No supply entries found.')
                  : filteredSupplies.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vendor_name || '-'}</td>
                        <td>{row.item_name || '-'}</td>
                        <td>{formatMoney(row.amount)}</td>
                        <td><span className={`${styles.badge} ${row.payment_status === 'paid' ? styles.badgeSuccess : row.payment_status === 'partial' ? styles.badgeInfo : styles.badgeWarning}`}>{row.payment_status}</span></td>
                        <td>{formatDate(row.supply_date)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'logs' && (
        <>
          <div className={styles.tableContainer} style={{ padding: '14px', marginBottom: '12px' }}>
            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessWastage, () => ({ hostel: Number(wastageForm.hostel), date: wastageForm.date, meal_type: wastageForm.meal_type, item_name: wastageForm.item_name, quantity: parseAmount(wastageForm.quantity) }), 'Wastage log saved.', () => setWastageForm((prev) => ({ ...prev, item_name: '', quantity: '' })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Wastage Hostel</label><select className={styles.formControl} value={wastageForm.hostel} onChange={(event) => setWastageForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formControl} type="date" value={wastageForm.date} onChange={(event) => setWastageForm((prev) => ({ ...prev, date: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Meal</label><select className={styles.formControl} value={wastageForm.meal_type} onChange={(event) => setWastageForm((prev) => ({ ...prev, meal_type: event.target.value }))}>{MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className={styles.formGroup}><label>Item</label><input className={styles.formControl} value={wastageForm.item_name} onChange={(event) => setWastageForm((prev) => ({ ...prev, item_name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Qty</label><input className={styles.formControl} type="number" min="0" step="0.01" value={wastageForm.quantity} onChange={(event) => setWastageForm((prev) => ({ ...prev, quantity: event.target.value }))} /></div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnSecondary} type="submit">Save Wastage</button></div>
            </form>

            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessConsumption, () => ({ hostel: Number(consumptionForm.hostel), date: consumptionForm.date, meal_type: consumptionForm.meal_type, item_name: consumptionForm.item_name, quantity: parseAmount(consumptionForm.quantity), student_count: Number(consumptionForm.student_count || 0) }), 'Consumption log saved.', () => setConsumptionForm((prev) => ({ ...prev, item_name: '', quantity: '', student_count: '' })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Consumption Hostel</label><select className={styles.formControl} value={consumptionForm.hostel} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formControl} type="date" value={consumptionForm.date} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, date: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Meal</label><select className={styles.formControl} value={consumptionForm.meal_type} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, meal_type: event.target.value }))}>{MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className={styles.formGroup}><label>Item</label><input className={styles.formControl} value={consumptionForm.item_name} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, item_name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Qty</label><input className={styles.formControl} type="number" min="0" step="0.01" value={consumptionForm.quantity} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, quantity: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Students</label><input className={styles.formControl} type="number" min="0" step="1" value={consumptionForm.student_count} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, student_count: event.target.value }))} /></div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Consumption</button></div>
            </form>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Type</th><th>Date</th><th>Meal</th><th>Item</th><th>Qty</th><th>Students</th></tr></thead>
              <tbody>
                {filteredWastage.length === 0 && filteredConsumption.length === 0
                  ? loadingRow(6, 'No wastage/consumption logs found.')
                  : (
                    [...filteredWastage.map((item) => ({ ...item, log_type: 'wastage' })), ...filteredConsumption.map((item) => ({ ...item, log_type: 'consumption' }))]
                      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                      .slice(0, 20)
                      .map((row) => (
                        <tr key={`${row.log_type}-${row.id}`}>
                          <td><span className={`${styles.badge} ${row.log_type === 'wastage' ? styles.badgeWarning : styles.badgeInfo}`}>{row.log_type}</span></td>
                          <td>{formatDate(row.date)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{row.meal_type}</td>
                          <td>{row.item_name}</td>
                          <td>{row.quantity}</td>
                          <td>{row.student_count || '-'}</td>
                        </tr>
                      ))
                  )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default HostelMess;
