'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Fingerprint, UserCheck, X } from 'lucide-react';
import styles from './Elections.module.css';

const KioskTerminal = ({
  election,
  onExit,
  onCheckRoll,
  onSubmitVote,
  onMarkSessionFinished,
}) => {
  const [rollNumber, setRollNumber] = useState('');
  const [authState, setAuthState] = useState('entry'); // entry | checking | allowed | already_voted
  const [selectedId, setSelectedId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    let id;
    if (confirming) {
      id = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      const done = setTimeout(() => {
        setConfirming(false);
        setSelectedId(null);
        setRollNumber('');
        setAuthState('entry');
        onMarkSessionFinished?.();
      }, 8000);
      return () => {
        clearInterval(id);
        clearTimeout(done);
      };
    }
    return () => clearInterval(id);
  }, [confirming, onMarkSessionFinished]);

  const selectedCandidate = useMemo(() => election.candidates.find((c) => c.id === selectedId), [election, selectedId]);

  const verifyRoll = async () => {
    if (!rollNumber.trim()) return;
    setAuthState('checking');
    const result = await onCheckRoll(rollNumber.trim());
    if (result?.alreadyVoted) {
      setAuthState('already_voted');
      return;
    }
    if (result?.allowed) {
      setAuthState('allowed');
      return;
    }
    setAuthState('entry');
  };

  const confirmVote = async () => {
    if (!selectedCandidate) return;
    const ok = await onSubmitVote({ candidateId: selectedCandidate.id, rollNumber: rollNumber.trim() });
    if (ok) {
      setCountdown(8);
      setConfirming(true);
    }
  };

  if (confirming) {
    return (
      <div className={styles.confirmScreen}>
        <div className={styles.successIconContainer}><UserCheck size={100} color="#10b981" /></div>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#0f172a' }}>VOTE RECORDED</h1>
        <p style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 600 }}>Thank you for voting.</p>
        <div className={styles.countdownCircle}>
          <svg width="120" height="120">
            <circle cx="60" cy="60" r="56" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx="60" cy="60" r="56" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray="351" className={styles.countdownProgressAnimated} />
          </svg>
          <span className={styles.countdownValue}>{countdown}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.kioskOverlay}>
      <div className={styles.kioskHeader}>
        <p style={{ textTransform: 'uppercase', letterSpacing: 8, color: '#94a3b8', fontSize: 14, fontWeight: 800, marginBottom: 20 }}>OFFICIAL CAMPUS BALLOT</p>
        <h1>{election.title}</h1>
        <p>{election.className} • {election.role}</p>
      </div>

      {authState === 'entry' || authState === 'checking' ? (
        <div className={styles.kioskAuthCard}>
          <Fingerprint size={32} color="#2563eb" />
          <h3>Student Verification</h3>
          <p>Enter roll number to continue to ballot.</p>
          <input
            className={styles.input}
            placeholder="Roll number"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verifyRoll()}
          />
          <button className={styles.submitBtnLarge} style={{ padding: '14px 36px', fontSize: '1rem', marginTop: 10 }} onClick={verifyRoll} disabled={authState === 'checking'}>
            {authState === 'checking' ? 'Checking...' : 'Continue'}
          </button>
        </div>
      ) : null}

      {authState === 'already_voted' ? (
        <div className={styles.kioskAuthCard}>
          <CheckCircle2 size={34} color="#f59e0b" />
          <h3>Already Voted</h3>
          <p>This roll number has already cast a ballot.</p>
          <button className={styles.btnOutline} onClick={() => { setRollNumber(''); setAuthState('entry'); }}>Back</button>
        </div>
      ) : null}

      {authState === 'allowed' ? (
        <>
          <div className={styles.votingGrid}>
            {election.candidates.map((candidate) => (
              <div key={candidate.id} className={`${styles.voteCard} ${selectedId === candidate.id ? styles.voteCardActive : ''}`} onClick={() => setSelectedId(candidate.id)}>
                <div className={styles.candidateAvatar} style={{ overflow: 'hidden' }}>
                  {candidate.image ? <img src={candidate.image} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : candidate.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <h2>{candidate.name}</h2>
                <div>Nominee for {election.role}</div>
              </div>
            ))}
          </div>

          <div className={styles.submitSection}>
            <button className={styles.submitBtnLarge} disabled={!selectedId} onClick={confirmVote}>CONFIRM MY VOTE</button>
            <div style={{ marginTop: 24 }}>
              <button onClick={() => { setAuthState('entry'); setSelectedId(null); }} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 2, pointerEvents: 'auto' }}>
                RESET STUDENT SESSION
              </button>
            </div>
          </div>
        </>
      ) : null}

      <button className={styles.kioskExitBtn} onClick={onExit}><X size={16} /> Exit Kiosk</button>
    </div>
  );
};

export default KioskTerminal;
