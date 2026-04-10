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
  Trash2,
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
const MESS_UNIT_SIZE_OPTIONS = ['100g', '200g', '250g', '500g', '1kg', '5kg', '10kg', '25kg', '50kg', '100mL', '200mL', '250mL', '500mL', '1L', '2L'];

const VENDOR_CATEGORY_OPTIONS = [
  { id: 'vegetables', label: 'Vegetables', defaultMeasure: 'weight' },
  { id: 'fruits', label: 'Fruits', defaultMeasure: 'weight' },
  { id: 'oil', label: 'Oil', defaultMeasure: 'volume' },
  { id: 'nuts', label: 'Nuts & Dry Fruits', defaultMeasure: 'weight' },
  { id: 'salt', label: 'Salt', defaultMeasure: 'weight' },
  { id: 'sugar', label: 'Sugar', defaultMeasure: 'weight' },
  { id: 'chicken', label: 'Chicken', defaultMeasure: 'weight' },
  { id: 'fish', label: 'Fish', defaultMeasure: 'weight' },
  { id: 'rice', label: 'Rice & Grains', defaultMeasure: 'weight' },
  { id: 'dairy', label: 'Dairy', defaultMeasure: 'volume' },
  { id: 'spices', label: 'Spices', defaultMeasure: 'weight' },
  { id: 'beverages', label: 'Beverages', defaultMeasure: 'volume' },
  { id: 'others', label: 'Others', defaultMeasure: 'weight' },
];

const VENDOR_ITEM_SUGGESTIONS = {
  vegetables: ['Tomato', 'Potato', 'Onion', 'Carrot', 'Cabbage', 'Cauliflower'],
  fruits: ['Apple', 'Banana', 'Mango', 'Orange', 'Grapes'],
  oil: ['Sunflower Oil', 'Groundnut Oil', 'Coconut Oil', 'Mustard Oil'],
  nuts: ['Almond', 'Cashew', 'Peanut', 'Walnut'],
  salt: ['Salt', 'Rock Salt'],
  sugar: ['Sugar', 'Jaggery'],
  chicken: ['Chicken'],
  fish: ['Fish'],
  rice: ['Rice', 'Wheat', 'Toor Dal', 'Moong Dal', 'Chana Dal'],
  dairy: ['Milk', 'Curd', 'Butter', 'Ghee'],
  spices: ['Turmeric', 'Chilli Powder', 'Cumin', 'Coriander Powder'],
  beverages: ['Water', 'Juice'],
};

const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'mg', label: 'mg' },
];

const VOLUME_UNIT_OPTIONS = [
  { value: 'litre', label: 'Litre' },
  { value: 'millilitre', label: 'Millilitre' },
];

const asStringList = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const getVendorCategoryMeta = (categoryId) => VENDOR_CATEGORY_OPTIONS.find((cat) => cat.id === categoryId);

const getVendorCategoryLabel = (categoryId) => getVendorCategoryMeta(categoryId)?.label || String(categoryId || '');

const getVendorCategoryDefaultMeasure = (categoryId) => getVendorCategoryMeta(categoryId)?.defaultMeasure || 'weight';

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

