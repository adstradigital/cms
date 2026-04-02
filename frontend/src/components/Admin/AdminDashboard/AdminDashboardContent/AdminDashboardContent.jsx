import React from 'react';
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  ChevronLeft,
  Bell
} from 'lucide-react';
import styles from './AdminDashboardContent.module.css';

const AdminDashboardContent = () => {
  // Mock data for the bar chart
  const barChartData = [
    { subject: 'Eng', student: 98, average: 90 },
    { subject: 'Math', student: 98, average: 90 },
    { subject: 'Sci', student: 98, average: 90 },
    { subject: 'Hist', student: 98, average: 90 },
    { subject: 'Ban', student: 98, average: 90 },
    { subject: 'Rel', student: 98, average: 90 },
    { subject: 'Art', student: 98, average: 90 },
  ];

  return (
    <div className={styles.contentWrapper}>
      
      {/* CENTER COLUMN (Stats & Charts) */}
      <div className={styles.centerColumn}>
        
        {/* 3 Stat Cards */}
        <div className={styles.statsGrid}>
          {/* Attendance Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <CheckCircle2 size={18} color="#14a073" />
              <span>Attendance</span>
            </div>
            <h3 className={styles.statCardTitle}>98%</h3>
            <div className={styles.statCardDetails}>
              <p>Last absent: <span>02 March, 2020</span></p>
              <p>Reason: <span>Toothache</span></p>
            </div>
          </div>

          {/* Fee Due Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeaderBetween}>
              <div className={styles.statCardHeader} style={{ marginBottom: 0 }}>
                <div className={styles.currencyIcon}>৳</div>
                <span>Fee Due</span>
              </div>
              <button className={styles.noticeButton}>Send Notice</button>
            </div>
            <h3 className={styles.statCardTitleSmall}>
              <span className={styles.currencySymbol}>৳</span>
              12650.00
            </h3>
            <div className={styles.statCardDetails}>
              <p>Last paid: <span>02 March, 2020</span></p>
              <p>Method: <span>Online</span></p>
            </div>
          </div>

          {/* Exam Marks Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <FileSpreadsheet size={18} color="#3b82f6" />
              <span>Exam Marks</span>
            </div>
            <h3 className={styles.statCardTitle}>92%</h3>
            <div className={styles.statCardDetails}>
              <p>Last Exam: <span>1st Semester</span></p>
              <p>Top Marks: <span>English (98%)</span></p>
            </div>
          </div>
        </div>

        {/* Charts Area */}
        <div className={styles.chartsGrid}>
          
          {/* Bar Chart (Recent Exam Report) */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Recent Exam Report</h3>
            
            {/* Legend */}
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColorBox} ${styles.legendBlue}`}></div>
                <span>Student's Mark</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColorBox} ${styles.legendGray}`}></div>
                <span>Class Average</span>
              </div>
            </div>

            {/* Simulated Bar Chart */}
            <div className={styles.barChartContainer}>
              {barChartData.map((data, index) => (
                <div key={index} className={styles.barGroup}>
                  <div className={styles.barsWrapper}>
                    {/* Student Bar */}
                    <div className={`${styles.bar} ${styles.barBlue}`} style={{ height: `${data.student}%` }}>
                       <span className={`${styles.barLabel} ${styles.barLabelBlue}`}>{data.student}</span>
                    </div>
                    {/* Average Bar */}
                    <div className={`${styles.bar} ${styles.barGray}`} style={{ height: `${data.average}%` }}>
                       <span className={`${styles.barLabel} ${styles.barLabelGray}`}>{data.average}</span>
                    </div>
                  </div>
                  <span className={styles.barSubject}>{data.subject}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie Chart (Attendance Summary) */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeaderBetween}>
              <h3 className={styles.chartTitleNoMargin}>Attendance Summary</h3>
              <button className={styles.monthSelector}>
                March, 2020 <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>

            <div className={styles.pieChartWrapper}>
               {/* CSS Pie Chart */}
               <div 
                  className={styles.pieChart}
                  style={{
                    background: 'conic-gradient(#ef4444 0% 12%, #fbbf24 12% 25%, #3b0764 25% 100%)'
                  }}
               >
               </div>

               {/* Pie Chart Custom Legend */}
               <div className={styles.pieLegend}>
                  <div className={styles.legendItem}>
                    <div className={`${styles.legendColorBox} ${styles.pieLegendColorPurple}`}></div>
                    <span>Attendance</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={`${styles.legendColorBox} ${styles.pieLegendColorYellow}`}></div>
                    <span>Absence</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={`${styles.legendColorBox} ${styles.pieLegendColorRed}`}></div>
                    <span>Early Leave</span>
                  </div>
               </div>
            </div>
          </div>

        </div>

        {/* Back Button */}
        <div className={styles.backButtonContainer}>
          <button className={styles.backButton}>
            <ChevronLeft size={16} /> Back
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN (Profile & Notifications) */}
      <div className={styles.rightColumn}>
        
        {/* Student Profile Card */}
        <div className={styles.profileCard}>
          {/* Avatar Illustration */}
          <div className={styles.avatarContainer}>
            <div className={styles.avatarBg}></div>
            <svg viewBox="0 0 100 100" className={styles.avatarSvg} fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 100 C 20 60, 80 60, 80 100" fill="#2d3748" />
              <circle cx="50" cy="50" r="28" fill="#fcd5ce" />
              <path d="M22 50 C 22 10, 78 10, 78 50" fill="#f4a261" />
              <circle cx="40" cy="55" r="3" fill="#2d3748" />
              <circle cx="60" cy="55" r="3" fill="#2d3748" />
              <path d="M45 65 Q 50 70 55 65" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" />
              <circle cx="30" cy="60" r="4" fill="#ffb6b9" opacity="0.6"/>
              <circle cx="70" cy="60" r="4" fill="#ffb6b9" opacity="0.6"/>
            </svg>
          </div>

          <h2 className={styles.studentName}>Kristina Sanchez</h2>
          <p className={styles.studentAge}>5 years old</p>
          <p className={styles.studentClass}>3rd Grade, Section C</p>

          <div className={styles.studentDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Father:</span>
              <span className={styles.detailValue}>Douglas Peterson</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Mother:</span>
              <span className={styles.detailValue}>Molly Morgan</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Contact:</span>
              <span className={styles.detailValue}>880 1916 052 822</span>
            </div>
          </div>
        </div>

        {/* Birthday Reminder Card */}
        <div className={styles.reminderCard}>
          <div className={styles.cakeIcon}>🎂</div>
          <h3 className={styles.reminderTitle}>Kristina turns 6</h3>
          <p className={styles.reminderDate}>in November 26, 2020</p>
          
          <button className={styles.reminderButton}>
            <Bell size={14} /> Set Reminder
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboardContent;
