'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './StudentDirectory.module.css';
import ActionCards from '../ActionCards/ActionCards';
import StudentList from '../StudentList/StudentList';
import StudentPreview from '../StudentPreview/StudentPreview';
import StudentForm from '../StudentForm/StudentForm';
import StudentAdProfile from '../StudentAdProfile/StudentAdProfile';
import PerformanceAd from '../PerfomanceAd/PerformanceAd';

const StudentDirectory = () => {
  const searchParams = useSearchParams();
  const inquiryIdParam = searchParams ? searchParams.get('inquiry') : null;

  const [activeView, setActiveView] = useState('list'); // 'list' | 'profile' | 'form' | 'full_profile' | 'performance'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [inquiryId, setInquiryId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (inquiryIdParam) {
      setInquiryId(inquiryIdParam);
      setActiveView('form');
    }
  }, [inquiryIdParam]);

  const handleViewProfile = (id) => {
    setSelectedStudentId(id);
    setActiveView('full_profile');
  };

  const handleEditProfile = (id) => {
    setSelectedStudentId(id);
    setActiveView('form');
  };

  if (activeView === 'full_profile') {
    return (
      <div className={styles.directoryWrapper}>
        <StudentAdProfile 
          studentId={selectedStudentId} 
          onBack={() => setActiveView('list')} 
          onEdit={() => setActiveView('form')}
        />
      </div>
    );
  }

  return (
    <div className={styles.directoryWrapper}>
      {/* Center Column: Quick Actions & Data Table/Form */}
      <div className={styles.centerColumn}>
        <ActionCards activeView={activeView} setActiveView={setActiveView} />
        {activeView === 'form' ? (
          <StudentForm
            studentId={selectedStudentId}
            inquiryId={inquiryId}
            onCancel={() => {
              setActiveView('list');
              setInquiryId(null);
            }}
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              setActiveView('list');
              setInquiryId(null);
            }}
          />
        ) : activeView === 'performance' ? (
          <PerformanceAd />
        ) : (
          <StudentList 
            onAddClick={() => { setSelectedStudentId(null); setActiveView('form'); }} 
            onViewProfile={handleViewProfile}
            onEditProfile={handleEditProfile}
            onSelectRow={(id) => setSelectedStudentId(id)}
            refreshKey={refreshKey}
          />
        )}
      </div>

      {/* Right Column: Contextual Profile Preview */}
      {activeView !== 'performance' && (
        <StudentPreview 
          studentId={selectedStudentId} 
          onViewFullProfile={() => setActiveView('full_profile')}
        />
      )}
    </div>
  );
};

export default StudentDirectory;
