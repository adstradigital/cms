'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  AlertTriangle, Calendar, CheckCircle2, Clock3, MailWarning, Plane, Search, UserCheck, UserX, 
  LayoutDashboard, ClipboardList, ShieldCheck, BellRing, FileText, X, Check 
} from 'lucide-react';
import styles from './AttendenceStdAd.module.css';
import LeaveRequestsAd from './LeaveRequestsAd';


import instance from '@/api/instance';



function toLocalISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthYearFromISODate(dateStr) {
  const parts = String(dateStr || '').split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  return {
    year: Number.isFinite(year) ? year : null,
    month: Number.isFinite(month) ? month : null,
  };
}

function statusLabel(status) {
  if (status === 'present') return 'Present';
  if (status === 'absent') return 'Absent';
  if (status === 'late') return 'Late';
  if (status === 'leave') return 'Leave';
  if (status === 'holiday') return 'Holiday';
  return 'Unmarked';
}

export default function AttendenceStdAd() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'leaves'
  const [date, setDate] = useState(() => toLocalISODate(new Date()));
  const [threshold, setThreshold] = useState(75);
  const [schoolClass, setSchoolClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [section, setSection] = useState('');
  const [sections, setSections] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningSending, setWarningSending] = useState(false);

  // Global Leave & Warning States
  const [globalLeaves, setGlobalLeaves] = useState([]);
  const [globalWarnings, setGlobalWarnings] = useState([]);
  const [warningSearch, setWarningSearch] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveFilters, setLeaveFilters] = useState({
    search: '',
    received: '', // Only one calendar for "Received Date"
    type: '',
    status: '',
  });

  const derivedMonthYear = useMemo(() => {
    const parsed = monthYearFromISODate(date);
    const fallback = new Date();
    return {
      month: parsed.month || fallback.getMonth() + 1,
      year: parsed.year || fallback.getFullYear(),
    };
  }, [date]);

  const fetchClasses = async () => {
    try {
      const res = await instance.get('/students/classes/');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSections = async (classId = schoolClass) => {
    try {
      const params = new URLSearchParams();
      if (classId) params.set('class', classId);
      const res = await instance.get(`/students/sections/?${params.toString()}`);
      setSections(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date,
        month: String(derivedMonthYear.month),
        year: String(derivedMonthYear.year),
        threshold: String(threshold),
      });
      if (schoolClass) params.set('class', schoolClass);
      if (section) params.set('section', section);
      const res = await instance.get(`/attendance/admin/overview/?${params.toString()}`);
      const data = res.data;
      setOverview(data);
      setSelectedStudentId((prev) => {
        const rows = data.students || [];
        if (!rows.length) return null;
        if (prev && rows.some((r) => r.student_id === prev)) return prev;
        return rows[0].student_id;
      });
      if (!data.students?.length) setStudentDetail(null);
    } catch (e) {
      console.error(e);
      alert('Could not load attendance overview.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetail = async () => {
    if (!selectedStudentId) return;
    try {
      const params = new URLSearchParams({
        date,
        month: String(derivedMonthYear.month),
        year: String(derivedMonthYear.year),
        threshold: String(threshold),
      });
      const res = await instance.get(`/attendance/admin/student/${selectedStudentId}/?${params.toString()}`);
      setStudentDetail(res.data);
    } catch (e) {
      console.error(e);
      setStudentDetail(null);
    }
  };

  const fetchGlobalLeaves = async () => {
    setLeaveLoading(true);
    try {
      const params = new URLSearchParams();
      if (leaveFilters.received) params.set('received_date', leaveFilters.received);
      if (leaveFilters.type) params.set('leave_type', leaveFilters.type);
      if (leaveFilters.status) params.set('status', leaveFilters.status);
      
      // Sync with top-level class/section filters
      if (schoolClass) params.set('class', schoolClass);
      if (section) params.set('section', section);

      const res = await instance.get(`/attendance/leave-requests/?${params.toString()}`);
      let data = res.data;
      if (leaveFilters.search) {
        const q = leaveFilters.search.toLowerCase().trim();
        data = data.filter(l => 
          l.student_name.toLowerCase().includes(q) || 
          (l.admission_number && l.admission_number.toLowerCase().includes(q))
        );
      }
      setGlobalLeaves(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLeaveLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveFilters, schoolClass, section]);

  const handleLeaveReview = async (id, status) => {
    try {
      const res = await instance.patch(`/attendance/leave-requests/${id}/review/`, { status });
      if (res.status === 200) {
        fetchGlobalLeaves();
        fetchOverview();
        fetchStudentDetail();
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchSections(schoolClass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass]);

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, derivedMonthYear.month, derivedMonthYear.year, threshold, schoolClass, section]);

  useEffect(() => {
    fetchStudentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, date, derivedMonthYear.month, derivedMonthYear.year, threshold]);

  const fetchGlobalWarnings = async () => {
    try {
      const res = await instance.get('/attendance/admin/warnings/');
      setGlobalWarnings(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchGlobalWarnings();
  }, []);

  const filteredStudents = useMemo(() => {
    const rows = overview?.students || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter((row) =>
      `${row.student_name} ${row.admission_number || ''} ${row.class_name || ''} ${row.section_name || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [overview, search]);

  // ─── Pagination ───
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, schoolClass, section, date, threshold]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageStudents = filteredStudents.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const startEntry = filteredStudents.length === 0 ? 0 : pageStart + 1;
  const endEntry = Math.min(pageStart + ITEMS_PER_PAGE, filteredStudents.length);

  const visiblePages = useMemo(() => {
    const windowSize = 5;
    if (totalPages <= windowSize) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  }, [safePage, totalPages]);

  const sendWarning = async () => {
    if (!selectedStudentId) return;
    try {
      setWarningSending(true);
      const percentage = studentDetail?.summary?.percentage ?? null;
      const studentName = studentDetail?.student?.name || 'Student';
      const className = studentDetail?.student?.class_name || '';
      const sectionName = studentDetail?.student?.section_name || '';
      const classLabel = [className, sectionName].filter(Boolean).join(' ');
      const fallback =
        percentage === null
          ? `Attendance alert: ${studentName}${classLabel ? ` (${classLabel})` : ''} is below ${threshold}%. Please follow up.`
          : `Attendance alert: ${studentName}${classLabel ? ` (${classLabel})` : ''} is at ${percentage}%, below ${threshold}%. Please follow up.`;
      const message = warningMessage.trim() || fallback;
      
      const res = await instance.post('/attendance/admin/warnings/', {
        student: selectedStudentId,
        date,
        month: derivedMonthYear.month,
        year: derivedMonthYear.year,
        threshold,
        attendance_percentage: percentage,
        message,
      });

      setWarningMessage('');
      await fetchStudentDetail();
      await fetchOverview();
      alert(res.data?.parents_notified ? 'Warning sent to parents.' : 'Warning saved (no parent contact found).');
    } catch (e) {
      console.error(e);
      alert(`Warning failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setWarningSending(false);
    }
  };

  const s = overview?.summary;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerArea}>
        <div className={styles.tabSwitcher}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <LayoutDashboard size={18} />
            Attendance Overview
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'leaves' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('leaves')}
          >
            <ClipboardList size={18} />
            Manage Leave Requests
            {s?.pending_leave_count > 0 && <span className={styles.tabBadge}>{s.pending_leave_count}</span>}
          </button>
        </div>
      </div>

      {activeTab === 'leaves' ? (
        <LeaveRequestsAd 
          initialClass={schoolClass} 
          initialSection={section} 
          classes={classes} 
          sections={sections}
        />
      ) : (
        <>
          <div className={styles.topControls}>
            <div className={styles.controlGroup}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className={styles.controlGroup}>
              <label>Class</label>
              <select
                value={schoolClass}
                onChange={(e) => {
                  setSchoolClass(e.target.value);
                  setSection('');
                }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.controlGroup}>
              <label>Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>{sec.class_name || 'Class'} - {sec.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.controlGroup}>
              <label>Low % Threshold</label>
              <input type="number" min="1" max="100" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 75))} />
            </div>
            <div className={styles.searchWrap}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Search student / admission / class"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.cards}>
            <SummaryCard icon={<Calendar size={18} />} title="Attendance" value={`${s?.day_overall_percentage ?? 0}%`} />
            <SummaryCard icon={<UserCheck size={18} />} title="Present" value={s?.present_today ?? 0} />
            <SummaryCard icon={<UserX size={18} />} title="Absent" value={s?.absent_today ?? 0} />
            <SummaryCard icon={<Plane size={18} />} title="Leave" value={s?.leave_today ?? 0} info />
            <SummaryCard icon={<AlertTriangle size={18} />} title="Unmarked" value={s?.unmarked_today ?? 0} danger />
          </div>

          <div className={styles.layout}>
            <div className={styles.listPanel}>
              <div className={styles.panelHeader}>
                <h3>Student Attendance List</h3>
                <span>
                  {loading ? 'Loading...' : `${filteredStudents.length} students | low: ${s?.low_attendance_count ?? 0}`}
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Monthly %</th>
                      <th>Leaves</th>
                      <th>Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStudents.map((row) => (
                      <tr
                        key={row.student_id}
                        className={`${styles.row} ${selectedStudentId === row.student_id ? styles.rowActive : ''}`}
                        onClick={() => setSelectedStudentId(row.student_id)}
                      >
                        <td>
                          <div className={styles.studentBlock}>
                            <strong>{row.student_name}</strong>
                            <span>{row.admission_number || '-'} | {row.present}/{row.total}</span>
                          </div>
                        </td>
                        <td>{row.class_name || '-'} {row.section_name ? `(${row.section_name})` : ''}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              row.day_status === 'present'
                                ? styles.statusPresent
                                : row.day_status === 'absent'
                                  ? styles.statusAbsent
                                  : row.day_status === 'late'
                                    ? styles.statusLate
                                    : row.day_status === 'leave'
                                      ? styles.statusLeave
                                      : row.day_status === 'holiday'
                                        ? styles.statusHoliday
                                        : styles.statusUnmarked
                            }`}
                          >
                            {statusLabel(row.day_status)}
                          </span>
                        </td>
                        <td>
                          <span className={row.low_attendance ? styles.badgeDanger : styles.badgeOk}>
                            {row.percentage}%
                          </span>
                        </td>
                        <td>{row.leave}</td>
                        <td>{row.warnings_sent}</td>
                      </tr>
                    ))}
                    {!filteredStudents.length && (
                      <tr>
                        <td colSpan="6" className={styles.empty}>No students found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.paginationFooter}>
                <span>Showing {startEntry}–{endEntry} of {filteredStudents.length}</span>
                <div className={styles.pageControls}>
                  <button
                    className={styles.pageBtn}
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  {visiblePages.map((page) => (
                    <button
                      key={page}
                      className={`${styles.pageBtn} ${safePage === page ? styles.pageBtnActive : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className={styles.pageBtn}
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.detailPanel}>
              {studentDetail && (
                <>
                  <div className={styles.profileHeader}>
                    <div className={styles.avatarWrap}>
                      {studentDetail.student?.photo ? (
                        <img src={studentDetail.student.photo} alt={studentDetail.student.name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {studentDetail.student?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className={styles.profileInfo}>
                      <h3>{studentDetail.student?.name}</h3>
                      <div className={styles.profileMeta}>
                        <span>{studentDetail.student?.class_name || '-'} {studentDetail.student?.section_name || ''}</span>
                        <span className={styles.admissionBadge}>ADM: {studentDetail.student?.admission_number || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailCards}>
                    <MiniMetric icon={<Calendar size={14} />} label={`Status (${date})`} value={statusLabel(studentDetail.day?.status)} />
                    <MiniMetric icon={<CheckCircle2 size={14} />} label="Present" value={studentDetail.summary?.present ?? 0} />
                    <MiniMetric icon={<UserX size={14} />} label="Absent" value={studentDetail.summary?.absent ?? 0} />
                    <MiniMetric icon={<Clock3 size={14} />} label="Late" value={studentDetail.summary?.late ?? 0} />
                    <MiniMetric icon={<Plane size={14} />} label="Leave" value={studentDetail.summary?.leave ?? 0} />
                    <MiniMetric icon={<MailWarning size={14} />} label="Attendance %" value={`${studentDetail.summary?.percentage ?? 0}%`} />
                  </div>

                  <div className={styles.contactBlock}>
                    <h4>Student / Parent Contacts</h4>
                    <p>Student: {studentDetail.student?.student_phone || '-'} | {studentDetail.student?.student_email || '-'}</p>
                    <p>Parent: {studentDetail.student?.parent_phone || '-'} | {studentDetail.student?.parent_email || '-'}</p>
                  </div>

                  {studentDetail.summary?.percentage < threshold ? (
                    <div className={styles.autoWarningActive}>
                      <div className={styles.autoWarningIcon}><BellRing size={16} /></div>
                      <div className={styles.autoWarningInfo}>
                        <strong>Automated Alert Active</strong>
                        <span>Attendance is below {threshold}%. Parents are being notified automatically.</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.autoWarningInactive}>
                      <div className={styles.autoWarningIcon}><ShieldCheck size={16} /></div>
                      <div className={styles.autoWarningInfo}>
                        <strong>Attendance Status: Good</strong>
                        <span>Attendance is above the {threshold}% threshold.</span>
                      </div>
                    </div>
                  )}


                </>
              )}

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4>Low Attendance Alerts ({threshold}%)</h4>
                  <div className={styles.headerStats}>
                    {(overview?.students || []).filter(s => s.percentage < threshold).length} Alerts
                  </div>
                </div>

                <div className={styles.sidebarSectionSearch}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search defaulters..."
                    value={warningSearch}
                    onChange={(e) => setWarningSearch(e.target.value)}
                  />
                </div>

                <div className={styles.sidebarList}>
                  {(() => {
                    const lowStudents = (overview?.students || [])
                      .filter(s => s.percentage < threshold)
                      .filter(s => {
                        const q = warningSearch.toLowerCase().trim();
                        if (!q) return true;
                        return s.name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
                      });

                    if (lowStudents.length === 0) {
                      return <div className={styles.emptySmall}>No low attendance alerts active.</div>;
                    }

                    return lowStudents.map((s) => (
                      <div key={s.student_id} className={styles.warningItem}>
                        <div className={styles.warningAvatar}>
                          {s.photo ? (
                            <img src={s.photo} alt={s.name} />
                          ) : (
                            <div className={styles.avatarLetter}>{(s.name || '?').charAt(0)}</div>
                          )}
                        </div>
                        <div className={styles.warningContent}>
                          <div className={styles.warningTop}>
                            <strong>{s.name}</strong>
                            <span className={styles.warningDate}>ADM: {s.admission_number}</span>
                          </div>
                          <div className={styles.warningMeta}>
                            <span className={styles.warningPercent}>Attendance: {s.percentage}%</span>
                            <span className={styles.warningBadge}>Parents Notified</span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h4>Leave Request Manager</h4>
                  <div className={styles.headerStats}>
                    {globalLeaves.filter(l => l.status === 'pending').length} Pending
                  </div>
                </div>

                {/* Filters Row */}
                <div className={styles.sidebarFilters}>
                  <div className={styles.sidebarFilterRow}>
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={leaveFilters.search}
                      onChange={(e) => setLeaveFilters({ ...leaveFilters, search: e.target.value })}
                      className={styles.sidebarSearch}
                    />
                    <input
                      type="date"
                      value={leaveFilters.received}
                      onChange={(e) => setLeaveFilters({ ...leaveFilters, received: e.target.value })}
                      className={styles.sidebarDateInput}
                      title="Date Received"
                    />
                  </div>

                  <div className={styles.sidebarFilterRow}>
                    <select
                      value={leaveFilters.type}
                      onChange={(e) => setLeaveFilters({ ...leaveFilters, type: e.target.value })}
                      className={styles.sidebarSelect}
                    >
                      <option value="">All Types</option>
                      <option value="medical">Medical</option>
                      <option value="casual">Casual</option>
                      <option value="duty">Duty</option>
                      <option value="sports">Sports</option>
                    </select>

                    <select
                      value={leaveFilters.status}
                      onChange={(e) => setLeaveFilters({ ...leaveFilters, status: e.target.value })}
                      className={styles.sidebarSelect}
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className={styles.sidebarList}>
                  {leaveLoading ? (
                    <div className={styles.loadingSmall}>Loading requests...</div>
                  ) : globalLeaves.length === 0 ? (
                    <div className={styles.emptySmall}>No leave requests found.</div>
                  ) : (
                    globalLeaves.map((l) => (
                      <div key={l.id} className={`${styles.leaveItem} ${styles[l.status]}`}>
                        <div className={styles.leaveTop}>
                          <div className={styles.leaveUser}>
                            <strong>{l.student_name}</strong>
                            <span>{l.class_name} ({l.section_name})</span>
                          </div>
                          <span className={`${styles.leaveStatus} ${styles[l.status]}`}>{l.status}</span>
                        </div>
                        
                        <div className={styles.leaveMeta}>
                          <span className={styles.leaveTypeTag}>{l.leave_type}</span>
                          <span className={styles.leaveDates}>{l.from_date} to {l.to_date}</span>
                        </div>

                        <p className={styles.leaveReason}>{l.reason}</p>

                        {l.leave_type === 'medical' && l.certificate && (
                          <a href={l.certificate} target="_blank" rel="noreferrer" className={styles.certBtn}>
                            <FileText size={12} /> View Certificate
                          </a>
                        )}

                        {l.status === 'pending' && (
                          <div className={styles.leaveActions}>
                            <button className={styles.sideReject} onClick={() => handleLeaveReview(l.id, 'rejected')}>
                              <X size={14} /> Reject
                            </button>
                            <button className={styles.sideApprove} onClick={() => handleLeaveReview(l.id, 'approved')}>
                              <Check size={14} /> Approve
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!studentDetail && (
                <div className={styles.sidebarHint}>
                  <AlertTriangle size={16} />
                  <span>Select a student from the list to view profile and metrics.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, value, danger = false, info = false }) {
  return (
    <div className={styles.card}>
      <div className={`${styles.cardIcon} ${danger ? styles.cardDanger : info ? styles.cardInfo : ''}`}>{icon}</div>
      <div>
        <div className={styles.cardTitle}>{title}</div>
        <div className={styles.cardValue}>{value}</div>
      </div>
    </div>
  );
}

function MiniMetric({ icon, label, value }) {
  return (
    <div className={styles.miniMetric}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
