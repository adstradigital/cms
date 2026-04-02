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
  role = 'student',
  title = 'Student Portal',
  subtitle = 'Please sign in to continue.',
  brandingTitle = 'Campus\nManagement\nSystem',
  brandingSubtitle = 'Welcome to the student portal. Access your academic dashboard and attendance.',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ username, password, role: role });
    } catch (err) {
      setError(
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
              {brandingTitle}
            </h1>
            <p className={styles.brandSubtitle}>
              {brandingSubtitle}
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

          {/* Top-right icons */}
          <div className={styles.topIcons}>
            <button type="button" title="System Diagnostic Tools" className={styles.iconBtn}>
              <Wrench size={18} />
            </button>
            <button type="button" title="Settings" className={styles.iconBtn}>
              <Settings size={18} />
            </button>
          </div>

          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <BookOpen size={28} />
            <span className={styles.mobileLogoText}>CMS</span>
          </div>

          {/* Welcome */}
          <div className={styles.welcomeBlock}>
            {role === 'staff' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ 
                  background: 'rgba(14, 165, 233, 0.1)', 
                  color: '#0ea5e9', 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '11px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Briefcase size={12} /> Staff / Admin
                </span>
              </div>
            )}
            <h2 className={styles.welcomeTitle}>{title}</h2>
            <p className={styles.welcomeSubtitle}>{subtitle}</p>
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
                {role === 'student' ? 'Student ID' : role === 'parent' ? 'Parent Email / ID' : 'Staff Username'}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder={
                    role === 'student' 
                      ? 'Enter your Roll Number or ID' 
                      : role === 'parent' 
                        ? 'Enter your Parent ID' 
                        : 'Enter your staff username'
                  }
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
                `Sign In to ${role.charAt(0).toUpperCase() + role.slice(1)} Portal`
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
