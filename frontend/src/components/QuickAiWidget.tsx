import React, { useState } from 'react';
import { Sparkles, Code2, Bug, MessageSquare, X } from 'lucide-react';

interface QuickAiWidgetProps {
  setView: (view: 'dashboard' | 'workspace') => void;
}

export const QuickAiWidget: React.FC<QuickAiWidgetProps> = ({ setView }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (_action: 'generate' | 'debug' | 'chat') => {
    setView('workspace');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Action Popup Menu */}
      {isOpen && (
        <div className="mb-3 glass-card rounded-2xl p-3 border border-purple-500/30 shadow-2xl bg-dark-200/90 w-64 flex flex-col gap-2 animate-float-fast">
          <div className="flex justify-between items-center px-2 py-1 border-b border-white/5 pb-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" /> AI Assistant Quick Actions
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <button
            onClick={() => handleAction('generate')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-purple-600/20 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-transparent hover:border-purple-500/20 text-left"
          >
            <Code2 size={16} className="text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Generate Code</p>
              <p className="text-[10px] text-slate-400">Write algorithms & functions</p>
            </div>
          </button>

          <button
            onClick={() => handleAction('debug')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-yellow-600/20 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-transparent hover:border-yellow-500/20 text-left"
          >
            <Bug size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Debug Code</p>
              <p className="text-[10px] text-slate-400">Diagnose runtime exceptions</p>
            </div>
          </button>

          <button
            onClick={() => handleAction('chat')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-600/20 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-transparent hover:border-blue-500/20 text-left"
          >
            <MessageSquare size={16} className="text-blue-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Continue Last Chat</p>
              <p className="text-[10px] text-slate-400">Resume AI pair programming</p>
            </div>
          </button>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
        title="AI Assistant Widget"
      >
        <Sparkles size={22} className="animate-pulse" />
      </button>
    </div>
  );
};
