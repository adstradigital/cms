'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  X,
  Save,
  Loader2,
  MapPin,
  ChevronDown,
  BookOpen,
  RefreshCw,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import axios from '@/api/instance';

/* ─────────────────────────── Modal rendered via Portal ─────────────────────────── */
function BookModal({ open, onClose, editingBook, shelves, onSaved }) {
  const categories = [
    'Fiction', 'Science', 'Mathematics', 'Literature',
    'History', 'Technology', 'Biography', 'Encyclopedia',
  ];

  const emptyForm = {
    title: '', author: '', isbn: '', category: '',
    publisher: '', edition: '', total_copies: 1, shelf: '', position: '',
  };

  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync form when opening
  useEffect(() => {
    if (open && editingBook) {
      setFormData({
        title: editingBook.title || '',
        author: editingBook.author || '',
        isbn: editingBook.isbn || '',
        category: editingBook.category || 'General',
        publisher: editingBook.publisher || '',
        edition: editingBook.edition || '',
        total_copies: editingBook.total_copies || 1,
        shelf: editingBook.shelf || '',
        position: editingBook.position || '',
      });
    } else if (open) {
      setFormData(emptyForm);
    }
  }, [editingBook, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBook) {
        await axios.patch(`/library/books/${editingBook.id}/`, formData);
      } else {
        await axios.post('/library/books/', formData);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving book:', err);
      alert('Failed to save book. Please check all required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData({ ...formData, [key]: e.target.value }),
    style: inputStyle,
  });

  if (!open) return null;

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        backgroundColor: 'var(--color-surface, #ffffff)', borderRadius: '16px',
        width: '640px', maxWidth: '95vw', maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px', borderBottom: '1px solid var(--theme-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, backgroundColor: 'var(--color-surface, #ffffff)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'var(--theme-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={18} color="white" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--theme-text)', margin: 0 }}>
              {editingBook ? 'Edit Book Details' : 'Add New Book to Library'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-bg)', border: 'none', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'var(--theme-text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Book Title <span style={{ color: '#EF4444' }}>*</span></label>
            <input required type="text" placeholder="Enter full book title" {...field('title')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Author Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input required type="text" placeholder="Author full name" {...field('author')} />
            </div>
            <div>
              <label style={labelStyle}>ISBN Number</label>
              <input type="text" placeholder="e.g. 978-3-16-148410-0" {...field('isbn')} />
            </div>
            <div>
              <label style={labelStyle}>Category / Genre</label>
              <select {...field('category')} style={inputStyle}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Edition</label>
              <input type="text" placeholder="e.g. 5th Edition" {...field('edition')} />
            </div>
            <div>
              <label style={labelStyle}>Publisher</label>
              <input type="text" placeholder="Publisher name" {...field('publisher')} />
            </div>
            <div>
              <label style={labelStyle}>Total Copies <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                required type="number" min="1"
                value={formData.total_copies}
                onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Shelf Location</label>
              <select
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                style={inputStyle}
              >
                <option value="">Choose Shelf</option>
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>{s.rack_name || s.name} – {s.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Position Detail</label>
              <input type="text" placeholder="e.g. Row 2, Slot A" {...field('position')} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--theme-border-subtle)' }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '10px 22px', borderRadius: '8px',
                border: '1px solid var(--theme-border-subtle, #E5E7EB)',
                backgroundColor: 'transparent', color: 'var(--theme-text, #111827)',
                cursor: 'pointer', fontWeight: '500', fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--theme-primary)', color: 'white',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : <><Save size={16} /> {editingBook ? 'Update Book' : 'Save Book'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!isMounted) return null;
  return createPortal(modal, document.body);
}

/* ─────────────────────────── Bulk Upload Modal ─────────────────────────── */
function BulkUploadModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/library/books/bulk-upload/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'book_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/library/books/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult({
        success: true,
        message: res.data.message,
        success_count: res.data.success_count,
        error_count: res.data.error_count,
        errors: res.data.errors || []
      });
      if (res.data.success_count > 0) onSaved();
    } catch (error) {
      console.error('Error uploading file:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || 'Failed to upload file. Please ensure it is a valid Excel file.'
      });
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        backgroundColor: 'var(--color-surface, #ffffff)', borderRadius: '16px',
        width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--theme-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, backgroundColor: 'var(--color-surface, #ffffff)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: '#4F46E5', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={18} color="white" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--theme-text)', margin: 0 }}>
              Bulk Book Upload
            </h3>
          </div>
          <button
            onClick={() => !uploading && onClose()}
            style={{
              background: 'var(--color-bg)', border: 'none', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'var(--theme-text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Step 1: Download */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-text)', marginBottom: '8px' }}>1. Download Template</h4>
            <p style={{ fontSize: '13px', color: 'var(--theme-text-muted)', marginBottom: '12px' }}>
              Use our Excel template to ensure your data is formatted correctly for import.
            </p>
            <button
              onClick={handleDownloadTemplate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px',
                border: '1px solid var(--theme-primary)', color: 'var(--theme-primary)',
                backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
              }}
            >
              <Download size={16} /> Download Excel Template
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--theme-border-subtle)', marginBottom: '24px' }} />

          {/* Step 2: Upload */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--theme-text)', marginBottom: '8px' }}>2. Upload Filled Template</h4>
            <form onSubmit={handleUpload}>
              <div style={{
                border: '2px dashed var(--theme-border-subtle)', borderRadius: '12px',
                padding: '30px 20px', textAlign: 'center', backgroundColor: 'var(--theme-bg-subtle)',
                marginBottom: '16px', position: 'relative',
              }}>
                <Upload size={32} style={{ color: 'var(--theme-text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', color: 'var(--theme-text)', marginBottom: '4px', fontWeight: '500' }}>
                  {file ? file.name : 'Click to select or drag & drop Excel file'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>Only .xlsx or .xls files supported</p>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={!file || uploading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    backgroundColor: 'var(--theme-primary)', color: 'white',
                    cursor: (file && !uploading) ? 'pointer' : 'not-allowed',
                    fontWeight: '600', fontSize: '14px', opacity: (file && !uploading) ? 1 : 0.6,
                  }}
                >
                  {uploading ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                  ) : (
                    <><Upload size={16} /> Start Upload</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Results section */}
          {result && (
            <div style={{
              marginTop: '24px', padding: '16px', borderRadius: '12px',
              backgroundColor: result.success ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${result.success ? '#BBF7D0' : '#FECACA'}`,
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {result.success ? <CheckCircle2 size={20} color="#16A34A" /> : <AlertCircle size={20} color="#DC2626" />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700', fontSize: '14px', color: result.success ? '#166534' : '#991B1B', marginBottom: '4px' }}>
                    {result.message}
                  </p>
                  {result.success && result.success_count !== undefined && (
                    <p style={{ fontSize: '13px', color: '#166534' }}>
                      Successfully imported: <strong>{result.success_count}</strong> records.
                      {result.error_count > 0 && <span> Failed: <strong style={{ color: '#DC2626' }}>{result.error_count}</strong></span>}
                    </p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div style={{ marginTop: '10px', maxHeight: '120px', overflowY: 'auto' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', marginBottom: '4px' }}>Errors encountered:</p>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#991B1B' }}>
                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!isMounted) return null;
  return createPortal(modal, document.body);
}

/* ─────────────────────────── Filter Dropdown ─────────────────────────── */
function FilterPanel({ filters, setFilters, categories, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
      backgroundColor: 'var(--theme-bg-white)',
      border: '1px solid var(--theme-border-subtle)',
      borderRadius: '12px', padding: '20px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
      zIndex: 500, width: '280px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontWeight: '700', color: 'var(--theme-text)', fontSize: '15px' }}>Filter Books</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            style={inputStyle}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Availability */}
        <div>
          <label style={labelStyle}>Availability</label>
          <select
            value={filters.availability}
            onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
            style={inputStyle}
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={() => { setFilters({ category: '', availability: '' }); onClose(); }}
          style={{
            padding: '9px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)',
            backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text-muted)',
            cursor: 'pointer', fontWeight: '500', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <RefreshCw size={14} /> Reset Filters
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Component ─────────────────────────── */
const BookManagement = () => {
  const categories = ['Fiction', 'Science', 'Mathematics', 'Literature', 'History', 'Technology', 'Biography', 'Encyclopedia'];

  const [books, setBooks]           = useState([]);
  const [shelves, setShelves]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters]       = useState({ category: '', availability: '' });
  const filterRef                   = useRef(null);

  useEffect(() => { fetchData(); }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksRes, shelvesRes] = await Promise.all([
        axios.get('/library/books/'),
        axios.get('/library/shelves/'),
      ]);
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : booksRes.data.results || []);
      setShelves(Array.isArray(shelvesRes.data) ? shelvesRes.data : shelvesRes.data.results || []);
    } catch (error) {
      console.error('Error fetching library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (book = null) => {
    console.log('Opening Modal. Editing:', !!book, book);
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await axios.delete(`/library/books/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };

  // Apply search + filters
  const filteredBooks = books.filter((book) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      book.title?.toLowerCase().includes(q) ||
      book.author?.toLowerCase().includes(q) ||
      book.isbn?.toLowerCase().includes(q);

    const matchesCategory =
      !filters.category || book.category === filters.category;

    const matchesAvailability =
      !filters.availability ||
      (filters.availability === 'available' ? book.available_copies > 0 : book.available_copies === 0);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const activeFilterCount = [filters.category, filters.availability].filter(Boolean).length;

  return (
    <>
      {/* spin keyframe injected once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Action Bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '620px', alignItems: 'center' }}>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={17}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--theme-text-muted)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder="Search by title, author or ISBN…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSearchTerm(searchInput); }}
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  borderRadius: '8px', border: '1px solid var(--theme-border-subtle)',
                  backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)',
                  fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={() => setSearchTerm(searchInput)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--theme-primary)', color: 'white',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <Search size={16} /> Search
            </button>

            {/* Filter Button */}
            <div style={{ position: 'relative' }} ref={filterRef}>
              <button
                onClick={() => setShowFilter((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', borderRadius: '8px',
                  border: `1px solid ${activeFilterCount > 0 ? 'var(--theme-primary)' : 'var(--theme-border-subtle)'}`,
                  backgroundColor: activeFilterCount > 0 ? 'var(--theme-primary-light)' : 'var(--theme-bg-white)',
                  color: activeFilterCount > 0 ? 'var(--theme-primary)' : 'var(--theme-text)',
                  cursor: 'pointer', fontWeight: '500', fontSize: '14px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Filter size={16} />
                Filter
                {activeFilterCount > 0 && (
                  <span style={{
                    backgroundColor: 'var(--theme-primary)', color: 'white',
                    borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                    padding: '1px 6px', lineHeight: '16px',
                  }}>
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown size={14} style={{ transform: showFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showFilter && (
                <FilterPanel
                  filters={filters}
                  setFilters={setFilters}
                  categories={categories}
                  onClose={() => setShowFilter(false)}
                />
              )}
            </div>
          </div>

          {/* Add New Book Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '8px',
                border: '1px solid var(--theme-border-subtle)',
                backgroundColor: 'var(--theme-bg-white)', color: 'var(--theme-text)',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <Upload size={18} /> Bulk Upload
            </button>
            <button
              onClick={() => handleOpenModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--theme-primary)', color: 'white',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={18} /> Add New Book
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>Active filters:</span>
            {filters.category && (
              <span style={chipStyle}>
                Category: <strong>{filters.category}</strong>
                <button onClick={() => setFilters({ ...filters, category: '' })} style={chipBtnStyle}><X size={12} /></button>
              </span>
            )}
            {filters.availability && (
              <span style={chipStyle}>
                Availability: <strong>{filters.availability === 'available' ? 'Available' : 'Out of Stock'}</strong>
                <button onClick={() => setFilters({ ...filters, availability: '' })} style={chipBtnStyle}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Book Table ── */}
        <div style={{
          backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px',
          border: '1px solid var(--theme-border-subtle)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--theme-bg-subtle)', borderBottom: '1px solid var(--theme-border-subtle)' }}>
                {['Book Details', 'ISBN & Edition', 'Shelf Location', 'Availability', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '14px 16px', fontSize: '13px', fontWeight: '700',
                    color: 'var(--theme-text)', textAlign: i === 4 ? 'right' : 'left',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', display: 'block' }} />
                    Loading books…
                  </td>
                </tr>
              ) : filteredBooks.length > 0 ? (
                filteredBooks.map((book, idx) => (
                  <tr
                    key={book.id}
                    style={{
                      borderBottom: '1px solid var(--theme-border-subtle)',
                      backgroundColor: idx % 2 === 1 ? 'rgba(0,0,0,0.01)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-bg-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 1 ? 'rgba(0,0,0,0.01)' : 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '40px', height: '52px', backgroundColor: 'var(--theme-primary-light)',
                          borderRadius: '6px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                        }}>📚</div>
                        <div>
                          <p style={{ fontWeight: '600', color: 'var(--theme-text)', marginBottom: '3px', fontSize: '14px' }}>{book.title}</p>
                          <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
                            {book.author} •{' '}
                            <span style={{ color: 'var(--theme-primary)', fontWeight: '500' }}>{book.category || 'Uncategorized'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', color: 'var(--theme-text)', marginBottom: '2px' }}>{book.isbn || '—'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{book.edition || 'Std. Edition'}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                        <MapPin size={13} />
                        <span>{book.rack_code || book.rack_number || 'N/A'} – {book.shelf_code || 'N/A'}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)', marginTop: '2px', marginLeft: '19px' }}>{book.publisher || 'Unknown'}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ width: '110px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                          <span style={{ color: book.available_copies > 0 ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                            {book.available_copies > 0 ? 'Available' : 'Out'}
                          </span>
                          <span style={{ color: 'var(--theme-text-muted)' }}>{book.available_copies}/{book.total_copies}</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: 'var(--theme-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${book.total_copies ? (book.available_copies / book.total_copies) * 100 : 0}%`,
                            backgroundColor: book.available_copies > 0 ? '#10B981' : '#EF4444',
                            borderRadius: '3px',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenModal(book)}
                          title="Edit"
                          style={{
                            padding: '7px', borderRadius: '7px', border: 'none',
                            backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          title="Delete"
                          style={{
                            padding: '7px', borderRadius: '7px', border: 'none',
                            backgroundColor: '#FEE2E2', color: '#DC2626',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
                    <BookOpen size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>No books found</p>
                    <p style={{ fontSize: '13px' }}>Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Result count */}
        {!loading && (
          <p style={{ fontSize: '13px', color: 'var(--theme-text-muted)', textAlign: 'right' }}>
            Showing <strong>{filteredBooks.length}</strong> of <strong>{books.length}</strong> books
          </p>
        )}
      </div>

      {/* ── Modal (Portal) ── */}
      <BookModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingBook={editingBook}
        shelves={shelves}
        onSaved={fetchData}
      />
      <BulkUploadModal
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSaved={fetchData}
      />
    </>
  );
};

/* ─────────────────────────── Shared micro-styles ─────────────────────────── */
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
  border: '1px solid var(--theme-border-subtle, #D1D5DB)',
  backgroundColor: 'var(--theme-bg-white, #FFFFFF)',
  color: 'var(--theme-text, #111827)',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle = {
  display: 'block', marginBottom: '6px', fontSize: '13px',
  fontWeight: '600', color: 'var(--theme-text, #111827)',
};

const chipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '4px 10px', borderRadius: '99px', fontSize: '12px',
  backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)',
  border: '1px solid var(--theme-primary)', fontWeight: '500',
};

const chipBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--theme-primary)', display: 'flex', alignItems: 'center', padding: 0,
};

export default BookManagement;
