import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Project } from '../store/useStore';
import { api } from '../utils/api';
import { GlassButton } from './GlassButton';
import { 
  Folder, Plus, Trash2, Calendar, FileCode, Play, AlertCircle, Search, 
  Upload, Copy, Edit2, ExternalLink, ArrowUpDown, X, Activity, Server,
  Sun, Moon, Settings
} from 'lucide-react';

interface DashboardProps {
  setView: (view: 'dashboard' | 'workspace' | 'templates') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const { 
    projects, setProjects, setActiveProject, 
    addProjectLocal, deleteProjectLocal, renameProjectLocal, duplicateProjectLocal,
    themeMode, setThemeMode, setSettingsOpen
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter & Search & Sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'python' | 'cpp' | 'java' | 'js'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'oldest'>('recent');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Stats Analytics Modals
  const [activeMetricModal, setActiveMetricModal] = useState<'projects' | 'compilers' | 'status' | null>(null);

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectLang, setNewProjectLang] = useState<string>('python');
  const [newProjectTemplate, setNewProjectTemplate] = useState<string>('empty');
  const [renameInput, setRenameInput] = useState('');
  const [importJsonInput, setImportJsonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await api.projects.list();
        setProjects(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [setProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setIsSubmitting(true);
      const newProj = await api.projects.create(newProjectName, newProjectDesc, newProjectLang);
      
      // Inject starter template code if chosen
      if (newProjectTemplate !== 'empty' && newProj.files && newProj.files.length > 0) {
        let starterCode = '';
        if (newProjectLang === 'python') starterCode = 'def main():\n    print("Welcome to DevNova AI!")\n\nif __name__ == "__main__":\n    main()\n';
        if (newProjectLang === 'java') starterCode = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to DevNova AI!");\n    }\n}\n';
        if (newProjectLang === 'cpp') starterCode = '#include <iostream>\nint main() {\n    std::cout << "Welcome to DevNova AI!" << std::endl;\n    return 0;\n}\n';
        if (newProjectLang === 'javascript') starterCode = 'console.log("Welcome to DevNova AI!");\n';

        await api.projects.saveFile(newProj.id, {
          id: newProj.files[0].id,
          name: newProj.files[0].name,
          path: newProj.files[0].path,
          content: starterCode
        });
        newProj.files[0].content = starterCode;
      }

      addProjectLocal(newProj);
      setActiveProject(newProj);
      
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectLang('python');
      setNewProjectTemplate('empty');
      setIsModalOpen(false);
      setView('workspace');
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonInput.trim()) return;

    try {
      setIsSubmitting(true);
      const parsed = JSON.parse(importJsonInput);
      const name = parsed.name || 'Imported Sandbox';
      const desc = parsed.description || 'Imported project payload';
      const lang = parsed.language || 'python';

      const newProj = await api.projects.create(name, desc, lang);
      if (parsed.files && Array.isArray(parsed.files)) {
        for (const file of parsed.files) {
          await api.projects.saveFile(newProj.id, {
            name: file.name || 'file.txt',
            path: file.path || '',
            content: file.content || ''
          });
        }
      }

      const reloaded = await api.projects.get(newProj.id);
      addProjectLocal(reloaded);
      setActiveProject(reloaded);
      setIsImportModalOpen(false);
      setImportJsonInput('');
      setView('workspace');
    } catch (err: any) {
      alert('Import error: Make sure input is valid JSON format. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? All files will be lost.')) return;

    try {
      await api.projects.delete(id);
      deleteProjectLocal(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !renameInput.trim()) return;

    try {
      renameProjectLocal(selectedProjectId, renameInput.trim());
      setIsRenameModalOpen(false);
      setSelectedProjectId(null);
    } catch (err: any) {
      alert('Failed to rename project: ' + err.message);
    }
  };

  const handleDuplicateProject = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dupName = `${proj.name} (Copy)`;
      const lang = getProjectLanguage(proj);
      const newProj = await api.projects.create(dupName, proj.description, lang);
      
      if (proj.files) {
        for (const f of proj.files) {
          await api.projects.saveFile(newProj.id, {
            name: f.name,
            path: f.path,
            content: f.content
          });
        }
      }

      const detailed = await api.projects.get(newProj.id);
      duplicateProjectLocal(proj.id, detailed);
    } catch (err: any) {
      alert('Failed to duplicate project: ' + err.message);
    }
  };

