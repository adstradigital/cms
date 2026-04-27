'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import adminApi from '@/api/adminApi';
import { useSchool } from '@/context/SchoolContext';
import styles from './AIBrainHub.module.css';

function pickAcademicYearId(schoolConfig) {
  const candidates = [
    schoolConfig?.active_academic_year_id,
    schoolConfig?.academic_year_id,
    schoolConfig?.activeAcademicYearId,
    schoolConfig?.academic_year?.id,
  ].filter(Boolean);
  const first = candidates[0];
  return first ? String(first) : '';
}

export default function AIBrainHub() {
  const { schoolConfig } = useSchool();
  const defaultAcademicYearId = useMemo(() => pickAcademicYearId(schoolConfig), [schoolConfig]);

  const [academicYearId, setAcademicYearId] = useState(defaultAcademicYearId);
  const [teacherLoadLoading, setTeacherLoadLoading] = useState(false);
  const [teacherLoadResult, setTeacherLoadResult] = useState(null);
  const [teacherLoadError, setTeacherLoadError] = useState('');

  const runTeacherLoad = async () => {
    setTeacherLoadError('');
    setTeacherLoadResult(null);
    if (!academicYearId) {
      setTeacherLoadError('Academic year ID is required.');
      return;
    }

    setTeacherLoadLoading(true);
    try {
      const res = await adminApi.runAiTask({
        task: 'teacher.load',
        payload: { academic_year_id: Number(academicYearId) },
      });
      setTeacherLoadResult(res.data);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to run teacher load analysis.';
      setTeacherLoadError(String(msg));
    } finally {
      setTeacherLoadLoading(false);
    }
  };

  const overloaded = teacherLoadResult?.data?.overloaded || [];
  const scores = teacherLoadResult?.scores || teacherLoadResult?.data?.scores || {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Brain Hub</h1>
          <p className={styles.subtitle}>Campus Intelligence Operating System — scored, explainable, and human-in-the-loop.</p>
        </div>
        <div className={styles.quickLinks}>
          <Link href="/admins/classes/timetable" className={styles.link}>Timetable AI</Link>
          <Link href="/admins/examinations" className={styles.link}>Report AI</Link>
          <Link href="/admins/students" className={styles.link}>Student Insights</Link>
        </div>
      </div>

      <div className={styles.grid}>
        <Card title="System AI Engine" subtitle="Single engine entrypoint: /ai-brain/run/">
          <div className={styles.kv}>
            <div><span className={styles.k}>Tasks</span><span className={styles.v}>timetable.generate, risk.section, report.student, teacher.load</span></div>
            <div><span className={styles.k}>Always returns</span><span className={styles.v}>scores + confidence + explanations</span></div>
          </div>
        </Card>

        <Card title="Teacher Load Analyzer" subtitle="Detect overload + fairness issues">
          <div className={styles.row}>
            <Input
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              placeholder="Academic year ID"
            />
            <Button onClick={runTeacherLoad} loading={teacherLoadLoading} variant="secondary">
              Analyze
            </Button>
          </div>

          {teacherLoadError && <p className={styles.error}>{teacherLoadError}</p>}

          {teacherLoadResult && (
            <div className={styles.results}>
              <div className={styles.scores}>
                <span>Balance: <b>{scores.teacher_load_balance ?? '—'}</b></span>
                <span>Overload risk: <b>{scores.overload_risk ?? '—'}</b></span>
                <span>Confidence: <b>{teacherLoadResult.confidence ?? teacherLoadResult.data?.confidence ?? '—'}</b></span>
              </div>

              {overloaded.length > 0 ? (
                <div className={styles.table}>
                  <div className={`${styles.tr} ${styles.th}`}>
                    <div>Teacher</div>
                    <div>Total</div>
                    <div>Max consecutive</div>
                  </div>
                  {overloaded.slice(0, 5).map((t) => (
                    <div key={t.teacher_id} className={styles.tr}>
                      <div className={styles.teacher}>{t.teacher_name}</div>
                      <div>{t.total_periods}</div>
                      <div>{t.max_consecutive_periods}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No overloaded teachers detected for this academic year.</p>
              )}
            </div>
          )}
        </Card>

        <Card title="At-Risk Prediction" subtitle="Flag students early with scores + reasons">
          <p className={styles.muted}>
            Use task <code>risk.section</code> with <code>{'{ section_id, exam_id }'}</code> to get per-student risk_score and explanation.
          </p>
        </Card>

        <Card title="Timetable Explainability" subtitle="Every slot has reasons">
          <p className={styles.muted}>
            Timetable generation outputs per-period <code>reasons</code> plus a human-readable <code>explanation</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}

