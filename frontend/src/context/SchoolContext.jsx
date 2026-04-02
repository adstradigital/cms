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

  const fetchConfig = async () => {
    try {
      const res = await schoolApi.getConfig();
      setSchoolConfig(res.data);
    } catch {
      console.error('Failed to load school configuration');
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
