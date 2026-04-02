import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import styles from './StudentAdProfile.module.css';
import instance from '@/api/instance';

const StudentAdProfile = ({ studentId, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        const res = await instance.get(`/students/students/${studentId}/`);
        setStudent(res.data);
      } catch (err) {
        console.error('Error fetching student profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchStudent();
  }, [studentId]);

  if (loading) return <div className={styles.loading}>Loading student profile...</div>;
  if (!student) return <div className={styles.error}>Student not found.</div>;

  const photoPath = student.user?.profile?.photo;
  const displayAvatar = photoPath
    ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
    : 'https://i.pravatar.cc/150?img=47';

  return (
    <div className={styles.profileWrapper}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className={styles.studentInfoArea}>
          <img src={displayAvatar} alt={student.user?.first_name} className={styles.avatar} />
          <div className={styles.infoText}>
            <h2 className={styles.studentName}>{student.user?.first_name} {student.user?.last_name}</h2>
            <div className={styles.studentDetails}>
              <span>ID: {student.admission_number}</span>
              <span>•</span>
              <span>{student.section_name || 'No Section'}</span>
              <span>•</span>
              <span className={styles.badge}>{student.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'academics' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('academics')}
          >
            Academics
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'documents' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
        </div>
      </div>

      <div className={styles.contentBody}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Basic Info</h3>
              <div className={styles.infoGrid}>
                 <div className={styles.infoItem}><label>DOB:</label> <span>{student.user?.profile?.date_of_birth || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Gender:</label> <span>{student.user?.profile?.gender || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Blood:</label> <span>{student.user?.profile?.blood_group || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Phone:</label> <span>{student.user?.phone || 'N/A'}</span></div>
              </div>
            </div>
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Parent / Guardian</h3>
              <div className={styles.infoGrid}>
                 <div className={styles.infoItem}><label>Father:</label> <span>{student.user?.profile?.father_name || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Occupation:</label> <span>{student.user?.profile?.father_occupation || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Mother:</label> <span>{student.user?.profile?.mother_name || 'N/A'}</span></div>
                 <div className={styles.infoItem}><label>Occupation:</label> <span>{student.user?.profile?.mother_occupation || 'N/A'}</span></div>
              </div>
            </div>
            <div className={styles.contentCard}>
               <h3 className={styles.cardTitle}>Health & Address</h3>
               <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><label>Allergies:</label> <span>{student.user?.profile?.allergies || 'None'}</span></div>
                  <div className={styles.infoItem}><label>Notes:</label> <span>{student.user?.profile?.health_notes || 'None'}</span></div>
               </div>
               <div className={styles.divider}></div>
               <p className={styles.addressText}>{student.user?.profile?.address || 'No address provided'}</p>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={styles.documentGrid}>
            {student.documents?.length > 0 ? (
              student.documents.map(doc => {
                const isImage = doc.file.match(/\.(jpg|jpeg|png|gif)$/i);
                const docUrl = doc.file.startsWith('http') ? doc.file : `http://127.0.0.1:8000${doc.file}`;
                
                return (
                  <div key={doc.id} className={styles.docCard}>
                    {isImage ? (
                      <img src={docUrl} alt={doc.title} className={styles.docImg} />
                    ) : (
                      <div className={styles.docFileIcon}>PDF</div>
                    )}
                    <div className={styles.docDetails}>
                      <span className={styles.docTitle}>{doc.title || doc.document_type}</span>
                      <a href={docUrl} target="_blank" rel="noreferrer" className={styles.viewLink}>View File</a>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={styles.noDocs}>No documents uploaded yet.</p>
            )}
          </div>
        )}

        {(activeTab === 'attendance' || activeTab === 'academics') && (
          <div className={styles.contentCard}>
            <p>Work in progress for {activeTab}...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAdProfile;
