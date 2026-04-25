'use client';

import { useState, useEffect } from 'react';
import studentApi from '@/api/studentApi';
import styles from './StudentMaterial.module.css';

export default function StudentMaterial() {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getMaterials();
      setMaterials(res.data);
      
      // Extract unique subjects for filtering
      const uniqueSubjects = ['All', ...new Set(res.data.map(m => m.subject_name))];
      setSubjects(uniqueSubjects);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = activeFilter === 'All' 
    ? materials 
    : materials.filter(m => m.subject_name === activeFilter);

  const getIcon = (type) => {
    switch (type) {
      case 'video': return '📽️';
      case 'link': return '🔗';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Loading your resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span>ACADEMIC RESOURCES</span>
          <h2>Study Material</h2>
        </div>
      </header>

      <div className={styles.filters}>
        {subjects.map(subject => (
          <button
            key={subject}
            className={`${styles.filterBtn} ${activeFilter === subject ? styles.filterBtnActive : ''}`}
            onClick={() => setActiveFilter(subject)}
          >
            {subject}
          </button>
        ))}
      </div>

      {filteredMaterials.length > 0 ? (
        <div className={styles.grid}>
          {filteredMaterials.map(item => (
            <div key={item.id} className={styles.materialCard}>
              <div className={styles.cardTop}>
                <div className={styles.iconBox}>
                  {getIcon(item.material_type)}
                </div>
                <div className={styles.typeInfo}>
                  <div className={styles.typeTag}>{item.material_type}</div>
                  <h4 className={styles.itemTitle}>{item.title}</h4>
                </div>
              </div>
              
              <p className={styles.description}>
                {item.description || 'No description provided.'}
              </p>

              <div className={styles.cardFooter}>
                <div className={styles.author}>
                  <div className={styles.authorAvatar}>
                    {item.teacher_name?.charAt(0) || 'T'}
                  </div>
                  <span className={styles.authorName}>{item.teacher_name || 'Staff'}</span>
                </div>

                <div className={styles.actions}>
                  {item.file && (
                    <a 
                      href={item.file} 
                      download 
                      target="_blank" 
                      rel="noreferrer" 
                      className={styles.downloadBtn}
                    >
                      Download
                    </a>
                  )}
                  {item.external_url && (
                    <a 
                      href={item.external_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={styles.viewBtn}
                    >
                      Visit Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>No materials found</h3>
          <p>It looks like there are no resources available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
