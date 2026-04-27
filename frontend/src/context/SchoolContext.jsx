'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import schoolApi from '@/api/schoolApi';

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const [schoolConfig, setSchoolConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const DEFAULT_CONFIG = {
    name: 'School',
    tagline: '',
    primary_color: '#00a676',
    secondary_color: '#3b82f6',
  };

  const fetchConfig = async () => {
    try {
      const res = await schoolApi.getConfig();
      setSchoolConfig(res.data);
    } catch (err) {
      console.error('Failed to load school configuration:', err?.response?.status, err?.message);
      setSchoolConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SchoolContext.Provider value={{ schoolConfig, loading, refreshConfig: fetchConfig }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) throw new Error('useSchool must be used within SchoolProvider');
  return context;
}

export default SchoolContext;
