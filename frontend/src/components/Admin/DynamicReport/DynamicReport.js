'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart2, LineChart, PieChart, Download, FileSpreadsheet,
  Printer, Plus, X, GripVertical, Search,
  Play, Save, Trash2, Filter, SortAsc, SortDesc,
  ArrowUpDown, Zap,
  FileText, Activity, Users, BookOpen,
  DollarSign, Calendar, TrendingUp, Settings2, Table2,
  Check, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Bus, Bed, Library, CreditCard, LayoutGrid,
} from 'lucide-react';
import styles from './DynamicReport.module.css';
import reportApi from '@/api/reportApi';

/* ── Constants ─────────────────────────────────────── */
const MODULE_ICONS = {
  fees:       DollarSign,
  students:   Users,
  attendance: Calendar,
  exams:      BookOpen,
  staff:      Users,
  payroll:    TrendingUp,
  library:    Library,
  hostel:     Bed,
  transport:  Bus,
  expenses:   CreditCard,
};
const MODULE_COLORS = {
  fees:       '#0ea5e9',
  students:   '#8b5cf6',
  attendance: '#00a676',
  exams:      '#f59e0b',
  staff:      '#ef4444',
  payroll:    '#6366f1',
  library:    '#06b6d4',
  hostel:     '#10b981',
  transport:  '#f97316',
  expenses:   '#ec4899',
};

const FILTER_OPERATORS = {
  text:    ['contains', 'equals', 'starts with', 'ends with', 'is empty', 'is not empty'],
  choice:  ['equals', 'contains', 'is empty', 'is not empty'],
  number:  ['equals', 'greater than', 'less than', 'between', 'is empty'],
  date:    ['between', 'equals', 'before', 'after'],
  boolean: ['equals'],
};

