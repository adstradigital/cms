'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Filter,
  CreditCard,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function StudentLibrary() {
  return (
    <Suspense fallback={<div className={styles.loader}><Loader2 size={40} className="animate-spin" /></div>}>
      <StudentLibraryContent />
    </Suspense>
  );
}

function StudentLibraryContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const bookLimit = 5;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tab control: catalog, holdings, help
  const activeTab = searchParams.get('view') || 'catalog';

  const setTab = (tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tab);
    router.push(`?${params.toString()}`);
  };

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
          
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'catalog' ? styles.tabActive : ''}`}
              onClick={() => setTab('catalog')}
            >
              Resources Catalog
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'holdings' ? styles.tabActive : ''}`}
              onClick={() => setTab('holdings')}
            >
              My Holdings
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'help' ? styles.tabActive : ''}`}
              onClick={() => setTab('help')}
            >
              Reservations & Help
            </button>
          </div>
        </div>
      </header>

      {/* PREMIUM LIBRARY RIBBON (Always visible for context) */}
      <section className={styles.achievementRibbon}>
        <div className={styles.achievementMain}>
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

          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e293b' }}>
              <Library size={20} color="#94a3b8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.totalBooks}</span>
              <span className={styles.metricLabel}>Total Catalog Titles</span>
            </div>
          </div>

          <div className={styles.metricCol}>
            <div className={styles.metricIconBox} style={{ backgroundColor: '#1e1b4b' }}>
              <Clock size={20} color="#818cf8" />
            </div>
            <div className={styles.metricText}>
              <span className={styles.metricValue}>{stats.borrowed} Books</span>
              <span className={styles.metricLabel}>Currently with you</span>
            </div>
          </div>

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

      <div className={styles.viewContainer}>
        {activeTab === 'catalog' && (
          <>
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
                      <BookCard key={book.id} book={book} />
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
                 <ReservationCard />
              </div>
            </div>
          </>
        )}

        {activeTab === 'holdings' && (
          <div className={styles.holdingsSection}>
            <div className={styles.sectionHeader}>
              <h2><Clock size={20} /> My Active Holdings</h2>
              <span>{myIssues?.length || 0} books currently issued</span>
            </div>
            
            {myIssues && myIssues.length > 0 ? (
              <div className={styles.holdingsGrid}>
                {myIssues.map(issue => (
                  <div key={issue.id} className={styles.bookCard}>
                    <div className={styles.cardBody}>
                      <h3 className={styles.bookTitle}>{issue.book_title}</h3>
                      <div className={styles.location}>
                        <Clock size={14} />
                        <span className={new Date(issue.due_date) < new Date() ? styles.overdueText : ''}>
                          Due on {new Date(issue.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      {issue.fine_amount > 0 && (
                        <div className={styles.fineAmt} style={{ marginTop: '8px', fontSize: '14px' }}>
                          Current Fine: ₹{issue.fine_amount}
                        </div>
                      )}
                    </div>
                    <div className={styles.cardFooter}>
                      <button className={styles.detailsBtn}>Renewal Request <ArrowRight size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <BookIcon size={48} color="#e2e8f0" />
                <p>You don't have any books issued at the moment.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'help' && (
          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <h2><HelpCircle size={20} /> Library Ecosystem & Services</h2>
            </div>
            
            <div className={styles.helpLayout}>
              <div className={styles.helpInfo}>
                <h3>Self-Service Portal</h3>
                <p style={{ color: '#64748b' }}>Access advanced library services to enhance your academic research and resource management.</p>
                
                <div className={styles.serviceList}>
                  <div className={styles.serviceItem}>
                    <div className={styles.serviceIcon}><Star size={18} /></div>
                    <div className={styles.serviceText}>
                      <h4>Reservation Service</h4>
                      <p>Hold a physical book from any campus library before it's gone.</p>
                    </div>
                  </div>
                  <div className={styles.serviceItem}>
                    <div className={styles.serviceIcon}><FileText size={18} /></div>
                    <div className={styles.serviceText}>
                      <h4>Digital Handouts</h4>
                      <p>Request scanned copies of specific chapters or reference materials.</p>
                    </div>
                  </div>
                  <div className={styles.serviceItem}>
                    <div className={styles.serviceIcon}><CreditCard size={18} /></div>
                    <div className={styles.serviceText}>
                      <h4>Fine Settlement</h4>
                      <p>View and clear pending late return charges via online payments.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.helpCard}>
                <ReservationCard />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookCard({ book }) {
  return (
    <div className={styles.bookCard}>
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
  );
}

function ReservationCard() {
  return (
    <div className={styles.supportCard}>
      <div className={styles.supportIcon}><Star size={20} color="#ec4899" /></div>
      <h4>Reservation Service</h4>
      <p>Book a title ahead of time or request a digital copy from our inter-school stack.</p>
      <button className={styles.reserveBtn}>Open Marketplace</button>
    </div>
  );
}

