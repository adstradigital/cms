"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarDays, MapPin, User, Clock, 
  Printer, AlertTriangle, ChevronDown, CheckCircle2,
  Plus, Loader2, X, Search, Trash2, Upload, FileText
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
  const printRef = useRef(null);
  const [filters, setFilters] = useState({
    academic_year: '',
    class_id: ''
  });

  const [selectedExamForSchedule, setSelectedExamForSchedule] = useState(null);
  const [selectedExamForHallTickets, setSelectedExamForHallTickets] = useState(null);
  const [mockTicketsData, setMockTicketsData] = useState(null);
  const [mockTicketsGenerating, setMockTicketsGenerating] = useState(false);
  const [examSchedules, setExamSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    subject: '',
    date: '',
    start_time: '',
    end_time: '',
    max_theory_marks: 80,
    max_internal_marks: 20,
    pass_marks: 35,
    venue: '',
    invigilator: ''
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

  const handleManageSchedule = async (exam) => {
    setSelectedExamForSchedule(exam);
    setScheduleLoading(true);
    try {
      const [schedulesRes, subjectsRes, teachersRes] = await Promise.all([
        adminApi.getExamSchedules(exam.id),
        adminApi.getSubjects({ school_class: exam.school_class }),
        adminApi.getTeachers()
      ]);
      setExamSchedules(schedulesRes.data || []);
      // Handle both paginated {results:[]} and flat array responses
      const subjectsList = subjectsRes.data?.results || subjectsRes.data || [];
      setSubjects(subjectsList);
      setTeachers(teachersRes.data || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load schedules");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createExamSchedule(selectedExamForSchedule.id, scheduleFormData);
      const res = await adminApi.getExamSchedules(selectedExamForSchedule.id);
      setExamSchedules(res.data);
      // reset form
      setScheduleFormData({
        ...scheduleFormData,
        subject: '',
        date: '',
        venue: '',
        invigilator: ''
      });
    } catch (error) {
      alert("Error creating schedule: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject schedule?")) return;
    try {
      await adminApi.deleteExamSchedule(id);
      setExamSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      alert("Error deleting schedule");
    }
  };

  const handleGenerateMockTickets = async (exam) => {
    setMockTicketsGenerating(true);
    try {
      const [schedulesRes, studentsRes] = await Promise.all([
        adminApi.getExamSchedules(exam.id),
        adminApi.getStudents({ school_class: exam.school_class })
      ]);
      const students = studentsRes.data?.results || studentsRes.data || [];
      if (students.length === 0) {
        alert("No students found in this class to generate hall tickets.");
        setMockTicketsGenerating(false);
        return;
      }
      setMockTicketsData({
        exam,
        schedules: schedulesRes.data || [],
        students: students
      });
      setSelectedExamForHallTickets(null); // close selection modal
    } catch (error) {
      alert("Failed to generate mock tickets: " + (error.response?.data?.error || error.message));
    } finally {
      setMockTicketsGenerating(false);
    }
  };

  const handlePrintMockTickets = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '', 'width=900,height=900');
    if (!printWindow) return alert("Please allow popups to print.");
    
    // Copy all style tags from parent
    const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    const htmlContent = printRef.current.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Admit Card - ${mockTicketsData?.exam?.name || ''}</title>
          ${stylesHtml}
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              * { box-sizing: border-box; }
              
              /* Overwrite overlay styles so it prints cleanly */
              div[class*="hallTicketCard"] {
                box-shadow: none !important;
                border: 2px solid #1e293b !important;
                width: 100% !important;
                max-width: none !important;
                page-break-after: always;
                margin: 0 !important;
                padding: 15mm !important;
                box-sizing: border-box;
                min-height: 297mm; /* Full A4 */
                position: relative;
              }

              /* Ensure table borders print */
              table[class*="htTable"] {
                border-collapse: collapse !important;
              }
              table[class*="htTable"] th, table[class*="htTable"] td {
                border: 1px solid #1e293b !important;
              }
            }
          </style>
        </head>
        <body style="background: white;">
          ${htmlContent}
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.focus();
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                <button className={styles.btnSm} onClick={() => handleManageSchedule(exam)}>Manage Schedule <ChevronDown size={14}/></button>
                <button 
                  className={`${styles.btnSm} ${styles.btnSmPrimary}`}
                  onClick={() => setSelectedExamForHallTickets(exam)}
                >
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

      {/* Manage Schedule Modal */}
      {selectedExamForSchedule && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Manage Schedule</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--theme-text-secondary)' }}>
                  {selectedExamForSchedule.name} - {selectedExamForSchedule.class_name}
                </p>
              </div>
              <button onClick={() => setSelectedExamForSchedule(null)}><X size={20}/></button>
            </div>
            
            <div className={styles.modalBody} style={{ background: '#f8fafc', gap: '16px' }}>
              
              {/* Existing Schedules Table */}
              <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#475569' }}>Subject</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#475569' }}>Date</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#475569' }}>Time</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#475569' }}>Marks (Th/Int)</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#475569' }}>Pass</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#475569' }}>Venue & Invigilator</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}><Loader2 className="animate-spin" size={20} /></td>
                      </tr>
                    ) : examSchedules.length > 0 ? examSchedules.map(s => {
                      const invigilatorName = teachers.find(t => t.user === s.invigilator)?.full_name || 'Not assigned';
                      return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{s.subject_name}</td>
                        <td style={{ padding: '10px 16px' }}>{s.date}</td>
                        <td style={{ padding: '10px 16px' }}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>{s.max_theory_marks} / {s.max_internal_marks}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>{s.pass_marks}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: '0.8rem' }}><strong>Venue:</strong> {s.venue || 'TBD'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}><strong>By:</strong> {invigilatorName}</div>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button 
                            className={styles.btnSm} 
                            style={{ color: '#ef4444', border: '1px solid #fecaca', background: '#fee2e2' }}
                            onClick={() => handleDeleteSchedule(s.id)}
                            title="Delete Schedule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )}) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          No subjects scheduled yet. Add one below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Schedule Form */}
              <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Add Subject Schedule</h4>
                <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className={styles.formRow} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                    <div className={styles.formGroup}>
                      <label>Subject</label>
                      <select 
                        required
                        value={scheduleFormData.subject}
                        onChange={e => setScheduleFormData({...scheduleFormData, subject: e.target.value})}
                      >
                        <option value="">Select Subject</option>
                        {subjects
                          .filter(s => {
                            // Match class (handle both int & string)
                            const classMatch = parseInt(s.school_class) === parseInt(selectedExamForSchedule.school_class);
                            // Filter out subjects already scheduled for this exam
                            const alreadyScheduled = examSchedules.some(es => parseInt(es.subject) === s.id);
                            return classMatch && !alreadyScheduled;
                          })
                          .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        }
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Date</label>
                      <input 
                        type="date" 
                        required 
                        value={scheduleFormData.date}
                        onChange={e => setScheduleFormData({...scheduleFormData, date: e.target.value})}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Start Time</label>
                      <input 
                        type="time" 
                        required 
                        value={scheduleFormData.start_time}
                        onChange={e => setScheduleFormData({...scheduleFormData, start_time: e.target.value})}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Time</label>
                      <input 
                        type="time" 
                        required 
                        value={scheduleFormData.end_time}
                        onChange={e => setScheduleFormData({...scheduleFormData, end_time: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formRow} style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
                    <div className={styles.formGroup}>
                      <label>Max Theory</label>
                      <input 
                        type="number" 
                        required min="0" max="100"
                        value={scheduleFormData.max_theory_marks}
                        onChange={e => setScheduleFormData({...scheduleFormData, max_theory_marks: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Max Internal</label>
                      <input 
                        type="number" 
                        required min="0" max="100"
                        value={scheduleFormData.max_internal_marks}
                        onChange={e => setScheduleFormData({...scheduleFormData, max_internal_marks: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Pass Marks</label>
                      <input 
                        type="number" 
                        required min="0" max="100"
                        value={scheduleFormData.pass_marks}
                        onChange={e => setScheduleFormData({...scheduleFormData, pass_marks: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Venue (Opt)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Hall A"
                        value={scheduleFormData.venue}
                        onChange={e => setScheduleFormData({...scheduleFormData, venue: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formRow} style={{ gridTemplateColumns: '1fr auto', marginTop: '-4px' }}>
                     <div className={styles.formGroup}>
                        <label>Invigilator (Opt)</label>
                        <select 
                          value={scheduleFormData.invigilator}
                          onChange={e => setScheduleFormData({...scheduleFormData, invigilator: e.target.value})}
                        >
                          <option value="">Select Invigilator</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.user}>
                              {t.full_name} ({t.employee_id})
                            </option>
                          ))}
                        </select>
                     </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                       <button type="submit" className={styles.btnPrimary} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                         <Plus size={16}/> Add Schedule
                       </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Hall Tickets Management Modal */}
      {selectedExamForHallTickets && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Hall Tickets Management</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--theme-text-secondary)' }}>
                  {selectedExamForHallTickets.name} - {selectedExamForHallTickets.class_name}
                </p>
              </div>
              <button onClick={() => setSelectedExamForHallTickets(null)}><X size={20}/></button>
            </div>
            
            <div className={styles.modalBody} style={{ background: '#f8fafc', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Auto Generate Mock Hall Tickets */}
                <div style={{ background: 'white', padding: '24px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#eff6ff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Printer size={24} style={{ color: '#3b82f6' }}/>
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#1e293b' }}>Mock / Internal Exams</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px', flex: 1 }}>
                    Automatically generate printable hall tickets using the schedules, subjects, and venues you defined. Gives students the "feel" of a real board exam.
                  </p>
                  <button 
                    className={styles.btnPrimary} 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                    onClick={() => handleGenerateMockTickets(selectedExamForHallTickets)}
                    disabled={mockTicketsGenerating}
                  >
                    {mockTicketsGenerating ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16}/>} 
                    {mockTicketsGenerating ? "Generating..." : "Generate Mock Tickets"}
                  </button>
                </div>

                {/* Upload University/Board Hall Tickets */}
                <div style={{ background: 'white', padding: '24px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#f5f3ff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Upload size={24} style={{ color: '#8b5cf6' }}/>
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#1e293b' }}>Board / University Exams</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px', flex: 1 }}>
                    Upload official hall tickets (PDFs) issued by the university. Map them to students so they can download them from their portal.
                  </p>
                  <button 
                    className={styles.btnPrimary} 
                    style={{ width: '100%', background: '#8b5cf6', display: 'flex', justifyContent: 'center', gap: '8px' }}
                    onClick={() => alert("This will open a file uploader to map official PDFs to students. (Implementation pending)")}
                  >
                    <Upload size={16}/> Upload Official Tickets
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Mock Hall Tickets Overlay */}
      {mockTicketsData && (
        <div className={styles.printOverlay}>
          <div className={styles.printHeaderBar}>
             <div>
               <h3 style={{ margin: 0 }}>Mock Hall Tickets</h3>
               <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                 {mockTicketsData.exam.name} • {mockTicketsData.students.length} Students
               </span>
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button className={styles.btnSecondary} onClick={() => setMockTicketsData(null)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={handlePrintMockTickets} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Printer size={16}/> Print / Save PDF
                </button>
             </div>
          </div>
          
          <div className={styles.printContentArea} ref={printRef}>
             {mockTicketsData.students.map(student => (
               <div key={student.id} className={styles.hallTicketCard}>
                 {/* Subtle Watermark */}
                 <div style={{
                   position: 'absolute',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%) rotate(-45deg)',
                   fontSize: '8rem',
                   color: 'rgba(0,0,0,0.03)',
                   fontWeight: '900',
                   pointerEvents: 'none',
                   zIndex: 0,
                   whiteSpace: 'nowrap'
                 }}>MOCK TICKET</div>

                 <div className={styles.htHeader} style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                      <div style={{ width: '60px', height: '60px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <CalendarDays size={32} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h2 className={styles.htSchoolName} style={{ margin: 0, fontSize: '1.8rem' }}>Campus Management System</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Main Academic Campus, Educational District</p>
                      </div>
                    </div>
                    <div style={{ borderTop: '2px solid #1e293b', marginTop: '10px', paddingTop: '10px' }}>
                      <h3 className={styles.htExamName} style={{ fontSize: '1.4rem', color: '#1e293b' }}>{mockTicketsData.exam.name} - ADMIT CARD</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 600 }}>Academic Session: {mockTicketsData.exam.academic_year_name || '2025-2026'}</p>
                    </div>
                 </div>

                 <div className={styles.htStudentInfo} style={{ position: 'relative', zIndex: 1 }}>
                    <div className={styles.htDetails}>
                       <div className={styles.htDetailRow}>
                         <strong>Student Name:</strong> 
                         <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{student.user?.first_name} {student.user?.last_name}</span>
                       </div>
                       <div className={styles.htDetailRow}>
                         <strong>Roll Number:</strong> 
                         <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{student.roll_number || 'N/A'}</span>
                       </div>
                       <div className={styles.htDetailRow}>
                         <strong>Class & Div:</strong> 
                         <span>{mockTicketsData.exam.class_name}</span>
                       </div>
                       <div className={styles.htDetailRow}>
                         <strong>Admission No:</strong> 
                         <span>{student.admission_number || 'N/A'}</span>
                       </div>
                       <div className={styles.htDetailRow}>
                         <strong>Gender:</strong> 
                         <span>{student.gender || 'N/A'}</span>
                       </div>
                       <div className={styles.htDetailRow}>
                         <strong>Exam Center:</strong> 
                         <span style={{ fontWeight: 600 }}>Center 101 - Main Block Hall</span>
                       </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                      {student.user?.profile?.photo ? (
                        <img src={student.user.profile.photo} alt="Student" className={styles.htPhoto} style={{ border: '2px solid #1e293b' }} />
                      ) : (
                        <div className={styles.htPhotoPlaceholder} style={{ border: '2px dashed #cbd5e1', background: '#f8fafc' }}>Affix Recent Photograph</div>
                      )}
                      <div style={{ width: '80px', height: '80px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                         {/* Placeholder for QR Code */}
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '2px' }}>VERIFY</div>
                            <CheckCircle2 size={32} style={{ color: '#cbd5e1' }} />
                         </div>
                      </div>
                    </div>
                 </div>

                 <table className={styles.htTable} style={{ position: 'relative', zIndex: 1 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Date</th>
                        <th style={{ width: '120px' }}>Time</th>
                        <th style={{ width: '80px' }}>Sub Code</th>
                        <th>Subject Name</th>
                        <th>Venue</th>
                        <th style={{ width: '120px' }}>Invigilator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTicketsData.schedules.length > 0 ? mockTicketsData.schedules.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.date}</td>
                          <td>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 500 }}>{subjects.find(sub => sub.id === s.subject)?.code || '---'}</td>
                          <td style={{ fontWeight: 500 }}>{s.subject_name}</td>
                          <td>{s.venue || 'TBD'}</td>
                          <td></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No examination subjects have been scheduled for this candidate.</td>
                        </tr>
                      )}
                    </tbody>
                 </table>

                 <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', position: 'relative', zIndex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>INSTRUCTIONS FOR THE CANDIDATE</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: '#475569', lineHeight: '1.5' }}>
                      <li>Candidates must bring this Admit Card to the examination hall without fail.</li>
                      <li>Please report to the examination center at least 30 minutes before the commencement of the exam.</li>
                      <li>Electronic gadgets, mobile phones, and calculators are strictly prohibited unless specified otherwise.</li>
                      <li>No candidate will be allowed to enter the examination hall after 15 minutes of the start time.</li>
                      <li>Maintaining discipline and following the invigilator's instructions is mandatory.</li>
                      <li>Any form of malpractice will lead to immediate disqualification.</li>
                    </ul>
                 </div>

                 <div className={styles.htFooter} style={{ position: 'relative', zIndex: 1, marginTop: '50px' }}>
                    <div style={{ textAlign: 'center' }}>
                       <div style={{ width: '180px', height: '40px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}></div>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Candidate's Signature</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                       <div style={{ width: '180px', height: '40px', borderBottom: '1px solid #1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem' }}>Seal & Signature</span>
                       </div>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Controller of Examinations</div>
                    </div>
                 </div>

               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
