/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VideoSimulator } from './components/VideoSimulator';
import { TextFilterPlayground } from './components/TextFilterPlayground';
import { ServerSetupGuide } from './components/ServerSetupGuide';
import { ScriptCodeViewer } from './components/ScriptCodeViewer';
import { FloatingScriptWidget } from './components/FloatingScriptWidget';
import { ScriptSettings, VoiceOption } from './types';

const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'jarvis', name: 'Jarvis', gender: 'male', description: 'Głęboki, wyrazisty głos lektorski męski' },
  { id: 'gosia', name: 'Gosia', gender: 'female', description: 'Ciepły, naturalny głos kobiecy' },
  { id: 'bass', name: 'Bass', gender: 'male', description: 'Niski, kinowy bas' },
  { id: 'justyna', name: 'Justyna', gender: 'female', description: 'Klarowny, precyzyjny głos lektorski' },
  { id: 'meski', name: 'Męski WG', gender: 'male', description: 'Głos wygenerowany Wyoming Piper' },
  { id: 'zenski', name: 'Żeński WG', gender: 'female', description: 'Głos wygenerowany Wyoming Piper' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'filter' | 'guide' | 'code'>('simulator');
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState<boolean>(false);
  const [currentReadingText, setCurrentReadingText] = useState<string>('');

  // Initial settings loaded from localStorage (matching UserScript keys)
  const [settings, setSettings] = useState<ScriptSettings>(() => {
    let isEnabled = true;
    const storedEnabled = localStorage.getItem('piper8765_Enabled');
    if (storedEnabled !== null) {
      isEnabled = storedEnabled === 'true';
    }

    const selectedVoice = localStorage.getItem('piper8765_Voice') || 'jarvis';
    const duckVolumePct = parseInt(localStorage.getItem('piper8765_DuckPct') || '15', 10);
    const ttsBoost = parseFloat(localStorage.getItem('piper8765_TTSBoost') || '1.0');
    const speechRate = parseFloat(localStorage.getItem('piper8765_SpeechRate') || '1.0');
    const singleTabMode = localStorage.getItem('piper8765_SingleTabMode') !== 'false'; // Domyślnie włączone (tylko 1 lektor)
    const autoMuteHiddenTab = localStorage.getItem('piper8765_AutoMuteHidden') !== 'false';
    const detectYTPolishAudio = localStorage.getItem('piper8765_DetectYTPolish') !== 'false'; // Domyślnie włączone wykrywanie polskiego dubbingu na YT
    const filterBrackets = localStorage.getItem('piper8765_FilterBrackets') !== 'false';
    const filterArtifacts = localStorage.getItem('piper8765_FilterArtifacts') !== 'false';
    const filterEnabled = localStorage.getItem('piper8765_FilterEnabled') !== 'false';
    const filterMode = (localStorage.getItem('piper8765_FilterMode') as any) || 'remove';

    let customProfanity: string[] = [];
    try {
      customProfanity = JSON.parse(localStorage.getItem('piper8765_CustomProfanity') || '[]');
    } catch (e) {
      customProfanity = [];
    }

    return {
      isEnabled,
      selectedVoice,
      duckVolumePct,
      ttsBoost,
      speechRate,
      singleTabMode,
      autoMuteHiddenTab,
      detectYTPolishAudio,
      filterBrackets,
      filterArtifacts,
      filterEnabled,
      filterMode,
      customProfanity
    };
  });

  // Sync state changes with localStorage
  const updateSettings = (newPartial: Partial<ScriptSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      localStorage.setItem('piper8765_Enabled', String(updated.isEnabled));
      localStorage.setItem('piper8765_Voice', updated.selectedVoice);
      localStorage.setItem('piper8765_DuckPct', String(updated.duckVolumePct));
      localStorage.setItem('piper8765_TTSBoost', String(updated.ttsBoost));
      localStorage.setItem('piper8765_SpeechRate', String(updated.speechRate));
      localStorage.setItem('piper8765_SingleTabMode', String(updated.singleTabMode));
      localStorage.setItem('piper8765_AutoMuteHidden', String(updated.autoMuteHiddenTab));
      localStorage.setItem('piper8765_DetectYTPolish', String(updated.detectYTPolishAudio));
      localStorage.setItem('piper8765_FilterBrackets', String(updated.filterBrackets));
      localStorage.setItem('piper8765_FilterArtifacts', String(updated.filterArtifacts));
      localStorage.setItem('piper8765_FilterEnabled', String(updated.filterEnabled));
      localStorage.setItem('piper8765_FilterMode', updated.filterMode);
      localStorage.setItem('piper8765_CustomProfanity', JSON.stringify(updated.customProfanity));
      return updated;
    });
  };

  // Test local Piper health on port 8765
  const checkServerHealth = async () => {
    setIsCheckingServer(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:8765/health', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setIsServerOnline(true);
      } else {
        setIsServerOnline(false);
      }
    } catch (e) {
      setIsServerOnline(false);
    } finally {
      setIsCheckingServer(false);
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

  const handleToggleMaster = () => {
    updateSettings({ isEnabled: !settings.isEnabled });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isServerOnline={isServerOnline}
        checkServerHealth={checkServerHealth}
        isCheckingServer={isCheckingServer}
        isEnabled={settings.isEnabled}
        onToggleMaster={handleToggleMaster}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {activeTab === 'simulator' && (
          <VideoSimulator
            settings={settings}
            updateSettings={updateSettings}
            isServerOnline={isServerOnline}
            setCurrentReadingText={setCurrentReadingText}
          />
        )}

        {activeTab === 'filter' && (
          <TextFilterPlayground
            settings={settings}
            updateSettings={updateSettings}
          />
        )}

        {activeTab === 'guide' && (
          <ServerSetupGuide
            isServerOnline={isServerOnline}
            checkServerHealth={checkServerHealth}
            isCheckingServer={isCheckingServer}
            availableVoices={AVAILABLE_VOICES}
          />
        )}

        {activeTab === 'code' && <ScriptCodeViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#0d0d0f]/80 backdrop-blur-md py-5 px-4 text-center text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500/80"></span>
            <span className="font-medium text-neutral-300">
              Piper Lektor Subtitles UserScript • <span className="text-indigo-400 font-mono">gemini1 v2.5.1 (Anti-Duplication & YouTube Dubbing PL)</span>
            </span>
          </div>
          <span className="text-neutral-500">
            Obsługuje: Immersive Translate • Netflix • YouTube • Prime Video • Disney+
          </span>
        </div>
      </footer>

      {/* Authentic Floating In-Page Script Widget Simulator */}
      <FloatingScriptWidget
        settings={settings}
        updateSettings={updateSettings}
        availableVoices={AVAILABLE_VOICES}
        isServerOnline={isServerOnline}
        checkServerHealth={checkServerHealth}
        currentReadingText={currentReadingText}
      />
    </div>
  );
}
