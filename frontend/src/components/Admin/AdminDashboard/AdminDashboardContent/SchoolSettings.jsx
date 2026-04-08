import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Palette, 
  Save, 
  Plus, 
  Trash2, 
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import styles from './SchoolSettings.module.css';

import schoolApi from '@/api/schoolApi';

const SchoolSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSchool, setActiveSchool] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);

  // Fetch school data
  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolRes = await schoolApi.getSchools();
      const yearsRes = await schoolApi.getAcademicYears();
      
      if (schoolRes.data && schoolRes.data.length > 0) {
        setActiveSchool(schoolRes.data[0]);
      }
      setAcademicYears(yearsRes.data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setActiveSchool(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!activeSchool) return;
    setSaving(true);
    try {
      await schoolApi.updateSchool(activeSchool.id, activeSchool);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading settings...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>School Settings</h1>
          <p className={styles.subtitle}>Manage your institution's identity, branding, and academic cycles.</p>
        </div>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className={styles.grid}>
        {/* Left Column: General Info & Branding */}
        <div className={styles.mainColumn}>
          
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Building2 size={20} className={styles.sectionIcon} />
              <h2>General Information</h2>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>School Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={activeSchool.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Schoolastica High School"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tagline</label>
                <input 
                  type="text" 
                  name="tagline" 
                  value={activeSchool.tagline} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Success in every step"
                />
              </div>
            </div>

            <div className={styles.formGroupFull}>
              <label>Address</label>
              <div className={styles.inputWithIcon}>
                <MapPin size={16} />
                <textarea 
                  name="address" 
                  value={activeSchool.address} 
                  onChange={handleInputChange} 
                  rows={2}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div className={styles.inputWithIcon}>
                  <Phone size={16} />
                  <input type="text" name="phone" value={activeSchool.phone} onChange={handleInputChange} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={16} />
                  <input type="email" name="email" value={activeSchool.email} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Website URL</label>
              <div className={styles.inputWithIcon}>
                <Globe size={16} />
                <input type="url" name="website" value={activeSchool.website} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Palette size={20} className={styles.sectionIcon} />
              <h2>Branding & Theme</h2>
            </div>

            <div className={styles.brandingGrid}>
              <div className={styles.logoUpload}>
                <label>Institutional Logo</label>
                <div className={styles.logoPreview}>
                  {activeSchool.logo ? (
                    <img src={activeSchool.logo} alt="Logo" />
                  ) : (
                    <div className={styles.logoPlaceholder}>
                      <ImageIcon size={32} />
                      <span>Upload Logo</span>
                    </div>
                  )}
                </div>
                <button className={styles.uploadBtn}>Change Logo</button>
              </div>

              <div className={styles.colorPickers}>
                <div className={styles.colorGroup}>
                  <label>Primary Color</label>
                  <div className={styles.colorInputWrapper}>
                    <input 
                      type="color" 
                      name="primary_color" 
                      value={activeSchool.primary_color} 
                      onChange={handleInputChange} 
                    />
                    <code>{activeSchool.primary_color}</code>
                  </div>
                  <p className={styles.colorHelp}>Used for buttons, headers, and active states.</p>
                </div>
                
                <div className={styles.colorGroup}>
                  <label>Secondary Color</label>
                  <div className={styles.colorInputWrapper}>
                    <input 
                      type="color" 
                      name="secondary_color" 
                      value={activeSchool.secondary_color} 
                      onChange={handleInputChange} 
                    />
                    <code>{activeSchool.secondary_color}</code>
                  </div>
                  <p className={styles.colorHelp}>Used for accents and secondary UI elements.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Academic Years */}
        <div className={styles.sideColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeader}>
                <Calendar size={20} className={styles.sectionIcon} />
                <h2>Academic Years</h2>
              </div>
              <button className={styles.addButton}>
                <Plus size={14} />
              </button>
            </div>

            <div className={styles.yearsList}>
              {academicYears.map(year => (
                <div key={year.id} className={`${styles.yearCard} ${year.is_active ? styles.activeYear : ''}`}>
                  <div className={styles.yearInfo}>
                    <span className={styles.yearName}>{year.name}</span>
                    <span className={styles.yearDates}>{year.start_date} — {year.end_date}</span>
                  </div>
                  <div className={styles.yearActions}>
                    {year.is_active && <span className={styles.activeBadge}>Current</span>}
                    <button className={styles.deleteIcon}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;
