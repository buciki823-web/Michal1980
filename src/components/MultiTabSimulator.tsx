import React, { useState, useEffect, useRef } from 'react';
import { Layers, Radio, ShieldCheck, VolumeX, Volume2, ArrowRightLeft, CheckCircle2, AlertTriangle, Monitor, ExternalLink, Play, Pause } from 'lucide-react';
import { ScriptSettings } from '../types';

interface MultiTabSimulatorProps {
  settings: ScriptSettings;
  updateSettings: (newSettings: Partial<ScriptSettings>) => void;
  isServerOnline: boolean | null;
}

interface SimulatedTab {
  id: string;
  title: string;
  platform: string;
  sampleSubtitle: string;
  icon: string;
}

const SIMULATED_TABS: SimulatedTab[] = [
  {
    id: 'tab-netflix',
    title: 'Netflix • Stranger Things s04e01',
    platform: 'Netflix',
    sampleSubtitle: 'Musimy wracać do laboratorium, zanim będzie za późno!',
    icon: '🎬'
  },
  {
    id: 'tab-youtube',
    title: 'YouTube • Wywiad z twórcami AI [PL]',
    platform: 'YouTube',
    sampleSubtitle: 'Nowy model mowy potrafi generować głos w czasie rzeczywistym.',
    icon: '📺'
  },
  {
    id: 'tab-prime',
    title: 'Amazon Prime • The Boys s03e05',
    platform: 'Prime Video',
    sampleSubtitle: 'Nie możesz tak po prostu wejść do wieżowca Vought.',
    icon: '🍿'
  }
];

interface LogEntry {
  id: string;
  time: string;
  sender: string;
  action: string;
  details: string;
  type: 'claim' | 'yield' | 'speak';
}

