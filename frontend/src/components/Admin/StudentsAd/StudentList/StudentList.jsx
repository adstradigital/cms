import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, Plus, MoreVertical, Eye, Edit3, Trash2, X, ChevronDown } from 'lucide-react';
import styles from './StudentList.module.css';
import instance from '@/api/instance';

const PAGE_SIZE = 20;

const StudentList = ({ onAddClick, onViewProfile, onEditProfile, refreshKey = 0 }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);

  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('true'); // 'true' | 'false' | ''
  const filterRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  // Fetch classes & sections for filter dropdown
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [classRes, sectionRes] = await Promise.all([
          instance.get('/students/classes/'),
          instance.get('/students/sections/'),
        ]);
        setClasses(Array.isArray(classRes.data) ? classRes.data : classRes.data.results || []);
        setSections(Array.isArray(sectionRes.data) ? sectionRes.data : sectionRes.data.results || []);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchFilterOptions();
  }, []);

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPanel(false);
      }
    };
    if (showFilterPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: currentPage };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterClass) params.class = filterClass;
      if (filterSection) params.section = filterSection;
      if (filterStatus !== '') params.is_active = filterStatus;

      const res = await instance.get('/students/students/', { params });
      // Handle paginated response
      if (res.data && typeof res.data === 'object' && 'results' in res.data) {
        setStudents(res.data.results || []);
        setTotalCount(res.data.count || 0);
        setNextUrl(res.data.next);
        setPrevUrl(res.data.previous);
      } else {
        // Non-paginated fallback
        const data = Array.isArray(res.data) ? res.data : [];
        setStudents(data);
        setTotalCount(data.length);
        setNextUrl(null);
        setPrevUrl(null);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, filterClass, filterSection, filterStatus, refreshKey]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Close dropdown on outside click
  useEffect(() => {
    if (activeDropdown === null) return;
    const handleClick = () => setActiveDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeDropdown]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const handleClearFilters = () => {
    setFilterClass('');
    setFilterSection('');
    setFilterStatus('true');
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const hasActiveFilters = filterClass || filterSection || filterStatus !== 'true';

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  // Build page number buttons
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Filtered sections based on selected class
  const filteredSections = filterClass
    ? sections.filter((s) => String(s.school_class) === String(filterClass))
    : sections;

  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className={styles.listContainer}>

      {/* Table Header Controls */}
      <div className={styles.listHeader}>
        <h2 className={styles.headerTitle}>Student Directory</h2>

        <div className={styles.headerControls}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Find a student by name, roll nu..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search students"
            />
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={clearSearch}
                aria-label="Clear search"
                type="button"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className={styles.filterWrapper} ref={filterRef}>
            <button
              className={`${styles.filterBtn} ${hasActiveFilters ? styles.filterBtnActive : ''}`}
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              type="button"
            >
              <Filter size={16} /> Filter
              {hasActiveFilters && <span className={styles.filterDot} />}
            </button>

            {showFilterPanel && (
              <div className={styles.filterPanel}>
                <div className={styles.filterPanelHeader}>
                  <span className={styles.filterPanelTitle}>Filters</span>
                  <button
                    className={styles.filterPanelClose}
                    onClick={() => setShowFilterPanel(false)}
                    type="button"
                    aria-label="Close filter panel"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Class</label>
                  <div className={styles.selectWrap}>
                    <select
                      className={styles.filterSelect}
                      value={filterClass}
                      onChange={(e) => {
                        setFilterClass(e.target.value);
                        setFilterSection(''); // reset section when class changes
                      }}
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={styles.selectChevron} />
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Section</label>
                  <div className={styles.selectWrap}>
                    <select
                      className={styles.filterSelect}
                      value={filterSection}
                      onChange={(e) => setFilterSection(e.target.value)}
                    >
                      <option value="">All Sections</option>
                      {filteredSections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.class_name ? `${s.class_name} — ${s.name}` : s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={styles.selectChevron} />
                  </div>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Status</label>
                  <div className={styles.selectWrap}>
                    <select
                      className={styles.filterSelect}
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                      <option value="">All</option>
                    </select>
                    <ChevronDown size={14} className={styles.selectChevron} />
                  </div>
                </div>

                <div className={styles.filterActions}>
                  <button
                    className={styles.filterClearBtn}
                    onClick={handleClearFilters}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className={styles.filterApplyBtn}
                    onClick={handleApplyFilter}
                    type="button"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className={styles.addBtn} onClick={onAddClick}>
            <Plus size={16} /> Register Student
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll / ID</th>
              <th>Class &amp; Section</th>
              <th>Primary Contact</th>
              <th>Status</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className={styles.emptyState}>
                  <div className={styles.loadingSpinner} />
                  <span>Loading students...</span>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyState}>
                  {debouncedSearch || hasActiveFilters
                    ? 'No students match your search or filters.'
                    : 'No students registered yet. Click "Register Student" to start.'}
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim();
                const photoPath = student.user?.profile?.photo;
                const avatar = photoPath
                  ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
                  : `https://i.pravatar.cc/150?u=${student.id}`;

                return (
                  <tr
                    key={student.id}
                    className={`${styles.tableRow} ${activeDropdown === student.id ? styles.tableRowActiveDropdown : ''}`}
                    onClick={() => onViewProfile && onViewProfile(student.id)}
                    style={{
                      position: 'relative',
                      zIndex: activeDropdown === student.id ? 100 : 1,
                    }}
                  >
                    <td>
                      <div className={styles.studentNameCol}>
                        <img src={avatar} alt={fullName} className={styles.avatar} />
                        <span className={styles.studentName}>{fullName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className={styles.studentId}>{student.admission_number || student.id}</td>
                    <td className={styles.studentClass}>
                      {student.class_name || 'N/A'}, {student.section_name || 'N/A'}
                    </td>
                    <td>
                      <div className={styles.contactCol}>
                        <span className={styles.parentName}>{student.parent_name || 'N/A'}</span>
                        <span className={styles.contactNumber}>
                          {student.parent_phone || student.user?.phone || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${student.is_active ? styles.statusActive : styles.statusSuspended}`}
                      >
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={styles.tdRight}>
                      <div className={styles.actionBtnWrapper}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === student.id ? null : student.id);
                          }}
                          aria-label={`Actions for ${fullName}`}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeDropdown === student.id && (
                          <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.dropdownItem}
                              onClick={() => { setActiveDropdown(null); onViewProfile && onViewProfile(student.id); }}
                            >
                              <Eye size={14} /> View full profile
                            </button>
                            <button
                              className={styles.dropdownItem}
                              onClick={() => { setActiveDropdown(null); onEditProfile && onEditProfile(student.id); }}
                            >
                              <Edit3 size={14} /> Edit student data
                            </button>
                            <button
                              className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                              onClick={() => {
                                setActiveDropdown(null);
                                if (confirm('Are you sure you want to remove this student?')) {
                                  alert('Delete action triggered for ' + fullName);
                                }
                              }}
                            >
                              <Trash2 size={14} /> Remove Student
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={styles.footer}>
        <span className={styles.footerInfo}>
          {totalCount === 0
            ? 'No entries'
            : `Showing ${startEntry}–${endEntry} of ${totalCount} entries`}
        </span>
        {totalPages > 1 && (
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              type="button"
            >
              Prev
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                className={`${styles.pageBtn} ${page === currentPage ? styles.pageBtnActive : ''}`}
                onClick={() => handlePageClick(page)}
                type="button"
              >
                {page}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              type="button"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentList;
