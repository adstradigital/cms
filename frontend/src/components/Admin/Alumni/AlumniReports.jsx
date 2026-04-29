'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import alumniApi from '@/api/alumniApi';

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function AlumniReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    alumni_by_year: [],
    career_distribution: [],
    verification: { verified: 0, unverified: 0 },
  });
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [repRes, eventsRes] = await Promise.all([alumniApi.getReports(), alumniApi.listEvents()]);
        setData(repRes.data || {});
        setEvents(normalizeList(eventsRes.data));
      } catch (e) {
        console.error(e);
        alert('Failed to load reports.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const engagement = useMemo(() => {
    const totalEvents = events.length;
    let totalRsvps = 0;
    let going = 0;
    let maybe = 0;
    let notGoing = 0;

    events.forEach((e) => {
      const c = e.rsvp_counts || {};
      going += Number(c.going || 0);
      maybe += Number(c.maybe || 0);
      notGoing += Number(c.not_going || 0);
      totalRsvps += Number(c.going || 0) + Number(c.maybe || 0) + Number(c.not_going || 0);
    });

    return { totalEvents, totalRsvps, going, maybe, notGoing };
  }, [events]);

  if (loading) {
    return (
      <div style={{ color: 'var(--theme-text-muted)', padding: '40px', textAlign: 'center' }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EFF6FF',
            borderRadius: 12,
            color: '#2563EB',
          }}
        >
          <BarChart3 size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Reports & Analytics</div>
          <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>Batch distribution, career insights, and engagement stats</div>
        </div>
      </div>

      {/* Top cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, padding: 16, background: 'var(--theme-bg-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} />
            <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Verification</div>
          </div>
          <div style={{ marginTop: 10, color: 'var(--theme-text-muted)', fontSize: 13 }}>
            Verified: <b style={{ color: 'var(--theme-text)' }}>{data?.verification?.verified ?? 0}</b> • Unverified:{' '}
            <b style={{ color: 'var(--theme-text)' }}>{data?.verification?.unverified ?? 0}</b>
          </div>
        </div>

        <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, padding: 16, background: 'var(--theme-bg-white)' }}>
          <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>Engagement</div>
          <div style={{ marginTop: 10, color: 'var(--theme-text-muted)', fontSize: 13 }}>
            Events: <b style={{ color: 'var(--theme-text)' }}>{engagement.totalEvents}</b> • RSVP responses:{' '}
            <b style={{ color: 'var(--theme-text)' }}>{engagement.totalRsvps}</b>
          </div>
          <div style={{ marginTop: 6, color: 'var(--theme-text-muted)', fontSize: 13 }}>
            Going: <b style={{ color: 'var(--theme-text)' }}>{engagement.going}</b> • Maybe:{' '}
            <b style={{ color: 'var(--theme-text)' }}>{engagement.maybe}</b> • Not going:{' '}
            <b style={{ color: 'var(--theme-text)' }}>{engagement.notGoing}</b>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Alumni by year */}
        <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', fontWeight: 900, color: 'var(--theme-text)', background: 'var(--theme-bg-subtle)' }}>Alumni by batch/year</div>
          <div>
            {(data?.alumni_by_year || []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No data.</div>
            ) : (
              (data.alumni_by_year || []).map((row) => (
                <div
                  key={row.graduation_year}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderTop: '1px solid var(--theme-border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{row.graduation_year}</div>
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{row.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Career distribution */}
        <div style={{ border: '1px solid var(--theme-border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', fontWeight: 900, color: 'var(--theme-text)', background: 'var(--theme-bg-subtle)' }}>Career distribution (top)</div>
          <div>
            {(data?.career_distribution || []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--theme-text-muted)' }}>No data.</div>
            ) : (
              (data.career_distribution || []).map((row) => (
                <div
                  key={row.industry}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderTop: '1px solid var(--theme-border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{row.industry}</div>
                  <div style={{ fontWeight: 900, color: 'var(--theme-text)' }}>{row.count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

