import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, MoreVertical, Eye, Edit3, Trash2 } from 'lucide-react';
import styles from './StudentList.module.css';
import instance from '@/api/instance';

const ITEMS_PER_PAGE = 5;

const getPerformanceScore = (student) => {
  const raw = student?.average_marks ?? student?.avg_marks ?? student?.performance_score ?? student?.marks_percentage;
  const score = Number(raw);
  return Number.isFinite(score) ? score : null;
};

const StudentList = ({ onAddClick, onViewProfile, onEditProfile, refreshKey = 0 }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedPerformance, setSelectedPerformance] = useState('all');
  const [selectedAlphabet, setSelectedAlphabet] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const collected = [];
        let nextUrl = '/students/students/';
        let firstCall = true;

        while (nextUrl) {
          const res = firstCall
            ? await instance.get(nextUrl)
            : await instance.get(nextUrl, { baseURL: '' });
          firstCall = false;

          const payload = res.data;
          if (Array.isArray(payload)) {
            collected.push(...payload);
            nextUrl = null;
          } else {
            const rows = Array.isArray(payload?.results) ? payload.results : [];
            collected.push(...rows);
            nextUrl = payload?.next || null;
          }
        }

        const studentData = collected;
        setStudents(studentData);
      } catch (err) {
        console.error('Error fetching students:', err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [refreshKey]);

  const classOptions = useMemo(() => {
    const set = new Set();
    students.forEach((student) => {
      const value = `${student.class_name || 'N/A'} - ${student.section_name || 'N/A'}`;
      set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim();
      const roll = String(student.admission_number || student.roll_number || student.id || '');
      const classValue = `${student.class_name || 'N/A'} - ${student.section_name || 'N/A'}`;
      const parentPhone = student.parent_phone || student.user?.phone || '';
      const performance = getPerformanceScore(student);
      const firstLetter = fullName ? fullName[0].toUpperCase() : '#';

      const matchesSearch = !search || (
        fullName.toLowerCase().includes(search)
        || roll.toLowerCase().includes(search)
        || classValue.toLowerCase().includes(search)
        || String(parentPhone).toLowerCase().includes(search)
      );
      const matchesClass = selectedClass === 'all' || classValue === selectedClass;
      const matchesAlphabet = selectedAlphabet === 'all' || firstLetter === selectedAlphabet;
      const matchesPerformance = selectedPerformance === 'all'
        || (selectedPerformance === 'high' && performance !== null && performance >= 75)
        || (selectedPerformance === 'medium' && performance !== null && performance >= 50 && performance < 75)
        || (selectedPerformance === 'low' && performance !== null && performance < 50)
        || (selectedPerformance === 'unknown' && performance === null);

      return matchesSearch && matchesClass && matchesAlphabet && matchesPerformance;
    });
  }, [students, searchTerm, selectedClass, selectedPerformance, selectedAlphabet]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, selectedPerformance, selectedAlphabet, students.length]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageStudents = filteredStudents.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const startEntry = filteredStudents.length === 0 ? 0 : pageStart + 1;
  const endEntry = Math.min(pageStart + ITEMS_PER_PAGE, filteredStudents.length);
  const visiblePages = useMemo(() => {
    const windowSize = 5;
    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [safePage, totalPages]);

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
              placeholder="Find a student by name, roll number, or parent..." 
              className={styles.searchInput} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.filterBtn} onClick={() => setShowFilters((prev) => !prev)}>
            <Filter size={16} /> Filter
          </button>
          <button className={styles.addBtn} onClick={onAddClick}>
            <Plus size={16} /> Register Student
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label>Class & Section</label>
              <select className={styles.selectInput} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="all">All Classes</option>
                {classOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterField}>
              <label>Performance</label>
              <select className={styles.selectInput} value={selectedPerformance} onChange={(e) => setSelectedPerformance(e.target.value)}>
                <option value="all">All</option>
                <option value="high">High (75+)</option>
                <option value="medium">Medium (50-74)</option>
                <option value="low">Low (&lt;50)</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label>Name Alphabet</label>
              <select className={styles.selectInput} value={selectedAlphabet} onChange={(e) => setSelectedAlphabet(e.target.value)}>
                <option value="all">All</option>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                  <option key={letter} value={letter}>{letter}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll / ID</th>
              <th>Class & Section</th>
              <th>Primary Contact</th>
              <th>Status</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>Loading students...</td></tr>
            ) : (!Array.isArray(pageStudents) || pageStudents.length === 0) ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>No students registered yet. Click "Register Student" to start.</td></tr>
            ) : pageStudents.map((student) => {
              const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`;
              const photoPath = student.user?.profile?.photo;
              const avatar = photoPath
                ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
                : `https://i.pravatar.cc/150?u=${student.id}`;
              
              return (
                <tr 
                  key={student.id} 
                  className={`${styles.tableRow} ${activeDropdown === student.id ? styles.tableRowActiveDropdown : ''}`}
                  onClick={() => onViewProfile(student.id)}
                  style={{ 
                    position: 'relative', 
                    zIndex: activeDropdown === student.id ? 100 : 1 
                  }}
                >
                  <td>
                    <div className={styles.studentNameCol}>
                      <img src={avatar} alt={fullName} className={styles.avatar} />
                      <span className={styles.studentName}>{fullName}</span>
                    </div>
                  </td>
                  <td className={styles.studentId}>{student.admission_number || student.id}</td>
                  <td className={styles.studentClass}>{student.class_name || 'N/A'}, {student.section_name || 'N/A'}</td>
                  <td>
                    <div className={styles.contactCol}>
                      <span className={styles.parentName}>{student.parent_name || 'N/A'}</span>
                      <span className={styles.contactNumber}>
                        {student.parent_phone || student.user?.phone || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${student.is_active ? styles.statusActive : styles.statusSuspended}`}>
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
                      >
                        <MoreVertical size={18} />
                      </button>
 
                    {activeDropdown === student.id && (
                      <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className={styles.dropdownItem} 
                          onClick={() => { setActiveDropdown(null); onViewProfile(student.id); }}
                        >
                          <Eye size={14} /> View full profile
                        </button>
                        <button 
                          className={styles.dropdownItem} 
                          onClick={() => { setActiveDropdown(null); onEditProfile(student.id); }}
                        >
                          <Edit3 size={14} /> Edit student data
                        </button>
                        <button 
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => { setActiveDropdown(null); if(confirm('Are you sure you want to remove this student?')) alert('Delete action triggered for ' + fullName); }}
                        >
                          <Trash2 size={14} /> Remove Student
                        </button>
                      </div>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className={styles.footer}>
        <span>Showing {startEntry}-{endEntry} of {filteredStudents.length} entries</span>
        <div className={styles.pageControls}>
          <button
            className={styles.pageBtn}
            disabled={safePage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          {visiblePages.map((page) => (
            <button
              key={page}
              className={`${styles.pageBtn} ${safePage === page ? styles.pageBtnActive : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
