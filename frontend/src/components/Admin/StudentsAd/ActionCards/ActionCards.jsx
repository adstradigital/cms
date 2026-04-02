import React from 'react';
import styles from './ActionCards.module.css';

const ActionCard = ({ title, subtitle, active, onClick }) => (
  <div className={`${styles.actionCard} ${active ? styles.actionCardActive : ''}`} onClick={onClick}>
    <div className={styles.cardHeader}>
      <div className={`${styles.statusDot} ${active ? styles.statusDotActive : ''}`}></div>
      <h4 className={`${styles.title} ${active ? styles.titleActive : ''}`}>{title}</h4>
    </div>
    <p className={`${styles.subtitle} ${active ? styles.subtitleActive : ''}`}>{subtitle}</p>
  </div>
);

const ActionCards = ({ activeView, setActiveView }) => {
  return (
    <div className={styles.cardsContainer}>
      <ActionCard 
        title="Students list" 
        subtitle="Table · search · filter by class" 
        active={activeView === 'list'} 
        onClick={() => setActiveView('list')}
      />
      <ActionCard 
        title="Student profile" 
        subtitle="KYC · parents · tabs for each module" 
        active={activeView === 'profile'} 
        onClick={() => setActiveView('profile')}
      />
      <ActionCard 
        title="Add / edit student" 
        subtitle="Multi-step form · KYC upload" 
        active={activeView === 'form'} 
        onClick={() => setActiveView('form')}
      />
      <ActionCard 
        title="Performance" 
        subtitle="Exams · marks · report cards" 
        active={activeView === 'performance'} 
        onClick={() => setActiveView('performance')}
      />
    </div>
  );
};

export default ActionCards;
