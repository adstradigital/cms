'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import styles from './CanteenModule.module.css';
import {
  LayoutDashboard, UtensilsCrossed, ShoppingCart, CreditCard,
  Package, Truck, MessageSquare, BarChart3, Bell,
  Plus, Minus, Search, RefreshCw, Loader2, Edit2, Trash2, X, Save,
  AlertTriangle, ChevronDown, TrendingUp, DollarSign,
  CheckCircle2, Clock, Leaf, Eye, Calendar, AlertCircle,
  ArrowUpRight, Filter, ChefHat, Star, Circle, ShoppingBag,
  Zap, Coffee, ToggleLeft, ToggleRight, FileText, LayoutGrid, Store, FolderPlus, Printer,
} from 'lucide-react';
import canteenApi from '@/api/canteenApi';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const fmtDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Management', Icon: UtensilsCrossed },
  { id: 'inventory', label: 'Inventory', Icon: Package },
  { id: 'suppliers', label: 'Suppliers & POs', Icon: Truck },
  { id: 'staff', label: 'Staff Management', Icon: ChefHat },
  { id: 'feedback', label: 'Feedback', Icon: MessageSquare },
  { id: 'reports', label: 'Reports', Icon: BarChart3 },
];

const ORDER_STATUS = {
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B' },
  preparing: { label: 'Preparing', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  ready:     { label: 'Ready',     color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  completed: { label: 'Completed', color: '#059669', bg: '#D1FAE5', dot: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
};

/* ─── Inline Style Tokens ───────────────────────────────────────────────────── */
const C = {
  surface: '#fff',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B',
  muted: '#64748B',
  primary: '#1E3A5F',
  accent: '#10B981',
};

const INVENTORY_UNITS = [
  'kg',
  'g',
  'liters',
  'ml',
  'pieces',
  'pack',
  'box',
  'bottle',
];

const INVENTORY_ITEM_TYPES = [
  { value: 'perishable', label: 'Perishable' },
  { value: 'non-perishable', label: 'Non-perishable' },
  { value: 'raw_material', label: 'Raw material' },
];

/* ═══════════════════════════ SHARED MICRO-COMPONENTS ═══════════════════════ */

const StatCard = ({ Icon, label, value, sub, color = '#3B82F6' }) => (
  <div style={{
    background: C.surface, borderRadius: 16, padding: '24px',
    border: `1px solid ${C.border}`, display: 'flex', gap: 20, alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1, minWidth: 0,
  }}>
    <div style={{ width: 56, height: 56, borderRadius: 14, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <p style={{ fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</p>}
    </div>
  </div>
);

const VegDot = ({ isVeg }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: isVeg ? '#15803D' : '#B91C1C', background: isVeg ? '#DCFCE7' : '#FEE2E2' }}>
    <Leaf size={10} /> {isVeg ? 'Veg' : 'Non-Veg'}
  </span>
);

const StatusBadge = ({ statusKey }) => {
  const s = ORDER_STATUS[statusKey] || { label: statusKey, color: C.muted, bg: '#F1F5F9' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, color: s.color, background: s.bg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot || s.color }} />
      {s.label}
    </span>
  );
};

const Btn = ({ children, variant = 'primary', onClick, disabled, type = 'button', size = 'md', style: sx }) => {
  const pad = size === 'sm' ? '8px 14px' : '10px 20px';
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: pad,
    border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', ...sx,
  };
  const variants = {
    primary: { background: C.primary, color: '#fff', boxShadow: '0 4px 6px -1px rgba(30,58,95,0.2)' },
    success: { background: '#10B981', color: '#fff' },
    danger:  { background: '#EF4444', color: '#fff' },
    outline: { background: 'transparent', color: C.text, border: `1px solid ${C.border}` },
    ghost:   { background: '#F1F5F9', color: C.text },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={e => !disabled && (e.currentTarget.style.transform = 'translateY(0)')}
  >{children}</button>;
};

const FInput = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{label}</label>}
    <input {...props} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, outline: 'none', color: C.text, ...(props.style || {}) }} />
  </div>
);

const FSelect = ({ label, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{label}</label>}
    <select {...props} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer', color: C.text, ...(props.style || {}) }}>{children}</select>
  </div>
);

const FTextarea = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{label}</label>}
    <textarea {...props} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, outline: 'none', color: C.text, minHeight: 80, fontFamily: 'inherit', ...(props.style || {}) }} />
  </div>
);

/* ─── Modal Implementation ───────────────────────────────────────────────────── */
function Modal({ open, onClose, title, Icon, color = C.primary, width = '560px', children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!open || !mounted) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 20, width, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: C.text }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════ MAIN MODULE ═══════════════════════════ */

