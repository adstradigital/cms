"use client";
import React, { useState, useEffect } from 'react';
import { FileBadge, LayoutTemplate, Printer, Settings, Plus, Loader2, List, ArrowLeft } from 'lucide-react';
import adminApi from '@/api/adminApi';
import ReportCardCreate from '../StudentsAd/PerfomanceAd/ReportCardCreate/ReportCardCreate';
import styles from './ReportCard.module.css';

export default function ReportCardTab() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReportTemplates();
      setTemplates(res.data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (showBuilder) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setShowBuilder(false)}
            style={{ 
              background: 'transparent', border: '1px solid var(--theme-border)', 
              color: 'var(--theme-text)', padding: '6px 12px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16}/> Back to Templates
          </button>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Report Card Builder</h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ReportCardCreate onBack={() => setShowBuilder(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Report Card Templates</h2>
          <p className={styles.subtitle}>Design and manage academic report structures</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowBuilder(true)}>
          <Plus size={18}/> New Template
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div style={{ padding: '100px', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', opacity: 0.5 }}>Fetching templates...</p>
          </div>
        ) : templates.length > 0 ? (
          <div className={styles.templateGrid}>
            {templates.map(tpl => (
              <div key={tpl.id} className={styles.templateCard}>
                <div className={styles.tplPreview}>
                   <FileBadge size={48} opacity={0.3}/>
                </div>
                <div className={styles.tplInfo}>
                  <div className={styles.tplName}>{tpl.name}</div>
                  <div className={styles.tplMeta}>Created: {new Date(tpl.created_at).toLocaleDateString()}</div>
                </div>
                <div className={styles.tplActions}>
                  <button className={styles.btnIcon} title="Edit Template" onClick={() => {
                    // In a full implementation, we'd pass this template to the builder
                    setShowBuilder(true);
                  }}>
                    <Settings size={18}/>
                  </button>
                  <button className={styles.btnText}>Preview</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <LayoutTemplate size={64} opacity={0.1}/>
            <h3>No Templates Found</h3>
            <p>You haven't created any report card templates yet.</p>
            <button className={styles.btnOutline} onClick={() => setShowBuilder(true)}>
              Start Building First Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
