import React from 'react';
import { useStore } from '../../store/useStore';
import type { AppView } from '../../store/useStore';
import styles from './WorkspaceLayout.module.css';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const TABS: { id: AppView; label: string; icon: string }[] = [
  { id: 'rubric-upload',  label: 'Rúbrica', icon: '📋' },
  { id: 'course-setup',   label: 'Alumnos', icon: '👥' },
  { id: 'evaluation',     label: 'Evaluación', icon: '✍️' },
  { id: 'mega-prompt',    label: 'Prompt IA', icon: '🤖' },
  { id: 'json-ingestion', label: 'Importar', icon: '📥' },
  { id: 'reports',        label: 'Informes', icon: '📄' },
];

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { activeView, setView, activeRubric, activeCourse } = useStore();

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.contextInfo}>
          <div className={styles.contextItem}>
            <span className={styles.contextLabel}>RÚBRICA</span>
            <span className={styles.contextValue}>{activeRubric?.name || '---'}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.contextItem}>
            <span className={styles.contextLabel}>CURSO</span>
            <span className={styles.contextValue}>{activeCourse?.name || '---'}</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setView('dashboard')} title="Cerrar espacio de trabajo">
            Cerrar ✕
          </button>
        </div>

        <nav className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeView === tab.id ? styles.active : ''}`}
              onClick={() => setView(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>
      
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
