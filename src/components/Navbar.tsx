import React from 'react';
import { Volume2, Code, Shield, Play, HelpCircle, Check, Download, Copy, Radio } from 'lucide-react';
import { EXACT_USERSCRIPT_CODE } from '../data/userScriptCode';

interface NavbarProps {
  activeTab: 'simulator' | 'filter' | 'guide' | 'code';
  setActiveTab: (tab: 'simulator' | 'filter' | 'guide' | 'code') => void;
  isServerOnline: boolean | null;
  checkServerHealth: () => void;
  isCheckingServer: boolean;
  isEnabled: boolean;
  onToggleMaster: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isServerOnline,
  checkServerHealth,
  isCheckingServer,
  isEnabled,
  onToggleMaster
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(EXACT_USERSCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([EXACT_USERSCRIPT_CODE], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gemini1-piper-lektor.user.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-[#0d0d0f]/90 backdrop-blur-md border-b border-neutral-800/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-inner">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight text-sm sm:text-base">Piper Lektor</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800/80 border border-neutral-700/80 text-neutral-300 font-mono">
                  v2.5.1
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 font-mono">
                  Anti-Duplication
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400">
                Immersive Translate • Netflix • YT • Prime Video • Disney+
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#141417]/80 p-1 rounded-xl border border-neutral-800/80 shadow-inner">
            <button
              id="tab-simulator-btn"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Symulator Wideo & Audio
            </button>
            <button
              id="tab-filter-btn"
              onClick={() => setActiveTab('filter')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'filter'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Filtry & Cenzura
            </button>
            <button
              id="tab-guide-btn"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Instalacja & Piper Server
            </button>
            <button
              id="tab-code-btn"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Kod Skryptu (.user.js)
            </button>
          </nav>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2.5">
            {/* Server health indicator */}
            <button
              id="check-server-health-btn"
              onClick={checkServerHealth}
              title="Testuj połączenie z lokalnym serwerem Piper (http://127.0.0.1:8765/health)"
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#141417] border border-neutral-800 hover:border-neutral-700 transition shadow-sm"
            >
              <Radio className={`w-3.5 h-3.5 ${
                isServerOnline === true 
                  ? 'text-emerald-400 animate-pulse' 
                  : isServerOnline === false 
                  ? 'text-amber-500' 
                  : 'text-neutral-400'
              }`} />
              <span className="text-neutral-400">Piper:</span>
              <span className={
                isServerOnline === true 
                  ? 'text-emerald-400 font-medium' 
                  : isServerOnline === false 
                  ? 'text-amber-400 font-medium' 
                  : 'text-neutral-300'
              }>
                {isCheckingServer ? 'Badanie...' : isServerOnline === true ? 'Online (8765)' : isServerOnline === false ? 'Offline (WebTTS)' : 'Sprawdź'}
              </span>
            </button>

            {/* Script Master toggle button */}
            <button
              id="navbar-toggle-master-btn"
              onClick={onToggleMaster}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                isEnabled
                  ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/50 text-emerald-200'
                  : 'bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              {isEnabled ? 'Lektor: WŁĄCZONY' : 'Lektor: WYŁĄCZONY'}
            </button>

            {/* Download user.js */}
            <button
              id="download-userscript-btn"
              onClick={handleDownload}
              title="Pobierz plik skryptu .user.js"
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Copy code */}
            <button
              id="copy-userscript-btn"
              onClick={handleCopy}
              title="Kopiuj pełny kod skryptu"
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 transition shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2.5 border-t border-neutral-800/80 text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-2 py-1 rounded-md transition ${activeTab === 'simulator' ? 'text-indigo-400 bg-neutral-800/80 font-semibold' : 'text-neutral-400'}`}
          >
            Symulator
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            className={`px-2 py-1 rounded-md transition ${activeTab === 'filter' ? 'text-indigo-400 bg-neutral-800/80 font-semibold' : 'text-neutral-400'}`}
          >
            Filtry & Cenzura
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-2 py-1 rounded-md transition ${activeTab === 'guide' ? 'text-indigo-400 bg-neutral-800/80 font-semibold' : 'text-neutral-400'}`}
          >
            Instrukcja
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-2 py-1 rounded-md transition ${activeTab === 'code' ? 'text-indigo-400 bg-neutral-800/80 font-semibold' : 'text-neutral-400'}`}
          >
            Kod Skryptu
          </button>
        </div>
      </div>
    </header>
  );
};
