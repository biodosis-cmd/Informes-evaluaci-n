import './styles/global.css';
import React from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ToastContainer } from './components/ui/Toast';
import { useStore } from './store/useStore';

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
  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-main">
        <ViewRouter />
      </div>
      <ToastContainer />
    </div>
  );
}