export const MultiTabSimulator: React.FC<MultiTabSimulatorProps> = ({
  settings,
  updateSettings,
  isServerOnline
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('tab-netflix');
  const [speakerTabId, setSpeakerTabId] = useState<string | null>(null);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (sender: string, action: string, details: string, type: 'claim' | 'yield' | 'speak') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: timeStr,
      sender,
      action,
      details,
      type
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 15)]);
  };

  // Real BroadcastChannel listener for multi-window real testing
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('piper_lektor_audio_sync');
        bc.onmessage = (e) => {
          const data = e.data;
          if (data && data.type) {
            addLog(
              data.domain || 'Zewnętrzna Karta',
              data.type === 'CLAIM_AUDIO_FOCUS' ? 'CLAIM_AUDIO_FOCUS' : 'START_SPEECH',
              data.text ? `Czyta: "${data.text}"` : 'Przejęto Audio Focus',
              data.type === 'CLAIM_AUDIO_FOCUS' ? 'claim' : 'speak'
            );
          }
        };
      }
    } catch (err) {}

    return () => {
      if (bc) bc.close();
    };
  }, []);

  const handleSimulateSpeechInTab = (tab: SimulatedTab) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const previousSpeaker = speakerTabId;

    if (settings.singleTabMode && previousSpeaker && previousSpeaker !== tab.id) {
      const prevTabObj = SIMULATED_TABS.find(t => t.id === previousSpeaker);
      addLog(
        prevTabObj?.title || previousSpeaker,
        'YIELD_AUDIO (Wyciszenie)',
        'Odebrano sygnał z innej karty -> Natychmiastowe zatrzymanie lektora i powrót głośności wideo 100%',
        'yield'
      );
    }

    setSpeakerTabId(tab.id);
    setActiveTabId(tab.id);
    setSpeakingText(tab.sampleSubtitle);

    addLog(
      tab.title,
      'CLAIM_AUDIO_FOCUS & START_SPEECH',
      `Rozpoczęto odtwarzanie głosu: "${tab.sampleSubtitle}"`,
      'speak'
    );

    // Broadcast across real browser channel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('piper_lektor_audio_sync');
        bc.postMessage({
          type: 'START_SPEECH',
          text: tab.sampleSubtitle,
          domain: tab.platform
        });
        bc.close();
      }
    } catch (e) {}

    // Simulated speech finish after 4.5s
    timeoutRef.current = setTimeout(() => {
      setSpeakerTabId(null);
      setSpeakingText(null);
      addLog(
        tab.title,
        'SPEECH_ENDED',
        'Zakończono odtwarzanie frazy -> Przywrócono pełną głośność filmu',
        'claim'
      );
    }, 4500);
  };

  const handleSwitchActiveTab = (tab: SimulatedTab) => {
    setActiveTabId(tab.id);

    if (settings.singleTabMode) {
      if (speakerTabId && speakerTabId !== tab.id && settings.autoMuteHiddenTab) {
        // Mute background
        const prevTabObj = SIMULATED_TABS.find(t => t.id === speakerTabId);
        addLog(
          prevTabObj?.title || speakerTabId,
          'AUTO_MUTE_BACKGROUND',
          'Użytkownik przeszedł do innej karty -> Karta w tle została natychmiast wyciszona',
          'yield'
        );
        setSpeakerTabId(null);
        setSpeakingText(null);
      }

      addLog(
        tab.title,
        'TAB_FOCUSED (Przejęcie priorytetu)',
        'Karta stała się aktywna w oknie przeglądarki (Focus)',
        'claim'
      );
    }
  };

  return (
    <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="text-base font-semibold text-white">
              Koordynacja Wielu Kart (Cross-Tab Single Voice Coordinator)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
              v2.4.0 Nowość
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Gdy masz otwarty film na Netflixie i przełączysz się na YouTube, lektor automatycznie wycisza wcześniejszą kartę, aby głosy nigdy się nie nakładały.
          </p>
        </div>

        {/* Global Controls Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-[#0e0e11] px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
            <input
              type="checkbox"
              checked={settings.singleTabMode}
              onChange={(e) => updateSettings({ singleTabMode: e.target.checked })}
              className="accent-indigo-600 rounded"
            />
            <span className="text-neutral-300 font-medium">Tylko 1 lektor naraz</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-[#0e0e11] px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
            <input
              type="checkbox"
              checked={settings.autoMuteHiddenTab}
              onChange={(e) => updateSettings({ autoMuteHiddenTab: e.target.checked })}
              className="accent-indigo-600 rounded"
            />
            <span className="text-neutral-300 font-medium">Auto-wyciszaj kartę w tle</span>
          </label>
        </div>
      </div>

      {/* Simulated Browser Tabs Bar */}
      <div>
        <div className="text-xs font-semibold text-neutral-400 mb-2.5 flex items-center justify-between">
          <span>SYMULACJA KART W TWOJEJ PRZEGLĄDARCE:</span>
          <span className="text-[11px] text-neutral-500 font-mono">
            Protokół: BroadcastChannel API + localStorage sync
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SIMULATED_TABS.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isSpeakingInThisTab = speakerTabId === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchActiveTab(tab)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-neutral-800/90 border-indigo-500/70 shadow-lg ring-1 ring-indigo-500/30'
                    : 'bg-[#0a0a0d]/80 border-neutral-800/80 hover:border-neutral-700 opacity-80'
                }`}
              >
                {/* Tab Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {tab.title}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 font-mono">
                      Aktywna
                    </span>
                  )}
                </div>

                {/* Speech & Audio Focus Status Badge */}
                <div className="p-2.5 rounded-lg bg-[#0e0e11] border border-neutral-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Stan lektora:</span>
                    {isSpeakingInThisTab ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] animate-pulse">
                        <Volume2 className="w-3.5 h-3.5" /> Czyta napis
                      </span>
                    ) : isActive ? (
                      <span className="text-indigo-400 font-medium text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Gotowy (Audio Focus)
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-medium text-[11px] flex items-center gap-1">
                        <VolumeX className="w-3.5 h-3.5" /> Wyciszony w tle
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-300 italic truncate pt-1 border-t border-neutral-800/60">
                    "{tab.sampleSubtitle}"
                  </div>
                </div>

                {/* Trigger Speech in This Tab Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimulateSpeechInTab(tab);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isSpeakingInThisTab
                      ? 'bg-emerald-600 text-white shadow-emerald-900/40 shadow-sm'
                      : 'bg-neutral-700/90 hover:bg-indigo-600 text-neutral-200 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isSpeakingInThisTab ? 'Odtwarzanie w toku...' : 'Włącz napis w tej karcie'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Broadcast & Synchronization Logs */}
      <div className="bg-[#0a0a0d] border border-neutral-800/80 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            Podgląd Zdarzeń Między Kartami (Cross-Tab Event Stream)
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            {logs.length} komunikatów
          </span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px] pr-1">
          {logs.length === 0 ? (
            <div className="text-neutral-600 italic py-3 text-center">
              Kliknij przycisk "Włącz napis w tej karcie" powyżej, aby zobaczyć jak karty automatycznie przekazują sobie Audio Focus bez nakładania głosu.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] ${
                  log.type === 'speak'
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                    : log.type === 'yield'
                    ? 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                    : 'bg-indigo-950/40 border-indigo-800/40 text-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-[10px]">{log.time}</span>
                  <span className="font-bold text-white px-1.5 py-0.5 rounded bg-black/40 text-[10px]">
                    {log.sender}
                  </span>
                  <span className="font-semibold">{log.action}:</span>
                  <span className="text-neutral-300">{log.details}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
