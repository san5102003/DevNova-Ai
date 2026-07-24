import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { GlassButton } from './GlassButton';
import { 
  Sparkles, AlertCircle, Wrench, MessageSquare, Send, CheckCircle2, 
  ChevronLeft, ChevronRight, Copy, User, Bot, Check, Gauge, 
  FlaskConical, ShieldCheck, Plus, Zap, Play, Maximize2, Minimize2, RotateCcw, MoveHorizontal
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiAssistantPanel: React.FC = () => {
  const { 
    activeProject, activeFileId, stderr, updateFileContentLocal, 
    setStdin, addFileLocal 
  } = useStore();
  
  const [isOpen, setIsOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState<number>(420);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'explain' | 'fix' | 'complexity' | 'testcases' | 'review' | 'chat'>('explain');

  // Explain tab states
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Fix tab states
  const [fixExplanation, setFixExplanation] = useState<string | null>(null);
  const [fixedCode, setFixedCode] = useState<string | null>(null);
  const [changesMade, setChangesMade] = useState<string | null>(null);
  const [fixReason, setFixReason] = useState<string | null>(null);
  const [patches, setPatches] = useState<any[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);

  // Complexity tab states
  const [complexityData, setComplexityData] = useState<any | null>(null);
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);

  // Test Cases tab states
  const [testCasesData, setTestCasesData] = useState<any | null>(null);
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [addedTestFile, setAddedTestFile] = useState(false);

  // Review tab states
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [isReviewingCode, setIsReviewingCode] = useState(false);

  // Chat tab states
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeFile = activeProject?.files.find(f => f.id === activeFileId);

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= window.innerWidth * 0.8) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Persistent AI History Restoration
  useEffect(() => {
    if (!activeProject) return;

    const loadHistory = async () => {
      try {
        const history = await api.ai.getHistory(activeProject.id);
        if (Array.isArray(history) && history.length > 0) {
          const restoredMessages: Message[] = [];

          history.forEach((req: any) => {
            if (req.requestType === 'CHAT') {
              if (req.prompt) restoredMessages.push({ role: 'user', content: req.prompt });
              if (req.response) restoredMessages.push({ role: 'assistant', content: req.response });
            } else if (req.requestType === 'EXPLAIN_ERROR') {
              if (req.response) setExplanation(req.response);
            } else if (req.requestType === 'AUTO_FIX') {
              if (req.response) {
                parseAndSetFixData(req.response);
              }
            }
          });

          if (restoredMessages.length > 0) {
            setMessages(restoredMessages);
          }
        }
      } catch (err) {
        console.error('Failed to load project AI history:', err);
      }
    };

    loadHistory();
  }, [activeProject?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  const parseAndSetFixData = (rawResponse: string) => {
    try {
      let data = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
      setFixExplanation(data.explanation || 'Auto-fix completed.');
      setFixedCode(data.fixedCode || null);
      setChangesMade(data.changesMade || null);
      setFixReason(data.reason || null);
      setPatches(data.patches || []);
    } catch {
      setFixExplanation(rawResponse);
      setPatches([]);
    }
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'cpp':
      case 'cc':
      case 'h': return 'cpp';
      case 'java': return 'java';
      case 'js': return 'javascript';
      default: return 'python';
    }
  };

  const handleExplainError = async () => {
    if (!activeProject || !activeFile || !stderr) return;

    try {
      setIsExplaining(true);
      setExplanation(null);
      
      const res = await api.ai.explain(
        activeProject.id,
        getLanguage(activeFile.name),
        activeFile.name,
        stderr
      );
      setExplanation(res.explanation);
    } catch (err: any) {
      setExplanation('Failed to generate error explanation: ' + err.message);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAutoFix = async () => {
    if (!activeProject || !activeFile || !stderr) return;

    try {
      setIsFixing(true);
      setFixExplanation(null);
      setFixedCode(null);
      setChangesMade(null);
      setFixReason(null);
      setPatches([]);
      setFixApplied(false);

      const res = await api.ai.autofix(
        activeProject.id,
        getLanguage(activeFile.name),
        activeFile.name,
        stderr
      );
      
      parseAndSetFixData(res);
    } catch (err: any) {
      setFixExplanation('Failed to generate auto-fix patches: ' + err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleApplyFix = async () => {
    if (!activeProject || patches.length === 0) return;

    try {
      setFixApplied(false);
      
      for (const patch of patches) {
        const fileToPatch = activeProject.files.find(f => f.name === patch.filePath);
        if (!fileToPatch) continue;

        await api.projects.saveFile(activeProject.id, {
          id: fileToPatch.id,
          name: fileToPatch.name,
          path: fileToPatch.path,
          content: patch.content
        });

        updateFileContentLocal(fileToPatch.id, patch.content);
      }

      setFixApplied(true);
      setPatches([]);
    } catch (err: any) {
      alert('Failed to apply fix: ' + err.message);
    }
  };

  const handleAnalyzeComplexity = async () => {
    if (!activeProject || !activeFile) return;

    try {
      setIsAnalyzingComplexity(true);
      setComplexityData(null);

      const res = await api.ai.complexity(
        activeProject.id,
        getLanguage(activeFile.name),
        activeFile.name
      );
      setComplexityData(res);
    } catch (err: any) {
      alert('Failed to analyze complexity: ' + err.message);
    } finally {
      setIsAnalyzingComplexity(false);
    }
  };

  const handleGenerateTestCases = async () => {
    if (!activeProject || !activeFile) return;

    try {
      setIsGeneratingTestCases(true);
      setTestCasesData(null);
      setAddedTestFile(false);

      const res = await api.ai.testcases(
        activeProject.id,
        getLanguage(activeFile.name),
        activeFile.name
      );
      setTestCasesData(res);
    } catch (err: any) {
      alert('Failed to generate test cases: ' + err.message);
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  const handleQueueStdin = (inputStr: string) => {
    setStdin(inputStr);
    alert('Loaded test input into Terminal Stdin buffer!');
  };

  const handleAddTestFile = async () => {
    if (!activeProject || !testCasesData?.testFileName || !testCasesData?.testFileContent) return;

    try {
      const saved = await api.projects.saveFile(activeProject.id, {
        name: testCasesData.testFileName,
        path: 'tests',
        content: testCasesData.testFileContent
      });

      addFileLocal({
        id: saved.id,
        name: saved.name,
        path: saved.path,
        content: saved.content
      });

      setAddedTestFile(true);
    } catch (err: any) {
      alert('Failed to create test file: ' + err.message);
    }
  };

  const handleReviewCode = async () => {
    if (!activeProject || !activeFile) return;

    try {
      setIsReviewingCode(true);
      setReviewData(null);

      const res = await api.ai.review(
        activeProject.id,
        getLanguage(activeFile.name),
        activeFile.name
      );
      setReviewData(res);
    } catch (err: any) {
      alert('Failed to review code: ' + err.message);
    } finally {
      setIsReviewingCode(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeProject) return;

    const userMsg: Message = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const historyStr = messages.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const res = await api.ai.chat(activeProject.id, historyStr, userMsg.content);
      const assistantMsg: Message = { role: 'assistant', content: res.response };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chat Error: ' + err.message }]);
    } finally {
      setIsChatting(false);
    }
  };

  const renderMessageContent = (content: string, msgIndex: number) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        const uniqueKey = `${msgIndex}-${index}`;
        
        return (
          <div key={uniqueKey} className="my-3.5 rounded-xl overflow-hidden border border-white/5 bg-black/60 font-mono text-[10px] w-full">
            <div className="flex justify-between items-center px-3.5 py-2 bg-white/2 border-b border-white/5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              <span>{lang || 'code'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setCopiedIndex(msgIndex);
                  setTimeout(() => setCopiedIndex(null), 2000);
                }}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold"
              >
                {copiedIndex === msgIndex ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copiedIndex === msgIndex ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-slate-300 font-mono leading-relaxed whitespace-pre select-text">{code}</pre>
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap leading-relaxed mb-1.5">{part}</p>;
    });
  };

  const calcStyle = () => {
    if (isMaximized) return { width: 'calc(100vw - 250px)' };
    return { width: `${panelWidth}px` };
  };

  return (
    <div className="flex h-full select-none z-30 relative">
      {/* Collapse Handle Button */}
      <div className="flex items-center h-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-5 h-20 glass-panel border border-r-0 border-white/5 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 transition-all shadow-md"
          title={isOpen ? "Collapse AI Assistant" : "Expand AI Assistant"}
        >
          {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Main Drawer Panel */}
      {isOpen && (
        <div 
          style={calcStyle()}
          className="glass-panel border-l border-white/5 h-full flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-150 relative"
        >
          {/* Resize Drag Handle Bar */}
          <div
            onMouseDown={() => {
              setIsMaximized(false);
              setIsDragging(true);
            }}
            className="absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 bg-purple-500/20 hover:bg-purple-500/60 cursor-col-resize z-40 transition-all flex items-center justify-center group"
            title="Drag to resize AI panel"
          >
            <MoveHorizontal size={10} className="text-purple-300 opacity-0 group-hover:opacity-100" />
          </div>

          {/* Header & Controls */}
          <div>
            <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-dark-200/40">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-400 shrink-0 animate-pulse" size={18} />
                <h2 className="text-sm font-black text-white tracking-wider">DevNova AI Suite</h2>
              </div>
              
              {/* Window Controls (Maximize / Minimize / Restore) */}
              <div className="flex items-center gap-1">
                {isMaximized ? (
                  <button
                    onClick={() => setIsMaximized(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                    title="Restore Panel Size"
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsMaximized(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                    title="Maximize AI Panel"
                  >
                    <Maximize2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                  title="Minimize Panel"
                >
                  <Minimize2 size={13} />
                </button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-white/5 bg-dark-300 text-[10px] select-none overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('explain')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'explain'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="Plain English Error Explanation"
              >
                <AlertCircle size={12} />
                Explain
              </button>

              <button
                onClick={() => setActiveTab('fix')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'fix'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="AI Auto-Fix Code Patches"
              >
                <Wrench size={12} />
                Auto-Fix
              </button>

              <button
                onClick={() => setActiveTab('complexity')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'complexity'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="Time & Space Complexity"
              >
                <Gauge size={12} />
                Complexity
              </button>

              <button
                onClick={() => setActiveTab('testcases')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'testcases'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="AI Unit Test Cases Generator"
              >
                <FlaskConical size={12} />
                Tests
              </button>

              <button
                onClick={() => setActiveTab('review')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'review'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="Static Code Review & Audit"
              >
                <ShieldCheck size={12} />
                Review
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-2.5 font-bold flex items-center justify-center gap-1 shrink-0 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-purple-500 text-purple-300 bg-white/2'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                title="Pair Programming Chat"
              >
                <MessageSquare size={12} />
                Chat
              </button>
            </div>
          </div>

          {/* Dynamic Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 bg-black/10">
            {/* EXPLAIN TAB */}
            {activeTab === 'explain' && (
              <div className="flex flex-col gap-4">
                {stderr ? (
                  <>
                    <div className="glass-card p-3.5 rounded-xl border-yellow-500/10 bg-yellow-500/5 text-yellow-300 flex items-start gap-2.5">
                      <AlertCircle className="shrink-0 mt-0.5 text-yellow-400" size={15} />
                      <div className="text-[10px] leading-relaxed">
                        <p className="font-black">Active compile/runtime error detected.</p>
                        <p className="text-slate-400 mt-1 truncate">Log: {stderr.slice(0, 50)}...</p>
                      </div>
                    </div>
                    <GlassButton
                      variant="primary"
                      onClick={handleExplainError}
                      isLoading={isExplaining}
                      className="w-full py-2.5 text-xs font-bold"
                    >
                      Diagnose Error Log
                    </GlassButton>
                  </>
                ) : (
                  <div className="text-center text-slate-500 italic text-xs py-4">
                    Run your code to capture errors, or review past explanations below.
                  </div>
                )}

                {explanation && (
                  <div className="glass-card p-4 rounded-xl border-white/5 bg-black/40 leading-relaxed text-xs text-slate-300 font-medium select-text">
                    <h3 className="font-bold text-white border-b border-white/5 pb-2.5 mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-purple-300">
                      <Sparkles size={12} className="text-purple-400" /> AI Diagnosis & Logic Concept
                    </h3>
                    <div className="whitespace-pre-wrap leading-relaxed">{explanation}</div>
                  </div>
                )}
              </div>
            )}

            {/* FIX TAB */}
            {activeTab === 'fix' && (
              <div className="flex flex-col gap-4">
                {stderr ? (
                  <>
                    <div className="glass-card p-3.5 rounded-xl border-yellow-500/10 bg-yellow-500/5 text-yellow-300 flex items-start gap-2.5">
                      <AlertCircle className="shrink-0 mt-0.5 text-yellow-400" size={15} />
                      <span className="text-[10px] leading-relaxed font-bold">Autofix will compile patch modifications based on code context and errors.</span>
                    </div>
                    <GlassButton
                      variant="primary"
                      onClick={handleAutoFix}
                      isLoading={isFixing}
                      className="w-full py-2.5 text-xs font-bold"
                    >
                      Generate Auto-Fix
                    </GlassButton>
                  </>
                ) : (
                  <div className="text-center text-slate-500 italic text-xs py-4">
                    Run code to trigger autofix, or inspect saved auto-fix reports below.
                  </div>
                )}

                {fixApplied && (
                  <div className="glass-card p-3.5 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    <span>AI Patches successfully applied to project workspace files!</span>
                  </div>
                )}

                {fixExplanation && (
                  <div className="glass-card p-4 rounded-xl border-white/5 bg-black/40 leading-relaxed text-xs text-slate-300 font-medium flex flex-col gap-4">
                    <h3 className="font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-purple-300">
                      <Sparkles size={12} className="text-purple-400" /> Auto-Fix Summary
                    </h3>
                    <p className="select-text text-slate-300">{fixExplanation}</p>

                    {/* Fixed Code Section */}
                    {fixedCode && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Fixed Code</span>
                        <pre className="p-3 bg-black/60 rounded-xl border border-emerald-500/20 font-mono text-[10px] text-emerald-300 overflow-x-auto whitespace-pre select-text">
                          {fixedCode}
                        </pre>
                      </div>
                    )}

                    {/* Changes Made Section */}
                    {changesMade && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Changes Made</span>
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-slate-300 text-[11px] leading-relaxed select-text">
                          {changesMade}
                        </div>
                      </div>
                    )}

                    {/* Reason for Each Change */}
                    {fixReason && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Reason for Each Change</span>
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-slate-300 text-[11px] leading-relaxed select-text">
                          {fixReason}
                        </div>
                      </div>
                    )}

                    {patches.length > 0 && (
                      <div className="flex flex-col gap-3.5 mt-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proposed File Patches</p>
                        {patches.map((p, idx) => (
                          <div key={idx} className="flex flex-col rounded-xl border border-white/5 bg-black/50 overflow-hidden">
                            <div className="px-3.5 py-2 bg-white/2 border-b border-white/5 text-[9px] font-mono text-purple-300 truncate">
                              {p.filePath}
                            </div>
                            <pre className="p-3.5 max-h-36 overflow-y-auto text-[9px] font-mono text-slate-400 leading-relaxed break-all select-text bg-black/30">
                              {p.content}
                            </pre>
                          </div>
                        ))}
                        <GlassButton
                          variant="success"
                          onClick={handleApplyFix}
                          className="w-full mt-2 py-2.5 text-xs font-bold"
                        >
                          Apply AI Patches
                        </GlassButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* COMPLEXITY TAB */}
            {activeTab === 'complexity' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evaluate Big-O Time & Space efficiency for active workspace code files.
                </p>

                <GlassButton
                  variant="primary"
                  onClick={handleAnalyzeComplexity}
                  isLoading={isAnalyzingComplexity}
                  className="w-full py-2.5 text-xs font-bold"
                >
                  Analyze Big-O Complexity
                </GlassButton>

                {complexityData && (
                  <div className="flex flex-col gap-4">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Time Complexity</span>
                        <span className="text-lg font-black text-white font-mono mt-1">{complexityData.timeComplexity || 'O(N)'}</span>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Space Complexity</span>
                        <span className="text-lg font-black text-white font-mono mt-1">{complexityData.spaceComplexity || 'O(1)'}</span>
                      </div>
                    </div>

                    {/* Explanations */}
                    <div className="glass-card p-3.5 rounded-xl border-white/5 bg-black/40 text-xs flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-purple-300 text-[10px] uppercase tracking-wider mb-1">Time Analysis</h4>
                        <p className="text-slate-300 leading-relaxed select-text">{complexityData.timeExplanation}</p>
                      </div>

                      <hr className="border-white/5" />

                      <div>
                        <h4 className="font-bold text-blue-300 text-[10px] uppercase tracking-wider mb-1">Space Analysis</h4>
                        <p className="text-slate-300 leading-relaxed select-text">{complexityData.spaceExplanation}</p>
                      </div>
                    </div>

                    {/* Optimizations */}
                    {complexityData.optimizations && complexityData.optimizations.length > 0 && (
                      <div className="glass-card p-3.5 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-xs">
                        <h4 className="font-bold text-emerald-300 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Zap size={12} /> Optimization Suggestions
                        </h4>
                        <ul className="flex flex-col gap-1.5 text-slate-300">
                          {complexityData.optimizations.map((opt: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed text-[11px]">
                              <span className="text-emerald-400 font-bold">•</span>
                              <span className="select-text">{opt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEST CASES TAB */}
            {activeTab === 'testcases' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate boundary, normal, and edge test case vectors tailored to your code logic.
                </p>

                <GlassButton
                  variant="primary"
                  onClick={handleGenerateTestCases}
                  isLoading={isGeneratingTestCases}
                  className="w-full py-2.5 text-xs font-bold"
                >
                  Generate Unit Test Cases
                </GlassButton>

                {addedTestFile && (
                  <div className="glass-card p-3 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] flex items-center gap-2 font-medium">
                    <CheckCircle2 size={14} />
                    <span>Test suite file created in project tree (`tests/`)!</span>
                  </div>
                )}

                {testCasesData && (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">{testCasesData.summary}</p>

                    {testCasesData.testFileName && (
                      <GlassButton
                        variant="secondary"
                        onClick={handleAddTestFile}
                        className="w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Plus size={13} /> Add Test File to Workspace
                      </GlassButton>
                    )}

                    <div className="flex flex-col gap-3">
                      {testCasesData.testCases?.map((tc: any, idx: number) => (
                        <div key={idx} className="glass-card p-3 rounded-xl border-white/5 bg-black/40 text-xs flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                              {tc.name}
                            </span>
                            {tc.isEdgeCase && (
                              <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-[9px] font-bold border border-yellow-500/30">
                                Edge Case
                              </span>
                            )}
                          </div>

                          <p className="text-slate-400 text-[10px] leading-relaxed">{tc.description}</p>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-1">
                            <div className="bg-black/60 p-2 rounded-lg border border-white/5">
                              <span className="text-slate-500 font-bold uppercase text-[8px] block mb-0.5">Input</span>
                              <pre className="text-emerald-300 truncate">{tc.input || '(empty)'}</pre>
                            </div>
                            <div className="bg-black/60 p-2 rounded-lg border border-white/5">
                              <span className="text-slate-500 font-bold uppercase text-[8px] block mb-0.5">Expected</span>
                              <pre className="text-purple-300 truncate">{tc.expectedOutput || '(empty)'}</pre>
                            </div>
                          </div>

                          <button
                            onClick={() => handleQueueStdin(tc.input)}
                            className="mt-1 py-1 px-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border border-purple-500/30 transition-all cursor-pointer"
                          >
                            <Play size={10} fill="currentColor" /> Load Input to Stdin
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REVIEW TAB */}
            {activeTab === 'review' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Perform a static code audit for performance bottlenecks, security smells, and best practices.
                </p>

                <GlassButton
                  variant="primary"
                  onClick={handleReviewCode}
                  isLoading={isReviewingCode}
                  className="w-full py-2.5 text-xs font-bold"
                >
                  Audit Workspace Code
                </GlassButton>

                {reviewData && (
                  <div className="flex flex-col gap-4">
                    <div className="glass-card p-4 rounded-xl border-white/5 bg-black/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Quality Score</span>
                        <h4 className="text-xs text-slate-300 font-medium max-w-[180px]">{reviewData.summary}</h4>
                      </div>

                      <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${
                        reviewData.score >= 80 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                        reviewData.score >= 60 ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' :
                        'border-red-500 text-red-400 bg-red-500/10'
                      }`}>
                        {reviewData.score}
                      </div>
                    </div>

                    {reviewData.issues && reviewData.issues.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identified Issues</span>
                        {reviewData.issues.map((issue: any, idx: number) => (
                          <div key={idx} className="glass-card p-3 rounded-xl border-white/5 bg-black/40 text-xs flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white text-[11px] truncate max-w-[180px]">
                                {issue.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                                issue.severity === 'HIGH' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                issue.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              <span>Cat: {issue.category}</span>
                              {issue.line && <span>• {issue.line}</span>}
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed select-text mt-1 bg-white/2 p-2 rounded-lg border border-white/5">
                              {issue.suggestion}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewData.bestPractices && reviewData.bestPractices.length > 0 && (
                      <div className="glass-card p-3.5 rounded-xl border-purple-500/20 bg-purple-500/5 text-xs">
                        <h4 className="font-bold text-purple-300 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Best Practices Audit
                        </h4>
                        <ul className="flex flex-col gap-1.5 text-slate-300">
                          {reviewData.bestPractices.map((bp: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed text-[11px]">
                              <span className="text-purple-400 font-bold">•</span>
                              <span className="select-text">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full justify-between">
                {/* Chat Bubbles */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-1">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-10 flex flex-col items-center gap-3 select-none">
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
                        <Bot size={28} />
                      </div>
                      <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">AI Workspace Assistant</h4>
                      <p className="max-w-[200px] leading-relaxed text-slate-600">Ask coding, algorithm, or debugging questions about your workspace project.</p>
                    </div>
                  )}
                  
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={index}
                        className={`flex gap-3 max-w-[90%] items-start ${
                          isUser ? 'self-end flex-row-reverse' : 'self-start'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg border shrink-0 select-none ${
                          isUser 
                            ? 'bg-purple-500/15 border-purple-500/25 text-purple-400' 
                            : 'bg-white/5 border-white/5 text-slate-400'
                        }`}>
                          {isUser ? <User size={12} /> : <Bot size={12} />}
                        </div>

                        <div
                          className={`flex flex-col rounded-2xl p-3.5 text-xs select-text ${
                            isUser
                              ? 'bg-purple-600/25 border border-purple-500/20 text-purple-100 rounded-tr-none'
                              : 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 select-none">
                            <span>{isUser ? 'You' : 'AI Assistant'}</span>
                          </div>
                          <div className="w-full">
                            {renderMessageContent(msg.content, index)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isChatting && (
                    <div className="flex gap-3 self-start items-center">
                      <div className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-500 animate-pulse">
                        <Bot size={12} />
                      </div>
                      <div className="bg-white/3 border border-white/3 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-500 animate-pulse select-none">
                        AI Pair programmer typing...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendChatMessage} className="flex gap-1.5 mt-auto pt-2 border-t border-white/5">
                  <input
                    type="text"
                    disabled={isChatting}
                    placeholder="Ask AI pair assistant..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="glass-input rounded-xl px-4 py-2.5 text-xs flex-1 bg-black/60 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !chatInput.trim()}
                    className="p-2.5 bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl cursor-pointer disabled:opacity-50 transition-all active:scale-95 shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
