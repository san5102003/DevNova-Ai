import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { 
  Save, 
  CloudCheck, 
  Loader2, 
  FileCode, 
  FileJson, 
  File, 
  X, 
  ChevronRight 
} from 'lucide-react';

export const CodeEditor: React.FC = () => {
  const { 
    openTabs, 
    activeFileId, 
    setActiveFileId, 
    closeTab, 
    activeProject, 
    updateFileContentLocal 
  } = useStore();

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  const activeFile = activeProject?.files.find(f => f.id === activeFileId);

  // Auto-save logic
  useEffect(() => {
    if (!activeProject || !activeFile) return;
    
    // Mark as dirty when content changes
    setSaveStatus('dirty');

    const delayDebounce = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await api.projects.saveFile(activeProject.id, {
          id: activeFile.id,
          name: activeFile.name,
          path: activeFile.path,
          content: activeFile.content
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('dirty');
      }
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(delayDebounce);
  }, [activeFile?.content, activeFile?.id, activeProject?.id]);

  const getLanguageMode = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'cpp':
      case 'cc':
      case 'h': return 'cpp';
      case 'java': return 'java';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx': return 'javascript';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'plaintext';
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
      case 'java':
      case 'cpp':
      case 'cc':
      case 'h':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <FileCode size={14} className="text-purple-400 shrink-0" />;
      case 'json':
        return <FileJson size={14} className="text-amber-400 shrink-0" />;
      default:
        return <File size={14} className="text-slate-400 shrink-0" />;
    }
  };

  const getBreadcrumbPath = (file: { name: string; path: string }) => {
    if (!file.path || file.path === file.name || file.path === '/') {
      return null;
    }
    let dir = file.path;
    if (dir.endsWith('/' + file.name)) {
      dir = dir.substring(0, dir.length - file.name.length - 1);
    } else if (dir.endsWith(file.name)) {
      dir = dir.substring(0, dir.length - file.name.length);
    }
    dir = dir.replace(/^\/+|\/+$/g, '');
    return dir || null;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFileId) {
      updateFileContentLocal(activeFileId, value);
    }
  };

  const forceSave = async () => {
    if (!activeProject || !activeFile) return;
    try {
      setSaveStatus('saving');
      await api.projects.saveFile(activeProject.id, {
        id: activeFile.id,
        name: activeFile.name,
        path: activeFile.path,
        content: activeFile.content
      });
      setSaveStatus('saved');
    } catch (err) {
      alert('Save failed: ' + err);
      setSaveStatus('dirty');
    }
  };

  if (!activeProject) {
    return (
      <div 
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 h-full glass-panel"
        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}
      >
        <Loader2 className="animate-spin text-purple-500" size={32} />
        <p className="text-sm">Select or create a project to start editing.</p>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* 1. Multi-tab Bar */}
      <div 
        className="h-10 border-b flex items-center overflow-x-auto no-scrollbar select-none shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-surface)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        {openTabs.map((tabId) => {
          const tabFile = activeProject.files.find(f => f.id === tabId);
          if (!tabFile) return null;
          const isActive = tabId === activeFileId;

          return (
            <div
              key={tabId}
              onClick={() => setActiveFileId(tabId)}
              onMouseDown={(e) => {
                if (e.button === 1) { // Middle click closes tab
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(tabId);
                }
              }}
              className={`group flex items-center gap-2 px-3.5 h-full text-xs border-r cursor-pointer transition-all duration-150 relative shrink-0 ${
                isActive
                  ? 'bg-[var(--bg-main)] font-medium'
                  : 'hover:bg-white/5'
              }`}
              style={{
                borderColor: 'var(--border-color)',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--primary-color, #8b5cf6)' : '2px solid transparent'
              }}
            >
              {getFileIcon(tabFile.name)}
              <span className="truncate max-w-[140px]">{tabFile.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                title="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {openTabs.length === 0 && (
          <div className="px-4 text-xs italic" style={{ color: 'var(--text-muted)' }}>
            No open tabs
          </div>
        )}
      </div>

      {/* 2. Project Breadcrumb & Save Status Bar */}
      {activeFile ? (
        <>
          <div 
            className="h-8 border-b flex items-center justify-between px-4 text-xs select-none shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-main)', 
              borderColor: 'var(--border-color)',
              color: 'var(--text-muted)'
            }}
          >
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-semibold text-purple-400">{activeProject.name}</span>
              <ChevronRight size={12} className="text-slate-500 shrink-0" />
              {getBreadcrumbPath(activeFile) && (
                <>
                  <span className="truncate">{getBreadcrumbPath(activeFile)}</span>
                  <ChevronRight size={12} className="text-slate-500 shrink-0" />
                </>
              )}
              <span className="font-medium truncate" style={{ color: 'var(--text-main)' }}>
                {activeFile.name}
              </span>
              <span className="ml-2 text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase shrink-0">
                {getLanguageMode(activeFile.name)}
              </span>
            </div>

            {/* Save Status Indicators */}
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CloudCheck className="text-emerald-400" size={13} />
                  Saved
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="animate-spin text-purple-400" size={13} />
                  Saving...
                </span>
              )}
              {saveStatus === 'dirty' && (
                <button
                  onClick={forceSave}
                  className="text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer border border-purple-500/20 hover:border-purple-500/40 px-2 py-0.5 rounded bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
                  title="Force Save"
                >
                  <Save size={12} />
                  Save Code
                </button>
              )}
            </div>
          </div>

          {/* 3. Monaco Editor Container */}
          <div className="flex-1 relative w-full h-full" style={{ backgroundColor: 'var(--bg-main)' }}>
            <MonacoEditor
              height="100%"
              language={getLanguageMode(activeFile.name)}
              theme="vs-dark"
              value={activeFile.content}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                folding: true,
                fontSize: 13,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontLigatures: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                automaticLayout: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
        </>
      ) : (
        <div 
          className="flex-1 flex flex-col items-center justify-center gap-2 text-sm"
          style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}
        >
          <p>No file selected. Select a file from the explorer to edit.</p>
        </div>
      )}
    </div>
  );
};
