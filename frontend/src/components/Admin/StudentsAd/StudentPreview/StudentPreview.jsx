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
  const displayAvatar = photoPath
    ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
    : `https://i.pravatar.cc/150?u=${student.id}`;

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
