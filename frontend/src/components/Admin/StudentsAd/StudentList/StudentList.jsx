import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, Eye, Edit3, Trash2 } from 'lucide-react';
import styles from './StudentList.module.css';
import instance from '@/api/instance';

const StudentList = ({ onAddClick, onViewProfile, onEditProfile, refreshKey = 0 }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await instance.get('/students/students/');
        // Handle both paginated and non-paginated responses
        const studentData = res.data.results || (Array.isArray(res.data) ? res.data : []);
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
              placeholder="Search by name or ID..." 
              className={styles.searchInput} 
            />
          </div>
          <button className={styles.filterBtn}>
            <Filter size={16} /> Filter
          </button>
          <button className={styles.addBtn} onClick={onAddClick}>
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>ID / Roll</th>
              <th>Class & Section</th>
              <th>Primary Contact</th>
              <th>Status</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>Loading students...</td></tr>
            ) : (!Array.isArray(students) || students.length === 0) ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>No students found.</td></tr>
            ) : students.map((student, idx) => {
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
                          <Edit3 size={14} /> Edit student
                        </button>
                        <button 
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => { setActiveDropdown(null); alert('Delete action triggered for ' + fullName); }}
                        >
                          <Trash2 size={14} /> Delete
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
        <span>Showing {students?.length || 0} entries</span>
        <div className={styles.pageControls}>
          <button className={styles.pageBtn}>Prev</button>
          <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
          <button className={styles.pageBtn}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
