import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { 
  File, Plus, Trash2, FileJson, FileCode, Check, X, Search, 
  Folder, FolderOpen, ChevronDown, ChevronRight, Layers, 
  Edit2, Copy, FolderPlus 
} from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  type: 'file' | 'folder';
  fileId?: string;
  fileName?: string;
  filePath?: string;
  folderKey?: string;
}

export const FileExplorer: React.FC = () => {
  const { 
    projects, activeProject, setActiveProject, activeFileId, setActiveFileId, 
    addFileLocal, deleteFileLocal, renameFileLocal 
  } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '/': true, 'src': true });
  
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setEditingFileId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!activeProject) return null;

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let raw = newFileName.trim();
    if (raw.endsWith('/') && raw.length > 1) {
      raw = raw.slice(0, -1);
    }

    let name = raw;
    let path = '';

    if (name.includes('/')) {
      const parts = name.split('/');
      name = parts[parts.length - 1];
      path = parts.slice(0, -1).join('/');
    }

    if (!name) {
      name = '.gitkeep';
    }

    let defaultContent = '';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'py') {
      defaultContent = 'print("Hello from ' + name + '")\n';
    } else if (ext === 'cpp' || ext === 'h') {
      defaultContent = '#include <iostream>\n\nint main() {\n    std::cout << "Hello from ' + name + '\\n";\n    return 0;\n}\n';
    } else if (ext === 'java') {
      const className = name.replace('.java', '');
      defaultContent = 'public class ' + className + ' {\n    public static void main(String[] args) {\n        System.out.println("Hello from ' + className + '");\n    }\n}\n';
    } else if (ext === 'js') {
      defaultContent = 'console.log("Hello from ' + name + '");\n';
    }

    try {
      const savedFile = await api.projects.saveFile(activeProject.id, {
        name,
        path,
        content: defaultContent
      });
      
      addFileLocal({
        id: savedFile.id,
        name: savedFile.name || name,
        path: savedFile.path || path,
        content: savedFile.content || defaultContent
      });

      const folderKey = path || '/';
      setExpandedFolders(prev => ({ ...prev, [folderKey]: true }));

      setNewFileName('');
      setIsCreating(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (fileId: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeProject.files.length <= 1) {
      alert('A project must contain at least one file.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.projects.deleteFile(activeProject.id, fileId);
      deleteFileLocal(fileId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleDuplicateFile = async (file: { id: string; name: string; path: string; content: string }) => {
    const extIndex = file.name.lastIndexOf('.');
    const copyName = extIndex !== -1
      ? `${file.name.slice(0, extIndex)} (copy)${file.name.slice(extIndex)}`
      : `${file.name} (copy)`;

    try {
      const savedFile = await api.projects.saveFile(activeProject.id, {
        name: copyName,
        path: file.path || '',
        content: file.content || ''
      });
      
      addFileLocal({
        id: savedFile.id,
        name: savedFile.name || copyName,
        path: savedFile.path || file.path || '',
        content: savedFile.content || file.content || ''
      });
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate file');
    }
  };

  const handleRenameSubmit = async (file: { id: string; name: string; path: string; content: string }) => {
    const trimmed = editingFileName.trim();
    if (!trimmed || trimmed === file.name) {
      setEditingFileId(null);
      return;
    }
    try {
      await api.projects.saveFile(activeProject.id, {
        id: file.id,
        name: trimmed,
        path: file.path || '',
        content: file.content || ''
      });
      renameFileLocal(file.id, trimmed);
    } catch (err: any) {
      alert(err.message || 'Failed to rename file');
    } finally {
      setEditingFileId(null);
    }
  };

  const handleFileContextMenu = (e: React.MouseEvent, file: { id: string; name: string; path: string; content: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'file',
      fileId: file.id,
      fileName: file.name,
      filePath: file.path,
    });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folderKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'folder',
      folderKey,
    });
  };

  const handleContextMenuAction = (action: 'new_file' | 'new_folder' | 'rename' | 'duplicate' | 'delete') => {
    if (!contextMenu) return;
    const { type, fileId, fileName, folderKey } = contextMenu;
    setContextMenu(null);

    if (action === 'new_file') {
      const basePath = type === 'folder' 
        ? (folderKey === '/' ? '' : folderKey + '/') 
        : (contextMenu.filePath ? contextMenu.filePath + '/' : '');
      setNewFileName(basePath);
      setIsCreating(true);
    } else if (action === 'new_folder') {
      const basePath = type === 'folder' 
        ? (folderKey === '/' ? '' : folderKey + '/') 
        : (contextMenu.filePath ? contextMenu.filePath + '/' : '');
      setNewFileName(`${basePath}new_folder/`);
      setIsCreating(true);
    } else if (action === 'rename' && fileId && fileName) {
      setEditingFileId(fileId);
      setEditingFileName(fileName);
    } else if (action === 'duplicate' && fileId) {
      const targetFile = activeProject.files.find(f => f.id === fileId);
      if (targetFile) {
        handleDuplicateFile(targetFile);
      }
    } else if (action === 'delete' && fileId && fileName) {
      handleDeleteFile(fileId, fileName);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return <FileCode className="text-yellow-400 shrink-0" size={14} />;
      case 'cpp':
      case 'cc':
      case 'h':
        return <FileCode className="text-blue-400 shrink-0" size={14} />;
      case 'java':
        return <FileCode className="text-red-400 shrink-0" size={14} />;
      case 'js':
        return <FileCode className="text-yellow-300 shrink-0" size={14} />;
      case 'json':
        return <FileJson className="text-emerald-400 shrink-0" size={14} />;
      default:
        return <File className="text-slate-500 shrink-0" size={14} />;
    }
  };

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const filteredFiles = activeProject.files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.path && f.path.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedFiles: Record<string, typeof activeProject.files> = {};
  filteredFiles.forEach(file => {
    const key = file.path || '/';
    if (!groupedFiles[key]) {
      groupedFiles[key] = [];
    }
    groupedFiles[key].push(file);
  });

  const folderPaths = Object.keys(groupedFiles).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  const adjustedX = contextMenu ? Math.min(contextMenu.x, Math.max(10, window.innerWidth - 170)) : 0;
  const adjustedY = contextMenu ? Math.min(contextMenu.y, Math.max(10, window.innerHeight - 200)) : 0;

  return (
    <div 
      className="w-full glass-panel flex flex-col justify-between overflow-hidden select-none h-full border-r"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)'
      }}
    >
      {/* File Tree Header & Quick Project Switcher */}
      <div className="p-4 flex flex-col gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {/* Project Selector Dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
            <Layers size={11} /> Switch Sandbox Project
          </label>
          <select
            value={activeProject.id}
            onChange={(e) => {
              const selected = projects.find(p => p.id === e.target.value);
              if (selected) setActiveProject(selected);
            }}
            className="glass-input rounded-lg px-2.5 py-1.5 text-xs bg-dark-200 font-bold cursor-pointer"
            style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-dark-300 text-white">
                {p.name} ({p.files?.length || 1} files)
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Workspace Files</span>
          <button
            onClick={() => {
              setNewFileName('');
              setIsCreating(true);
            }}
            className="p-1 rounded hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            title="Create File (e.g. src/helper.py)"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Search Files */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input rounded-lg pl-8 pr-3 py-1.5 text-[10px] w-full"
            style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
          />
          <Search size={11} className="absolute left-2.5 top-2.5 text-slate-500" />
        </div>
      </div>

      {/* Inline Create Input */}
      {isCreating && (
        <div className="px-4 py-2 border-b bg-black/40" style={{ borderColor: 'var(--border-color)' }}>
          <form onSubmit={handleCreateFile} className="flex items-center gap-1">
            <input
              type="text"
              required
              autoFocus
              placeholder="src/helper.py..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="glass-input rounded px-2.5 py-1 text-[10px] flex-1 bg-black/80 font-mono w-full"
              style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
            />
            <button type="submit" className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded border border-transparent hover:border-emerald-500/20 cursor-pointer">
              <Check size={12} />
            </button>
            <button type="button" onClick={() => setIsCreating(false)} className="p-1 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20 cursor-pointer">
              <X size={12} />
            </button>
          </form>
        </div>
      )}

      {/* File Tree Lists */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {folderPaths.map((folderKey) => {
          const files = groupedFiles[folderKey];
          const isRoot = folderKey === '/';
          const isExpanded = expandedFolders[folderKey] !== false;

          return (
            <div key={folderKey} className="flex flex-col gap-0.5">
              {/* Folder Header */}
              <div
                onClick={() => toggleFolder(folderKey)}
                onContextMenu={(e) => handleFolderContextMenu(e, folderKey)}
                className="flex items-center gap-1.5 px-1.5 py-1 hover:text-white cursor-pointer text-[10px] font-bold uppercase tracking-wider select-none hover:bg-white/5 rounded-md transition-all"
                style={{ color: 'var(--text-muted)' }}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {isExpanded ? <FolderOpen className="text-purple-400" size={13} /> : <Folder className="text-purple-400" size={13} />}
                <span className="truncate">{isRoot ? 'Root' : folderKey}</span>
              </div>

              {/* Folder Files List */}
              {isExpanded && (
                <div className={`flex flex-col gap-0.5 ${isRoot ? '' : 'pl-4 border-l ml-2 mt-1'}`} style={{ borderColor: 'var(--border-color)' }}>
                  {files.map((file) => {
                    const isActive = activeFileId === file.id;
                    const isEditing = editingFileId === file.id;

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (!isEditing) setActiveFileId(file.id);
                        }}
                        onContextMenu={(e) => handleFileContextMenu(e, file)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group ${
                          isActive
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/25 shadow-[0_0_10px_rgba(139,92,246,0.05)]'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                        style={{ color: isActive ? undefined : 'var(--text-main)' }}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRenameSubmit(file);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 flex-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingFileId(null);
                                }
                              }}
                              onBlur={() => handleRenameSubmit(file)}
                              className="glass-input rounded px-1.5 py-0.5 text-[11px] font-mono w-full bg-black/80"
                              style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                            />
                            <button type="submit" className="p-0.5 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer">
                              <Check size={12} />
                            </button>
                            <button type="button" onClick={() => setEditingFileId(null)} className="p-0.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer">
                              <X size={12} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              {getFileIcon(file.name)}
                              <span className="text-[11px] truncate font-medium">{file.name}</span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 rounded transition-all duration-150 cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 glass-card rounded-lg shadow-xl py-1 px-1 min-w-[140px] text-xs flex flex-col gap-0.5 border"
          style={{
            top: adjustedY,
            left: adjustedX,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-main)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' ? (
            <>
              <button
                onClick={() => handleContextMenuAction('new_file')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Plus size={13} className="text-emerald-400" />
                <span>📄 New File</span>
              </button>
              <button
                onClick={() => handleContextMenuAction('rename')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Edit2 size={13} className="text-blue-400" />
                <span>✏️ Rename</span>
              </button>
              <button
                onClick={() => handleContextMenuAction('duplicate')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Copy size={13} className="text-purple-400" />
                <span>📋 Duplicate</span>
              </button>
              <div className="my-0.5 border-t" style={{ borderColor: 'var(--border-color)' }} />
              <button
                onClick={() => handleContextMenuAction('delete')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-500/20 text-red-400 text-left transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>🗑️ Delete</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleContextMenuAction('new_file')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <File size={13} className="text-emerald-400" />
                <span>📄 New File</span>
              </button>
              <button
                onClick={() => handleContextMenuAction('new_folder')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <FolderPlus size={13} className="text-purple-400" />
                <span>📁 New Folder</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 bg-white/2 border-t flex flex-col gap-1 select-none" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }} title={activeProject.name}>
          Active Workspace: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{activeProject.name}</span>
        </p>
      </div>
    </div>
  );
};
