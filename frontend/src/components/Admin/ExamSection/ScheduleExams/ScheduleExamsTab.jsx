"use client";
import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, MapPin, User, Clock, 
  Printer, AlertTriangle, ChevronDown, CheckCircle2,
  Plus, Loader2, X, Search
} from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './ScheduleExams.module.css';

export default function ScheduleExamsTab() {
  const [exams, setExams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    academic_year: '',
    class_id: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    academic_year: '',
    school_class: '',
    exam_type: '',
    start_date: '',
    end_date: '',
    is_online: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, yearsRes, typesRes, classesRes] = await Promise.all([
        adminApi.getExams(filters),
        adminApi.getAcademicYears(),
        adminApi.getExamTypes(),
        adminApi.getClasses()
      ]);
      setExams(examsRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setExamTypes(typesRes.data || []);
      setClasses(classesRes.data || []);

      if (yearsRes.data?.length > 0 && !filters.academic_year) {
        const activeYear = yearsRes.data.find(y => y.is_active)?.id || yearsRes.data[0].id;
        setFilters(prev => ({ ...prev, academic_year: activeYear }));
        setFormData(prev => ({ ...prev, academic_year: activeYear }));
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.academic_year, filters.class_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createExam(formData);
      setIsModalOpen(false);
      fetchData();
      setFormData({
        name: '',
        academic_year: filters.academic_year,
        school_class: '',
        exam_type: '',
        start_date: '',
        end_date: '',
        is_online: false
      });
    } catch (error) {
      alert("Error creating exam: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This will delete the exam and all related schedules/results.")) return;
    try {
      await adminApi.deleteExam(id);
      fetchData();
    } catch (error) {
      alert("Error deleting exam");
    }
  };

  if (loading && exams.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          <select 
            className={styles.select} 
            value={filters.academic_year}
            onChange={e => setFilters({...filters, academic_year: e.target.value})}
          >
            <option value="">All Academic Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
          </select>
          <select 
            className={styles.select}
            value={filters.class_id}
            onChange={e => setFilters({...filters, class_id: e.target.value})}
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button 
          className={`${styles.btnSm} ${styles.btnSmPrimary}`}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16}/> Create Exam
        </button>
      </div>

      <div className={styles.timeline}>
        {exams.length > 0 ? exams.map(exam => (
          <div key={exam.id} className={styles.examCard}>
            <div className={styles.ecHeader}>
              <div className={styles.ecTitle}>
                <span className={styles.ecName}>{exam.name}</span>
                <span className={styles.badge}>{exam.class_name}</span>
                <span className={styles.badge} style={{ 
                  background: exam.is_published ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                  color: exam.is_published ? '#10B981' : '#F59E0B' 
                }}>
                  {exam.is_published ? (
                    <><CheckCircle2 size={12} style={{marginRight: 4, display:'inline'}}/> PUBLISHED</>
                  ) : 'DRAFT'}
                </span>
                {exam.exam_type_details?.is_online && (
                  <span className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                    ONLINE
                  </span>
                )}
              </div>
              <div className={styles.ecActions}>
                <button className={styles.btnSm} onClick={() => handleDelete(exam.id)} style={{ color: '#EF4444' }}>Delete</button>
                <button className={styles.btnSm}>Manage Schedule <ChevronDown size={14}/></button>
                <button className={`${styles.btnSm} ${styles.btnSmPrimary}`}>
                  <Printer size={14}/> Hall Tickets
                </button>
              </div>
            </div>

            <div className={styles.datesGrid}>
              <div className={styles.dateInfo}>
                <CalendarDays size={16} />
                <span>Starts: {new Date(exam.start_date).toLocaleDateString()}</span>
              </div>
              <div className={styles.dateInfo}>
                <CalendarDays size={16} />
                <span>Ends: {new Date(exam.end_date).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-secondary)' }}>
                Exam type: <strong>{exam.exam_type_details?.name}</strong>
              </div>
            </div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--theme-border)' }}>
            <CalendarDays size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ margin: 0, opacity: 0.5 }}>No exams scheduled for this selection</h3>
            <p style={{ opacity: 0.3, fontSize: '0.9rem' }}>Create a new exam to start the schedule.</p>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Schedule New Examination</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Examination Title</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Annual Exam 2026"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Class</label>
                  <select 
                    required 
                    value={formData.school_class}
                    onChange={e => setFormData({ ...formData, school_class: e.target.value })}
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Exam Type</label>
                  <select 
                    required 
                    value={formData.exam_type}
                    onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    {examTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Schedule Exam</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
