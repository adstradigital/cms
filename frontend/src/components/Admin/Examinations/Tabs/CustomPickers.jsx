import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';

// --- ELEGANT POPOVER DATE PICKER ---
export const ElegantDatePicker = ({ value, onChange, placeholder = "Select Date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Default to today if no value or parse value
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (d) => {
    const sysDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), d);
    const yr = sysDate.getFullYear();
    const mo = String(sysDate.getMonth() + 1).padStart(2, '0');
    const da = String(sysDate.getDate()).padStart(2, '0');
    onChange(`${yr}-${mo}-${da}`);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Header cells
    weekDays.forEach((wd) => {
      days.push(
        <div key={`head_${wd}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textAlign: 'center', margin: '4px 0' }}>
          {wd}
        </div>
      );
    });

    // Blank cells
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`blank_${i}`} style={{ width: '32px', height: '32px' }}></div>);
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        // Build YYYY-MM-DD for comparison
        const curSysStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isSelected = value === curSysStr;
        
        days.push(
          <div 
             key={`day_${i}`} 
             onClick={() => handleSelectDate(i)}
             style={{ 
               width: '32px', 
               height: '32px', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               borderRadius: '50%',
               fontSize: '0.85rem',
               fontWeight: isSelected ? 'bold' : 'normal',
               cursor: 'pointer',
               background: isSelected ? '#3b82f6' : 'transparent',
               color: isSelected ? '#ffffff' : '#1e293b',
               transition: 'background 0.2s',
             }}
             onMouseEnter={(e) => { if(!isSelected) e.target.style.background = '#f1f5f9'; }}
             onMouseLeave={(e) => { if(!isSelected) e.target.style.background = 'transparent'; }}
          >
             {i}
          </div>
        );
    }
    return days;
  };

  const displayDateStr = value 
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
       <div 
         onClick={() => setIsOpen(!isOpen)}
         style={{ 
           padding: '0.75rem', 
           border: isOpen ? '1px solid #3b82f6' : '1px solid #cbd5e1', 
           borderRadius: '8px', 
           background: '#fff', 
           cursor: 'pointer',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           color: value ? '#0f172a' : '#94a3b8',
           fontSize: '0.95rem',
           boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
           transition: 'all 0.2s'
         }}
       >
         <span style={{ fontWeight: value ? '600' : 'normal' }}>
           {displayDateStr || placeholder}
         </span>
         <CalendarDays size={16} color={isOpen ? '#3b82f6' : '#64748b'} />
       </div>

       {isOpen && (
         <div style={{ 
           position: 'absolute', 
           top: 'calc(100% + 8px)', 
           left: 0, 
           zIndex: 50,
           background: '#ffffff',
           borderRadius: '12px',
           border: '1px solid #e2e8f0',
           boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
           padding: '1rem',
           width: '260px',
           animation: 'fadeIn 0.2s ease-out'
         }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
               <button type="button" onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                 <ChevronLeft size={18} />
               </button>
               <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a' }}>
                 {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
               </span>
               <button type="button" onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                 <ChevronRight size={18} />
               </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', justifyItems: 'center' }}>
               {renderCalendar()}
            </div>
         </div>
       )}
    </div>
  );
};


// --- ELEGANT GRID TIME PICKER ---
export const ElegantTimePicker = ({ value, onChange, placeholder = "Select Time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
  const minutes = ['00', '15', '30', '45'];

  const [selHour, setSelHour] = useState(value ? value.split(':')[0] : '09');
  
  const handleSelectTime = (h, m) => {
    setSelHour(h);
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '0.75rem', 
          border: isOpen ? '1px solid #3b82f6' : '1px solid #cbd5e1', 
          borderRadius: '8px', 
          background: '#fff', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: value ? '#0f172a' : '#94a3b8',
          fontSize: '0.95rem',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontWeight: value ? '600' : 'normal', letterSpacing: value ? '1px' : 'normal' }}>
          {value || placeholder}
        </span>
        <Clock size={16} color={isOpen ? '#3b82f6' : '#64748b'} />
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 8px)', 
          left: 0, 
          zIndex: 50,
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          width: 'max-content',
          display: 'flex',
          gap: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
           
           <div>
             <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Hour</h5>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {hours.map(h => (
                  <button 
                    key={h} 
                    type="button"
                    onClick={() => setSelHour(h)}
                    style={{ 
                      padding: '8px', 
                      borderRadius: '6px', 
                      border: 'none',
                      background: selHour === h ? '#eff6ff' : 'transparent',
                      color: selHour === h ? '#2563eb' : '#475569',
                      fontWeight: selHour === h ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    {h}
                  </button>
                ))}
             </div>
           </div>
           
           <div style={{ width: '1px', background: '#e2e8f0' }}></div>

           <div>
             <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Minute</h5>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                {minutes.map(m => (
                  <button 
                    key={m} 
                    type="button"
                    onClick={() => handleSelectTime(selHour, m)}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: '6px', 
                      border: 'none',
                      background: value === `${selHour}:${m}` ? '#3b82f6' : '#f8fafc',
                      color: value === `${selHour}:${m}` ? '#ffffff' : '#475569',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    :{m}
                  </button>
                ))}
             </div>
           </div>

        </div>
      )}
    </div>
  );
};
