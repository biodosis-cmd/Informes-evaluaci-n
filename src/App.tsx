import './styles/global.css';
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ToastContainer } from './components/ui/Toast';
import { useStore } from './store/useStore';
import { DocenteLogin } from './components/DocenteLogin';
import { isDocenteLoggedIn, logoutDocente } from './export/sheetsExporter';

// Views (lazy)
import { DashboardView } from './views/DashboardView';
import { RubricUploadView } from './views/RubricUploadView';
import { CourseSetupView } from './views/CourseSetupView';
import { EvaluationView } from './views/EvaluationView';
import { MegaPromptView } from './views/MegaPromptView';
import { JsonIngestionView } from './views/JsonIngestionView';
import { ReportsView } from './views/ReportsView';

function ViewRouter() {
  const { activeView } = useStore();

  const views: Record<typeof activeView, React.ReactNode> = {
    'dashboard':      <DashboardView />,
    'rubric-upload':  <RubricUploadView />,
    'course-setup':   <CourseSetupView />,
    'evaluation':     <EvaluationView />,
    'mega-prompt':    <MegaPromptView />,
    'json-ingestion': <JsonIngestionView />,
    'reports':        <ReportsView />,
  };

  return (
    <main className="app-content" key={activeView}>
      <div className="animate-fade-in">
        {views[activeView]}
      </div>
    </main>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isDocenteLoggedIn());

  if (!authenticated) {
    return <DocenteLogin onSuccess={() => setAuthenticated(true)} />;
  }

  const handleLogout = () => {
    logoutDocente();
    setAuthenticated(false);
  };

  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-main">
        <div style={{ 
          display: 'flex', justifyContent: 'flex-end', padding: '8px 16px',
          fontSize: '12px', color: '#64748b', gap: '8px', alignItems: 'center'
        }}>
          <span>🟢 Sesión activa</span>
          <button onClick={handleLogout} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
            padding: '4px 10px', fontSize: '11px', color: '#64748b', cursor: 'pointer',
            fontFamily: 'inherit'
          }}>
            Cerrar sesión
          </button>
        </div>
        <ViewRouter />
      </div>
      <ToastContainer />
    </div>
  );
}

