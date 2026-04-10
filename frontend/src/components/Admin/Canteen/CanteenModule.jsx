'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  UtensilsCrossed, 
  ClipboardList, 
  MessageSquareWarning, 
  Boxes, 
  Truck, 
  Trash2, 
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  X
} from 'lucide-react';
import styles from '../Hostel/HostelModule.module.css';
import canteenApi from '@/api/canteenApi';

const pad2 = (value) => String(value).padStart(2, '0');

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'];
const FOOD_CATEGORIES = ['breakfast', 'lunch', 'snacks', 'dinner', 'juice', 'other'];
const INVENTORY_LOG_TYPES = ['in', 'out', 'wastage'];
const FEEDBACK_STATUSES = ['open', 'in_progress', 'resolved'];

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp size={16} /> },
  { id: 'menu', label: 'Daily Menu', icon: <Calendar size={16} /> },
  { id: 'price-chart', label: 'Price Chart', icon: <UtensilsCrossed size={16} /> },
  { id: 'inventory', label: 'Inventory', icon: <Boxes size={16} /> },
  { id: 'stock', label: 'Stock', icon: <ClipboardList size={16} /> },
  { id: 'suppliers', label: 'Suppliers', icon: <Truck size={16} /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquareWarning size={16} /> },
  { id: 'logs', label: 'Wastage & Consumption', icon: <BarChart3 size={16} /> },
];

