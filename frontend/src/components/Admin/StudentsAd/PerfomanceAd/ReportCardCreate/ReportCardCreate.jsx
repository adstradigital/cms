
import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  Type, Table as TableIcon,
  UserSquare, FileCheck, Save, Trash2,
  GripVertical, Plus,
  Printer, QrCode,
  AlignLeft, AlignCenter, AlignRight, Palette,
  ChevronLeft, Building2, Scissors, Upload,
  PlusCircle, Copy,
  Minus, TextQuote,
  Award, BarChart3, Droplets, Columns, Image as ImageIcon,
  RotateCcw, RotateCw, Loader2, CheckSquare,
  List, Move, ChevronDown, X, Bold, Italic, Underline
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_CONFIG } from '@/api/config';
import styles from './ReportCardCreate.module.css';

const CLASSES = ['Class 10-A', 'Class 10-B', 'Class 9-A', 'Class 9-B', 'Class 8-A'];

const STUDENTS = {
  'Class 10-A': [
    { id: 1, name: 'Priya Suresh', roll: '10A01', dob: '14 Mar 2009', init: 'PS', color: '#2563eb' },
    { id: 2, name: 'Arun Kumar', roll: '10A02', dob: '22 Jul 2009', init: 'AK', color: '#7c3aed' },
    { id: 3, name: 'Meera Pillai', roll: '10A03', dob: '05 Dec 2008', init: 'MP', color: '#059669' }
  ],
  'Class 10-B': [{ id: 4, name: 'Rahul Singh', roll: '10B01', dob: '11 Jan 2009', init: 'RS', color: '#db2777' }],
  'Class 9-A': [],
  'Class 9-B': [],
  'Class 8-A': []
};

const SUBJECT_SETS = {
  'Kerala State Board': ['Malayalam', 'English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Science'],
  CBSE: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
  ICSE: ['English Language', 'English Lit.', 'Mathematics', 'Science', 'History & Civics', 'Geography', 'French'],
  'University (UG)': ['Core Subject 1', 'Core Subject 2', 'Elective 1', 'Language', 'Practical']
};

const GRADE_SYSTEMS = {
  'CGPA (10-point)': [
    { min: 91, g: 'A1', gp: 10, hex: '#059669' },
    { min: 81, g: 'A2', gp: 9, hex: '#10b981' },
    { min: 33, g: 'D', gp: 4, hex: '#ef4444' },
    { min: 0, g: 'E', gp: 0, hex: '#dc2626' }
  ],
  'University (4.0 Scale)': [
    { min: 90, g: 'A', gp: 4, hex: '#059669' },
    { min: 0, g: 'F', gp: 0, hex: '#dc2626' }
  ]
};

const BLOCK_TYPES = [
  { type: 'header', label: 'School Header', icon: <Building2 size={16} /> },
  { type: 'student_info', label: 'Student Data', icon: <UserSquare size={16} /> },
  { type: 'marks_table', label: 'Marks Entry', icon: <TableIcon size={16} /> },
  { type: 'grade_summary', label: 'Grade Summary', icon: <Award size={16} /> },
  { type: 'grading_legend', label: 'Grading Legend', icon: <CheckSquare size={16} /> },
  { type: 'attendance', label: 'Attendance', icon: <Droplets size={16} /> },
  { type: 'cocurricular', label: 'Co-Curricular', icon: <PlusCircle size={16} /> },
  { type: 'chart', label: 'Performance Chart', icon: <BarChart3 size={16} /> },
  { type: 'col_group', label: '2-Column Group', icon: <Columns size={16} /> },
  { type: 'watermark', label: 'Watermark', icon: <ImageIcon size={16} /> },
  { type: 'remarks', label: 'Teacher Remarks', icon: <Type size={16} /> },
  { type: 'signatures', label: 'Signature Block', icon: <FileCheck size={16} /> },
  { type: 'qr_code', label: 'Verification QR', icon: <QrCode size={16} /> },
  { type: 'custom_field', label: 'Custom Field', icon: <PlusCircle size={16} /> },
  { type: 'spacer', label: 'Smart Gap', icon: <Minus size={16} /> },
  { type: 'page_break', label: 'Page Break', icon: <Scissors size={16} /> }
];

const TEMPLATES = [
  { id: 'classic', name: 'Classic Academic' },
  { id: 'modern', name: 'Modern Elite' },
  { id: 'premium', name: 'Premium Glass' }
];

const ACCENT_PRESETS = [
  { name: 'Navy', primary: '#1e3a8a' },
  { name: 'Forest', primary: '#14532d' },
  { name: 'Slate', primary: '#1e293b' }
];

