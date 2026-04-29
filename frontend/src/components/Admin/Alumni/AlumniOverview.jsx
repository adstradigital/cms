'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, Clock, GraduationCap, Plus, Send, Users } from 'lucide-react';
import alumniApi from '@/api/alumniApi';

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function AlumniOverview() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_alumni_count: 0,
    recently_added_alumni: 0,
    pending_approvals: 0,
    upcoming_events: 0,
  });
  const [pendingList, setPendingList] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const statCards = useMemo(
    () => [
      {
        label: 'Total Alumni Count',
        value: stats.total_alumni_count ?? 0,
        icon: <Users size={24} />,
        color: '#2563EB',
        bg: '#EFF6FF',
      },
      {
        label: 'Recently Added Alumni',
        value: stats.recently_added_alumni ?? 0,
        icon: <Clock size={24} />,
        color: '#059669',
        bg: '#ECFDF5',
      },
      {
        label: 'Pending Approvals',
        value: stats.pending_approvals ?? 0,
        icon: <CheckCircle size={24} />,
        color: '#D97706',
        bg: '#FFFBEB',
      },
      {
        label: 'Upcoming Events',
        value: stats.upcoming_events ?? 0,
        icon: <Calendar size={24} />,
        color: '#7C3AED',
        bg: '#F5F3FF',
      },
    ],
    [stats]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [dashRes, pendingRes, eventsRes] = await Promise.all([
          alumniApi.getDashboard(),
          alumniApi.listAlumni({ status: 'pending' }),
          alumniApi.listEvents({ upcoming: true }),
        ]);

        setStats(dashRes.data || {});
        setPendingList(normalizeList(pendingRes.data).slice(0, 5));
        setUpcomingEvents(normalizeList(eventsRes.data).slice(0, 5));
      } catch (error) {
        console.error('Failed to load alumni dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const handleApprove = async (id) => {
    try {
      await alumniApi.approveAlumni(id);
      const res = await alumniApi.listAlumni({ status: 'pending' });
      setPendingList(normalizeList(res.data).slice(0, 5));
      const dashRes = await alumniApi.getDashboard();
      setStats(dashRes.data || {});
    } catch (e) {
      console.error(e);
      alert('Approve failed.');
    }
  };

  const handleReject = async (id) => {
    try {
      await alumniApi.rejectAlumni(id);
      const res = await alumniApi.listAlumni({ status: 'pending' });
      setPendingList(normalizeList(res.data).slice(0, 5));
      const dashRes = await alumniApi.getDashboard();
      setStats(dashRes.data || {});
    } catch (e) {
      console.error(e);
      alert('Reject failed.');
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--theme-text-muted)', padding: '40px', textAlign: 'center' }}>
        Loading alumni dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: 'var(--theme-bg-white)',
              border: '1px solid var(--theme-border-subtle)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: card.bg,
                color: card.color,
                padding: '12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.icon}
            </div>
            <div>
              <p style={{ color: 'var(--theme-text-muted)', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--theme-text)' }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div
        style={{
          backgroundColor: 'var(--theme-bg-subtle)',
          border: '1px solid var(--theme-border-subtle)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#EEF2FF',
              borderRadius: 12,
              color: '#4F46E5',
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--theme-text)' }}>Quick Actions</div>
            <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Add alumni, send announcements, create events</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/admins/alumni/management')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'var(--theme-text)',
            }}
          >
            <Plus size={18} /> Add Alumni
          </button>
          <button
            onClick={() => router.push('/admins/alumni/communication')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'var(--theme-text)',
            }}
          >
            <Send size={18} /> Send Announcement
          </button>
          <button
            onClick={() => router.push('/admins/alumni/events')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--theme-border-subtle)',
              background: 'var(--theme-bg-white)',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'var(--theme-text)',
            }}
          >
            <Calendar size={18} /> Create Event
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        {/* Pending approvals */}
        <div
          style={{
            backgroundColor: 'var(--theme-bg-white)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--theme-text)' }}>Pending Approvals</h3>
            <button
              onClick={() => router.push('/admins/alumni/approvals')}
              style={{ color: 'var(--theme-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View All
            </button>
          </div>

          {pendingList.length === 0 ? (
            <div style={{ color: 'var(--theme-text-muted)', textAlign: 'center', padding: '24px' }}>
              No pending alumni registrations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingList.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--theme-bg-subtle)',
                    border: '1px solid var(--theme-border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--theme-text)' }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                      {a.graduation_year} {a.organization ? `• ${a.organization}` : ''} {a.location ? `• ${a.location}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleApprove(a.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#DCFCE7',
                        color: '#166534',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(a.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div
          style={{
            backgroundColor: 'var(--theme-bg-white)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--theme-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--theme-text)' }}>Upcoming Events</h3>
            <button
              onClick={() => router.push('/admins/alumni/events')}
              style={{ color: 'var(--theme-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Manage
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ color: 'var(--theme-text-muted)', textAlign: 'center', padding: '24px' }}>No upcoming events.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--theme-bg-subtle)',
                    border: '1px solid var(--theme-border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--theme-text)' }}>{e.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                    {new Date(e.start_at).toLocaleString()} {e.venue ? `• ${e.venue}` : ''}
                  </div>
                  {e.rsvp_counts ? (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--theme-text-muted)' }}>
                      RSVP: {e.rsvp_counts.going || 0} going • {e.rsvp_counts.maybe || 0} maybe • {e.rsvp_counts.not_going || 0} not going
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