const CanteenModule = ({ activeSegment }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => (SECTIONS.some((s) => s.id === activeSegment) ? activeSegment : 'overview'));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalType, setModalType] = useState(null);

  // Reference data for forms (so dropdowns work even when the active tab is different)
  const [foodItemOptions, setFoodItemOptions] = useState([]);
  const [inventoryItemOptions, setInventoryItemOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // Simple create forms
  const [menuForm, setMenuForm] = useState({ date: today(), meal_type: 'breakfast', items: [], special_note: '' });
  const [foodItemForm, setFoodItemForm] = useState({ name: '', category: 'other', price: '', is_veg: true, is_available: true, description: '' });
  const [inventoryForm, setInventoryForm] = useState({ name: '', category: '', unit: 'kg', current_stock: '', min_stock_level: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', category: '', is_active: true });
  const [feedbackForm, setFeedbackForm] = useState({ subject: '', description: '', rating: 5, status: 'open', resolution_note: '' });
  const [logKind, setLogKind] = useState('wastage');
  const [wastageForm, setWastageForm] = useState({ date: today(), meal_type: 'breakfast', item_name: '', quantity: '', unit: 'kg', reason: '', cost_loss: '' });
  const [consumptionForm, setConsumptionForm] = useState({ date: today(), meal_type: 'breakfast', total_servings: '', total_cost: '', average_rating: '' });
  const [stockLogForm, setStockLogForm] = useState({ item: '', log_type: 'in', quantity: '', supplier: '', reason: '' });

  // Sync tab with route segment (e.g. /admins/canteen/logs)
  useEffect(() => {
    if (SECTIONS.some((s) => s.id === activeSegment)) {
      setActiveTab(activeSegment);
    }
  }, [activeSegment]);

  const fetchTabDetails = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case 'overview':
          res = await canteenApi.getAnalytics();
          setAnalytics(res.data);
          break;
        case 'menu':
          res = await canteenApi.getDailyMenus();
          setData(res.data?.results || res.data || []);
          break;
        case 'price-chart':
          res = await canteenApi.getFoodItems();
          setData(res.data?.results || res.data || []);
          break;
        case 'inventory':
          res = await canteenApi.getInventoryItems();
          setData(res.data?.results || res.data || []);
          break;
        case 'stock':
          res = await canteenApi.getInventoryLogs();
          setData(res.data?.results || res.data || []);
          break;
        case 'suppliers':
          res = await canteenApi.getSuppliers();
          setData(res.data?.results || res.data || []);
          break;
        case 'feedback':
          res = await canteenApi.getComplaints();
          setData(res.data?.results || res.data || []);
          break;
        case 'logs':
          const [wastage, consumption] = await Promise.all([
            canteenApi.getWastageLogs(),
            canteenApi.getConsumptionLogs()
          ]);
          setData({ 
            wastage: wastage.data?.results || wastage.data || [], 
            consumption: consumption.data?.results || consumption.data || [] 
          });
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Failed to fetch canteen data', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTabDetails();
  }, [fetchTabDetails]);

  const closeModal = () => setModalType(null);

  const handleAddNew = async () => {
    try {
      if (activeTab === 'menu') {
        const itemsRes = await canteenApi.getFoodItems();
        setFoodItemOptions(itemsRes.data?.results || itemsRes.data || []);
        setMenuForm({ date: today(), meal_type: 'breakfast', items: [], special_note: '' });
        setModalType('menu');
        return;
      }

      if (activeTab === 'price-chart') {
        setFoodItemForm({ name: '', category: 'other', price: '', is_veg: true, is_available: true, description: '' });
        setModalType('price-chart');
        return;
      }

      if (activeTab === 'inventory') {
        setInventoryForm({ name: '', category: '', unit: 'kg', current_stock: '', min_stock_level: '' });
        setModalType('inventory');
        return;
      }

      if (activeTab === 'stock') {
        const [itemsRes, suppliersRes] = await Promise.all([
          canteenApi.getInventoryItems(),
          canteenApi.getSuppliers(),
        ]);
        setInventoryItemOptions(itemsRes.data?.results || itemsRes.data || []);
        setSupplierOptions(suppliersRes.data?.results || suppliersRes.data || []);
        setStockLogForm({ item: '', log_type: 'in', quantity: '', supplier: '', reason: '' });
        setModalType('stock');
        return;
      }

      if (activeTab === 'suppliers') {
        setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', category: '', is_active: true });
        setModalType('suppliers');
        return;
      }

      if (activeTab === 'feedback') {
        setFeedbackForm({ subject: '', description: '', rating: 5, status: 'open', resolution_note: '' });
        setModalType('feedback');
        return;
      }

      if (activeTab === 'logs') {
        setLogKind('wastage');
        setWastageForm({ date: today(), meal_type: 'breakfast', item_name: '', quantity: '', unit: 'kg', reason: '', cost_loss: '' });
        setConsumptionForm({ date: today(), meal_type: 'breakfast', total_servings: '', total_cost: '', average_rating: '' });
        setModalType('logs');
      }
    } catch (err) {
      console.error('Failed to open form modal', err);
      alert('Failed to open form. Please try again.');
    }
  };

  const parseAmount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const submitDailyMenu = async (event) => {
    event.preventDefault();

    if (!menuForm.items.length) {
      alert('Please select at least one menu item.');
      return;
    }

    setSubmitting(true);
    try {
      await canteenApi.createDailyMenu({
        date: menuForm.date,
        meal_type: menuForm.meal_type,
        items: menuForm.items.map((id) => Number(id)),
        special_note: menuForm.special_note || '',
      });
      alert('Daily menu saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save daily menu', err);
      alert('Failed to save daily menu.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFoodItem = async (event) => {
    event.preventDefault();

    if (!foodItemForm.name.trim()) {
      alert('Item name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await canteenApi.createFoodItem({
        name: foodItemForm.name.trim(),
        category: foodItemForm.category,
        price: parseAmount(foodItemForm.price),
        is_veg: Boolean(foodItemForm.is_veg),
        is_available: Boolean(foodItemForm.is_available),
        description: foodItemForm.description || '',
      });
      alert('Food item saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save food item', err);
      alert('Failed to save food item.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitInventoryItem = async (event) => {
    event.preventDefault();

    if (!inventoryForm.name.trim()) {
      alert('Inventory item name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await canteenApi.createInventoryItem({
        name: inventoryForm.name.trim(),
        category: inventoryForm.category || '',
        unit: inventoryForm.unit || 'kg',
        current_stock: parseAmount(inventoryForm.current_stock),
        min_stock_level: parseAmount(inventoryForm.min_stock_level),
      });
      alert('Inventory item saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save inventory item', err);
      alert('Failed to save inventory item.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSupplier = async (event) => {
    event.preventDefault();

    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      alert('Supplier name and phone are required.');
      return;
    }

    setSubmitting(true);
    try {
      await canteenApi.createSupplier({
        name: supplierForm.name.trim(),
        contact_person: supplierForm.contact_person || '',
        phone: supplierForm.phone,
        email: supplierForm.email || '',
        address: supplierForm.address || '',
        category: supplierForm.category || '',
        is_active: Boolean(supplierForm.is_active),
      });
      alert('Supplier saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save supplier', err);
      alert('Failed to save supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();

    if (!feedbackForm.subject.trim() || !feedbackForm.description.trim()) {
      alert('Subject and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      await canteenApi.createComplaint({
        subject: feedbackForm.subject.trim(),
        description: feedbackForm.description.trim(),
        rating: Math.max(1, Math.min(5, Math.floor(parseAmount(feedbackForm.rating) || 5))),
        status: feedbackForm.status,
        resolution_note: feedbackForm.resolution_note || '',
      });
      alert('Feedback saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save feedback', err);
      alert('Failed to save feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStockLog = async (event) => {
    event.preventDefault();

    if (!stockLogForm.item) {
      alert('Please select an inventory item.');
      return;
    }

    const quantity = parseAmount(stockLogForm.quantity);
    if (quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        item: Number(stockLogForm.item),
        log_type: stockLogForm.log_type,
        quantity,
        reason: stockLogForm.reason || '',
      };
      if (stockLogForm.supplier) payload.supplier = Number(stockLogForm.supplier);

      await canteenApi.createInventoryLog(payload);
      alert('Stock log saved.');
      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save stock log', err);
      alert('Failed to save stock log.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogs = async (event) => {
    event.preventDefault();

    if (logKind === 'wastage') {
      if (!wastageForm.item_name.trim()) {
        alert('Item name is required.');
        return;
      }

      const qty = parseAmount(wastageForm.quantity);
      if (qty <= 0) {
        alert('Quantity must be greater than 0.');
        return;
      }
    } else {
      const servings = Math.floor(parseAmount(consumptionForm.total_servings));
      if (servings <= 0) {
        alert('Total servings must be greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (logKind === 'wastage') {
        const qty = parseAmount(wastageForm.quantity);
        await canteenApi.createWastageLog({
          date: wastageForm.date,
          meal_type: wastageForm.meal_type,
          item_name: wastageForm.item_name.trim(),
          quantity: qty,
          unit: wastageForm.unit || 'kg',
          reason: wastageForm.reason || '',
          cost_loss: parseAmount(wastageForm.cost_loss),
        });
        alert('Wastage log saved.');
      } else {
        const servings = Math.floor(parseAmount(consumptionForm.total_servings));
        await canteenApi.createConsumptionLog({
          date: consumptionForm.date,
          meal_type: consumptionForm.meal_type,
          total_servings: servings,
          total_cost: parseAmount(consumptionForm.total_cost),
          average_rating: parseAmount(consumptionForm.average_rating),
        });
        alert('Consumption log saved.');
      }

      closeModal();
      fetchTabDetails();
    } catch (err) {
      console.error('Failed to save log', err);
      alert('Failed to save log.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderOverview = () => (
    <div className={styles.analyticsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Total Servings</span>
          <span className={styles.statValue}>{analytics?.total_servings || 0}</span>
        </div>
        <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
          <UtensilsCrossed size={24} />
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Total Revenue/Cost</span>
          <span className={styles.statValue}>₹{Number(analytics?.total_cost || 0).toLocaleString()}</span>
        </div>
        <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
          <TrendingUp size={24} />
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Avg Satisfaction</span>
          <span className={styles.statValue}>{Number(analytics?.average_rating || 0).toFixed(1)} / 5.0</span>
        </div>
        <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
          <MessageSquareWarning size={24} />
        </div>
      </div>
    </div>
  );

  const renderTable = (headers, rows, renderRow) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} className="text-center p-8"><Loader2 className="animate-spin mx-auto" /></td></tr>
          ) : safeRows.length > 0 ? (
            safeRows.map(renderRow)
          ) : (
            <tr><td colSpan={headers.length} className="text-center p-8 text-gray-500">No data found</td></tr>
          )}
        </tbody>
      </table>
    </div>
    );
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab.replace('-', ' ')}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className={styles.btnSecondary} onClick={fetchTabDetails}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className={styles.btnPrimary} onClick={handleAddNew} disabled={loading || submitting || activeTab === 'overview'}>
            <Plus size={16} />
            Add New
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`${styles.btnSecondary} ${activeTab === section.id ? styles.btnPrimary : ''}`}
            onClick={() => {
              setActiveTab(section.id);
              router.push(`/admins/canteen/${section.id}`);
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'overview' && renderOverview()}
        
        {activeTab === 'menu' && renderTable(
          ['Date', 'Meal Type', 'Items', 'Notes'],
          data,
          (row) => (
            <tr key={row.id}>
              <td>{new Date(row.date).toLocaleDateString()}</td>
              <td className="capitalize">{row.meal_type}</td>
              <td>{row.items_detail?.map(i => i.name).join(', ') || 'No items'}</td>
              <td>{row.special_note || '-'}</td>
            </tr>
          )
        )}

        {activeTab === 'price-chart' && renderTable(
          ['Item Name', 'Category', 'Price', 'Type', 'Status'],
          data,
          (row) => (
            <tr key={row.id}>
              <td className="font-bold">{row.name}</td>
              <td className="capitalize">{row.category}</td>
              <td>₹{row.price}</td>
              <td>
                <span className={`${styles.badge} ${row.is_veg ? styles.badgeSuccess : styles.badgeDanger}`}>
                  {row.is_veg ? 'Veg' : 'Non-Veg'}
                </span>
              </td>
              <td>{row.is_available ? 'Available' : 'Out of Stock'}</td>
            </tr>
          )
        )}

        {activeTab === 'inventory' && renderTable(
          ['Item', 'Category', 'Stock Level', 'Min Level', 'Status'],
          data,
          (row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.category}</td>
              <td>{row.current_stock} {row.unit}</td>
              <td>{row.min_stock_level} {row.unit}</td>
              <td>
                <span className={`${styles.badge} ${Number(row.current_stock) <= Number(row.min_stock_level) ? styles.badgeWarning : styles.badgeSuccess}`}>
                  {Number(row.current_stock) <= Number(row.min_stock_level) ? 'Low Stock' : 'Optimal'}
                </span>
              </td>
            </tr>
          )
        )}

        {activeTab === 'stock' && renderTable(
          ['Date', 'Type', 'Item', 'Quantity', 'Supplier', 'Reason', 'Recorded By'],
          data,
          (row) => (
            <tr key={row.id}>
              <td>{row.date ? new Date(row.date).toLocaleString() : '-'}</td>
              <td>
                <span className={`${styles.badge} ${row.log_type === 'in' ? styles.badgeSuccess : row.log_type === 'out' ? styles.badgeInfo : styles.badgeWarning}`}>
                  {row.log_type}
                </span>
              </td>
              <td>{row.item_name || row.item}</td>
              <td>{row.quantity}</td>
              <td>{row.supplier_name || '-'}</td>
              <td>{row.reason || '-'}</td>
              <td>{row.recorded_by_name || '-'}</td>
            </tr>
          )
        )}

        {activeTab === 'suppliers' && renderTable(
          ['Supplier Name', 'Contact', 'Category', 'Status'],
          data,
          (row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.phone} / {row.email}</td>
              <td>{row.category}</td>
              <td>{row.is_active ? 'Active' : 'Inactive'}</td>
            </tr>
          )
        )}

        {activeTab === 'feedback' && renderTable(
          ['Date', 'User', 'Subject', 'Rating', 'Status'],
          data,
          (row) => (
            <tr key={row.id}>
              <td>{new Date(row.date).toLocaleDateString()}</td>
              <td>{row.user_name}</td>
              <td>{row.subject}</td>
              <td>{'⭐'.repeat(row.rating)}</td>
              <td>
                <span className={`${styles.badge} ${row.status === 'resolved' ? styles.badgeSuccess : styles.badgeWarning}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          )
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            {renderTable(
              ['Date', 'Meal Type', 'Item', 'Qty', 'Unit', 'Cost Loss', 'Reason'],
              data?.wastage || [],
              (row) => (
                <tr key={row.id}>
                  <td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                  <td className="capitalize">{row.meal_type}</td>
                  <td>{row.item_name}</td>
                  <td>{row.quantity}</td>
                  <td>{row.unit || '-'}</td>
                  <td>₹{row.cost_loss || 0}</td>
                  <td>{row.reason || '-'}</td>
                </tr>
              )
            )}

            {renderTable(
              ['Date', 'Meal Type', 'Total Servings', 'Total Cost', 'Avg Rating'],
              data?.consumption || [],
              (row) => (
                <tr key={row.id}>
                  <td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                  <td className="capitalize">{row.meal_type}</td>
                  <td>{row.total_servings}</td>
                  <td>₹{row.total_cost || 0}</td>
                  <td>{Number(row.average_rating || 0).toFixed(1)}</td>
                </tr>
              )
            )}
          </div>
        )}
      </div>

      {modalType && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {modalType === 'menu' && 'Add Daily Menu'}
                {modalType === 'price-chart' && 'Add Food Item'}
                {modalType === 'inventory' && 'Add Inventory Item'}
                {modalType === 'stock' && 'Add Stock Entry'}
                {modalType === 'suppliers' && 'Add Supplier'}
                {modalType === 'feedback' && 'Add Feedback'}
                {modalType === 'logs' && 'Add Log'}
              </div>
              <button className={styles.modalClose} type="button" onClick={closeModal} disabled={submitting} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {modalType === 'menu' && (
              <form className={styles.modalForm} onSubmit={submitDailyMenu}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Date</label>
                    <input className={styles.formControl} type="date" value={menuForm.date} onChange={(e) => setMenuForm((prev) => ({ ...prev, date: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Meal Type</label>
                    <select className={styles.formControl} value={menuForm.meal_type} onChange={(e) => setMenuForm((prev) => ({ ...prev, meal_type: e.target.value }))}>
                      {MEAL_TYPES.map((meal) => (
                        <option key={meal} value={meal}>
                          {meal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Items</label>
                    <select
                      className={styles.formControl}
                      multiple
                      size={6}
                      value={menuForm.items.map(String)}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                        setMenuForm((prev) => ({ ...prev, items: selected }));
                      }}
                    >
                      {foodItemOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea className={styles.formControl} value={menuForm.special_note} onChange={(e) => setMenuForm((prev) => ({ ...prev, special_note: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'price-chart' && (
              <form className={styles.modalForm} onSubmit={submitFoodItem}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Name</label>
                    <input className={styles.formControl} value={foodItemForm.name} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select className={styles.formControl} value={foodItemForm.category} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {FOOD_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Price</label>
                    <input className={styles.formControl} type="number" min="0" step="0.01" value={foodItemForm.price} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, price: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select className={styles.formControl} value={foodItemForm.is_veg ? 'veg' : 'nonveg'} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, is_veg: e.target.value === 'veg' }))}>
                      <option value="veg">Veg</option>
                      <option value="nonveg">Non-Veg</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Availability</label>
                    <select className={styles.formControl} value={foodItemForm.is_available ? 'yes' : 'no'} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, is_available: e.target.value === 'yes' }))}>
                      <option value="yes">Available</option>
                      <option value="no">Out of Stock</option>
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea className={styles.formControl} value={foodItemForm.description} onChange={(e) => setFoodItemForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'inventory' && (
              <form className={styles.modalForm} onSubmit={submitInventoryItem}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Name</label>
                    <input className={styles.formControl} value={inventoryForm.name} onChange={(e) => setInventoryForm((prev) => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input className={styles.formControl} value={inventoryForm.category} onChange={(e) => setInventoryForm((prev) => ({ ...prev, category: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Unit</label>
                    <input className={styles.formControl} value={inventoryForm.unit} onChange={(e) => setInventoryForm((prev) => ({ ...prev, unit: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Current Stock</label>
                    <input className={styles.formControl} type="number" min="0" step="0.01" value={inventoryForm.current_stock} onChange={(e) => setInventoryForm((prev) => ({ ...prev, current_stock: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Min Stock Level</label>
                    <input className={styles.formControl} type="number" min="0" step="0.01" value={inventoryForm.min_stock_level} onChange={(e) => setInventoryForm((prev) => ({ ...prev, min_stock_level: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'suppliers' && (
              <form className={styles.modalForm} onSubmit={submitSupplier}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Name</label>
                    <input className={styles.formControl} value={supplierForm.name} onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Contact Person</label>
                    <input className={styles.formControl} value={supplierForm.contact_person} onChange={(e) => setSupplierForm((prev) => ({ ...prev, contact_person: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone</label>
                    <input className={styles.formControl} value={supplierForm.phone} onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input className={styles.formControl} type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Address</label>
                    <textarea className={styles.formControl} value={supplierForm.address} onChange={(e) => setSupplierForm((prev) => ({ ...prev, address: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input className={styles.formControl} value={supplierForm.category} onChange={(e) => setSupplierForm((prev) => ({ ...prev, category: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select className={styles.formControl} value={supplierForm.is_active ? 'active' : 'inactive'} onChange={(e) => setSupplierForm((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'stock' && (
              <form className={styles.modalForm} onSubmit={submitStockLog}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Item</label>
                    <select className={styles.formControl} value={stockLogForm.item} onChange={(e) => setStockLogForm((prev) => ({ ...prev, item: e.target.value }))} required>
                      <option value="">Select item</option>
                      {inventoryItemOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select className={styles.formControl} value={stockLogForm.log_type} onChange={(e) => setStockLogForm((prev) => ({ ...prev, log_type: e.target.value }))}>
                      {INVENTORY_LOG_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Quantity</label>
                    <input className={styles.formControl} type="number" min="0" step="0.01" value={stockLogForm.quantity} onChange={(e) => setStockLogForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Supplier (optional)</label>
                    <select className={styles.formControl} value={stockLogForm.supplier} onChange={(e) => setStockLogForm((prev) => ({ ...prev, supplier: e.target.value }))}>
                      <option value="">None</option>
                      {supplierOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Reason</label>
                    <input className={styles.formControl} value={stockLogForm.reason} onChange={(e) => setStockLogForm((prev) => ({ ...prev, reason: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'feedback' && (
              <form className={styles.modalForm} onSubmit={submitFeedback}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Subject</label>
                    <input className={styles.formControl} value={feedbackForm.subject} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, subject: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea className={styles.formControl} value={feedbackForm.description} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, description: e.target.value }))} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Rating (1-5)</label>
                    <input className={styles.formControl} type="number" min="1" max="5" step="1" value={feedbackForm.rating} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select className={styles.formControl} value={feedbackForm.status} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, status: e.target.value }))}>
                      {FEEDBACK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Resolution Note (optional)</label>
                    <textarea className={styles.formControl} value={feedbackForm.resolution_note} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, resolution_note: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {modalType === 'logs' && (
              <form className={styles.modalForm} onSubmit={submitLogs}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Log Type</label>
                    <select className={styles.formControl} value={logKind} onChange={(e) => setLogKind(e.target.value)}>
                      <option value="wastage">Wastage</option>
                      <option value="consumption">Consumption</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Date</label>
                    <input
                      className={styles.formControl}
                      type="date"
                      value={logKind === 'wastage' ? wastageForm.date : consumptionForm.date}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (logKind === 'wastage') setWastageForm((prev) => ({ ...prev, date: value }));
                        else setConsumptionForm((prev) => ({ ...prev, date: value }));
                      }}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Meal Type</label>
                    <select
                      className={styles.formControl}
                      value={logKind === 'wastage' ? wastageForm.meal_type : consumptionForm.meal_type}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (logKind === 'wastage') setWastageForm((prev) => ({ ...prev, meal_type: value }));
                        else setConsumptionForm((prev) => ({ ...prev, meal_type: value }));
                      }}
                    >
                      {MEAL_TYPES.map((meal) => (
                        <option key={meal} value={meal}>
                          {meal}
                        </option>
                      ))}
                    </select>
                  </div>

                  {logKind === 'wastage' ? (
                    <>
                      <div className={styles.formGroup}>
                        <label>Item</label>
                        <input className={styles.formControl} value={wastageForm.item_name} onChange={(e) => setWastageForm((prev) => ({ ...prev, item_name: e.target.value }))} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Quantity</label>
                        <input className={styles.formControl} type="number" min="0" step="0.01" value={wastageForm.quantity} onChange={(e) => setWastageForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Unit</label>
                        <input className={styles.formControl} value={wastageForm.unit} onChange={(e) => setWastageForm((prev) => ({ ...prev, unit: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Cost Loss</label>
                        <input className={styles.formControl} type="number" min="0" step="0.01" value={wastageForm.cost_loss} onChange={(e) => setWastageForm((prev) => ({ ...prev, cost_loss: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Reason</label>
                        <textarea className={styles.formControl} value={wastageForm.reason} onChange={(e) => setWastageForm((prev) => ({ ...prev, reason: e.target.value }))} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.formGroup}>
                        <label>Total Servings</label>
                        <input className={styles.formControl} type="number" min="0" step="1" value={consumptionForm.total_servings} onChange={(e) => setConsumptionForm((prev) => ({ ...prev, total_servings: e.target.value }))} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Total Cost</label>
                        <input className={styles.formControl} type="number" min="0" step="0.01" value={consumptionForm.total_cost} onChange={(e) => setConsumptionForm((prev) => ({ ...prev, total_cost: e.target.value }))} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Avg Rating</label>
                        <input className={styles.formControl} type="number" min="0" max="5" step="0.1" value={consumptionForm.average_rating} onChange={(e) => setConsumptionForm((prev) => ({ ...prev, average_rating: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnSecondary} type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CanteenModule;
