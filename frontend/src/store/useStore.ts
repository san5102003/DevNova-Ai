import { create } from 'zustand'

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  path: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUsername: string;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
}

export type ThemePreset = 'tokyo-night' | 'one-dark-pro' | 'purple' | 'nord' | 'dracula' | 'github-dark' | 'monokai-pro';

export interface RunHistoryEntry {
  id: string;
  fileName: string;
  language: string;
  status: string;
  exitCode: number | null;
  durationMs: number | null;
  stdout: string;
  stderr: string;
  timestamp: number;
}

export interface TerminalTab {
  id: string;
  label: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
  status: string | null;
  isRunning: boolean;
}

interface AppState {
  // Auth Store
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;

  // UI & Theme Store
  themeMode: 'dark' | 'light';
  themePreset: ThemePreset;
  customPrimary: string;
  customBackground: string;
  isSidebarCollapsed: boolean;
  isSettingsOpen: boolean;
  setThemeMode: (mode: 'dark' | 'light') => void;
  setThemePreset: (preset: ThemePreset) => void;
  setCustomColors: (primary: string, background: string) => void;
  toggleSidebarCollapse: () => void;
  setSettingsOpen: (isOpen: boolean) => void;

  // Projects Store
  projects: Project[];
  activeProject: Project | null;
  activeFileId: string | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveFileId: (fileId: string | null) => void;
  addProjectLocal: (project: Project) => void;
  deleteProjectLocal: (projectId: string) => void;
  renameProjectLocal: (projectId: string, newName: string) => void;
  duplicateProjectLocal: (projectId: string, newProject: Project) => void;
  updateFileContentLocal: (fileId: string, content: string) => void;
  addFileLocal: (file: ProjectFile) => void;
  deleteFileLocal: (fileId: string) => void;
  renameFileLocal: (fileId: string, newName: string) => void;

  // Editor Tabs Store
  openTabs: string[];
  addTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  reorderTabs: (tabs: string[]) => void;

  // Execution Store
  isRunning: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
  status: string | null;
  stdin: string;
  ws: WebSocket | null;
  debugMode: boolean;
  runStartTime: number | null;
  
  setRunning: (isRunning: boolean) => void;
  setStdin: (stdin: string) => void;
  clearOutput: () => void;
  appendStdout: (data: string) => void;
  appendStderr: (data: string) => void;
  setExecutionResult: (status: string, exitCode: number, durationMs: number) => void;
  setWs: (ws: WebSocket | null) => void;
  setDebugMode: (enabled: boolean) => void;
  setRunStartTime: (time: number | null) => void;

  // Run History
  runHistory: RunHistoryEntry[];
  addRunHistoryEntry: (entry: RunHistoryEntry) => void;
  clearRunHistory: () => void;

  // Terminal Tabs
  terminalTabs: TerminalTab[];
  activeTerminalTabId: string;
  addTerminalTab: () => void;
  closeTerminalTab: (id: string) => void;
  setActiveTerminalTab: (id: string) => void;
}

// Load initial auth state & themes from localStorage
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');
const storedMode = (localStorage.getItem('devnova_theme_mode') as 'dark' | 'light') || 'dark';
const storedPreset = (localStorage.getItem('devnova_theme_preset') as ThemePreset) || 'purple';
const storedPrimary = localStorage.getItem('devnova_custom_primary') || '#8b5cf6';
const storedBg = localStorage.getItem('devnova_custom_bg') || '#050510';

const defaultTerminalTab: TerminalTab = {
  id: 'terminal-1',
  label: 'Terminal 1',
  stdout: '',
  stderr: '',
  exitCode: null,
  durationMs: null,
  status: null,
  isRunning: false,
};

let terminalCounter = 1;