const BG_PRESETS = [
  { name: 'None', hex: 'transparent' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Soft Blue', hex: '#f1f5f9' },
  { name: 'Soft Slate', hex: '#f8fafc' },
  { name: 'Mist', hex: 'rgba(37, 99, 235, 0.03)' }
];

const DEFAULT_VISIBLE_COLS = ['theory', 'internal', 'total', 'grade', 'grade_point', 'remarks'];
const FONT_OPTIONS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New'];
const LOCAL_TEMPLATE_KEY = 'report_card_templates_v1';

const getGrade = (pct, system) => {
  const s = GRADE_SYSTEMS[system] || GRADE_SYSTEMS['CGPA (10-point)'];
  return s.find((g) => pct >= g.min) || s[s.length - 1];
};

const getPct = (theory, internal, tMax, iMax) => {
  if (!tMax && !iMax) return 0;
  return Math.round(((theory + internal) / (tMax + iMax)) * 100);
};

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const abbrev4 = (txt) => (txt || '').slice(0, 4);
const parseRatio = (ratio) => {
  const [l, r] = (ratio || '50/50').split('/').map((v) => parseInt(v, 10) || 50);
  return { left: l, right: r };
};
const widthToPercent = (width) => {
  if (width === 'half') return 50;
  if (width === 'third') return 33.33;
  if (width === 'fourth') return 25;
  return 100;
};
const defaultFloatWidth = (width) => {
  const base = widthToPercent(width);
  if (base >= 100) return 30;
  return base;
};

const defaultBlockBase = {
  width: 'full',
  align: 'left',
  freeMove: false,
  posX: 0,
  posY: 0,
  floatWidth: 30,
  bg: 'transparent',
  radius: 0,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '#e2e8f0',
  borderSides: { top: false, right: false, bottom: false, left: false },
  padding: { top: 6, right: 6, bottom: 6, left: 6 },
  titleSize: '0.75rem',
  titleWeight: '900',
  contentSize: '0.85rem',
  contentWeight: '400',
  titleColor: '#1e293b',
  contentColor: '#475569',
  fontFamily: 'Arial'
};

const makeDefaultConfig = (type) => {
  if (type === 'header') return { ...defaultBlockBase, schoolName: 'Global International High School', tagline: 'Empowering Minds Since 1998', session: '2024-25', logo: null, titleSize: '1.3rem' };
  if (type === 'student_info') return { ...defaultBlockBase, showPhoto: false, showRoll: true, showDOB: true, bg: '#f8fafc', radius: 10, borderSides: { top: true, right: true, bottom: true, left: true }, padding: { top: 12, right: 12, bottom: 12, left: 12 } };
  if (type === 'marks_table') return { ...defaultBlockBase, board: 'Kerala State Board', gradeSys: 'CGPA (10-point)', tMax: 80, iMax: 20, visibleCols: [...DEFAULT_VISIBLE_COLS], customCols: [], alternateRows: false };
  if (type === 'grade_summary') return { ...defaultBlockBase, board: 'Kerala State Board', gradeSys: 'CGPA (10-point)', rank: 'N/A', accentColor: '#2563eb', grade: 'A1', label: 'Outstanding Performance', desc: 'Based on weighted aggregate of all subjects' };
  if (type === 'grading_legend') return { ...defaultBlockBase, items: [{ min: 91, max: 100, grade: 'A1', label: 'Outstanding' }, { min: 81, max: 90, grade: 'A2', label: 'Very Good' }, { min: 71, max: 80, grade: 'B1', label: 'Good' }, { min: 61, max: 70, grade: 'B2', label: 'Fair' }] };
  if (type === 'attendance') return { ...defaultBlockBase, workingDays: 220, presentDays: 198 };
  if (type === 'cocurricular') return { ...defaultBlockBase, title: 'Co-Curricular Activities', items: [{ activity: 'Sports', grade: '4' }, { activity: 'Art', grade: 'A' }] };
  if (type === 'chart') return { ...defaultBlockBase, board: 'Kerala State Board' };
  if (type === 'watermark') return { ...defaultBlockBase, src: null, opacity: 10 };
  if (type === 'col_group') return { ...defaultBlockBase, ratio: '50/50', leftId: '', rightId: '' };
  if (type === 'remarks') return { ...defaultBlockBase, title: "Teacher's Remarks", content: 'Student exhibits steady progress.' };
  if (type === 'signatures') return { ...defaultBlockBase, sigs: ['Teacher', 'Principal', 'Parent'] };
  if (type === 'custom_field') return { ...defaultBlockBase, fieldType: 'text', label: 'Custom Field', content: '' };
  if (type === 'spacer') return { ...defaultBlockBase, gap: 20, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
  if (type === 'page_break') return { ...defaultBlockBase, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
  return { ...defaultBlockBase };
};

const normalizeBlock = (block) => {
  const defaults = makeDefaultConfig(block.type);
  return {
    ...block,
    config: {
      ...defaults,
      ...(block.config || {}),
      borderSides: { ...defaults.borderSides, ...(block.config?.borderSides || {}) },
      padding: { ...defaults.padding, ...(block.config?.padding || {}) },
      visibleCols: block.config?.visibleCols || defaults.visibleCols,
      customCols: block.config?.customCols || defaults.customCols
    }
  };
};

const initialBlocks = [
  { id: 'b1', type: 'header', config: makeDefaultConfig('header') },
  { id: 'b2', type: 'student_info', config: makeDefaultConfig('student_info') },
  { id: 'b3', type: 'marks_table', config: makeDefaultConfig('marks_table') },
  { id: 'b4', type: 'remarks', config: makeDefaultConfig('remarks') },
  { id: 'b5', type: 'signatures', config: makeDefaultConfig('signatures') }
].map(normalizeBlock);

const buildInitialMarks = (board = 'Kerala State Board') => {
  const data = {};
  (SUBJECT_SETS[board] || []).forEach((s) => {
    data[s] = { theory: 70, internal: 18, tMax: 80, iMax: 20, remarks: '', custom: {} };
  });
  return data;
};

const initialState = {
  activeBlocks: initialBlocks,
  selBlockId: null,
  selClass: 'Class 10-A',
  selStudent: STUDENTS['Class 10-A'][0] || null,
  marks: buildInitialMarks('Kerala State Board'),
  design: { layout: 'classic', accent: ACCENT_PRESETS[0], paperSize: 'A4', showGrid: true, gridSize: 2 },
  history: { past: [], future: [] }
};

const snapshot = (state) => ({
  activeBlocks: deepClone(state.activeBlocks),
  marks: deepClone(state.marks),
  design: deepClone(state.design)
});

const withHistory = (state, nextPartial) => ({
  ...state,
  ...nextPartial,
  history: { past: [...state.history.past, snapshot(state)], future: [] }
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_BLOCKS':
      return withHistory(state, { activeBlocks: (action.payload || []).map(normalizeBlock) });
    case 'UPDATE_BLOCK': {
      const { id, key, value, updater } = action.payload;
      const activeBlocks = state.activeBlocks.map((b) => {
        if (b.id !== id) return b;
        const nextConfig = updater ? updater(b.config) : { ...b.config, [key]: value };
        return normalizeBlock({ ...b, config: nextConfig });
      });
      return withHistory(state, { activeBlocks });
    }
    case 'ADD_BLOCK':
      return withHistory(state, { activeBlocks: [...state.activeBlocks, normalizeBlock(action.payload)], selBlockId: action.payload.id });
    case 'REMOVE_BLOCK': {
      const id = action.payload;
      const activeBlocks = state.activeBlocks.filter((b) => b.id !== id).map((b) => {
        if (b.type !== 'col_group') return b;
        const c = { ...b.config };
        if (c.leftId === id) c.leftId = '';
        if (c.rightId === id) c.rightId = '';
        return { ...b, config: c };
      });
      return withHistory(state, { activeBlocks, selBlockId: state.selBlockId === id ? null : state.selBlockId });
    }
    case 'DUPLICATE_BLOCK': {
      const block = state.activeBlocks.find((b) => b.id === action.payload);
      if (!block) return state;
      const newId = `b${Date.now()}`;
      const index = state.activeBlocks.findIndex((b) => b.id === block.id);
      const activeBlocks = [...state.activeBlocks];
      activeBlocks.splice(index + 1, 0, { ...deepClone(block), id: newId });
      return withHistory(state, { activeBlocks, selBlockId: newId });
    }
    case 'REORDER_BLOCKS':
      return withHistory(state, { activeBlocks: action.payload.map(normalizeBlock) });
    case 'SET_MARKS':
      return withHistory(state, { marks: action.payload || {} });
    case 'SET_DESIGN':
      return withHistory(state, { design: { ...state.design, ...(action.payload || {}) } });
    case 'SET_SELECTED_BLOCK':
      return { ...state, selBlockId: action.payload };
    case 'SET_CLASS':
      return { ...state, selClass: action.payload, selStudent: STUDENTS[action.payload]?.[0] || null };
    case 'SET_STUDENT':
      return { ...state, selStudent: action.payload || null };
    case 'UNDO': {
      if (!state.history.past.length) return state;
      const prev = state.history.past[state.history.past.length - 1];
      return {
        ...state,
        activeBlocks: prev.activeBlocks,
        marks: prev.marks,
        design: prev.design,
        history: { past: state.history.past.slice(0, -1), future: [snapshot(state), ...state.history.future] }
      };
    }
    case 'REDO': {
      if (!state.history.future.length) return state;
      const next = state.history.future[0];
      return {
        ...state,
        activeBlocks: next.activeBlocks,
        marks: next.marks,
        design: next.design,
        history: { past: [...state.history.past, snapshot(state)], future: state.history.future.slice(1) }
      };
    }
    case 'LOAD_TEMPLATE':
      return withHistory(state, { activeBlocks: (action.payload.activeBlocks || []).map(normalizeBlock), design: { ...state.design, ...(action.payload.design || {}) }, selBlockId: null });
    default:
      return state;
  }
};

const ReportCardCreate = ({ onBack }) => {
  const { user } = useAuth();
  const fileInputRef = useRef(new Map());
  const canvasPageRef = useRef(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState('Kerala State Board');
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [bulkProgress, setBulkProgress] = useState({ running: false, current: 0, total: 0 });
  const [mouseDownData, setMouseDownData] = useState(null);
  const [floatDrag, setFloatDrag] = useState({ id: null, sx: 0, sy: 0, bx: 0, by: 0, cx: 0, cy: 0 });
  const [leftTab, setLeftTab] = useState('blocks'); // blocks | explorer
  const [openAccordions, setOpenAccordions] = useState({});
  const toggleAccordion = (key) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  const Accordion = ({ id, title, icon, children, defaultOpen = false }) => {
    const isOpen = openAccordions[id] ?? defaultOpen;
    return (
      <div className={`${styles.accordion} ${isOpen ? styles.accordionOpen : ''}`}>
        <button className={styles.accordionHead} onClick={() => toggleAccordion(id)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {title}</span>
          <ChevronDown size={14} className={styles.accordionChevron} />
        </button>
        {isOpen && <div className={styles.accordionBody}>{children}</div>}
      </div>
    );
  };
  const { activeBlocks, selBlockId, selClass, selStudent, marks, design, history } = state;

  useEffect(() => {
    const timer = setTimeout(() => setToastMsg(''), 2200);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    const tableBlock = activeBlocks.find((b) => b.type === 'marks_table' && b.config.board === selectedBoard) || activeBlocks.find((b) => b.type === 'marks_table');
    const tDefault = Number(tableBlock?.config?.tMax || 80);
    const iDefault = Number(tableBlock?.config?.iMax || 20);
    const nextMarks = {};
    (SUBJECT_SETS[selectedBoard] || []).forEach((s) => {
      const prev = marks[s] || {};
      nextMarks[s] = {
        theory: Number.isFinite(prev.theory) ? prev.theory : 70,
        internal: Number.isFinite(prev.internal) ? prev.internal : 18,
        tMax: Number.isFinite(prev.tMax) ? prev.tMax : tDefault,
        iMax: Number.isFinite(prev.iMax) ? prev.iMax : iDefault,
        remarks: prev.remarks || '',
        custom: prev.custom || {}
      };
    });
    dispatch({ type: 'SET_MARKS', payload: nextMarks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isEditable = e.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
      if (isEditable) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (mouseDownData && !floatDrag.id) {
        const dx = Math.abs(e.clientX - mouseDownData.startX);
        const dy = Math.abs(e.clientY - mouseDownData.startY);
        if (dx > 5 || dy > 5) {
          const block = activeBlocks.find(b => b.id === mouseDownData.id);
          if (!block) return;
          const canvas = canvasPageRef.current;
          const blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
          if (!blockEl || !canvas) return;

          const bRect = blockEl.getBoundingClientRect();
          const cRect = canvas.getBoundingClientRect();
          const widthPercent = (bRect.width / cRect.width) * 100;
          const leftPercent = ((bRect.left - cRect.left) / cRect.width) * 100;
          const topPercent = ((bRect.top - cRect.top) / cRect.height) * 100;

          if (!block.config.freeMove) {
            dispatch({
              type: 'UPDATE_BLOCK',
              payload: {
                id: block.id,
                updater: (cfg) => ({ ...cfg, freeMove: true, floatWidth: widthPercent, posX: leftPercent, posY: topPercent })
              }
            });
          }

          setFloatDrag({
            id: block.id,
            sx: e.clientX,
            sy: e.clientY,
            bx: leftPercent,
            by: topPercent,
            cx: leftPercent,
            cy: topPercent
          });
          setMouseDownData(null);
        }
      }

      if (floatDrag.id) {
        const canvas = canvasPageRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const block = activeBlocks.find((b) => b.id === floatDrag.id);
        if (!block) return;
        const w = Number(block.config.floatWidth || defaultFloatWidth(block.config.width));
        const dx = ((e.clientX - floatDrag.sx) / Math.max(rect.width, 1)) * 100;
        const dy = ((e.clientY - floatDrag.sy) / Math.max(rect.height, 1)) * 100;
        const nx = Math.max(0, Math.min(100 - w, floatDrag.bx + dx));
        const ny = Math.max(0, Math.min(95, floatDrag.by + dy));
        setFloatDrag((prev) => ({ ...prev, cx: nx, cy: ny }));
      }
    };
    const onUp = () => {
      const id = floatDrag.id;
      const x = floatDrag.cx;
      const y = floatDrag.cy;
      if (id) {
        dispatch({ type: 'UPDATE_BLOCK', payload: { id, updater: (cfg) => ({ ...cfg, posX: x, posY: y }) } });
      }
      setFloatDrag({ id: null, sx: 0, sy: 0, bx: 0, by: 0, cx: 0, cy: 0 });
      setMouseDownData(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [floatDrag, activeBlocks, mouseDownData]);

  const setFileRef = (id, node) => {
    const map = fileInputRef.current;
    if (node) map.set(id, node);
    else map.delete(id);
  };

  const triggerFileInput = (id) => fileInputRef.current.get(id)?.click();
  const updateBlockConfig = (id, key, value) => dispatch({ type: 'UPDATE_BLOCK', payload: { id, key, value } });
  const updateConfig = (id, config) => dispatch({ type: 'UPDATE_BLOCK', payload: { id, updater: (prev) => ({ ...prev, ...config }) } });

  const handleGenericUpload = (e, bId, field = 'content') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateBlockConfig(bId, field, reader.result);
    reader.readAsDataURL(file);
  };

  const onDragStart = (index, block) => {
    if (block?.type === 'watermark' || block?.config?.freeMove) return;
    setDraggedIndex(index);
  };

  const onDragOver = (e) => e.preventDefault();
  
  const onDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const draggedBlock = activeBlocks[draggedIndex];
    if (!draggedBlock) return;
    
    const next = [...activeBlocks];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(index, 0, moved);
    dispatch({ type: 'REORDER_BLOCKS', payload: next });
    setDraggedIndex(null);
  };

  const addBlock = (type) => {
    const id = `b${Date.now()}`;
    dispatch({ type: 'ADD_BLOCK', payload: { id, type, config: makeDefaultConfig(type) } });
  };

  const removeBlock = (id) => dispatch({ type: 'REMOVE_BLOCK', payload: id });
  const duplicateBlock = (id) => dispatch({ type: 'DUPLICATE_BLOCK', payload: id });

  const handleToggleBorderSide = (id, side) => {
    dispatch({
      type: 'UPDATE_BLOCK',
      payload: {
        id,
        updater: (config) => ({ ...config, borderSides: { ...config.borderSides, [side]: !config.borderSides?.[side] } })
      }
    });
  };

  const handlePaddingChange = (id, side, value) => {
    const parsed = Math.max(0, Math.min(60, parseInt(value || 0, 10) || 0));
    dispatch({ type: 'UPDATE_BLOCK', payload: { id, updater: (config) => ({ ...config, padding: { ...(config.padding || {}), [side]: parsed } }) } });
  };

  const updateMarks = (subject, key, value) => {
    const next = deepClone(marks);
    if (!next[subject]) next[subject] = { theory: 0, internal: 0, tMax: 80, iMax: 20, remarks: '', custom: {} };
    if (key.startsWith('custom.')) {
      const cKey = key.replace('custom.', '');
      next[subject].custom = { ...(next[subject].custom || {}), [cKey]: value };
    } else {
      next[subject][key] = key === 'remarks' ? value : (parseFloat(value) || 0);
    }
    dispatch({ type: 'SET_MARKS', payload: next });
  };

  const applyRichCommand = (blockId, command, value = null) => {
    dispatch({
      type: 'UPDATE_BLOCK',
      payload: {
        id: blockId,
        updater: (config) => {
          const node = document.getElementById(`rich-editor-${blockId}`);
          if (!node) return config;
          node.focus();
          document.execCommand(command, false, value);
          return { ...config, content: node.innerHTML };
        }
      }
    });
  };

  const saveTemplate = async () => {
    const name = window.prompt('Template name?', `Report Template ${new Date().toLocaleDateString()}`);
    if (!name) return;
    const payload = { name, activeBlocks, design };
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const endpointCandidates = [
      `${API_CONFIG.BASE_URL}/report-templates/`,
      `${API_CONFIG.BASE_URL}/exams/report-templates/`,
      '/api/report-templates/'
    ];

    for (let i = 0; i < endpointCandidates.length; i += 1) {
      try {
        const res = await fetch(endpointCandidates[i], { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!res.ok) continue;
        const data = await res.json().catch(() => ({}));
        if (data?.id) setSelectedTemplateId(data.id);
        setToastMsg('Template saved successfully');
        return;
      } catch (e) {
        // try next endpoint
      }
    }

    // Fallback: local storage save so user can continue without backend endpoint
    try {
      const raw = localStorage.getItem(LOCAL_TEMPLATE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const localId = `local_${Date.now()}`;
      const next = [{ id: localId, name, ...payload, _local: true }, ...list.filter((x) => x.name !== name)];
      localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(next));
      setSelectedTemplateId(localId);
      setToastMsg('Template saved locally');
    } catch (e) {
      setToastMsg('Template save failed');
    }
  };

  const loadTemplates = async () => {
    setTemplateModalOpen(true);
    setIsLoadingTemplates(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const endpointCandidates = [
        `${API_CONFIG.BASE_URL}/report-templates/`,
        `${API_CONFIG.BASE_URL}/exams/report-templates/`,
        '/api/report-templates/'
      ];

      let loaded = [];
      for (let i = 0; i < endpointCandidates.length; i += 1) {
        try {
          const res = await fetch(endpointCandidates[i], { headers });
          if (!res.ok) continue;
          const data = await res.json();
          loaded = Array.isArray(data) ? data : (data.results || []);
          if (loaded.length) break;
        } catch (e) {
          // try next
        }
      }

      const raw = localStorage.getItem(LOCAL_TEMPLATE_KEY);
      const localList = raw ? JSON.parse(raw) : [];
      setTemplatesList([...(loaded || []), ...(localList || [])]);
    } catch (e) {
      const raw = localStorage.getItem(LOCAL_TEMPLATE_KEY);
      const localList = raw ? JSON.parse(raw) : [];
      setTemplatesList(localList || []);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const applyTemplate = (tpl) => {
    dispatch({ type: 'LOAD_TEMPLATE', payload: { activeBlocks: tpl.activeBlocks || tpl.blocks || [], design: tpl.design || {} } });
    setSelectedTemplateId(tpl.id || null);
    setTemplateModalOpen(false);
    setToastMsg('Template loaded');
  };

  const generateAll = async () => {
    const students = STUDENTS[selClass] || [];
    if (!students.length) return;
    setBulkProgress({ running: true, current: 0, total: students.length });

    if (selectedTemplateId) {
      try {
        const res = await fetch('/api/report-cards/generate-bulk/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: selectedTemplateId, classId: selClass })
        });
        if (res.ok) {
          setBulkProgress({ running: false, current: students.length, total: students.length });
          return setToastMsg('Bulk generation started on server');
        }
      } catch (e) {
        // fallback
      }
    }

    for (let i = 0; i < students.length; i += 1) {
      dispatch({ type: 'SET_STUDENT', payload: students[i] });
      setBulkProgress({ running: true, current: i + 1, total: students.length });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120));
      window.print();
    }
    setBulkProgress({ running: false, current: students.length, total: students.length });
    setToastMsg('Bulk generation done');
  };

  const getComputedOverall = (board, gradeSys) => {
    let total = 0;
    let maxTotal = 0;
    let gpSum = 0;
    let counted = 0;
    (SUBJECT_SETS[board] || []).forEach((s) => {
      const m = marks[s] || {};
      const theory = Number(m.theory || 0);
      const internal = Number(m.internal || 0);
      const tMax = Number(m.tMax || 80);
      const iMax = Number(m.iMax || 20);
      const pct = getPct(theory, internal, tMax, iMax);
      const g = getGrade(pct, gradeSys);
      total += theory + internal;
      maxTotal += tMax + iMax;
      gpSum += Number(g.gp || 0);
      counted += 1;
    });
    const overallPct = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
    const overallGrade = getGrade(overallPct, gradeSys);
    const gpa = counted ? gpSum / counted : 0;
    const status = overallPct >= 75 ? 'Distinction' : (overallPct >= 33 ? 'Pass' : 'Fail');
    return { overallGrade, gpa, status };
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const watermarkBlocks = activeBlocks.filter((b) => b.type === 'watermark');
  const groupedChildIds = new Set(activeBlocks.filter((b) => b.type === 'col_group').flatMap((b) => [b.config.leftId, b.config.rightId]).filter(Boolean));
  const topLevelBlocks = activeBlocks.filter((b) => b.type !== 'watermark' && !groupedChildIds.has(b.id));

  const getBlockBaseStyle = (block) => {
    const sides = block.config.borderSides || {};
    const bw = Number(block.config.borderWidth || 1);
    const padding = block.config.padding || {};
    return {
      '--accent': design.accent.primary,
      backgroundColor: block.config.bg || 'transparent',
      borderRadius: `${Number(block.config.radius || 0)}px`,
      borderStyle: block.config.borderStyle || 'solid',
      borderColor: block.config.borderColor || '#e2e8f0',
      borderTopWidth: sides.top ? `${bw}px` : '0',
      borderRightWidth: sides.right ? `${bw}px` : '0',
      borderBottomWidth: sides.bottom ? `${bw}px` : '0',
      borderLeftWidth: sides.left ? `${bw}px` : '0',
      paddingTop: `${Number(padding.top ?? 6)}px`,
      paddingRight: `${Number(padding.right ?? 6)}px`,
      paddingBottom: `${Number(padding.bottom ?? 6)}px`,
      paddingLeft: `${Number(padding.left ?? 6)}px`,
      fontFamily: block.config.fontFamily || 'Arial'
    };
  };

  const renderRichToolbar = (block) => (
    <div className={styles.richToolbar}>
      <button className={styles.richToolbarBtn} type="button" onClick={() => applyRichCommand(block.id, 'bold')}><b>B</b></button>
      <button className={styles.richToolbarBtn} type="button" onClick={() => applyRichCommand(block.id, 'italic')}><i>I</i></button>
      <button className={styles.richToolbarBtn} type="button" onClick={() => applyRichCommand(block.id, 'underline')}><u>U</u></button>
      <input type="color" className={styles.sInput} style={{ width: 44, padding: 2 }} onChange={(e) => applyRichCommand(block.id, 'foreColor', e.target.value)} />
      <select className={styles.sSelect} style={{ maxWidth: 150 }} onChange={(e) => applyRichCommand(block.id, 'fontName', e.target.value)} defaultValue={block.config.fontFamily || 'Arial'}>{FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
    </div>
  );

  const renderBlockInner = (block, nested = false) => {
    const config = block.config;
    switch (block.type) {
      case 'header':
        return (
          <div className={styles.pHeader}>
            <div className={styles.pLogo} style={{ background: design.accent.primary, overflow: 'hidden' }}>{block.config.logo ? <img src={block.config.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : 'Logo'}</div>
            <div className={styles.pHeaderContent}>
              <h2 className={styles.pSchoolName} style={{ fontSize: block.config.titleSize, fontWeight: block.config.titleWeight, color: block.config.titleColor, fontFamily: block.config.fontFamily }}>{block.config.schoolName || 'School Name'}</h2>
              <p className={styles.pTagline} style={{ color: block.config.contentColor }}>{block.config.tagline || 'Tagline'}</p>
              <div className={styles.pSessionRow} style={{ color: design.accent.primary }}><span>{block.config.session}</span></div>
            </div>
          </div>
        );
      case 'student_info':
        return selStudent ? (
          <div className={styles.pStudentData} style={{ background: nested ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
            {!nested && selBlockId === block.id && !isPrintPreview && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select
                  className={styles.sSelect}
                  value={selClass}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => dispatch({ type: 'SET_CLASS', payload: e.target.value })}
                >
                  {CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select
                  className={styles.sSelect}
                  value={selStudent?.id || ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_STUDENT',
                      payload: (STUDENTS[selClass] || []).find((s) => s.id === parseInt(e.target.value, 10)) || null
                    })
                  }
                >
                  {(STUDENTS[selClass] || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className={styles.pStdRow}>
              <div className={styles.pStdField}><b>Name</b><span style={{ fontWeight: block.config.titleWeight, color: block.config.contentColor }}>{selStudent.name}</span></div>
              {block.config.showRoll && <div className={styles.pStdField}><b>Roll</b><span>{selStudent.roll}</span></div>}
              <div className={styles.pStdField}><b>Class</b><span>{selClass}</span></div>
              {block.config.showDOB && <div className={styles.pStdField}><b>DOB</b><span>{selStudent.dob}</span></div>}
            </div>
          </div>
        ) : <div className={styles.pPlaceholder}>Click to select student for preview</div>;
      case 'marks_table': {
        const visibleCols = block.config.visibleCols || DEFAULT_VISIBLE_COLS;
        const customCols = block.config.customCols || [];
        return (
          <table className={styles.pTable}>
            <thead><tr><th>Subject</th>{visibleCols.includes('theory') && <th>Theory</th>}{visibleCols.includes('internal') && <th>Internal</th>}{visibleCols.includes('total') && <th className={styles.bold}>Total</th>}{visibleCols.includes('grade') && <th>Grade</th>}{visibleCols.includes('grade_point') && <th>Grade Point</th>}{visibleCols.includes('remarks') && <th>Remarks</th>}{customCols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {(SUBJECT_SETS[block.config.board] || []).map((s, idx) => {
                const m = marks[s] || { theory: 0, internal: 0, tMax: 80, iMax: 20, custom: {} };
                const total = Number(m.theory || 0) + Number(m.internal || 0);
                const p = getPct(Number(m.theory || 0), Number(m.internal || 0), Number(m.tMax || 80), Number(m.iMax || 20));
                const g = getGrade(p, block.config.gradeSys);
                return <tr key={s} style={block.config.alternateRows && idx % 2 === 1 ? { background: '#f8fafc' } : undefined}><td className={styles.bold}>{s}</td>{visibleCols.includes('theory') && <td>{m.theory}</td>}{visibleCols.includes('internal') && <td>{m.internal}</td>}{visibleCols.includes('total') && <td className={styles.bold}>{total}</td>}{visibleCols.includes('grade') && <td style={{ color: g.hex, fontWeight: 800 }}>{g.g}</td>}{visibleCols.includes('grade_point') && <td className={styles.bold}>{g.gp}</td>}{visibleCols.includes('remarks') && <td>{m.remarks || '-'}</td>}{customCols.map((c) => <td key={`${s}-${c.key}`}>{m.custom?.[c.key] ?? ''}</td>)}</tr>;
              })}
            </tbody>
          </table>
        );
      }
      case 'grade_summary':
        return (
          <div className={styles.pGradeSummary} style={{ ...getBlockBaseStyle(block), borderColor: config.accentColor }}>
            <div className={styles.pGradeHero} style={{ color: config.accentColor }}>{config.grade || 'A1'}</div>
            <div className={styles.pGradeBadge}>{config.label || 'Outstanding Performance'}</div>
            <div className={styles.pSub}>{config.desc || 'Based on weighted aggregate of all subjects'}</div>
          </div>
        );
      case 'grading_legend':
        return (
          <div className={styles.pGradeLegend} style={getBlockBaseStyle(block)}>
            <div className={styles.pSecTitle}>Grading Scale & Performance Indicators</div>
            <table className={styles.pTable}>
              <thead>
                <tr>
                  <th>Range (%)</th>
                  <th>Grade</th>
                  <th>Indicator</th>
                </tr>
              </thead>
              <tbody>
                {(config.items || []).map((it, i) => (
                  <tr key={i}>
                    <td>{it.min} - {it.max}</td>
                    <td className={styles.bold}>{it.grade}</td>
                    <td>{it.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'attendance': {
        const working = Number(block.config.workingDays || 0);
        const present = Number(block.config.presentDays || 0);
        const pct = working ? Math.round((present / working) * 100) : 0;
        const fill = Math.max(0, Math.min(100, pct));
        const color = fill > 75 ? '#16a34a' : (fill >= 60 ? '#f59e0b' : '#dc2626');
        return <div><label className={styles.pSecTitle} style={{ color: design.accent.primary }}>Attendance</label><div style={{ marginBottom: 6, color: block.config.contentColor }}>Present: {present} / {working} days ({pct}%)</div><div className={styles.pAttendanceBar}><div className={styles.pAttendanceFill} style={{ width: `${fill}%`, background: color }} /></div><svg width="100%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none" style={{ marginTop: 8 }}><rect x="0" y="0" width="100" height="8" fill="#e5e7eb" rx="4" /><rect x="0" y="0" width={fill} height="8" fill={color} rx="4" /></svg></div>;
      }
      case 'cocurricular':
        return <div><label className={styles.pSecTitle} style={{ color: design.accent.primary }}>{block.config.title || 'Co-Curricular'}</label><table className={styles.pCoCurTable}><thead><tr><th>Activity</th><th>Grade</th></tr></thead><tbody>{(block.config.items || []).map((it, idx) => { const numeric = Number(it.grade); const isStars = Number.isFinite(numeric) && numeric >= 1 && numeric <= 5; return <tr key={`${it.activity}-${idx}`}><td>{it.activity}</td><td>{isStars ? <span className={styles.pStars}>{'?????'.slice(0, numeric)}{'?????'.slice(0, 5 - numeric)}</span> : it.grade}</td></tr>; })}</tbody></table></div>;
      case 'chart': {
        const rows = (SUBJECT_SETS[block.config.board || selectedBoard] || []).map((s) => {
          const m = marks[s] || { theory: 0, internal: 0, tMax: 80, iMax: 20 };
          const total = Number(m.theory || 0) + Number(m.internal || 0);
          const maxTotal = Number(m.tMax || 80) + Number(m.iMax || 20);
          const h = maxTotal ? Math.max(0, Math.min(100, Math.round((total / maxTotal) * 100))) : 0;
          return { subject: s, h };
        });
        const width = Math.max(320, rows.length * 52);
        return <div className={styles.pChartWrap}><svg width="100%" height="170" viewBox={`0 0 ${width} 170`} preserveAspectRatio="none">{rows.map((r, i) => { const x = 20 + (i * 50); const y = 120 - r.h; return <g key={r.subject}><rect className={styles.pChartBar} x={x} y={y} width="24" height={r.h} fill={design.accent.primary} rx="3" /><text className={styles.pChartLabel} x={x + 12} y="150" textAnchor="middle">{abbrev4(r.subject)}</text></g>; })}</svg></div>;
      }
      case 'watermark': {
        const headerLogo = activeBlocks.find((b) => b.type === 'header')?.config.logo;
        const src = block.config.src || headerLogo;
        return <div className={styles.pWatermark} style={{ opacity: `${Math.max(5, Math.min(30, Number(block.config.opacity || 10))) / 100}` }}>{src ? <img src={src} alt="Watermark" /> : <ImageIcon size={220} color="#94a3b8" />}</div>;
      }
      case 'col_group': {
        const { left, right } = parseRatio(block.config.ratio);
        const leftBlock = activeBlocks.find((b) => b.id === block.config.leftId);
        const rightBlock = activeBlocks.find((b) => b.id === block.config.rightId);
        return <div className={styles.pColGroup}><div className={styles.pColSlot} style={{ flex: `${left} 1 0` }}>{leftBlock ? renderBlockInner(leftBlock, true) : <div className={styles.pSub}>Left slot empty</div>}</div><div className={styles.pColSlot} style={{ flex: `${right} 1 0` }}>{rightBlock ? renderBlockInner(rightBlock, true) : <div className={styles.pSub}>Right slot empty</div>}</div></div>;
      }
      case 'remarks':
        return <><label className={styles.pSecTitle} style={{ color: block.config.titleColor, fontSize: block.config.titleSize, fontWeight: block.config.titleWeight }}>{block.config.title || 'Remarks'}</label><div className={styles.pRemarksText} style={{ fontSize: block.config.contentSize, fontWeight: block.config.contentWeight, color: block.config.contentColor, fontFamily: block.config.fontFamily }} dangerouslySetInnerHTML={{ __html: block.config.content || 'Enter feedback here...' }} /></>;
      case 'custom_field':
        return <><label className={styles.pSecTitle} style={{ color: block.config.titleColor, fontSize: block.config.titleSize || '0.7rem', fontWeight: block.config.titleWeight }}>{block.config.label || 'Custom Field'}</label><div className={styles.pCustomFieldBody} style={{ textAlign: block.config.align }}>{block.config.fieldType === 'image' ? <div className={styles.pCustomImg} style={{ margin: block.config.align === 'center' ? 'auto' : (block.config.align === 'right' ? '0 0 0 auto' : '0 auto 0 0') }}>{block.config.content ? <img src={block.config.content} alt="Custom Field" /> : <div className={styles.pSub}>No Image Provided</div>}</div> : <div className={`${styles.pCustomText} ${block.config.fieldType === 'textarea' ? styles.pTextareaStyle : ''}`} style={{ fontSize: block.config.contentSize, fontWeight: block.config.contentWeight, color: block.config.contentColor, fontFamily: block.config.fontFamily }} dangerouslySetInnerHTML={{ __html: block.config.content || 'Custom field content...' }} />}</div></>;
      case 'signatures':
        return <div className={styles.pSignatures}>{(block.config.sigs || ['Teacher', 'Principal']).map((s) => <div key={s} className={styles.pSig}><div className={styles.sigLine} style={{ background: design.accent.primary }} /><span>{s}</span></div>)}</div>;
      case 'qr_code':
        return <div className={styles.pQrSection}><QrCode size={30} className={styles.pQrIcon} style={{ color: design.accent.primary }} /><div><div className={styles.bold}>Academic Record</div><div className={styles.pSub}>Verified Document</div></div></div>;
      case 'spacer':
        return <div className={styles.pSpacerLine} style={{ height: '100%' }}>{selBlockId === block.id && !isPrintPreview && <div className={styles.pSpacerLabel}>{block.config.gap}mm Gap</div>}</div>;
      case 'page_break':
        return <div className={styles.pPageBreakLine}><span>--- Page Break ---</span></div>;
      default:
        return null;
    }
  };

  const renderBlock = (block, index) => {
    const isSelected = selBlockId === block.id;
    const isHovered = hoveredBlockId === block.id;
    const showControls = !isPrintPreview && block.type !== 'watermark' && (isSelected || isHovered);
    const isFree = !!block.config.freeMove;
    const floatWidth = Number(block.config.floatWidth || defaultFloatWidth(block.config.width));
    const onFreeMouseDown = (e) => {
      if (isPrintPreview) return;
      if (e.button !== 0) return;

      if (e.target.closest('button,input,select,textarea,[contenteditable="true"]')) return;

      setMouseDownData({
        id: block.id,
        startX: e.clientX,
        startY: e.clientY
      });
    };
    const commonProps = {
      draggable: false,
      onDragStart: () => onDragStart(index, block),
      onDragOver,
      onDrop: () => onDrop(index),
      onMouseEnter: () => setHoveredBlockId(block.id),
      onMouseLeave: () => setHoveredBlockId((prev) => (prev === block.id ? null : prev)),
      className: `${styles.pBlockWrap} ${isSelected ? styles.pBlockSelected : ''} ${!isFree ? styles[block.config.width || 'full'] : ''} ${styles[block.config.align || 'left']} ${isPrintPreview ? styles.previewBlock : ''}`,
      'data-block-id': block.id,
      style: {
        ...(block.type === 'spacer' ? { ...getBlockBaseStyle(block), height: `${block.config.gap || 20}px`, padding: 0 } : getBlockBaseStyle(block)),
        ...(isFree ? {
          position: 'absolute',
          left: `${floatDrag.id === block.id ? Number(floatDrag.cx || 0) : Number(block.config.posX || 0)}%`,
          top: `${floatDrag.id === block.id ? Number(floatDrag.cy || 0) : Number(block.config.posY || 0)}%`,
          width: `${floatWidth}%`,
          zIndex: isSelected ? 20 : 8,
          transform: floatDrag.id === block.id ? 'scale(1.02)' : 'none',
          transition: floatDrag.id === block.id ? 'none' : 'transform 0.1s, top 0.2s, left 0.2s'
        } : {
          zIndex: isSelected ? 20 : 1
        })
      },
      onClick: (e) => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_BLOCK', payload: block.id }); },
      onMouseDown: onFreeMouseDown
    };

    if (block.type === 'watermark') {
      return <div key={block.id} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_BLOCK', payload: block.id }); }} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>{renderBlockInner(block)}</div>;
    }

    if (block.type === 'page_break') {
      return <div key={block.id} className={styles.pPageBreakWrap} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_BLOCK', payload: block.id }); }}>{renderBlockInner(block)}{showControls && <div className={styles.pBlockControls}><div className={styles.pDragHandle}><GripVertical size={14} /></div><button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className={styles.pCompactBtn} title="Duplicate"><Copy size={12} /></button><button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className={styles.pDelete} title="Remove"><Trash2 size={12} /></button></div>}</div>;
    }

    return <div key={block.id} {...commonProps}>{renderBlockInner(block)}{showControls && <div className={styles.pBlockControls}><div className={styles.pDragHandle}><GripVertical size={14} /></div><button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className={styles.pCompactBtn} title="Duplicate"><Copy size={12} /></button><button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className={styles.pDelete} title="Remove"><Trash2 size={12} /></button></div>}</div>;
  };

  const renderSelectedSettings = () => {
    const selBlock = activeBlocks.find((b) => b.id === selBlockId);
    if (!selBlock) return null;
    const visibleCols = selBlock.config.visibleCols || DEFAULT_VISIBLE_COLS;
    return (
      <>
        {selBlock.type === 'spacer' && <div className={styles.propGroup}><label>Vertical Gap (mm)</label><input type="range" min="5" max="100" value={selBlock.config.gap} onChange={(e) => updateBlockConfig(selBlockId, 'gap', parseInt(e.target.value, 10))} /></div>}
        {selBlock.type === 'header' && <><div className={styles.propGroup}><label>School Logo</label><div className={styles.uploadBox} onClick={() => triggerFileInput(selBlock.id)}>{selBlock.config.logo ? <img src={selBlock.config.logo} alt="Logo" /> : <div className={styles.uploadLabel}><Upload size={20} /> <span>Click to Upload</span></div>}<input type="file" ref={(node) => setFileRef(selBlock.id, node)} hidden onChange={(e) => handleGenericUpload(e, selBlockId, 'logo')} accept="image/*" /></div></div><div className={styles.propGroup}><label>School Name</label><input className={styles.sInput} value={selBlock.config.schoolName || ''} onChange={(e) => updateBlockConfig(selBlockId, 'schoolName', e.target.value)} /></div><div className={styles.propGroup}><label>Tagline</label><input className={styles.sInput} value={selBlock.config.tagline || ''} onChange={(e) => updateBlockConfig(selBlockId, 'tagline', e.target.value)} /></div><div className={styles.propGroup}><label>Session</label><input className={styles.sInput} value={selBlock.config.session || ''} onChange={(e) => updateBlockConfig(selBlockId, 'session', e.target.value)} /></div></>}
        {selBlock.type === 'marks_table' && <><div className={styles.propGroup}><label>Board</label><select className={styles.sSelect} value={selBlock.config.board} onChange={(e) => { updateBlockConfig(selBlockId, 'board', e.target.value); setSelectedBoard(e.target.value); }}>{Object.keys(SUBJECT_SETS).map((b) => <option key={b}>{b}</option>)}</select></div><div className={styles.propGroup}><label>Grade System</label><select className={styles.sSelect} value={selBlock.config.gradeSys} onChange={(e) => updateBlockConfig(selBlockId, 'gradeSys', e.target.value)}>{Object.keys(GRADE_SYSTEMS).map((g) => <option key={g}>{g}</option>)}</select></div><div className={styles.propGroup}><label>Columns</label><div className={styles.paddingInputs}>{[{ key: 'theory', label: 'Theory' }, { key: 'internal', label: 'Internal' }, { key: 'total', label: 'Total' }, { key: 'grade', label: 'Grade' }, { key: 'grade_point', label: 'GP' }, { key: 'remarks', label: 'Remarks' }].map((c) => <label key={c.key} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.66rem' }}><input type="checkbox" checked={visibleCols.includes(c.key)} onChange={(e) => { const set = new Set(visibleCols); if (e.target.checked) set.add(c.key); else set.delete(c.key); updateBlockConfig(selBlockId, 'visibleCols', [...set]); }} />{c.label}</label>)}</div></div><div className={styles.propGroup}><label><input type="checkbox" checked={!!selBlock.config.alternateRows} onChange={(e) => updateBlockConfig(selBlockId, 'alternateRows', e.target.checked)} /> Alternate Rows</label></div><label className={styles.sLabel} style={{ marginTop: 10 }}>Marks Entry</label><div className={styles.marksGridMini}>{(SUBJECT_SETS[selBlock.config.board] || []).map((s) => <div key={s} className={styles.miniMark}><span>{s}</span><div className={styles.inputRow}><input type="number" value={marks[s]?.theory ?? 0} onChange={(e) => updateMarks(s, 'theory', e.target.value)} placeholder="Theory" /><input type="number" value={marks[s]?.tMax ?? 80} onChange={(e) => updateMarks(s, 'tMax', e.target.value)} placeholder="(max)" /></div><div className={styles.inputRow}><input type="number" value={marks[s]?.internal ?? 0} onChange={(e) => updateMarks(s, 'internal', e.target.value)} placeholder="Internal" /><input type="number" value={marks[s]?.iMax ?? 20} onChange={(e) => updateMarks(s, 'iMax', e.target.value)} placeholder="(max)" /></div></div>)}</div></>}
        {selBlock.type === 'remarks' && <div className={styles.propGroup}><label>Feedback Content</label>{renderRichToolbar(selBlock)}<div id={`rich-editor-${selBlock.id}`} className={styles.sTextarea} contentEditable suppressContentEditableWarning onInput={(e) => updateBlockConfig(selBlockId, 'content', e.currentTarget.innerHTML)} onBlur={(e) => updateBlockConfig(selBlockId, 'content', e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: selBlock.config.content || '' }} /></div>}
        {selBlock.type === 'custom_field' && <><div className={styles.propGroup}><label>Variant</label><select className={styles.sSelect} value={selBlock.config.fieldType} onChange={(e) => updateBlockConfig(selBlockId, 'fieldType', e.target.value)}><option value="text">Text</option><option value="textarea">Rich Text</option><option value="image">Image</option></select></div><div className={styles.propGroup}><label>Content</label>{selBlock.config.fieldType === 'image' ? <div className={styles.uploadBox} onClick={() => triggerFileInput(selBlock.id)}>{selBlock.config.content ? <img src={selBlock.config.content} alt="Asset" /> : <div className={styles.uploadLabel}><Upload size={20} /> <span>Upload</span></div>}<input type="file" ref={(node) => setFileRef(selBlock.id, node)} hidden onChange={(e) => handleGenericUpload(e, selBlockId)} accept="image/*" /></div> : <>{renderRichToolbar(selBlock)}<div id={`rich-editor-${selBlock.id}`} className={styles.sTextarea} contentEditable suppressContentEditableWarning onInput={(e) => updateBlockConfig(selBlockId, 'content', e.currentTarget.innerHTML)} onBlur={(e) => updateBlockConfig(selBlockId, 'content', e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: selBlock.config.content || '' }} /></>}</div></>}
        {selBlock.type === 'grade_summary' && <div className={styles.propGroup}><label className={styles.sLabel}>Accent</label><div className={styles.accentRow}>{['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c'].map(c=>(<div key={c} onClick={()=>updateConfig(selBlock.id,{accentColor:c})} className={`${styles.accentCell} ${selBlock.config.accentColor===c?styles.aActive:''}`} style={{background:c}}/>))}</div><div className={styles.inputGroup}><label>Grade</label><input className={styles.sInput} value={selBlock.config.grade||''} onChange={(e)=>updateConfig(selBlock.id,{grade:e.target.value})}/></div><div className={styles.inputGroup}><label>Label</label><input className={styles.sInput} value={selBlock.config.label||''} onChange={(e)=>updateConfig(selBlock.id,{label:e.target.value})}/></div></div>}
        {selBlock.type === 'grading_legend' && <div className={styles.propGroup}><label className={styles.sLabel}>Scale</label><div className={styles.legendEditorList}>{(selBlock.config.items||[]).map((it,idx)=>(<div key={idx} className={styles.legendEditorRow}><input placeholder="Min" type="number" value={it.min} onChange={(e)=>{const n=[...selBlock.config.items];n[idx].min=e.target.value;updateConfig(selBlock.id,{items:n})}}/><input placeholder="Max" type="number" value={it.max} onChange={(e)=>{const n=[...selBlock.config.items];n[idx].max=e.target.value;updateConfig(selBlock.id,{items:n})}}/><input placeholder="Grade" value={it.grade} onChange={(e)=>{const n=[...selBlock.config.items];n[idx].grade=e.target.value;updateConfig(selBlock.id,{items:n})}}/><button className={styles.pDelete} onClick={()=>{updateConfig(selBlock.id,{items:selBlock.config.items.filter((_,i)=>i!==idx)})}}><Trash2 size={12}/></button></div>))}<button className={styles.compactBtn} style={{width:'100%',marginTop:8}} onClick={()=>updateConfig(selBlock.id,{items:[...(selBlock.config.items||[]),{min:0,max:0,grade:'C',label:'Avg'}]})}><Plus size={14}/> Add Row</button></div></div>}
        {selBlock.type === 'attendance' && <><div className={styles.propGroup}><label>Working Days</label><input className={styles.sInput} type="number" value={selBlock.config.workingDays||0} onChange={(e)=>updateBlockConfig(selBlockId,'workingDays',parseInt(e.target.value||0,10))}/></div><div className={styles.propGroup}><label>Present Days</label><input className={styles.sInput} type="number" value={selBlock.config.presentDays||0} onChange={(e)=>updateBlockConfig(selBlockId,'presentDays',parseInt(e.target.value||0,10))}/></div></>}
        {selBlock.type === 'cocurricular' && <><div className={styles.propGroup}><label>Title</label><input className={styles.sInput} value={selBlock.config.title||''} onChange={(e)=>updateBlockConfig(selBlockId,'title',e.target.value)}/></div>{(selBlock.config.items||[]).map((item,idx)=><div key={`${item.activity}-${idx}`} className={styles.inputRow}><input className={styles.sInput} value={item.activity} onChange={(e)=>{const items=deepClone(selBlock.config.items||[]);items[idx].activity=e.target.value;updateBlockConfig(selBlockId,'items',items)}} placeholder="Activity"/><input className={styles.sInput} value={item.grade} onChange={(e)=>{const items=deepClone(selBlock.config.items||[]);items[idx].grade=e.target.value;updateBlockConfig(selBlockId,'items',items)}} placeholder="Grade"/><button className={styles.pDelete} onClick={()=>{const items=deepClone(selBlock.config.items||[]);items.splice(idx,1);updateBlockConfig(selBlockId,'items',items)}}><Trash2 size={12}/></button></div>)}<button className={styles.layoutBtn} onClick={()=>updateBlockConfig(selBlockId,'items',[...(selBlock.config.items||[]),{activity:'New',grade:'A'}])}>Add Activity</button></>}
        {selBlock.type === 'chart' && <div className={styles.propGroup}><label>Board</label><select className={styles.sSelect} value={selBlock.config.board} onChange={(e)=>updateBlockConfig(selBlockId,'board',e.target.value)}>{Object.keys(SUBJECT_SETS).map(b=><option key={b}>{b}</option>)}</select></div>}
        {selBlock.type === 'watermark' && <><div className={styles.propGroup}><label>Image</label><div className={styles.uploadBox} onClick={()=>triggerFileInput(selBlock.id)}>{selBlock.config.src?<img src={selBlock.config.src} alt="WM"/>:<div className={styles.uploadLabel}><Upload size={20}/> <span>Upload</span></div>}<input type="file" ref={(node)=>setFileRef(selBlock.id,node)} hidden onChange={(e)=>handleGenericUpload(e,selBlock.id,'src')} accept="image/*"/></div></div><div className={styles.propGroup}><label>Opacity</label><input type="range" min="5" max="30" value={selBlock.config.opacity||10} onChange={(e)=>updateBlockConfig(selBlock.id,'opacity',parseInt(e.target.value,10))}/></div></>}
        {selBlock.type === 'col_group' && <><div className={styles.propGroup}><label>Ratio</label><select className={styles.sSelect} value={selBlock.config.ratio||'50/50'} onChange={(e)=>updateBlockConfig(selBlock.id,'ratio',e.target.value)}><option value="50/50">50/50</option><option value="60/40">60/40</option><option value="70/30">70/30</option></select></div><div className={styles.propGroup}><label>Left</label><select className={styles.sSelect} value={selBlock.config.leftId||''} onChange={(e)=>updateBlockConfig(selBlock.id,'leftId',e.target.value)}><option value="">Select</option>{activeBlocks.filter(b=>b.id!==selBlock.id&&b.type!=='watermark').map(b=><option key={b.id} value={b.id}>{BLOCK_TYPES.find(t=>t.type===b.type)?.label}</option>)}</select></div><div className={styles.propGroup}><label>Right</label><select className={styles.sSelect} value={selBlock.config.rightId||''} onChange={(e)=>updateBlockConfig(selBlock.id,'rightId',e.target.value)}><option value="">Select</option>{activeBlocks.filter(b=>b.id!==selBlock.id&&b.type!=='watermark').map(b=><option key={b.id} value={b.id}>{BLOCK_TYPES.find(t=>t.type===b.type)?.label}</option>)}</select></div></>}
      </>
    );
  };


  const selBlock = activeBlocks.find((b) => b.id === selBlockId);
  const pageSizeClass = design.paperSize === 'A5' ? styles.paperA5 : (design.paperSize === 'Letter' ? styles.paperLetter : styles.paperA4);

  return (
    <div className={`${styles.builderContainer} ${selBlockId && !isPrintPreview ? styles.hasRightPanel : ''} ${isPrintPreview ? styles.printPreviewMode : ''}`} onClick={() => dispatch({ type: 'SET_SELECTED_BLOCK', payload: null })}>
      {/* ─── MS Word Top Toolbar ─── */}
      {!isPrintPreview && (
        <div className={styles.wordToolbar} onClick={(e) => e.stopPropagation()}>
          <div className={styles.tbGroup}>
            <button className={styles.tbBtn} onClick={onBack}><ChevronLeft size={16}/> Back</button>
          </div>
          <div className={styles.tbGroup}>
            <button className={styles.tbBtn} onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo}><RotateCcw size={14}/></button>
            <button className={styles.tbBtn} onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo}><RotateCw size={14}/></button>
          </div>
          {selBlock && ['remarks','custom_field'].includes(selBlock.type) && (
            <div className={styles.tbGroup}>
              <button className={styles.tbBtn} onClick={() => applyRichCommand(selBlock.id, 'bold')}><Bold size={14}/></button>
              <button className={styles.tbBtn} onClick={() => applyRichCommand(selBlock.id, 'italic')}><Italic size={14}/></button>
              <button className={styles.tbBtn} onClick={() => applyRichCommand(selBlock.id, 'underline')}><Underline size={14}/></button>
              <input type="color" className={styles.tbSelect} style={{width:28,padding:2,height:28}} onChange={(e) => applyRichCommand(selBlock.id, 'foreColor', e.target.value)} title="Text Color"/>
              <select className={styles.tbSelect} onChange={(e) => applyRichCommand(selBlock.id, 'fontName', e.target.value)} defaultValue={selBlock.config.fontFamily||'Arial'}>{FONT_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}</select>
            </div>
          )}
          {selBlock && (
            <div className={styles.tbGroup}>
              <button className={`${styles.tbBtn} ${selBlock.config.align==='left'?styles.tbBtnActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'align','left')}><AlignLeft size={14}/></button>
              <button className={`${styles.tbBtn} ${selBlock.config.align==='center'?styles.tbBtnActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'align','center')}><AlignCenter size={14}/></button>
              <button className={`${styles.tbBtn} ${selBlock.config.align==='right'?styles.tbBtnActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'align','right')}><AlignRight size={14}/></button>
            </div>
          )}
          <div className={styles.tbGroup} style={{marginLeft:'auto', borderRight:'none'}}>
            <button className={styles.tbBtn} onClick={loadTemplates}><Upload size={14}/> Templates</button>
            <button className={styles.tbBtn} onClick={saveTemplate}><Save size={14}/> Save</button>
            <button className={styles.tbBtn} onClick={() => setIsPrintPreview(true)}><Printer size={14}/> Preview</button>
            <button className={styles.tbBtn} onClick={generateAll} disabled={bulkProgress.running}><Printer size={14}/> Generate</button>
          </div>
        </div>
      )}

      {/* ─── Left Panel (Tabbed) ─── */}
      {!isPrintPreview && (
        <div className={styles.newSidebar} onClick={(e) => e.stopPropagation()}>
          <div className={styles.panelTabs}>
            <button className={`${styles.panelTab} ${leftTab==='blocks'?styles.panelTabActive:''}`} onClick={()=>setLeftTab('blocks')}>Blocks</button>
            <button className={`${styles.panelTab} ${leftTab==='explorer'?styles.panelTabActive:''}`} onClick={()=>setLeftTab('explorer')}>Explorer</button>
          </div>
          <div className={styles.panelBody}>
            {leftTab === 'blocks' && (
              <>
                <div className={styles.blockPalette}>
                  {BLOCK_TYPES.map((t) => (
                    <button key={t.type} className={styles.pBlockBtn} onClick={() => addBlock(t.type)}>
                      {t.icon}
                      <span>{t.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.propDivider}>Templates</div>
                <div className={styles.templateGrid}>
                  {TEMPLATES.map((t) => (
                    <div key={t.id} className={`${styles.templateCard} ${design.layout === t.id ? styles.tActive : ''}`} onClick={() => dispatch({ type: 'SET_DESIGN', payload: { layout: t.id } })}>
                      <div className={styles.tThumbnail} data-id={t.id} />
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.propDivider}>Settings</div>
                <Accordion id="global" title="Page & Theme" icon={<Palette size={14}/>}>
                  <div className={styles.propGroup}><label className={styles.sLabel}>Theme Accent</label><div className={styles.accentRow}>{ACCENT_PRESETS.map(a=>(<button key={a.name} style={{background:a.primary}} className={`${styles.accentCell} ${design.accent.primary===a.primary?styles.aActive:''}`} onClick={()=>dispatch({type:'SET_DESIGN',payload:{accent:a}})}/>))}</div></div>
                  <div className={styles.propGroup}><label className={styles.sLabel}>Page Size</label><select className={styles.sSelect} value={design.paperSize} onChange={(e)=>dispatch({type:'SET_DESIGN',payload:{paperSize:e.target.value}})}><option value="A4">A4</option><option value="A5">A5</option><option value="Letter">Letter</option></select></div>
                  <div className={styles.propGroup}><label className={styles.sLabel} style={{display:'flex',justifyContent:'space-between'}}>Grid <input type="checkbox" checked={design.showGrid} onChange={(e)=>dispatch({type:'SET_DESIGN',payload:{showGrid:e.target.checked}})}/></label></div>
                </Accordion>
                <Accordion id="preview" title="Preview Student" icon={<UserSquare size={14}/>}>
                  <select className={styles.sSelect} value={selClass} onChange={(e)=>dispatch({type:'SET_CLASS',payload:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select>
                  <select className={styles.sSelect} value={selStudent?.id||''} onChange={(e)=>dispatch({type:'SET_STUDENT',payload:(STUDENTS[selClass]||[]).find(s=>s.id===parseInt(e.target.value,10))||null})}>{(STUDENTS[selClass]||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </Accordion>
              </>
            )}
            {leftTab === 'explorer' && (
              <div className={styles.blockExplorer}>
                {activeBlocks.map((b, i) => (
                  <div key={b.id} draggable onDragStart={() => onDragStart(i, b)} onDragOver={onDragOver} onDrop={() => onDrop(i)} className={`${styles.explorerItem} ${selBlockId === b.id ? styles.eActive : ''}`} onClick={() => dispatch({ type: 'SET_SELECTED_BLOCK', payload: b.id })}>
                    <GripVertical size={14} className={styles.eGrip} />
                    <span>{BLOCK_TYPES.find((t) => t.type === b.type)?.label || b.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Canvas ─── */}
      <div className={styles.canvasArea}>
        {isPrintPreview && <button className={styles.compactBtn} style={{ position: 'absolute', top: 12, right: 12, zIndex: 30 }} onClick={() => setIsPrintPreview(false)}>Exit Preview</button>}
        <div className={styles.canvasScroll}><div 
          ref={canvasPageRef} 
          className={`${styles.canvasPage} ${styles[design.layout]} ${pageSizeClass} ${design.showGrid ? styles.showGrid : ''}`}
          style={{ '--grid-size': `${design.gridSize || 2}%` }}
        >{watermarkBlocks.map((b, i) => renderBlock(b, i))}{topLevelBlocks.map((b, i) => renderBlock(b, i))}</div></div>
        {bulkProgress.running && <div style={{ padding: '8px 16px', background: '#fff', borderTop: '1px solid #e2e8f0' }}><div style={{ fontSize: '0.72rem', fontWeight: 800 }}>Generating {bulkProgress.current} of {bulkProgress.total}...</div><div style={{ width: '100%', height: 6, borderRadius: 99, background: '#e2e8f0', marginTop: 4 }}><div style={{ width: `${(bulkProgress.current / Math.max(1, bulkProgress.total)) * 100}%`, height: '100%', borderRadius: 99, background: design.accent.primary }} /></div></div>}
      </div>

      {/* ─── Right Context Panel ─── */}
      {selBlockId && !isPrintPreview && selBlock && (
        <div className={styles.contextPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.contextHeader}>
            <h3>Edit {BLOCK_TYPES.find(t=>t.type===selBlock.type)?.label || selBlock.type}</h3>
            <button className={styles.contextClose} onClick={() => dispatch({ type: 'SET_SELECTED_BLOCK', payload: null })}><X size={16}/></button>
          </div>
          <div className={styles.contextBody}>
            {/* Content-specific settings (always open) */}
            {renderSelectedSettings()}

            {/* Layout accordion (collapsed by default) */}
            <Accordion id="layout" title="Advanced Styling" icon={<Palette size={14}/>}>
              <div className={styles.propGroup}><label>Width</label><div className={styles.layoutToggleRow}><button className={`${styles.layoutBtn} ${selBlock.config.width==='full'?styles.lbActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'width','full')}>Full</button><button className={`${styles.layoutBtn} ${selBlock.config.width==='half'?styles.lbActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'width','half')}>1/2</button><button className={`${styles.layoutBtn} ${selBlock.config.width==='third'?styles.lbActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'width','third')}>1/3</button><button className={`${styles.layoutBtn} ${selBlock.config.width==='fourth'?styles.lbActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'width','fourth')}>1/4</button></div></div>
              <div className={styles.propGroup}><label>Background</label><div className={styles.accentRow}>{BG_PRESETS.map(bg=><button key={bg.name} style={{background:bg.hex==='transparent'?'#fff':bg.hex,border:bg.hex==='transparent'?'1px dashed #cbd5e1':'none'}} className={`${styles.accentCell} ${selBlock.config.bg===bg.hex?styles.aActive:''}`} onClick={()=>updateBlockConfig(selBlockId,'bg',bg.hex)} title={bg.name}/>)}</div></div>
              <div className={styles.inputRow}><div className={styles.inputGroup}><label>Rounding</label><input type="range" min="0" max="30" value={selBlock.config.radius||0} onChange={(e)=>updateBlockConfig(selBlockId,'radius',Number(e.target.value))}/></div><div className={styles.inputGroup}><label>Border Style</label><select className={styles.sSelect} value={selBlock.config.borderStyle||'solid'} onChange={(e)=>updateBlockConfig(selBlockId,'borderStyle',e.target.value)}><option value="solid">solid</option><option value="dashed">dashed</option><option value="dotted">dotted</option></select></div></div>
              <div className={styles.propGroup}><label>Border Color</label><input className={styles.sInput} type="color" value={selBlock.config.borderColor||'#e2e8f0'} onChange={(e)=>updateBlockConfig(selBlockId,'borderColor',e.target.value)}/></div>
              <div className={styles.propGroup}><label>Border Sides</label><div className={styles.borderSideToggles}><button className={`${styles.layoutBtn} ${selBlock.config.borderSides?.top?styles.lbActive:''}`} onClick={()=>handleToggleBorderSide(selBlockId,'top')}>Top</button><button className={`${styles.layoutBtn} ${selBlock.config.borderSides?.right?styles.lbActive:''}`} onClick={()=>handleToggleBorderSide(selBlockId,'right')}>Right</button><button className={`${styles.layoutBtn} ${selBlock.config.borderSides?.bottom?styles.lbActive:''}`} onClick={()=>handleToggleBorderSide(selBlockId,'bottom')}>Bottom</button><button className={`${styles.layoutBtn} ${selBlock.config.borderSides?.left?styles.lbActive:''}`} onClick={()=>handleToggleBorderSide(selBlockId,'left')}>Left</button></div></div>
              <div className={styles.propGroup}><label>Padding (px)</label><div className={styles.paddingInputs}><input type="number" min="0" max="60" value={selBlock.config.padding?.top??6} onChange={(e)=>handlePaddingChange(selBlockId,'top',e.target.value)} placeholder="Top"/><input type="number" min="0" max="60" value={selBlock.config.padding?.right??6} onChange={(e)=>handlePaddingChange(selBlockId,'right',e.target.value)} placeholder="Right"/><input type="number" min="0" max="60" value={selBlock.config.padding?.bottom??6} onChange={(e)=>handlePaddingChange(selBlockId,'bottom',e.target.value)} placeholder="Bottom"/><input type="number" min="0" max="60" value={selBlock.config.padding?.left??6} onChange={(e)=>handlePaddingChange(selBlockId,'left',e.target.value)} placeholder="Left"/></div></div>
            </Accordion>

            <Accordion id="typography" title="Typography" icon={<TextQuote size={14}/>}>
              <div className={styles.inputRow}><div className={styles.inputGroup}><label>Title Size</label><select className={styles.sSelect} value={selBlock.config.titleSize} onChange={(e)=>updateBlockConfig(selBlockId,'titleSize',e.target.value)}><option value="0.7rem">Small</option><option value="0.75rem">Normal</option><option value="1rem">Heading 3</option><option value="1.3rem">Heading 1</option></select></div><div className={styles.inputGroup}><label>Weight</label><select className={styles.sSelect} value={selBlock.config.titleWeight} onChange={(e)=>updateBlockConfig(selBlockId,'titleWeight',e.target.value)}><option value="400">Regular</option><option value="700">Bold</option><option value="900">Black</option></select></div></div>
              <div className={styles.inputRow}><div className={styles.inputGroup}><label>Title Color</label><input className={styles.sInput} type="color" value={selBlock.config.titleColor||'#1e293b'} onChange={(e)=>updateBlockConfig(selBlockId,'titleColor',e.target.value)}/></div><div className={styles.inputGroup}><label>Content Color</label><input className={styles.sInput} type="color" value={selBlock.config.contentColor||'#475569'} onChange={(e)=>updateBlockConfig(selBlockId,'contentColor',e.target.value)}/></div></div>
              <div className={styles.propGroup}><label>Font</label><select className={styles.sSelect} value={selBlock.config.fontFamily||'Arial'} onChange={(e)=>updateBlockConfig(selBlockId,'fontFamily',e.target.value)}>{FONT_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            </Accordion>

            <Accordion id="position" title="Layout Mode" icon={<Move size={14}/>}>
              <div className={styles.layoutToggleRow}>
                <button className={`${styles.layoutBtn} ${!selBlock.config.freeMove?styles.lbActive:''}`} onClick={()=>updateConfig(selBlock.id,{freeMove:false})}><List size={14}/> Stack</button>
                <button className={`${styles.layoutBtn} ${selBlock.config.freeMove?styles.lbActive:''}`} onClick={()=>updateConfig(selBlock.id,{freeMove:true,floatWidth:Number(selBlock.config.floatWidth||defaultFloatWidth(selBlock.config.width))})}><Move size={14}/> Free</button>
              </div>
              {selBlock.config.freeMove && (
                <div className={styles.paddingInputs} style={{marginTop:8}}>
                  <div className={styles.inputGroup}><label>X %</label><input type="number" min="0" max="100" value={Math.round(selBlock.config.posX||0)} onChange={(e)=>updateBlockConfig(selBlock.id,'posX',Number(e.target.value||0))}/></div>
                  <div className={styles.inputGroup}><label>Y %</label><input type="number" min="0" max="100" value={Math.round(selBlock.config.posY||0)} onChange={(e)=>updateBlockConfig(selBlock.id,'posY',Number(e.target.value||0))}/></div>
                  <div className={styles.inputGroup}><label>Width %</label><input type="number" min="10" max="95" value={Math.round(selBlock.config.floatWidth||defaultFloatWidth(selBlock.config.width))} onChange={(e)=>updateBlockConfig(selBlock.id,'floatWidth',Number(e.target.value||20))}/></div>
                </div>
              )}
            </Accordion>

            <button className={styles.deleteMain} onClick={() => removeBlock(selBlockId)}><Trash2 size={16}/> Delete Section</button>
          </div>
        </div>
      )}

      {toastMsg && <div className={styles.toastSuccess}>{toastMsg}</div>}
      {templateModalOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.35)', display: 'grid', placeItems: 'center', zIndex: 1000 }}><div style={{ width: 'min(520px, 95vw)', maxHeight: '80vh', overflow: 'auto', background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Load Template</h3><button className={styles.compactBtn} onClick={() => setTemplateModalOpen(false)}>Close</button></div>{isLoadingTemplates ? <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={16} className={styles.spin} /> Loading...</div> : <div style={{ display: 'grid', gap: 8 }}>{templatesList.length === 0 && <div className={styles.pSub}>No templates found</div>}{templatesList.map((tpl) => <button key={tpl.id || tpl.name} className={styles.templateCard} style={{ width: '100%', alignItems: 'flex-start' }} onClick={() => applyTemplate(tpl)}><span>{tpl.name || `Template ${tpl.id}`}</span><small style={{ color: '#64748b' }}>{tpl.description || 'Click to apply this template'}</small></button>)}</div>}</div></div>}
    </div>
  );
};

export default ReportCardCreate;
