"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Database, FileText, CheckCircle, Search, Plus, Loader2, X, ArrowUp, ArrowDown, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Printer, Download, Save, Eye, Layers, GitBranch, BarChart3, Space, Type, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import adminApi from '@/api/adminApi';
import authApi from '@/api/authApi';
import styles from './QuestionPaper.module.css';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function QuestionPaperTab() {
  const [questions, setQuestions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ count: 0, next: null, previous: null });
  const [currentUser, setCurrentUser] = useState(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeReason, setWipeReason] = useState('');
  const [wiping, setWiping] = useState(false);
  
  // Builder State
  const [isBuildingPaper, setIsBuildingPaper] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  // Sections: each section = { id, label, title, instruction, questionIds: [] }
  const [sections, setSections] = useState([]);
  const [targetSectionId, setTargetSectionId] = useState(null);
  // OR links: array of [questionId1, questionId2] pairs
  const [orLinks, setOrLinks] = useState([]);
  const [builderFormData, setBuilderFormData] = useState({
    schoolName: 'BLAZE INTERNATIONAL SCHOOL',
    name: '',
    subject: '',
    subjectName: '',
    className: '',
    date: '',
    instructions: 'Attempt all questions. Marks are indicated against each question.',
    duration_minutes: 60,
    total_marks: '',
  });

  const [manualEntry, setManualEntry] = useState({
    text: '',
    marks: 5,
    type: 'Descriptive'
  });

  const [formData, setFormData] = useState({
    subject: '',
    question_text: '',
    question_type: 'Descriptive',
    marks: 5,
    difficulty: 'Medium',
    bloom_level: 'Apply',
    options: {}
  });

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [profileRes] = await Promise.all([authApi.getProfile()]);
        setCurrentUser(profileRes.data);
        fetchData();
      } catch (e) {
        console.error("Error fetching profile:", e);
        fetchData();
      }
    };
    fetchInitial();
  }, []);

  const isAdmin = currentUser?.portal === 'admin' || currentUser?.is_superuser;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, pRes, sRes, cRes] = await Promise.all([
        adminApi.getQuestionBank({ 
          search: searchTerm, 
          subject: selectedSubject,
          page: currentPage 
        }),
        adminApi.getQuestionPapers(),
        adminApi.getSubjects(),
        adminApi.getClasses() // Fetch classes
      ]);
      
      if (qRes.data.results) {
        setQuestions(qRes.data.results);
        setPaginationInfo({
          count: qRes.data.count,
          next: qRes.data.next,
          previous: qRes.data.previous
        });
      } else {
        setQuestions(qRes.data || []);
      }
      
      setPapers(pRes.data || []);
      setSubjects(sRes.data || []);
      setClasses(cRes.data || []); 
    } catch (error) {
      console.error("Error fetching question data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject, selectedClass]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedSubject, currentPage]); // We don't fetch differently by selectedClass, we filter locally.

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question from the bank?")) return;
    try {
      await adminApi.deleteQuestion(id);
      fetchData();
    } catch (error) {
      alert("Error deleting question: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDeletePaper = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question paper?")) return;
    try {
      await adminApi.deleteQuestionPaper(id);
      fetchData();
    } catch (error) {
      alert("Error deleting paper: " + (error.response?.data?.error || error.message));
    }
  };

  const filteredSubjects = selectedClass
    ? subjects.filter(s => s.school_class === parseInt(selectedClass))
    : Array.from(new Map(subjects.map(s => [s.name, s])).values());

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createQuestion(formData);
      setIsModalOpen(false);
      fetchData();
      setFormData({ ...formData, question_text: '' });
    } catch (error) {
      alert("Error adding question: " + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleQuestion = (q) => {
    // If it's a manual entry without a db id, we use temporary id for matching
    const qid = q.id || q.tempId;
    if (selectedQuestions.some(sq => (sq.id || sq.tempId) === qid)) {
      setSelectedQuestions(selectedQuestions.filter(sq => (sq.id || sq.tempId) !== qid));
      // Remove from all sections
      setSections(prev => prev.map(s => ({
        ...s,
        questionIds: (s.questionIds || []).filter(id => id !== qid)
      })));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
      if (targetSectionId) {
        setSections(prev => prev.map(s => ({
          ...s,
          questionIds: s.id === targetSectionId ? [...(s.questionIds || []), qid] : s.questionIds
        })));
      }
    }
  };

  const handleUpdateMarks = (tempIdOrId, newMarks) => {
    setSelectedQuestions(prev => prev.map(q => {
      const qid = q.id || q.tempId;
      if (qid === tempIdOrId) {
        return { ...q, marks: newMarks };
      }
      return q;
    }));
  };

  const handleUpdateTextBlock = (tempIdOrId, newText) => {
    setSelectedQuestions(prev => prev.map(q => {
      const qid = q.id || q.tempId;
      if (qid === tempIdOrId) {
        return { ...q, text: newText };
      }
      return q;
    }));
  };

  const handleAddTextBlock = (sectionId = null) => {
    const qid = `textblock_${Date.now()}`;
    const newBlock = {
      tempId: qid,
      isTextBlock: true,
      text: '<em>Click here to type custom text, heading, or passage...</em>',
      marks: 0
    };
    setSelectedQuestions([...selectedQuestions, newBlock]);
    if (sectionId) {
      setSections(prev => prev.map(s => ({
        ...s,
        questionIds: s.id === sectionId ? [...(s.questionIds || []), qid] : s.questionIds
      })));
    }
  };

  const handleMoveQuestion = (index, direction) => {
    const sq = selectedQuestions[index];
    if (!sq) return;
    const qid = sq.id || sq.tempId;
    
    // Check if it's in a section
    const inSection = sections.find(s => s.questionIds?.includes(qid));
    
    if (inSection) {
      setSections(prev => prev.map(s => {
        if (s.id !== inSection.id) return s;
        const ids = [...(s.questionIds || [])];
        const idx = ids.indexOf(qid);
        if (direction === 'up' && idx > 0) {
          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
        } else if (direction === 'down' && idx < ids.length - 1) {
          [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
        }
        return { ...s, questionIds: ids };
      }));
    } else {
      const newQuestions = [...selectedQuestions];
      if (direction === 'up' && index > 0) {
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index - 1];
        newQuestions[index - 1] = temp;
      } else if (direction === 'down' && index < newQuestions.length - 1) {
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + 1];
        newQuestions[index + 1] = temp;
      }
      setSelectedQuestions(newQuestions);
    }
  };

  const handleAssignToSection = (qid, targetSectionId) => {
    setSections(prev => prev.map(s => {
      let ids = s.questionIds ? [...s.questionIds] : [];
      ids = ids.filter(id => id !== qid);
      if (targetSectionId && s.id === targetSectionId) {
        ids.push(qid);
      }
      return { ...s, questionIds: ids };
    }));
  };

  const handleAddManualQuestion = () => {
    if(!manualEntry.text) return;
    const qid = `manual_${Date.now()}`;
    const newQ = {
      tempId: qid,
      isManualEntry: true,
      text: manualEntry.text,
      marks: manualEntry.marks,
      type: manualEntry.type,
      question_text: manualEntry.text,
      difficulty: 'Medium',
    };
    setSelectedQuestions([...selectedQuestions, newQ]);
    if (targetSectionId) {
      setSections(prev => prev.map(s => ({
        ...s,
        questionIds: s.id === targetSectionId ? [...(s.questionIds || []), qid] : s.questionIds
      })));
    }
    setManualEntry({ text: '', marks: 5, type: 'Descriptive' });
  };

  // ─── Section Helpers ────────────────────────────────────────────────────────
  const handleAddSection = () => {
    const labels = 'ABCDEFGHIJ';
    const idx = sections.length;
    const label = labels[idx] || String(idx + 1);
    setSections(prev => [...prev, {
      id: `sec_${Date.now()}`,
      label,
      title: `Section ${label}`,
      instruction: `Answer all questions`,
    }]);
  };

  const handleUpdateSection = (secId, field, value) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, [field]: value } : s));
  };

  const handleRemoveSection = (secId) => {
    setSections(prev => prev.filter(s => s.id !== secId));
  };

  const handleAssignSection = (qId, secId) => {
    // Remove question from all sections first, then add to target
    setSections(prev => prev.map(s => ({
      ...s,
      questionIds: s.id === secId
        ? [...(s.questionIds || []).filter(id => id !== qId), qId]
        : (s.questionIds || []).filter(id => id !== qId)
    })));
  };

  // ─── OR Link Helpers ─────────────────────────────────────────────────────────
  const handleAddOrLink = (qIndex) => {
    // Link question at qIndex with the one after it
    if (qIndex >= selectedQuestions.length - 1) return;
    const q1 = selectedQuestions[qIndex];
    const q2 = selectedQuestions[qIndex + 1];
    const id1 = q1.id || q1.tempId;
    const id2 = q2.id || q2.tempId;
    // Don't add duplicate
    if (orLinks.some(link => link[0] === id1 && link[1] === id2)) return;
    setOrLinks(prev => [...prev, [id1, id2]]);
  };

  const handleRemoveOrLink = (id1, id2) => {
    setOrLinks(prev => prev.filter(link => !(link[0] === id1 && link[1] === id2)));
  };

  // ─── Blueprint Validation ────────────────────────────────────────────────────
  const blueprint = useMemo(() => {
    const total = selectedQuestions.length;
    if (total === 0) return null;
    const easy = selectedQuestions.filter(q => (q.difficulty || 'Medium') === 'Easy').length;
    const medium = selectedQuestions.filter(q => (q.difficulty || 'Medium') === 'Medium').length;
    const hard = selectedQuestions.filter(q => (q.difficulty || 'Medium') === 'Hard').length;
    const mcq = selectedQuestions.filter(q => (q.question_type || q.type || '') === 'MCQ').length;
    const desc = selectedQuestions.filter(q => ['Descriptive', 'DESC'].includes(q.question_type || q.type || '')).length;
    const tf = selectedQuestions.filter(q => (q.question_type || q.type || '') === 'True/False').length;
    const totalMarks = selectedQuestions.reduce((s, q) => s + parseFloat(q.marks || 0), 0);
    return { total, easy, medium, hard, mcq, desc, tf, totalMarks,
      easyPct: Math.round((easy / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      hardPct: Math.round((hard / total) * 100),
    };
  }, [selectedQuestions]);

  const handleEditPaper = async (paperId) => {
    try {
      const res = await adminApi.getQuestionPaperDetail(paperId);
      const paper = res.data;
      setBuilderFormData({
        schoolName: 'BLAZE INTERNATIONAL SCHOOL',
        name: paper.name,
        subject: paper.subject || '',
        subjectName: paper.subject_name || '',
        className: '',
        date: '',
        instructions: 'Attempt all questions. Marks are indicated against each question.',
        duration_minutes: paper.duration_minutes,
        total_marks: paper.total_marks,
      });
      setSelectedQuestions(paper.questions_details || []);
      setEditingId(paperId);
      setIsPreviewMode(false);
      setIsBuildingPaper(true);
    } catch (error) {
      alert("Error loading paper details: " + (error.response?.data?.error || error.message));
    }
  };

  const handlePreviewPaper = async (paperId) => {
    try {
      const res = await adminApi.getQuestionPaperDetail(paperId);
      const paper = res.data;
      setBuilderFormData({
        schoolName: 'BLAZE INTERNATIONAL SCHOOL',
        name: paper.name,
        subject: paper.subject || '',
        subjectName: paper.subject_name || '',
        className: '',
        date: '',
        instructions: 'Attempt all questions. Marks are indicated against each question.',
        duration_minutes: paper.duration_minutes,
        total_marks: paper.total_marks,
      });
      setSelectedQuestions(paper.questions_details || []);
      setEditingId(paperId);
      setIsPreviewMode(true);
      setIsBuildingPaper(true);
    } catch (error) {
      alert("Error loading paper details: " + (error.response?.data?.error || error.message));
    }
  };

  const handleSavePaper = async () => {
    if (isPreviewMode) {
      setIsBuildingPaper(false);
      setEditingId(null);
      setIsPreviewMode(false);
      return;
    }

    if (!builderFormData.name || !builderFormData.subject || selectedQuestions.length === 0) {
      alert("Please fill Subject, Exam Title and insert at least one question.");
      return;
    }
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    
    // Extract manual questions
    const manualQuestions = selectedQuestions.filter(q => q.isManualEntry);
    let finalIds = selectedQuestions.filter(q => !q.isManualEntry).map(q => q.id);

    try {
      // Auto-save manual questions to bank
      for (let mq of manualQuestions) {
         const qData = {
           subject: builderFormData.subject,
           question_text: mq.text,
           marks: mq.marks,
           question_type: mq.type,
           difficulty: 'Medium',
           bloom_level: 'Apply'
         };
         const res = await adminApi.createQuestion(qData);
         finalIds.push(res.data.id);
      }

      const payload = {
        ...builderFormData,
        questions: finalIds,
        total_marks: totalMarks
      };

      if (editingId) {
        await adminApi.updateQuestionPaper(editingId, payload);
      } else {
        await adminApi.createQuestionPaper(payload);
      }
      
      setIsBuildingPaper(false);
      setEditingId(null);
      setIsPreviewMode(false);
      setSelectedQuestions([]);
      setSections([]);
      setOrLinks([]);
      setBuilderFormData({ 
        schoolName: 'BLAZE INTERNATIONAL SCHOOL', 
        name: '', 
        subject: '', 
        subjectName: '',
        className: '',
        date: '', 
        instructions: 'Attempt all questions. Marks are indicated against each question.', 
        duration_minutes: 60,
        total_marks: ''
      });
      fetchData();
    } catch (error) {
      alert("Error saving paper: " + (error.response?.data?.error || error.message));
    }
  };

  // ─── Print & Download ──────────────────────────────────────────────────────
  const printRef = useRef(null);

  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing.');
      return;
    }

    // Clone the content and clean up inputs for clean print
    const clone = printContent.cloneNode(true);

    // Replace all <input> with plain <span> text
    clone.querySelectorAll('input').forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value;
      span.style.cssText = input.style?.cssText || '';
      span.style.fontWeight = 'inherit';
      input.parentNode.replaceChild(span, input);
    });

    // Remove any action buttons (move up/down/delete)
    clone.querySelectorAll('button').forEach(btn => btn.remove());

    const subjectName = builderFormData.subjectName || '';
    const paperTitle = builderFormData.name || 'Question Paper';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${paperTitle}</title>
        <style>
          /* Remove all browser headers/footers */
          @page {
            size: A4;
            margin: 0;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            width: 210mm;
            margin: 0 auto;
            background: white;
            color: #1e293b;
            font-family: 'Georgia', 'Times New Roman', serif;
          }

          .page-wrapper {
            padding: 18mm 15mm 22mm 15mm;
            position: relative;
            min-height: 297mm;
          }

          /* ─── Footer on every printed page ─── */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 6mm 15mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8pt;
            color: #64748b;
            border-top: 0.5pt solid #cbd5e1;
          }
          .print-footer .footer-left {
            font-style: italic;
          }
          .print-footer .footer-right {
            font-style: normal;
          }

          /* ─── Content styles ─── */
          .print-paper {
            width: 100%;
          }

          /* Override any module CSS that may interfere */
          h1, h2 { margin: 0; text-align: center; }
          h1 { font-size: 18pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          h2 { font-size: 14pt; font-weight: 600; margin-top: 4px; }

          table { width: 100%; border-collapse: collapse; }

          /* Layout blocks that lose module CSS in print window */
          [class*="a4Header"] {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          [class*="metaGrid"] {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-top: 20px;
            font-size: 11pt;
            font-weight: 500;
            text-align: left;
          }
          [class*="metaGrid"] > div:nth-child(1) { flex: 2; }
          [class*="metaGrid"] > div:nth-child(2) { flex: 1; }
          [class*="metaGrid"] > div:nth-child(3) { flex: 1; }

          [class*="metaGridSecondary"] {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-top: 15px;
            font-size: 11pt;
            font-weight: 500;
          }
          [class*="metaGridSecondary"] > div { flex: 1; }

          [class*="metaItem"] {
            display: flex;
            align-items: flex-end;
            gap: 8px;
          }
          [class*="metaItem"] span {
            min-width: fit-content;
            font-weight: 600;
          }
          [class*="metaItem"] b {
            flex: 1;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 2px;
            min-width: 50px;
            display: flex;
            align-items: center;
          }

          /* Sections and OR dividers */
          [class*="sectionDivider"] {
            margin: 24px 0 12px;
            padding: 10px 0;
            border-top: 2px solid #1e293b;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          [class*="sectionLabel"] {
            font-weight: bold;
            font-size: 1rem;
            text-transform: uppercase;
          }
          [class*="sectionInstruction"] {
            font-size: 0.8rem;
            font-style: italic;
          }
          [class*="orDivider"] {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            margin: 4px 0;
          }
          [class*="orLine"] {
            flex: 1;
            height: 1px;
            background: #94a3b8;
          }
          [class*="orText"] {
            font-weight: 700;
            font-size: 0.85rem;
            color: #64748b;
          }
          [class*="answerLines"] {
            margin-top: 6px;
            padding-top: 4px;
          }
          [class*="answerLine"] {
            width: 100%;
            border-bottom: 1px dotted #94a3b8;
            height: 28px;
          }

          /* Clean up question rows for print */
          [class*="questionRow"] {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 0.5pt solid #e2e8f0;
            page-break-inside: avoid;
          }

          [class*="qNumber"] {
            font-weight: bold;
            min-width: 35px;
            color: #1e293b;
          }

          [class*="qTextBlock"] {
            flex: 1;
          }

          [class*="qMarksBlock"] {
            font-weight: bold;
            white-space: nowrap;
          }

          /* Clean inline elements */
          [class*="inlineHeaderInput"],
          [class*="inlineMetaInput"],
          [class*="inlineMarksInput"] {
            border: none !important;
            background: transparent !important;
            outline: none !important;
            font: inherit;
            color: inherit;
            padding: 0;
          }

          /* Hide editor toolbar, manual entry, action buttons */
          [class*="editorToolbar"],
          [class*="manualEntryBox"],
          [class*="questionActions"] {
            display: none !important;
          }

          /* Rich text editor box - remove border in print */
          [class*="richTextEditor"] {
            border: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }
        </style>
      </head>
      <body>
        <div class="print-footer">
          <div class="footer-left">${subjectName}${subjectName ? ' | ' : ''}${paperTitle}</div>
          <div class="footer-right">Page <span class="pageNumber"></span></div>
        </div>
        <div class="page-wrapper">
          <div class="print-paper">${clone.innerHTML}</div>
        </div>
        <script>
          // Inject page numbers after load
          window.onload = function() {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [builderFormData.name, builderFormData.subjectName]);

  const handleDownloadPDF = useCallback(async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      // Clone and clean the content (same as print)
      const clone = element.cloneNode(true);

      // Replace all <input> with plain <span> text
      clone.querySelectorAll('input').forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.value;
        // Copy key styles from the input
        const computed = window.getComputedStyle(input);
        span.style.fontSize = computed.fontSize;
        span.style.fontWeight = computed.fontWeight;
        span.style.fontFamily = computed.fontFamily;
        span.style.color = computed.color;
        span.style.textAlign = computed.textAlign;
        span.style.display = 'inline-block';
        span.style.minWidth = input.offsetWidth + 'px';
        input.parentNode.replaceChild(span, input);
      });

      // Remove action buttons, editor toolbar, manual entry box
      clone.querySelectorAll('button').forEach(btn => btn.remove());
      clone.querySelectorAll('[class*="editorToolbar"]').forEach(el => el.remove());
      clone.querySelectorAll('[class*="manualEntryBox"]').forEach(el => el.remove());
      clone.querySelectorAll('[class*="questionActions"]').forEach(el => el.remove());

      // Place the clean clone off-screen to render
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = element.offsetWidth + 'px';
      clone.style.background = 'white';
      document.body.appendChild(clone);

      // Capture the clean clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Remove clone from DOM
      document.body.removeChild(clone);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const footerHeight = 8;
      const usableHeight = pdfHeight - margin - footerHeight;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const subjectName = builderFormData.subjectName || '';
      const paperTitle = builderFormData.name || 'Question Paper';
      const footerLeft = subjectName ? `${subjectName} | ${paperTitle}` : paperTitle;

      let heightLeft = imgHeight;
      let srcY = 0;
      let pageNum = 1;
      const totalPages = Math.ceil(imgHeight / usableHeight);

      while (heightLeft > 0) {
        if (pageNum > 1) pdf.addPage();

        const sliceHeight = Math.min(usableHeight, heightLeft);
        // Calculate the source slice from the canvas
        const srcSliceHeight = (sliceHeight / imgHeight) * canvas.height;

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcSliceHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceHeight, 0, 0, canvas.width, srcSliceHeight);

        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, sliceHeight);

        // Add footer
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.text(footerLeft, margin, pdfHeight - 4);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pdfWidth - margin, pdfHeight - 4, { align: 'right' });

        // Draw footer line
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.2);
        pdf.line(margin, pdfHeight - footerHeight, pdfWidth - margin, pdfHeight - footerHeight);

        srcY += srcSliceHeight;
        heightLeft -= sliceHeight;
        pageNum++;
      }

      const filename = `${builderFormData.name || 'Question_Paper'}_${builderFormData.date || 'draft'}.pdf`;
      pdf.save(filename.replace(/\s+/g, '_'));
    } catch (error) {
      alert('Error generating PDF: ' + error.message);
    }
  }, [builderFormData.name, builderFormData.date, builderFormData.subjectName]);

  if (isBuildingPaper) {
    const calculatedTotalMarks = selectedQuestions.reduce((sum, q) => sum + parseFloat(q.marks), 0);
    const displayMarks = builderFormData.total_marks || calculatedTotalMarks;
    const selectedSubjObj = filteredSubjects.find(s => s.id === parseInt(builderFormData.subject));

    const formatDuration = (mins) => {
      const m = parseInt(mins) || 0;
      if (m === 0) return "0 Mins";
      const h = Math.floor(m / 60);
      const rm = m % 60;
      const hStr = h > 0 ? `${h} ${h === 1 ? 'Hr' : 'Hrs'}` : '';
      const mStr = rm > 0 ? `${rm} Mins` : '';
      return [hStr, mStr].filter(Boolean).join(' ');
    };

    const renderManualEntryBox = (sectionId = null) => (
      <div className={styles.manualEntryBox} style={{marginTop: sectionId ? '12px' : '0'}}>
        {sectionId && <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginBottom: '10px'}}>Adding Question to: {sections.find(s=>s.id===sectionId)?.title}</div>}
        <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
          <textarea 
            className={styles.toolbarInput} 
            style={{flex: 1, resize: 'vertical', minHeight: '60px'}} 
            placeholder="Type a new question to add directly to paper..."
            value={manualEntry.text}
            onChange={e => setManualEntry({...manualEntry, text: e.target.value})}
          />
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '120px'}}>
            <input 
              className={styles.toolbarInput} 
              type="number" 
              placeholder="Marks" 
              value={manualEntry.marks}
              onChange={e => setManualEntry({...manualEntry, marks: e.target.value})}
            />
            <select 
              className={styles.toolbarSelect} 
              style={{minWidth: '100%'}}
              value={manualEntry.type}
              onChange={e => setManualEntry({...manualEntry, type: e.target.value})}
            >
              <option>Descriptive</option>
              <option>MCQ</option>
              <option>True/False</option>
            </select>
          </div>
          <button className={styles.btnWordPrimary} style={{height: '40px'}} onClick={handleAddManualQuestion}>Insert</button>
        </div>
        {!sectionId && sections.length === 0 && (
          <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
            <button className={styles.btnSectionAction} onClick={() => handleAddTextBlock(null)}>
              <Type size={14} style={{marginRight: '6px'}}/> Add Text/Heading
            </button>
          </div>
        )}
        <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '8px'}}>* Questions typed here will automatically be saved to the Question Bank upon saving the document.</div>
      </div>
    );
    
    return (
      <div className={styles.wordBuilderContainer}>
        {/* Word Toolbar */}
        <div className={styles.wordToolbar}>
          <div className={styles.toolbarGroup}>
            <button className={styles.btnWordSecondary} onClick={() => setIsBuildingPaper(false)}>Close</button>
            <div style={{height: '24px', width: '1px', background: '#cbd5e1', margin: '0 8px'}}></div>
            <select className={styles.toolbarSelect} value={selectedClass} onChange={e => {
              const val = e.target.value;
              setSelectedClass(val);
              const cls = classes.find(c => c.id === parseInt(val));
              setBuilderFormData(prev => ({...prev, className: cls?.name || ''}));
            }} disabled={isPreviewMode}>
               <option value="">Select Class...</option>
               {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={styles.toolbarSelect} value={builderFormData.subject} onChange={e => {
              const val = e.target.value;
              const subj = filteredSubjects.find(s => s.id === parseInt(val));
              setBuilderFormData(prev => ({...prev, subject: val, subjectName: subj?.name || ''}));
            }} disabled={isPreviewMode}>
               <option value="">Select Subject...</option>
               {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
            </select>
            <input 
              className={styles.toolbarInput} 
              type="text" 
              placeholder="Exam Title" 
              value={builderFormData.name} 
              onChange={e => setBuilderFormData({...builderFormData, name: e.target.value})}
              disabled={isPreviewMode}
            />
            <input 
              className={styles.toolbarInput} 
              type="date" 
              title="Date of Exam"
              value={builderFormData.date} 
              onChange={e => setBuilderFormData({...builderFormData, date: e.target.value})}
              disabled={isPreviewMode}
            />
            <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap'}}>
              Duration:
              <input 
                className={styles.toolbarInput} 
                style={{width: '60px'}}
                type="number" 
                placeholder="Mins" 
                value={builderFormData.duration_minutes} 
                onChange={e => setBuilderFormData({...builderFormData, duration_minutes: e.target.value})}
                disabled={isPreviewMode}
              />
              <span style={{color: '#64748b', fontSize: '0.7rem'}}>({formatDuration(builderFormData.duration_minutes)})</span>
            </div>
          </div>
          <div className={styles.toolbarGroup} style={{whiteSpace: 'nowrap'}}>
            <div style={{fontSize: '0.875rem', fontWeight: 600, color: '#475569'}}>Total Marks: {displayMarks}</div>
            {!isPreviewMode && (
              <button className={styles.btnWordSecondary} onClick={() => {
                setTargetSectionId(null);
                if (builderFormData.subject) setSelectedSubject(builderFormData.subject);
                setIsBankModalOpen(true);
              }}>
                <Database size={16} style={{marginRight: '6px'}}/> Pick from Bank
              </button>
            )}
            <button className={styles.btnIconSm} onClick={handlePrint} title="Print">
              <Printer size={15}/>
            </button>
            <button className={styles.btnIconSm} onClick={handleDownloadPDF} title="Download PDF">
              <Download size={15}/>
            </button>
            <button className={styles.btnIconSm} onClick={handleSavePaper} title={isPreviewMode ? 'Close Preview' : 'Save Document'} style={isPreviewMode ? {} : {background: 'var(--color-primary, #2563eb)', color: '#fff', borderColor: 'var(--color-primary, #2563eb)'}}>
              {isPreviewMode ? <Eye size={15}/> : <Save size={15}/>}
            </button>
          </div>
        </div>

        {/* Word Canvas */}
        <div className={styles.wordWorkspace}>
          <div className={styles.a4Paper} ref={printRef}>
            <div className={styles.a4Header}>
              
              <h1 className={styles.schoolName}>
                 <input 
                   className={styles.inlineHeaderInput} 
                   value={builderFormData.schoolName} 
                   onChange={e => setBuilderFormData({...builderFormData, schoolName: e.target.value})}
                   placeholder="SCHOOL NAME"
                   disabled={isPreviewMode}
                 />
              </h1>
              <h2 className={styles.examTitle}>
                 <input 
                   className={styles.inlineHeaderInput} 
                   value={builderFormData.name} 
                   onChange={e => setBuilderFormData({...builderFormData, name: e.target.value})}
                   placeholder="EXAMINATION TITLE"
                   disabled={isPreviewMode}
                 />
              </h2>

              <div style={{display: 'flex', justifyContent: 'space-between', margin: '20px 0 15px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1', fontSize: '13px', fontStyle: 'italic', opacity: 0.8}}>
                <div>Candidate Name: _____________________</div>
                <div>Roll No: ____________</div>
                <div>Section: ______</div>
              </div>

              <div className={styles.metaGrid}>
                 <div className={styles.metaItem}><span>Subject:</span> <b>{selectedSubjObj?.name || builderFormData.subjectName || ''}</b></div>
                 <div className={styles.metaItem}><span>Class:</span> <b>{classes.find(c=>c.id===parseInt(selectedClass))?.name || builderFormData.className || ''}</b></div>
                 <div className={styles.metaItem}><span>Date:</span> <b>{builderFormData.date || ''}</b></div>
              </div>
              <div className={styles.metaGridSecondary}>
                 <div className={styles.metaItem}>
                    <span>Duration:</span> 
                    <b style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <input 
                        className={styles.inlineMetaInput} 
                        type="number" 
                        value={builderFormData.duration_minutes} 
                        onChange={e => setBuilderFormData({...builderFormData, duration_minutes: e.target.value})} 
                        disabled={isPreviewMode}
                      />
                      <span style={{fontSize: '0.9em', fontWeight: 600}}>
                        {parseInt(builderFormData.duration_minutes) % 60 === 0 ? (parseInt(builderFormData.duration_minutes) / 60 === 1 ? 'Hr' : 'Hrs') : (parseInt(builderFormData.duration_minutes) < 60 ? 'Mins' : 'Mins')}
                      </span>
                      <span style={{fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '5px'}}>
                        ({formatDuration(builderFormData.duration_minutes)})
                      </span>
                    </b>
                 </div>
                 <div className={styles.metaItem}>
                    <span>Max Marks:</span> 
                    <b>
                      <input 
                        className={styles.inlineMetaInput} 
                        type="number" 
                        value={displayMarks}
                        placeholder={calculatedTotalMarks}
                        onChange={e => setBuilderFormData({...builderFormData, total_marks: e.target.value})} 
                        disabled={isPreviewMode}
                      />
                    </b>
                 </div>
              </div>
              <div style={{marginTop: '15px', borderTop: '1px solid #cbd5e1', paddingTop: '10px'}}>
                {!isPreviewMode && (
                  <div className={styles.editorToolbar}>
                    <button onClick={() => document.execCommand('bold', false, null)} title="Bold"><Bold size={14}/></button>
                    <button onClick={() => document.execCommand('italic', false, null)} title="Italic"><Italic size={14}/></button>
                    <button onClick={() => document.execCommand('underline', false, null)} title="Underline"><Underline size={14}/></button>
                    <div className={styles.divider}></div>
                    <button onClick={() => document.execCommand('justifyLeft', false, null)} title="Align Left"><AlignLeft size={14}/></button>
                    <button onClick={() => document.execCommand('justifyCenter', false, null)} title="Align Center"><AlignCenter size={14}/></button>
                    <button onClick={() => document.execCommand('justifyRight', false, null)} title="Align Right"><AlignRight size={14}/></button>
                  </div>
                )}
                <div 
                  contentEditable={!isPreviewMode}
                  suppressContentEditableWarning={true}
                  className={styles.richTextEditor}
                  onBlur={(e) => setBuilderFormData({...builderFormData, instructions: e.target.innerHTML})}
                  dangerouslySetInnerHTML={{__html: builderFormData.instructions}}
                />
              </div>
            </div>

            <div className={styles.a4Content}>
               {(selectedQuestions.length === 0 && sections.length === 0) ? (
                 <div style={{opacity: 0.4, textAlign: 'center', padding: '40px 0'}}>Empty Document. Add questions below or from the bank.</div>
               ) : (() => {
                 // Build rendering order: group by sections if sections exist
                 let qNum = 0;
                 const getQId = (q) => q.id || q.tempId;

                 const renderQuestion = (sq, globalIndex) => {
                   const qId = getQId(sq);

                   // Text blocks don't get question numbers
                   if (sq.isTextBlock) {
                     return (
                       <div key={qId} className={styles.questionRow} style={{width: '100%', padding: '12px 0'}}>
                         {isPreviewMode ? (
                           <div style={{width: '100%'}} dangerouslySetInnerHTML={{__html: sq.text}} />
                         ) : (
                           <>
                             <div 
                               contentEditable
                               suppressContentEditableWarning
                               className={styles.richTextEditor}
                               style={{minHeight: '40px', padding: '8px 12px', border: '1px dashed #cbd5e1', borderRadius: '4px', background: '#f8fafc', width: '100%'}}
                               onBlur={e => handleUpdateTextBlock(qId, e.target.innerHTML)}
                               dangerouslySetInnerHTML={{__html: sq.text}}
                             />
                             <div className={styles.questionActions}>
                               {sections.length > 0 && (
                                 <select 
                                   className={styles.inlineSectionSelect}
                                   value={sections.find(s => s.questionIds?.includes(qId))?.id || ''}
                                   onChange={(e) => handleAssignToSection(qId, e.target.value)}
                                   title="Assign to Section"
                                 >
                                   <option value="">Unassigned</option>
                                   {sections.map(s => <option key={s.id} value={s.id}>Sec {s.label}</option>)}
                                 </select>
                               )}
                               <button className={styles.btnRemove} onClick={() => handleMoveQuestion(globalIndex, 'up')} title="Move Up"><ArrowUp size={14}/></button>
                               <button className={styles.btnRemove} onClick={() => handleMoveQuestion(globalIndex, 'down')} title="Move Down"><ArrowDown size={14}/></button>
                               <button className={styles.btnRemove} onClick={() => handleToggleQuestion(sq)} title="Remove"><X size={14}/></button>
                             </div>
                           </>
                         )}
                       </div>
                     );
                   }

                   qNum++;
                   const diff = sq.difficulty || 'Medium';
                   const diffClass = diff === 'Easy' ? styles.diffEasy : diff === 'Hard' ? styles.diffHard : styles.diffMedium;
                   // Check if there's an OR link AFTER this question
                   const nextQ = selectedQuestions[globalIndex + 1];
                   const nextId = nextQ ? getQId(nextQ) : null;
                   const hasOrAfter = orLinks.some(l => l[0] === qId && l[1] === nextId);
                   // Check if this question is the second in an OR pair (skip its number)
                   const prevQ = globalIndex > 0 ? selectedQuestions[globalIndex - 1] : null;
                   const prevId = prevQ ? getQId(prevQ) : null;
                   const isOrSecond = orLinks.some(l => l[0] === prevId && l[1] === qId);
                   if (isOrSecond) qNum--; // Same number as the OR partner

                   return (
                     <React.Fragment key={qId}>
                       <div className={styles.questionRow}>
                         <div className={styles.qNumber}>Q{qNum}.</div>
                         <div className={styles.qTextBlock}>
                           {sq.question_text || sq.text}
                           {!isPreviewMode && (
                             <span className={`${styles.diffTag} ${diffClass}`}>{diff}</span>
                           )}
                         </div>
                         <div className={styles.qMarksBlock}>
                           [<input 
                              type="number" 
                              className={styles.inlineMarksInput} 
                              value={sq.marks} 
                              onChange={(e) => handleUpdateMarks(sq.tempId || sq.id, e.target.value)} 
                              disabled={isPreviewMode}
                            />]
                         </div>
                         {!isPreviewMode && (
                           <div className={styles.questionActions}>
                             {sections.length > 0 && (
                               <select 
                                 className={styles.inlineSectionSelect}
                                 value={sections.find(s => s.questionIds?.includes(qId))?.id || ''}
                                 onChange={(e) => handleAssignToSection(qId, e.target.value)}
                                 title="Assign to Section"
                               >
                                 <option value="">Unassigned</option>
                                 {sections.map(s => <option key={s.id} value={s.id}>Sec {s.label}</option>)}
                               </select>
                             )}
                             <button className={styles.btnRemove} onClick={() => handleMoveQuestion(globalIndex, 'up')} title="Move Up"><ArrowUp size={14}/></button>
                             <button className={styles.btnRemove} onClick={() => handleMoveQuestion(globalIndex, 'down')} title="Move Down"><ArrowDown size={14}/></button>
                             {!hasOrAfter && globalIndex < selectedQuestions.length - 1 && (
                               <button className={styles.btnRemove} onClick={() => handleAddOrLink(globalIndex)} title="Add OR with next question"><GitBranch size={14}/></button>
                             )}
                             <button className={styles.btnRemove} onClick={() => handleToggleQuestion(sq)} title="Remove"><X size={14}/></button>
                           </div>
                         )}
                       </div>
                       {/* Answer space lines */}
                       {sq.answerLines > 0 && (
                         <div className={styles.answerLines}>
                           {Array.from({length: sq.answerLines}).map((_, li) => <div key={li} className={styles.answerLine}/>)}
                         </div>
                       )}
                       {/* OR divider */}
                       {hasOrAfter && (
                         <div className={styles.orDivider}>
                           <div className={styles.orLine}/>
                           <span className={styles.orText}>OR</span>
                           <div className={styles.orLine}/>
                           {!isPreviewMode && (
                             <button className={styles.btnRemove} style={{color: '#ef4444', fontSize: '0.65rem'}} onClick={() => handleRemoveOrLink(qId, nextId)} title="Remove OR link"><X size={12}/></button>
                           )}
                         </div>
                       )}
                     </React.Fragment>
                   );
                 };

                 if (sections.length > 0) {
                   // Render with sections
                   const assignedIds = new Set(sections.flatMap(s => s.questionIds || []));
                   const unassigned = selectedQuestions.filter(q => !assignedIds.has(getQId(q)));

                   return (
                     <>
                       {sections.map((sec, idx) => {
                         const secQuestions = (sec.questionIds || []).map(id => selectedQuestions.find(q => getQId(q) === id)).filter(Boolean);
                         return (
                           <div key={sec.id}>
                             <div className={styles.sectionDivider} style={idx === 0 ? { borderTop: 'none', marginTop: 0, paddingTop: 0 } : {}}>
                               <div className={styles.sectionLabel}>{sec.title}</div>
                               {isPreviewMode ? (
                                 <div className={styles.sectionInstruction} style={{flex: 1, textAlign: 'center'}}>{sec.instruction}</div>
                               ) : (
                                 <input 
                                   className={styles.sectionInstructionInput}
                                   style={{flex: 1, textAlign: 'center'}}
                                   value={sec.instruction}
                                   onChange={e => handleUpdateSection(sec.id, 'instruction', e.target.value)}
                                   placeholder="Section instruction..."
                                 />
                               )}
                               <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                 <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b'}}>
                                   [ {secQuestions.reduce((sum, q) => {
                                     const qId = q.id || q.tempId;
                                     const isOrSecond = orLinks.some(l => l[1] === qId);
                                     if (isOrSecond || q.isTextBlock) return sum;
                                     return sum + (parseFloat(q.marks) || 0);
                                   }, 0)} Marks ]
                                 </span>
                                 {!isPreviewMode && (
                                   <button className={styles.btnRemove} onClick={() => handleRemoveSection(sec.id)} title="Remove Section"><X size={14}/></button>
                                 )}
                               </div>
                             </div>
                             {secQuestions.map(sq => {
                               const gi = selectedQuestions.indexOf(sq);
                               return renderQuestion(sq, gi);
                             })}
                             {secQuestions.length === 0 && !isPreviewMode && (
                               <div style={{opacity: 0.4, fontSize: '0.8rem', padding: '12px', textAlign: 'center'}}>No questions in this section</div>
                             )}
                             {!isPreviewMode && (
                               <div style={{display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center'}}>
                                 <button className={styles.btnSectionAction} onClick={() => { setTargetSectionId(sec.id); setIsBankModalOpen(true); }}>
                                   <Database size={14} style={{marginRight: '6px'}}/> Pick from Bank
                                 </button>
                                 <button className={styles.btnSectionAction} onClick={() => setTargetSectionId(targetSectionId === sec.id ? null : sec.id)}>
                                   <Plus size={14} style={{marginRight: '6px'}}/> Type New Question
                                 </button>
                                 <button className={styles.btnSectionAction} onClick={() => handleAddTextBlock(sec.id)}>
                                   <Type size={14} style={{marginRight: '6px'}}/> Add Text/Heading
                                 </button>
                               </div>
                             )}
                             {targetSectionId === sec.id && !isPreviewMode && renderManualEntryBox(sec.id)}
                           </div>
                         );
                       })}
                       {unassigned.length > 0 && (
                         <>
                           {sections.length > 0 && <div style={{marginTop: '20px', paddingTop: '10px', borderTop: '1px dashed #94a3b8', fontSize: '0.75rem', color: '#64748b', fontWeight: 600}}>Unassigned Questions</div>}
                           {unassigned.map(sq => {
                             const gi = selectedQuestions.indexOf(sq);
                             return renderQuestion(sq, gi);
                           })}
                         </>
                       )}
                     </>
                   );
                 } else {
                   // Flat render (no sections)
                   return selectedQuestions.map((sq, i) => renderQuestion(sq, i));
                 }
               })()}
            </div>

            {/* Section + Blueprint controls below paper */}
            {!isPreviewMode && (
              <>
                <button className={styles.addSectionBtn} onClick={handleAddSection}>
                  <Layers size={14}/> Add Section (A, B, C...)
                </button>

                {/* Blueprint Validation */}
                {blueprint && (
                  <div className={styles.blueprintPanel}>
                    <div className={styles.blueprintTitle}><BarChart3 size={14}/> Paper Blueprint</div>
                    <div className={styles.blueprintGrid}>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>Total Questions</span>
                        <span className={styles.blueprintValue}>{blueprint.total}</span>
                      </div>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>Total Marks</span>
                        <span className={styles.blueprintValue}>{blueprint.totalMarks}</span>
                      </div>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>🟢 Easy</span>
                        <span className={styles.blueprintValue}>{blueprint.easy} ({blueprint.easyPct}%)</span>
                      </div>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>🟡 Medium</span>
                        <span className={styles.blueprintValue}>{blueprint.medium} ({blueprint.mediumPct}%)</span>
                      </div>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>🔴 Hard</span>
                        <span className={styles.blueprintValue}>{blueprint.hard} ({blueprint.hardPct}%)</span>
                      </div>
                      <div className={styles.blueprintItem}>
                        <span className={styles.blueprintLabel}>Question Types</span>
                        <span className={styles.blueprintValue} style={{fontSize: '0.65rem'}}>{blueprint.mcq > 0 ? `MCQ: ${blueprint.mcq}` : ''}{blueprint.desc > 0 ? ` Desc: ${blueprint.desc}` : ''}{blueprint.tf > 0 ? ` T/F: ${blueprint.tf}` : ''}</span>
                      </div>
                    </div>
                    {/* Difficulty bars */}
                    <div style={{marginTop: '8px', display: 'flex', gap: '4px', height: '6px', borderRadius: '3px', overflow: 'hidden'}}>
                      <div style={{flex: blueprint.easyPct || 1, background: '#22c55e', borderRadius: '3px'}} title={`Easy ${blueprint.easyPct}%`}/>
                      <div style={{flex: blueprint.mediumPct || 1, background: '#eab308', borderRadius: '3px'}} title={`Medium ${blueprint.mediumPct}%`}/>
                      <div style={{flex: blueprint.hardPct || 1, background: '#ef4444', borderRadius: '3px'}} title={`Hard ${blueprint.hardPct}%`}/>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Manual Entry Inline Block */}
            {(!isPreviewMode && sections.length === 0) && renderManualEntryBox(null)}
          </div>
        </div>

        {/* Bank Picker Modal inside Builder */}
        {isBankModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column'}}>
              <div className={styles.modalHeader}>
                <h3>Pick from Question Bank</h3>
                <button onClick={() => setIsBankModalOpen(false)}><X size={20}/></button>
              </div>
              
              <div className={styles.modalBody} style={{flex: 1, overflow: 'hidden', padding: 0}}>
                <div className={styles.panelHeader} style={{borderBottom: 'none', background: '#f8fafc', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div className={styles.searchWrapper} style={{width: '100%', marginBottom: 0}}>
                    <Search size={16} className={styles.searchIcon} />
                    <input 
                      type="text" 
                      placeholder="Search question bank..." 
                      className={styles.searchBox} 
                      style={{marginBottom: 0, background: 'white'}}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div style={{display: 'flex', gap: '8px'}}>
                    <select 
                      className={styles.filterSelect}
                      style={{background: 'white', flex: 1}}
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    <select 
                      className={styles.filterSelect}
                      style={{background: 'white', flex: 1}}
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                    >
                      <option value="">All Subjects</option>
                      {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.panelBody} style={{paddingTop: 0}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {loading ? (
                      <div style={{width: '100%', textAlign: 'center', padding: '20px'}}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
                    ) : questions.length > 0 ? questions.map(q => {
                      const isSelected = selectedQuestions.some(sq => (sq.id || sq.tempId) === q.id);
                      return (
                        <div 
                          key={q.id} 
                          className={`${styles.qBankItem}`}
                          style={{borderColor: isSelected ? 'var(--color-primary)' : 'var(--theme-border)', flexDirection: 'row', alignItems: 'center'}}
                          onClick={() => handleToggleQuestion(q)}
                        >
                          <input type="checkbox" className={styles.checkbox} checked={isSelected} readOnly />
                          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                            <div className={styles.qText}>{q.question_text || q.text}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--theme-text-secondary)', marginTop: '4px'}}>Marks: {q.marks} | Type: {q.question_type}</div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{width: '100%', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem', padding: '20px'}}>No questions found.</div>
                    )}
                  </div>
                </div>
              </div>

               {/* Bank Pagination Footer */}
              {paginationInfo.count > 0 && (
                <div className={styles.panelFooter}>
                  <div className={styles.pagination} style={{margin: 0, paddingTop: 0, border: 'none'}}>
                    <button 
                      className={styles.pageBtn} 
                      disabled={!paginationInfo.previous}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Prev
                    </button>
                    <div className={styles.pageInfo}>
                      Page {currentPage} of {Math.ceil(paginationInfo.count / 10)}
                    </div>
                    <button 
                      className={styles.pageBtn} 
                      disabled={!paginationInfo.next}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Question Bank */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <Database size={18}/> Question Bank
          </h3>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {isAdmin && (
              <button 
                className={styles.btnWipe} 
                onClick={() => setIsWipeModalOpen(true)}
                title="Wipe Question Bank for Subject"
              >
                <RotateCcw size={14}/> Wipe Subject
              </button>
            )}
            <button className={styles.btnIcon} onClick={() => setIsModalOpen(true)} title="Add to Bank">
              <Plus size={18}/>
            </button>
          </div>
        </div>
        
        <div className={styles.panelBody}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search questions..." 
              className={styles.searchBox} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
            <select 
              className={styles.filterSelect}
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select 
              className={styles.filterSelect}
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">All Subjects</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ''}</option>)}
            </select>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {loading ? (
              <div style={{padding: '20px', textAlign: 'center'}}><Loader2 className="animate-spin" size={24} style={{margin:'0 auto'}}/></div>
            ) : questions.length > 0 ? questions.map(q => (
              <div key={q.id} className={styles.qBankItem}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px'}}>
                  <div style={{flex: 1}}>
                    <div className={styles.qText}>{q.question_text || q.text}</div>
                    <div className={styles.qMeta}>
                      <div style={{display: 'flex', gap: '6px'}}>
                        <span className={`${styles.badge} ${(q.difficulty || 'Medium') === 'Hard' ? styles.badgeHard : (q.difficulty || 'Medium') === 'Easy' ? styles.badgeMemory : ''}`}>{q.difficulty || 'Medium'}</span>
                        <span className={`${styles.badge} ${styles.badgeApply}`}>{q.question_type || 'Descriptive'}</span>
                      </div>
                      <span style={{fontWeight: 600}}>{q.marks} Marks</span>
                    </div>
                  </div>
                  <button className={styles.btnDeleteIcon} onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} title="Delete Question">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            )) : (
              <div style={{textAlign: 'center', opacity: 0.5, fontSize: '0.875rem', padding: '20px'}}>No questions found.</div>
            )}
          </div>
        </div>

        {/* PERSISTENT FOOTER FOR PAGINATION */}
        {paginationInfo.count > 0 && (
          <div className={styles.panelFooter}>
            <div className={styles.pagination}>
              <button 
                className={styles.pageBtn} 
                disabled={!paginationInfo.previous}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Prev
              </button>
              <div className={styles.pageInfo}>
                Page {currentPage} of {Math.ceil(paginationInfo.count / 10)}
              </div>
              <button 
                className={styles.pageBtn} 
                disabled={!paginationInfo.next}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paper Canvas */}
      <div className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <FileText size={18} />
            Question Papers
          </div>
        </div>
        
        <div className={styles.panelBody} style={{background: 'var(--theme-bg)'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'}}>
            {papers.map(p => (
              <div key={p.id} className={styles.paperCard}>
                <div className={styles.pTitle}>{p.name}</div>
                <div className={styles.pSub}>{p.subject_name} | {p.total_marks} Marks</div>
                <div className={styles.pActions}>
                  <button className={styles.btnSm} onClick={() => handlePreviewPaper(p.id)}>Preview</button>
                  <button className={styles.btnSm} style={{background: 'var(--color-primary)', color: '#fff'}} onClick={() => handleEditPaper(p.id)}>Edit</button>
                  <button className={styles.btnSm} style={{background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca'}} onClick={() => handleDeletePaper(p.id)} title="Delete Paper"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            
            <div className={styles.addPaperPlaceholder} onClick={() => setIsBuildingPaper(true)}>
               <div className={styles.addIcon}><Plus size={32}/></div>
               <span>Create New Question Paper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Question to Bank</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateQuestion} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <select 
                  required 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Question Text</label>
                <textarea 
                  required 
                  value={formData.question_text}
                  onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question here..."
                  rows={3}
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <select value={formData.question_type} onChange={e => setFormData({ ...formData, question_type: e.target.value })}>
                    <option>Descriptive</option>
                    <option>MCQ</option>
                    <option>True/False</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Marks</label>
                  <input type="number" value={formData.marks} onChange={e => setFormData({ ...formData, marks: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Difficulty</label>
                  <select value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Wipe Bank Confirmation Modal */}
      {isWipeModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.wipeModal}`}>
            <div className={styles.modalHeader}>
              <h3 style={{color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <AlertTriangle size={20}/> Wipe Question Bank?
              </h3>
              <button onClick={() => setIsWipeModalOpen(false)}><X size={20}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <AlertTriangle size={24} style={{flexShrink: 0}}/>
                <div>
                  <strong>CRITICAL ACTION:</strong> This will permanently delete ALL questions currently in the bank for the filtered subject. This cannot be undone.
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Reason for Wiping (Min 10 chars)</label>
                <textarea 
                  className={styles.textarea}
                  placeholder="Explain why you are deleting these questions..."
                  value={wipeReason}
                  onChange={e => setWipeReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <p style={{fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '8px'}}>
                * This action is restricted to Admins only.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setIsWipeModalOpen(false)}>Cancel</button>
              <button 
                className={styles.btnPrimary} 
                style={{background: '#ef4444', borderColor: '#ef4444'}}
                disabled={wiping || wipeReason.length < 10 || !selectedSubject}
                onClick={async () => {
                  setWiping(true);
                  try {
                    await adminApi.bulkDeleteQuestions({ 
                      subject: selectedSubject, 
                      reason: wipeReason 
                    });
                    setIsWipeModalOpen(false);
                    setWipeReason('');
                    fetchData();
                  } catch (e) {
                    alert(e.response?.data?.error || "Error wiping bank");
                  } finally {
                    setWiping(false);
                  }
                }}
              >
                {wiping ? <Loader2 className="animate-spin" size={16}/> : 'CONFIRM WIPE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