  const handleOpenProject = async (proj: Project) => {
    try {
      const detailedProject = await api.projects.get(proj.id);
      setActiveProject(detailedProject);
      setView('workspace');
    } catch (err: any) {
      alert('Failed to load project files: ' + err.message);
    }
  };

  const getProjectLanguage = (proj: Project): string => {
    if (!proj.files || proj.files.length === 0) return 'unknown';
    const hasPy = proj.files.some(f => f.name.endsWith('.py'));
    const hasCpp = proj.files.some(f => f.name.endsWith('.cpp') || f.name.endsWith('.cc'));
    const hasJava = proj.files.some(f => f.name.endsWith('.java'));
    const hasJs = proj.files.some(f => f.name.endsWith('.js'));
    
    if (hasPy) return 'python';
    if (hasCpp) return 'cpp';
    if (hasJava) return 'java';
    if (hasJs) return 'javascript';
    return 'unknown';
  };

  const getProjectTotalSize = (proj: Project): string => {
    if (!proj.files) return '0 B';
    const bytes = proj.files.reduce((acc, f) => acc + (f.content ? f.content.length : 0), 0);
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Compute counts for language badges
  const counts = {
    all: projects.length,
    python: projects.filter(p => getProjectLanguage(p) === 'python').length,
    cpp: projects.filter(p => getProjectLanguage(p) === 'cpp').length,
    java: projects.filter(p => getProjectLanguage(p) === 'java').length,
    js: projects.filter(p => getProjectLanguage(p) === 'javascript').length,
  };

  const filteredProjects = projects.filter(proj => {
    const matchesSearch = proj.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (proj.description && proj.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeFilter === 'all') return matchesSearch;
    const lang = getProjectLanguage(proj);
    if (activeFilter === 'python') return matchesSearch && lang === 'python';
    if (activeFilter === 'cpp') return matchesSearch && lang === 'cpp';
    if (activeFilter === 'java') return matchesSearch && lang === 'java';
    if (activeFilter === 'js') return matchesSearch && lang === 'javascript';
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'az') return a.name.localeCompare(b.name);
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto h-screen max-w-7xl mx-auto select-none bg-dark-300">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Workspace</h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Initialize, manage, and execute your multi-file code sandboxes.</p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {themeMode === 'dark' ? <Sun size={15} className="text-yellow-400" /> : <Moon size={15} className="text-purple-400" />}
            <span className="hidden sm:inline">{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Appearance & Themes Settings"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <GlassButton variant="secondary" onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 text-xs">
            <Upload size={14} /> Import Project
          </GlassButton>
          <GlassButton variant="primary" onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 text-xs font-bold shadow-lg shadow-purple-500/20">
            <Plus size={16} /> Create Sandbox
          </GlassButton>
        </div>
      </div>

      {/* Interactive Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div 
          onClick={() => setActiveMetricModal('projects')}
          className="glass-card p-6 rounded-2xl flex items-center justify-between relative overflow-hidden cursor-pointer hover:border-purple-500/40 hover:scale-[1.02] transition-all group"
        >
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-purple-300 transition-colors">Active Projects</p>
            <h3 className="text-3xl font-black text-white mt-1.5">{projects.length}</h3>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Folder size={22} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/20 to-purple-500/40"></div>
        </div>

        <div 
          onClick={() => setActiveMetricModal('compilers')}
          className="glass-card p-6 rounded-2xl flex items-center justify-between relative overflow-hidden cursor-pointer hover:border-blue-500/40 hover:scale-[1.02] transition-all group"
        >
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-blue-300 transition-colors">Compilers Loaded</p>
            <h3 className="text-3xl font-black text-white mt-1.5">4 Languages</h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <FileCode size={22} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40"></div>
        </div>

        <div 
          onClick={() => setActiveMetricModal('status')}
          className="glass-card p-6 rounded-2xl flex items-center justify-between relative overflow-hidden cursor-pointer hover:border-emerald-500/40 hover:scale-[1.02] transition-all group"
        >
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Sandbox Engine Status</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="text-sm font-bold text-emerald-400">Operational</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Play size={22} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/20 to-emerald-500/40"></div>
        </div>
      </div>

      {/* Search, Sorting, and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Search sandboxes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs w-full"
            />
            <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-dark-200 px-3 py-2 rounded-xl border border-white/5 text-xs">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer"
            >
              <option value="recent" className="bg-dark-300">Recent</option>
              <option value="az" className="bg-dark-300">A – Z</option>
              <option value="oldest" className="bg-dark-300">Oldest</option>
            </select>
          </div>
        </div>

        {/* Dynamic Counts Filters */}
        <div className="flex gap-1.5 self-start lg:self-auto overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-purple-600/25 border-purple-500/30 text-purple-300'
                : 'border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setActiveFilter('python')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'python'
                ? 'bg-yellow-600/20 border-yellow-500/30 text-yellow-300'
                : 'border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            Python ({counts.python})
          </button>
          <button
            onClick={() => setActiveFilter('cpp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'cpp'
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                : 'border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            C++ ({counts.cpp})
          </button>
          <button
            onClick={() => setActiveFilter('java')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'java'
                ? 'bg-red-600/20 border-red-500/30 text-red-300'
                : 'border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            Java ({counts.java})
          </button>
          <button
            onClick={() => setActiveFilter('js')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeFilter === 'js'
                ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-200'
                : 'border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            JavaScript ({counts.js})
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 rounded-xl border-red-500/20 text-red-300 flex items-center gap-3 mb-6">
          <AlertCircle className="shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs">Accessing sandbox containers...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center border-dashed border-white/10 max-w-xl mx-auto my-10">
          <Folder className="mx-auto text-slate-600 mb-4" size={42} />
          <h2 className="text-base font-bold text-white">No matching projects</h2>
          <p className="text-slate-500 text-xs mt-2 mb-6">Create a new container or change your search filter to see matching sandboxes.</p>
          <GlassButton variant="primary" className="mx-auto" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Create Sandbox
          </GlassButton>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => {
            const lang = getProjectLanguage(proj);
            const sizeStr = getProjectTotalSize(proj);
            const badgeColors: Record<string, string> = {
              python: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
              cpp: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
              java: 'bg-red-500/10 text-red-300 border-red-500/20',
              javascript: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/20',
              unknown: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            };

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj)}
                className="glass-card glass-card-hover p-6 rounded-2xl border border-white/5 hover:border-purple-500/40 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(139,92,246,0.15)] transition-all duration-300 cursor-pointer group flex flex-col justify-between h-56 relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate max-w-[180px]">
                      {proj.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${badgeColors[lang] || badgeColors.unknown}`}>
                      {lang.toUpperCase()}
                    </span>
                  </div>

                  {proj.description ? (
                    <p className="text-slate-400 text-xs mt-2.5 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  ) : (
                    /* Metadata when description is blank */
                    <div className="mt-3 p-2.5 bg-black/40 rounded-xl border border-white/5 grid grid-cols-3 text-[10px] text-slate-400 text-center">
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-500">Edited</span>
                        <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-500">Files</span>
                        <span className="text-purple-300 font-bold">{proj.files?.length || 1}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-500">Size</span>
                        <span>{sizeStr}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Action Button Bar */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Calendar size={11} /> {new Date(proj.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProject(proj);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all"
                      title="Open Project Workspace"
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectId(proj.id);
                        setRenameInput(proj.name);
                        setIsRenameModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all"
                      title="Rename Project"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDuplicateProject(proj, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all"
                      title="Duplicate Project"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-200/40">
              <div>
                <h2 className="text-lg font-bold text-white">Create New Sandbox</h2>
                <p className="text-xs text-slate-500 mt-1">Configure language, template, and project details.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject}>
              <div className="p-6 flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Programming Language</label>
                  <select
                    value={newProjectLang}
                    onChange={(e) => setNewProjectLang(e.target.value)}
                    className="glass-input rounded-xl px-4 py-2.5 text-xs bg-dark-200 text-white cursor-pointer font-bold"
                  >
                    <option value="python" className="bg-dark-300">Python (.py)</option>
                    <option value="java" className="bg-dark-300">Java (.java)</option>
                    <option value="cpp" className="bg-dark-300">C++ (.cpp)</option>
                    <option value="javascript" className="bg-dark-300">JavaScript (.js)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Starter Template</label>
                  <select
                    value={newProjectTemplate}
                    onChange={(e) => setNewProjectTemplate(e.target.value)}
                    className="glass-input rounded-xl px-4 py-2.5 text-xs bg-dark-200 text-white cursor-pointer font-bold"
                  >
                    <option value="empty" className="bg-dark-300">Blank Starter File</option>
                    <option value="helloworld" className="bg-dark-300">Hello World Template</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Sandbox Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dijkstra Shortest Path"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="glass-input rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    placeholder="Describe algorithm objectives or architecture..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="glass-input rounded-xl px-4 py-2.5 text-xs h-20 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 bg-white/2 border-t border-white/5 flex justify-end gap-3">
                <GlassButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" isLoading={isSubmitting}>
                  Create Sandbox
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Project Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-200/40">
              <div>
                <h2 className="text-lg font-bold text-white">Import Project Payload</h2>
                <p className="text-xs text-slate-500 mt-1">Paste JSON payload representing files and metadata.</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleImportProject}>
              <div className="p-6 flex flex-col gap-4 text-xs">
                <textarea
                  required
                  placeholder='{"name": "Imported Alg", "language": "python", "files": [{"name": "main.py", "content": "print(42)"}]}'
                  value={importJsonInput}
                  onChange={(e) => setImportJsonInput(e.target.value)}
                  className="glass-input rounded-xl p-4 text-xs font-mono h-40 resize-none"
                />
              </div>

              <div className="p-6 bg-white/2 border-t border-white/5 flex justify-end gap-3">
                <GlassButton type="button" variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" isLoading={isSubmitting}>
                  Import Sandbox
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-base font-bold text-white">Rename Sandbox</h2>
              <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRenameProject}>
              <div className="p-6 flex flex-col gap-3">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">New Sandbox Name</label>
                <input
                  type="text"
                  required
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="glass-input rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              <div className="p-6 bg-white/2 border-t border-white/5 flex justify-end gap-3">
                <GlassButton type="button" variant="secondary" onClick={() => setIsRenameModalOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary">
                  Save Name
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Metric Cards Detail Modal */}
      {activeMetricModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="text-purple-400" size={18} />
                {activeMetricModal === 'projects' && 'Active Sandboxes Overview'}
                {activeMetricModal === 'compilers' && 'Compiler & Engine Diagnostics'}
                {activeMetricModal === 'status' && 'Container Runtime Health'}
              </h3>
              <button onClick={() => setActiveMetricModal(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-300 flex flex-col gap-3 leading-relaxed">
              {activeMetricModal === 'projects' && (
                <>
                  <p>You have <strong className="text-purple-400">{projects.length} sandboxes</strong> currently created across Python, Java, C++, and JavaScript.</p>
                  <div className="bg-black/50 p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between"><span>Total Sandboxes:</span> <span className="font-bold text-white">{projects.length}</span></div>
                    <div className="flex justify-between"><span>Python Projects:</span> <span className="font-bold text-yellow-300">{counts.python}</span></div>
                    <div className="flex justify-between"><span>Java Projects:</span> <span className="font-bold text-red-300">{counts.java}</span></div>
                    <div className="flex justify-between"><span>C++ Projects:</span> <span className="font-bold text-blue-300">{counts.cpp}</span></div>
                    <div className="flex justify-between"><span>JavaScript Projects:</span> <span className="font-bold text-yellow-200">{counts.js}</span></div>
                  </div>
                </>
              )}

              {activeMetricModal === 'compilers' && (
                <>
                  <p>DevNova multi-language execution engine uses isolated sandboxed process toolchains:</p>
                  <div className="bg-black/50 p-3 rounded-xl border border-white/5 flex flex-col gap-2 font-mono text-[10px]">
                    <div className="flex justify-between"><span>Python 3.11 Toolchain:</span> <span className="text-emerald-400 font-bold">READY</span></div>
                    <div className="flex justify-between"><span>OpenJDK 22 javac:</span> <span className="text-emerald-400 font-bold">READY</span></div>
                    <div className="flex justify-between"><span>GCC / g++ 13:</span> <span className="text-emerald-400 font-bold">READY</span></div>
                    <div className="flex justify-between"><span>Node.js v20 runtime:</span> <span className="text-emerald-400 font-bold">READY</span></div>
                  </div>
                </>
              )}

              {activeMetricModal === 'status' && (
                <>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Server size={18} /> Sandbox Execution Daemon is Operational
                  </div>
                  <p className="text-slate-400">WebSocket sub-process pipes are healthy. Timeout limit set to 60 seconds.</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <GlassButton variant="primary" onClick={() => setActiveMetricModal(null)}>
                Close Analytics
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
