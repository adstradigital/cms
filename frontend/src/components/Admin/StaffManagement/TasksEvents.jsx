'use client';

import React, { useState, useEffect } from 'react';
import { ListTodo, CalendarDays, UsersRound, Plus, MoreVertical, Calendar } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './TasksEvents.module.css';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const TasksEventsView = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(false);
  const { toasts, push, dismiss } = useToast();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Task fields
    title: '', description: '', assigned_to: '', deadline: '', priority: 'medium',
    // Event fields
    date: '', status: 'planning',
    // Club fields
    name: '', advisor: '', meeting_schedule: ''
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium', date: '', status: 'planning', name: '', advisor: '', meeting_schedule: '' });
    setEditItem(null);
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
        if (type === 'event') await adminApi.deleteEvent(id);
        else if (type === 'club') await adminApi.deleteClub(id);
        push(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
        // Refresh
        const res = type === 'event' ? await adminApi.getEvents() : await adminApi.getClubs();
        if (type === 'event') setEvents(normalizeList(res.data));
        else setClubs(normalizeList(res.data));
    } catch (err) {
        push('Failed to delete item.', 'error');
    }
  };

  const handleEdit = (type, item) => {
    setEditItem(item);
    setActiveMenuId(null);
    if (type === 'event') {
        setFormData({ ...formData, title: item.title, description: item.description, date: item.date, status: item.status });
    } else if (type === 'club') {
        setFormData({ ...formData, name: item.name, advisor: item.advisor, meeting_schedule: item.meeting_schedule });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    const loadAll = async () => {
        setLoading(true);
        try {
            const [tRes, eRes, cRes, sRes] = await Promise.all([
                adminApi.getStaffTasks(),
                adminApi.getEvents(),
                adminApi.getClubs(),
                adminApi.getStaff()
            ]);
            setTasks(normalizeList(tRes.data));
            setEvents(normalizeList(eRes.data));
            setClubs(normalizeList(cRes.data));
            setStaffList(normalizeList(sRes.data));
        } catch (err) {
            push('Failed to load dashboard data. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };
    loadAll();
  }, [push]);

  const renderTasks = () => (
    <div className={styles.boardGrid}>
        <div className={styles.taskColumn}>
           <div className={styles.colHeader}>Pending Tasks</div>
           {tasks.filter(t => t.status === 'pending').map(t => (
               <div key={t.id} className={styles.taskCard}>
                   <div className={styles.taskPri}>
                       <span className={`${styles.priBadge} ${styles['pri_' + t.priority]}`}>{t.priority}</span>
                   </div>
                   <h4>{t.title}</h4>
                   <p className={styles.taskDesc}>{t.description}</p>
                   <div className={styles.taskMeta}>
                       <div className={styles.assignedTo}><UsersRound size={12}/> {t.assigned_to_name}</div>
                       <div className={styles.deadline}><Calendar size={12}/> {t.deadline.substring(0,10)}</div>
                   </div>
               </div>
           ))}
        </div>
        <div className={styles.taskColumn}>
           <div className={styles.colHeader}>Extension Requested</div>
           {tasks.filter(t => t.status === 'extension_requested').map(t => (
               <div key={t.id} className={styles.taskCard}>
                   <h4>{t.title}</h4>
                   <div className={styles.taskMeta}>
                       <div className={styles.assignedTo}><UsersRound size={12}/> {t.assigned_to_name}</div>
                   </div>
               </div>
           ))}
        </div>
        <div className={styles.taskColumn}>
           <div className={styles.colHeader}>Completed</div>
           {tasks.filter(t => t.status === 'completed').map(t => (
               <div key={t.id} className={`${styles.taskCard} ${styles.completedCard}`}>
                   <h4 style={{textDecoration: 'line-through'}}>{t.title}</h4>
                   <div className={styles.taskMeta}>
                       <div className={styles.assignedTo}>{t.assigned_to_name}</div>
                   </div>
               </div>
           ))}
        </div>
    </div>
  );

  const renderEvents = () => (
    <div className={styles.listContainer}>
       <table className={styles.table}>
           <thead>
               <tr>
                   <th>Date</th>
                   <th>Event Title</th>
                   <th>Status</th>
                   <th>Coordinators</th>
                   <th>Action</th>
               </tr>
           </thead>
           <tbody>
               {events.map(e => (
                   <tr key={e.id}>
                       <td className={styles.monoText}>{e.date}</td>
                       <td className={styles.strongText}>{e.title}</td>
                       <td><span className={styles.statusBadge}>{e.status}</span></td>
                       <td>{(e.coordinators_details || []).map(c=>c.name).join(', ') || 'Unassigned'}</td>
                       <td className={styles.actionCell}>
                            <button className={styles.iconBtn} onClick={() => toggleMenu(`event-${e.id}`)}>
                                <MoreVertical size={16}/>
                            </button>
                            {activeMenuId === `event-${e.id}` && (
                                <div className={styles.actionMenu}>
                                    <button onClick={() => handleEdit('event', e)}>Edit</button>
                                    <button onClick={() => handleDelete('event', e.id)} className={styles.deleteBtn}>Delete</button>
                                </div>
                            )}
                        </td>
                   </tr>
               ))}
               {events.length === 0 && !loading && <tr><td colSpan={5} style={{textAlign:'center', padding:40}}>No events scheduled.</td></tr>}
           </tbody>
       </table>
    </div>
  );
 
  const renderClubs = () => (
    <div className={styles.listContainer}>
       <table className={styles.table}>
           <thead>
               <tr>
                   <th>Club Name</th>
                   <th>Advisor</th>
                   <th>Meeting Schedule</th>
                   <th>Action</th>
               </tr>
           </thead>
           <tbody>
               {clubs.map(c => (
                   <tr key={c.id}>
                       <td className={styles.strongText}>{c.name}</td>
                       <td>{c.advisor_name || 'No Advisor'}</td>
                       <td>{c.meeting_schedule}</td>
                       <td className={styles.actionCell}>
                            <button className={styles.iconBtn} onClick={() => toggleMenu(`club-${c.id}`)}>
                                <MoreVertical size={16}/>
                            </button>
                            {activeMenuId === `club-${c.id}` && (
                                <div className={styles.actionMenu}>
                                    <button onClick={() => handleEdit('club', c)}>Edit</button>
                                    <button onClick={() => handleDelete('club', c.id)} className={styles.deleteBtn}>Delete</button>
                                </div>
                            )}
                        </td>
                   </tr>
               ))}
               {clubs.length === 0 && !loading && <tr><td colSpan={4} style={{textAlign:'center', padding:40}}>No clubs registered.</td></tr>}
           </tbody>
       </table>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        if (activeTab === 'tasks') {
            const payload = {
                title: formData.title,
                description: formData.description,
                assigned_to: formData.assigned_to,
                deadline: formData.deadline,
                priority: formData.priority
            };
            await adminApi.createStaffTask(payload);
            push('Task assigned successfully.', 'success');
            const res = await adminApi.getStaffTasks();
            setTasks(normalizeList(res.data));
        } else if (activeTab === 'events') {
            const payload = {
                title: formData.title,
                description: formData.description,
                date: formData.date,
                status: formData.status
            };
            if (editItem) {
                await adminApi.updateEvent(editItem.id, payload);
                push('Event updated successfully.', 'success');
            } else {
                await adminApi.createEvent(payload);
                push('Event created successfully.', 'success');
            }
            const res = await adminApi.getEvents();
            setEvents(normalizeList(res.data));
        } else {
            const payload = {
                name: formData.name,
                advisor: formData.advisor,
                meeting_schedule: formData.meeting_schedule
            };
            if (editItem) {
                await adminApi.updateClub(editItem.id, payload);
                push('Club updated successfully.', 'success');
            } else {
                await adminApi.createClub(payload);
                push('Club registered successfully.', 'success');
            }
            const res = await adminApi.getClubs();
            setClubs(normalizeList(res.data));
        }
        setIsModalOpen(false);
        resetForm();
    } catch (err) {
        push(err.response?.data?.error || 'Operation failed.', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const renderModal = () => {
    if (!isModalOpen) return null;
    return (
        <div className={styles.modalOverlay} onClick={() => { setIsModalOpen(false); setEditItem(null); }}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>
                        {editItem ? `Edit ${activeTab === 'events' ? 'Event' : 'Club'}` : 
                         (activeTab === 'tasks' ? 'Assign New Task' : activeTab === 'events' ? 'Schedule New Event' : 'Register New Club')}
                    </h3>
                    <button className={styles.closeBtn} onClick={() => { setIsModalOpen(false); setEditItem(null); }}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {activeTab === 'tasks' && (
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Task Title</label>
                                    <input required placeholder="E.g. Submit Attendance Report" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Assigned To</label>
                                    <select required value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                                        <option value="">Select Staff</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Deadline</label>
                                    <input type="date" required value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})}/>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Priority</label>
                                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Brief Description</label>
                                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What needs to be done?" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'events' && (
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Event Title</label>
                                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Event Date</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Description</label>
                                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'clubs' && (
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Club Name</label>
                                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Advisor</label>
                                    <select required value={formData.advisor} onChange={e => setFormData({...formData, advisor: e.target.value})}>
                                        <option value="">Select Staff</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Meeting Schedule</label>
                                    <input required placeholder="E.g. Every Friday, 2PM" value={formData.meeting_schedule} onChange={e => setFormData({...formData, meeting_schedule: e.target.value})} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Complete Action'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.tabsStrip}>
          <button className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.tabActive : ''}`} onClick={() => setActiveTab('tasks')}>
            <ListTodo size={16}/> Staff Tasks
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'events' ? styles.tabActive : ''}`} onClick={() => setActiveTab('events')}>
            <CalendarDays size={16}/> School Events
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'clubs' ? styles.tabActive : ''}`} onClick={() => setActiveTab('clubs')}>
            <UsersRound size={16}/> Clubs Registry
          </button>
        </div>
         <button className={styles.actionBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            {activeTab === 'tasks' ? 'Assign Task' : activeTab === 'events' ? 'New Event' : 'New Club'}
         </button>
      </div>

      <div className={styles.contentArea}>
         {loading ? <div style={{padding:40, textAlign:'center'}}>Loading data...</div> : (
             <>
                {activeTab === 'tasks' && renderTasks()}
                {activeTab === 'events' && renderEvents()}
                {activeTab === 'clubs' && renderClubs()}
             </>
         )}
      </div>

      {renderModal()}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default function TasksEvents() {
  return (
    <ErrorBoundary>
      <TasksEventsView />
    </ErrorBoundary>
  );
}
