'use client';

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Search, Filter, BookOpen, BarChart2, FileText, ChevronRight, 
  Award, AlertCircle, TrendingUp, Download, Send, MoreHorizontal,
  X, ChevronDown, CheckCircle, Info, Plus, FileCheck, Upload, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import styles from './PerformanceAd.module.css';
import instance from '@/api/instance';
import PerfomaceStdDetail from './PerfomaceStdDetail/PerfomaceStdDetail';
import ReportCardCreate from './ReportCardCreate/ReportCardCreate';

const PerformanceAd = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [classes] = useState(['10-A', '10-B', '9-A', '9-B']);
    
    const [selectedClass, setSelectedClass] = useState('10-A');
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [performanceData, setPerformanceData] = useState(null);
    const [studentTrendData, setStudentTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTrendPopup, setShowTrendPopup] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [reportCards, setReportCards] = useState([]);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkMsg, setBulkMsg] = useState('');

    const handleExportPDF = async () => {
        const element = document.getElementById('performance-content-area');
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`performance_report_${selectedClass}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('PDF Export failed:', error);
            alert('PDF Export failed. Please try again.');
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [studRes, examRes] = await Promise.all([
                    instance.get('/students/students/'),
                    instance.get('/exams/')
                ]);
                const allStudents = studRes.data.results || (Array.isArray(studRes.data) ? studRes.data : []);
                setStudents(allStudents);
                setExams(examRes.data);
                if (examRes.data.length > 0) setSelectedExamId(examRes.data[0].id);
            } catch (err) { console.error(err); }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedExamId) return;
            setLoading(true);
            try {
                const [resultsRes, reportCardsRes] = await Promise.all([
                    instance.get(`/exams/results/?exam=${selectedExamId}`),
                    instance.get(`/exams/report-cards/?exam=${selectedExamId}`)
                ]);

                const aggData = {
                    results: resultsRes.data,
                    reportCards: reportCardsRes.data,
                    classAverage: (reportCardsRes.data.reduce((acc, curr) => acc + parseFloat(curr.percentage || 0), 0) / (reportCardsRes.data.length || 1)).toFixed(1),
                    passRate: ((reportCardsRes.data.filter(rc => rc.percentage >= 35).length / (reportCardsRes.data.length || 1)) * 100).toFixed(0),
                    atRiskCount: reportCardsRes.data.filter(rc => rc.percentage < 40).length,
                    topPerformers: reportCardsRes.data.filter(rc => rc.percentage >= 85).length
                };
                setPerformanceData(aggData);
                setReportCards(Array.isArray(reportCardsRes.data) ? reportCardsRes.data : []);

                if (selectedStudent) {
                    const trendRes = await instance.get(`/exams/report-cards/?student=${selectedStudent.id}`);
                    setStudentTrendData(trendRes.data.map(rc => ({
                        name: rc.exam_name,
                        percentage: parseFloat(rc.percentage)
                    })).sort((a, b) => a.name.localeCompare(b.name)));
                    setRemarks(reportCardsRes.data.find(rc => rc.student === selectedStudent.id)?.teacher_remarks || '');
                }
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [selectedExamId, selectedStudent]);

    const handleBulkUpload = async () => {
        if (!bulkFile) {
            setBulkMsg('Select a file first (.csv/.xlsx)');
            return;
        }
        if (!selectedExamId) {
            setBulkMsg('Select term before bulk upload');
            return;
        }
        setBulkBusy(true);
        setBulkMsg('');
        try {
            const formData = new FormData();
            formData.append('file', bulkFile);
            formData.append('exam', selectedExamId);
            formData.append('class', selectedClass);

            const endpoints = [
                '/exams/report-cards/generate-bulk/',
                '/exams/report-cards/bulk-upload/',
                '/exams/results/bulk-upload/',
                '/exams/results/bulk/'
            ];

            let ok = false;
            for (let i = 0; i < endpoints.length; i += 1) {
                try {
                    const res = await instance.post(endpoints[i], formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (res.status >= 200 && res.status < 300) {
                        ok = true;
                        break;
                    }
                } catch (e) {
                    // try next endpoint
                }
            }

            if (!ok) {
                setBulkMsg('Bulk endpoint not available on server');
                return;
            }

            const reportCardsRes = await instance.get(`/exams/report-cards/?exam=${selectedExamId}`);
            setReportCards(Array.isArray(reportCardsRes.data) ? reportCardsRes.data : []);
            setBulkMsg('Bulk upload completed and report cards generated');
            setBulkFile(null);
        } catch (err) {
            setBulkMsg('Bulk upload failed');
        } finally {
            setBulkBusy(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Top Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Performance</h1>
                    <div className={styles.tabContainer}>
                        <button className={`${styles.tabLink} ${activeTab === 'overview' ? styles.tabLinkActive : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                        <button className={`${styles.tabLink} ${activeTab === 'student_detail' ? styles.tabLinkActive : ''}`} onClick={() => setActiveTab('student_detail')}>Student detail</button>
                        <button className={`${styles.tabLink} ${activeTab === 'report_card' ? styles.tabLinkActive : ''}`} onClick={() => setActiveTab('report_card')}>Report card</button>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <button className={styles.ghostBtn}>Re-calc ranks</button>
                    <button className={styles.ghostBtn} onClick={handleExportPDF}><Download size={14} /> Export PDF</button>
                    <button className={styles.actionBtn}>+ Enter marks</button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterRow}>
                <div className={styles.filterItem}>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                </div>
                <div className={styles.filterItem}>
                    <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                        <option value="">Select Term</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name} — 2024</option>)}
                    </select>
                </div>
                <div className={styles.filterItem}>
                    <select><option>All subjects</option></select>
                </div>
                <div className={styles.filterItem}>
                    <select><option>All students</option></select>
                </div>
            </div>

            {/* Content Area */}
            <div className={styles.content} id="performance-content-area">
                {activeTab === 'overview' && (
                    <>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>CLASS AVERAGE</span>
                                <h2 className={styles.statValue}>{performanceData?.classAverage || '0.0'}%</h2>
                                <span className={styles.trendUp}>+3.1% vs last term</span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>PASS RATE</span>
                                <h2 className={styles.statValue}>{performanceData?.passRate || '0'}%</h2>
                                <span className={styles.statInfo}>of students</span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>AT RISK</span>
                                <h2 className={`${styles.statValue} ${styles.valRisk}`}>{performanceData?.atRiskCount || '0'}</h2>
                                <span className={styles.statInfo}>below 40% in 2+ subjects</span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>TOP PERFORMERS</span>
                                <h2 className={`${styles.statValue} ${styles.valTop}`}>{performanceData?.topPerformers || '0'}</h2>
                                <span className={styles.statInfo}>above 85% overall</span>
                            </div>
                        </div>

                        <div className={styles.sectionDivider}>
                            <span>SUBJECT AVERAGES</span>
                        </div>

                        <div className={styles.subjectList}>
                            {[
                                { name: 'Mathematics', val: 65, trend: '-2% vs last term', up: false },
                                { name: 'Science', val: 68, trend: '+5% vs last term', up: true },
                                { name: 'English', val: 71, trend: '-2% vs last term', up: false },
                                { name: 'Social Studies', val: 74, trend: '+5% vs last term', up: true },
                                { name: 'Malayalam', val: 77, trend: '-2% vs last term', up: false },
                                { name: 'Hindi', val: 80, trend: '+5% vs last term', up: true },
                            ].map((s, i) => (
                                <div key={s.name} className={styles.subjectItem}>
                                    <div className={styles.subjMeta}>
                                        <span className={styles.subjName}>{s.name}</span>
                                        <span className={styles.subjVal}>{s.val}%</span>
                                    </div>
                                    <div className={styles.subjBar}><div style={{ width: `${s.val}%`, backgroundColor: `var(--chart-color-${i % 6 + 1})` }}></div></div>
                                    <span className={s.up ? styles.trendUp : styles.trendDown}>{s.trend}</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.sectionDivider}>
                            <span>STUDENT LIST</span>
                        </div>

                        <div className={styles.studentTable}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Overall</th>
                                        <th>Maths</th>
                                        <th>Science</th>
                                        <th>English</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.slice(0, 8).map((s, idx) => (
                                        <tr 
                                            key={s.id} 
                                            onClick={() => {
                                                setSelectedStudent(s);
                                                setActiveTab('student_detail');
                                            }}
                                            style={{cursor: 'pointer'}}
                                        >
                                            <td>
                                                <div className={styles.stdCell}>
                                                    <div className={styles.stdAvatar} style={{backgroundColor: `var(--avatar-color-${idx % 5 + 1})`}}>
                                                        {s.user?.first_name?.[0]}{s.user?.last_name?.[0]}
                                                    </div>
                                                    {s.user?.first_name} {s.user?.last_name}
                                                </div>
                                            </td>
                                            <td className={styles.bold}>
                                                <div className={styles.overallRow}>
                                                    <div className={styles.miniBar}><div style={{width: '60%', backgroundColor: 'var(--color-success)'}}></div></div>
                                                    89%
                                                </div>
                                            </td>
                                            <td className={idx % 2 === 0 ? styles.valRisk : ''}>91%</td>
                                            <td>87%</td>
                                            <td>93%</td>
                                            <td>
                                                <span className={`${styles.badge} ${idx % 3 === 0 ? styles.badgeTop : (idx % 3 === 1 ? styles.badgeTrack : styles.badgeRisk)}`}>
                                                    {idx % 3 === 0 ? 'Top performer' : (idx % 3 === 1 ? 'On track' : 'At risk')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'student_detail' && (
                    <PerfomaceStdDetail 
                        student={selectedStudent || students[0]} 
                        onBack={() => setActiveTab('overview')} 
                    />
                )}

                {activeTab === 'report_card' && !showBuilder && (
                    <div className={styles.reportCardPanel}>
                        <div className={styles.reportCardTopRow}>
                            <div>
                                <h3 className={styles.reportCardTitle}>Generated Report Cards</h3>
                                <p className={styles.reportCardSub}>List of report cards for selected term/class</p>
                            </div>
                            <div className={styles.reportCardActions}>
                                <button className={styles.ghostBtn} onClick={async () => {
                                    if (!selectedExamId) return;
                                    const reportCardsRes = await instance.get(`/exams/report-cards/?exam=${selectedExamId}`);
                                    setReportCards(Array.isArray(reportCardsRes.data) ? reportCardsRes.data : []);
                                }}>
                                    <RefreshCw size={14} /> Refresh
                                </button>
                                <button className={styles.primaryBtn} onClick={() => setShowBuilder(true)}>
                                    <Plus size={16} /> Build Report Card
                                </button>
                            </div>
                        </div>

                        <div className={styles.bulkUploadRow}>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                            />
                            <button className={styles.actionBtn} onClick={handleBulkUpload} disabled={bulkBusy}>
                                <Upload size={14} /> {bulkBusy ? 'Uploading...' : 'Bulk Upload & Auto Generate'}
                            </button>
                            {bulkMsg && <span className={styles.bulkMsg}>{bulkMsg}</span>}
                        </div>

                        <div className={styles.reportListWrap}>
                            <table className={styles.reportTable}>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Exam</th>
                                        <th>Percent</th>
                                        <th>Grade</th>
                                        <th>Rank</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportCards.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className={styles.emptyCell}>No report cards found for this term.</td>
                                        </tr>
                                    )}
                                    {reportCards.map((rc) => (
                                        <tr key={rc.id}>
                                            <td>{rc.student_name || `Student #${rc.student}`}</td>
                                            <td>{rc.exam_name || '-'}</td>
                                            <td>{rc.percentage ?? '-'}%</td>
                                            <td>{rc.grade || '-'}</td>
                                            <td>{rc.rank || '-'}</td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button
                                                        className={styles.ghostBtn}
                                                        onClick={() => {
                                                            const st = students.find((s) => s.id === rc.student);
                                                            if (st) {
                                                                setSelectedStudent(st);
                                                                setActiveTab('student_detail');
                                                            }
                                                        }}
                                                    >
                                                        View
                                                    </button>
                                                    {rc.pdf_file && (
                                                        <a className={styles.ghostBtn} href={rc.pdf_file} target="_blank" rel="noreferrer">
                                                            <Download size={14} /> PDF
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'report_card' && showBuilder && (
                    <ReportCardCreate onBack={() => setShowBuilder(false)} />
                )}
            </div>

            {/* Modal & Trend */}
            {showTrendPopup && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Performance Trend</h3>
                            <button className={styles.modalClose} onClick={() => setShowTrendPopup(false)}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={studentTrendData}>
                                    <XAxis dataKey="name" stroke="var(--theme-text-muted)" />
                                    <YAxis stroke="var(--theme-text-muted)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--theme-surface)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }} />
                                    <Area type="monotone" dataKey="percentage" stroke="var(--color-secondary)" fill="var(--color-secondary)" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceAd;
