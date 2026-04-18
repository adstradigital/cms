'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import styles from './CanteenModule.module.css';
import {
  LayoutDashboard, UtensilsCrossed, ShoppingCart, CreditCard,
  Package, Truck, MessageSquare, BarChart3, Bell,
  Plus, Search, RefreshCw, Loader2, Edit2, Trash2, X, Save,
  AlertTriangle, ChevronDown, TrendingUp, DollarSign,
  CheckCircle2, Clock, Leaf, Eye, Calendar, AlertCircle,
  ArrowUpRight, Filter, ChefHat, Star, Circle, ShoppingBag,
  Zap, Coffee, ToggleLeft, ToggleRight, FileText, LayoutGrid,
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
  { id: 'orders', label: 'Orders', Icon: ShoppingCart },
  { id: 'payments', label: 'Payments', Icon: CreditCard },
  { id: 'inventory', label: 'Inventory', Icon: Package },
  { id: 'suppliers', label: 'Suppliers', Icon: Truck },
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
  const loadSuppliers = useCallback(async () => {
    try { const r = await canteenApi.getSuppliers(); setSuppliers(r.data?.results || r.data || []); }
    catch { /* silent */ }
  }, []);

  /* ─── Feedback ─── */
  const [complaints, setComplaints] = useState([]);
  const loadComplaints = useCallback(async () => {
    try { const r = await canteenApi.getComplaints(); setComplaints(r.data?.results || r.data || []); }
    catch { /* silent */ }
  }, []);

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
    if (s === 'orders') loadOrders();
    if (s === 'payments') loadPayments();
    if (s === 'inventory') loadInventory();
    if (s === 'suppliers') loadSuppliers();
    if (s === 'feedback') loadComplaints();
    if (s === 'reports') loadReports();
  }, [activeSegment, loadDashboard, loadFoodItems, loadWeeklyMenus, loadOrders, loadPayments, loadInventory, loadSuppliers, loadComplaints, loadReports]);

  /* ─── Handlers ─── */
  const togglePayStatus = async (id) => {
    if (!confirm('Mark payment as Refunded?')) return;
    try { await canteenApi.updatePayment(id, { is_refunded: true }); loadPayments(); } catch { /* silent */ }
  };

  const updateOrderStatus = async (id, status) => {
    try { await canteenApi.updateOrderStatus(id, status); loadOrders(); } catch { /* silent */ }
  };

  /* ═══════════ RENDER SECTIONS ═══════════ */

  const renderDashboard = () => {
    const t = dash?.today || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <StatCard Icon={ShoppingCart} label="Today's Orders" value={t.total_orders || 0} color="#3B82F6" />
          <StatCard Icon={DollarSign} label="Total Revenue" value={`₹${Number(t.revenue || 0).toLocaleString()}`} color="#10B981" />
          <StatCard Icon={Clock} label="Pending Orders" value={t.pending || 0} color="#F59E0B" />
          <StatCard Icon={AlertTriangle} label="Low Stock" value={dash?.low_stock_count || 0} color="#EF4444" sub="Items needing refill" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 24 }}>
          {/* Recent Orders */}
          <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><RefreshCw size={18} color={C.primary} /> Live Orders Overview</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(dash?.recent_orders || []).slice(0, 6).map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>#{o.token_number}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{o.student_name || 'Staff'}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{o.items_count} items \u2022 \u20B9{Number(o.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                  <StatusBadge statusKey={o.status} />
                </div>
              ))}
              {(dash?.recent_orders || []).length === 0 && <p style={{ textAlign: 'center', color: C.muted, padding: '20px' }}>No orders today yet.</p>}
            </div>
          </div>

          {/* Top Items */}
          <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} color="#F59E0B" /> Top-Selling Items</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(dash?.top_items || []).slice(0, 5).map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: i < 3 ? '#F59E0B' : C.border, width: 24 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{item.name}</p>
                    <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 3, marginTop: 4 }}>
                      <div style={{ height: '100%', width: `${(item.times_ordered / (dash?.top_items[0]?.times_ordered || 1)) * 100}%`, background: '#1E3A5F', borderRadius: 3 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{item.times_ordered || item.sales_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Trend Visual */}
        <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><BarChart3 size={18} color={C.accent} /> Revenue Trend (Last 7 Days)</h4>
              <div style={{ display: 'flex', gap: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.primary }} /> <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Daily Sales</span></div>
              </div>
           </div>
           <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 24 }}>
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
                 <p style={{ margin: 0, fontSize: 18 }}>{cat.icon || '🍽\uFE0F'}</p>
              </div>
              <h6 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{cat.name}</h6>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{cat.items_count || 0} items listed</p>
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
                    <button onClick={() => openWmModal(day)} style={{ background: '#F1F5F9', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Edit Menu</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['Breakfast', 'Lunch'].map(type => {
                       const m = dayMenus.find(menu => menu.meal_type === type);
                       return (
                        <div key={type} style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px' }}>
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
          {foodItems.filter(f => ['Snacks', 'Juice'].includes(f.category_name || f.category)).map(f => (
            <div key={f.id} style={{ background: '#fff', padding: 24, borderRadius: 20, border: `1px solid ${C.border}`, position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: (f.category_name || f.category) === 'Juice' ? '#FDF2F8' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(f.category_name || f.category) === 'Juice' ? <Coffee size={20} color="#DB2777" /> : <ShoppingBag size={20} color="#0284C7" />}
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
          {foodItems.filter(f => ['Snacks', 'Juice'].includes(f.category_name || f.category)).length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', background: '#F8FAFC', borderRadius: 20, border: `1px dashed ${C.border}` }}>
              <Eye size={40} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 800, color: C.muted }}>No Items Found</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Add items to "Snacks" or "Juice" category in the catalog first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );


  const renderOrderManagement = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'preparing', 'ready', 'completed'].map(s => (
            <button key={s} onClick={() => setOrderStatus(s === 'all' ? '' : s)} style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${orderStatus === (s === 'all' ? '' : s) ? C.primary : C.border}`,
              background: orderStatus === (s === 'all' ? '' : s) ? C.primary : '#fff', color: orderStatus === (s === 'all' ? '' : s) ? '#fff' : C.text,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize'
            }}>{s}</button>
          ))}
        </div>
        <Btn onClick={() => setOpModal(true)}><Plus size={16} /> Place New Order</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {orders.map(o => (
          <div key={o.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: '4px 8px', background: C.primary, color: '#fff', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>#{o.token_number}</div>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{o.student_name || 'Walk-in'}</span>
              </div>
              <StatusBadge statusKey={o.status} />
            </div>
            <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 12, marginBottom: 16 }}>
              {(o.items_detail || []).map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{i.quantity}x {i.name}</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(i.subtotal).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 800, color: C.primary, fontSize: 15 }}>
                <span>Total</span>
                <span>₹{Number(o.total_amount).toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {o.status === 'pending' && <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'preparing')} style={{ flex: 1 }}>Accept</Btn>}
              {o.status === 'preparing' && <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'ready')} style={{ flex: 1 }}>Ready</Btn>}
              {o.status === 'ready' && <Btn size="sm" variant="success" onClick={() => updateOrderStatus(o.id, 'completed')} style={{ flex: 1 }}>Complete</Btn>}
              {['pending', 'preparing'].includes(o.status) && <Btn size="sm" variant="ghost" onClick={() => updateOrderStatus(o.id, 'cancelled')} style={{ color: '#EF4444' }}>Reject</Btn>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard Icon={Coffee} label="Daily Summary" value={`₹${Number(paySummary?.total_earnings || 0).toLocaleString()}`} color="#10B981" sub={`Collected today (${fmtDate()})`} />
        <StatCard Icon={CreditCard} label="Online Payments" value={`₹${Number(paySummary?.online_total || 0).toLocaleString()}`} color="#6366F1" />
        <StatCard Icon={DollarSign} label="Cash Collection" value={`₹${Number(paySummary?.cash_total || 0).toLocaleString()}`} color="#F59E0B" />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
              {['Date', 'Order #', 'Customer', 'Method', 'Amount', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: C.muted }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '14px 20px', fontSize: 13 }}>{new Date(p.payment_date).toLocaleString()}</td>
                <td style={{ padding: '14px 20px', fontWeight: 700 }}>#{p.order_token}</td>
                <td style={{ padding: '14px 20px', fontSize: 14 }}>{p.customer_name}</td>
                <td style={{ padding: '14px 20px' }}><span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800, color: C.muted }}>{p.payment_method}</span></td>
                <td style={{ padding: '14px 20px', fontWeight: 800 }}>₹{Number(p.amount).toFixed(2)}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 99, background: p.is_refunded ? '#FEE2E2' : '#DCFCE7', color: p.is_refunded ? '#991B1B' : '#166534', fontSize: 12, fontWeight: 700 }}>
                    {p.is_refunded ? 'Refunded' : 'Paid'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {!p.is_refunded && <Btn size="sm" variant="ghost" onClick={() => togglePayStatus(p.id)} style={{ color: '#EF4444', fontSize: 11 }}>Refund</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {invItems.filter(i => Number(i.current_stock) <= Number(i.min_stock_level)).map(item => (
          <div key={item.id} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle color="#EA580C" />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9A3412' }}>Low Stock: {item.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#C2410C' }}>{item.current_stock} {item.unit} remaining</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <h5 style={{ margin: 0, fontWeight: 800 }}>Ingredient Inventory</h5>
          <Btn size="sm"><Plus size={16} /> Update Stock</Btn>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
              {['Ingredient', 'Category', 'Current Stock', 'Min Level', 'Last Updated'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: C.muted }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {invItems.map(i => (
              <tr key={i.id} style={{ borderBottom: `1px dashed ${C.border}` }}>
                <td style={{ padding: '14px 20px', fontWeight: 700 }}>{i.name}</td>
                <td style={{ padding: '14px 20px' }}>{i.category}</td>
                <td style={{ padding: '14px 20px', fontWeight: 800, color: Number(i.current_stock) <= Number(i.min_stock_level) ? '#EF4444' : C.accent }}>{i.current_stock} {i.unit}</td>
                <td style={{ padding: '14px 20px' }}>{i.min_stock_level} {i.unit}</td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: C.muted }}>{new Date(i.last_updated).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuppliers = () => (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
        <h5 style={{ margin: 0, fontWeight: 800 }}>Supplier Directory</h5>
        <Btn size="sm"><Plus size={16} /> Add Supplier</Btn>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
            {['Supplier Name', 'Contact Person', 'Phone', 'Category', 'Status'].map(h => <th key={h} style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: C.muted }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '14px 20px', fontWeight: 700 }}>{s.name}</td>
              <td style={{ padding: '14px 20px' }}>{s.contact_person}</td>
              <td style={{ padding: '14px 20px' }}>{s.phone}</td>
              <td style={{ padding: '14px 20px' }}>{s.category}</td>
              <td style={{ padding: '14px 20px' }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: s.is_active ? '#DCFCE7' : '#FEE2E2', color: s.is_active ? '#166534' : '#991B1B', fontSize: 11, fontWeight: 700 }}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFeedback = () => (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}` }}><h5 style={{ margin: 0, fontWeight: 800 }}>Customer Feedback & Reviews</h5></div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {complaints.map(c => (
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
                {c.status !== 'resolved' && <button style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reply to consumer</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', gap: 8 }}>
            {['weekly', 'monthly', 'daily'].map(p => (
               <button key={p} onClick={() => loadReports(p)} style={{
                  padding: '6px 16px', borderRadius: 10, border: `1px solid ${reports?.period === p ? C.primary : C.border}`,
                  background: reports?.period === p ? C.primary : '#fff', color: reports?.period === p ? '#fff' : C.muted,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize'
               }}>{p}</button>
            ))}
         </div>
         <Btn variant="outline"><FileText size={16} /> Export PDF Report</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
         <StatCard Icon={DollarSign} label="Period Revenue" value={`₹${Number(reports?.total_revenue || 0).toLocaleString()}`} color="#10B981" />
         <StatCard Icon={ShoppingBag} label="Total Orders" value={reports?.total_orders || 0} color="#3B82F6" />
         <StatCard Icon={TrendingUp} label="Avg Order Value" value={`₹${Number(reports?.avg_order_value || 0).toFixed(2)}`} color="#6366F1" />
         <StatCard Icon={AlertTriangle} label="Wastage Loss" value={`₹${Number(reports?.wastage_loss || 0).toLocaleString()}`} color="#EF4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 24 }}>
         <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
            <h4 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 800 }}>Daily Sales Breakdown</h4>
            <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                     <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                        {['Date', 'Orders', 'Revenue', 'Growth'].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: C.muted }}>{h}</th>)}
                     </tr>
                  </thead>
                  <tbody>
                     {(reports?.daily_sales || []).map((d, i, arr) => {
                        const prev = arr[i+1]?.revenue || 0;
                        const growth = prev ? ((d.revenue - prev) / prev * 100) : 0;
                        return (
                         <tr key={d.date} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{new Date(d.date).toLocaleDateString()}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13 }}>{d.orders}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800 }}>₹{Number(d.revenue).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px' }}>
                               {growth !== 0 && (
                                  <span style={{ fontSize: 11, fontWeight: 800, color: growth > 0 ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center', gap: 2 }}>
                                     {growth > 0 ? '\u25B4' : '\u25BE'} {Math.abs(growth).toFixed(1)}%
                                  </span>
                               )}
                            </td>
                         </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
               <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800 }}>Payment Distribution</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(reports?.payment_breakdown || []).map(p => (
                     <div key={p.payment_method}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, fontWeight: 700 }}>
                           <span style={{ textTransform: 'capitalize' }}>{p.payment_method}</span>
                           <span>₹{Number(p.total).toLocaleString()}</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                           <div style={{ height: '100%', width: `${(p.total / (reports?.total_revenue || 1)) * 100}%`, background: C.primary, borderRadius: 3 }} />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, padding: '24px' }}>
               <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800 }}>Top Category Performance</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(reports?.popular_items || []).slice(0, 3).map(item => (
                     <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <div style={{ width: 8, height: 8, borderRadius: 2, background: C.accent }} />
                           <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>{item.times_ordered} orders</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );

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
              {s === 'orders'    && renderOrderManagement()}
              {s === 'payments'  && renderPayments()}
              {s === 'inventory' && renderInventory()}
              {s === 'suppliers' && renderSuppliers()}
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
      <Modal open={opModal} onClose={() => setOpModal(false)} title="Create New Order" Icon={Plus} width="700px">
         <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div style={{ position: 'relative' }}>
                  <FInput label="Customer Search" placeholder="Student or Staff name..." value={opSearch} onChange={async e => {
                     setOpSearch(e.target.value);
                     if (e.target.value.length > 2) {
                        try {
                           const r = await canteenApi.searchStudents(e.target.value, { ignore_rls: true });
                           setOpStudents(r.data?.results || r.data || []);
                        } catch { setOpStudents([]); }
                     }
                  }} />
                  {opSearch.length > 2 && opStudents.length > 0 && (
                     <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, padding: 8, maxHeight: 200, overflowY: 'auto' }}>
                        {opStudents.map(s => (
                           <div key={s.id} onClick={() => { setOpSelected(s); setOpSearch(''); setOpStudents([]); }} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{s.full_name}</p>
                              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Class: {s.class_name} | ID: {s.student_id}</p>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {opSelected && (
                  <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#166534' }}>Currently Selecting for:</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#14532D' }}>{opSelected.full_name}</p>
                     </div>
                     <button onClick={() => setOpSelected(null)} style={{ background: '#DCFCE7', border: 'none', borderRadius: 8, color: '#166534', cursor: 'pointer', padding: 4, display: 'flex' }}><X size={16} /></button>
                  </div>
               )}

               <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                  <h6 style={{ margin: '0 0 12px', fontWeight: 800 }}>Select Food Items</h6>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                     {foodItems.filter(f => f.status === 'active').map(f => (
                        <div key={f.id} onClick={() => {
                           setOpItems(prev => {
                              const exists = prev.find(i => i.id === f.id);
                              if (exists) return prev.map(i => i.id === f.id ? { ...i, qty: i.qty + 1 } : i);
                              return [...prev, { id: f.id, name: f.name, price: Number(f.price), qty: 1 }];
                           });
                        }} style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', background: '#fff', textAlign: 'center', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.primary} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                           <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                           <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: C.accent }}>₹{Number(f.price).toFixed(0)}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
               <h6 style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: C.muted }}>Cart Details</h6>
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 300 }}>
                  {opItems.map(item => (
                     <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                           <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</p>
                           <p style={{ margin: 0, fontSize: 12, color: C.muted }}>₹{item.price} x {item.qty}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <button onClick={() => setOpItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>-</button>
                           <span style={{ fontSize: 14, fontWeight: 800, width: 20, textAlign: 'center' }}>{item.qty}</span>
                           <button onClick={() => setOpItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>+</button>
                        </div>
                     </div>
                  ))}
                  {opItems.length === 0 && <p style={{ textAlign: 'center', color: C.muted, marginTop: 40 }}>Cart is empty</p>}
               </div>
               <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                     <span style={{ fontWeight: 700, color: C.muted }}>Grand Total</span>
                     <span style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>₹{opItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0).toFixed(2)}</span>
                  </div>
                  <Btn onClick={async () => {
                     if (!opSelected) return alert('Please select a customer');
                     if (opItems.length === 0) return alert('Cart is empty');
                     try {
                        const payload = {
                           student: opSelected.id,
                           order_items: opItems.map(i => ({ food_item: i.id, quantity: i.qty, unit_price: i.price })),
                           total_amount: opItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0),
                           status: 'pending',
                           payment_status: 'paid'
                        };
                        await canteenApi.createOrder(payload);
                        alert('Order Placed Successfully');
                        setOpModal(false);
                        setOpItems([]);
                        setOpSelected(null);
                        loadOrders();
                     } catch { alert('Failed to place order'); }
                  }} style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 16 }}>Confirm Order</Btn>
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
    </div>
  );
};

export default CanteenModule;
