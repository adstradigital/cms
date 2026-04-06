'use client';

import React, { useState, useEffect } from 'react';
import { ListTodo, CalendarDays, UsersRound, Plus, MoreVertical, Calendar } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastStack, useToast } from '@/components/common/useToast';
import styles from './TasksEvents.module.css';

const TasksEventsView = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(false);
  const { toasts, push, dismiss } = useToast();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    const loadAll = async () => {
        setLoading(true);
        try {
            const [tRes, eRes, cRes] = await Promise.all([
                adminApi.getStaffTasks(),
                adminApi.getEvents(),
                adminApi.getClubs()
            ]);
            setTasks(Array.isArray(tRes.data) ? tRes.data : []);
            setEvents(Array.isArray(eRes.data) ? eRes.data : []);
            setClubs(Array.isArray(cRes.data) ? cRes.data : []);
        } catch (err) {
            push('Failed to load data.', 'error');
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
                       <td><button className={styles.iconBtn}><MoreVertical size={16}/></button></td>
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
                   <th>Total Activities</th>
               </tr>
           </thead>
           <tbody>
               {clubs.map(c => (
                   <tr key={c.id}>
                       <td className={styles.strongText}>{c.name}</td>
                       <td>{c.advisor_name || 'No Advisor'}</td>
                       <td>{c.meeting_schedule}</td>
                       <td>{c.activities?.length || 0} Logs</td>
                   </tr>
               ))}
               {clubs.length === 0 && !loading && <tr><td colSpan={4} style={{textAlign:'center', padding:40}}>No clubs registered.</td></tr>}
           </tbody>
       </table>
    </div>
  );

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
        <button className={styles.actionBtn}>
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
