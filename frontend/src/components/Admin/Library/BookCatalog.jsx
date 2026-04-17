'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Book as BookIcon,
  X
} from 'lucide-react';
import axios from '@/api/instance';

const BookCatalog = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    custom_id: '',
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    year: '',
    total_copies: 1,
    shelf: '',
    position: ''
  });
  const [shelves, setShelves] = useState([]);

  useEffect(() => {
    fetchBooks();
    fetchShelves();
  }, []);

  const fetchBooks = async (query = '') => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/library/books/?search=${query}`);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShelves = async () => {
    try {
      const response = await axios.get('/api/library/shelves/');
      setShelves(response.data);
    } catch (error) {
      console.error('Error fetching shelves:', error);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchBooks(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await axios.patch(`/api/library/books/${editingBook.id}/`, formData);
      } else {
        await axios.post('/api/library/books/', formData);
      }
      setShowAddModal(false);
      setEditingBook(null);
      setFormData({
        custom_id: '', title: '', author: '', isbn: '', category: '', 
        publisher: '', year: '', total_copies: 1, shelf: '', position: ''
      });
      fetchBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Failed to save book. Please check the data.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await axios.delete(`/api/library/books/${id}/`);
        fetchBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      custom_id: book.custom_id || '',
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: book.category || '',
      publisher: book.publisher || '',
      year: book.year || '',
      total_copies: book.total_copies,
      shelf: book.shelf || '',
      position: book.position || ''
    });
    setShowAddModal(true);
  };

  return (
    <div>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--theme-text-muted)' 
          }} />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
              backgroundColor: 'var(--theme-bg-subtle)',
              fontSize: '14px'
            }}
          />
        </div>
        <button 
          onClick={() => {
            setEditingBook(null);
            setFormData({
              custom_id: '', title: '', author: '', isbn: '', category: '', 
              publisher: '', year: '', total_copies: 1, shelf: '', position: ''
            });
            setShowAddModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--theme-primary)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          Add New Book
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>BOOK INFO</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>CATEGORY</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>ISBN</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>LOCATION</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px' }}>COPIES</th>
              <th style={{ padding: '16px', color: 'var(--theme-text-muted)', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>Loading books...</td></tr>
            ) : books.length > 0 ? books.map((book) => (
              <tr key={book.id} style={{ borderBottom: '1px solid var(--theme-border-subtle)', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: 'var(--theme-primary-light)', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--theme-primary)'
                    }}>
                      <BookIcon size={20} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: 'var(--theme-text)', fontSize: '14px' }}>{book.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>{book.author} • {book.publisher} ({book.year})</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--theme-bg-subtle)', 
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>{book.category || 'N/A'}</span>
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: 'var(--theme-text)' }}>{book.isbn || '---'}</td>
                <td style={{ padding: '16px', fontSize: '13px', color: 'var(--theme-text)' }}>
                  <div>{book.rack_name || 'No Rack'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>Shelf: {book.shelf_name || 'N/A'} {book.position ? `(${book.position})` : ''}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     <div style={{ fontSize: '13px', fontWeight: '600' }}>
                       {book.available_copies} / {book.total_copies}
                     </div>
                     <div style={{ 
                       width: '60px', 
                       height: '4px', 
                       backgroundColor: '#E5E7EB', 
                       borderRadius: '2px',
                       overflow: 'hidden' 
                     }}>
                       <div style={{ 
                         width: `${(book.available_copies / book.total_copies) * 100}%`, 
                         height: '100%', 
                         backgroundColor: book.available_copies > 0 ? '#10B981' : '#EF4444' 
                       }}></div>
                     </div>
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => openEditModal(book)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--theme-primary)' }} title="Edit"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(book.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#EF4444' }} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>No books match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--theme-bg-white, #FFFFFF)',
            width: '100%',
            maxWidth: '600px',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: 'var(--theme-shadow-xl)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Book Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Author *</label>
                <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Book ID (Optional)</label>
                <input type="text" value={formData.custom_id} onChange={e => setFormData({...formData, custom_id: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>ISBN</label>
                <input type="text" value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Category</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Publisher</label>
                <input type="text" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Year</label>
                <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Total Copies</label>
                <input type="number" value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: parseInt(e.target.value)})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Shelf Location</label>
                <select value={formData.shelf} onChange={e => setFormData({...formData, shelf: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }}>
                  <option value="">Select Shelf</option>
                  {shelves.map(shelf => (
                    <option key={shelf.id} value={shelf.id}>{shelf.rack_name} - {shelf.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--theme-text-muted)' }}>Position in Shelf</label>
                <input type="text" placeholder="e.g. A2, Left" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--theme-border, #D1D5DB)', backgroundColor: 'var(--theme-bg-white, #FFFFFF)', color: 'var(--theme-text, #111827)', fontSize: '14px' }} />
              </div>
              
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="submit"
                  style={{ flex: 1, backgroundColor: 'var(--theme-primary)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                >
                  {editingBook ? 'Update Book' : 'Add Book'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text)', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCatalog;
