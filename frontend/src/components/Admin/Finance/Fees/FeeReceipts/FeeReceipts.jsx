'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Download, Printer, Mail, X, Loader2, CheckCircle,
  Receipt, LayoutTemplate, Send, ChevronRight, Eye,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import adminApi from '@/api/adminApi';
import { useSchool } from '@/context/SchoolContext';
import { useToast } from '@/components/common/useToast';
import styles from '../../shared/FinanceLayout.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const METHOD_LABEL = { cash: 'Cash', online: 'Online', cheque: 'Cheque', dd: 'Demand Draft', upi: 'UPI', neft: 'NEFT / RTGS' };

function longDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Template 1 — Classic ─────────────────────────────────────────────────────
// Traditional bordered receipt with school letterhead, signature line

function TemplateClassic({ payment, school }) {
  const s = {
    wrap:      { fontFamily: 'Georgia, "Times New Roman", serif', color: '#111', background: '#fff', padding: '40px 48px', maxWidth: 640, margin: '0 auto' },
    header:    { textAlign: 'center', borderBottom: '3px double #091426', paddingBottom: 20, marginBottom: 24 },
    school:    { fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#091426' },
    tagline:   { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
    address:   { fontSize: 11, color: '#64748b', marginTop: 6 },
    badge:     { display: 'inline-block', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#091426', border: '2px solid #091426', padding: '6px 20px', marginTop: 14 },
    meta:      { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', margin: '16px 0', fontFamily: 'Arial, sans-serif' },
    table:     { width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', marginBottom: 24 },
    thHead:    { background: '#f1f5f9', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#475569', borderBottom: '2px solid #cbd5e1' },
    td:        { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#1e293b' },
    tdLabel:   { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#64748b', fontWeight: 600, width: '45%' },
    amountBox: { background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 6, padding: '16px 20px', textAlign: 'center', margin: '20px 0' },
    amountLbl: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#166534' },
    amountVal: { fontSize: 32, fontWeight: 900, color: '#15803d', fontFamily: 'Georgia, serif', marginTop: 4 },
    sigRow:    { display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontFamily: 'Arial, sans-serif' },
    sigBox:    { textAlign: 'center', minWidth: 160 },
    sigLine:   { borderTop: '1.5px solid #334155', marginBottom: 6 },
    sigLabel:  { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
    footer:    { textAlign: 'center', marginTop: 28, fontSize: 11, color: '#94a3b8', fontFamily: 'Arial, sans-serif', borderTop: '1px dashed #e2e8f0', paddingTop: 16 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.school}>{school?.name || 'School Name'}</div>
        {school?.tagline && <div style={s.tagline}>{school.tagline}</div>}
        {(school?.address || school?.phone) && (
          <div style={s.address}>
            {school.address}{school.address && school.phone ? ' · ' : ''}{school.phone}
          </div>
        )}
        <div style={s.badge}>Fee Payment Receipt</div>
      </div>

      <div style={s.meta}>
        <span><strong>Receipt No:</strong> {payment.receipt_number}</span>
        <span><strong>Date:</strong> {longDate(payment.payment_date)}</span>
      </div>

      <table style={s.table}>
        <tbody>
          {[
            ['Student Name',   payment.student_name],
            ['Admission No.',  payment.admission_number],
            ['Class',          payment.class_name || '—'],
            ['Fee Head',       payment.category_name],
            ['Payment Method', METHOD_LABEL[payment.payment_method] || payment.payment_method],
            ...(payment.transaction_id ? [['Transaction ID', payment.transaction_id]] : []),
            ...(payment.collected_by_name ? [['Collected By', payment.collected_by_name]] : []),
            ...(Number(payment.late_fine) > 0 ? [['Late Fine', fmt(payment.late_fine)]] : []),
            ...(Number(payment.concession_amount) > 0 ? [['Concession Applied', fmt(payment.concession_amount)]] : []),
            ...(payment.remarks ? [['Remarks', payment.remarks]] : []),
          ].map(([label, val]) => (
            <tr key={label}>
              <td style={s.tdLabel}>{label}</td>
              <td style={s.td}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={s.amountBox}>
        <div style={s.amountLbl}>Amount Paid</div>
        <div style={s.amountVal}>{fmt(payment.amount_paid)}</div>
      </div>

      <div style={s.sigRow}>
        <div style={s.sigBox}>
          <div style={s.sigLine} />
          <div style={s.sigLabel}>Parent / Guardian Signature</div>
        </div>
        <div style={s.sigBox}>
          <div style={s.sigLine} />
          <div style={s.sigLabel}>Authorised Signatory</div>
        </div>
      </div>

      <div style={s.footer}>
        This is a computer-generated receipt and is valid without a signature.<br />
        {school?.name} {school?.email ? `· ${school.email}` : ''}
      </div>
    </div>
  );
}

// ─── Template 2 — Modern ─────────────────────────────────────────────────────
// Left accent bar, two-column card design, highlighted amount

function TemplateModern({ payment, school }) {
  const accent = school?.primary_color || '#091426';
  const s = {
    wrap:     { fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif', background: '#fff', maxWidth: 640, margin: '0 auto', display: 'flex', borderRadius: 2 },
    sidebar:  { width: 8, background: accent, flexShrink: 0 },
    main:     { flex: 1, padding: '36px 40px' },
    topRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    school:   { fontSize: 18, fontWeight: 900, color: accent, letterSpacing: -0.3 },
    tagline:  { fontSize: 12, color: '#94a3b8', marginTop: 3 },
    rcpMeta:  { textAlign: 'right' },
    rcpNo:    { fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#334155', background: '#f8fafc', padding: '4px 10px', borderRadius: 4, display: 'inline-block' },
    rcpDate:  { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    divider:  { height: 1, background: '#e2e8f0', margin: '20px 0' },
    amtBlock: { background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)`, border: `1.5px solid ${accent}30`, borderRadius: 8, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    amtLeft:  {},
    amtLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: accent },
    amtValue: { fontSize: 34, fontWeight: 900, color: accent, marginTop: 4, letterSpacing: -1 },
    pill:     { background: '#dcfce7', color: '#15803d', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 },
    grid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', marginBottom: 20 },
    field:    {},
    fieldKey: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', marginBottom: 3 },
    fieldVal: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
    footer:   { marginTop: 24, padding: '16px 0 0', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8' },
  };

  const fields = [
    ['Student',      payment.student_name],
    ['Admission No.', payment.admission_number],
    ['Class',        payment.class_name || '—'],
    ['Fee Head',     payment.category_name],
    ['Method',       METHOD_LABEL[payment.payment_method] || payment.payment_method],
    ['Date',         longDate(payment.payment_date)],
    ...(payment.transaction_id ? [['Transaction ID', payment.transaction_id]] : []),
    ...(payment.collected_by_name ? [['Collected By', payment.collected_by_name]] : []),
  ];

  return (
    <div style={s.wrap}>
      <div style={s.sidebar} />
      <div style={s.main}>
        <div style={s.topRow}>
          <div>
            <div style={s.school}>{school?.name || 'School'}</div>
            <div style={s.tagline}>{school?.tagline || 'Fee Payment Receipt'}</div>
          </div>
          <div style={s.rcpMeta}>
            <div style={s.rcpNo}>{payment.receipt_number}</div>
            <div style={s.rcpDate}>{longDate(payment.payment_date)}</div>
          </div>
        </div>

        <div style={s.amtBlock}>
          <div style={s.amtLeft}>
            <div style={s.amtLabel}>Amount Paid</div>
            <div style={s.amtValue}>{fmt(payment.amount_paid)}</div>
          </div>
          <div style={s.pill}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>✓</span> PAID
          </div>
        </div>

        <div style={s.grid}>
          {fields.map(([k, v]) => (
            <div key={k} style={s.field}>
              <div style={s.fieldKey}>{k}</div>
              <div style={s.fieldVal}>{v}</div>
            </div>
          ))}
          {Number(payment.late_fine) > 0 && (
            <div style={s.field}>
              <div style={s.fieldKey}>Late Fine</div>
              <div style={{ ...s.fieldVal, color: '#d97706' }}>{fmt(payment.late_fine)}</div>
            </div>
          )}
          {Number(payment.concession_amount) > 0 && (
            <div style={s.field}>
              <div style={s.fieldKey}>Concession</div>
              <div style={{ ...s.fieldVal, color: '#0891b2' }}>− {fmt(payment.concession_amount)}</div>
            </div>
          )}
        </div>

        {payment.remarks && (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 16, background: '#f8fafc', padding: '10px 14px', borderRadius: 6 }}>
            Remarks: {payment.remarks}
          </div>
        )}

        <div style={s.footer}>
          <span>Computer-generated receipt · No signature required</span>
          {school?.email && <span>{school.email}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Template 3 — Thermal ─────────────────────────────────────────────────────
// POS-style thermal receipt: narrow, monospace, dotted dividers

function TemplateThermal({ payment, school }) {
  const s = {
    wrap:     { fontFamily: '"Courier New", Courier, monospace', background: '#fff', maxWidth: 360, margin: '0 auto', padding: '32px 28px', color: '#111' },
    center:   { textAlign: 'center' },
    school:   { fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 },
    sub:      { fontSize: 11, color: '#555', marginTop: 4, letterSpacing: 0.5 },
    dot:      { borderTop: '1px dashed #888', margin: '14px 0' },
    row:      { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 },
    key:      { color: '#555', flex: '0 0 48%' },
    val:      { fontWeight: 700, textAlign: 'right', flex: '0 0 48%', wordBreak: 'break-all' },
    bigAmt:   { textAlign: 'center', margin: '16px 0', fontSize: 26, fontWeight: 900, letterSpacing: -0.5 },
    stamp:    { textAlign: 'center', margin: '10px 0', fontSize: 18, fontWeight: 900, letterSpacing: 4, border: '3px solid #16a34a', color: '#16a34a', padding: '4px 0', display: 'inline-block', minWidth: 120 },
    footer:   { textAlign: 'center', fontSize: 10, color: '#888', marginTop: 14, lineHeight: 1.6 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.center}>
        <div style={s.school}>{school?.name || 'School'}</div>
        <div style={s.sub}>Fee Payment Receipt</div>
      </div>

      <div style={s.dot} />

      <div style={s.row}><span style={s.key}>Receipt No.</span><span style={s.val}>{payment.receipt_number}</span></div>
      <div style={s.row}><span style={s.key}>Date</span><span style={s.val}>{payment.payment_date || '—'}</span></div>

      <div style={s.dot} />

      <div style={s.row}><span style={s.key}>Student</span><span style={s.val}>{payment.student_name}</span></div>
      <div style={s.row}><span style={s.key}>Adm. No.</span><span style={s.val}>{payment.admission_number}</span></div>
      {payment.class_name && <div style={s.row}><span style={s.key}>Class</span><span style={s.val}>{payment.class_name}</span></div>}

      <div style={s.dot} />

      <div style={s.row}><span style={s.key}>Fee Head</span><span style={s.val}>{payment.category_name}</span></div>
      <div style={s.row}><span style={s.key}>Method</span><span style={s.val}>{(METHOD_LABEL[payment.payment_method] || payment.payment_method || '').toUpperCase()}</span></div>
      {payment.transaction_id && <div style={s.row}><span style={s.key}>TXN ID</span><span style={s.val}>{payment.transaction_id}</span></div>}
      {Number(payment.late_fine) > 0 && <div style={s.row}><span style={s.key}>Late Fine</span><span style={{ ...s.val, color: '#d97706' }}>+ {fmtN(payment.late_fine)}</span></div>}
      {Number(payment.concession_amount) > 0 && <div style={s.row}><span style={s.key}>Concession</span><span style={{ ...s.val, color: '#0891b2' }}>- {fmtN(payment.concession_amount)}</span></div>}

      <div style={s.dot} />

      <div style={s.center}>
        <div style={s.sub}>TOTAL PAID</div>
        <div style={s.bigAmt}>₹{fmtN(payment.amount_paid)}</div>
        <div style={s.stamp}>★ PAID ★</div>
      </div>

      {payment.collected_by_name && (
        <>
          <div style={s.dot} />
          <div style={s.row}><span style={s.key}>Collected By</span><span style={s.val}>{payment.collected_by_name}</span></div>
        </>
      )}

      <div style={s.dot} />
      <div style={s.footer}>
        Thank you for your payment!<br />
        This is a computer-generated receipt.<br />
        {school?.phone && school.phone}
      </div>
    </div>
  );
}

// ─── Template Registry ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id:    'classic',
    label: 'Classic',
    desc:  'Traditional letterhead with signature lines',
    preview: (
      <svg viewBox="0 0 80 100" width="72" height="90">
        <rect width="80" height="100" fill="#fff" rx="3" stroke="#ddd" strokeWidth="1"/>
        <rect x="8" y="8" width="64" height="14" fill="#091426" rx="1"/>
        <line x1="8" y1="28" x2="72" y2="28" stroke="#091426" strokeWidth="1.5"/>
        <rect x="8" y="33" width="40" height="4" fill="#e2e8f0" rx="1"/>
        <rect x="8" y="41" width="64" height="2" fill="#f1f5f9" rx="1"/>
        <rect x="8" y="47" width="64" height="2" fill="#f1f5f9" rx="1"/>
        <rect x="8" y="53" width="64" height="2" fill="#f1f5f9" rx="1"/>
        <rect x="12" y="62" width="56" height="14" fill="#dcfce7" rx="2" stroke="#16a34a" strokeWidth="1"/>
        <rect x="20" y="65" width="40" height="5" fill="#16a34a" rx="1"/>
        <line x1="12" y1="85" x2="35" y2="85" stroke="#94a3b8" strokeWidth="1"/>
        <line x1="45" y1="85" x2="68" y2="85" stroke="#94a3b8" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id:    'modern',
    label: 'Modern',
    desc:  'Corporate card style with colour accent',
    preview: (
      <svg viewBox="0 0 80 100" width="72" height="90">
        <rect width="80" height="100" fill="#fff" rx="3" stroke="#ddd" strokeWidth="1"/>
        <rect width="5" height="100" fill="#091426" rx="2"/>
        <rect x="10" y="10" width="40" height="6" fill="#091426" rx="1"/>
        <rect x="10" y="19" width="25" height="3" fill="#e2e8f0" rx="1"/>
        <rect x="55" y="10" width="16" height="8" fill="#f8fafc" rx="1" stroke="#e2e8f0" strokeWidth="0.5"/>
        <rect x="9" y="32" width="62" height="18" fill="#f0fdf4" rx="3" stroke="#16a34a" strokeWidth="0.8"/>
        <rect x="14" y="36" width="28" height="4" fill="#15803d" rx="1"/>
        <rect x="14" y="43" width="16" height="3" fill="#16a34a" rx="1"/>
        <rect x="57" y="35" width="10" height="12" fill="#dcfce7" rx="10"/>
        <rect x="9" y="56" width="28" height="3" fill="#e2e8f0" rx="1"/>
        <rect x="9" y="62" width="20" height="3" fill="#f1f5f9" rx="1"/>
        <rect x="42" y="56" width="28" height="3" fill="#e2e8f0" rx="1"/>
        <rect x="42" y="62" width="20" height="3" fill="#f1f5f9" rx="1"/>
        <rect x="9" y="70" width="28" height="3" fill="#e2e8f0" rx="1"/>
        <rect x="9" y="76" width="20" height="3" fill="#f1f5f9" rx="1"/>
        <rect x="42" y="70" width="28" height="3" fill="#e2e8f0" rx="1"/>
        <rect x="42" y="76" width="20" height="3" fill="#f1f5f9" rx="1"/>
        <line x1="9" y1="90" x2="71" y2="90" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2,2"/>
      </svg>
    ),
  },
  {
    id:    'thermal',
    label: 'Thermal',
    desc:  'POS-style compact receipt',
    preview: (
      <svg viewBox="0 0 60 100" width="54" height="90">
        <rect width="60" height="100" fill="#fff" rx="2" stroke="#ddd" strokeWidth="1"/>
        <rect x="6" y="8" width="48" height="7" fill="#111" rx="1"/>
        <rect x="10" y="18" width="40" height="2" fill="#eee" rx="1"/>
        <line x1="6" y1="24" x2="54" y2="24" stroke="#999" strokeWidth="0.8" strokeDasharray="2,2"/>
        <rect x="6" y="28" width="22" height="2" fill="#ddd" rx="1"/>
        <rect x="32" y="28" width="22" height="2" fill="#333" rx="1"/>
        <rect x="6" y="33" width="22" height="2" fill="#ddd" rx="1"/>
        <rect x="32" y="33" width="22" height="2" fill="#333" rx="1"/>
        <line x1="6" y1="39" x2="54" y2="39" stroke="#999" strokeWidth="0.8" strokeDasharray="2,2"/>
        <rect x="6" y="43" width="22" height="2" fill="#ddd" rx="1"/>
        <rect x="32" y="43" width="22" height="2" fill="#333" rx="1"/>
        <rect x="6" y="48" width="22" height="2" fill="#ddd" rx="1"/>
        <rect x="32" y="48" width="22" height="2" fill="#333" rx="1"/>
        <line x1="6" y1="54" x2="54" y2="54" stroke="#999" strokeWidth="0.8" strokeDasharray="2,2"/>
        <rect x="10" y="58" width="40" height="8" fill="#f0fdf4" rx="1" stroke="#16a34a" strokeWidth="0.8"/>
        <rect x="14" y="61" width="32" height="2" fill="#16a34a" rx="1"/>
        <rect x="14" y="72" width="32" height="10" fill="none" stroke="#16a34a" strokeWidth="1.5" rx="1"/>
        <rect x="18" y="75" width="24" height="4" fill="#16a34a" rx="1"/>
        <line x1="6" y1="86" x2="54" y2="86" stroke="#999" strokeWidth="0.8" strokeDasharray="2,2"/>
        <rect x="10" y="90" width="40" height="2" fill="#eee" rx="1"/>
      </svg>
    ),
  },
];

const TEMPLATE_MAP = { classic: TemplateClassic, modern: TemplateModern, thermal: TemplateThermal };

// ─── Receipt Viewer Modal ─────────────────────────────────────────────────────

function ReceiptViewer({ payment, onClose }) {
  const [template,       setTemplate]       = useState('modern');
  const [emailMode,      setEmailMode]      = useState(false);
  const [emailTo,        setEmailTo]        = useState(payment.student_email || '');
  const [emailSending,   setEmailSending]   = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { schoolConfig }  = useSchool();
  const { push }          = useToast();
  const contentRef        = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt-${payment.receipt_number}`,
  });

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setDownloadingPDF(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW     = pdf.internal.pageSize.getWidth();
      const imgH      = (canvas.height * pageW) / canvas.width;
      const margin    = 10;
      pdf.addImage(imgData, 'PNG', margin, margin, pageW - margin * 2, imgH - margin * 2);
      pdf.save(`fee-receipt-${payment.receipt_number}.pdf`);
      push('PDF downloaded.', 'success');
    } catch (e) {
      push('Failed to generate PDF.', 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { push('Enter an email address.', 'error'); return; }
    setEmailSending(true);
    try {
      await adminApi.sendFeeReceiptEmail(payment.id, { email: emailTo.trim() });
      push(`Receipt emailed to ${emailTo}.`, 'success');
      setEmailMode(false);
    } catch (e) {
      push(e?.response?.data?.error || 'Failed to send email.', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  const TemplateComponent = TEMPLATE_MAP[template];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(9,20,38,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900,
        maxHeight: '95vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 64px rgba(9,20,38,0.3)',
        animation: 'rcpPop 0.22s ease',
      }}>
        <style>{`@keyframes rcpPop{from{opacity:0;transform:scale(0.96) translateY(10px)}to{opacity:1;transform:none}}`}</style>

        {/* ── Modal Header ── */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={18} color="#091426" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#091426' }}>{payment.receipt_number}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{payment.student_name} · {payment.category_name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: '#64748b' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ── Left: Controls ── */}
          <div style={{ width: 240, borderRight: '1px solid #e2e8f0', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0, overflowY: 'auto', background: '#fafbfc' }}>

            {/* Template Picker */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <LayoutTemplate size={12} /> Template
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: template === t.id ? '2px solid #091426' : '1.5px solid #e2e8f0',
                      background: template === t.id ? '#f0f4f9' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>{t.preview}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#1e293b', width: '100%' }}
                >
                  <Printer size={15} color="#475569" /> Print Receipt
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, color: '#1e293b', opacity: downloadingPDF ? 0.7 : 1, width: '100%' }}
                >
                  {downloadingPDF
                    ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <Download size={15} color="#475569" />}
                  {downloadingPDF ? 'Generating…' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setEmailMode(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 7, border: emailMode ? '1.5px solid #091426' : '1.5px solid #e2e8f0', background: emailMode ? '#f0f4f9' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#1e293b', width: '100%' }}
                >
                  <Mail size={15} color="#475569" /> Email Receipt
                </button>

                {emailMode && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      type="email"
                      placeholder="Recipient email…"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
                    />
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 7, border: 'none', background: '#091426', color: '#fff', cursor: emailSending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, width: '100%', opacity: emailSending ? 0.7 : 1 }}
                    >
                      {emailSending ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
                      {emailSending ? 'Sending…' : 'Send Email'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 'auto', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
              Select a template, then print or download as PDF. Email requires an outgoing mail server to be configured.
            </div>
          </div>

          {/* ── Right: Receipt Preview ── */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: 28 }}>
            <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden' }}>
              <div ref={contentRef} style={{ background: '#fff' }}>
                <TemplateComponent payment={payment} school={schoolConfig} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main FeeReceipts Component ───────────────────────────────────────────────

const STATUS_CONFIG = {
  paid:    { cls: styles.badgePaid    },
  pending: { cls: styles.badgePending },
  overdue: { cls: styles.badgeDanger  },
  partial: { cls: styles.badgePending },
  waived:  { cls: styles.badgePaid    },
};

export default function FeeReceipts() {
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('paid');
  const [viewing,   setViewing]   = useState(null); // payment object
  const { push }    = useToast();

  useEffect(() => {
    adminApi.getFeePayments()
      .then(r => setPayments(r.data || []))
      .catch(() => push('Failed to load receipts.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (p.student_name    || '').toLowerCase().includes(q)
      || (p.receipt_number  || '').toLowerCase().includes(q)
      || (p.admission_number || '').toLowerCase().includes(q)
      || (p.category_name   || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* ── Summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total Receipts', val: payments.filter(p => p.status === 'paid').length,   color: '#16a34a' },
          { label: 'Total Collected', val: `₹${payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount_paid || 0), 0).toLocaleString('en-IN')}`, color: '#16a34a' },
          { label: 'Pending',  val: payments.filter(p => p.status === 'pending').length,  color: '#d97706' },
          { label: 'Overdue',  val: payments.filter(p => p.status === 'overdue').length,  color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className={styles.card} style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className={styles.card} style={{ padding: 0 }}>
        <div className={styles.cardHeader} style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <div className={styles.inputWrapper} style={{ flex: 1, minWidth: 200 }}>
            <Search className={styles.inputIcon} size={16} />
            <input
              className={`${styles.input} ${styles.inputWithIcon}`}
              placeholder="Search student, receipt no., fee head…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className={styles.input} style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
            <option value="waived">Waived</option>
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /> Loading receipts…</div>
        ) : (
          <div className={styles.tableResponsive} style={{ margin: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Student</th>
                  <th>Fee Head</th>
                  <th className={styles.textRight}>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Collected By</th>
                  <th className={styles.textCenter}>Status</th>
                  <th className={styles.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className={styles.emptyState}>No receipts found.</td></tr>
                ) : filtered.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.fontMono} style={{ fontWeight: 800, color: '#091426' }}>{p.receipt_number || '—'}</div>
                        {p.transaction_id && <div className={styles.textSub}>TXN: {p.transaction_id}</div>}
                      </td>
                      <td>
                        <div className={styles.textBold}>{p.student_name}</div>
                        <div className={styles.textSub}>{p.admission_number}</div>
                      </td>
                      <td>{p.category_name}</td>
                      <td className={`${styles.fontMono} ${styles.textRight}`} style={{ fontWeight: 800, color: '#16a34a' }}>
                        {fmt(p.amount_paid)}
                      </td>
                      <td>
                        <span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>
                          {(METHOD_LABEL[p.payment_method] || p.payment_method || '').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>{p.payment_date || '—'}</td>
                      <td style={{ color: 'var(--finance-text-muted)', fontSize: 13 }}>{p.collected_by_name || '—'}</td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${cfg.cls}`}>{p.status}</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.btnPrimary}
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => setViewing(p)}
                          >
                            <Eye size={13} /> View &amp; Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && <ReceiptViewer payment={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
