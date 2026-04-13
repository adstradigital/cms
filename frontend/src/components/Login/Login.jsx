'use client';

import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  Settings,
  Wrench,
  Loader
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Login.module.css';

const Login = ({
  role: activeRole = 'student',
  title: initialTitle = 'Student Portal',
  subtitle: initialSubtitle = 'Please sign in to continue.',
  brandingTitle = 'Campus\nManagement\nSystem',
  brandingSubtitle = 'Welcome to the student portal. Access your academic dashboard and attendance.',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic content based on portal
  const portalConfig = {
    student: {
      title: 'Student Portal',
      subtitle: 'Please sign in to continue.',
      label: 'Student ID',
      placeholder: 'Enter your Roll Number or ID',
      btnText: 'Sign In to Student Portal'
    },
    admin: {
      title: 'Admin Console',
      subtitle: 'Secure access for administrators.',
      label: 'Admin Username',
      placeholder: 'Enter admin username',
      btnText: 'Sign In to Admin Console'
    },
    staff: {
      title: 'Staff Portal',
      subtitle: 'Authorized personnel only.',
      label: 'Staff Username',
      placeholder: 'Enter staff username',
      btnText: 'Sign In to Staff Portal'
    },
    parent: {
      title: 'Parent Portal',
      subtitle: 'Access your ward\'s academic progress.',
      label: 'Parent Email / ID',
      placeholder: 'Enter your Parent ID',
      btnText: 'Sign In to Parent Portal'
    }
  };

  const currentConfig = portalConfig[activeRole] || portalConfig.student;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ username, password, role: activeRole });
    } catch (err) {
      setError(
        err.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>

        {/* ─── LEFT: Branding Panel ───────────────────────────────── */}
        <div className={styles.brandingPanel}>
          <div className={styles.brandingCircleTop} />
          <div className={styles.brandingCircleBottom} />

          <div className={styles.brandingContent}>
            <div className={styles.logoRow}>
              <div className={styles.logoIconWrap}>
                <BookOpen size={24} color="#fff" />
              </div>
              <span className={styles.logoText}>CMS</span>
            </div>

            <h1 className={styles.brandTitle} style={{ whiteSpace: 'pre-line' }}>
              {activeRole === 'admin' ? 'Admin\nManagement\nConsole' : brandingTitle}
            </h1>
            <p className={styles.brandSubtitle}>
              {activeRole === 'admin' 
                ? 'Comprehensive tools for campus administration, staff management, and system configuration.'
                : brandingSubtitle}
            </p>
          </div>

          <div className={styles.statusBadgeWrap}>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              System v1.0 Active
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Login Form ──────────────────────────────────── */}
        <div className={styles.formPanel}>


          {/* Welcome */}
          <div className={styles.welcomeBlock}>
            <h2 className={styles.welcomeTitle}>{currentConfig.title}</h2>
            <p className={styles.welcomeSubtitle}>{currentConfig.subtitle}</p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorAlert}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>

            {/* Username */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="username">
                {currentConfig.label}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder={currentConfig.placeholder}
                  required
                />
                <span className={styles.inputIcon}><User size={18} /></span>
              </div>
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.input} ${styles.inputPassword}`}
                  placeholder="••••••••"
                  required
                />
                <span className={styles.inputIcon}><Lock size={18} /></span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePasswordBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className={styles.rememberRow}>
              <label className={styles.rememberLabel}>
                <input type="checkbox" className={styles.rememberCheckbox} />
                Remember me
              </label>
              <a href="#" className={styles.forgotLink}>Forgot password?</a>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <>
                  <Loader className={styles.spinnerIcon} size={20} />
                  Authenticating...
                </>
              ) : (
                currentConfig.btnText
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
