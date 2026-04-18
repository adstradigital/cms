'use client';

import React, { useState, useMemo } from 'react';
import styles from './StudentLibrary.module.css';
import useFetch from '@/hooks/useFetch';
import { 
  Library, 
  Search, 
  Book as BookIcon, 
  MapPin, 
  Clock, 
  AlertCircle,
  Hash,
  ArrowRight,
  TrendingUp,
  Loader2,
  Bookmark,
  Star,
  Zap,
  Filter
} from 'lucide-react';

export default function StudentLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const bookLimit = 5; // Assuming a limit for the gauge

  // 1. Get Student Core Data
  const { data: dashboardData, loading: profileLoading } = useFetch('/students/students/dashboard-data/');
  const studentId = dashboardData?.profile?.id;

  // 2. Fetch All Books
  const { data: books, loading: booksLoading } = useFetch('/library/books/');

  // 3. Fetch My Issued Books
  const { data: myIssues, loading: issuesLoading } = useFetch(
    studentId ? `/library/issues/?student=${studentId}&status=issued` : null
  );

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (!searchQuery) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q)
    );
  }, [books, searchQuery]);

  const stats = useMemo(() => {
    const borrowed = myIssues?.length || 0;
    const overdue = myIssues?.filter(i => new Date(i.due_date) < new Date()).length || 0;
    const percentage = Math.min(Math.round((borrowed / bookLimit) * 100), 100);
    return { borrowed, overdue, percentage, totalBooks: books?.length || 0 };
  }, [myIssues, books]);

  const isLoading = profileLoading || booksLoading || issuesLoading;

  if (isLoading && !books) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className="animate-spin" color="#4f46e5" />
        <p>Syncing the central stack...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Intelligence Hub</h1>
          <p>Access 10,000+ academic resources and digital materials</p>
        </div>
      </header>

      {/* PREMIUM LIBRARY RIBBON */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
          {/* Borrowing Gauge */}
          <div className={styles.gaugeCol}>
            <div className={styles.circularGauge}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.gaugeBg} cx="50" cy="50" r="45" />
                <circle 
                  className={styles.gaugeFill} 
                  style={{ strokeDashoffset: 283 - (283 * stats.percentage) / 100, stroke: '#ec4899' }} 
                  cx="50" cy="50" r="45" 
                />
              </svg>
              <div className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>{stats.borrowed}/{bookLimit}</span>
                <span className={styles.gaugeLabel}>BORROWED</span>
              </div>
            </div>
          </div>

          <div className={styles.verticalDivider} />

          {/* Catalog Size */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
              <Library size={20} color="#94a3b8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.totalBooks}</span>
              <span className={styles.metricLabel}>Total Catalog Titles</span>
            </div>
          </div>

          {/* Due Books */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e1b4b' }}>
              <Clock size={20} color="#818cf8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.borrowed} Books</span>
              <span className={styles.metricLabel}>Currently with you</span>
            </div>
          </div>

          {/* Overdue */}
          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: stats.overdue > 0 ? '#450a0a' : '#1e293b' }}>
              <Zap size={20} color={stats.overdue > 0 ? '#f87171' : '#94a3b8'} />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.overdue} Items</span>
              <span className={styles.metricLabel}>Overdue for Return</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR (Unified Premium Design) */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search catalog by title, author, or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.contentDivider} />
        <div className={styles.filterGroup}>
           <Filter size={16} />
           <span>Advanced Filter</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.catalogSection}>
          <div className={styles.sectionHeader}>
             <h2><Bookmark size={20} /> Resources Catalog</h2>
             <span>{filteredBooks.length} available items</span>
          </div>

          {filteredBooks.length > 0 ? (
            <div className={styles.booksGrid}>
              {filteredBooks.map(book => (
                <div key={book.id} className={styles.bookCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.bookTypeIcon}>
                      <BookIcon size={18} />
                    </div>
                    <span className={`${styles.statusBadge} ${book.available_copies > 0 ? styles.available : styles.unavailable}`}>
                      {book.available_copies > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                    </span>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <h3 className={styles.bookTitle}>{book.title}</h3>
                    <p className={styles.author}>{book.author}</p>
                    <div className={styles.location}>
                      <MapPin size={12} />
                      <span>{book.rack_name || 'Rack A'} • {book.shelf_name || 'Shelf 1'}</span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.copiesInfo}>
                       <span className={styles.copiesCount}>{book.available_copies}</span>
                       <span className={styles.copiesTotal}>/ {book.total_copies} Left</span>
                    </div>
                    <button className={styles.detailsBtn}>Explore <ArrowRight size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Zap size={48} color="#e2e8f0" />
              <p>No matches found in the library stack.</p>
            </div>
          )}
        </div>

        <div className={styles.sidePanel}>
           {myIssues && myIssues.length > 0 && (
             <div className={styles.activePanel}>
                <div className={styles.panelHeader}>
                  <h3>Active Holdings</h3>
                  <Clock size={16} />
                </div>
                <div className={styles.holdingList}>
                   {myIssues.map(issue => (
                     <div key={issue.id} className={styles.holdingItem}>
                        <div className={styles.holdingInfo}>
                           <span className={styles.holdingTitle}>{issue.book_title}</span>
                           <span className={`${styles.dueDate} ${new Date(issue.due_date) < new Date() ? styles.overdueText : ''}`}>
                             Return by {new Date(issue.due_date).toLocaleDateString()}
                           </span>
                        </div>
                        {issue.fine_amount > 0 && <span className={styles.fineAmt}>₹{issue.fine_amount}</span>}
                     </div>
                   ))}
                </div>
             </div>
           )}

           <div className={styles.supportCard}>
              <div className={styles.supportIcon}><Star size={20} color="#ec4899" /></div>
              <h4>Reservation Service</h4>
              <p>Book a title ahead of time or request a digital copy from our inter-school stack.</p>
              <button className={styles.reserveBtn}>Open Marketplace</button>
           </div>
        </div>
      </div>
    </div>
  );
}
