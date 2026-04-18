import React, { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import schoolApi from '@/api/schoolApi';

const SchoolSettings = ({ styles }) => {
  const [loading, setLoading] = useState(false);
  const [activeSchool, setActiveSchool] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const res = await schoolApi.getSchools();
        if (res.data && res.data.length > 0) {
          setActiveSchool(res.data[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchSchool();
  }, []);

  const handleSave = async () => {
    if (!activeSchool) return;
    setLoading(true);
    setNotice(null);
    try {
      await schoolApi.updateSchool(activeSchool.id, activeSchool);
      setNotice({ type: 'success', message: 'School settings updated.' });
    } catch (error) {
      setNotice({ type: 'error', message: 'Failed to update school settings.' });
    } finally {
      setLoading(false);
    }
  };

  if (!activeSchool) return <div>Loading...</div>;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>School Identity</h2>
          <p className={styles.subtitle}>Manage global school configuration, branding, and contact details.</p>
        </div>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={loading}>
          <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {notice && (
        <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
          {notice.message}
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Building2 size={18} />
          <h3>Basic Configuration</h3>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>School Name</label>
            <input value={activeSchool.name || ''} onChange={e => setActiveSchool({...activeSchool, name: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Tagline / Motto</label>
            <input value={activeSchool.tagline || ''} onChange={e => setActiveSchool({...activeSchool, tagline: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Primary Email</label>
            <input type="email" value={activeSchool.email || ''} onChange={e => setActiveSchool({...activeSchool, email: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Phone Number</label>
            <input value={activeSchool.phone || ''} onChange={e => setActiveSchool({...activeSchool, phone: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Website URL</label>
            <input value={activeSchool.website || ''} onChange={e => setActiveSchool({...activeSchool, website: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Address</label>
            <textarea rows="3" value={activeSchool.address || ''} onChange={e => setActiveSchool({...activeSchool, address: e.target.value})} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Building2 size={18} />
          <h3>Branding & Theme</h3>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Primary Brand Color</label>
            <input type="color" value={activeSchool.primary_color || '#000000'} onChange={e => setActiveSchool({...activeSchool, primary_color: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Secondary Brand Color</label>
            <input type="color" value={activeSchool.secondary_color || '#ffffff'} onChange={e => setActiveSchool({...activeSchool, secondary_color: e.target.value})} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SchoolSettings;
