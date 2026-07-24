import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { ThemePreset } from '../store/useStore';
import { GlassButton } from './GlassButton';
import { 
  Sun, Moon, Palette, Sliders, RotateCcw, X, Check, Eye, Sparkles 
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, setSettingsOpen, 
    themeMode, setThemeMode, 
    themePreset, setThemePreset,
    customPrimary, customBackground, setCustomColors 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'customization'>('appearance');

  const [hexPrimary, setHexPrimary] = useState(customPrimary);
  const [hexBg, setHexBg] = useState(customBackground);

  if (!isSettingsOpen) return null;

  const presets: { id: ThemePreset; emoji: string; name: string; description: string; color: string; bg: string }[] = [
    { 
      id: 'tokyo-night', 
      emoji: '🌌', 
      name: 'Tokyo Night', 
      description: 'Dark blue background with vibrant syntax colors. Great for long coding sessions.', 
      color: '#7aa2f7', 
      bg: '#1a1b26' 
    },
    { 
      id: 'one-dark-pro', 
      emoji: '🌈', 
      name: 'One Dark Pro', 
      description: 'Inspired by Atom. One of the most widely used VS Code themes.', 
      color: '#61afef', 
      bg: '#21252b' 
    },
    { 
      id: 'purple', 
      emoji: '🟣', 
      name: 'DevNova Purple (Default)', 
      description: 'Custom signature theme. Purple accents with a modern dark UI.', 
      color: '#8b5cf6', 
      bg: '#050510' 
    },
    { 
      id: 'nord', 
      emoji: '🌲', 
      name: 'Nord', 
      description: 'Soft blue-gray color palette. Minimal and easy on the eyes.', 
      color: '#88c0d0', 
      bg: '#2e3440' 
    },
    { 
      id: 'dracula', 
      emoji: '🌙', 
      name: 'Dracula', 
      description: 'Iconic dark theme. Purple, pink, cyan, and green syntax highlighting.', 
      color: '#bd93f9', 
      bg: '#282a36' 
    },
    { 
      id: 'github-dark', 
      emoji: '🌊', 
      name: 'GitHub Dark', 
      description: 'Clean, professional appearance matching GitHub\'s interface. Excellent readability.', 
      color: '#58a6ff', 
      bg: '#0d1117' 
    },
    { 
      id: 'monokai-pro', 
      emoji: '⚫', 
      name: 'Monokai Pro', 
      description: 'High-contrast dark theme with vivid syntax colors. Popular among experienced developers.', 
      color: '#ffd866', 
      bg: '#2d2a2e' 
    },
  ];

  const handleApplyCustomColors = () => {
    setCustomColors(hexPrimary, hexBg);
  };

  const handleResetDefault = () => {
    setThemeMode('dark');
    setThemePreset('purple');
    setCustomColors('#8b5cf6', '#050510');
    setHexPrimary('#8b5cf6');
    setHexBg('#050510');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="glass-card rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-dark-200/50">
          <div className="flex items-center gap-2.5">
            <Palette className="text-purple-400" size={20} />
            <div>
              <h2 className="text-base font-black text-white">Theme & Personalization</h2>
              <p className="text-[11px] text-slate-400">Advanced Settings → Appearance</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5 bg-dark-300 px-5 text-xs select-none">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-3 px-4 font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-purple-500 text-purple-300 bg-white/2'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Palette size={14} />
            Popular Editor Themes
          </button>

          <button
            onClick={() => setActiveTab('customization')}
            className={`py-3 px-4 font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'customization'
                ? 'border-purple-500 text-purple-300 bg-white/2'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            Custom RGB & Color Picker
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6">
              {/* Mandatory Light/Dark Mode toggle */}
              <div className="glass-card p-4 rounded-xl border-white/5 bg-black/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Light & Dark Mode</h3>
                  <p className="text-slate-400 text-[11px]">Mandatory mode switch. Preference auto-saves instantly.</p>
                </div>
                <div className="flex items-center gap-2 bg-dark-300 p-1.5 rounded-xl border border-white/5">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      themeMode === 'dark' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon size={14} />
                    Dark Mode
                  </button>
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      themeMode === 'light' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun size={14} />
                    Light Mode
                  </button>
                </div>
              </div>

              {/* 7 Popular Themes */}
              <div>
                <h3 className="font-bold text-white text-sm mb-1">Select IDE Theme</h3>
                <p className="text-slate-400 text-[11px] mb-4">Choose from the top 7 cloud editor themes for DevNova AI.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {presets.map((p) => {
                    const isSelected = themePreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setThemePreset(p.id)}
                        className={`glass-card p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.01] ${
                          isSelected
                            ? 'border-purple-500 shadow-[0_0_25px_rgba(139,92,246,0.3)] bg-purple-500/10'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.emoji}</span>
                            <span className="font-bold text-white text-xs">{p.name}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-purple-400 font-bold shrink-0" />}
                        </div>

                        <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">{p.description}</p>

                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                          <span className="text-[9px] uppercase font-bold text-slate-500">Palette:</span>
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.color }} title="Accent color" />
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.bg }} title="Canvas color" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customization' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Accent Picker */}
                <div className="glass-card p-4 rounded-xl border-white/5 bg-black/30 flex flex-col gap-2">
                  <label className="font-bold text-white text-xs">Primary Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hexPrimary}
                      onChange={(e) => setHexPrimary(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={hexPrimary}
                      onChange={(e) => setHexPrimary(e.target.value)}
                      className="glass-input rounded-xl px-3 py-2 text-xs flex-1 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Background Color Picker */}
                <div className="glass-card p-4 rounded-xl border-white/5 bg-black/30 flex flex-col gap-2">
                  <label className="font-bold text-white text-xs">Background Canvas Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hexBg}
                      onChange={(e) => setHexBg(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={hexBg}
                      onChange={(e) => setHexBg(e.target.value)}
                      className="glass-input rounded-xl px-3 py-2 text-xs flex-1 uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <GlassButton variant="primary" onClick={handleApplyCustomColors}>
                  Apply Custom Colors
                </GlassButton>
              </div>

              {/* Live Preview Card */}
              <div className="glass-card p-5 rounded-xl border-white/5 bg-black/40 flex flex-col gap-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Eye size={14} className="text-purple-400" /> Live Theme Preview
                </h4>
                <div className="p-4 rounded-xl border border-white/10 flex items-center justify-between" style={{ backgroundColor: hexBg }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: hexPrimary }}>
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <p className="font-bold text-white">DevNova Custom Palette</p>
                      <p className="text-[10px] text-slate-400">Primary: {hexPrimary} | Canvas: {hexBg}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-md" style={{ backgroundColor: hexPrimary }}>
                    Sample Action
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-white/2 flex justify-between items-center">
          <button
            onClick={handleResetDefault}
            className="text-slate-400 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            Reset to Default Theme
          </button>
          <GlassButton variant="primary" onClick={() => setSettingsOpen(false)}>
            Close Settings
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
