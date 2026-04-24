'use client';

import { useState, useEffect, useRef } from 'react';
import staffApi from '@/api/staffApi';
import styles from './MaterialUpload.module.css';

export default function MaterialUpload() {
  const [allocations, setAllocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    section: '',
    subject: '',
    material_type: 'document',
    external_url: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [allocRes, matRes] = await Promise.all([
        staffApi.getAllocations(),
        staffApi.getMaterials()
      ]);
      setAllocations(allocRes.data);
      setMaterials(matRes.data);
    } catch (err) {
      setError('Failed to load data. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-select subject if section is changed and vice versa based on allocations
    if (name === 'section') {
      const firstAlloc = allocations.find(a => a.section === parseInt(value));
      if (firstAlloc) setFormData(prev => ({ ...prev, subject: firstAlloc.subject }));
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    if (selectedFile) {
      data.append('file', selectedFile);
    }

    try {
      await staffApi.createMaterial(data);
      // Reset form
      setFormData({
        title: '',
        description: '',
        section: '',
        subject: '',
        material_type: 'document',
        external_url: ''
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      const res = await staffApi.getMaterials();
      setMaterials(res.data);
      alert('Material uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await staffApi.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete material.');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Study Material Management</h2>
        <p>Upload and manage academic resources for your students</p>
      </header>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Title</label>
              <input
                className={styles.input}
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. Chapter 4 Lecture Notes"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Material Type</label>
              <div className={styles.typeCards}>
                {['document', 'video', 'link', 'other'].map(type => (
                  <div
                    key={type}
                    className={`${styles.typeCard} ${formData.material_type === type ? styles.typeCardActive : ''}`}
                    onClick={() => setFormData(p => ({ ...p, material_type: type }))}
                  >
                    <span>{type.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Target Section & Subject</label>
              <select
                className={styles.select}
                name="section"
                value={formData.section}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Section</option>
                {[...new Set(allocations.map(a => JSON.stringify({id: a.section, name: a.section_name})))].map(str => {
                  const s = JSON.parse(str);
                  return <option key={s.id} value={s.id}>{s.name}</option>;
                })}
              </select>
              <select
                className={styles.select}
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Subject</option>
                {allocations
                  .filter(a => !formData.section || a.section === parseInt(formData.section))
                  .map(a => (
                    <option key={a.subject} value={a.subject}>{a.subject_name}</option>
                  ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>External URL (Optional)</label>
              <input
                className={styles.input}
                name="external_url"
                value={formData.external_url}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
            <label>Description</label>
            <textarea
              className={styles.textarea}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Briefly describe what this material covers..."
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '2rem' }}>
            <label>Upload File</label>
            <div 
              className={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.uploadIcon}>📁</div>
              <p>{selectedFile ? selectedFile.name : 'Click to select or drag and drop files here'}</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Publish Material'}
          </button>
        </form>
      </div>

      <section style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Recently Published</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {materials.map(material => (
            <div key={material.id} className={styles.card} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{material.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: '0.2rem 0' }}>
                    {material.subject_name} • {material.section_name}
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(material.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
              {material.file && (
                <a href={material.file} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: '0.9rem', display: 'block', marginTop: '1rem' }}>
                  View File
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
