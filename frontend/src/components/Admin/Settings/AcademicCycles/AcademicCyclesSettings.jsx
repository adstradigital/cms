import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import schoolApi from '@/api/schoolApi';

const AcademicCyclesSettings = ({ styles }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [notice, setNotice] = useState(null);

  // Modal States
  const [yearModal, setYearModal] = useState({ isOpen: false, name: '', start_date: '', end_date: '', is_active: false });
  const [termModal, setTermModal] = useState({ isOpen: false, academic_year: null, name: '', start_date: '', end_date: '', is_active: false });

  const fetchYears = async () => {
    try {
      const res = await schoolApi.getAcademicYears();
      setAcademicYears(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleSaveYear = async (e) => {
    e.preventDefault();
    try {
      await schoolApi.createAcademicYear({
        school: 1, // assumes single-tenant active school for now
        name: yearModal.name, 
        start_date: yearModal.start_date, 
        end_date: yearModal.end_date, 
        is_active: yearModal.is_active, 
        working_days: [1,2,3,4,5]
      });
      setNotice({ type: 'success', message: 'Academic Year added.' });
      setYearModal({ isOpen: false, name: '', start_date: '', end_date: '', is_active: false });
      fetchYears();
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to add Academic Year.' });
    }
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    try {
      await schoolApi.createTerm({
        academic_year: termModal.academic_year,
        name: termModal.name, 
        start_date: termModal.start_date, 
        end_date: termModal.end_date, 
        is_active: termModal.is_active
      });
      setNotice({ type: 'success', message: 'Term added.' });
      setTermModal({ isOpen: false, academic_year: null, name: '', start_date: '', end_date: '', is_active: false });
      fetchYears();
    } catch (e) {
      setNotice({ type: 'error', message: 'Failed to add Term.' });
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Academic Cycles</h2>
          <p className={styles.subtitle}>Configure academic years and underlying terms/semesters.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setYearModal({ ...yearModal, isOpen: true })}>
          <Plus size={16} /> Add Academic Year
        </button>
      </div>

      {notice && (
        <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
          {notice.message}
        </div>
      )}

      {academicYears.map(year => (
        <section key={year.id} className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{year.name}</h3>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{year.start_date} to {year.end_date}</span>
            </div>
            {year.is_active && <span style={{ background: '#00a676', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700' }}>CURRENT</span>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', color: '#94a3b8' }}>Terms / Semesters</h4>
              <button 
                onClick={() => setTermModal({ ...termModal, isOpen: true, academic_year: year.id })}
                style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={12} /> Add Term
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {year.terms?.length > 0 ? year.terms.map(term => (
                <div key={term.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{term.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{term.start_date} to {term.end_date}</div>
                  </div>
                  {term.is_active && <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>ACTIVE</span>}
                </div>
              )) : (
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>No terms configured yet.</div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* Custom Year Modal */}
      {yearModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Create Academic Year</h3>
            <form onSubmit={handleSaveYear}>
              <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                <label>Year Name (e.g. 2024-25)</label>
                <input required value={yearModal.name} onChange={e => setYearModal({...yearModal, name: e.target.value})} />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input type="date" required value={yearModal.start_date} onChange={e => setYearModal({...yearModal, start_date: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" required value={yearModal.end_date} onChange={e => setYearModal({...yearModal, end_date: e.target.value})} />
                </div>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="activeYear" checked={yearModal.is_active} onChange={e => setYearModal({...yearModal, is_active: e.target.checked})} />
                <label htmlFor="activeYear">Set as Current Academic Year</label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={() => setYearModal({...yearModal, isOpen: false})}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Year</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Term Modal */}
      {termModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Create Term / Semester</h3>
            <form onSubmit={handleSaveTerm}>
              <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                <label>Term Name (e.g. Term 1, Fall Semester)</label>
                <input required value={termModal.name} onChange={e => setTermModal({...termModal, name: e.target.value})} />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input type="date" required value={termModal.start_date} onChange={e => setTermModal({...termModal, start_date: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" required value={termModal.end_date} onChange={e => setTermModal({...termModal, end_date: e.target.value})} />
                </div>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="activeTerm" checked={termModal.is_active} onChange={e => setTermModal({...termModal, is_active: e.target.checked})} />
                <label htmlFor="activeTerm">Set as Active Term</label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={() => setTermModal({...termModal, isOpen: false})}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Term</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicCyclesSettings;