const CanteenModule = ({ activeSegment }) => {
  const [menuSub, setMenuSub] = useState('food-items');
  const [wmModal, setWmModal] = useState(false);
  const [wmForm, setWmForm] = useState({ 
    day: '', 
    breakfast: { id: null, title: '', items: '' }, 
    lunch: { id: null, title: '', items: '' } 
  });

  const opPaymentMethod = 'cash';

  /* ─── Per-section loading states ─── */
  const [loadingMap, setLoadingMap] = useState({});
  const setSecLoading = (key, val) => setLoadingMap(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (activeSegment) setMenuSub(activeSegment);
  }, [activeSegment]);

  /* ─── Dashboard State ─── */
  const [dash, setDash] = useState(null);
  const loadDashboard = useCallback(async () => {
    setSecLoading('dashboard', true);
    try { const r = await canteenApi.getDashboard(); setDash(r.data); }
    catch { /* silent */ } finally { setSecLoading('dashboard', false); }
  }, []);

  /* ─── Food Items Section ─── */
  const [foodItems, setFoodItems] = useState([]);
  const [fiModal, setFiModal] = useState(false);
  const [editingFi, setEditingFi] = useState(null);
  const [viModal, setViModal] = useState(false);
  const [selectedVi, setSelectedVi] = useState(null);
  const [fiForm, setFiForm] = useState({ name: '', price: '', category: '', status: 'active', is_veg: true, description: '' });
  const [cats, setCats] = useState([]);
  const [invCats, setInvCats] = useState([]);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', icon: '🍽️', color: C.primary });

  const loadFoodItems = useCallback(async () => {
    try {
      const [ir, cr] = await Promise.all([canteenApi.getFoodItems(), canteenApi.getFoodCategories()]);
      setFoodItems(ir.data?.results || ir.data || []);
      const catData = cr.data?.results ?? cr.data;
      setCats(Array.isArray(catData) ? catData : []);
    } catch { /* silent */ }
  }, []);

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      await canteenApi.createFoodCategory(catForm);
      setCatModal(false);
      setCatForm({ name: '', icon: '🍽️', color: C.primary });
      loadFoodItems(); 
    } catch { alert('Failed to create category'); }
  };

  const saveFoodItem = async (e) => {
    e.preventDefault();
    try {
      if (editingFi) {
        await canteenApi.updateFoodItem(editingFi.id, fiForm);
      } else {
        await canteenApi.createFoodItem(fiForm);
      }
      setFiModal(false);
      setEditingFi(null);
      setFiForm({ name: '', price: '', category: '', status: 'active', is_veg: true, description: '' });
      loadFoodItems();
    } catch { alert('Failed to save food item'); }
  };

  const handleEditFi = (item) => {
    setEditingFi(item);
    setFiForm({
      name: item.name,
      price: item.price,
      category: item.category,
      status: item.status,
      is_veg: item.is_veg,
      description: item.description || ''
    });
    setFiModal(true);
  };

  const deleteFoodItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await canteenApi.deleteFoodItem(id);
      loadFoodItems();
    } catch { alert('Failed to delete item'); }
  };

  const handleViewFi = (item) => {
    setSelectedVi(item);
    setViModal(true);
  };

  /* ─── Orders Section ─── */
  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('');
  const [opModal, setOpModal] = useState(false);
  const [opSearch, setOpSearch] = useState('');
  const [opStudents, setOpStudents] = useState([]);
  const [opSelected, setOpSelected] = useState(null);
  const [opItems, setOpItems] = useState([]);
  const [opCustomerType, setOpCustomerType] = useState('student');
  const [opFoodCat, setOpFoodCat] = useState('all');
  const [stuList, setStuList] = useState([]);
  const [staList, setStaList] = useState([]);
  const [opShowDrop, setOpShowDrop] = useState(false);
  const [opClassFilter, setOpClassFilter] = useState('');
  const [opSubmitting, setOpSubmitting] = useState(false);

  const opTotal = opItems.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.qty)), 0);
  const opItemCount = opItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
  const opCustomerInitials = (opSelected?.full_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
  const opSelectedMeta = opSelected?.type === 'student'
    ? (opSelected?.class_name || opSelected?.class || 'Student')
    : (opSelected?.designation || 'Staff');


  const loadOrders = useCallback(async () => {
    try { const r = await canteenApi.getOrders({ status: orderStatus }); setOrders(r.data?.results || r.data || []); }
    catch { /* silent */ }
  }, [orderStatus]);

  /* ─── Payments Section ─── */
  const [payments, setPayments] = useState([]);
  const [paySummary, setPaySummary] = useState(null);
  const loadPayments = useCallback(async () => {
    try {
      const [pr, sr] = await Promise.all([canteenApi.getPayments(), canteenApi.getDailySummary(fmtDate())]);
      setPayments(pr.data?.results || pr.data || []);
      setPaySummary(sr.data);
    } catch { /* silent */ }
  }, []);

  /* ─── Inventory Section ─── */
  const [invItems, setInvItems] = useState([]);
  const [invLogs, setInvLogs] = useState([]);
  const loadInventory = useCallback(async () => {
    try {
      const [ir, lr] = await Promise.all([canteenApi.getInventoryItems(), canteenApi.getInventoryLogs()]);
      setInvItems(ir.data?.results || ir.data || []);
      setInvLogs(lr.data?.results || lr.data || []);
    } catch { /* silent */ }
  }, []);

  /* ─── Daily Menu Planner ─── */
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const loadWeeklyMenus = useCallback(async () => {
    try { 
      const r = await canteenApi.getWeeklyMenus(); 
      const data = r.data?.results || r.data || [];
      setWeeklyMenus(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  const openWmModal = (day) => {
    const dayMenus = weeklyMenus.filter(m => m.day === day);
    const b = dayMenus.find(m => m.meal_type === 'Breakfast');
    const l = dayMenus.find(m => m.meal_type === 'Lunch');
    setWmForm({
      day,
      breakfast: { id: b?.id || null, title: b?.title || '', items: (b?.items || []).join(', ') },
      lunch: { id: l?.id || null, title: l?.title || '', items: (l?.items || []).join(', ') }
    });
    setWmModal(true);
  };

  const saveWmMenu = async () => {
    try {
      const data = [
        { ...wmForm.breakfast, meal_type: 'Breakfast' },
        { ...wmForm.lunch, meal_type: 'Lunch' }
      ];

      for (const m of data) {
        const payload = { 
          day: wmForm.day, 
          meal_type: m.meal_type, 
          title: m.title, 
          items: m.items.split(',').map(i => i.trim()).filter(Boolean) 
        };
        if (m.id) await canteenApi.updateWeeklyMenu(m.id, payload);
        else await canteenApi.createWeeklyMenu(payload);
      }
      setWmModal(false);
      loadWeeklyMenus();
    } catch (err) { alert('Failed to save menu'); }
  };

  /* ─── Suppliers ─── */
  const [suppliers, setSuppliers] = useState([]);
  const [suppModal, setSuppModal] = useState(false);
  const [editingSupp, setEditingSupp] = useState(null);
  const [suppForm, setSuppForm] = useState({ name: '', contact_person: '', phone: '', category_ids: [], item_ids: [] });
  const [purModal, setPurModal] = useState(false);
  const [purForm, setPurForm] = useState({ supplier_id: '', item_id: '', quantity: '', price: '' });
  const [invOutModal, setInvOutModal] = useState(false);
  const [invOutSubmitting, setInvOutSubmitting] = useState(false);
  const [invOutForm, setInvOutForm] = useState({ item_id: '', quantity: '1', reason: '' });
  const [invItemModal, setInvItemModal] = useState(false);
  const [editingInvItem, setEditingInvItem] = useState(null);
  const [invItemForm, setInvItemForm] = useState({ name: '', category: '', unit: '', min_stock_level: '', current_stock: '', item_type: '', unit_price: '', manufacturing_date: '', expiry_date: '', batch_number: '' });
  const [invCatModal, setInvCatModal] = useState(false);
  const [invCatForm, setInvCatForm] = useState({ name: '' });
  
  const [selectedPo, setSelectedPo] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try { 
      const [sr, cr] = await Promise.all([canteenApi.getSuppliers(), canteenApi.getInventoryCategories()]);
      setSuppliers(sr.data?.results || sr.data || []);
      setInvCats(cr.data?.results || cr.data || []);
    }
    catch { /* silent */ }
  }, []);

  const handleEditSupp = (s) => {
    setEditingSupp(s);
    setSuppForm({
      name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      category_ids: (s.categories_detail || []).map(c => c.id),
      item_ids: (s.items_detail || []).map(i => i.id)
    });
    setSuppModal(true);
  };

  const deleteSupplier = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await canteenApi.deleteSupplier(id);
      loadSuppliers();
    } catch { alert('Failed to delete supplier'); }
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editingSupp) {
        await canteenApi.updateSupplier(editingSupp.id, suppForm);
      } else {
        await canteenApi.createSupplier(suppForm);
      }
      setSuppModal(false);
      setEditingSupp(null);
      setSuppForm({ name: '', contact_person: '', phone: '', category_ids: [], item_ids: [] });
      loadSuppliers();
    } catch { alert('Failed to save supplier'); }
  };

  const saveInvCategory = async (e) => {
    e.preventDefault();
    try {
      await canteenApi.createInventoryCategory(invCatForm);
      setInvCatModal(false);
      setInvCatForm({ name: '' });
      loadInventory();
    } catch { alert('Failed to create category'); }
  };

  const saveInvItem = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: invItemForm.name,
        category: invItemForm.category || null,
        unit: invItemForm.unit,
        current_stock: invItemForm.current_stock,
        min_stock_level: invItemForm.min_stock_level,
        unit_price: invItemForm.unit_price || 0,
        manufacturing_date: invItemForm.manufacturing_date || null,
        expiry_date: invItemForm.expiry_date || null,
      };
      if (editingInvItem) await canteenApi.updateInventoryItem(editingInvItem.id, payload);
      else await canteenApi.createInventoryItem(payload);
      setInvItemModal(false);
      setEditingInvItem(null);
      setInvItemForm({ name: '', category: '', unit: '', min_stock_level: '', current_stock: '', item_type: '', unit_price: '', manufacturing_date: '', expiry_date: '', batch_number: '' });
      loadInventory();
    } catch { alert('Failed to save inventory item'); }
  };

  const handleEditInvItem = (item) => {
    setEditingInvItem(item);
    setInvItemForm({
      name: item.name || '',
      category: item.category || '',
      unit: item.unit || '',
      min_stock_level: item.min_stock_level ?? '',
      current_stock: item.current_stock ?? '',
      item_type: item.item_type || '',
      unit_price: item.unit_price ?? '',
      manufacturing_date: item.manufacturing_date || '',
      expiry_date: item.expiry_date || '',
      batch_number: item.batch_number || '',
    });
    setInvItemModal(true);
  };

  const deleteInvItem = async (id) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      await canteenApi.deleteInventoryItem(id);
      loadInventory();
    } catch { alert('Failed to delete inventory item'); }
  };

  const openInvOutModal = (item) => {
    setInvOutForm({ item_id: item.id, quantity: '1', reason: '' });
    setInvOutModal(true);
  };

  const recordStockOut = async (e) => {
    e.preventDefault();
    if (!invOutForm.item_id) return;
    setInvOutSubmitting(true);
    try {
      await canteenApi.createInventoryLog({
        item: invOutForm.item_id,
        log_type: 'out',
        quantity: invOutForm.quantity,
        reason: invOutForm.reason,
      });
      setInvOutModal(false);
      setInvOutForm({ item_id: '', quantity: '1', reason: '' });
      loadInventory();
    } catch { alert('Failed to reduce stock'); }
    finally { setInvOutSubmitting(false); }
  };

  /* ─── Feedback ─── */
  const [complaints, setComplaints] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ subject: '', description: '', rating: 5 });

  const loadComplaints = useCallback(async () => {
    try { const r = await canteenApi.getComplaints(); setComplaints(r.data?.results || r.data || []); }
    catch { /* silent */ }
  }, []);

  const saveFeedback = async (e) => {
    e.preventDefault();
    try {
      await canteenApi.createComplaint(feedbackForm);
      setFeedbackModal(false);
      setFeedbackForm({ subject: '', description: '', rating: 5 });
      loadComplaints();
    } catch { alert('Failed to submit feedback'); }
  };

  /* ─── Staff Management ─── */
  const [staffList, setStaffList] = useState([]);
  const [staffModal, setStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ user: '', role: 'helper', status: 'active', phone: '', salary: 0 });
  const [attendance, setAttendance] = useState([]);
  const [attModal, setAttModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ staff: '', title: '', description: '', deadline: '', priority: 'medium' });

  const loadStaff = useCallback(async () => {
    try {
      const [sr, ar, tr] = await Promise.all([
        canteenApi.getStaffProfiles(),
        canteenApi.getStaffAttendance(),
        canteenApi.getStaffTasks()
      ]);
      setStaffList(sr.data?.results || sr.data || []);
      setAttendance(ar.data?.results || ar.data || []);
      setTasks(tr.data?.results || tr.data || []);
    } catch { /* silent */ }
  }, []);

  /* ─── Purchase Orders ─── */
  const [pos, setPos] = useState([]);
  const [poModal, setPoModal] = useState(false);
  const [poForm, setPoForm] = useState({ supplier: '', order_date: fmtDate(), status: 'pending', notes: '', items: [] });
  const [poItemForm, setPoItemForm] = useState({ category_id: '', inventory_item_id: '', quantity: 1, unit_price: 0 });

  const loadPOs = useCallback(async () => {
    try { const r = await canteenApi.getPurchaseOrders(); setPos(r.data?.results || r.data || []); }
    catch { /* silent */ }
  }, []);

  const addPoItem = () => {
    if (!poItemForm.inventory_item_id) return;
    const item = invItems.find(i => i.id == poItemForm.inventory_item_id);
    if (!item) return;
    
    const newItem = {
      inventory_item: item.id,
      item_name: item.name,
      quantity: parseFloat(poItemForm.quantity),
      unit_price: parseFloat(poItemForm.unit_price) || parseFloat(item.unit_price) || 0,
    };

    setPoForm(p => ({
      ...p,
      items: [...p.items, newItem]
    }));
    setPoItemForm({ category_id: '', inventory_item_id: '', quantity: 1, unit_price: 0 });
  };

  const removePoItem = (index) => {
    setPoForm(p => ({
      ...p,
      items: p.items.filter((_, i) => i !== index)
    }));
  };

  const updatePoPaymentStatus = async (id, status) => {
    try {
      await canteenApi.updatePurchaseOrder(id, { payment_status: status });
      loadPOs();
    } catch (err) {
      alert('Failed to update payment status');
    }
  };

  const handlePoStatusChange = async (poId, newStatus) => {
    try {
      if (newStatus === 'received') {
        if (!confirm('Marking as RECEIVED will automatically update inventory stock. Proceed?')) return;
        await canteenApi.receivePurchaseOrder(poId);
      } else {
        await canteenApi.updatePurchaseOrder(poId, { status: newStatus });
      }
      loadPOs();
      loadInventory();
    } catch (err) {
      alert('Failed to update PO status');
    }
  };

  const handleReceiptUpload = async (poId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('receipt_file', file);
    try {
      await canteenApi.updatePurchaseOrder(poId, fd);
      loadPOs();
      alert('Receipt uploaded successfully');
    } catch {
      alert('Failed to upload receipt');
    }
  };

  /* ─── Reports ─── */
  const [reports, setReports] = useState(null);
  const loadReports = useCallback(async (period = 'weekly') => {
    try { const r = await canteenApi.getReports(period); setReports(r.data); }
    catch { /* silent */ }
  }, []);

  /* ─── Effects ─── */
  useEffect(() => {
    const s = activeSegment || 'dashboard';
    if (s === 'dashboard') loadDashboard();
    if (s === 'menu') { loadFoodItems(); loadWeeklyMenus(); }
    if (s === 'orders') { loadOrders(); loadFoodItems(); }
    if (s === 'payments') { loadPayments(); loadOrders(); }
    if (s === 'inventory') { loadInventory(); loadSuppliers(); }
    if (s === 'suppliers') { loadSuppliers(); loadInventory(); loadPOs(); }
    if (s === 'staff') { loadStaff(); }
    if (s === 'feedback') loadComplaints();
    if (s === 'reports') loadReports();
  }, [activeSegment, loadDashboard, loadFoodItems, loadWeeklyMenus, loadOrders, loadPayments, loadInventory, loadSuppliers, loadStaff, loadPOs, loadComplaints, loadReports]);

  /* ─── Handlers ─── */
  const togglePayStatus = async (id) => {
    if (!confirm('Mark payment as Refunded?')) return;
    try { await canteenApi.updatePayment(id, { is_refunded: true }); loadPayments(); } catch { /* silent */ }
  };

  const updateOrderStatus = async (id, status, redirectTo = null) => {
    try {
      await canteenApi.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)));
      if (redirectTo) {
        setOrderStatus(redirectTo);
        return;
      }
      loadOrders();
    } catch { /* silent */ }
  };

  const placeOpOrder = async () => {
    if (opSubmitting) return;
    if (!opSelected) return alert('Please select a customer');
    if (opItems.length === 0) return alert('Cart is empty');

    setOpSubmitting(true);
    try {
      const payload = {
        [opSelected.type]: opSelected.id,
        order_items: opItems.map(i => ({ food_item: i.id, quantity: i.qty, unit_price: i.price })),
        total_amount: opTotal,
        status: 'pending',
        payment_status: 'paid',
        payment_method: opPaymentMethod,
      };
      await canteenApi.createOrder(payload);
      alert('Order Placed Successfully');
      setOpModal(false);
      setOpItems([]);
      setOpSelected(null);
      setOpSearch('');
      setOpShowDrop(false);
      loadOrders();
    } catch {
      alert('Failed to place order');
    } finally {
      setOpSubmitting(false);
    }
  };

  /* ═══════════ RENDER SECTIONS ═══════════ */

  const renderDashboard = () => {
    const t = dash?.today || {};
    const lowStockItems = invItems.filter(i => Number(i.current_stock) <= Number(i.min_stock_level));
    const expiringItems = invItems.filter(i => i.expiry_date && new Date(i.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const pendingOrders = orders.filter(o => o.status === 'pending');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Dashboard Overview</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, fontWeight: 600 }}>Real-time canteen operations summary</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setOpModal(true)} variant="success"><Plus size={16} /> New Order</Btn>
            <Btn onClick={() => setPurModal(true)} variant="outline"><ShoppingCart size={16} /> Purchase</Btn>
            <Btn onClick={() => setSaleModal(true)} variant="outline"><Package size={16} /> Stock Out</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <StatCard Icon={ShoppingCart} label="Today's Orders" value={t.total_orders || 0} color="#3B82F6" sub={pendingOrders.length + ' pending'} />
          <StatCard Icon={DollarSign} label="Total Revenue" value={`₹${Number(t.revenue || 0).toLocaleString()}`} color="#10B981" sub="Today's earnings" />
          <StatCard Icon={AlertTriangle} label="Low Stock" value={lowStockItems.length} color="#EF4444" sub="Items needing refill" />
          <StatCard Icon={Clock} label="Expiring Soon" value={expiringItems.length} color="#F59E0B" sub="Within 7 days" />
        </div>

        {/* Quick Alerts */}
        {(lowStockItems.length > 0 || expiringItems.length > 0 || pendingOrders.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {lowStockItems.length > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <AlertCircle color="#EA580C" size={20} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#9A3412' }}>Low Stock Alert</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#C2410C' }}>{lowStockItems.length} items need restocking</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lowStockItems.slice(0, 3).map(item => (
                    <div key={item.id} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{item.name}</span>
                      <span style={{ color: '#EA580C', fontWeight: 800 }}>{item.current_stock} {item.unit}</span>
                    </div>
                  ))}
                </div>
                <Btn onClick={() => setPurModal(true)} variant="outline" size="sm" style={{ marginTop: 12, width: '100%' }}>Restock Now</Btn>
              </div>
            )}

            {expiringItems.length > 0 && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Clock color="#D97706" size={20} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#92400E' }}>Expiry Alert</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#B45309' }}>{expiringItems.length} items expiring soon</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expiringItems.slice(0, 3).map(item => (
                    <div key={item.id} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{item.name}</span>
                      <span style={{ color: '#D97706', fontWeight: 800 }}>{new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingOrders.length > 0 && (
              <div style={{ background: '#DBEAFE', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Clock color="#2563EB" size={20} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1E40AF' }}>Pending Orders</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#3B82F6' }}>{pendingOrders.length} orders awaiting processing</p>
                  </div>
                </div>
                <Btn onClick={() => {}} variant="outline" size="sm" style={{ marginTop: 12, width: '100%' }}>View Orders</Btn>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}>
          {/* Recent Orders */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent Orders</h5>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{(dash?.recent_orders || []).length} today</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(dash?.recent_orders || []).slice(0, 6).map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F8FAFC', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>#{o.token_number}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{o.student_name || 'Staff'}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{o.items_detail?.length || 0} items • ₹{Number(o.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                  <StatusBadge statusKey={o.status} />
                </div>
              ))}
              {(dash?.recent_orders || []).length === 0 && <p style={{ textAlign: 'center', color: C.muted, padding: '32px', fontWeight: 700 }}>No orders today yet.</p>}
            </div>
          </div>

          {/* Top Items */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Top-Selling Items</h5>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(dash?.top_items || []).slice(0, 5).map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: i < 3 ? '#F59E0B' : C.border, width: 24 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{item.name}</p>
                    <div style={{ height: 4, width: '100%', background: '#F1F5F9', borderRadius: 2, marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${(item.times_ordered / (dash?.top_items[0]?.times_ordered || 1)) * 100}%`, background: C.primary, borderRadius: 2 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>{item.times_ordered || item.sales_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Trend Visual */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
           <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Revenue Trend (Last 7 Days)</h5>
              <div style={{ display: 'flex', gap: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.primary }} /> <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Daily Sales</span></div>
              </div>
           </div>
           <div style={{ padding: 20, height: 200, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {(dash?.weekly_revenue || []).map((day, i) => {
                 const maxHeight = Math.max(...(dash?.weekly_revenue || []).map(d => d.revenue), 100);
                 const h = (day.revenue / maxHeight) * 150;
                 return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                       <div style={{ width: '100%', height: h, background: C.primary, borderRadius: '4px 4px 0 0', position: 'relative', transition: 'all 0.3s' }}>
                          <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', padding: '4px 8px', background: '#1E293B', color: '#fff', borderRadius: 6, fontSize: 10, fontWeight: 800, marginBottom: 8, whiteSpace: 'nowrap' }}>₹{day.revenue}</div>
                       </div>
                       <span style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase' }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>
    );
  };


  const renderMenuManagement = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
        {['food-items', 'categories', 'daily-menu', 'always-available'].map(s => (
          <button key={s} onClick={() => setMenuSub(s)} style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 700,
            color: menuSub === s ? C.primary : C.muted, borderBottom: menuSub === s ? `2px solid ${C.primary}` : 'none', cursor: 'pointer',
            textTransform: 'capitalize'
          }}>{s.replace('-', ' ')}</button>
        ))}
      </div>

      {menuSub === 'food-items' && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
            <h5 style={{ margin: 0, fontWeight: 800 }}>Master Food Catalog</h5>
            <Btn size="sm" onClick={() => setFiModal(true)}><Plus size={16} /> Add Item</Btn>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                {['Item Name', 'Category', 'Price', 'Type', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {foodItems.map(f => (
                <tr key={f.id} style={{ borderBottom: `1px dashed ${C.border}` }}>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>{f.name}</td>
                  <td style={{ padding: '14px 20px' }}><span style={{ padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', fontSize: 12 }}>{f.category_name || f.category}</span></td>
                  <td style={{ padding: '14px 20px', fontWeight: 800, color: C.accent }}>₹{Number(f.price).toFixed(2)}</td>
                  <td style={{ padding: '14px 20px' }}><VegDot isVeg={f.is_veg} /></td>
                  <td style={{ padding: '14px 20px' }}><span style={{ padding: '3px 8px', borderRadius: 6, background: f.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: f.status === 'active' ? '#166534' : '#991B1B', fontSize: 11, fontWeight: 700 }}>{f.status}</span></td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleViewFi(f)} 
                        style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer' }}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditFi(f)} 
                        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
                        title="Edit Item"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteFoodItem(f.id)} 
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {menuSub === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {cats.map(cat => (
            <div key={cat.id} style={{ background: '#fff', padding: 20, borderRadius: 16, border: `1px solid ${C.border}`, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${cat.color || C.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: cat.color || C.primary }}>
                 <p style={{ margin: 0, fontSize: 18 }}>{cat.icon || '🍽️'}</p>
              </div>
              <h6 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{cat.name}</h6>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{cat.food_items_count || 0} items listed</p>
            </div>
          ))}
          <div onClick={() => setCatModal(true)} style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: `1px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
             <Plus size={20} color={C.muted} />
          </div>
        </div>
      )}

      {menuSub === 'daily-menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
               const dayMenus = Array.isArray(weeklyMenus) ? weeklyMenus.filter(m => m.day === day) : [];
               return (
                <div key={day} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h6 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{day}</h6>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['Breakfast', 'Lunch'].map(type => {
                       const m = dayMenus.find(menu => menu.meal_type === type);
                       return (
                        <div 
                          key={type} 
                          onClick={() => openWmModal(day)}
                          style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                        >
                          <p style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>{type}</p>
                          <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>{m?.title || `Standard ${type}`}</p>
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m?.items?.join(', ') || 'No special items'}</p>
                        </div>
                       );
                    })}
                  </div>
                </div>
               );
            })}
          </div>
        </div>
      )}

      {menuSub === 'always-available' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {foodItems.filter(f => ['Snacks', 'Snack', 'Juices', 'Juice'].includes(f.category_name || f.category)).map(f => (
            <div key={f.id} style={{ background: '#fff', padding: 24, borderRadius: 20, border: `1px solid ${C.border}`, position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ['Juices', 'Juice'].includes(f.category_name || f.category) ? '#FDF2F8' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {['Juices', 'Juice'].includes(f.category_name || f.category) ? <Coffee size={20} color="#DB2777" /> : <ShoppingBag size={20} color="#0284C7" />}
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await canteenApi.toggleFoodItemAvailability(f.id);
                      loadFoodItems(); // Refresh
                    } catch { alert('Failed to toggle status'); }
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {f.status === 'active' ? <ToggleRight size={32} color={C.accent} /> : <ToggleLeft size={32} color={C.muted} />}
                </button>
              </div>
              <div>
                <h6 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{f.name}</h6>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: C.primary }}>₹{Number(f.price).toFixed(0)}</span>
                  <VegDot isVeg={f.is_veg} />
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{f.category_name || f.category}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: f.status === 'active' ? '#059669' : '#DC2626' }}>{f.status === 'active' ? 'AVAILABLE' : 'OUT OF STOCK'}</span>
              </div>
            </div>
          ))}
          {foodItems.filter(f => ['Snacks', 'Snack', 'Juices', 'Juice'].includes(f.category_name || f.category)).length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', background: '#F8FAFC', borderRadius: 20, border: `1px dashed ${C.border}` }}>
              <Eye size={40} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 800, color: C.muted }}>No Items Found</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Add items to "Snacks" or "Juices" category in the catalog first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );


  const renderOrderManagement = () => {
    const actionBtnStyle = { padding: '8px 12px', fontSize: 12, borderRadius: 10, fontWeight: 800 };

    const parseCustomer = (o) => {
      const raw = String(o.customer_name || o.student_name || '').trim();
      const inferredType = o.student ? 'Student' : o.staff ? 'Staff' : (raw.split(':')[0] || 'Customer').trim();
      const inferredName = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      return {
        type: inferredType || 'Customer',
        name: inferredName || 'Walk-in Customer',
      };
    };

    const getOrderedFood = (o) => {
      const orderItems = Array.isArray(o.order_items_detail) ? o.order_items_detail : [];
      if (orderItems.length > 0) {
        return orderItems.map(i => {
          const qty = Number(i.quantity || 1);
          const name = i.food_item_name || 'Item';
          return qty > 1 ? `${name}(${qty})` : name;
        });
      }
      const items = Array.isArray(o.items_detail) ? o.items_detail : [];
      return items.map(i => i.name || 'Item');
    };

    const getOrderTotal = (o) => {
      if (o.total_amount != null) return Number(o.total_amount);
      if (o.total_price != null) return Number(o.total_price);
      const orderItems = Array.isArray(o.order_items_detail) ? o.order_items_detail : [];
      if (orderItems.length > 0) {
        return orderItems.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
      }
      return 0;
    };

    const getStatusLabel = (s) => {
      const key = String(s || '').toLowerCase();
      if (key === 'pending' || key === 'preparing') return 'Pending';
      if (key === 'ready' || key === 'completed') return 'Received';
      if (key === 'cancelled') return 'Cancelled';
      return key;
    };

    const renderActions = (o) => {
      const s = String(o.status || '').toLowerCase();
      if (s === 'pending') {
        return (
          <div className={styles.ordersActions}>
            <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'preparing', 'preparing')} style={actionBtnStyle}>Accept</Btn>
            <Btn size="sm" variant="ghost" onClick={() => updateOrderStatus(o.id, 'cancelled')} style={{ ...actionBtnStyle, color: '#EF4444' }}>Reject</Btn>
          </div>
        );
      }
      if (s === 'preparing') {
        return (
          <div className={styles.ordersActions}>
            <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'ready', 'ready')} style={actionBtnStyle}>Mark Ready</Btn>
            <Btn size="sm" variant="ghost" onClick={() => updateOrderStatus(o.id, 'cancelled')} style={{ ...actionBtnStyle, color: '#EF4444' }}>Cancel</Btn>
          </div>
        );
      }
      if (s === 'ready') {
        return (
          <div className={styles.ordersActions}>
            <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'completed', 'completed')} style={actionBtnStyle}>Complete</Btn>
          </div>
        );
      }
      return <span style={{ color: C.muted, fontWeight: 800 }}>—</span>;
    };

    const filteredOrders = orderStatus
      ? orders.filter(o => String(o.status || '').toLowerCase() === orderStatus)
      : orders;

    const statusTabs = ['all', 'pending', 'preparing', 'ready', 'completed'];
    const statusCounts = {};
    statusTabs.forEach(s => {
      statusCounts[s] = s === 'all' ? orders.length : orders.filter(o => String(o.status || '').toLowerCase() === s).length;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, '--op-border': C.border, '--op-text': C.text, '--op-muted': C.muted, '--op-primary': C.primary }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusTabs.map(s => (
              <button key={s} onClick={() => setOrderStatus(s === 'all' ? '' : s)} style={{
                padding: '6px 14px', borderRadius: 8, border: `1px solid ${orderStatus === (s === 'all' ? '' : s) ? C.primary : C.border}`,
                background: orderStatus === (s === 'all' ? '' : s) ? C.primary : '#fff', color: orderStatus === (s === 'all' ? '' : s) ? '#fff' : C.text,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6
              }}>
                {s}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                  background: orderStatus === (s === 'all' ? '' : s) ? 'rgba(255,255,255,0.25)' : C.bg,
                  color: orderStatus === (s === 'all' ? '' : s) ? '#fff' : C.muted,
                  fontSize: 11, fontWeight: 800
                }}>{statusCounts[s] || 0}</span>
              </button>
            ))}
          </div>
          <Btn onClick={() => setOpModal(true)}><Plus size={16} /> Place New Order</Btn>
        </div>

        <section className={styles.ordersSection}>
          <div className={styles.ordersTableWrap}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  {['Order #', 'Customer Name', 'Type', 'Food Ordered', 'Total Price', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => {
                  const customer = parseCustomer(o);
                  const foods = getOrderedFood(o);
                  const foodList = foods.join(', ') || '—';
                  const total = getOrderTotal(o);
                  const statusLabel = getStatusLabel(o.status);
                  return (
                    <tr key={o.id}>
                      <td><span className={styles.ordersToken}>#{String(o.id || '').padStart(4, '0')}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className={styles.ordersCustomer}>{customer.name}</span>
                          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</span>
                        </div>
                      </td>
                      <td><span className={styles.ordersTypeBadge}>{customer.type}</span></td>
                      <td><span className={styles.ordersItems}>{foodList}</span></td>
                      <td><span className={styles.ordersTotal}>₹{total.toLocaleString()}</span></td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                          background: statusLabel === 'Received' ? '#D1FAE5' : statusLabel === 'Pending' ? '#FEF3C7' : '#FEE2E2',
                          color: statusLabel === 'Received' ? '#059669' : statusLabel === 'Pending' ? '#D97706' : '#DC2626',
                          border: `1px solid ${statusLabel === 'Received' ? '#A7F3D0' : statusLabel === 'Pending' ? '#FDE68A' : '#FECACA'}`
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: statusLabel === 'Received' ? '#059669' : statusLabel === 'Pending' ? '#D97706' : '#DC2626'
                          }} />
                          {statusLabel}
                        </span>
                      </td>
                      <td>{renderActions(o)}</td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.ordersEmpty}>No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const renderPayments = () => {
    const parsePaymentCustomer = (p) => {
      const raw = String(p.customer_name || p.student_name || p.name || '').trim();
      let inferredType = 'Customer';

      // Check if order object is embedded in payment
      if (p.order && typeof p.order === 'object') {
        if (p.order.student) inferredType = 'Student';
        else if (p.order.staff) inferredType = 'Staff';
        else if (p.order.customer_name) {
          const orderRaw = String(p.order.customer_name).trim();
          if (orderRaw.toLowerCase().startsWith('student:')) inferredType = 'Student';
          else if (orderRaw.toLowerCase().startsWith('staff:')) inferredType = 'Staff';
          else if (orderRaw.includes(':')) inferredType = orderRaw.split(':')[0].trim();
        }
      }
      // Try to find the associated order from orders array
      else if (p.order && orders.length > 0) {
        const relatedOrder = orders.find(o => o.id === p.order || o.id === p.order_id);
        if (relatedOrder) {
          if (relatedOrder.student) inferredType = 'Student';
          else if (relatedOrder.staff) inferredType = 'Staff';
          else if (relatedOrder.customer_name) {
            const orderRaw = String(relatedOrder.customer_name).trim();
            if (orderRaw.toLowerCase().startsWith('student:')) inferredType = 'Student';
            else if (orderRaw.toLowerCase().startsWith('staff:')) inferredType = 'Staff';
            else if (orderRaw.includes(':')) inferredType = orderRaw.split(':')[0].trim();
          }
        }
      } else if (p.order_id && orders.length > 0) {
        const relatedOrder = orders.find(o => o.id === p.order_id);
        if (relatedOrder) {
          if (relatedOrder.student) inferredType = 'Student';
          else if (relatedOrder.staff) inferredType = 'Staff';
          else if (relatedOrder.customer_name) {
            const orderRaw = String(relatedOrder.customer_name).trim();
            if (orderRaw.toLowerCase().startsWith('student:')) inferredType = 'Student';
            else if (orderRaw.toLowerCase().startsWith('staff:')) inferredType = 'Staff';
            else if (orderRaw.includes(':')) inferredType = orderRaw.split(':')[0].trim();
          }
        }
      }

      // If still Customer, check payment data fields
      if (inferredType === 'Customer') {
        if (p.customer_type === 'student' || p.customer_type === 'Student') {
          inferredType = 'Student';
        } else if (p.customer_type === 'staff' || p.customer_type === 'Staff') {
          inferredType = 'Staff';
        } else if (p.student === true || p.is_student === true) {
          inferredType = 'Student';
        } else if (p.staff === true || p.is_staff === true) {
          inferredType = 'Staff';
        } else if (raw.toLowerCase().startsWith('student:')) {
          inferredType = 'Student';
        } else if (raw.toLowerCase().startsWith('staff:')) {
          inferredType = 'Staff';
        } else if (raw.toLowerCase().includes('student')) {
          inferredType = 'Student';
        } else if (raw.toLowerCase().includes('staff')) {
          inferredType = 'Staff';
        } else if (raw.includes(':')) {
          inferredType = raw.split(':')[0].trim();
        }
      }

      const inferredName = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;

      return {
        type: inferredType,
        name: inferredName || 'Walk-in Customer',
      };
    };

    const todayStr = fmtDate();
    const todayCollection = payments
      .filter(p => !p.is_refunded && p.payment_date?.startsWith(todayStr))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard Icon={Coffee} label="Daily Collection" value={`₹${Number(todayCollection).toLocaleString()}`} color="#10B981" />
          <StatCard Icon={DollarSign} label="Total Collection" value={`₹${Number(payments.filter(p => !p.is_refunded).reduce((sum, p) => sum + Number(p.amount || 0), 0)).toLocaleString()}`} color="#F59E0B" sub="All time" />
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                {['Date', 'Order #', 'Customer Type', 'Amount', 'Status'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: C.muted }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.filter(p => p.payment_method?.toLowerCase() === 'cash').map(p => {
                const customer = parsePaymentCustomer(p);
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '14px 20px', fontSize: 13 }}>{new Date(p.payment_date).toLocaleString()}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700 }}>#{p.order_token || p.order_id || p.id}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(226, 232, 240, 0.95)',
                        background: '#F8FAFC', color: C.text, fontSize: 11, fontWeight: 900,
                        letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap'
                      }}>
                        {customer.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 800 }}>₹{Number(p.amount).toFixed(2)}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 99, background: p.is_refunded ? '#FEE2E2' : '#DCFCE7', color: p.is_refunded ? '#991B1B' : '#166534', fontSize: 12, fontWeight: 700 }}>
                        {p.is_refunded ? 'Refunded' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            {payments.filter(p => p.payment_method?.toLowerCase() === 'cash').length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: C.muted, fontWeight: 600 }}>No cash payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  const renderInventory = () => {
    const [invFilter, setInvFilter] = useState('all');
    const lowStockItems = invItems.filter(i => Number(i.current_stock) <= Number(i.min_stock_level));
    const expiringSoon = invItems.filter(i => i.expiry_date && new Date(i.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    const filteredItems = invItems.filter(i => {
      if (invFilter === 'all') return true;
      if (invFilter === 'low') return Number(i.current_stock) <= Number(i.min_stock_level);
      if (invFilter === 'expiring') return i.expiry_date && new Date(i.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return i.category?.toLowerCase() === invFilter.toLowerCase();
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Inventory & Stock Level</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, fontWeight: 600 }}>Real-time tracking of stock levels</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setInvItemModal(true)} variant="success"><Plus size={16} /> Add Item</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard Icon={Package} label="Total Items" value={invItems.length} color={C.primary} />
          <StatCard Icon={AlertTriangle} label="Low Stock" value={lowStockItems.length} color="#EF4444" />
          <StatCard Icon={Clock} label="Near Expiry" value={expiringSoon.length} color="#F59E0B" />
          <StatCard Icon={CheckCircle2} label="Stock Value" value={`₹${Number(invItems.reduce((acc, i) => acc + (Number(i.current_stock) * 10), 0)).toLocaleString()}`} color="#10B981" />
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {['all', 'low', 'expiring'].map(f => (
            <button key={f} onClick={() => setInvFilter(f)} style={{
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${invFilter === f ? C.primary : C.border}`,
              background: invFilter === f ? C.primary : '#fff', color: invFilter === f ? '#fff' : C.muted,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap'
            }}>{f === 'expiring' ? 'expired' : f}</button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                {['Item', 'Category', 'Stock Level', 'Unit', 'Min Level', 'Mfg Date', 'Expiry', 'Actions'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(i => (
                <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>{i.name}</td>
                  <td style={{ padding: '16px 20px' }}><span style={{ padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', fontSize: 11, fontWeight: 700 }}>{i.category_name || i.category || '—'}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: Number(i.current_stock) <= Number(i.min_stock_level) ? '#EF4444' : C.accent }}>{i.current_stock}</span>
                        <div style={{ width: 60, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (Number(i.current_stock) / (Number(i.min_stock_level) * 2)) * 100)}%`, height: '100%', background: Number(i.current_stock) <= Number(i.min_stock_level) ? '#EF4444' : C.accent }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openInvOutModal(i)}
                        title="Reduce stock"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: '#FEE2E2', border: '1px solid #FECACA',
                          color: '#B91C1C', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: C.muted }}>{i.unit}</td>
                  <td style={{ padding: '16px 20px', fontSize: 13 }}>{i.min_stock_level}</td>
                  <td style={{ padding: '16px 20px' }}>
                    {i.manufacturing_date ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                        {new Date(i.manufacturing_date).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {i.expiry_date ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: new Date(i.expiry_date) <= new Date() ? '#EF4444' : expiringSoon.includes(i) ? '#F59E0B' : C.text }}>
                        {new Date(i.expiry_date).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => handleEditInvItem(i)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }} title="Edit"><Edit2 size={16} /></button>
                      <button type="button" onClick={() => deleteInvItem(i.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
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

  const renderSuppliers = () => {
    const [supTab, setSupTab] = useState('list');
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Supplier & Purchase Orders</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, fontWeight: 600 }}>Manage vendors and purchase history</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setSuppModal(true)} variant="success"><Plus size={16} /> New Supplier</Btn>
            <Btn onClick={() => setPoModal(true)} variant="primary"><ShoppingCart size={16} /> New PO</Btn>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
          {['list', 'purchase-orders'].map(t => (
            <button key={t} onClick={() => setSupTab(t)} style={{
              background: 'none', border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 700,
              color: supTab === t ? C.primary : C.muted, borderBottom: supTab === t ? `2px solid ${C.primary}` : 'none', cursor: 'pointer',
              textTransform: 'capitalize'
            }}>{t.replace('-', ' ')}</button>
          ))}
        </div>

        {supTab === 'list' && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                  {['Supplier', 'Contact', 'Phone', 'Category', 'Actions'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: '16px 20px', fontSize: 14 }}>{s.contact_person}</td>
                    <td style={{ padding: '16px 20px', fontSize: 14 }}>{s.phone}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(s.categories_detail || []).map(cat => (
                          <span key={cat.id} style={{ padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', fontSize: 10, fontWeight: 700 }}>{cat.name}</span>
                        ))}
                        {(!s.categories_detail || s.categories_detail.length === 0) && <span style={{ color: C.muted, fontSize: 11 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleEditSupp(s)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }} title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => deleteSupplier(s.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {supTab === 'purchase-orders' && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                  {['PO ID', 'Supplier', 'Date', 'Amount', 'Status', 'Payment', 'Actions'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '16px 20px', fontWeight: 800 }}>PO-{po.id}</td>
                    <td style={{ padding: '16px 20px' }}>{po.supplier_name}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13 }}>{new Date(po.order_date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 800 }}>₹{Number(po.total_amount).toLocaleString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <select 
                        value={po.status} 
                        onChange={(e) => handlePoStatusChange(po.id, e.target.value)}
                        style={{ 
                          padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 800,
                          background: po.status === 'received' ? '#DCFCE7' : '#FEF3C7',
                          color: po.status === 'received' ? '#166534' : '#92400E',
                          outline: 'none', cursor: 'pointer', textTransform: 'uppercase'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <select 
                        disabled={po.status !== 'received'}
                        value={po.payment_status} 
                        onChange={(e) => updatePoPaymentStatus(po.id, e.target.value)}
                        style={{ 
                          padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 800,
                          background: po.payment_status === 'paid' ? '#DCFCE7' : '#FEE2E2',
                          color: po.payment_status === 'paid' ? '#166534' : '#991B1B',
                          outline: 'none', cursor: po.status === 'received' ? 'pointer' : 'not-allowed', textTransform: 'uppercase',
                          opacity: po.status === 'received' ? 1 : 0.6
                        }}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="partially_paid">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {po.status === 'received' && (
                          <>
                            <Btn size="sm" variant="ghost" onClick={() => { setSelectedPo(po); setInvoiceModal(true); }}>
                              <FileText size={14} /> {po.payment_status === 'paid' ? 'Receipt' : 'Invoice'}
                            </Btn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderStaff = () => {
    const [staffTab, setStaffTab] = useState('profiles');
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Staff Management</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, fontWeight: 600 }}>Canteen staff profiles, attendance, and task tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setStaffModal(true)} variant="success"><Plus size={16} /> Add Staff</Btn>
            <Btn onClick={() => setAttModal(true)} variant="outline"><Calendar size={16} /> Mark Attendance</Btn>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
          {['profiles', 'attendance', 'tasks'].map(t => (
            <button key={t} onClick={() => setStaffTab(t)} style={{
              background: 'none', border: 'none', padding: '8px 16px', fontSize: 14, fontWeight: 700,
              color: staffTab === t ? C.primary : C.muted, borderBottom: staffTab === t ? `2px solid ${C.primary}` : 'none', cursor: 'pointer',
              textTransform: 'capitalize'
            }}>{t.replace('-', ' ')}</button>
          ))}
        </div>

        {staffTab === 'profiles' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {staffList.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{s.full_name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{s.full_name}</h6>
                    <span style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{s.role}</span>
                  </div>
                  <span style={{ padding: '4px 8px', borderRadius: 6, background: s.status === 'active' ? '#DCFCE7' : '#F1F5F9', color: s.status === 'active' ? '#166534' : C.muted, fontSize: 11, fontWeight: 800 }}>{s.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Phone</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{s.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Attendance</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{s.attendance_stats?.attendance_percentage.toFixed(0)}%</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="outline" size="sm" style={{ flex: 1 }} onClick={() => { setTaskModal(true); setTaskForm(p => ({ ...p, staff: s.id })); }}>Assign Task</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => {}}><Edit2 size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}

        {staffTab === 'attendance' && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                  {['Date', 'Staff Name', 'Role', 'Check In', 'Check Out', 'Status'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '16px 20px', fontSize: 13 }}>{new Date(a.date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>{a.staff_name}</td>
                    <td style={{ padding: '16px 20px', fontSize: 12, color: C.muted }}>{a.role}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13 }}>{a.check_in || '—'}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13 }}>{a.check_out || '—'}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 99, background: a.status === 'present' ? '#DCFCE7' : '#FEE2E2', color: a.status === 'present' ? '#166534' : '#991B1B', fontSize: 11, fontWeight: 800 }}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staffTab === 'tasks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ padding: '4px 8px', borderRadius: 6, background: t.priority === 'high' ? '#FEE2E2' : '#F1F5F9', color: t.priority === 'high' ? '#DC2626' : C.muted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{t.priority} priority</span>
                  <StatusBadge statusKey={t.status === 'completed' ? 'completed' : 'pending'} />
                </div>
                <div>
                  <h6 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{t.title}</h6>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{t.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{t.staff_name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{t.staff_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Deadline: {new Date(t.deadline).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFeedback = () => (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5 style={{ margin: 0, fontWeight: 800 }}>Customer Feedback & Reviews</h5>
        <Btn size="sm" onClick={() => setFeedbackModal(true)}><Plus size={16} /> Add Feedback</Btn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {complaints.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <MessageSquare size={48} color={C.border} style={{ marginBottom: 16 }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.muted }}>No Feedback Yet</p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94A3B8' }}>Customer feedback and complaints will appear here.</p>
          </div>
        ) : (
          complaints.map(c => (
            <div key={c.id} style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: '#F1F5F9', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.primary }}>{c.user_name?.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h6 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{c.subject}</h6>
                  <span style={{ fontSize: 12, color: C.muted }}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill={i <= c.rating ? '#F59E0B' : 'none'} color={i <= c.rating ? '#F59E0B' : '#CBD5E1'} />)}
                </div>
                <p style={{ fontSize: 14, margin: 0, color: '#475569', lineHeight: 1.5 }}>{c.description}</p>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: c.status === 'resolved' ? '#DCFCE7' : '#FEE2E2', color: c.status === 'resolved' ? '#166534' : '#991B1B' }}>{c.status}</span>
                  {c.status !== 'resolved' && <button onClick={async () => {
                    try {
                      await canteenApi.updateComplaintStatus(c.id, 'resolved', 'Resolved by admin');
                      loadComplaints();
                    } catch { alert('Failed to update status'); }
                  }} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Mark as Resolved</button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderReports = () => {
    const [reportType, setReportType] = useState('sales');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['sales', 'inventory', 'vendor', 'expenses'].map(p => (
              <button key={p} onClick={() => setReportType(p)} style={{
                padding: '6px 16px', borderRadius: 10, border: `1px solid ${reportType === p ? C.primary : C.border}`,
                background: reportType === p ? C.primary : '#fff', color: reportType === p ? '#fff' : C.muted,
                fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['daily', 'weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => loadReports(p)} style={{
                padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: '#fff', color: C.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer'
              }}>{p}</button>
            ))}
            <Btn variant="outline" size="sm"><FileText size={14} /> Export</Btn>
          </div>
        </div>

        {reportType === 'sales' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <StatCard Icon={DollarSign} label="Period Revenue" value={`₹${Number(reports?.total_revenue || 0).toLocaleString()}`} color="#10B981" />
              <StatCard Icon={ShoppingBag} label="Total Orders" value={reports?.total_orders || 0} color="#3B82F6" />
              <StatCard Icon={TrendingUp} label="Avg Order Value" value={`₹${Number(reports?.avg_order_value || 0).toFixed(2)}`} color="#6366F1" />
              <StatCard Icon={AlertTriangle} label="Wastage Loss" value={`₹${Number(reports?.wastage_loss || 0).toLocaleString()}`} color="#EF4444" />
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
              <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Daily Sales Breakdown</h5>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    {['Date', 'Orders', 'Revenue', 'Growth'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reports?.daily_breakdown?.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '16px 20px', fontSize: 14 }}>{d.date}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800 }}>{d.orders}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: C.accent }}>₹{Number(d.revenue).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: d.growth >= 0 ? '#059669' : '#DC2626' }}>
                          {d.growth >= 0 ? '+' : ''}{d.growth}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {reportType === 'inventory' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <StatCard Icon={Package} label="Total Items" value={invItems.length} color="#3B82F6" />
              <StatCard Icon={AlertTriangle} label="Low Stock Items" value={invItems.filter(i => Number(i.current_stock) <= Number(i.min_stock_level)).length} color="#EF4444" />
              <StatCard Icon={Clock} label="Expiring Soon" value={invItems.filter(i => i.expiry_date && new Date(i.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length} color="#F59E0B" />
              <StatCard Icon={DollarSign} label="Stock Value" value={`₹${Number(invItems.reduce((sum, i) => sum + (Number(i.current_stock) * (Number(i.unit_price) || 0)), 0)).toLocaleString()}`} color="#10B981" />
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
              <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Inventory Movement Summary</h5>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    {['Item', 'Inward', 'Outward', 'Net Change', 'Current Stock'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {invItems.slice(0, 10).map(i => {
                    const inward = invLogs.filter(l => l.item_id === i.id && l.log_type === 'in').reduce((sum, l) => sum + Number(l.quantity), 0);
                    const outward = invLogs.filter(l => l.item_id === i.id && l.log_type === 'out').reduce((sum, l) => sum + Number(l.quantity), 0);
                    return (
                      <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800, fontSize: 14 }}>{i.name}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#059669' }}>+{inward}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#DC2626' }}>-{outward}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800 }}>{inward - outward}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 900 }}>{i.current_stock} {i.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {reportType === 'vendor' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <StatCard Icon={Store} label="Total Vendors" value={vendors.length} color="#3B82F6" />
              <StatCard Icon={Star} label="Avg Rating" value={vendors.length > 0 ? (vendors.reduce((sum, v) => sum + (v.quality_score || 0), 0) / vendors.length).toFixed(1) : '0'} color="#F59E0B" />
              <StatCard Icon={Truck} label="Total Suppliers" value={suppliers.length} color="#6366F1" />
              <StatCard Icon={DollarSign} label="Total Purchases" value={`₹${Number(invLogs.filter(l => l.log_type === 'in').reduce((sum, l) => sum + (Number(l.quantity) * (Number(l.unit_price) || 0)), 0)).toLocaleString()}`} color="#10B981" />
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
              <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Vendor Performance</h5>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    {['Vendor Name', 'Delivery Score', 'Quality Score', 'Reliability', 'Total Orders'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, fontSize: 14 }}>{v.name}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800 }}>{v.delivery_score || 0}%</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800 }}>{v.quality_score || 0}%</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800 }}>{v.reliability_score || 0}%</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800 }}>{invLogs.filter(l => l.vendor_id === v.id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {reportType === 'expenses' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <StatCard Icon={DollarSign} label="Total Expenses" value={`₹${Number(invLogs.filter(l => l.log_type === 'in').reduce((sum, l) => sum + (Number(l.quantity) * (Number(l.unit_price) || 0)), 0)).toLocaleString()}`} color="#EF4444" />
              <StatCard Icon={ShoppingBag} label="Total Purchases" value={invLogs.filter(l => l.log_type === 'in').length} color="#3B82F6" />
              <StatCard Icon={TrendingUp} label="Avg Purchase" value={`₹${Number(invLogs.filter(l => l.log_type === 'in').reduce((sum, l) => sum + (Number(l.quantity) * (Number(l.unit_price) || 0)), 0) / (invLogs.filter(l => l.log_type === 'in').length || 1)).toFixed(2)}`} color="#6366F1" />
              <StatCard Icon={Package} label="Stock Value" value={`₹${Number(invItems.reduce((sum, i) => sum + (Number(i.current_stock) * (Number(i.unit_price) || 0)), 0)).toLocaleString()}`} color="#10B981" />
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 24px 44px -38px rgba(15, 23, 42, 0.6)' }}>
              <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Expense Breakdown by Category</h5>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                    {['Category', 'Total Spent', 'Purchases', 'Avg Cost'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['groceries', 'dairy', 'snacks', 'beverages', 'general'].map(cat => {
                    const catItems = invItems.filter(i => i.category === cat);
                    const catLogs = invLogs.filter(l => catItems.some(i => i.id === l.item_id) && l.log_type === 'in');
                    const totalSpent = catLogs.reduce((sum, l) => sum + (Number(l.quantity) * (Number(l.unit_price) || 0)), 0);
                    return (
                      <tr key={cat} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800, fontSize: 14, textTransform: 'capitalize' }}>{cat}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#EF4444' }}>₹{totalSpent.toLocaleString()}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800 }}>{catLogs.length}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 800 }}>₹{catLogs.length > 0 ? (totalSpent / catLogs.length).toFixed(2) : '0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  /* ═══════════ MAIN LAYOUT ═══════════ */

  const s = activeSegment || 'dashboard';

  return (
    <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%' }}>



      {/* Content Area */}
      <div style={{ flex: 1, padding: '24px 30px' }}>
        <div style={{ width: '100%' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className={styles.titleSection}>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
                Canteen Management
              </h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontWeight: 600, fontSize: 14 }}>
                Complete oversight of food operations, inventory, and kitchen services.
              </p>
            </div>
          </header>

          <nav className={styles.tabNavigation}>
            {NAV.map((tab) => (
              <Link
                key={tab.id}
                href={`/admins/canteen/${tab.id}`}
                className={`${styles.tabButton} ${s === tab.id ? styles.activeTab : ''}`}
              >
                <tab.Icon size={18} />
                {tab.label}
              </Link>
            ))}
          </nav>

          {loadingMap[s] ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 style={{ animation: 'spin 1s linear infinite' }} color={C.primary} size={40} /></div>
          ) : (
            <>
              {s === 'dashboard' && renderDashboard()}
              {s === 'menu'      && renderMenuManagement()}
              {s === 'inventory' && renderInventory()}
              {s === 'suppliers' && renderSuppliers()}
              {s === 'staff'     && renderStaff()}
              {s === 'feedback'  && renderFeedback()}
              {s === 'reports'   && renderReports()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal 
        open={fiModal} 
        onClose={() => { setFiModal(false); setEditingFi(null); setFiForm({ name: '', price: '', category: '', status: 'active', is_veg: true, description: '' }); }} 
        title={editingFi ? "Edit Food Item" : "Add Food Item"} 
        Icon={UtensilsCrossed}
      >
        <form onSubmit={saveFoodItem} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FInput 
            label="Item Name" 
            placeholder="e.g. Masala Dosa" 
            value={fiForm.name}
            onChange={e => setFiForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FInput 
              label="Price" 
              type="number" 
              step="0.01" 
              value={fiForm.price}
              onChange={e => setFiForm(p => ({ ...p, price: e.target.value }))}
              required
            />
            <FSelect 
              label="Category"
              value={fiForm.category}
              onChange={e => setFiForm(p => ({ ...p, category: e.target.value }))}
              required
            >
              <option value="">Select Category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FSelect>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FSelect 
              label="Dietary Type"
              value={String(fiForm.is_veg)}
              onChange={e => setFiForm(p => ({ ...p, is_veg: e.target.value === 'true' }))}
            >
              <option value="true">Vegetarian</option>
              <option value="false">Non-Vegetarian</option>
            </FSelect>
            <FSelect 
              label="Status"
              value={fiForm.status}
              onChange={e => setFiForm(p => ({ ...p, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </FSelect>
          </div>
          <FTextarea 
            label="Description (Optional)"
            placeholder="Describe the dish, ingredients, or allergens..."
            value={fiForm.description}
            onChange={e => setFiForm(p => ({ ...p, description: e.target.value }))}
          />
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn variant="outline" onClick={() => { setFiModal(false); setEditingFi(null); setFiForm({ name: '', price: '', category: '', status: 'active', is_veg: true, description: '' }); }}>Cancel</Btn>
            <Btn type="submit">{editingFi ? "Update Item" : "Save Item"}</Btn>
          </div>
        </form>
      </Modal>

      {/* Food Item Details Modal */}
      <Modal open={viModal} onClose={() => setViModal(false)} title="Food Item Details" Icon={Eye} color={C.accent}>
        {selectedVi && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: C.text }}>{selectedVi.name}</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <VegDot isVeg={selectedVi.is_veg} />
                  <span style={{ padding: '4px 10px', borderRadius: 8, background: '#F1F5F9', fontSize: 12, fontWeight: 700, color: C.muted }}>{selectedVi.category_name || 'Category'}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase' }}>Price</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.accent }}>₹{Number(selectedVi.price).toFixed(2)}</p>
              </div>
            </div>

            <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 16, border: `1px solid ${C.border}` }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.primary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Item Description
              </h4>
              <p style={{ margin: 0, fontSize: 15, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedVi.description || 'No description provided for this item.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: C.muted }}>SYSTEM STATUS</p>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: selectedVi.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: selectedVi.status === 'active' ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{selectedVi.status}</span>
              </div>
              <div style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: C.muted }}>POPULARITY</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{selectedVi.times_ordered || 0} Orders</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn onClick={() => setViModal(false)}>Close Summary</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Category Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Create New Category" Icon={LayoutGrid}>
        <form onSubmit={saveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FInput 
            label="Category Name" 
            placeholder="e.g. Beverages, Desserts" 
            value={catForm.name}
            onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             <FInput 
               label="Icon (Emoji)" 
               placeholder="e.g. 🍰, 🥤" 
               value={catForm.icon}
               onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))}
             />
             <FInput 
               label="Brand Color" 
               type="color"
               value={catForm.color}
               onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
               style={{ height: 44, padding: '4px 8px' }}
             />
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn variant="outline" onClick={() => setCatModal(false)}>Cancel</Btn>
            <Btn type="submit">Create Category</Btn>
          </div>
        </form>
      </Modal>

      {/* Place Order Modal */}
      <Modal
        open={opModal}
        onClose={() => { setOpModal(false); setOpShowDrop(false); }}
        title="Create New Order"
        Icon={Plus}
        width="880px"
      >
        <div
          className={styles.orderModalShell}
          style={{
            '--op-primary': C.primary,
            '--op-accent': C.accent,
            '--op-border': C.border,
            '--op-text': C.text,
            '--op-muted': C.muted,
          }}
        >
          <div className={styles.orderModalGrid}>
            <div className={styles.orderLeft}>
              <div className={styles.orderCard}>
                <div className={styles.orderCardHeader}>
                  <div className={styles.orderCardHeading}>
                    <p className={styles.orderKicker}>Customer</p>
                    <p className={styles.orderTitle}>Who is this order for?</p>
                    <p className={styles.orderSubtitle}>Search and select a student or staff member.</p>
                  </div>

                  <div className={styles.orderSegmented}>
                    {['student', 'staff'].map(type => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={opCustomerType === type}
                        className={`${styles.orderSegmentBtn} ${opCustomerType === type ? styles.orderSegmentBtnActive : ''}`}
                        onClick={async () => {
                          setOpCustomerType(type);
                          setOpSearch('');
                          setOpSelected(null);
                          setOpShowDrop(false);
                          if (type === 'student' && stuList.length === 0) {
                            try {
                              const r = await canteenApi.searchStudents('', { ignore_rls: true, paginate: 'false' });
                              setStuList(r.data?.results || r.data || []);
                            } catch { /* silent */ }
                          } else if (type === 'staff' && staList.length === 0) {
                            try {
                              const r = await canteenApi.searchStaff('');
                              setStaList(r.data || []);
                            } catch { /* silent */ }
                          }
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.orderField}>
                  <label className={styles.orderLabel}>
                    Select {opCustomerType === 'student' ? 'student' : 'staff member'}
                  </label>
                  <div className={styles.orderSearch}>
                    <Search size={16} />
                    <input
                      className={styles.orderSearchInput}
                      placeholder={`Search ${opCustomerType}s…`}
                      value={opSearch}
                      onChange={e => { setOpSearch(e.target.value); setOpShowDrop(true); }}
                      onFocus={async () => {
                        setOpShowDrop(true);
                        if (opCustomerType === 'student' && stuList.length === 0) {
                          try {
                            const r = await canteenApi.searchStudents('', { ignore_rls: true, paginate: 'false' });
                            setStuList(r.data?.results || r.data || []);
                          } catch { /* silent */ }
                        } else if (opCustomerType === 'staff' && staList.length === 0) {
                          try {
                            const r = await canteenApi.searchStaff('');
                            setStaList(r.data || []);
                          } catch { /* silent */ }
                        }
                      }}
                    />

                    {opShowDrop && (
                      <div className={styles.orderDropdown}>
                        {(opCustomerType === 'student' ? stuList : staList).length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: C.muted }}>
                            Loading directory...
                          </div>
                        ) : (
                          <>
                            {(opCustomerType === 'student' ? stuList : staList)
                              .filter(s => {
                                const name = (s.full_name || `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Unknown User').toLowerCase();
                                return !opSearch || name.includes(opSearch.toLowerCase());
                              })
                              .slice(0, 50)
                              .map(s => {
                                const name = s.full_name || `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Unknown User';
                                const sub = opCustomerType === 'student' ? (s.class_name || 'No Class') : (s.designation || 'Staff');
                                return (
                                  <div
                                    key={s.id}
                                    onMouseDown={() => { setOpSelected({ ...s, full_name: name, type: opCustomerType }); setOpSearch(''); setOpShowDrop(false); }}
                                    className={styles.orderDropdownItem}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div className={styles.orderDropdownName}>{name}</div>
                                      <div className={styles.orderDropdownMeta}>{sub}</div>
                                    </div>
                                    <ChevronDown size={14} color={C.muted} style={{ opacity: 0.6, marginTop: 3 }} />
                                  </div>
                                );
                              })}
                            {(opCustomerType === 'student' ? stuList : staList).filter(s => {
                              const name = (s.full_name || `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || 'Unknown User').toLowerCase();
                              return !opSearch || name.includes(opSearch.toLowerCase());
                            }).length === 0 && (
                              <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: C.muted }}>
                                No results found
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {opSelected ? (
                  <div className={styles.orderSelected}>
                    <div className={styles.orderAvatar}>{opCustomerInitials || '?'}</div>
                    <div className={styles.orderSelectedInfo}>
                      <div className={styles.orderSelectedName}>{opSelected.full_name}</div>
                      <div className={styles.orderSelectedMeta}>
                        {opSelected.type === 'student' ? 'Student' : 'Staff'} • {opSelectedMeta}
                      </div>
                    </div>
                    <button type="button" className={styles.orderClear} onClick={() => setOpSelected(null)} aria-label="Clear customer">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.orderHint} style={{ marginTop: 12 }}>
                    <AlertCircle size={16} />
                    Select a customer to start adding items and confirm the order.
                  </div>
                )}
              </div>

              <div className={styles.orderCard}>
                <div className={styles.orderCardHeader}>
                  <div className={styles.orderCardHeading}>
                    <p className={styles.orderKicker}>Items</p>
                    <p className={styles.orderTitle}>Add to cart</p>
                    <p className={styles.orderSubtitle}>Pick a category and add items in one click.</p>
                  </div>
                  <div className={styles.orderCountBadge}>
                    {opItemCount} item{opItemCount === 1 ? '' : 's'}
                  </div>
                </div>

                <div className={styles.orderControlGrid}>
                  <FSelect
                    label="Food Category"
                    value={opFoodCat}
                    onChange={e => setOpFoodCat(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {cats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </FSelect>

                  <div className={styles.orderField}>
                    <label className={styles.orderLabel}>Select item to add</label>
                    <select
                      className={styles.orderSelect}
                      onChange={e => {
                        const f = foodItems.find(fi => fi.id === Number(e.target.value));
                        if (!f) return;
                        setOpItems(prev => {
                          const exists = prev.find(i => i.id === f.id);
                          if (exists) return prev.map(i => i.id === f.id ? { ...i, qty: i.qty + 1 } : i);
                          return [...prev, { id: f.id, name: f.name, price: Number(f.price), qty: 1 }];
                        });
                        e.target.value = "";
                      }}
                    >
                      <option value="">Choose an item...</option>
                      {foodItems.filter(f => {
                        const active = f.status === 'active';
                        const catMatch = opFoodCat === 'all' || String(f.category_name || f.category || '').toLowerCase() === opFoodCat.toLowerCase();
                        return active && catMatch;
                      }).map(f => (
                        <option key={f.id} value={f.id}>{f.name} — ₹{Number(f.price).toFixed(0)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.orderHint}>
                  <Zap size={16} />
                  Selecting an item adds it to your cart automatically.
                </div>
              </div>
            </div>

            <div className={`${styles.orderCard} ${styles.orderSummary}`}>
              <div className={styles.orderCardHeader}>
                <div className={styles.orderCardHeading}>
                  <p className={styles.orderKicker}>Cart</p>
                  <p className={styles.orderTitle}>Summary</p>
                  <p className={styles.orderSubtitle}>
                    {opSelected ? `For ${opSelected.full_name}` : 'Select a customer to continue.'}
                  </p>
                </div>
                <div className={styles.orderCountBadge}>
                  {opItems.length} line{opItems.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className={styles.orderCartList}>
                {opItems.map(item => (
                  <div key={item.id} className={styles.orderCartItem}>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.orderCartName}>{item.name}</div>
                      <div className={styles.orderCartMeta}>₹{item.price} × {item.qty}</div>
                    </div>
                    <div className={styles.orderQty}>
                      <button
                        type="button"
                        className={styles.orderQtyBtn}
                        onClick={() => setOpItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0))}
                        aria-label={`Decrease ${item.name}`}
                      >
                        -
                      </button>
                      <span className={styles.orderQtyVal}>{item.qty}</span>
                      <button
                        type="button"
                        className={styles.orderQtyBtn}
                        onClick={() => setOpItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))}
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {opItems.length === 0 && (
                  <div className={styles.orderEmpty}>
                    <ShoppingBag size={34} className={styles.orderEmptyIcon} />
                    <p className={styles.orderEmptyTitle}>No items yet</p>
                    <p className={styles.orderEmptySub}>Add items from the left panel to build the order.</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <div className={styles.orderTotalLabel}>Payment</div>
                  <div className={styles.orderCountBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={14} color={C.accent} />
                    Cash only
                  </div>
                </div>

                <div className={styles.orderTotalRow}>
                  <div className={styles.orderTotalLabel}>Total</div>
                  <div className={styles.orderTotalAmount}>₹{opTotal.toFixed(2)}</div>
                </div>

                <Btn
                  disabled={!opSelected || opItems.length === 0 || opSubmitting}
                  onClick={placeOpOrder}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    height: 46,
                    marginTop: 14,
                    background: 'linear-gradient(135deg, #1E3A5F 0%, #0F766E 100%)',
                    boxShadow: '0 14px 26px -20px rgba(30,58,95,0.55)',
                  }}
                >
                  {opSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={18} />}
                  {opSubmitting ? 'Placing…' : 'Confirm Order'}
                </Btn>

                <p className={styles.orderFootnote}>
                  Status will be created as <strong>pending</strong> and marked as <strong>paid</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>


      {/* Weekly Menu Modal */}
      <Modal open={wmModal} onClose={() => setWmModal(false)} title={`Edit Menu: ${wmForm.day}`} Icon={Calendar} width="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {['breakfast', 'lunch'].map(key => (
            <div key={key} style={{ padding: 16, background: '#F8FAFC', borderRadius: 16, border: `1px solid ${C.border}` }}>
              <h6 style={{ margin: '0 0 16px', fontWeight: 800, textTransform: 'uppercase', color: C.primary, fontSize: 13 }}>{key} Menu</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <FInput 
                  label="Menu Title" 
                  placeholder="e.g. Special Breakfast" 
                  value={wmForm[key].title} 
                  onChange={e => setWmForm(p => ({ ...p, [key]: { ...p[key], title: e.target.value } }))} 
                />
                <FTextarea 
                  label="Dishes / Items" 
                  placeholder="Enter items separated by commas..." 
                  value={wmForm[key].items} 
                  onChange={e => setWmForm(p => ({ ...p, [key]: { ...p[key], items: e.target.value } }))} 
                />
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setWmModal(false)}>Cancel</Btn>
            <Btn onClick={saveWmMenu}><Save size={18} /> Save Changes</Btn>
          </div>
        </div>
      </Modal>
    {/* Supplier Modal */}
      <Modal open={suppModal} onClose={() => { setSuppModal(false); setEditingSupp(null); }} title={editingSupp ? "Edit Supplier" : "Add Supplier"} Icon={Truck}>
        <form onSubmit={saveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Supplier Name" required value={suppForm.name} onChange={e => setSuppForm(p => ({ ...p, name: e.target.value }))} />
          <FInput label="Contact Person" value={suppForm.contact_person} onChange={e => setSuppForm(p => ({ ...p, contact_person: e.target.value }))} />
          <FInput label="Phone" required value={suppForm.phone} onChange={e => setSuppForm(p => ({ ...p, phone: e.target.value }))} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MultiSelect 
              label="Categories"
              placeholder="Choose Categories..."
              options={invCats.map(c => ({ value: c.id, label: c.name }))}
              selected={suppForm.category_ids}
              onChange={ids => setSuppForm(p => ({ ...p, category_ids: ids }))}
            />
            <Btn type="button" variant="ghost" size="sm" onClick={() => setInvCatModal(true)} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> New Category</Btn>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MultiSelect 
              label="Items Supplied"
              placeholder="Choose Items..."
              options={invItems.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
              selected={suppForm.item_ids}
              onChange={ids => setSuppForm(p => ({ ...p, item_ids: ids }))}
            />
            <Btn type="button" variant="ghost" size="sm" onClick={() => setInvItemModal(true)} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> New Item</Btn>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => { setSuppModal(false); setEditingSupp(null); }}>Cancel</Btn>
            <Btn type="submit">{editingSupp ? "Update Supplier" : "Save Supplier"}</Btn>
          </div>
        </form>
      </Modal>

      {/* Purchase Order Modal */}
      <Modal open={poModal} onClose={() => setPoModal(false)} title="Create Purchase Order" Icon={ShoppingCart} width="700px">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (poForm.items.length === 0) {
            alert('Please add at least one item to the purchase order.');
            return;
          }
          try {
            await canteenApi.createPurchaseOrder(poForm);
            setPoModal(false);
            setPoForm({ supplier: '', order_date: fmtDate(), status: 'pending', notes: '', items: [] });
            loadPOs();
          } catch { alert('Failed to create purchase order'); }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FSelect label="Supplier" required value={poForm.supplier} onChange={e => setPoForm(p => ({ ...p, supplier: e.target.value }))}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FSelect>
            <FInput label="Order Date" type="date" value={poForm.order_date} onChange={e => setPoForm(p => ({ ...p, order_date: e.target.value }))} />
          </div>

          <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h6 style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: C.primary }}>Add Items</h6>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FSelect label="Category" value={poItemForm.category_id} onChange={e => setPoItemForm(p => ({ ...p, category_id: e.target.value, inventory_item_id: '' }))}>
                <option value="">-- All Categories --</option>
                {invCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FSelect>
              <FSelect label="Item" value={poItemForm.inventory_item_id} onChange={e => {
                const item = invItems.find(i => i.id == e.target.value);
                setPoItemForm(p => ({ ...p, inventory_item_id: e.target.value, unit_price: item?.unit_price || 0 }));
              }}>
                <option value="">-- Select Item --</option>
                {invItems.filter(i => !poItemForm.category_id || String(i.category) === String(poItemForm.category_id)).map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </FSelect>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FInput label="QTY" type="number" step="0.01" value={poItemForm.quantity} onChange={e => setPoItemForm(p => ({ ...p, quantity: e.target.value }))} />
              <FInput label="Unit Price" type="number" step="0.01" value={poItemForm.unit_price} onChange={e => setPoItemForm(p => ({ ...p, unit_price: e.target.value }))} />
            </div>

            {poItemForm.category_id && invItems.filter(i => String(i.category) === String(poItemForm.category_id)).length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>No items found for this category.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn type="button" size="sm" onClick={addPoItem} disabled={!poItemForm.inventory_item_id} style={{ background: '#1E3A5F' }}>Add Item</Btn>
            </div>

            {poForm.items.length > 0 && (
              <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: C.muted }}>
                      <th style={{ padding: '4px 8px' }}>Item</th>
                      <th style={{ padding: '4px 8px' }}>Qty</th>
                      <th style={{ padding: '4px 8px' }}>Price</th>
                      <th style={{ padding: '4px 8px' }}>Total</th>
                      <th style={{ padding: '4px 8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poForm.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${C.bg}` }}>
                        <td style={{ padding: '8px' }}>{it.item_name}</td>
                        <td style={{ padding: '8px' }}>{it.quantity}</td>
                        <td style={{ padding: '8px' }}>₹{it.unit_price}</td>
                        <td style={{ padding: '8px' }}>₹{(it.quantity * it.unit_price).toFixed(2)}</td>
                        <td style={{ padding: '8px' }}>
                          <button type="button" onClick={() => removePoItem(idx)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ padding: '12px 8px', fontWeight: 800, textAlign: 'right' }}>Total Amount:</td>
                      <td style={{ padding: '12px 8px', fontWeight: 800 }}>₹{poForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <FTextarea label="Notes" value={poForm.notes} onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Btn variant="outline" onClick={() => setPoModal(false)}>Cancel</Btn>
            <Btn type="submit" style={{ background: '#10B981' }}>Create Purchase Order</Btn>
          </div>
        </form>
      </Modal>

      {/* Record Purchase Modal (In) */}
      <Modal open={purModal} onClose={() => setPurModal(false)} title="Record Purchase (Stock In)" Icon={ShoppingCart} color="#10B981">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await canteenApi.createInventoryLog({
              item: purForm.item_id,
              log_type: 'in',
              quantity: purForm.quantity,
              unit_price: purForm.price,
              supplier: purForm.supplier_id
            });
            setPurModal(false);
            setPurForm({ supplier_id: '', item_id: '', quantity: '', price: '' });
            loadInventory();
          } catch { alert('Failed to record purchase. (Ensure API supports this payload)'); }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FSelect label="Select Supplier" required value={purForm.supplier_id} onChange={e => setPurForm(p => ({ ...p, supplier_id: e.target.value }))}>
            <option value="">-- Choose Supplier --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FSelect>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <FSelect label="Select Inventory Item" required value={purForm.item_id} onChange={e => setPurForm(p => ({ ...p, item_id: e.target.value }))}>
                <option value="">-- Choose Item --</option>
                {invItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </FSelect>
            </div>
            <Btn type="button" variant="outline" size="sm" onClick={() => setInvCatModal(true)} style={{ marginBottom: 24 }}><Plus size={14} /> Category</Btn>
            <Btn type="button" variant="outline" size="sm" onClick={() => setInvItemModal(true)} style={{ marginBottom: 24 }}><Plus size={14} /> Item</Btn>
          </div>
          <FInput label="Quantity Purchased" type="number" step="0.01" required value={purForm.quantity} onChange={e => setPurForm(p => ({ ...p, quantity: e.target.value }))} />
          <FInput label="Total Price (₹)" type="number" step="0.01" value={purForm.price} onChange={e => setPurForm(p => ({ ...p, price: e.target.value }))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setPurModal(false)}>Cancel</Btn>
            <Btn type="submit" variant="success">Record Purchase</Btn>
          </div>
        </form>
      </Modal>

      {/* Reduce Stock Modal (Out) */}
      <Modal open={invOutModal} onClose={() => { setInvOutModal(false); setInvOutForm({ item_id: '', quantity: '1', reason: '' }); }} title="Reduce Stock (Stock Out)" Icon={Package} color="#EF4444">
        <form onSubmit={recordStockOut} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(() => {
            const sel = invItems.find(i => String(i.id) === String(invOutForm.item_id));
            return (
              <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontWeight: 800 }}>{sel?.name || 'Inventory Item'}</p>
                {sel && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
                    Current stock: <strong>{sel.current_stock}</strong> {sel.unit}
                  </p>
                )}
              </div>
            );
          })()}

          <FInput label="Quantity to Reduce" type="number" step="0.01" required value={invOutForm.quantity} onChange={e => setInvOutForm(p => ({ ...p, quantity: e.target.value }))} />
          <FInput label="Reason (optional)" value={invOutForm.reason} onChange={e => setInvOutForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Used in kitchen, damaged, spillage" />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => { setInvOutModal(false); setInvOutForm({ item_id: '', quantity: '1', reason: '' }); }}>Cancel</Btn>
            <Btn type="submit" variant="danger" disabled={invOutSubmitting}>
              {invOutSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Minus size={18} />}
              Reduce Stock
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Inventory Category Modal */}
      <Modal open={invCatModal} onClose={() => setInvCatModal(false)} title="Add Inventory Category" Icon={FolderPlus}>
        <form onSubmit={saveInvCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Category Name" required value={invCatForm.name} onChange={e => setInvCatForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Vegetables, Dairy, Snacks" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setInvCatModal(false)}>Cancel</Btn>
            <Btn type="submit">Create Category</Btn>
          </div>
        </form>
      </Modal>

      {/* Inventory Item Modal */}
      <Modal
        open={invItemModal}
        onClose={() => { setInvItemModal(false); setEditingInvItem(null); setInvItemForm({ name: '', category: '', unit: '', min_stock_level: '', current_stock: '', item_type: '', unit_price: '', manufacturing_date: '', expiry_date: '', batch_number: '' }); }}
        title={editingInvItem ? "Edit Inventory Item" : "Add Inventory Item"}
        Icon={Package}
      >
        <form onSubmit={saveInvItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Item Name" required value={invItemForm.name} onChange={e => setInvItemForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rice, Milk, Bread" />
          <FSelect label="Category" required value={invItemForm.category} onChange={e => setInvItemForm(p => ({ ...p, category: e.target.value }))}>
            <option value="">-- Choose Category --</option>
            {invCats.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </FSelect>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FSelect label="Unit" required value={invItemForm.unit} onChange={e => setInvItemForm(p => ({ ...p, unit: e.target.value }))}>
              <option value="">-- Choose Unit --</option>
              {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              {invItemForm.unit && !INVENTORY_UNITS.includes(invItemForm.unit) && (
                <option value={invItemForm.unit}>{invItemForm.unit}</option>
              )}
            </FSelect>
            <FSelect label="Item Type" value={invItemForm.item_type} onChange={e => setInvItemForm(p => ({ ...p, item_type: e.target.value }))}>
              <option value="">-- Choose Type --</option>
              {INVENTORY_ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              {invItemForm.item_type && !INVENTORY_ITEM_TYPES.some(t => t.value === invItemForm.item_type) && (
                <option value={invItemForm.item_type}>{invItemForm.item_type}</option>
              )}
            </FSelect>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FInput label="Current Stock" type="number" step="0.01" required value={invItemForm.current_stock} onChange={e => setInvItemForm(p => ({ ...p, current_stock: e.target.value }))} />
            <FInput label="Min Stock Level" type="number" step="0.01" required value={invItemForm.min_stock_level} onChange={e => setInvItemForm(p => ({ ...p, min_stock_level: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FInput label="Unit Price (₹)" type="number" step="0.01" value={invItemForm.unit_price} onChange={e => setInvItemForm(p => ({ ...p, unit_price: e.target.value }))} />
            <FInput label="Batch Number" value={invItemForm.batch_number} onChange={e => setInvItemForm(p => ({ ...p, batch_number: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FInput label="Manufactured Date" type="date" value={invItemForm.manufacturing_date} onChange={e => setInvItemForm(p => ({ ...p, manufacturing_date: e.target.value }))} />
            <FInput label="Expiry Date" type="date" value={invItemForm.expiry_date} onChange={e => setInvItemForm(p => ({ ...p, expiry_date: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => { setInvItemModal(false); setEditingInvItem(null); setInvItemForm({ name: '', category: '', unit: '', min_stock_level: '', current_stock: '', item_type: '', unit_price: '', manufacturing_date: '', expiry_date: '', batch_number: '' }); }}>Cancel</Btn>
            <Btn type="submit">{editingInvItem ? "Update Item" : "Create Item"}</Btn>
          </div>
        </form>
      </Modal>

      {/* Staff Modal */}
      <Modal open={staffModal} onClose={() => setStaffModal(false)} title="Add Canteen Staff" Icon={ChefHat}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await canteenApi.createStaffProfile(staffForm);
            setStaffModal(false);
            setStaffForm({ user: '', role: 'helper', status: 'active', phone: '', salary: 0 });
            loadStaff();
          } catch { alert('Failed to create staff profile'); }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="User ID / Username" required value={staffForm.user} onChange={e => setStaffForm(p => ({ ...p, user: e.target.value }))} />
          <FSelect label="Role" value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))}>
            <option value="manager">Manager</option>
            <option value="cook">Cook</option>
            <option value="cashier">Cashier</option>
            <option value="helper">Helper</option>
            <option value="cleaner">Cleaner</option>
          </FSelect>
          <FInput label="Phone" value={staffForm.phone} onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))} />
          <FInput label="Salary" type="number" value={staffForm.salary} onChange={e => setStaffForm(p => ({ ...p, salary: e.target.value }))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setStaffModal(false)}>Cancel</Btn>
            <Btn type="submit">Save Staff</Btn>
          </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal open={attModal} onClose={() => setAttModal(false)} title="Staff Attendance" Icon={Calendar}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: C.muted }}>Mark attendance for today's shifts</p>
          {staffList.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{s.full_name}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.role}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" variant="success" onClick={async () => {
                  try {
                    await canteenApi.createStaffAttendance({ staff: s.id, date: fmtDate(), status: 'present', check_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
                    loadStaff();
                  } catch { alert('Failed to mark attendance'); }
                }}>Check In</Btn>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setAttModal(false)}>Close</Btn>
          </div>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Assign New Task" Icon={FileText}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await canteenApi.createStaffTask(taskForm);
            setTaskModal(false);
            setTaskForm({ staff: '', title: '', description: '', deadline: '', priority: 'medium' });
            loadStaff();
          } catch { alert('Failed to assign task'); }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Task Title" required value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
          <FTextarea label="Description" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FInput label="Deadline" type="datetime-local" value={taskForm.deadline} onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} />
            <FSelect label="Priority" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </FSelect>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn variant="outline" onClick={() => setTaskModal(false)}>Cancel</Btn>
            <Btn type="submit">Assign Task</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="Purchase Order Invoice" Icon={FileText} width="800px">
        {selectedPo && (
          <div id="po-invoice-content" style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, borderBottom: `2px solid ${C.primary}`, paddingBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, color: C.primary, fontSize: 24, fontWeight: 900 }}>{selectedPo.payment_status === 'paid' ? 'PAYMENT RECEIPT' : 'INVOICE'}</h2>
                <p style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>PO ID: <strong>PO-{selectedPo.id}</strong></p>
                <p style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>Date: {new Date(selectedPo.order_date).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>School Canteen Management</h4>
                <p style={{ margin: '4px 0', fontSize: 12, color: C.muted }}>Canteen Administration Office</p>
                <p style={{ margin: '4px 0', fontSize: 12, color: C.muted }}>Payment Status: <span style={{ color: selectedPo.payment_status === 'paid' ? '#10B981' : '#EF4444', fontWeight: 800 }}>{selectedPo.payment_status?.toUpperCase()}</span></p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 30 }}>
              <div>
                <h6 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>Vendor / Supplier</h6>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{selectedPo.supplier_name}</p>
                <p style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>{suppliers.find(s => s.id === selectedPo.supplier)?.address || 'Address not provided'}</p>
                <p style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>Phone: {suppliers.find(s => s.id === selectedPo.supplier)?.phone || 'N/A'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h6 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted }}>Ship To</h6>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>Main Campus Canteen</p>
                <p style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>Internal Receiving Department</p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
              <thead>
                <tr style={{ background: C.primary, color: '#fff' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Item Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12 }}>Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12 }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPo.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14 }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14 }}>₹{Number(item.unit_price).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, fontWeight: 700 }}>₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 250 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>₹{Number(selectedPo.total_amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>Grand Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: C.primary }}>₹{Number(selectedPo.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 50, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted }}>Notes</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>{selectedPo.notes || 'No additional notes provided.'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted }}>Payment Receipt</p>
                {selectedPo.receipt_file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Btn size="sm" variant="ghost" onClick={() => window.open(selectedPo.receipt_file, '_blank')}><Eye size={14} /> View Receipt</Btn>
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" style={{ display: 'none' }} onChange={e => handleReceiptUpload(selectedPo.id, e.target.files[0])} />
                      <span style={{ fontSize: 11, color: C.primary, textDecoration: 'underline' }}>Update</span>
                    </label>
                  </div>
                ) : (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, cursor: 'pointer', padding: '6px 12px', border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 12, color: C.muted }}>
                    <Plus size={14} /> Upload Receipt
                    <input type="file" style={{ display: 'none' }} onChange={e => handleReceiptUpload(selectedPo.id, e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            <div style={{ marginTop: 30, textAlign: 'right' }}>
                <div style={{ width: 150, borderBottom: `1px solid ${C.text}`, margin: '0 0 8px auto', height: 40 }}></div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Authorized Signature</p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
          <Btn variant="outline" onClick={() => setInvoiceModal(false)}>Close</Btn>
          <Btn variant="primary" onClick={() => {
            const content = document.getElementById('po-invoice-content').innerHTML;
            const win = window.open('', '', 'height=700,width=900');
            win.document.write('<html><head><title>PO Invoice</title>');
            win.document.write('<style>body { font-family: sans-serif; padding: 40px; color: #1E293B; } table { width: 100%; border-collapse: collapse; } th, td { padding: 12px; border-bottom: 1px solid #E2E8F0; } th { background: #1E3A5F !important; color: white !important; -webkit-print-color-adjust: exact; }</style>');
            win.document.write('</head><body>');
            win.document.write(content);
            win.document.write('</body></html>');
            win.document.close();
            win.print();
          }}><Printer size={16} /> Print Invoice</Btn>
        </div>
      </Modal>

      {/* Add Feedback Modal */}
      <Modal open={feedbackModal} onClose={() => setFeedbackModal(false)} title="Submit Feedback" Icon={MessageSquare}>
        <form onSubmit={saveFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Subject" required value={feedbackForm.subject} onChange={e => setFeedbackForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Food Quality, Service, Cleanliness" />
          <FSelect label="Rating" required value={feedbackForm.rating} onChange={e => setFeedbackForm(p => ({ ...p, rating: parseInt(e.target.value) }))}>
            <option value={5}>5 Stars - Excellent</option>
            <option value={4}>4 Stars - Good</option>
            <option value={3}>3 Stars - Average</option>
            <option value={2}>2 Stars - Poor</option>
            <option value={1}>1 Star - Terrible</option>
          </FSelect>
          <FTextarea label="Description" required value={feedbackForm.description} onChange={e => setFeedbackForm(p => ({ ...p, description: e.target.value }))} placeholder="Please provide details about your experience..." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Btn type="button" variant="outline" onClick={() => setFeedbackModal(false)}>Cancel</Btn>
            <Btn type="submit">Submit Feedback</Btn>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default CanteenModule;

/* ─── Premium Multi-Select Component ─── */
const MultiSelect = ({ label, options, selected = [], onChange, placeholder = "Select options..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', minHeight: 42,
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', cursor: 'pointer'
        }}
      >
        {selected.length === 0 && <span style={{ color: C.muted, fontSize: 14 }}>{placeholder}</span>}
        {selected.map(id => {
          const opt = options.find(o => o.value === id);
          return (
            <span key={id} style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              {opt?.label || id}
              <X size={12} onClick={(e) => { e.stopPropagation(); toggle(id); }} />
            </span>
          );
        })}
        <div style={{ marginLeft: 'auto' }}><ChevronDown size={16} color={C.muted} /></div>
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', 
          borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 100, maxHeight: 240, overflowY: 'auto', padding: 8
        }}>
          <input 
            autoFocus
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, outline: 'none', fontSize: 13 }}
          />
          {filtered.map(o => (
            <div 
              key={o.value}
              onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
              style={{ 
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: selected.includes(o.value) ? `${C.primary}12` : 'transparent',
                color: selected.includes(o.value) ? C.primary : C.text,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              {o.label}
              {selected.includes(o.value) && <CheckCircle2 size={14} />}
            </div>
          ))}
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: C.muted, fontSize: 12, padding: 8 }}>No options found</p>}
        </div>
      )}
      {isOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />}
    </div>
  );
};
