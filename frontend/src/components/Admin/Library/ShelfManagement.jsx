'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Box, 
  Database, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ArrowRightLeft,
  Info,
  Layers,
  Save,
  Loader2,
  X
} from 'lucide-react';
import axios from '@/api/instance';

const ShelfManagement = () => {
  const [shelves, setShelves] = useState([]);
  const [racks, setRacks] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' or 'assignment'
  
  // Modals
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shelvesRes, racksRes, booksRes] = await Promise.all([
        axios.get('/library/shelves/'),
        axios.get('/library/racks/'),
        axios.get('/library/books/')
      ]);
      setShelves(Array.isArray(shelvesRes.data) ? shelvesRes.data : shelvesRes.data.results || []);
      setRacks(Array.isArray(racksRes.data) ? racksRes.data : racksRes.data.results || []);
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : booksRes.data.results || []);
    } catch (error) {
      console.error('Error fetching shelf data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [shelfForm, setShelfForm] = useState({
    rack: '',
    code: '',
    name: '',
    description: '',
  });

  const [assignForm, setAssignForm] = useState({
    book_id: '',
    shelf_id: '',
    total_copies: 0,
  });

  const handleOpenShelfModal = (shelf = null) => {
    if (shelf) {
      setEditingShelf(shelf);
      setShelfForm({
        rack: shelf.rack,
        code: shelf.code,
        name: shelf.name,
        description: shelf.description || '',
      });
    } else {
      setEditingShelf(null);
      setShelfForm({
        rack: racks.length > 0 ? racks[0].id : '',
        code: '',
        name: '',
        description: '',
      });
    }
    setIsShelfModalOpen(true);
  };

  const handleShelfSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingShelf) {
        await axios.patch(`/library/shelves/${editingShelf.id}/`, shelfForm);
      } else {
        await axios.post('/library/shelves/', shelfForm);
      }
      setIsShelfModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Failed to save shelf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Patch the book with new shelf and quantity
      await axios.patch(`/library/books/${assignForm.book_id}/`, {
        shelf: assignForm.shelf_id,
        total_copies: assignForm.total_copies
      });
      setIsAssignModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Failed to assign book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectBookForAssignment = (book) => {
    setAssignForm({
      book_id: book.id,
      shelf_id: book.shelf || '',
      total_copies: book.total_copies
    });
    setIsAssignModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setActiveSubTab('list')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'list' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'list' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Shelves List
        </button>
        <button 
          onClick={() => setActiveSubTab('assignment')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: activeSubTab === 'assignment' ? 'var(--theme-primary)' : 'var(--theme-bg-subtle)',
            color: activeSubTab === 'assignment' ? 'white' : 'var(--theme-text)',
            fontWeight: '600'
          }}
        >
          Assign Books to Shelves
        </button>
      </div>

      {activeSubTab === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-text)' }}>Active Shelves & Sections</h2>
            <button 
              onClick={() => handleOpenShelfModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px',
                border: 'none', backgroundColor: 'var(--theme-primary)', color: 'white', cursor: 'pointer', fontWeight: '600'
              }}
            >
              <Plus size={18} /> Add New Shelf
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {loading ? (
              <p style={{ color: 'var(--theme-text-muted)' }}>Loading shelves...</p>
            ) : shelves.map(shelf => (
              <div key={shelf.id} style={{
                backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', padding: '20px',
                border: '1px solid var(--theme-border-subtle)', boxShadow: 'var(--theme-shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ color: 'var(--theme-primary)', backgroundColor: 'var(--theme-primary-light)', padding: '8px', borderRadius: '8px' }}>
                    <Layers size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleOpenShelfModal(shelf)} style={{ background: 'none', border: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                    <button style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--theme-text)', marginBottom: '4px' }}>{shelf.code}</h3>
                <p style={{ fontSize: '14px', color: 'var(--theme-primary)', fontWeight: '600', marginBottom: '8px' }}>{shelf.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-muted)', marginBottom: '16px' }}>{shelf.description || 'No description provided for this section.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--theme-border-subtle)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>Located in: <strong>{shelf.rack_name}</strong></span>
                  <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)' }}>
                    {books.filter(b => b.shelf === shelf.id).length} Books
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '12px', border: '1px solid var(--theme-border-subtle)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--theme-bg-subtle)', borderBottom: '1px solid var(--theme-border-subtle)' }}>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Book Title</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Current Shelf</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>Quantity</th>
                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)', textAlign: 'right' }}>Assignment</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)' }}>
                  <td style={{ padding: '16px' }}>
                    <p style={{ fontWeight: '600', color: 'var(--theme-text)' }}>{book.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{book.author}</p>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {book.shelf_name ? (
                      <span style={{ color: 'var(--theme-primary)', fontWeight: '500' }}>{book.rack_code}-{book.shelf_code}</span>
                    ) : (
                      <span style={{ color: '#DC2626', fontSize: '12px' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--theme-text)' }}>{book.total_copies} Copies</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleSelectBookForAssignment(book)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto',
                        padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--theme-primary)',
                        backgroundColor: 'transparent', color: 'var(--theme-primary)', cursor: 'pointer', fontWeight: '600'
                      }}
                    >
                      <ArrowRightLeft size={16} /> Re-assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shelf Modal */}
      {isShelfModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '16px', width: '500px', maxWidth: '90%', boxShadow: 'var(--theme-shadow-lg)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--theme-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{editingShelf ? 'Edit Shelf' : 'Add New Shelf'}</h3>
              <button onClick={() => setIsShelfModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleShelfSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Parent Rack</label>
                <select 
                  required value={shelfForm.rack} onChange={e => setShelfForm({...shelfForm, rack: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
                >
                  <option value="">Select Rack</option>
                  {racks.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Shelf ID (Code)</label>
                <input 
                  required type="text" value={shelfForm.code} onChange={e => setShelfForm({...shelfForm, code: e.target.value})}
                  placeholder="e.g. S-101 or R1-A"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Section Name</label>
                <input 
                  required type="text" value={shelfForm.name} onChange={e => setShelfForm({...shelfForm, name: e.target.value})}
                  placeholder="e.g. Science, Literature..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Description (Optional)</label>
                <textarea 
                  value={shelfForm.description} onChange={e => setShelfForm({...shelfForm, description: e.target.value})}
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsShelfModalOpen(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--theme-primary)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Shelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ backgroundColor: 'var(--theme-bg-white)', borderRadius: '16px', width: '450px', maxWidth: '90%', boxShadow: 'var(--theme-shadow-lg)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--theme-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Assign to Shelf</h3>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAssignSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Select Shelf</label>
                <select 
                  required value={assignForm.shelf_id} onChange={e => setAssignForm({...assignForm, shelf_id: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
                >
                  <option value="">Choose a Shelf</option>
                  {shelves.map(s => <option key={s.id} value={s.id}>{s.rack_name} - {s.code} ({s.name})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Update Quantity</label>
                <input 
                  required type="number" min="1" value={assignForm.total_copies} onChange={e => setAssignForm({...assignForm, total_copies: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--theme-primary)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelfManagement;
