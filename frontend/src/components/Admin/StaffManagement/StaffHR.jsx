'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, UserX, CalendarHeart, ClipboardCheck, Search, Filter, 
  CheckCircle2, XCircle, Calendar, Download, TrendingUp, TrendingDown,
  Users, AlertCircle, MoreHorizontal, ChevronRight, Save, Edit3,
  CheckSquare, Square
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie 
} from 'recharts';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './StaffHR.module.css';

const toLocalISODate = (d = new Date()) => {
  const date = new Date(d);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split('T')[0];
};

const StaffHRView = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, attendance, leaves, reports
  const [loading, setLoading] = useState(false);
  const { toasts, push, dismiss } = useToast();

  // State for data
  const [dashboardData, setDashboardData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  
  // Filters & Selected State
  const [selectedDate, setSelectedDate] = useState(toLocalISODate());
  const [selectedMonth, setSelectedMonth] = useState(toLocalISODate().substring(0, 7)); // YYYY-MM
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [leavesDeptFilter, setLeavesDeptFilter] = useState('');
  const [reportsDeptFilter, setReportsDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

  // Load Dashboard Data
  const loadDashboard = async (date) => {
    try {
      setLoading(true);
      const res = await adminApi.getStaffHRDashboard({ date });
      setDashboardData(res.data);
    } catch (e) {
      push('Failed to load dashboard statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Attendance Data (Date-based)
  const loadAttendance = async (date, searchStr = '', dept = '', status = '') => {
    try {
      setLoading(true);
      const res = await adminApi.getStaffHRAttendance({ 
        date, 
        search: searchStr, 
        department: dept, 
        status: status 
      });
      setAttendance(res.data || []);
    } catch (e) {
      push('Failed to load attendance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Leaves
  const loadLeaves = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getStaffLeaves();
      setLeaves(res.data || []);
    } catch (e) {
      push('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Leave Balances
  const loadLeaveBalances = async (dept = '') => {
    try {
      const res = await adminApi.getStaffLeaveBalances({ department: dept });
      setLeaveBalances(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'overview') loadDashboard(selectedDate);
    if (activeTab === 'attendance') {
      loadAttendance(selectedDate, search, deptFilter, statusFilter);
    }
    if (activeTab === 'leaves') {
      loadLeaves();
      loadLeaveBalances(leavesDeptFilter);
    }
    if (activeTab === 'reports') {
      fetchMonthlySummary();
    }
  }, [activeTab, selectedDate, search, deptFilter, statusFilter, leavesDeptFilter, reportsDeptFilter, selectedMonth]);

  // Handle Tab Changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset filters on tab change if needed
  };

  // Bulk Actions
  const handleBulkMark = async (status) => {
    if (selectedStaffIds.length === 0) return;
    try {
      setLoading(true);
      const records = selectedStaffIds.map(id => ({ staff_id: id, status }));
      await adminApi.bulkMarkStaffAttendance({ date: selectedDate, records });
      push(`Successfully marked ${selectedStaffIds.length} staff as ${status}`, 'success');
      loadAttendance(selectedDate, search, deptFilter, statusFilter);
      setSelectedStaffIds([]);
    } catch (e) {
      push('Failed to bulk mark attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Inline Update
  const handleInlineUpdate = async (record, field, value) => {
    try {
      // Update local state first for immediate feedback
      const newAttendance = attendance.map(item => {
        if (item.staff_id === record.staff_id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      setAttendance(newAttendance);

      if (record.id) {
        // Update existing record
        await adminApi.updateStaffAttendanceRecord(record.id, { [field]: value });
      } else if (field === 'status' && value !== 'unmarked') {
        // Create new record via bulk endpoint for a single record
        await adminApi.bulkMarkStaffAttendance({ 
          date: selectedDate, 
          records: [{ staff_id: record.staff_id, status: value }] 
        });
        // Reload to get the new ID
        loadAttendance(selectedDate, search, deptFilter, statusFilter);
      }
    } catch (e) {
      push('Update failed', 'error');
    }
  };

  // Leave Approval
  const handleLeaveStatus = async (id, status) => {
    try {
      setLoading(true);
      await adminApi.updateStaffLeave(id, { status });
      push(`Leave request ${status}`, 'success');
      loadLeaves();
    } catch (e) {
      push('Failed to update leave status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reports
  const handleExportReport = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const res = await adminApi.exportStaffMonthlyReport({ 
        month, 
        year, 
        department: reportsDeptFilter 
      });
      
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      push('Report downloaded successfully', 'success');
    } catch (e) {
      console.error('Export error:', e);
      push('Failed to export report', 'error');
    } finally {
      setLoading(false);
    }
  };


  const fetchMonthlySummary = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const res = await adminApi.getStaffMonthlyReport({ month, year, department: reportsDeptFilter });
      setMonthlyReport(res.data);
    } catch (e) {
      push('Failed to load monthly summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render Helpers
  const renderOverview = () => {
    if (!dashboardData) return <div className={styles.emptyState}>Loading dashboard...</div>;
    const { summary, weekly_trend, department_breakdown, frequent_late_employees, low_attendance_alerts } = dashboardData;

    return (
      <div className={styles.tabPanel}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrap} style={{ background: '#dcfce7', color: '#166534' }}>
                <Users size={20} />
              </div>
              <div className={`${styles.trendIndicator} ${summary.present_pct >= 90 ? styles.trendUp : styles.trendDown}`}>
                {summary.present_pct}%
              </div>
            </div>
            <div className={styles.statValue}>
              <h3>{summary.present_today}</h3>
              <p>Present Today</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrap} style={{ background: '#fee2e2', color: '#991b1b' }}>
                <UserX size={20} />
              </div>
            </div>
            <div className={styles.statValue}>
              <h3>{summary.absent_today}</h3>
              <p>Absent Today</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrap} style={{ background: '#fef9c3', color: '#854d0e' }}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.statValue}>
              <h3>{summary.late_today}</h3>
              <p>Late Arrivals</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrap} style={{ background: '#e0e7ff', color: '#3730a3' }}>
                <CalendarHeart size={20} />
              </div>
            </div>
            <div className={styles.statValue}>
              <h3>{summary.leave_today}</h3>
              <p>On Leave</p>
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>Attendance Trends (Last 7 Days)</h3>
            </div>
            <div className={styles.chartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Present" />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Late" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>Dept. Breakdown</h3>
            </div>
            <div className={styles.chartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={department_breakdown}
                    cx="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="department"
                  >
                    {department_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={styles.insightsRow} style={{marginTop: 24}}>
          <div className={styles.insightCard}>
            <h4><Clock size={16} color="#f59e0b" /> Frequent Late Arrivals</h4>
            {frequent_late_employees.length === 0 ? <p className={styles.smallText}>No frequent late arrivals this month.</p> : 
              frequent_late_employees.map(emp => (
                <div key={emp.id} className={styles.alertItem}>
                   <span>{emp.name}</span>
                   <span className={styles.alertBadge} style={{background: '#fef3c7', color: '#92400e'}}>{emp.late_count} times</span>
                </div>
              ))
            }
          </div>
          <div className={styles.insightCard}>
            <h4><AlertCircle size={16} color="#ef4444" /> Low Attendance Alerts (&lt;75%)</h4>
            {low_attendance_alerts.length === 0 ? <p className={styles.smallText}>No staff below 75% attendance.</p> : 
              low_attendance_alerts.map(emp => (
                <div key={emp.id} className={styles.alertItem}>
                   <div style={{display:'flex', flexDirection:'column'}}>
                     <span>{emp.name}</span>
                     {String(emp.department || '').trim() && String(emp.department || '').trim().toLowerCase() !== 'general' ? (
                       <span style={{fontSize:10, opacity:0.7}}>{emp.department}</span>
                     ) : null}
                   </div>
                   <span className={styles.alertBadge}>{emp.percentage}%</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  };

  const renderAttendance = () => {
    const allSelected = selectedStaffIds.length > 0 && selectedStaffIds.length === attendance.length;
    
    return (
      <div className={styles.tabPanel}>
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input 
                  className={styles.searchInput}
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyUp={e => e.key === 'Enter' && loadAttendance(selectedDate, search, deptFilter, statusFilter)}
                />
              </div>
              <div className={styles.filterGroup}>
                <select className={styles.select} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                   <option value="">All Roles</option>
                   <option value="Academic">Academic</option>
                   <option value="Admin">Admin</option>
                   <option value="Accounts">Accounts</option>
                   <option value="Accountant">Accountant</option>
                   <option value="Class Teacher">Class Teacher</option>
                   <option value="Driver">Driver</option>
                   <option value="Guidance Counselor">Guidance Counselor</option>
                   <option value="Principal">Principal</option>
                   <option value="staff">Staff</option>
                   <option value="student">Student</option>
                   <option value="Subject Teacher">Subject Teacher</option>
                   <option value="super_admin">Super Admin</option>
                   <option value="Support Staff">Support Staff</option>
                   <option value="Teacher">Teacher</option>
                   <option value="Warden">Warden</option>
                   <option value="Unassigned">Unassigned</option>
                </select>
                <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                   <option value="">All Statuses</option>
                   <option value="present">Present</option>
                   <option value="absent">Absent</option>
                   <option value="late">Late</option>
                   <option value="on_leave">On Leave</option>
                   <option value="unmarked">Unmarked</option>
                </select>
              </div>
            </div>

            <div className={styles.toolbarRight}>
              {selectedStaffIds.length > 0 && (
                <div className={styles.bulkActions}>
                  <span>{selectedStaffIds.length} Selected</span>
                  <button onClick={() => handleBulkMark('present')} className={styles.actionBtn}>Mark Present</button>
                  <button onClick={() => handleBulkMark('absent')} className={styles.actionBtn} style={{color:'#ef4444'}}>Mark Absent</button>
                </div>
              )}
              <button className={styles.primaryBtn} onClick={() => loadAttendance(selectedDate, search, deptFilter, statusFilter)}>
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      className={styles.checkbox} 
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedStaffIds([]);
                        else setSelectedStaffIds(attendance.map(a => a.staff_id));
                      }}
                    />
                  </th>
                  <th>Staff Member</th>
                  <th>Status</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Working Hours</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 && (
                  <tr><td colSpan={8} className={styles.emptyCell}>No staff records found.</td></tr>
                )}
                {attendance.map(a => (
                  <tr key={a.staff_id}>
                    <td>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox}
                        checked={selectedStaffIds.includes(a.staff_id)}
                        onChange={() => {
                          if (selectedStaffIds.includes(a.staff_id)) {
                            setSelectedStaffIds(selectedStaffIds.filter(id => id !== a.staff_id));
                          } else {
                            setSelectedStaffIds([...selectedStaffIds, a.staff_id]);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className={styles.staffCell}>
                        <span className={styles.staffName}>{a.staff_name}</span>
                        <span className={styles.roleTag}>{a.role}</span>
                      </div>
                    </td>
                    <td>
                      <select 
                        className={styles.select} 
                        style={{width: 120}}
                        value={a.status}
                        onChange={e => handleInlineUpdate(a, 'status', e.target.value)}
                      >
                         <option value="unmarked">Unmarked</option>
                         <option value="present">Present</option>
                         <option value="absent">Absent</option>
                         <option value="late">Late</option>
                         <option value="on_leave">On Leave</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="time" 
                        className={styles.timeInput}
                        value={a.in_time || ''}
                        onChange={e => handleInlineUpdate(a, 'in_time', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="time" 
                        className={styles.timeInput}
                        value={a.out_time || ''}
                        onChange={e => handleInlineUpdate(a, 'out_time', e.target.value)}
                      />
                    </td>
                    <td>
                      <span className={styles.workingHours}>{a.working_hours ? `${a.working_hours}h` : '--'}</span>
                      {a.overtime > 0 && <div className={styles.overtime}>+{a.overtime}h OT</div>}
                    </td>
                    <td>
                      <input 
                        className={styles.searchInput} 
                        style={{fontSize:11, padding: '4px 8px'}} 
                        placeholder="Add note..."
                        value={a.remarks || ''}
                        onChange={e => handleInlineUpdate(a, 'remarks', e.target.value)}
                      />
                    </td>
                    <td>
                       <button className={styles.actionBtn} onClick={() => push('History view coming soon', 'info')}>
                         <ChevronRight size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaves = () => {
    const pending = leaves.filter(l => l.status === 'pending');
    
    return (
      <div className={styles.tabPanel}>
        <div className={styles.tableToolbar} style={{marginBottom: 16}}>
           <div className={styles.toolbarLeft}>
             <div className={styles.filterGroup}>
                <select className={styles.select} value={leavesDeptFilter} onChange={e => setLeavesDeptFilter(e.target.value)}>
                   <option value="">All Roles</option>
                   <option value="Academic">Academic</option>
                   <option value="Admin">Admin</option>
                   <option value="Accounts">Accounts</option>
                   <option value="Accountant">Accountant</option>
                   <option value="Class Teacher">Class Teacher</option>
                   <option value="Driver">Driver</option>
                   <option value="Guidance Counselor">Guidance Counselor</option>
                   <option value="Principal">Principal</option>
                   <option value="staff">Staff</option>
                   <option value="student">Student</option>
                   <option value="Subject Teacher">Subject Teacher</option>
                   <option value="super_admin">Super Admin</option>
                   <option value="Support Staff">Support Staff</option>
                   <option value="Teacher">Teacher</option>
                   <option value="Warden">Warden</option>
                   <option value="Unassigned">Unassigned</option>
                </select>
             </div>
           </div>
        </div>

        <div className={styles.chartsGrid} style={{marginBottom: 24}}>
          <div className={styles.chartCard}>
             <div className={styles.chartHeader}><h3>Staff Leave Balances</h3></div>
             <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Casual</th>
                      <th>Sick</th>
                      <th>Earned</th>
                      <th>Total Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map(lb => {
                      const casual = lb.balances.find(b => b.leave_type === 'casual');
                      const sick = lb.balances.find(b => b.leave_type === 'sick');
                      const earned = lb.balances.find(b => b.leave_type === 'earned');
                      
                      // Formula: earned_total - (casual_used + sick_used + earned_used) 
                      // which is effectively earned_remaining - casual_used - sick_used
                      const totalBalance = (earned?.remaining || 0) - (casual?.used || 0) - (sick?.used || 0);

                      return (
                        <tr key={lb.staff_id}>
                          <td>{lb.staff_name}</td>
                          {['casual', 'sick', 'earned'].map(type => {
                            const bal = lb.balances.find(b => b.leave_type === type);
                            const isRemaining = type === 'earned';
                            const val = isRemaining ? (bal?.remaining || 0) : (bal?.used || 0);
                            const label = isRemaining ? 'left' : 'taken';
                            
                            return (
                              <td key={type}>
                                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                  <span style={{fontWeight:800, color: !isRemaining && val > 0 ? '#991b1b' : 'inherit'}}>{val}</span>
                                  <span style={{fontSize:10, opacity:0.6}}>{label}</span>
                                </div>
                              </td>
                            );
                          })}
                          <td>
                            <div className={styles.balItem} style={{width:'fit-content', padding:'2px 8px', background: totalBalance < 0 ? '#fee2e2' : '#f0f9ff', color: totalBalance < 0 ? '#991b1b' : '#075985'}}>
                               {totalBalance} days
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
          <div className={styles.insightCard} style={{justifyContent: 'center', alignItems: 'center'}}>
             <CalendarHeart size={48} color="var(--color-primary)" />
             <h3 style={{margin:0}}>{pending.length}</h3>
             <p style={{fontWeight:700, opacity:0.7}}>Pending Approvals</p>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
             <h3>Pending Requests</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && <tr><td colSpan={5} className={styles.emptyCell}>No pending leave requests.</td></tr>}
              {pending.map(l => (
                <tr key={l.id}>
                  <td className={styles.staffName}>{l.staff_name}</td>
                  <td><span className={`${styles.badge} ${styles.badge_leave}`}>{l.leave_type}</span></td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span>{l.from_date}</span>
                      <span style={{fontSize:10, opacity:0.6}}>to {l.to_date}</span>
                    </div>
                  </td>
                  <td className={styles.smallText}>{l.reason}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <button className={styles.actionBtn} onClick={() => handleLeaveStatus(l.id, 'approved')} style={{color:'#10b981'}}>
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button className={styles.actionBtn} onClick={() => handleLeaveStatus(l.id, 'rejected')} style={{color:'#ef4444'}}>
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    return (
      <div className={styles.tabPanel}>
        <div className={styles.reportToolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.filterGroup}>
              <select className={styles.select} value={reportsDeptFilter} onChange={e => setReportsDeptFilter(e.target.value)}>
                 <option value="">All Departments</option>
                 <option value="Academic">Academic</option>
                 <option value="Administration">Administration</option>
                 <option value="Finance & Accounts">Finance &amp; Accounts</option>
                 <option value="Student Support & Welfare">Student Support &amp; Welfare</option>
                 <option value="Operations & Support">Operations &amp; Support</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <input 
                type="month" 
                className={styles.monthPicker} 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
          
          <div className={styles.reportActions}>
            <button className={styles.downloadBtn} onClick={handleExportReport} title="Download Monthly Summary">
               <Download size={20} />
            </button>
          </div>
        </div>

        {monthlyReport && (
          <div className={styles.tableCard} style={{marginTop: 24}}>
             <div className={styles.tableHeader} style={{padding: '24px 20px'}}>
                <h3 style={{margin: 0, fontSize: '1.25rem', color: 'var(--theme-text-primary)'}}>
                  Monthly Summary: {selectedMonth}
                </h3>
             </div>
             <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Dept.</th>
                      <th>Working Days</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Leaves</th>
                      <th>Payable Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.report.map(row => (
                      <tr key={row.staff_id}>
                        <td className={styles.staffName}>{row.staff_name}</td>
                        <td>{row.department}</td>
                        <td>{row.total_working_days}</td>
                        <td style={{color:'#10b981', fontWeight:800}}>{row.days_present}</td>
                        <td style={{color:'#ef4444', fontWeight:800}}>{row.days_absent}</td>
                        <td>{row.late_count}</td>
                        <td>{row.days_leave}</td>
                        <td style={{background:'var(--theme-bg)', fontWeight:900}}>{row.payable_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {!monthlyReport && (
          <div className={styles.emptyState} style={{marginTop: 24}}>
             <Download size={48} opacity={0.2} />
             <h3>Payroll-Ready Reports</h3>
             <p>Generate monthly attendance summaries with auto-calculated payable days and leave deductions.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.tabsStrip}>
          <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabActive : ''}`} onClick={() => handleTabChange('overview')}>
            <TrendingUp size={16} /> Overview
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.tabActive : ''}`} onClick={() => handleTabChange('attendance')}>
            <ClipboardCheck size={16} /> Daily Attendance
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'leaves' ? styles.tabActive : ''}`} onClick={() => handleTabChange('leaves')}>
             <CalendarHeart size={16} /> Leaves
             {leaves.filter(l => l.status === 'pending').length > 0 && <span className={styles.ping}>{leaves.filter(l => l.status === 'pending').length}</span>}
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.tabActive : ''}`} onClick={() => handleTabChange('reports')}>
            <Download size={16} /> Reports
          </button>
        </div>

        <div className={styles.datePickerRow}>
          <Calendar size={18} color="var(--color-primary)" />
          <input 
            type="date" 
            className={styles.calendarInput}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'leaves' && renderLeaves()}
        {activeTab === 'reports' && renderReports()}
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default function StaffHR() {
  return (
    <ErrorBoundary>
      <StaffHRView />
    </ErrorBoundary>
  );
}