const pad2 = (value) => String(value).padStart(2, '0');

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

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
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return {};

  const monthText = pad2(month);
  const start = `${year}-${monthText}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const end = `${year}-${monthText}-${pad2(endDay)}`;

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
  const [vendorForm, setVendorForm] = useState({ hostel: '', name: '', phone: '', categories: [] });
  const [supplyMeta, setSupplyMeta] = useState({ hostel: '', vendor: '', supply_date: today(), payment_status: 'pending' });
  const [supplyItem, setSupplyItem] = useState({ item_category: '', item_name: '', qty_count: '1', unit_size: '', unit_price: '', amount: '' });
  const [supplyCart, setSupplyCart] = useState([]);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [editingSupply, setEditingSupply] = useState(null);
  const [invoiceFilter, setInvoiceFilter] = useState({ vendor: '', date: today() });
  const [logsFilter, setLogsFilter] = useState({ type: 'all', search: '' });
  const [editingLog, setEditingLog] = useState(null); // { row, form }
  const [wastageForm, setWastageForm] = useState({ hostel: '', date: today(), meal_type: 'breakfast', item_name: '', quantity: '' });
  const [consumptionForm, setConsumptionForm] = useState({ hostel: '', date: today(), meal_type: 'breakfast', item_name: '', quantity: '' });
  const [feedbackStatusDrafts, setFeedbackStatusDrafts] = useState({});
  const [supplyPaymentStatusDrafts, setSupplyPaymentStatusDrafts] = useState({});
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);
  const [clearingFeedback, setClearingFeedback] = useState(false);

  const setDefaultHostelInForms = useCallback((hostelId) => {
    if (!hostelId) return;
    setMenuForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setAttendanceForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setFeedbackForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setInventoryForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setVendorForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setSupplyMeta((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setWastageForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
    setConsumptionForm((prev) => ({ ...prev, hostel: prev.hostel || hostelId }));
  }, []);

  // Always overwrites hostel in all forms when user picks from the top selector
  const syncHostelToForms = useCallback((hostelId) => {
    if (!hostelId) return;
    setMenuForm((prev) => ({ ...prev, hostel: hostelId }));
    setAttendanceForm((prev) => ({ ...prev, hostel: hostelId }));
    setFeedbackForm((prev) => ({ ...prev, hostel: hostelId }));
    setInventoryForm((prev) => ({ ...prev, hostel: hostelId }));
    setVendorForm((prev) => ({ ...prev, hostel: hostelId }));
    setSupplyMeta((prev) => ({ ...prev, hostel: hostelId, vendor: '' }));
    setWastageForm((prev) => ({ ...prev, hostel: hostelId }));
    setConsumptionForm((prev) => ({ ...prev, hostel: hostelId }));
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
        const params = monthRange(selectedMonth);
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
        const params = monthRange(selectedMonth);
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
        const vendorList = normalizeListPayload(vendorRes.data);
        const supplyList = normalizeListPayload(supplyRes.data);
        setVendors(vendorList);
        setSupplies(supplyList);
        setSupplyPaymentStatusDrafts((prev) => {
          const next = { ...prev };
          supplyList.forEach((row) => {
            if (!next[row.id]) next[row.id] = row.payment_status;
          });
          return next;
        });
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

  useEffect(() => {
    const unitSizeStr = supplyItem.unit_size || '';
    const price = parseAmount(supplyItem.unit_price);
    const count = parseAmount(supplyItem.qty_count) || 1;
    if (!unitSizeStr || !price) return;

    const match = unitSizeStr.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
    if (!match) return;

    const val = Number(match[1]);
    const unit = match[2].toLowerCase();

    let totalUnits = 0;
    if (unit === 'g' || unit === 'kg') {
      const g = unit === 'kg' ? val * 1000 : val;
      totalUnits = g / 100;
    } else if (unit === 'ml' || unit === 'l') {
      const ml = unit === 'l' ? val * 1000 : val;
      totalUnits = ml / 100;
    }

    if (totalUnits > 0) {
      setSupplyItem((prev) => ({ ...prev, amount: (count * totalUnits * price).toFixed(2) }));
    }
  }, [supplyItem.unit_size, supplyItem.unit_price, supplyItem.qty_count]);

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
    () => vendors.filter((vendor) => !supplyMeta.hostel || String(vendor.hostel) === String(supplyMeta.hostel)),
    [vendors, supplyMeta.hostel]
  );

  const selectedVendorForSupply = useMemo(
    () => vendors.find((vendor) => String(vendor.id) === String(supplyMeta.vendor)),
    [vendors, supplyMeta.vendor]
  );

  const allowedCategoriesForSupply = useMemo(() => {
    const vendorCategories = asStringList(selectedVendorForSupply?.categories);
    if (vendorCategories.length > 0) return vendorCategories;
    return VENDOR_CATEGORY_OPTIONS.map((cat) => cat.id);
  }, [selectedVendorForSupply]);

  const supplyItemSuggestions = useMemo(() => {
    const items = VENDOR_ITEM_SUGGESTIONS[supplyItem.item_category];
    return Array.isArray(items) ? items : [];
  }, [supplyItem.item_category]);



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

  const addItemToCart = (event) => {
    event.preventDefault();
    if (!supplyItem.item_name || !supplyItem.unit_size || !supplyItem.unit_price) {
      alert('Please fill in Item, Unit Size, and Unit Price before adding.');
      return;
    }
    const match = String(supplyItem.unit_size).match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
    const qVal = match ? Number(match[1]) : 1;
    const uVal = match ? match[2] : supplyItem.unit_size;
    setSupplyCart((prev) => [
      ...prev,
      {
        _key: Date.now(),
        item_category: supplyItem.item_category,
        item_name: supplyItem.item_name,
        qty_count: parseAmount(supplyItem.qty_count) || 1,
        unit_size: supplyItem.unit_size,
        unit_val: qVal,
        unit_str: uVal,
        unit_price: parseAmount(supplyItem.unit_price),
        amount: parseAmount(supplyItem.amount),
      },
    ]);
    setSupplyItem({ item_category: '', item_name: '', qty_count: '1', unit_size: '', unit_price: '', amount: '' });
  };

  const removeFromCart = (key) => {
    setSupplyCart((prev) => prev.filter((r) => r._key !== key));
  };

  const saveInvoice = async () => {
    if (!supplyMeta.hostel || !supplyMeta.vendor) {
      alert('Please select Hostel and Vendor.');
      return;
    }
    if (supplyCart.length === 0) {
      alert('Please add at least one item to the invoice.');
      return;
    }
    try {
      await Promise.all(
        supplyCart.map((item) =>
          hostelApi.createMessVendorSupply({
            hostel: Number(supplyMeta.hostel),
            vendor: Number(supplyMeta.vendor),
            item_name: item.item_name,
            quantity: item.unit_val * item.qty_count,
            unit: item.unit_str,
            unit_price: item.unit_price,
            amount: item.amount,
            supply_date: supplyMeta.supply_date,
            payment_status: supplyMeta.payment_status,
          })
        )
      );
      // Snapshot invoice for printing before clearing cart
      setLastInvoice({ meta: { ...supplyMeta }, cart: [...supplyCart] });
      alert(`Invoice saved — ${supplyCart.length} item(s) recorded.`);
      setSupplyCart([]);
      setSupplyItem({ item_category: '', item_name: '', qty_count: '1', unit_size: '', unit_price: '', amount: '' });
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to save invoice.'));
    }
  };

  const printInvoice = (sourceMeta, sourceCart) => {
    // Allow printing from lastInvoice snapshot when called with no args after save
    const meta = sourceMeta || (supplyCart.length > 0 ? supplyMeta : lastInvoice?.meta);
    const cart = sourceCart || (supplyCart.length > 0 ? supplyCart : lastInvoice?.cart);
    if (!meta?.vendor) { alert('Select a vendor first.'); return; }
    if (!cart || cart.length === 0) { alert('No invoice data to print.'); return; }
    const vendorObj = vendors.find((v) => String(v.id) === String(meta.vendor));
    const hostelObj = hostels.find((h) => String(h.id) === String(meta.hostel));
    const total = cart.reduce((sum, r) => sum + r.amount, 0);
    const rows = cart.map((r, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td>${getVendorCategoryLabel(r.item_category) || '-'}</td>
        <td>${r.item_name}</td>
        <td>${r.qty_count} × ${r.unit_size}</td>
        <td>Rs. ${r.unit_price.toFixed(2)}</td>
        <td>Rs. ${r.amount.toFixed(2)}</td>
      </tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><title>Supply Invoice</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h2{margin-bottom:4px}p{margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:600}tfoot td{font-weight:700;background:#f0f4ff}.footer{margin-top:24px;font-size:12px;color:#666}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#fef3c7;color:#92400e;text-transform:capitalize}</style></head>
      <body>
      <h2>📋 Supply Invoice</h2>
      <p><strong>Vendor:</strong> ${vendorObj?.name || '-'} ${vendorObj?.phone ? '| ' + vendorObj.phone : ''}</p>
      <p><strong>Hostel:</strong> ${hostelObj?.name || '-'}</p>
      <p><strong>Date:</strong> ${formatDate(meta.supply_date)}</p>
      <p><strong>Payment:</strong> <span class="badge">${meta.payment_status}</span></p>
      <table><thead><tr><th>#</th><th>Category</th><th>Item</th><th>Qty × Size</th><th>Unit Price</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right">Grand Total</td><td>Rs. ${total.toFixed(2)}</td></tr></tfoot>
      </table>
      <p class="footer">Generated by Campus Management System on ${new Date().toLocaleString()}</p>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site to print invoices.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const printSingleRow = (row) => {
    const vendorObj = vendors.find((v) => String(v.id) === String(row.vendor));
    const hostelObj = hostels.find((h) => String(h.id) === String(row.hostel));
    const html = `<!DOCTYPE html><html><head><title>Supply Invoice</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h2{margin-bottom:4px}p{margin:2px 0;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}th{background:#f5f5f5;font-weight:600}tfoot td{font-weight:700;background:#f0f4ff}.footer{margin-top:24px;font-size:12px;color:#666}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#fef3c7;color:#92400e;text-transform:capitalize}</style></head><body><h2>Supply Invoice</h2><p><strong>Vendor:</strong> ${row.vendor_name || vendorObj?.name || '-'}</p><p><strong>Hostel:</strong> ${row.hostel_name || hostelObj?.name || '-'}</p><p><strong>Date:</strong> ${formatDate(row.supply_date)}</p><p><strong>Payment:</strong> <span class="badge">${row.payment_status}</span></p><table><thead><tr><th>#</th><th>Item</th><th>Unit Size</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody><tr><td>1</td><td>${row.item_name}</td><td>${row.quantity} ${row.unit}</td><td>Rs. ${Number(row.unit_price).toFixed(2)}</td><td>Rs. ${Number(row.amount).toFixed(2)}</td></tr></tbody><tfoot><tr><td colspan="4" style="text-align:right">Total</td><td>Rs. ${Number(row.amount).toFixed(2)}</td></tr></tfoot></table><p class="footer">Generated by Campus Management System on ${new Date().toLocaleString()}</p></body></html>`;
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const saveEditSupply = async () => {
    if (!editingSupply) return;
    try {
      const match = String(editingSupply.form.unit_size || '').match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
      const payload = {
        item_name: editingSupply.form.item_name,
        unit_price: parseAmount(editingSupply.form.unit_price),
        amount: parseAmount(editingSupply.form.amount),
        payment_status: editingSupply.form.payment_status,
        supply_date: editingSupply.form.supply_date,
      };
      if (match) {
        payload.quantity = Number(match[1]);
        payload.unit = match[2];
      }
      await hostelApi.updateMessVendorSupply(editingSupply.row.id, payload);
      setEditingSupply(null);
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to update supply record.'));
    }
  };

  const handleDeleteLog = async (row) => {
    if (!window.confirm(`Are you sure you want to delete this ${row.log_type} record?`)) return;
    try {
      if (row.log_type === 'wastage') {
        await hostelApi.deleteMessWastage(row.id);
      } else {
        await hostelApi.deleteMessConsumption(row.id);
      }
      alert(`${row.log_type.charAt(0).toUpperCase() + row.log_type.slice(1)} record deleted.`);
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, `Failed to delete ${row.log_type} record.`));
    }
  };

  const saveEditLog = async () => {
    if (!editingLog) return;
    try {
      const { row, form } = editingLog;
      const payload = {
        date: form.date,
        meal_type: form.meal_type,
        item_name: form.item_name,
        quantity: parseAmount(form.quantity),
        unit: form.unit,
      };
      if (row.log_type === 'wastage') {
        await hostelApi.updateMessWastage(row.id, payload);
      } else {
        await hostelApi.updateMessConsumption(row.id, payload);
      }
      setEditingLog(null);
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, `Failed to update ${editingLog.row.log_type} record.`));
    }
  };

  const generateVendorInvoice = () => {
    if (!invoiceFilter.vendor || !invoiceFilter.date) {
      alert('Please select a vendor and date.');
      return;
    }
    const items = supplies.filter(
      (s) => String(s.vendor) === String(invoiceFilter.vendor) && s.supply_date === invoiceFilter.date
    );
    if (items.length === 0) {
      alert('No supply records found for this vendor on the selected date.');
      return;
    }
    const vendorObj = vendors.find((v) => String(v.id) === String(invoiceFilter.vendor));
    const hostelObj = hostels.find((h) => String(h.id) === String(items[0].hostel));
    const total = items.reduce((sum, r) => sum + Number(r.amount), 0);
    const rows = items.map((r, i) =>
      `<tr><td>${i + 1}</td><td>${r.item_name}</td><td>${Number(r.quantity).toFixed(2)} ${r.unit}</td><td>Rs. ${Number(r.unit_price).toFixed(2)}</td><td>Rs. ${Number(r.amount).toFixed(2)}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><title>Supply Invoice</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#111;background:#fff}
      .header{border-bottom:2px solid #1d4ed8;padding-bottom:14px;margin-bottom:18px}.header h2{font-size:22px;color:#1d4ed8;margin-bottom:4px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:13px;margin-bottom:20px}.meta p strong{color:#374151}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:9px 12px;text-align:left;font-size:13px}
      thead{background:#1d4ed8;color:#fff}tbody tr:nth-child(even){background:#f8fafc}
      tfoot td{font-weight:700;background:#eff6ff;font-size:14px}.footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:right}
      .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize;
        background:${items[0]?.payment_status==='paid'?'#dcfce7':items[0]?.payment_status==='partial'?'#dbeafe':'#fef3c7'};
        color:${items[0]?.payment_status==='paid'?'#15803d':items[0]?.payment_status==='partial'?'#1d4ed8':'#92400e'}}</style></head>
      <body>
      <div class="header"><h2>Supply Invoice</h2><div style="font-size:13px;color:#64748b">Campus Management System</div></div>
      <div class="meta">
        <p><strong>Vendor:</strong> ${vendorObj?.name || '-'}${vendorObj?.phone ? ' &bull; ' + vendorObj.phone : ''}</p>
        <p><strong>Hostel:</strong> ${hostelObj?.name || items[0]?.hostel_name || '-'}</p>
        <p><strong>Date:</strong> ${formatDate(invoiceFilter.date)}</p>
        <p><strong>Payment:</strong> <span class="badge">${items[0]?.payment_status || '-'}</span></p>
      </div>
      <table><thead><tr><th>#</th><th>Item</th><th>Unit Size</th><th>Unit Price</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;padding-right:16px">Grand Total</td><td>Rs. ${total.toFixed(2)}</td></tr></tfoot>
      </table>
      <p class="footer">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
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
        // Augment with display labels missed in POST response
        const studentObj = students.find((s) => String(s.id) === String(payload.student));
        const hostelObj = hostels.find((h) => String(h.id) === String(payload.hostel));
        
        const row = {
          ...created,
          student_name: studentObj ? getStudentLabel(studentObj) : created.student_name || 'Student',
          hostel_name: hostelObj ? hostelObj.name : created.hostel_name || '-',
        };

        setFeedback((prev) => [row, ...prev.filter((r) => String(r.id) !== String(row.id))]);
        setFeedbackStatusDrafts((prev) => ({ ...prev, [row.id]: row.status || 'open' }));
      }
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

  const updateSupplyPaymentStatus = async (id, statusValue) => {
    try {
      setSupplyPaymentStatusDrafts((prev) => ({ ...prev, [id]: statusValue }));
      await hostelApi.updateMessVendorSupply(id, { payment_status: statusValue });
      fetchSectionData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to update payment status.'));
    }
  };

  const clearCurrentFeedback = async () => {
    if (feedback.length === 0) return;

    const params = monthRange(selectedMonth);
    if (selectedHostel) params.hostel = selectedHostel;

    const hostelLabel = selectedHostel
      ? hostels.find((hostel) => String(hostel.id) === String(selectedHostel))?.name || 'Selected hostel'
      : 'All hostels';

    if (
      !window.confirm(
        `Delete ${feedback.length} feedback entr${feedback.length === 1 ? 'y' : 'ies'} for ${hostelLabel} in ${selectedMonth}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setClearingFeedback(true);
      const res = await hostelApi.clearMessFeedback(params);
      const deletedCount = Number(res?.data?.deleted);
      setFeedback([]);
      setFeedbackStatusDrafts({});
      alert(`Deleted ${Number.isFinite(deletedCount) ? deletedCount : feedback.length} feedback entr${feedback.length === 1 ? 'y' : 'ies'}.`);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to delete feedback.'));
    } finally {
      setClearingFeedback(false);
    }
  };

  const deleteFeedback = async (id) => {
    const row = feedback.find((item) => String(item.id) === String(id));
    const studentLabel = row?.student_name ? ` for ${row.student_name}` : '';
    const dateLabel = row?.date ? ` on ${formatDate(row.date)}` : '';
    if (!window.confirm(`Delete this feedback${studentLabel}${dateLabel}?`)) return;

    try {
      setDeletingFeedbackId(id);
      await hostelApi.deleteMessFeedback(id);
      setFeedback((prev) => prev.filter((item) => String(item.id) !== String(id)));
      setFeedbackStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      alert('Feedback deleted.');
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to delete feedback.'));
    } finally {
      setDeletingFeedbackId(null);
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
              syncHostelToForms(id);
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

          {activeSection === 'feedback' && feedback.length > 0 && (
            <button
              className={`${styles.btnSecondary} ${styles.btnDanger}`}
              type="button"
              onClick={clearCurrentFeedback}
              disabled={loading || clearingFeedback || deletingFeedbackId !== null}
              title="Delete all current feedback (based on selected month/hostel)"
            >
              {clearingFeedback ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete All
            </button>
          )}
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
                            <select className={styles.formControl} style={{ minHeight: '34px', fontSize: '12px' }} value={feedbackStatusDrafts[row.id] || row.status} onChange={(event) => setFeedbackStatusDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))} disabled={clearingFeedback}>
                              {FEEDBACK_STATUS.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}
                            </select>
                            <button className={styles.btnSecondary} style={{ minHeight: '34px', fontSize: '12px', padding: '6px 10px' }} type="button" onClick={() => updateFeedbackStatus(row.id)} disabled={clearingFeedback}>Update</button>
                            <button
                              className={`${styles.btnSecondary} ${styles.btnDanger}`}
                              style={{ minHeight: '34px', width: '38px', padding: 0 }}
                              type="button"
                              title="Delete"
                              aria-label="Delete feedback"
                              onClick={() => deleteFeedback(row.id)}
                              disabled={clearingFeedback || deletingFeedbackId === row.id}
                            >
                              {deletingFeedbackId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
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
            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessVendor, () => ({ hostel: Number(vendorForm.hostel), name: vendorForm.name, phone: vendorForm.phone, categories: asStringList(vendorForm.categories) }), 'Vendor saved.', () => setVendorForm((prev) => ({ ...prev, name: '', phone: '', categories: [] })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Hostel</label><select className={styles.formControl} value={vendorForm.hostel} onChange={(event) => setVendorForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Vendor Name</label><input className={styles.formControl} value={vendorForm.name} onChange={(event) => setVendorForm((prev) => ({ ...prev, name: event.target.value }))} required /></div>
                <div className={styles.formGroup}><label>Phone</label><input className={styles.formControl} value={vendorForm.phone} onChange={(event) => setVendorForm((prev) => ({ ...prev, phone: event.target.value }))} /></div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <div className={styles.formGroupHeader}>
                    <label>Vendor Items</label>
                    <div className={styles.formGroupActions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setVendorForm((prev) => ({ ...prev, categories: VENDOR_CATEGORY_OPTIONS.map((cat) => cat.id) }))}>Select All</button>
                      <button type="button" className={styles.btnSecondary} onClick={() => setVendorForm((prev) => ({ ...prev, categories: [] }))}>Clear</button>
                    </div>
                  </div>
                  <div className={styles.checkboxGrid}>
                    {VENDOR_CATEGORY_OPTIONS.map((cat) => (
                      <label key={cat.id} className={styles.checkboxOption}>
                        <input
                          type="checkbox"
                          checked={asStringList(vendorForm.categories).includes(cat.id)}
                          onChange={() => setVendorForm((prev) => {
                            const next = new Set(asStringList(prev.categories));
                            if (next.has(cat.id)) next.delete(cat.id);
                            else next.add(cat.id);
                            return { ...prev, categories: Array.from(next) };
                          })}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnSecondary} type="submit">Save Vendor</button></div>
            </form>
            <div style={{ marginBottom: '30px' }} />

            {/* ── Invoice Meta ─────────────────────────── */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: '#1e293b' }}>🧾 New Supply Invoice</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Hostel</label>
                  <select className={styles.formControl} value={supplyMeta.hostel} onChange={(e) => setSupplyMeta((p) => ({ ...p, hostel: e.target.value, vendor: '' }))} required>
                    <option value="">Select Hostel</option>
                    {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Vendor</label>
                  <select className={styles.formControl} value={supplyMeta.vendor} onChange={(e) => setSupplyMeta((p) => ({ ...p, vendor: e.target.value }))} required>
                    <option value="">Select Vendor</option>
                    {vendorOptionsForSupply.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Supply Date</label>
                  <input className={styles.formControl} type="date" value={supplyMeta.supply_date} onChange={(e) => setSupplyMeta((p) => ({ ...p, supply_date: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Status</label>
                  <select className={styles.formControl} value={supplyMeta.payment_status} onChange={(e) => setSupplyMeta((p) => ({ ...p, payment_status: e.target.value }))}>
                    {['pending', 'partial', 'paid'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Add Item to Cart ─────────────────────── */}
            <form onSubmit={addItemToCart}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Category</label>
                  <select className={styles.formControl} value={supplyItem.item_category} onChange={(e) => setSupplyItem((p) => ({ ...p, item_category: e.target.value, item_name: '' }))}>
                    <option value="">Select Category</option>
                    {allowedCategoriesForSupply.map((catId) => <option key={catId} value={catId}>{getVendorCategoryLabel(catId)}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Item Name</label>
                  <input className={styles.formControl} list="cart-item-suggestions" placeholder="e.g. Cashew" value={supplyItem.item_name} onChange={(e) => setSupplyItem((p) => ({ ...p, item_name: e.target.value }))} required />
                  <datalist id="cart-item-suggestions">{supplyItemSuggestions.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <div className={styles.formGroup}>
                  <label>Quantity (items)</label>
                  <input className={styles.formControl} type="number" min="1" step="1" placeholder="e.g. 5" value={supplyItem.qty_count} onChange={(e) => setSupplyItem((p) => ({ ...p, qty_count: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Unit Size</label>
                  <select className={styles.formControl} value={supplyItem.unit_size} onChange={(e) => setSupplyItem((p) => ({ ...p, unit_size: e.target.value }))} required>
                    <option value="">Select Size</option>
                    {MESS_UNIT_SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Unit Price (per 100g/100mL)</label>
                  <input className={styles.formControl} type="number" min="0" step="0.01" placeholder="Rs." value={supplyItem.unit_price} onChange={(e) => setSupplyItem((p) => ({ ...p, unit_price: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Amount (auto)</label>
                  <input className={styles.formControl} type="number" min="0" step="0.01" value={supplyItem.amount} onChange={(e) => setSupplyItem((p) => ({ ...p, amount: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button className={styles.btnSecondary} type="submit">+ Add to Invoice</button>
              </div>
            </form>

            {/* ── Cart / Invoice Preview ───────────────── */}
            {supplyCart.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: '#1e293b' }}>Invoice Items</div>
                <table className={styles.table} style={{ marginBottom: '0' }}>
                  <thead>
                    <tr>
                      <th>#</th><th>Category</th><th>Item</th><th>Qty × Size</th><th>Unit Price</th><th>Amount</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyCart.map((row, idx) => (
                      <tr key={row._key}>
                        <td>{idx + 1}</td>
                        <td>{getVendorCategoryLabel(row.item_category) || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                        <td>{row.qty_count} × {row.unit_size}</td>
                        <td>{formatMoney(row.unit_price)}</td>
                        <td style={{ fontWeight: 700, color: '#1d4ed8' }}>{formatMoney(row.amount)}</td>
                        <td>
                          <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }} onClick={() => removeFromCart(row._key)} title="Remove">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, color: '#374151' }}>Grand Total</td>
                      <td style={{ fontWeight: 800, fontSize: '15px', color: '#047857' }}>{formatMoney(supplyCart.reduce((s, r) => s + r.amount, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button className={styles.btnPrimary} type="button" onClick={saveInvoice}>💾 Save Invoice</button>
                  <button className={styles.btnSecondary} type="button" onClick={printInvoice}>🖨️ Print / Preview</button>
                  <button className={styles.btnSecondary} type="button" style={{ color: '#dc2626' }} onClick={() => setSupplyCart([])}>🗑️ Clear Cart</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '14px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', width: '100%', marginBottom: '4px' }}>Generate Vendor Invoice</div>
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Vendor</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                value={invoiceFilter.vendor}
                onChange={(e) => setInvoiceFilter((p) => ({ ...p, vendor: e.target.value }))}
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Date</label>
              <input type="date" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                value={invoiceFilter.date}
                onChange={(e) => setInvoiceFilter((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <button
              type="button"
              style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={generateVendorInvoice}
            >
              Preview &amp; Print Invoice
            </button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead><tr><th>Vendor</th><th>Item</th><th>Unit Size</th><th>Unit Price</th><th>Amount</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredSupplies.length === 0
                  ? loadingRow(6, 'No supply entries found.')
                  : filteredSupplies.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vendor_name || '-'}</td>
                        <td>{row.item_name || '-'}</td>
                        <td>{row.quantity} {row.unit}</td>
                        <td>{formatMoney(row.unit_price)}</td>
                        <td>{formatMoney(row.amount)}</td>
                        <td>
                          <select
                            className={`${styles.badge} ${row.payment_status === 'paid' ? styles.badgeSuccess : row.payment_status === 'partial' ? styles.badgeInfo : styles.badgeWarning}`}
                            value={supplyPaymentStatusDrafts[row.id] || row.payment_status}
                            onChange={(e) => updateSupplyPaymentStatus(row.id, e.target.value)}
                            style={{ border: 'none', cursor: 'pointer', outline: 'none', textTransform: 'capitalize' }}
                          >
                            {['pending', 'partial', 'paid'].map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td>{formatDate(row.supply_date)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            onClick={() => setEditingSupply({ row, form: { item_name: row.item_name, unit_size: `${row.quantity}${row.unit}`, unit_price: row.unit_price, amount: row.amount, payment_status: row.payment_status, supply_date: row.supply_date } })}
                          >✏ Edit</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {editingSupply && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', width: '520px', maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '18px', color: '#1e293b' }}>Edit Supply Record</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Item Name</label>
                    <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingSupply.form.item_name}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, item_name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Supply Date</label>
                    <input type="date" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingSupply.form.supply_date}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, supply_date: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Unit Size</label>
                    <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingSupply.form.unit_size}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, unit_size: e.target.value } }))}
                    >
                      <option value="">Select Unit Size</option>
                      {MESS_UNIT_SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Unit Price</label>
                    <input type="number" min="0" step="0.01" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingSupply.form.unit_price}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, unit_price: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Amount</label>
                    <input type="number" min="0" step="0.01" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingSupply.form.amount}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, amount: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Payment Status</label>
                    <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', textTransform: 'capitalize', boxSizing: 'border-box' }}
                      value={editingSupply.form.payment_status}
                      onChange={(e) => setEditingSupply((prev) => ({ ...prev, form: { ...prev.form, payment_status: e.target.value } }))}
                    >
                      {['pending', 'partial', 'paid'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }} onClick={() => setEditingSupply(null)}>Cancel</button>
                  <button style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }} onClick={saveEditSupply}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
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
                <div className={styles.formGroup}>
                  <label>Qty</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className={styles.formControl} type="number" min="0" step="0.01" style={{ flex: 1 }} value={wastageForm.quantity} onChange={(event) => setWastageForm((prev) => ({ ...prev, quantity: event.target.value }))} />
                    <select className={styles.formControl} style={{ width: '70px' }} value={wastageForm.unit || 'kg'} onChange={(event) => setWastageForm((prev) => ({ ...prev, unit: event.target.value }))}>
                      {['g', 'kg', 'mL', 'L'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnSecondary} type="submit">Save Wastage</button></div>
            </form>
            <div style={{ marginBottom: '30px' }} />

            <form className={styles.modalForm} onSubmit={(event) => onSubmit(event, hostelApi.createMessConsumption, () => ({ hostel: Number(consumptionForm.hostel), date: consumptionForm.date, meal_type: consumptionForm.meal_type, item_name: consumptionForm.item_name, quantity: parseAmount(consumptionForm.quantity) }), 'Consumption log saved.', () => setConsumptionForm((prev) => ({ ...prev, item_name: '', quantity: '' })))}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}><label>Consumption Hostel</label><select className={styles.formControl} value={consumptionForm.hostel} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, hostel: event.target.value }))} required><option value="">Select Hostel</option>{hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}</select></div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formControl} type="date" value={consumptionForm.date} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, date: event.target.value }))} /></div>
                <div className={styles.formGroup}><label>Meal</label><select className={styles.formControl} value={consumptionForm.meal_type} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, meal_type: event.target.value }))}>{MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                <div className={styles.formGroup}><label>Item</label><input className={styles.formControl} value={consumptionForm.item_name} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, item_name: event.target.value }))} required /></div>
                <div className={styles.formGroup}>
                  <label>Qty</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className={styles.formControl} type="number" min="0" step="0.01" style={{ flex: 1 }} value={consumptionForm.quantity} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, quantity: event.target.value }))} />
                    <select className={styles.formControl} style={{ width: '70px' }} value={consumptionForm.unit || 'kg'} onChange={(event) => setConsumptionForm((prev) => ({ ...prev, unit: event.target.value }))}>
                      {['g', 'kg', 'mL', 'L'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalActions}><button className={styles.btnPrimary} type="submit">Save Consumption</button></div>
            </form>
          </div>
          <div style={{ marginBottom: '30px' }} />

          <div className={styles.tableContainer}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', marginRight: '6px' }}>Filter:</div>
              {[{ value: 'all', label: 'All' }, { value: 'wastage', label: 'Wastage' }, { value: 'consumption', label: 'Consumption' }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setLogsFilter((prev) => ({ ...prev, type: opt.value }))}
                  style={{ padding: '4px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    background: (logsFilter?.type || 'all') === opt.value ? '#1d4ed8' : '#f1f5f9',
                    color: (logsFilter?.type || 'all') === opt.value ? '#fff' : '#475569',
                    borderColor: (logsFilter?.type || 'all') === opt.value ? '#1d4ed8' : '#e2e8f0' }}
                >{opt.label}</button>
              ))}
              <input
                placeholder="Search item, meal..."
                style={{ marginLeft: 'auto', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', minWidth: '200px' }}
                value={logsFilter?.search || ''}
                onChange={(e) => setLogsFilter((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <table className={styles.table}>
              <thead><tr><th>Type</th><th>Date</th><th>Meal</th><th>Item</th><th>Qty</th><th>Actions</th></tr></thead>
              <tbody>
                {(() => {
                  const lf = logsFilter || { type: 'all', search: '' };
                  const searchQ = (lf.search || '').toLowerCase();
                  let rows = [
                    ...filteredWastage.map((item) => ({ ...item, log_type: 'wastage' })),
                    ...filteredConsumption.map((item) => ({ ...item, log_type: 'consumption' })),
                  ]
                    .filter((r) => lf.type === 'all' || r.log_type === lf.type)
                    .filter((r) => !searchQ || String(r.item_name || '').toLowerCase().includes(searchQ) || String(r.meal_type || '').toLowerCase().includes(searchQ))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                  if (rows.length === 0) return loadingRow(6, 'No logs found.');
                  return rows.map((row) => (
                    <tr key={`${row.log_type}-${row.id}`}>
                      <td><span className={`${styles.badge} ${row.log_type === 'wastage' ? styles.badgeWarning : styles.badgeInfo}`} style={{ textTransform: 'capitalize' }}>{row.log_type}</span></td>
                      <td>{formatDate(row.date)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.meal_type}</td>
                      <td>{row.item_name}</td>
                      <td>{row.quantity} {row.unit}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginRight: '6px' }}
                          onClick={() => setEditingLog({ row, form: { ...row } })}
                        >✏ Edit</button>
                        <button
                          type="button"
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          onClick={() => handleDeleteLog(row)}
                        >🗑 Delete</button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {editingLog && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', width: '500px', maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '18px', color: '#1e293b' }}>
                  Edit {editingLog.row.log_type.charAt(0).toUpperCase() + editingLog.row.log_type.slice(1)} Log
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Date</label>
                    <input type="date" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingLog.form.date}
                      onChange={(e) => setEditingLog((prev) => ({ ...prev, form: { ...prev.form, date: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Meal Type</label>
                    <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', textTransform: 'capitalize', boxSizing: 'border-box' }}
                      value={editingLog.form.meal_type}
                      onChange={(e) => setEditingLog((prev) => ({ ...prev, form: { ...prev.form, meal_type: e.target.value } }))}
                    >
                      {MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Item Name</label>
                    <input style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingLog.form.item_name}
                      onChange={(e) => setEditingLog((prev) => ({ ...prev, form: { ...prev.form, item_name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Quantity</label>
                    <input type="number" min="0" step="0.01" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingLog.form.quantity}
                      onChange={(e) => setEditingLog((prev) => ({ ...prev, form: { ...prev.form, quantity: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Unit</label>
                    <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      value={editingLog.form.unit || 'kg'}
                      onChange={(e) => setEditingLog((prev) => ({ ...prev, form: { ...prev.form, unit: e.target.value } }))}
                    >
                      {['g', 'kg', 'mL', 'L'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }} onClick={() => setEditingLog(null)}>Cancel</button>
                  <button style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }} onClick={saveEditLog}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HostelMess;