const TYPE_ICONS = { text: FileText, number: DollarSign, date: Calendar, choice: Activity, boolean: Check };

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Mini chart renderers ──────────────────────────── */
function BarChartViz({ data }) {
  if (!data?.length) return <div className={styles.noChart}>No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ['#0ea5e9','#8b5cf6','#00a676','#f59e0b','#ef4444','#6366f1','#ec4899'];
  return (
    <div className={styles.barChart}>
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className={styles.barGroup}>
          <span className={styles.barVal}>
            {d.value > 999 ? `${(d.value/1000).toFixed(0)}k` : d.value}
          </span>
          <div className={styles.barOuter}>
            <div className={styles.barInner}
              style={{ height: `${(d.value / max) * 100}%`, background: colors[i % colors.length] }} />
          </div>
          <span className={styles.barLabel}>{d.label?.length > 5 ? d.label.slice(0,5) : d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChartViz({ data }) {
  if (!data?.length) return <div className={styles.noChart}>No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 260, H = 100, P = 16;
  const pts = data.map((d, i) => ({
    x: P + (i / Math.max(data.length - 1, 1)) * (W - P * 2),
    y: H - P - (d.value / max) * (H - P * 2),
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path}L${pts[pts.length-1].x},${H-P}L${pts[0].x},${H-P}Z`;
  return (
    <div className={styles.lineChart}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lg)"/>
        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0ea5e9" stroke="#fff" strokeWidth="1.5"/>)}
      </svg>
      <div className={styles.lineLabels}>
        {data.slice(0, 6).map((d, i) => <span key={i}>{d.label?.slice(0, 5)}</span>)}
      </div>
    </div>
  );
}

function PieChartViz({ data }) {
  if (!data?.length) return <div className={styles.noChart}>No data</div>;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#0ea5e9','#8b5cf6','#00a676','#f59e0b','#ef4444','#6366f1'];
  let cum = 0;
  const segs = data.slice(0, 6).map((d, i) => {
    const pct = d.value / total;
    const s = cum; cum += pct;
    const a1 = s * 2 * Math.PI - Math.PI / 2;
    const a2 = cum * 2 * Math.PI - Math.PI / 2;
    const r = 48, cx = 56, cy = 56;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    return { ...d, pct, path: `M${cx},${cy}L${x1},${y1}A${r},${r},0,${pct > 0.5 ? 1 : 0},1,${x2},${y2}Z`, color: colors[i] };
  });
  return (
    <div className={styles.pieChart}>
      <svg width="112" height="112" viewBox="0 0 112 112">
        {segs.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5"/>)}
      </svg>
      <div className={styles.pieLegend}>
        {segs.map((s, i) => (
          <div key={i} className={styles.pieLegendRow}>
            <span className={styles.pieDot} style={{ background: s.color }}/>
            <span className={styles.pieLabel}>{s.label}</span>
            <span className={styles.piePct}>{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Toast ─────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className={styles.toastStack}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles['toast_' + t.type]}`}>
          {t.type === 'success' ? <Check size={12}/> : <AlertCircle size={12}/>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, toast: add };
}

/* ── Save Report Modal ─────────────────────────────── */
function SaveModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{initial ? 'Update Report' : 'Save Report'}</span>
          <button className={styles.modalClose} onClick={onClose}><X size={14}/></button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.fieldLabel}>Report Name *</label>
          <input className={styles.textInput} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fee Pending Report"/>
          <label className={styles.fieldLabel}>Description</label>
          <textarea className={styles.textArea} rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description…"/>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} disabled={!name.trim()} onClick={() => onSave(name, desc)}>
            <Save size={12}/> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function DynamicReport() {
  const { toasts, toast } = useToast();

  // Module / meta
  const [moduleMeta, setModuleMeta] = useState({});
  const [module, setModule] = useState('fees');
  const [metaLoading, setMetaLoading] = useState(true);

  // Builder state
  const [searchField, setSearchField] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [groupBy, setGroupBy] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  // Report settings
  const [reportName, setReportName] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [outputType, setOutputType] = useState('table');
  const [chartType, setChartType] = useState('bar');

  // Results
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Saved reports
  const [savedReports, setSavedReports] = useState([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  // Export loading
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Formula
  const [formulas, setFormulas] = useState([]);
  const [fName, setFName] = useState('');
  const [fField1, setFField1] = useState('');
  const [fOp, setFOp] = useState('-');
  const [fField2, setFField2] = useState('');

  // Drag
  const dragFieldRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // "_all" pseudo-module: merge fields from all real modules for browsing
  const allMergedFields = Object.entries(moduleMeta).flatMap(([modKey, meta]) =>
    (meta.fields || []).map(f => ({
      ...f,
      key: `${modKey}__${f.key}`,
      category: `${meta.label} · ${f.category}`,
      _module: modKey,
      _realKey: f.key,
    }))
  );

  const fields = module === '_all'
    ? allMergedFields
    : (moduleMeta[module]?.fields || []);

  const numericFields = fields.filter(f => f.type === 'number');
  const availableFields = fields.filter(f =>
    !selectedFields.find(sf => sf.key === f.key) &&
    (f.label.toLowerCase().includes(searchField.toLowerCase()) ||
     f.category.toLowerCase().includes(searchField.toLowerCase()))
  );

  // ── Load meta ─────────────────────────────────────
  useEffect(() => {
    setMetaLoading(true);
    reportApi.getMeta()
      .then(r => {
        setModuleMeta(r.data);
        setMetaLoading(false);
      })
      .catch(() => {
        setMetaLoading(false);
        toast('Failed to load module metadata', 'error');
      });
  }, []);

  // ── Load saved reports ────────────────────────────
  const loadSaved = useCallback(() => {
    reportApi.getSaved({ search: savedSearch })
      .then(r => setSavedReports(r.data))
      .catch(() => {});
  }, [savedSearch]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── When module changes, reset fields/filters ─────
  useEffect(() => {
    setSelectedFields([]);
    setFilters([]);
    setGroupBy('');
    setSortField('');
    setResult(null);
    setPage(1);
  }, [module]);

  // ── Fields ───────────────────────────────────────
  const addField = useCallback(f => {
    setSelectedFields(p => p.find(x => x.key === f.key) ? p : [...p, f]);
  }, []);
  const removeField = useCallback(k => setSelectedFields(p => p.filter(f => f.key !== k)), []);
  const clearFields = () => { setSelectedFields([]); setResult(null); };

  // ── Filters ──────────────────────────────────────
  const addFilter = () => {
    const firstField = fields[0];
    if (!firstField) return;
    setFilters(p => [...p, { id: Date.now(), field: firstField.key, operator: 'contains', value: '', value2: '' }]);
  };
  const updateFilter = (id, upd) => setFilters(p => p.map(f => f.id === id ? upd : f));
  const removeFilter = (id) => setFilters(p => p.filter(f => f.id !== id));

  // ── Run report ────────────────────────────────────
  const runReport = useCallback(async (pg = 1) => {
    if (!selectedFields.length) { toast('Select at least one field', 'error'); return; }
    if (module === '_all') { toast('Select a specific module to run the report', 'warn'); return; }
    setRunning(true);
    setPage(pg);
    try {
      const r = await reportApi.run({
        module,
        fields: selectedFields.map(f => f.key),
        filters,
        filter_logic: filterLogic,
        group_by: groupBy,
        sort_field: sortField,
        sort_direction: sortDir,
        page: pg,
        page_size: PAGE_SIZE,
      });
      setResult(r.data);
      if (pg === 1 && !reportName) setReportName(`${moduleMeta[module]?.label || module} Report`);
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to run report', 'error');
    } finally {
      setRunning(false);
    }
  }, [module, selectedFields, filters, filterLogic, groupBy, sortField, sortDir, moduleMeta, reportName]);

  // ── Export ────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!selectedFields.length) { toast('Select fields first', 'error'); return; }
    if (module === '_all') { toast('Select a specific module to export', 'warn'); return; }
    setExportingExcel(true);
    try {
      const r = await reportApi.exportExcel({
        module, fields: selectedFields.map(f => f.key),
        filters, filter_logic: filterLogic,
        group_by: groupBy, sort_field: sortField, sort_direction: sortDir,
        report_name: reportName || 'Report',
      });
      triggerDownload(r.data, `${reportName || 'Report'}.xlsx`);
      toast('Excel exported');
    } catch { toast('Excel export failed', 'error'); }
    finally { setExportingExcel(false); }
  };

  const handleExportPdf = async () => {
    if (!selectedFields.length) { toast('Select fields first', 'error'); return; }
    if (module === '_all') { toast('Select a specific module to export', 'warn'); return; }
    setExportingPdf(true);
    try {
      const r = await reportApi.exportPdf({
        module, fields: selectedFields.map(f => f.key),
        filters, filter_logic: filterLogic,
        group_by: groupBy, sort_field: sortField, sort_direction: sortDir,
        report_name: reportName || 'Report',
      });
      triggerDownload(r.data, `${reportName || 'Report'}.pdf`);
      toast('PDF exported');
    } catch { toast('PDF export failed', 'error'); }
    finally { setExportingPdf(false); }
  };

  const handlePrint = () => window.print();

  // ── Save report ───────────────────────────────────
  const handleSave = async (name, desc) => {
    const payload = {
      name, description: desc,
      module, fields: selectedFields.map(f => f.key),
      filters, filter_logic: filterLogic,
      group_by: groupBy, sort_field: sortField, sort_direction: sortDir,
      output_type: outputType, chart_type: chartType,
      formulas,
    };
    try {
      if (editingReport) {
        await reportApi.updateReport(editingReport.id, payload);
        toast('Report updated');
      } else {
        await reportApi.saveReport(payload);
        toast('Report saved');
      }
      loadSaved();
      setShowSaveModal(false);
      setEditingReport(null);
    } catch { toast('Failed to save report', 'error'); }
  };

  // ── Load saved report ─────────────────────────────
  const loadSavedReport = async (rep) => {
    try {
      const r = await reportApi.loadReport(rep.id);
      const d = r.data;
      setModule(d.module);
      // Wait for meta then restore fields
      setTimeout(() => {
        const mFields = moduleMeta[d.module]?.fields || [];
        setSelectedFields(mFields.filter(f => (d.fields || []).includes(f.key)));
        setFilters((d.filters || []).map((f, i) => ({ ...f, id: i + 1 })));
        setFilterLogic(d.filter_logic || 'AND');
        setGroupBy(d.group_by || '');
        setSortField(d.sort_field || '');
        setSortDir(d.sort_direction || 'desc');
        setOutputType(d.output_type || 'table');
        setChartType(d.chart_type || 'bar');
        setFormulas(d.formulas || []);
        setReportName(d.name);
        setReportDesc(d.description || '');
        setEditingReport(d);
        toast(`Loaded: ${d.name}`);
      }, 100);
    } catch { toast('Failed to load report', 'error'); }
  };

  const deleteReport = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this report?')) return;
    try {
      await reportApi.deleteReport(id);
      loadSaved();
      toast('Report deleted');
    } catch { toast('Delete failed', 'error'); }
  };

  // ── Formula builder ───────────────────────────────
  const addFormula = () => {
    if (!fName || !fField1 || !fField2) { toast('Fill formula fields', 'error'); return; }
    setFormulas(p => [...p, { name: fName, field1: fField1, op: fOp, field2: fField2 }]);
    setFName(''); setFField1(''); setFField2('');
    toast('Formula added');
  };

  // ── Drag & drop ───────────────────────────────────
  const handleDragStart = (f) => { dragFieldRef.current = f; };
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (dragFieldRef.current) addField(dragFieldRef.current);
  };

  // ── Derived ───────────────────────────────────────
  const getFieldDef = (key) => fields.find(f => f.key === key);
  const getFilterOperators = (fieldKey) => {
    const fd = getFieldDef(fieldKey);
    return FILTER_OPERATORS[fd?.type || 'text'] || FILTER_OPERATORS.text;
  };

  const filteredSaved = savedReports.filter(r =>
    r.name.toLowerCase().includes(savedSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────
  return (
    <div className={styles.root}>
      <Toast toasts={toasts}/>
      {showSaveModal && (
        <SaveModal
          initial={editingReport ? { name: reportName, description: reportDesc } : null}
          onClose={() => { setShowSaveModal(false); setEditingReport(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><BarChart2 size={16}/></div>
          <div>
            <h1 className={styles.headerTitle}>Dynamic Report Builder</h1>
            <p className={styles.headerSub}>Build, filter and export custom reports</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.modulePillsWrap}>
            {/* All pill — shows merged fields from every module for browsing */}
            <button
              className={`${styles.modulePill} ${module === '_all' ? styles.modulePillActive : ''}`}
              style={module === '_all' ? { '--mc': '#64748b' } : {}}
              onClick={() => setModule('_all')}
              title="Browse all fields from every module"
            >
              <LayoutGrid size={11}/>
              All Fields
            </button>
            <span className={styles.pillDivider}/>
            {Object.entries(moduleMeta).map(([key, meta]) => {
              const Icon = MODULE_ICONS[key] || BarChart2;
              return (
                <button
                  key={key}
                  className={`${styles.modulePill} ${module === key ? styles.modulePillActive : ''}`}
                  style={module === key ? { '--mc': MODULE_COLORS[key] } : {}}
                  onClick={() => setModule(key)}
                >
                  <Icon size={11}/>
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button
            className={styles.saveHeaderBtn}
            onClick={() => setShowSaveModal(true)}
          >
            <Save size={12}/> Save Report
          </button>
        </div>
      </div>

      {/* ── Builder grid ── */}
      <div className={styles.builderGrid}>
        {/* ── Col 1: Available Fields ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Fields</span>
            <span className={styles.badge}>{availableFields.length}</span>
          </div>
          <div className={styles.searchBox}>
            <Search size={11} className={styles.searchIcon}/>
            <input
              className={styles.searchInput}
              placeholder="Search…"
              value={searchField}
              onChange={e => setSearchField(e.target.value)}
            />
          </div>
          {metaLoading ? (
            <div className={styles.loadingRow}><Loader2 size={14} className={styles.spin}/></div>
          ) : (
            <div className={styles.fieldList}>
              {Object.entries(
                availableFields.reduce((acc, f) => {
                  (acc[f.category] = acc[f.category] || []).push(f);
                  return acc;
                }, {})
              ).map(([cat, catFields]) => (
                <div key={cat}>
                  <div className={styles.catLabel}>{cat}</div>
                  {catFields.map(f => {
                    const Icon = TYPE_ICONS[f.type] || FileText;
                    return (
                      <div
                        key={f.key}
                        className={styles.fieldItem}
                        draggable
                        onDragStart={() => handleDragStart(f)}
                        onClick={() => addField(f)}
                        title={`${f.label} (${f.type})`}
                      >
                        <Icon size={10} className={styles.fieldTypeIcon}/>
                        <span>{f.label}</span>
                        <Plus size={10} className={styles.fieldAddIcon}/>
                      </div>
                    );
                  })}
                </div>
              ))}
              {!availableFields.length && (
                <div className={styles.emptyMsg}>All fields selected</div>
              )}
            </div>
          )}
        </div>

        {/* ── Col 2: Selected Fields + Filters ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Selected Fields</span>
            <span className={styles.muted}>drag to reorder</span>
            {selectedFields.length > 0 && (
              <button className={styles.clearBtn} onClick={clearFields}>Clear</button>
            )}
          </div>

          {/* Drop zone */}
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {selectedFields.length > 0 ? (
              <div className={styles.chipWrap}>
                {selectedFields.map((f) => (
                  <div key={f.key} className={styles.chip}
                    draggable
                    onDragStart={() => handleDragStart(f)}
                  >
                    <GripVertical size={9} className={styles.chipGrip}/>
                    {f.label}
                    <button className={styles.chipX} onClick={() => removeField(f.key)}><X size={8}/></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.dropHint}>
                <ArrowUpDown size={16}/>
                <span>Click or drag fields here</span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className={styles.sectionDivLine}>
            <span className={styles.sectionDivLabel}><Filter size={9}/> Filters</span>
          </div>
          <div className={styles.filterLogicRow}>
            {['AND', 'OR'].map(l => (
              <button key={l}
                className={`${styles.logicBtn} ${filterLogic === l ? styles.logicBtnActive : ''}`}
                onClick={() => setFilterLogic(l)}>{l}</button>
            ))}
          </div>

          <div className={styles.filterList}>
            {filters.map(f => {
              const fd = getFieldDef(f.field);
              const ops = getFilterOperators(f.field);
              return (
                <div key={f.id} className={styles.filterRow}>
                  <select className={styles.fSel}
                    value={f.field}
                    onChange={e => updateFilter(f.id, { ...f, field: e.target.value, operator: 'contains', value: '' })}
                  >
                    {fields.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}
                  </select>
                  <select className={styles.fSel}
                    value={f.operator}
                    onChange={e => updateFilter(f.id, { ...f, operator: e.target.value })}
                  >
                    {ops.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  {!['is empty', 'is not empty'].includes(f.operator) && (
                    f.operator === 'between' ? (
                      <>
                        <input className={styles.fInput} placeholder="From" value={f.value}
                          onChange={e => updateFilter(f.id, { ...f, value: e.target.value })}/>
                        <input className={styles.fInput} placeholder="To" value={f.value2 || ''}
                          onChange={e => updateFilter(f.id, { ...f, value2: e.target.value })}/>
                      </>
                    ) : fd?.type === 'boolean' ? (
                      <select className={styles.fSel} value={f.value}
                        onChange={e => updateFilter(f.id, { ...f, value: e.target.value })}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : fd?.choices?.length ? (
                      <select className={styles.fSel} value={f.value}
                        onChange={e => updateFilter(f.id, { ...f, value: e.target.value })}>
                        <option value="">Any</option>
                        {fd.choices.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input className={styles.fInput} placeholder="Value…" value={f.value}
                        onChange={e => updateFilter(f.id, { ...f, value: e.target.value })}/>
                    )
                  )}
                  <button className={styles.fRemove} onClick={() => removeFilter(f.id)}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              );
            })}
          </div>
          <button className={styles.addFilterBtn} onClick={addFilter}>
            <Plus size={11}/> Add Filter
          </button>
        </div>

        {/* ── Col 3: Group & Sort + Report Settings ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Group &amp; Sort</span>
          </div>

          <label className={styles.fieldLabel}>Group By</label>
          <select className={styles.fSel} style={{ width: '100%' }} value={groupBy}
            onChange={e => setGroupBy(e.target.value)}>
            <option value="">— None —</option>
            {selectedFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>

          <label className={styles.fieldLabel} style={{ marginTop: 8 }}>Sort By</label>
          <div className={styles.sortRow}>
            <select className={styles.fSel} style={{ flex: 1 }} value={sortField}
              onChange={e => setSortField(e.target.value)}>
              <option value="">— None —</option>
              {selectedFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <button
              className={`${styles.sortBtn} ${sortDir === 'asc' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortDir('asc')}><SortAsc size={12}/></button>
            <button
              className={`${styles.sortBtn} ${sortDir === 'desc' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortDir('desc')}><SortDesc size={12}/></button>
          </div>

          <div className={styles.sectionDivLine} style={{ margin: '10px 0 6px' }}>
            <span className={styles.sectionDivLabel}><Settings2 size={9}/> Settings</span>
          </div>

          <label className={styles.fieldLabel}>Report Name</label>
          <input className={styles.textInput} value={reportName}
            onChange={e => setReportName(e.target.value)} placeholder="Report name…"/>

          <label className={styles.fieldLabel} style={{ marginTop: 6 }}>Description</label>
          <textarea className={styles.textArea} rows={2} value={reportDesc}
            onChange={e => setReportDesc(e.target.value)} placeholder="Optional…"/>

          <label className={styles.fieldLabel} style={{ marginTop: 6 }}>Output</label>
          <div className={styles.outputRow}>
            {[
              { key: 'table', Icon: Table2, label: 'Table' },
              { key: 'chart', Icon: BarChart2, label: 'Chart' },
              { key: 'both', Icon: Activity, label: 'Both' },
            ].map(({ key, Icon, label }) => (
              <button key={key}
                className={`${styles.outputBtn} ${outputType === key ? styles.outputBtnActive : ''}`}
                onClick={() => setOutputType(key)}>
                <Icon size={13}/><span>{label}</span>
              </button>
            ))}
          </div>

          {outputType !== 'table' && (
            <>
              <label className={styles.fieldLabel} style={{ marginTop: 6 }}>Chart Type</label>
              <div className={styles.chartTypeRow}>
                {[
                  { key: 'bar', Icon: BarChart2 },
                  { key: 'line', Icon: LineChart },
                  { key: 'pie', Icon: PieChart },
                ].map(({ key, Icon }) => (
                  <button key={key}
                    className={`${styles.chartTypeBtn} ${chartType === key ? styles.chartTypeBtnActive : ''}`}
                    onClick={() => setChartType(key)}>
                    <Icon size={14}/>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Col 4: Saved Reports ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Saved Reports</span>
            <button className={styles.iconBtn} onClick={() => setShowSaveModal(true)}>
              <Plus size={11}/> Save
            </button>
          </div>
          <div className={styles.searchBox}>
            <Search size={11} className={styles.searchIcon}/>
            <input className={styles.searchInput} placeholder="Search…"
              value={savedSearch} onChange={e => setSavedSearch(e.target.value)}/>
          </div>
          <div className={styles.savedList}>
            {filteredSaved.length === 0 && (
              <div className={styles.emptyMsg}>No saved reports</div>
            )}
            {filteredSaved.map(rep => {
              const color = MODULE_COLORS[rep.module] || '#64748b';
              return (
                <div key={rep.id} className={styles.savedItem} onClick={() => loadSavedReport(rep)}>
                  <div className={styles.savedDot} style={{ background: color + '22', color }}/>
                  <div className={styles.savedInfo}>
                    <span className={styles.savedName}>{rep.name}</span>
                    <span className={styles.savedMeta}>{rep.module} · {new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                  <button className={styles.savedDel}
                    onClick={e => deleteReport(rep.id, e)}><Trash2 size={10}/></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Run bar ── */}
      <div className={styles.runBar}>
        <div className={styles.runBarLeft}>
          {result && (
            <span className={styles.resultBadge}>
              {result.total.toLocaleString()} records &nbsp;·&nbsp; Page {page} of {result.total_pages}
            </span>
          )}
        </div>
        <div className={styles.runBarRight}>
          <button className={styles.exportBtnExcel} onClick={handleExportExcel} disabled={exportingExcel}>
            {exportingExcel ? <Loader2 size={12} className={styles.spin}/> : <FileSpreadsheet size={12}/>}
            Excel
          </button>
          <button className={styles.exportBtnPdf} onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 size={12} className={styles.spin}/> : <Download size={12}/>}
            PDF
          </button>
          <button className={styles.exportBtnPrint} onClick={handlePrint}>
            <Printer size={12}/> Print
          </button>
          <button className={styles.runBtn} onClick={() => runReport(1)} disabled={running}>
            {running ? <Loader2 size={12} className={styles.spin}/> : <Play size={11} fill="currentColor"/>}
            Run Report
          </button>
        </div>
      </div>

      {/* ── Preview ── */}
      {(result || running) && (
        <div className={styles.previewWrap}>
          {/* Table */}
          {(outputType === 'table' || outputType === 'both') && (
            <div className={styles.tableWrap}>
              {running ? (
                <div className={styles.loadingRow} style={{ padding: 32 }}>
                  <Loader2 size={20} className={styles.spin}/> Running query…
                </div>
              ) : result?.rows?.length ? (
                <>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          {selectedFields.map(f => (
                            <th key={f.key} className={styles.th}
                              onClick={() => { setSortField(f.key); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); runReport(1); }}>
                              {f.label}
                              {sortField === f.key && (
                                sortDir === 'asc' ? <SortAsc size={9}/> : <SortDesc size={9}/>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={row.id || i} className={styles.tr}>
                            {selectedFields.map(f => {
                              const v = row[f.key];
                              return (
                                <td key={f.key} className={styles.td}>
                                  {f.key === 'status' ? (
                                    <span className={`${styles.statusBadge} ${styles['s_' + String(v).toLowerCase().replace(/\s/g, '_')]}`}>{v}</span>
                                  ) : f.type === 'boolean' ? (
                                    <span className={v ? styles.boolTrue : styles.boolFalse}>{v ? 'Yes' : 'No'}</span>
                                  ) : f.type === 'number' && typeof v === 'number' ? (
                                    <span className={styles.numCell}>
                                      {f.key.includes('amount') || f.key.includes('salary') || f.key.includes('fee') || f.key.includes('due') || f.key.includes('paid')
                                        ? `₹${v.toLocaleString('en-IN')}`
                                        : v.toLocaleString()
                                      }
                                    </span>
                                  ) : (
                                    <span>{v !== null && v !== undefined ? String(v) : '—'}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className={styles.pagination}>
                    <span className={styles.pageInfo}>
                      Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total}
                    </span>
                    <div className={styles.pageControls}>
                      <button className={styles.pageBtn} disabled={page === 1}
                        onClick={() => runReport(page - 1)}><ChevronLeft size={12}/></button>
                      {Array.from({ length: Math.min(result.total_pages, 5) }, (_, i) => {
                        const p = i + 1;
                        return (
                          <button key={p}
                            className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                            onClick={() => runReport(p)}>{p}</button>
                        );
                      })}
                      {result.total_pages > 5 && <span className={styles.pageDots}>…</span>}
                      {result.total_pages > 5 && (
                        <button className={`${styles.pageBtn} ${page === result.total_pages ? styles.pageBtnActive : ''}`}
                          onClick={() => runReport(result.total_pages)}>{result.total_pages}</button>
                      )}
                      <button className={styles.pageBtn} disabled={page >= result.total_pages}
                        onClick={() => runReport(page + 1)}><ChevronRight size={12}/></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.emptyMsg} style={{ padding: 24 }}>No records found</div>
              )}
            </div>
          )}

          {/* Chart panel */}
          {(outputType === 'chart' || outputType === 'both') && result?.chart_data?.length > 0 && (
            <div className={styles.chartPanel}>
              <div className={styles.chartPanelHeader}>
                <span className={styles.chartPanelTitle}>
                  {groupBy
                    ? `By ${getFieldDef(groupBy)?.label || groupBy}`
                    : 'Overview'}
                </span>
                <div className={styles.chartTypeRow}>
                  {[
                    { key: 'bar', Icon: BarChart2 },
                    { key: 'line', Icon: LineChart },
                    { key: 'pie', Icon: PieChart },
                  ].map(({ key, Icon }) => (
                    <button key={key}
                      className={`${styles.chartTypeBtn} ${chartType === key ? styles.chartTypeBtnActive : ''}`}
                      onClick={() => setChartType(key)}>
                      <Icon size={12}/>
                    </button>
                  ))}
                </div>
              </div>
              {chartType === 'bar'  && <BarChartViz  data={result.chart_data}/>}
              {chartType === 'line' && <LineChartViz data={result.chart_data}/>}
              {chartType === 'pie'  && <PieChartViz  data={result.chart_data}/>}
              {/* Summary stats */}
              {result.summary && (
                <div className={styles.summaryRow}>
                  {Object.entries(result.summary).map(([k, v]) => (
                    <div key={k} className={styles.summaryItem}>
                      <span className={styles.summaryVal}>
                        {typeof v === 'number' && v > 999
                          ? (k.includes('salary') || k.includes('amount') || k.includes('gross') || k.includes('net')
                              ? `₹${(v / 1000).toFixed(0)}k`
                              : v.toLocaleString())
                          : String(v)}
                      </span>
                      <span className={styles.summaryKey}>{k.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Formula Builder ── */}
      <div className={styles.formulaSection}>
        <div className={styles.formulaHeader}>
          <Zap size={12} className={styles.formulaIcon}/>
          <span className={styles.formulaTitle}>Formula Builder</span>
          <span className={styles.formulaSub}>Create calculated columns</span>
        </div>
        <div className={styles.formulaRow}>
          <input className={styles.formulaNameInput} placeholder="Column name…"
            value={fName} onChange={e => setFName(e.target.value)}/>
          <span className={styles.formulaEq}>=</span>
          <select className={styles.fSel} value={fField2} onChange={e => setFField2(e.target.value)}>
            <option value="">Field…</option>
            {numericFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select className={styles.formulaOpSel} value={fOp} onChange={e => setFOp(e.target.value)}>
            {['+','-','×','÷'].map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <select className={styles.fSel} value={fField1} onChange={e => setFField1(e.target.value)}>
            <option value="">Field…</option>
            {numericFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button className={styles.addFormulaBtn} onClick={addFormula}>
            <Plus size={11}/> Add
          </button>
        </div>
        {formulas.length > 0 && (
          <div className={styles.formulaList}>
            {formulas.map((f, i) => (
              <div key={i} className={styles.formulaTag}>
                <span>{f.name} = {f.field2} {f.op} {f.field1}</span>
                <button onClick={() => setFormulas(p => p.filter((_, j) => j !== i))}><X size={9}/></button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.formulaHint}>
          <span>💡</span>
          <span>Example: <em>Due Amount = Total Amount − Paid Amount</em></span>
        </div>
      </div>
    </div>
  );
}
