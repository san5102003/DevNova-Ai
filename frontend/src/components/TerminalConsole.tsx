import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { GlassButton } from './GlassButton';
import {
  Play,
  Square,
  Terminal,
  Cpu,
  Clock,
  CheckCircle,
  Keyboard,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
  Download,
  Search,
  Plus,
  X,
  Bug,
  History,
  Check
} from 'lucide-react';

export const TerminalConsole: React.FC = () => {
  const {
    activeProject,
    activeFileId,
    token,
    isRunning,
    stdout,
    stderr,
    exitCode,
    durationMs,
    status,
    stdin,
    ws,
    debugMode,
    setDebugMode,
    runStartTime,
    setRunStartTime,
    runHistory,
    addRunHistoryEntry,
    clearRunHistory,
    terminalTabs,
    activeTerminalTabId,
    addTerminalTab,
    closeTerminalTab,
    setActiveTerminalTab,
    setRunning,
    setStdin,
    clearOutput,
    appendStdout,
    appendStderr,
    setExecutionResult,
    setWs,
  } = useStore();

  const [mode, setMode] = useState<'standard' | 'interactive'>('interactive');
  const [stdinInput, setStdinInput] = useState('');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'output' | 'stdin-history'>('output');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const activeFile = activeProject?.files.find(f => f.id === activeFileId);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stdout, stderr]);

  // Live timer tick when running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && runStartTime) {
      setElapsedSeconds(Math.floor((Date.now() - runStartTime) / 1000));
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - runStartTime) / 1000));
      }, 100);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, runStartTime]);

  const formatDebugMessage = (text: string) => {
    if (!debugMode || !text) return text;
    const timestamp = new Date().toLocaleTimeString();
    const lines = text.split('\n');
    return lines
      .map((line, idx) => {
        if (idx === lines.length - 1 && line === '') return '';
        return `[DEBUG ${timestamp}] ${line}`;
      })
      .join('\n');
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

  const handleRun = async () => {
    if (!activeProject || !activeFile) return;

    clearOutput();
    const startTime = Date.now();
    setRunStartTime(startTime);
    setRunning(true);
    setActiveConsoleTab('output');

    if (mode === 'standard') {
      try {
        appendStdout(formatDebugMessage('Starting compilation and standard batch execution...\n'));
        const res = await api.projects.run(activeProject.id, getLanguage(activeFile.name), activeFile.name, stdin);
        
        clearOutput();
        if (res.stdout) appendStdout(formatDebugMessage(res.stdout));
        if (res.stderr) appendStderr(formatDebugMessage(res.stderr));
        setExecutionResult(res.status, res.exitCode, res.durationMs);

        addRunHistoryEntry({
          id: `run-${Date.now()}`,
          fileName: activeFile.name,
          language: getLanguage(activeFile.name),
          status: res.status,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          stdout: res.stdout || '',
          stderr: res.stderr || '',
          timestamp: Date.now(),
        });
      } catch (err: any) {
        appendStderr(formatDebugMessage('\n[System Error] Run request failed: ' + err.message + '\n'));
        setRunning(false);
        setRunStartTime(null);
        addRunHistoryEntry({
          id: `run-${Date.now()}`,
          fileName: activeFile.name,
          language: getLanguage(activeFile.name),
          status: 'ERROR',
          exitCode: -1,
          durationMs: Date.now() - startTime,
          stdout: '',
          stderr: err.message,
          timestamp: Date.now(),
        });
      }
    } else {
      try {
        if (!token) throw new Error('Auth token is missing.');

        const wsHost = (import.meta as any).env?.VITE_WS_BASE_URL || 'ws://localhost:8080';
        const wsUrl = `${wsHost}/ws/execute?token=${encodeURIComponent(token)}`;
        const socket = new WebSocket(wsUrl);

        let wsStdoutAcc = '';
        let wsStderrAcc = '';

        socket.onopen = () => {
          const initStr = 'Establishing interactive workspace connection...\n';
          wsStdoutAcc += initStr;
          appendStdout(formatDebugMessage(initStr));
          socket.send(JSON.stringify({
            type: 'START',
            projectId: activeProject.id,
            language: getLanguage(activeFile.name),
            mainFileName: activeFile.name
          }));
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'STATUS':
                const statusStr = `[System] ${msg.data}\n`;
                wsStdoutAcc += statusStr;
                appendStdout(formatDebugMessage(statusStr));
                break;
              case 'STDOUT':
                wsStdoutAcc += msg.data;
                appendStdout(formatDebugMessage(msg.data));
                break;
              case 'STDERR':
                wsStderrAcc += msg.data;
                appendStderr(formatDebugMessage(msg.data));
                break;
              case 'COMPILE_ERROR':
                const compErrStr = `Compilation Failed:\n${msg.data}\n`;
                wsStderrAcc += compErrStr;
                appendStderr(formatDebugMessage(compErrStr));
                setExecutionResult('COMPILE_ERROR', -1, 0);
                addRunHistoryEntry({
                  id: `run-${Date.now()}`,
                  fileName: activeFile.name,
                  language: getLanguage(activeFile.name),
                  status: 'COMPILE_ERROR',
                  exitCode: -1,
                  durationMs: 0,
                  stdout: wsStdoutAcc,
                  stderr: wsStderrAcc,
                  timestamp: Date.now(),
                });
                break;
              case 'TIMEOUT':
                const timeoutStr = `\n[Execution Limit Alert] ${msg.data}\n`;
                wsStderrAcc += timeoutStr;
                appendStderr(formatDebugMessage(timeoutStr));
                setExecutionResult('TIMEOUT', -1, 0);
                addRunHistoryEntry({
                  id: `run-${Date.now()}`,
                  fileName: activeFile.name,
                  language: getLanguage(activeFile.name),
                  status: 'TIMEOUT',
                  exitCode: -1,
                  durationMs: 0,
                  stdout: wsStdoutAcc,
                  stderr: wsStderrAcc,
                  timestamp: Date.now(),
                });
                break;
              case 'COMPLETE':
                const finalStatus = msg.exitCode === 0 ? 'SUCCESS' : 'RUNTIME_ERROR';
                setExecutionResult(finalStatus, msg.exitCode, msg.durationMs);
                addRunHistoryEntry({
                  id: `run-${Date.now()}`,
                  fileName: activeFile.name,
                  language: getLanguage(activeFile.name),
                  status: finalStatus,
                  exitCode: msg.exitCode,
                  durationMs: msg.durationMs,
                  stdout: wsStdoutAcc,
                  stderr: wsStderrAcc,
                  timestamp: Date.now(),
                });
                socket.close();
                break;
              case 'ERROR':
                const errStr = `[Error] ${msg.data}\n`;
                wsStderrAcc += errStr;
                appendStderr(formatDebugMessage(errStr));
                addRunHistoryEntry({
                  id: `run-${Date.now()}`,
                  fileName: activeFile.name,
                  language: getLanguage(activeFile.name),
                  status: 'ERROR',
                  exitCode: -1,
                  durationMs: 0,
                  stdout: wsStdoutAcc,
                  stderr: wsStderrAcc,
                  timestamp: Date.now(),
                });
                socket.close();
                break;
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        socket.onerror = () => {
          appendStderr(formatDebugMessage('\n[WebSocket Error] Connection encountered an issue.\n'));
          setRunning(false);
          setRunStartTime(null);
        };

        socket.onclose = () => {
          appendStdout(formatDebugMessage('\nInteractive session closed.\n'));
          setRunning(false);
          setRunStartTime(null);
          setWs(null);
        };

        setWs(socket);
      } catch (err: any) {
        appendStderr(formatDebugMessage('\n[System Error] WebSocket setup failed: ' + err.message + '\n'));
        setRunning(false);
        setRunStartTime(null);
      }
    }
  };

  const handleStop = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'STOP' }));
      ws.close();
    }
    setRunning(false);
    setRunStartTime(null);
    setWs(null);
  };

  const sendStdin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdinInput) return;

    const formattedInput = stdinInput.endsWith('\n') ? stdinInput : stdinInput + '\n';
    
    if (mode === 'interactive') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'INPUT',
          data: formattedInput
        }));
        appendStdout(formatDebugMessage(formattedInput));
      } else {
        appendStderr(formatDebugMessage('\n[System Alert] Cannot send input: Process is not running.\n'));
      }
    } else {
      setStdin(stdin + formattedInput);
      appendStdout(formatDebugMessage(`[Queued Input] ${formattedInput}`));
    }
    
    setStdinInput('');
  };

  const handleCopy = async () => {
    const text = (stdout || '') + (stderr ? '\n' + stderr : '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy output: ', err);
    }
  };

  const handleDownload = () => {
    const text = (stdout || '') + (stderr ? '\n' + stderr : '');
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminal-output-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded font-semibold">{part}</mark>
      ) : part
    );
  };

  const renderFilteredOutput = () => {
    const q = searchQuery.trim().toLowerCase();
    const stdoutLines = stdout ? stdout.split('\n') : [];
    const stderrLines = stderr ? stderr.split('\n') : [];

    const matchedStdout = stdoutLines.filter(line => line.toLowerCase().includes(q));
    const matchedStderr = stderrLines.filter(line => line.toLowerCase().includes(q));

    if (matchedStdout.length === 0 && matchedStderr.length === 0) {
      return <div className="text-slate-500 italic text-xs py-2">No matching output lines found for "{searchQuery}".</div>;
    }

    return (
      <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-relaxed">
        {matchedStdout.map((line, idx) => (
          <div key={`out-${idx}`} className="text-emerald-400 whitespace-pre-wrap">
            {highlightText(line, searchQuery)}
          </div>
        ))}
        {matchedStderr.map((line, idx) => (
          <div key={`err-${idx}`} className="text-red-400 whitespace-pre-wrap">
            {highlightText(line, searchQuery)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="h-full border-t flex flex-col overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
    >
      {/* 5. Terminal Tabs Bar */}
      <div
        className="h-9 border-b flex items-center px-3 gap-1.5 overflow-x-auto select-none shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {terminalTabs.map((tab) => {
          const isActive = tab.id === activeTerminalTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTerminalTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1 text-[11px] font-semibold rounded-t border-t-2 transition-all cursor-pointer ${
                isActive
                  ? 'text-purple-300 border-purple-500 shadow-sm'
                  : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
              }`}
              style={{
                backgroundColor: isActive ? 'var(--bg-main)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <Terminal size={12} className={isActive ? 'text-purple-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              {terminalTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminalTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-colors"
                  title="Close Terminal Tab"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={addTerminalTab}
          className="p-1 ml-1 text-slate-400 hover:text-purple-300 hover:bg-white/5 rounded transition-colors cursor-pointer"
          title="Add New Terminal Tab"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Console Controls Bar */}
      <div
        className="h-11 border-b flex items-center justify-between px-4 shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <Terminal size={13} className="text-purple-400" />
            Console
          </span>

          <hr className="h-4 border-l border-white/10" style={{ borderColor: 'var(--border-color)' }} />

          {/* Mode Switcher */}
          <button
            onClick={() => !isRunning && setMode(mode === 'standard' ? 'interactive' : 'standard')}
            disabled={isRunning}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider select-none cursor-pointer disabled:opacity-50 transition-colors ${
              mode === 'interactive' ? 'text-purple-300 hover:text-purple-200' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {mode === 'interactive' ? (
              <>
                <ToggleRight className="text-purple-400" size={18} />
                Interactive (WS)
              </>
            ) : (
              <>
                <ToggleLeft className="text-slate-500" size={18} />
                Batch (REST)
              </>
            )}
          </button>
        </div>

        {/* Action Controls & Timers */}
        <div className="flex items-center gap-3">
          {/* 2. Live Elapsed Timer */}
          {isRunning && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
              <Clock size={12} className="animate-spin text-purple-400" />
              <span>{elapsedSeconds}s</span>
            </div>
          )}

          {/* 1. Debug Mode Toggle */}
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              debugMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/10'
            }`}
            title="Toggle Debug Mode (Prefix output with timestamp)"
          >
            <Bug size={13} className={debugMode ? 'text-purple-400' : 'text-slate-400'} />
            <span>Debug</span>
          </button>

          {/* Compile/Run buttons */}
          {isRunning ? (
            <GlassButton variant="danger" size="small" onClick={handleStop} className="px-3 py-1 text-xs">
              <Square size={11} fill="currentColor" />
              Stop Run
            </GlassButton>
          ) : (
            <GlassButton variant="primary" size="small" onClick={handleRun} className="px-3 py-1 text-xs">
              <Play size={11} fill="currentColor" />
              Run Code
            </GlassButton>
          )}
        </div>
      </div>

      {/* Main Console Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Terminal Output Screen */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
          {/* Sub tabs bar */}
          <div
            className="flex border-b text-[10px] uppercase font-bold tracking-wider shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={() => setActiveConsoleTab('output')}
              className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                activeConsoleTab === 'output'
                  ? 'border-purple-500 text-purple-300 bg-white/2'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Output Logs
            </button>
            <button
              onClick={() => setActiveConsoleTab('stdin-history')}
              className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                activeConsoleTab === 'stdin-history'
                  ? 'border-purple-500 text-purple-300 bg-white/2'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Stdin Buffer
            </button>
          </div>

          {/* 3. Console Toolbar (Clear, Copy, Download, Search) */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border-b text-xs shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={clearOutput}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Clear Output Logs"
              >
                <Trash2 size={12} /> Clear
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Copy Console Output"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Download Output as TXT"
              >
                <Download size={12} /> Download
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter/Search output..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-6 py-0.5 text-[11px] bg-black/40 border border-white/10 rounded text-slate-200 focus:outline-none focus:border-purple-500/50 w-48 font-mono"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Console Output Screen */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed break-all">
            {activeConsoleTab === 'output' ? (
              searchQuery.trim() ? (
                renderFilteredOutput()
              ) : (
                <>
                  {stdout && <div className="text-emerald-400 whitespace-pre-wrap">{stdout}</div>}
                  {stderr && <div className="text-red-400 whitespace-pre-wrap">{stderr}</div>}
                  {!stdout && !stderr && !isRunning && (
                    <div className="text-slate-600 italic">Console idle. Select code file and click Run.</div>
                  )}
                  {isRunning && !stdout && !stderr && (
                    <div className="text-slate-500 animate-pulse">Waiting for execution container...</div>
                  )}
                  <div ref={outputEndRef} />
                </>
              )
            ) : (
              <div className="text-slate-400 h-full flex flex-col gap-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Buffered Static Stdin</span>
                  {stdin && (
                    <button
                      onClick={() => setStdin('')}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
                      title="Clear Stdin Buffer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {stdin ? (
                  <pre className="p-3 bg-black/40 border border-white/5 rounded-lg text-slate-300 break-words whitespace-pre-wrap select-text max-h-36 overflow-y-auto">
                    {stdin}
                  </pre>
                ) : (
                  <div className="text-slate-600 italic text-xs py-4">No static stdin queued. Use the right input panel to buffer entries.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Inputs, Statistics Panel & Run History */}
        <div
          className="w-72 border-l p-4 flex flex-col justify-between gap-3 overflow-y-auto shrink-0 select-none"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          {/* Program input form */}
          <form onSubmit={sendStdin} className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Keyboard size={12} /> Program Input (stdin)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                disabled={mode === 'interactive' && !isRunning}
                placeholder={
                  mode === 'interactive'
                    ? (isRunning ? "Type & press enter..." : "Process not running...")
                    : "Add static input..."
                }
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                className="glass-input rounded-lg px-3 py-2 text-[10px] flex-1 bg-black/60 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={(mode === 'interactive' && !isRunning) || !stdinInput.trim()}
                className="p-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
              </button>
            </div>
          </form>

          {/* Run statistics widgets */}
          <div className="border-t border-white/5 pt-3 flex flex-col gap-2 shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Execution Statistics</span>
            
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
              <div
                className="p-2.5 rounded-xl border flex flex-col relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <span className="text-slate-500 flex items-center gap-1 uppercase tracking-wider"><Cpu size={10} /> Status</span>
                <span className={`font-black mt-1 ${
                  status === 'SUCCESS' ? 'text-emerald-400 animate-pulse-glow' :
                  status?.endsWith('ERROR') ? 'text-red-400' :
                  status === 'TIMEOUT' ? 'text-yellow-400' : 'text-slate-400'
                }`}>
                  {status || 'IDLE'}
                </span>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                  status === 'SUCCESS' ? 'bg-emerald-500/20' :
                  status?.endsWith('ERROR') ? 'bg-red-500/20' :
                  status === 'TIMEOUT' ? 'bg-yellow-500/20' : 'bg-white/2'
                }`}></div>
              </div>
              
              <div
                className="p-2.5 rounded-xl border flex flex-col relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <span className="text-slate-500 flex items-center gap-1 uppercase tracking-wider"><Clock size={10} /> Time</span>
                <span className="font-black mt-1 text-slate-300">
                  {isRunning ? `${elapsedSeconds}s` : (durationMs !== null ? `${durationMs} ms` : 'N/A')}
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500/10"></div>
              </div>
            </div>
            
            {exitCode !== null && (
              <div
                className="text-[9px] text-slate-400 flex items-center gap-1.5 border p-2 rounded-xl"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <CheckCircle size={12} className={exitCode === 0 ? 'text-emerald-400 shrink-0' : 'text-red-400 shrink-0'} />
                <span>Process exited with code <span className="font-mono font-bold text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{exitCode}</span></span>
              </div>
            )}
          </div>

          {/* 4. Run History Panel */}
          <div className="border-t border-white/5 pt-3 flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <History size={11} /> Run History ({runHistory.length})
              </span>
              {runHistory.length > 0 && (
                <button
                  onClick={clearRunHistory}
                  className="text-[9px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Clear Run History"
                >
                  Clear All
                </button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto flex flex-col gap-2 p-2 border rounded-xl bg-black/20 max-h-44"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {runHistory.length === 0 ? (
                <div className="text-[10px] text-slate-600 italic text-center py-3">No past run history.</div>
              ) : (
                runHistory.map((entry) => {
                  const isSuccess = entry.status === 'SUCCESS';
                  const isErr = entry.status?.includes('ERROR');
                  const isTimeout = entry.status === 'TIMEOUT';

                  return (
                    <div
                      key={entry.id}
                      className="p-2 rounded-lg border flex flex-col gap-1 transition-all"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-300 truncate max-w-[120px]" title={entry.fileName}>
                          {entry.fileName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isErr
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : isTimeout
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {entry.status}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px]">
                          <span>code: {entry.exitCode ?? 'N/A'}</span>
                          <span>•</span>
                          <span>{entry.durationMs !== null ? `${entry.durationMs}ms` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
