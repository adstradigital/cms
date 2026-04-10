'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './AllStaff.module.css';
import adminApi from '@/api/adminApi';
import { useToast } from '@/components/common/useToast';

import StaffToolbar from './parts/StaffToolbar';
import StaffTableView from './parts/StaffTableView';
import StaffGridView from './parts/StaffGridView';
import StaffOnboardingModal from './parts/StaffOnboardingModal';
import StaffProfileModal from './parts/StaffProfileModal';

export default function AllStaff() {
  const { push } = useToast();
  
  // Data State
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // View State
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isGrid, setIsGrid] = useState(false);

  // Modals & Action State
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, rolesRes] = await Promise.all([
        adminApi.getStaff(),
        adminApi.getRolesV2()
      ]);
      setStaff(staffRes.data || []);
      setRoles(rolesRes.data || []);
    } catch {
      push('Failed to load staff directory', 'error');
    } finally {
      setLoadingInitial(false);
    }
  };

  const assignableRoles = useMemo(() => {
    return roles.filter(r => !r.is_system);
  }, [roles]);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchSearch =
        s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search);

      const roleMatch =
        filterRole === 'all' ? true :
        filterRole === 'Unassigned' ? !s.role_name :
        s.role_name === filterRole;

      return matchSearch && roleMatch;
    });
  }, [staff, search, filterRole]);

  const handleExportCSV = () => {
    const headers = ['ID,First Name,Last Name,Email,Phone,Designation,Role,Status\n'];
    const rows = filtered.map(s => 
      `${s.employee_id},${s.first_name},${s.last_name},${s.email || ''},${s.phone || ''},${s.designation},${s.role_name || ''},${s.is_active ? 'Active' : 'Inactive'}`
    );
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_directory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingInitial) {
    return <div className={styles.empty}>Loading Staff Directory...</div>;
  }

  return (
    <div className={styles.container}>
      {/* TOOLBAR */}
      <StaffToolbar 
        search={search}
        setSearch={setSearch}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        roles={roles}
        isGrid={isGrid}
        setIsGrid={setIsGrid}
        exportToCSV={handleExportCSV}
        openAddModal={() => setAddOpen(true)}
      />

      {/* RENDER VIEWS */}
      {isGrid ? (
        <StaffGridView filtered={filtered} openProfile={(s) => setProfileOpen(s)} />
      ) : (
        <StaffTableView filtered={filtered} openProfile={(s) => setProfileOpen(s)} assignableRoles={assignableRoles} />
      )}

      {/* MODALS */}
      {addOpen && (
        <StaffOnboardingModal 
          roles={roles}
          assignableRoles={assignableRoles}
          onClose={() => setAddOpen(false)}
          onSuccess={(newStaff) => {
            fetchData();
            setAddOpen(false);
          }}
        />
      )}

      {profileOpen && (
        <StaffProfileModal 
          staff={profileOpen}
          assignableRoles={assignableRoles}
          onClose={() => setProfileOpen(null)}
          onUpdate={(updatedData) => {
            setStaff(p => p.map(x => x.id === updatedData.id ? { ...x, ...updatedData } : x));
            setProfileOpen(updatedData); // Refresh modal view
          }}
          onDelete={(id) => {
            setStaff(p => p.filter(x => x.id !== id));
            setProfileOpen(null);
          }}
        />
      )}
    </div>
  );
}
