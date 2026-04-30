import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Trash2, KeyRound, ShieldCheck, ShieldOff, RefreshCw, Copy, Check, X } from 'lucide-react';
import styles from './StudentAdProfile.module.css';
import instance from '@/api/instance';
import StudentFees from '@/components/Student/StudentFees/StudentFees';
import StudentAssignments from '@/components/Student/StudentAssignments/StudentAssignments';

const StudentAdProfile = ({ studentId, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalInfo, setPortalInfo] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copied, setCopied] = useState({});
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  
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

  // Fetch portal info when overview tab is active
  useEffect(() => {
    const fetchPortalInfo = async () => {
      try {
        setPortalLoading(true);
        const res = await instance.get(`/students/students/${studentId}/portal-info/`);
        setPortalInfo(res.data);
      } catch (err) {
        console.error('Portal info error:', err);
      } finally {
        setPortalLoading(false);
      }
    };
    if (studentId && activeTab === 'overview') fetchPortalInfo();
  }, [studentId, activeTab]);

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetResult(null);
      const res = await instance.post(`/students/students/${studentId}/reset-password/`);
      setResetResult(res.data);
    } catch (err) {
      alert('Failed to reset password.');
    }
  };

  const handleToggleAccess = async () => {
    if (!portalInfo) return;
    const action = portalInfo.is_active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} portal access for this student?`)) return;
    try {
      const res = await instance.post(`/students/students/${studentId}/toggle-access/`);
      setPortalInfo((p) => ({ ...p, is_active: res.data.is_active }));
    } catch (err) {
      alert('Failed to toggle access.');
    }
  };

  const handleUpdateUsername = async (newUname) => {
    try {
      setPortalLoading(true);
      const res = await instance.post(`/students/students/${studentId}/update-username/`, { new_username: newUname });
      setPortalInfo(prev => ({ ...prev, username: res.data.username }));
      setIsEditingUsername(false);
    } catch (err) {
      console.error('Error updating username:', err);
      if (err.response && err.response.data && err.response.data.error) {
         alert(err.response.data.error);
      } else {
         alert('Failed to update username. It might already exist.');
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading student profile...</div>;
  if (!student) return <div className={styles.error}>Student not found.</div>;

  const photoPath = student.user?.profile?.photo;
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  const displayAvatar = photoPath
    ? (photoPath.startsWith('http') ? photoPath : `http://127.0.0.1:8000${photoPath}`)
    : DEFAULT_AVATAR;

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
          <button 
            className={`${styles.tabBtn} ${activeTab === 'fees' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('fees')}
          >
            Fees
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'assignments' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
        </div>
      </div>

      <div className={styles.contentBody}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>

            {/* Portal Access Card */}
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={16} /> Portal Access
              </h3>
              {portalLoading ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--theme-text-muted)' }}>Loading...</p>
              ) : portalInfo ? (
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Username:</label>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Courier New', monospace", fontWeight: 600 }}>
                      {isEditingUsername ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            autoFocus
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-primary)', background: 'var(--theme-surface)', color: 'var(--theme-text)', width: '130px', outline: 'none' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newUsername.trim()) handleUpdateUsername(newUsername);
                              if (e.key === 'Escape') setIsEditingUsername(false);
                            }}
                          />
                          <button 
                            onClick={() => handleUpdateUsername(newUsername)}
                            disabled={portalLoading || !newUsername.trim()}
                            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setIsEditingUsername(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer', padding: '0 4px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span style={{ marginRight: '4px' }}>{portalInfo.username}</span>
                          <button
                             style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                             onClick={() => { setIsEditingUsername(true); setNewUsername(portalInfo.username); }}
                          >
                             Edit
                          </button>
                          <button
                            onClick={() => handleCopy(portalInfo.username, 'username')}
                            style={{ background: 'none', border: '1px solid var(--theme-border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: copied.username ? '#10b981' : 'var(--theme-text-muted)' }}
                            title="Copy"
                          >
                            {copied.username ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Status:</label>
                    <span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                      background: portalInfo.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: portalInfo.is_active ? '#10b981' : '#ef4444'
                    }}>
                      {portalInfo.is_active ? '● Active' : '● Disabled'}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Last Login:</label>
                    <span>{portalInfo.last_login ? new Date(portalInfo.last_login).toLocaleDateString('en-IN') : 'Never'}</span>
                  </div>
                  <div className={styles.infoItem} style={{ gridColumn: '1/-1', display: 'flex', gap: 8, paddingTop: 8 }}>
                    <button
                      onClick={handleResetPassword}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw size={13} /> Reset Password
                    </button>
                    <button
                      onClick={handleToggleAccess}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: portalInfo.is_active ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {portalInfo.is_active ? <><ShieldOff size={13} /> Deactivate</> : <><ShieldCheck size={13} /> Activate</>}
                    </button>
                  </div>
                  {resetResult && (
                    <div className={styles.infoItem} style={{ gridColumn: '1/-1', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 12, marginTop: 4 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                        ✓ New Password Generated
                      </div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {resetResult.new_password}
                        <button
                          onClick={() => handleCopy(resetResult.new_password, 'newPw')}
                          style={{ background: 'none', border: '1px solid var(--theme-border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: copied.newPw ? '#10b981' : 'var(--theme-text-muted)' }}
                        >
                          {copied.newPw ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--theme-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        Shown once only — copy and share securely.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--theme-text-muted)' }}>Unable to load portal info.</p>
              )}
            </div>

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

        {activeTab === 'fees' && (
          <div className={styles.contentCard} style={{ padding: 0, overflow: 'hidden' }}>
            <StudentFees providedStudentId={studentId} />
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className={styles.contentCard} style={{ padding: 0, overflow: 'hidden' }}>
            <StudentAssignments providedStudentId={studentId} providedSectionId={student.section} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAdProfile;
