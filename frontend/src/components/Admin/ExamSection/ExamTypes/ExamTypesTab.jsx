"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, FileText, MonitorPlay, Loader2, X } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './ExamTypes.module.css';

export default function ExamTypesTab() {
  const [examTypes, setExamTypes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    weightage_percentage: 100,
    passing_percentage: 35,
    max_theory_marks: 80,
    max_internal_marks: 20,
    is_online: false,
    academic_year: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, yearsRes] = await Promise.all([
        adminApi.getExamTypes(),
        adminApi.getAcademicYears()
      ]);
      setExamTypes(typesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      if (yearsRes.data?.length > 0 && !formData.academic_year) {
        setFormData(prev => ({ ...prev, academic_year: yearsRes.data.find(y => y.is_active)?.id || yearsRes.data[0].id }));
      }
    } catch (error) {
      console.error("Error fetching exam data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await adminApi.updateExamType(editingId, formData);
      } else {
        await adminApi.createExamType(formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchData();
      setFormData({
        name: '',
        weightage_percentage: 100,
        passing_percentage: 35,
        max_theory_marks: 80,
        max_internal_marks: 20,
        is_online: false,
        academic_year: formData.academic_year
      });
    } catch (error) {
      alert(`Error ${editingId ? 'updating' : 'creating'} exam type: ` + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (et) => {
    setFormData({
      name: et.name,
      weightage_percentage: et.weightage_percentage,
      passing_percentage: et.passing_percentage,
      max_theory_marks: et.max_theory_marks,
      max_internal_marks: et.max_internal_marks,
      is_online: et.is_online,
      academic_year: et.academic_year
    });
    setEditingId(et.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exam type?")) return;
    try {
      await adminApi.deleteExamType(id);
      fetchData();
    } catch (error) {
      alert("Error deleting exam type");
    }
  };

  if (loading && examTypes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Left Column: Academic Year & Terms */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <Calendar size={18} />
              Term & Academic Setup
            </h3>
          </div>
          
          <div className={styles.termList}>
            {academicYears.length > 0 ? academicYears.map(ay => (
              <div key={ay.id} className={styles.termItem}>
                <div className={styles.termHeader}>
                  <span className={styles.termName}>{ay.name}</span>
                  {ay.is_active && <span className={styles.badge} style={{ background: 'var(--color-primary)' }}>Active Year</span>}
                </div>
                <div className={styles.termDates}>
                  {new Date(ay.start_date).toLocaleDateString()} - {new Date(ay.end_date).toLocaleDateString()}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--theme-text-secondary)' }}>
                No academic years found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Exam Types */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <FileText size={18} />
              Exam Types Definitions
            </h3>
            <button 
              className={styles.btnSm} 
              style={{background: 'var(--color-primary)', color: '#fff'}}
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  weightage_percentage: 100,
                  passing_percentage: 35,
                  max_theory_marks: 80,
                  max_internal_marks: 20,
                  is_online: false,
                  academic_year: formData.academic_year
                });
                setIsModalOpen(true);
              }}
            >
              <Plus size={14} /> Create Exam Type
            </button>
          </div>

          <table className={styles.typeTable}>
            <thead>
              <tr>
                <th>Type Name</th>
                <th>Mode</th>
                <th>Weightage</th>
                <th>Passing %</th>
                <th>Max Marks (T/I)</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {examTypes.length > 0 ? examTypes.map(et => (
                <tr key={et.id}>
                  <td>
                    <div className={styles.typeNameCell}>
                      <div className={`${styles.iconBox} ${et.is_online ? styles.iconBoxOnline : ''}`}>
                        {et.is_online ? <MonitorPlay size={18} /> : <FileText size={18} />}
                      </div>
                      <span style={{fontWeight: 600}}>{et.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${et.is_online ? styles.badgeOnline : styles.badgeOffline}`}>
                      {et.is_online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>
                    <div>{et.weightage_percentage}%</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{width: `${et.weightage_percentage}%`}}></div>
                    </div>
                  </td>
                  <td>{et.passing_percentage}%</td>
                  <td>
                    <div style={{fontSize: '0.85rem'}}>
                      Theory: <b>{et.max_theory_marks}</b> <br/>
                      Internal: <b>{et.max_internal_marks}</b>
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionBtns} style={{justifyContent: 'flex-end'}}>
                      <button className={styles.iconBtn} onClick={() => handleEdit(et)} style={{color: '#3B82F6'}}><Edit2 size={16}/></button>
                      <button className={styles.iconBtn} onClick={() => handleDelete(et.id)} style={{color: '#EF4444'}}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-secondary)' }}>
                    No exam types defined yet. Click "Create Exam Type" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Basic Modal for Creation */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? "Edit Exam Type" : "Create New Exam Type"}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Type Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mid Term Exam"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Weightage %</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.weightage_percentage}
                    onChange={e => setFormData({ ...formData, weightage_percentage: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Passing %</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.passing_percentage}
                    onChange={e => setFormData({ ...formData, passing_percentage: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Max Theory Marks</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.max_theory_marks}
                    onChange={e => setFormData({ ...formData, max_theory_marks: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Max Internal Marks</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.max_internal_marks}
                    onChange={e => setFormData({ ...formData, max_internal_marks: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Academic Year</label>
                <select 
                  required 
                  value={formData.academic_year}
                  onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                >
                  <option value="">Select Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.checkboxGroup}>
                <label>
                  <input 
                    type="checkbox" 
                    checked={formData.is_online}
                    onChange={e => setFormData({ ...formData, is_online: e.target.checked })}
                  />
                  Is Online written exam?
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>{editingId ? "Save Changes" : "Create Type"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