export const useStore = create<AppState>((set) => ({
  // Auth Store
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, activeProject: null, activeFileId: null, projects: [], openTabs: [] });
  },

  // UI & Theme Store
  themeMode: storedMode,
  themePreset: storedPreset,
  customPrimary: storedPrimary,
  customBackground: storedBg,
  isSidebarCollapsed: false,
  isSettingsOpen: false,

  setThemeMode: (themeMode) => {
    localStorage.setItem('devnova_theme_mode', themeMode);
    set({ themeMode });
  },
  setThemePreset: (themePreset) => {
    localStorage.setItem('devnova_theme_preset', themePreset);
    set({ themePreset });
  },
  setCustomColors: (primary, background) => {
    localStorage.setItem('devnova_custom_primary', primary);
    localStorage.setItem('devnova_custom_bg', background);
    set({ customPrimary: primary, customBackground: background });
  },
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  // Projects Store
  projects: [],
  activeProject: null,
  activeFileId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => {
    let activeFileId = null;
    let openTabs: string[] = [];
    if (activeProject && activeProject.files && activeProject.files.length > 0) {
      const mainFile = activeProject.files.find(
        f => f.name === 'main.py' || f.name === 'main.cpp' || f.name === 'Main.java' || f.name === 'index.js'
      );
      activeFileId = mainFile ? mainFile.id : activeProject.files[0].id;
      openTabs = [activeFileId];
    }
    set({ activeProject, activeFileId, openTabs });
  },
  setActiveFileId: (activeFileId) => set((state) => {
    if (activeFileId && !state.openTabs.includes(activeFileId)) {
      return { activeFileId, openTabs: [...state.openTabs, activeFileId] };
    }
    return { activeFileId };
  }),
  addProjectLocal: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  deleteProjectLocal: (projectId) => set((state) => ({
    projects: state.projects.filter(p => p.id !== projectId),
    activeProject: state.activeProject?.id === projectId ? null : state.activeProject,
    activeFileId: state.activeProject?.id === projectId ? null : state.activeFileId,
  })),
  renameProjectLocal: (projectId, newName) => set((state) => {
    const updated = state.projects.map(p => p.id === projectId ? { ...p, name: newName } : p);
    const active = state.activeProject?.id === projectId ? { ...state.activeProject, name: newName } : state.activeProject;
    return { projects: updated, activeProject: active };
  }),
  duplicateProjectLocal: (_projectId, newProject) => set((state) => ({
    projects: [newProject, ...state.projects]
  })),
  updateFileContentLocal: (fileId, content) => set((state) => {
    if (!state.activeProject) return {};
    const updatedFiles = state.activeProject.files.map(f => 
      f.id === fileId ? { ...f, content } : f
    );
    const updatedActiveProject = { ...state.activeProject, files: updatedFiles };
    const updatedProjects = state.projects.map(p => 
      p.id === state.activeProject!.id ? updatedActiveProject : p
    );
    return {
      activeProject: updatedActiveProject,
      projects: updatedProjects
    };
  }),
  addFileLocal: (file) => set((state) => {
    if (!state.activeProject) return {};
    const updatedFiles = [...state.activeProject.files, file];
    const updatedActiveProject = { ...state.activeProject, files: updatedFiles };
    const updatedProjects = state.projects.map(p => 
      p.id === state.activeProject!.id ? updatedActiveProject : p
    );
    return {
      activeProject: updatedActiveProject,
      projects: updatedProjects,
      activeFileId: file.id,
      openTabs: [...state.openTabs, file.id]
    };
  }),
  deleteFileLocal: (fileId) => set((state) => {
    if (!state.activeProject) return {};
    const updatedFiles = state.activeProject.files.filter(f => f.id !== fileId);
    const updatedActiveProject = { ...state.activeProject, files: updatedFiles };
    const updatedProjects = state.projects.map(p => 
      p.id === state.activeProject!.id ? updatedActiveProject : p
    );
    let nextActiveFileId = state.activeFileId;
    const newTabs = state.openTabs.filter(t => t !== fileId);
    if (state.activeFileId === fileId) {
      nextActiveFileId = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
    }
    return {
      activeProject: updatedActiveProject,
      projects: updatedProjects,
      activeFileId: nextActiveFileId,
      openTabs: newTabs
    };
  }),
  renameFileLocal: (fileId, newName) => set((state) => {
    if (!state.activeProject) return {};
    const updatedFiles = state.activeProject.files.map(f =>
      f.id === fileId ? { ...f, name: newName } : f
    );
    const updatedActiveProject = { ...state.activeProject, files: updatedFiles };
    const updatedProjects = state.projects.map(p =>
      p.id === state.activeProject!.id ? updatedActiveProject : p
    );
    return { activeProject: updatedActiveProject, projects: updatedProjects };
  }),

  // Editor Tabs Store
  openTabs: [],
  addTab: (fileId) => set((state) => {
    if (state.openTabs.includes(fileId)) return { activeFileId: fileId };
    return { openTabs: [...state.openTabs, fileId], activeFileId: fileId };
  }),
  closeTab: (fileId) => set((state) => {
    const newTabs = state.openTabs.filter(t => t !== fileId);
    let nextActive = state.activeFileId;
    if (state.activeFileId === fileId) {
      const idx = state.openTabs.indexOf(fileId);
      nextActive = newTabs[Math.min(idx, newTabs.length - 1)] || null;
    }
    return { openTabs: newTabs, activeFileId: nextActive };
  }),
  reorderTabs: (tabs) => set({ openTabs: tabs }),

  // Execution Store
  isRunning: false,
  stdout: '',
  stderr: '',
  exitCode: null,
  durationMs: null,
  status: null,
  stdin: '',
  ws: null,
  debugMode: false,
  runStartTime: null,

  setRunning: (isRunning) => set({ isRunning }),
  setStdin: (stdin) => set({ stdin }),
  clearOutput: () => set({ stdout: '', stderr: '', exitCode: null, durationMs: null, status: null }),
  appendStdout: (data) => set((state) => ({ stdout: state.stdout + data })),
  appendStderr: (data) => set((state) => ({ stderr: state.stderr + data })),
  setExecutionResult: (status, exitCode, durationMs) => set({ status, exitCode, durationMs, isRunning: false, runStartTime: null }),
  setWs: (ws) => set({ ws }),
  setDebugMode: (debugMode) => set({ debugMode }),
  setRunStartTime: (runStartTime) => set({ runStartTime }),

  // Run History
  runHistory: [],
  addRunHistoryEntry: (entry) => set((state) => ({
    runHistory: [entry, ...state.runHistory].slice(0, 50)
  })),
  clearRunHistory: () => set({ runHistory: [] }),

  // Terminal Tabs
  terminalTabs: [defaultTerminalTab],
  activeTerminalTabId: 'terminal-1',
  addTerminalTab: () => set((state) => {
    terminalCounter++;
    const newTab: TerminalTab = {
      id: `terminal-${terminalCounter}`,
      label: `Terminal ${terminalCounter}`,
      stdout: '',
      stderr: '',
      exitCode: null,
      durationMs: null,
      status: null,
      isRunning: false,
    };
    return {
      terminalTabs: [...state.terminalTabs, newTab],
      activeTerminalTabId: newTab.id
    };
  }),
  closeTerminalTab: (id) => set((state) => {
    if (state.terminalTabs.length <= 1) return {};
    const newTabs = state.terminalTabs.filter(t => t.id !== id);
    let nextActive = state.activeTerminalTabId;
    if (state.activeTerminalTabId === id) {
      nextActive = newTabs[newTabs.length - 1].id;
    }
    return { terminalTabs: newTabs, activeTerminalTabId: nextActive };
  }),
  setActiveTerminalTab: (activeTerminalTabId) => set({ activeTerminalTabId }),
}));
