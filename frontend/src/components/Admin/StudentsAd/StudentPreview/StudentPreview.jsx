import React, { useState, useEffect } from 'react';
import styles from './StudentPreview.module.css';
import instance from '@/api/instance';

const StudentPreview = ({ studentId, onViewFullProfile }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await instance.get(`/students/students/${studentId}/`);
        setStudent(res.data);
      } catch (err) {
        console.error('Error fetching student preview:', err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchStudent();
    else setStudent(null);
  }, [studentId]);

  if (!studentId) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.noSelection}>
          <p>Select a student to view quick details</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className={styles.previewContainer}><div className={styles.loading}>Loading...</div></div>;
  if (!student) return <div className={styles.previewContainer}><div className={styles.error}>Not found</div></div>;

  const photoPath = student.user?.profile?.photo;
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  const displayAvatar = photoPath
    ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
    : DEFAULT_AVATAR;

  return (
    <div className={styles.previewContainer}>
      <div className={styles.profileCard}>
        
        <div className={styles.previewBadge}>Quick Preview</div>

        <div className={styles.avatarContainer}>
          <img src={displayAvatar} alt="avatar" className={styles.avatarImg} />
        </div>

        <h2 className={styles.studentName}>{student.user?.first_name} {student.user?.last_name}</h2>
        <p className={styles.studentInfo}>ID: {student.admission_number}</p>
        <p className={styles.studentClass}>{student.grade_name}, {student.section_name}</p>

        <div className={styles.detailsList}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Parent:</span>
            <span className={styles.detailValue}>{student.parent_name || 'N/A'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Phone:</span>
            <span className={styles.detailValue}>{student.user?.phone || 'N/A'}</span>
          </div>
          <div className={styles.detailRowBordered}>
            <span className={styles.detailLabel}>Status:</span>
            <span className={student.is_active ? styles.detailValueGreen : styles.detailValueYellow}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <button className={styles.viewProfileBtn} onClick={onViewFullProfile}>
          View Full Profile
        </button>
      </div>
    </div>
  );
};

export default StudentPreview;
