"use client";
import React, { useState, useEffect } from 'react';
import { Laptop, Edit3, CheckSquare, BarChart2, Loader2, AlertCircle } from 'lucide-react';
import adminApi from '@/api/adminApi';
import styles from './OnlineTest.module.css';

import TestDashboard from './TestDashboard';
import TestBuilder from './TestBuilder';
import GradingQueue from './GradingQueue';

export default function OnlineTestTab() {
  const [mode, setMode] = useState('dashboard'); // dashboard | builder | queue | analytics
  const [onlineTests, setOnlineTests] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testRes, secRes, subRes] = await Promise.all([
        adminApi.getOnlineTests(),
        adminApi.getSections(),
        adminApi.getSubjects()
      ]);
      setOnlineTests(testRes.data || []);
      setSections(secRes.data || []);
      setSubjects(subRes.data || []);
    } catch (error) {
      console.error("Error fetching online tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (data) => {
    try {
      const res = await adminApi.createOnlineTest(data);
      setSelectedTestId(res.data.id);
      setMode('builder');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to create test');
    }
  };

  const handlePublishTest = async (id) => {
    try {
      await adminApi.publishOnlineTest(id);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to publish. Make sure test has questions.');
    }
  };

  const handleDeleteTest = async (id) => {
    if (!confirm('Delete this test? All questions and submissions will be permanently removed.')) return;
    try {
      await adminApi.deleteOnlineTest(id);
      if (selectedTestId === id) setSelectedTestId(null);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to delete test.');
    }
  };

  const navigateTo = (newMode, testId = null) => {
    if (testId) setSelectedTestId(testId);
    setMode(newMode);
  };

  return (
    <div className={styles.container}>
      <div className={styles.subTabs}>
        <button 
          className={`${styles.subTab} ${mode === 'dashboard' ? styles.subTabActive : ''}`} 
          onClick={() => navigateTo('dashboard')}
        >
          <Laptop size={16}/> Test Dashboard
        </button>
        <button 
          className={`${styles.subTab} ${mode === 'builder' ? styles.subTabActive : ''}`} 
          onClick={() => { if(selectedTestId) navigateTo('builder') }}
          disabled={!selectedTestId}
          style={{opacity: !selectedTestId ? 0.5 : 1}}
        >
          <Edit3 size={16}/> Test Builder
        </button>
        <button 
          className={`${styles.subTab} ${mode === 'queue' ? styles.subTabActive : ''}`} 
          onClick={() => { if(selectedTestId) navigateTo('queue') }}
          disabled={!selectedTestId}
          style={{opacity: !selectedTestId ? 0.5 : 1}}
        >
          <CheckSquare size={16}/> Grading Queue
        </button>
      </div>

      <div className={styles.viewArea}>
        {loading && mode === 'dashboard' ? (
          <div style={{ padding: '80px', textAlign: 'center', width: '100%' }}>
            <Loader2 className="animate-spin" size={32} style={{margin: '0 auto'}}/>
            <p style={{marginTop: 16, opacity: 0.5}}>Loading assessment data...</p>
          </div>
        ) : (
          <>
            {mode === 'dashboard' && (
              <TestDashboard
                tests={onlineTests}
                sections={sections}
                subjects={subjects}
                onCreate={handleCreateTest}
                onSelect={(id) => navigateTo('builder', id)}
                onPublish={handlePublishTest}
                onDelete={handleDeleteTest}
                onGradingQueue={(id) => navigateTo('queue', id)}
              />
            )}

            {mode === 'builder' && selectedTestId && (
              <TestBuilder 
                testId={selectedTestId} 
                onBack={() => navigateTo('dashboard')}
              />
            )}

            {mode === 'queue' && selectedTestId && (
              <GradingQueue 
                testId={selectedTestId} 
                onBack={() => navigateTo('dashboard')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
