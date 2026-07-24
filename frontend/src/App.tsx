import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TemplatesView } from './components/TemplatesView';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { TerminalConsole } from './components/TerminalConsole';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { SettingsModal } from './components/SettingsModal';
import { QuickAiWidget } from './components/QuickAiWidget';

function App() {
  const { token, themeMode, themePreset, customPrimary, customBackground } = useStore();
  const [currentView, setView] = useState<'dashboard' | 'workspace' | 'templates'>('dashboard');

  // Resizable pane sizes
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [terminalHeight, setTerminalHeight] = useState(220);

  // Apply active Theme variables to document element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-mode', themeMode);
    root.setAttribute('data-theme', themePreset);

    if (customPrimary) {
      root.style.setProperty('--primary-color', customPrimary);
    }
    if (customBackground) {
      root.style.setProperty('--bg-main', customBackground);
    }
  }, [themeMode, themePreset, customPrimary, customBackground]);

  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, startWidth + (moveEvent.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startTerminalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(120, Math.min(500, startHeight - (moveEvent.clientY - startY)));
      setTerminalHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (!token) {
    return <LandingPage />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-dark-300">
      {/* Universal sidebar navigation */}
      <Sidebar currentView={currentView} setView={setView} />

      {/* Main View Area */}
      {currentView === 'dashboard' ? (
        <Dashboard setView={setView} />
      ) : currentView === 'templates' ? (
        <TemplatesView setView={setView} />
      ) : (
        /* IDE Workspace layout */
        <div className="flex-1 flex overflow-hidden h-full">
          {/* File Tree Explorer (left) */}
          <div style={{ width: `${sidebarWidth}px` }} className="shrink-0 h-full flex flex-col">
            <FileExplorer />
          </div>

          {/* Left panel resizer handle */}
          <div className="resizer-h h-full shrink-0" onMouseDown={startSidebarResize}></div>

          {/* Editor & Console Split (center/right) */}
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Editor Pane (top) */}
            <div className="flex-1 overflow-hidden relative">
              <CodeEditor />
            </div>

            {/* Bottom panel resizer handle */}
            <div className="resizer-v w-full shrink-0" onMouseDown={startTerminalResize}></div>

            {/* Console Output Terminal (bottom) */}
            <div style={{ height: `${terminalHeight}px` }} className="shrink-0">
              <TerminalConsole />
            </div>
          </div>

          {/* AI Assistant collapsible drawer (right) */}
          <AiAssistantPanel />
        </div>
      )}

      {/* Settings & Theme Modal */}
      <SettingsModal />

      {/* Floating AI Quick Widget */}
      <QuickAiWidget setView={setView} />
    </div>
  );
}

export default App;
