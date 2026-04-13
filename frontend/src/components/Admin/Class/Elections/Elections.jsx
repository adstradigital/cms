'use client';

import React, { useMemo, useState } from 'react';
import { Award, Fingerprint, Layout, Plus, RefreshCw, StopCircle, UserCheck, X, ArrowRight, BarChart2 } from 'lucide-react';
import styles from './Elections.module.css';
import instance from '@/api/instance';
import adminApi from '@/api/adminApi';
import KioskTerminal from './KioskTerminal';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { ToastStack, useToast } from '@/components/common/useToast';

let electionsCache = null;

const ElectionsView = ({ section = null, sections = [] }) => {
  const [view, setView] = useState('setup');
  const [status, setStatus] = useState('draft');
  const [electionId, setElectionId] = useState(null);
  const [internalSectionId, setInternalSectionId] = useState(section?.id || '');
  const [election, setElection] = useState({
    title: '',
    className: section ? `${section.class_name || 'Class'}-${section.name}` : 'Grade 10-A',
    role: 'Class Leader',
    candidates: [],
  });
  const [votes, setVotes] = useState({});
  const [candidateInput, setCandidateInput] = useState('');
  const [candidateImage, setCandidateImage] = useState(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [votedRolls, setVotedRolls] = useState(new Set());
  const [localSections, setLocalSections] = useState(sections || []);
  const { toasts, push, dismiss } = useToast();

  // Fail-safe: Fetch sections if they aren't provided by parent
  React.useEffect(() => {
    const refreshSections = async () => {
      if (localSections.length === 0) {
        try {
          const res = await adminApi.getSections();
          const list = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
          setLocalSections(list);
        } catch (err) {
          console.error("Election Console: Failed to load local sections", err);
        }
      }
    };
    refreshSections();
  }, []);

  // Sync with parent sections if they change
  React.useEffect(() => {
    if (sections && sections.length > 0) {
      setLocalSections(sections);
    }
  }, [sections]);

  React.useEffect(() => {
    if (!electionsCache) return;
    setElection(electionsCache.election);
    setVotes(electionsCache.votes || {});
    setStatus(electionsCache.status || 'draft');
    setElectionId(electionsCache.electionId || null);
  }, []);

  React.useEffect(() => {
    if (section?.id) {
      setInternalSectionId(section.id);
      setElection((prev) => ({ ...prev, className: `${section.class_name || 'Class'}-${section.name}` }));
    }
  }, [section]);

  React.useEffect(() => {
    electionsCache = { election, votes, status, electionId };
  }, [election, votes, status, electionId]);

  const totalVotes = useMemo(() => Object.values(votes).reduce((a, b) => a + b, 0), [votes]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCandidateImage(reader.result);
    reader.readAsDataURL(file);
  };

  const addCandidate = () => {
    if (!candidateInput.trim()) return;
    const candidate = { id: Date.now(), name: candidateInput.trim(), image: candidateImage || null };
    setElection((prev) => ({ ...prev, candidates: [...prev.candidates, candidate] }));
    setCandidateInput('');
    setCandidateImage(null);
  };

  const startElection = async () => {
    if (!election.title || election.candidates.length < 2) return;
    
    const isSchoolWide = ['School Leader', 'Head Boy', 'Head Girl', 'President'].includes(election.role);
    
    if (!internalSectionId && !isSchoolWide) {
      push('Please select a class/section for this election.', 'error');
      return;
    }
    try {
      const res = await instance.post('/elections/', {
        section: isSchoolWide ? null : internalSectionId,
        title: election.title,
        role: election.role,
        candidates: election.candidates.map((c) => ({ name: c.name, image: c.image || null })),
      });
      const serverElection = res?.data;
      setElectionId(serverElection?.id || null);
      setElection((prev) => ({
        ...prev,
        title: serverElection?.title || prev.title,
        role: serverElection?.role || prev.role,
        candidates: (serverElection?.candidates || []).map((c) => ({ id: c.id, name: c.name, image: c.image_data || null })),
      }));
      const initialVotes = {};
      (serverElection?.candidates || []).forEach((c) => { initialVotes[c.id] = 0; });
      setVotes(initialVotes);
      setStatus('ongoing');
      setView('dashboard');
      push('Election session started', 'success');
    } catch {
      push('Failed to start election', 'error');
    }
  };

  const launchKiosk = async () => {
    try {
      if (document.fullscreenElement == null) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {
      // fullscreen may be blocked by browser policy
    }
    setView('kiosk');
  };

  const exitKiosk = async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen?.(); } catch {}
    }
    setView('dashboard');
  };

  const checkRoll = async (rollNumber) => {
    try {
      const res = await instance.get('/elections/vote-status/', { params: { election: electionId, roll_number: rollNumber } }).catch(() => null);
      if (res?.data?.already_voted) return { alreadyVoted: true };
      if (votedRolls.has(rollNumber)) return { alreadyVoted: true };
      return { allowed: true };
    } catch {
      return { allowed: !votedRolls.has(rollNumber), alreadyVoted: votedRolls.has(rollNumber) };
    }
  };

  const submitVote = async ({ candidateId, rollNumber }) => {
    try {
      await instance.post('/elections/vote/', {
        election: electionId,
        candidate: candidateId,
        roll_number: rollNumber,
      });
      setVotes((prev) => ({ ...prev, [candidateId]: (prev[candidateId] || 0) + 1 }));
      setVotedRolls((prev) => new Set(prev).add(rollNumber));
      return true;
    } catch {
      push('Vote could not be recorded. Please retry.', 'error');
      return false;
    }
  };

  const sortedResults = useMemo(() => Object.entries(votes).map(([id, count]) => ({ id: Number(id), name: election.candidates.find((c) => c.id === Number(id))?.name || 'Candidate', count })).sort((a, b) => b.count - a.count), [votes, election.candidates]);
  const winner = sortedResults[0];

  const renderSetup = () => (
    <div className={styles.setupCard}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', padding: 24, background: '#f8fafc', borderRadius: '50%', marginBottom: 16, border: '1px solid #e2e8f0' }}><Fingerprint size={48} color="#1e293b" /></div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a' }}>
          {section ? `${section.class_name} — Section ${section.name} Election Console` : 'Election Console'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          {section ? `Class Teacher: ${section.class_teacher_name || 'Not assigned'} • ` : ''}
          Configure and deploy a secure voting terminal for this section.
        </p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Mandate Details</label>
        <div className={styles.setupGrid}>
          <input className={styles.input} placeholder="Official Election Title" value={election.title} onChange={(e) => setElection((prev) => ({ ...prev, title: e.target.value }))} />
          <select 
            className={styles.select} 
            value={internalSectionId} 
            onChange={(e) => setInternalSectionId(e.target.value)}
            disabled={['School Leader', 'Head Boy', 'Head Girl', 'President'].includes(election.role)}
          >
            <option value="">{['School Leader', 'Head Boy', 'Head Girl', 'President'].includes(election.role) ? 'School-Wide' : 'Select Class'}</option>
            {localSections.map(s => (
              <option key={s.id} value={s.id}>{s.class_name || 'Class'} - {s.name}</option>
            ))}
          </select>
          <select 
            className={styles.select} 
            value={election.role} 
            onChange={(e) => setElection((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option>Class Leader</option>
            <option>Assistant Leader</option>
            <option>Sports Prefect</option>
            <option>School Leader</option>
            <option>Head Boy</option>
            <option>Head Girl</option>
            <option>President</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Nomination List</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 56, height: 56, background: '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px dashed #e2e8f0' }} onClick={() => document.getElementById('candidate-photo-input').click()}>
            {candidateImage ? <img src={candidateImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Plus size={20} color="#94a3b8" />}
            <input id="candidate-photo-input" type="file" hidden accept="image/*" onChange={handleImageChange} />
          </div>
          <input className={styles.input} placeholder="Type student name..." value={candidateInput} onChange={(e) => setCandidateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCandidate()} />
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={addCandidate} style={{ height: 56, width: 64, justifyContent: 'center' }}><ArrowRight size={24} /></button>
        </div>
        <div className={styles.candidateGrid}>
          {election.candidates.map((candidate) => (
            <div key={candidate.id} className={styles.candidateCard}>
              <div className={styles.removeBtn} onClick={() => setElection((prev) => ({ ...prev, candidates: prev.candidates.filter((c) => c.id !== candidate.id) }))}><X size={14} /></div>
              <div className={styles.candidateAvatar} style={{ width: 60, height: 60, fontSize: 20, overflow: 'hidden' }}>{candidate.image ? <img src={candidate.image} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : candidate.name.split(' ').map((n) => n[0]).join('')}</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{candidate.name}</div>
            </div>
          ))}
        </div>
      </div>

      <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', marginTop: 32, padding: 24, fontSize: 20, justifyContent: 'center', height: 'auto' }} disabled={!election.title || election.candidates.length < 2} onClick={startElection}>
        GO LIVE
      </button>
    </div>
  );

  const renderDashboard = () => (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>{election.title}</h2>
          <p>
            {section ? `${section.class_name} — Section ${section.name}` : election.className} • {election.role}
            {section?.class_teacher_name && ` • Class Teacher: ${section.class_teacher_name}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={launchKiosk}><Layout size={20} /> Launch Kiosk Terminal</button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setConfirmEndOpen(true)}><StopCircle size={20} /> End Session</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        <div className={styles.setupCard} style={{ margin: 0, padding: 40, border: '2px solid #e2e8f0' }}>
          <h4 className={styles.label}>Real-time Turnout</h4>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#2563eb', margin: '20px 0' }}>{totalVotes}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700 }}><RefreshCw size={18} className={styles.spin} /> SECURE FEED ACTIVE</div>
        </div>
        <div className={styles.setupCard} style={{ margin: 0, padding: 40, gridColumn: 'span 2', border: '2px solid #e2e8f0' }}>
          <h4 className={styles.label}>Auditor Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 16 }}><p style={{ margin: '0 0 4px', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>ENCRYPTION</p><span style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Server Verified</span></div>
            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 16 }}><p style={{ margin: '0 0 4px', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>RESULT VISIBILITY</p><span style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>Obfuscated</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className={styles.resultsContainer}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div style={{ display: 'inline-flex', padding: 24, background: '#f8fafc', borderRadius: '50%', marginBottom: 16, border: '2px solid #e2e8f0' }}><Award size={64} color="#f59e0b" /></div>
        <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Official Results Declaration</h2>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Total Valid Ballots: <b>{totalVotes}</b></p>
      </div>
      <div className={styles.resultsGrid}>
        <div className={styles.winnerCard}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>{winner?.name || 'No votes yet'}</h1>
          <div style={{ padding: '8px 24px', background: '#f59e0b', color: 'white', borderRadius: 100, fontSize: 18, fontWeight: 900, marginBottom: 24, display: 'inline-block' }}>ELECTED REPRESENTATIVE</div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{winner?.count || 0} Votes</div>
        </div>
        <div className={styles.chartContainer}>
          <h3 className={styles.label}>Consolidated Audit</h3>
          <div style={{ marginTop: 40 }}>
            {sortedResults.map((res) => (
              <div key={res.id} style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontWeight: 800, fontSize: 18 }}>{res.name}</span><span style={{ fontWeight: 900 }}>{res.count} Votes</span></div>
                <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${(res.count / (totalVotes || 1)) * 100}%`, background: winner?.id === res.id ? '#f59e0b' : '#3b82f6', height: '100%', borderRadius: 24 }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const fetchResults = async () => {
    if (!electionId) return;
    const res = await instance.get(`/elections/${electionId}/results/`).catch(() => null);
    const results = res?.data?.results || [];
    const nextVotes = {};
    results.forEach((r) => { nextVotes[r.id] = r.votes; });
    setVotes(nextVotes);
  };

  return (
    <div className={styles.container}>
      {view === 'setup' && renderSetup()}
      {view === 'dashboard' && renderDashboard()}
      {view === 'kiosk' && (
        <KioskTerminal
          election={election}
          onExit={exitKiosk}
          onCheckRoll={checkRoll}
          onSubmitVote={submitVote}
          onMarkSessionFinished={() => {}}
        />
      )}
      {view === 'results' && renderResults()}

      <ConfirmDialog
        open={confirmEndOpen}
        title="End Election Session"
        message="This will stop kiosk voting and open final results."
        confirmText="End Session"
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={async () => {
          setConfirmEndOpen(false);
          try {
            if (electionId) await instance.post(`/elections/${electionId}/end/`).catch(() => null);
            await fetchResults();
          } catch {}
          setStatus('ended');
          setView('results');
        }}
      />
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

const Elections = ({ section, sections }) => (
  <ErrorBoundary>
    <ElectionsView section={section} sections={sections} />
  </ErrorBoundary>
);

export default Elections;
