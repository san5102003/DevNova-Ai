import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  LayoutDashboard, LogOut, Code, User as UserIcon, Settings, 
  Layers, ChevronLeft, ChevronRight, Folder, Sun, Moon, Check 
} from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'workspace' | 'templates';
  setView: (view: 'dashboard' | 'workspace' | 'templates') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { 
    user, logout, projects, activeProject, setActiveProject,
    isSidebarCollapsed, toggleSidebarCollapse, setSettingsOpen,
    themeMode, setThemeMode
  } = useStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  return (
    <aside 
      className={`${isSidebarCollapsed ? 'w-16 md:w-20' : 'w-56 md:w-64'} flex flex-col justify-between py-6 h-screen select-none transition-all duration-300 relative shrink-0 z-40`}
      style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-color)' }}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-6 w-full px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <span className="font-black text-xl text-white tracking-tighter">D</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-black tracking-wider text-sm" style={{ color: 'var(--text-main)' }}>DevNova AI</span>
                <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">IDE Sandbox</span>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebarCollapse}
            className="p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
            style={{ color: 'var(--text-muted)' }}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <hr style={{ borderColor: 'var(--border-color)' }} />

        {/* Navigation */}
        <nav className="flex flex-col gap-2 w-full relative">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'hover:bg-white/5 border border-transparent'
            } ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            style={{ color: currentView === 'dashboard' ? undefined : 'var(--text-muted)' }}
            title="Dashboard"
          >
            <LayoutDashboard size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-xs font-semibold">Dashboard</span>}
          </button>

          {/* Projects with Dropdown */}
          <div className="relative w-full">
            <button
              onClick={() => { setView('dashboard'); setIsProjectDropdownOpen(!isProjectDropdownOpen); }}
              className={`w-full p-3 rounded-xl flex items-center justify-between hover:bg-white/5 border border-transparent transition-all duration-300 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
              style={{ color: 'var(--text-muted)' }}
              title="Projects"
            >
              <div className="flex items-center gap-3">
                <Folder size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span className="text-xs font-semibold">Projects ({projects.length})</span>}
              </div>
            </button>
            {isProjectDropdownOpen && projects.length > 0 && (
              <div className="absolute left-full top-0 ml-2 w-56 glass-card rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                <span className="px-2 py-1 text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Quick Switch Project</span>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProject(p); setView('workspace'); setIsProjectDropdownOpen(false); }}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      activeProject?.id === p.id ? 'bg-purple-600/20 text-purple-300' : 'hover:bg-white/5'
                    }`}
                    style={{ color: activeProject?.id === p.id ? undefined : 'var(--text-main)' }}
                  >
                    <span className="truncate">{p.name}</span>
                    {activeProject?.id === p.id && <Check size={12} className="text-purple-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setView('templates')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 cursor-pointer ${
              currentView === 'templates'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'hover:bg-white/5 border border-transparent'
            } ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            style={{ color: currentView === 'templates' ? undefined : 'var(--text-muted)' }}
            title="Templates"
          >
            <Layers size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-xs font-semibold">Templates</span>}
          </button>

          {activeProject && (
            <button
              onClick={() => setView('workspace')}
              className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                currentView === 'workspace'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'hover:bg-white/5 border border-transparent'
              } ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
              style={{ color: currentView === 'workspace' ? undefined : 'var(--text-muted)' }}
              title="Editor Workspace"
            >
              <Code size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="text-xs font-semibold">Editor Workspace</span>}
            </button>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className={`w-full p-3 rounded-xl flex items-center gap-3 hover:bg-white/5 border border-transparent transition-all duration-300 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            style={{ color: 'var(--text-muted)' }}
            title="Settings & Personalization"
          >
            <Settings size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-xs font-semibold">Settings & Themes</span>}
          </button>
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-3 w-full px-3">
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className={`w-full p-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 transition-all cursor-pointer ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
          title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? <Sun size={18} className="text-yellow-400 shrink-0" /> : <Moon size={18} className="text-purple-400 shrink-0" />}
          {!isSidebarCollapsed && (
            <span className="text-xs font-bold">{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        {user && (
          <div 
            className={`p-2.5 rounded-xl flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <UserIcon size={18} className="text-purple-300 shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>{user.username}</span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 flex items-center gap-3 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
          title="Sign Out"
        >
          <LogOut size={20} className="shrink-0" />
          {!isSidebarCollapsed && <span className="text-xs font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
