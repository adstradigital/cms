'use client';

import React from 'react';
import styles from './StudentAssignments.module.css';
import { 
  X, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Download, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import useFetch from '@/hooks/useFetch';

export default function SubjectResourcesModal({ subject, sectionId, onClose }) {
  const { data: materials, loading } = useFetch(
    sectionId && subject?.id ? `/academics/materials/?section=${sectionId}&subject=${subject.id}` : null
  );

  const getIcon = (type) => {
    switch (type) {
      case 'video': return <Video size={20} color="#ef4444" />;
      case 'document': return <FileText size={20} color="#3b82f6" />;
      case 'link': return <LinkIcon size={20} color="#10b981" />;
      default: return <BookOpen size={20} color="#64748b" />;
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        
        <header className={styles.modalHeader}>
          <div className={styles.subjectHeader}>
            <div 
              className={styles.subjectIcon} 
              style={{ background: `${subject.color_code}15`, color: subject.color_code }}
            >
              <BookOpen size={24} />
            </div>
            <div>
              <h2>{subject.name} Resources</h2>
              <p>Reference materials and handouts</p>
            </div>
          </div>
        </header>

        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.resourceLoader}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p>Fetching resources...</p>
            </div>
          ) : materials?.length > 0 ? (
            <div className={styles.resourceList}>
              {materials.map(material => (
                <div key={material.id} className={styles.resourceItem}>
                  <div className={styles.resourceMain}>
                    {getIcon(material.material_type)}
                    <div className={styles.resourceInfo}>
                      <h4>{material.title}</h4>
                      <p>{material.description || 'No description provided.'}</p>
                    </div>
                  </div>
                  
                  <div className={styles.resourceActions}>
                    {material.file ? (
                      <a href={material.file} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
                        <Download size={16} /> Download
                      </a>
                    ) : material.external_url ? (
                      <a href={material.external_url} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
                        <ExternalLink size={16} /> Open Link
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyResources}>
              <FileText size={48} color="#e2e8f0" />
              <p>No extra resources found for this subject yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
